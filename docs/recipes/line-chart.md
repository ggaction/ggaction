---
layout: default
title: Line Chart Recipe
---

# Line Chart Recipe

{% include chart-example.html id="line" %}

## Minimal flow

```javascript
const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values })
  .createLinePlot({
    x: { field: "date", fieldType: "temporal" },
    y: { field: "value", aggregate: "mean" }
  });
```

## You must decide

- Temporal x field
- Quantitative y field
- Whether the line is one series or grouped by a nominal field

For multiple series, add `color: "group"`, `groupBy: "group"`, or
`strokeDash: { field: "group" }` to the facade call.

## The library infers

- UTC time x and linear y scales
- Mean aggregation at each x/series group
- Sorted concrete `M/L` path commands
- Linear interpolation unless `line: { curve }` selects another curve
- Axes, horizontal grid, and a right-side categorical legend when applicable

Every materialized series needs at least two points. Reserve right margin for a
legend or pass `createLegend({ position: "bottom" })` with bottom margin.

Use `line: { curve: "step" }` during creation for midpoint steps, or edit an existing
line without changing its encodings:

```javascript
const smooth = program.editLineMark({
  curve: "monotone",
  strokeWidth: 4
});
```

To overlay a trend on compatible aggregate bars, add the line after the bar
encodings. The line infers the shared fields, scales, and aggregate, so no
second `encodeY` call is needed:

```javascript
const layered = chart()
  .createData({ values })
  .createBarMark({ id: "bars" })
  .encodeX({ field: "date", fieldType: "temporal" })
  .encodeY({ field: "value", aggregate: "mean" })
  .createLineMark({ id: "trend", strokeWidth: 3 });
```

The accepted curve vocabulary is `linear`, `step`, `step-before`, `step-after`,
`basis`, `cardinal`, `monotone`, and `natural`. The renderer receives only final
`M/L/C` commands and never interprets these names.

## Continue

[Line chart tutorial](../tutorials/line-chart.md) ·
[Basic Charts](../api/basic-charts.md#createlineplot) ·
[Temporal line positions](../api/position/temporal.md) ·
[Series encodings](../api/series-encodings.md)
