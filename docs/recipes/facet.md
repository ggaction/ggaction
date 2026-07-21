---
layout: default
title: Facet Recipe
---

# Facet Recipe

{% include chart-example.html id="facet" %}

## Minimal flow

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ width: 250, height: 230 })
  .createData({ values: cars })
  .createScatterPlot({
    x: "Horsepower",
    y: "Miles_per_Gallon",
    color: "Cylinders"
  })
  .facet({
    field: "Origin",
    columns: 3,
    guides: { legend: "shared" }
  });
```

`cars` is an array of plain row objects containing the encoded fields and
`Origin`. Facet values retain source first-appearance order.

## You must decide

- The direct-source field that partitions rows
- Optional wrapping column count
- Shared or independent scales and shared/omitted legends

## The library infers

- One filtered immutable child program per observed value
- Shared scale domains unless a channel is declared independent
- Parent dimensions from child Canvases, gap, and padding

Use `editFacetHeaders` for repeated header appearance and
`editCompositionLayout` for the parent gap, alignment, or padding.

## Continue

[Facet and composition API](../api/composition.md#repeat-the-current-chart-by-a-field) ·
[Scatterplot recipe](./scatterplot.md)
