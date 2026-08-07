---
layout: default
title: Histogram Recipe
---

# Histogram Recipe

{% include chart-example.html id="histogram" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { top: 70, right: 140 } })
  .createData({ values })
  .createHistogram({ field: "value" })
  .createTitle({ text: "Value distribution" });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
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
