---
layout: default
title: Getting Started
---

# Getting Started

{% include chart-example.html id="scatterplot" %}

This walkthrough installs `ggaction`, creates a complete scatterplot from an
inline dataset, and renders it to Browser Canvas. Every action returns a new
immutable `ChartProgram`, so the calls can be chained.

## 1. Create a browser project

`ggaction` is an ESM package. This minimal setup uses Vite to resolve the npm
package for the browser:

```bash
mkdir ggaction-start
cd ggaction-start
npm init -y
npm install ggaction
npm install --save-dev vite
```

Registry availability is confirmed as part of the initial release completion.
If `0.0.1` is not yet available while that release is in progress, use the
[repository examples](https://github.com/hj-n/ggaction/tree/main/examples)
instead of substituting another registry package.

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ggaction scatterplot</title>
  </head>
  <body>
    <canvas id="chart" aria-label="Horsepower versus mileage"></canvas>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

## 2. Build the program

Create `main.js`:

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
  .encodeRadius({ value: 4 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per gallon" } }
    }
  });

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
```

`createPointMark` uses the most recently created dataset. Encoding actions use
the most recently created mark. Pass `data` or `target` explicitly when a
program contains more than one candidate. The first omitted dataset and point
IDs are stored as `"data"` and `"point"`; name them explicitly only when a later
multi-resource flow needs that identity.

`createGuides` infers the applicable axes and horizontal grid from the position
encodings. The renderer reads only concrete `graphicSpec` values already
produced by actions; it does not compile `semanticSpec` during rendering.
A nominal point color encoding can produce a categorical legend; adding a
matching shape encoding produces a composite color-and-shape legend.

## 3. Run it

```bash
npx vite
```

Open the local URL printed by Vite. The browser draws the chart into the Canvas
created in `index.html`.

## Package entries and compatibility

| Import | Environment | Use |
| --- | --- | --- |
| `ggaction` | Modern ESM browsers and Node.js 20+ | Chart authoring and Browser Canvas rendering |
| `ggaction/extension` | Modern ESM browsers and Node.js 20+ | Wrapped actions and public primitive authoring |
| `ggaction/png` | Node.js 20+ only | PNG file output through the native Canvas adapter |

All entries include TypeScript declarations. The package does not publish
CommonJS entry points. Import `ggaction/png` only from Node code; the default
browser entry does not load filesystem or native PNG modules.

The release artifact is tested by installing its exact tarball into fresh
JavaScript and TypeScript consumer projects. It is also tested in a browser and
across the supported Node release matrix.

## Runnable repository examples

The source repository also contains complete modules for the
[minimal getting-started chart](https://github.com/hj-n/ggaction/tree/main/examples/getting-started/),
[scatterplot](https://github.com/hj-n/ggaction/tree/main/examples/cars-scatterplot/),
[line chart](https://github.com/hj-n/ggaction/tree/main/examples/cars-line-chart/),
[histogram](https://github.com/hj-n/ggaction/tree/main/examples/cars-histogram/),
[bar chart](https://github.com/hj-n/ggaction/tree/main/examples/jobs-grouped-bar/),
[regression scatterplot](https://github.com/hj-n/ggaction/tree/main/examples/cars-regression-scatterplot/),
[density area](https://github.com/hj-n/ggaction/tree/main/examples/cars-density-area/),
[error bar](https://github.com/hj-n/ggaction/tree/main/examples/cars-error-bar/),
[error band](https://github.com/hj-n/ggaction/tree/main/examples/gapminder-error-band/),
[box plot](https://github.com/hj-n/ggaction/tree/main/examples/cars-box-plot/), and
[mark selection](https://github.com/hj-n/ggaction/tree/main/examples/mark-selection/).

## Next

- Use the [cars scatterplot tutorial](./tutorials/scatterplot.md) with the
  repository dataset.
- Build temporal aggregate series in the
  [cars line chart tutorial](./tutorials/line-chart.md).
- Bin and stack quantitative values in the
  [cars histogram tutorial](./tutorials/histogram.md).
- Aggregate and group ordinal categories in the
  [jobs grouped bar tutorial](./tutorials/grouped-bar.md).
- Layer grouped fits and confidence bands in the
  [regression scatterplot tutorial](./tutorials/regression-scatterplot.md).
- Summarize grouped means and confidence intervals in the
  [error-bar tutorial](./tutorials/error-bar.md).
- Select, filter, and emphasize final visual items in the
  [mark-selection tutorial](./tutorials/mark-selection.md).
- Check the [action index](./reference/actions.md) for signatures and defaults.
- Copy a minimal flow from the [chart recipes](./recipes/index.md).
- Resolve common inference and layout errors with
  [Troubleshooting](./troubleshooting.md).
- Export the same program with [PNG rendering](./api/rendering.md#png-output).
