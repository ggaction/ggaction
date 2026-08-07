---
layout: default
title: Error Band Recipe
---

# Error Band Recipe

{% include chart-example.html id="error-band" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { right: 140 } })
  .createData({ values })
  .createErrorBand({
    x: { field: "time", fieldType: "temporal" },
    y: { field: "value" },
    groupBy: "series"
  })
  .encodeColor({ target: "errorBand", field: "series" })
  .createGuides();

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- Quantitative or temporal independent-position field
- Quantitative interval field
- Optional grouping field

## The library infers

- Current dataset and Cartesian coordinate
- Mean with a two-sided 95% Student-t confidence interval
- One immutable summary row per independent-position and group cell
- Vertical y/y2 or horizontal x/x2 area orientation
- Linear area paths, translucent fill, scales, axes, and applicable grid

When one compatible layer is already encoded, omitted data, coordinate,
position fields, scales, and explicit grouping are reused when the interval
axis is unambiguous.

## Continue

[Error-band tutorial](../tutorials/error-band.md) ·
[Error-band API](../api/error-bands.md)
