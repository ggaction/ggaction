---
layout: default
title: Regression Scatterplot Recipe
---

# Regression Scatterplot Recipe

Use this pattern to layer grouped linear fits and mean-response confidence
bands over a point chart.

```javascript
const program = chart()
  .createCanvas({
    width: 760,
    height: 480,
    margin: { top: 40, right: 190, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .filterData({
    id: "selectedCars",
    field: "Origin",
    oneOf: ["Japan", "USA"]
  })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement", scale: { nice: true, zero: false } })
  .encodeY({ field: "Acceleration", scale: { nice: true, zero: false } })
  .encodeColor({ field: "Origin", scale: { palette: "tableau10" } })
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 })
  .createRegression()
  .createGuides();
```

`createRegression()` infers the current point layer, quantitative x/y fields,
and the single nominal grouping field used by color or shape. Pass `target`,
`x`, `y`, or `groupBy` only when inference is ambiguous. See the
[full tutorial](../tutorials/regression-scatterplot.md) and
[regression API](../api/regression.md).
