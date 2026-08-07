---
layout: default
title: Gradient Plot Recipe
---

# Gradient Plot Recipe

{% include chart-example.html id="gradient" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { top: 70, right: 150, bottom: 70, left: 70 } })
  .createData({ values })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" }
  })
  .encodeColor({ target: "gradientPlot", field: "Origin" });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

`values` is an array of plain row objects with one categorical field and one
quantitative measure.

## You must decide

- The categorical and quantitative fields
- Whether the category belongs on x or y
- Whether category hue should supplement density intensity

## The library infers

- A sampled Gaussian density profile for each category
- Band-relative strip width and a median center rule
- Cartesian axes, grid, and a relative-density legend

Use `editGradientPlot` to change bandwidth, sample count, strip width, paint,
or center statistic without rebuilding the program manually.

## Continue

[Gradient Plots API](../api/gradient-plots.md) ·
[Box-plot recipe](./box-plot.md) · [Violin-plot recipe](./violin-plot.md)
