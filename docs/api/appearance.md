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
| `removePointRadius` | `removePointRadius()` | Current point with explicit radius | Theme-default glyph radius |
| `encodeSize` | `encodeSize({ field: "Acceleration" })` | Current point; linear scale; area range `[24, 196]` | Semantic size and concrete equal-area symbols |
| `encodeShape` | `encodeShape({ field: "Origin" })` | Current point; 12-value ordinal shape range | Semantic shape and mixed concrete symbols |
| `encodeOpacity` | `encodeOpacity({ value: 0.27 })` | Current point mark | Constant concrete opacity |
| `encodeOpacity` | `encodeOpacity({ field: "Acceleration" })` | Current point; linear scale; range `[0.2, 1]` | Semantic field opacity and concrete values |
| `encodeStroke` | `encodeStroke({ value: "#334155" })` | Current rule mark | Constant concrete line color |
| `encodeStrokeWidth` | `encodeStrokeWidth({ value: 3 })` | Current rule mark | Constant concrete line width |
| `encodeStrokeWidth` | `encodeStrokeWidth({ field: "weight" })` | Current line/rule; quantitative scale; width range `[1, 8]` | Field-driven rule items or line series |
| `encodeBarWidth` | `encodeBarWidth()` | Current aggregate bar; first assignment uses band `0.72` | Concrete rectangles |
| `selectMarks` | `selectMarks({ field: "Horsepower", op: "max" })` | Current or unique mark; deterministic selection ID | Reusable semantic final-item selection |
| `editMarkSelection` | `editMarkSelection({ field: "Horsepower", op: "min" })` | Current or unique stored selection | Same ID/target with a replaced selector |
| `highlightMarks` | `highlightMarks({ select: { field: "Horsepower", op: "max" } })` | Current point/bar/path/rule; red accent; selected-last | Concrete selected-item emphasis |
| `removeMarkHighlight` | `removeMarkHighlight()` | Current or unique highlighted selection | Clean mark baseline with selection retained |
| `removeMarkSelection` | `removeMarkSelection()` | Current or unique stored selection | Selection and dependent highlight released |

Appearance actions change final mark style without changing position. Use the
focused pages below for selection, point appearance, and mark-specific style.

## Supported highlight marks

<!-- action-capabilities:highlight:start -->
| Action | Supported marks | Grain | Result |
| --- | --- | --- | --- |
| `selectMarks` / `highlightMarks` | point, bar, line, area, rect, arc, rule | item; stacked bars also support stack | selection intent and mark-specific durable emphasis |
<!-- action-capabilities:highlight:end -->

## Focused appearance families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/appearance/selection-and-highlighting/' | relative_url }}"><strong>Selection and highlighting</strong><span>Select final graphical items and apply durable emphasis.</span></a>
  <a href="{{ '/api/appearance/point/' | relative_url }}"><strong>Point appearance</strong><span>Radius, size, shape, and opacity encodings.</span></a>
  <a href="{{ '/api/appearance/mark-style/' | relative_url }}"><strong>Mark style</strong><span>Rule stroke and aggregate or ranged bar width.</span></a>
</div>

## Errors and limitations

Radius, rule stroke, constant rule width, constant opacity, and both bar width modes are graphical constants.
Field opacity and field-driven stroke width are semantic encodings.
Size cannot be combined with a constant radius. Remove that assignment with
`removePointRadius()` before encoding size. A constant `editPointMark`
shape cannot be combined with field-driven `encodeShape`. Bar width
requires complete ordinal x, aggregate y, and color semantics; group additionally
requires matching xOffset semantics.
Ambiguous targets, duplicate inferred selection IDs, incompatible item-grain
selectors, and point-inapplicable highlight options fail before creating partial
selection or appearance state. Each supported mark accepts only the style
properties listed on the focused selection page.

## Related

[Marks](./marks.md) · [Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Legends](./legends.md)
