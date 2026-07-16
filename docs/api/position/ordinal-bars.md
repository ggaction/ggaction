---
layout: default
title: Bar Positions
---

# Bar Positions

{% include chart-example.html id="bar" %}

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| ordinal `encodeX` | `encodeX({ field: "category", fieldType: "ordinal" })` | bar mark | Ordered x bands |
| aggregate `encodeY` | `encodeY({ field: "value" })` | ordinal bar x | Aggregate/non-stacked y scale |
| temporal `encodeX` | `encodeX({ field: "year", fieldType: "temporal" })` | bar mark | Time-positioned vertical bars |
| horizontal pair | quantitative aggregate x + ordinal/temporal y | bar mark | Horizontal bars |

## Ordinal bar `encodeX(options)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `fieldType` | `"ordinal"` | required |
| `target` | bar mark ID | current mark |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"ordinal"` | `"ordinal"` |
| `scale.domain` | `"auto"` or unique nominal values | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |

```javascript
program.encodeX({ field: "year", fieldType: "ordinal" });
```

Automatic domains preserve first-appearance order. Automatic ranges use the
horizontal plot bounds and resolve a shared `step` and `bandwidth`. This action
leaves the rect collection empty because aggregate y and layout are incomplete.

## Aggregate ordinal bar `encodeY(options)`

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `fieldType` | `"quantitative"`, or `"nominal"` for count operations | `"quantitative"` |
| `aggregate` | scalar name or parameterized aggregate object | `"mean"` |
| `stack` | `null` | `null` |
| `target` | bar mark ID | current mark |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"y"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | `true` |
| `scale.zero` | boolean | `false` |

```javascript
program.encodeY({
  field: "perc",
  aggregate: "mean",
  scale: { nice: true, zero: false }
});
```

The automatic domain uses aggregate summaries at the final available grouping
grain. Parameterized quantile and ordered `first`/`last` use the same contract
as temporal line y encodings. Group and overlay bars start at the semantic value
zero, so their automatic domain contains zero even when `scale.zero` is `false`.
An explicit domain for either layout must contain zero; otherwise the encoding
fails before creating extrapolated or clipped rectangles.
Grouping and `encodeBarWidth` later supply enough information to materialize
concrete rectangles.

## Temporal and horizontal bars

Bar orientation is inferred from the completed position pair; it is not stored
as a separate mark option.

```javascript
program
  .encodeX({ field: "year", fieldType: "temporal" })
  .encodeY({ field: "perc", aggregate: "mean" });

program
  .encodeX({ field: "perc", aggregate: "mean" })
  .encodeY({ field: "year", fieldType: "ordinal" });
```

Temporal input normalization happens only while resolving scales and geometry.
The dataset and semantic field remain unchanged. Numeric or string four-digit
years map to January 1 UTC; `YYYY-MM-DD`, `YYYY/MM/DD`, and finite timestamps
are also accepted.

## Errors and limitations

Ordinal position does not accept `nice` or `zero`. Vertical grouped bars use
`xOffset`; horizontal `layout: "group"` remains unavailable until `yOffset`
exists. Horizontal stack, overlay, fill, and diverging layouts use the
quantitative x measure.

## Related

[Offsets](./offsets.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md) · [Bar chart tutorial](../../tutorials/grouped-bar.md)
