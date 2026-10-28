# Examples

This index is generated from the canonical public chart catalog. Serve the
repository root over HTTP, then open any linked directory:

```bash
python3 -m http.server 8000
```

## Start here

- [Getting Started](./getting-started/) is the small inline-data browser example
  used by the Getting Started guide.
- [Quarto and Observable JS](./quarto-ojs/README.md) embeds the exact public package in a
  responsive Quarto document and exposes its retained action trace.
- [Extension TypeScript](./extension-typescript/) demonstrates strict custom
  action authoring against the installed package.

## Maintained public chart programs

### [Program composition](./program-composition/)

Compare distinct child panels, edit their layout, and replace one stable slot.

Representative actions: `hconcat`, `editCompositionLayout`, `replaceCompositionChild`. [Documentation](https://ggaction.github.io/ggaction/recipes/composition/).

### [Faceted scatterplot](./cars-origin-scatterplot-facet/)

Repeat a complete point or bar chart by field value.

Representative actions: `facet`, `editFacetHeaders`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/recipes/facet/).

### [Row and column facet grid](./facet-grid/)

Cross two fields into an observed or complete grid with stable cell coordinates.

Representative actions: `facetGrid`, `editFacetSource`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/api/composition/#build-a-row-and-column-facet-grid).

### [Repeated metric charts](./repeat-charts/)

Repeat one positional encoding across fields with explicit scale and guide policies.

Representative actions: `repeatCharts`, `editFacetSource`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/api/composition/#repeat-a-positional-encoding-across-fields).

### [Scatterplot](./cars-scatterplot/)

Compare two quantitative fields and encode a category with color.

Representative actions: `createScatterPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/scatterplot/).

### [Fitted long axis labels](./fitted-long-labels/)

Fit chart margins after laying out long Cartesian axis labels.

Representative actions: `createXAxis`. [Documentation](https://ggaction.github.io/ggaction/api/canvas/#fitcanvasoptions).

### [Multi-legend layout](./cars-multi-legend-layout/)

Place categorical and sampled opacity legends on one aligned horizontal reading line.

Representative actions: `createLegend`, `editLegend`. [Documentation](https://ggaction.github.io/ggaction/api/legends/continuous/#continuous-color-stroke-and-opacity).

### [Line chart](./cars-line-chart/)

Aggregate values over time and split the result into series.

Representative actions: `createLinePlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/line-chart/).

### [Temporal bar and line](./cars-temporal-bar-line/)

Layer compatible marks without repeating the line position encodings.

