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

## Explicit input units

Temporal positions and temporal color accept `temporalUnit: "auto" | "year" |
"timestamp"`. The same option reaches supported Rule datum/endpoints, range
shorthands, facade positions, ErrorBar/ErrorBand independent positions and
Horizon x.

| Input mode | Meaning of numeric 1000 and 2000 |
| --- | --- |
| `timestamp` | Unix milliseconds: 1970-01-01 00:00:01 and 00:00:02 UTC |
| `year` | UTC January 1 in years 1000 and 2000 |
| omitted or `auto` | Existing four-digit numeric year interpretation |

Explicit year accepts integer 0–9999 or exactly four digits. Timestamp requires
a finite number in the Date range; numeric strings, Date objects and automatic
seconds inference are excluded. Other unit names, null and false fail.

```javascript
program.encodeX({
  field: "time", fieldType: "temporal", temporalUnit: "timestamp",
  scale: { nice: false }
});
```

The unit is stored with the binding and leaves source rows unchanged. Reassigning
the same field or datum without a unit retains it; changing field or switching
field/datum returns to automatic parsing. Non-temporal bindings reject the option.
Primary and secondary endpoints can specify different input units on one scale.
Domains and tick values are already timestamps and are never parsed again.
Channel selectors read normalized values; raw-field selectors read original rows.

See the runnable [three-variant example](https://github.com/ggaction/ggaction/tree/main/examples/temporal-input).

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

Rule and row-positioned text annotations may also reuse that temporal bar
scale when their temporal encoding names the same field. A matching annotation
value maps exactly to the corresponding bar center. Annotation-only dates may
extend an automatic time domain, but they do not participate in the
bar-bandwidth calculation, so adding an event between observations does not
silently narrow every bar.

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
