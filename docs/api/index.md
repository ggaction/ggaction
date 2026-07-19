---
layout: default
title: Chart API
---

# Chart API

{% include chart-example.html id="scatterplot" %}

Build a chart from a small set of domain actions. Start with the family that
owns the decision you need to make; follow its focused pages only when the
overview no longer provides enough control.

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./basic-charts/"><strong>Basic charts</strong><span>Create scatter, line, bar, histogram, and heatmap charts from their minimum field decisions.</span></a>
  <a href="./canvas/"><strong>Canvas and data</strong><span>Create the drawing surface, immutable source data, and derived transforms.</span></a>
  <a href="./marks/"><strong>Marks</strong><span>Create point, line, area, bar, and rule layers.</span></a>
  <a href="./encodings/"><strong>Encodings</strong><span>Map fields and constants to position, grouping, and appearance.</span></a>
  <a href="./coordinates/"><strong>Coordinates and scales</strong><span>Use Cartesian or Polar positions and customize their mappings.</span></a>
  <a href="./guides/"><strong>Guides and titles</strong><span>Create axes, grids, legends, and chart titles from existing encodings.</span></a>
  <a href="./composition/"><strong>Program composition</strong><span>Arrange complete chart programs horizontally or vertically and replace stable child slots.</span></a>
  <a href="./rendering/"><strong>Rendering</strong><span>Render the fully materialized program to Browser Canvas or Node PNG.</span></a>
</div>

## Statistical layers

- [Regression](./regression.md)
- [Error bars](./error-bars.md)
- [Error bands](./error-bands.md)
- [Box plots](./box-plots.md)

## Exact action lookup

Use the [complete action reference](../reference/actions.md) when you know an
action name and need its canonical signature. Extension authors should use the
[extension API](../extension/action-authoring.md) rather than depending on
internal trace operations.
