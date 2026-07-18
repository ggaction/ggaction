# ggaction

`ggaction` is a JavaScript library for building charts through immutable,
traceable actions.

```javascript
import { chart, render } from "ggaction";

const cars = [
  { horsepower: 88, mpg: 27, origin: "USA" },
  { horsepower: 70, mpg: 36, origin: "Japan" },
  { horsepower: 110, mpg: 24, origin: "Europe" }
];

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ values: cars })
  .createPointMark()
  .encodeX({ field: "horsepower" })
  .encodeY({ field: "mpg" })
  .encodeColor({ field: "origin" })
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

> **Status:** `0.0.2` is the current experimental public release. APIs may change
> before `1.0.0`; changes are recorded in the [changelog](./CHANGELOG.md).

## Install

```bash
npm install ggaction
```

The package is ESM-only and supports Node.js 20 or later. The default `ggaction`
entry works with modern browser build tools and Canvas. `ggaction/png` is
Node-only and uses a native Canvas dependency.

| Entry | Purpose |
| --- | --- |
| `ggaction` | Create chart programs and render them to Browser Canvas |
| `ggaction/extension` | Author wrapped actions and use public low-level primitives |
| `ggaction/png` | Render a completed program to a PNG file in Node.js |

All three entries include TypeScript declarations. See [Getting
Started](https://hyeonword.com/ggaction/getting-started/) for a complete browser
setup and [Rendering](https://hyeonword.com/ggaction/api/rendering/) for Node PNG
output.

## Documentation

- [npm package](https://www.npmjs.com/package/ggaction)
- [Getting started](https://hyeonword.com/ggaction/getting-started/)
- [Cars scatterplot tutorial](https://hyeonword.com/ggaction/tutorials/scatterplot/)
- [Cars line chart tutorial](https://hyeonword.com/ggaction/tutorials/line-chart/)
- [Cars histogram tutorial](https://hyeonword.com/ggaction/tutorials/histogram/)
- [Bar chart tutorial](https://hyeonword.com/ggaction/tutorials/grouped-bar/)
- [Regression scatterplot tutorial](https://hyeonword.com/ggaction/tutorials/regression-scatterplot/)
- [Density area chart tutorial](https://hyeonword.com/ggaction/tutorials/density-area/)
- [Error-bar chart tutorial](https://hyeonword.com/ggaction/tutorials/error-bar/)
- [Error-band chart tutorial](https://hyeonword.com/ggaction/tutorials/error-band/)
- [Mark selection and highlighting tutorial](https://hyeonword.com/ggaction/tutorials/mark-selection/)
- [Box-plot API](https://hyeonword.com/ggaction/api/box-plots/)
- [Chart concepts](https://hyeonword.com/ggaction/concepts/chart-program/)
- [Complete action reference](https://hyeonword.com/ggaction/reference/actions/)
- [Supported features](https://hyeonword.com/ggaction/supported-features/)
- [Documentation index](https://hyeonword.com/ggaction/)

The runnable [cars scatterplot](https://github.com/hj-n/ggaction/tree/main/examples/cars-scatterplot/),
[aggregate line chart](https://github.com/hj-n/ggaction/tree/main/examples/cars-line-chart/), and
[stacked histogram](https://github.com/hj-n/ggaction/tree/main/examples/cars-histogram/) use `data/cars.json`. The
[regression scatterplot](https://github.com/hj-n/ggaction/tree/main/examples/cars-regression-scatterplot/) also uses the
cars data and layers grouped fits with confidence bands. The [grouped bar
chart](https://github.com/hj-n/ggaction/tree/main/examples/jobs-grouped-bar/) uses `data/jobs.json`. The [density area
chart](https://github.com/hj-n/ggaction/tree/main/examples/cars-density-area/) derives grouped Acceleration
distributions from the cars data. The [error-bar chart](https://github.com/hj-n/ggaction/tree/main/examples/cars-error-bar/)
summarizes mean Acceleration with 95% confidence intervals. The
[error-band chart](https://github.com/hj-n/ggaction/tree/main/examples/gapminder-error-band/) summarizes grouped
confidence intervals as closed area paths over time.
The [box plot](https://github.com/hj-n/ggaction/tree/main/examples/cars-box-plot/) supports vertical or horizontal
Tukey/min–max ranges, configurable factor and component appearance, and
optional outlier rendering from categorical and quantitative field pairs.
The [mark-selection example](https://github.com/hj-n/ggaction/tree/main/examples/mark-selection/) compares grouped point,
complete stacked-bar, and line-series highlighting through one selector grammar.
The [program-composition example](https://github.com/hj-n/ggaction/tree/main/examples/program-composition/) combines
complete child programs, edits their inferred layout, and replaces one stable slot.
The [facet example](https://github.com/hj-n/ggaction/tree/main/examples/cars-origin-scatterplot-facet/)
repeats one direct-source chart with `.facet({ field: "Origin" })`, shared
scales, per-cell axes, and an optional parent-owned categorical legend.
Completed programs can also be exported through
[`ggaction/png`](https://hyeonword.com/ggaction/api/rendering/#png-output).

## Development

```bash
npm install
npm test
npm run test:render
```
