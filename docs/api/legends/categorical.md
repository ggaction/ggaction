---
layout: default
title: Categorical and Size Legends
---

# Categorical and Size Legends

{% include chart-example.html id="line" lead=true %}

## `createLegend(options?)`

Creates inferred legend blocks. It supports combined line-series,
color-stacked histogram, grouped ordinal-bar, grouped area, independent stroke, composite point-series,
quantitative point-size, continuous-color gradient, and field-opacity legends.
It also infers interval swatches for quantize, quantile, and threshold point
color scales.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

~~~javascript
program.createLegend();
~~~

A size encoding is independently eligible; color and shape are not required:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

~~~javascript
program.createLegend({ channels: ["size"], position: "right", count: 4 });
~~~

With one size-encoded point mark, both `createLegend()` and `createGuides()`
infer the same block. Multiple size-encoded point marks require `target`.
Standalone size legends support all four positions, edge layout, grid controls,
text styles, and borders. A size block paired with a categorical point legend
supports every edge. Continuous size scales use evenly sampled domain values.
Quantize, quantile, and threshold size scales show every interval and reject an
explicit `count`.

An explicit `channels` array selects exactly the content to create. On a point
mark encoding all three channels, use `channels: ["color", "shape", "size"]`
to include all three, or `["color", "size"]` to show color swatches and size
samples without a shape explanation. Selecting just `["color"]` or `["shape"]`
does not add a size block. Sample `count` requires size to be selected in a
categorical request and requires a continuous size scale. Encodings and mark
appearance remain unchanged.

Stroke may be selected independently with `channels: ["stroke"]`. When Point
fill and outline use different fields, create separate color and stroke blocks;
their domains, titles, symbols, edits, highlighting, and removal stay independent.

Omitting `channels` on a point mark infers its encoded categorical color, shape,
and quantitative size. Color alone uses swatches; shape uses typed symbols;
color plus size and shape plus size each create both corresponding blocks.
The result matches explicitly listing those channels. If several point marks
can own an inferred size companion, specify `target`.

Every categorical legend uses the same right-side default:

| Mark | Channels | Position | Symbol |
| --- | --- | --- | --- |
| line | encoded `color`, `stroke`, and/or `strokeDash` | `right` | line |
| bar histogram | `color` | `right` | swatch |
| grouped ordinal bar | `color` | `right` | swatch |
| grouped area | `color` | `right` | swatch |
| point | inferred or selected `color` only | `right` | swatch |
| point | inferred or selected `shape` only | `right` | typed point |
| point + matching line | `color` + `shape` | `right` | line over typed point |
| quantitative point size | `size` | all four edges, standalone or combined | five equal-area circles |
| quantitative/temporal point color | `color` | `right` | continuous gradient with five labels |
| discretized quantitative point color | `color` | `right/left/top/bottom` | ordered interval swatches |
| categorical supported-mark stroke | `stroke` | `right/left/top/bottom` | actual fill with mapped outline |
| quantitative point opacity | `opacity` | `right` | five constant-size circles with sampled opacity |

A shape-only point legend also works when the chart contains unrelated lines.
The automatic line-and-point symbol requires the point and line to share both
the encoded color field and color scale. Removing the point's color encoding
preserves its remaining shape legend.

| Option | Type | Default |
| --- | --- | --- |
| `target` | compatible mark ID | current or unique compatible mark |
| `channels` | compatible channel array; continuous guides use one `color` or `opacity` | compatible encoded channels |
| `order` | `"scale"`, `{ values: [...] }`, or `{ channel: "x"/"y"/"theta" }`; categorical only | `"scale"` |
| `position` | `right/left/bottom/top` | `"right"` |
| `layout` | categorical `"edge"` or `"legacy-bottom"` | `"edge"` |
| `align` | `"left"`, `"center"`, or `"right"` | `"center"` |
| `direction` | `"horizontal"` or `"vertical"` | `"vertical"` at either side; `"horizontal"` at top/bottom |
| `columns` | positive integer | all items in one row at top |
| `offset` | non-negative number | `8` |
| `titlePosition` | `"top"` or `"left"` | `"top"` |
| `title` | non-empty string or `false` | encoded field name; `false` initially hides it |
| `symbol` | `"auto"`, shorthand object, or layered recipe | inferred from mark |
| `labels` | label style object | default sans-serif label style |
| `titleStyle` | title style object | default sans-serif title style |
| `itemGap` | positive number | `28` at either side, `24` at top, `20` at bottom |
| `border` | boolean or border style object | `false` |
| `count` | size-legend symbol count from `2` through `10,000` | `5` for point legends |
| `gradient` | `{ length?, thickness? }` with positive values | `{ length: 120, thickness: 12 }` |

Pass `position: "bottom"` explicitly to place the legend below the plot.
For a combined categorical-and-size legend, `title: false` hides the categorical
title; the size block retains its independent title, matching `editLegend`.
Bottom legends use the same item grid as top legends and can use left, center,
or right alignment; side legends require center alignment. Left categorical,
composite point, and size blocks use vertical flow and preserve symbol-to-label
and resolved-domain order. Both sides use vertical direction and a top title. `columns` is a positive
integer and defaults to one on the sides. Items fill each column from top to
bottom in domain order before starting the next column. Each column reserves
its measured symbol and label width; `itemGap` separates columns. Provide
enough side margin for the complete grid. Moving a horizontal grid to either
side preserves its column count; use `titlePosition: "top"` when needed.
Incompatible direction or title options produce an error.

