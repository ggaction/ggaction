# Examples

## Cars scatterplot

Serve the repository root over HTTP:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/examples/cars-scatterplot/>. The example uses
the Chart API to materialize 392 circles and the Canvas renderer to draw them.

## Primitive cars line chart

Open <http://localhost:8000/examples/cars-line-chart-primitives/>. This
low-level chart uses the explicit primitive program under `test/programs/` to
render three Origin paths, axes, a combined color/dash legend, and chart title.

## Cars line chart

Open <http://localhost:8000/examples/cars-line-chart/>. This is the ordinary
chart-authoring example: it creates the same aggregate line chart entirely with
`createLineMark`, encoding, guide, and title actions.

## Cars histogram

Open <http://localhost:8000/examples/cars-histogram/>. This chart uses
`createBarMark`, atomic histogram encoding, color stacking, inferred guides,
and a centered title.

## Jobs grouped bar chart

Open <http://localhost:8000/examples/jobs-grouped-bar/>. This chart aggregates
job percentages by year, groups bars by sex, and infers ordinal axes, a
horizontal grid, and a right-side legend.

## Cars regression scatterplot

Open <http://localhost:8000/examples/cars-regression-scatterplot/>. This chart
filters to Japan and the USA, varies point size and shape, layers grouped linear
fits and 95% mean-response confidence bands, and creates shared axes, grid, and
composite legends.
