# Roadmap 2 — Planned Contract Completion

## 목표

Roadmap 2는 `agent_docs/contract/ACTION_INDEX.json`에서 Planned로 승인된 direct action과
capability를 실제 구현, executable coverage, public documentation으로 전환한다. 먼저 기존 여섯
example chart를 활용해 검증 가능한 계획을 구현하고, 남은 계획은 새 example chart를 하나씩
설계하면서 완성한다.

Proposed와 Maybe Future는 이 Roadmap의 범위가 아니다. `editScale` contract는 Phase 0에서 승인됐으며
encoding reassignment의 선행 조건으로 Phase 1의 첫 implementation slice에서 구현한다.

## 진행 상태

- [x] Phase 0 — Roadmap 2 artifact/gallery, coverage tracking과 `editScale` contract
- [x] Phase 1 — 기존 scatterplot variants
- [x] Phase 2 — 기존 line-chart variants
- [x] Phase 3 — 기존 histogram/grouped-bar variants
- [x] Phase 4 — 기존 density/regression variants
- [x] Phase 5 — 기존 guide/layout variants
- [x] Phase 6 — 신규 error-bar chart
- [x] Phase 7 — 신규 error-band chart와 regression delegation
- [x] Phase 8 — 신규 box-plot chart
- [x] Phase 9 — mark selection, filtering과 highlighting
- [x] Phase 10 — 신규 transformed-scale chart
- [ ] Phase 11 — graphical hierarchy와 전체 Planned closeout

## 실행 원칙

각 visual variant는 다음 순서를 반드시 따른다.

```text
Planned contract 선택
→ primitive program과 reference values
→ browser + primitive.png
→ 사용자 visual confirmation
→ user-facing action 구현
→ user-facing.png
→ semantic/graphic/trace equivalence
→ parameter/error/rematerialization coverage
→ docs와 Planned → Implemented 승격
```

사용자 승인 전에는 해당 variant의 user-facing 구현을 시작하지 않는다. 승인 후에도 primitive와
public program은 독립된 executable artifact로 남긴다. visually equivalent한 parameter는 unit/contract
test로 exhaustive하게 검증하고, 실제 모양이 달라지는 대표 equivalence class만 PNG variant로 만든다.

## Artifact 구조

```text
.artifacts/test/png/roadmap2/
├─ <chart>/
│  ├─ <variant>/
│  │  ├─ variant.json
│  │  ├─ primitive.png
│  │  └─ user-facing.png
│  └─ ...
└─ index.html
```

- `variant.json`은 display title과 목표 user-facing action call chain을 보관한다.
- `index.html`은 chart → variant 순서로 그룹화하고 목표 call chain과 primitive/user-facing을 함께 보여준다.
- PNG helper는 안전한 relative artifact path와 recursive directory creation을 지원한다.
- Artifact tree 전체는 gitignore하며 test가 재현 가능하게 생성한다.
- Primitive만 존재하면 `Awaiting visual confirmation`, 두 파일이 있으면 equivalence 상태를 표시한다.

## Phase 0 — 실행 기반

- Hierarchical Roadmap 2 PNG output helper와 cleanup을 구현한다.
- Primitive/public pair를 읽는 deterministic static gallery generator를 구현한다.
- Variant metadata는 render test가 canonical ID, title과 목표 user-facing call chain에서 생성하고
  별도 수동 registry를 두지 않는다. 같은 variant의 primitive/public metadata는 반드시 일치한다.
- Roadmap의 모든 Planned action/capability가 빠짐없이 named implementation Phase에 배치됐는지
  contract test로 검증한다.
- `editScale` parameter, conflict와 rematerialization contract를 사용자와 확정한다. 이 결정 전에는
  scale-backed reassignment 구현을 시작하지 않는다.
- 기존 Roadmap 1 flat PNG는 보존하고 새 출력부터 Roadmap 2 hierarchy를 사용한다.

## Phase 1 — Existing cars scatterplot variants

현재 scatterplot을 사용해 point appearance, reassignment와 continuous appearance scales를 구현한다.

