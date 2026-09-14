---
layout: default
title: Encoding Actions
description: Map fields and constants to position, grouping, color, shape, size, and appearance.
---

# Encoding Actions

Each declared action has an exact signature and its own stable link. Option tables are generated from types; behavior prose names the owning workflow and its constraints. API layer and H0–H4 authoring role are independent classifications.

## `encodeX`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeX(options: PositionEncodingOptions | DatumPositionEncodingOptions): ChartProgram;
```

Named option contracts: [`PositionEncodingOptions`](./../types.md#type-positionencodingoptions) · [`DatumPositionEncodingOptions`](./../types.md#type-datumpositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `FieldType \| undefined` |
| `scale` | Optional / branch-dependent | `CategoricalPositionScaleOptions \| NonPointCategoricalPositionScaleOptions \| NonPointQuantitativePositionScaleOptions \| NonPointTemporalPositionScaleOptions \| QuantitativePositionScaleOptions \| TemporalPositionScaleOptions \| undefined` |
| `datum` | Optional / branch-dependent | `unknown` |
| `bin` | Optional / branch-dependent | `{ maxBins?: number \| undefined; step?: undefined; boundaries?: undefined; } \| { maxBins?: undefined; step: number; boundaries?: undefined; } \| { maxBins?: undefined; step?: undefined; boundaries: readonly [...]; } \| undefined` |
| `stack` | Optional / branch-dependent | `StackMode \| undefined` |
| `aggregate` | Optional / branch-dependent | `undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeX({ field, target?, fieldType?, aggregate?, stack?, coordinate?, bin?, scale? })
encodeX({ datum, target?, fieldType?, coordinate?, scale? }) // rule, rect, area, independent text
```

Create or compatibly replace an x encoding for the supported mark/type pairs in
the matrix above. Rects accept a discrete x band or the primary x edge of a
complete x/x2 range. Bars accept binned x, vertical categories, or a horizontal
aggregate measure. Rules, Rects, and independent Text accept exactly one field or datum. Datum positions infer
finite numbers as quantitative and other supported scalars as nominal; field
rules require an explicit field type. All-constant independent Text materializes
once; any field-bound x, y, or text encoding selects row grain.
[Position encodings](../../api/position-encodings.md)


## `encodeY`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeY(options: YPositionEncodingOptions | DatumPositionEncodingOptions): ChartProgram;
```

