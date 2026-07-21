---
layout: default
title: Encodings
---

# Encodings

{% include chart-example.html id="regression" %}

Encoding actions connect data fields or constant values to chart channels.
Only values that cannot be inferred safely are required; most target, scale,
coordinate, and type options use the current program state or documented
defaults.

## At a glance

| Family | Core actions | Use it for |
| --- | --- | --- |
| Position | `encodeX`, `encodeY`, `encodeXRange`, `encodeYRange`, `encodeXOffset`, `encodeYOffset` | Quantitative, temporal, binned, ordinal, or ranged placement |
| Atomic histogram | `encodeHistogram` | Interdependent bin/count semantics |
| Atomic density | `encodeDensity`, `editDensity` | Derived KDE data, immutable revisions, and baseline area geometry |
| Atomic Horizon | `encodeHorizon`, `editHorizon` | Fold signed time-series deviations into compact area bands |
| Appearance | `encodeColor`, `encodeSize`, `encodeShape`, `encodeOpacity` | Field-driven or fixed point appearance |
| Series | `encodeColor`, `encodeStrokeDash`, `encodePathOrder` | Nominal grouping, appearance, and explicit path topology |
| Constant appearance | `encodeRadius`, `encodePointRadius`, `encodeOpacity`, `encodeBarWidth` | Fixed graphical values |
| Text | `encodeText` | Field-driven or constant annotation content |

## Supported mark/channel matrix

<!-- action-capabilities:summary:start -->
The tables below are generated from the same reviewed capability registry used by the focused API pages.

### Position channels

| Action | Supported marks | Field types | Important modes |
| --- | --- | --- | --- |
| `encodeX` | point, line, area, bar, rect, rule, text | point/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, text | point/line/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule also accepts datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: ordinal, nominal | arc accepts aggregate: count or weighted sum for proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |

### Color channels

| Mode | Supported marks | Field types | Important options |
| --- | --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | point/line/area/bar/rect/arc: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale |
| Continuous | point, aggregate bar, rect | point/rect: quantitative, temporal; aggregate bar: quantitative | sequential scale; aggregate required for a different bar measure |
| Discretized continuous | point | point: quantitative | quantize, quantile, or threshold scale |

### Selection and guides

| Action | Supported marks | Grain | Result |
| --- | --- | --- | --- |
| `selectMarks` / `highlightMarks` | point, bar, line, area, rect, arc, rule | item; stacked bars also support stack | selection intent and mark-specific durable emphasis |

| Legend family | Supported marks | Channels |
| --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | color, shape, strokeDash, or compatible composites |
| Continuous gradient | point, aggregate bar, rect | sequential color |
| Discretized interval | point | quantize, quantile, or threshold color |
| Sampled | point, line, rule | field opacity, size, or strokeWidth |

| Axis family | Create | Edit | Editable components |
| --- | --- | --- | --- |
| Cartesian complete axis | `createXAxis` / `createYAxis` / `createAxes` | `editXAxis` / `editYAxis` | line, ticks, labels, ticksAndLabels, title, position |
| Polar complete axis | `createThetaAxis` / `createRadialAxis` / `createAxes` | `editThetaAxis` / `editRadialAxis` | line, ticks, labels, ticksAndLabels, title, angle or position |
| Parallel dimension axes | `createAxes` |  | line, ticks, labels, title from each stored dimension |
<!-- action-capabilities:summary:end -->

## Position

[`encodeX` and `encodeY`](./position-encodings.md) create quantitative point
positions, temporal/aggregate line positions, or compatible vertical and
horizontal bar positions including a binned quantitative bar x
encoding. `encodeX` also supports ordinal bar categories. Position actions
establish the Cartesian coordinate and the scale used by later marks and axes.

For rect marks, nominal or ordinal x/y positions resolve full band cells.
Quantitative or temporal rects require complete x/x2 and y/y2 endpoint pairs;
partial pairs preserve semantic intent without placeholder graphics.

```javascript
program
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" });
```

```javascript
barProgram.encodeX({
  field: "Displacement",
  bin: { maxBins: 10 }
}).encodeY();
```

```javascript
groupedBarProgram.encodeX({ field: "year", fieldType: "ordinal" });
```

