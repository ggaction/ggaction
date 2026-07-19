---
layout: default
title: Histogram Recipe
---

# Histogram Recipe

{% include chart-example.html id="histogram" %}

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values })
  .createHistogram({ field: "value" });
```

## You must decide

- Quantitative field to bin
- Optional `maxBins`
- Optional nominal color field and series layout

Add `color: { field: "group", layout: "stack" }` to the `createHistogram`
options.

Choose `fill`, `group`, `overlay`, or `diverging` when their partition meaning
matches the chart.

## The library infers

- Nice bin boundaries and binned x scale
- Count y encoding, zero stack, and y scale
- Concrete non-empty bin rectangles
- Bin-aligned axes, horizontal grid, and categorical legend when applicable

Legends default to the right. Pass
`guides: { legend: { position: "bottom" } }` for the horizontal layout used by
the public tutorial.

## Continue

[Histogram tutorial](../tutorials/histogram.md) ·
[Basic Charts](../api/basic-charts.md#createhistogram) ·
[Histogram positions](../api/position/histogram.md) ·
[Scale options](../api/scales.md)
