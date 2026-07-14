---
layout: default
title: Ordinal Bar Positions
---

# Ordinal Bar Positions

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| ordinal `encodeX` | `encodeX({ field: "category", fieldType: "ordinal" })` | bar mark | Ordered x bands |
| aggregate `encodeY` | `encodeY({ field: "value" })` | ordinal bar x | Aggregate/non-stacked y scale |

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
as temporal line y encodings.
Grouping and `encodeBarWidth` later supply enough information to materialize
concrete rectangles.

## Errors and limitations

Ordinal position does not accept `nice` or `zero`. The current bar slice
supports aggregate y and grouped color layout; negative baselines and
horizontal bars are unsupported.

## Related

[Offsets](./offsets.md) · [Series encodings](../series-encodings.md) ·
[Constant appearance](../appearance.md) · [Bar chart tutorial](../../tutorials/grouped-bar.md)
