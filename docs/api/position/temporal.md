---
layout: default
title: Temporal Line Positions
---

# Temporal Line Positions

{% include chart-example.html id="line" %}

## At a glance

| Action | Shortest call | Required state | Result |
| --- | --- | --- | --- |
| temporal `encodeX` | `encodeX({ field: "date", fieldType: "temporal" })` | line mark | Resolved UTC time scale |
| aggregate `encodeY` | `encodeY({ field: "value", aggregate: "mean" })` | temporal x | Sorted scalar-aggregate path(s) |

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
| `fieldType` | `"quantitative"`, or `"nominal"` for count operations | `"quantitative"` |
| `aggregate` | scalar name or parameterized aggregate object | required for temporal line marks |
| `coordinate` | coordinate ID | layer coordinate, then `"main"` |
| `scale.id` | scale ID | `"y"` |
| `scale.type` | `"linear"` | `"linear"` |
| `scale.domain` | `"auto"` or two finite numbers | `"auto"` |
| `scale.range` | `"auto"` or two finite numbers | `"auto"` |
| `scale.nice` | boolean | omitted |
| `scale.zero` | boolean | omitted |

The action groups by temporal x and encoded series fields, computes the selected
scalar summary, sorts each series by x, and materializes concrete path commands.
Automatic y domains use final aggregate values rather than raw rows.

When a compatible temporal aggregate bar already owns x and y, a newly created
line mark infers both encodings and reuses the same semantic scale IDs. Do not
repeat `encodeX` or `encodeY` for that line unless it intentionally needs a
different field or scale. Bar centers and line vertices then map the same
temporal values to the same x positions; bar width remains mark layout rather
than a second scale.

Supported operations are `count`, `sum`, `mean`, `median`, `min`, `max`,
`distinct`, `valid`, `missing`, `variance`, `varianceP`, `stdev`, `stdevP`,
`stderr`, `q1`, `q3`, `ciLower`, and `ciUpper`. `distinct`, `valid`, `missing`,
and `count` also accept nominal input fields; their output scale remains linear.
Missing finite samples are omitted instead of becoming zero-valued points.
Sample dispersion, standard error, and confidence endpoints require at least
two finite values per final group.

Parameterized aggregates accept either a quantile probability or an ordered
row selection:

```javascript
program.encodeY({
  field: "Acceleration",
  aggregate: { op: "quantile", probability: 0.75 }
});

program.encodeY({
  field: "Acceleration",
  aggregate: { op: "first", orderBy: "Horsepower" }
});
```

`probability` is required and may range from `0` through `1`; those endpoints
equal the minimum and maximum. Ordered aggregates accept `op: "first"` or
`"last"`, require `orderBy`, and default `order` to `"ascending"`. Ties retain
source-row order. Rows with missing or incomparable order keys are skipped,
and a final group with no selectable finite result is omitted. The normalized
order is stored in `semanticSpec`, so inferred titles such as
`first(Acceleration, Horsepower ascending)` remain reproducible.

## Errors and limitations

The current line slice requires temporal x, a compatible aggregate y, and at
least two complete points per materialized series. Parameterized aggregate
outputs must be quantitative.

## Related

[Position encoding index](../position-encodings.md) ·
[Series encodings](../series-encodings.md) ·
[Line chart tutorial](../../tutorials/line-chart.md)
