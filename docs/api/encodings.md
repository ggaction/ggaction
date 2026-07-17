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
| Position | `encodeX`, `encodeY`, `encodeXRange`, `encodeYRange`, `encodeXOffset` | Quantitative, temporal, binned, ordinal, or ranged placement |
| Atomic histogram | `encodeHistogram` | Interdependent bin/count semantics |
| Atomic density | `encodeDensity`, `editDensity` | Derived KDE data, immutable revisions, and baseline area geometry |
| Appearance | `encodeColor`, `encodeSize`, `encodeShape`, `encodeOpacity` | Field-driven or fixed point appearance |
| Series | `encodeColor`, `encodeStrokeDash` | Nominal grouping and appearance |
| Constant appearance | `encodeRadius`, `encodePointRadius`, `encodeOpacity`, `encodeBarWidth` | Fixed graphical values |

## Position

[`encodeX` and `encodeY`](./position-encodings.md) create quantitative point
positions, temporal/aggregate line positions, or compatible vertical and
horizontal bar positions including a binned quantitative bar x
encoding. `encodeX` also supports ordinal bar categories. Position actions
establish the Cartesian coordinate and the scale used by later marks and axes.

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
The advanced `encodeXOffset({ field })` action resolves nominal slots within
each x band; grouped color layout normally calls it on the author's behalf.

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
unambiguous. At least one of `bandwidth`, `extent`, `steps`, `kernel`, or
`normalization` is required. The action creates a deterministic namespaced
revision, rebinds the area, releases an unreferenced previous revision, and
rematerializes shared scales, marks, axes, and grids. Earlier programs remain
unchanged.

## Series

[`encodeColor` and `encodeStrokeDash`](./series-encodings.md) create nominal
series identity and concrete colors or dash patterns. On line marks they can
split one aggregate path into multiple series. On complete histograms,
`encodeColor` arranges each color partition with `stack`, `fill`, `group`,
`overlay`, or `diverging`. On bars, group invokes `encodeXOffset`; complete
aggregate and ranged bars use an implicit `0.72` band width unless
`encodeBarWidth` overrides it.
Area marks accept every layout except group and require color to match the
existing semantic group field.
On area marks, color fills an already grouped path collection and must use the
same nominal field as `encodeGroup` or `encodeDensity({ groupBy })`.

```javascript
program
  .encodeColor({ field: "Origin" })
  .encodeStrokeDash({ field: "Origin" });
```

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
