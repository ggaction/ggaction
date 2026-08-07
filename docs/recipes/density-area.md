---
layout: default
title: Density Area Recipe
---

# Density Area Recipe

{% include chart-example.html id="density" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { top: 100, right: 140 } })
  .createData({ values })
  .createAreaMark()
  .encodeDensity({ field: "value", groupBy: "group" })
  .encodeColor({ field: "group" })
  .createGuides();

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- Quantitative source field
- Optional nominal `groupBy`
- Optional explicit bandwidth or sampling extent
- Optional kernel and unit/count normalization
- Whether density belongs on y (default) or x

## The library infers

- Immutable derived dataset and deterministic output field names
- Gaussian/unit defaults, automatic bandwidth, and a shared 100-step sample grid
- Value and zero-inclusive density scales
- One baseline-closed command path per group
- Cartesian axes, horizontal grid, and a categorical legend when colored

Use `createGuides({ grid: { horizontal: {}, vertical: {} } })` for both grid
directions. Legends still default to the right; pass explicit top layout
options only when that composition is intentional.

## Continue

[Density area tutorial](../tutorials/density-area.md) ·
[Encodings](../api/encodings.md#atomic-density) ·
[Legends](../api/legends.md)
