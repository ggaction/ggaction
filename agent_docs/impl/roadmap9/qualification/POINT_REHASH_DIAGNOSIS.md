# Point 100k 같은 프로세스 rebase-offline 정체 진단

## 진행 상태

- [x] 합산 source `6e1864a8c`에서 원 phased 스크립트를 수정 없이 재현.
- [x] 진단 전용 계측으로 정체 WeakSet과 등록 호출자 귀속.
- [ ] 등록 수를 줄이는 구체안과 반례·동등성 검증.
- [ ] 원100k 같은 프로세스 native → offline → rebase → rebase-offline 완주.

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
