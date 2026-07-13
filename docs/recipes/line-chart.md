---
layout: default
title: Line Chart Recipe
---

# Line Chart Recipe

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ id: "data", values })
  .createLineMark({ id: "lines" })
  .encodeX({ field: "date", fieldType: "temporal" })
  .encodeY({ field: "value", aggregate: "mean" })
  .createGuides();
```

## You must decide

- Temporal x field
- Quantitative y field
- Whether the line is one series or grouped by a nominal field

For multiple series, add `encodeColor({ field: "group" })`,
`encodeStrokeDash({ field: "group" })`, or both before `createGuides`.

## The library infers

- UTC time x and linear y scales
- Mean aggregation at each x/series group
- Sorted concrete path points
- Axes, horizontal grid, and a right-side categorical legend when applicable

Every materialized series needs at least two points. Reserve right margin for a
legend or pass `createLegend({ position: "bottom" })` with bottom margin.

## Continue

[Line chart tutorial](../tutorials/line-chart.md) ·
[Temporal line positions](../api/position/temporal.md) ·
[Series encodings](../api/series-encodings.md)
