---
layout: default
title: Heatmap Recipe
---

# Heatmap Recipe

{% include chart-example.html id="heatmap" %}

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 120 } })
  .createData({ values: cells })
  .createHeatmap({
    x: { field: "column", fieldType: "ordinal" },
    y: { field: "row", fieldType: "nominal" },
    color: {
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    }
  });
```

## You must decide

- The two discrete cell-position fields
- The field that owns cell color
- Whether the rows are already at one-row-per-cell grain

The current facade consumes observed, pre-gridded rows. It does not create
missing row/column combinations or perform two-dimensional binning.

## The library infers

- Band scales for the two discrete positions
- One concrete rectangle per valid observed row
- A categorical or continuous color scale and matching legend
- Cartesian axes and horizontal grid

Use `rect: { opacity, stroke, strokeWidth }` for cell appearance. Cell fill is
owned by the required color encoding. To show values, chain a text layer after
the heatmap:

```javascript
const labeled = program
  .createTextMark({ align: "center", baseline: "middle" })
  .encodeText({ field: "value", format: ".0f" });
```

## Continue

[Basic Charts](../api/basic-charts.md#createheatmap) ·
[Rect marks](../api/marks/rect.md) ·
[Continuous color scales](../api/scales/continuous-color.md)
