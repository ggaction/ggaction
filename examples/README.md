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

## Curated chart programs

### [Program composition](./program-composition/)

Compare distinct child panels, edit their layout, and replace one stable slot.

Representative actions: `hconcat`, `editCompositionLayout`, `replaceCompositionChild`. [Documentation](https://ggaction.github.io/ggaction/recipes/composition/).

### [Faceted scatterplot](./cars-origin-scatterplot-facet/)

Repeat a complete point or bar chart by field value.

Representative actions: `facet`, `editFacetHeaders`, `editCompositionLayout`. [Documentation](https://ggaction.github.io/ggaction/recipes/facet/).

### [Scatterplot](./cars-scatterplot/)

Compare two quantitative fields and encode a category with color.

Representative actions: `createScatterPlot`. [Documentation](https://ggaction.github.io/ggaction/tutorials/scatterplot/).

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

### [Horizontal grouped bar](./jobs-horizontal-grouped-bar/)

Compare grouped aggregate values with a horizontal measure axis.

Representative actions: `createBarMark`, `encodeX`, `encodeY`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/api/position/offsets/).

### [Histogram](./cars-histogram/)

Bin a quantitative field and count category partitions.

Representative actions: `createHistogram`. [Documentation](https://ggaction.github.io/ggaction/tutorials/histogram/).

### [Density area](./cars-density-area/)

Estimate grouped distributions and draw baseline-closed areas.

Representative actions: `createAreaMark`, `encodeDensity`, `encodeColor`. [Documentation](https://ggaction.github.io/ggaction/tutorials/density-area/).

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

Representative actions: `createLineMark`, `closed`. [Documentation](https://ggaction.github.io/ggaction/tutorials/polar-lines/#closed-radar-paths).

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

Representative actions: `selectMarks`, `highlightMarks`. [Documentation](https://ggaction.github.io/ggaction/tutorials/mark-selection/).

## Development fixtures

Other directories under `examples/` support focused browser, package, and
cross-capability tests. They are development fixtures rather than additional
user-facing chart contracts; use the curated catalog above for supported
public examples.
