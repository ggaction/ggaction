---
layout: default
title: Choose a Chart
---

# Choose a Chart

Start with the chart that expresses the data's meaning, then edit its parts through
lower-level actions. Every complete-chart action in the current declared catalog
appears below, including composition and deferred-construction entries.

{% include chart-example.html id="hierarchical-authoring" lead=true %}

## Three independent choices

**H0–H4 catalog role tags** group related authoring tasks; the actual hierarchy
comes from the smaller actions an action composes. **API layer** describes
user-facing, advanced, or primitive exposure. **Package entry** describes availability
from the full or basic import. A higher-level action is not automatically part of the
smaller package, and a low-level domain action is not automatically an extension primitive.

Prepare a Canvas and explicit or unambiguous materialized data before a unit chart
facade. Repetition consumes a complete program. Box and Gradient constructors
can defer roles, so merely calling them does not necessarily produce a complete chart.

<!-- chart-picker:start -->

## Relationships and trends

| Task / input | Chart action | Role tags · API layer · entry | Direct editor | Lower-level actions |
| --- | --- | --- | --- | --- |
| One row per observation; x and y fields | [`createScatterPlot`](../reference/actions/charts-data.md#createscatterplot) | H0 · user-facing · default, basic | Refine the owned marks, encodings, or guides | [`createPointMark`](../reference/actions/marks.md#createpointmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`encodeShape`](../reference/actions/encodings.md#encodeshape) · [`createGuides`](../reference/actions/guides.md#createguides) · [`encodeSize`](../reference/actions/encodings.md#encodesize) · [`encodePointRadius`](../reference/actions/encodings.md#encodepointradius) |
| Ordered positions and measures; explicit aggregation when needed | [`createLinePlot`](../reference/actions/charts-data.md#createlineplot) | H0 · user-facing · default, basic | Refine the owned marks, encodings, or guides | [`createLineMark`](../reference/actions/marks.md#createlinemark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeGroup`](../reference/actions/encodings.md#encodegroup) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`encodeStrokeDash`](../reference/actions/encodings.md#encodestrokedash) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Ordered values and a baseline, or paired interval bounds | [`createAreaPlot`](../reference/actions/charts-data.md#createareaplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createAreaMark`](../reference/actions/marks.md#createareamark) · [`encodeGroup`](../reference/actions/encodings.md#encodegroup) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeYRange`](../reference/actions/encodings.md#encodeyrange) · [`layoutSeries`](../reference/actions/encodings.md#layoutseries) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Finite quantitative observations for a fit and optional uncertainty | [`createRegressionPlot`](../reference/actions/charts-data.md#createregressionplot) | H0, H1 · user-facing · default | Refine the owned marks, encodings, or guides | [`createScatterPlot`](../reference/actions/charts-data.md#createscatterplot) · [`createRegression`](../reference/actions/statistics.md#createregression) |
| Angular and radial fields per observation | [`createPolarScatterPlot`](../reference/actions/charts-data.md#createpolarscatterplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createPointMark`](../reference/actions/marks.md#createpointmark) · [`encodeTheta`](../reference/actions/encodings.md#encodetheta) · [`encodeR`](../reference/actions/encodings.md#encoder) · [`encodePointRadius`](../reference/actions/encodings.md#encodepointradius) |
| Ordered angular/radial observations per path | [`createPolarLinePlot`](../reference/actions/charts-data.md#createpolarlineplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createLineMark`](../reference/actions/marks.md#createlinemark) · [`encodeTheta`](../reference/actions/encodings.md#encodetheta) · [`encodeR`](../reference/actions/encodings.md#encoder) |
| Long category/value rows or explicitly selected wide fields | [`createRadarPlot`](../reference/actions/charts-data.md#createradarplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createPolarLinePlot`](../reference/actions/charts-data.md#createpolarlineplot) |
| Rows with two or more quantitative or ordinal dimensions | [`createParallelCoordinates`](../reference/actions/charts-data.md#createparallelcoordinates) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createCoordinate`](../reference/actions/charts-data.md#createcoordinate) · [`createLineMark`](../reference/actions/marks.md#createlinemark) · [`encodeParallelCoordinates`](../reference/actions/encodings.md#encodeparallelcoordinates) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`encodeStrokeDash`](../reference/actions/encodings.md#encodestrokedash) · [`createGuides`](../reference/actions/guides.md#createguides) |

## Comparisons and intervals

| Task / input | Chart action | Role tags · API layer · entry | Direct editor | Lower-level actions |
| --- | --- | --- | --- | --- |
| Categorical/measure roles, explicit summary, or ranged endpoints | [`createBarPlot`](../reference/actions/charts-data.md#createbarplot) | H0 · user-facing · default, basic | Refine the owned marks, encodings, or guides | [`createBarMark`](../reference/actions/marks.md#createbarmark) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`encodeBarWidth`](../reference/actions/encodings.md#encodebarwidth) · [`createGuides`](../reference/actions/guides.md#createguides) · [`encodeYRange`](../reference/actions/encodings.md#encodeyrange) · [`encodeXRange`](../reference/actions/encodings.md#encodexrange) |
| Category and measure per raw row, or an explicit summary | [`createDotPlot`](../reference/actions/charts-data.md#createdotplot) | H0, H1 · user-facing · default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) | [`createSummaryData`](../reference/actions/statistics.md#createsummarydata) · [`createPointMark`](../reference/actions/marks.md#createpointmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) |
| Category, measure, and a finite baseline | [`createLollipopPlot`](../reference/actions/charts-data.md#createlollipopplot) | H0, H1 · user-facing · default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) | [`createSummaryData`](../reference/actions/statistics.md#createsummarydata) · [`createRuleMark`](../reference/actions/marks.md#createrulemark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeX2`](../reference/actions/encodings.md#encodex2) · [`createPointMark`](../reference/actions/marks.md#createpointmark) |
| Category plus named start and end measurements | [`createDumbbellPlot`](../reference/actions/charts-data.md#createdumbbellplot) | H0, H1 · user-facing · default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) | [`createSummaryData`](../reference/actions/statistics.md#createsummarydata) · [`createRuleMark`](../reference/actions/marks.md#createrulemark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeX2`](../reference/actions/encodings.md#encodex2) · [`createPointMark`](../reference/actions/marks.md#createpointmark) |
| Center and interval measurements or a statistical interval definition | [`createIntervalPlot`](../reference/actions/charts-data.md#createintervalplot) | H0, H1 · user-facing · default | Refine the owned marks, encodings, or guides | [`createErrorBar`](../reference/actions/statistics.md#createerrorbar) · [`createPointMark`](../reference/actions/marks.md#createpointmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) |

## Distributions

| Task / input | Chart action | Role tags · API layer · entry | Direct editor | Lower-level actions |
| --- | --- | --- | --- | --- |
| Quantitative observations; one bin policy; optional weights | [`createHistogram`](../reference/actions/charts-data.md#createhistogram) | H0, H1 · user-facing · default, basic | Refine the owned marks, encodings, or guides | [`createBarMark`](../reference/actions/marks.md#createbarmark) · [`encodeHistogram`](../reference/actions/encodings.md#encodehistogram) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Finite numeric observations and KDE decisions | [`createDensityPlot`](../reference/actions/statistics.md#createdensityplot) | H0, H1 · user-facing · default | [`editDensity`](../reference/actions/encodings.md#editdensity) · [`editAreaMark`](../reference/actions/marks.md#editareamark) | [`createAreaMark`](../reference/actions/marks.md#createareamark) · [`encodeDensity`](../reference/actions/encodings.md#encodedensity) · [`createGuides`](../reference/actions/guides.md#createguides) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) |
| Numeric support observations; optional group and weight field | [`createECDFPlot`](../reference/actions/charts-data.md#createecdfplot) | H0, H1 · user-facing · default | [`editECDFPlot`](../reference/actions/charts-data.md#editecdfplot) | [`createECDFData`](../reference/actions/statistics.md#createecdfdata) · [`createLineMark`](../reference/actions/marks.md#createlinemark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeGroup`](../reference/actions/encodings.md#encodegroup) |
| One categorical and one quantitative role; constructor may defer roles | [`createBoxPlot`](../reference/actions/statistics.md#createboxplot) | H0, H1 · user-facing · default | [`editBoxPlot`](../reference/actions/statistics.md#editboxplot) | [`createBarMark`](../reference/actions/marks.md#createbarmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) |
| Category and quantitative profile roles; constructor may defer roles | [`createGradientPlot`](../reference/actions/statistics.md#creategradientplot) | H0, H1 · user-facing · default | [`editGradientPlot`](../reference/actions/statistics.md#editgradientplot) | [`createRectMark`](../reference/actions/marks.md#createrectmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) |
| Category and quantitative measure; optional two-value split | [`createViolinPlot`](../reference/actions/statistics.md#createviolinplot) | H0, H1 · user-facing · default | [`editViolinPlot`](../reference/actions/statistics.md#editviolinplot) | [`createAreaMark`](../reference/actions/marks.md#createareamark) · [`encodeDensity`](../reference/actions/encodings.md#encodedensity) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| One quantitative or temporal measure | [`createRugPlot`](../reference/actions/charts-data.md#createrugplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createTickMark`](../reference/actions/marks.md#createtickmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeAngle`](../reference/actions/encodings.md#encodeangle) |
| One measure, optionally with a categorical slot | [`createStripPlot`](../reference/actions/charts-data.md#createstripplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createPointMark`](../reference/actions/marks.md#createpointmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodePointRadius`](../reference/actions/encodings.md#encodepointradius) |
| Category and measure for glyph-aware deterministic packing | [`createBeeswarmPlot`](../reference/actions/charts-data.md#createbeeswarmplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createStripPlot`](../reference/actions/charts-data.md#createstripplot) · [`packPoints`](../reference/actions/marks.md#packpoints) |
| Shared category/measure rows for density, summary, and observations | [`createRaincloudPlot`](../reference/actions/charts-data.md#createraincloudplot) | H0, H1 · user-facing · default | [`editRaincloudPlot`](../reference/actions/charts-data.md#editraincloudplot) | [`createViolinPlot`](../reference/actions/statistics.md#createviolinplot) · [`createBoxPlot`](../reference/actions/statistics.md#createboxplot) · [`createBeeswarmPlot`](../reference/actions/charts-data.md#createbeeswarmplot) |

## Parts, radial values, and dense samples

| Task / input | Chart action | Role tags · API layer · entry | Direct editor | Lower-level actions |
| --- | --- | --- | --- | --- |
| Category counts or category sums for proportional sector angles | [`createPiePlot`](../reference/actions/charts-data.md#createpieplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createArcMark`](../reference/actions/marks.md#createarcmark) · [`encodeTheta`](../reference/actions/encodings.md#encodetheta) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Category counts or sums represented by sector area | [`createRosePlot`](../reference/actions/charts-data.md#createroseplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createArcMark`](../reference/actions/marks.md#createarcmark) · [`encodeTheta`](../reference/actions/encodings.md#encodetheta) · [`encodeR`](../reference/actions/encodings.md#encoder) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Category counts or sums represented by radial length | [`createRadialBarPlot`](../reference/actions/charts-data.md#createradialbarplot) | H0 · user-facing · default | Refine the owned marks, encodings, or guides | [`createArcMark`](../reference/actions/marks.md#createarcmark) · [`encodeTheta`](../reference/actions/encodings.md#encodetheta) · [`encodeR`](../reference/actions/encodings.md#encoder) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) |
| Pre-gridded cells or two raw quantitative fields for rectangular bins | [`createHeatmap`](../reference/actions/charts-data.md#createheatmap) | H0 · user-facing · default, basic | Refine the owned marks, encodings, or guides | [`createRectMark`](../reference/actions/marks.md#createrectmark) · [`encodeX`](../reference/actions/encodings.md#encodex) · [`encodeY`](../reference/actions/encodings.md#encodey) · [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`createGuides`](../reference/actions/guides.md#createguides) · [`createBin2DData`](../reference/actions/charts-data.md#createbin2ddata) · [`encodeX2`](../reference/actions/encodings.md#encodex2) · [`encodeY2`](../reference/actions/encodings.md#encodey2) |
| Ordered quantitative/temporal x and foldable quantitative y | [`createHorizonPlot`](../reference/actions/statistics.md#createhorizonplot) | H0, H1 · user-facing · default | [`editHorizon`](../reference/actions/encodings.md#edithorizon) · [`editAreaMark`](../reference/actions/marks.md#editareamark) | [`createAreaMark`](../reference/actions/marks.md#createareamark) · [`encodeHorizon`](../reference/actions/encodings.md#encodehorizon) · [`createGuides`](../reference/actions/guides.md#createguides) |

## Repeated chart structure

| Task / input | Chart action | Role tags · API layer · entry | Direct editor | Lower-level actions |
| --- | --- | --- | --- | --- |
| One complete chart and an eligible shared ancestor field | [`facet`](../reference/actions/charts-data.md#facet) | H0 · user-facing · default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |  |
| One complete chart plus row and column fields | [`facetGrid`](../reference/actions/charts-data.md#facetgrid) | H0 · user-facing · default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |  |
| One eligible mark role and an ordered field list | [`repeatCharts`](../reference/actions/charts-data.md#repeatcharts) | H0 · user-facing · default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |  |

<!-- chart-picker:end -->

## Compose or refine

`hconcat` and `vconcat` are exported functions for arranging independent complete
programs; they are not methods in the direct action catalog. Facet and repeat methods
retain a source recipe. Use the [composition overview](./composition.md) to choose.

The [five basic Cartesian facades](./basic-charts.md) are a compact starting subset.
For intervals added to existing layers, use [Error Bar](./error-bars.md) or
[Error Band](./error-bands.md), which add interval layers to a chart.
See [hierarchical authoring](../tutorials/hierarchical-authoring.md)
for one chart authored and edited at several levels.

The table's H0–H4 values are [catalog role tags](../tutorials/hierarchical-authoring.md#catalog-role-tags),
separate from the relative action hierarchy and from package exposure.

## Related

[Authoring conventions](../concepts/authoring-conventions.md) · [Data grain](./data/policies.md) ·
[All chart examples](../gallery/all.md)
