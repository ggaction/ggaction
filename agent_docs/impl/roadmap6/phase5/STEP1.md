# Roadmap 6 Phase 5 Step 1 — Guides labels and appearance

## 진행 상태

- [x] 사전 baseline 조사 — [52 cases / 260 immutable checks와 replay](BASELINE.md)
- [x] A Gate의 정확한 결정·호환성·검증 범위 확정
- [x] A Gate 증거 commit/push와 전체 실행 승인 기록
- [x] R6-P5-W1 Polar 복원과 Parallel 축 편집 — A1/A2/A3 검증 완료
- [x] W1 A1 Polar focused 생성 8개 공개 — [계약](CONTRACT_W1.md), [검증](RESULTS_W1_CREATE.md)
- [x] W1 A2 Cartesian/Polar optional component 정렬 — [검증](RESULTS_W1_OPTIONAL.md)
- [x] W1 A3 Parallel field 기반 축 편집·생성·제거 — [검증](RESULTS_W1_PARALLEL.md)
- [x] W1 A3 선행 오류: dimension 재배치 뒤 stale axis 수정 — [검증](RESULTS_PARALLEL_REPLAY.md)
- [x] R6-P5-W2 Legend content와 edge layout — [계약](CONTRACT_W2.md)
- [x] W2 A standalone size editor/owner isolation — [검증](RESULTS_W2_SIZE.md)
- [x] W2 B 선행 shape-only 오류 #86 — [검증](RESULTS_W2_SHAPE.md)
- [x] W2 B1 explicit content 생성·recipe provenance와 layer order, #88/#89 — [검증](RESULTS_W2_CONTENT_CREATE.md)
- [x] W2 B2 선행 point omission inference #90 — [검증](RESULTS_W2_INFERENCE.md)
- [x] W2 B2 partial channel 제거·공통 재작성과 hidden title #91 — [검증](RESULTS_W2_REMOVAL.md)
- [x] W2 B2 editLegend content 교체와 companion style #92 — [검증](RESULTS_W2_CONTENT_EDIT.md)
- [x] W2 B2 automatic recipe의 companion/data/scale replay와 #93 — [검증](RESULTS_W2_RECIPE_REPLAY.md)
- [x] W2 C1 명시적 categorical bottom mode, 오류 #87 — [검증](RESULTS_W2_BOTTOM.md)
- [x] W2 C2 item layout 기반·interval 네 방향과 hidden title bounds #94 — [검증](RESULTS_W2_INTERVAL_EDGES.md)
- [x] W2 C2 stroke-width 네 방향과 Canvas overflow #95 — [검증](RESULTS_W2_WIDTH_EDGES.md)
- [x] W2 C2 size item owner·standalone 네 방향·large sample/border #96 — [검증](RESULTS_W2_SIZE_EDGES.md)
- [x] W2 C2 combined categorical+size 네 방향 group·큰 label/title gap·creation order #97 — [검증](RESULTS_W2_COMBINED_EDGES.md)
- [x] W2 C2 공통 same-edge collision과 title-first bordered legend #98/#99 — [검증](RESULTS_W2_GUIDE_COLLISIONS.md)
- [x] W2 C2 compatible gradient↔interval 네 edge transition #100 — [검증](RESULTS_W2_COLOR_TRANSITIONS.md)
- [x] W2 C2 hidden categorical title 공간과 legacy 복원 #101 — [검증](RESULTS_W2_HIDDEN_CATEGORICAL.md)
- [x] W2 C2 single horizontal occupied alignment/offset #102 — [검증](RESULTS_W2_OCCUPIED_ALIGNMENT.md)
- [x] W2 C2 side alignment·title style·gradient title 편집 option parity #103 — [검증](RESULTS_W2_OPTION_PARITY.md)
- [x] W2 C2 opacity stroke/sample/font 간격과 mirrored side lane #104 — [검증](RESULTS_W2_OPACITY_SPACING.md)
- [x] W2 C2 interval/width 실제 stroke spacing #105 — [검증](RESULTS_W2_ITEM_STROKE_SPACING.md)
- [x] W2 C2 categorical recipe/shape/font 실제 spacing #106 — [검증](RESULTS_W2_CATEGORICAL_SPACING.md)
- [x] W2 opacity symbol TypeScript/runtime parity #107 — [검증](RESULTS_W2_OPACITY_SYMBOL_TYPES.md)
- [x] W2 C2 categorical side option parity #108 — [검증](RESULTS_W2_CATEGORICAL_SIDE_OPTIONS.md)
- [x] W2 combined size의 edge-dependent default #109 — [검증](RESULTS_W2_COMBINED_SIZE_APPEARANCE.md)
- [x] W2 C2 전체 family×edge×lifecycle 통합 matrix — [결과](RESULTS_W2_INTEGRATION.md)
- [x] R6-P5-W3 Final-item labels·reference·common format
- [x] W3 A explicit text source와 source dependency replay, #110 — [계약](CONTRACT_W3_TEXT_SOURCE.md), [결과](RESULTS_W3_TEXT_SOURCE.md)
- [x] W3 B1 category/value/share content·percent·Histogram replay·precision types, #111/#112 — [계약](CONTRACT_W3_LABEL_CONTENT.md), [결과](RESULTS_W3_LABEL_CONTENT.md)
- [x] W3 B2 createMarkLabels facade — [계약](CONTRACT_W3_MARK_LABELS.md), [결과](RESULTS_W3_MARK_LABELS.md)
- [x] W3 C1 reference 기반: Rect datum·plot span·temporal selection #113 — [계약](CONTRACT_W3_REFERENCE_RECT.md), [결과](RESULTS_W3_REFERENCE_RECT.md)
- [x] W3 C2 createReferenceLine/createReferenceBand와 Rule guide #114 — [계약](CONTRACT_W3_REFERENCES.md), [결과](RESULTS_W3_REFERENCES.md)
- [x] W3 annotation 선행 source-owned Text scale/domain/guide ownership #115 — [계약](CONTRACT_W3_TEXT_SCALE_OWNERSHIP.md), [결과](RESULTS_W3_TEXT_SCALE_OWNERSHIP.md)
- [x] W3 annotation 기반 independent Text datum 좌표 — [계약](CONTRACT_W3_TEXT_DATUM.md), [결과](RESULTS_W3_TEXT_DATUM.md)
- [x] W3 D createAnnotation mark/data/plot anchor — [계약](CONTRACT_W3_ANNOTATION.md), [결과](RESULTS_W3_ANNOTATION.md)
- [x] W3 후속 common value formatter — [계약](CONTRACT_W3_COMMON_FORMAT.md), [결과](RESULTS_W3_COMMON_FORMAT.md)
- [x] W3 후속 rotation unit — [계약](CONTRACT_W3_ROTATION_UNITS.md), [결과](RESULTS_W3_ROTATION_UNITS.md)
- [x] R6-P5-W4 Program theme와 local override — [계약](CONTRACT_W4_THEME.md), [결과](RESULTS_W4_THEME.md)
- [x] W4 light/dark apply·swap·remove와 이후 action 완료 수렴
- [x] W4 explicit local·field palette·통계 의미 불변성 전수 검증
- [x] W4 dark-theme-scatterplot primitive/public state·render parity
- [x] W4 Full/Basic/types/docs/canonical package·browser consumer 검증
- [x] R6-P5-W5 Opt-in fitting과 guide label layout — [계약](CONTRACT_W5_FITTING.md), [결과](RESULTS_W5_FITTING.md)
- [x] 모든 시각 variant의 primitive target 작성·표시·V 승인 — `fitted-long-labels`
- [x] 승인된 variant의 public 구현과 같은 실행의 primitive/public render 비교
- [x] 누적 검증·migration·문서·원장 동기화
- [x] X Gate의 증거 commit/push와 전체 실행 승인 기록 — [검토](REVIEW.md)