Representative actions: `createBarMark`, `encodeX`, `encodeY`, `createLineMark`. [Documentation](https://ggaction.github.io/ggaction/api/marks/line-area/#line-marks).

### [Development trajectories](./gapminder-development-trajectories/)

Connect repeated and non-monotonic positions by a separate quantitative order field.

Representative actions: `createLineMark`, `encodePathOrder`, `removePathOrder`. [Documentation](https://ggaction.github.io/ggaction/recipes/path-ordering/).

### [Annotated scatterplot](./annotated-imdb-scatterplot/)

Attach readable data labels to final point, bar, or rule items.

Representative actions: `createTextMark`, `encodeText`, `editTextMark`. [Documentation](https://ggaction.github.io/ggaction/recipes/annotations/).

### [Heatmap](./gapminder-life-expectancy-heatmap/)

Map two discrete fields to cells and a quantitative field to color.

Representative actions: `createHeatmap`, `createTextMark`, `encodeText`. [Documentation](https://ggaction.github.io/ggaction/recipes/heatmap/).

### [Bar chart](./jobs-grouped-bar/)

Aggregate ordinal categories and arrange nominal groups side by side.

Representative actions: `createBarPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/grouped-bar/).

### [Ordered category bars](./ordered-category-bar/)

Order categorical x or y positions explicitly or from a stable aggregate summary.

Representative actions: `orderCategories`, `removeCategoryOrder`. [Documentation](https://ggaction.github.io/ggaction/api/position/category-ordering/).

### [Horizontal grouped bar](./jobs-horizontal-grouped-bar/)

Compare grouped aggregate values with a horizontal measure axis.

Representative actions: `createBarMark`, `encodeX`, `encodeY`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/api/position/offsets/).

### [Histogram](./cars-histogram/)

Bin a quantitative field and count category partitions.

Representative actions: `createHistogram`. [Documentation](https://ggaction.github.io/ggaction/tutorials/histogram/).

### [Density area](./cars-density-area/)

Estimate grouped distributions and draw baseline-closed areas.

Representative actions: `createAreaMark`, `encodeDensity`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/tutorials/density-area/).

### [Center-stacked area](./centered-area-stream/)

Preserve series thickness while centering each time partition around zero.

Representative actions: `createAreaMark`, `encodeX`, `encodeY`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/api/series/color/#center-stacked-areas).

### [Regression scatterplot](./cars-regression-scatterplot/)

Layer observations, grouped fits, and confidence bands.

Representative actions: `createPointMark`, `createRegression`. [Documentation](https://ggaction.github.io/ggaction/tutorials/regression-scatterplot/).

### [Horizon chart](./gapminder-horizon/)

Compress a long time series by folding values above and below a baseline.

Representative actions: `createAreaMark`, `encodeHorizon`, `editHorizon`. [Documentation](https://ggaction.github.io/ggaction/tutorials/horizon/).

### [Error bar](./cars-error-bar/)

Keep observations visible while summarizing group uncertainty.

Representative actions: `createErrorBar`. [Documentation](https://ggaction.github.io/ggaction/tutorials/error-bar/).

### [Error band](./gapminder-error-band/)

Show interval ribbons with explicit lower and upper boundaries.

Representative actions: `createErrorBand`. [Documentation](https://ggaction.github.io/ggaction/tutorials/error-band/).

### [Box plot](./cars-box-plot/)

Compose quartiles, whiskers, medians, and outlier points.

Representative actions: `createBoxPlot`. [Documentation](https://ggaction.github.io/ggaction/recipes/box-plot/).

### [Gradient plot](./cars-gradient-plot/)

Compare complete distribution shapes across categories in a compact strip.

Representative actions: `createGradientPlot`, `editGradientPlot`. [Documentation](https://ggaction.github.io/ggaction/recipes/gradient-plot/).

### [Violin plot](./cars-acceleration-violins/)

Compare complete distribution shapes across categories with symmetric or split density areas.

Representative actions: `createViolinPlot`, `editDensity`. [Documentation](https://ggaction.github.io/ggaction/api/violin-plots/).

### [Parallel coordinates](./cars-parallel-coordinates/)

Compare multivariate row profiles while retaining row-level identity.

Representative actions: `createParallelCoordinates`, `encodeParallelCoordinates`. [Documentation](https://ggaction.github.io/ggaction/recipes/parallel-coordinates/).

### [Polar points](./polar-points/)

Map quantitative fields to clockwise angle and radial distance.

Representative actions: `encodeTheta`, `encodeR`, `encodePointRadius`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-points/).

### [Polar guides](./polar-guides/)

Read angle and radial mappings with aligned axes, labels, and grids.

Representative actions: `createGuides`, `editRadialAxis`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-points/#add-polar-guides).

### [Polar lines](./gapminder-polar-trends/)

Connect ordered angle and radial values as grouped open paths.

Representative actions: `createLineMark`, `encodeTheta`, `encodeR`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-lines/).

### [Radar chart](./jobs-radar-chart/)

Close nominal-angle series without duplicating the first observation.

Representative actions: `createLineMark`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-lines/#closed-radar-paths).

### [Donut chart](./cars-origin-donut/)

Build proportional sectors with an inferred categorical color legend.

Representative actions: `createArcMark`, `encodeTheta`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-arcs/).

### [Weighted donut chart](./gapminder-population-donut/)

Partition a full revolution by category-level sums without expanding rows.

Representative actions: `createArcMark`, `encodeTheta`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-arcs/#sum-a-field-into-weighted-sectors).

### [Rose chart](./nightingale-rose-chart/)

Compare radial magnitudes inside ordered categorical sectors.

Representative actions: `createArcMark`, `encodeTheta`, `encodeR`. [Documentation](https://ggaction.github.io/ggaction/recipes/rose-chart/).

### [Radial bars](./gapminder-radial-bars/)

Compare values as equal-width sectors around a Polar coordinate.

Representative actions: `createArcMark`, `encodeTheta`, `encodeR`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-arcs/#radial-bars).

### [Mark selection and highlighting](./mark-selection/)

Select, filter, and emphasize final point, bar, and line items.

Representative actions: `highlightMarks`. [Documentation](https://ggaction.github.io/ggaction/tutorials/mark-selection/).

### [Signed Horizon chart](./horizon-plot/)

Define explicit source roles, then revise bands, baseline, palette, and appearance.

Representative actions: `createHorizonPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/horizon/#complete-horizon-facade).

### [Density profile](./density-plot/)

Estimate one variable, then add explicit groups and color.

Representative actions: `createDensityPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/density-area/#complete-density-facade).

### [Category pie chart](./pie-plot/)

Create a complete category pie or explicitly weighted donut with one action.

Representative actions: `createPiePlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-arcs/#complete-pie-and-donut-plots).

### [Area with an explicit baseline](./area-layout/)

Define bounds and independently revise series identity, placement, and color.

Representative actions: `createAreaPlot`, `layoutSeries`, `encodeGroup`. [Documentation](https://ggaction.github.io/ggaction/tutorials/area-layout/).

### [Measured rose sectors](./radial-sectors/)

Compare category sums with proportional area or radial length.

Representative actions: `createRosePlot`, `createRadialBarPlot`, `encodeR`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-arcs/#measured-rose-and-radial-bar-plots).

### [A meaningful color midpoint](./color-midpoint/)

Set an explicit reference value for continuous color.

Representative actions: `createScatterPlot`, `encodeColor`, `editScale`. [Documentation](https://ggaction.github.io/ggaction/api/scales/continuous-color/#explicit-color-midpoint).

### [Color scale and legend transitions](./color-transitions/)

Switch between continuous color and numeric classes without stale guides.

Representative actions: `createBarPlot`, `editScale`, `createLegend`. [Documentation](https://ggaction.github.io/ggaction/api/scales/discretized-color/#changing-color-scale-families).

### [Faceted car histograms](./cars-origin-histogram-facet/)

Each origin panel shows the observed distribution with its own final bars.

Representative actions: `createBarMark`, `encodeHistogram`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/marks/#createbarmark).

### [Field-driven rule widths](./cars-weighted-rules/)

Rule widths and opacity map quantitative observations to visible stroke properties.

Representative actions: `createRuleMark`, `encodeX`, `encodeX2`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/marks/#createrulemark).

### [Raincloud distribution](./raincloud-plot/)

A half violin, summary, and raw observations share one category and measure frame.

Representative actions: `createRaincloudPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createraincloudplot).

### [Beeswarm distribution](./beeswarm-plot/)

Packed point glyphs preserve individual observations within each category slot.

Representative actions: `createBeeswarmPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createbeeswarmplot).

### [Categorical dot plot](./dot-plot/)

Each raw observation remains a dot on its categorical slot.

Representative actions: `createDotPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createdotplot).

### [Lollipop plot](./lollipop-plot/)

A stem connects each observation to the explicit zero baseline.

Representative actions: `createLollipopPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createlollipopplot).

### [Dumbbell changes](./dumbbell-plot/)

Named before and after endpoints retain their roles when values reverse.

Representative actions: `createDumbbellPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/endpoint-plots/).

### [Empirical cumulative distribution](./ecdf-plot/)

Step-after lines show cumulative probability at each observed support value.

Representative actions: `createECDFPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/ecdf/).

### [Pie legend order](./theta-legend-order/)

Reordering a categorical legend preserves the identities of the linked sectors.

Representative actions: `createPiePlot`, `editLegend`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createpieplot).

### [Explicit temporal inputs](./temporal-input/)

Quantitative measures are positioned against explicitly parsed temporal input.

Representative actions: `createScatterPlot`, `createTitle`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createscatterplot).

### [Independent series appearance](./series-identity/)

Series identity remains independent from color, width, and opacity encodings.

Representative actions: `createLinePlot`, `encodeStrokeWidth`, `encodeOpacity`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createlineplot).

### [Directional ticks and points](./directional-tick-plot/)

Directional glyphs and a rug compare point and tick encodings.

Representative actions: `encodeX`, `encodeY`, `createTickMark`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/encodings/#encodex).

### [Binned cars heatmap](./cars-binned-heatmap/)

Rectangular bins summarize the density of two quantitative car measurements.

Representative actions: `createHeatmap`, `createTitle`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createheatmap).

