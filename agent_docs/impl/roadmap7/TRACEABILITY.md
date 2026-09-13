# 선택 항목과 구현·검증 추적

선택 25개는 각각 하나의 primary Phase를 갖는다. action 개수는 25개와 다르다. 한 기능이 여러 focused action을 만들거나 기존 option union만 확장할 수 있다. PROPOSALS.json이 범위의 machine source다. [IMPLEMENTATION_MAP.json](IMPLEMENTATION_MAP.json)은 기존 code/test 및제안 public surface를, [ACCEPTANCE_CASES.json](ACCEPTANCE_CASES.json)은 고정된 N/E/L 사례를 연결한다. 모두 계획이며 통과 증거는 아니다.

| ID | Primary Phase | 계약 | 필수 evidence owner | status |
| --- | --- | --- | --- | --- |
| R02 | 4 | [파생 데이터 정의 편집과 종속 갱신](features/02-derived-editing.md) | [Phase 4 STEP1](phase4/STEP1.md) · `d29287c9` | primary 구현 완료 / 후속 새 consumer 통합 대기 |
| R05 | 2 | [결측 조합 완성과 대체](features/05-complete-impute.md) | [Phase 2 STEP1](phase2/STEP1.md) · `9d4d0840` | primary 구현 완료 / R02 edit 통합 대기 |
| R06 | 1 | [조건·문자열·null 계산식](features/06-computed-expressions.md) | [Phase 1 STEP1](phase1/STEP1.md) · `b891d1d5` | primary 구현 완료 / R02 edit 통합 대기 |
| R07 | 1 | [그룹 정규화·기준값 비교](features/07-normalization.md) | [Phase 1 STEP1](phase1/STEP1.md) · `b891d1d5` | primary 구현 완료 / R02 edit 통합 대기 |
| R08 | 2 | [주간·요일·시간대 버킷](features/08-calendar-buckets.md) | [Phase 2 STEP1](phase2/STEP1.md) · `9d4d0840` | primary 구현 완료 / R02 edit 통합 대기 |
| R09 | 2 | [기간 기반 window와 최소 관측수](features/09-duration-windows.md) | [Phase 2 STEP1](phase2/STEP1.md) · `9d4d0840` | primary 구현 완료 / R02 edit 통합 대기 |
| R10 | 3 | [가중 통계·histogram·KDE](features/10-weighted-statistics.md) | [Phase 3 STEP1](phase3/STEP1.md) · `da0ca4e2`, `276c8318`, `32ddfcdd` | primary 구현 완료 / R02 edit 통합 대기 |
| R19 | 5 | [다중 채널의 원자적 재인코딩](features/19-atomic-encoding.md) | `test/contracts/atomic-encoding.test.js`; strict types; installed package; `58d9e51a` | Implemented-primary / R32·R36·R38 미래 consumer 통합 대기 |
| R20 | 5 | [Parallel 차원별 scale 집중 편집](features/20-parallel-scale.md) | `test/unit/actions/scales/parallel-scale.test.js`; `test/contracts/phase5-scale-types.test.js`; `eaea2b8b` | Implemented-primary |
| R21 | 5 | [중첩 band offset scale 집중 편집](features/21-offset-scales.md) | `test/unit/actions/scales/offset-scale.test.js`; grouped-bar chart fixtures; package consumer; `335ce4f0` | Implemented-primary |
| R22 | 5 | [필드 기반 stroke 색상](features/22-stroke-color.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Implemented-primary (`3fc40a66`) |
| R23 | 5 | [크기 scale의 비선형·단계형 mapping](features/23-size-scale-types.md) | `test/contracts/size-scale-types.test.js`; `test/unit/grammar/scales/size.test.js`; installed package; `1b68a8ba` | Implemented-primary / R19·R37·R43 통합 대기 |
| R25 | 11 | [미사용 dataset·scale·coordinate 안전 삭제](features/25-remove-resources.md) | feature 내 독립 oracle/완료 조건 → Phase 11 STEP1 evidence | Proposed / 미구현 |
| R27 | 6 | [좌표 frame 종횡비와 데이터 단위비](features/27-coordinate-aspect.md) | `test/contracts/coordinate-aspect.test.js`; strict types; installed package; `ded3b073` | Implemented-primary / R33·R39·R43 소비 회귀 대기 |
| R29 | 6 | [Polar 중심과 frame 반지름·배치](features/29-polar-frame.md) | `test/contracts/polar-frame.test.js`; pure grammar/type/MCP/package; `4aa9da65` | Implemented-primary / R33·R43 소비 회귀 대기 |
| R31 | 7 | [원본 마크를 보존하는 붙임 라벨 삭제](features/31-remove-labels.md) | `test/contracts/remove-labels.test.js`; strict types; cards/MCP; installed package; `73e3d53e` | Implemented-primary / R43 facet·repeat 소비 회귀 대기 |
| R32 | 7 | [선택된 final item만 라벨링](features/32-selected-labels.md) | `test/contracts/selected-labels.test.js`; strict types; cards/MCP; installed package; `ee3f3b02` | Implemented-primary / R43 facet·repeat 소비 회귀 대기 |
| R33 | 7 | [의미 기반 라벨 anchor와 배치 정책](features/33-semantic-label-anchors.md) | `test/contracts/semantic-label-anchors.test.js`; `test/unit/layout/semantic-label-placement.test.js`; `95968031` | Implemented-primary / R43 facet·repeat 소비 회귀 대기 |
| R36 | 7 | [데이터를 추적하는 통계 참조선·밴드](features/36-statistical-references.md) | `test/contracts/statistical-references.test.js`; `test/contracts/label-reference-lifecycle.test.js`; `d7136174`; `5832228c` | Implemented-primary / R25 resource collector 통합 대기 |
| R37 | 8 | [연속 범례의 명시적인 표본값](features/37-legend-values.md) | `test/contracts/legend-values.test.js`; installed package/browser consumers; `8760111d`; pixel parity `547eae1b` | Implemented-primary / R38 block selector·R43/R47 consumer 통합 대기 |
| R38 | 8 | [결합 범례의 channel block별 편집](features/38-legend-blocks.md) | `test/contracts/legend-blocks.test.js`; strict Full/Basic types; installed package/browser consumers; `7ffafe02` | Implemented-primary / R19·R43·R47 후속 consumer 통합 대기 |
| R39 | 8 | [범주 표시명과 facet header 배치](features/39-display-names-headers.md) | R39-N01/N02/E01/L01/L02; display-label/axis/legend/facet tests; decoded PNG parity; package consumers; `20a25911` | Implemented-primary |
| R43 | 10 | [Polar·Parallel facet와 repeat 지원](features/43-polar-parallel-facets.md) | feature 내 독립 oracle/완료 조건 → Phase 10 STEP1 evidence | Proposed / 미구현 |
| R47 | 9 | [사용자 theme tokens와 composition 전파](features/47-custom-theme.md) | theme unit/composition/contracts/render/package; R47-N01~N04/E01/L01; `ce286929`; R49 결합 lifecycle `1c5192f2` | Implemented-primary / R43 local-panel 소비 회귀 대기 |
| R49 | 9 | [둥근 모서리와 stroke cap·join](features/49-shape-style-details.md) | rounded geometry/bounds/renderers/direct marks/facades/types/docs/package; R49-N01~N03/E01/L01/L02; `f650bba2`…`1c5192f2` | Implemented-primary / R43 local-panel 소비 회귀 대기 |

## 후속 통합 의무

- R02 data revisions는 Phase 7 labels/references 통합을 `5832228c`에서 검증했다. Phase 8의 legend content, Phase 10의 Polar/Parallel source replay, Phase 11의 resources에서 다시 검증한다.
- R20/21/22/23 scale consumers의 R19 atomic final validation은 `58d9e51a`에서 완료했다. R43
  nested/facet resolution과 R32/R36/R38의 새 consumer는 각 primary Phase에서 재검증한다.
- R27/29 frame은 R33 anchors, R39 header occupied layout, R43 local panels에서 검증한다.
- R31/32/33 label selection/removal은 R36 source dependency와 R47 theme font 재배치에서 검증한다.
- R37/38/39 guide recipes의 R47 theme 소비와 R49 style/block/display-label 보존은 Phase 9에서 검증했다. R43 source replay 뒤 다시 검증한다.
- R25 collector는 위 모든 참조를 포함해야 한다.

Phase 12는 후속 통합 cells를 전부 Current evidence로 닫는다. 최초 Phase의 scoped tests 통과만으로 통합 의무를 삭제하지 않는다.
