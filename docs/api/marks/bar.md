---
layout: default
title: Bar Marks
---

# Bar Marks

{% include chart-example.html id="bar" lead=true %}

Bar marks represent binned counts, aggregate categories, grouped or stacked
partitions, and observed quantitative intervals.

## `createBarMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, cornerRadius?, lineCap?, lineJoin?, miterLimit? } = {})`

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const program = chart()
  .createData({ values: cars })
  .createBarMark({ opacity: 0.78, stroke: "#0f172a", strokeWidth: 1.25 })
  .encodeHistogram({ field: "Displacement" });
```

The first ID is `"bar"` and data defaults to current data. Creation starts with
an empty rect collection because binning, aggregation, stacking, grouping, and
width determine the final rectangle count and geometry.

Creation-time `fill`, `opacity`, `stroke`, `strokeWidth`, `cornerRadius`, `lineCap`,
`lineJoin`, and `miterLimit` use the same
validation and persistent materialization config as `editBarMark`. Constant
fill conflicts with a later field-driven color encoding.

A positive `cornerRadius` rounds all four corners of every final bar and is
clamped independently to half that bar's smaller side. Stacked and grouped
segments keep their own radius calculation. Set it to `0` to restore square
rectangles. Stroke cap/join details and the requested radius survive Canvas,
encoding, theme, highlight, legend, and facet replay.

For an aggregate bar, combine an ordinal position and quantitative aggregate.
Complete aggregate and ranged bars immediately use the default `0.72` band
width; call `encodeBarWidth` only to override it:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program
  .encodeX({ field: "year", fieldType: "ordinal" })
  .encodeY({ field: "perc", aggregate: "mean" })
  .encodeBarWidth({ band: 0.72 });
```

`encodeColor({ layout })` can arrange partitions with `stack`, `fill`, `group`,
`overlay`, or `diverging`. Group layout invokes `encodeXOffset` for vertical
bars or `encodeYOffset` for horizontal bars internally.
Observed interval bars instead combine one categorical axis with `encodeYRange`
or `encodeXRange`.

## `editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth?, cornerRadius?, lineCap?, lineJoin?, miterLimit? })` {#edit-bar-mark}

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.editBarMark({
  opacity: 0.8,
  stroke: "#111827",
  strokeWidth: 1.5
});
```

The current or only bar is inferred when `target` is omitted. Constant fill
conflicts with field-driven color, while opacity and outline remain editable.
Geometry and semantic aggregation are unchanged and appearance is reapplied
after Canvas or scale rematerialization.

See [Mark Style](../appearance/mark-style.md#stroke-caps-joins-and-rounded-rectangles)
for the closed cap/join values, defaults, and high-level pass-through rules.

## Related

[Histogram positions](../position/histogram.md) ·
[Ordinal bars](../position/ordinal-bars.md) ·
[Series encodings](../series-encodings.md)
