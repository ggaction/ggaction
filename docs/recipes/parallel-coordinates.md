---
layout: default
title: Parallel Coordinates Recipe
---

# Parallel Coordinates Recipe

{% include chart-example.html id="parallel-coordinates" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { top: 80, right: 140, bottom: 60, left: 70 } })
  .createData({ values: cars })
  .createParallelCoordinates({
    dimensions: [
      "Miles_per_Gallon",
      "Horsepower",
      "Weight_in_lbs",
      "Acceleration"
    ],
    color: "Origin"
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
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
