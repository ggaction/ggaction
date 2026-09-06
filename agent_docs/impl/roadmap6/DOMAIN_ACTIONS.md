# Roadmap 6 — 차트 아래층과 조합 액션군

차트 계약은 chart/에 둔다. 이 문서는 F14–F19와 여러 차트가 재사용할 lower domain의
구체적 작업 방향을 정리한다. 아래 이름·option은 모두 Proposed이며 Current API 예제가 아니다.

## F14 — Labels, reference, annotation

| 진입점 후보 | 필요한 역할 | 기존 child | 편집·제거 경로 |
| --- | --- | --- | --- |
| createMarkLabels | source mark, content(field/final value/share), format | createTextMark, encodeText, layoutLabels | source/content revision, text style, layout remove, owner cleanup |
| createReferenceLine | axis/channel, data value, domain policy | createRuleMark, position/appearance encoders | value·scale binding·line style |
| createReferenceBand | lower/upper, axis/channel, domain policy | createRectMark 또는 existing ranged area owner | endpoint pair atomic edit, fill/opacity |
| createAnnotation | mark/data/plot anchor 중 하나, text, offset | text/rule과 existing label layout | anchor/content/style revision, leader cleanup |

권장 label 예: createMarkLabels({ source: 'salesBars', content: { encoded: 'y' }, format: '.1f' }).
Pie percent는 { share: 'theta' } 같은 typed content 후보로 구분한다.
정확한 property 이름보다 raw row/aggregate/share를 혼동하지 않는 것이 먼저다.
Source를 여러 eligible mark 중 임의로 선택하지 않는다. Selection/highlight와 label이 같은 final item key를 사용한다.

Reference line/band의 기본 domain 참여 여부는 Phase 5 A에서 고정한다.
Baseline data를 가진 chart와 plot-wide annotation은 같은 anchor mode가 아니다.
공통 formatter가 axes·legend·text를 설명하되, label overlap은 source-aware layout owner를 유지한다.

## F15 — 재사용 data transformation

| 후보 | 입력 의미 | 출력 grain·provenance | edge/error 기준 |
| --- | --- | --- | --- |
| createSummaryData | groupBy, 명시적 aggregate outputs와 alias | group key당 한 row, aggregate/membership | alias collision, empty groups, mixed types, missing policy |
| createBinData | field, extent/boundaries/count policy | bin lower/upper/count/member | edge inclusion, 마지막 bin, out-of-range, empty bins |
| createFoldData | 선택 field 목록, key/value alias | source row×selected field, original key | duplicate fields, alias collision, mixed units/types, missing |
| computed data 후보 | typed finite arithmetic operation | source row 또는 명시적 group, formula provenance | divide-by-zero, invalid operands, null/NaN, unit conversion |
| stack data 후보 | category/group/value, order/offset mode | final cell의 start/end/value/share | positive/negative, empty series, zero denominator, mode change |

구현 순서: summary → bin → fold → bounded computed → stack data projection.
Stack grammar는 Phase 4 owner를 재사용하고 cumulativeSum은 Window를 재사용한다.
Create가 provenance만 반환하고 usable values는 비워 두는 일반 API를 추가하지 않는다.

예상 사용:
~~~text
source → createSummaryData → Point / Interval / labels
source → createBinData → Histogram / frequency Line / bin labels
wide source → createFoldData → Radar / repeated charts
source → explicit computed ratio → Heatmap midpoint / labels
source → stack data → ranged Area / Bar / annotation
~~~

Snapshot create와 stable logical owner revision을 구분한다. 모든 transform에 기계적인 edit API를 추가하지 않는다.
같은 data를 여러 chart가 소비할 때 revision이 어느 consumers를 재연결하는지 명시한다.

## F16 — Data binding과 semantic role revision

bindMarkData 후보는 target+data를 받고 full dependency preflight를 책임진다.
Data field 존재 확인만으로 완료하지 않는다.

1. Raw/summary/final-item grain과 field roles, type, coordinate compatibility를 확인한다.
2. Shared scale와 implicit domain을 전부 검증한다.
3. Composite sibling, guide, label source, selection/highlight key에 미치는 영향을 계획한다.
4. 새 immutable revision과 compatible bindings를 함께 반영한다.
5. 기존 scale→mark→guide→layout→highlight 계획을 실행한다.
6. 새 program에서 orphan인 revision만 정리한다. Earlier program은 유지한다.