For example, this complete program places 21 years in three columns on the right:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    width: 620, height: 380,
    margin: { top: 20, right: 300, bottom: 60, left: 70 }
  })
  .createData({ values: Array.from({ length: 21 }, (_, i) => ({
    x: i, y: i % 5, year: String(1980 + i)
  })) })
  .createScatterPlot({
    x: "x", y: "y", color: { field: "year", fieldType: "ordinal" },
    guides: { legend: { position: "right", columns: 3 } }
  });
```

Categorical legends use `layout: "edge"` by default, including a bottom legend
with no other layout options. To preserve the former compact single row anchored
near the Canvas bottom edge, specify both `position: "bottom"` and
`layout: "legacy-bottom"`. This mode keeps labels at Canvas height minus 28 and
the title at height minus 52. It supports alignment, item gap, symbols, styles,
and borders; columns, vertical direction, a left title, or a custom plot offset
require `layout: "edge"`. Layout mode is preserved by edits and replay.
Large text or symbols that overlap the fixed title row, cross the plot, or
exceed the Canvas produce an error; the fixed anchors do not move.

Top and bottom legends use a general item grid. `columns` caps the column count;
`direction: "horizontal"` fills rows first and `"vertical"` fills columns
first. For a single edge legend, `align` positions the actual outer bounds of
the complete title, items and border against the plot left edge, center or right
edge. Strokes and label extents count toward these bounds. `offset` measures
the gap from the plot to the nearest outer legend edge. The final block must
fit the requested Canvas. The title appears above the grid by default, or beside it with
`titlePosition: "left"`.

Each item reserves the actual extent of every symbol layer, including strokes
and mapped shapes. Labels start after this shared sample slot plus
`labels.offset` (8 for color, 10 for series). Narrower shapes retain the same
label column. Side rows expand for large labels or symbols, with at least
12 pixels between the visible title and item content. Horizontal grids and
borders use the same extents; inline titles are vertically centered beside
the complete grid. Hidden titles reserve no space.

A categorical legend resolves at most 10,000 domain items. A layered symbol
recipe contains at most one line, one point, and one swatch layer.

When two or more legend blocks share the top or bottom edge, the lane starts at
the plot's left edge and keeps 40 logical pixels between complete occupied
blocks. A left-positioned categorical title participates in the same inline
center line as a left-positioned sampled-opacity title.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `densityArea`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

~~~javascript
densityArea.createLegend({
  position: "top",
  direction: "vertical",
  columns: 3,
  titlePosition: "left",
  offset: 8
});
~~~

Automatic recipes refresh when a matching companion line is added, removed,
or rebound to another color scale. Creating the legend before or after the
line produces the same result. Explicit symbol recipes retain their layers
and order through those changes; `editLegend({ symbol: "auto" })` restores
inference. Title visibility and text styles remain intact.

## Item order without changing color

`createLegend` and `editLegend` accept the same categorical `order` policy.
An explicit non-empty list puts those categories first and appends omitted
categories in source first-appearance order. Explicit scale-domain entries absent
from the source remain at the end. Unknown and duplicate categories are errors.
Color, shape, and dash assignments remain attached to category values.

To follow the same target's categorical x, y, or theta domain, use
`order: { channel: "theta" }` (substitute x or y as needed). The linked encoding
must use the same field and category set as the legend. Its later order/scale
changes update the legend. Removing that encoding or changing it to an
incompatible field/domain fails; first reset with `editLegend({ order: "scale" })`.
Omitted `order` on an edit preserves the policy. Continuous and interval legends
do not accept categorical ordering.

Inside a complete chart's `guides.legend`, linked channels follow that chart's
position roles: categorical Cartesian positions use `x` or `y`; Pie, Rose, and
Radial Bar use `theta`. Line, Area, Density, and Parallel facade declarations
offer `"scale"` or explicit `values`, since their declared positions do not
provide a categorical axis to link.

### Combined categorical and size layout

Point legends can combine categorical color or shape with quantitative size on
any edge. For a point chart with both encodings, this fragment places a bordered
legend above the plot:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
program.createLegend({
  channels: ["color", "size"],
  position: "top",
  count: 3,
  offset: 30,
  columns: 2,
  border: true
});
```

At top and bottom, categorical content precedes size content with 40 pixels
between their occupied bounds. Blocks wrap to another row away from the plot
when necessary. The whole group, including its border, follows `align` and
`offset`. `direction`, `columns`, `titlePosition`, and `itemGap` apply to both
item grids. Newly combined blocks share label and title typography at every
edge, including the default title color `#334155`. Each block retains its own
title text, sample sizes, and label gap. A size legend created independently
keeps its stored styles when added to a categorical legend; its standalone
default title color remains `#0f172a`.
Title spacing also includes labels that are taller than the samples.
A size border retained from an earlier standalone legend stays inside the
shared outer border. Other legends place this complete group as one block.
Combined legends require `layout: "edge"`; `"legacy-bottom"` is unsupported.

## Related

[Legend overview](../legends.md) · [Composite symbols](./composite.md) · [Editing legends](./editing.md)
