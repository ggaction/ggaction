---
layout: default
title: Getting Started
---

[Documentation home](./index.md) · [Scatterplot tutorial](./tutorials/scatterplot.md)

# Getting Started

This example creates and renders a complete scatterplot. Every method returns a
new `ChartProgram`, so the calls can be chained.

## Run the repository example

The current development build can be run directly from source:

```bash
git clone https://github.com/hj-n/ggaction.git
cd ggaction
npm install
python3 -m http.server 4173
```

Open `http://localhost:4173/examples/cars-scatterplot/`. The remaining examples
use package imports to show the intended consumer API.

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
  .createAxes({
    x: { title: { text: "Horsepower" } },
    y: { title: { text: "Miles per gallon" } }
  });
```

`createPointMark` uses the most recently created dataset. Encoding actions use
the most recently created mark. Pass `data` or `target` explicitly when a
program contains more than one candidate.

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
- Check the [action index](./reference/actions.md) for signatures and defaults.
- Export the same program with [PNG rendering](./api/rendering.md#png-output).