Ordinal bar x resolves its domain and band geometry but leaves concrete rects
empty until aggregate y and group layout are authored. On an ordinal bar,
`encodeY({ field, aggregate })` computes its automatic scale domain from the
selected summary at each final x/category and series grain. `aggregate`
defaults to `"mean"` and may also use a parameterized quantile or ordered
`first`/`last` object. It still leaves rects empty until grouping is authored.
The advanced `encodeXOffset({ field })` and `encodeYOffset({ field })` actions
resolve categorical slots within x or y bands; grouped color layout normally
calls the matching action on the author's behalf.

Ranged area and bar marks use one categorical/independent position and one atomic range action. A
vertical range uses `encodeYRange`:

```javascript
area
  .encodeX({ field: "Displacement" })
  .encodeYRange({
    lower: "__regression_ci_lower",
    upper: "__regression_ci_upper"
  })
  .encodeGroup({ field: "Origin" });
```

`encodeYRange` records `encodeY` then advanced `encodeY2` as wrapped children.
The horizontal counterpart records `encodeX` then `encodeX2`:

```javascript
area
  .encodeY({ field: "Acceleration" })
  .encodeXRange({
    lower: "Displacement_lower",
    upper: "Displacement_upper"
  });
```

Both range edges share one scale, whose domain includes lower and upper values.
`encodeGroup` splits area or line paths by a nominal field without creating a
scale or guide.

For a bar mark, the same range actions create one concrete rectangle per
observed category immediately, using `0.72` of the category band by default.
`encodeBarWidth({ band })` overrides that fraction; `pixels` keeps a fixed
logical width across Canvas changes.

## Atomic histogram

`encodeHistogram` is the concise equivalent of binned bar `encodeX` followed
by count `encodeY`.

```javascript
program.encodeHistogram({
  field: "Displacement",
  binStep: 60
});
```

Choose one of inferred `maxBins`, exact `binStep`, or explicit irregular
`binBoundaries`. The action also accepts optional `target`, `coordinate`,
`stack`, `xScale`, and `yScale` options. Stack accepts `"zero"`, `"normalize"`,
or `null`; normalized partitions use an automatic `[0, 1]` y domain. The action
directly records `encodeX` and
`encodeY` as its children; it does not duplicate binning, scale, count, or
rect materialization logic. Calling it again on the same bar atomically
replaces both histogram fields and rematerializes connected guides.

Use the explicit channel actions when x and y need to be authored as separate
steps. Both forms produce the same semantic and graphical result.

## Atomic density

`encodeDensity` derives kernel-density values, rebinds the selected
area mark to that immutable dataset, and authors both positional channels as
one action.

```javascript
area.encodeDensity({
  field: "Acceleration",
  groupBy: "Origin",
  bandwidth: 0.6
});
```

`target` defaults to the current or only area mark, while `source` defaults to
that mark's current dataset. Output fields, shared extent, 100 sample steps,
and a vertical density axis are inferred. Set `densityChannel: "x"` to orient
the density horizontally. Advanced options include `extent`, `steps`, `as`,
`coordinate`, `valueScale`, and `densityScale`. Choose `kernel` from
`"gaussian"`, `"epanechnikov"`, `"uniform"`, or `"triangular"`; it defaults
to Gaussian. `normalization` is `"unit"` by default or `"count"` to scale each
group by its valid sample count.

The value scale defaults to `{ nice: false, zero: false }`; the density scale
defaults to `{ nice: true, zero: true }`. Explicit scale options override those
defaults. Grouped density delegates to `encodeGroup`, so every observed group
becomes one baseline-closed command path ending in `Z`.

Set `placement: { type: "category" }` to use the group field as a categorical
band and map density to concrete width around each band center:

```javascript
area.encodeDensity({
  field: "Acceleration",
  groupBy: "Origin",
  placement: {
    type: "category",
    width: { band: 0.8, resolve: "shared" }
  }
});
```

Category placement defaults to density width on x, so the category maps to x
and source values map to y. Use `densityChannel: "y"` for a horizontal shape.
`side` accepts the compatible left/right or top/bottom half; alternatively,
`split: { field, domain? }` assigns exactly two values to opposite halves.
Category placement uses `placement.scale` for its band and does not accept
`densityScale`.

Use `editDensity` to revise an existing density without mutating its source or
previous derived values:

```javascript
const revised = area.editDensity({
  target: "densities",
  bandwidth: 0.9,
  kernel: "triangular",
  normalization: "count"
});
```

The target may be omitted when the current or only density area is
unambiguous. At least one of `bandwidth`, `extent`, `steps`, `kernel`,
`normalization`, or `placement` is required. Use
`placement: { type: "baseline" }` to replace categorical placement with the
ordinary zero-baseline density layout. The action creates a deterministic namespaced
revision, rebinds the area, releases an unreferenced previous revision, and
rematerializes shared scales, marks, axes, and grids. Earlier programs remain
unchanged.

