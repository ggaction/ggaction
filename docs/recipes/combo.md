---
layout: default
title: Combo Chart Recipe
---

# Combine bars and a linked line

{% include chart-example.html id="linked-overlay" lead=true %}

Use `createOverlay` when a line should follow the endpoints of existing bars.
The bars and line share the same meaning, scale and final positions. This is a
composition of public actions, with no dedicated Combo constructor.

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md) with a
`<canvas id="chart"></canvas>` element.

## Complete program

Run this entry beside the canonical [program.js](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/linked-overlay/program.js)
after installing ggaction and replacing its source import with
`import { chart } from "ggaction"`.

```javascript
import { render } from "ggaction";
import { createLinkedOverlay } from "./program.js";

const program = createLinkedOverlay();
render(program, document.querySelector("#chart").getContext("2d"));
```

The example creates a Bar mark, encodes `month` and aggregated `sales`, and
creates its guides. `createOverlay({id:"trend",source:"bars"})` follows the final
bar endpoints. `encodeColor` gives the line its own appearance while preserving
the source positions.

## Keep one quantitative Y owner

The line shares the bars' Y scale and guide. It does not add a second vertical
axis. A series measured in a different unit belongs in a separate panel with
an explicit scale, rather than an overlapping second Y scale. A mirrored or
hidden axis does not make different units comparable.

## Revise and inspect

`reviseData` on the source recomputes both the bars and their linked line.
`editCanvas` recomputes both against the same plot range. Select and highlight
the bars by their source rows; the line retains its declared aggregate path
identity. Use `getMarkItems` to inspect those actual logical items.

Canvas, SVG, PNG and PDF read the same finished chart. Editable snapshots retain
the source relation, and graphic snapshots preserve the final line and bars for
offline output.

[Composition operations](composition.md) · [Bar chart](bar-chart.md) ·
[Marginal panels](marginal.md) · [Bullet comparison](bullet.md)
