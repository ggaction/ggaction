---
layout: default
title: Rendering
---

# Rendering

{% include chart-example.html id="scatterplot" %}

## At a glance

| Target | Shortest call | Density | Result |
| --- | --- | --- | --- |
| Browser Canvas | `render(program, context)` | Device/Canvas context | Draws concrete `graphicSpec` |
| Node PNG | `renderToPNG(program, { output })` | `pixelRatio`, default `1` | PNG file and physical dimensions |

Rendering consumes a completed program's `graphicSpec`. It does not read
datasets, semantic encodings, context, or trace to infer missing output.

## Browser Canvas

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

The current renderer supports concrete canvas, collection, circle, rect, line,
text, and `M/L/C/Z` command-path graphics. Path and line strokes may use concrete
dash arrays. The renderer validates values with the same concrete property
contract used by `editGraphics`.

Rect and closed-path fills may be solid strings or item-local linear-gradient
paint values. Gradient endpoints are normalized against the final fill geometry;
path stroke width does not expand that coordinate box. The renderer creates the
Canvas gradient only for the current draw call and never stores backend objects
in `graphicSpec`.

Line curve actions resolve interpolation into those commands before rendering.
The Canvas renderer executes `L` and cubic `C` segments but does not read curve
names or calculate control points.

## Errors and limitations

Rendering never reads `semanticSpec`. Every drawable property must already be
concrete, and `pixelRatio` must be a positive finite number.

## Related

[Canvas](./canvas.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Primitive extension API](../extension/primitives.md)
