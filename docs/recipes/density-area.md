---
layout: default
title: Density Area Recipe
---

# Density Area Recipe

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { top: 100, right: 140 } })
  .createData({ id: "data", values })
  .createAreaMark({ id: "density" })
  .encodeDensity({ field: "value", groupBy: "group" })
  .encodeColor({ field: "group" })
  .createGuides();
```

## You must decide

- Quantitative source field
- Optional nominal `groupBy`
- Optional explicit bandwidth or sampling extent
- Whether density belongs on y (default) or x

## The library infers

- Immutable derived dataset and deterministic output field names
- Automatic Gaussian bandwidth and shared 100-step sample grid
- Value and zero-inclusive density scales
- One baseline-closed path per group
- Cartesian axes, horizontal grid, and a categorical legend when colored

Use `createGuides({ grid: { horizontal: {}, vertical: {} } })` for both grid
directions. Legends still default to the right; pass explicit top layout
options only when that composition is intentional.

## Continue

[Density area tutorial](../tutorials/density-area.md) ·
[Encodings](../api/encodings.md#atomic-density) ·
[Legends](../api/legends.md)
