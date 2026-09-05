---
layout: default
title: Text Marks
---

# Text marks

{% include chart-example.html id="annotation" %}

Text marks turn data values into visible labels. Add one after a compatible point,
bar, rect, rule, or arc layer and ggaction persists that layer as the annotation
source.

## `createMarkLabels(options?)`

Create final-item labels in one call, then use the lower text actions to refine them:

```javascript
import { chart } from "ggaction";

const labeled = chart()
  .createCanvas({ width: 480, height: 360, margin: 50 })
  .createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 6 }] })
  .createPiePlot({ category: "category", value: "value", aggregate: "sum", guides: false })
  .createMarkLabels({ content: "share", format: ".0%", fontSize: 20 });
// Labels: 25%, 75%; the created layer is "piePlot-labels".
const refined = labeled.editTextMark({ target: "piePlot-labels", fontWeight: "bold" });
```

The current compatible mark, then one unique compatible mark, supplies the source.
Use `source` to choose explicitly. The default ID is `<source>-labels`; additional
label layers on the same source require explicit IDs. Each label uses the source's
final visual item, so aggregated marks do not get duplicate labels for input rows.

Omitting `field`, `value`, and `content` selects `content: "value"` for a supported
Bar or Arc. Use `content: "category"` or `"share"` for other semantic content, `field`
for raw/common fields, or `value` for a constant. These choices are exclusive.
Point, Rule, and Rect labels require a field or constant. Format defaults to
`"auto"`; shares need an explicit percent format to display percentages.

Text is centered horizontally and vertically at the existing source anchor. Use
`baseline: "bottom", dy: -4` to place labels above an endpoint, or other ordinary
text style options. `layout: {}` enables collision avoidance, and a layout object
accepts `layoutLabels` options except `target`. Omission or `false` preserves source
anchors without collision layout. An incomplete explicit source is supported when
layout is disabled; call `layoutLabels` after completing it.

The result is an ordinary text layer: edit it with `encodeText`, `editTextMark`,
`layoutLabels`, or `removeLabelLayout`. Source changes replay the labels. The existing
mark ownership rule removes attached labels when their source is removed; it does
not support removing an attached label layer alone.

## `createTextMark(options?)`

```javascript
const annotated = points
  .createTextMark({
    fontSize: 10,
    fill: "#334155",
    dx: 7,
    dy: -6,
    align: "left",
    baseline: "bottom"
  })
  .encodeText({ field: "Series_Title" });
```

The first omitted ID is `"text"`. When `data` is omitted, the current compatible
layer—or one unique compatible layer—supplies its dataset, position, and final
visual-item grain. This means aggregate bars receive one label per bar, rect
labels anchor at cell centers, and arc labels anchor at sector centers. Pass
`data` explicitly to assemble an independent text layer with `encodeX` and
`encodeY`.

Use `source` to select a particular mark when a chart has several layers:

```javascript
// Fragment: layeredChart contains a mark named "bars".
const labels = layeredChart
  .createTextMark({ id: "bar-labels", source: "bars", dy: -4, align: "center" })
  .encodeText({ field: "value" });
```

An explicit source wins over the current mark and dataset. Use either `source`
or `data`; supplying both is an error. The source must be an existing point,
bar, rect, rule, or arc, but its position encodings may still be incomplete.
Labels appear when the source becomes complete. They follow later source
position and scale changes, disappear when a required position is removed, and
return when it is restored. `source` is a creation option; `editTextMark` edits
appearance.

For an aggregate Bar or a measured Rose/Radial Bar, labeling the measure field
uses its final aggregate value, even when every contributing row has the same
value. For example, two values of 1 in one category produce a sum label of 2.
Category labels continue to show the category itself.
These source-owned labels follow the source's scale domain; adding them or
resizing does not expand a normalized stack domain with raw source values.

Creation options are `id`, `data`, `source`, `text`, `fill`, `opacity`, `fontSize`,
`fontFamily`, `fontWeight`, `align`, `baseline`, `rotation`, `dx`, and `dy`.
The `text` option is constant-content shorthand.

## Font weights

`fontWeight` accepts a non-empty CSS weight string or a finite number. To keep
Canvas, SVG, PNG, and PDF output consistent, numeric values are rounded to the
nearest 100 and clamped to the backend-safe `100`–`900` range before rendering.
For example, `650` renders as `700`. The authored value remains unchanged in the
program state. Titles, facet headers, legends, and Cartesian or Polar axis text
use this same renderer policy.

## `encodeText({ target?, field?, value?, content?, normalizeBy?, format? })`

