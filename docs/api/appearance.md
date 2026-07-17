---
layout: default
title: Appearance Encodings
---

# Appearance Encodings

{% include chart-example.html id="regression" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeRadius` / `encodePointRadius` | `encodePointRadius({ value: 3 })` | Current point mark | Concrete point glyph radius |
| `encodeSize` | `encodeSize({ field: "Acceleration" })` | Current point; linear scale; area range `[24, 196]` | Semantic size and concrete equal-area symbols |
| `encodeShape` | `encodeShape({ field: "Origin" })` | Current point; 12-value ordinal shape range | Semantic shape and mixed concrete symbols |
| `encodeOpacity` | `encodeOpacity({ value: 0.27 })` | Current point mark | Constant concrete opacity |
| `encodeOpacity` | `encodeOpacity({ field: "Acceleration" })` | Current point; linear scale; range `[0.2, 1]` | Semantic field opacity and concrete values |
| `encodeStroke` | `encodeStroke({ value: "#334155" })` | Current rule mark | Constant concrete line color |
| `encodeStrokeWidth` | `encodeStrokeWidth({ value: 3 })` | Current rule mark | Constant concrete line width |
| `encodeBarWidth` | `encodeBarWidth()` | Current aggregate bar; first assignment uses band `0.72` | Concrete rectangles |
| `selectMarks` | `selectMarks({ field: "Horsepower", op: "max" })` | Current or unique mark; deterministic selection ID | Reusable semantic final-item selection |
| `highlightMarks` | `highlightMarks({ select: { field: "Horsepower", op: "max" } })` | Current point/bar/path/rule; red accent; selected-last | Concrete selected-item emphasis |

Appearance actions change final mark style without changing position. Use the
focused pages below for selection, point appearance, and mark-specific style.

## Focused appearance families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="./appearance/selection-and-highlighting/"><strong>Selection and highlighting</strong><span>Select final graphical items and apply durable emphasis.</span></a>
  <a href="./appearance/point/"><strong>Point appearance</strong><span>Radius, size, shape, and opacity encodings.</span></a>
  <a href="./appearance/mark-style/"><strong>Mark style</strong><span>Rule stroke and aggregate or ranged bar width.</span></a>
</div>

## Errors and limitations

Radius, rule stroke/width, constant opacity, and both bar width modes are graphical constants. Field opacity
is a semantic encoding.
Size cannot be combined with a constant radius. A constant `editPointMark`
shape cannot be combined with field-driven `encodeShape`. Bar width
requires complete ordinal x, aggregate y, and color semantics; group additionally
requires matching xOffset semantics.
Ambiguous targets, duplicate inferred selection IDs, incompatible item-grain
selectors, and point-inapplicable highlight options fail before creating partial
selection or appearance state. Highlight appearance currently supports points only.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Legends](./legends.md)