### [Time bucket comparison](./time-unit-data/)

Calendar buckets change temporal resolution while preserving original measurements.

Representative actions: `createTimeUnitData`, `createScatterPlot`, `createTitle`. [Documentation](https://ggaction.github.io/ggaction/api/data/time-units/).

### [Moving passenger windows](./airline-passenger-moving-windows/)

Ordered moving summaries reveal changes in monthly passenger counts.

Representative actions: `createTimeUnitData`, `createLineMark`, `encodeX`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createtimeunitdata).

### [Ranked cars](./cars-window-rank-scatterplot/)

A partitioned window rank selects observations before drawing a scatterplot.

Representative actions: `createWindowData`, `filterData`, `createScatterPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createwindowdata).

### [Mixed chart dashboard](./cross-feature-dashboard/)

Complete statistical and coordinate-specific programs form a nested dashboard.

Representative actions: `facet`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#facet).

### [Cars by origin with jitter](./point-jitter/)

Bounded deterministic offsets separate overlapping observations inside category slots.

Representative actions: `createStripPlot`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#createstripplot).

### [Dark theme scatterplot](./dark-theme-scatterplot/)

A program theme changes default canvas, guide, and mark appearance together.

Representative actions: `createPointMark`, `encodeX`, `encodeY`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/marks/#createpointmark).

### [Country labels without overlap](./gapminder-country-labels/)

Attached labels use bounded collision layout and leader lines.

Representative actions: `createPointMark`, `encodeX`, `encodeY`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/marks/#createpointmark).

### [Continuous aggregate bar color](./gapminder-continuous-color-bars/)

A quantitative color scale maps a compatible aggregate for each bar.

Representative actions: `filterData`, `createBarMark`, `encodeX`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#filterdata).

### [Discretized color intervals](./gapminder-discretized-color-scales/)

Quantitative observations map to ordered color intervals and legend labels.

Representative actions: `filterData`, `createPointMark`, `encodeX`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#filterdata).

### [Temporal and discrete positions](./gapminder-temporal-discrete-scales/)

Band, point, and temporal mappings retain distinct positional meanings.

Representative actions: `filterData`, `createBarMark`, `encodeX`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#filterdata).

### [Transformed quantitative positions](./gapminder-transformed-scales/)

Nonlinear position scales compare measurements over unequal numeric ranges.

Representative actions: `filterData`, `createPointMark`, `encodeX`. [Documentation](https://ggaction.github.io/ggaction/reference/actions/charts-data/#filterdata).

### [Repair missing observations](./repair-missing-observations/)

Repair missing observations with explicit inputs and immutable program revisions.

Representative actions: `createWindowData`, `createLinePlot`, `bindMarkData`. [Documentation](https://ggaction.github.io/ggaction/recipes/repair-missing-observations/).

### [Compare weighted distributions](./compare-weighted-distributions/)

Compare weighted distributions with explicit inputs and immutable program revisions.

Representative actions: `createHistogram`, `createDensityPlot`, `createECDFPlot`. [Documentation](https://ggaction.github.io/ggaction/recipes/compare-weighted-distributions/).

### [Switch encoding modes atomically](./switch-encoding-modes/)

Switch encoding modes atomically with explicit inputs and immutable program revisions.

Representative actions: `createScatterPlot`, `encodeChannels`. [Documentation](https://ggaction.github.io/ggaction/recipes/switch-encoding-modes/).

### [Edit scales and refresh guides](./edit-scales-and-guides/)

Edit scales and refresh guides with explicit inputs and immutable program revisions.

Representative actions: `createScatterPlot`, `editXScale`, `editXAxis`. [Documentation](https://ggaction.github.io/ggaction/recipes/edit-scales-and-guides/).

### [Select and place final-item labels](./edit-selected-labels/)

Select and place final-item labels with explicit inputs and immutable program revisions.

Representative actions: `editMarkLabelSelection`, `editMarkLabelPlacement`, `layoutLabels`. [Documentation](https://ggaction.github.io/ggaction/recipes/edit-selected-labels/).

### [Apply, override, and remove a theme](./apply-custom-theme/)

Apply, override, and remove a theme with explicit inputs and immutable program revisions.

Representative actions: `applyTheme`, `editPointMark`, `removeTheme`. [Documentation](https://ggaction.github.io/ggaction/recipes/apply-custom-theme/).

### [Revise facet source and shared guides](./edit-facet-source/)

Revise facet source and shared guides with explicit inputs and immutable program revisions.

Representative actions: `editFacetSource`, `editFacetHeaders`, `editFacetGuides`. [Documentation](https://ggaction.github.io/ggaction/recipes/edit-facet-source/).

### [Remove resources in dependency order](./remove-dependent-resources/)

Remove resources in dependency order with explicit inputs and immutable program revisions.

Representative actions: `encodeY`, `removeData`, `removeMark`. [Documentation](https://ggaction.github.io/ggaction/recipes/remove-dependent-resources/).

### [Choose the right authoring level](./hierarchical-authoring/)

Choose the smallest action that expresses the intended chart change.

Representative actions: `createScatterPlot`, `createPointMark`, `editPointMark`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchical-authoring/).

### [Cubehelix gamma and signed-power color](./color-controls/)

Edit lightness interpolation and transform original color values.

Representative actions: `createRectMark`, `encodeColor`, `editColorScale`. [Documentation](https://ggaction.github.io/ggaction/api/scales/continuous-color/#color-gamma-and-signed-power).

### [Lab white point comparison](./color-white-point/)

Choose a white point and edit it without changing the source values.

Representative actions: `createRectMark`, `encodeColor`, `editColorScale`. [Documentation](https://ggaction.github.io/ggaction/api/scales/continuous-color/#lab-white-point-comparison).

### [Bar difference compositing](./bar-compositing/)

Refine a complete bar with one compositing edit.

Representative actions: `createBarPlot`, `editBarMark`. [Documentation](https://ggaction.github.io/ggaction/api/marks/bar/#blend-with-underlying-content).

### [Independent Cartesian axis owners](./axis-owners/)

Create complete named axes before focused placement and text edits.

Representative actions: `createAxes`, `editYAxis`, `editYAxisLabels`. [Documentation](https://ggaction.github.io/ggaction/api/axes/complete/#independent-named-cartesian-axes).

### [A shared legend across narrow facet panels](./shared-facet-owner/)

Declare and edit one parent legend across a repeated chart.

Representative actions: `facet`, `editLegendLayout`. [Documentation](https://ggaction.github.io/ggaction/api/composition/facets/#declare-a-legend-for-the-complete-facet).

### [Encoded area symbol window](./symbol-window/)

Clip an oversized sample without changing its physical area.

Representative actions: `encodeSize`, `createLegend`, `editLegendSymbols`. [Documentation](https://ggaction.github.io/ggaction/api/legends/categorical/#sample-windows).

### [Whole symbol opacity](./legend-appearance/)

Apply opacity to one recipe layer while retaining labels and mapped colors.

Representative actions: `createLegend`, `editLegendSymbols`. [Documentation](https://ggaction.github.io/ggaction/api/legends/categorical/#recipe-layer-opacity).

### [Directional point shapes preserve area](./named-shapes/)

Refine a complete scatterplot with shape, physical area and angle encodings.

Representative actions: `createScatterPlot`, `encodeShape`, `encodeSize`, `encodeAngle`. [Documentation](https://ggaction.github.io/ggaction/api/marks/point/#directional-shapes-and-area).

### [Combined legends](./combined-legends/)

Combine compatible quantitative color and size without changing mark data.

Representative actions: `encodeColor`, `encodeSize`, `createLegend`, `editLegend`. [Documentation](https://ggaction.github.io/ggaction/api/legends/categorical/#quantitative-color-and-size).

### [Independent legend layout and border](./legend-layout/)

Start with legend blocks, then edit orientation, title, border and one local anchor.

Representative actions: `createLegend`, `editLegendLayout`, `editLegendBorder`, `editLegendBlock`. [Documentation](https://ggaction.github.io/ggaction/api/legends/categorical/#independent-legend-appearance).

### [Equal gaps between different-sized legend rows](./legend-content-spacing/)

Set occupied row gaps separately from title padding and legacy center pitch.

Representative actions: `createLegend`, `editLegendLayout`. [Documentation](https://ggaction.github.io/ggaction/api/legends/#space-rows-by-content).

### [Opacity of a layered legend recipe](./legend-recipe-opacity/)

Style an existing legend with a complete line and point recipe.

Representative actions: `createLegend`, `editLegendLabels`, `editLegendSymbols`. [Documentation](https://ggaction.github.io/ggaction/api/legends/categorical/#layered-recipe-opacity).

### [Quantitative color within independent area series](./continuous-area-color/)

Declare complete areas and refine color independently from series layout.

Representative actions: `createAreaPlot`, `encodeGroup`, `encodeColor`, `layoutSeries`. [Documentation](https://ggaction.github.io/ggaction/api/series/color/#continuous-area-color).

### [Reproducible bootstrap mean confidence intervals](./bootstrap-mean-ci/)

Preserve raw observations and calculate reusable asymmetric intervals before drawing existing areas and lines.

Representative actions: `createSummaryData`, `createAreaPlot`, `createLineMark`. [Documentation](https://ggaction.github.io/ggaction/api/data/summaries-and-shaping/#bootstrap-mean-confidence-intervals).

### [Share the existing facet top margin](./facet-shared-top-lane/)

Keep fixed plot sizes while reusing existing top space for titles and facet headers.

Representative actions: `facet`, `editCompositionLayout`, `editFacetHeaders`. [Documentation](https://ggaction.github.io/ggaction/api/composition/facets/#share-the-existing-top-margin).

### [Composite marks over guides](./plot-guide-underlays/)

Move a complete Cartesian axis or plot border behind ordinary marks without changing geometry.

Representative actions: `createXAxis`, `editXAxis`, `editCanvas`. [Documentation](https://ggaction.github.io/ggaction/api/axes/complete/#composite-marks-over-guides).

### [Vertical region headers](./facet-header-rotation/)

Put panel names beside their plots with an explicit header rotation.

Representative actions: `facet`, `editFacetHeaders`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/api/composition/facets/#rotate-panel-headers).

### [Mean age by group](./lookup-data/)

Copy typed reference values while keeping both original tables unchanged.

Representative actions: `createData`, `createLookupData`, `createBarPlot`. [Documentation](https://ggaction.github.io/ggaction/api/data/summaries-and-shaping/#named-table-lookup).

### [One field title across two panels](./facet-field-titles/)

Add an independent field title to existing facet headers.

Representative actions: `facet`, `editFacetHeaders`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/api/composition/facets/#name-the-complete-facet-field).

### [Count-based automatic linear domain](./linear-nice-count/)

Choose automatic linear domain rounding without hard-coding a range for every panel.

Representative actions: `createLinePlot`, `editYScale`, `editFacetScales`. [Documentation](https://ggaction.github.io/ggaction/api/scales/#count-based-linear-domain-rounding).

### [Nearest-step automatic linear ticks](./linear-nearest-ticks/)

Use one automatic tick policy across independently scaled facet panels.

Representative actions: `createLinePlot`, `createYAxis`, `editYAxisTicksAndLabels`. [Documentation](https://ggaction.github.io/ggaction/api/axes/#choose-nearest-step-linear-ticks).

### [Linked overlay](./linked-overlay/)

A line follows the final endpoints of aggregated bars and retains independent appearance.

Representative actions: `createOverlay editOverlay encodeColor`. [Documentation](https://ggaction.github.io/ggaction/recipes/composition/).

### [Shared-scale adjacent charts](./shared-adjacent/)

Two independent charts share a Y domain and align their actual plot frames.

Representative actions: `createAdjacentPlot editCompositionScales createTitle`. [Documentation](https://ggaction.github.io/ggaction/api/composition/editing/).

### [Compound paths and holes](./compound-path/)

Author compound paths and path clips through extension primitives.

Representative actions: `createGraphics`, `editGraphics`. [Documentation](https://ggaction.github.io/ggaction/extension/primitives/).

### [Tree layout](./tree-layouts/)

Create a hierarchy resource, compute an explicit vertical layout, and draw its nodes.

Representative actions: `createHierarchyData`, `layoutHierarchy`, `createTreePlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchy/).

### [Horizontal tree](./tree-horizontal/)

Create a hierarchy resource, compute an explicit horizontal layout, and draw its nodes.

Representative actions: `createHierarchyData`, `layoutHierarchy`, `createTreePlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchy/).

### [Radial tree](./tree-radial/)

Create a hierarchy resource, compute an explicit radial layout, and draw its nodes.

Representative actions: `createHierarchyData`, `layoutHierarchy`, `createTreePlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchy/).

### [Treemap layout](./treemap-layouts/)

Create a hierarchy resource, compute an explicit slice-dice layout, and draw its nodes.

Representative actions: `createHierarchyData`, `layoutHierarchy`, `createTreemapPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchy/).

### [Squarified treemap](./treemap-squarify/)

Create a hierarchy resource, compute an explicit squarify layout, and draw its nodes.

Representative actions: `createHierarchyData`, `layoutHierarchy`, `createTreemapPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/hierarchy/).

## Development fixtures

The catalog includes every maintained public chart program. Getting Started
and the README authoring sequence are documentation-only programs with their
own entry points. Browser hosts, extension fixtures, and Quarto setup support
these programs; they do not define additional chart examples.
