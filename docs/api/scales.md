---
layout: default
title: Scale Options
---

# Scale Options

{% include chart-example.html id="density" %}

## At a glance

| Scale family | Default domain | Default range | Common controls |
| --- | --- | --- | --- |
| Continuous position | `"auto"` | Plot bounds | `type`, `nice`, `zero`, `clamp`, `reverse` |
| Band/point position | First-appearance order | Plot bounds | padding and alignment |
| Ordinal appearance/xOffset | First-appearance order | Palette, patterns, or parent band | explicit domain/range |
| Color/strokeDash | First-appearance order | Built-in palette/patterns | palette or explicit range |
| Sequential/discretized color | Type-specific numeric boundaries | `viridis` or explicit colors | `interpolate`, `clamp`, `reverse` |

Encoding actions accept a nested `scale` object. Omitted properties use channel
defaults and stored program state.

Existing scales can be changed with `editScale`:

```javascript
const reversed = program.editScale({ id: "x", reverse: true });
```

Color scales can use the same top-level palette shorthand during creation and
editing. It is mutually exclusive with `range`:

```javascript
const recolored = program.editScale({ id: "color", palette: "set2" });
```

Advanced authors can create a named unattached scale with the same complete
type vocabulary:

```javascript
const program = chart().createScale({
  id: "temperature",
  type: "sequential",
  domain: [0, 100],
  palette: "viridis"
});
```

The accepted types are `linear`, `log`, `pow`, `sqrt`, `symlog`, `time`,
`band`, `point`, `ordinal`, `sequential`, `quantize`, `quantile`, and
`threshold`. A later encoding attachment validates whether the type, range,
and fallback are compatible with that channel and mark.

`id` may be omitted when the current scale or the program's only scale is
unambiguous. At least one editable option is required. Use `"auto"` to reset
domain or range; omission preserves the current value. Quantitative position
scales can change atomically between `linear`, `log`, `pow`, `sqrt`, and
`symlog`:

```javascript
const logarithmic = program.editScale({ id: "x", type: "log", base: 10 });
```

Categorical bar positions use `band`; categorical point and rule positions use
`point`. Both preserve first-appearance domain order. A band scale exposes a
non-zero slot width and accepts `paddingInner`, `paddingOuter`, and `align`.
A point scale exposes zero bandwidth and accepts `padding` and `align`.

```javascript
program.encodeX({
  field: "country",
  fieldType: "nominal",
  scale: { type: "band", paddingInner: 0.2, paddingOuter: 0.1 }
});
```

`align` is between `0` and `1`; both padding families are non-negative and
`paddingInner` is less than `1`. `editScale` rematerializes all connected marks
and guides. A band can be shared by bars and point centers, but changing it to
`point` is rejected while a bar requires its bandwidth.

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

## Discrete and ordinal scales

Band/point position, color, and stroke-dash encodings use ordered discrete
domains. Automatic domains preserve first-appearance order. `ordinal` remains
the appearance and offset lookup type; position uses explicit `band` or `point`.

A band or point position scale uses `"auto"` or a numeric pair as its range.
Automatic ranges use the plot bounds. Resolved band scales record signed
`step`, aligned `start`, and positive `bandwidth`; point scales record the same
geometry with zero bandwidth. Marks, ticks, labels, and grids read the same
resolved centers. Reversed explicit ranges are valid.

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

## Continuous point and aggregate-bar color

Quantitative or temporal point color uses `fieldType: "quantitative"` or
`"temporal"` and an internal sequential scale. Aggregate bars support
quantitative sequential color with one aggregate value per final rectangle.
The default palette is
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

The sequential type is inferred inside `encodeColor` and is also available to
direct `createScale` and compatible atomic `editScale` transitions.

For aggregate bars, a color field equal to the measure field inherits its
aggregate. A different quantitative field requires an explicit `aggregate`.
The automatic domain is derived from those final aggregate values, not from
the unaggregated source rows.

## Discretized point color

Quantitative point color can create concrete color classes instead of a
continuous gradient:

- `quantize` divides a numeric extent into equal-width intervals.
- `quantile` derives boundaries that keep observed class counts as even as
  possible.
- `threshold` uses an explicit, strictly increasing boundary array. A domain
  with `n` boundaries requires `n + 1` colors.

```javascript
program.encodeColor({
  field: "life_expect",
  fieldType: "quantitative",
  scale: {
    type: "threshold",
    domain: [60, 70, 75, 80],
    range: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"]
  }
});
```

An exact boundary belongs to the upper interval. `reverse: true` reverses the
resolved colors without changing boundaries. `createLegend()` infers an
interval legend with labels such as `< 60`, `60–70`, and `≥ 80`. These
mappings are available through quantitative point `encodeColor` and the direct
scale vocabulary. A type-changing `editScale` call validates the complete
replacement definition before rematerializing its consumers.

## Missing and invalid values

Point encodings can provide an `unknown` fallback inside their scale options:

```javascript
program.encodeX({
  field: "value",
  scale: { domain: [0, 100], unknown: 20 }
});
```

The fallback is used for a missing or field-type-invalid input. For ordinal
point position or appearance, it also handles a value outside an explicit
domain. It never becomes a domain member. Output validation follows the
channel: position uses a finite coordinate, color a non-empty string, size a
non-negative area, opacity a value from `0` to `1`, and shape one supported
point shape.

This policy is intentionally limited to row-owned point items. A missing value
inside a line/area path, bar aggregate, rule, xOffset group, or stroke-dash
series could change item topology; those consumers reject `unknown` until they
have a separate topology-safe policy. A direct unattached scale stores its
fallback and defers channel validation until attachment. Set
`unknown: undefined` with `editScale` to remove an existing fallback.

## Errors and limitations

One scale cannot be shared across different channels. Explicit domains must
contain every observed value required by ordinal consumers. A successful edit
rematerializes connected marks and guides; a failed edit leaves the earlier
immutable program unchanged.

Scale type transitions reject incompatible field types, channels, or mark
grains before changing the immutable program. Discretized color transitions
currently require quantitative point color; sequential color supports points
and aggregate bars. An active gradient or interval legend also fixes its
current recipe family, so a transition between sequential and discretized
color is rejected instead of silently replacing the guide.

## Related

[Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) · [Semantic and graphical state](../concepts/semantic-and-graphics.md) ·
[Troubleshooting](../troubleshooting.md)
