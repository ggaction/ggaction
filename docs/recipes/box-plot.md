---
layout: default
title: Box Plot Recipe
---

# Box Plot Recipe

{% include chart-example.html id="box" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ values })
  .createBoxPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    guides: { legend: false }
  })
  .encodeColor({
    target: "boxPlot",
    field: "category",
    fieldType: "nominal"
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- One categorical field and one quantitative field
- Whether the categorical field belongs on x or y

## The library infers

- The current dataset and Cartesian coordinate
- Vertical or horizontal orientation from the complete field pair
- Tukey quartiles and `1.5 × IQR` observed whiskers
- A ranged-bar body, median rule, whiskers, caps, and optional outlier points
- Compatible scales, axes, and the perpendicular grid

Use `whisker: { type: "minmax" }` for observed minimum and maximum whiskers
without an outlier layer. Use `editBoxPlot` to revise statistics, width, or
component appearance through the stable box-plot owner. Color is a post-facade
encoding: call `encodeColor({ target: "boxPlot", ... })` instead of passing an
unsupported `color` option to `createBoxPlot`. When color repeats the x or y
category, keep the redundant legend disabled through `guides.legend` or manage
it explicitly with the guide lifecycle actions. Keep the explicit Canvas size
and margins when adapting this recipe so the axes, labels, and box geometry
have defined drawing space without another layout lookup.

## Continue

[Box-plot API](../api/box-plots.md) ·
[Bar marks](../api/marks/bar.md) ·
[Error bars](../api/error-bars.md)