Named option contracts: [`YPositionEncodingOptions`](./../types.md#type-ypositionencodingoptions) · [`DatumPositionEncodingOptions`](./../types.md#type-datumpositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `FieldType \| undefined` |
| `scale` | Optional / branch-dependent | `CategoricalPositionScaleOptions \| NonPointCategoricalPositionScaleOptions \| NonPointQuantitativePositionScaleOptions \| NonPointTemporalPositionScaleOptions \| QuantitativePositionScaleOptions \| TemporalPositionScaleOptions \| undefined` |
| `datum` | Optional / branch-dependent | `unknown` |
| `aggregate` | Optional / branch-dependent | `undefined` |
| `stack` | Optional / branch-dependent | `YStackMode \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeY({ field?, target?, fieldType?, aggregate?, stack?, coordinate?, scale? })
encodeY({ datum, target?, fieldType?, coordinate?, scale? }) // rule, rect, area, independent text
```

Create or compatibly replace a y encoding. With bar marks, a quantitative y
measure plus ordinal/temporal x produces vertical bars; ordinal/temporal y plus
a quantitative aggregate x produces horizontal bars. Orientation is inferred
from the complete pair and is not stored separately. Bar stack accepts
`"zero"`, `"normalize"`, or `null`.
Aggregate values may be scalar names or parameterized quantile
and ordered first/last objects. A complete histogram x/y pair materializes concrete rects.
Rects accept a discrete y band or the primary y edge of a complete y/y2 range.
Rules, Rects, and independent Text use the same datum inference as x. Attached
source-owned Text continues to reject direct position replacement.
[Position encodings](../../api/position-encodings.md)


## `encodeX2`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeX2(options: SecondaryPositionEncodingOptions): ChartProgram;
```

Named option contracts: [`SecondaryPositionEncodingOptions`](./../types.md#type-secondarypositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `datum` | Optional / branch-dependent | `unknown` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| "quantitative" \| "temporal" \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `{ id?: string \| undefined; } \| { id?: string \| undefined; } \| { id?: string \| undefined; } \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeX2({ field, target?, fieldType, scale?, coordinate? })
encodeX2({ datum, target?, fieldType, scale?, coordinate? })
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary x endpoint.
It requires an existing x and shares its scale and coordinate.
[Position encodings](../../api/position-encodings.md)


## `encodeColor`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeColor(options: ColorEncodingOptions): ChartProgram;
```

Named option contracts: [`ColorEncodingOptions`](./../types.md#type-colorencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| "quantitative" \| "temporal" \| undefined` |
| `scale` | Optional / branch-dependent | `DiscretizedColorScaleOptions \| CategoricalColorScaleOptions \| ContinuousColorScaleOptions \| (Omit<...> & { ...; }) \| undefined` |
| `palette` | Optional / branch-dependent | `Palette \| undefined` |
| `layout` | Optional / branch-dependent | `ColorLayout \| undefined` |
| `aggregate` | Optional / branch-dependent | `AggregateOperation \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

### Color capability matrix

<!-- action-capabilities:color:start -->

| Mode | Supported marks | Field types | Important options |
| --- | --- | --- | --- |
| Categorical | point, line, area, bar, rect, arc | point/line/area/bar/rect/arc: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale |
| Continuous | point, aggregate bar, rect | point/rect: quantitative, temporal; aggregate bar: quantitative | sequential scale; aggregate required for a different bar measure |
| Discretized continuous | point, aggregate bar, rect | point/aggregate bar/rect: quantitative | quantize, quantile, or threshold scale |

<!-- action-capabilities:color:end -->

```javascript
encodeColor({ field, target?, fieldType?, palette?, layout?, aggregate?, scale? })
```

Create or compatibly replace point fill, line-series color, grouped area fill,
bar color, rect fill, or arc-sector fill. Nominal and ordinal categories share an ordinal palette scale;
ordinal fields may contain ordered numeric categories. Categorical bar layout accepts `stack`, `fill`, `group`, `overlay`,
and `diverging`; area also accepts `center` and rejects only `group` from the
shared layout vocabulary. Quantitative and temporal
point fields use a sequential scale; quantitative Point, aggregate Bar, and Rect fields also accept
`quantize`, `quantile`, and `threshold` color classes. Categorical
grouped bars record `encodeXOffset` or `encodeYOffset` as a child according to
orientation. Reassigning grouped color also atomically reassigns its offset and
rematerializes an existing legend. Aggregate
bars accept quantitative sequential or discretized color: a matching measure field inherits
its aggregate, while a different field requires `aggregate`.
Area `layout: "center"` creates a matching nominal group when needed and records
wrapped `encodeY({ stack: "center" })`. It requires non-negative values aligned
at every x position and stacks each partition from `-total / 2`.
Row-owned rects accept categorical or continuous color. Arc sectors accept
categorical color with optional overlay layout.
[Series encodings](../../api/series-encodings.md)


## `encodeStrokeDash`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
```

Named option contracts: [`StrokeDashEncodingOptions`](./../types.md#type-strokedashencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `DashPattern \| DashStyle \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| undefined` |
| `scale` | Optional / branch-dependent | `DashScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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


## `encodeStroke`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeStroke(options: StrokeEncodingOptions): ChartProgram;
```

Named option contracts: [`StrokeEncodingOptions`](./../types.md#type-strokeencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `string \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| "quantitative" \| "temporal" \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `scale` | Optional / branch-dependent | `DiscretizedColorScaleOptions \| CategoricalColorScaleOptions \| ContinuousColorScaleOptions \| (Omit<...> & { ...; }) \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeStroke({ value, target? })
encodeStroke({ field, target?, fieldType?, temporalUnit?, scale? })
```

Assign a constant non-empty stroke color or map a categorical, quantitative, or
temporal field to the outline of a Point, Line, Area, Bar, Rect, Arc, Rule, or
Tick. Line and Area values must be constant within each final series. Constant
mode clears the field binding and its own legend; field mode clears the constant
override. Text outlines are outside this action.
[Appearance encodings](../../api/appearance.md)


## `encodeStrokeWidth`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeStrokeWidth(options: StrokeWidthEncodingOptions): ChartProgram;
```

Named option contracts: [`StrokeWidthEncodingOptions`](./../types.md#type-strokewidthencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Optional / branch-dependent | `number \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |
| `scale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeStrokeWidth({ value, target? })
encodeStrokeWidth({ field, target?, fieldType?, scale? })
```

Assign a non-negative finite logical Canvas width to a Line or Rule. Field mode
maps one quantitative value per rule row or complete line series. Constant mode
clears the field and its own sampled width legend; fieldType/scale are invalid in
constant mode. Active channel selections must be removed before replacement.
[Appearance encodings](../../api/appearance.md)


## `encodeSize`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeSize(options: SizeEncodingOptions): ChartProgram;
```

Named option contracts: [`SizeEncodingOptions`](./../types.md#type-sizeencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |
| `scale` | Optional / branch-dependent | `SizeScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeSize({ field, target?, fieldType?, scale? })
```

Encode or replace a quantitative field as equal-area point size. The automatic area range
is `[24, 196]`. Size scales support continuous `linear`, `log`, `sqrt`, and
`pow` mappings plus discrete `quantize`, `quantile`, and `threshold` mappings.
[Appearance encodings](../../api/appearance.md)


## `encodeShape`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeShape(options: ShapeEncodingOptions): ChartProgram;
```

Named option contracts: [`ShapeEncodingOptions`](./../types.md#type-shapeencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| undefined` |
| `scale` | Optional / branch-dependent | `ShapeScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeShape({ field, target?, fieldType?, scale? })
```

Encode or replace a nominal field with the shared 12-value point-shape vocabulary.
[Appearance encodings](../../api/appearance.md)


## `encodeAngle`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeAngle(options: AngleEncodingOptions): ChartProgram;
```

Named option contracts: [`AngleEncodingOptions`](./../types.md#type-angleencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `number \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeAngle({ target?, value })
encodeAngle({ target?, field, fieldType? })
```

Rotate point or Tick glyphs with direct clockwise degrees: `0` points up and
no scale or legend is created. Reassignment replaces the prior constant/field
branch; remove it with `removeEncoding({ channel: "angle" })`.
[Encodings](../../api/encodings.md#direction)


## `encodeOpacity`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
```

Named option contracts: [`OpacityEncodingOptions`](./../types.md#type-opacityencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Optional / branch-dependent | `number \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |
| `scale` | Optional / branch-dependent | `OpacityScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeOpacity({ value, target? })
encodeOpacity({ field, target?, fieldType?, scale? })
```

Apply a constant point/rule/line opacity from `0` to `1`, or map a quantitative field
through a linear opacity scale. The two modes are mutually exclusive and may
replace each other through the same action. Lines require one raw field value per
series and support sampled opacity legends. Constant mode clears its field and
owned opacity legend and rejects fieldType/scale or selections using that channel.
[Appearance encodings](../../api/appearance.md)


## `encodeRadius`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeRadius(options: { value: number; target?: string }): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `number` |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../../api/appearance.md)


## `encodeTheta`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeTheta(options: ThetaEncodingOptions): ChartProgram;
```

Named option contracts: [`ThetaEncodingOptions`](./../types.md#type-thetaencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `ThetaScaleOptions \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |
| `weight` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| "quantitative" \| "temporal" \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeTheta({ field, target?, fieldType?, aggregate?, weight?, scale?, coordinate? })
```

Encode Polar angle in clockwise degrees from 12 o'clock. Quantitative,
temporal, ordinal, and nominal fields are supported for point and line marks.
For arc marks, an aggregate-free quantitative field directly determines each
row's proportional sector angle. Nominal or ordinal arc fields support
`aggregate: "count"`, `aggregate: "sum"` plus `weight`, or categorical theta
bands paired with radius. The default scale ID is `theta` and its automatic
range is `[0, 360]`.
[Polar positions](../../api/position-encodings.md#polar-positions)


## `encodeR`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeR(options: RadialEncodingOptions): ChartProgram;
```

Named option contracts: [`RadialEncodingOptions`](./../types.md#type-radialencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `mapping` | Optional / branch-dependent | `false \| RadialMapping \| undefined` |
| `aggregate` | Optional / branch-dependent | `"count" \| "sum" \| undefined` |
| `scale` | Optional / branch-dependent | `RadiusScaleOptions \| MeasuredRadiusScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeR({ field?, aggregate?, mapping?, target?, fieldType?, scale?, coordinate? })
```

Encode a quantitative field as Polar radial distance. The default `radius`
scale fits the current plot bounds and rematerializes after Canvas edits.
Measured Arc radius accepts count/sum with `mapping: "area"` or
`"radius-length"`. Reassign with `{ field, mapping: false }` to atomically
replace a measured category aggregate with ordinary row-level radial length.
[Polar positions](../../api/position-encodings.md#polar-positions)


## `encodePointRadius`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodePointRadius(options: { value: number; target?: string }): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `value` | Required | `number` |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodePointRadius({ value, target? })
```

Apply a constant point glyph radius through a traced `encodeRadius` child. This
does not assign semantic Polar radial position.
[Constant appearance](../../api/appearance.md)


## `removePointRadius`

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removePointRadius(options?: { target?: string }): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removePointRadius({ target? } = {})
```

Remove an explicit constant point glyph radius and restore the theme default.
Semantic Polar radial position is unchanged.
[Point appearance](../../api/appearance/point.md)


## `encodeXOffset`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
```

Named option contracts: [`XOffsetEncodingOptions`](./../types.md#type-xoffsetencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| undefined` |
| `scale` | Optional / branch-dependent | `OffsetScaleOptions \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeXOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update a categorical sub-slot scale within a bar, point, or
rule x category. Point/rule marks use slot centers; bars use slot bandwidth.
Padding defaults to zero and is preserved on a later same-field call. Grouped
bar color layout normally invokes this action automatically.
[Position encodings](../../api/position-encodings.md)


## `encodeYOffset`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeYOffset(options: YOffsetEncodingOptions): ChartProgram;
```

Named option contracts: [`YOffsetEncodingOptions`](./../types.md#type-yoffsetencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| undefined` |
| `scale` | Optional / branch-dependent | `OffsetScaleOptions \| undefined` |
| `paddingInner` | Optional / branch-dependent | `number \| undefined` |
| `paddingOuter` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeYOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update the corresponding categorical offset scale within
a bar, point, or rule y category. Horizontal grouped bar color invokes this
action as a wrapped child; explicit domain order, reversed range, and padding
follow the same contract as `encodeXOffset`.
[Position encodings](../../api/position-encodings.md)


## `encodeY2`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeY2(options: SecondaryPositionEncodingOptions): ChartProgram;
```

Named option contracts: [`SecondaryPositionEncodingOptions`](./../types.md#type-secondarypositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `datum` | Optional / branch-dependent | `unknown` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| "ordinal" \| "quantitative" \| "temporal" \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `scale` | Optional / branch-dependent | `{ id?: string \| undefined; } \| { id?: string \| undefined; } \| { id?: string \| undefined; } \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeY2({ field, target?, fieldType, scale?, coordinate? })
encodeY2({ datum, target?, fieldType, scale?, coordinate? }) // rule
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary y endpoint.
It requires an existing y and shares its scale and coordinate.
[Position encodings](../../api/position-encodings.md)


## `encodeYRange`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeYRange(options: RangePositionEncodingOptions): ChartProgram;
```

Named option contracts: [`RangePositionEncodingOptions`](./../types.md#type-rangepositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| "temporal" \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `scale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| NonPointTemporalPositionScaleOptions \| undefined` |
| `lower` | Required | `string \| { datum: number; }` |
| `upper` | Required | `string \| { datum: number; }` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeY` and `encodeY2`. Area bounds accept field strings or `{ datum: number }`, with at least one field. Final endpoints and scale are validated together.
[Encodings](../../api/encodings.md)


## `encodeXRange`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeXRange(options: RangePositionEncodingOptions): ChartProgram;
```

Named option contracts: [`RangePositionEncodingOptions`](./../types.md#type-rangepositionencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| "temporal" \| undefined` |
| `temporalUnit` | Optional / branch-dependent | `TemporalInputUnit \| undefined` |
| `scale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| NonPointTemporalPositionScaleOptions \| undefined` |
| `lower` | Required | `string \| { datum: number; }` |
| `upper` | Required | `string \| { datum: number; }` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeX` and `encodeX2`. Area bounds accept field strings or `{ datum: number }`, with at least one field.
[Encodings](../../api/encodings.md)


## `encodeGroup`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeGroup(options: GroupEncodingOptions): ChartProgram;
```

Named option contracts: [`GroupEncodingOptions`](./../types.md#type-groupencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `fieldType` | Optional / branch-dependent | `"nominal" \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `fields` | Optional / branch-dependent | `readonly [string, ...string[]] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeGroup({ field, target?, fieldType? })
encodeGroup({ fields: [first, ...rest], target?, fieldType? })
```

Split Line or ordinary Area paths by one nominal field or a non-empty unique tuple.
Explicit groups alone define identity; each appearance field must have one raw
value within each series. Single-element tuples normalize to the scalar field form.
Without explicit Line groups, color and dash retain their shared-field grouping.
Statistical and stacked-layout groups remain owned by their existing actions.
[Encodings](../../api/encodings.md)


## `encodePathOrder`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodePathOrder(options: PathOrderEncodingOptions): ChartProgram;
```

Named option contracts: [`PathOrderEncodingOptions`](./../types.md#type-pathorderencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `fieldType` | Optional / branch-dependent | `"quantitative" \| undefined` |
| `order` | Optional / branch-dependent | `"ascending" \| "descending" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodePathOrder({ field, target?, fieldType?, order? })
```

Order vertices within each compatible Cartesian line or ranged-area series.
`fieldType` defaults to `"quantitative"`; `order` defaults to `"ascending"`.
Ties preserve source-row order, and no scale or guide is created.
[Series encodings](../../api/series-encodings.md)


## `encodeParallelCoordinates`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeParallelCoordinates(options: ParallelCoordinatesEncodingOptions): ChartProgram;
```

Named option contracts: [`ParallelCoordinatesEncodingOptions`](./../types.md#type-parallelcoordinatesencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `dimensions` | Required | `readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]]` |
| `key` | Optional / branch-dependent | `string \| undefined` |
| `missing` | Optional / branch-dependent | `ParallelMissingPolicy \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeParallelCoordinates({ dimensions, target?, coordinate?, key?, missing? })
```

Atomically assign ordered dimensions and their local scales to one line mark.
The default missing policy is `"break"`.
[Parallel Coordinates](../../api/parallel-coordinates.md#advanced-encoding)


## `removePathOrder`

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removePathOrder(options?: RemovePathOrderOptions): ChartProgram;
```

Named option contracts: [`RemovePathOrderOptions`](./../types.md#type-removepathorderoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removePathOrder({ target? } = {})
```

Remove explicit path topology and restore the mark's automatic independent-
position ordering. [Series encodings](../../api/series-encodings.md)


## `orderCategories`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
orderCategories(options: OrderCategoriesOptions): ChartProgram;
```

Named option contracts: [`OrderCategoriesOptions`](./../types.md#type-ordercategoriesoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"theta" \| "x" \| "y"` |
| `values` | Optional / branch-dependent | `readonly CategoryValue[] \| undefined` |
| `by` | Optional / branch-dependent | `"category" \| "count" \| CategoryOrderSummary \| undefined` |
| `direction` | Optional / branch-dependent | `"ascending" \| "descending" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
orderCategories({ target?, channel, values })
orderCategories({ target?, channel, by, direction? })
```

Assign explicit or computed semantic order to a nominal/ordinal Cartesian x/y or
Polar theta position. Omitted explicit values and computed ties preserve source
first-appearance order. The scale, connected marks, axis, and selection-item
order are updated together. [Category ordering](../../api/position/category-ordering.md)


## `removeCategoryOrder`

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeCategoryOrder(options: RemoveCategoryOrderOptions): ChartProgram;
```

Named option contracts: [`RemoveCategoryOrderOptions`](./../types.md#type-removecategoryorderoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"theta" \| "x" \| "y"` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeCategoryOrder({ target?, channel })
```

Remove one active category-order assignment and restore automatic
first-appearance order. [Category ordering](../../api/position/category-ordering.md)


## `removeEncoding`

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
removeEncoding(options: { target?: string; channel: | "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "angle" | "group" | "opacity" | "text"; }): ChartProgram;
```

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `channel` | Required | `"angle" \| "color" \| "group" \| "opacity" \| "radius" \| "shape" \| "size" \| "stroke" \| "strokeDash" \| "strokeWidth" \| "text" \| "theta" \| "x" \| "x2" \| "xOffset" \| "y" \| "y2" \| "yOffset"` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
removeEncoding({ target?, channel })
```

Remove one active semantic encoding, its generated companions, matching guide
blocks, and stale concrete values. Named datasets, scales, and coordinates are
retained; incomplete marks remain empty until later encoding completion.
[Encodings](../../api/encodings.md#removing-an-encoding)


## `encodeText`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeText(options: TextEncodingOptions): ChartProgram;
```

Named option contracts: [`TextEncodingOptions`](./../types.md#type-textencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `format` | Optional / branch-dependent | `ValueFormat \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `value` | Optional / branch-dependent | `unknown` |
| `content` | Optional / branch-dependent | `"category" \| "share" \| "value" \| undefined` |
| `normalizeBy` | Optional / branch-dependent | `"category" \| "source" \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeText({ target?, field?, value?, format? })
```

Assign exactly one field, constant value, or semantic content to a text mark.
`format` accepts `"auto"`, `.0`–`.12` precision with `f`, `%`, or `e`, or a UTC
pattern composed from `%Y`, `%m`, `%d`, `%b`, `%%`, and literals. Reassignment
replaces the previous content branch. [Text marks](../../api/marks/text.md)


## `encodeHistogram`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
```

Named option contracts: [`HistogramEncodingOptions`](./../types.md#type-histogramencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `field` | Required | `string` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `stack` | Optional / branch-dependent | `StackMode \| undefined` |
| `xScale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |
| `yScale` | Optional / branch-dependent | `NonPointZeroSupportingPositionScaleOptions \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `maxBins` | Optional / branch-dependent | `number \| undefined` |
| `binStep` | Optional / branch-dependent | `number \| undefined` |
| `binBoundaries` | Optional / branch-dependent | `readonly [number, number, ...number[]] \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

Creation `groupBy:false` explicitly requests ungrouped Regression, Density or
Horizon and survives JSON serialization. Editors preserve omission, reject
explicit undefined and clear with false. Data-only transform groupBy options
remain unchanged.


## `encodeDensity`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeDensity(options: DensityEncodingOptions): ChartProgram;
```

Named option contracts: [`DensityEncodingOptions`](./../types.md#type-densityencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Required | `string` |
| `bandwidth` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `steps` | Optional / branch-dependent | `number \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `normalization` | Optional / branch-dependent | `DensityNormalization \| undefined` |
| `weight` | Optional / branch-dependent | `StatisticalWeight \| undefined` |
| `as` | Optional / branch-dependent | `readonly [string, string] \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `densityChannel` | Optional / branch-dependent | `"x" \| "y" \| undefined` |
| `coordinate` | Optional / branch-dependent | `string \| undefined` |
| `valueScale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |
| `placement` | Optional / branch-dependent | `BaselineDensityPlacement \| CategoryDensityPlacement \| undefined` |
| `densityScale` | Optional / branch-dependent | `NonPointZeroSupportingPositionScaleOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editDensity(options: EditDensityOptions): ChartProgram;
```

Named option contracts: [`EditDensityOptions`](./../types.md#type-editdensityoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `field` | Optional / branch-dependent | `string \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `bandwidth` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `extent` | Optional / branch-dependent | `"auto" \| readonly [number, number] \| undefined` |
| `steps` | Optional / branch-dependent | `number \| undefined` |
| `kernel` | Optional / branch-dependent | `DensityKernel \| undefined` |
| `normalization` | Optional / branch-dependent | `DensityNormalization \| undefined` |
| `weight` | Optional / branch-dependent | `false \| StatisticalWeight \| undefined` |
| `densityChannel` | Optional / branch-dependent | `"x" \| "y" \| undefined` |
| `valueScale` | Optional / branch-dependent | `NonPointQuantitativePositionScaleOptions \| undefined` |
| `placement` | Optional / branch-dependent | `DensityPlacement \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
editDensity({
  target?, source?, field?, groupBy?, bandwidth?, extent?, steps?, kernel?,
  normalization?, placement?
})
```

Create an immutable density-data revision, rebind the selected density area,
and rematerialize its graphical consumers. `source`, `field`, and `groupBy`
can revise create-time data roles; `groupBy: false` removes grouping. Output
fields, density channel, coordinate, and position scale IDs are preserved.
[Encodings](../../api/encodings.md#atomic-density)


## `encodeHorizon`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeHorizon(options?: HorizonEncodingOptions): ChartProgram;
```

Named option contracts: [`HorizonEncodingOptions`](./../types.md#type-horizonencodingoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| HorizonXEncoding \| undefined` |
| `y` | Optional / branch-dependent | `string \| HorizonYEncoding \| undefined` |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `bands` | Optional / branch-dependent | `number \| undefined` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `extent` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `resolve` | Optional / branch-dependent | `HorizonResolution \| undefined` |
| `missing` | Optional / branch-dependent | `HorizonMissingPolicy \| undefined` |
| `overflow` | Optional / branch-dependent | `HorizonOverflowPolicy \| undefined` |
| `palette` | Optional / branch-dependent | `HorizonPaletteOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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

**API layer:** user-facing. **Authoring roles:** H2, H3.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
editHorizon(options: EditHorizonOptions): ChartProgram;
```

Named option contracts: [`EditHorizonOptions`](./../types.md#type-edithorizonoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `groupBy` | Optional / branch-dependent | `string \| false \| undefined` |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `source` | Optional / branch-dependent | `string \| undefined` |
| `x` | Optional / branch-dependent | `string \| HorizonXEncoding \| undefined` |
| `y` | Optional / branch-dependent | `string \| HorizonYEncoding \| undefined` |
| `bands` | Optional / branch-dependent | `number \| undefined` |
| `baseline` | Optional / branch-dependent | `number \| undefined` |
| `extent` | Optional / branch-dependent | `number \| "auto" \| undefined` |
| `resolve` | Optional / branch-dependent | `HorizonResolution \| undefined` |
| `missing` | Optional / branch-dependent | `HorizonMissingPolicy \| undefined` |
| `overflow` | Optional / branch-dependent | `HorizonOverflowPolicy \| undefined` |
| `palette` | Optional / branch-dependent | `HorizonPaletteOptions \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

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


## `encodeBarWidth`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
encodeBarWidth(options?: BarWidthOptions): ChartProgram;
```

Named option contracts: [`BarWidthOptions`](./../types.md#type-barwidthoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `band` | Optional / branch-dependent | `number \| undefined` |
| `pixels` | Optional / branch-dependent | `number \| undefined` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
encodeBarWidth({ band?, pixels?, target? })
```

Set aggregate or ranged bar width before or after its positions are complete.
Incomplete bars retain the width without creating items; histogram bins do not
accept it. The modes are mutually exclusive. The first omitted mode defaults to
`band: 0.72`; later omission retains the current mode.
[Constant appearance](../../api/appearance.md)


## `layoutSeries`

**API layer:** user-facing. **Authoring roles:** H2.

**Availability:** Available by v0.0.13. See [release compatibility](../../version.md).

```typescript
layoutSeries(options: SeriesLayoutOptions): ChartProgram;
```

Named option contracts: [`SeriesLayoutOptions`](./../types.md#type-serieslayoutoptions).

<details markdown="1">
<summary>Declared options</summary>

Generated from the current TypeScript declaration. Union branches can require different combinations; optional does not mean every combination is valid.

| Option | Presence | Type |
| --- | --- | --- |
| `target` | Optional / branch-dependent | `string \| undefined` |
| `mode` | Required | `ColorLayout` |

</details>

The following call patterns are abbreviated examples; the declaration above owns the complete option set.

```javascript
layoutSeries({ target?, mode })
```

Assign group, stack, fill, overlay, diverging, or center placement independently of color. Full supports Bar
and Area; Basic supports Bar and excludes center. Aggregate/histogram bars support all modes except center,
ranged bars only overlay, and areas reject group. Ribbons support overlay only; raw accumulation requires
aligned rows and a zero baseline. Stack/fill/center require nonnegative values; diverging separates signs.
A zero-total fill has zero thickness and a [0,1] domain. Density retains its statistical orientation limits.

`encodeGroup` owns identity and source first-appearance order; color owns appearance. Reassign this action to
change placement. Leaving group removes its active offset and unused automatic offset scale; user/shared
scales survive. Removing color preserves identity and placement. Switch to overlay before removing a required
group. Legacy color.layout, measure.stack and Bar offsets delegate to this action; the last explicit layout
request wins. Color reassignment without layout preserves the stored mode. Stack aliases zero/normalize/null/
center mean stack/fill/overlay/center. Failed topology, shared-scale or guide validation preserves the previous program.


## Previous reference location {#encodechannels}

This contract moved: [open the current action or shared contract](./advanced.md#encodechannels).

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
