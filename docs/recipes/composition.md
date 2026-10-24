---
layout: default
title: Composition Recipe
---

# Composition Recipe

## Follow a chart's results with an overlay

`createOverlay` adds a separately editable layer that follows another mark's final results.
For example, its line follows each bar's center and value endpoint after aggregation, binning,
grouping or stacking. Source edits update the overlay automatically through that explicit dependency.

```javascript
const layered = bars
  .createOverlay({ id: "trend", source: "bars", type: "line" })
  .encodeColor({ target: "trend", value: "#1d344c" });
```

Use `type: "point"` for points at those same result positions. The default `series: "source"`
keeps each source group; `series: "total"` follows the outer endpoints of stacked bars.
To connect scatterplot results, supply an explicit `orderBy: "x"` or `"y"`.
Style the new layer with the usual `encodeColor`, `encodeSize`, `encodeStroke` and mark editors.
Edit the source to change linked positions. `editOverlay({ target: "trend", follow: false })`
freezes the current geometry as an independent normalized plot snapshot; further source edits
no longer move it. Independent axis scales require explicit axis selection when creating guides.

The [runnable overlay example](https://ggaction.github.io/ggaction/examples/linked-overlay/) uses the same public program as
the primitive-equivalence and rendering tests.

{% include chart-example.html id="composition" lead=true %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, hconcat } from "ggaction";

const points = chart()
  .createCanvas({ width: 280, height: 220 })
  .createData({ values: pointRows })
  .createScatterPlot({ x: "x", y: "y" });

const bars = chart()
  .createCanvas({ width: 260, height: 220 })
  .createData({ values: barRows })
  .createBarPlot({ x: "category", y: "value" });

const dashboard = hconcat({
  programs: [
    { id: "main", program: points },
    { id: "detail", program: bars }
  ],
  gap: 20
});
```

`pointRows` and `barRows` are arrays of plain row objects containing the named
fields. Every child must already have one complete materialized Canvas.

## You must decide

- Horizontal `hconcat` or vertical `vconcat`
- The ordered child programs
- Stable child IDs only when later replacement must address a slot

## The library infers

- Parent Canvas dimensions from the child Canvases, gap, and padding
- A white parent background and independent child clipping
- Deterministic namespaces for every child graphic

Use `editCompositionLayout` to revise gap, alignment, or padding. Use
`replaceCompositionChild` to replace one named slot without mutating the
earlier composition.

## Continue

[Composition API](../api/composition.md) ·
[ChartProgram state](../concepts/chart-program.md)
