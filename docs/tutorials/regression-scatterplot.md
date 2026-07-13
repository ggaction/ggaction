---
layout: default
title: Regression Scatterplot Tutorial
---

# Regression Scatterplot Tutorial

This tutorial filters the cars dataset to Japan and the USA, maps point size to
Acceleration and point color/shape to Origin, then adds one linear fit and 95%
mean-response confidence band per Origin. The complete repository-mode module
uses only the chart-authoring API. After npm publication, replace the relative
import with `"ggaction"`. The repository contains a
[runnable browser example](https://github.com/hj-n/ggaction/tree/main/examples/cars-regression-scatterplot)
and its [complete program](https://github.com/hj-n/ggaction/blob/main/examples/cars-regression-scatterplot/program.js).

```javascript
import { chart, render } from "../../src/index.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();

const program = chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .filterData({
    id: "selectedCars",
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })
  .createPointMark({ id: "points" })
  .encodeX({
    field: "Displacement",
    scale: { nice: true, zero: false }
  })
  .encodeY({
    field: "Acceleration",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .createRegression({
    confidence: 0.95,
    band: { color: "#111111", opacity: 0.18 },
    line: { strokeWidth: 3 }
  })
  .createGuides();

render(program, document.querySelector("#chart").getContext("2d"));
```

## What the actions establish

| Stage | Semantic result | Graphical result |
| --- | --- | --- |
| `filterData` | A named immutable dataset derived from `cars` | No chart geometry |
| point encodings | Shared x/y, color, size, and shape scales | Typed circles and squares with fixed opacity |
| `createRegression` | Grouped OLS predictions and three linked layers | Two filled bands and two stroked paths |
| `createGuides` | Shared axes, grid, Origin legend, and size legend | One guide set for all compatible layers |

The shortest `createRegression()` call infers its target from the current point
mark, x/y from its quantitative encodings, and grouping from the unique nominal
field shared by color and shape. It fails when those choices are ambiguous.
The interval describes uncertainty around the fitted mean response, not a
prediction interval for individual cars.

## Key action trace

High-level actions retain their wrapped children, so the regression remains
inspectable without exposing its internal IDs in the user program.

```text
program
├─ filterData
├─ createPointMark
├─ encodeSize
├─ encodeShape
├─ createRegression
│  ├─ createRegressionData
│  ├─ createRegressionBand
│  └─ createRegressionLine
└─ createGuides
   ├─ createAxes
   ├─ createGrid
   └─ createLegend
```

## Run and continue

- Serve the repository root and open `examples/cars-regression-scatterplot/`.
- Read the [regression API](../api/regression.md) for inference and options.
- Use [Appearance encodings](../api/appearance.md) to customize point size,
  shape, and opacity.
- Export the same immutable program with
  [PNG rendering](../api/rendering.md#png-output).
