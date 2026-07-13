---
layout: default
title: Temporal Line Positions
---

# Temporal Line Positions

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| temporal `encodeX` | `encodeX({ field: "date", fieldType: "temporal" })` | line mark | Resolved UTC time scale |
| aggregate `encodeY` | `encodeY({ field: "value", aggregate: "mean" })` | temporal x | Sorted aggregate path(s) |

## Temporal line `encodeX(options)`

```javascript
program.encodeX({
  field: "Year",
  fieldType: "temporal",
  scale: { nice: true }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"temporal"` | required for line marks |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"x"` |
| `scale.type` | `"time"` | `"time"` |
| `scale.domain` | `"auto"` or two finite timestamps | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |

Parseable date strings and finite timestamps are normalized for scale
resolution without changing the source dataset. The path remains empty until y
is encoded.

## Aggregate line `encodeY(options)`

```javascript
program.encodeY({
  field: "Acceleration",
  aggregate: "mean",
  scale: { nice: true, zero: false }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `field` | non-empty string | required |
| `target` | line mark ID | current mark |
| `fieldType` | `"quantitative"` | `"quantitative"` |
| `aggregate` | `"mean"` | required for line marks |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"y"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |
| `scale.zero` | boolean | omitted |

The action groups by encoded non-aggregate fields, computes each mean, sorts
each series by temporal x, and materializes concrete path points. Automatic y
domains use aggregate means rather than raw rows.

## Errors and limitations

The current line slice requires temporal x, quantitative mean y, and at least
two points per materialized series.

## Related

[Position encoding index](../position-encodings.md) ·
[Series encodings](../series-encodings.md) ·
[Line chart tutorial](../../tutorials/line-chart.md)
