---
layout: default
title: Show Width Along a Series
---

# Show width along a series

Keep position and sample width separate. These two signals have constant vertical
positions while the first ribbon widens and the second narrows.

{% include chart-example.html id="trail" %}

```js
import { chart } from "ggaction";

const signals = chart()
  .createCanvas({ width: 420, height: 240, margin: 40, background: "#ffffff" })
  .createData({ id: "signals", keyField: "id", values: [
    { id: "a0", time: 0, signal: 7, width: 8, channel: "A" },
    { id: "a1", time: 10, signal: 7, width: 32, channel: "A" },
    { id: "b0", time: 0, signal: 3, width: 28, channel: "B" },
    { id: "b1", time: 10, signal: 3, width: 12, channel: "B" }
  ] })
  .createTrailPlot({ id: "trail", x: { field: "time", scale: { domain: [0, 10] } },
    y: { field: "signal", scale: { domain: [0, 10] } }, width: "width", groupBy: "channel",
    color: { field: "channel", scale: { domain: ["A", "B"], range: ["#2563eb", "#0d9488"] } }, guides: false });

const constant = signals.editTrailPlot({ width: 18 });
const selected = signals.selectMarks({ id: "channel-a", target: "trail", field: "channel", op: "eq", value: "A" })
  .highlightMarks({ selection: "channel-a", fill: "#dc2626" });
```

The widths 8 and 32 are logical pixels at the endpoints, with linear width between
them. Resizing the Canvas changes position spacing while retaining those screen
widths. A computed dataset can supply a calculated width field without changing the
original measurements. See [Trail options](../api/trail.md) for curves, missing
samples, Polar paths, labels, clipping and effects.
