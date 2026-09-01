---
layout: default
title: Responsive Charts
---

# Responsive Charts

A ggaction `ChartProgram` has concrete logical Canvas dimensions. Responsive
behavior belongs to the host: measure a container, rebuild the immutable
program with the new width and height, then render again. CSS-only stretching
changes displayed pixels without recomputing scales, marks, guides, wrapping,
or collision layout and is therefore not chart layout.

## Complete browser pattern

```javascript
import { chart, render } from "ggaction";

const rows = [
  { horsepower: 130, mpg: 18 },
  { horsepower: 165, mpg: 15 },
  { horsepower: 97, mpg: 24 }
];
const host = document.querySelector("#chart-host");
const canvas = host.querySelector("canvas");
const context = canvas.getContext("2d");

const base = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 60, left: 70 }
  })
  .createData({ values: rows })
  .createScatterPlot({ x: "horsepower", y: "mpg" });

let lastWidth = 0;
function draw() {
  const width = Math.max(320, Math.floor(host.clientWidth));
  if (width === lastWidth) return;
  lastWidth = width;
  const height = Math.round(width * 0.625);
  const program = base.editCanvas({ width, height });
  render(program, context, { pixelRatio: window.devicePixelRatio || 1 });
}

const observer = new ResizeObserver(draw);
observer.observe(host);
draw();

// Call observer.disconnect() when the owning view is unmounted.
```

`editCanvas` returns a new program and rematerializes connected chart
resources. The unchanged `base` remains available, so repeated resize events
do not accumulate revisions or mutate caller-owned rows.

## Size and density are separate

Logical `width` and `height` determine chart layout. `pixelRatio` determines
the Canvas or PNG backing density. A high-density display commonly uses
`window.devicePixelRatio`; a server-generated PNG should use an explicit,
product-approved ratio.

Keep the ratio finite and positive. Canvas and PNG limit each physical side to
32,767 pixels and the complete allocation to 16,777,216 pixels. A large
logical chart multiplied by a large ratio can exceed those limits even when
the CSS box looks reasonable.

SVG retains logical dimensions and a matching `viewBox`. Make the embedded SVG
responsive with host CSS only when preserving its aspect ratio is intended;
rebuild the program when labels, margins, or mark layout must adapt to a new
logical width.

## Resize policy

- Choose a minimum width that keeps labels and controls usable.
- Decide whether height follows a fixed aspect ratio, breakpoints, or measured
  content. Do not leave it implicit.
- Coalesce duplicate measurements. Add animation-frame throttling only if
  profiling shows resize bursts are expensive.
- Rebuild from a stable base program or from source rows. Do not append edits
  indefinitely to model a live viewport.
- Disconnect observers and discard stale async results when the host view is
  removed.

## Related

[Canvas](./api/canvas.md) · [Performance](./performance.md) ·
[Data updates](./data-updates.md) · [Rendering](./api/rendering.md)
