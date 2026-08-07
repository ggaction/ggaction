---
layout: default
title: Marks
---

# Marks

{% include chart-example.html id="scatterplot" %}

Marks define the semantic form of a layer. Create a mark first, then connect it
to data through position, grouping, and appearance encodings. The first mark of
each type infers its ID and current dataset when those choices are unambiguous.

## Choose a mark family

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./point/">
    <strong>Point marks</strong>
    <span>Scatterplots, symbols, field-driven shape, size, and opacity.</span>
  </a>
  <a href="./line-area/">
    <strong>Line and area marks</strong>
    <span>Ordered paths, grouped series, ranged areas, and density geometry.</span>
  </a>
  <a href="./bar/">
    <strong>Bar marks</strong>
    <span>Histograms, aggregate bars, grouped layouts, and observed intervals.</span>
  </a>
  <a href="./rule/">
    <strong>Rule marks</strong>
    <span>Full-span references, bounded intervals, and diagonal endpoints.</span>
  </a>
  <a href="#tick-marks">
    <strong>Tick marks</strong>
    <span>Centered fixed-length glyphs for directional and rug-like displays.</span>
  </a>
  <a href="./text/">
    <strong>Text marks</strong>
    <span>Data labels and annotations attached to points, bars, or rules.</span>
  </a>
  <a href="./rect/">
    <strong>Rect marks</strong>
    <span>Discrete heatmap cells and explicit two-dimensional ranges.</span>
  </a>
  <a href="./line-area/#arc-marks">
    <strong>Arc marks</strong>
    <span>Donuts, rose overlays, and radial bars with Polar positions.</span>
  </a>
</div>

## At a glance

| Family | Create | Edit | Initial graphic |
| --- | --- | --- | --- |
| Point | `createPointMark` | `editPointMark`, `jitterPoints`, `removeJitter` | Point collection |
| Line | `createLineMark` | `editLineMark` | Path collection |
| Area | `createAreaMark` | `editAreaMark` | Closed path collection |
| Arc | `createArcMark` | `editArcMark` | Closed sector path collection |
| Bar | `createBarMark` | `editBarMark` | Rect collection |
| Rule | `createRuleMark` | Encoding actions | Line collection |
| Tick | `createTickMark` | `editTickMark` | Centered line collection |
| Text | `createTextMark` | `editTextMark`, `layoutLabels`, `removeLabelLayout` | Text collection |
| Rect | `createRectMark` | `editRectMark` | Rect collection |

Use `removeMark({ target? })` to remove one complete stable mark owner. It also
removes generated composite children, unreferenced generated datasets, owned
legends, and selection/highlight state. Source data and resources shared by
another mark remain:

```javascript
const barsOnly = layeredProgram.removeMark({ target: "points" });
```

Generated children such as regression lines cannot be removed directly;
select their stable owner instead.

Creation establishes semantic ownership but may leave an empty collection.
Concrete graphics appear when the required encodings make the mark renderable.
Later Canvas, scale, grouping, or appearance edits explicitly rematerialize
those graphics.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values: [
    { x: "A", y: "One" },
    { x: "B", y: "Two" }
  ] })
  .createRectMark({ id: "cells" })
  .editRectMark({ target: "cells", fill: "#60a5fa", opacity: 0.8 });
```

## Shared inference

- `data` defaults to the current dataset.
- The first omitted mark ID uses the semantic role: `"point"`, `"line"`,
  `"area"`, `"arc"`, `"bar"`, `"rect"`, `"rule"`, `"tick"`, or `"text"`.
- A second mark of the same type requires an explicit ID.
- A newly layered mark can inherit compatible data, coordinate, x, and y
  encodings from the current layer, or one unique source on the current dataset.
- A grain-preserving aggregate is inherited when both mark recipes support the
  same result. For example, a line added after mean bars inherits that mean.
- Bin, stack, offset, and appearance policies are not copied into a mark recipe
  that does not support the same final item grain.
- Only field-based positions compatible with the new mark and existing scale
  type are inherited. Incompatible channels remain unencoded.
- Passing `data` explicitly starts independent mark assembly and disables
  layered position inheritance.

## Tick marks

`createTickMark` creates a centered fixed-length line glyph for every source
row after both x and y encodings are complete:

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ width: 800, height: 240 })
  .createData({
    id: "cars",
    values: cars.map(car => ({ ...car, Baseline: 0 }))
  })
  .createTickMark({
    id: "ticks",
    length: 14,
    stroke: "#2563eb",
    strokeWidth: 1.5,
    opacity: 0.3
  })
  .encodeX({ target: "ticks", field: "Horsepower" })
  .encodeY({ target: "ticks", field: "Baseline" });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

The default length is `14`, stroke width is `2`, opacity is `1`, and stroke
uses the theme mark color. `editTickMark` partially edits those values.
Incomplete x or y is retained semantically without fabricated geometry.
Fixed-y rug plots use an explicit y field; x-only plot-edge placement is not
inferred.

Add a direct constant or quantitative-field direction with `encodeAngle`.
Zero degrees is vertical/up and positive values rotate clockwise; Tick length
and center remain fixed. `removeEncoding({ channel: "angle" })` restores the
unrotated baseline.

## Related

[Encodings](./encodings.md) · [Statistical layers](./regression.md) ·
[Complete action reference](../reference/actions.md)
