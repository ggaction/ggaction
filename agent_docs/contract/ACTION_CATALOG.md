# Action Contract and Coverage Catalog

This compact index is generated from `ACTION_INDEX.json`. Edit the manifest and linked domain contract together, then run `npm run contracts:catalog`.

Contract conventions and shared formal notation live in [`README.md`](README.md).

## Current direct actions

| Layer | Action | Domain | Lifecycle | Audit | Coverage (contract/effects/tests) |
| --- | --- | --- | --- | --- | --- |
| user-facing | [`createCanvas`](current/CORE.md#createcanvas) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editCanvas`](current/CORE.md#editcanvas) | core | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createData`](current/CORE.md#createdata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`filterData`](current/CORE.md#filterdata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createDensityData`](current/CORE.md#createdensitydata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createRegressionData`](current/CORE.md#createregressiondata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createPointMark`](current/MARKS.md#createpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editPointMark`](current/MARKS.md#editpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createLineMark`](current/MARKS.md#createlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLineMark`](current/MARKS.md#editlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createBarMark`](current/MARKS.md#createbarmark) | marks | Stable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createAreaMark`](current/MARKS.md#createareamark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editAreaMark`](current/MARKS.md#editareamark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`encodeX`](current/ENCODINGS.md#encodex) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeY`](current/ENCODINGS.md#encodey) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeColor`](current/ENCODINGS.md#encodecolor) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeStrokeDash`](current/ENCODINGS.md#encodestrokedash) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeSize`](current/ENCODINGS.md#encodesize) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeShape`](current/ENCODINGS.md#encodeshape) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeOpacity`](current/ENCODINGS.md#encodeopacity) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeRadius`](current/ENCODINGS.md#encoderadius) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeXOffset`](current/ENCODINGS.md#encodexoffset) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeY2`](current/ENCODINGS.md#encodey2) | encodings | Assignment | Reassignment — Planned | ✅ / ✅ / ✅ |
| user-facing | [`encodeYRange`](current/ENCODINGS.md#encodeyrange) | encodings | Assignment | Reassignment — Planned | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeGroup`](current/ENCODINGS.md#encodegroup) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeHistogram`](current/ENCODINGS.md#encodehistogram) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeDensity`](current/ENCODINGS.md#encodedensity) | encodings | Assignment | `editDensity` — Planned | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeBarWidth`](current/ENCODINGS.md#encodebarwidth) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`createRegression`](current/STATISTICS.md#createregression) | statistics | Aggregate create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createAxes`](current/AXES.md#createaxes) | axes | Aggregate create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createXAxis`](current/AXES.md#createxaxis) | axes | Aggregate create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createYAxis`](current/AXES.md#createyaxis) | axes | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createXAxisLine`](current/AXES.md#createxaxisline) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createYAxisLine`](current/AXES.md#createyaxisline) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editXAxisLine`](current/AXES.md#editxaxisline) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editYAxisLine`](current/AXES.md#edityaxisline) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createXAxisTicks`](current/AXES.md#createxaxisticks) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createYAxisTicks`](current/AXES.md#createyaxisticks) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editXAxisTicks`](current/AXES.md#editxaxisticks) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editYAxisTicks`](current/AXES.md#edityaxisticks) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createXAxisLabels`](current/AXES.md#createxaxislabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createYAxisLabels`](current/AXES.md#createyaxislabels) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editXAxisLabels`](current/AXES.md#editxaxislabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editYAxisLabels`](current/AXES.md#edityaxislabels) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createXAxisTicksAndLabels`](current/AXES.md#createxaxisticksandlabels) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createYAxisTicksAndLabels`](current/AXES.md#createyaxisticksandlabels) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editXAxisTicksAndLabels`](current/AXES.md#editxaxisticksandlabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editYAxisTicksAndLabels`](current/AXES.md#edityaxisticksandlabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createXAxisTitle`](current/AXES.md#createxaxistitle) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createYAxisTitle`](current/AXES.md#createyaxistitle) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editXAxisTitle`](current/AXES.md#editxaxistitle) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editYAxisTitle`](current/AXES.md#edityaxistitle) | axes | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createGrid`](current/GRID.md#creategrid) | grid | Aggregate create-only | Intentional; planned child edits | ✅ / ✅ / ✅ |
| user-facing | [`createHorizontalGrid`](current/GRID.md#createhorizontalgrid) | grid | Stable resource, edit gap | `editHorizontalGrid` — Planned | ✅ / ✅ / ✅ |
| user-facing | [`createVerticalGrid`](current/GRID.md#createverticalgrid) | grid | Stable resource, edit gap | `editVerticalGrid` — Planned | ✅ / ✅ / ⚠️ |
| user-facing | [`createLegend`](current/LEGEND_AND_TITLE.md#createlegend) | legend_and_title | Stable resource, edit gap | `editLegend` — Planned | ✅ / ✅ / ⚠️ |
| user-facing | [`createGuides`](current/LEGEND_AND_TITLE.md#createguides) | legend_and_title | Aggregate create-only | Intentional; child edit gaps remain | ✅ / ✅ / ⚠️ |
| user-facing | [`createTitle`](current/LEGEND_AND_TITLE.md#createtitle) | legend_and_title | Stable resource, edit gap | `editTitle` — Planned | ✅ / ✅ / ✅ |
| user-facing | [`createCoordinate`](current/CORE.md#createcoordinate) | core | Structural create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createScale`](current/CORE.md#createscale) | core | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editScale`](current/CORE.md#editscale) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createDerivedData`](current/CORE.md#createderiveddata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createRegressionBand`](current/STATISTICS.md#createregressionband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRegressionBand`](current/STATISTICS.md#editregressionband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createRegressionLine`](current/STATISTICS.md#createregressionline) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRegressionLine`](current/STATISTICS.md#editregressionline) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| primitive | [`editSemantic`](current/PRIMITIVES.md#editsemantic) | primitives | Primitive | Complete | ✅ / ✅ / ⚠️ |
| primitive | [`createGraphics`](current/PRIMITIVES.md#creategraphics) | primitives | Primitive | Complete | ✅ / ✅ / ✅ |
| primitive | [`editGraphics`](current/PRIMITIVES.md#editgraphics) | primitives | Primitive | Complete | ✅ / ✅ / ⚠️ |

## Planned direct actions

| Action | Readiness | Contract |
| --- | --- | --- |
| `createRuleMark` | accepted | [Open](planned/MARKS_AND_PATHS.md#rule-mark-geometry) |
| `encodeStroke` | accepted | [Open](planned/ENCODINGS.md#rule-position-and-appearance-assignments) |
| `encodeStrokeWidth` | accepted | [Open](planned/ENCODINGS.md#rule-position-and-appearance-assignments) |
| `createIntervalData` | accepted | [Open](planned/DATA_AND_STATISTICS.md#interval-summary-data) |
| `createErrorBar` | accepted | [Open](planned/COMPOSITE_MARKS.md#createerrorbar) |
| `createErrorBand` | accepted | [Open](planned/COMPOSITE_MARKS.md#createerrorband) |
| `createBoxPlot` | accepted | [Open](planned/COMPOSITE_MARKS.md#createboxplot) |
| `editDensity` | accepted | [Open](planned/EDITING.md#editdensity) |
| `editHorizontalGrid` | accepted | [Open](planned/EDITING.md#directional-grid-edits) |
| `editLegend` | accepted | [Open](planned/EDITING.md#editlegend) |
| `editTitle` | accepted | [Open](planned/EDITING.md#edittitle) |
| `editVerticalGrid` | accepted | [Open](planned/EDITING.md#directional-grid-edits) |
| `encodeX2` | accepted | [Open](planned/ENCODINGS.md#horizontal-ranged-position) |
| `encodeXRange` | accepted | [Open](planned/ENCODINGS.md#horizontal-ranged-position) |
| `selectRows` | accepted | [Open](planned/DATA_AND_STATISTICS.md#selectrows) |

## Planned capabilities

| Kind | Capability | Readiness | Contract |
| --- | --- | --- | --- |
| composition | Regression band delegation through error band | accepted | [Open](planned/COMPOSITE_MARKS.md#regression-band-delegation) |
| composition | Composite mark ownership and storage | accepted | [Open](planned/COMPOSITE_MARKS.md#composite-ownership-and-storage) |
| behavior | encodeY2 reassignment | accepted | [Open](planned/ENCODINGS.md#positional-reassignment) |
| behavior | encodeYRange reassignment | accepted | [Open](planned/ENCODINGS.md#positional-reassignment) |
| parameter | Curve interpolation and concrete path commands | accepted | [Open](planned/MARKS_AND_PATHS.md#curve-interpolation-and-concrete-path-commands) |
| parameter | Continuous color bar consumer | accepted | [Open](planned/ENCODINGS.md#continuous-color-bar-consumer) |
| parameter | Scale type vocabulary | accepted | [Open](planned/SCALES.md#scale-type-vocabulary) |
| parameter | Scale mapping policies | accepted | [Open](planned/SCALES.md#scale-mapping-policies) |
| parameter | Density kernel vocabulary | accepted | [Open](planned/DATA_AND_STATISTICS.md#density-kernel-vocabulary) |
| parameter | Density normalization modes | accepted | [Open](planned/DATA_AND_STATISTICS.md#density-normalization-modes) |
| parameter | Filter predicate modes | accepted | [Open](planned/DATA_AND_STATISTICS.md#filter-predicate-modes) |
| parameter | Regression method vocabulary | accepted | [Open](planned/DATA_AND_STATISTICS.md#regression-method-vocabulary) |
| parameter | Regression prediction interval | accepted | [Open](planned/DATA_AND_STATISTICS.md#regression-prediction-interval) |
| parameter | Top x axis position | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#mirrored-cartesian-axis-positions) |
| parameter | Right y axis position | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#mirrored-cartesian-axis-positions) |
| parameter | Axis label format strings | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#axis-label-format-strings) |
| parameter | Left legend position | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#left-legend-position) |
| parameter | Chart title positions | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#chart-title-positions) |
| parameter | Title wrapping and measurement | accepted | [Open](planned/GUIDES_AND_LAYOUT.md#title-wrapping-and-measurement) |
| parameter | Graphic parent attachment | accepted | [Open](planned/PRIMITIVES.md#graphic-parent-attachment) |

## Internal inventories

- [Materialization and guide-component wrapped actions](internal/ACTIONS.md)

Internal wrapped actions are trace-visible implementation details and are not direct public actions or primitives.