Provide exactly one of `field`, constant `value`, or semantic `content`.
`format` defaults to `"auto"`; numeric formats include `".0f"`–`".12f"` and
`".0%"`–`".12%"`. Calling `encodeText` again replaces the previous content
assignment and preserves the previous format unless you supply one. Precision
is an integer from 0 through 12; two-digit zero-padded forms such as `".01f"`
are also accepted and mean the same as `".1f"`.

```javascript
bars
  .createTextMark({ dy: -4, align: "center" })
  .encodeText({ field: "value", format: ".1f" });
```

Use semantic content when the label should describe the source's final items:

```javascript
// Fragment: pie contains a completed Pie mark.
const percentages = pie
  .createTextMark({ align: "center", baseline: "middle" })
  .encodeText({ content: "share", format: ".1%" });

// Fragment: stackedBars contains a completed Bar mark.
const segmentValues = stackedBars
  .createTextMark({ align: "center", dy: -4 })
  .encodeText({ content: "value" });
```

`content: "value"` reads each Bar segment's aggregate before stacking or
normalization, each histogram segment's count, each Pie sector's count or
weighted sum, or an Arc's radial value. For two stacked values of 10 and 30,
it labels them 10 and 30. `content: "category"` reads the category of an
aggregate Bar or categorical Arc.

`content: "share"` divides these values by their total across the current
source's final items. Use `normalizeBy: "category"` for percentages within
each Bar category or histogram bin. Arc shares use `normalizeBy: "source"`,
the default. Filtering the source recalculates the denominator. Negative or
undefined values and non-positive denominators are errors; an empty final
item set produces no labels. Zero-height bars omitted from final items also
have no labels. With `format: "auto"`, a share is a fraction; use a percent
token to display a percentage.

Semantic content requires an attached Bar or Arc. For Point, Rule, Rect,
ranged Bar, or an independent text layer, choose a `field` or constant
`value` explicitly. Histogram intervals and quantitative Arc theta have no
inferred category label. Source completion, position changes, and scale
edits replay the stored content alongside the label anchors. For existing facet
child programs, add labels after faceting; the current facet template contract
does not support pre-existing text layers.

Arc-source text is anchored halfway between each sector's inner and outer radii
at its angular midpoint. The anchor is derived from the materialized sector path,
so Canvas, scale, padding, and inner-radius changes keep labels aligned. A field
used for arc text must resolve to one value at the final sector grain.

```javascript
const labeledDonut = donut
  .createTextMark({ align: "center", baseline: "middle" })
  .encodeText({ field: "percentageLabel" });
```

## `editTextMark(options)`

Edit typography, opacity, alignment, baseline, rotation, or `dx`/`dy` without
changing the semantic anchor:

```javascript
const revised = annotated.editTextMark({
  fill: "#b91c1c",
  fontWeight: 600,
  dx: 10
});
```

At least one property is required. Canvas and scale edits rematerialize both the
source geometry and attached labels.

## `layoutLabels(options?)`

Use explicit offsets for intentional placement, or assign collision-aware
placement after the text encoding is complete:

```javascript
const arranged = annotated.layoutLabels({
  axis: "both",
  padding: 3,
  maxDisplacement: 48,
  bounds: "plot",
  leader: {
    stroke: "#94a3b8",
    strokeWidth: 0.8,
    opacity: 0.9
  }
});
```

`target` resolves the current complete text mark, then one unique complete text
mark. Defaults are `axis: "both"`, `padding: 3`, `maxDisplacement: 48`,
`bounds: "plot"`, and `leader: false`. Use `axis: "x"` or `"y"` to constrain
movement, or `bounds: "canvas"` to use the complete Canvas rectangle.

The action visits labels in stable materialized order and keeps an existing
position when it already fits. If the requested distance cannot eliminate all
overlap or overflow, the program retains a deterministic best effort and stores
`overlap` or `bounds` warnings in the label-layout resolution summary. It never
expands margins, reduces font size, or searches for an unrelated nearby mark.
For extreme `maxDisplacement` values, candidate generation remains bounded: it
searches the local lattice, adds deterministic distant samples, and does not
search farther than 1,000,000 logical pixels.

Calling `layoutLabels()` again replaces the complete policy and recomputes from
semantic base text rather than accumulating offsets. Text, data, scale, source
mark, and Canvas changes replay that same policy.

See the complete
[Gapminder country-label program](https://github.com/ggaction/ggaction/blob/main/examples/gapminder-country-labels/program.js)
for a point-attached label layer with leaders.

## `removeLabelLayout(options?)`

```javascript
const originalPlacement = arranged.removeLabelLayout();
```

The action removes the policy and any leader collection, then restores the
current semantic base text positions. It does not remove the text mark or its
source relation.

## Related

[Point marks](./point.md) · [Bar marks](./bar.md) · [Rule marks](./rule.md) ·
[Encodings](../encodings.md) · [Annotation recipe](../../recipes/annotations.md)