위 체크는 미래 실행용이다. 계획 문서를 만든 사실을 구현 완료나 Gate 승인으로 표시하지 않는다.

## 순서

1. [GOAL.md](GOAL.md)의 범위를 기준 source에서 다시 확인한다. 변한 근거는 별도 delta로 기록한다.
2. [GATES.md](GATES.md)의 A review package를 구체화하고 승인 상태를 확인한다.
3. 작업 묶음을 위 순서로 진행한다. 공유 owner 변경은 dependent facade보다 먼저 완료한다.
4. 시각 변화가 있으면 해당 variant의 primitive target을 먼저 작성하고 V 승인 뒤 public flow를 구현한다.
5. 하나의 coherent conceptual change를 검증해 commit/push한 뒤 다음 변경으로 이동한다. 한 W가 크면 공개 계약과 owner 경계로 나눈다.
6. Source→unit/type→contract/trace→render→consumer 순서로 해당 변경에 필요한 검증을 확장한다.
7. 실패는 원인·입력·남은 작업으로 기록하며 통과 사례만 추려 Gate를 완료하지 않는다.
8. 승인 범위의 결과를 X package로 닫고 사용자 승인을 받은 뒤 dependent phase로 이동한다.

## 실행 기록에 남길 것

- 기준/결과 commit과 remote ref, 실제 실행 명령과 exit/result.
- 변경한 public call의 before/after 및 의미·appearance 차이.
- Trace의 의미 있는 child owner와 이전 program 불변성.
- 필요한 경우 artifact manifest, input hash, 이미지와 exact target public call chain.
- 해결·유지·보류한 finding ID와 다음 단계에 남긴 dependency.
