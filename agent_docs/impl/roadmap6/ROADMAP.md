# Roadmap 6 — Hierarchical Chart Authoring and Action Consistency

> **문서 상태 — 현재 실행 계획.** [R6-P1-X 결과](phase1/REVIEW.md)와 [Phase 2 계약](phase2/CONTRACT_REVIEW.md), B/V를 승인받아 W1–W5를 구현했다. [구현·검증 결과](phase2/RESULTS.md)를 R6-P2-X로 승인받았으며 Phase 3 [A 계약](phase3/CONTRACT_REVIEW.md)을 사용자 승인으로 기록하고 primitive 시각 목표를 준비한다.
> 액션군 범위는 사용자 선택에 따라 F01–F19로 구성했다. 후속 액션군의 구체적인 API와 행동 변경은 각 Phase Gate에서 확정한다.
> 이 문서를 작성해 달라는 요청은 모든 설계안·구현·배포의 일괄 승인을 뜻하지 않는다.
> 실행 위치는 [ROADMAP_INDEX.json](../ROADMAP_INDEX.json), 현재 제품 계약은
> [ACTION_INDEX.json](../../contract/ACTION_INDEX.json)이 소유한다.

## 목표와 판단 기준

ggaction의 핵심은 차트 전체를 짧게 정의하는 액션부터 개별 encoding, guide, style을 다루는 액션까지
여러 층위에서 작성할 수 있다는 데 있다. 이번 로드맵은 **상위에서 만들고, 중간에서 의미를 바꾸고,
아래에서 모양을 다듬는 경로가 연결된 API**를 만든다.

Pie는 기존 arc 조합으로 그릴 수 있지만 완성 차트 액션이 없다. 반대로 Parallel에는 완성 차트 액션이
있지만 축의 세부 스타일을 바꾸는 공개 경로가 부족하다. 두 문제를 같은 기준으로 해결한다.
Facade 개수를 늘리는 것만으로 완료를 판정하지 않는다.

1. 가장 짧은 모호하지 않은 호출로 의도한 차트가 완성된다.
2. 동일 결과를 만드는 하위 public chain이 존재하며 실제로 그 owner를 재사용한다.
3. 상위 생성 뒤 source·encoding·scale·guide·style을 바꿀 수 있다.
4. 편집 뒤 의미, provenance, resource identity, graphics, trace가 함께 수렴한다.
5. Runtime, TypeScript, Current 계약, card, MCP가 같은 지원 범위를 설명한다.

## 이번 로드맵 범위

2026-09-05 사용자 결정에 따라 **F01–F19의 19개 액션군**으로 구성한다.
F20 전문 차트 후보는 연구·구현·후속 분류 작업과 완료 기준에서 제외한다.
기존 오류 B01–B08과 설계 문제 D01–D20을 포함해 **47개 대상 항목, 12단계, 46개 작업 묶음**이다.
차트군 계약 13개와 하위 데이터·편집·guide·style·composition 계층을 연결하는 순서는 유지한다.

## 출발점과 조사 범위

