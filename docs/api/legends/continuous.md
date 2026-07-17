---
layout: default
title: Continuous Legends
---

# Continuous Legends

{% include chart-example.html id="density" %}

## Continuous color and opacity

A point `color` encoding with a quantitative or temporal field produces a
continuous gradient. Right/left positions orient it vertically; top/bottom
orient it horizontally. The implementation writes 60 adjacent concrete rects,
tick lines, and text to `graphicSpec`; renderers do not interpolate colors.

~~~javascript
program.createLegend({
  channels: ["color"],
  count: 5,
  gradient: { length: 120, thickness: 12 }
});
~~~

A field-driven quantitative `opacity` encoding produces representative point
samples in ascending domain order. Reversing the opacity range changes symbol
appearance without reversing labels. Its neutral default symbol is a circle
with radius `7` and fill `#4c78a8`; pass one `{ type: "point", ... }` recipe to
override it.

~~~javascript
program.createLegend({ channels: ["opacity"], position: "left" });
~~~

Gradient legends reject categorical-only `symbol`, `columns`, `direction`, and
`itemGap`. Opacity legends reject `columns`, `direction`, and `gradient`.
Both forms require enough requested Canvas margin and never resize the Canvas.

For a `quantize`, `quantile`, or `threshold` point-color scale, the same call
creates ordered swatches and concrete interval labels. The current interval
layout is vertical at the right edge; `offset`, `itemGap`, `symbol`, `labels`,
`titleStyle`, and title editing remain available.

~~~javascript
program.createLegend({
  channels: ["color"],
  position: "right",
  direction: "vertical",
  symbol: { width: 14, height: 12 }
});
~~~

## Related

[Legend overview](../legends.md) · [Scale options](../scales.md) · [Editing legends](./editing.md)
