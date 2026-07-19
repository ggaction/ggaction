---
layout: default
title: Scatterplot Recipe
---

# Scatterplot Recipe

{% include chart-example.html id="scatterplot" %}

## Minimal flow

```javascript
const program = chart()
  .createCanvas()
  .createData({ values })
  .createScatterPlot({ x: "x", y: "y" });
```

## You must decide

- Dataset values
- Quantitative x and y fields

Add `color: "group"`, `size: "amount"`, or `shape: "category"` to the same
call for field-driven appearance. The default point radius is `3`.

## The library infers

- Current dataset for the facade and current mark for later actions
- Stable internal role IDs for the first dataset and point mark
- Quantitative linear scales named `x` and `y`
- The `main` Cartesian coordinate
- Plot-bound ranges, axes, and horizontal grid

Point color, shape, and size legends are created when those encodings are
present. Multiple compatible marks or scales require explicit `target` or
scale IDs.

## Continue

[Scatterplot tutorial](../tutorials/scatterplot.md) ·
[Basic Charts](../api/basic-charts.md#createscatterplot) ·
[Quantitative positions](../api/position/quantitative.md) ·
[Constant appearance](../api/appearance.md)
