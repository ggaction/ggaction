---
layout: default
title: Legends
---

# Legends

{% include chart-example.html id="density" %}

<div class="docs-concept-flow" role="img" aria-label="Legend creation reads resolved encodings and scales, chooses a symbol recipe, and writes concrete guide graphics">
  <span><code>encoding + scale</code><strong>Guide meaning</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>symbol recipe</code><strong>Categorical, gradient, or composite</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>rect · line · text</code><strong>Concrete guide graphics</strong></span>
</div>

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createLegend` | `createLegend()` | Current/unique compatible mark; right position | Categorical, size, stroke-width, gradient, interval, or opacity guide |
| `editLegend` | `editLegend({ position: "left" })` | Unique existing legend; omitted properties retained | Rematerialized layout and appearance |
| Focused edits | `editLegendLabels({ fontSize: 11 })` | Same target inference as `editLegend` | One legend component rematerialized |
| `removeLegend` | `removeLegend({ channels: ["size"] })` | Existing legend owner; omitted channels remove all | Selected complete blocks removed |

Legends are inferred from final mark encodings and materialized as concrete
graphics. Start with the family that matches the encoded channel and use the
editing page when changing an existing guide.

## Minimal lifecycle flow

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas({ width: 760, height: 620, margin: { top: 140, right: 70, bottom: 60, left: 70 } })
  .createData({ values: [
    { x: 1, y: 2, group: "A", confidence: 0.4 },
    { x: 2, y: 4, group: "B", confidence: 0.9 }
  ] })
  .createPointMark({ id: "points" })
  .encodeX({ target: "points", field: "x" })
  .encodeY({ target: "points", field: "y" })
  .encodeColor({ target: "points", field: "group", fieldType: "nominal" })
  .encodeOpacity({ target: "points", field: "confidence" })
  .createGuides({ axes: { x: {}, y: {} }, legend: false })
  .createLegend({ target: "points", channels: ["color"], position: "top", titlePosition: "left" })
  .createLegend({ target: "points", channels: ["opacity"], position: "top", titlePosition: "left" })
  .editLegendLayout({ target: "points", position: "top", offset: 18, itemGap: 12 });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

## Bottom multi-legend row

Bottom legends need three separate layout decisions: `offset` moves the row
away from the plot and its x-axis title, the Canvas bottom margin contains the
row, and the number and width of items determine whether every block fits on
one row. Increasing the margin alone does not increase the separation or the
available row width. Give every legend in one row the same placement options
and bound wide sampled blocks explicitly:

```javascript
import { chart } from "ggaction";

const bottomRow = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 30, bottom: 120, left: 70 }
  })
  .createData({ values: [
    { weight: 2200, mileage: 34, origin: "USA", power: 75 },
    { weight: 2600, mileage: 29, origin: "Japan", power: 95 },
    { weight: 3100, mileage: 24, origin: "Europe", power: 130 }
  ] })
  .createPointMark({ id: "points" })
  .encodeX({ target: "points", field: "weight" })
  .encodeY({ target: "points", field: "mileage" })
  .encodeColor({ target: "points", field: "origin", fieldType: "nominal" })
  .encodeOpacity({ target: "points", field: "power" })
  .createGuides({ axes: { x: {}, y: {} }, legend: false })
  .createLegend({
    target: "points",
    channels: ["color"],
    position: "bottom",
    titlePosition: "left",
    columns: 3,
    offset: 69,
    itemGap: 12
  })
  .createLegend({
    target: "points",
    channels: ["opacity"],
    position: "bottom",
    titlePosition: "left",
    count: 3,
    offset: 69,
    itemGap: 12
  });
```

The explicit channel lists create two blocks instead of one inferred guide.
Matching placement options keep their titles, symbols, label gaps, and lane
baseline aligned from left to right. Actions execute immediately, so put the
safe bottom placement on each `createLegend` call. A later
`editLegendLayout` call cannot repair an earlier `createLegend` call that has
already failed because it overlapped the x-axis title. `columns: 3` and
`count: 3` also keep this 640-pixel example in one row; wider labels or more
samples may require a wider plot.

## Supported legend families

<!-- action-capabilities:legends:start -->
| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | color, shape, strokeDash, or compatible composites |
| Continuous gradient | point, aggregate bar, rect | sequential color |
| Discretized interval | point | quantize, quantile, or threshold color |
| Sampled | point, line, rule | field opacity, size, or strokeWidth |
<!-- action-capabilities:legends:end -->

## Focused legend families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/legends/categorical/' | relative_url }}"><strong>Categorical legends</strong><span>Create categorical, size, and interval guides and control their layout.</span></a>
  <a href="{{ '/api/legends/continuous/' | relative_url }}"><strong>Continuous legends</strong><span>Gradient color and sampled opacity guides.</span></a>
  <a href="{{ '/api/legends/composite/' | relative_url }}"><strong>Composite symbols</strong><span>Layered line, point, and swatch recipes plus optional borders.</span></a>
  <a href="{{ '/api/legends/editing/' | relative_url }}"><strong>Edit and remove</strong><span>Atomic component edits, rematerialization, trace, and removal.</span></a>
</div>

## Errors and limitations

Continuous color legends support point, aggregate-bar, and rect marks. Field
opacity and discretized continuous legends remain point-only. Interactive legends are unsupported.
Combined point-series and quantitative-size legends require a right or left
side position so both blocks remain in one vertical stack. A left block must
fit outside any left y-axis guides; use sufficient margin and offset.
Standalone stroke-width legends use the right side. `editLegend` supports
`title`, `count`, `labels`, and `titleStyle`; layout, symbol, border, gradient,
and item-gap edits remain unsupported for that sampled block. Edit its
quantitative mapping through `editScale`.
Right-side layout requires sufficient right margin. Bottom layout requires an
offset that clears x-axis guides plus sufficient bottom margin for the legend
block itself. Top layout requires enough top margin for its title,
item grid, offset, and optional border. The library reports a layout error
instead of resizing the Canvas or dropping symbol layers.

## Related

[Guides](./guides.md) · [Series encodings](./series-encodings.md) ·
[Canvas](./canvas.md) · [Troubleshooting](../troubleshooting.md)
