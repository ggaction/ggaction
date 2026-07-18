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
available when that workflow does not express the required control. These
headings correspond to the action catalog layers `user-facing`, `advanced`,
and `primitive`, respectively.

## Quick navigation

- [Chart authoring](#chart-authoring-api)
- [Advanced chart actions](#advanced-chart-api)
- [Extension actions](#extension-api)
- [Internal trace operations](#internal-trace-operations)
- [Program functions](#program-functions)
- [Rendering functions](#rendering-functions)
- [Exact TypeScript signatures](#exact-typescript-signatures)

<!-- BEGIN GENERATED TYPESCRIPT SIGNATURES -->
## Exact TypeScript signatures

This generated block is the exact callable contract from `types/program.d.ts`.
The action entries below provide the readable form, behavior, defaults, and routes.

```typescript
interface ChartProgramActions {
  constructor(state?: ActionOptions); readonly semanticSpec: SemanticSpec; readonly graphicSpec: GraphicSpec; readonly resolvedScales: Readonly<Record<string, Readonly<Record<string, unknown>>>>; readonly materializationConfigs: Readonly<Record<string, unknown>>; readonly children: Readonly<Record<string, ChartProgram>>; readonly compositionSpec?: CompositionSpec; readonly context: Readonly<Record<string, unknown>>; readonly trace: TraceNode; readonly actionStack: readonly unknown[]; createCanvas(options?: CanvasOptions): ChartProgram;
  editCanvas(options: CanvasOptions): ChartProgram;
  createData(options: { id?: string; values: readonly unknown[] }): ChartProgram;
  filterData(options: FilterDataOptions): ChartProgram;
  filterMarks(options: FilterMarksOptions): ChartProgram;
  selectMarks(options: SelectMarksOptions): ChartProgram;
  highlightMarks(options: HighlightMarksOptions): ChartProgram;
  createDensityData(options: DensityDataOptions): ChartProgram;
  createRegressionData(options: RegressionDataOptions): ChartProgram;
  createIntervalData(options: IntervalDataOptions): ChartProgram;
  createPointMark(options?: { id?: string; data?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editPointMark(options: { target?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  createLineMark(options?: { id?: string; data?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  editLineMark(options: { target?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  createBarMark(options?: { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editBarMark(options: { target?: string; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; }): ChartProgram;
  createAreaMark(options?: { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  createArcMark(options?: { id?: string; data?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editArcMark(options: { target?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string }): ChartProgram;
  editAreaMark(options: { target?: string; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  encodeX(options: PositionEncodingOptions | RulePositionEncodingOptions): ChartProgram;
  encodeY(options: PositionEncodingOptions | RulePositionEncodingOptions): ChartProgram;
  encodeTheta(options: ThetaEncodingOptions): ChartProgram;
  encodeR(options: RadialEncodingOptions): ChartProgram;
  encodeX2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeColor(options: ColorEncodingOptions): ChartProgram;
  encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
  encodeSize(options: { field: string; target?: string; fieldType?: "quantitative"; scale?: ScaleOptions }): ChartProgram;
  encodeShape(options: { field: string; target?: string; fieldType?: "nominal"; scale?: ScaleOptions }): ChartProgram;
  encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodePointRadius(options: { value: number; target?: string }): ChartProgram;
  encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
  encodeYOffset(options: YOffsetEncodingOptions): ChartProgram;
  encodeY2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeYRange(options: { lower: string; upper: string; target?: string; fieldType?: "quantitative"; coordinate?: string; scale?: ScaleOptions; }): ChartProgram;
  encodeXRange(options: { lower: string; upper: string; target?: string; fieldType?: "quantitative"; coordinate?: string; scale?: ScaleOptions; }): ChartProgram;
  encodeGroup(options: { field: string; target?: string; fieldType?: "nominal" }): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: { target?: string; value: string }): ChartProgram;
  encodeStrokeWidth(options: { target?: string; value: number }): ChartProgram;
  createRegression(options?: RegressionOptions): ChartProgram;
  editRegression(options: EditRegressionOptions): ChartProgram;
  createErrorBar(options?: ErrorBarOptions): ChartProgram;
  editErrorBar(options: EditErrorBarOptions): ChartProgram;
  createErrorBand(options?: ErrorBandOptions): ChartProgram;
  editErrorBand(options: EditErrorBandOptions): ChartProgram;
  editErrorBandBoundary(options: EditErrorBandBoundaryOptions): ChartProgram;
  createBoxPlot(options?: BoxPlotOptions): ChartProgram;
  editBoxPlot(options: EditBoxPlotOptions): ChartProgram;
  removeMark(options?: RemoveMarkOptions): ChartProgram;
  createAxes(options?: CreateAxesOptions): ChartProgram;
  createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
  createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
  createThetaAxis(options?: CompletePolarAxisOptions): ChartProgram;
  createRadialAxis(options?: CompleteRadialAxisOptions): ChartProgram;
  editThetaAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editRadialAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editThetaAxisTicks(options?: PolarTickOptions): ChartProgram;
  editRadialAxisTicks(options?: PolarTickOptions): ChartProgram;
  editThetaAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editRadialAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editThetaAxisTitle(options?: PolarTitleOptions): ChartProgram;
  editRadialAxisTitle(options?: RadialTitleOptions): ChartProgram;
  createXAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: XAxisPosition }): ChartProgram;
  createYAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: YAxisPosition }): ChartProgram;
  editXAxisLine(options?: AxisLineStyleOptions & { position?: XAxisPosition }): ChartProgram;
  editYAxisLine(options?: AxisLineStyleOptions & { position?: YAxisPosition }): ChartProgram;
  createXAxisTicks(options?: AxisTickOptions<XAxisPosition>): ChartProgram;
  createYAxisTicks(options?: AxisTickOptions<YAxisPosition>): ChartProgram;
  editXAxisTicks(options?: Omit<AxisTickOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTicks(options?: Omit<AxisTickOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisLabels(options?: AxisLabelOptions<XAxisPosition>): ChartProgram;
  createYAxisLabels(options?: AxisLabelOptions<YAxisPosition>): ChartProgram;
  editXAxisLabels(options?: Omit<AxisLabelOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisLabels(options?: Omit<AxisLabelOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<XAxisPosition>): ChartProgram;
  createYAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<YAxisPosition>): ChartProgram;
  editXAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisTitle(options?: AxisTitleOptions<XAxisPosition>): ChartProgram;
  createYAxisTitle(options?: AxisTitleOptions<YAxisPosition>): ChartProgram;
  editXAxisTitle(options?: Omit<AxisTitleOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTitle(options?: Omit<AxisTitleOptions<YAxisPosition>, "scale">): ChartProgram;
  editXAxis(options: EditAxisOptions<XAxisPosition>): ChartProgram;
  editYAxis(options: EditAxisOptions<YAxisPosition>): ChartProgram;
  editThetaAxis(options: Omit<EditPolarAxisOptions, "angle">): ChartProgram;
  editRadialAxis(options: EditRadialAxisOptions): ChartProgram;
  removeXAxis(options?: RemoveAxisOptions): ChartProgram;
  removeYAxis(options?: RemoveAxisOptions): ChartProgram;
  removeThetaAxis(options?: RemoveAxisOptions): ChartProgram;
  removeRadialAxis(options?: RemoveAxisOptions): ChartProgram;
  createGrid(options?: CreateGridOptions): ChartProgram;
  createHorizontalGrid(options?: GridDirectionOptions): ChartProgram;
  createVerticalGrid(options?: GridDirectionOptions): ChartProgram;
  createThetaGrid(options?: PolarGridOptions): ChartProgram;
  createRadialGrid(options?: PolarGridOptions): ChartProgram;
  editHorizontalGrid(options: EditGridOptions): ChartProgram;
  editVerticalGrid(options: EditGridOptions): ChartProgram;
  editThetaGrid(options: EditPolarGridOptions): ChartProgram;
  editRadialGrid(options: EditPolarGridOptions): ChartProgram;
  editGrid(options: EditGridDirectionsOptions): ChartProgram;
  removeGrid(options?: RemoveGridOptions): ChartProgram;
  createLegend(options?: LegendOptions): ChartProgram;
  editLegend(options: EditLegendOptions): ChartProgram;
  editLegendLayout(options: EditLegendLayoutOptions): ChartProgram;
  editLegendLabels(options: EditLegendLabelsOptions): ChartProgram;
  editLegendTitle(options: EditLegendTitleOptions): ChartProgram;
  editLegendSymbols(options: EditLegendSymbolsOptions): ChartProgram;
  editLegendBorder(options: EditLegendBorderOptions): ChartProgram;
  removeLegend(options?: RemoveLegendOptions): ChartProgram;
  createGuides(options?: CreateGuidesOptions): ChartProgram;
  createTitle(options: TitleOptions): ChartProgram;
  editTitle(options: EditTitleOptions): ChartProgram;
  removeTitle(): ChartProgram;
  createCoordinate(options?: CreateCoordinateOptions): ChartProgram;
  createScale(options: CreateScaleOptions): ChartProgram;
  editScale(options: EditScaleOptions): ChartProgram;
  createDerivedData(options: CreateDerivedDataOptions): ChartProgram;
  createRegressionBand(options: CreateRegressionBandOptions): ChartProgram;
  editRegressionBand(options: { target?: string; color?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  createRegressionLine(options: CreateRegressionLineOptions): ChartProgram;
  editRegressionLine(options: { target?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  editCompositionLayout(options: EditCompositionLayoutOptions): ChartProgram;
  replaceCompositionChild(options: ReplaceCompositionChildOptions): ChartProgram;
  facet(options: FacetOptions): ChartProgram;
  editFacetHeaders(options: EditFacetHeadersOptions): ChartProgram;
  editSemantic(options: EditSemanticOptions): ChartProgram;
  createGraphics(options: { id: string; type: GraphicType; length?: number; parent?: string; before?: string; after?: string; }): ChartProgram;
  editGraphics(options: EditGraphicsOptions): ChartProgram;
}
```
<!-- END GENERATED TYPESCRIPT SIGNATURES -->

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

### `editCompositionLayout`

```javascript
editCompositionLayout({ gap?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs.

### `replaceCompositionChild`

```javascript
replaceCompositionChild({ target, program })
```

Replace one named child while preserving its slot ID and order. The replacement
must already be a complete chart or composition program.

### `facet`

```javascript
facet({ id?, field, data?, columns?, gap?, align?, padding?, scales?, guides? })
```

Repeat one complete chart by a field on its common row-preserving dataset
ancestor. Values preserve source first appearance; scale policies can be
`"shared"` or `"independent"` by supported channel, and layered regression
data and other supported statistical descendants are recomputed per cell.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend.
See [Program composition](../api/composition.md#repeat-the-current-chart-by-a-field).

### `editFacetHeaders`

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.

### `createData`

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../api/data.md)

### `filterData`

```javascript
filterData({ id, source?, field, oneOf | predicate | range })
```

Create an immutable named derived dataset using exactly one membership,
comparison, or range filter. The source defaults to current data.
[Data](../api/data.md)

### `filterMarks`

```javascript
filterMarks({ target?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar, create one
namespaced immutable member-row dataset, rebind the mark, and rematerialize its
scales and connected guides without changing the source.
[Data](../api/data.md)

### `highlightMarks`

```javascript
highlightMarks({
  id?, target?, select?, selection?, color?, opacity?, fill?, stroke?,
  strokeWidth?, strokeDash?, shape?, size?, offset?, dimOthers?, bringToFront?
})
```

Select point, bar, line, area, arc, or rule items inline or reuse a stored selection,
then apply mark-specific concrete emphasis, optional complement dimming, and
selected-last order.
[Mark selection and highlighting](../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)

### `createRegressionData`

```javascript
createRegressionData({
  id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval?
})
```

Create immutable linear, polynomial, or LOESS fitted rows at observed unique x
values. Linear and polynomial fits support Student-t mean or prediction bounds;
LOESS is line-only.
[Data](../api/data.md)

### `createDensityData`

```javascript
createDensityData({
  id, source?, field, groupBy?, bandwidth?, extent?, steps?,
  kernel?, normalization?, as?
})
```

Create immutable KDE rows on one shared inclusive sample grid. Source defaults
to current data, steps to `100`, bandwidth to an automatic Scott-rule estimate,
kernel to `"gaussian"`, and normalization to `"unit"`.
[Data](../api/data.md)

### `createIntervalData`

```javascript
createIntervalData({
  id, source?, field, groupBy?, center?, extent?, level?, as?
})
```

Create immutable grouped center/lower/upper summary rows. Mean supports
standard error, sample standard deviation, and Student-t confidence intervals;
median supports interquartile range. [Data](../api/data.md)

### `createPointMark`

```javascript
createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic point mark with one of 12 equal-area shape realizations. [Marks](../api/marks.md)

### `editPointMark`

```javascript
editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items. [Marks](../api/marks.md)

### `removeMark`

```javascript
removeMark({ target? })
```

Remove one stable mark owner and its owned state while preserving source data
and independently shared resources. [Marks](../api/marks.md)

### `createLineMark`

```javascript
createLineMark({ id?, data?, stroke?, strokeWidth?, opacity?, curve?, closed? } = {})
```

Create a semantic line mark and empty path collection. Curve defaults to
`"linear"`; explicit curve and `strokeWidth` values are retained during
rematerialization. `closed: true` closes each Polar series as a radar path.
[Marks](../api/marks.md)

### `editLineMark`

```javascript
editLineMark({ target?, stroke?, strokeWidth?, opacity?, curve?, closed? })
```

Edit line appearance and rematerialize concrete path commands without changing
semantic encodings. [Marks](../api/marks.md)

### `createBarMark`

```javascript
createBarMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic bar mark and empty rect collection. [Marks](../api/marks.md)

### `editBarMark`

```javascript
editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit whole-bar appearance and rematerialize every concrete rectangle.
`stroke: false` removes the visible outline; constant fill conflicts with a
field-driven color encoding. [Marks](../api/marks.md)

### `createAreaMark`

```javascript
createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve? } = {})
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. Optional outlines default to width `1`.
Curve defaults to `"linear"` and accepts the shared eight-value vocabulary.
[Marks](../api/marks.md)

### `editAreaMark`

```javascript
editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve? })
```

Edit constant area appearance. `stroke: false` removes an existing outline.
[Marks](../api/marks.md)

### `createArcMark`

```javascript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic arc mark and empty closed-path collection. Count theta
materializes proportional pie or donut sectors; categorical theta plus radius
materializes radial sectors. [Marks](../api/marks/line-area.md#arc-marks)

### `editArcMark`

```javascript
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit arc geometry or appearance and rematerialize complete sector paths.
[Marks](../api/marks/line-area.md#arc-marks)

### `createRuleMark`

```javascript
createRuleMark({ id?, data? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../api/marks.md)

### `encodeX`

```javascript
encodeX({ field, target?, fieldType?, aggregate?, stack?, coordinate?, bin?, scale? })
encodeX({ datum, target?, fieldType, coordinate?, scale? }) // rule
```

Create or compatibly replace an x encoding. Points accept quantitative,
temporal, ordinal, and nominal fields. Bars accept binned quantitative x, vertical
nominal/ordinal/temporal categories, or a horizontal quantitative aggregate measure.
Rules accept exactly one field or datum and an explicit field type.
[Position encodings](../api/position-encodings.md)

### `encodeY`

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
Rules accept exactly one field or datum and an explicit field type.
[Position encodings](../api/position-encodings.md)

### `encodeY2`

```javascript
encodeY2({ field, target?, fieldType, scale?, coordinate? })
encodeY2({ datum, target?, fieldType, scale?, coordinate? }) // rule
```

Assign an area or ranged-bar upper edge, or a rule secondary y endpoint. It requires an
existing y and shares its scale and coordinate. [Position encodings](../api/position-encodings.md)

### `encodeX2`

```javascript
encodeX2({ field, target?, fieldType, scale?, coordinate? })
encodeX2({ datum, target?, fieldType, scale?, coordinate? })
```

Assign an area or ranged-bar upper edge, or a rule secondary x endpoint. It requires an
existing x and shares its scale and coordinate. [Position encodings](../api/position-encodings.md)

### `encodeYRange`

```javascript
encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeY` and `encodeY2`.
[Encodings](../api/encodings.md)

### `encodeXRange`

```javascript
encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeX` and `encodeX2`.
[Encodings](../api/encodings.md)

### `encodeGroup`

```javascript
encodeGroup({ field, target?, fieldType? })
```

Split line or area paths by a nominal field without creating a scale or guide.
[Encodings](../api/encodings.md)

### `encodeXOffset`

```javascript
encodeXOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update an advanced nominal offset scale within an ordinal
bar x band. Padding defaults to zero and is preserved when omitted on a later
same-field call. Grouped color layout normally invokes this action automatically.
[Position encodings](../api/position-encodings.md)

### `encodeYOffset`

```javascript
encodeYOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update the corresponding categorical offset scale within
an ordinal bar y band. Horizontal grouped color layout invokes this action as a
wrapped child; explicit domain order, reversed range, and padding follow the
same contract as `encodeXOffset`.
[Position encodings](../api/position-encodings.md)

### `encodeHistogram`

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
[Encodings](../api/encodings.md)

### `encodeDensity`

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
[Encodings](../api/encodings.md#atomic-density)

### `editDensity`

```javascript
editDensity({ target?, bandwidth?, extent?, steps?, kernel?, normalization? })
```

Create an immutable density-data revision, rebind the selected density area,
and rematerialize its graphical consumers. Omitted density settings are
preserved and at least one editable setting is required.
[Encodings](../api/encodings.md#atomic-density)

### `encodeColor`

```javascript
encodeColor({ field, target?, fieldType?, palette?, layout?, aggregate?, scale? })
```

Create or compatibly replace point fill, line-series color, grouped area fill,
or bar color. Nominal and ordinal categories share an ordinal palette scale;
ordinal fields may contain ordered numeric categories. Categorical bar layout accepts `stack`, `fill`, `group`, `overlay`,
and `diverging`; area accepts all except `group`. Quantitative and temporal
point fields use a sequential scale; quantitative point fields also accept
`quantize`, `quantile`, and `threshold` color classes. Categorical
grouped bars record `encodeXOffset` or `encodeYOffset` as a child according to
orientation. Reassigning grouped color also atomically reassigns its offset and
rematerializes an existing legend. Aggregate
bars accept quantitative sequential color: a matching measure field inherits
its aggregate, while a different field requires `aggregate`.
[Series encodings](../api/series-encodings.md)

### `encodeStrokeDash`

```javascript
encodeStrokeDash(
  { field, target?, fieldType?, scale? }
  | { value, target? }
)
```

Create or replace nominal line-series or rule dash patterns, or apply one
constant named/direct pattern. Named styles are `solid`, `dashed`, `dotted`, and
`dashdot`.
[Series encodings](../api/series-encodings.md)

### `encodeRadius`

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../api/appearance.md)

### `encodeTheta`

```javascript
encodeTheta({ field, target?, fieldType?, scale?, coordinate? })
```

Encode Polar angle in clockwise degrees from 12 o'clock. Quantitative,
temporal, ordinal, and nominal fields are supported. The default scale ID is
`theta` and its automatic range is `[0, 360]`.
[Polar positions](../api/position-encodings.md#polar-positions)

### `encodeR`

```javascript
encodeR({ field, target?, fieldType?, scale?, coordinate? })
```

Encode a quantitative field as Polar radial distance. The default `radius`
scale fits the current plot bounds and rematerializes after Canvas edits.
[Polar positions](../api/position-encodings.md#polar-positions)

### `encodePointRadius`

```javascript
encodePointRadius({ value, target? })
```

Apply a constant point glyph radius through a traced `encodeRadius` child. This
does not assign semantic Polar radial position.
[Constant appearance](../api/appearance.md)

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

Apply a constant point/rule opacity from `0` to `1`, or map a quantitative field
through a linear opacity scale. The two modes are mutually exclusive and may
replace each other through the same action.
[Appearance encodings](../api/appearance.md)

### `encodeStroke`

```javascript
encodeStroke({ value, target? })
```

Assign a constant non-empty stroke string to a rule mark.
[Appearance encodings](../api/appearance.md)

### `encodeStrokeWidth`

```javascript
encodeStrokeWidth({ value, target? })
```

Assign a non-negative finite logical Canvas width to a rule mark.
[Appearance encodings](../api/appearance.md)

### `encodeBarWidth`

```javascript
encodeBarWidth({ band?, pixels?, target? })
```

Set aggregate-bar band occupancy or a fixed logical-pixel width and materialize
concrete rectangles. The modes are mutually exclusive. The first omitted mode
defaults to `band: 0.72`; later omission retains the current mode.
[Constant appearance](../api/appearance.md)

### `createRegression`

```javascript
createRegression({
  target?, x?, y?, groupBy?, method?, degree?, span?,
  confidence?, interval?, band?, line?
})
```

Infer an eligible point layer and create immutable fitted data, optional grouped
interval-band paths, and grouped line paths. Method defaults to `"linear"`;
polynomial degree to `2`; LOESS span to `0.75`.
[Regression](../api/regression.md)

### `editRegression`

```javascript
editRegression({
  target?, method?, degree?, span?, confidence?, interval?, band?, line?
})
```

Revise the model through its stable point owner. Statistical changes create and
rebind one immutable derived-data revision; component-only changes retain the
current fitted rows. [Regression](../api/regression.md#editing-a-regression)

### `createErrorBar`

```javascript
createErrorBar({
  id?, target?, data?, x?, y?, groupBy?, coordinate?,
  caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
} = {})
```

Create vertical or horizontal statistical or explicit intervals. With one
eligible encoded layer, the shortest call infers its fields, orientation, data,
coordinate, and scales.
[Error bars](../api/error-bars.md)

### `editErrorBar`

```javascript
editErrorBar({
  target?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
})
```

Partially edit one error bar and its owned caps. `caps: false` removes both
caps; `caps: true` restores them without replacing interval data.
[Error bars](../api/error-bars.md#editing-error-bars)

### `createErrorBand`

```javascript
createErrorBand({
  id?, target?, data?, x?, y?, groupBy?, coordinate?, fill?, opacity?,
  curve?, boundaries?
} = {})
```

Create a vertical or horizontal statistical or explicit interval ribbon. The
action can infer one encoded source layer and reuses `createIntervalData`, an
ordinary area, the matching atomic range action, and grouping actions.
`boundaries: { stroke?, strokeWidth?, strokeDash?, opacity?, curve? }` adds
lower and upper line layers. Boundary curve inherits the area curve unless it
is overridden.
[Error bands](../api/error-bands.md)

### `editErrorBand` and `editErrorBandBoundary`

```javascript
editErrorBand({ target?, fill?, opacity?, curve? })
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Edit the band body or selected owned boundaries without addressing generated
line IDs. Boundary selection is `"both"`, `"lower"`, or `"upper"`; omitted
selection means both. Missing selected boundaries are created from the band.
[Error bands](../api/error-bands.md#editing-the-band)

### `createBoxPlot`

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, whisker?, width?, outliers?,
  box?, median?, outlier?
} = {})
```

Create a vertical or horizontal Tukey/min–max box plot from one categorical
and one quantitative field. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../api/box-plots.md)

### `editBoxPlot`

```javascript
editBoxPlot({ target?, whisker?, width?, outliers?, box?, median?, outlier? })
```

Revise box statistics, optional outlier topology, width, and component
appearance through the stable box owner without addressing generated child
IDs. [Box plots](../api/box-plots.md#editing-a-box-plot)

### `createGuides`

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable Cartesian or Polar axes and grids plus supported legends.
[Guides](../api/guides.md)

### `createAxes`

```javascript
createAxes({ coordinate?, x?, y?, theta?, radius? })
```

Create Cartesian or Polar axes directly, including inferred titles and ticks.
[Axes](../api/axes.md)

### `createThetaAxis`

```javascript
createThetaAxis({ scale?, coordinate?, line?, ticksAndLabels?, title? } = {})
```

Create the complete outer circular theta axis. [Axes](../api/axes.md)

### `createRadialAxis`

```javascript
createRadialAxis({ scale?, coordinate?, angle?, line?, ticksAndLabels?, title? } = {})
```

Create the complete center-to-edge radial axis; `angle` defaults to `90`.
[Axes](../api/axes.md)

### `editThetaAxis`

```javascript
editThetaAxis({ line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected theta-axis components. [Axes](../api/axes.md#editing-a-complete-axis)

### `editRadialAxis`

```javascript
editRadialAxis({ angle?, line?, ticks?, labels?, ticksAndLabels?, title? })
```

Edit selected radial components; `angle` moves the whole axis.
[Axes](../api/axes.md#editing-a-complete-axis)

### `editThetaAxisLine`

```javascript
editThetaAxisLine({ color?, lineWidth? } = {})
```

Edit the outer baseline style. [Axes](../api/axes.md)

### `editRadialAxisLine`

```javascript
editRadialAxisLine({ color?, lineWidth? } = {})
```

Edit the radial baseline style. [Axes](../api/axes.md)

### `editThetaAxisTicks`

```javascript
editThetaAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit theta tick geometry and style. [Axes](../api/axes.md)

### `editRadialAxisTicks`

```javascript
editRadialAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})
```

Edit radial tick geometry and style. [Axes](../api/axes.md)

### `editThetaAxisLabels`

```javascript
editThetaAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit perimeter theta labels. [Axes](../api/axes.md)

### `editRadialAxisLabels`

```javascript
editRadialAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit radial value labels. [Axes](../api/axes.md)

### `editThetaAxisTitle`

```javascript
editThetaAxisTitle({ text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the theta title. [Axes](../api/axes.md)

### `editRadialAxisTitle`

```javascript
editRadialAxisTitle({ text?, position?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Edit the radial title. `position` accepts `"inside"` or `"outside"` and defaults
to the baseline midpoint inside the plot. [Axes](../api/axes.md)

### `removeThetaAxis`

```javascript
removeThetaAxis({ scale?, coordinate? } = {})
```

Remove the complete theta-axis resource. [Axes](../api/axes.md#removing-an-axis)

### `removeRadialAxis`

```javascript
removeRadialAxis({ scale?, coordinate? } = {})
```

Remove the complete radial-axis resource. [Axes](../api/axes.md#removing-an-axis)

### `createGrid`

```javascript
createGrid({ horizontal?, vertical?, theta?, radial? })
```

Create inferred horizontal and/or vertical Cartesian grid lines behind related
marks, or infer the Polar grid families backed by stored theta/radius encodings.
[Grids](../api/grids.md)

### `createThetaGrid`

```javascript
createThetaGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create theta spokes behind related marks. [Grids](../api/grids.md)

### `createRadialGrid`

```javascript
createRadialGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? } = {})
```

Create concentric radial paths behind related marks. [Grids](../api/grids.md)

### `editThetaGrid`

```javascript
editThetaGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing theta grid. [Grids](../api/grids.md#editing-grids)

### `editRadialGrid`

```javascript
editRadialGrid({ count?, values?, color?, lineWidth?, strokeDash? })
```

Edit the existing radial grid. [Grids](../api/grids.md#editing-grids)

### `createLegend`

```javascript
createLegend({
  target?, channels?, position?, align?, direction?, columns?, offset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?,
  gradient?
})
```

Create categorical, point-size, continuous-color gradient, discretized-color
interval, or field-opacity sample legends. Continuous legends support right, left, top, and bottom
placement. Categorical legends also support left side placement; composite
point and size blocks remain in deterministic vertical order.
[Legends](../api/legends.md)

### `editLegend`

```javascript
editLegend({
  target?, position?, align?, direction?, columns?, offset?, titlePosition?,
  title?, symbol?, labels?, titleStyle?, itemGap?, border?, count?, gradient?
})
```

Partially edit one existing legend. `title` accepts a non-empty string,
`"auto"`, or `false`; semantic channel bindings cannot be edited.
[Legends](../api/legends.md)

### Focused legend edits

```javascript
editLegendLayout({
  target?, position?, align?, direction?, columns?, offset?,
  titlePosition?, itemGap?
})
editLegendLabels({ target?, color?, fontSize?, fontFamily?, fontWeight? })
editLegendTitle({
  target?, title?, color?, fontSize?, fontFamily?, fontWeight?
})
editLegendSymbols({ target?, symbol?, count?, gradient? })
editLegendBorder({ target?, border })
```

Edit one legend component without constructing the nested options accepted by
`editLegend`. Each action uses the same target inference, validation, and
rematerialization as `editLegend`. At least one component change is required.
[Editing legends](../api/legends/editing.md#focused-edits)

### `removeLegend`

```javascript
removeLegend({ target? })
```

Remove every legend block owned by one mark while preserving mark encodings and
scales. [Legends](../api/legends.md)

### `createTitle`

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

Create a chart title and optional subtitle. [Titles](../api/titles.md)

### `editTitle`

```javascript
editTitle({
  text?, subtitle?, position?, align?, offset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

Partially edit the existing title. `subtitle: false` removes the subtitle;
omitted properties remain unchanged. [Titles](../api/titles.md)

### `removeTitle`

```javascript
removeTitle()
```

Remove the complete chart title and subtitle resource. [Titles](../api/titles.md)

## Advanced Chart API

Use these actions for explicit semantic resources or focused axis control.

### Reusable mark selections

```javascript
selectMarks({ id?, target?, grain?, field | channel | property, op, ...operatorOptions })
```

Store a reusable semantic final-item selection without changing graphics.
Supported operators are `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `oneOf`,
`range`, `min`, and `max`. `grain` defaults to `"item"`; stacked bars also
support `"stack"`. Fields are data values, channels are pre-scale semantic
values, and properties are concrete graphical values.
[Mark selection and highlighting](../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)

### Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
createDerivedData({
  id,
  source,
  transform: [DatasetTransform, ...DatasetTransform[]]
})
createRegressionBand({
  id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale,
  color?, opacity?, stroke?, strokeWidth?, curve?
})
editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth?, curve? })
createRegressionLine({
  id, data, x, y, groupBy?, coordinate, xScale, yScale,
  colorScale?, strokeWidth?, curve?
})
editRegressionLine({ target?, strokeWidth?, curve? })
```

These actions explicitly author named semantic resources or the component
layers normally owned by `createRegression`.

`createDerivedData` stores immutable source and transform provenance only; it
does not materialize values. Its public `DatasetTransform` union supports
`filter`, `regression`, `density`, and `interval` objects. A single object or
empty array is invalid. See the runnable filter example and exact transform
requirements in [Source and derived data](../api/data/source-and-derived.md#createderiveddata-id-source-transform).

### Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
editXAxis({ position?, line?, ticks?, labels?, ticksAndLabels?, title? })
editYAxis({ position?, line?, ticks?, labels?, ticksAndLabels?, title? })
```

Complete-axis edits update only the selected components of an existing axis.
Use `ticksAndLabels` for a coordinated tick/label edit, or `ticks` and
`labels` for independent edits; do not combine both forms.

### Complete axis removal

```javascript
removeXAxis({ coordinate?, scale? })
removeYAxis({ coordinate?, scale? })
```

Remove one complete Cartesian axis. Optional selectors must match the existing
resource. [Axes](../api/axes.md)

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

Axis `position` is `"bottom" | "top"` for x and `"left" | "right"` for y.
Label `format` accepts `"auto"`, `{ decimals }`, numeric `.0f/.1f/.2f/.0%/.1%/.2e`,
or UTC `%Y/%Y-%m/%Y-%m-%d` tokens when compatible with the resolved scale.

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
editHorizontalGrid({ count?, values?, color?, lineWidth?, strokeDash? })
editVerticalGrid({ count?, values?, color?, lineWidth?, strokeDash? })
editGrid({
  horizontal?: { count?, values?, color?, lineWidth?, strokeDash? },
  vertical?: { count?, values?, color?, lineWidth?, strokeDash? }
})
```

Directional grid edits require an existing grid. Their `values` option accepts
an exact finite array or `"auto"` to restore current axis/scale inference.
`editGrid` applies one or both directional edits through the same actions.

```javascript
removeGrid({ horizontal?, vertical? })
```

Remove all existing directions when omitted, or only directions selected with
`true`.

See [Coordinates](../api/coordinates.md) and
[Advanced axis components](../advanced/axis-components.md).

## Extension API

Import `action` and `ChartProgram` from `ggaction/extension`. Primitive methods
are available on programs used by extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Semantic primitive | `editSemantic({ property, value })` or `editSemantic({ property, remove: true })` |
| Graphic primitive | `createGraphics({ id, type, length?, parent?, before?, after? })` |
| Graphic primitive | `editGraphics({ target, property, value })` or `editGraphics({ target, remove: true })` |
| Scale actions | `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })`, `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })` |

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

## Program functions

These package-level functions create programs but are not chainable actions.

| Import | Signature |
| --- | --- |
| `ggaction` | `chart(): ChartProgram` |
| `ggaction` | `hconcat(options: CompositionOptions): ChartProgram` |
| `ggaction` | `vconcat(options: CompositionOptions): ChartProgram` |

See [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable replacement rules.

## Rendering functions

Rendering functions are not actions and do not modify the trace.

| Import | Signature |
| --- | --- |
| `ggaction` | `render(program, canvasContext, { pixelRatio? }?)` |
| `ggaction/png` | `renderToPNG(program, { output, pixelRatio? })` |
