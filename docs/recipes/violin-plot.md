---
layout: default
title: Violin Plot Recipe
---

# Violin Plot Recipe

{% include chart-example.html id="violin" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values })
  .createViolinPlot({
    x: "category",
    y: "value"
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- One categorical field and one quantitative field
- Whether the category belongs on x or y
- Whether to compare full profiles or two split halves

## The library infers

- The current dataset and Cartesian coordinate
- Field types when the stored values determine them unambiguously
- Gaussian unit density, automatic bandwidth and extent, and 100 sample steps
- Category band and quantitative value scales
- Shared `0.8` band-relative width, closed paths, axes, and horizontal grid

Add `color: "category"` for category fills. Use `split: { field }` when the
field has exactly two values, or provide an explicit two-value domain when
side assignment must be stable independently of source order.

## Continue

[Violin-plot API](../api/violin-plots.md) ·
[Density encoding](../api/encodings.md#atomic-density) ·
[Scale options](../api/scales.md)
