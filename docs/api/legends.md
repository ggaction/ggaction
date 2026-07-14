---
layout: default
title: Legends
---

# Legends

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createLegend` | `createLegend()` | Current/unique compatible mark; right position | Categorical, size, gradient, or opacity guide |

## `createLegend(options?)`

Creates inferred legend blocks. It supports combined line-series,
color-stacked histogram, grouped ordinal-bar, grouped area, composite point-series,
quantitative point-size, continuous-color gradient, and field-opacity legends.

~~~javascript
program.createLegend();
~~~

Every categorical legend uses the same right-side default:

| Mark | Channels | Position | Symbol |
| --- | --- | --- | --- |
| line | encoded `color` and/or `strokeDash` | `right` | line |
| bar histogram | `color` | `right` | swatch |
| grouped ordinal bar | `color` | `right` | swatch |
| grouped area | `color` | `right` | swatch |
| point | explicitly selected `color` only | `right` | swatch |
| point + matching line | `color` + `shape` | `right` | line over typed point |
| quantitative point size | `size` | `right`, below point series | five equal-area circles |
| quantitative/temporal point color | `color` | `right` | continuous gradient with five labels |
| quantitative point opacity | `opacity` | `right` | five constant-size circles with sampled opacity |

| Option | Type | Default |
| --- | --- | --- |
| `target` | compatible mark ID | current or unique compatible mark |
| `channels` | compatible channel array; continuous guides use one `color` or `opacity` | compatible encoded channels |
| `position` | categorical: `right/bottom/top`; continuous: `right/left/bottom/top` | `"right"` |
| `align` | `"left"`, `"center"`, or `"right"` | `"center"` |
| `direction` | `"horizontal"` or `"vertical"` | `"horizontal"` |
| `columns` | positive integer | all items in one row at top |
| `offset` | non-negative number | `8` |
| `titlePosition` | `"top"` or `"left"` | `"top"` |
| `title` | non-empty string | encoded field name |
| `symbol` | `"auto"`, shorthand object, or layered recipe | inferred from mark |
| `labels` | label style object | default sans-serif label style |
| `titleStyle` | title style object | default sans-serif title style |
| `itemGap` | positive number | `28` at right, `20` at bottom |
| `border` | boolean or border style object | `false` |
| `count` | size-legend symbol count of at least `2` | `5` for point legends |
| `gradient` | `{ length?, thickness? }` with positive values | `{ length: 120, thickness: 12 }` |

Pass `position: "bottom"` explicitly to place the legend below the plot.
Bottom legends use the same item grid as top legends and can use left, center,
or right alignment; right legends require center alignment.

For compatibility, `createLegend({ position: "bottom" })` keeps the compact
single-row layout anchored near the Canvas bottom edge. Supplying any grid
control such as `columns`, `direction`, `offset`, `titlePosition`, or `itemGap`
selects the general reserved-margin grid.

Top and bottom legends use a general item grid. `columns` caps the column count;
`direction: "horizontal"` fills rows first and `"vertical"` fills columns
first. `align` positions the complete title-plus-items block within plot
bounds. The title appears above the grid by default, or beside it with
`titlePosition: "left"`.

~~~javascript
densityArea.createLegend({
  position: "top",
  direction: "vertical",
  columns: 3,
  titlePosition: "left",
  offset: 8
});
~~~

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

## Updates and trace

Canvas changes and relevant encoding actions explicitly rematerialize the
legend from the latest ordinal domains and ranges. The renderer still reads
only concrete `graphicSpec` values.

~~~text
createLegend
├─ createCategoricalLegend | createGradientLegend | createOpacityLegend
│  └─ concrete background?, symbols/strips, labels, and title
└─ createSizeLegend?
~~~

The component actions shown above are internal wrapped actions. Chart and
extension authors call the public `createLegend()` facade; the children remain
visible in the trace.

`createGuides()` selects line-series, histogram color, grouped-bar color,
grouped-area color, and compatible point color/shape/size, sequential color,
or standalone field-opacity legends automatically.
Pass `createGuides({ legend: false })` to opt out.

## Errors and limitations

Continuous color is currently limited to point marks, and field opacity is
limited to quantitative point fields. Interactive legends are unsupported.
Combined point-series and quantitative-size legends currently require right
position so both blocks remain in one vertical stack.
Right-side layout requires sufficient right margin; bottom layout requires
sufficient bottom margin; top layout requires enough top margin for its title,
item grid, offset, and optional border. The library reports a layout error
instead of resizing the Canvas or dropping symbol layers.

## Related

[Guides](./guides.md) · [Series encodings](./series-encodings.md) ·
[Canvas](./canvas.md) · [Troubleshooting](../troubleshooting.md)
