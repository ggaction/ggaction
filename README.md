# ggaction

`ggaction` is a JavaScript library for building charts through immutable,
traceable actions.

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    }
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

The renderer reads only fully materialized, backend-neutral graphics. Semantic
state is never automatically compiled during rendering.

> **Status:** the documented API is `0.0.0-dev`. The package is not published
> to npm yet; use the repository build while the API is under development.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Cars scatterplot tutorial](./docs/tutorials/scatterplot.md)
- [Cars line chart tutorial](./docs/tutorials/line-chart.md)
- [Cars histogram tutorial](./docs/tutorials/histogram.md)
- [Bar chart tutorial](./docs/tutorials/grouped-bar.md)
- [Regression scatterplot tutorial](./docs/tutorials/regression-scatterplot.md)
- [Density area chart tutorial](./docs/tutorials/density-area.md)
- [Error-bar chart tutorial](./docs/tutorials/error-bar.md)
- [Error-band chart tutorial](./docs/tutorials/error-band.md)
- [Box-plot API](./docs/api/box-plots.md)
- [Chart concepts](./docs/concepts/chart-program.md)
- [Complete action reference](./docs/reference/actions.md)
- [Supported features](./docs/supported-features.md)
- [Documentation index](./docs/index.md)

The runnable [cars scatterplot](./examples/cars-scatterplot/),
[aggregate line chart](./examples/cars-line-chart/), and
[stacked histogram](./examples/cars-histogram/) use `data/cars.json`. The
[regression scatterplot](./examples/cars-regression-scatterplot/) also uses the
cars data and layers grouped fits with confidence bands. The [grouped bar
chart](./examples/jobs-grouped-bar/) uses `data/jobs.json`. The [density area
chart](./examples/cars-density-area/) derives grouped Acceleration
distributions from the cars data. The [error-bar chart](./examples/cars-error-bar/)
summarizes mean Acceleration with 95% confidence intervals. The
[error-band chart](./examples/gapminder-error-band/) summarizes grouped
confidence intervals as closed area paths over time.
The [box plot](./examples/cars-box-plot/) summarizes Miles per Gallon by Origin
with Tukey quartiles, observed whiskers, and diamond outliers.
Completed programs can also be exported through
[`ggaction/png`](./docs/api/rendering.md#png-output).

## Development

```bash
npm install
npm test
npm run test:render
```
