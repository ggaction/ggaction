---
layout: default
title: Series Encodings
---

# Series Encodings

{% include chart-example.html id="line" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `encodeColor` | `encodeColor({ field: "group" })` | Current mark, nominal default or explicit ordinal field type, color scale | Semantic grouping and concrete color |
| `encodeStrokeDash` | `encodeStrokeDash({ field: "group" })` | Current line/rule mark and dash scale | Field-driven or constant concrete dash |
| `encodeStrokeWidth` | `encodeStrokeWidth({ field: "weight" })` | Current line/rule; independent quantitative scale | Rule-item or line-series widths |
| `encodePathOrder` | `encodePathOrder({ field: "year" })` | Current or unique compatible Cartesian path; ascending default | Stable per-series vertex order without a scale |

Series appearance is authored through color, stroke-dash, and stroke-width families. Each
focused page owns the complete options, replacement behavior, and errors for
that encoding.

## Explicit path topology

```javascript
const ordered = program.encodePathOrder({
  field: "year",
  order: "ascending"
});

const automatic = ordered.removePathOrder();
```

`encodePathOrder` supports direct Cartesian quantitative/temporal lines and
ordinary ranged areas backed by raw or row-preserving data. It sorts each
color/group/stroke-dash series independently, keeps repeated positions, and
uses source-row order to break ties. The field is quantitative, `order` is
`"ascending"` or `"descending"`, and neither action creates a scale or guide.

Aggregate lines, Polar lines, and generated density, error, or regression paths
own their topology elsewhere and are rejected. Missing or non-finite order
values reject the complete action instead of producing a partial path.

## Focused series families

<div class="docs-entry-grid docs-entry-grid--two">
  <a href="{{ '/api/series/color/' | relative_url }}"><strong>Color</strong><span>Categorical and continuous color, grouping layouts, and aggregate bars.</span></a>
  <a href="{{ '/api/series/stroke-dash/' | relative_url }}"><strong>Stroke dash</strong><span>Constant and field-driven dash patterns for lines and rules.</span></a>
</div>

## Errors and limitations

Stroke-dash and explicit group fields must be nominal. Color fields may be
nominal or ordinal. Area color must match its group encoding. Line group,
color, and field-driven stroke dash must use one compatible field.
Combined line legends also require matching ordered domains.
Stroke width is quantitative and independent of point size. A line series must
have exactly one width value across all contributing rows; segment-local and
tapered widths are unsupported.

## Related

[Scale options](./scales.md) · [Legends](./legends.md) ·
[Position encodings](./position-encodings.md)
