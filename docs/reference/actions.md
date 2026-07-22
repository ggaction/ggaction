---
layout: default
title: Action Reference
description: Find every public ggaction action by task, API layer, or exact action name.
---

# Action Reference

Every direct action accepts one option object and returns a new immutable `ChartProgram`. Choose a task family for readable behavior, defaults, inference, and errors; use the exact lookup when you already know the action name. The API-layer labels match the action catalog layers `user-facing`, `advanced`, and `primitive`, respectively.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/reference/actions/charts-data/' | relative_url }}"><strong>Charts, Data, and Composition Actions</strong><span>Create complete charts, manage data, select marks, and compose complete programs.</span></a>
  <a href="{{ '/reference/actions/marks/' | relative_url }}"><strong>Mark Actions</strong><span>Create, edit, jitter, and remove semantic chart marks.</span></a>
  <a href="{{ '/reference/actions/encodings/' | relative_url }}"><strong>Encoding Actions</strong><span>Map fields and constants to position, grouping, color, shape, size, and appearance.</span></a>
  <a href="{{ '/reference/actions/statistics/' | relative_url }}"><strong>Statistical Layer Actions</strong><span>Create and edit regression, density, interval, error, and box-plot layers.</span></a>
  <a href="{{ '/reference/actions/guides/' | relative_url }}"><strong>Guide, Axis, Grid, and Title Actions</strong><span>Create, edit, and remove axes, grids, legends, and chart titles.</span></a>
  <a href="{{ '/reference/actions/advanced/' | relative_url }}"><strong>Advanced chart actions</strong><span>Explicit resources and focused axis or grid control.</span></a>
  <a href="{{ '/reference/actions/extension/' | relative_url }}"><strong>Extension actions</strong><span>Wrapped actions and public authoring primitives.</span></a>
  <a href="{{ '/reference/runtime/' | relative_url }}"><strong>Program and rendering functions</strong><span>Package functions, renderers, and internal trace boundaries.</span></a>
  <a href="{{ '/reference/types/' | relative_url }}"><strong>Exact TypeScript contract</strong><span>The complete generated `ChartProgram` action interface.</span></a>
</div>

## Exact action lookup

Use document search with `Ctrl+K`, or filter the alphabetical list by action name, API layer, or domain. Each action has one canonical family entry.

<div class="docs-action-filter docs-action-lookup" data-action-lookup>
  <label for="docs-action-lookup-input">Filter exact actions</label>
  <input id="docs-action-lookup-input" type="search" placeholder="Try legend, primitive, or encodeColor" autocomplete="off">
  <span class="docs-action-filter__status" aria-live="polite"></span>
</div>

