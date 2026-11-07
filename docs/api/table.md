---
layout: default
title: Table Plots
---

# Table plots

Show keyed rows with formatted values, in-cell bars and sparklines. Table plots are
available in the Full entry. Canvas, SVG, PNG and PDF share the same cell clipping
and drawing order.

{% include chart-example.html id="table" %}

## `createTablePlot`

**Chart authoring.**

```typescript
createTablePlot(options: TargetedOptions<CreateTablePlotOptions>): ChartProgram;
```

Call after a Canvas and dataset. `columns` is required. Each column is a field
string or an object with the options below. The default plot ID is `table`.
Data and Cartesian viewport use the ordinary explicit/current/unique resolution
rules. A Table has its own row and column layout and does not use x/y axes.

| Column option | Behavior |
| --- | --- |
| `key` | Typed row-key value; defaults to the field. Keys must be unique; displayed labels may repeat |
| `field`, `label` | Source field and displayed heading; the heading defaults to the field |
| `format`, `missingText` | Native text format, default `auto`; nullish and NaN values display `—` by default |
| `width` | Positive logical pixels or `auto` (default). Auto columns divide the remaining width in proportion to measured content |
| `align` | `left` by default; `center` and `right` are supported |
| `wrap` | `word` by default; `character` or `false` |
| `cell` | `text` by default, `bar`, or a sparkline object |
| `footer` | `false` by default, a scalar aggregate name, or `{op,missing?,empty?,format?}` |

Widths use the current text metric profile and the whole source's content.
Rows have a fixed height. Text wraps within its cell and ends in a grapheme-safe
ellipsis when the available lines are exhausted. Full values remain in
`exportAccessibleData`, including truncated text and nested sparkline observations.
An insufficient font, column or ellipsis capacity is an error.

`sortBy` accepts the existing stable sort-key array. `rowLimit` is an explicit
nonnegative row limit; omitted rows are reported in a visible `N of M rows shown`
notice. The source is not reordered or reduced. Footer aggregates always use all
source rows before the limit, with the ordinary summary missing and empty policies:
`drop` and `null` by default. Accessible cells include input, used and excluded row
counts. A footer in one column creates a footer row with blank cells elsewhere.

Bar cells use finite numeric values and a shared linear, zero-containing domain
from the whole source. Supply `{type:"bar",domain:[min,max]}` to set it explicitly.
Bars clamp to the inner cell; their accessible numeric values remain unchanged.

Sparkline cells read an array of observations from the field:

<!-- snippet-context:start -->

> **Executable complete.** Import the Full ggaction package; this complete example declares the nested observations and their shared sparkline channels.

<!-- snippet-context:end -->

```js
import { chart } from "ggaction";

const sparklineColumn = {
  field: "trend",
  cell: { type: "sparkline", x: "time", y: "value", resolveY: "shared" }
};
const program = chart().createCanvas()
  .createData({ values: [{ trend: [{ time: 0, value: 1 }, { time: 1, value: 3 }] }] })
  .createTablePlot({ columns: [sparklineColumn] });
```

The column shares an x extent across all rows. Y is shared by default; set
`resolveY:"independent"` for a separate extent per row. Explicit `xDomain` and
shared `yDomain` accept finite ascending pairs. `xType` defaults to quantitative;
temporal x supports `temporalUnit:"year"` or `"timestamp"`. Native curve and
cardinal tension options are supported. `missing:"break"` preserves gaps; the
default is `error`. Empty/null arrays display the missing text. A singleton is a
circle with radius half the sparkline stroke width. Sparkline footers support
`count`, not scalar aggregation of nested arrays.

| Plot option | Default and behavior |
| --- | --- |
| `rowHeight`, `padding` | `28` and `4` logical pixels; content must fit |
| `header`, `clip` | `true`; `clip:false` removes the outer plot clip while each cell keeps its own clip |
| `cells` | White fill, `#cbd5e1` stroke, width `1`, opacity `1` |
| `labels` | `#0f172a`, sans-serif, size `12`, normal weight |
| `headerStyle`, `footerStyle` | `#f1f5f9` fill, `#0f172a` text `color`, bold weight |
| `bars` | `#93c5fd` fill, no stroke, opacity `1` |
| `sparklines` | `#2563eb` stroke, width `1.5`, opacity `1` |
| `color` | Native field/scale/palette options applied to body-cell backgrounds |

Cell and bar appearance accepts `fill`, `stroke`, `strokeWidth`, `opacity`,
`outline` and `shadow`. Labels accept fill and font options plus outline/shadow;
sparklines accept stroke, width, opacity and effects. Structured fills use the
normal paint contract. Color legends and scale edits use native color scales. Set or change the field with
`createTablePlot`/`editTablePlot({color})`; generic position and appearance encoders
are not Table actions.

The requested rows, header, footer and notice must fit the Canvas viewport height;
increase the height or choose a smaller row limit explicitly. Limits are 10,000
source rows, columns, cells and generated graphics, 10,000 total nested samples,
and bounded text/layout work. Overflows fail before writing state.

## `editTablePlot`

**Chart authoring.**

```typescript
editTablePlot(options: TargetedOptions<EditTablePlotOptions>): ChartProgram;
```

Patch an explicit/current/unique Table, including a scoped composition target.
Omitted options are preserved. `columns` replaces the complete column list.
`sortBy:false`, `rowLimit:false` and `color:false` remove those choices.
`outline:false` and `shadow:false` reset effects. Empty patches, null and explicit
undefined are errors.

Selection and hits identify each cell by its typed source row, typed column and
header/body/footer role. Sorting and moving columns retain those identities.
Footer items carry aggregate source membership. Revisions, resizing, facets,
scoped edits, highlighting, theme changes and offline restoration rematerialize
through the same native owners. Cell formatting owns Table text; use column and
label options rather than a separate `createMarkLabels` layer.

See [the Table tutorial](../tutorials/table.md) for a complete program.
