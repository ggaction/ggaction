---
layout: default
title: Categorical and Size Legends
---

# Categorical and Size Legends

{% include chart-example.html id="line" %}

## `createLegend(options?)`

Creates inferred legend blocks. It supports combined line-series,
color-stacked histogram, grouped ordinal-bar, grouped area, composite point-series,
quantitative point-size, continuous-color gradient, and field-opacity legends.
It also infers interval swatches for quantize, quantile, and threshold point
color scales.

~~~javascript
program.createLegend();
~~~

A size encoding is independently eligible; color and shape are not required:

~~~javascript
program.createLegend({ channels: ["size"], position: "right", count: 4 });
~~~

With one size-encoded point mark, both `createLegend()` and `createGuides()`
infer the same block. Multiple size-encoded point marks require `target`.
Standalone size legends currently use the right position; a size block paired
with a categorical point legend may use either side.

Every categorical legend uses the same right-side default:

| Mark | Channels | Position | Symbol |
| --- | --- | --- | --- |
| line | encoded `color` and/or `strokeDash` | `right` | line |
| bar histogram | `color` | `right` | swatch |
| grouped ordinal bar | `color` | `right` | swatch |
| grouped area | `color` | `right` | swatch |
| point | explicitly selected `color` only | `right` | swatch |
| point | explicitly selected `shape` only | `right` | typed point |
| point + matching line | `color` + `shape` | `right` | line over typed point |
| quantitative point size | `size` | `right`, standalone or below point series | five equal-area circles |
| quantitative/temporal point color | `color` | `right` | continuous gradient with five labels |
| discretized quantitative point color | `color` | `right` | ordered interval swatches |
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
| `position` | `right/left/bottom/top`; combined point-size guides use a side | `"right"` |
| `layout` | categorical `"edge"` or `"legacy-bottom"` | `"edge"` |
| `align` | `"left"`, `"center"`, or `"right"` | `"center"` |
| `direction` | `"horizontal"` or `"vertical"` | `"horizontal"` |
| `columns` | positive integer | all items in one row at top |
| `offset` | non-negative number | `8` |
| `titlePosition` | `"top"` or `"left"` | `"top"` |
| `title` | non-empty string | encoded field name |
| `symbol` | `"auto"`, shorthand object, or layered recipe | inferred from mark |
| `labels` | label style object | default sans-serif label style |
| `titleStyle` | title style object | default sans-serif title style |
| `itemGap` | positive number | `28` at either side, `20` at top/bottom |
| `border` | boolean or border style object | `false` |
| `count` | size-legend symbol count from `2` through `10,000` | `5` for point legends |
| `gradient` | `{ length?, thickness? }` with positive values | `{ length: 120, thickness: 12 }` |

Pass `position: "bottom"` explicitly to place the legend below the plot.
Bottom legends use the same item grid as top legends and can use left, center,
or right alignment; side legends require center alignment. Left categorical,
composite point, and size blocks use vertical flow and preserve symbol-to-label
and resolved-domain order.

Categorical legends use `layout: "edge"` by default, including a bottom legend
with no other layout options. To preserve the former compact single row anchored
near the Canvas bottom edge, specify both `position: "bottom"` and
`layout: "legacy-bottom"`. This mode keeps labels at Canvas height minus 28 and
the title at height minus 52. It supports alignment, item gap, symbols, styles,
and borders; columns, vertical direction, a left title, or a custom plot offset
require `layout: "edge"`. Layout mode is preserved by edits and replay.

Top and bottom legends use a general item grid. `columns` caps the column count;
`direction: "horizontal"` fills rows first and `"vertical"` fills columns
first. `align` positions the complete title-plus-items block within plot
bounds. The title appears above the grid by default, or beside it with
`titlePosition: "left"`.

A categorical legend resolves at most 10,000 domain items. A layered symbol
recipe contains at most one line, one point, and one swatch layer.

When two or more legend blocks share the top or bottom edge, the lane starts at
the plot's left edge and keeps 40 logical pixels between complete occupied
blocks. A left-positioned categorical title participates in the same inline
center line as a left-positioned sampled-opacity title.

~~~javascript
densityArea.createLegend({
  position: "top",
  direction: "vertical",
  columns: 3,
  titlePosition: "left",
  offset: 8
});
~~~

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

## Related

[Legend overview](../legends.md) · [Composite symbols](./composite.md) · [Editing legends](./editing.md)