## Atomic Horizon

`encodeHorizon` folds signed deviations from a baseline into repeated area
bands. It is useful when a long series needs substantially less vertical space
than an ordinary line or area chart.

```javascript
area.encodeHorizon({
  x: "year",
  y: "life_expect",
  bands: 3,
  baseline: 55,
  palette: { positive: "blues", negative: "reds" }
});
```

The target defaults to the current or only area mark, and the source defaults
to that mark's dataset. `x` and `y` may be omitted when compatible encodings
are uniquely inferable. The x field may be quantitative or temporal; y is
quantitative. `groupBy` may be inferred from an existing group encoding.

`bands` defaults to `3`, `baseline` to `0`, and `extent` to `"auto"`.
`resolve: "shared"` uses one amplitude extent across groups; `"independent"`
normalizes each group separately. Missing y values break paths by default;
use `missing: "error"` for strict input. Explicit extents clip overflow by
default or reject it with `overflow: "error"`.

The action creates immutable derived data, binds the area to it, and records
ordinary x, y/y2, group, and color encodings. Folded y always uses `[0, 1]`.
Horizon charts intentionally omit the y axis and color legend; compatible
guides create only the original x axis and x grid. The Canvas and PNG renderers
draw ordinary closed paths and do not contain a Horizon-specific renderer.

Use `editHorizon` to revise the transform without mutating earlier programs:

```javascript
const revised = program.editHorizon({
  bands: 4,
  baseline: 58,
  palette: { positive: "teals" }
});
```

At least one option is required. Omitted values are preserved, while
`groupBy: false` removes grouping. The action creates a deterministic immutable
dataset revision, retains scale identities, releases an unreferenced prior
revision, and rematerializes shared consumers. Facets preserve the parent
extent for shared y scales and recompute it per cell for independent y scales.

See the [Horizon tutorial](../tutorials/horizon.md) for a complete runnable
example.

## Series

[`encodeColor` and `encodeStrokeDash`](./series-encodings.md) create categorical
series identity and concrete colors or dash patterns. On line marks they can
split one aggregate path into multiple series. On complete histograms,
`encodeColor` arranges each color partition with `stack`, `fill`, `group`,
`overlay`, or `diverging`. On bars, group invokes `encodeXOffset`; complete
aggregate and ranged bars use an implicit `0.72` band width unless
`encodeBarWidth` overrides it.
Area marks accept every layout except group and require color to match the
existing semantic group field.
On area marks, color fills an already grouped path collection and must use the
same nominal field as `encodeGroup` or `encodeDensity({ groupBy })`. A
category-placed density may instead color its approved two-value split field.

```javascript
program
  .encodeColor({ field: "Origin" })
  .encodeStrokeDash({ field: "Origin" });
```

`encodePathOrder({ field: "year" })` is independent of position and appearance:
it connects each line or ranged-area series by an explicit quantitative field.
The action creates no scale or guide, preserves source order for ties, and keeps
repeated positions as separate vertices. `removePathOrder()` restores the
existing automatic independent-position ordering.

## Point appearance

[`encodeSize`, `encodeShape`, and field-driven `encodeOpacity`](./appearance.md)
create semantic field encodings. Constant `encodeOpacity` and `encodeRadius`
store graphical values. A single point materializer combines the stored
channels, so their call order does not change the resulting graphics.

```javascript
program
  .encodeSize({ field: "Acceleration" })
  .encodeShape({ field: "Origin" })
  .encodeOpacity({ value: 0.27 });
```

## Text content

`encodeText` assigns exactly one field or constant value to a text mark. It does
not create a scale. Use `"auto"` formatting or a fixed-decimal token such as
`".1f"`; attached text inherits the final point, bar, or rule item position.
See [Text marks](./marks/text.md) for source inference and editing.

## Scale options

[Scale options](./scales.md) explains automatic and explicit domains, ranges,
`nice`, `zero`, palettes, and dash-pattern ranges.

## Errors and limitations

Inference fails instead of selecting arbitrarily when multiple marks, scales,
datasets, or coordinates are valid. Unsupported field/mark/channel
combinations are rejected before partial state is authored.

## Related

[Position encodings](./position-encodings.md) ·
[Series encodings](./series-encodings.md) ·
[Constant appearance](./appearance.md) · [Scale options](./scales.md)
