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
| user-facing | [`createDensityData`](current/CORE.md#createdensitydata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createRegressionData`](current/CORE.md#createregressiondata) | core | Immutable create-only | Intentional | ✅ / ✅ / ⚠️ |
| user-facing | [`createWindowData`](current/CORE.md#createwindowdata) | core | Immutable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createBin2DData`](current/CORE.md#createbin2ddata) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createIntervalData`](current/STATISTICS.md#createintervaldata) | statistics | Immutable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createPointMark`](current/MARKS.md#createpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createTextMark`](current/MARKS.md#createtextmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editTextMark`](current/MARKS.md#edittextmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editPointMark`](current/MARKS.md#editpointmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`jitterPoints`](current/MARKS.md#jitterpoints) | marks | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`removeJitter`](current/MARKS.md#removejitter) | marks | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`removeMark`](current/MARKS.md#removemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createLineMark`](current/MARKS.md#createlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLineMark`](current/MARKS.md#editlinemark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createBarMark`](current/MARKS.md#createbarmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editBarMark`](current/MARKS.md#editbarmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
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
| user-facing | [`encodeTheta`](current/ENCODINGS.md#encodetheta) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeR`](current/ENCODINGS.md#encoder) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodePointRadius`](current/ENCODINGS.md#encodepointradius) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeXOffset`](current/ENCODINGS.md#encodexoffset) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeYOffset`](current/ENCODINGS.md#encodeyoffset) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeY2`](current/ENCODINGS.md#encodey2) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeYRange`](current/ENCODINGS.md#encodeyrange) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeXRange`](current/ENCODINGS.md#encodexrange) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeGroup`](current/ENCODINGS.md#encodegroup) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodePathOrder`](current/ENCODINGS.md#encodepathorder) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`removePathOrder`](current/ENCODINGS.md#removepathorder) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeText`](current/ENCODINGS.md#encodetext) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeHistogram`](current/ENCODINGS.md#encodehistogram) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`encodeDensity`](current/ENCODINGS.md#encodedensity) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`editDensity`](current/ENCODINGS.md#editdensity) | encodings | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`encodeBarWidth`](current/ENCODINGS.md#encodebarwidth) | encodings | Assignment | Reassignment — Implemented | ✅ / ✅ / ✅ |
| user-facing | [`createRegression`](current/STATISTICS.md#createregression) | statistics | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editRegression`](current/STATISTICS.md#editregression) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createErrorBar`](current/STATISTICS.md#createerrorbar) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editErrorBar`](current/STATISTICS.md#editerrorbar) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createErrorBand`](current/STATISTICS.md#createerrorband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editErrorBand`](current/STATISTICS.md#editerrorband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editErrorBandBoundary`](current/STATISTICS.md#editerrorbandboundary) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createBoxPlot`](current/COMPOSITE_MARKS.md#createboxplot) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editBoxPlot`](current/COMPOSITE_MARKS.md#editboxplot) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createGradientPlot`](current/GRADIENT_PLOTS.md#creategradientplot) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editGradientPlot`](current/GRADIENT_PLOTS.md#editgradientplot) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createViolinPlot`](current/VIOLIN_PLOTS.md#createviolinplot) | statistics | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
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
| user-facing | [`editXAxis`](current/AXES.md#editxaxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editYAxis`](current/AXES.md#edityaxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeXAxis`](current/AXES.md#removexaxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeYAxis`](current/AXES.md#removeyaxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createGrid`](current/GRID.md#creategrid) | grid | Aggregate create-only | Intentional; planned child edits | ✅ / ✅ / ✅ |
| user-facing | [`createHorizontalGrid`](current/GRID.md#createhorizontalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createVerticalGrid`](current/GRID.md#createverticalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editHorizontalGrid`](current/GRID.md#edithorizontalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editVerticalGrid`](current/GRID.md#editverticalgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editGrid`](current/GRID.md#editgrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeGrid`](current/GRID.md#removegrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createLegend`](current/LEGEND_AND_TITLE.md#createlegend) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editLegend`](current/LEGEND_AND_TITLE.md#editlegend) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`editLegendLayout`](current/LEGEND_AND_TITLE.md#editlegendlayout) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLegendLabels`](current/LEGEND_AND_TITLE.md#editlegendlabels) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLegendTitle`](current/LEGEND_AND_TITLE.md#editlegendtitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLegendSymbols`](current/LEGEND_AND_TITLE.md#editlegendsymbols) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editLegendBorder`](current/LEGEND_AND_TITLE.md#editlegendborder) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createGuides`](current/LEGEND_AND_TITLE.md#createguides) | legend_and_title | Aggregate create-only | Intentional; child edit gaps remain | ✅ / ✅ / ⚠️ |
| user-facing | [`removeLegend`](current/LEGEND_AND_TITLE.md#removelegend) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createTitle`](current/LEGEND_AND_TITLE.md#createtitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editTitle`](current/LEGEND_AND_TITLE.md#edittitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeTitle`](current/LEGEND_AND_TITLE.md#removetitle) | legend_and_title | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createCoordinate`](current/CORE.md#createcoordinate) | core | Structural create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createScale`](current/CORE.md#createscale) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editScale`](current/CORE.md#editscale) | core | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createDerivedData`](current/CORE.md#createderiveddata) | core | Immutable create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createRegressionBand`](current/STATISTICS.md#createregressionband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRegressionBand`](current/STATISTICS.md#editregressionband) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createRegressionLine`](current/STATISTICS.md#createregressionline) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRegressionLine`](current/STATISTICS.md#editregressionline) | statistics | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`filterMarks`](current/MARK_SELECTION.md#filtermarks) | mark-selection | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| advanced | [`selectMarks`](current/MARK_SELECTION.md#selectmarks) | mark-selection | Stable create-only | Complete | ✅ / ✅ / ✅ |
| user-facing | [`highlightMarks`](current/MARK_SELECTION.md#highlightmarks) | mark-selection | Mutable resource | Complete | ✅ / ✅ / ✅ |
| primitive | [`editSemantic`](current/PRIMITIVES.md#editsemantic) | primitives | Primitive | Complete | ✅ / ✅ / ⚠️ |
| primitive | [`createGraphics`](current/PRIMITIVES.md#creategraphics) | primitives | Primitive | Complete | ✅ / ✅ / ✅ |
| primitive | [`editGraphics`](current/PRIMITIVES.md#editgraphics) | primitives | Primitive | Complete | ✅ / ✅ / ⚠️ |
| user-facing | [`createArcMark`](current/MARKS.md#createarcmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editArcMark`](current/MARKS.md#editarcmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createThetaAxis`](current/AXES.md#createThetaAxis) | axes | Aggregate create-only | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createRadialAxis`](current/AXES.md#createRadialAxis) | axes | Aggregate create-only | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaAxis`](current/AXES.md#editThetaAxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialAxis`](current/AXES.md#editRadialAxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeThetaAxis`](current/AXES.md#removeThetaAxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`removeRadialAxis`](current/AXES.md#removeRadialAxis) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaAxisLine`](current/AXES.md#editThetaAxisLine) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialAxisLine`](current/AXES.md#editRadialAxisLine) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaAxisTicks`](current/AXES.md#editThetaAxisTicks) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialAxisTicks`](current/AXES.md#editRadialAxisTicks) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaAxisLabels`](current/AXES.md#editThetaAxisLabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialAxisLabels`](current/AXES.md#editRadialAxisLabels) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaAxisTitle`](current/AXES.md#editThetaAxisTitle) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialAxisTitle`](current/AXES.md#editRadialAxisTitle) | axes | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createThetaGrid`](current/GRID.md#createThetaGrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createRadialGrid`](current/GRID.md#createRadialGrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editThetaGrid`](current/GRID.md#editThetaGrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRadialGrid`](current/GRID.md#editRadialGrid) | grid | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editCompositionLayout`](current/COMPOSITION.md#editCompositionLayout) | composition | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`replaceCompositionChild`](current/COMPOSITION.md#replaceCompositionChild) | composition | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`facet`](current/COMPOSITION.md#facet) | composition | Aggregate create-only | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editFacetHeaders`](current/COMPOSITION.md#editFacetHeaders) | composition | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`createScatterPlot`](current/BASIC_CHARTS.md#createscatterplot) | charts | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createLinePlot`](current/BASIC_CHARTS.md#createlineplot) | charts | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createBarPlot`](current/BASIC_CHARTS.md#createbarplot) | charts | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createHistogram`](current/BASIC_CHARTS.md#createhistogram) | charts | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createHeatmap`](current/BASIC_CHARTS.md#createheatmap) | charts | Aggregate create-only | Intentional | ✅ / ✅ / ✅ |
| user-facing | [`createRectMark`](current/MARKS.md#createrectmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |
| user-facing | [`editRectMark`](current/MARKS.md#editrectmark) | marks | Mutable resource | Complete | ✅ / ✅ / ✅ |

## Planned direct actions

| Action | Readiness | Contract |
| --- | --- | --- |

## Planned capabilities

| Kind | Capability | Readiness | Contract |
| --- | --- | --- | --- |

## Internal inventories

- [Materialization and guide-component wrapped actions](internal/ACTIONS.md)

Internal wrapped actions are trace-visible implementation details and are not direct public actions or primitives.
