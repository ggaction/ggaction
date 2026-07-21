---
layout: default
title: Encoding Actions
description: Map fields and constants to position, grouping, color, shape, size, and appearance.
---

# Encoding Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `encodeX`

```javascript
encodeX({ field, target?, fieldType?, aggregate?, stack?, coordinate?, bin?, scale? })
encodeX({ datum, target?, fieldType, coordinate?, scale? }) // rule
```

Create or compatibly replace an x encoding for the supported mark/type pairs in
the matrix above. Rects accept a discrete x band or the primary x edge of a
complete x/x2 range. Bars accept binned x, vertical categories, or a horizontal
aggregate measure. Rules accept exactly one field or datum and an explicit
field type.
[Position encodings](../../api/position-encodings.md)

## `encodeY`

```javascript
encodeY({ field?, target?, fieldType?, aggregate?, stack?, coordinate?, scale? })
encodeY({ datum, target?, fieldType, coordinate?, scale? }) // rule
```

Create or compatibly replace a y encoding. With bar marks, a quantitative y
measure plus ordinal/temporal x produces vertical bars; ordinal/temporal y plus
a quantitative aggregate x produces horizontal bars. Orientation is inferred
from the complete pair and is not stored separately. Bar stack accepts
`"zero"`, `"normalize"`, or `null`.
Aggregate values may be scalar names or parameterized quantile
and ordered first/last objects. A complete histogram x/y pair materializes concrete rects.
Rects accept a discrete y band or the primary y edge of a complete y/y2 range.
Rules accept exactly one field or datum and an explicit field type.
[Position encodings](../../api/position-encodings.md)

## `encodeY2`

```javascript
encodeY2({ field, target?, fieldType, scale?, coordinate? })
encodeY2({ datum, target?, fieldType, scale?, coordinate? }) // rule
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary y endpoint.
It requires an existing y and shares its scale and coordinate.
[Position encodings](../../api/position-encodings.md)

## `encodeX2`

```javascript
encodeX2({ field, target?, fieldType, scale?, coordinate? })
encodeX2({ datum, target?, fieldType, scale?, coordinate? })
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary x endpoint.
It requires an existing x and shares its scale and coordinate.
[Position encodings](../../api/position-encodings.md)

## `encodeYRange`

```javascript
encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeY` and `encodeY2`.
[Encodings](../../api/encodings.md)

## `encodeXRange`

```javascript
encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeX` and `encodeX2`.
[Encodings](../../api/encodings.md)

## `encodeGroup`

```javascript
encodeGroup({ field, target?, fieldType? })
```

Split line or area paths by a nominal field without creating a scale or guide.
[Encodings](../../api/encodings.md)

## `encodePathOrder`

```javascript
encodePathOrder({ field, target?, fieldType?, order? })
```

Order vertices within each compatible Cartesian line or ranged-area series.
`fieldType` defaults to `"quantitative"`; `order` defaults to `"ascending"`.
Ties preserve source-row order, and no scale or guide is created.
[Series encodings](../../api/series-encodings.md)

## `encodeParallelCoordinates`

```javascript
encodeParallelCoordinates({ dimensions, target?, coordinate?, key?, missing? })
```

