---
layout: default
title: Text Marks
---

# Text marks

{% include chart-example.html id="annotation" %}

Text marks turn data values into visible labels. Add one after a compatible point,
bar, rect, or rule layer and ggaction persists that layer as the annotation source.

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
layer—or one unique compatible layer—supplies its dataset, Cartesian position,
and final visual-item grain. This means aggregate bars receive one label per bar,
while rect labels anchor at cell centers. Pass `data` explicitly to assemble an independent
text layer with `encodeX` and `encodeY`.

Creation options are `id`, `data`, `text`, `fill`, `opacity`, `fontSize`,
`fontFamily`, `fontWeight`, `align`, `baseline`, `rotation`, `dx`, and `dy`.
The `text` option is constant-content shorthand.

## Font weights

`fontWeight` accepts a non-empty CSS weight string or a finite number. To keep
Canvas, SVG, PNG, and PDF output consistent, numeric values are rounded to the
nearest 100 and clamped to the backend-safe `100`–`900` range before rendering.
For example, `650` renders as `700`. The authored value remains unchanged in the
program state. Titles, facet headers, legends, and Cartesian or Polar axis text
use this same renderer policy.

## `encodeText({ target?, field?, value?, format? })`

Provide exactly one of `field` or `value`. `format` defaults to `"auto"`; fixed
decimal formats from `".0f"` through `".12f"` are available for numeric content.
Calling `encodeText` again replaces the previous field or constant assignment.

```javascript
bars
  .createTextMark({ dy: -4, align: "center" })
  .encodeText({ field: "value", format: ".1f" });
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
