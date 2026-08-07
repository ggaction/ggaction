---
layout: default
title: Regression Scatterplot Recipe
---

# Regression Scatterplot Recipe

{% include chart-example.html id="regression" %}

Use this pattern to layer grouped linear fits and mean-response confidence
bands over a point chart.

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "observations", values })
  .createScatterPlot({
    id: "points",
    data: "observations",
    x: { field: "Displacement", scale: { id: "x", nice: true, zero: false } },
    y: { field: "Acceleration", scale: { id: "y", nice: true, zero: false } },
    color: { field: "Origin", scale: { palette: "tableau10" } },
    guides: false
  })
  .filterData({ id: "focus", source: "observations", field: "Origin", oneOf: ["Japan"] })
  .createPointMark({ id: "focusPoints", data: "focus", opacity: 0 })
  .encodeX({ target: "focusPoints", field: "Displacement", scale: { id: "x" } })
  .encodeY({ target: "focusPoints", field: "Acceleration", scale: { id: "y" } })
  .createRegression({ target: "focusPoints", band: false })
  .createData({
    id: "fitLabel",
    values: [{ Displacement: 140, Acceleration: 15, label: "R² = 0.82" }]
  })
  .createTextMark({ id: "fitText", data: "fitLabel", fill: "#000000" })
  .encodeX({ target: "fitText", field: "Displacement", scale: { id: "x" } })
  .encodeY({ target: "fitText", field: "Acceleration", scale: { id: "y" } })
  .encodeText({ target: "fitText", field: "label" })
  .createGuides();

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- Point x and y fields
- Optional nominal color or shape grouping field
- Optional source filter

## The library infers

- The current eligible point layer
- Quantitative x/y fields and their shared coordinate and scales
- One grouping field when color and shape agree
- Immutable OLS rows, one 95% mean-response confidence band, and one line per group
- Shared axes, grid, categorical legend, and quantitative size legend

Pass `target`, `x`, `y`, or `groupBy` only when inference is ambiguous.

## Continue

[Regression scatterplot tutorial](../tutorials/regression-scatterplot.md) ·
[Regression API](../api/regression.md) ·
[Appearance encodings](../api/appearance.md)
