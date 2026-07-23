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
  createWindowData(options: WindowDataOptions): ChartProgram;
  createPointMark(options?: { id?: string; data?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editPointMark(options: { target?: string; shape?: PointShape; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  jitterPoints(options: JitterPointsOptions): ChartProgram;
  removeJitter(options?: RemoveJitterOptions): ChartProgram;
  createLineMark(options?: { id?: string; data?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  editLineMark(options: { target?: string; strokeWidth?: number; curve?: CurveInterpolation; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  createBarMark(options?: { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editBarMark(options: { target?: string; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; }): ChartProgram;
  createAreaMark(options?: { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  createArcMark(options?: { id?: string; data?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editArcMark(options: { target?: string; innerRadius?: number; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  createRectMark(options?: RectMarkOptions): ChartProgram;
  editRectMark(options: EditRectMarkOptions): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string }): ChartProgram;
  createTextMark(options?: TextMarkOptions): ChartProgram;
  editTextMark(options: EditTextMarkOptions): ChartProgram;
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
  encodeText(options: TextEncodingOptions): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: { target?: string; value: string }): ChartProgram;
  encodeStrokeWidth(options: StrokeWidthEncodingOptions): ChartProgram;
  createRegression(options?: RegressionOptions): ChartProgram;
  editRegression(options: EditRegressionOptions): ChartProgram;
  createErrorBar(options?: ErrorBarOptions): ChartProgram;
  editErrorBar(options: EditErrorBarOptions): ChartProgram;
  createErrorBand(options?: ErrorBandOptions): ChartProgram;
  editErrorBand(options: EditErrorBandOptions): ChartProgram;
  editErrorBandBoundary(options: EditErrorBandBoundaryOptions): ChartProgram;
  createBoxPlot(options?: BoxPlotOptions): ChartProgram;
  editBoxPlot(options: EditBoxPlotOptions): ChartProgram;
  createScatterPlot(options: CreateScatterPlotOptions): ChartProgram;
  createLinePlot(options: CreateLinePlotOptions): ChartProgram;
  createBarPlot(options: CreateBarPlotOptions): ChartProgram;
  createHistogram(options: CreateHistogramOptions): ChartProgram;
  createHeatmap(options: CreateHeatmapOptions): ChartProgram;
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
editCompositionLayout({ columns?, gap?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
`columns` changes wrapping only on a facet composition and is rejected for concat.
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

### `editFacetScales`

```javascript
editFacetScales({ x?, y?, xOffset?, yOffset?, color?, size?, shape?, opacity?, strokeDash? })
```

Partially change used facet channels between `"shared"` and `"independent"`.
Every cell is rederived from the retained pre-facet program while field, data,
value order, child IDs, layout, guides, headers, and title are preserved.

### `editFacetGuides`

```javascript
editFacetGuides({ axes?, legend? })
```

Partially change axes between `"each"` and `"outer"`, or legend ownership
between `false` and `"shared"`. Shared legend promotion requires concretely
compatible child scales and guide recipes.

### `createData`

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../api/data.md)

### `createScatterPlot`

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../api/basic-charts.md#createscatterplot)

### `createLinePlot`

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart, including optional series grouping and
appearance. [Basic Charts](../api/basic-charts.md#createlineplot)

### `createBarPlot`

```javascript
createBarPlot({ id?, data?, coordinate?, x, y, color?, width?, bar?, guides? })
```

Create a complete vertical, horizontal, aggregate, ranged, grouped, or stacked
bar chart through the existing bar policies.
[Basic Charts](../api/basic-charts.md#createbarplot)

### `createHistogram`

```javascript
createHistogram({ id?, data?, coordinate?, field, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?, color?, bar?, guides? })
```

Create a bar layer with atomic bin and count encodings. Exactly one bin mode may
be specified. [Basic Charts](../api/basic-charts.md#createhistogram)

### `createHeatmap`

```javascript
createHeatmap({ id?, data?, coordinate?, x, y, bin?, color?, rect?, guides? })
```

Create one rect cell per valid pre-gridded row, or bin raw quantitative x/y rows
into ranged cells colored by count. [Basic Charts](../api/basic-charts.md#createheatmap)

### `createParallelCoordinates`

```javascript
createParallelCoordinates({ id?, data?, coordinate?, dimensions, key?, missing?, color?, strokeDash?, line?, guides? })
```

Create one open line path per source row across an ordered list of dimension-
local scales and axes. Only `dimensions` is required.
[Parallel Coordinates](../api/parallel-coordinates.md)

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

### `removeMarkHighlight`

```javascript
removeMarkHighlight({ selection? } = {})
```

Remove one highlight assignment, restore the target mark and categorical
legend baseline, and retain the reusable selection.
[Selection lifecycle](../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

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

### `createWindowData`

```javascript
createWindowData({ id, source?, partitionBy?, sortBy?, operations })
```

Create an immutable derived dataset by applying ordered row-number, rank,
dense-rank, cumulative-sum, lag, or lead operations within optional partitions.
The calculation follows a stable sort while the output preserves source row order.
[Window data transforms](../api/data/window.md)

### `createBin2DData`

```javascript
createBin2DData({
  id, source?, x, y, bins?, extent?, includeEmpty?, members?, as?
})
```

Aggregate finite x/y pairs into deterministic rectangular cell bounds and
counts. Reusing the logical ID creates an immutable revision and rematerializes
direct visual consumers. [Rectangular 2D bins](../api/data/bin2d.md)

### `editBin2DData`

```javascript
editBin2DData({
  target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?
})
```

Partially revise the current or unique logical 2D-bin owner. Omitted top-level
transform options are preserved; successful edits create an immutable revision,
rebind direct visual consumers, and safely release the prior revision.
[Rectangular 2D bins](../api/data/bin2d.md#editbin2ddata)

### `createPointMark`

```javascript
createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic point mark with one of 12 equal-area shape realizations. [Marks](../api/marks.md)

### `editPointMark`

```javascript
editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items.
`stroke: false` disables the outline and its width. [Marks](../api/marks.md)

### `jitterPoints`

```javascript
jitterPoints({ target?, channel, maxOffset, seed?, key? })
```

Assign deterministic bounded graphical jitter to one Cartesian point mark. Use
exactly one of `maxOffset.pixels` or `maxOffset.band`; calling the action again
replaces the previous policy from the semantic base positions. [Point marks](../api/marks/point.md)

### `removeJitter`

```javascript
removeJitter({ target? } = {})
```

Remove the target point mark's jitter assignment and restore positions derived
directly from its semantic encodings. [Point marks](../api/marks/point.md)

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
rematerialization. A compatible layered source can provide data, positions,
shared scales, and a grain-preserving aggregate such as `mean`; bar-only bin,
stack, and offset policies are not inherited. `closed: true` closes each Polar
series as a radar path.
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
`stroke: false` disables the outline and its width.
[Marks](../api/marks/line-area.md#arc-marks)

### `createRuleMark`

```javascript
createRuleMark({ id?, data? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../api/marks.md)

### `createRectMark`

```javascript
createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic rect mark and empty rect collection. Two discrete x/y bands
or complete x/x2 and y/y2 endpoint pairs materialize observed cells. Rects do
not infer bar aggregation, baseline, stack, or width semantics.
[Rect marks](../api/marks/rect.md)

### `editRectMark`

```javascript
editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit rect appearance and rematerialize complete cells. Constant fill conflicts
with field-driven color. `stroke: false` disables the outline.
[Rect marks](../api/marks/rect.md)

### `createTextMark`

```javascript
createTextMark({ id?, data?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})
```

Create a semantic text layer. Omitted data and position attach to the current
or unique compatible point, bar, rect, or rule layer. `text` is constant-content
shorthand. [Text marks](../api/marks/text.md)

### `editTextMark`

```javascript
editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })
```

Edit text typography and graphical offsets without changing its semantic
source or position. [Text marks](../api/marks/text.md)

### `layoutLabels`

```javascript
layoutLabels({ target?, axis?, padding?, maxDisplacement?, bounds?, leader? } = {})
```

Assign deterministic collision-aware placement to one complete text mark.
Displacement may use x, y, or both axes and remains inside plot or Canvas
bounds when possible. Optional leaders connect displaced labels to their
stored source anchors. Impossible layouts retain a stable best effort and a
warning summary. [Text marks](../api/marks/text.md)

### `removeLabelLayout`

```javascript
removeLabelLayout({ target? } = {})
```

Remove one text mark's layout policy and leader collection, then restore its
semantic base positions. [Text marks](../api/marks/text.md)

#### Position capability matrix

<!-- action-capabilities:position:start -->
| Action | Supported marks | Field types | Important modes |
| --- | --- | --- | --- |
| `encodeX` | point, line, area, bar, rect, rule, text | point/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; line/area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, text | point/line/bar/rect/rule/text: quantitative, temporal, ordinal, nominal; area: quantitative, temporal | field; rule also accepts datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule also accepts datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: ordinal, nominal | arc accepts aggregate: count or weighted sum for proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
<!-- action-capabilities:position:end -->

### `encodeX`

```javascript
encodeX({ field, target?, fieldType?, aggregate?, stack?, coordinate?, bin?, scale? })
encodeX({ datum, target?, fieldType, coordinate?, scale? }) // rule
```

Create or compatibly replace an x encoding for the supported mark/type pairs in
the matrix above. Rects accept a discrete x band or the primary x edge of a
complete x/x2 range. Bars accept binned x, vertical categories, or a horizontal
aggregate measure. Rules accept exactly one field or datum and an explicit
field type.
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
Rects accept a discrete y band or the primary y edge of a complete y/y2 range.
Rules accept exactly one field or datum and an explicit field type.
[Position encodings](../api/position-encodings.md)

### `encodeY2`

```javascript
encodeY2({ field, target?, fieldType, scale?, coordinate? })
encodeY2({ datum, target?, fieldType, scale?, coordinate? }) // rule
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary y endpoint.
It requires an existing y and shares its scale and coordinate.
[Position encodings](../api/position-encodings.md)

### `encodeX2`

```javascript
encodeX2({ field, target?, fieldType, scale?, coordinate? })
encodeX2({ datum, target?, fieldType, scale?, coordinate? })
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary x endpoint.
It requires an existing x and shares its scale and coordinate.
[Position encodings](../api/position-encodings.md)

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

### `encodePathOrder`

```javascript
encodePathOrder({ field, target?, fieldType?, order? })
```

Order vertices within each compatible Cartesian line or ranged-area series.
`fieldType` defaults to `"quantitative"`; `order` defaults to `"ascending"`.
Ties preserve source-row order, and no scale or guide is created.
[Series encodings](../api/series-encodings.md)

### `encodeParallelCoordinates`

```javascript
encodeParallelCoordinates({ dimensions, target?, coordinate?, key?, missing? })
```

Atomically assign ordered dimensions and their local scales to one line mark.
The default missing policy is `"break"`.
[Parallel Coordinates](../api/parallel-coordinates.md#advanced-encoding)

### `removePathOrder`

```javascript
removePathOrder({ target? } = {})
```

Remove explicit path topology and restore the mark's automatic independent-
position ordering. [Series encodings](../api/series-encodings.md)

### `removeEncoding`

```javascript
removeEncoding({ target?, channel })
```

Remove one active semantic encoding, its generated companions, matching guide
blocks, and stale concrete values. Named datasets, scales, and coordinates are
retained; incomplete marks remain empty until later encoding completion.
[Encodings](../api/encodings.md#removing-an-encoding)

### `encodeText`

```javascript
encodeText({ target?, field?, value?, format? })
```

Assign exactly one field or constant value to a text mark. `format` accepts
`"auto"` or fixed-decimal tokens from `".0f"` through `".12f"`. Reassignment
replaces the previous content branch. [Text marks](../api/marks/text.md)

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
editDensity({
  target?, source?, field?, groupBy?, bandwidth?, extent?, steps?, kernel?,
  normalization?, placement?
})
```

Create an immutable density-data revision, rebind the selected density area,
and rematerialize its graphical consumers. `source`, `field`, and `groupBy`
can revise create-time data roles; `groupBy: false` removes grouping. Output
fields, density channel, coordinate, and position scale IDs are preserved.
[Encodings](../api/encodings.md#atomic-density)

### `encodeHorizon`

```javascript
encodeHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
} = {})
```

Create immutable folded-band data, bind it to an area mark, and author the
ordinary x, y/y2, group, and color encodings needed for a compact Horizon
chart. Compatible target, source, and fields are inferred when unambiguous.
[Encodings](../api/encodings.md#atomic-horizon)

### `editHorizon`

```javascript
editHorizon({
  target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?,
  missing?, overflow?, palette?
})
```

Create and bind an immutable Horizon revision, preserve omitted settings and
scale identities, and rematerialize affected consumers. `groupBy: false`
removes grouping.
[Encodings](../api/encodings.md#atomic-horizon)

### `encodeColor`

#### Color capability matrix

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
encodeTheta({ field, target?, fieldType?, aggregate?, scale?, coordinate? })
```

Encode Polar angle in clockwise degrees from 12 o'clock. Quantitative,
temporal, ordinal, and nominal fields are supported for point and line marks.
Arc marks accept nominal or ordinal fields and optional `aggregate: "count"`.
The default scale ID is `theta` and its automatic range is `[0, 360]`.
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

### `removePointRadius`

```javascript
removePointRadius({ target? } = {})
```

Remove an explicit constant point glyph radius and restore the theme default.
Semantic Polar radial position is unchanged.
[Point appearance](../api/appearance/point.md)

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
  target?, data?, x?, y?, groupBy?, method?, degree?, span?, confidence?,
  interval?, band?, line?
})
```

Revise the model through its stable point owner. Data-role or statistical
changes create and rebind one immutable derived-data revision; `groupBy: false`
removes grouping. Component-only changes retain the current fitted rows.
[Regression](../api/regression.md#editing-a-regression)

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
  target?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?,
  statistics?
})
```

Partially edit one error bar and its owned caps. `statistics` revises a
statistical interval through immutable data; explicit interval owners reject
that option. `caps: false` removes both caps and `caps: true` restores them.
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
editErrorBand({ target?, fill?, opacity?, curve?, statistics?, boundaries? })
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Edit the band body, statistical interval, or both owned boundary components
without addressing generated line IDs. `boundaries: false` disables both;
an object creates or edits both. The focused boundary action still accepts
`"both"`, `"lower"`, or `"upper"` and creates missing selected boundaries.
[Error bands](../api/error-bands.md#editing-the-band)

### `createBoxPlot`

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, whisker?, width?, outliers?,
  box?, median?, outlier?, guides?
} = {})
```

Create a vertical or horizontal Tukey/min–max box plot from one categorical
and one quantitative field. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../api/box-plots.md)
Guides remain opt-in for compatibility: pass `guides: {}` or nested options to
create them inside the facade; omission and `false` create none.

### `editBoxPlot`

```javascript
editBoxPlot({ target?, whisker?, width?, outliers?, box?, median?, outlier? })
```

Revise box statistics, optional outlier topology, width, and component
appearance through the stable box owner without addressing generated child
IDs. [Box plots](../api/box-plots.md#editing-a-box-plot)

### `createGradientPlot`

```javascript
createGradientPlot({
  id?, target?, data?, x?, y?, coordinate?, density?, width?, gradient?,
  center?, guides?
} = {})
```

Create one density-gradient strip per category from categorical and
quantitative x/y roles. Positions can be explicit, inferred from one eligible
encoded layer, or completed later. Defaults are Gaussian auto density, 64
samples, width band `0.7`, no outline, a median center rule, and applicable
guides. A categorical `encodeColor` owns strip hue while density continues to
control lightness and opacity.
[Statistical actions](../reference/actions/statistics.md#creategradientplot)

### `editGradientPlot`

```javascript
editGradientPlot({ target?, density?, width?, gradient?, center? })
```

Revise one stable gradient-plot owner. Statistical changes create and rebind
one immutable raw-source profile revision; appearance-only edits retain it.
`center: false` removes the optional rule and `center: {}` restores it.
[Statistical actions](../reference/actions/statistics.md#editgradientplot)

### `createViolinPlot`

```javascript
createViolinPlot({
  id?, data?, coordinate?, x, y, split?, color?, density?, area?, guides?
})
```

Create a vertical or horizontal categorical density plot from exactly one
categorical and one quantitative x/y role. The action infers field types,
orientation, data, scales, and applicable guides, then records an ordinary area
mark, categorical `encodeDensity`, optional color, and guides as wrapped
children. Density options own bandwidth, extent, kernel, normalization, and
shared or independent band-relative width. An optional two-value split assigns
one half to each side of the category center.
[Violin plots](../api/violin-plots.md)

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
`"auto"`, or `false`; semantic channel bindings cannot be edited. A
stroke-width legend accepts the bounded `title`, `count`, `labels`, and
`titleStyle` subset and remains right-positioned.
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
removeLegend({ target?, channels? })
```

Remove every legend block owned by one mark when `channels` is omitted, or
remove selected complete channel blocks while preserving mark encodings,
scales, and unrelated blocks. Combined categorical blocks require their full
represented channel set. [Legends](../api/legends.md)

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

### `editMarkSelection`

```javascript
editMarkSelection({ selection?, grain?, field | channel | property, op, ...operatorOptions })
```

Replace the complete selector while preserving the stored selection ID and
mark target. Dependent highlights and exact categorical legend reflection are
replayed from a clean baseline.
[Selection lifecycle](../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

### `removeMarkSelection`

```javascript
removeMarkSelection({ selection? } = {})
```

Release one stored selection after removing its dependent highlight. Other
selection and highlight assignments remain active.
[Selection lifecycle](../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

### Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
createDerivedData({
  id,
  source,
  transform: [DatasetTransform]
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

`createCoordinate.type` accepts `"cartesian"`, `"polar"`, or `"parallel"`.
Parallel coordinates normally create their resource through
`encodeParallelCoordinates` or `createParallelCoordinates`.

`createDerivedData` stores immutable source and transform provenance only; it
does not materialize values. Its public `DatasetTransform` union supports
`filter`, `regression`, `density`, and `interval` objects. A bare object, empty
array, or multi-transform pipeline is invalid. See the runnable filter example and exact transform
requirements in [Source and derived data](../api/data/source-and-derived.md#create-derived-data).

### Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
editXAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
editYAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
```

Complete-axis edits update only the selected components of an existing axis.
Each component accepts its edit object or `false` for removal. Use
`ticksAndLabels` for a coordinated tick/label edit or removal, or `ticks` and
`labels` for independent edits/removals; do not combine both forms. Removal
preserves scale, coordinate, encoding, and data, while the last component also
cleans the empty axis state.

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
`materializeDensityData`, `materializeWindowData`, `materializeBin2DData`, `rematerializeScale`, `rematerializePointMark`,
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

Package-level functions create, compose, or render programs. They are not
chainable actions and do not modify the action trace.

<!-- BEGIN GENERATED RUNTIME SIGNATURES -->
<!-- END GENERATED RUNTIME SIGNATURES -->

## Rendering functions

Use [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable child replacement. Use [Rendering](../api/rendering.md) for
complete Browser Canvas, SVG, Node PNG, and vector PDF examples.
