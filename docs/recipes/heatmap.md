---
layout: default
title: Heatmap Recipe
---

# Heatmap Recipe

{% include chart-example.html id="heatmap" %}

## Pre-gridded flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ margin: { right: 120 } })
  .createData({ values })
  .createHeatmap({
    x: { field: "column", fieldType: "ordinal" },
    y: { field: "row", fieldType: "nominal" },
    color: {
      field: "value",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    }
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## Raw-row binned flow

{% include runnable-recipe-note.html %}

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ margin: { right: 120 } })
  .createData({ values: observations })
  .createHeatmap({
    x: "weight",
    y: "economy",
    bin: { bins: { x: 10, y: 8 } },
    color: { scale: { palette: "blues" } }
  });
```

This mode derives rectangular x/y bounds and a count for each cell. It emits
the complete grid by default, including zero-count cells.

## You must decide

- Whether rows are already at one-row-per-cell grain or require `bin`
- The two position fields
- The color field for pre-gridded rows; binned mode owns its generated count
- Optional bin counts or explicit extents when the defaults are not appropriate

## The library infers

- Band scales for the two discrete positions
- One concrete rectangle per valid observed row
- A categorical or continuous color scale and matching legend
- Cartesian axes and horizontal grid

In binned mode, the library instead infers quantitative position scales from
the resolved bin extents, a continuous count scale, source-facing axis titles,
and a `Count` legend. It disables separate chart grid lines unless requested.

Use `rect: { opacity, stroke, strokeWidth }` for cell appearance. Cell fill is
owned by the required color encoding. To show values, chain a text layer after
the heatmap:

```javascript
const labeled = program
  .createTextMark({ align: "center", baseline: "middle" })
  .encodeText({ field: "value", format: ".0f" });
```

## Continue

[Basic Charts](../api/basic-charts.md#createheatmap) ·
[Rectangular 2D bins](../api/data/bin2d.md) ·
[Rect marks](../api/marks/rect.md) ·
[Continuous color scales](../api/scales/continuous-color.md)
