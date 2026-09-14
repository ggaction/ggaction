---
layout: default
title: Error Bar Recipe
---

# Error Bar Recipe

{% include chart-example.html id="error-bar" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values })
  .createErrorBar({
    x: { field: "group", fieldType: "nominal" },
    y: { field: "value" }
  })
  .createGuides();
```

## You must decide

- Independent nominal, ordinal, or temporal x field
- Quantitative y field

## The library infers

- Current dataset and Cartesian coordinate
- Mean with a two-sided 95% Student-t confidence interval
- One immutable summary row per first-appearance group
- Vertical main rules, 8px caps, ordinal/temporal x, and quantitative y
- Axes, horizontal grid, and statistical axis title

When one compatible layer is already encoded, call `createErrorBar()` without
options to reuse its fields, data, coordinate, and scales.

## Continue

[Error-bar tutorial](../tutorials/error-bar.md) ·
[Error-bar API](../api/error-bars.md)
