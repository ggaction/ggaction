---
layout: default
title: Choose a Chart
---

# Choose a Chart

Start with the chart that expresses the data's meaning, then edit its parts through
lower-level actions. Every complete-chart action in the current declared catalog
appears below, including composition and deferred-construction entries.

{% include chart-example.html id="hierarchical-authoring" lead=true %}

Prepare a Canvas and explicit or unambiguous materialized data before a unit chart
facade. Repetition consumes a complete program. Box and Gradient constructors
can defer roles, so merely calling them does not necessarily produce a complete chart.

<!-- chart-picker:start -->

## Relationships and trends

| Task / input | Chart action | Package entry | Direct editor |
| --- | --- | --- | --- |
| One row per observation; x and y fields | [`createScatterPlot`](../reference/actions/charts-data.md#createscatterplot) | default, basic | Refine the owned marks, encodings, or guides |
| Ordered positions and measures; explicit aggregation when needed | [`createLinePlot`](../reference/actions/charts-data.md#createlineplot) | default, basic | Refine the owned marks, encodings, or guides |
| Ordered values and a baseline, or paired interval bounds | [`createAreaPlot`](../reference/actions/charts-data.md#createareaplot) | default | Refine the owned marks, encodings, or guides |
| Finite quantitative observations for a fit and optional uncertainty | [`createRegressionPlot`](../reference/actions/charts-data.md#createregressionplot) | default | Refine the owned marks, encodings, or guides |
| Angular and radial fields per observation | [`createPolarScatterPlot`](../reference/actions/charts-data.md#createpolarscatterplot) | default | Refine the owned marks, encodings, or guides |
| Ordered angular/radial observations per path | [`createPolarLinePlot`](../reference/actions/charts-data.md#createpolarlineplot) | default | Refine the owned marks, encodings, or guides |
| Long category/value rows or explicitly selected wide fields | [`createRadarPlot`](../reference/actions/charts-data.md#createradarplot) | default | [`editRadarPlot`](../reference/actions/charts-data.md#editradarplot) |
| Rows with two or more quantitative or ordinal dimensions | [`createParallelCoordinates`](../reference/actions/charts-data.md#createparallelcoordinates) | default | Refine the owned marks, encodings, or guides |
| Positioned text from x/y fields and row content | [`createTextPlot`](../reference/actions/charts-data.md#createtextplot) | default | Refine the owned marks, encodings, or guides |

## Comparisons and intervals

| Task / input | Chart action | Package entry | Direct editor |
| --- | --- | --- | --- |
| Categorical/measure roles, explicit summary, or ranged endpoints | [`createBarPlot`](../reference/actions/charts-data.md#createbarplot) | default, basic | Refine the owned marks, encodings, or guides |
| Category and measure per raw row, or an explicit summary | [`createDotPlot`](../reference/actions/charts-data.md#createdotplot) | default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) |
| Category, measure, and a finite baseline | [`createLollipopPlot`](../reference/actions/charts-data.md#createlollipopplot) | default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) |
| Category plus named start and end measurements | [`createDumbbellPlot`](../reference/actions/charts-data.md#createdumbbellplot) | default | [`editEndpointPlot`](../reference/actions/charts-data.md#editendpointplot) |
| Center and interval measurements or a statistical interval definition | [`createIntervalPlot`](../reference/actions/charts-data.md#createintervalplot) | default | Refine the owned marks, encodings, or guides |

## Distributions

| Task / input | Chart action | Package entry | Direct editor |
| --- | --- | --- | --- |
| Quantitative observations; one bin policy; optional weights | [`createHistogram`](../reference/actions/charts-data.md#createhistogram) | default, basic | Refine the owned marks, encodings, or guides |
| Finite numeric observations and KDE decisions | [`createDensityPlot`](../reference/actions/statistics.md#createdensityplot) | default | [`editDensity`](../reference/actions/encodings.md#editdensity) · [`editAreaMark`](../reference/actions/marks.md#editareamark) |
| Numeric support observations; optional group and weight field | [`createECDFPlot`](../reference/actions/charts-data.md#createecdfplot) | default | [`editECDFPlot`](../reference/actions/charts-data.md#editecdfplot) |
| One categorical and one quantitative role; constructor may defer roles | [`createBoxPlot`](../reference/actions/statistics.md#createboxplot) | default | [`editBoxPlot`](../reference/actions/statistics.md#editboxplot) |
| Category and quantitative profile roles; constructor may defer roles | [`createGradientPlot`](../reference/actions/statistics.md#creategradientplot) | default | [`editGradientPlot`](../reference/actions/statistics.md#editgradientplot) |
| Category and quantitative measure; optional two-value split | [`createViolinPlot`](../reference/actions/statistics.md#createviolinplot) | default | [`editViolinPlot`](../reference/actions/statistics.md#editviolinplot) |
| One quantitative or temporal measure | [`createRugPlot`](../reference/actions/charts-data.md#createrugplot) | default | Refine the owned marks, encodings, or guides |
| One measure, optionally with a categorical slot | [`createStripPlot`](../reference/actions/charts-data.md#createstripplot) | default | Refine the owned marks, encodings, or guides |
| Category and measure for glyph-aware deterministic packing | [`createBeeswarmPlot`](../reference/actions/charts-data.md#createbeeswarmplot) | default | Refine the owned marks, encodings, or guides |
| Shared category/measure rows for density, summary, and observations | [`createRaincloudPlot`](../reference/actions/charts-data.md#createraincloudplot) | default | [`editRaincloudPlot`](../reference/actions/charts-data.md#editraincloudplot) |

## Parts, radial values, and dense samples

| Task / input | Chart action | Package entry | Direct editor |
| --- | --- | --- | --- |
| Category counts or category sums for proportional sector angles | [`createPiePlot`](../reference/actions/charts-data.md#createpieplot) | default | Refine the owned marks, encodings, or guides |
| Category counts or sums represented by sector area | [`createRosePlot`](../reference/actions/charts-data.md#createroseplot) | default | Refine the owned marks, encodings, or guides |
| Category counts or sums represented by radial length | [`createRadialBarPlot`](../reference/actions/charts-data.md#createradialbarplot) | default | Refine the owned marks, encodings, or guides |
| Pre-gridded cells or two raw quantitative fields for rectangular bins | [`createHeatmap`](../reference/actions/charts-data.md#createheatmap) | default, basic | Refine the owned marks, encodings, or guides |
| Ordered quantitative/temporal x and foldable quantitative y | [`createHorizonPlot`](../reference/actions/statistics.md#createhorizonplot) | default | [`editHorizon`](../reference/actions/encodings.md#edithorizon) · [`editAreaMark`](../reference/actions/marks.md#editareamark) |

## Multiple views

| Task / input | Chart action | Package entry | Direct editor |
| --- | --- | --- | --- |
| One complete chart and an eligible shared ancestor field | [`facet`](../reference/actions/charts-data.md#facet) | default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |
| One complete chart plus row and column fields | [`facetGrid`](../reference/actions/charts-data.md#facetgrid) | default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |
| One eligible mark role and an ordered field list | [`repeatCharts`](../reference/actions/charts-data.md#repeatcharts) | default | [`editFacetSource`](../reference/actions/charts-data.md#editfacetsource) · [`editFacetHeaders`](../reference/actions/charts-data.md#editfacetheaders) · [`editFacetScales`](../reference/actions/charts-data.md#editfacetscales) · [`editFacetGuides`](../reference/actions/charts-data.md#editfacetguides) · [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) |
| One complete chart plus a new independent chart; explicit shared scales and aligned plot frames | [`createAdjacentPlot`](../reference/actions/charts-data.md#createadjacentplot) | default | [`editCompositionLayout`](../reference/actions/charts-data.md#editcompositionlayout) · [`editCompositionScales`](../reference/actions/charts-data.md#editcompositionscales) · [`replaceCompositionChild`](../reference/actions/charts-data.md#replacecompositionchild) |
| Independent native plot on compatible existing coordinates and measurement units | [`createLayerPlot`](../reference/actions/charts-data.md#createlayerplot) | default | [`encodeColor`](../reference/actions/encodings.md#encodecolor) · [`encodeOpacity`](../reference/actions/encodings.md#encodeopacity) · [`removeMark`](../reference/actions/marks.md#removemark) |

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

## Three independent choices

**H0–H4 catalog role tags** group related authoring tasks; the actual hierarchy
comes from the smaller actions an action composes. **API layer** describes
user-facing, advanced, or primitive exposure. **Package entry** describes availability
from the full or basic import. A higher-level action is not automatically part of the
smaller package, and a low-level domain action is not automatically an extension primitive.

## Related

[Authoring conventions](../concepts/authoring-conventions.md) · [Data grain](./data/policies.md) ·
[All chart examples](../gallery/all.md)
