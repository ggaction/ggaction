---
layout: default
title: Gradient Plot Recipe
---

# Gradient Plot Recipe

{% include chart-example.html id="gradient" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser project with a canvas whose id is chart, and serve cars.json from the site root.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const cars = await fetch("/cars.json").then(response => response.json());
const values = cars.filter(car => ["Horsepower", "Miles_per_Gallon", "Weight_in_lbs", "Acceleration", "Displacement", "Cylinders"]
  .every(field => Number.isFinite(car[field])));

const program = chart()
  .createCanvas({ margin: { top: 70, right: 150, bottom: 70, left: 70 } })
  .createData({ values })
  .createGradientPlot({
    x: { field: "Origin", fieldType: "nominal" },
    y: { field: "Acceleration", fieldType: "quantitative" }
  })
  .encodeColor({ field: "Origin" });

render(program, document.querySelector("#chart").getContext("2d"));
```

`cars` contains plain rows with non-empty categorical `Origin` and finite
numeric `Acceleration`. Use axis option objects for this facade; the nominal
and quantitative roles determine the orientation. Provide several observations
per origin so each density profile describes a distribution.

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
