---
layout: default
title: Composite Legend Symbols
---

# Composite Legend Symbols

{% include chart-example.html id="regression" %}

## Layered symbols

Legend symbols are graphical recipes composed from line, point, and swatch
layers. The default line shorthand remains supported:

~~~javascript
lineProgram.createLegend({
  symbol: { length: 32, lineWidth: 2 }
});
~~~

Histogram, grouped-bar, and grouped-area swatch shorthand supports `width`,
`height`, `stroke`, and `strokeWidth`.

Use layers for a composite symbol:

~~~javascript
lineProgram.createLegend({
  symbol: {
    layers: [
      { type: "line", length: 32, lineWidth: 2 },
      { type: "point", shape: "circle", size: 4 }
    ]
  }
});
~~~

The same recipe works in top and bottom item grids:

~~~javascript
lineProgram.createLegend({
  position: "bottom",
  align: "right",
  direction: "horizontal",
  columns: 2,
  symbol: {
    layers: [
      { type: "line", length: 36, lineWidth: 3 },
      { type: "point", shape: "circle", size: 5 }
    ]
  }
});
~~~

Supported layers are:

~~~javascript
{ type: "line", length?, lineWidth? }
{ type: "point", shape?: "circle", size?, fill?, stroke?, strokeWidth? }
{ type: "swatch", width?, height?, stroke?, strokeWidth? }
~~~

Every layer shares the same item anchors. A line and point therefore overlap
as one composite symbol. The union of their bounds determines label placement,
and layers retain their declared rendering order. Recipes are private
appearance configuration; the final `graphicSpec` contains only concrete line,
circle, and rect primitives.

## Items and semantics

Items follow the resolved ordinal domain order. Color and dash appearance come
from the matching resolved ranges. Combined line channels must encode the same
field and have identical ordered domains.

A bar color legend stores `guide.legend.color` with its scale and title. A
combined line legend stores `guide.legend.series` with its channels, scales, and
title. Positions, fonts, symbols, and border appearance are graphical state.

A point legend combines color and shape only when they encode the same nominal
field and share an ordered domain. If a matching line layer uses that field and
color scale, its line is layered behind each typed circle/square symbol. A
separate `guide.legend.size` block samples five evenly spaced domain values by
default and maps their areas through the resolved quantitative size scale.

## Optional border

The default creates no background. Pass true for default border settings or an
object with color, lineWidth, padding, and background.

~~~javascript
program.createLegend({
  border: {
    color: "#cbd5e1",
    lineWidth: 1,
    padding: 8,
    background: "white"
  }
});
~~~

The background is rendered before every symbol layer, label, and title.

## Related

[Legend overview](../legends.md) · [Categorical legends](./categorical.md) · [Series encodings](../series-encodings.md)
