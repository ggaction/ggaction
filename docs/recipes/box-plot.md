---
layout: default
title: Box-Plot Recipe
---

# Box-Plot Recipe

{% include chart-example.html id="box" %}

## Minimal flow

```javascript
const program = chart()
  .createCanvas()
  .createData({ values })
  .createBoxPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" }
  })
  .createGuides({ legend: false });
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
component appearance through the stable box-plot owner.

## Continue

[Box-plot API](../api/box-plots.md) ·
[Bar marks](../api/marks/bar.md) ·
[Error bars](../api/error-bars.md)
