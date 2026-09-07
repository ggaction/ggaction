# 선택 항목과 구현·검증 추적

선택 25개는 각각 하나의 primary Phase를 갖는다. action 개수는 25개와 다르다. 한 기능이 여러 focused action을 만들거나 기존 option union만 확장할 수 있다. PROPOSALS.json이 범위의 machine source다.

| ID | Primary Phase | 계약 | 필수 evidence owner | status |
| --- | --- | --- | --- | --- |
| R02 | 4 | [파생 데이터 정의 편집과 종속 갱신](features/02-derived-editing.md) | feature 내 독립 oracle/완료 조건 → Phase 4 STEP1 evidence | Proposed / 미구현 |
| R05 | 2 | [결측 조합 완성과 대체](features/05-complete-impute.md) | feature 내 독립 oracle/완료 조건 → Phase 2 STEP1 evidence | Proposed / 미구현 |
| R06 | 1 | [조건·문자열·null 계산식](features/06-computed-expressions.md) | feature 내 독립 oracle/완료 조건 → Phase 1 STEP1 evidence | Proposed / 미구현 |
| R07 | 1 | [그룹 정규화·기준값 비교](features/07-normalization.md) | feature 내 독립 oracle/완료 조건 → Phase 1 STEP1 evidence | Proposed / 미구현 |
| R08 | 2 | [주간·요일·시간대 버킷](features/08-calendar-buckets.md) | feature 내 독립 oracle/완료 조건 → Phase 2 STEP1 evidence | Proposed / 미구현 |
| R09 | 2 | [기간 기반 window와 최소 관측수](features/09-duration-windows.md) | feature 내 독립 oracle/완료 조건 → Phase 2 STEP1 evidence | Proposed / 미구현 |
| R10 | 3 | [가중 통계·histogram·KDE](features/10-weighted-statistics.md) | feature 내 독립 oracle/완료 조건 → Phase 3 STEP1 evidence | Proposed / 미구현 |
| R19 | 5 | [다중 채널의 원자적 재인코딩](features/19-atomic-encoding.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Proposed / 미구현 |
| R20 | 5 | [Parallel 차원별 scale 집중 편집](features/20-parallel-scale.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Proposed / 미구현 |
| R21 | 5 | [중첩 band offset scale 집중 편집](features/21-offset-scales.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Proposed / 미구현 |
| R22 | 5 | [필드 기반 stroke 색상](features/22-stroke-color.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Proposed / 미구현 |
| R23 | 5 | [크기 scale의 비선형·단계형 mapping](features/23-size-scale-types.md) | feature 내 독립 oracle/완료 조건 → Phase 5 STEP1 evidence | Proposed / 미구현 |
| R25 | 11 | [미사용 dataset·scale·coordinate 안전 삭제](features/25-remove-resources.md) | feature 내 독립 oracle/완료 조건 → Phase 11 STEP1 evidence | Proposed / 미구현 |
| R27 | 6 | [좌표 frame 종횡비와 데이터 단위비](features/27-coordinate-aspect.md) | feature 내 독립 oracle/완료 조건 → Phase 6 STEP1 evidence | Proposed / 미구현 |
| R29 | 6 | [Polar 중심과 frame 반지름·배치](features/29-polar-frame.md) | feature 내 독립 oracle/완료 조건 → Phase 6 STEP1 evidence | Proposed / 미구현 |
| R31 | 7 | [원본 마크를 보존하는 붙임 라벨 삭제](features/31-remove-labels.md) | feature 내 독립 oracle/완료 조건 → Phase 7 STEP1 evidence | Proposed / 미구현 |
| R32 | 7 | [선택된 final item만 라벨링](features/32-selected-labels.md) | feature 내 독립 oracle/완료 조건 → Phase 7 STEP1 evidence | Proposed / 미구현 |
| R33 | 7 | [의미 기반 라벨 anchor와 배치 정책](features/33-semantic-label-anchors.md) | feature 내 독립 oracle/완료 조건 → Phase 7 STEP1 evidence | Proposed / 미구현 |
| R36 | 7 | [데이터를 추적하는 통계 참조선·밴드](features/36-statistical-references.md) | feature 내 독립 oracle/완료 조건 → Phase 7 STEP1 evidence | Proposed / 미구현 |
| R37 | 8 | [연속 범례의 명시적인 표본값](features/37-legend-values.md) | feature 내 독립 oracle/완료 조건 → Phase 8 STEP1 evidence | Proposed / 미구현 |
| R38 | 8 | [결합 범례의 channel block별 편집](features/38-legend-blocks.md) | feature 내 독립 oracle/완료 조건 → Phase 8 STEP1 evidence | Proposed / 미구현 |
| R39 | 8 | [범주 표시명과 facet header 배치](features/39-display-names-headers.md) | feature 내 독립 oracle/완료 조건 → Phase 8 STEP1 evidence | Proposed / 미구현 |
| R43 | 10 | [Polar·Parallel facet와 repeat 지원](features/43-polar-parallel-facets.md) | feature 내 독립 oracle/완료 조건 → Phase 10 STEP1 evidence | Proposed / 미구현 |
| R47 | 9 | [사용자 theme tokens와 composition 전파](features/47-custom-theme.md) | feature 내 독립 oracle/완료 조건 → Phase 9 STEP1 evidence | Proposed / 미구현 |
| R49 | 9 | [둥근 모서리와 stroke cap·join](features/49-shape-style-details.md) | feature 내 독립 oracle/완료 조건 → Phase 9 STEP1 evidence | Proposed / 미구현 |

## 후속 통합 의무

- R02 data revisions는 Phase 7의 labels/references, Phase 8의 legend content, Phase 10의 Polar/Parallel source replay, Phase 11의 resources와 다시 검증한다.
- R20/21/22/23 scale consumers는 R19 atomic final validation과 R43 nested/facet resolution을 검증한다.
- R27/29 frame은 R33 anchors, R39 header occupied layout, R43 local panels에서 검증한다.
- R31/32/33 label selection/removal은 R36 source dependency와 R47 theme font 재배치에서 검증한다.
- R37/38/39 guide recipes는 R47 theme, R43 source replay 후 content와 style 보존을 검증한다.
- R25 collector는 위 모든 참조를 포함해야 한다.

Phase 12는 후속 통합 cells를 전부 Current evidence로 닫는다. 최초 Phase의 scoped tests 통과만으로 통합 의무를 삭제하지 않는다.
