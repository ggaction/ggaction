# Roadmap 6 Phase 5 — Guides labels and appearance

## 상태와 목표

상태: W1·W2 구현·검증 완료, W3 진행 중, W4–W5 진행 예정. [W3 A explicit text source와 #110](RESULTS_W3_TEXT_SOURCE.md), [W3 B1 semantic label content와 #111/#112](RESULTS_W3_LABEL_CONTENT.md), [W3 B2 createMarkLabels](RESULTS_W3_MARK_LABELS.md), [W3 C1 Rect datum/span 기반과 #113](RESULTS_W3_REFERENCE_RECT.md), [W3 C2 reference line/band와 #114](RESULTS_W3_REFERENCES.md)을 구현·검증했다. Annotation 선행으로 [source-owned Text scale ownership #115](RESULTS_W3_TEXT_SCALE_OWNERSHIP.md)를 수정했다. [W2 통합 결과](RESULTS_W2_INTEGRATION.md)를 따른다. [전체 실행 승인](../APPROVAL.md)을 적용한다. [Phase 4 X](../phase4/REVIEW.md)와 [52개 현재 동작 재현](BASELINE.md)을 바탕으로 [W1 계약](CONTRACT_W1.md)의 [A1 Polar 생성 8개](RESULTS_W1_CREATE.md)와 [A2 optional component 정렬](RESULTS_W1_OPTIONAL.md)을 구현했다. [A3 Parallel field 축 lifecycle](RESULTS_W1_PARALLEL.md)까지 완료했다. [W2 A standalone size 편집](RESULTS_W2_SIZE.md)도 완료했다. W2 B/C content·edge layout까지 통합 검증했다. W3–W5는 남아 있다.

완성 chart에서 시작한 사용자가 축·범례·라벨·테마까지 하위 public action으로 내려갈 수 있게 한다.

W2의 [shape-only crash #86](RESULTS_W2_SHAPE.md)과 [categorical bottom mode #87](RESULTS_W2_BOTTOM.md)도 수정·검증했다. B content와 C2 family×edge 통합을 완료했다.

[B1 explicit content 생성과 recipe provenance](RESULTS_W2_CONTENT_CREATE.md)의 #88/#89를 수정·검증했다. [Inferred point #90](RESULTS_W2_INFERENCE.md)도 수정·검증했다. [B2 partial 제거와 hidden title #91](RESULTS_W2_REMOVAL.md)도 완료했다. [B2 content 교체 편집과 companion style #92](RESULTS_W2_CONTENT_EDIT.md)도 완료했다. [Automatic recipe replay #93](RESULTS_W2_RECIPE_REPLAY.md)도 수정·검증했다. [C2 interval 네 방향·공통 item layout과 hidden title #94](RESULTS_W2_INTERVAL_EDGES.md)를 구현·검증했다. [C2 stroke-width 네 방향과 overflow #95](RESULTS_W2_WIDTH_EDGES.md)도 구현·검증했다. [C2 size item owner·standalone 네 방향과 #96](RESULTS_W2_SIZE_EDGES.md)도 구현·검증했다. [C2 combined horizontal group·title gap·creation order #97](RESULTS_W2_COMBINED_EDGES.md)도 구현·검증했다. [C2 same-edge collision과 title-first bordered legend #98/#99](RESULTS_W2_GUIDE_COLLISIONS.md)도 수정·검증했다. [C2 compatible color legend edge transitions #100](RESULTS_W2_COLOR_TRANSITIONS.md)도 구현·검증했다. [C2 hidden categorical title 공간과 legacy 복원 #101](RESULTS_W2_HIDDEN_CATEGORICAL.md)을 수정·검증했다. [C2 single horizontal occupied alignment/offset #102](RESULTS_W2_OCCUPIED_ALIGNMENT.md)을 수정·검증했다. [C2 side alignment·title-style·gradient title option parity #103](RESULTS_W2_OPTION_PARITY.md)를 수정·검증했다. [C2 opacity sample/stroke/font 간격과 left shared lane #104](RESULTS_W2_OPACITY_SPACING.md)를 수정·검증했다. [C2 interval/width 실제 stroke spacing #105](RESULTS_W2_ITEM_STROKE_SPACING.md)를 수정·검증했다. [C2 categorical recipe/shape/font spacing #106](RESULTS_W2_CATEGORICAL_SPACING.md)을 수정·검증했다. [Opacity symbol TypeScript parity #107](RESULTS_W2_OPACITY_SYMBOL_TYPES.md)와 [categorical side option parity #108](RESULTS_W2_CATEGORICAL_SIDE_OPTIONS.md)를 수정·검증했다. [Combined size default #109](RESULTS_W2_COMBINED_SIZE_APPEARANCE.md)와 [전체 통합](RESULTS_W2_INTEGRATION.md)을 완료했다.

## 선행 조건

- [Phase 3](../phase3/GOAL.md)의 R6-P3-X 승인과 필요한 결과.
- [Phase 4](../phase4/GOAL.md)의 R6-P4-X 승인과 필요한 결과.

## 구체적인 작업 묶음

### R6-P5-W1 — Polar 복원과 Parallel 축 편집

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D07, F17.
- 작업: Cartesian/Polar/Parallel component create/edit/remove/recreate matrix를 완성한다. Polar focused 생성의 공개 경계를 정리하고 dimension-key 기반 editParallelAxis를 설계한다.
- 완료 조건: title:false→create title→edit→remove→recreate가 public chain으로 가능. Font/format/tick count가 resize·scale edit 뒤 유지.

### R6-P5-W2 — Legend content와 edge layout

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D08.
- 작업: Standalone/combined size, categorical/continuous/interval/width legend의 edge 지원과 recipe 편집을 공통 layout owner로 연결한다. Legacy bottom mode를 명시한다.
- 완료 조건: 지원하는 각 kind×edge×lifecycle 검증, unsupported 셀 이유 명시. Combined color/shape 일부 제거 뒤 설명과 graphics가 일치.

### R6-P5-W3 — Final-item labels·reference·common format

- 상대 규모: L. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D13, F14, F18.
- 작업: 명시적 source mark와 category/aggregate/share content, data/plot anchor reference, annotation을 text/rule/rect owner 위에 제공한다. Axis/legend/text formatter·rotation unit을 정리한다.
- 완료 조건: 집계 Bar/Pie에 final item당 label 하나, percent 분모 검증. Multiple eligible marks에서 explicit source가 작동. Scale/data/filter 후 label과 anchor 수렴.

### R6-P5-W4 — Program theme와 local override

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D17, F18.
- 작업: Theme owner를 추가하고 기존 font/color token과 mark·guide default를 연결한다. Explicit local/inherited 구분과 reset을 저장한다.
- 완료 조건: Light/dark와 override/reset에서 axes·legend·text·Parallel까지 갱신. Theme 변경 전후 statistical values/group/domain/order 동일.

### R6-P5-W5 — Opt-in fitting과 guide label layout

- 상대 규모: M. 시간 약속이 아닌 변경 구조 비교다.
- 연결: D17, F18.
- 작업: Bounded deterministic text fitting과 guide wrap/rotation/overlap 정책을 기존 text metrics 위에 추가한다. Fixed Canvas default와 분리한다.
- 완료 조건: 긴 title/legend/axis label 사례에서 bounds와 최소 plot을 만족하거나 explicit overflow. 반복 호출 수렴, 무한 layout loop 없음.

## 검증과 종료

- [VALIDATION.md](../VALIDATION.md)의 공통 matrix와 각 작업의 acceptance를 적용한다.
- Runtime/type/contract/card/docs 변경은 각 conceptual change와 함께 완료한다.
- [STEP1.md](STEP1.md)의 실행 체크를 갱신하고 [GATES.md](GATES.md)에 실제 증거만 기록한다.
- R6-P5-X 승인 전 이 결과를 전제로 하는 다음 단계 구현을 시작하지 않는다.
- 구현하지 않은 후보는 완료로 표시하지 않고 [추적 원장](../TRACEABILITY.md)에 처분을 남긴다.
