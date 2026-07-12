---
layout: default
title: Rendering API
---

[Documentation home](../index.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md)

# Rendering API

Rendering consumes a completed program's `graphicSpec`. It does not read
datasets, semantic encodings, context, or trace to infer missing output.

## Browser Canvas

```javascript
import { render } from "ggaction";

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

The optional `pixelRatio` increases physical output density while retaining
logical chart coordinates:

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

The current renderer supports concrete canvas, circle, line, and text graphics.
