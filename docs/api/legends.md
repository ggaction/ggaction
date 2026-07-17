---
layout: default
title: Legends
---

# Legends

{% include chart-example.html id="density" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createLegend` | `createLegend()` | Current/unique compatible mark; right position | Categorical, size, gradient, interval, or opacity guide |
| `editLegend` | `editLegend({ position: "left" })` | Unique existing legend; omitted properties retained | Rematerialized layout and appearance |
| Focused edits | `editLegendLabels({ fontSize: 11 })` | Same target inference as `editLegend` | One legend component rematerialized |
| `removeLegend` | `removeLegend({ target: "points" })` | Existing legend owner | All owned legend blocks removed |

Legends are inferred from final mark encodings and materialized as concrete
graphics. Start with the family that matches the encoded channel and use the
editing page when changing an existing guide.

## Focused legend families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./legends/categorical/"><strong>Categorical legends</strong><span>Create categorical, size, and interval guides and control their layout.</span></a>
  <a href="./legends/continuous/"><strong>Continuous legends</strong><span>Gradient color and sampled opacity guides.</span></a>
  <a href="./legends/composite/"><strong>Composite symbols</strong><span>Layered line, point, and swatch recipes plus optional borders.</span></a>
  <a href="./legends/editing/"><strong>Edit and remove</strong><span>Atomic component edits, rematerialization, trace, and removal.</span></a>
</div>

## Errors and limitations

Continuous color is currently limited to point marks, and field opacity is
limited to quantitative point fields. Interactive legends are unsupported.
Combined point-series and quantitative-size legends require a right or left
side position so both blocks remain in one vertical stack. A left block must
fit outside any left y-axis guides; use sufficient margin and offset.
Right-side layout requires sufficient right margin; bottom layout requires
sufficient bottom margin; top layout requires enough top margin for its title,
item grid, offset, and optional border. The library reports a layout error
instead of resizing the Canvas or dropping symbol layers.

## Related

[Guides](./guides.md) · [Series encodings](./series-encodings.md) ·
[Canvas](./canvas.md) · [Troubleshooting](../troubleshooting.md)

