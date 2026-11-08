---
layout: default
title: Facet Recipe
---

# Facet Recipe

{% include chart-example.html id="facet" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser project with a canvas whose id is chart, and serve cars.json from the site root.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const cars = await fetch("/cars.json").then(response => response.json());
const values = cars.filter(car => ["Horsepower", "Miles_per_Gallon", "Weight_in_lbs", "Acceleration", "Displacement", "Cylinders"]
  .every(field => Number.isFinite(car[field])));

const program = chart()
  .createCanvas({ width: 250, height: 230 })
  .createData({ values })
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

render(program, document.querySelector("#chart").getContext("2d"));
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
