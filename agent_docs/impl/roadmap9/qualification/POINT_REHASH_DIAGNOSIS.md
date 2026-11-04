# Point 100k 같은 프로세스 rebase-offline 정체 진단

## 진행 상태

- [x] 합산 source `6e1864a8c`에서 원 phased 스크립트를 수정 없이 재현.
- [x] 진단 전용 계측으로 정체 WeakSet과 등록 호출자 귀속.
- [x] 단명 등록을 없애는 단일 값 scale 경로와 등가 시험.
- [x] 원100k 같은 프로세스 native → offline → rebase → rebase-offline 완주(아래).

## 재현

[증거](point-rehash-diagnosis-evidence/)의 `product-100000-phased.mjs`는 원 스크립트에서 출력 폴더만 바꾼 사본이다. 원 입력(SHA256 `b68cab72…`), limits, phase 순서, 같은 프로세스 조건을 유지했다.

| 단계 | 2026-11-02 PID 60117 | 2026-11-04 PID 66437 |
| --- | --- | --- |
| prepare | 72.7s | 69.6s |
| 최초 offline | 182.3s | 163.7s |
| rebase | 65.5s | 61.1s |
| rebase-offline | 13분 이상 정체 | 43분 정체 |

두 OS sample 모두 `WeakSet.add → Runtime_WeakCollectionSet → EphemeronHashTable::Rehash`(in-place)였다. timeout 변경·phase 분할 없이 해당 PID만 SIGTERM으로 종료했다. 이는 실패이며 통과가 아니다.

## 귀속 (진단 전용, 통과 증거 아님)

전역 `WeakSet`을 생성 위치별로 계수하는 preload(`weakset-diag.mjs`)로 실행했다. 정체 직전까지:

| 생성 위치 | 누적 add | 인스턴스 |
| --- | --- | --- |
| `core/immutable.js:1` 전역 owned registry | 26,324,492 | 1 |
| `cloneAndFreeze`의 호출별 `ancestors` | 21,922,658 | 21,361,153 |
| `core/sha256.js`, `envelopeCodec`, `valueEncoding`, `positions`, `appearance` | 각 1M 미만 | |

정체 직전 10초 창에서 registry와 `ancestors`의 add가 같은 247,808건이었다. 잎 객체 하나마다 `cloneAndFreeze`가 따로 불렸다는 뜻이다.

registry add 997회마다 stack을 표본으로 잡은 `registry-callers.mjs`에 따르면, 최초 offline 복원 한 번에서만 registry add가 8,203,871건이다. 상위 호출자는 from/to endpoint마다 다음 셋이다.

1. `restoreEndpoint`(planner.js:283)의 `cloneAndFreeze(input.graphicSpec)`
2. 같은 줄의 `projectAnimationEndpoint → canvasSceneSnapshot`(sceneSnapshot.js:34). 방금 만든 scene 래퍼와 `sources` 레코드를 다시 깊은 복사·등록한다. 결과는 임시 `{graphicSpec}` 객체를 key로 하는 WeakMap에 cache된다.
3. `restoreEndpoint`(planner.js:326)의 `cloneAndFreeze(input.positions)`

native 단계에서는 `editGraphics`의 항목별 `freezeOwned`/`setGraphicProperty`, `materialization/animation/point.js`의 위치별 `cloneAndFreeze`가 상위다.

## 해석과 다음 단계

장수명 전역 registry 하나에 프로세스 전체로 수천만 개가 등록된다. 그중 상당수는 등록 직후 곧 회수되는 임시 사본이다. GC가 ephemeron 항목을 지울 때마다 삭제 표식이 쌓이고, 다음 `add`가 용량이 큰 table 전체를 in-place 재해시하는 패턴과 일치한다. V8 내부의 deleted/capacity 수치는 측정하지 않았으므로 엔진 결함으로 단정하지 않는다.

금지된 우회(registry 회전·branding·shallow trust·검증 생략)는 쓰지 않는다. 해결 방향은 **같은 데이터를 여러 번 복사·등록하는 호출 지점을 줄여 registry 유입량과 단명 등록을 낮추는 것**이다. 첫 후보는 위 세 restore 지점과 `canvasSceneSnapshot`의 재복사다. 각 후보는 결과·오류 순서·소유권 경계 동등성을 반례로 보인 뒤 채택한다.

