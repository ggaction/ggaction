---
layout: default
title: Scatterplot Recipe
---

# Scatterplot Recipe

## Minimal flow

```javascript
const program = chart()
  .createCanvas()
  .createData({ id: "data", values })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .encodeRadius({ value: 3 })
  .createGuides();
```

## You must decide

- Dataset values and ID
- Point mark ID
- Quantitative x and y fields

Radius is optional, but points need a concrete radius before they are visible.
Add `encodeColor({ field })` for nominal fill.

## The library infers

- Current dataset and mark for later actions
- Quantitative linear scales named `x` and `y`
- The `main` Cartesian coordinate
- Plot-bound ranges, axes, and horizontal grid

Point legends are not supported. Multiple compatible marks or scales require
explicit `target` or scale IDs.

## Continue

[Scatterplot tutorial](../tutorials/scatterplot.md) ·
[Quantitative positions](../api/position/quantitative.md) ·
[Constant appearance](../api/appearance.md)