- 기준 commit: [cee752b0580e6f31630ad5dd2224ab3b5f5f682b](https://github.com/ggaction/ggaction/commit/cee752b0580e6f31630ad5dd2224ab3b5f5f682b), package 0.0.12.
- 직접 액션 173개: user-facing 167, advanced 3, primitive 3.
- Wrapped method 284개: 직접 계약 173개와 internal 111개. Internal manifest에는 95개만 기록.
- 공개 API 43개 사례, MCP 7개 요청과 생성 코드 실행, TypeScript 4개 호출을 조사했다.
- 실행 대상은 오류·표면 불일치 B01–B08, 설계 문제 D01–D20, 추가 액션군 F01–F19다.
- 원래 감사는 모든 액션의 계약을 전수 대조한 결과다. 가능한 입력 조합 전체의 무결성 증명은 아니다.
- 이전 이슈 #64–#78의 수정·종료와 이번 신규 B 항목을 혼동하지 않는다.

[고정 감사 보고서](audit/REPORT.md), [173개 전수표](audit/ACTION_INVENTORY.md),
[재현 방법과 증거 identity](audit/README.md)를 저장소에 보존한다.
무시되는 로컬 artifact가 없어도 이 계획을 읽고 재현할 수 있다.

## 읽는 순서와 문서 소유권

| 문서 | 담당 내용 |
| --- | --- |
| 이 문서 | 전체 목표, 단계, 의존 관계, 우선순위, 완료 기준 |
| [TRACEABILITY.md](TRACEABILITY.md) | 47개 대상 항목 → 작업 묶음 → 검증 조건 |
| [PROPOSALS.json](PROPOSALS.json) | 위 추적 관계, 단계와 Proposed 상태의 기계 판독 원장 |
| [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) | 공통 API·기본값·추론·호환성 결정의 권고안과 이유 |
| [DOMAIN_ACTIONS.md](DOMAIN_ACTIONS.md) | Labels/data/guide/theme/composition의 하위 액션군 계약 |
| [VALIDATION.md](VALIDATION.md) | 수치·계층·편집·render·types·MCP·package 검증과 Gate 운영 |
| phaseN/GOAL.md | 단계 범위, 선행 조건, 구체적인 작업과 종료 조건 |
| phaseN/STEP1.md | 작업 순서와 아직 실행하지 않은 체크리스트 |
| phaseN/GATES.md | 결정·시각 목표·완성 결과별 승인 경계 |
| chart/*.md | 차트별 제안 API, 전체 계층, 저장 결과, 편집 경로, 시각 variant |

이 문서의 Proposed를 contract/planned로 자동 복사하지 않는다. 정확한 공개 계약을 사용자가 승인한
단위만 Planned로 옮기고, 구현·검증과 함께 Current로 바꾼다.

## 계층 모델

| 층위 | 사용자가 내리는 결정 | 현재 예 | Roadmap 6의 보강 |
| --- | --- | --- | --- |
| H0 | 어떤 차트·비교 구성을 만들까 | createScatterPlot, createHistogram, facet | Pie, Area, Density, Polar, ECDF, 반복 차트 |
| H1 | 어떤 분석 layer·복합 구성을 넣을까 | createRegression, createErrorBar, createGuides | Interval, reference, Raincloud와 재사용 가능한 composite |
| H2 | 어떤 데이터·mark·encoding·scale을 사용할까 | createArcMark, encodeTheta, createScale | Baseline/range, 분리된 group/layout, summary/bin/fold |
| H3 | 개별 구성요소의 스타일·배치를 어떻게 바꿀까 | editPointMark, editXAxisLabels | Polar 복원, Parallel 축, formatter, label, theme |
| H4 | 새 기능을 어떤 primitive로 구현할까 | editSemantic, createGraphics, editGraphics | 기존 세 primitive 경계 유지 |

이 모델은 package의 basic/default/extension 구분과 독립이다. 한 액션이 여러 역할을 가지면
metadata에 여러 역할을 기록할 수 있다. 모든 액션을 하나의 엄격한 트리에 억지로 배치하지 않는다.
상위 액션은 child의 validation·계산·materialization을 복제하지 않고 실제 wrapped action을 호출한다.

~~~text
createPiePlot                  H0: category별 count 또는 명시적 weight
├─ createArcMark               H2: ordinary arc, 독립 생성 가능
├─ encodeTheta                H2: 기존 partition owner
├─ encodeColor?               H2: category appearance
├─ createGuides?              H1: 이 차트에 필요한 legend
└─ createMarkLabels?          H1: 별도 후속 제안, 기본 off
   ├─ createTextMark           H2: final slice anchor
   ├─ encodeText               H2: category / aggregate / share
   └─ layoutLabels?            H3: 명시적인 label 배치

생성 후 editArcMark / encoding 재할당 / editScale / legend·text 편집
→ 명시적 consumer plan → concrete graphicSpec → renderer
~~~

Primitive로 직접 바꾼 geometry가 다음 rematerialization에서 사라지는 것은 일반 스타일 API의 대안이 아니다.
사용자가 지속적으로 바꾸어야 하는 값에는 적절한 domain owner를 둔다.

## 우선순위와 납품 묶음

| 묶음 | 단계 | 사용자가 얻는 결과 | 완성 판정 |
| --- | --- | --- | --- |
| M1 신뢰 회복 | 0–1 | 가로 Bar, 타입, data error, MCP completion, inventory 불일치 교정 | B01–B08 회귀·계약 증거 |
| M2 첫 계층 완성 | 2–4 | Pie/Donut·Density·Horizon·Area·Rose/Radial의 완성 진입점 | 하위 chain 동등성 + 의미별 defaults |
| M3 아래층 완성 | 5–6 | 축·범례·label·theme·transform·filter·role edit | 편집·제거·복원과 consumer 수렴 |
| M4 확장 차트와 비교 | 7–10 | Polar/Radar·분포·통계·복합·facet/repeat | 기반 owner 재사용 + chart별 consumer matrix |
| M5 통합 종료 | 11 | discovery, docs, package까지 일치하는 검증된 후보 | 승인 범위 잔여 Planned 0, 명시적 보류 원장 |

Milestone은 release 약속이 아니다. 한 번에 큰 변경을 병합하지 않고 아래 작업 묶음마다 독립적인
conceptual commit과 검증을 남긴다. 구현량은 S/M/L로 상대 비교하며 달력 날짜·인일은 아직 약속하지 않는다.
S는 기존 owner 위의 교정·연결, M은 여러 consumer의 lifecycle 변경, L은 새 의미·배치 정책의 설계다.

## 진행 상태

| Phase | 상태 | 범위 |
| --- | --- | --- |
| 0 | completed | 감사 기준, 우선순위, 결정 원장, 검증·Gate 정의 |
| 1 | completed | W1–W5 구현·검증과 R6-P1-X 사용자 승인. B01 lower 작성 순서는 Phase 2 W5에서 교정 |
| 2 | completed | W1–W5와 6개 public 흐름 구현·검증, A/B/V/X 사용자 승인 |
| 3 | in-progress | Pie/Donut, Density, Horizon 계약 검토 준비; A 미승인, 구현 미착수 |
| 4 | planned | Baseline, layout, order, 중심색과 Area·Rose/Radial |
| 5 | planned | 축·범례 lifecycle, label·format·theme·명시적 fitting |
| 6 | planned | Data·transform·통계·filter·composite role 편집 |
| 7 | planned | Polar Scatter/Line, Radar, Rug/Strip |
| 8 | planned | Interval/Regression, Dot/Lollipop/Dumbbell, ECDF |
| 9 | planned | Deterministic point packing과 Raincloud |
| 10 | planned | Facet grid, repeat, named child 구조 편집 |
| 11 | planned | 전체 계층·MCP·package 검증과 closeout |

## 의존 관계와 기본 실행 순서

~~~mermaid
flowchart TD
  P0["0 기준·결정"] --> P1["1 오류 교정"]
  P1 --> P2["2 공통 authoring"]
  P2 --> P3["3 Pie·Density·Horizon"]
  P2 --> P4["4 Baseline·layout·Area·Rose"]
  P3 --> P5["5 Guides·labels·theme"]
  P4 --> P5
  P4 --> P6["6 Data·통계·lifecycle"]
  P5 --> P6
  P5 --> P7["7 Polar·Radar·Rug·Strip"]
  P6 --> P7
  P7 --> P8["8 Interval·endpoint·ECDF"]
  P8 --> P9["9 Packing·Raincloud"]
  P9 --> P10["10 Composition"]
  P10 --> P11["11 통합·closeout"]
~~~

기본 실행 순서는 번호순이다. 화살표는 단계 종료에 필요한 선행 결과를 나타낸다.
Phase 3과 4의 독립 부분, Phase 5와 6의 사전 조사·설계는 다른 owner의 승인된 작업과 겹칠 수 있으나
미승인 계약이나 구현을 건너뛰는 근거로 쓰지 않는다.

- Pie의 첫 납품은 optional label/theme/fold 구현을 기다리지 않는다.
- MCP의 거짓 완료는 새 Area/Strip facade를 기다리지 않고 Phase 1에서 unresolved로 교정할 수 있다.
- Area/Rose는 baseline·측정 의미가 확정되기 전에 wrapper부터 만들지 않는다.
- Raincloud는 source·통계·slot·packing owner가 닫힌 뒤 작성한다.
- 기본 package는 그대로 두고 새 facade를 basic entry에 자동 포함하지 않는다. 실제 사용성과 bundle 영향으로 결정한다.
- Cards·types·docs 동기화는 각 작업에 포함한다. Phase 11까지 미루는 부채 항목이 아니다.

## Phase 0 — Baseline and decisions

[상세 목표](phase0/GOAL.md)에서 173개 액션, 실행 대상 47개 finding, 재현과 승인 상태를 고정한다.
[공통 결정](DESIGN_DECISIONS.md)은 추천 방향이고, 미래 공개 API의 최종 signature는 각 구현 Gate에서 확정한다.
[Gate](phase0/GATES.md)는 이번 계획의 범위·진행 순서와 Phase 1 착수 대상을 검토한다.

## Phase 1 — Reproduced correctness and contract repairs

[상세 목표](phase1/GOAL.md). 가로 Bar의 pair-role preflight, materialized data 소비 검증,
stroke:false·temporal Bar 선언, internal inventory의 전체 집합 검증을 교정한다.
MCP는 complete-chart 의도를 실제 drawable 결과로 닫거나 unresolved로 명시한다.
[Gate](phase1/GATES.md)는 현재 계약을 보존하는 오류 교정과 분석 의미 변경을 구분한다.

## Phase 2 — Shared authoring semantics

[상세 목표](phase2/GOAL.md). H0 guide 확보와 H2 create strictness를 구분하고, group identity와
appearance grain을 분리한다. Constant/field style의 지원 표, incomplete width, omission/false/auto,
통계 grouping의 JSON round trip을 정리한다. Box/Gradient의 deferred 호출을 유지하면서 role metadata를 보완한다.
[구체 계약 검토](phase2/CONTRACT_REVIEW.md)에 W1–W5의 signature, migration, owner와 기본값 보존 결정을,
[검증 기준](phase2/VALIDATION.md)에 baseline 43건·기존 테스트 100개와 구현 acceptance를 기록했다.
승인된 W1–W5와 여섯 시각 흐름의 현재 결과는 [RESULTS.md](phase2/RESULTS.md)가 소유하며 X 사용자 승인을 기록했다.

## Phase 3 — First complete chart facades

[상세 목표](phase3/GOAL.md). [Pie/Donut](chart/pie-donut.md), [Density](chart/density.md),
[Horizon](chart/horizon.md)을 기존 child owner 위에 제공한다. Pie는 category count와 weighted sum,
Horizon은 folded y의 guide 제한을 명시한다. 하위 edit 경로까지 입증한다.
현재 [A 계약 검토](phase3/CONTRACT_REVIEW.md)는 full-only 3개 facade, Donut의 innerRadius 표현,
Density의 explicit group color, Horizon의 기존 coordinate child와 opacity 적용을 승인했다. Public 시각 flow는 V 승인 뒤 구현한다.

## Phase 4 — Baselines, layouts and quantitative meaning

[상세 목표](phase4/GOAL.md). [Area](chart/area.md)의 constant baseline/range,
[Rose/Radial bar](chart/rose-radial-bar.md)의 area/radius-length 의미를 구분한다.
Color에서 독립한 layout 전환, theta category order, diverging midpoint와 legend transition을 같은
의미 owner로 정리한다. 기존 결과를 조용히 재해석하지 않는다.

## Phase 5 — Guides, labels and appearance

[상세 목표](phase5/GOAL.md). Cartesian·Polar·Parallel의 component lifecycle, legend kind/edge/recipe,
final-item labels·reference·annotation, common formatter, program theme, opt-in fitting을 완성한다.
Chart 생성 뒤에도 primitive 없이 세부 스타일을 바꾸는 경로가 핵심 산출물이다.

## Phase 6 — Data and composite lifecycle

[상세 목표](phase6/GOAL.md). Summary/bin/fold와 제한된 computed/stack data, explicit CI method,
immutable dataset revision, 안전한 bindMarkData, 반복·해제·empty filter, Violin/interval role edit를 작성한다.
기존 Bin2D reauthor와 definition-only derived API를 호환 경로로 설명한다.

## Phase 7 — Polar and one-dimensional charts

[상세 목표](phase7/GOAL.md). [Polar Scatter/Line](chart/polar-point-line.md), [Radar](chart/radar.md),
[Rug/Strip](chart/rug-strip.md). Theta/radius와 glyph size를 분리하고, Radar의 단위·정규화를 숨기지 않으며,
1D 위치를 fake field 없이 의미로 기록한다.

## Phase 8 — Statistical and endpoint charts

[상세 목표](phase8/GOAL.md). [Interval/Regression](chart/interval-regression.md),
[Dot/Lollipop/Dumbbell](chart/dot-lollipop-dumbbell.md), [ECDF](chart/ecdf.md).
동일 final grain의 center·interval·endpoint·label을 공유하고, ECDF의 ties·분모·step topology를 정의한다.

## Phase 9 — Packing and raincloud

[상세 목표](phase9/GOAL.md). [Beeswarm](chart/beeswarm.md)은 jitter와 다른 충돌 제약 owner를 둔다.
[Raincloud](chart/raincloud.md)는 density·summary·raw point를 같은 source와 category slot에 정렬한다.
실패·overflow·filter 이후의 결정적 재배치까지 완료 대상이다.

## Phase 10 — Comparison and composition

[상세 목표](phase10/GOAL.md). Row×column facet, field 반복, category order, named child의
insert/remove/reorder와 shared guide 소유권을 확장한다. Polar/Parallel은 좌표별 consumer 지원을 확인한
경우에만 포함하며, facet-derived child의 임의 교체로 canonical recipe를 잃지 않는다.

## Phase 11 — Integration and explicit closeout

[상세 목표](phase11/GOAL.md). 모든 액션을 다시 대조하여 authoring role·editableVia·supports·units·completion을
최신 계약과 연결한다. 이번 범위에 포함된 action/capability의 남은 Planned를 0으로 만들고
선택한 19개 액션군과 기존 오류·설계 문제의 결과를 확인한다.
완료 문서를 테스트나 제품이 실행 의존성으로 읽지 않도록 durable evidence를 capability owner로 이전한다.

## Approval Gates

2026-09-05 진행 승인으로 R6-P0-A와 R6-P1-A를, 후속 “승인한다”로 R6-P1-X를 approved로 기록했다. 나머지 Gate는 각 단계의 실제 검토·증거를 기다린다.
단계별 문서에서 exact scope, 필요한 source/public chain·검증·시각 증거, 다음 차단 작업을 선언한다.

- A: 해당 단계의 public contract·호환성·작업 범위.
- V: 시각 변화가 있는 variant의 primitive target. 해당 variant의 public 구현 전에 확인한다.
- X: 실행 결과·편집 경로·누적 검증·문서 정합성. 다음 의존 단계의 착수 경계다.
- Phase 0은 A만, Phase 11은 A와 X를 둔다. 서로 다른 공개 결정은 필요하면 A2/V2 같은 추가 Gate로 나눈다.
- Visual evidence는 primitive를 먼저 만들고 공개 호출 계획과 함께 검토한다. 이후 같은 실행의 public/primitive
  decoded pixel equality를 검사한다. 기존 출력과의 pixel equality를 분석 의미 변경에 강요하지 않는다.
- Ready-for-review 기록에는 검증한 commit, remote ref, 결과 경로와 남은 일이 있어야 한다.
- 이 계획 작성 과정에는 승인 요청이나 가상 구현 결과를 넣지 않는다.

## 완료 기준과 범위 제어

완료는 승인한 구현 범위의 모든 작업, consumer matrix, migration과 evidence가 닫혔을 때만 선언한다.
범위에 포함된 47개 항목은 구현·명시적 유지 결정·별도 제안으로의 이관 중 하나의 근거를 가져야 한다.
단순히 날짜가 지났거나 facade 수가 늘었다는 이유로 완료하지 않는다.

F01의 Donut 별도 alias, F17의 editGuides, F18 fitting의 세부 API, F19의 Polar/Parallel 적용은
세부 설계에서 확정한다. 보류 시 원래 ID와 rationale를 남기고, 이미 승인되어 Planned가 된
항목은 임의로 원장에서 지우지 않는다. API 정리 과정에서 제안 이름을 바꿔도 finding ID는 유지한다.

배포 단위·버전·PR·merge·publish·docs deploy는 구현 결과 이후 별도 작업이다.
이 로드맵은 그러한 외부 작업이나 비용 사용의 승인을 포함하지 않는다.
