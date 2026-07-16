---
layout: default
title: Scale Options
---

# Scale Options

## At a glance

| Scale family | Default domain | Default range | Common controls |
| --- | --- | --- | --- |
| Continuous point position | `"auto"` | Plot bounds | `type`, `nice`, `zero`, `clamp`, `reverse` |
| Ordinal position/xOffset | First-appearance order | Plot or parent band | explicit domain/range |
| Color/strokeDash | First-appearance order | Built-in palette/patterns | palette or explicit range |

Encoding actions accept a nested `scale` object. Omitted properties use channel
defaults and stored program state.

Existing scales can be changed with `editScale`:

```javascript
const reversed = program.editScale({ id: "x", reverse: true });
```

`id` may be omitted when the current scale or the program's only scale is
unambiguous. At least one editable option is required. Use `"auto"` to reset
domain or range; omission preserves the current value. Quantitative point
scales can change atomically between `linear`, `log`, `pow`, `sqrt`, and
`symlog`:

```javascript
const logarithmic = program.editScale({ id: "x", type: "log", base: 10 });
```

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

For quantitative point positions, `log` requires a strictly positive or
strictly negative domain and rejects `zero`. `pow` is sign-preserving, `sqrt`
is its fixed exponent-`0.5` specialization, and `symlog` supports values on
both sides of zero. Axes and grids use the same transformed mapping as points.

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
series cell rather than raw source values. This includes parameterized quantile
and ordered `first`/`last` results. Explicit domain and range values remain authoritative.
The y action resolves the scale but leaves rectangles empty until grouping
semantics are available.

## Ordinal scales

Ordinal bar x, color, and stroke-dash encodings use ordinal scales. Automatic
domains preserve first-appearance order.

An ordinal bar x scale uses `"auto"` or a numeric pair as its range. Automatic
ranges use the horizontal plot bounds. The resolved scale records one equal
`step` per domain value and an absolute `bandwidth`; category positions lie at
band centers. Reversed explicit ranges are valid. Ordinal scales reject
`nice` and `zero`.

Color ranges accept explicit colors or a named palette descriptor; stroke-dash
ranges accept named styles and direct dash patterns.

```javascript
program.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    range: ["#4c78a8", "#f58518", "#e45756"]
  }
});
```

User-specified domains and ranges are semantic state. Resolved coordinates,
colors, and dash patterns are stored as concrete graphical values.

### Stroke-dash ranges

The names `solid`, `dashed`, `dotted`, and `dashdot` resolve to `[]`, `[6, 4]`,
`[1, 3]`, and `[6, 3, 1, 3]`. A direct pattern is an empty array or an
even-length array of non-negative finite numbers that is not entirely zero.

```javascript
program.encodeStrokeDash({
  field: "Origin",
  scale: { range: ["solid", "dashed", [8, 3]] }
});
```

Semantic scale state preserves the names; the resolved scale, line paths, and
legend symbols contain numeric patterns only. Pattern lengths use logical
Canvas units and do not change with output pixel ratio.

## Named palettes

Use a name directly or an object with optional sampling controls:

```javascript
program.encodeColor({
  field: "Origin",
  scale: { palette: { name: "set2", count: 3 } }
});
```

Accepted names are fixed by the ggaction contract:

| Family | Names |
| --- | --- |
| Categorical | `accent`, `category10`, `category20`, `category20b`, `category20c`, `observable10`, `dark2`, `paired`, `pastel1`, `pastel2`, `set1`, `set2`, `set3`, `tableau10`, `tableau20` |
| Sequential | `blues`, `tealblues`, `teals`, `greens`, `browns`, `oranges`, `reds`, `purples`, `warmgreys`, `greys`, `viridis`, `magma`, `inferno`, `plasma`, `cividis`, `turbo`, `bluegreen`, `bluepurple`, `goldgreen`, `goldorange`, `goldred`, `greenblue`, `orangered`, `purplebluegreen`, `purpleblue`, `purplered`, `redpurple`, `yellowgreenblue`, `yellowgreen`, `yelloworangebrown`, `yelloworangered`, `darkblue`, `darkgold`, `darkgreen`, `darkmulti`, `darkred`, `lightgreyred`, `lightgreyteal`, `lightmulti`, `lightorange`, `lighttealblue` |
| Diverging | `blueorange`, `brownbluegreen`, `purplegreen`, `pinkyellowgreen`, `purpleorange`, `redblue`, `redgrey`, `redyellowblue`, `redyellowgreen`, `spectral` |
| Cyclical | `rainbow`, `sinebow` |

`count` must be a positive integer. Categorical palettes use a prefix when the
count is shorter and cycle deterministically when it is longer. Other families
are sampled to `count`, or to the resolved domain size when omitted. `extent`
is accepted only for non-categorical palettes and contains two distinct values
within `[0, 1]`; descending values reverse the sampling direction. Scale
`reverse` is applied afterward.

The semantic scale stores the palette descriptor. Materialized scales, marks,
legends, and renderers receive only concrete CSS colors. Explicit `range` and
`palette` cannot be supplied together.

## Continuous point color

Quantitative or temporal point color uses `fieldType: "quantitative"` or
`"temporal"` and an internal sequential scale. The default palette is
`viridis`; an explicit palette may use `extent`, while an explicit range needs
at least two colors. `interpolate` accepts `rgb`, `hsl`, `hsl-long`, `lab`,
`hcl`, `hcl-long`, `cubehelix`, or `cubehelix-long`. `clamp` and `reverse`
affect both points and a connected gradient legend.

```javascript
program.encodeColor({
  field: "Acceleration",
  fieldType: "quantitative",
  scale: { palette: "viridis", interpolate: "rgb" }
});
```

The sequential type is inferred inside `encodeColor`; it is not added to the
general direct `createScale` vocabulary.

## Errors and limitations

One scale cannot be shared across different channels. Explicit domains must
contain every observed value required by ordinal consumers. A successful edit
rematerializes connected marks and guides; a failed edit leaves the earlier
immutable program unchanged.

Transformed position materialization currently supports point marks. Other
mark types reject these scale types until their path or rectangle materializers
implement the same mapping.

## Related

[Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Troubleshooting](../troubleshooting.md)
