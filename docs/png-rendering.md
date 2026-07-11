---
layout: default
title: PNG Rendering
---

[Documentation home](./index.md) · [Core concepts](./core-concepts.md)

# PNG Rendering

The Node-only `ggaction/png` entry point renders a completed program directly
to a PNG file without opening a browser.

```javascript
import { renderToPNG } from "ggaction/png";

const result = await renderToPNG(program, {
  output: "./output/chart.png",
  pixelRatio: 2
});

console.log(result.output, result.width, result.height, result.bytes);
```

`renderToPNG` creates missing output directories and uses the same Canvas
renderer as browser output. It therefore reads only the program's fully
materialized `graphicSpec`.

`pixelRatio` controls output density without changing the logical dimensions or
coordinates stored in `graphicSpec`. For example, a 640×400 chart rendered at
`pixelRatio: 2` produces a 1280×800 PNG. The default is `1`; use `2` for crisp
screen output or `3` for higher-resolution export. Returned `width` and
`height` report the physical PNG dimensions.

## Render test programs

The repository keeps user-authored programs under `test/programs/` and their
PNG export tests under `test/render/`. Generate all test images with:

```bash
npm run test:render
```

Generated files are written to the ignored `test/output/` directory. Each
render test also verifies the PNG signature and expected image dimensions.
