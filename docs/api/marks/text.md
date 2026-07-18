---
layout: default
title: Text Marks
---

# Text marks

{% include chart-example.html id="annotation" %}

Text marks turn data values into visible labels. Add one after a compatible point,
bar, or rule layer and ggaction persists that layer as the annotation source.

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
not one label per source row. Pass `data` explicitly to assemble an independent
text layer with `encodeX` and `encodeY`.

Creation options are `id`, `data`, `text`, `fill`, `opacity`, `fontSize`,
`fontFamily`, `fontWeight`, `align`, `baseline`, `rotation`, `dx`, and `dy`.
The `text` option is constant-content shorthand.

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
source geometry and attached labels. ggaction does not perform automatic label
collision avoidance; use filtering and explicit offsets for dense charts.

## Related

[Point marks](./point.md) · [Bar marks](./bar.md) · [Rule marks](./rule.md) ·
[Encodings](../encodings.md)
