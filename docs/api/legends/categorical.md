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
| point + matching line | `color` + `shape` | `right` | line over typed point |
| quantitative point size | `size` | `right`, standalone or below point series | five equal-area circles |
| quantitative/temporal point color | `color` | `right` | continuous gradient with five labels |
| discretized quantitative point color | `color` | `right` | ordered interval swatches |
| quantitative point opacity | `opacity` | `right` | five constant-size circles with sampled opacity |

| Option | Type | Default |
| --- | --- | --- |
| `target` | compatible mark ID | current or unique compatible mark |
| `channels` | compatible channel array; continuous guides use one `color` or `opacity` | compatible encoded channels |
| `position` | `right/left/bottom/top`; combined point-size guides use a side | `"right"` |
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
| `count` | size-legend symbol count of at least `2` | `5` for point legends |
| `gradient` | `{ length?, thickness? }` with positive values | `{ length: 120, thickness: 12 }` |

Pass `position: "bottom"` explicitly to place the legend below the plot.
Bottom legends use the same item grid as top legends and can use left, center,
or right alignment; side legends require center alignment. Left categorical,
composite point, and size blocks use vertical flow and preserve symbol-to-label
and resolved-domain order.

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

## Related

[Legend overview](../legends.md) · [Composite symbols](./composite.md) · [Editing legends](./editing.md)
