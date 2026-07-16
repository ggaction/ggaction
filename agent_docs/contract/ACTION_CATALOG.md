# Action Contract and Coverage Catalog

This compact index is generated from `ACTION_INDEX.json`. Edit the manifest and linked domain contract together, then run `npm run contracts:catalog`.

Contract conventions and shared formal notation live in [`README.md`](README.md).

## Current direct actions

| Layer | Action | Domain | Lifecycle | Audit | Coverage (contract/effects/tests) |
| --- | --- | --- | --- | --- | --- |
| user-facing | [`createCanvas`](current/CORE.md#createcanvas) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editCanvas`](current/CORE.md#editcanvas) | core | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createData`](current/CORE.md#createdata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`filterData`](current/CORE.md#filterdata) | core | Immutable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`filterMark`](current/CORE.md#filtermark) | core | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createDensityData`](current/CORE.md#createdensitydata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createRegressionData`](current/CORE.md#createregressiondata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createIntervalData`](current/STATISTICS.md#createintervaldata) | statistics | Immutable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createPointMark`](current/MARKS.md#createpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editPointMark`](current/MARKS.md#editpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createLineMark`](current/MARKS.md#createlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLineMark`](current/MARKS.md#editlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createBarMark`](current/MARKS.md#createbarmark) | marks | Stable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createAreaMark`](current/MARKS.md#createareamark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createRuleMark`](current/MARKS.md#createrulemark) | marks | Immutable create-only | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editAreaMark`](current/MARKS.md#editareamark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`encodeX`](current/ENCODINGS.md#encodex) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeY`](current/ENCODINGS.md#encodey) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeX2`](current/ENCODINGS.md#encodex2) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeColor`](current/ENCODINGS.md#encodecolor) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeStrokeDash`](current/ENCODINGS.md#encodestrokedash) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeStroke`](current/ENCODINGS.md#encodestroke) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeStrokeWidth`](current/ENCODINGS.md#encodestrokewidth) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeSize`](current/ENCODINGS.md#encodesize) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeShape`](current/ENCODINGS.md#encodeshape) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ⚠️ |
| user-facing | [`encodeOpacity`](current/ENCODINGS.md#encodeopacity) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeRadius`](current/ENCODINGS.md#encoderadius) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeXOffset`](current/ENCODINGS.md#encodexoffset) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeY2`](current/ENCODINGS.md#encodey2) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeYRange`](current/ENCODINGS.md#encodeyrange) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeXRange`](current/ENCODINGS.md#encodexrange) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeGroup`](current/ENCODINGS.md#encodegroup) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeHistogram`](current/ENCODINGS.md#encodehistogram) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeDensity`](current/ENCODINGS.md#encodedensity) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`editDensity`](current/ENCODINGS.md#editdensity) | encodings | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`encodeBarWidth`](current/ENCODINGS.md#encodebarwidth) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`createRegression`](current/STATISTICS.md#createregression) | statistics | Aggregate create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createErrorBar`](current/STATISTICS.md#createerrorbar) | statistics | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createErrorBand`](current/STATISTICS.md#createerrorband) | statistics | Aggregate create-only | Intentional create-only aggregate with editable ordinary child marks | ✅ / ✅ / ✅ |
| user-facing | [`createBoxPlot`](current/COMPOSITE_MARKS.md#createboxplot) | statistics | Aggregate create-only | Intentional create-only aggregate; updates delegate to supported child assignments | ✅ / ✅ / ✅ |
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
| user-facing | [`createHorizontalGrid`](current/GRID.md#createhorizontalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createVerticalGrid`](current/GRID.md#createverticalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editHorizontalGrid`](current/GRID.md#edithorizontalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editVerticalGrid`](current/GRID.md#editverticalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createLegend`](current/LEGEND_AND_TITLE.md#createlegend) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editLegend`](current/LEGEND_AND_TITLE.md#editlegend) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createGuides`](current/LEGEND_AND_TITLE.md#createguides) | legend_and_title | Aggregate create-only | Intentional; child edit gaps remain | ✅ / ✅ / ⚠️ |
| user-facing | [`createTitle`](current/LEGEND_AND_TITLE.md#createtitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editTitle`](current/LEGEND_AND_TITLE.md#edittitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
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
| `editBarMark` | accepted | [Open](planned/MARK_SELECTION.md#editbarmark) |
| `filterMarks` | accepted | [Open](planned/MARK_SELECTION.md#filtermarks) |
| `highlightMarks` | accepted | [Open](planned/MARK_SELECTION.md#highlightmarks) |
| `selectMarks` | accepted | [Open](planned/MARK_SELECTION.md#selectmarks) |

## Planned capabilities

| Kind | Capability | Readiness | Contract |
| --- | --- | --- | --- |
| composition | Mark-item selection grammar | accepted | [Open](planned/MARK_SELECTION.md#mark-item-selection-grammar) |
| parameter | Continuous color bar consumer | accepted | [Open](planned/ENCODINGS.md#continuous-color-bar-consumer) |
| parameter | Scale type vocabulary | accepted | [Open](planned/SCALES.md#scale-type-vocabulary) |
| parameter | Scale mapping policies | accepted | [Open](planned/SCALES.md#scale-mapping-policies) |
| parameter | Graphic parent attachment | accepted | [Open](planned/PRIMITIVES.md#graphic-parent-attachment) |

## Internal inventories

- [Materialization and guide-component wrapped actions](internal/ACTIONS.md)

Internal wrapped actions are trace-visible implementation details and are not direct public actions or primitives.
