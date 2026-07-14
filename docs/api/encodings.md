---
layout: default
title: Encodings
---

# Encodings

Encoding actions connect data fields or constant values to chart channels.
Only values that cannot be inferred safely are required; most target, scale,
coordinate, and type options use the current program state or documented
defaults.

## At a glance

| Family | Core actions | Use it for |
| --- | --- | --- |
| Position | `encodeX`, `encodeY`, `encodeYRange`, `encodeXOffset` | Quantitative, temporal, binned, ordinal, or ranged placement |
| Atomic histogram | `encodeHistogram` | Interdependent bin/count semantics |
| Atomic density | `encodeDensity` | Derived KDE data and baseline area geometry |
| Appearance | `encodeColor`, `encodeSize`, `encodeShape`, `encodeOpacity` | Field-driven or fixed point appearance |
| Series | `encodeColor`, `encodeStrokeDash` | Nominal grouping and appearance |
| Constant appearance | `encodeRadius`, `encodeOpacity`, `encodeBarWidth` | Fixed graphical values |

## Position

[`encodeX` and `encodeY`](./position-encodings.md) create quantitative point
positions, temporal/aggregate line positions, or a binned quantitative bar x
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

Area marks use quantitative x and the atomic ranged action:

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
Both edges share one y scale, whose domain includes lower and upper values.
`encodeGroup` splits area or line paths by a nominal field without creating a
scale or guide.

## Atomic histogram

`encodeHistogram` is the concise equivalent of binned bar `encodeX` followed
by count/zero-stack `encodeY`.

```javascript
program.encodeHistogram({
  field: "Displacement",
  maxBins: 10
});
```

It accepts optional `target`, `coordinate`, `stack`, `xScale`, and `yScale`
options. The action directly records `encodeX` and `encodeY` as its children;
it does not duplicate binning, scale, count, or rect materialization logic.

Use the explicit channel actions when x and y need to be authored as separate
steps. Both forms produce the same semantic and graphical result.

## Atomic density

`encodeDensity` derives Gaussian kernel-density values, rebinds the selected
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
`coordinate`, `valueScale`, and `densityScale`.

The value scale defaults to `{ nice: false, zero: false }`; the density scale
defaults to `{ nice: true, zero: true }`. Explicit scale options override those
defaults. Grouped density delegates to `encodeGroup`, so every observed group
becomes one baseline-closed command path ending in `Z`.

## Series

[`encodeColor` and `encodeStrokeDash`](./series-encodings.md) create nominal
series identity and concrete colors or dash patterns. On line marks they can
split one aggregate path into multiple series. On complete histograms,
`encodeColor` splits every bin into category-stacked rects.
On ordinal aggregate bars, `encodeColor({ layout: "group" })` records non-stacked
color meaning and invokes `encodeXOffset` for the same field. Rectangles remain
empty until `encodeBarWidth({ band? })` authors slot occupancy and materializes
concrete grouped rectangles.
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
