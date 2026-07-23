---
layout: default
title: Rendering
---

# Rendering

{% include chart-example.html id="scatterplot" %}

Render one fully materialized `ChartProgram` to Browser Canvas, a browser-safe
SVG string, a Node PNG file, or a single-page vector PDF. Choose the target
based on where the output runs and how it will be consumed.

## At a glance

| Target | Environment | Shortest call | Use when |
| --- | --- | --- | --- |
| Browser Canvas | Browser | `render(program, context)` | Drawing into an existing interactive page |
| SVG | Browser or Node.js 20+ | `renderToSVG(program)` | Embedding or saving scalable markup |
| Node PNG | Node.js 20+ | `renderToPNG(program, { output })` | Producing a raster file at an explicit pixel density |
| Node PDF | Node.js 20+ | `renderToPDF(program, { output })` | Producing a selectable, single-page vector document |

Rendering consumes a completed program's `graphicSpec`. It does not read
datasets, semantic encodings, context, or trace to infer missing output.

## Complete example program

Every rendering fragment below continues from this complete program:

```javascript
import { chart } from "ggaction";

const observations = [
  { displacement: 97, acceleration: 14.5, origin: "Japan" },
  { displacement: 140, acceleration: 15.5, origin: "USA" },
  { displacement: 86, acceleration: 16.4, origin: "Japan" }
];

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 130, bottom: 60, left: 70 }
  })
  .createData({ values: observations })
  .createScatterPlot({
    x: "displacement",
    y: "acceleration",
    color: "origin",
    shape: "origin"
  });
```

## Browser Canvas

In a browser page containing `<canvas id="chart"></canvas>`, render with its 2D
context:

```javascript
import { render } from "ggaction";

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

The optional `pixelRatio` increases physical output density while retaining
logical chart coordinates. For an HTML Canvas, ggaction also preserves the
logical CSS width and height while enlarging the backing store:

```javascript
render(program, context, { pixelRatio: 2 });
```

## SVG output

The browser-safe SVG entry returns a complete SVG document string without
reading the DOM or filesystem. Assign it to a trusted application container or
save the returned string with the file API available in your environment.

```javascript
import { renderToSVG } from "ggaction/svg";

const svg = renderToSVG(program, {
  title: "Quarterly revenue",
  description: "Revenue by quarter"
});
```

The root `width`, `height`, and `viewBox` use the program's logical Canvas
dimensions. Optional `title` and `description` strings become escaped
`<title>` and `<desc>` children. Repeated calls with the same program and
options return the same string.

For example, a browser application can place the generated document in an
existing output container:

```javascript
document.querySelector("#svg-output").innerHTML = svg;
```

## PNG output

The Node-only entry point writes a completed program directly to PNG.

```javascript
import { renderToPNG } from "ggaction/png";

const result = await renderToPNG(program, {
  output: "./output/chart.png",
  pixelRatio: 2
});
```

Missing output directories are created. A logical 640×400 chart at ratio 2
produces a 1280×800 image. The result contains the absolute `output`, physical
`width` and `height`, `pixelRatio`, and byte count.

## PDF output

The Node-only PDF entry writes one completed chart as one vector PDF page:

```javascript
import { renderToPDF } from "ggaction/pdf";

const result = await renderToPDF(program, {
  output: "./output/chart.pdf",
  metadata: {
    title: "Quarterly revenue",
    author: "Example",
    subject: "Revenue by quarter",
    keywords: ["revenue", "quarterly"]
  }
});
```

Missing output directories are created. The page width and height in PDF points
use the program's logical Canvas dimensions, and the frozen result contains the
absolute `output`, logical `width` and `height`, `pages: 1`, and byte count.
Metadata is optional; it accepts only non-empty `title`, `author`, and `subject`
strings plus an array of non-empty `keywords`.

Text remains selectable/searchable PDF text. Paths, strokes, fills, clipping,
opacity, dashes, and linear gradients remain vector output; the adapter does not
rasterize the chart or accept `pixelRatio`.

The current renderers support concrete canvas, collection, circle, rect, line,
text, and `M/L/C/Z` command-path graphics. Path and line strokes may use concrete
dash arrays. They validate values with the same concrete property contract used
by `editGraphics`.

Rect and closed-path fills may be solid strings or item-local linear-gradient
paint values. Gradient endpoints are normalized against the final fill geometry;
path stroke width does not expand that coordinate box. The renderer creates the
Canvas gradient only for the current draw call and never stores backend objects
in `graphicSpec`.

Line curve actions resolve interpolation into those commands before rendering.
Canvas, SVG, and PDF execute `L` and cubic `C` segments but do not read curve
names or calculate control points.

## Errors and limitations

Rendering never reads `semanticSpec`. Every drawable property must already be
concrete. Canvas/PNG `pixelRatio` must be a positive finite number; SVG and PDF
are vector output and do not accept it. PDF options and metadata use closed key
sets, and invalid input is rejected before writing a new file.

## Related

[Canvas](./canvas.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Primitive extension API](../extension/primitives.md)
