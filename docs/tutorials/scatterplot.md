---
layout: default
title: Cars Scatterplot Tutorial
---

[Documentation home](../index.md) · [Getting started](../getting-started.md)

# Cars Scatterplot Tutorial

The repository includes a runnable Phase 1 example in
[`examples/cars-scatterplot`](https://github.com/hj-n/ggaction/tree/main/examples/cars-scatterplot).
It loads `data/cars.json`, removes rows missing either positional field, and
authors the chart entirely through chart actions.

```javascript
import { chart, render } from "../../src/index.js";

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
  .createAxes({
    x: { title: { text: "Horsepower" } },
    y: { title: { text: "Miles per Gallon" } }
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
| `createAxes` | Axis scale/title guides | Concrete lines, ticks, labels, titles |

Position encodings create the default `main` Cartesian coordinate before axes
are requested. `createAxes` reads that stored relationship and creates guide
graphics; it does not create or repair coordinates.

See [Encodings](../api/encodings.md) and [Axes](../api/axes.md) for customization.