- Phase goal: [`phase1/GOAL.md`](phase1/GOAL.md)
- Complete variant contract: [`chart/cars-scatterplot-variants.md`](chart/cars-scatterplot-variants.md)

- Direct action: `editPointMark`
- Direct action: `editScale`
- Capability: `encodeColor-reassignment`
- Capability: `encodeShape-reassignment`
- Capability: `encodeSize-reassignment`
- Capability: `encodeX-reassignment`
- Capability: `encodeY-reassignment`
- Capability: `point-shape-vocabulary`
- Capability: `named-palette-vocabulary`
- Capability: `continuous-point-color`
- Capability: `field-driven-opacity`
- Capability: `field-driven-opacity-legend`

대표 variants는 12-shape vocabulary, field-driven opacity, sequential color/gradient legend다. Constant,
field, scale replacement, Canvas resize와 invalid shared-consumer combinations를 함께 검증한다.
`editScale`은 우선 현재 scale vocabulary에 대해 구현하고 Phase 10에서 새 type/policy로 같은 contract를
확장한다.

실행은 canonical baseline 교정, scale/shape/palette primitive batch, reassignment primitive batch,
continuous appearance primitive batch와 final integration의 세 visual approval gate로 나눈다. Phase 1의
sequential scale은 `encodeColor` 내부 shared grammar로만 먼저 사용하며 general public scale vocabulary는
Phase 10에 유지한다.

## Phase 2 — Existing cars line-chart variants

현재 line chart를 사용해 path grammar, series reassignment와 aggregate expansion을 구현한다.

- Phase goal: [`phase2/GOAL.md`](phase2/GOAL.md)
- Complete variant contract: [`chart/cars-line-chart-variants.md`](chart/cars-line-chart-variants.md)

- Direct action: `editLineMark`
- Capability: `encodeGroup-reassignment`
- Capability: `encodeStrokeDash-reassignment`
- Capability: `curve-interpolation-and-concrete-path-commands`
- Capability: `aggregate-vocabulary`
- Capability: `parameterized-aggregate-operations`
- Capability: `named-and-constant-stroke-dash-vocabulary`
- Capability: `point-composite-top-and-bottom-legends`

각 curve token은 exact concrete command fixture를 먼저 통과해야 한다. PNG는 geometry class별 대표
curve와 named dash를 사용하고, aggregate 값은 graphical 검증과 독립된 numeric reference로 검증한다.

## Phase 3 — Existing histogram and grouped-bar variants

현재 histogram과 grouped bar를 사용해 bar grain, range와 layout parameter를 확장한다.

- Phase goal: [`phase3/GOAL.md`](phase3/GOAL.md)
- Histogram variant contract: [`chart/cars-histogram-variants.md`](chart/cars-histogram-variants.md)
- Bar variant contract: [`chart/jobs-bar-variants.md`](chart/jobs-bar-variants.md)

- Capability: `encodeXOffset-reassignment`
- Capability: `encodeHistogram-reassignment`
- Capability: `bar-width-modes`
- Capability: `offset-padding-controls`
- Capability: `color-layout-vocabulary`
- Capability: `histogram-bin-controls`
- Capability: `normalized-stack-mode`
- Capability: `position-field-type-compatibility`

대표 variants는 explicit bin step/boundaries, normalized stack, grouped band width/padding과 supported
color layouts다. Missing categorical cells는 기존 규칙대로 합성하지 않는다.

## Phase 4 — Existing density and regression variants

현재 density/regression chart를 사용해 statistical variation과 stable component editing을 구현한다.

- Phase goal: [`phase4/GOAL.md`](phase4/GOAL.md)
- Density variant contract: [`chart/cars-density-area-variants.md`](chart/cars-density-area-variants.md)
- Regression variant contract: [`chart/cars-regression-scatterplot-variants.md`](chart/cars-regression-scatterplot-variants.md)

- Direct action: `editAreaMark`
- Direct action: `editDensity`
- Direct action: `editRegressionBand`
- Direct action: `editRegressionLine`
- Capability: `area-outline`
- Capability: `density-kernel-vocabulary`
- Capability: `density-normalization-modes`
- Capability: `filter-predicate-modes`
- Capability: `regression-method-vocabulary`
- Capability: `regression-prediction-interval`

