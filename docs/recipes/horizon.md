---
layout: default
title: Horizon Chart Recipe
---

# Horizon Chart Recipe

{% include chart-example.html id="horizon" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values })
  .createAreaMark({ curve: "monotone" })
  .encodeHorizon({ x: "time", y: "value" })
  .createGuides();

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## You must decide

- The ordered quantitative or temporal x field
- The quantitative y field
- A baseline when zero is not meaningful

## The library infers

- The current area target and source dataset when unambiguous
- Three bands, shared automatic extent, and blue/red palettes
- Immutable namespaced output data and ordinary closed path graphics
- An x axis and x grid, without a misleading folded y axis or band legend

Use `editHorizon({ bands, baseline, extent, palette })` to create a revised
immutable result. Use `resolve: "independent"` only when group-local amplitude
comparison is intentional.

## Continue

[Horizon tutorial](../tutorials/horizon.md) ·
[Encodings](../api/encodings.md#atomic-horizon) ·
[Area marks](../api/marks/line-area.md)
