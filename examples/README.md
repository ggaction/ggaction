# Examples

## Cars scatterplot

Serve the repository root over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/examples/cars-scatterplot/>. The example uses
`createScatterPlot` to materialize 392 circles and the Canvas renderer to draw
them.

## Getting started

Open <http://localhost:8000/examples/getting-started/> for the small inline-data
example used by the Getting Started guide.

## Primitive cars line chart

Open <http://localhost:8000/examples/cars-line-chart-primitives/>. This
low-level chart uses the explicit primitive program under
`test/charts/cars-line-chart/` to
render three Origin paths, axes, a combined color/dash legend, and chart title.

## Cars line chart

Open <http://localhost:8000/examples/cars-line-chart/>. This is the ordinary
chart-authoring example: it creates the same aggregate line chart entirely with
`createLinePlot` and a separate title action.

## Cars histogram

Open <http://localhost:8000/examples/cars-histogram/>. This chart uses
`createHistogram` for atomic bins, color stacking, and inferred guides, then
adds a centered title.

## Jobs grouped bar chart

Open <http://localhost:8000/examples/jobs-grouped-bar/>. This chart aggregates
job percentages by year through `createBarPlot`, groups bars by sex, and infers
ordinal axes, a horizontal grid, and a right-side legend.

## Gapminder life-expectancy heatmap

Open <http://localhost:8000/examples/gapminder-life-expectancy-heatmap/>. This
chart uses `createHeatmap` for observed pre-gridded cells, then adds a text layer
for the displayed values.

## Gapminder population donut

The `gapminder-population-donut` program filters one year, then uses
`encodeTheta({ aggregate: "sum", weight: "pop" })` to size each cluster sector
by total population without expanding the source rows.

## Cars regression scatterplot

Open <http://localhost:8000/examples/cars-regression-scatterplot/>. This chart
filters to Japan and the USA, varies point size and shape, layers grouped linear
fits and 95% mean-response confidence bands, and creates shared axes, grid, and
composite legends.

## Cars density area chart

Open <http://localhost:8000/examples/cars-density-area/>. This chart derives
Gaussian kernel-density values for acceleration by Origin, overlays three
translucent area paths, and uses two-direction grids with a top legend.

## Cars error-bar chart

Open <http://localhost:8000/examples/cars-error-bar/>. This chart derives mean
acceleration and 95% confidence intervals by Origin, then draws vertical rules
with fixed-width caps.

## Gapminder error-band chart

Open <http://localhost:8000/examples/gapminder-error-band/>. This chart derives
mean life expectancy and 95% confidence intervals by year and cluster, then
draws one translucent closed area path per cluster.

## Cars box plot

Open <http://localhost:8000/examples/cars-box-plot/>. This chart derives
Origin-wise Tukey quartiles, observed whiskers, and black diamond outliers,
then renders them through `createBoxPlot`.

The same program module also exports `createCarsHorizontalMinmaxBoxPlot`, which
uses Horsepower on x, Origin on y, and creates no outlier resources.
It additionally exports `createCarsStyledFactorBoxPlot` for factor/appearance
options and `createCarsBoxPlotWithoutOutliers` for the explicit outlier opt-out.
