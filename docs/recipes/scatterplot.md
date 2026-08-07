---
layout: default
title: Scatterplot Recipe
---

# Scatterplot Recipe

{% include chart-example.html id="scatterplot" %}

## Minimal flow

{% include runnable-recipe-note.html %}

In a browser module, provide a `<canvas id="chart">` element as the rendering
target.

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 140, bottom: 60, left: 70 }
  })
  .createData({ values })
  .createScatterPlot({
    x: "x",
    y: "y",
    color: "group",
    guides: {
      axes: {
        x: { title: { text: "X" } },
        y: { title: { text: "Y" } }
      }
    }
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## Render the same immutable program elsewhere

Do not rebuild the program or invent renderer names. Keep the completed `program`
and select the package entry for the output environment:

| Output | Exact import | Exact call |
| --- | --- | --- |
| Browser Canvas | `import { render } from "ggaction"` | `render(program, context)` |
| SVG | `import { renderToSVG } from "ggaction/svg"` | `renderToSVG(program)` |
| Node PNG | `import { renderToPNG } from "ggaction/png"` | `await renderToPNG(program, { output: "./chart.png", pixelRatio: 2 })` |
| Node PDF | `import { renderToPDF } from "ggaction/pdf"` | `await renderToPDF(program, { output: "./chart.pdf" })` |

See [Rendering](../api/rendering.md) for complete environment-specific examples
and output contracts.

## You must decide

- Dataset values
- Quantitative x and y fields

Add `color: "group"`, `size: "amount"`, or `shape: "category"` to the same
call for field-driven appearance. The default point radius is `3`.

## The library infers

- Current dataset for the facade and current mark for later actions
- Stable internal role IDs for the first dataset and point mark
- Quantitative linear scales named `x` and `y`
- The `main` Cartesian coordinate
- Plot-bound ranges, axes, and horizontal grid

Point color, shape, and size legends are created when those encodings are
present. Multiple compatible marks or scales require explicit `target` or
scale IDs.

## Continue

[Scatterplot tutorial](../tutorials/scatterplot.md) ·
[Basic Charts](../api/basic-charts.md#createscatterplot) ·
[Quantitative positions](../api/position/quantitative.md) ·
[Constant appearance](../api/appearance.md)
