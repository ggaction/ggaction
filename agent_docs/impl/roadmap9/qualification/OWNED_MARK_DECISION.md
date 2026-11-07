# 소유권 표식 저장 위치 결정

## 진행 상태

- [x] 원인 측정과 대안 실험.
- [x] 결정 기록과 구현(`src/core/immutable.js`).
- [x] 의미 반례 시험 `test/unit/core/owned-mark.test.js`.
- [x] 전체 coverage(일반 10543/10543 포함) 97.42/95.69/99.36%, critical floor 785, browser 529/529, render 513/513, 같은 archive `acc0dfc5…` Node20/22/24 설치 소비자 통과. Gallery 전체 페이지 캡처 한계(세로 364,606px)로 실패하던 기존 harness도 수리했다.
- [x] 원100k point·data, 10k partition 재측정(아래).

## 결정

`freezeOwned`/`isOwned`의 의미는 그대로 두고, 소유 사실을 **전역 WeakSet 대신 소유된 객체 자신의 module-private field**에 저장한다. 비확장 객체에 private field를 허용하지 않는 엔진에 대비해, 표식을 붙일 수 없을 때만 module-private WeakSet을 쓴다.

승인 근거는 [AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`(STEP-077까지의 아키텍처 결정 위임)과 2026-11-04 사용자 지시("다 고치고 남은 일까지 싹 다 밀어")다. 공개 API·저장 bytes·type·renderer 경계는 바뀌지 않는다.

## 왜 바꾸는가

[Point 진단](POINT_REHASH_DIAGNOSIS.md)과 같은 날의 측정에서 세 가지 대규모 경로가 모두 전역 owned registry에서 막혔다.

- 원100k point 같은 프로세스 rebase-offline: `WeakSet.add → EphemeronHashTable::Rehash`에서 43분 이상 정체.
- 10k partition preview: 위치 검산의 단명 등록을 없앤 뒤에도 profile 최상위가 `freezeOwned`. Node p95가 수 초로 튐.
- 100k data source-revise: profiled 22.8s 중 18.3s가 `freezeOwned`.

ggaction 없이 V8만으로도 재현된다(`point-rehash-diagnosis-evidence/ws-churn.mjs.gz`). 장수명 member 2M에 단명 3M을 추가하면 43.0s가 걸리고, 8M은 채우기만 105s다. 같은 workload를 private field로 하면(`owned-mark-evidence/stamp-churn.mjs.gz`) Node20/22/24에서 0.07–0.12s, 8M 채우기 0.36–0.69s다.

단명 등록 지점을 하나씩 없애는 방식도 계속 적용했다(scale 단일 값 경로, partition exact track, collection item wrapper). 하지만 100k program 자체가 수백만 개의 owned 객체를 살려 두므로 남은 어떤 단명 등록도 table 전체 재해시를 부른다. 지점 수리만으로는 닫히지 않는다.

## 이전 지침과의 관계

[Format6 인계](FORMAT6_HANDOFF.md)는 "Global ownership registry rotation/branding/shallow trust로 해결하지 않는다"고 적었다. 이 지침이 막으려던 것은 소유 의미의 약화다. registry 교체로 과거 소유를 잃거나, 위조 가능한 표식이나 부모 표식으로 자손을 신뢰하는 것이다. 이번 결정은 그중 어느 것도 하지 않는다.

| 속성 | WeakSet registry | private field 표식 |
| --- | --- | --- |
| 정확한 객체 단위 | 예 | 예 |
| 위조 | 불가(module-private) | 불가(private name은 이 module만 보유) |
| 열거·symbol·JSON·structuredClone에 노출 | 없음 | 없음 |
| 사본·spread·clone 소유 | 아니오 | 아니오 |
| 부모가 자손 보증 | 아니오 | 아니오 |
| Proxy | Proxy 객체만 | Proxy 객체만 |
| 동결 실패 시 소유 | 아니오 | 아니오(동결 뒤 표식) |
| 수명 | 객체와 함께 회수 | 객체와 함께 회수 |

따라서 "branding"을 private field 저장 방식 자체에 대한 금지가 아니라 의미 약화에 대한 금지로 해석하고, 그 근거를 여기 남긴다.

## 검증 계획

의미 반례는 `test/unit/core/owned-mark.test.js`에 있다(정확한 객체·자손 비보증·열거/JSON 비노출·사본/clone/caller 동결 비소유·이미 동결된 값·Proxy·동결 실패·primitive). 전체 coverage와 browser, 같은 archive 3Node는 진행 상태에 결과를 기록한다. 원100k point·data와 10k partition은 같은 harness로 다시 잰다.

## Production build 회귀와 수리

첫 구현은 `static add(value) { new OwnedMark(value); }`였다. Source·Node·browser suite는 통과했지만, Vite production build의 Rollup tree-shaking이 부수효과 없는 class의 사용되지 않는 `new`를 제거했다. 설치 소비자와 문서 예제에서 `isOwned`가 false가 되어 "Hit preparation requires immutable own program state."로 멈췄다(interaction 문서 예제 4건, tutorial 다수). `add`가 생성 결과를 반환하고 `freezeOwned`가 그 값이 원래 값인지 확인하도록 고쳤다. `test/contracts/owned-mark-minified.test.js`는 같은 Vite production build로 표식을 확인하며, 버그 형태에서는 실패하고 수리 형태에서는 통과함을 확인했다.

## 함께 수리한 것

- `actions/primitives/editGraphics.js`: 균일 type collection 교체가 item wrapper를 먼저 등록한 뒤 같은 내용의 새 wrapper로 다시 등록하던 중간 세대를 없앴다. 최종 객체와 오류 순서는 같다.
- `test/charts/mark-selection-points/variants/interaction/png.render.js`: brush·angular variant가 manifest를 그대로 `variant.json`에 쓰고 brush는 chart 폴더에 쓰던 것을 정본 `ensureVariantMetadata`와 variant 폴더로 바꿨다. Artifact gallery 생성이 이 메타데이터 때문에 실패했다.
- `scripts/test-artifact-gallery.js`: approved gallery가 365쌍으로 커져 Chromium 전체 페이지 캡처가 불가능했다. 배치·오류 검사는 유지하고, 높이 16,384px를 넘으면 첫 화면만 저장한다.

## Data 100k 측정(Node, source, profiler 켬)

| 단계 | WeakSet | collection wrapper 수리 | 표식 |
| --- | --- | --- | --- |
| editable load | 1,952 ms | 1,929 ms | 855 ms |
| source revise | 22,804 ms | 19,177 ms | 3,198 ms |

## 재측정 — archive `acc0dfc5…`(source `45fcd9077`)

원100k point 같은 프로세스(원 phased harness, 원 입력·limits): prepare 53.5→**15.2s**, 최초 offline 95.9→**16.0s**, rebase 48.2→**12.8s**, rebase-offline 68.8→**19.6s**, 최종 `all-native-offline-rebase-exact`.

정본 `scripts/benchmark-native.js`(Chromium, 5 warmup + 30 측정, DPR1/DPR2 중 큰 값 P95, ms). 사용자 GUI 앱이 켜진 상태라 최종 exclusive 측정이 아니다.

| workload | 기준(1k/10k/100k 또는 100/1k/10k) | 측정 | 판정 |
| --- | --- | --- | --- |
| points hit | 8/12/20 | 0.1/0.1/0.4 | 통과 |
| points full frame | 16.7/33/50 | 3.4/27.7/318.8 | 100k 미달 |
| partition layout | 10/50/300 | 2.4/19.5/197.7 | 통과 |
| partition preview | 33/33/33 | 2.8/21.3/239.9 | 10k 미달 |
| data load | 100/500/3000 | 6.6/59.2/987.9 | 통과 |
| data revise | 100/500/3000 | 26.3/278.8/2804.9 | 통과 |
| data blocking slice | 50/50/50 | 26.3/278.8/2804.9 | 10k·100k 미달 |

남은 미달의 성격: points 100k는 정본 workload가 v4(명시 용량) 경로를 쓴다. format6 batch 경로의 단일 sample은 93–96ms였다. Partition 10k preview는 frame 출력 표현 자체가 비용이다. Data blocking slice는 동기 load/revise 전체가 하나의 slice로 측정된다.