editViolinPlot 후보는 source/category/value/split/orientation을 같은 호출에서 다룬다.
Interval owner의 role edit도 center/lower/upper, source와 position을 함께 preflight한다.
편집이 여러 ordinary resources를 묶는 명확한 의미를 가질 때만 aggregate editor를 추가한다.

filterMarks는 replace/compose/remove와 canonical source를 정의한다.
Empty view는 inferred domain이 있던 chart와 처음부터 domain이 없는 chart를 구분한다.
Raw filter와 final-item filter를 통계적으로 같은 operation으로 취급하지 않는다.

## F17 — Guide component와 lifecycle

필수 설계 표는 다음과 같다. 각 셀을 Current/proposed/unsupported로 실제 source와 대조한다.

~~~text
Cartesian / Polar / Parallel
× axis aggregate / line / ticks / labels / title
× create / edit / remove / recreate
× normal / hidden / partially removed
~~~

Polar의 internal createThetaAxisLine/Ticks/Labels/Title와 radius 대응 8개는 후보 범위다.
기존 edit가 있지만 create가 없는 resource를 복원할 공개 경로를 먼저 선택한다.
Parallel은 dimension field 또는 stable axis key로 font/format/count/title을 바꾼다.
Guide aggregate enable이 missing child를 생성하는지, edit가 existing child만 바꾸는지 명시한다.

editGuides는 하나의 호출로 여러 guide를 atomic하게 바꿀 필요가 확인될 때 추가한다.
Name symmetry만을 위해 만들지 않으며, 각 child의 지원 matrix를 숨기지 않는다.

## F18 — Theme, typography, format, fitting

applyTheme 후보는 semantic statistics를 유지하고 persisted visual defaults만 바꾼다.
예상 priority는 local explicit > program theme > built-in default다.
일반적인 dark theme은 Canvas background만이 아니라 axis/text/legend/mark default를 함께 다룬다.
Field-driven appearance와 local highlight policy가 theme에 덮이지 않게 한다.

| 작업 | persistence | acceptance |
| --- | --- | --- |
| Theme 적용·교체·해제 | 요청 token과 inherited/explicit 상태 | reset 뒤 local style 유지 |
| Common formatter | number/percent/scientific/UTC와 unit | 같은 content를 모든 guide/text에서 동일 의미로 표시 |
| Axis label rotation/wrap | 해당 guide owner의 layout policy | resize/edit 뒤 policy replay |
| Layout fitting 후보 | opt-in policy, bounds, iteration cap, result summary | deterministic convergence 또는 explicit overflow |
| Text metrics | 현재 shared metric owner | renderer마다 다른 측정으로 margin이 달라지지 않음 |

Default opacity 0.2/1, band fraction 0.7/0.72/0.8 등 역할로 설명되는 차이는 자동 통일하지 않는다.
Style token과 aggregate/group/normalization default를 한 theme schema로 묶지 않는다.

## F19 — Facet grid, repeat, child editing

facetGrid 후보는 row와 column field, observed/full combinations, category order를 명시한다.
repeatCharts 후보는 동일 chart recipe에서 바꿀 dimension/measure와 각 결과의 이름을 보존한다.

- Scale sharing: 같은 의미·unit·domain policy만 묶는다.
- Guides: cell-owned와 parent-promoted를 구분하고 duplicate 제거가 설명 제거로 이어지지 않게 한다.
- Child structure: concat insert/remove/reorder는 named identity를 사용한다.
- Facet child: canonical source recipe로 재파생하며 임의 replacement와 지원된 per-cell override를 구분한다.
- Coordinates: Polar/Parallel을 포함한다고 선언하기 전에 family별 guides/layout/rematerialization을 입증한다.
- Editing: parent source/Canvas/theme/scale edit와 child override가 수렴해야 한다.

2×3 facet, independent/shared scales, empty cell, multiple legends, named reorder를 필수 visual fixture로 권고한다.
원본 chart에서 color를 설명하던 legend가 default false 때문에 조용히 사라지는 경우를 명시적으로 다룬다.

## 완료 연결

이 문서는 [공통 결정](DESIGN_DECISIONS.md)과 [전체 원장](TRACEABILITY.md)을 보강한다.
실제 수행 owner는 Phase 5(F14/F17/F18), Phase 6(F15/F16), Phase 10(F19)이며
신규 chart의 관련 옵션은 해당 owner가 Current가 된 뒤 위임한다.
