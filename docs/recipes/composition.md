---
layout: default
title: Composition Recipe
---

# Composition Recipe

{% include chart-example.html id="composition" %}

## Minimal flow

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
