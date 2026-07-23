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
  <a href="./canvas/"><strong>Canvas</strong><span>Create and resize the drawing surface, background, and plot margins.</span></a>
  <a href="./data/"><strong>Data and transforms</strong><span>Create immutable source data, derived datasets, filters, bins, windows, and statistical transforms.</span></a>
  <a href="./marks/"><strong>Marks</strong><span>Create point, line, area, bar, and rule layers.</span></a>
  <a href="./encodings/"><strong>Encodings</strong><span>Map fields and constants to position, grouping, and appearance.</span></a>
  <a href="./coordinates/"><strong>Coordinates</strong><span>Use Cartesian, Polar, or Parallel coordinate systems.</span></a>
  <a href="./scales/"><strong>Scales</strong><span>Control domains, ranges, mapping types, palettes, and missing values.</span></a>
  <a href="./parallel-coordinates/"><strong>Parallel coordinates</strong><span>Compare each source row across an ordered set of dimension-local scales.</span></a>
  <a href="./guides/"><strong>Guides and titles</strong><span>Create axes, grids, legends, and chart titles from existing encodings.</span></a>
  <a href="./composition/"><strong>Program composition</strong><span>Arrange complete chart programs horizontally or vertically and replace stable child slots.</span></a>
  <a href="./rendering/"><strong>Rendering</strong><span>Render the fully materialized program to Browser Canvas, SVG, or Node PNG.</span></a>
</div>

## Statistical and distribution facades

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./regression/"><strong>Regression</strong><span>Add grouped fitted lines and optional confidence bands to encoded observations.</span></a>
  <a href="./error-bars/"><strong>Error bars</strong><span>Show observed values with explicit or derived interval endpoints.</span></a>
  <a href="./error-bands/"><strong>Error bands</strong><span>Show continuous uncertainty ribbons with optional boundaries.</span></a>
  <a href="./box-plots/"><strong>Box plots</strong><span>Summarize quartiles, whiskers, medians, and outliers by category.</span></a>
  <a href="./gradient-plots/"><strong>Gradient plots</strong><span>Compare category distributions as compact density fills.</span></a>
  <a href="./violin-plots/"><strong>Violin plots</strong><span>Compare symmetric or split density shapes by category.</span></a>
</div>

## Exact action lookup

Use the [complete action reference](../reference/actions.md) when you know an
action name and need its canonical signature. Extension authors should use the
[extension API](../extension/action-authoring.md) rather than depending on
internal trace operations.
