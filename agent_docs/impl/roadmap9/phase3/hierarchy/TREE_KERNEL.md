# Hierarchy tree private checkpoint

## 진행 상태

- [x] 공통 normalized model의 preorder·topology·value·diagnostics integrity 검증
- [x] Tidy tree contour와 vertical/horizontal/radial 순수 좌표 계산
- [x] 독립 descendant-scan oracle·literal·깊이10,000·누적 작업량·불변성 검증
- [x] Source/package 경계와 네 hierarchy owner critical95/90/100 기준 검증
- [ ] 명시 sibling sort, treemap slice/dice/squarify 및 partition 계산
- [ ] Hierarchy/layout resource lifecycle과 public/visual/consumer 통합
- [ ] AT-22·STEP-020·STEP-077 전체 완료

기준은 input adapter `b804cedb56d6db85eaa08c1132fb54bf9a5397e9`이며, 기존
[AUTHORIZATION](../../AUTHORIZATION.json)과 parent의 private 계산 위임을 재사용한다.
작업은 `codex/roadmap9-hierarchy`의 격리 worktree에서 수행한다. 새 owner는 public export/action이 아니다.

## 소유자와 계산 경계

`indexHierarchyModel(model,maxNodes)`는 이미 정규화된 opaque key를 재해석하지 않는다.
Node의 유일성·canonical preorder·parent/child/depth 일치·root metadata·finite nonnegative total과 residual,
source row 참조와 ignored-internal diagnostics를 검사한다. 잘못된 metadata를 layout에서 복구하지 않는다.
Synthetic root를 authored ignored value로 위조할 수 없다. 반환 index는 로컬 계산 보조값이며 저장 schema가 아니다.

`layoutHierarchyTree(model,options)`는 명시 `nodeSize:[breadth,depth]`, `siblingGap`, `depthGap`,
`orientation`을 받는다. Width/height와 간격은 finite nonnegative다. Vertical은 breadth x/depth y이며
horizontal은 그 결과의 정확한 전치다. Sibling 순서는 model의 childrenKeys 그대로다.
Key/value/custom-field 정렬은 후속 semantic owner의 책임이며 geometry가 추론하지 않는다.

Children은 겹치는 depth의 오른쪽/왼쪽 contour가 node breadth+gap 이상 떨어지도록 순차 이동한다.
Parent는 첫 child와 마지막 child의 중심에 놓인다. Persistent contour가 긴 단일 자식 chain의 tail을 공유하여
각 ancestor에서 전체 depth 배열을 복사하지 않는다. Shape가 복잡한 경우에도 모든 contour 탐색을 work에 누적한다.

Radial은 기존 `polarToCartesian` owner의 위쪽 기준 시계방향 degree를 재사용한다.
명시 `radius`, `startAngle`, `(0,360]` sweep을 받고, 깊이/maxDepth를 반경에 매핑한다.
Breadth domain 양 끝에 step의 절반을 두어 full-circle 첫/마지막 sibling이 같은 seam에 겹치지 않게 한다.
단일 breadth 위치는 sweep 중앙, root-only 반경은0이다. 결과에는 theta/radius와 Cartesian x/y를 함께 담는다.
여기서 방사형 node box의 비중첩이나 그래픽 clipping/label 배치는 주장하지 않는다.

입력과 caller options는 수정하지 않고 결과를 복제·freeze한다. Empty와 all-zero hierarchy도 key를 보존한다.
Finite arithmetic overflow는 명확히 거부한다. MAX_VALUE 폭 두 sibling의 유효한 ±MAX/2 좌표는 허용하고,
세 sibling 간격이 overflow하는 경우는 거부한다. Model의 검증 비용과 layout 비용을 공통10M work에 합산한다.
기본 maxNodes10,000, 명시 확장에도 같은 work 한도가 적용된다.

## 독립 검증과 실측

`test/oracles/hierarchy-tree.js`는 production import 없이 작은 tree의 모든 descendant 쌍을 depth별 비교한다.
Production의 persistent contour/index 구조를 재현하지 않는다. Literal 좌표에 anchor하고
고정4개+seeded40개 shape를 exact 비교한다. 수평 전치, parent midpoint, 같은 depth 간격,
방사형 각도·반경, 배율 변화, source immutability, empty/forest, invalid model/options도 검사한다.

| 명령 | 결과 |
| --- | --- |
| `node --test --experimental-test-coverage --test-coverage-include='src/grammar/hierarchy/*.js' test/unit/grammar/hierarchy-normalize.test.js test/unit/grammar/hierarchy-input.test.js test/unit/grammar/hierarchy-model.test.js test/unit/grammar/hierarchy-tree.test.js` | 37 passed; 네 owner100/100/100 |
| Canonical critical floor95/90/100 검사 | 네 owner passed, 기준 유지 |
| `node scripts/check-hierarchy-fixtures.js` | 9개 독립 aggregate/input/tree fixture와 call/input/expected/actual/diff SHA 저장 |
| `node scripts/run-tests.js contracts contracts/test-discovery.test.js contracts/source-boundaries.test.js contracts/package-boundaries.test.js contracts/package-artifact.test.js` | 38 passed |
| `npm run package:check` | 687entries/1,024,447packed/4,767,355unpacked bytes |
| `npm run package:bundle` | 설치 artifact의 Full/Basic browser build; gzip510,544/287,705bytes 유지 |

증거는 `.artifacts/validation/hierarchy-tree/`에 보존한다. 기존685-entry 한도 실패도 보존한다.
새 source2개만큼 entry cap을687로 올렸고 크기는 실측 최소1,000byte 경계인1,025,000/4,768,000으로 조정했다.
Private owners는 public entry import graph에 없으며 기존 renderer와 bundle 크기는 유지된다.
Main 통합 시 parent가 누적 크기를 다시 측정한다. 전체 통합·realistic/render/browser를 이 private checkpoint만으로 대체하지 않는다.

## 남은 의무

후속 partition 계산과 보정 합산 정책은 [PARTITION_KERNEL](PARTITION_KERNEL.md)에 기록한다. 아래 항목은 이 checkpoint 시점의 상태다.

Sibling 정렬, treemap slice/dice/squarify, partition 공유 계산을 이어 구현한다.
Public hierarchy/layout resources의 create/edit/revise/remove, 정확한 dataset row identity와 refs,
persistence/inspection/scene/selection/hit/accessibility, composition 및 SVG/Canvas/PNG/PDF 소비자는 아직 연결하지 않았다.
새 rendered tree/treemap/partition public flow는 실행 가능한 primitive 검토 뒤 진행한다.
따라서 이 수치 checkpoint는 STEP-020이나 전체77개 카드의 완료가 아니다.
