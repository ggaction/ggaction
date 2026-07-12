---
layout: default
title: Legends
---

# Legends

## `createLegend(options?)`

Creates one inferred categorical legend. It supports combined line-series
legends and color-grouped histogram legends.

~~~javascript
program.createLegend();
~~~

Defaults depend on the selected mark:

| Mark | Channels | Position | Symbol |
| --- | --- | --- | --- |
| line | encoded `color` and/or `strokeDash` | `right` | line |
| bar histogram | `color` | `bottom`, centered | swatch |

| Option | Type | Default |
| --- | --- | --- |
| `target` | compatible mark ID | current or unique compatible mark |
| `channels` | unique categorical channel array | compatible encoded channels |
| `position` | `"right"` or `"bottom"` | inferred from mark |
| `align` | `"left"`, `"center"`, or `"right"` | `"center"` |
| `title` | non-empty string | encoded field name |
| `symbol` | `"auto"`, shorthand object, or layered recipe | inferred from mark |
| `labels` | label style object | default sans-serif label style |
| `titleStyle` | title style object | default sans-serif title style |
| `itemGap` | positive number | `28` for line, `20` for histogram |
| `border` | boolean or border style object | `false` |

Current line legends support right position. Histogram legends support bottom
position and can use left, center, or right alignment.

## Layered symbols

Legend symbols are graphical recipes composed from line, point, and swatch
layers. The default line shorthand remains supported:

~~~javascript
lineProgram.createLegend({
  symbol: { length: 32, lineWidth: 2 }
});
~~~

Histogram swatch shorthand supports `width`, `height`, `stroke`, and
`strokeWidth`.

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

Supported layers are:

~~~javascript
{ type: "line", length?, lineWidth? }
{ type: "point", shape?: "circle", size?, fill?, stroke?, strokeWidth? }
{ type: "swatch", width?, height?, stroke?, strokeWidth? }
~~~

Every layer shares the same item anchors. A line and point therefore overlap
as one composite symbol. Recipes are private appearance configuration; the
final `graphicSpec` contains only concrete line, circle, and rect primitives.

## Items and semantics

Items follow the resolved ordinal domain order. Color and dash appearance come
from the matching resolved ranges. Combined line channels must encode the same
field and have identical ordered domains.

A bar color legend stores `guide.legend.color` with its scale and title. A
combined line legend stores `guide.legend.series` with its channels, scales, and
title. Positions, fonts, symbols, and border appearance are graphical state.

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
└─ createCategoricalLegend
   ├─ createLegendBackground?
   ├─ createLegendSymbols
   │  ├─ createLegendSymbolLines?
   │  ├─ createLegendSymbolPoints?
   │  └─ createLegendSymbolSwatches?
   ├─ createLegendLabels
   └─ createLegendTitle
~~~

Continuous legends, point-mark legends, multiple legend blocks, and
interactive legends are not currently supported.

`createGuides()` selects line-series and histogram color legends automatically.
Pass `createGuides({ legend: false })` to opt out.
