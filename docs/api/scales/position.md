---
layout: default
title: Position Scales
---

# Position Scales

{% include chart-example.html id="scatterplot" %}

{% include chart-example.html id="line" %}

## Compatibility matrix

| Scale family | Current compatible consumers |
| --- | --- |
| `linear`, `log`, `pow`, `sqrt`, `symlog` | Quantitative x/y on point, line, area, bar, and rule recipes that support that encoding |
| `time` | Temporal x/y on compatible marks; UTC normalization, ticks, and labels |
| `band` | Discrete category position that needs positive bandwidth, especially bars |
| `point` | Discrete point/rule centers and compatible shared centers; never bar width |
| `ordinal` | Nominal color, shape, stroke dash, and xOffset lookup |
| `sequential` | Quantitative/temporal point color and quantitative aggregate-bar color |
| `quantize`, `quantile`, `threshold` | Quantitative point color |
| `unknown` fallback | Row-owned point x/y/color/size/shape/opacity only |

The field type, channel, mark recipe, and all consumers of a shared scale must
agree. `editScale` validates that complete matrix before applying any semantic
or graphical change.

## Continuous scales

| Option | Type | Default |
| --- | --- | --- |
| `id` | scale ID | channel name |
| `type` | `"linear"`, `"log"`, `"pow"`, `"sqrt"`, `"symlog"`, or `"time"` | inferred from field type |
| `domain` | `"auto"` or two values | `"auto"` |
| `range` | `"auto"` or two finite numbers | `"auto"` |
| `nice` | boolean | omitted |
| `zero` | boolean | omitted; linear/pow/sqrt/symlog only |
| `clamp` | boolean | omitted (`false`) |
| `reverse` | boolean | omitted (`false`) |
| `base` | positive finite number except `1` | `10`; log only |
| `exponent` | positive finite number | `1`; pow only |
| `constant` | positive finite number | `1`; symlog only |

Automatic ranges use current plot bounds. For automatic linear domains,
`zero: true` includes zero and `nice: true` then expands to rounded boundaries.
Automatic temporal `nice` expands to UTC calendar boundaries. Time scales
reject `zero`.

For quantitative positions, `log` requires a strictly positive or
strictly negative domain and rejects `zero`. `pow` is sign-preserving, `sqrt`
is its fixed exponent-`0.5` specialization, and `symlog` supports values on
both sides of zero. Point, line, area, bar, and rule materializers use the same
mapping, and axes and grids read the same resolved scale.

Temporal field values are normalized while resolving the scale, without
rewriting the source dataset. Finite timestamps are accepted directly;
four-digit numbers or strings are UTC years, and validated `YYYY-MM-DD` or
`YYYY/MM/DD` strings are UTC calendar dates.

The precedence is:

```text
explicit domain > nice / zero > inferred domain
reverse(explicit range > inferred range)
```

`clamp: true` constrains values outside a continuous position domain to the nearest
range endpoint. `reverse: true` reverses the final resolved range. Ordinal
scales support `reverse` but reject `nice`, `zero`, and `clamp`.

### Binned bar x scales

A binned bar x encoding defaults to `nice: true` and `zero: false`. Automatic
nice bin boundaries use `1, 2, 3, 5 × 10ⁿ` steps and never create more than
`bin.maxBins` intervals. Explicit domains remain unchanged; `nice` and `zero`
do not expand them.

The resolved scale domain contains the outer bin boundaries. Concrete bin
counts and rect geometry are materialized once count/zero-stack y is present.

A histogram count y scale defaults to `nice: true` and `zero: true`. Its
automatic domain uses total counts per x bin rather than raw source values.
The x action leaves the collection empty; the y action resolves both scales and
materializes concrete histogram rectangles.

### Aggregate ordinal bar y scales

An ordinal bar aggregate y scale defaults to `nice: true` and `zero: false`.
Its automatic domain uses one final aggregate value per ordinal x/category and
series cell rather than raw source values. Group and overlay layouts also include
their semantic zero baseline in the automatic domain, even when `zero: false`;
that option does not remove an endpoint required by bar geometry. This includes
parameterized quantile and ordered `first`/`last` results. An explicit group or
overlay domain must contain zero, while explicit range values remain authoritative.
The y action resolves the scale but leaves rectangles empty until grouping
semantics are available.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
