---
layout: default
title: Regression Scatterplot Recipe
---

# Regression Scatterplot Recipe

Use this pattern to layer grouped linear fits and mean-response confidence
bands over a point chart.

## Minimal flow

```javascript
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
  .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
  .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .createRegression()
  .createGuides();
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
