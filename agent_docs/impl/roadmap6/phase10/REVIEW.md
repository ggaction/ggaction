# Roadmap 6 Phase 10 X — Comparison and composition closeout

## 고정 결과

- 계약 ref는 `874104bfdd8e54591917eb650c9f284400e6016e`, 검증된 W1~W3 source ref는
  `08664f05daf18bd065592c22023589417fdec6fa`이며 둘 다
  `origin/codex/roadmap6-hierarchical-actions`에 push했다.
- `facetGrid`, `repeatCharts`, `editFacetSource`, `insertCompositionChild`,
  `removeCompositionChild`, `reorderCompositionChildren` 6개를 public Current action으로 추가했다.
- 기존 `facet`에는 explicit ordered `values`를 공개했고 기존 호출의 first-appearance order와 child identity는 유지했다.
- 현재 inventory는 direct action 234개, user-facing 228개이며 Planned action과 Planned capability는 모두 0개다.

## W1 — Facet grid·repeat·source replay

`facetGrid`는 두 source field의 ordered row/column domain과 각 cell의 실제 좌표를 canonical composition state에
저장한다. `observed`는 관측되지 않은 조합을 생성하지 않으면서 좌표의 구멍을 보존하고, `full`은 같은 위치에
명시적인 mark-free blank child를 만든다. Shared domain은 populated child만 사용하며 blank child는 independent
policy에서도 근거 없는 local domain이나 guide를 만들지 않는다.

`repeatCharts`는 direct Cartesian mark 하나의 x 또는 y encoding을 ordered field 목록으로 교체한다. 반복 channel은
기본 independent이며 명시적 shared는 union domain을 사용한다. 다른 compatible channel의 legend는 parent로 승격할
수 있다. 서로 다른 field 의미를 하나의 outer axis로 합치지 않도록 outer-axis 요청은 원자적으로 거부한다.

`editFacetSource`는 저장된 partition dataset ID, ordered domains 또는 repeat fields, layout, scale, guide, header와
title policy를 revised complete unit에 다시 적용한다. 저장된 recipe를 만족하지 못하거나 derived/composite/coordinate
역할이 맞지 않으면 이전 parent, children, trace와 caller program을 변경하지 않는다.

## W2 — Stable named-child editing

Concat composition은 stable child name을 기준으로 insert, remove, reorder한다. `before`와 `after`는 배타적이고 둘 다
생략하면 tail에 삽입한다. Remove는 sibling identity를 유지하며 한 child가 남은 concat도 materialize할 수 있지만
마지막 child 제거는 거부한다. Reorder는 기존 ID 전체를 중복·누락 없이 받으며 child object reference를 유지한 채
namespaced snapshot과 geometry를 새 순서로 다시 만든다.

Facet-derived child는 위 구조 action이나 arbitrary replacement로 canonical recipe에서 이탈할 수 없다. Facet의 허용된
수정 경로는 source, scale, guide, header와 layout owner다.

## W3 — Coordinate와 guide 지원 행렬

| Composition | Cartesian | Polar | Parallel | Guide ownership |
| --- | --- | --- | --- | --- |
| concat + named edits | unit/nested 지원 | unit/nested 지원 | unit/nested 지원 | child snapshot 소유, 암묵 승격 없음 |
| facet/facetGrid | 현재 Cartesian family 지원 | theta/radius resolver 부재로 거부 | dimension-axis resolver 부재로 거부 | axes each/outer, compatible shared legend |
| repeatCharts | direct x/y mark 지원 | positional role 차이로 거부 | field-list axis model 차이로 거부 | axes each, compatible non-repeat shared legend |

지원하지 않는 좌표 조합을 추론이나 문서만으로 지원 처리하지 않았다. 오류는 누락된 coordinate resolver를 설명하며
호출 전 상태와 trace를 보존한다. Concat의 세 coordinate family는 child data/scale/theme revision 후 named replacement로
전파하고, resize와 Canvas/SVG/PNG/PDF renderer에서 concrete snapshot을 검증했다.

## 시각·계층 증거

- Facet grid target은 North/South × Q1/Q2/Q3의 2×3 full grid이며 South/Q2가 blank child로 남는다.
  Public과 explicit primitive PNG SHA-256은 모두
  `bcf9af1b2c6751a0587f927e0eebf031de1a8aa95ba8ac054524ece56435908f`다.
- Repeat target은 speed/quality/cost의 independent x domains와 shared group legend를 가진 세 panel이다.
  Public과 explicit primitive PNG SHA-256은 모두
  `cd09c08c382f4ded91e6ca742e4c2f9519672cf1a78be255b58947b08af7774f`다.
- Stable chart slices는 exact semantic projection, graphic order, Canvas calls와 same-run decoded pixels를 비교한다.
  Public examples, browser registry, canonical documentation catalog와 generated images가 같은 프로그램을 사용한다.

## 누적 검증

| 범위 | 실제 결과 |
| --- | --- |
| unit | 2,277/2,277 pass |
| contracts | 323/323 pass |
| charts | 578/578 pass |
| docs | 47/47 pass |
| browser examples | 73/73 pass |
| realistic corpus | 243/243 pass |
| coverage | 95.42% lines, 92.19% branches, 98.94% functions; 88 critical floors pass |
| package | 486 entries, packed 586,159, unpacked 2,841,662 bytes |
| installed gzip | Full 297,211 / Basic 152,124 / SVG 6,418 bytes |

Installed artifact SHA-256은
`0a116ead5e30f86a197dabedc210e9a5a9564ddc8e6179e5aaef65f860dcf685`다. 새 composition action은 full entry와
strict declarations에 포함하고 Basic entry에는 추가하지 않았다. 승인된 한도 조정은 packed 590,000,
unpacked 2,850,000, full browser gzip 300,000 bytes이며 실제 artifact는 모두 그 아래다.

## 종료 판정

- D19와 F19는 runtime, strict declaration, Current/card/docs, generated discovery, primitive/public renderer,
  realistic lifecycle과 installed consumer 증거를 갖춘 implemented-verified 상태다.
- Polar/Parallel facet과 repeat는 지원된다고 과장하지 않고 누락된 resolver를 현재 제한으로 명시했다. 이번 범위에서
  구현을 약속한 숨은 Planned action 또는 capability는 없다.
- [전체 실행 승인](../APPROVAL.md)이 A/V/X에 적용되므로 R6-P10-X를 approved로 닫고 Phase 11 전체 감사로 이동한다.
