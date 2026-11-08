---
layout: default
title: Error Bar Recipe
---

# Error Bar Recipe

{% include chart-example.html id="error-bar" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser project with a canvas whose id is chart, and serve cars.json from the site root.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const cars = await fetch("/cars.json").then(response => response.json());
const values = cars.filter(car =>
  Number.isFinite(car.Acceleration));

const program = chart()
  .createCanvas()
  .createData({ values })
  .createErrorBar({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration" }
  })
  .createGuides();

render(program, document.querySelector("#chart").getContext("2d"));
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
