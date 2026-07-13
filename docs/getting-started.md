---
layout: default
title: Getting Started
---

# Getting Started

This example creates and renders a complete scatterplot. Every method returns a
new `ChartProgram`, so the calls can be chained.

## Use the repository build

`ggaction` is not published to npm yet. Clone the repository and run its browser
examples directly from source:

```bash
git clone https://github.com/hj-n/ggaction.git
cd ggaction
npm install
python3 -m http.server 4173
```

Open one of the runnable repository examples:

- `http://localhost:4173/examples/cars-scatterplot/`
- `http://localhost:4173/examples/cars-line-chart/`
- `http://localhost:4173/examples/cars-histogram/`
- `http://localhost:4173/examples/jobs-grouped-bar/`

Those browser examples import `../../src/index.js` directly. The code below
uses the intended package import, `ggaction`, to document the consumer API that
will be available after publication; it is not a standalone browser import in
the current repository build.

## 1. Add a canvas

```html
<canvas id="chart" aria-label="Horsepower versus mileage"></canvas>
```

## 2. Build the program

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
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
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
```

`createPointMark` uses the most recently created dataset. Encoding actions use
the most recently created mark. Pass `data` or `target` explicitly when a
program contains more than one candidate. `createGuides` infers the applicable
axes and horizontal grid from these point encodings. Point-mark legends are not
supported yet, so the color encoding does not create a legend.

## 3. Render it

```javascript
const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
```

The renderer reads only concrete `graphicSpec` values already produced by the
actions. It does not compile `semanticSpec` during rendering.

## Next

- Use the [cars scatterplot tutorial](./tutorials/scatterplot.md) with the
  repository dataset.
- Build temporal aggregate series in the
  [cars line chart tutorial](./tutorials/line-chart.md).
- Bin and stack quantitative values in the
  [cars histogram tutorial](./tutorials/histogram.md).
- Aggregate and group ordinal categories in the
  [jobs grouped bar tutorial](./tutorials/grouped-bar.md).
- Check the [action index](./reference/actions.md) for signatures and defaults.
- Copy a minimal flow from the [chart recipes](./recipes/index.md).
- Export the same program with [PNG rendering](./api/rendering.md#png-output).