## V8 단독 재현

`ws-churn.mjs`(ggaction 없음)는 장수명 WeakSet member 수를 바꾸며 단명 객체 3M개를 추가한다.

| 장수명 member | 단명 추가 3M | 최악 64k 구간 |
| --- | --- | --- |
| 100k | 0.95 s | 62 ms |
| 2M | 43.0 s | 18.2 s |
| 8M | 61.4 s(채우기만 105 s) | 1.4 s |

거대한 registry가 살아 있는 동안 단명 등록이 섞이면 비용이 폭발한다. 따라서 장수명 등록보다 **단명 등록 제거**를 먼저 다룬다.

## 단명 등록 귀속

`registry-lifetimes.mjs`는 registry add 1000건마다 하나를 `FinalizationRegistry`에 걸고 첫 제품 호출자로 귀속했다. 같은 단계 안에서 회수된 상위 호출자는 점마다 실행되는 위치 검산이었다. `normalizePositionEndpoint`의 `mapContinuousScaleValues([value])`가 만드는 1원소 결과·`validatePair` 사본, 버려지는 `normalizeTransformParameters` 결과, `samplePositionInterpolation`과 `pointPositionMatchesNode`의 1원소 매핑이다. 비교 후 숫자 하나만 읽고 버리는 값인데 전역 registry에 등록되었다.

## 수리

`grammar/scales`에 등록 없는 단일 값 경로를 추가했다. 기존 export 함수의 반환값·identity는 그대로다.

- `validation.js`: `readFinitePair`(검산 후 분리 사본). `validatePair`는 기존대로 소유된 입력을 같은 객체로 반환한다.
- `transformed.js`: `transformParameterValues`(같은 검산, plain 결과). `normalizeTransformParameters`는 그 결과의 owned 사본이다. `validateTransformedDomain`의 부수 검산도 plain 버전을 쓴다. `mapTransformedScalar`는 `mapTransformedValues`의 검산 순서·오류·산술을 한 값에 적용한다.
- `continuous.js`: `mapLinearScalar`. `mapping.js`: `mapContinuousScaleValue`는 `mapContinuousScaleValues`와 같은 radial/transformed/linear 분기를 따른다.
- 사용처: `positions.js`(endpoint 검산·0/1 sample·매개변수), `pointState.js`, `cartesianPosition.js`.

`test/unit/grammar/scale-scalar-mapping.test.js`는 15개 scale(radial 포함)×13개 값, 잘못된 scale 11종×2값, reverse·매개변수 사례에서 결과와 오류 class·문구가 배열 버전과 같음을 검사한다. Plain 매개변수가 owned 결과와 같고 등록되지 않음, owned pair의 identity 유지도 검사한다.

## 결과

[증거](point-rehash-fix-evidence/). 같은 harness·원 입력·원 limits, timeout·phase 분할 변경 없음.

| 단계 | 수리 전 PID 66437 | 수리 후 PID 71056 |
| --- | --- | --- |
| prepare | 69.6 s | 53.5 s |
| 최초 offline | 163.7 s | 95.9 s |
| rebase | 61.1 s | 48.2 s |
| rebase-offline | 43분 이상 정체·종료 | **68.8 s 완료** |

최종 stage `all-native-offline-rebase-exact`, rebase 좌표 100,000개 검산. 단계별 heapUsed는 443→579→607→608MB였다.

같은 source의 전체 coverage(일반 10535/10535 포함) 97.42/95.69/99.36%, critical floor 785개 통과, `mapping.js` 100/100/100. Browser 529/529. 같은 archive `787e6d78…` Node20/22/24 설치 소비자 통과. 크기는 Basic +37, animation +47, interaction +1B만 실측 조정했다.

이 결과는 기능 완주이며 50ms sample·P95·canonical memory 100cycle은 별도로 열려 있다. native 단계의 `editGraphics` 항목별 등록과 `canvasSceneSnapshot` 재복사는 남은 장수명 비용 후보다.
