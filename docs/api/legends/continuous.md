---
layout: default
title: Continuous Legends
---

# Continuous Legends

{% include chart-example.html id="multi-legend-layout" %}

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

For a top or bottom sampled-opacity legend, `titlePosition: "left"` places the
title, every sample circle, and its numeric label on one reading line. The
inline defaults use 8 logical pixels from a circle to its label and 20 pixels
before the next sample. `labels.offset` and `itemGap` override those distances.

~~~javascript
program.createLegend({
  channels: ["opacity"],
  position: "top",
  titlePosition: "left",
  count: 3
});
~~~

Gradient legends reject categorical-only `symbol`, `columns`, `direction`, and
`itemGap`. Opacity legends reject `columns`, `direction`, and `gradient`.
Gradient and side-positioned opacity legends require `titlePosition: "top"`.
Both forms require enough requested Canvas margin and never resize the Canvas.
Their requested sample `count` is limited to the inclusive range `2`–`10,000`.

For a `quantize`, `quantile`, or `threshold` point-color scale, the same call
creates ordered swatches and concrete interval labels. Interval
legends support all four positions with `layout: "edge"`. Side legends use a
single vertical column, center alignment and a top title. At top/bottom, use
`align`, `direction`, `columns` and `titlePosition` to arrange the item grid.
`titlePosition: "left"` places the title beside the grid. The same controls
are editable through `editLegend` and `editLegendLayout`. Symbol size, label
style, spacing and borders remain editable.

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

Hidden titles do not contribute to occupied bounds or borders. For horizontal
inline opacity legends, hiding the title also removes its width and gap.
The stored title remains available for later restoration; restoring a title
that does not fit the Canvas fails without changing the earlier program.