Kernel/regression 결과는 독립 numeric fixtures로 검증하고, edit는 immutable derived revision,
explicit consumer rebind와 complete rematerialization trace를 검증한다.

## Phase 5 — Existing guide and layout variants

기존 모든 chart의 approved public program을 사용해 shared guide/layout editing을 구현한다.

- Phase goal: [`phase5/GOAL.md`](phase5/GOAL.md)
- Scatterplot variant contract: [`chart/cars-scatterplot-variants.md`](chart/cars-scatterplot-variants.md)
- Regression variant contract: [`chart/cars-regression-scatterplot-variants.md`](chart/cars-regression-scatterplot-variants.md)
- Density variant contract: [`chart/cars-density-area-variants.md`](chart/cars-density-area-variants.md)

- Direct action: `editHorizontalGrid`
- Direct action: `editVerticalGrid`
- Direct action: `editLegend`
- Direct action: `editTitle`
- Capability: `top-x-axis-position`
- Capability: `right-y-axis-position`
- Capability: `axis-label-format-strings`
- Capability: `left-legend-position`
- Capability: `chart-title-positions`
- Capability: `title-wrapping-and-measurement`

대표 PNG는 mirrored axes, left legend와 wrapped title을 분리해 검토한다. Appearance-only edit와 Canvas
resize가 semantic meaning을 바꾸지 않는지 확인한다.

## Phase 6 — New error-bar chart

첫 신규 chart는 grouped vertical error bar와 horizontal variant를 포함한다.

- Phase goal: [`phase6/GOAL.md`](phase6/GOAL.md)
- Complete chart contract: [`chart/cars-error-bar.md`](chart/cars-error-bar.md)

- Direct action: `createRuleMark`
- Direct action: `encodeStroke`
- Direct action: `encodeStrokeWidth`
- Direct action: `createIntervalData`
- Direct action: `createErrorBar`
- Direct action: `encodeX2`
- Capability: `error-bar-horizontal-and-explicit`
- Capability: `error-bar-cap-and-style-options`

Rule full-span/endpoints, field/datum assignment와 constant appearance를 먼저 primitive로 그린다. 이후
interval summary, main rule, optional caps의 action hierarchy를 구현한다. Vertical/horizontal,
computed/explicit interval, cap/style parameter classes를 검증한다.

## Phase 7 — New error-band chart and regression delegation

두 번째 신규 chart는 Gapminder grouped vertical error band와 Cars horizontal range variant다.

- Phase goal: [`phase7/GOAL.md`](phase7/GOAL.md)
- Complete chart contract: [`chart/gapminder-error-band.md`](chart/gapminder-error-band.md)

- Direct action: `createErrorBand`
- Direct action: `encodeXRange`
- Capability: `error-band-curve-and-advanced-boundaries`
- Capability: `regression-error-band-delegation`
- Capability: `composite-mark-ownership-and-storage`

Primitive approval 뒤 area/boundary line composition을 구현한다. Generic error band가 완성된 다음에만
existing `createRegressionBand`를 thin compatibility wrapper로 전환하고 이전 regression concrete output과
trace compatibility를 검증한다.

## Phase 8 — New box-plot chart

- Phase goal: [`phase8/GOAL.md`](phase8/GOAL.md)
- Complete chart contract: [`chart/cars-box-plot.md`](chart/cars-box-plot.md)

- Direct action: `createBoxPlot`

Tukey/minmax summary, whisker/caps, ranged bar, median rule와 outlier point를 primitive로 먼저 만든다.
Vertical/horizontal orientation, factor, width, outlier/style parameter와 sparse category ordering을 검증한다.
Box는 generic rule/error-bar/ranged-position actions를 실제 wrapped children으로 재사용한다.

## Phase 9 — Mark selection, filtering and highlighting

- Phase goal: [`phase9/GOAL.md`](phase9/GOAL.md)
- Direct actions: `filterMarks`, `selectMarks`, `highlightMarks`, `editBarMark`
- Capability: `mark-item-selection-grammar`

