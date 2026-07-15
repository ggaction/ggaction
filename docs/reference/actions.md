---
layout: default
title: Action Reference
---

# Action Reference

Every supported direct action accepts one plain option object and returns a new
immutable `ChartProgram`. This page covers the methods declared on the public
`ChartProgram` type. Additional wrapped operations may appear inside a trace;
those are implementation steps, not supported direct-call APIs.

Each action entry starts with its callable signature and a concise observable
effect. Follow the linked API page for required values, defaults and inference,
semantic and graphic effects, rematerialization, and errors. Chart-authoring
actions are the recommended workflow; advanced and extension actions are
available when that workflow does not express the required control.

## Quick navigation

- [Chart authoring](#chart-authoring-api)
- [Advanced chart actions](#advanced-chart-api)
- [Extension actions](#extension-api)
- [Internal trace operations](#internal-trace-operations)
- [Rendering functions](#rendering-functions)

## Chart Authoring API

These actions form the recommended chart-building path.

### `createCanvas`

```javascript
createCanvas({ width?, height?, background?, margin? })
```

Create the program's Canvas and plot bounds. [Canvas options](../api/canvas.md)

### `editCanvas`

```javascript
editCanvas({ width?, height?, background?, margin? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../api/canvas.md)

### `createData`

```javascript
createData({ id, values })
```

Create one immutable named dataset. [Data](../api/data.md)

### `filterData`

```javascript
filterData({ id, source?, field, oneOf })
```

Create an immutable named derived dataset using a scalar `oneOf` filter. The
source defaults to current data. [Data](../api/data.md)

### `createRegressionData`

```javascript
createRegressionData({ id, source?, x, y, groupBy?, method?, confidence?, interval? })
```

Create an immutable linear OLS derived dataset at observed unique x values,
with Student-t mean-response confidence bounds. Source defaults to current
data; method is `"linear"`, confidence is `0.95`, and interval is `"mean"`.
[Data](../api/data.md)

### `createDensityData`

```javascript
createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, as? })
```

Create immutable Gaussian KDE rows on one shared inclusive sample grid.
Source defaults to current data, steps to `100`, and bandwidth to an automatic
Scott-rule estimate. [Data](../api/data.md)

### `createPointMark`

```javascript
createPointMark({ id, data?, shape? })
```

Create a semantic point mark with one of 12 equal-area shape realizations. [Marks](../api/marks.md)

### `editPointMark`

```javascript
editPointMark({ target?, shape })
```

Change constant point shape and rematerialize its concrete children. [Marks](../api/marks.md)

### `createLineMark`

```javascript
createLineMark({ id, data?, strokeWidth?, curve? })
```

Create a semantic line mark and empty path collection. Curve defaults to
`"linear"`; explicit curve and `strokeWidth` values are retained during
rematerialization. [Marks](../api/marks.md)

### `editLineMark`

```javascript
editLineMark({ target?, strokeWidth?, curve? })
```

Edit line appearance and rematerialize concrete path commands without changing
semantic encodings. [Marks](../api/marks.md)

### `createBarMark`

```javascript
createBarMark({ id, data? })
```

Create a semantic bar mark and empty rect collection. [Marks](../api/marks.md)

### `createAreaMark`

```javascript
createAreaMark({ id, data?, fill?, opacity? })
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. [Marks](../api/marks.md)

### `encodeX`

```javascript
encodeX({ field, target?, fieldType?, coordinate?, bin?, scale? })
```

Create or compatibly replace a quantitative point/area, temporal line, binned quantitative bar, or
ordinal bar x encoding. Ordinal bars require `fieldType: "ordinal"` and do not
materialize rects until their remaining layout semantics exist.
[Position encodings](../api/position-encodings.md)

### `encodeY`

```javascript
encodeY({ field?, target?, fieldType?, aggregate?, stack?, coordinate?, scale? })
```

Create or compatibly replace a quantitative point, aggregate line, or inferred count/zero-stack bar
y encoding. With ordinal bar x, it also creates an aggregate/non-stacked y encoding
and resolves its scale while waiting for grouping semantics before rect
materialization. Aggregate values may be scalar names or parameterized quantile
and ordered first/last objects. A complete histogram x/y pair materializes concrete rects.
[Position encodings](../api/position-encodings.md)

### `encodeY2`

```javascript
encodeY2({ field, target?, fieldType?, scale? })
```

Advanced upper-edge area encoding. It requires an existing quantitative y and
shares that exact scale. [Encodings](../api/encodings.md)

### `encodeYRange`

```javascript
encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area `encodeY` and `encodeY2`.
[Encodings](../api/encodings.md)

### `encodeGroup`

```javascript
encodeGroup({ field, target?, fieldType? })
```

Split line or area paths by a nominal field without creating a scale or guide.
[Encodings](../api/encodings.md)

### `encodeXOffset`

```javascript
encodeXOffset({ field, target?, fieldType?, scale? })
```

Create an advanced nominal offset scale within an ordinal bar x band. Grouped
color layout normally invokes this action automatically.
[Position encodings](../api/position-encodings.md)

### `encodeHistogram`

```javascript
encodeHistogram({
  field, target?, coordinate?, maxBins?, binStep?, binBoundaries?,
  stack?, xScale?, yScale?
})
```

Compose binned bar `encodeX` and count/zero-stack `encodeY` as one atomic
histogram action. Choose at most one of `maxBins`, `binStep`, and
`binBoundaries`. `maxBins` defaults to `10`; `stack` defaults to `"zero"`.
[Encodings](../api/encodings.md)

### `encodeDensity`

```javascript
encodeDensity({
  field, target?, source?, groupBy?, bandwidth?, extent?, steps?, as?,
  densityChannel?, coordinate?, valueScale?, densityScale?
})
```

Create immutable Gaussian KDE data, bind it to an area mark, encode its value
and density fields, and materialize baseline-closed paths. Density defaults to
the y channel; pass `densityChannel: "x"` for a horizontal orientation.
[Encodings](../api/encodings.md#atomic-density)

### `encodeColor`

```javascript
encodeColor({ field, target?, fieldType?, layout?, scale? })
```

Create or compatibly replace point fill, line-series color, grouped area fill,
stacked histogram color, or grouped ordinal-bar color. Quantitative and temporal
point fields use a sequential scale with concrete interpolated colors. Nominal
grouped bars require `layout: "group"` and record `encodeXOffset` as a child.
[Series encodings](../api/series-encodings.md)

### `encodeStrokeDash`

```javascript
encodeStrokeDash(
  { field, target?, fieldType?, scale? }
  | { value, target? }
)
```

Create or replace nominal line-series dash patterns, or apply one constant
named/direct pattern. Named styles are `solid`, `dashed`, `dotted`, and
`dashdot`.
[Series encodings](../api/series-encodings.md)

### `encodeRadius`

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../api/appearance.md)

### `encodeSize`

```javascript
encodeSize({ field, target?, fieldType?, scale? })
```

Encode or replace a quantitative field as equal-area point size. The automatic area range
is `[24, 196]`. [Appearance encodings](../api/appearance.md)

### `encodeShape`

```javascript
encodeShape({ field, target?, fieldType?, scale? })
```

Encode or replace a nominal field with the shared 12-value point-shape vocabulary.
[Appearance encodings](../api/appearance.md)

### `encodeOpacity`

```javascript
encodeOpacity({ value, target? })
encodeOpacity({ field, target?, fieldType?, scale? })
```

Apply a constant point opacity from `0` to `1`, or map a quantitative field
through a linear opacity scale. The two modes are mutually exclusive and may
replace each other through the same action.
[Appearance encodings](../api/appearance.md)

### `encodeBarWidth`

```javascript
encodeBarWidth({ band?, target? })
```

Set grouped-bar slot occupancy and materialize concrete rectangles. `band`
defaults to `0.72` and must be greater than `0` and at most `1`.
[Constant appearance](../api/appearance.md)

### `createRegression`

```javascript
createRegression({ target?, x?, y?, groupBy?, confidence?, band?, line? })
```

Infer an eligible point layer and create immutable linear-regression data,
grouped confidence-band paths, and grouped line paths. Confidence defaults to
`0.95`, band to `{ color: "#111111", opacity: 0.18 }`, and line width to `3`.
[Regression](../api/regression.md)

### `createGuides`

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable axes, Cartesian grid, and categorical legend.
[Guides](../api/guides.md)

### `createAxes`

```javascript
createAxes({ coordinate?, x?, y? })
```

Create Cartesian axes directly, including inferred histogram bin-boundary
ticks. [Axes](../api/axes.md)

### `createGrid`

```javascript
createGrid({ horizontal?, vertical? })
```

Create inferred horizontal and/or vertical Cartesian grid lines behind related
marks. [Grids](../api/grids.md)

### `createLegend`

```javascript
createLegend({
  target?, channels?, position?, align?, direction?, columns?, offset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?,
  gradient?
})
```

Create categorical, point-size, continuous-color gradient, or field-opacity
sample legends. Continuous legends support right, left, top, and bottom
placement. Categorical top and bottom layouts support deterministic item grids
and layered line/point/swatch symbol recipes.
[Legends](../api/legends.md)

### `createTitle`

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, gap?,
  titleStyle?, subtitleStyle?
})
```

Create a chart title and optional subtitle. [Titles](../api/titles.md)

## Advanced Chart API

Use these actions for explicit semantic resources or focused axis control.

### Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
createDerivedData({ id, source, transform })
createRegressionBand({
  id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale,
  color?, opacity?
})
createRegressionLine({
  id, data, x, y, groupBy?, coordinate, xScale, yScale,
  colorScale?, strokeWidth?
})
```

These actions explicitly author named semantic resources or the component
layers normally owned by `createRegression`.

### Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
```

### Axis lines, ticks, and labels

```javascript
createXAxisLine({ scale?, position?, color?, lineWidth? })
createYAxisLine({ scale?, position?, color?, lineWidth? })
editXAxisLine({ position?, color?, lineWidth? })
editYAxisLine({ position?, color?, lineWidth? })

createXAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? })
createYAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth? })
editXAxisTicks({ position?, count?, values?, length?, color?, lineWidth? })
editYAxisTicks({ position?, count?, values?, length?, color?, lineWidth? })

createXAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
createYAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editXAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editYAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?
})
```

### Tick/label groups and axis titles

```javascript
createXAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
createYAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
editXAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })
editYAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })

createXAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
createYAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editXAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
editYAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?
})
```

### Directional grids

```javascript
createHorizontalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })
createVerticalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })
```

See [Coordinates](../api/coordinates.md) and
[Advanced axis components](../advanced/axis-components.md).

## Extension API

Import `action` and `ChartProgram` from `ggaction/extension`. Primitive methods
are available on programs used by extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Semantic primitive | `editSemantic({ property, value })` or `editSemantic({ property, remove: true })` |
| Graphic primitive | `createGraphics({ id, type, length?, before?, after? })` |
| Graphic primitive | `editGraphics({ target, property, value })` or `editGraphics({ target, remove: true })` |
| Scale actions | `createScale({ id, type?, domain?, range?, nice?, zero? })`, `editScale({ id?, domain?, range?, nice?, zero?, clamp?, reverse? })` |

See [Action authoring](../extension/action-authoring.md) and
[Primitive API](../extension/primitives.md).

## Internal trace operations

High-level actions call additional wrapped operations for data, scale, mark,
guide, title, and layout materialization. Names such as
`materializeDensityData`, `rematerializeScale`, `rematerializePointMark`,
`createCategoricalLegend`, `createSizeLegend`, `rematerializeSizeLegend`,
`createLegendSymbols`, and `createTitleText` may appear in
`program.trace`. They are deliberately absent from the public TypeScript
declaration and this direct-call reference. Their arguments and decomposition
may change as implementation details while the parent public action remains
stable.

Use the [Actions and trace trees](../concepts/actions-and-trace.md) page to
inspect these nodes. Extension actions should compose the declared extension
and advanced actions instead of calling an undeclared runtime method.

## Rendering functions

Rendering functions are not actions and do not modify the trace.

| Import | Signature |
| --- | --- |
| `ggaction` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/png` | `renderToPNG(program, { output, pixelRatio? })` |
