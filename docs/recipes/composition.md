---
layout: default
title: Composition Recipe
---

# Composition Recipe

{% include chart-example.html id="composition" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, hconcat, render } from "ggaction";

const points = chart()
  .createCanvas({
    width: 360,
    height: 220,
    margin: { top: 24, right: 120, bottom: 48, left: 54 }
  })
  .createData({ values: values.filter(row => row.kind === "point") })
  .createScatterPlot({
    x: "x",
    y: "y",
    color: { field: "group", fieldType: "nominal" }
  });

const bars = chart()
  .createCanvas({
    width: 300,
    height: 220,
    margin: { top: 24, right: 24, bottom: 48, left: 54 }
  })
  .createData({ values: values.filter(row => row.kind === "bar") })
  .createBarPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" }
  });

const replacement = chart()
  .createCanvas({
    width: 300,
    height: 220,
    margin: { top: 24, right: 24, bottom: 48, left: 54 }
  })
  .createData({ values: values.filter(row => row.kind === "bar") })
  .createBarPlot({
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" },
    color: { field: "category", fieldType: "nominal" },
    guides: { axes: { x: {}, y: {} }, legend: false }
  });

const program = hconcat({
  programs: [
    { id: "main", program: points },
    { id: "detail", program: bars }
  ],
  gap: 20
})
  .editCompositionLayout({ gap: 24, align: "center" })
  .replaceCompositionChild({ target: "detail", program: replacement });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

`values` is an array of plain row objects containing the named fields, a
`kind` value of `"point"` or `"bar"`, and a `group` value for point colors.
Every child and replacement must already have one complete materialized Canvas.

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
earlier composition. A rose chart is built from the primitive
`createArcMark → encodeTheta → encodeR → encodeColor` flow shown in the
[rose chart recipe](./rose-chart.md); there is no `createRoseChart` action.
Composition does not repair a child's guide layout. Keep enough explicit margin
on a child that retains a meaningful legend, as the point child does above, or
set `guides.legend: false` when the legend is unnecessary or redundant, as the
replacement child does. Build each child successfully before composing it.

## Continue

[Composition API](../api/composition.md) ·
[ChartProgram state](../concepts/chart-program.md)
