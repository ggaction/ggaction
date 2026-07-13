---
layout: default
title: Histogram Recipe
---

# Histogram Recipe

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ id: "data", values })
  .createBarMark({ id: "bars" })
  .encodeHistogram({ field: "value" })
  .createGuides();
```

## You must decide

- Quantitative field to bin
- Optional `maxBins`
- Optional nominal color field for zero-stacked categories

```javascript
program.encodeColor({ field: "group", layout: "stack" });
```

## The library infers

- Nice bin boundaries and binned x scale
- Count y encoding, zero stack, and y scale
- Concrete non-empty bin rectangles
- Bin-aligned axes, horizontal grid, and categorical legend when applicable

Legends default to the right. Pass
`createGuides({ legend: { position: "bottom" } })` for the horizontal layout
used by the public tutorial.

## Continue

[Histogram tutorial](../tutorials/histogram.md) ·
[Histogram positions](../api/position/histogram.md) ·
[Scale options](../api/scales.md)
