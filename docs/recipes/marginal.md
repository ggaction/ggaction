---
layout: default
title: Marginal Distribution Recipe
---

# Marginal distributions beside a scatterplot

{% include chart-example.html id="marginal" lead=true %}

Keep the scatterplot and both marginal distributions on the same observations.
This recipe combines three ordinary charts with `hconcat` and `vconcat`; it does
not require a separate chart constructor.

## Prerequisites

Use the [Getting Started browser module setup](../getting-started.md) with a
`<canvas id="chart"></canvas>` element.

## Complete program

Run this entry in the [example directory](https://github.com/ggaction/ggaction/tree/{{ site.data.provenance.exampleSourceRef }}/examples/marginal/)
after installing ggaction. Its [program.js](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/marginal/program.js)
contains the public action chain; `fixture.js` declares the rows, boundaries,
domains and panel dimensions. Replace the source import in that module with
`import { chart, hconcat, vconcat } from "ggaction"` for an installed application.

```javascript
import { render } from "ggaction";
import { createMarginal } from "./program.js";

const program = createMarginal();
render(program, document.querySelector("#chart").getContext("2d"));
```

The shared immutable source has an explicit `id` key. `createScatterPlot` uses
`x` and `y`. Each `createBinData({members:true})` keeps bin membership;
`createRectMark` with `encodeXRange` and `encodeYRange` draws both horizontal and
vertical count distributions. The same dimension domain and pixel range appear
in the scatterplot and its corresponding marginal panel. Count uses its own
scale: counts and observed values are different quantities.

## Decide the domains and membership

Choose explicit `xDomain`, `yDomain`, `xBins`, `yBins` and `countDomain` when
calling the example function with your rows. Keep bin endpoints inside the
matching observed-value domain and set the count domain to contain the largest
bin. The example includes repeated coordinates with distinct row keys. Repeated
coordinates remain separate observations; duplicate explicit keys are rejected.
Zero is a valid observation. An empty array has no inferred field schema and
cannot create this recipe's bins.

The linked [selection example](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/marginal/selection.js)
uses public `getMarkItems` to read one bin's exact source rows, then calls
`highlightMarks` with the same row indices in each explicitly named child.
It checks current logical source identity and revision before linking. It never
uses a displayed bin label as row identity.

## Revise and resize together

The named paths are `x`, `lower/center` and `lower/y`. Apply `reviseData` to all
three observation sources with the same replacement rows before linking again;
a partial update is rejected by the example selection helper. Stored selections
follow typed row keys through reordering. Revise the matching domain and bin
options together when changing the range of observations.

For resizing, set the same width on `x` and `lower/center`, and the same height
on `lower/center` and `lower/y`. Their corresponding margins keep the plot ranges
aligned. A composition edit addresses children explicitly; it does not silently
synchronize unrelated panels.

Canvas, SVG, PNG and PDF consume the resulting chart. Both editable and
graphic-only snapshots retain the finished output without loading the source.

[Composition](../api/composition.md) · [Inspect marks](inspect-chart.md) ·
[Histogram](histogram.md)
