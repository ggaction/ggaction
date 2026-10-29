---
layout: default
title: Fit Labels Inside a Fixed Canvas
---

# Fit labels inside a fixed Canvas

Use a fixed outer size when a chart must fit an existing panel. The Canvas
policy reserves space for guides, and the label policy decides how much text
can fit. This example wraps four category labels without changing the data,
ticks, font size or outer dimensions.

{% include chart-example.html id="responsive-guides" %}

```javascript
import { chart } from "ggaction";

const responsiveRows = ["A long alpha category", "A long beta category", "A long gamma category", "A long delta category"]
  .map((x, index) => ({ x, y: index + 1 }));

const program = chart()
  .createCanvas({ width: 400, height: 320, margin: 20, responsive: {} })
  .createData({ values: responsiveRows })
  .createBarPlot({ x: "x", y: "y", guides: {
    axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} },
    legend: false
  } });
```

The four category labels become eight text lines. The plot remains at least
160 × 120 logical pixels. A wider immutable copy, `program.editCanvas({ width:
800 })`, returns to unwrapped labels when they fit. The original remains 400 ×
320. No browser resize observer is installed; the host explicitly requests a
new logical width.

For dense categories, the policy tries wrapping, every second label, then
−45° and −90° rotation. A failed solve reports `layout-unsatisfied` and required
bounds. Choose a larger Canvas or different declared policy and retry. See
[Canvas](../api/canvas.md) and [Cartesian labels](../api/axes/complete.md#responsive-labels)
for exact options. [Inspection](../inspection.md) explains the retained decision.