| Action | API layer | Domain |
| --- | --- | --- |
| [`createArcMark`](./actions/marks.md#createarcmark) | user-facing | marks |
| [`createAreaMark`](./actions/marks.md#createareamark) | user-facing | marks |
| [`createAxes`](./actions/guides.md#createaxes) | user-facing | axes |
| [`createBarMark`](./actions/marks.md#createbarmark) | user-facing | marks |
| [`createBarPlot`](./actions/charts-data.md#createbarplot) | user-facing | charts |
| [`createBin2DData`](./actions/charts-data.md#createbin2ddata) | user-facing | core |
| [`createBoxPlot`](./actions/statistics.md#createboxplot) | user-facing | statistics |
| [`createCanvas`](./actions/charts-data.md#createcanvas) | user-facing | core |
| [`createCoordinate`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | core |
| [`createData`](./actions/charts-data.md#createdata) | user-facing | core |
| [`createDensityData`](./actions/charts-data.md#createdensitydata) | user-facing | core |
| [`createDerivedData`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | core |
| [`createErrorBand`](./actions/statistics.md#createerrorband) | user-facing | statistics |
| [`createErrorBar`](./actions/statistics.md#createerrorbar) | user-facing | statistics |
| [`createGradientPlot`](./actions/statistics.md#creategradientplot) | user-facing | statistics |
| [`createGraphics`](./actions/extension.md#extension-actions) | primitive | primitives |
| [`createGrid`](./actions/guides.md#creategrid) | user-facing | grid |
| [`createGuides`](./actions/guides.md#createguides) | user-facing | legend_and_title |
| [`createHeatmap`](./actions/charts-data.md#createheatmap) | user-facing | charts |
| [`createHistogram`](./actions/charts-data.md#createhistogram) | user-facing | charts |
| [`createHorizontalGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`createIntervalData`](./actions/statistics.md#createintervaldata) | user-facing | statistics |
| [`createLegend`](./actions/guides.md#createlegend) | user-facing | legend_and_title |
| [`createLineMark`](./actions/marks.md#createlinemark) | user-facing | marks |
| [`createLinePlot`](./actions/charts-data.md#createlineplot) | user-facing | charts |
| [`createParallelCoordinates`](./actions/charts-data.md#createparallelcoordinates) | user-facing | charts |
| [`createPointMark`](./actions/marks.md#createpointmark) | user-facing | marks |
| [`createRadialAxis`](./actions/guides.md#createradialaxis) | user-facing | axes |
| [`createRadialGrid`](./actions/guides.md#createradialgrid) | user-facing | grid |
| [`createRectMark`](./actions/marks.md#createrectmark) | user-facing | marks |
| [`createRegression`](./actions/statistics.md#createregression) | user-facing | statistics |
| [`createRegressionBand`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | statistics |
| [`createRegressionData`](./actions/charts-data.md#createregressiondata) | user-facing | core |
| [`createRegressionLine`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | statistics |
| [`createRuleMark`](./actions/marks.md#createrulemark) | user-facing | marks |
| [`createScale`](./actions/extension.md#extension-actions) | user-facing | core |
| [`createScatterPlot`](./actions/charts-data.md#createscatterplot) | user-facing | charts |
| [`createTextMark`](./actions/marks.md#createtextmark) | user-facing | marks |
| [`createThetaAxis`](./actions/guides.md#createthetaaxis) | user-facing | axes |
| [`createThetaGrid`](./actions/guides.md#createthetagrid) | user-facing | grid |
| [`createTitle`](./actions/guides.md#createtitle) | user-facing | legend_and_title |
| [`createVerticalGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`createViolinPlot`](./actions/statistics.md#createviolinplot) | user-facing | statistics |
| [`createWindowData`](./actions/charts-data.md#createwindowdata) | user-facing | core |
| [`createXAxis`](./actions/advanced.md#complete-single-channel-axes) | user-facing | axes |
| [`createXAxisLabels`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createXAxisLine`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createXAxisTicks`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createXAxisTicksAndLabels`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`createXAxisTitle`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`createYAxis`](./actions/advanced.md#complete-single-channel-axes) | user-facing | axes |
| [`createYAxisLabels`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createYAxisLine`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createYAxisTicks`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`createYAxisTicksAndLabels`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`createYAxisTitle`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`editArcMark`](./actions/marks.md#editarcmark) | user-facing | marks |
| [`editAreaMark`](./actions/marks.md#editareamark) | user-facing | marks |
| [`editBarMark`](./actions/marks.md#editbarmark) | user-facing | marks |
| [`editBin2DData`](./actions/charts-data.md#editbin2ddata) | user-facing | core |
| [`editBoxPlot`](./actions/statistics.md#editboxplot) | user-facing | statistics |
| [`editCanvas`](./actions/charts-data.md#editcanvas) | user-facing | core |
| [`editCompositionLayout`](./actions/charts-data.md#editcompositionlayout) | user-facing | composition |
| [`editDensity`](./actions/encodings.md#editdensity) | user-facing | encodings |
| [`editErrorBand`](./actions/statistics.md#editerrorband-and-editerrorbandboundary) | user-facing | statistics |
| [`editErrorBandBoundary`](./actions/statistics.md#editerrorband-and-editerrorbandboundary) | user-facing | statistics |
| [`editErrorBar`](./actions/statistics.md#editerrorbar) | user-facing | statistics |
| [`editFacetGuides`](./actions/charts-data.md#editfacetguides) | user-facing | composition |
| [`editFacetHeaders`](./actions/charts-data.md#editfacetheaders) | user-facing | composition |
| [`editFacetScales`](./actions/charts-data.md#editfacetscales) | user-facing | composition |
| [`editGradientPlot`](./actions/statistics.md#editgradientplot) | user-facing | statistics |
| [`editGraphics`](./actions/extension.md#extension-actions) | primitive | primitives |
| [`editGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`editHorizon`](./actions/encodings.md#edithorizon) | user-facing | encodings |
| [`editHorizontalGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`editLegend`](./actions/guides.md#editlegend) | user-facing | legend_and_title |
| [`editLegendBorder`](./actions/guides.md#focused-legend-edits) | user-facing | legend_and_title |
| [`editLegendLabels`](./actions/guides.md#focused-legend-edits) | user-facing | legend_and_title |
| [`editLegendLayout`](./actions/guides.md#focused-legend-edits) | user-facing | legend_and_title |
| [`editLegendSymbols`](./actions/guides.md#focused-legend-edits) | user-facing | legend_and_title |
| [`editLegendTitle`](./actions/guides.md#focused-legend-edits) | user-facing | legend_and_title |
| [`editLineMark`](./actions/marks.md#editlinemark) | user-facing | marks |
| [`editMarkSelection`](./actions/advanced.md#editmarkselection) | advanced | mark-selection |
| [`editPointMark`](./actions/marks.md#editpointmark) | user-facing | marks |
| [`editRadialAxis`](./actions/guides.md#editradialaxis) | user-facing | axes |
| [`editRadialAxisLabels`](./actions/guides.md#editradialaxislabels) | user-facing | axes |
| [`editRadialAxisLine`](./actions/guides.md#editradialaxisline) | user-facing | axes |
| [`editRadialAxisTicks`](./actions/guides.md#editradialaxisticks) | user-facing | axes |
| [`editRadialAxisTitle`](./actions/guides.md#editradialaxistitle) | user-facing | axes |
| [`editRadialGrid`](./actions/guides.md#editradialgrid) | user-facing | grid |
| [`editRectMark`](./actions/marks.md#editrectmark) | user-facing | marks |
| [`editRegression`](./actions/statistics.md#editregression) | user-facing | statistics |
| [`editRegressionBand`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | statistics |
| [`editRegressionLine`](./actions/advanced.md#semantic-resources-and-regression-layers) | user-facing | statistics |
| [`editScale`](./actions/extension.md#extension-actions) | user-facing | core |
| [`editSemantic`](./actions/extension.md#extension-actions) | primitive | primitives |
| [`editTextMark`](./actions/marks.md#edittextmark) | user-facing | marks |
| [`editThetaAxis`](./actions/guides.md#editthetaaxis) | user-facing | axes |
| [`editThetaAxisLabels`](./actions/guides.md#editthetaaxislabels) | user-facing | axes |
| [`editThetaAxisLine`](./actions/guides.md#editthetaaxisline) | user-facing | axes |
| [`editThetaAxisTicks`](./actions/guides.md#editthetaaxisticks) | user-facing | axes |
| [`editThetaAxisTitle`](./actions/guides.md#editthetaaxistitle) | user-facing | axes |
| [`editThetaGrid`](./actions/guides.md#editthetagrid) | user-facing | grid |
| [`editTitle`](./actions/guides.md#edittitle) | user-facing | legend_and_title |
| [`editVerticalGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`editXAxis`](./actions/advanced.md#complete-single-channel-axes) | user-facing | axes |
| [`editXAxisLabels`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editXAxisLine`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editXAxisTicks`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editXAxisTicksAndLabels`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`editXAxisTitle`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`editYAxis`](./actions/advanced.md#complete-single-channel-axes) | user-facing | axes |
| [`editYAxisLabels`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editYAxisLine`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editYAxisTicks`](./actions/advanced.md#axis-lines-ticks-and-labels) | user-facing | axes |
| [`editYAxisTicksAndLabels`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`editYAxisTitle`](./actions/advanced.md#ticklabel-groups-and-axis-titles) | user-facing | axes |
| [`encodeBarWidth`](./actions/encodings.md#encodebarwidth) | user-facing | encodings |
| [`encodeColor`](./actions/encodings.md#encodecolor) | user-facing | encodings |
| [`encodeDensity`](./actions/encodings.md#encodedensity) | user-facing | encodings |
| [`encodeGroup`](./actions/encodings.md#encodegroup) | user-facing | encodings |
| [`encodeHistogram`](./actions/encodings.md#encodehistogram) | user-facing | encodings |
| [`encodeHorizon`](./actions/encodings.md#encodehorizon) | user-facing | encodings |
| [`encodeOpacity`](./actions/encodings.md#encodeopacity) | user-facing | encodings |
| [`encodeParallelCoordinates`](./actions/encodings.md#encodeparallelcoordinates) | user-facing | encodings |
| [`encodePathOrder`](./actions/encodings.md#encodepathorder) | user-facing | encodings |
| [`encodePointRadius`](./actions/encodings.md#encodepointradius) | user-facing | encodings |
| [`encodeR`](./actions/encodings.md#encoder) | user-facing | encodings |
| [`encodeRadius`](./actions/encodings.md#encoderadius) | user-facing | encodings |
| [`encodeShape`](./actions/encodings.md#encodeshape) | user-facing | encodings |
| [`encodeSize`](./actions/encodings.md#encodesize) | user-facing | encodings |
| [`encodeStroke`](./actions/encodings.md#encodestroke) | user-facing | encodings |
| [`encodeStrokeDash`](./actions/encodings.md#encodestrokedash) | user-facing | encodings |
| [`encodeStrokeWidth`](./actions/encodings.md#encodestrokewidth) | user-facing | encodings |
| [`encodeText`](./actions/encodings.md#encodetext) | user-facing | encodings |
| [`encodeTheta`](./actions/encodings.md#encodetheta) | user-facing | encodings |
| [`encodeX`](./actions/encodings.md#encodex) | user-facing | encodings |
| [`encodeX2`](./actions/encodings.md#encodex2) | user-facing | encodings |
| [`encodeXOffset`](./actions/encodings.md#encodexoffset) | user-facing | encodings |
| [`encodeXRange`](./actions/encodings.md#encodexrange) | user-facing | encodings |
| [`encodeY`](./actions/encodings.md#encodey) | user-facing | encodings |
| [`encodeY2`](./actions/encodings.md#encodey2) | user-facing | encodings |
| [`encodeYOffset`](./actions/encodings.md#encodeyoffset) | user-facing | encodings |
| [`encodeYRange`](./actions/encodings.md#encodeyrange) | user-facing | encodings |
| [`facet`](./actions/charts-data.md#facet) | user-facing | composition |
| [`filterData`](./actions/charts-data.md#filterdata) | user-facing | core |
| [`filterMarks`](./actions/charts-data.md#filtermarks) | user-facing | mark-selection |
| [`highlightMarks`](./actions/charts-data.md#highlightmarks) | user-facing | mark-selection |
| [`jitterPoints`](./actions/marks.md#jitterpoints) | user-facing | marks |
| [`layoutLabels`](./actions/marks.md#layoutlabels) | user-facing | marks |
| [`removeEncoding`](./actions/encodings.md#removeencoding) | user-facing | encodings |
| [`removeGrid`](./actions/advanced.md#directional-grids) | user-facing | grid |
| [`removeJitter`](./actions/marks.md#removejitter) | user-facing | marks |
| [`removeLabelLayout`](./actions/marks.md#removelabellayout) | user-facing | marks |
| [`removeLegend`](./actions/guides.md#removelegend) | user-facing | legend_and_title |
| [`removeMark`](./actions/marks.md#removemark) | user-facing | marks |
| [`removeMarkHighlight`](./actions/charts-data.md#removemarkhighlight) | user-facing | mark-selection |
| [`removeMarkSelection`](./actions/advanced.md#removemarkselection) | advanced | mark-selection |
| [`removePathOrder`](./actions/encodings.md#removepathorder) | user-facing | encodings |
| [`removePointRadius`](./actions/encodings.md#removepointradius) | user-facing | encodings |
| [`removeRadialAxis`](./actions/guides.md#removeradialaxis) | user-facing | axes |
| [`removeThetaAxis`](./actions/guides.md#removethetaaxis) | user-facing | axes |
| [`removeTitle`](./actions/guides.md#removetitle) | user-facing | legend_and_title |
| [`removeXAxis`](./actions/advanced.md#complete-axis-removal) | user-facing | axes |
| [`removeYAxis`](./actions/advanced.md#complete-axis-removal) | user-facing | axes |
| [`replaceCompositionChild`](./actions/charts-data.md#replacecompositionchild) | user-facing | composition |
| [`selectMarks`](./actions/advanced.md#reusable-mark-selections) | advanced | mark-selection |