Point symbol, final bar segment/stack, line/area series path와 rule line을 explicit data-field, pre-scale semantic-channel,
concrete-property namespace에서 선택한다. Shared comparison/set/range/rank grammar, top/bottom N과 ties, mark filtering, persistent selection,
mark-specific highlighting, dimming, front order와 logical offset을 Cars point/histogram/line visual Gates로 검증한다.
Current `filterMark`는 plural `filterMarks`로 완전히 교체하며 compatibility alias를 남기지 않는다.

## Phase 10 — New transformed-scale chart

- Phase goal: [`phase10/GOAL.md`](phase10/GOAL.md)
- Complete variant contract: [`chart/gapminder-transformed-scale-variants.md`](chart/gapminder-transformed-scale-variants.md)

- Direct action expansion: `editScale`
- Delivered capability: `scale-type-vocabulary`
- Delivered capability: `scale-mapping-policies`
- Delivered capability: `continuous-color-bar-consumer`

Log/pow/sqrt/symlog/time/band/point와 quantize/quantile/threshold/sequential을 compatible channel별로
나누어 검증한다. Clamp/reverse/unknown과 explicit domain/range precedence를 exact mapping fixture로
확인하고 대표 visual class만 PNG로 만든다.

## Phase 11 — Graphical hierarchy and closeout

- Phase goal: [`phase11/GOAL.md`](phase11/GOAL.md)
- Hierarchy variant contract: [`chart/cars-regression-scatterplot-variants.md`](chart/cars-regression-scatterplot-variants.md)

- Capability: `graphic-parent-attachment`

Canonical regression scatterplot을 primitive-first hierarchy variant로 만들어 Canvas → plot → graphical
consumer attachment, grid → statistical band → ordinary mark → highlighted item → axis draw order와
legend/title Canvas ownership을 검증한다. Primitive approval 뒤 ordinary domain actions가 같은 tree를
자동으로 만들도록 연결하고 existing chart vertical slices 전체를 migration한다. 마지막으로
ACTION_INDEX의 Planned inventory가 비었는지, 모든 implemented contract가 current/type/export/docs/evidence와
일치하는지, Roadmap 2 gallery가 최종 pair만 포함하는지 검사한다.

## Direct action 배치 감사

| Planned direct action | Implementation Phase |
| --- | --- |
| `createRuleMark` | Phase 6 |
| `encodeStroke` | Phase 6 |
| `encodeStrokeWidth` | Phase 6 |
| `createIntervalData` | Phase 6 |
| `createErrorBar` | Phase 6 |
| `createErrorBand` | Phase 7 |
| `createBoxPlot` | Phase 8 |
| `editAreaMark` | Phase 4 |
| `editDensity` | Phase 4 |
| `editHorizontalGrid` | Phase 5 |
| `editLegend` | Phase 5 |
| `editLineMark` | Phase 2 |
| `editPointMark` | Phase 1 |
| `editRegressionBand` | Phase 4 |
| `editRegressionLine` | Phase 4 |
| `editScale` | Phase 0 review → Phase 1 implementation → Phase 10 expansion |
| `editTitle` | Phase 5 |
| `editVerticalGrid` | Phase 5 |
| `encodeX2` | Phase 6 |
| `encodeXRange` | Phase 7 |
| `editBarMark` | Phase 9 |
| `filterMarks` | Phase 9 replacement of `filterMark` |
| `highlightMarks` | Phase 9 |
| `selectMarks` | Phase 9 |

## 완료 조건

- ACTION_INDEX에 Planned direct action과 capability가 남아 있지 않다.
- 각 새 chart/variant가 approved primitive와 equivalent public program을 가진다.
- 모든 public signature/default/inference/reassignment가 type, current contract와 docs에 반영된다.
- Statistical numeric fixtures와 graphical equivalence tests가 분리되어 통과한다.
- Canvas resize와 semantic edit가 registered consumers를 deterministic하게 rematerialize한다.
- Unit, contract, chart, docs, browser, PNG, coverage와 package-boundary suites가 모두 통과한다.
- Roadmap 2 gallery에서 최종 primitive/user-facing pair를 chart/variant별로 확인할 수 있다.
