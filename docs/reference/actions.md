---
layout: default
title: Action Reference
description: Find every public ggaction action by task, API layer, or exact action name.
---

# Action Reference

Every direct action accepts one option object and returns a new immutable `ChartProgram`. Choose a task family for readable behavior, defaults, inference, and errors; use the exact lookup when you already know the action name. H0–H4 are [catalog role tags](../tutorials/hierarchical-authoring.md#catalog-role-tags), not grammar levels or trace depths. An action's relative hierarchy comes from the smaller actions it composes. The API-layer labels `user-facing`, `advanced`, and `primitive` independently describe exposure.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/reference/actions/charts-data/' | relative_url }}"><strong>Charts, Data, and Composition Actions</strong><span>Create complete charts, manage data, select marks, and compose complete programs.</span></a>
  <a href="{{ '/reference/actions/marks/' | relative_url }}"><strong>Mark Actions</strong><span>Create, edit, jitter, and remove semantic chart marks.</span></a>
  <a href="{{ '/reference/actions/encodings/' | relative_url }}"><strong>Encoding Actions</strong><span>Map fields and constants to position, grouping, color, shape, size, and appearance.</span></a>
  <a href="{{ '/reference/actions/statistics/' | relative_url }}"><strong>Statistical Layer Actions</strong><span>Create and edit regression, density, interval, error, and box-plot layers.</span></a>
  <a href="{{ '/reference/actions/guides/' | relative_url }}"><strong>Guide, Axis, Grid, and Title Actions</strong><span>Create, edit, and remove axes, grids, legends, and chart titles.</span></a>
  <a href="{{ '/reference/actions/advanced/' | relative_url }}"><strong>Advanced chart actions</strong><span>Atomic channel changes and reusable mark selections.</span></a>
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

| Action | Authoring role | API layer | Domain |
| --- | --- | --- | --- |
| [`applyTextMetrics`](./actions/charts-data.md#applytextmetrics) | H3 | user-facing | core |
| [`applyTheme`](./actions/charts-data.md#applytheme) | H3 | user-facing | core |
| [`bindMarkData`](./actions/charts-data.md#bindmarkdata) | H2 | user-facing | core |
| [`createAnnotation`](./actions/marks.md#createannotation) | H1, H2 | user-facing | marks |
| [`createArcMark`](./actions/marks.md#createarcmark) | H2 | user-facing | marks |
| [`createAreaMark`](./actions/marks.md#createareamark) | H2 | user-facing | marks |
| [`createAreaPlot`](./actions/charts-data.md#createareaplot) | H0 | user-facing | charts |
| [`createAxes`](./actions/guides.md#createaxes) | H3 | user-facing | axes |
| [`createBarMark`](./actions/marks.md#createbarmark) | H2 | user-facing | marks |
| [`createBarPlot`](./actions/charts-data.md#createbarplot) | H0 | user-facing | charts |
| [`createBeeswarmPlot`](./actions/charts-data.md#createbeeswarmplot) | H0 | user-facing | charts |
| [`createBin2DData`](./actions/charts-data.md#createbin2ddata) | H2 | user-facing | core |
| [`createBinData`](./actions/statistics.md#createbindata) | H1 | user-facing | statistics |
| [`createBoxPlot`](./actions/statistics.md#createboxplot) | H0, H1 | user-facing | statistics |
| [`createCanvas`](./actions/charts-data.md#createcanvas) | H3 | user-facing | core |
| [`createCompleteData`](./actions/statistics.md#createcompletedata) | H1 | user-facing | statistics |
| [`createComputedData`](./actions/statistics.md#createcomputeddata) | H1 | user-facing | statistics |
| [`createCoordinate`](./actions/charts-data.md#createcoordinate) | H2 | user-facing | core |
| [`createData`](./actions/charts-data.md#createdata) | H2 | user-facing | core |
| [`createDensityData`](./actions/charts-data.md#createdensitydata) | H2 | user-facing | core |
| [`createDensityPlot`](./actions/statistics.md#createdensityplot) | H0, H1 | user-facing | statistics |
| [`createDerivedData`](./actions/charts-data.md#createderiveddata) | H2 | user-facing | core |
| [`createDotPlot`](./actions/charts-data.md#createdotplot) | H0, H1 | user-facing | charts |
| [`createDumbbellPlot`](./actions/charts-data.md#createdumbbellplot) | H0, H1 | user-facing | charts |
| [`createECDFData`](./actions/statistics.md#createecdfdata) | H1 | user-facing | statistics |
| [`createECDFPlot`](./actions/charts-data.md#createecdfplot) | H0, H1 | user-facing | charts |
| [`createErrorBand`](./actions/statistics.md#createerrorband) | H1 | user-facing | statistics |
| [`createErrorBar`](./actions/statistics.md#createerrorbar) | H1 | user-facing | statistics |
| [`createFoldData`](./actions/statistics.md#createfolddata) | H1 | user-facing | statistics |
| [`createGradientPlot`](./actions/statistics.md#creategradientplot) | H0, H1 | user-facing | statistics |
| [`createGraphics`](./actions/extension.md#creategraphics) | H4 | primitive | primitives |
| [`createGrid`](./actions/guides.md#creategrid) | H3 | user-facing | grid |
| [`createGuides`](./actions/guides.md#createguides) | H3 | user-facing | legend_and_title |
| [`createHeatmap`](./actions/charts-data.md#createheatmap) | H0 | user-facing | charts |
| [`createHistogram`](./actions/charts-data.md#createhistogram) | H0, H1 | user-facing | charts |
| [`createHorizonPlot`](./actions/statistics.md#createhorizonplot) | H0, H1 | user-facing | statistics |
| [`createHorizontalGrid`](./actions/guides.md#createhorizontalgrid) | H3 | user-facing | grid |
| [`createImputedData`](./actions/statistics.md#createimputeddata) | H1 | user-facing | statistics |
| [`createIntervalData`](./actions/statistics.md#createintervaldata) | H1 | user-facing | statistics |
| [`createIntervalPlot`](./actions/charts-data.md#createintervalplot) | H0, H1 | user-facing | charts |
| [`createLegend`](./actions/guides.md#createlegend) | H3 | user-facing | legend_and_title |
| [`createLineMark`](./actions/marks.md#createlinemark) | H2 | user-facing | marks |
| [`createLinePlot`](./actions/charts-data.md#createlineplot) | H0 | user-facing | charts |
| [`createLollipopPlot`](./actions/charts-data.md#createlollipopplot) | H0, H1 | user-facing | charts |
| [`createMarkLabels`](./actions/marks.md#createmarklabels) | H1, H2 | user-facing | marks |
| [`createNormalizedData`](./actions/statistics.md#createnormalizeddata) | H1 | user-facing | statistics |
| [`createParallelAxes`](./actions/guides.md#createparallelaxes) | H3 | user-facing | axes |
| [`createParallelAxis`](./actions/guides.md#createparallelaxis) | H3 | user-facing | axes |
| [`createParallelCoordinates`](./actions/charts-data.md#createparallelcoordinates) | H0 | user-facing | charts |
| [`createPiePlot`](./actions/charts-data.md#createpieplot) | H0 | user-facing | charts |
| [`createPointMark`](./actions/marks.md#createpointmark) | H2 | user-facing | marks |
| [`createPolarLinePlot`](./actions/charts-data.md#createpolarlineplot) | H0 | user-facing | charts |
| [`createPolarScatterPlot`](./actions/charts-data.md#createpolarscatterplot) | H0 | user-facing | charts |
| [`createRadarPlot`](./actions/charts-data.md#createradarplot) | H0 | user-facing | charts |
| [`createRadialAxis`](./actions/guides.md#createradialaxis) | H3 | user-facing | axes |
| [`createRadialAxisLabels`](./actions/guides.md#createradialaxislabels) | H3 | user-facing | axes |
| [`createRadialAxisLine`](./actions/guides.md#createradialaxisline) | H3 | user-facing | axes |
| [`createRadialAxisTicks`](./actions/guides.md#createradialaxisticks) | H3 | user-facing | axes |
| [`createRadialAxisTitle`](./actions/guides.md#createradialaxistitle) | H3 | user-facing | axes |
| [`createRadialBarPlot`](./actions/charts-data.md#createradialbarplot) | H0 | user-facing | charts |
| [`createRadialGrid`](./actions/guides.md#createradialgrid) | H3 | user-facing | grid |
| [`createRaincloudPlot`](./actions/charts-data.md#createraincloudplot) | H0, H1 | user-facing | charts |
| [`createRectMark`](./actions/marks.md#createrectmark) | H2 | user-facing | marks |
| [`createReferenceBand`](./actions/marks.md#createreferenceband) | H1, H2 | user-facing | marks |
| [`createReferenceLine`](./actions/marks.md#createreferenceline) | H1, H2 | user-facing | marks |
| [`createRegression`](./actions/statistics.md#createregression) | H1 | user-facing | statistics |
| [`createRegressionBand`](./actions/statistics.md#createregressionband) | H1 | user-facing | statistics |
| [`createRegressionData`](./actions/charts-data.md#createregressiondata) | H2 | user-facing | core |
| [`createRegressionLine`](./actions/statistics.md#createregressionline) | H1 | user-facing | statistics |
| [`createRegressionPlot`](./actions/charts-data.md#createregressionplot) | H0, H1 | user-facing | charts |
| [`createRosePlot`](./actions/charts-data.md#createroseplot) | H0 | user-facing | charts |
| [`createRugPlot`](./actions/charts-data.md#createrugplot) | H0 | user-facing | charts |
| [`createRuleMark`](./actions/marks.md#createrulemark) | H2 | user-facing | marks |
| [`createScale`](./actions/charts-data.md#createscale) | H2 | user-facing | core |
| [`createScatterPlot`](./actions/charts-data.md#createscatterplot) | H0 | user-facing | charts |
| [`createSortedData`](./actions/statistics.md#createsorteddata) | H1 | user-facing | statistics |
| [`createStackData`](./actions/statistics.md#createstackdata) | H1 | user-facing | statistics |
| [`createStripPlot`](./actions/charts-data.md#createstripplot) | H0 | user-facing | charts |
| [`createSummaryData`](./actions/statistics.md#createsummarydata) | H1 | user-facing | statistics |
| [`createTextMark`](./actions/marks.md#createtextmark) | H2 | user-facing | marks |
| [`createThetaAxis`](./actions/guides.md#createthetaaxis) | H3 | user-facing | axes |
| [`createThetaAxisLabels`](./actions/guides.md#createthetaaxislabels) | H3 | user-facing | axes |
| [`createThetaAxisLine`](./actions/guides.md#createthetaaxisline) | H3 | user-facing | axes |
| [`createThetaAxisTicks`](./actions/guides.md#createthetaaxisticks) | H3 | user-facing | axes |
| [`createThetaAxisTitle`](./actions/guides.md#createthetaaxistitle) | H3 | user-facing | axes |
| [`createThetaGrid`](./actions/guides.md#createthetagrid) | H3 | user-facing | grid |
| [`createTickMark`](./actions/marks.md#createtickmark) | H2 | user-facing | marks |
| [`createTimeUnitData`](./actions/charts-data.md#createtimeunitdata) | H2 | user-facing | core |
| [`createTitle`](./actions/guides.md#createtitle) | H3 | user-facing | legend_and_title |
| [`createVerticalGrid`](./actions/guides.md#createverticalgrid) | H3 | user-facing | grid |
| [`createViolinPlot`](./actions/statistics.md#createviolinplot) | H0, H1 | user-facing | statistics |
| [`createWindowData`](./actions/charts-data.md#createwindowdata) | H2 | user-facing | core |
| [`createXAxis`](./actions/guides.md#createxaxis) | H3 | user-facing | axes |
| [`createXAxisLabels`](./actions/guides.md#createxaxislabels) | H3 | user-facing | axes |
| [`createXAxisLine`](./actions/guides.md#createxaxisline) | H3 | user-facing | axes |
| [`createXAxisTicks`](./actions/guides.md#createxaxisticks) | H3 | user-facing | axes |
| [`createXAxisTicksAndLabels`](./actions/guides.md#createxaxisticksandlabels) | H3 | user-facing | axes |
| [`createXAxisTitle`](./actions/guides.md#createxaxistitle) | H3 | user-facing | axes |
| [`createYAxis`](./actions/guides.md#createyaxis) | H3 | user-facing | axes |
| [`createYAxisLabels`](./actions/guides.md#createyaxislabels) | H3 | user-facing | axes |
| [`createYAxisLine`](./actions/guides.md#createyaxisline) | H3 | user-facing | axes |
| [`createYAxisTicks`](./actions/guides.md#createyaxisticks) | H3 | user-facing | axes |
| [`createYAxisTicksAndLabels`](./actions/guides.md#createyaxisticksandlabels) | H3 | user-facing | axes |
| [`createYAxisTitle`](./actions/guides.md#createyaxistitle) | H3 | user-facing | axes |
| [`editArcMark`](./actions/marks.md#editarcmark) | H3 | user-facing | marks |
| [`editAreaMark`](./actions/marks.md#editareamark) | H3 | user-facing | marks |
| [`editBarMark`](./actions/marks.md#editbarmark) | H3 | user-facing | marks |
| [`editBin2DData`](./actions/charts-data.md#editbin2ddata) | H2 | user-facing | core |
| [`editBinData`](./actions/statistics.md#editbindata) | H1, H3 | user-facing | statistics |
| [`editBoxPlot`](./actions/statistics.md#editboxplot) | H1, H3 | user-facing | statistics |
| [`editCanvas`](./actions/charts-data.md#editcanvas) | H3 | user-facing | core |
| [`editColorScale`](./actions/charts-data.md#editcolorscale) | H2 | user-facing | core |
| [`editCompleteData`](./actions/statistics.md#editcompletedata) | H1, H3 | user-facing | statistics |
| [`editCompositionLayout`](./actions/charts-data.md#editcompositionlayout) | H3 | user-facing | composition |
| [`editComputedData`](./actions/statistics.md#editcomputeddata) | H1, H3 | user-facing | statistics |
| [`editCoordinate`](./actions/charts-data.md#editcoordinate) | H2 | user-facing | core |
| [`editDensity`](./actions/encodings.md#editdensity) | H2, H3 | user-facing | encodings |
| [`editDensityData`](./actions/charts-data.md#editdensitydata) | H2 | user-facing | core |
| [`editDerivedData`](./actions/charts-data.md#editderiveddata) | H2 | user-facing | core |
| [`editECDFData`](./actions/statistics.md#editecdfdata) | H1, H3 | user-facing | statistics |
| [`editECDFPlot`](./actions/charts-data.md#editecdfplot) | H1, H3 | user-facing | charts |
| [`editEndpointPlot`](./actions/charts-data.md#editendpointplot) | H1, H3 | user-facing | charts |
| [`editErrorBand`](./actions/statistics.md#editerrorband) | H1, H3 | user-facing | statistics |
| [`editErrorBandBoundary`](./actions/statistics.md#editerrorbandboundary) | H1, H3 | user-facing | statistics |
| [`editErrorBar`](./actions/statistics.md#editerrorbar) | H1, H3 | user-facing | statistics |
| [`editFacetGuides`](./actions/charts-data.md#editfacetguides) | H3 | user-facing | composition |
| [`editFacetHeaders`](./actions/charts-data.md#editfacetheaders) | H3 | user-facing | composition |
| [`editFacetScales`](./actions/charts-data.md#editfacetscales) | H3 | user-facing | composition |
| [`editFacetSource`](./actions/charts-data.md#editfacetsource) | H3 | user-facing | composition |
| [`editFilteredData`](./actions/charts-data.md#editfiltereddata) | H2 | user-facing | core |
| [`editFoldData`](./actions/statistics.md#editfolddata) | H1, H3 | user-facing | statistics |
| [`editGradientPlot`](./actions/statistics.md#editgradientplot) | H1, H3 | user-facing | statistics |
| [`editGraphics`](./actions/extension.md#editgraphics) | H4 | primitive | primitives |
| [`editGrid`](./actions/guides.md#editgrid) | H3 | user-facing | grid |
| [`editHorizon`](./actions/encodings.md#edithorizon) | H2, H3 | user-facing | encodings |
| [`editHorizontalGrid`](./actions/guides.md#edithorizontalgrid) | H3 | user-facing | grid |
| [`editImputedData`](./actions/statistics.md#editimputeddata) | H1, H3 | user-facing | statistics |
| [`editIntervalData`](./actions/statistics.md#editintervaldata) | H1, H3 | user-facing | statistics |
| [`editLegend`](./actions/guides.md#editlegend) | H3 | user-facing | legend_and_title |
| [`editLegendBlock`](./actions/guides.md#editlegendblock) | H3 | user-facing | legend_and_title |
| [`editLegendBorder`](./actions/guides.md#editlegendborder) | H3 | user-facing | legend_and_title |
| [`editLegendLabels`](./actions/guides.md#editlegendlabels) | H3 | user-facing | legend_and_title |
| [`editLegendLayout`](./actions/guides.md#editlegendlayout) | H3 | user-facing | legend_and_title |
| [`editLegendSymbols`](./actions/guides.md#editlegendsymbols) | H3 | user-facing | legend_and_title |
| [`editLegendTitle`](./actions/guides.md#editlegendtitle) | H3 | user-facing | legend_and_title |
| [`editLineMark`](./actions/marks.md#editlinemark) | H3 | user-facing | marks |
| [`editMarkLabelPlacement`](./actions/marks.md#editmarklabelplacement) | H3 | user-facing | marks |
| [`editMarkLabelSelection`](./actions/marks.md#editmarklabelselection) | H3 | user-facing | marks |
| [`editMarkSelection`](./actions/advanced.md#editmarkselection) | H3 | advanced | mark-selection |
| [`editNormalizedData`](./actions/statistics.md#editnormalizeddata) | H1, H3 | user-facing | statistics |
| [`editOpacityScale`](./actions/charts-data.md#editopacityscale) | H2 | user-facing | core |
| [`editParallelAxis`](./actions/guides.md#editparallelaxis) | H3 | user-facing | axes |
| [`editParallelScale`](./actions/charts-data.md#editparallelscale) | H2 | user-facing | core |
| [`editPointMark`](./actions/marks.md#editpointmark) | H3 | user-facing | marks |
| [`editRadialAxis`](./actions/guides.md#editradialaxis) | H3 | user-facing | axes |
| [`editRadialAxisLabels`](./actions/guides.md#editradialaxislabels) | H3 | user-facing | axes |
| [`editRadialAxisLine`](./actions/guides.md#editradialaxisline) | H3 | user-facing | axes |
| [`editRadialAxisTicks`](./actions/guides.md#editradialaxisticks) | H3 | user-facing | axes |
| [`editRadialAxisTitle`](./actions/guides.md#editradialaxistitle) | H3 | user-facing | axes |
| [`editRadialGrid`](./actions/guides.md#editradialgrid) | H3 | user-facing | grid |
| [`editRaincloudPlot`](./actions/charts-data.md#editraincloudplot) | H1, H3 | user-facing | charts |
| [`editRectMark`](./actions/marks.md#editrectmark) | H3 | user-facing | marks |
| [`editRegression`](./actions/statistics.md#editregression) | H1, H3 | user-facing | statistics |
| [`editRegressionBand`](./actions/statistics.md#editregressionband) | H1, H3 | user-facing | statistics |
| [`editRegressionData`](./actions/charts-data.md#editregressiondata) | H2 | user-facing | core |
| [`editRegressionLine`](./actions/statistics.md#editregressionline) | H1, H3 | user-facing | statistics |
| [`editRScale`](./actions/charts-data.md#editrscale) | H2 | user-facing | core |
| [`editRuleMark`](./actions/marks.md#editrulemark) | H3 | user-facing | marks |
| [`editScale`](./actions/charts-data.md#editscale) | H2 | user-facing | core |
| [`editSemantic`](./actions/extension.md#editsemantic) | H4 | primitive | primitives |
| [`editShapeScale`](./actions/charts-data.md#editshapescale) | H2 | user-facing | core |
| [`editSizeScale`](./actions/charts-data.md#editsizescale) | H2 | user-facing | core |
| [`editSortedData`](./actions/statistics.md#editsorteddata) | H1, H3 | user-facing | statistics |
| [`editStackData`](./actions/statistics.md#editstackdata) | H1, H3 | user-facing | statistics |
| [`editStrokeDashScale`](./actions/charts-data.md#editstrokedashscale) | H2 | user-facing | core |
| [`editStrokeScale`](./actions/charts-data.md#editstrokescale) | H2 | user-facing | core |
| [`editStrokeWidthScale`](./actions/charts-data.md#editstrokewidthscale) | H2 | user-facing | core |
| [`editSummaryData`](./actions/statistics.md#editsummarydata) | H1, H3 | user-facing | statistics |
| [`editTextMark`](./actions/marks.md#edittextmark) | H3 | user-facing | marks |
| [`editThetaAxis`](./actions/guides.md#editthetaaxis) | H3 | user-facing | axes |
| [`editThetaAxisLabels`](./actions/guides.md#editthetaaxislabels) | H3 | user-facing | axes |
| [`editThetaAxisLine`](./actions/guides.md#editthetaaxisline) | H3 | user-facing | axes |
| [`editThetaAxisTicks`](./actions/guides.md#editthetaaxisticks) | H3 | user-facing | axes |
| [`editThetaAxisTitle`](./actions/guides.md#editthetaaxistitle) | H3 | user-facing | axes |
| [`editThetaGrid`](./actions/guides.md#editthetagrid) | H3 | user-facing | grid |
| [`editThetaScale`](./actions/charts-data.md#editthetascale) | H2 | user-facing | core |
| [`editTickMark`](./actions/marks.md#edittickmark) | H3 | user-facing | marks |
| [`editTimeUnitData`](./actions/charts-data.md#edittimeunitdata) | H2 | user-facing | core |
| [`editTitle`](./actions/guides.md#edittitle) | H3 | user-facing | legend_and_title |
| [`editVerticalGrid`](./actions/guides.md#editverticalgrid) | H3 | user-facing | grid |
| [`editViolinPlot`](./actions/statistics.md#editviolinplot) | H1, H3 | user-facing | statistics |
| [`editWindowData`](./actions/charts-data.md#editwindowdata) | H2 | user-facing | core |
| [`editXAxis`](./actions/guides.md#editxaxis) | H3 | user-facing | axes |
| [`editXAxisLabels`](./actions/guides.md#editxaxislabels) | H3 | user-facing | axes |
| [`editXAxisLine`](./actions/guides.md#editxaxisline) | H3 | user-facing | axes |
| [`editXAxisTicks`](./actions/guides.md#editxaxisticks) | H3 | user-facing | axes |
| [`editXAxisTicksAndLabels`](./actions/guides.md#editxaxisticksandlabels) | H3 | user-facing | axes |
| [`editXAxisTitle`](./actions/guides.md#editxaxistitle) | H3 | user-facing | axes |
| [`editXOffsetScale`](./actions/charts-data.md#editxoffsetscale) | H2 | user-facing | core |
| [`editXScale`](./actions/charts-data.md#editxscale) | H2 | user-facing | core |
| [`editYAxis`](./actions/guides.md#edityaxis) | H3 | user-facing | axes |
| [`editYAxisLabels`](./actions/guides.md#edityaxislabels) | H3 | user-facing | axes |
| [`editYAxisLine`](./actions/guides.md#edityaxisline) | H3 | user-facing | axes |
| [`editYAxisTicks`](./actions/guides.md#edityaxisticks) | H3 | user-facing | axes |
| [`editYAxisTicksAndLabels`](./actions/guides.md#edityaxisticksandlabels) | H3 | user-facing | axes |
| [`editYAxisTitle`](./actions/guides.md#edityaxistitle) | H3 | user-facing | axes |
| [`editYOffsetScale`](./actions/charts-data.md#edityoffsetscale) | H2 | user-facing | core |
| [`editYScale`](./actions/charts-data.md#edityscale) | H2 | user-facing | core |
| [`encodeAngle`](./actions/encodings.md#encodeangle) | H2 | user-facing | encodings |
| [`encodeBarWidth`](./actions/encodings.md#encodebarwidth) | H2 | user-facing | encodings |
| [`encodeChannels`](./actions/advanced.md#encodechannels) | H2 | advanced | encodings |
| [`encodeColor`](./actions/encodings.md#encodecolor) | H2 | user-facing | encodings |
| [`encodeDensity`](./actions/encodings.md#encodedensity) | H2 | user-facing | encodings |
| [`encodeGroup`](./actions/encodings.md#encodegroup) | H2 | user-facing | encodings |
| [`encodeHistogram`](./actions/encodings.md#encodehistogram) | H2 | user-facing | encodings |
| [`encodeHorizon`](./actions/encodings.md#encodehorizon) | H2 | user-facing | encodings |
| [`encodeOpacity`](./actions/encodings.md#encodeopacity) | H2 | user-facing | encodings |
| [`encodeParallelCoordinates`](./actions/encodings.md#encodeparallelcoordinates) | H2 | user-facing | encodings |
| [`encodePathOrder`](./actions/encodings.md#encodepathorder) | H2 | user-facing | encodings |
| [`encodePointRadius`](./actions/encodings.md#encodepointradius) | H2 | user-facing | encodings |
| [`encodeR`](./actions/encodings.md#encoder) | H2 | user-facing | encodings |
| [`encodeRadius`](./actions/encodings.md#encoderadius) | H2 | user-facing | encodings |
| [`encodeShape`](./actions/encodings.md#encodeshape) | H2 | user-facing | encodings |
| [`encodeSize`](./actions/encodings.md#encodesize) | H2 | user-facing | encodings |
| [`encodeStroke`](./actions/encodings.md#encodestroke) | H2 | user-facing | encodings |
| [`encodeStrokeDash`](./actions/encodings.md#encodestrokedash) | H2 | user-facing | encodings |
| [`encodeStrokeWidth`](./actions/encodings.md#encodestrokewidth) | H2 | user-facing | encodings |
| [`encodeText`](./actions/encodings.md#encodetext) | H2 | user-facing | encodings |
| [`encodeTheta`](./actions/encodings.md#encodetheta) | H2 | user-facing | encodings |
| [`encodeX`](./actions/encodings.md#encodex) | H2 | user-facing | encodings |
| [`encodeX2`](./actions/encodings.md#encodex2) | H2 | user-facing | encodings |
| [`encodeXOffset`](./actions/encodings.md#encodexoffset) | H2 | user-facing | encodings |
| [`encodeXRange`](./actions/encodings.md#encodexrange) | H2 | user-facing | encodings |
| [`encodeY`](./actions/encodings.md#encodey) | H2 | user-facing | encodings |
| [`encodeY2`](./actions/encodings.md#encodey2) | H2 | user-facing | encodings |
| [`encodeYOffset`](./actions/encodings.md#encodeyoffset) | H2 | user-facing | encodings |
| [`encodeYRange`](./actions/encodings.md#encodeyrange) | H2 | user-facing | encodings |
| [`facet`](./actions/charts-data.md#facet) | H0 | user-facing | composition |
| [`facetGrid`](./actions/charts-data.md#facetgrid) | H0 | user-facing | composition |
| [`filterData`](./actions/charts-data.md#filterdata) | H2 | user-facing | core |
| [`filterMarks`](./actions/charts-data.md#filtermarks) | H3 | user-facing | mark-selection |
| [`fitCanvas`](./actions/charts-data.md#fitcanvas) | H3 | user-facing | core |
| [`highlightMarks`](./actions/charts-data.md#highlightmarks) | H3 | user-facing | mark-selection |
| [`insertCompositionChild`](./actions/charts-data.md#insertcompositionchild) | H3 | user-facing | composition |
| [`jitterPoints`](./actions/marks.md#jitterpoints) | H3 | user-facing | marks |
| [`layoutLabels`](./actions/marks.md#layoutlabels) | H3 | user-facing | marks |
| [`layoutSeries`](./actions/encodings.md#layoutseries) | H2 | user-facing | encodings |
| [`orderCategories`](./actions/encodings.md#ordercategories) | H2 | user-facing | encodings |
| [`packPoints`](./actions/marks.md#packpoints) | H3 | user-facing | marks |
| [`removeCategoryOrder`](./actions/encodings.md#removecategoryorder) | H2, H3 | user-facing | encodings |
| [`removeCompositionChild`](./actions/charts-data.md#removecompositionchild) | H3 | user-facing | composition |
| [`removeCoordinate`](./actions/charts-data.md#removecoordinate) | H2 | user-facing | core |
| [`removeData`](./actions/charts-data.md#removedata) | H2 | user-facing | core |
| [`removeEncoding`](./actions/encodings.md#removeencoding) | H2, H3 | user-facing | encodings |
| [`removeGrid`](./actions/guides.md#removegrid) | H3 | user-facing | grid |
| [`removeJitter`](./actions/marks.md#removejitter) | H3 | user-facing | marks |
| [`removeLabelLayout`](./actions/marks.md#removelabellayout) | H3 | user-facing | marks |
| [`removeLegend`](./actions/guides.md#removelegend) | H3 | user-facing | legend_and_title |
| [`removeMark`](./actions/marks.md#removemark) | H3 | user-facing | marks |
| [`removeMarkFilter`](./actions/charts-data.md#removemarkfilter) | H3 | user-facing | mark-selection |
| [`removeMarkHighlight`](./actions/charts-data.md#removemarkhighlight) | H3 | user-facing | mark-selection |
| [`removeMarkLabels`](./actions/marks.md#removemarklabels) | H3 | user-facing | marks |
| [`removeMarkSelection`](./actions/advanced.md#removemarkselection) | H3 | advanced | mark-selection |
| [`removeParallelAxes`](./actions/guides.md#removeparallelaxes) | H3 | user-facing | axes |
| [`removeParallelAxis`](./actions/guides.md#removeparallelaxis) | H3 | user-facing | axes |
| [`removePathOrder`](./actions/encodings.md#removepathorder) | H2, H3 | user-facing | encodings |
| [`removePointPacking`](./actions/marks.md#removepointpacking) | H3 | user-facing | marks |
| [`removePointRadius`](./actions/encodings.md#removepointradius) | H2, H3 | user-facing | encodings |
| [`removeRadialAxis`](./actions/guides.md#removeradialaxis) | H3 | user-facing | axes |
| [`removeScale`](./actions/charts-data.md#removescale) | H2 | user-facing | core |
| [`removeTextMetrics`](./actions/charts-data.md#removetextmetrics) | H3 | user-facing | core |
| [`removeTheme`](./actions/charts-data.md#removetheme) | H3 | user-facing | core |
| [`removeThetaAxis`](./actions/guides.md#removethetaaxis) | H3 | user-facing | axes |
| [`removeTitle`](./actions/guides.md#removetitle) | H3 | user-facing | legend_and_title |
| [`removeXAxis`](./actions/guides.md#removexaxis) | H3 | user-facing | axes |
| [`removeYAxis`](./actions/guides.md#removeyaxis) | H3 | user-facing | axes |
| [`reorderCompositionChildren`](./actions/charts-data.md#reordercompositionchildren) | H3 | user-facing | composition |
| [`repeatCharts`](./actions/charts-data.md#repeatcharts) | H0 | user-facing | composition |
| [`replaceCompositionChild`](./actions/charts-data.md#replacecompositionchild) | H3 | user-facing | composition |
| [`reviseData`](./actions/charts-data.md#revisedata) | H3 | user-facing | core |
| [`selectMarks`](./actions/advanced.md#selectmarks) | H3 | advanced | mark-selection |
