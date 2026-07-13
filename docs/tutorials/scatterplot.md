---
layout: default
title: Cars Scatterplot Tutorial
---

# Cars Scatterplot Tutorial

![Horsepower versus miles per gallon](../assets/images/cars-scatterplot.png)

This tutorial uses the intended package API. The repository contains a
[runnable browser example](https://github.com/hj-n/ggaction/tree/main/examples/cars-scatterplot)
and its [complete source](https://github.com/hj-n/ggaction/blob/main/examples/cars-scatterplot/main.js),
which import the local source build instead.

```javascript
import { chart, render } from "ggaction";

const response = await fetch("../../data/cars.json");
const cars = await response.json();
const rows = cars.filter(
  car =>
    Number.isFinite(car.Horsepower) &&
    Number.isFinite(car.Miles_per_Gallon)
);

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
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

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

## What each stage establishes

| Stage | Semantic result | Graphical result |
| --- | --- | --- |
| `createCanvas` | — | Canvas dimensions and background |
| `createData` | Immutable named rows | — |
| `createPointMark` | Point layer bound to `cars` | One circle child per row |
| `encodeX`, `encodeY` | Fields, scales, Cartesian coordinate | Concrete x/y values |
| `encodeColor` | Nominal color field and scale | Concrete fill colors |
| `encodeRadius` | — | Constant circle radius |
| `createGuides` | Axis and horizontal-grid definitions | Concrete grid/axis lines, ticks, labels, and axis titles |

Position encodings create the default `main` Cartesian coordinate before guides
are requested. `createGuides` calls the axis and grid actions, which read that
stored relationship and create guide graphics; they do not create or repair
coordinates.

## Key action trace

The trace keeps the user flow and meaningful guide decomposition. Primitive
property edits remain available deeper in the same tree.

```text
program
├─ createPointMark
├─ encodeX
├─ encodeY
├─ encodeColor
├─ encodeRadius
└─ createGuides
   ├─ createAxes
   │  ├─ createXAxis
   │  └─ createYAxis
   └─ createGrid
```

## Run and continue

- Serve the repository root and open `examples/cars-scatterplot/`.
- View the [complete browser source](https://github.com/hj-n/ggaction/blob/main/examples/cars-scatterplot/main.js).
- Continue with [Encodings](../api/encodings.md) and
  [Guides](../api/guides.md).
