---
layout: default
title: Parallel Coordinates Recipe
---

# Parallel Coordinates Recipe

{% include chart-example.html id="parallel-coordinates" lead=true %}

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
  .createCanvas({ margin: { top: 80, right: 140, bottom: 60, left: 70 } })
  .createData({ values })
  .createParallelCoordinates({
    dimensions: [
      "Miles_per_Gallon",
      "Horsepower",
      "Weight_in_lbs",
      "Acceleration"
    ],
    color: "Origin"
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

`cars` is an array of plain row objects. Every eligible row becomes one open
path across the ordered dimensions.

## You must decide

- At least two unique dimension fields in axis order
- An optional unique row key
- Whether missing values break a path, drop the row, or raise an error

## The library infers

- One Parallel coordinate and one local scale per dimension
- Quantitative or ordinal dimension types from unambiguous values
- Dimension axes and an applicable categorical legend

## Continue

[Parallel Coordinates API](../api/parallel-coordinates.md) ·
[Series encodings](../api/series-encodings.md)