Atomically assign ordered dimensions and their local scales to one line mark.
The default missing policy is `"break"`.
[Parallel Coordinates](../../api/parallel-coordinates.md#advanced-encoding)

## `removePathOrder`

```javascript
removePathOrder({ target? } = {})
```

Remove explicit path topology and restore the mark's automatic independent-
position ordering. [Series encodings](../../api/series-encodings.md)

## `encodeText`

```javascript
encodeText({ target?, field?, value?, format? })
```

Assign exactly one field or constant value to a text mark. `format` accepts
`"auto"` or fixed-decimal tokens from `".0f"` through `".12f"`. Reassignment
replaces the previous content branch. [Text marks](../../api/marks/text.md)

## `encodeXOffset`

```javascript
encodeXOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update an advanced nominal offset scale within an ordinal
bar x band. Padding defaults to zero and is preserved when omitted on a later
same-field call. Grouped color layout normally invokes this action automatically.
[Position encodings](../../api/position-encodings.md)

## `encodeYOffset`

```javascript
encodeYOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update the corresponding categorical offset scale within
an ordinal bar y band. Horizontal grouped color layout invokes this action as a
wrapped child; explicit domain order, reversed range, and padding follow the
same contract as `encodeXOffset`.
[Position encodings](../../api/position-encodings.md)

## `encodeHistogram`

```javascript
encodeHistogram({
  field, target?, coordinate?, maxBins?, binStep?, binBoundaries?,
  stack?, xScale?, yScale?
})
```

Compose binned bar `encodeX` and count `encodeY` as one atomic
histogram action. Choose at most one of `maxBins`, `binStep`, and
`binBoundaries`. `maxBins` defaults to `10`; `stack` defaults to `"zero"`.
Use `stack: "normalize"` for a unit-height partition.
[Encodings](../../api/encodings.md)

## `encodeDensity`

```javascript
encodeDensity({
  field, target?, source?, groupBy?, bandwidth?, extent?, steps?, kernel?,
  normalization?, as?, densityChannel?, coordinate?, valueScale?, densityScale?
})
```

Create immutable KDE data, bind it to an area mark, encode its value
and density fields, and materialize baseline-closed paths. Density defaults to
the y channel; kernel and normalization default to `"gaussian"` and `"unit"`.
Pass `densityChannel: "x"` for a horizontal orientation.
[Encodings](../../api/encodings.md#atomic-density)

## `editDensity`

```javascript
editDensity({ target?, bandwidth?, extent?, steps?, kernel?, normalization? })
```

Create an immutable density-data revision, rebind the selected density area,
and rematerialize its graphical consumers. Omitted density settings are
preserved and at least one editable setting is required.
[Encodings](../../api/encodings.md#atomic-density)

## `encodeHorizon`

```javascript
encodeHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
} = {})
```

Create immutable folded-band data, bind it to an area mark, and author the
ordinary x, y/y2, group, and color encodings needed for a compact Horizon
chart. Compatible target, source, and fields are inferred when unambiguous.
[Encodings](../../api/encodings.md#atomic-horizon)

## `editHorizon`

```javascript
editHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
})
```

Create and bind an immutable Horizon revision, preserve omitted settings and
scale identities, and rematerialize affected consumers. `groupBy: false`
removes grouping.
[Encodings](../../api/encodings.md#atomic-horizon)

## `encodeColor`

### Color capability matrix

<!-- action-capabilities:color:start -->
| Mode | Supported marks | Field types | Important options |
| --- | --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | point/line/area/bar/rect/arc: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale |
| Continuous | point, aggregate bar, rect | point/rect: quantitative, temporal; aggregate bar: quantitative | sequential scale; aggregate required for a different bar measure |
| Discretized continuous | point | point: quantitative | quantize, quantile, or threshold scale |
<!-- action-capabilities:color:end -->

```javascript
encodeColor({ field, target?, fieldType?, palette?, layout?, aggregate?, scale? })
```

Create or compatibly replace point fill, line-series color, grouped area fill,
bar color, rect fill, or arc-sector fill. Nominal and ordinal categories share an ordinal palette scale;
ordinal fields may contain ordered numeric categories. Categorical bar layout accepts `stack`, `fill`, `group`, `overlay`,
and `diverging`; area accepts all except `group`. Quantitative and temporal
point fields use a sequential scale; quantitative point fields also accept
`quantize`, `quantile`, and `threshold` color classes. Categorical
grouped bars record `encodeXOffset` or `encodeYOffset` as a child according to
orientation. Reassigning grouped color also atomically reassigns its offset and
rematerializes an existing legend. Aggregate
bars accept quantitative sequential color: a matching measure field inherits
its aggregate, while a different field requires `aggregate`.
Row-owned rects accept categorical or continuous color. Arc sectors accept
categorical color with optional overlay layout.
[Series encodings](../../api/series-encodings.md)

## `encodeStrokeDash`

```javascript
encodeStrokeDash(
  { field, target?, fieldType?, scale? }
  | { value, target? }
)
```

Create or replace nominal line-series or rule dash patterns, or apply one
constant named/direct pattern. Named styles are `solid`, `dashed`, `dotted`, and
`dashdot`.
[Series encodings](../../api/series-encodings.md)

## `encodeRadius`

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../../api/appearance.md)

## `encodeTheta`

```javascript
encodeTheta({ field, target?, fieldType?, aggregate?, scale?, coordinate? })
```

Encode Polar angle in clockwise degrees from 12 o'clock. Quantitative,
temporal, ordinal, and nominal fields are supported for point and line marks.
Arc marks accept nominal or ordinal fields and optional `aggregate: "count"`.
The default scale ID is `theta` and its automatic range is `[0, 360]`.
[Polar positions](../../api/position-encodings.md#polar-positions)

## `encodeR`

```javascript
encodeR({ field, target?, fieldType?, scale?, coordinate? })
```

Encode a quantitative field as Polar radial distance. The default `radius`
scale fits the current plot bounds and rematerializes after Canvas edits.
[Polar positions](../../api/position-encodings.md#polar-positions)

## `encodePointRadius`

```javascript
encodePointRadius({ value, target? })
```

Apply a constant point glyph radius through a traced `encodeRadius` child. This
does not assign semantic Polar radial position.
[Constant appearance](../../api/appearance.md)

## `encodeSize`

```javascript
encodeSize({ field, target?, fieldType?, scale? })
```

Encode or replace a quantitative field as equal-area point size. The automatic area range
is `[24, 196]`. [Appearance encodings](../../api/appearance.md)

## `encodeShape`

```javascript
encodeShape({ field, target?, fieldType?, scale? })
```

Encode or replace a nominal field with the shared 12-value point-shape vocabulary.
[Appearance encodings](../../api/appearance.md)

## `encodeOpacity`

```javascript
encodeOpacity({ value, target? })
encodeOpacity({ field, target?, fieldType?, scale? })
```

Apply a constant point/rule opacity from `0` to `1`, or map a quantitative field
through a linear opacity scale. The two modes are mutually exclusive and may
replace each other through the same action.
[Appearance encodings](../../api/appearance.md)

## `encodeStroke`

```javascript
encodeStroke({ value, target? })
```

Assign a constant non-empty stroke string to a rule mark.
[Appearance encodings](../../api/appearance.md)

## `encodeStrokeWidth`

```javascript
encodeStrokeWidth({ value, target? })
```

Assign a non-negative finite logical Canvas width to a rule mark.
[Appearance encodings](../../api/appearance.md)

## `encodeBarWidth`

```javascript
encodeBarWidth({ band?, pixels?, target? })
```

Set aggregate-bar band occupancy or a fixed logical-pixel width and materialize
concrete rectangles. The modes are mutually exclusive. The first omitted mode
defaults to `band: 0.72`; later omission retains the current mode.
[Constant appearance](../../api/appearance.md)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
