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
  removeMarkFilter(options?: RemoveMarkFilterOptions): ChartProgram;
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
  createBarMark(options?: { id?: string; data?: string; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editBarMark(options: { target?: string; blend?: "normal" | "difference"; fill?: FillPaint; opacity?: number; stroke?: string | false; strokeWidth?: number; }): ChartProgram;
  createAreaMark(options?: { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  createArcMark(options?: { id?: string; data?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editArcMark(options: { target?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  createRectMark(options?: RectMarkOptions): ChartProgram;
  editRectMark(options: EditRectMarkOptions): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string } & RuleStyleOptions): ChartProgram;
  editRuleMark(options: { target?: string } & RuleStyleOptions): ChartProgram;
  createTextMark(options?: TextMarkOptions): ChartProgram;
  createTextPlot(options: CreateTextPlotOptions): ChartProgram;
  createMarkLabels(options?: CreateMarkLabelsOptions): ChartProgram;
  editMarkLabelSelection(options: EditMarkLabelSelectionOptions): ChartProgram;
  editMarkLabelPlacement(options: EditMarkLabelPlacementOptions): ChartProgram;
  removeMarkLabels(options: RemoveMarkLabelsOptions): ChartProgram;
  createAnnotation(options: CreateAnnotationOptions): ChartProgram;
  createReferenceLine(options: CreateReferenceLineOptions): ChartProgram;
  createReferenceBand(options: CreateReferenceBandOptions): ChartProgram;
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
  encodeGroup(options: GroupEncodingOptions): ChartProgram;
  encodeText(options: TextEncodingOptions): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: { target?: string; value: string }): ChartProgram;
  encodeStrokeWidth(options: StrokeWidthEncodingOptions): ChartProgram;
  encodeChannels(options: EncodeChannelsOptions): ChartProgram;
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
  createIntervalPlot(options: CreateIntervalPlotOptions): ChartProgram;
  createRegressionPlot(options: CreateRegressionPlotOptions): ChartProgram;
  createDotPlot(options: CreateDotPlotOptions): ChartProgram;
  createLollipopPlot(options: CreateLollipopPlotOptions): ChartProgram;
  createDumbbellPlot(options: CreateDumbbellPlotOptions): ChartProgram;
  editEndpointPlot(options: EditEndpointPlotOptions): ChartProgram;
  createLinePlot(options: CreateLinePlotOptions): ChartProgram;
  createPolarScatterPlot(options: CreatePolarScatterPlotOptions): ChartProgram;
  createPolarLinePlot(options: CreatePolarLinePlotOptions): ChartProgram;
  createRadarPlot(options: CreateRadarPlotOptions): ChartProgram;
  createRugPlot(options: CreateRugPlotOptions): ChartProgram;
  createStripPlot(options: CreateStripPlotOptions): ChartProgram;
  createBarPlot(options: CreateBarPlotOptions): ChartProgram;
  createHistogram(options: CreateHistogramOptions): ChartProgram;
  createHeatmap(options: CreateHeatmapOptions): ChartProgram;
  removeMark(options?: RemoveMarkOptions): ChartProgram;
  createAxes(options?: CreateAxesOptions): ChartProgram;
  createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
  createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
  createThetaAxis(options?: CompletePolarAxisOptions): ChartProgram;
  createRadialAxis(options?: CompleteRadialAxisOptions): ChartProgram;
  createThetaAxisLine(options?: CreateThetaAxisLineOptions): ChartProgram;
  createRadialAxisLine(options?: CreateRadialAxisLineOptions): ChartProgram;
  createThetaAxisTicks(options?: CreateThetaAxisTicksOptions): ChartProgram;
  createRadialAxisTicks(options?: CreateRadialAxisTicksOptions): ChartProgram;
  createThetaAxisLabels(options?: CreateThetaAxisLabelsOptions): ChartProgram;
  createRadialAxisLabels(options?: CreateRadialAxisLabelsOptions): ChartProgram;
  createThetaAxisTitle(options?: CreateThetaAxisTitleOptions): ChartProgram;
  createRadialAxisTitle(options?: CreateRadialAxisTitleOptions): ChartProgram;
  editThetaAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editRadialAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editThetaAxisTicks(options?: PolarTickOptions): ChartProgram;
  editRadialAxisTicks(options?: PolarTickOptions): ChartProgram;
  editThetaAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editRadialAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editThetaAxisTitle(options?: PolarTitleOptions): ChartProgram;
  editRadialAxisTitle(options?: RadialTitleOptions): ChartProgram;
  createXAxisLine(options?: AxisLineStyleOptions & { target?: string; scale?: string; position?: XAxisPosition }): ChartProgram;
  createYAxisLine(options?: AxisLineStyleOptions & { target?: string; scale?: string; position?: YAxisPosition }): ChartProgram;
  editXAxisLine(options?: AxisLineStyleOptions & { target?: string; position?: XAxisPosition }): ChartProgram;
  editYAxisLine(options?: AxisLineStyleOptions & { target?: string; position?: YAxisPosition }): ChartProgram;
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
  removeThetaAxis(options?: Omit<RemoveAxisOptions, "target">): ChartProgram;
  removeRadialAxis(options?: Omit<RemoveAxisOptions, "target">): ChartProgram;
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
  editCoordinate(options: EditCoordinateOptions): ChartProgram;
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
createCanvas({ width?, height?, background?, margin?, plot? })
```

Create the program's Canvas and plot bounds. [Canvas options](../api/canvas.md)

### `editCanvas`

```javascript
editCanvas({ width?, height?, background?, margin?, plot? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../api/canvas.md)

### `fitCanvas`

```javascript
fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow? })
```

Fit an existing Full unit chart by shrinking its margins on a fixed Canvas.
The action uses deterministic 0.25px probes and preserves semantic state,
explicit scale ranges, guide policies, Canvas width, and Canvas height. The
default overflow policy rejects an unsatisfied minimum plot atomically;
`overflow: "report"` stores a structured result on
`materializationConfigs.fitting`.

### `applyTextMetrics`

```javascript
applyTextMetrics({ profile })
```

Apply a host-measured width profile to title, axis, legend, label, and composition
layout. See [Measured text layout](../api/rendering.md#measured-text-layout) for the
exact profile format, matching rules, propagation, and executable example.

### `removeTextMetrics`

```javascript
removeTextMetrics()
```

Remove the active profile and rematerialize with deterministic width estimates.
See [Measured text layout](../api/rendering.md#measured-text-layout) for lifecycle
and composition behavior.

### `applyTheme`

```javascript
applyTheme({ theme, scope? })
```

Use `"light"`, `"dark"`, or a custom partial definition such as:

```javascript
program.applyTheme({
  theme: {
    base: "light",
    tokens: {
      mark: "#b91c1c",
      grid: "#d1fae5",
      fontFamily: "Inter"
    }
  }
});
```

Custom definitions accept these token keys: `background`, `mark`, `text`,
`strongText`, `mutedText`, `axis`, `axisTitle`, `grid`, `border`,
`sizeSymbol`, `regressionBand`, `boxLine`, `boxMedian`, `referenceLine`,
`referenceBand`, `gradientCenter`, `highlight`, `fontFamily`, `axisLabel`,
`axisLabelFontFamily`, `axisTitleFontFamily`, `axisLabelFontSize`, and
`axisTitleFontSize`. Font sizes must be positive finite numbers; other tokens
must be non-empty strings. A new theme replaces the previous request; omitted
partial tokens come from the new base.

Axis label and title font tokens affect only axes, including Polar and Parallel
axes. Omitted role fonts fall back to `fontFamily`; omitted sizes retain each
axis family's default. `axisLabel` overrides label color; without it, Cartesian
and Polar labels use `text`, and Parallel labels use `axis`. `axisTitle` controls
axis title color. Explicit axis styles win, even when equal to a built-in default.
Active fonts are used during initial guide layout as well as later theme edits.

A unit chart defaults to `scope: "self"`. A composition defaults to
`scope: "descendants"`, which updates its root, current nested children, and
children later rebuilt by facet or repeat edits. Use `scope: "self"` on a
composition to change only its root Canvas background.

Explicit mark, guide, title, legend block, facet header, and highlight styles
take precedence. Field-driven palettes, semantic data, scales, grouping,
statistics, and ordering are preserved. Font token changes recalculate text
bounds and composition layout.

### `removeTheme`

```javascript
removeTheme()
```

Remove the most recently applied theme scope on that receiver. Composition
removal deletes only that composition's frame, so a previously hidden child or
ancestor theme becomes active again. Explicit local styles remain unchanged.

### `createLayerPlot`

```javascript
createLayerPlot({ id?, source?, plot: { action, options? }, placement?: "front" | "back" })
```

Add an independent native chart to the source chart's coordinates. Data and positional
roles are inferred from the original fields, including distribution summaries. Compatible
measurement units and named scales are shared; appearance remains independently editable.
The entire owned mark group moves together in front of or behind the source.
`getPlotComposition(program, { target })` from `ggaction/inspection` describes the source
roles. Use `createOverlay` to follow already computed visible results instead.
[Independent layers and adjacent charts](../api/composition/editing.md)

### `createAdjacentPlot`

```javascript
createAdjacentPlot({ id?, source?, position?, plot?, share?, gap?, align? } = {})
```

Add an independent chart next to a unit or facet view. Placement is left, right, top or bottom.
The default line inherits source fields, binning and aggregation; `plot: { action, options }`
selects any built-in chart constructor. Original fields and data are inferred through each
constructor's native positional roles; ambiguous additional fields require explicit options. `plot.options.data` selects a materialized source-view dataset;
the adjacent view receives its own snapshot and retains the source view's materialized input
tables, so later charts can use variables omitted from a summary. Completed-key tables retain
their original field and aggregation meanings during inference. The top-level `id` owns its view and mark.
Horizontal placement shares compatible Y meanings by default; vertical placement shares
compatible X meanings. Different aggregates or coordinate families stay independent. An
explicit `share` replaces that default and rejects incompatible meanings. `align: "plot"` matches actual plot frames without stretching text or symbols.
Shared color legends retain their plot-relative position and offset, reusing child margins
instead of adding another empty lane outside the child Canvases. Automatic offsets clear
retained content; explicit offsets remain exact and reject collisions.
[Shared scales and adjacent charts](../api/composition/editing.md)

### `editCompositionScales`

```javascript
editCompositionScales({ share })
```

Update a nonempty subset of concat shared-channel policies. Boolean keys include x, y,
color, stroke, size, shape, opacity, strokeWidth and strokeDash. Shared channels require
compatible meaning and scale mapping. Canonical child settings remain intact; setting a
channel false restores independent domain inference. This edit is atomic.

### `editCompositionLayout`

```javascript
editCompositionLayout({ columns?, gap?, spacing?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
`columns` changes wrapping only on a facet composition and is rejected for concat.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs. Facet parents accept `gap: {x, y}` to
set horizontal and vertical distances separately; both keys are required and each
value must be finite and non-negative. A pair replaces both axes, while an omitted
gap preserves its current form. Concat continues to require a numeric gap.

### `replaceCompositionChild`

```javascript
replaceCompositionChild({ target, program })
```

Replace one named child while preserving its slot ID and order. The replacement
must already be a complete chart or composition program.

### `insertCompositionChild`

```javascript
insertCompositionChild({ id, program, before?, after? })
```

Insert a complete chart or nested composition under a new stable child name.
Use either `before` or `after`; omitting both appends the child.

### `removeCompositionChild`

```javascript
removeCompositionChild({ target })
```

Remove one named concat child and rebuild layout. A concat may retain one child,
but its final child cannot be removed.

### `reorderCompositionChildren`

```javascript
reorderCompositionChildren({ order })
```

Provide every current concat child ID exactly once in its new order. Child
program references stay unchanged while placements and snapshots are rebuilt.

### `facet`

```javascript
facet({ id?, field, data?, values?, columns?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one complete Cartesian, Polar, or Parallel chart by a field on its common
row-preserving dataset ancestor. Values preserve source first appearance;
scale policies can be `"shared"` or `"independent"` by supported role, including
Polar `theta`/public `r` and all `parallelDimensions`. Layered regression data,
statistical descendants, data-bound Cartesian text, attached labels, and references
recompute per cell. Text needs x/y scales and a text encoding.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend at
the child legend's configured `left`, `right`, `top`, or `bottom` edge. Top and
bottom promotion also preserves the child legend's horizontal alignment;
author those options with `createLegend` before calling `facet`. Promoted outside
legends use the existing recipe offset from the combined panel plots. Omitted
offsets clear retained axis and header text; explicit colliding offsets reject.
Child Canvas dimensions and margins remain intact, and the inferred parent
Canvas contains the child snapshots and the complete legend bounds.
A `guides.legend` object declares a native parent legend against the final child-plot
union using ordinary `LegendOptions` defaults. Existing whole/focused/block legend
editors and removal accept that facet, grid or repeat parent. Declare an absent
owner with `editFacetGuides({ legend: {...} })`; post-facet `createLegend` stays
unit-only. Target IDs name source marks. Corners/free coordinates and block-local
anchors use the union and preserve child dimensions, automatic policies and editable
persistence. See [parent legend creation](../api/composition/facets.md#declare-a-legend-for-the-complete-facet).
See [Program composition](../api/composition.md#repeat-the-current-chart-by-a-field).

Facet, grid and field repetition also accept `gap: {x, y}`. A number still applies
one distance in both directions and keeps its stored form. A pair must contain
exactly those two finite non-negative values; partial objects and unknown keys
reject, even for one row or column. The distances separate child canvases, plots,
or retained content according to the existing spacing mode. Grid still supports
only canvas/plot spacing. Header clearance and final overlap checks remain active
independently in both directions. The pair survives layout edits, source replay
and editable persistence. See [independent axis gaps](../api/composition/facets.md#use-different-horizontal-and-vertical-gaps).

Creation options for `facet`, `facetGrid`, and `repeatCharts` accept `headers`.
Set common `fontSize`, `fontFamily`, `fontWeight`, `color`, `offset`, `align`, or
`labelMap`, and optional `row`/`column` objects with role-specific overrides and
`side`. Common styles are applied before role overrides. Row headers require a
two-field grid; its column sides are top/bottom, while one-field facets and
repeats also allow left/right column headers. The option uses the same values,
layout, and precedence as `editFacetHeaders`; authored styles survive themes
and source replay. Omitting `headers` preserves the default headers.
With `spacing: "plot"`, headers stay aligned to their panel plots and sit outside
retained axis text and local legend ink, including outward Polar labels. Header lanes
are recalculated after guide edits. The requested plot gap and child Canvas sizes
remain unchanged; insufficient interior guide/header space rejects the operation.

### `facetGrid`

```javascript
facetGrid({ id?, data?, rows, columns, combinations?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one supported Cartesian, Polar, or Parallel chart over two ordered
categorical fields.
`combinations: "observed"` retains the coordinates of observed pairs;
`"full"` also creates explicit empty cells that retain their semantic layers,
coordinate, header, and shared or explicit-domain local guides.

### `repeatCharts`

```javascript
repeatCharts({ id?, target?, channel, fields, columns?, gap?, spacing?, align?, padding?, scales?, guides?, headers? })
```

Repeat one direct mark by replacing Cartesian `x`/`y`, eligible Polar
`theta`/public `r`, or one `{ parallelDimension: field }`. The repeated role is
independently scaled by default; request a shared policy explicitly to use the
union domain. Attached labels and statistical references owned by the target
replay with it. Pie/Radar raw positional roles, derived targets, unrelated
layers, and composite roles are rejected with explicit errors.

### `editFacetSource`

```javascript
editFacetSource({ program })
editFacetSource({ action: { method, options? } })
```

Reapply the current facet, grid, or repeat recipe to a revised complete unit
program while preserving the partition dataset ID, ordered domains, layout,
scale/guide policy, headers, and parent title. All stored facet values must
remain observed; create a new composition when the dataset ID, domain, or
repeat field list changes. Alternatively, pass one actual unit chart-authoring action
name and its options to edit the retained full-data source in the same transaction.
Specify exactly one of `program` or `action`; extension primitives, materializers,
and composition actions cannot be source edits.

### `editFacetHeaders`

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset?, role?, labelMap?, side?, align?, rotation?, title? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.
One-field facets and repeats accept all four sides with `role: "column"`;
left/right placements reserve a measured lane beside every physical column.
Row-column grids retain left/right row headers and top/bottom column headers.
Role-specific `title: { text: "Region" }` adds one field title across the occupied
plots, separately from category headers and the chart title. Initial options use
`headers.column.title` or grid `headers.row.title`. A first title requires one-line
text; partial edits preserve it and `title: false` removes it. Title style inherits
its role header, with optional fontSize/fontFamily/fontWeight/color, align,
rotation, offset and alongOffset overrides. Common/all titles are rejected.

### `editFacetScales`

```javascript
editFacetScales({ x?, y?, xOffset?, yOffset?, theta?, r?, color?, stroke?, size?, shape?, opacity?, strokeDash?, parallelDimensions? })
```

Partially change used facet channels between `"shared"` and `"independent"`.
Every cell is rederived from the retained pre-facet program while field, data,
value order, child IDs, layout, guides, headers, and title are preserved. Public
`r` addresses semantic radius; `parallelDimensions` applies the policy separately
to every Parallel dimension.

### `editFacetGuides`

```javascript
editFacetGuides({ axes?, legend? })
```

Partially change axes between `"each"` and `"outer"`, or legend ownership
between `false` and `"shared"`. Shared legend promotion requires concretely
compatible child scales and guide recipes. Polar and Parallel axes remain
child-local and reject `"outer"`.

### `createData`

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../api/data.md)

### `applyDataUpdate`

```javascript
applyDataUpdate({ prepared, requestToken })
```

Apply an opaque result of `await prepareDataUpdate(program, request, host)` to
its exact immutable base with the application's current request token. Full
supports creating, refreshing, and parameter-dependent source updates; Basic
supports creation. Hosts provide explicit CSV/JSON loaders. All source and
computed consumers update atomically. See the
[prepared data reference](../api/data/source-and-derived.md#prepared-data-updates)
and [refresh workflow](../data-updates.md#prepare-and-apply-source-data).

### `reviseData`

```javascript
reviseData({ source, id, values })
```

Create a fresh original-data revision and atomically update its dependent chart.
The original is retained; IDs and styles of existing chart owners remain stable.
See [Data updates](../data-updates.md#revise-a-source-and-its-dependent-chart).

### `removeData`

```javascript
removeData({ id })
```

Remove one explicitly named dataset only when no mark, downstream dataset,
retained recipe, or owned resource still refers to it. Context and historical
trace mentions do not keep it alive. A standalone logical derived-data owner
removes its current snapshot and owner record together. This Full-only action
does not infer, cascade, or change graphics.
[Source and Derived Data](../api/data/source-and-derived.md#removedata-id)

### `removeScale`

```javascript
removeScale({ id })
```

Remove one explicitly named unused semantic scale and its resolved cache entry.
Every encoding, Parallel dimension, guide, and retained authoring binding is
checked first. The Full-only action does not rewire consumers or rebuild
graphics. [Scale Options](../api/scales.md#removescale-id)

### `removeCoordinate`

```javascript
removeCoordinate({ id })
```

Remove one explicitly named unused coordinate after checking layer, guide,
annotation, and retained data-space bindings. A context pointer is cleared, but
no replacement coordinate is inferred. This action is Full-only.
[Coordinates](../api/coordinates.md#removecoordinate-id)

### `createSummaryData`

```javascript
createSummaryData({ id, source?, groupBy?, aggregates, members? })
```

Materialize reusable, first-appearance-ordered summary rows from one or more
shared aggregate operations. Nonweighted mean CI outputs also accept seeded percentile
bootstrap method objects; see [bootstrap mean intervals](../api/data/summaries-and-shaping.md#bootstrap-mean-confidence-intervals).
[Source and Derived Data](../api/data/source-and-derived.md#createsummarydata-id-source-groupby-aggregates-members)

### `createBinData`

```javascript
createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as? })
```

Materialize reusable one-dimensional bounds, counts, and optional source
members using the same edge rules as Histogram.
[Source and Derived Data](../api/data/source-and-derived.md#createbindata-id-source-field-binoptions)

### `createLookupData`

```javascript
createLookupData({ id, source?, field, lookup: { data, key, fields, as? } })
```

Copy fields from one named table without changing primary row order or count.
Keys keep their scalar types; unmatched rows receive null, and duplicate reference keys reject.
Full and Basic support creation. [Named table lookup](../api/data/summaries-and-shaping.md#named-table-lookup)

### `createFlattenData`

```javascript
createFlattenData({ id, source?, fields, as? })
```

Expand parallel array columns into index-aligned rows; shorter arrays pad with null.
Retain raw ancestors and original row/index order. Full and Basic support creation.
[Aligned array data](../api/data/summaries-and-shaping.md#createflattendata-id-source-fields-as)

### `createFoldData`

```javascript
createFoldData({ id, source?, fields, as? })
```

Materialize selected wide fields as stable key/value rows while preserving
every source cell. [Source and Derived Data](../api/data/source-and-derived.md#createfolddata-id-source-fields-as)

### `createParameter`

```javascript
createParameter({ id, value, type?, nullable? })
```

Create a named number, string, or boolean input for version 2 computed expressions.
A null initial value requires an explicit type and `nullable: true`.
Available in Full and Basic. [Parameters](../api/data/expressions-and-normalization.md#parameters)

### `editParameter`

```javascript
editParameter({ target, value })
```

Atomically revise a parameter value, dependent datasets, and their chart consumers.
Type and nullability remain fixed. Available in Full.
[Parameters](../api/data/expressions-and-normalization.md#parameters)

### `removeParameter`

```javascript
removeParameter({ id })
```

Remove an existing parameter only after all stored references have been removed.
Available in Full. [Parameters](../api/data/expressions-and-normalization.md#parameters)

### `createComputedData`

```javascript
createComputedData({ id, source?, as, expression })
```

Materialize a scalar field from a serializable, closed v1 or explicit v2
expression. Version 2 adds named parameter inputs, a closed function registry,
and missing-value diagnostics while preserving existing v1 behavior. [Source and Derived Data](../api/data/source-and-derived.md#createcomputeddata-id-source-as-expression)

### `createNormalizedData`

```javascript
createNormalizedData({ id, source?, field, as, groupBy?, method, variance?, zeroDenominator?, baseline?, sortBy? })
```

Materialize row-preserving share, z-score, min-max, index, change, or fractional
percent-change values independently within each group.
[Source and Derived Data](../api/data/source-and-derived.md#createnormalizeddata-id-source-field-as-groupby-method)

### `createCompleteData`

```javascript
createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })
```

Complete one typed key domain independently inside every observed group, with
explicit fill and source-membership provenance for synthesized rows.
[Source and Derived Data](../api/data/source-and-derived.md#createcompletedata-id-source-key-groupby-values-sequence-fill-members)

### `createImputedData`

```javascript
createImputedData({ id, source?, fields, groupBy?, sortBy?, method?, value?, edges?, maxGap? })
```

Replace nullish cells by group mean (the default), constant, forward, backward, or distance-based linear
imputation while preserving group boundaries and final source order.
[Source and Derived Data](../api/data/source-and-derived.md#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap)

### `createStackData`

```javascript
createStackData({ id?, source?, category, group, value, mode?, as? })
```

Materialize reusable start/end/value/share rows with the same stack math used
by Bar and Area layouts. [Source and Derived Data](../api/data/source-and-derived.md#createstackdata-id-source-category-group-value-mode-as)

### `bindMarkData`

```javascript
bindMarkData({ target, data })
```

Atomically connect one independent mark to an existing materialized dataset.
The action preflights its fields, scales, guides, labels, selections, and
highlights before it rematerializes every registered consumer.
[Source and Derived Data](../api/data/source-and-derived.md#bindmarkdata-target-data)

### `createScatterPlot`

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, stroke?, size?, shape?, point?, missing?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../api/basic-charts.md#createscatterplot)

### `createTextPlot`

```javascript
createTextPlot({ id?, data?, coordinate?, x, y, text, color?, style?, guides? })
```

Create a Cartesian data-text chart from required positions and content. Available
in the full entry only. Strings name fields; constant text uses `{ value }`.
[Basic Charts](../api/basic-charts.md#createtextplot)

### `createDotPlot`

```javascript
createDotPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, point?, labels?, guides? })
```

Create categorical dots from raw rows by default. Set `summary` explicitly to
`mean`, `median`, `sum`, `min`, or `max` to aggregate one dot per category.

### `createLollipopPlot`

```javascript
createLollipopPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, baseline?, point?, stem?, labels?, guides? })
```

Create a value point and a stem to a finite baseline, which defaults to zero.
The point and stem use the same source grain and quantitative scale.

### `createDumbbellPlot`

```javascript
createDumbbellPlot({ id?, data?, coordinate?, category, start, end, orientation?, summary?, startPoint?, endPoint?, connector?, labels?, guides? })
```

Create named start and end points with a connector. Endpoint identity stays
attached to its field and appearance when values reverse or coincide.
Because two fields share the value scale, its ambiguous axis title is omitted by
default. Set `guides.axes.x.title` for a horizontal plot or
`guides.axes.y.title` for a vertical plot to provide one explicitly.

### `editEndpointPlot`

```javascript
editEndpointPlot({ target?, data?, coordinate?, category?, value?, start?, end?, orientation?, summary?, baseline? })
```

Atomically revise the semantic roles of a Dot, Lollipop, or Dumbbell facade.
Owned points, rules, labels, and summary data are replaced together while the
original appearance and guide policy are retained.
When a changed role or source changes an axis domain, tick samples from the
previous domain are inferred again while retaining their label and line styles.
Separately added statistical references retain their source endpoint, styles, and
labels, recompute from the revised observations, and follow the measurement axis
when orientation changes.

### `createECDFPlot`

```javascript
createECDFPlot({ id?, data?, coordinate?, field, groupBy?, weight?, missing?, as?, color?, line?, labels?, guides? })
```

Create a right-continuous empirical cumulative distribution as an ordinary
`step-after` line. Ties share one jump, probability is fixed to `[0,1]`, and
optional grouping controls both statistical denominators and path identity.

### `editECDFPlot`

```javascript
editECDFPlot({ target?, data?, coordinate?, field?, groupBy?, weight?, missing?, as?, color? })
```

Atomically revise an ECDF source or statistical role and rebuild its owned
derived rows, path, final-series labels, and guides under the stable owner ID.
Ungrouping also removes a coupled group color unless a replacement is supplied.

### `createIntervalPlot`

```javascript
createIntervalPlot({ id?, data?, coordinate?, x, y, xOffset?, yOffset?, groupBy?, color?, point?, errorBar?, guides? })
```

Create center points and matching statistical or explicit intervals from one
shared dataset, coordinate, and pair of scales. The x/y interval vocabulary is
the same as `createErrorBar`; child point and error-bar styles remain independently
editable through their existing owners. When scale IDs are omitted, the complete
owner uses `${id}X` and `${id}Y` so unrelated earlier channel scales cannot make
the call order dependent.

### `createRegressionPlot`

```javascript
createRegressionPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, groupBy?, method?, band?, line?, guides? })
```

Create a scatter plot with fitted regression data, a line, and optional interval bands.
`groupBy: false` is preserved as an explicit
ungrouped model request.

### `createLinePlot`

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart. `groupBy` accepts one field or a
non-empty tuple, assigned before independent series color and dash. [Basic Charts](../api/basic-charts.md#createlineplot)

Categorical x (`nominal` or `ordinal`) accepts point/band scales and raw quantitative
or aggregate y. Vertices follow the x domain; absent an explicit domain, categories
follow first appearance. Duplicate-category rows keep source order. Missing categories
are not synthesized, and remaining observations connect across their category spacing.

### `createPolarScatterPlot`

```javascript
createPolarScatterPlot({ id?, data?, coordinate?, theta, radius, color?, size?, shape?, point?, missing?, guides? })
```

Create a complete Polar point chart from required angular and radial fields.
Radial position remains independent from `size` and constant `point.radius`.
[Polar positions](../api/position-encodings.md#polar-positions)

### `createPolarLinePlot`

```javascript
createPolarLinePlot({ id?, data?, coordinate?, theta, radius, groupBy?, color?, strokeDash?, line?, guides? })
```

Create grouped Polar paths from required angular and radial fields. Paths stay
open unless `line.closed: true` is explicit. [Polar positions](../api/position-encodings.md#polar-positions)

### `createRadarPlot`

```javascript
createRadarPlot({ id?, data?, coordinate?, category, value, groupBy?, order?, color?, strokeDash?, line?, guides? })
createRadarPlot({ id?, data?, coordinate?, wide: { fields, as?, summary?, normalize? }, groupBy?, order?, color?, strokeDash?, line?, guides? })
```

Create closed Radar paths from validated long rows or an explicit wide-to-long
Fold. Every series must contain the same ordered dimensions exactly once. Values
are used as supplied; the facade does not infer normalization. [Polar positions](../api/position-encodings.md#polar-positions)

### `editRadarPlot`

```js
editRadarPlot({ target?, wide: { fields, summary?, normalize? } })
```

Edit the dimensions and their angular order in an existing wide Radar plot. `fields` must contain
at least two distinct numeric source fields. Omit `target` only when the current or sole wide Radar
plot identifies the owner unambiguously. Long-form Radar plots are outside this editor's scope.

The action updates the owned fold, angular domain, radial geometry and closed paths together.
Series grouping, color, line appearance, coordinate and guide styles are preserved. Automatic radial
domains are recalculated; explicit radial domains remain unchanged. Angular labels and grid values
follow the revised dimension order, preserving valid explicit subsets.

```js
// Fragment: program already contains a wide Radar named "radar" and these source columns.
const revised = program.editRadarPlot({
  target: "radar",
  wide: { fields: ["quality", "speed", "cost"] }
});
```

Missing, duplicate or nonnumeric fields and incompatible targets reject without changing the
previous program. Omitted `summary` and `normalize` preserve the existing settings. Set
`summary: "mean"` or `"median"` to aggregate repeated rows by the existing series identity.
Set `normalize: "minmax"` to normalize each dimension across the resulting profiles; constant
dimensions map to zero. Set either option to `false` to return to individual observations or
raw units (individual observations require a unique series identity). Switching normalization
resets the radius domain to `[0, 1]` or the raw automatic extent; dimension-only edits preserve
an explicit domain. Original source rows and original measurements remain available.

```js
const profiles = chart().createCanvas().createData({ values: [
  { kind: "A", speed: 10, quality: 80, cost: 100 },
  { kind: "A", speed: 20, quality: 90, cost: 200 },
  { kind: "B", speed: 30, quality: 70, cost: 150 }
] }).createRadarPlot({
  wide: { fields: ["speed", "quality", "cost"], summary: "mean", normalize: "minmax" },
  groupBy: "kind", color: "kind"
});
```

### `createRugPlot`

```javascript
createRugPlot({ id?, data?, x, edge: "top" | "bottom", tick?, guides? })
createRugPlot({ id?, data?, y, edge: "left" | "right", tick?, guides? })
```

Create a one-dimensional distribution from quantitative or temporal observations.
Ticks use an explicit plot edge as their constant position, so no dummy field is
needed. The default guide contains only the measure axis.

Its measure grid follows a continuous quantitative or temporal scale and rejects explicit `bandPosition`.

### `createStripPlot`

```javascript
createStripPlot({ id?, data?, x, y?, color?, size?, shape?, point?, jitter?, guides? })
```

Create a point strip from one measure or from one measure plus one categorical
slot. Optional deterministic jitter moves only the category or constant slot and
preserves the measured coordinate. Category jitter uses band units; a centered
one-measure strip uses pixel units.

### `createBeeswarmPlot`

```javascript
createBeeswarmPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, packing?, guides? })
```

Create a role-safe category/measure Point chart and deterministically pack actual
glyph extents within each category slot. The facade reuses `createStripPlot` and
`packPoints`; set `packing: false` to retain semantic centers without packing.

### `createRaincloudPlot`

```javascript
createRaincloudPlot({ id?, data?, coordinate?, category, value, orientation?, side?, density?, summary?, points?, color?, guides? })
```

Create a shared-source distribution composite from an optional half Violin,
Box or Interval summary, and Strip or Beeswarm raw points. Defaults are vertical,
`side: "before"`, Box summary, and Beeswarm points. Stable Cloud/Summary/Points
children share role scales; summary and points use a replayable band-relative slot
offset on the side opposite the density. `color` accepts its category field or
a fixed `{ value: "#345678" }`; every enabled component receives that color.

### `editRaincloudPlot`

```javascript
editRaincloudPlot({ target?, data?, category?, value?, orientation?, side?, density?, summary?, points?, color? })
```

Atomically revise one Raincloud's shared source, roles, orientation, side, and
component modes while preserving its parent and child IDs. Use `false` to disable
an optional component or remove color; at least one component must remain enabled.
Existing statistical references and their labels retain their identities, definitions,
and styles, recompute from the revised source, and remain above the rebuilt components.
Their measure axis follows orientation changes; if their original component is disabled,
they bind to the remaining parent owner.
When changing category without specifying color, an existing category-driven color
follows the new field. Explicit color requests and fixed colors remain unchanged.
An explicit parent ID also accepts `encodeColor({ target: parentId, ... })` and
observation-field `filterMarks({ target: parentId, ... })`. Parent filtering
recomputes density, summary, and raw points from one retained population;
child-ID filters remain display-only. Parent filters support replace, compose,
and removal, and require observations suitable for the enabled statistics.

### `createBarPlot`

```javascript
createBarPlot({ id?, data?, coordinate?, orientation?, x, y, color?, width?, bar?, missing?, guides? })
```

Create categorical, temporal or binned bars with quantitative measures; bin rectangles fill their complete intervals, while category bars default to 0.72 of the slot. Use `color.layout` for grouped or stacked partitions; guides are inferred unless disabled.
A channel may instead specify `{ lower, upper, scale? }` for raw interval bars without aggregation.
Binned quantitative X with an explicit Y aggregate creates interval-width bars per bin and series; use `color.layout` or `layoutSeries` for overlay, stack, fill or group. Empty bins retain their interval gaps.
Two raw numeric positions preserve each input row and numeric center spacing.
Their orientation defaults to vertical (or follows the range channel); use
`orientation: "horizontal"` for horizontal numeric bars. Their width defaults to
5 pixels and accepts `width: { pixels }`, with overlay layout only. Numeric bars
extend to zero unless explicit lower/upper bounds are supplied.
Category-first child calls infer the ordinary single-field measure's mean in either orientation; temporal categories are supported on both axes.
[Basic Charts](../api/basic-charts.md#createbarplot)

### `createHistogram`

```javascript
createHistogram({ id?, data?, coordinate?, field, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?, color?, bar?, guides? })
```

Create a bar layer with atomic bin and count encodings. Exactly one bin mode may
be specified. [Basic Charts](../api/basic-charts.md#createhistogram)

### `createHorizonPlot`

```js
createHorizonPlot({ id?, data?, coordinate?, x, y, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?, area?, guides? })
```

Create a complete signed, folded area chart from explicit x and y source fields. Defaults use three bands,
a zero baseline, automatic shared extent, blue positive bands and red negative bands. Temporal x fields
support the existing temporal unit vocabulary. The full entry owns this facade; Basic does not expose it.

The original x axis and vertical grid are the only automatic guides. Folded y/horizontal grid/internal
band legend options accept only false. Palette owns fill; area appearance accepts opacity, stroke,
strokeWidth and curve. Explicit opacity is applied after encoding. Revise statistics with editHorizon
and style with editAreaMark. See the [Horizon tutorial](../tutorials/horizon.md).

The vertical grid follows continuous original x and rejects explicit `bandPosition`.

### `createAreaPlot`

```javascript
createAreaPlot({ id?, data?, coordinate?, x, y, valueChannel?, baseline?, groupBy?, layout?, missing?, color?, area?, guides? })
```

Create a simple area, crossing ribbon, or accumulated series chart in the full entry. The default ID is
`areaPlot`; x and y are required. `valueChannel` defaults to y. Its measurement is a field string,
`{field,scale?}`, or `{lower,upper,scale?}`. Each bound is a field string or finite `{datum}` and at least
one bound must use a field. A simple field closes to baseline 0; `baseline` cannot accompany a range.
The independent position is quantitative, temporal, nominal, or ordinal. Categorical positions follow the scale domain order and accept point or band scales; temporalUnit applies only to temporal fields.

`groupBy` explicitly identifies nominal series using a field or a unique nonempty tuple. Color is optional,
categorical, and constant within each series. `layout` defaults to overlay; stack/fill/diverging require
one value field, baseline 0 and aligned unique group×position rows. Center also requires vertical nonnegative
values. Missing defaults to error; `missing:"break"` closes separate segments with at least two valid points.
A missing measure at one position splits every accumulated series there. NaN, infinity and missing independent
positions remain errors. No source rows or baseline fields are synthesized.

`area` accepts fill/opacity/stroke/strokeWidth/curve; opacity defaults to .2. Field color conflicts with fill.
Guides default to compatible Cartesian axes/grid and an optional categorical color legend; false skips creation.
Edit the result with range/endpoint encodings, encodeGroup, layoutSeries, editAreaMark and scale/guide actions.
See the [Area and series layout tutorial](../tutorials/area-layout.md).

### `layoutSeries`

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

### `createDensityPlot`

```js
createDensityPlot({ id?, data?, coordinate?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, valueScale?, densityScale?, color?, area?, guides? })
```

Creates a complete baseline density area from a required quantitative `field`. The default ID is `densityPlot`.
Existing KDE defaults apply: automatic bandwidth and extent, 100 steps, Gaussian kernel, unit normalization.
`groupBy` is an explicit field or `false`; omission is ungrouped. Color is optional and must use that same group field,
with a nominal/ordinal categorical scale and optional `layout: "overlay"`. Raw metadata is not copied into density profiles.
`densityChannel: "y"` places values on x; `"x"` exchanges those roles. The density scale must include zero.
`area` accepts `fill`, `opacity`, `stroke`, `strokeWidth`, and `curve`; opacity defaults to 0.2. Scalar fill conflicts
with field color, and stroke width requires a stroke. Guides default to both axes and the existing horizontal grid
in either orientation; an explicit group color enables a categorical legend. `guides: false` skips guide creation.
Use `editDensity`, `editAreaMark`, and scale/guide editors for revisions. Category placement and orientation edits
are outside this facade. This action is available from `ggaction` and is absent from `ggaction/basic`.

See the [complete density workflow](../tutorials/density-area.md#complete-density-facade).

Both value and density grid directions follow continuous scales and reject explicit `bandPosition`.

### `createPiePlot`

```javascript
createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, radius?, arc?, guides? })
```

Create one sector per category in the full package. `category` is required and
defaults to nominal count, including numeric categories. For weights, provide
`value`; this infers `aggregate: "sum"`. Values must be finite and nonnegative with
a positive total. Color defaults to the category. Use `color: false` for a
scalar `arc.fill`; otherwise each slice must resolve to one categorical color.

Optional `radius` independently maps each slice's outer radius while preserving
proportional angles. Use a field string for one consistent value per category,
or `{ field: "amount", aggregate: "sum", scale: { type: "sqrt" } }` to sum
radius values per category. `{ aggregate: "count" }` counts rows without a field.
Domains use the final category measures. New non-log radius scales default to
`zero: true`; explicit scale settings override that default and existing scales
retain their policy. Every mapped outer radius must exceed the inner radius.
Value/share labels continue to describe angular values. Use `encodeR` to edit
the radius; equal-angle rose/radial-bar mappings are separate chart types.

`arc.innerRadius` is a radius ratio in [0,1) or `{ unit: "px", value }` for a non-negative fixed inner radius smaller than the outer radius; `arc.padAngle` is in degrees.
Use these options for a donut. `guides` defaults to a color legend with no axes
or grid; `guides: false` skips guide creation. Explicit axes/grid requests must
be false. A zero-weight category may remain in the color legend without a sector.
The default id is `piePlot`. Edit with `editArcMark`, theta/color encodings,
scales and legend actions. [Pie and donut tutorial](../tutorials/polar-arcs.md#complete-pie-and-donut-plots)

### `createRosePlot`

```javascript
createRosePlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose sector area, excluding the hole is proportional to category count or sum. Category is required; omit value for count or provide value to infer aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `rosePlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit the resolved Polar frame. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)

### `createRadialBarPlot`

```javascript
createRadialBarPlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose radial length measured from the inner edge is proportional to category count or sum. Category is required; omit value for count or provide value to infer aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `radialBarPlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit the resolved Polar frame. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)

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
filterData({ id, source?, field, oneOf | noneOf | predicate | range, nulls? })
```

Create an immutable named derived dataset using exactly one membership,
comparison, or range filter. The source defaults to current data.
[Data](../api/data.md)

### `createSortedData`

```javascript
createSortedData({ id, source?, sortBy })
```

Create immutable rows in stable multi-key order. Each key controls direction,
null placement, and quantitative, categorical, or temporal comparison.
[Source and derived data](../api/data/source-and-derived.md#create-sorted-data)

### `filterMarks`

```javascript
filterMarks({ target?, mode?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar. Repeated
filters are idempotent when equal and use explicit `replace` or `compose` mode
when different. Automatic histogram position domains fit the surviving bins'
outer edges without rebinning, preserving interior gaps and other scale consumers'
ranges. Inferred guides follow that domain; explicit domains and zero inclusion
remain in effect. Empty results preserve the preceding scale domains.
An explicit Raincloud parent ID selects raw observations by `field` at item grain
and recomputes all enabled components. It accepts comparisons, sets, ranges, and
grouped ranks; rendered channel/property selectors still require a child ID.
Raincloud source filters retain the nonempty input requirements of their enabled
statistical components; named-child empty filters remain supported.
[Data](../api/data.md)

### `removeMarkFilter`

```javascript
removeMarkFilter({ target? })
```

Restore a filtered mark to its canonical source, recover its prior Histogram bin
policy, and retain any filtered dataset snapshot that still has downstream users.
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
  id, source?, x, y, groupBy?, method?, degree?, span?, robustIterations?,
  confidenceMethod?, level?, confidence?, interval?, predict?, missing?
})
```

Create immutable linear, polynomial, LOESS, or exponential fitted rows at observed unique x
values. Linear and polynomial fits support normal or Student-t mean or prediction bounds;
LOESS is line-only. Optional `robustIterations` (integer `0..32`, default `0`)
adds residual reweighting; see [regression](../api/regression.md) for the estimator policy.
[Data](../api/data.md)

### `createRegressionStatisticsData`

```javascript
createRegressionStatisticsData({ id, source })
```

Create observation counts, intercepts, slopes, and R-squared from an explicit existing linear fit.
Grouped fits retain their original grouping field and typed first-seen group order.
Constant responses produce `rSquared: null`.
[Linear fit statistics](../api/data/statistical-transforms.md#fit-statistics)

### `editRegressionStatisticsData`

```javascript
editRegressionStatisticsData({ target?, source? })
```

Revise a standalone statistics owner's linear fit source and replay its consumers atomically.
Omitted source preserves the current fit. Target omission requires a current or unique statistics owner.
[Linear fit statistics](../api/data/statistical-transforms.md#fit-statistics)

### `createDensityData`

```javascript
createDensityData({
  id, source?, field, groupBy?, bandwidth?, extent?, steps?,
  kernel?, normalization?, weight?, missing?, as?
})
```

Create immutable KDE rows on one shared inclusive sample grid. Source defaults
to current data, steps to `100`, bandwidth to an automatic Scott-rule estimate,
kernel to `"gaussian"`, and normalization to `"unit"`.
[Data](../api/data.md)

### `createIntervalData`

```javascript
createIntervalData({
  id, source?, field, groupBy?, center?, extent?, method?, level?, missing?, as?
})
```

Create immutable grouped center/lower/upper summary rows. Mean supports
standard error, sample standard deviation, and normal, Student-t or explicitly seeded
percentile-bootstrap confidence intervals;
median supports interquartile range. [Data](../api/data.md)

### `createECDFData`

```javascript
createECDFData({ id, source?, field, groupBy?, weight?, missing?, as? })
```

Create immutable sorted support, cumulative count or weight, and probability
rows. Ties are aggregated, group order follows first source appearance, and
resolved provenance stores every positive denominator. [Data](../api/data.md)

### `createTimeUnitData`

```javascript
createTimeUnitData({ id, source?, field, temporalUnit?, unit, as?, timeZone?, weekStartsOn?, weekRule? })
```

Create an immutable row-preserving dataset with one UTC or IANA-zone calendar
bucket timestamp, including week, or a nominal local weekday field.
Omit `as` to use `${field}_${unit}`; output-name collisions are rejected.
[Time-unit data transforms](../api/data/time-units.md)

### `createWindowData`

```javascript
createWindowData({ id, source?, partitionBy?, sortBy?, operations, temporalUnit? })
```

Create an immutable derived dataset by applying ordered row-number, rank,
dense-rank, cumulative-sum, lag, lead, moving-mean, or moving-sum operations
within optional partitions. Moving frames support row counts or closed elapsed
durations, `minPeriods`, and explicit nullish skipping. The calculation follows
a stable sort while the output preserves source row order.
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
  target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?,
  dependents?
})
```

Partially revise the current or unique logical 2D-bin owner. Omitted top-level
transform options are preserved; successful edits create an immutable revision,
rebind direct visual consumers, and safely release the prior revision.
[Rectangular 2D bins](../api/data/bin2d.md#editbin2ddata)

### Focused core data editing

```javascript
editDerivedData({ target, definition, dependents? })
editFilteredData({ target, field?, oneOf? | noneOf? | predicate? | range?, nulls?, dependents? })
editSortedData({ target, sortBy, dependents? })
editTimeUnitData({ target, field?, unit?, as?, temporalUnit?, timeZone?, weekStartsOn?, weekRule?, dependents? })
editWindowData({ target, partitionBy?, sortBy?, operations?, temporalUnit?, dependents? })
editDensityData({ target, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, weight?, dependents? })
editRegressionData({ target, x?, y?, groupBy?, method?, degree?, span?, robustIterations?, confidenceMethod?, level?, interval?, dependents? })
```

Revise a standalone derived-data owner without rebuilding its consumers. New
focused editors require an explicit logical owner or current snapshot. Omitted
transform options remain unchanged. The generic form requires a complete
requested transform of the same type and does not accept `id`, `source`,
`current`, or resolved materializer output.

`dependents` defaults to `"reject"`. Set it to `"recompute"` to revise every
reachable derived dataset in dependency order. The operation is atomic: an
invalid downstream field, scale, mark, guide, label, or selection preserves the
entire input program. Output names are carried only across unambiguous direct
semantic roles; expressions and predicates are never rewritten as strings.
[Editing derived data](../api/data/source-and-derived.md#editing-derived-data)

### Focused statistical data editing

```javascript
editComputedData({ target, as?, expression?, dependents? })
editLookupData({ target, field?, lookup?, dependents? })
editFlattenData({ target, fields?, as?, dependents? })
editFoldData({ target, fields?, as?, dependents? })
editSummaryData({ target, groupBy?, aggregates?, members?, weight?, dependents? })
editBinData({ target, field?, maxBins? | step? | boundaries?, extent?, nice?, zero?, includeEmpty?, members?, as?, weight?, dependents? })
editStackData({ target, category?, group?, value?, mode?, as?, dependents? })
editIntervalData({ target, field?, groupBy?, center?, extent?, method?, level?, as?, dependents? })
editECDFData({ target, field?, groupBy?, weight?, missing?, as?, dependents? })
editNormalizedData({ target, field?, as?, groupBy?, method?, variance?, zeroDenominator?, baseline?, sortBy?, dependents? })
editCompleteData({ target, key?, groupBy?, values? | sequence?, fill?, members?, dependents? })
editImputedData({ target, fields?, groupBy?, sortBy?, method?, value?, edges?, maxGap?, dependents? })
```

Use a focused editor for a partial change to the corresponding standalone data
transform. Arrays, expressions, aggregate lists, and output maps replace the
whole current value. A patch must contain at least one transform option.
`undefined` and `null` do not delete options. `weight: false` removes an existing
weight only from the editors that expose weight. Mode changes remove keys that
belong only to the previous mode before validating the final definition.
[Editing derived data](../api/data/source-and-derived.md#editing-derived-data)

### `createPointMark`

```javascript
createPointMark({ clip?, id?, data?, missing?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a point mark using fourteen named shapes or polygons with area/radius normalization.
`stroke: false` disables the outline and its width at creation. [Marks](../api/marks.md)

### `editPointMark`

```javascript
editPointMark({ clip?, target?, missing?, shape?, fill?, opacity?, stroke?, strokeWidth? })
```

Change constant point shape, fill, opacity, or outline appearance and rematerialize its concrete items.
`stroke: false` disables the outline and its width. [Marks](../api/marks.md)

### `createTickMark`

```javascript
createTickMark({ clip?, id?, data?, length?, stroke?, strokeWidth?, opacity? } = {})
```

Create a centered line glyph that materializes after both x and y are complete.
Length defaults to `14`; stroke width defaults to `2`. [Marks](../api/marks.md)

### `editTickMark`

```javascript
editTickMark({ clip?, target?, length?, stroke?, strokeWidth?, opacity? })
```

Partially edit Tick length or constant line appearance while preserving data,
position, and other assignments. [Marks](../api/marks.md)

### `jitterPoints`

```javascript
jitterPoints({ target?, channel, maxOffset, seed?, key? })
```

Assign deterministic bounded graphical jitter to one Cartesian point mark with
`channel: "x"`, `"y"`, or `"both"`. Both axes use independent offsets. Use
exactly one of `maxOffset.pixels` or `maxOffset.band`; calling the action again
replaces the previous policy from the semantic base positions. [Point marks](../api/marks/point.md)

### `removeJitter`

```javascript
removeJitter({ target? } = {})
```

Remove the target point mark's jitter assignment and restore positions derived
directly from its semantic encodings. [Point marks](../api/marks/point.md)

### `packPoints`

```javascript
packPoints({ target?, channel, maxOffset?, padding?, key?, overflow? })
```

Deterministically displace Point glyphs only on a categorical x or y axis to
avoid overlap while preserving measure coordinates. The default overflow policy
fails atomically; `"overlap"` records unresolved best-effort placements.
[Point marks](../api/marks/point.md)

### `removePointPacking`

```javascript
removePointPacking({ target? } = {})
```

Remove stored point packing and rematerialize the current semantic scale
positions. [Point marks](../api/marks/point.md)

### `removeMark`

```javascript
removeMark({ target? })
```

Remove one stable mark owner and its owned state while preserving source data
and independently shared resources. [Marks](../api/marks.md)

### `createLineMark`

```javascript
createLineMark({ clip?, missing?, id?, data?, stroke?, strokeWidth?, opacity?, curve?, tension?, closed? } = {})
```

Create a semantic line mark and empty path collection. Curve defaults to
`"linear"`; explicit curve and `strokeWidth` values are retained during
rematerialization. A compatible layered source can provide data, positions,
shared scales, and a grain-preserving aggregate such as `mean`; bar-only bin,
stack, and offset policies are not inherited. `closed: true` closes each Polar
series as a radar path.
For direct Cartesian quantitative/temporal positions, opt-in `missing: "break"`
preserves null/absent observations as independent valid runs. The default remains
strict. Each run is a path and selection item; curves restart at each gap.
[Marks](../api/marks.md)

### `editLineMark`

```javascript
editLineMark({ clip?, missing?, target?, stroke?, strokeWidth?, opacity?, curve?, tension?, closed? })
```

Edit line appearance or its explicit missing-coordinate policy and rematerialize
concrete path commands without changing field encodings. [Marks](../api/marks.md)

### `createBarMark`

```javascript
createBarMark({ clip?, id?, data?, orientation?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic bar mark and empty rect collection.
`stroke: false` disables the outline and its width at creation. [Marks](../api/marks.md)

Global `cornerRadius` and per-corner `cornerRadiusTopLeft`, `cornerRadiusTopRight`,
`cornerRadiusBottomRight`, and `cornerRadiusBottomLeft` use non-negative logical pixels.
Each corner override wins over the global fallback and clamps to half the smaller item side.
Omitted corners fall back to the global radius or zero; edits retain unspecified overrides.

### `editBarMark`

```javascript
editBarMark({ clip?, target?, blend?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit whole-bar appearance and rematerialize every concrete rectangle.
Use `blend: "difference"` to composite each bar fill and outline once over earlier
content; `blend: "normal"` restores ordinary painting. Omission preserves the current mode.
`stroke: false` removes the visible outline; constant fill conflicts with a
field-driven color encoding. [Marks](../api/marks.md)


Cardinal line `tension` is a finite number from 0 to 1 (default 0); it scales tangents by `1-tension`.
The line facade forwards `line.tension`; changing to another curve clears the previous setting.
Global `cornerRadius` and per-corner `cornerRadiusTopLeft`, `cornerRadiusTopRight`,
`cornerRadiusBottomRight`, and `cornerRadiusBottomLeft` use non-negative logical pixels.
Each corner override wins over the global fallback and clamps to half the smaller item side.
Omitted corners fall back to the global radius or zero; edits retain unspecified overrides.

### `createAreaMark`

```javascript
createAreaMark({ clip?, id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? } = {})
```

Create a semantic area mark and empty path collection. Fixed fill defaults to
`"#4c78a8"`; opacity defaults to `0.2`. Optional outlines default to width `1`.
Curve defaults to `"linear"` and accepts the shared eight-value vocabulary.
[Marks](../api/marks.md)

Area `missing` defaults to `"error"`. `"break"` splits null/undefined measured endpoints into closed segments with at least two samples; independent positions and nonfinite values remain strict. Density/Horizon missing policies are not reinterpreted.

### `editAreaMark`

```javascript
editAreaMark({ clip?, target?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? })
```

Edit constant area appearance. `stroke: false` removes an existing outline.
[Marks](../api/marks.md)

### `createArcMark`

```javascript
createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic arc mark and empty closed-path collection. Direct
quantitative theta, category counts, or category-weighted sums materialize
proportional pie or donut sectors; categorical theta plus radius materializes
radial sectors. [Marks](../api/marks/line-area.md#arc-marks)

### `editArcMark`

```javascript
editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit arc geometry or appearance and rematerialize complete sector paths.
`stroke: false` disables the outline and its width.
[Marks](../api/marks/line-area.md#arc-marks)

### `createRuleMark`

```javascript
createRuleMark({ clip?, id?, data?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})
```

Create a semantic rule mark and empty line collection. The first omitted ID is
`"rule"`; data defaults to current data. [Marks](../api/marks.md)

### `editRuleMark`

```javascript
editRuleMark({ clip?, target?, stroke?, strokeWidth?, strokeDash?, opacity? })
```

Edit constant Rule appearance through the four existing encoding owners. At least
one style is required; field appearance conflicts with scalar editing. Creation
accepts the same styles. [Rule marks](../api/marks/rule.md)

### `createRectMark`

```javascript
createRectMark({ clip?, id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})
```

Create a semantic rect mark and empty rect collection. Two discrete x/y bands
or complete x/x2 and y/y2 endpoint pairs materialize observed cells. Rects do
not infer bar aggregation, baseline, stack, or width semantics.
[Rect marks](../api/marks/rect.md)

Global `cornerRadius` and per-corner `cornerRadiusTopLeft`, `cornerRadiusTopRight`,
`cornerRadiusBottomRight`, and `cornerRadiusBottomLeft` use non-negative logical pixels.
Each corner override wins over the global fallback and clamps to half the smaller item side.
Omitted corners fall back to the global radius or zero; edits retain unspecified overrides.

### `editRectMark`

```javascript
editRectMark({ clip?, target?, fill?, opacity?, stroke?, strokeWidth? })
```

Edit rect appearance and rematerialize complete cells. Constant fill conflicts
with field-driven color. `stroke: false` disables the outline.
[Rect marks](../api/marks/rect.md)

Global `cornerRadius` and per-corner `cornerRadiusTopLeft`, `cornerRadiusTopRight`,
`cornerRadiusBottomRight`, and `cornerRadiusBottomLeft` use non-negative logical pixels.
Each corner override wins over the global fallback and clamps to half the smaller item side.
Omitted corners fall back to the global radius or zero; edits retain unspecified overrides.

### `createOverlay`

```javascript
createOverlay({ id?, source?, type?, basis?, series?, missing?, orderBy?, line?, point? } = {})
```

Add a line or point layer that follows a source mark's visible results. Bar overlays connect actual bar endpoints after aggregation, binning, grouping or stacking. `type` defaults to `line`; `series` defaults to `source`. Use `series: "total"` for the outer endpoints of stacked bars. Connecting a scatterplot requires `orderBy: "x"` or `"y"`. Appearance remains independently editable through ordinary encoding and mark actions. Inherited source colors stop following when the overlay receives an explicit color assignment.

### `editOverlay`

```javascript
editOverlay({ target?, source?, series?, missing?, orderBy?, follow? })
```

Change an overlay's dependency or gap policy. `follow: false` freezes current result geometry as an independent, normalized plot snapshot; it cannot be combined with other edits. Edit the source to change a following overlay's positions. Ordinary mark and encoding actions change its appearance.

### `createStatisticalReference`

```javascript
createStatisticalReference({ id?, source, axis, population?, field?, groupBy?, statistic?, statistics?, ...style })
```

Create a statistical line or interval through one public action. `source` is the source mark ID and `axis` is `"x"` or `"y"`.
Omit the statistic keys for a mean line, supply `statistic: { op: "median" }` for another single statistic, or an exact
`statistics` pair for a band. The keys are mutually exclusive and use the existing `ReferenceStatistic` vocabulary.
Quantiles 0.25–0.75 show the central 50%; 0.025–0.975 show the central 95% of data, rather than a confidence interval.
Set `groupBy` to one source field name for a separate result per observed group on either axis, even if that field is not encoded.
Groups retain source order. Visible marks must have a single value of that grouping field; otherwise use `boundData`.
For a distribution's measurement axis, `boundData` uses original observations from density, ECDF, computed
box-summary, and gradient provenance. It preserves repeated observations and source groups instead of averaging
rendering samples. Precomputed summaries keep their supplied data. Grouped aggregate line statistics can use
singleton partitions without changing the source line.
Summarized Dot, Lollipop, and Dumbbell endpoints also follow their original measurement roles.
Horizon accepts quantitative X statistics from source observations; folded Y and temporal X are not numeric statistic axes.
The owned output records the key in `group` beside `value` or `lower`/`upper`. Omitting `groupBy` preserves one overall result.
The default ID is `statisticalReference`; use explicit IDs for additional references. Lines default to `#222222`,
width `2.5`, solid stroke; bands to `#6b7280`, opacity `0.18`, no stroke. Use native Rule styles for lines and Rect styles for bands.
When `groupBy` matches the source Color field without a color aggregate, omitted `stroke` shares that Color scale:
each group's line matches its source marks, and palette edits update both. An explicit `stroke` overrides this default.
Reference groups contribute to the shared appearance domain even when a mark filter hides that group.
Statistical values do not expand positional domains, and distribution-role edits refresh existing references.
This full-only action wraps `createReferenceLine` or `createReferenceBand` and retains their statistical binding,
replay, editing, facet and removal behavior. Literal reference coordinates are not accepted.
[Statistical references](../api/marks/rule.md#statistical-reference-action)

### `createReferenceLine`

```javascript
createReferenceLine({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, stroke?, strokeWidth?, strokeDash?, opacity? })
```

Create one constant Rule spanning the other plot axis. Exactly one `x` or `y` is required.
Data space is the default: `source` resolves explicit, current eligible, then unique eligible Cartesian layer.
It supplies data, coordinate, scale, field type, and temporal input unit. Source-owned Text aliases are excluded from source inference. Strings are literal values.
Reference constants participate in automatic domains; explicit domains preserve the requested extent.
`temporalUnit` may override the source unit. `data` and `coordinate` are plot-space options only.

With `space: "plot"`, the value must be a finite fraction in `[0,1]`: x runs left to right and y bottom to top.
Existing `data` is explicit or inferred; empty data is supported. `coordinate` follows Cartesian encoding inference.
Plot space rejects `source` and `temporalUnit`. A named `<id>-<axis>` linear scale has domain `[0,1]` and automatic range.
An equivalent scale is reused; a conflicting definition fails. Named scales remain after mark removal.

The default ID is `referenceLine`; a second line needs an explicit ID. Defaults: stroke `#64748b`, width `1`,
dash `"dashed"`, opacity `1`. Lower `encodeX/Y`, `editRuleMark`, `editScale`, and `removeMark` own later changes.
Source binding is selected at creation, so rebinding or removing the source does not rebind or remove the reference.
The shared scale still drives both marks. Add text with `createMarkLabels({ source: id, value: "Target" })`.
[Reference marks](../api/marks/rule.md#reference-lines-and-bands)

### `createReferenceBand`

```javascript
createReferenceBand({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, fill?, opacity?, stroke?, strokeWidth? })
```

Create a constant reference band. Exactly one `x: [lower, upper]` or `y: [lower, upper]`
is required. Reversed endpoints produce positive bounds; equal endpoints produce no rectangle.
It uses the same data/plot binding rules as `createReferenceLine`, but data-space bands require quantitative
or temporal source positions. Plot endpoints must both be finite fractions in `[0,1]`.
The default ID is `referenceBand`, fill `#94a3b8`, opacity `0.15`, and stroke `false`.
To set `strokeWidth`, also provide a stroke color. Positions, appearance, scale, and removal remain editable through
`encodeX/Y/X2/Y2`, `editRectMark`, `editScale`, and `removeMark`. No extra dataset is created, and no `editReferenceBand`
is needed. Both reference facades are available in the full entry point.
[Reference marks](../api/marks/rule.md#reference-lines-and-bands)

### `createMarkLabels`

```javascript
createMarkLabels({ clip?, id?, source?, field?, value?, content?, normalizeBy?, format?, inheritColor?, lineHeight?, blockAlign?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout?, placement?, select?, selection? } = {})
```

Label source mark items. The default content is the source's semantic value;
Point/Line/Rule/Rect require a field or constant. A Line creates one label per
series at its final path coordinate. The default ID is `<source>-labels`.
Omit `select` and `selection` to label every final item. Pass `select: MarkSelector`
for an inline predicate or `selection: id` for a live stored selection on the same
source. Empty matches are valid, and selected labels keep source item order.
Semantic content is computed before membership filtering, so a selected share label
keeps its percentage of the complete source.
`placement` applies the semantic boundary policy described below during creation.
[Text marks](../api/marks/text.md)

### `editMarkLabelSelection`

```javascript
editMarkLabelSelection({ target, select })
editMarkLabelSelection({ target, selection })
editMarkLabelSelection({ target, all: true })
```

Replace one attached label layer's final-item membership. Exactly one replacement
branch is required and `target` is never inferred. Inline selectors reuse
`MarkSelector`; named selections must target the same source mark. Selection edits
replay named labels, while selection removal is rejected until dependent labels are
rebound with this action or removed.
[Text marks](../api/marks/text.md#editmarklabelselectionoptions)

### `editMarkLabelPlacement`

```javascript
editMarkLabelPlacement({ target, placement: { anchor, gap?, overflow?, leader? } })
editMarkLabelPlacement({ target, placement: "auto" })
```

Replace semantic placement for one attached label layer. `anchor` is `center`,
`insideStart`, `insideEnd`, `outsideStart`, or `outsideEnd`; `gap` defaults to 4 pixels.
For inside anchors, `overflow` defaults to `hide`, can retry once outside with `outside`,
or can retain an overlong label with `allow`. Optional owned leaders connect the source
boundary to the final text box and replay after collision layout. Bar, directed Rect,
Arc, Cartesian Point, and Polar Point sources are supported. Line keeps endpoint layout,
Rule is rejected, and conflicting placement/collision leaders fail atomically.
Arc outside-start labels hide instead of crossing the Polar center unless `overflow: "allow"`
is explicit.
Pass `"auto"` to restore the legacy source anchor and remove the owned placement leader.
[Text marks](../api/marks/text.md#editmarklabelplacementoptions)

### `removeMarkLabels`

```javascript
removeMarkLabels({ target })
removeMarkLabels({ source })
```

Remove one attached label layer by ID, or every attached label owned by a source
mark. Exactly one selector is required. The source mark, its selections, and
unrelated labels remain. Label layout policies, generated leaders, and interaction
state attached to removed labels are cleaned up, so later source, scale, Canvas,
and theme edits do not recreate them. Independent Text and annotations continue
to use `removeMark`.
[Text marks](../api/marks/text.md#removemarklabelsoptions)

### `createAnnotation`

```javascript
createAnnotation({ clip?, id?, text, anchor?, format?, source?, x?, y?, space?, data?, coordinate?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? })
```

Create anchored text. Omit x/y/space for a
final-item mark anchor; `source` selects the mark, otherwise current/unique mark
inference applies. Provide both x and y for a data anchor; `source` selects one
complete Cartesian layer whose data, coordinate, scales, field types, and temporal
units are reused. The annotation participates in automatic domains without becoming
a source-owned label.

With `space: "plot"`, x and y are finite fractions in `[0,1]`, where x=0 is left
and y=0 is bottom. Existing `data` is explicit or inferred, and `coordinate` is
optional. Plot anchors reject `source` and use ordinary `<id>-x`/`<id>-y` linear
scales with domain `[0,1]`. The default ID is `annotation`.

`anchor: "plot-center"` supplies plot x/y=0.5, horizontal center alignment, and
middle baseline together. It rejects `x`, `y`, `space`, `source`, `align`, and
`baseline`; optional data, coordinate, styles, and offsets follow the plot branch.
The anchor follows plot bounds on Canvas and margin changes. Plot-anchored notes
can accompany polar and parallel-coordinate charts, including facets. Keep the
note in its Cartesian plot frame by omitting the chart's polar/parallel coordinate.

Omit `layout` or pass `false` to retain the exact anchor. A layout object accepts
`layoutLabels` options except `target`. Later changes use `encodeText`, `encodeX/Y`,
`editTextMark`, `layoutLabels`, `removeLabelLayout`, `editScale`, and `removeMark`.
[Text marks](../api/marks/text.md#createannotationoptions)

### `createTextMark`

```javascript
createTextMark({ clip?, id?, data?, source?, text?, inheritColor?, lineHeight?, blockAlign?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})
```

Create a semantic text layer. Omitted data and position attach to the current
or unique compatible point, bar, line, rect, rule, or arc layer. Line text anchors
at each series' final path coordinate; Arc text anchors at
sector centers. `text` is constant-content shorthand. Source-owned text follows final source positions and never
contributes independent scale-domain values. Source field or scale changes also drive its labels and guides.
Direct `encodeX/Y` on attached Text is rejected: edit the source, use `editTextMark({ dx, dy })`, or create
independent Text with explicit `data` to author its positions. Independent Text accepts field or datum positions;
all-constant x/y/text produces one item, while any field-bound encoding uses row grain.
Row-backed text supports `encodeColor`; explicit fill conflicts with that encoding.
Attached labels accept `inheritColor: "fill" | "stroke" | false` to follow source appearance.
Explicit fill overrides inheritance. Inheritance adds no color scale or duplicate legend.
`rotation` accepts a finite legacy number in radians or an explicit
`{ value, unit: "degrees" | "radians" }` object; both normalize to concrete
radians. `createMarkLabels`, `createAnnotation`, and `editTextMark` share this
input contract. Newlines split text into resolved lines; `lineHeight` sets pixel spacing
(default `1.2 * fontSize`). `blockAlign: "first"` anchors the first line; `"middle"`
centers the entire block vertically. Empty internal lines are retained.
[Text marks](../api/marks/text.md)

### `editTextMark`

```javascript
editTextMark({ clip?, target?, inheritColor?, lineHeight?, blockAlign?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })
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
| `encodeX` | point, line, area, bar, rect, rule, tick, text | point/line/area/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or bin |
| `encodeY` | point, line, area, bar, rect, rule, tick, text | point/line/area/bar/rect/rule/tick/text: quantitative, temporal, ordinal, nominal | field; rule, area, rect, and independent text also accept datum; bar accepts aggregate or count |
| `encodeX2` / `encodeY2` | area, ranged bar, rect, rule | area/ranged bar/rect/rule: matching primary | secondary field; rule, area, and rect also accept datum |
| `encodeTheta` | point, line, arc | point/line: quantitative, temporal, ordinal, nominal; arc: quantitative, ordinal, nominal | arc maps direct quantitative values, category counts, or category-weighted sums to proportional sectors |
| `encodeR` | point, line, arc | point/line/arc: quantitative | radial position; arc combines it with a categorical theta band |
| `encodeParallelCoordinates` | line | line: quantitative, ordinal | atomic ordered dimensions; one namespaced scale and axis per dimension |
| `encodeDx` / `encodeDy` | text | text: quantitative | independent Text only; finite field or constant logical-pixel offsets, no scale or guide; field offsets establish row grain |

<!-- action-capabilities:position:end -->

Temporal input branches accept `temporalUnit: "auto" | "year" | "timestamp"`.
Timestamp means Unix milliseconds; year means UTC January 1. Omission preserves
the existing parser. Same-binding reassignment retains an explicit unit; a new
binding clears it. Domains and tick values are already normalized timestamps.
[Temporal input](../api/position/temporal.md)

### `encodeChannels`

```javascript
encodeChannels({
  target,
  channels: {
    x?, y?, x2?, y2?, theta?, r?, xOffset?, yOffset?,
    group?, pathOrder?, color?, stroke?, size?, shape?, opacity?,
    strokeWidth?, strokeDash?, angle?, text?
  }
})
```

Atomically replace one or more encodings on one explicit mark. Each channel
uses the same options and validation as its focused `encode*` action, without a
nested `target`, `coordinate`, or `id`; a nested `scale.id` remains valid. The
request must contain at least one of the 19 listed keys. Omitted channels are
preserved, and `null` does not remove an encoding.

The action validates one final channel and scale state, then resolves affected
scales and rematerializes each target, shared-scale consumer, dependent mark,
and legend once. Channel object insertion order cannot change the result or
trace order. Conflicting explicit properties for a shared scale ID fail before
the original program changes. Rebound Cartesian axes keep their style and title;
coupled default ticks and labels switch between categorical domain values and
continuous count mode when the final scale family changes. Incompatible explicit
guide values or a continuous-only grid make the whole request fail atomically.
This advanced authoring action is available only
from `ggaction`; use the focused encoding actions from `ggaction/basic`.

### `encodeX`

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
[Position encodings](../api/position-encodings.md)

### `encodeY`

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
[Position encodings](../api/position-encodings.md)

### `encodeY2`

```javascript
encodeY2({ field, target?, fieldType, scale?, coordinate? })
encodeY2({ datum, target?, fieldType?, scale?, coordinate? }) // rule
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary y endpoint.
It requires an existing y and shares its scale and coordinate.
A rule numeric datum defaults to `fieldType: "quantitative"` and must be finite.
Rule field endpoints and nonnumeric datum endpoints require an explicit matching type.
[Position encodings](../api/position-encodings.md)

### `encodeX2`

```javascript
encodeX2({ field, target?, fieldType, scale?, coordinate? })
encodeX2({ datum, target?, fieldType?, scale?, coordinate? })
```

Assign an area, ranged-bar, or rect upper edge, or a rule secondary x endpoint.
It requires an existing x and shares its scale and coordinate.
A rule numeric datum defaults to `fieldType: "quantitative"` and must be finite.
Rule field endpoints and nonnumeric datum endpoints require an explicit matching type.
[Position encodings](../api/position-encodings.md)

### `encodeYRange`

```javascript
encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeY` and `encodeY2`. Area bounds accept field strings or `{ datum: number }`, with at least one field. Final endpoints and scale are validated together.
[Encodings](../api/encodings.md)

### `encodeXRange`

```javascript
encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })
```

Atomically compose area or ranged-bar `encodeX` and `encodeX2`. Area bounds accept field strings or `{ datum: number }`, with at least one field.
[Encodings](../api/encodings.md)

### `encodeGroup`

```javascript
encodeGroup({ field, target?, fieldType? })
encodeGroup({ fields: [first, ...rest], target?, fieldType? })
```

Split Line or ordinary Area paths by one nominal field or a non-empty unique tuple.
Explicit groups alone define identity; each appearance field must have one raw
value within each series. Single-element tuples normalize to the scalar field form.
Without explicit Line groups, color and dash retain their shared-field grouping.
Statistical and stacked-layout groups remain owned by their existing actions.
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

### `orderCategories`

```javascript
orderCategories({ target?, channel, values })
orderCategories({ target?, channel, by, direction? })
```

Assign explicit or computed semantic order to a nominal/ordinal Cartesian x/y or
Polar theta position. Omitted explicit values and computed ties preserve source
first-appearance order. The scale, connected marks, axis, and selection-item
order are updated together. [Category ordering](../api/position/category-ordering.md)

### `removeCategoryOrder`

```javascript
removeCategoryOrder({ target?, channel })
```

Remove one active category-order assignment and restore automatic
first-appearance order. [Category ordering](../api/position/category-ordering.md)

### `removeEncoding`

```javascript
removeEncoding({ target?, channel })
```

Remove one active semantic encoding, its generated companions, matching guide
blocks, and stale concrete values. Named datasets, scales, and coordinates are
retained; incomplete marks remain empty until later encoding completion.
[Encodings](../api/encodings.md#removing-an-encoding)

### `encodeAngle`

```javascript
encodeAngle({ target?, value })
encodeAngle({ target?, field, fieldType? })
```

Rotate point or Tick glyphs with direct clockwise degrees: `0` points up and
no scale or legend is created. Reassignment replaces the prior constant/field
branch; remove it with `removeEncoding({ channel: "angle" })`.
[Encodings](../api/encodings.md#direction)

### `encodeText`

```javascript
encodeText({ target?, field?, value?, format? })
```

Assign exactly one field, constant value, or semantic content to a text mark.
`format` accepts `"auto"`, `.0`–`.12` precision with `f`, `%`, or `e`, or a UTC
pattern composed from `%Y`, `%m`, `%d`, `%b`, `%%`, and literals. Reassignment
replaces the previous content branch. [Text marks](../api/marks/text.md)

### `encodeDx`

```javascript
encodeDx({ target?, field })
encodeDx({ target?, value })
```

Move each independent Text glyph horizontally by finite signed logical pixels.
Choose exactly one numeric field or constant; no scale is created. The encoding
overrides the mark's constant dx. Removing it restores that constant. Field-bound
offsets participate in row grain and the Text missing-row policy. Full only;
source-owned labels and other marks are rejected.
[Text offsets](../api/marks/text.md#numeric-pixel-offsets)

### `encodeDy`

```javascript
encodeDy({ target?, field })
encodeDy({ target?, value })
```

The corresponding independent Text vertical offset; positive values move down.
It preserves dx and follows the same field/constant, removal, row-grain and atomic
validation rules. Set both through existing `encodeChannels({target,channels})`.
[Text offsets](../api/marks/text.md#numeric-pixel-offsets)

### `encodeXOffset`

```javascript
encodeXOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update a categorical sub-slot scale within a bar, point, or
rule x category. Point/rule marks use slot centers; bars use slot bandwidth.
Padding defaults to zero and is preserved on a later same-field call. Grouped
bar color layout normally invokes this action automatically.
[Position encodings](../api/position-encodings.md)

### `encodeYOffset`

```javascript
encodeYOffset({
  field, target?, fieldType?, scale?, paddingInner?, paddingOuter?
})
```

Create or compatibly update the corresponding categorical offset scale within
a bar, point, or rule y category. Horizontal grouped bar color invokes this
action as a wrapped child; explicit domain order, reversed range, and padding
follow the same contract as `encodeXOffset`.
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

Creation `groupBy:false` explicitly requests ungrouped Regression, Density or
Horizon and survives JSON serialization. Editors preserve omission, reject
explicit undefined and clear with false. Data-only transform groupBy options
remain unchanged.

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
| Categorical | point, line, area, bar, rect, arc, text | point/line/area/bar/rect/arc/text: nominal, ordinal | bar/area layout; arc overlay; palette and ordinal scale; explicit-domain row-owned Cartesian line color supports unknown paint |
| Continuous | point, aggregate bar, rect, text, area, tick | point/rect/text/tick: quantitative, temporal; aggregate bar/area: quantitative | sequential scale; aggregate required for a different bar measure; area requires one finite value per existing series; tick paints its centered segment and rejects simultaneous stroke |
| Discretized continuous | point, aggregate bar, rect, text, area, tick | point/aggregate bar/rect/text/area/tick: quantitative | quantize, quantile, or threshold scale; area requires one finite value per existing series; tick maps colors per row |

<!-- action-capabilities:color:end -->

```javascript
encodeColor({ field, target?, fieldType?, palette?, layout?, aggregate?, scale? })
```

Create or compatibly replace point fill, line-series color, grouped area fill,
bar color, rect fill, or arc-sector fill. Nominal and ordinal categories share an ordinal palette scale;
ordinal fields may contain ordered numeric categories. Categorical bar layout accepts `stack`, `fill`, `group`, `overlay`,
and `diverging`; area also accepts `center` and rejects only `group` from the
shared layout vocabulary. Quantitative and temporal
point fields use a sequential scale; quantitative fields also accept log/sqrt/symlog
with matching gradient legends. Square-root color normalizes sign-preserving square roots across the original
numeric domain; negative, zero-crossing, and reversed domains are supported. Its exponent is fixed,
and `base`, `constant`, and numeric `midpoint` are rejected. Sampled symbol legends use the same mapping.
Quantitative Point, aggregate Bar, and Rect fields also accept
`quantize`, `quantile`, and `threshold` color classes. Categorical
grouped bars record `encodeXOffset` or `encodeYOffset` as a child according to
orientation. Reassigning grouped color also atomically reassigns its offset and
rematerializes an existing legend. Aggregate
bars accept quantitative sequential or discretized color: a matching measure field inherits
its aggregate, while a different field requires `aggregate`.
Area `layout: "center"` creates a matching nominal group when needed and records
wrapped `encodeY({ stack: "center" })`. It requires non-negative values aligned
at every x position and stacks each partition from `-total / 2`.
Area also accepts quantitative continuous or discretized color with exactly one finite
value per existing series. Grouping and layout stay independent; no vertex gradients,
aggregate, temporal color, or point-only unknown fallback are supported. Use
`encodeColor` after a complete `createAreaPlot`, whose color option remains categorical.
The real color scale drives fills and legends and uses one sample per series for
automatic quantile domains. Basic does not expose Area authoring.
Tick quantitative/temporal color paints its segment, using color gradients,
intervals or samples without changing geometry. Remove the existing color or
stroke encoding before switching channels or setting constant stroke.
Categorical color, aggregate, layout and point-only unknown remain unsupported;
Basic gains no Tick authoring.

Row-owned rects accept categorical or continuous color. Arc sectors accept
categorical color with optional overlay layout, or continuous/discretized color
with one value per sector. Aggregated sectors require that value to be constant
within their category; no implicit color aggregation is invented. Gradient and
interval legends use the same scale mapping. Automatic quantile domains use one
sample per sector.
When changing a target between categorical and continuous color families, an
omitted scale ID detaches from an incompatible shared scale into a target-owned
scale. Explicit shared IDs keep strict consumer validation. Other consumers,
such as grouped regression lines, retain their original mapping.
[Series encodings](../api/series-encodings.md)

Existing field encodings in `ggaction/basic` can reassign settings on a bound
scale of the same type, updating every consumer atomically. Generic/focused
scale editors and legend editors remain Full-only; scale-type transitions use
Full or a new scale ID in Basic. [Encoding reassignment](../api/encodings.md#reassign-an-existing-encoding)

### `encodeStrokeDash`

```javascript
encodeStrokeDash(
  { field, target?, fieldType?, scale? }
  | { value, target? }
)
```

Create or replace nominal/ordinal line-series or rule dash patterns, or apply one
constant named/direct pattern. Named styles are `solid`, `dashed`, `dotted`, and
`dashdot`. Cartesian line/rule `scale.unknown` accepts the same named or direct
pattern for valid categories outside a domain; missing categories remain errors,
and domain, legend and raw series identities stay unchanged.
[Series encodings](../api/series-encodings.md)

### `encodeRadius`

```javascript
encodeRadius({ value, target? })
```

Apply a constant point radius. [Constant appearance](../api/appearance.md)

### `encodeTheta`

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
[Polar positions](../api/position-encodings.md#polar-positions)

### `encodeR`

```javascript
encodeR({ field?, aggregate?, mapping?, target?, fieldType?, scale?, coordinate? })
```

Encode a quantitative field as Polar radial distance. The default `radius`
scale fits the current plot bounds and rematerializes after Canvas edits.
Proportional arcs accept independent ordinary radius scales: quantitative theta
uses row values, while categorical count/sum theta accepts a consistent radius
per group or explicit radius count/sum. Domains use those final sector values.
Mapped outer radii must exceed the inner radius. Radius aggregation requires
categorical aggregated theta and stays pending until that encoding exists.
Measured Arc radius accepts count/sum with `mapping: "area"` or
`"radius-length"`. Reassign with `{ field, mapping: false }` to atomically
replace a measured category aggregate with ordinary row-level radial length.
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

Encode point size as area; radius-normalized polygons use reference-circle area. The automatic area range
is `[24, 196]`. Size scales support continuous `linear`, `log`, `sqrt`, and
`pow` mappings plus discrete `quantize`, `quantile`, and `threshold` mappings.
[Appearance encodings](../api/appearance.md)

### `encodeShape`

```javascript
encodeShape({ field, target?, fieldType?, scale? })
```

Encode a nominal field as fourteen named shapes or polygons with area/radius normalization.
Explicit ranges may repeat shapes; provide one entry per domain value. Automatic ranges remain distinct.
[Appearance encodings](../api/appearance.md)

### `encodeOpacity`

```javascript
encodeOpacity({ value, target? })
encodeOpacity({ field, target?, fieldType?, scale? })
```

Apply a constant point/rule/line/bar/rect opacity from `0` to `1`, or map a quantitative field
through a linear opacity scale. The two modes are mutually exclusive and may
replace each other through the same action. Lines require one raw field value per
series and support sampled opacity legends. Constant mode clears its field and
owned opacity legend and rejects fieldType/scale or selections using that channel.
[Appearance encodings](../api/appearance.md)

### `encodeStroke`

```javascript
encodeStroke({ value, target? })
encodeStroke({ field, target?, fieldType?, temporalUnit?, scale? })
```

Assign a constant non-empty stroke color or map a categorical, quantitative, or
temporal field to the outline of a Point, Line, Area, Bar, Rect, Arc, Rule, or
Tick. Line and Area values must be constant within each final series. Constant
mode clears the field binding and its own legend; field mode clears the constant
override. Text outlines are outside this action.
[Appearance encodings](../api/appearance.md)

### `encodeStrokeWidth`

```javascript
encodeStrokeWidth({ value, target? })
encodeStrokeWidth({ field, target?, fieldType?, scale? })
```

Assign a non-negative finite logical Canvas width to a Line, Rule, or Rect. Field mode
maps one quantitative value per rule/rect row or complete line series. Constant mode
clears the field and its own sampled width legend; fieldType/scale are invalid in
constant mode. Active channel selections must be removed before replacement.
[Appearance encodings](../api/appearance.md)

### `encodeBarWidth`

```javascript
encodeBarWidth({ band?, pixels?, target? })
```

Set aggregate or ranged bar width before or after its positions are complete.
Incomplete bars retain the width without creating items; histogram bins do not
accept it. The modes are mutually exclusive. The first omitted mode defaults to
`band: 0.72`; later omission retains the current mode.
When every temporal bar sharing a position scale uses pixel width, bar centers
use the full plot range. If any bar still uses band width, the shared scale keeps
its inferred half-slot inset. An explicit numeric scale range is preserved in
both cases. Switching width modes also refreshes shared marks and axis guides.
[Constant appearance](../api/appearance.md)

### `createRegression`

```javascript
createRegression({
  target?, x?, y?, groupBy?, method?, degree?, span?, robustIterations?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Infer an eligible point layer and create immutable fitted data, optional grouped
interval-band paths, and grouped line paths. Method defaults to `"linear"`;
polynomial degree to `2`; LOESS span to `0.75` and `robustIterations` to `0`.
[Regression](../api/regression.md)

### `editRegression`

```javascript
editRegression({
  target?, data?, x?, y?, groupBy?, method?, degree?, span?, robustIterations?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Revise the model through its stable point owner. Data-role or statistical
changes create and rebind one immutable derived-data revision; `groupBy: false`
removes grouping. Component-only changes retain the current fitted rows.
[Regression](../api/regression.md#editing-a-regression)

### `createErrorBar`

```javascript
createErrorBar({
  id?, target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, coordinate?,
  caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
} = {})
```

Create vertical or horizontal statistical or explicit intervals. With one
eligible encoded layer, the shortest call infers its fields, orientation, data,
coordinate, and scales. Explicit interval fields also allow the independent
position to be quantitative. A categorical source can also infer a matching
xOffset/yOffset; its field joins statistical grouping and aligns source points,
the main rule, and both caps on one shared sub-slot scale.
[Error bars](../api/error-bars.md)

### `editErrorBar`

```javascript
editErrorBar({
  target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, caps?, capSize?,
  stroke?, strokeWidth?, strokeDash?, opacity?, statistics?
})
```

Revise one error bar's source, position/interval roles, optional categorical
offset, statistics, and owned caps. Role changes can switch orientation or
convert statistical and explicit intervals while preserving owner/cap IDs.
`caps: false` removes both caps and `caps: true` restores them.
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
editErrorBand({
  target?, data?, x?, y?, groupBy?, fill?, opacity?, curve?, statistics?,
  boundaries?
})
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Constant band fill conflicts with active color. Remove that encoding first, or
use edit-only `fill: false` to clear a constant fill and restore color eligibility.

Edit the band source, position/interval roles, grouping, body, statistical
interval, or both owned boundary components without addressing generated line
IDs. Role changes may switch orientation or interval mode. `boundaries: false` disables both;
an object creates or edits both. The focused boundary action still accepts
`"both"`, `"lower"`, or `"upper"` and creates missing selected boundaries.
[Error bands](../api/error-bands.md#editing-the-band)

### `createBoxPlot`

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, color?, summary?, whisker?, width?, outliers?,
  box?, median?, outlier?, guides?
} = {})
```

Create a Box plot owner from raw observations or explicit five-field summaries.
Geometry and guides defer until compatible x/y roles are available. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../api/box-plots.md)
Guides remain opt-in for compatibility: pass `guides: {}` or nested options to
ensure compatible guides inside the facade; omission and `false` create none.
Optional `color` uses the ordinary field/fixed encoding on the body after
position completion and before guides. It cannot be combined with explicit `box.fill`.

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
  id?, target?, data?, x?, y?, coordinate?, color?, density?, width?, gradient?,
  center?, guides?
} = {})
```

Create a Gradient plot owner that defers geometry and guides until compatible
x/y roles are available. Positions can be explicit, inferred from one eligible
encoded layer, or completed later. Defaults are Gaussian auto density, 64
samples, width band `0.7`, no outline, a median center rule, and applicable
guides. A categorical `encodeColor` owns strip hue while density continues to
control lightness and opacity.
Optional `color` applies that same field/fixed encoding at creation or deferred
position completion, before guides.
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

### `editViolinPlot`

```javascript
editViolinPlot({ target?, data?, x?, y?, split?, density? })
```

Revise source, category, quantitative value, split, orientation, and density
parameters through one stable violin owner. The action creates an immutable
density revision and reconciles axes, grid, selections, and highlights. Area
appearance remains available through `editAreaMark`.
[Violin plots](../api/violin-plots.md#editing)

### `createGuides`

```javascript
createGuides({ axes?, grid?, legend? })
```

Create applicable axes, grids, and legends; omitted branches infer applicability, false skips a branch, and explicit direction objects enable only named directions: `axes:{x:false}` requests neither axis while `axes:{x:false,y:{}}` requests y.
Automatic calls preserve existing guide collections and add missing applicable
collections; explicit collection objects retain strict create semantics. Datum-only
anchors do not infer axes. An automatic call on an existing chart that has no
applicable guides succeeds without adding graphics. An explicit all-false request
or a chart without marks still fails. On facet parents this action updates the retained source
and rederives its panels while preserving the parent title and guide policy.
[Guides](../api/guides.md)

### `editAxes`

Complete axis editors accept `visible: false` to hide an axis without removing its style. Use `labels: { visible: false }`, `line: { visible: false }`, `ticks: { visible: false }` or `title: { visible: false }` for individual components. `ticksAndLabels` also accepts visibility on its `ticks` and `labels` children. Set the same flag to `true` to restore it. Flags are independent and retained through automatic guides and resizing; relative-anchor geometry stays stable.

```js
editAxes({ x?, y?, theta?, radius?, parallel? })
```

Chart-authoring action. Edit existing axes in one atomic call. Each selected option uses the corresponding `editXAxis`, `editYAxis`, `editThetaAxis`, `editRadialAxis`, or `editParallelAxis` options. Omission or `false` preserves that axis. At least one nonempty edit is required. No axes or components are created and scale/coordinate bindings are preserved. Cartesian arrays require explicit `target` IDs; parallel arrays select fields with the existing `field`/`target` options. Duplicate selections and empty arrays are rejected.

```js
// Fragment: program already contains x and y axes.
program.editAxes({
  x: { labels: { fontSize: 11 } },
  y: { ticksAndLabels: { count: 4, labels: { fontSize: 11 } } }
});
```

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

### `createThetaAxisLine`

```javascript
createThetaAxisLine({ scale?, coordinate?, color?, lineWidth? } = {})
```

Create missing theta-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createRadialAxisLine`

```javascript
createRadialAxisLine({ scale?, coordinate?, angle?, color?, lineWidth? } = {})
```

Create missing radial-axis line independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createThetaAxisTicks`

```javascript
createThetaAxisTicks({ scale?, coordinate?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing theta-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createRadialAxisTicks`

```javascript
createRadialAxisTicks({ scale?, coordinate?, angle?, count?, values?, length?, color?, lineWidth? } = {})
```

Create missing radial-axis ticks independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createThetaAxisLabels`

```javascript
createThetaAxisLabels({ scale?, coordinate?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createRadialAxisLabels`

```javascript
createRadialAxisLabels({ scale?, coordinate?, angle?, count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing radial-axis labels independently of the other components. Use count or exact values, never both. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createThetaAxisTitle`

```javascript
createThetaAxisTitle({ scale?, coordinate?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})
```

Create missing theta-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

### `createRadialAxisTitle`

```javascript
createRadialAxisTitle({ scale?, coordinate?, angle?, text?, offset?, color?, fontSize?, fontFamily?, fontWeight?, position? } = {})
```

Create missing radial-axis title independently of the other components. Reuse stored axis bindings or infer one compatible Polar encoding. Existing components are edited with the matching `edit` action. [Axes](../api/axes.md#polar-component-creation)

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
  target?, channels?, position?, layout?, align?, direction?, columns?, offset?, alongOffset?,
  titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, rowPadding?, titlePadding?, border?, count?,
  values?, gradient?, order?
})
```

`rowPadding` sets non-negative finite occupied edge-to-edge vertical row gaps for item-based legends; `titlePadding` independently sets title-to-body spacing for every family. Omission preserves the original layout. Text uses deterministic font-size and hard-line-break bounds; strokes, paths and clips contribute to sample bounds. Multi-column rows use their union; text-only summaries have no sample. These options require edge layout. Gradient strips reject row padding.

Create categorical, point-size, continuous-color gradient, discretized-color
interval, or field-opacity sample legends. Interval legends support all four
edges with layout `"edge"`, side single columns and horizontal item grids. Explicit `channels` creates exactly
the selected content; include `"size"` in a point categorical-and-size request.
Compatible point and line categorical channels stay combined when their domains
contain the same values, even in different orders. The first selected channel
owns item order; each symbol still looks up its own scale by value. Independent fields,
continuous color/stroke, opacity, and stroke width use separate native blocks.
Adding a new dash channel to an existing color-only line legend preserves its
appearance. A matching field extends the combined series legend; a different
field creates a separate dash legend and retains the color block. Repeating an
already-created channel remains an error.
Area fill and stroke are independently selectable blocks, including stroke-only
legends for density and horizon areas.
For outside top/bottom legends, omitting `offset` places the occupied legend after
the same-side axis line, ticks, labels, and title, with the family's native gap
(8 pixels for categorical legends, 30 for continuous families). Axis edits and
removal recompute that gap. An explicit numeric `offset`, including zero or the
native value, remains measured from the plot edge. Free coordinates, plot corners,
and `legacy-bottom` keep their existing anchors. Older saved programs retain
their fixed offsets.
Label style accepts `align: "left" | "center" | "right"` within each measured
label column. Symbols, ticks and titles retain their existing slots. All legend
families support it on create/edit and replay; omission preserves native defaults.
Top-title style accepts `align: "left" | "center" | "right"` within the
measured title/body content block. This applies to every legend family; omission
preserves each layout's current alignment. It does not move the complete group,
change item spacing, or include border padding. Inline `titlePosition: "left"`
rejects an explicit title alignment. Whole/focused title edits accept `"auto"`
to remove an explicit alignment; creation and saved state accept only the three
alignment values. Hidden titles retain their style for restoration.
Automatic symbol recipes refresh when matching companion lines or their color
bindings change; explicit recipes retain their layers and order.
Continuous color and stroke ramps accept
`gradient: { length?, thickness?, opacity? }`. Body opacity is finite in `[0, 1]`,
defaults to `1`, and preserves space at zero. It never fades marks, text, ticks,
or borders. Whole and focused legend edits preserve omitted gradient fields;
switching from symbols back to a gradient resets exclusive gradient settings.
Continuous color and stroke gradients also accept exact ascending numeric
`values` inside their domain. Ticks use their mapped positions, without adding
midpoint or endpoint values. Creation omits `values` for automatic ticks; editors
preserve omitted arrays and use `values: "auto"` to restore the remembered count.
Do not combine an exact array with `count`. Exact samples survive color
gradient/symbol representation changes. Select a gradient block with the
`editLegend` channel option; `editLegendBlock` sample edits remain sampled-only.
Omitted point channels infer the available categorical color, shape, and
quantitative size with the same result as explicit selection. Color-only uses
swatches; shape uses typed symbols; a size encoding adds its own sample block.
Continuous legends support right, left, top, and bottom
placement. Categorical legends also support left side placement; composite
point and size blocks remain in deterministic vertical order. Horizontal
sampled-opacity legends accept `titlePosition: "left"` for one inline
title-symbol-label reading line. Same-edge top/bottom blocks are left-packed
with a 40-pixel occupied-bound gap. Categorical `layout` defaults to `"edge"`;
`"legacy-bottom"` explicitly selects the former Canvas-bottom compact row and
requires bottom position. Categorical `order` accepts `"scale"`, `{ values: [...] }`,
or `{ channel: "x" | "y" | "theta" }` while preserving each category's color/shape/dash.
Continuous size, opacity, and stroke-width legends accept 1–100 exact,
finite, strictly increasing `values`. They use the actual channel scale without
changing its domain or the encoded marks. `values` cannot be combined with
`count` and is unsupported for discrete size and gradient legends.
[Legends](../api/legends.md)

Categorical left/right legends accept positive `columns` (default one), fill
columns in domain order, and measure each column before allocating its width.
They retain vertical direction and a top title. Side grids need sufficient
Canvas margin and preserve their internal spacing when combined with other blocks.

Categorical-only legends also accept `position: "top-left" | "top-right" |
"bottom-left" | "bottom-right"` inside the plot. `offset` is the inward gap to
the complete painted border (or content without a border); border padding is
reserved inside that edge. These anchors default to vertical, one-column content,
with a top title and center alignment. They do not reserve an outer guide lane.
The full legend must fit the plot; resizing the Canvas reanchors it.

Set `overflow: { maxItems: 29 }` to display at most 29 categorical or ordinal
point-size symbols and labels, followed by an additional text-only `…N entries`
summary when needed.
The optional `summary` value is `"ellipsis-count"`. All categories remain in
the appearance scale and legend domain, including categories omitted from the
visible legend. The limit follows the effective legend order and label map.
Omission or `false` displays every category. This option also works on edge
categorical legends and ordinal size legends. When a categorical block and an
ordinal size block are created or edited together, the same limit applies to both
blocks. Quantitative size sampling is unchanged by a categorical overflow limit.
Continuous and combined sampled legends retain their existing edge-only contracts. Shared facet promotion requires an edge position.
`combine: "color-size-shape"` creates one block for a Cartesian point owner with same-field/grain interval color or stroke, interval size, and ordinal shape. Select exactly color/size/shape or stroke/size/shape; omission infers a unique hue channel. Hue and size threshold boundaries must match. Explicit ascending finite `values` must provide one representative in each interval (left inclusive, right exclusive); no automatic values/count are accepted. Each sample uses the original hue/size/ordinal-shape mapping and native point area, including shape fallback. Numeric `labelMap` entries customize interval labels. Fixed point appearance is inherited; `symbol` supports point type, unmapped fill/stroke, strokeWidth and opacity, and rejects mapped overrides. All three selectors edit/remove the same block; explicitly use `combine: "separate"` to split it. Bindings, sample values and glyphs survive scale/style edits, composition replay and persistence. Incompatible field/grain/threshold edits reject atomically.

For categorical line-only recipes, `overflow.summarySymbol: "first-hidden"`
adds one sample beside that summary, mapped from the first hidden value in the
final legend order. The original domain, raw rows and visible category labels
are unchanged. Color/stroke/dash, width and opacity follow the normal sample
recipe. Omission stays text-only; `overflow: false` or no hidden values produces
no summary sample. Other families and point/swatch recipes reject the opt-in.

### `editLegend`

Use `visible: false` to hide the complete legend, `labels: { visible: false }` to hide entry labels, and `titleStyle: { visible: false }` to hide its title. Set each flag to `true` to restore it. Visibility preserves appearance and layout, remains independent for each component, and survives automatic guide generation, resizing and saved projects.

```javascript
editLegend({
  target?, channel?, channels?, position?, layout?, align?, direction?, columns?, offset?, alongOffset?, titlePosition?,
  title?, symbol?, labels?, titleStyle?, itemGap?, rowPadding?, titlePadding?, border?, count?, values?, gradient?, order?, overflow?
})
```

Select one legend block or all existing blocks together. `channel: "all"` reunites local placements on a position change and applies shared appearance to every block; omitted appearance is preserved. A singular channel cannot
accompany `channels`, `blockLayout`, or `at`. A channel never disambiguates mark targets.

`alongOffset` is a finite signed distance in logical pixels, defaulting to zero: positive moves right on top/bottom (and in-plot corner) anchors, or down on left/right anchors. `offset` keeps its perpendicular gap meaning. Omitted edits preserve the shift; zero resets it. With `channel`, only that block moves; without it, the target’s grouped blocks move together. `position: "inherit"` clears a selected block’s local anchor and shift. `at` cannot accompany edge placement options, including `alongOffset`. Existing fit and collision checks still apply.

`rowPadding` and `titlePadding` accept numbers or `"auto"` to remove retained intent; omission or undefined preserves it. Explicit row spacing wins over vertical itemGap/block gap while retaining the old fallback and horizontal spacing. Explicit title spacing wins over the old title gap. Reset row padding before a transition to a gradient. Combining conflicting policies requires an explicit choice; incompatible splits require explicit reset. Content and Canvas/data/scale/theme/facet replay retain compatible policies.

Partially edit one existing legend. Categorical `overflow` can be replaced or reset
with `false`; data/scale/order revisions recompute the hidden count and remove stale
symbols and summary text. Interval legends accept four-edge placement
and horizontal grid/inline-title controls. Hidden continuous titles are excluded
from occupied bounds and backgrounds. Omitted categorical `layout` preserves the
stored mode; style edits never switch modes. Categorical `order` can be reassigned or reset
with `"scale"`; linked position changes also refresh its item order. `title` accepts a non-empty string,
`"auto"`, or `false`. Explicit `channels` replaces the entire target's content
with the exact supported non-empty set; mark encodings and scales remain.
Retained blocks preserve configuration; new blocks use creation defaults and
removed blocks lose their settings. Categorical revisions preserve compatible
recipes and order. Shared text patches merge only requested style leaves into
each block. A
horizontal sampled-opacity legend accepts `titlePosition: "left"` and inline
spacing edits. A
standalone size or stroke-width legend accepts the bounded `title`, `count`,
`labels`, and `titleStyle` subset and remains right-positioned. Count and text
styles persist through Canvas/scale/data replay; `false` hides a title and
`"auto"` restores it from the encoded field.
Sampled size, opacity, and stroke-width legends also accept exact numeric
`values`; `values: "auto"` restores the remembered automatic count. A scale or
dependent replay that would invalidate a stored exact sample fails atomically.
[Legends](../api/legends.md)

### `editLegendBlock`

```javascript
editLegendBlock({
  target, channel, title?, values?, count?, order?, gap?, text?, symbol?, labelMap?
})
```

Edit one logical legend block without changing sibling blocks on the same mark.
Both the mark `target` and a channel currently represented by the legend are
required. Merged categorical channels share one block identity, so selecting
color or shape in a color-and-shape block edits the same state.

Continuous size, opacity, and stroke-width blocks accept exact `values` or an
automatic `count`; categorical blocks accept an exact full-domain `order`.
`text` changes item-label typography and color, `symbol` changes supported
sample appearance, and `gap` changes internal spacing. Empty `text` or `symbol`
objects restore the base style. A symbol property that would replace the data
mapping is rejected. Empty `title` hides the selected block. Full programs only.
Categorical and continuous-size `labelMap` may map a value to `""`: only text is omitted,
while the sample, symbol, item slot and typed identity remain. Continuous size accepts finite
numeric keys only; unmatched samples keep their normal formatter. `"auto"` removes the map and
`[]` stores an explicit empty map.
[Editing legends](../api/legends/editing.md#editing-one-legend-block)

### Focused legend edits

```javascript
editLegendLayout({
  target?, channel?, position?, layout?, align?, direction?, columns?, offset?, alongOffset?,
  titlePosition?, itemGap?, rowPadding?, titlePadding?
})
editLegendLabels({ target?, channel?, offset?, color?, fontSize?, fontFamily?, fontWeight?, format? })
editLegendTitle({
  target?, channel?, title?, color?, fontSize?, fontFamily?, fontWeight?, align?
})
editLegendSymbols({ target?, channel?, symbol?, count?, gradient? })
editLegendBorder({ target?, channel?, border })
```

`editLegendLayout` owns content spacing and its edit-only `"auto"` reset. Title editing remains text/style-only; block editing retains its original gap contract. See [content spacing](../api/legends.md#space-rows-by-content).

Edit one legend component without constructing the nested options accepted by
`editLegend`. Each action uses the same target inference, validation, and
rematerialization as `editLegend`. At least one component change is required.
[Editing legends](../api/legends/editing.md#focused-edits)

### `removeLegend`

```javascript
removeLegend({ target?, channels?, suppress? })
```

Remove every legend block owned by one mark when `channels` is omitted, or
remove selected channels while preserving mark encodings, scales, and unrelated
blocks. Partial categorical removal retains remaining channels, styles, title
visibility, layout and item order; automatic symbols are inferred again. [Legends](../api/legends.md)

### `createTitle`

```javascript
createTitle({
  text, subtitle?, position?, align?, offset?, alongOffset?, gap?,
  maxWidth?, wrap?, lineHeight?,
  titleStyle?, subtitleStyle?
})
```

`titleStyle.align` and `subtitleStyle.align` accept `"left" | "center" | "right"`
independently inside the measured title block, including rotated edge titles.
The top-level `align` still positions the complete block relative to the plot.
Omission preserves native defaults.

Create a chart title and optional subtitle. Explicit newlines retain their line
spacing; blank lines reserve space without painted text. Each string requires
at least one non-empty hard line. On facet parents, `alongOffset` shifts the full
title/subtitle block horizontally from the translated child-plot alignment anchor.
Text outside the composed Canvas is rejected. [Titles](../api/titles.md)

### `editTitle`

```javascript
editTitle({
  text?, subtitle?, position?, align?, offset?, alongOffset?, gap?,
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

### Focused channel scale editors

```javascript
editXScale({ id?, target?, type?, domain?, range?, ...positionOptions })
editYScale({ id?, target?, type?, domain?, range?, ...positionOptions })
editXOffsetScale({ target, domain?, reverse?, padding?, paddingInner?, paddingOuter?, align? })
editYOffsetScale({ target, domain?, reverse?, padding?, paddingInner?, paddingOuter?, align? })
editParallelScale({ target, dimension, type?, domain?, range?, ...dimensionOptions })
editThetaScale({ id?, target?, type?, domain?, range?, ...angularOptions })
editRScale({ id?, target?, type?, domain?, range?, radialMapping?, ...radialOptions })
editColorScale({ id?, target?, type?, domain?, range?, palette?, interpolate?, midpoint?, unknown? })
editStrokeScale({ target, type?, domain?, range?, palette?, interpolate?, midpoint?, unknown? })
editSizeScale({ id?, target?, type?, domain?, range?, unknown?, clamp?, reverse?, base?, exponent? })
editOpacityScale({ id?, target?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, unknown? })
editShapeScale({ id?, target?, type?, domain?, range?, unknown? })
editStrokeWidthScale({ id?, target?, type?, domain?, range?, ...quantitativeOptions })
editStrokeDashScale({ id?, target?, type?, domain?, range?, unknown? })
```

Edit the scale bound to one semantic channel without requiring its generated
ID. Explicit `id` and `target` selectors must agree. Otherwise the current
mark's channel scale wins, followed by a unique channel scale across all marks;
ambiguity is an error. Every action delegates to `editScale`, which validates
the channel-specific patch and refreshes all shared marks and guides.
`editParallelScale` is the field-selected exception: both `target` and the
exact Parallel `dimension` field are required, and its generated scale ID is
resolved internally.
The offset editors also require `target`; they resolve only that mark's matching
nested offset scale. Their concrete range remains derived from the parent
categorical slot, while the semantic scale owns domain, reverse, padding, and
alignment.
`editStrokeScale` likewise requires a mark `target` and rejects raw scale IDs.
It edits the target's field-driven stroke mapping and accepts a color/stroke
shared scale when every connected consumer remains compatible.
Size scale ranges are glyph areas. Continuous size scales accept `clamp` and
`reverse`; logarithmic scales accept `base`, and power scales require
`exponent`. Quantize, quantile, and threshold use explicit nondecreasing area
ranges. A family transition requires an explicit new domain and the destination
range rules to be satisfied.
[Scale options](../api/scales.md)

### Semantic resources and regression layers

```javascript
createCoordinate({ id?, type?, layers? })
editCoordinate({ target, aspect?, polarFrame? })
createDerivedData({
  id,
  source,
  transform: [DatasetTransform]
})
createRegressionBand({
  id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale,
  color?, opacity?, stroke?, strokeWidth?, curve?, missing?
})
editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth?, curve?, missing? })
createRegressionLine({
  id, data, x, y, groupBy?, coordinate, xScale, yScale,
  colorScale?, strokeWidth?, curve?, missing?
})
editRegressionLine({ target?, strokeWidth?, curve?, missing? })
```

These actions explicitly author named semantic resources or the component
layers normally owned by `createRegression`.

`createCoordinate.type` accepts `"cartesian"`, `"polar"`, or `"parallel"`.
Parallel coordinates normally create their resource through
`encodeParallelCoordinates` or `createParallelCoordinates`.

`editCoordinate.aspect` accepts `"auto"` or a frame/data ratio request with
optional start/center/end alignment. Frame mode supports Cartesian, Polar, and
Parallel coordinates. Data mode requires one complete Cartesian quantitative
linear x/y scale pair and preserves equal-unit intent through scale-domain and
Canvas edits. The target coordinate ID is always explicit.
`editCoordinate.polarFrame` accepts `"auto"` or a Polar-only center/radius
request. Center values are normalized effective-bound fractions; radius is a
fraction of the largest fitting radius or a positive fixed pixel value. The
frame object is replaced as a whole, and aspect is resolved before the Polar
frame and radial scale range. Optional `overflow: "allow"` permits a pixel radius
beyond plot bounds while preserving Canvas size; reserve outer margins for its
exported extent. Omitted overflow defaults to `"error"`.

`createDerivedData` stores immutable source and transform provenance only; it
does not materialize values. Chart facades and mark creation reject definition-only
datasets with an error explaining that materialized values are required.
Its public `DatasetTransform` union is listed in the canonical
[transform table](../api/data/source-and-derived.md#create-derived-data).
A bare object, empty array, or multi-transform pipeline is invalid. Focused
`create*Data` helpers validate fields, apply defaults, and materialize values;
raw provenance objects have their own normalized requirements.

### `createParallelAxes`, `createParallelAxis`, `editParallelAxis`, `removeParallelAxis`, `removeParallelAxes`

```javascript
createParallelAxes({ target?, coordinate? })
createParallelAxis({ field, target?, line?, ticks?, labels?, ticksAndLabels?, title? })
editParallelAxis({ field, target?, line?, ticks?, labels?, ticksAndLabels?, title? })
removeParallelAxis({ field, target? })
removeParallelAxes({ target?, coordinate? })
```

Full-only field-selected Parallel guides. Create requires missing resources;
edit/removal requires existing resources. Component `false` skips creation or
removes an existing component. Group and individual tick/label options are
exclusive. Field recipes and explicit titles survive dimension reordering.
The last component removal clears the guide owner. [Axes](../api/axes.md) owns
exact styles, defaults, inference, validation and replay behavior.

### Complete single-channel axes

```javascript
createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })
editXAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
editYAxis({ position?, line?: false | {...}, ticks?: false | {...},
  labels?: false | {...}, ticksAndLabels?: false | {...}, title?: false | {...} })
```

Cartesian and Polar complete-axis creators accept `false` for `line`,
`ticksAndLabels`, or `title` to omit those components; at least one must remain
enabled. Complete-axis edits update only the selected components of an existing axis.
Each component accepts its edit object or `false` for removal. Use
`ticksAndLabels` for a coordinated tick/label edit or removal, or `ticks` and
`labels` for independent edits/removals; do not combine both forms. Removal
preserves scale, coordinate, encoding, and data, while the last component also
cleans the empty axis state.

Cartesian `createXAxis`/`createYAxis` can bind a standalone scale without marks:
provide both `coordinate` and `scale`, with an existing Cartesian coordinate
and explicit nonempty scale domain. The default title is the scale ID.
Scale, Canvas, and coordinate frame edits update the axis. Auto domains require
data consumers; unrelated channel or coordinate bindings are rejected.

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

createXAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth?, alongOffset? })
createYAxisTicks({ scale?, position?, count?, values?, length?, color?, lineWidth?, alongOffset? })
editXAxisTicks({ position?, count?, values?, length?, color?, lineWidth?, alongOffset? })
editYAxisTicks({ position?, count?, values?, length?, color?, lineWidth?, alongOffset? })

createXAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?, alongOffset?, flush?, flushThreshold?, labelMap?, colorMap?
})
createYAxisLabels({
  scale?, position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?, alongOffset?, flush?, flushThreshold?, labelMap?, colorMap?
})
editXAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?, alongOffset?, flush?, flushThreshold?, labelMap?, colorMap?
})
editYAxisLabels({
  position?, count?, values?, offset?, format?, color?,
  fontSize?, fontFamily?, fontWeight?, alongOffset?, flush?, flushThreshold?, labelMap?, colorMap?
})
```

Axis `position` is `"bottom" | "top"` for x and `"left" | "right"` for y.
Label `format` accepts `"auto"`, `{ decimals }`, `.0`–`.12` precision with
`f`, `%`, or `e`, or a UTC sequence of `%Y/%m/%d/%b` directives and literals
when compatible with the resolved scale. Use `%%` for a literal percent;
unknown or dangling directives reject.

Cartesian `flushThreshold` optionally limits `flush: true` to mapped ticks within a
non-negative logical-pixel distance of a range edge. Omission preserves complete
label containment. Use `"auto"` to clear a stored threshold; zero selects exact
endpoints. Text bounds do not control threshold selection.

### Tick/label groups and axis titles

```javascript
createXAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
createYAxisTicksAndLabels({ scale?, position?, count?, values?, ticks?, labels? })
editXAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })
editYAxisTicksAndLabels({ position?, count?, values?, ticks?, labels? })

createXAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?, overlap?
})
createYAxisTitle({
  text?, scale?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?, overlap?
})
editXAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?, overlap?
})
editYAxisTitle({
  text?, position?, at?, offset?, rotation?, color?,
  fontSize?, fontFamily?, fontWeight?, overlap?
})
```

Cartesian title `text` keeps explicit line breaks (LF, CRLF, or CR), including
blank lines. Lines form a centered block with spacing of `fontSize * 1.2`;
rotation applies to the complete block. Creation, editing, Canvas/scale updates,
facets and saved programs retain the same lines. Canvas and label-clearance
checks use their full bounds. Returning to single-line text removes the old lines.

Cartesian title `rotation` accepts a finite legacy number in radians or
`{ value, unit: "degrees" | "radians" }`. Both forms normalize to concrete
radians. Polar component `angle` remains degree-valued placement.

Cartesian title `overlap` is `"error"` by default. Explicit `"allow"` permits only
that title to intersect labels of its own axis. Label-label overlap and Canvas
bounds remain independent checks. Complete axes accept the policy in `title`;
focused and whole-axis editors preserve it when omitted. Resetting to `"error"`
requires a valid final layout. The same policy applies when labels are edited
after the title and through Canvas, scale, data, facet and saved-program replay.

### Directional grids

Each direction accepts `visible: false` to hide its grid without losing width, dash or color. `visible: true` restores the retained appearance. The focused Cartesian and Polar grid editors accept the same option.

```javascript
createHorizontalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash?, alongOffset? })
createVerticalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash?, alongOffset? })
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

Import `action`, `registerExtension`, and `ChartProgram` from
`ggaction/extension`. Primitive methods are available on programs used by
extension actions.

| API | Signature |
| --- | --- |
| Wrapper | `action({ op, description }, implementation)` |
| Registration | `registerExtension({ name, actions })` |
| Semantic primitive | `editSemantic({ property, value })` or `editSemantic({ property, remove: true })` |
| Graphic primitive | `createGraphics({ id, type, length?, parent?, before?, after? })` |
| Graphic primitive | `editGraphics({ target, property, value })` or `editGraphics({ target, remove: true })` |
| Scale actions | `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`, `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })` |

Importing an extension package may register one validated batch of wrapped
actions on the complete `chart()` program. Registration does not affect
`ggaction/basic`, rejects collisions without partial installation, and requires
each action key to match its wrapped `op`.

See [Action authoring](../extension/action-authoring.md) and
[Primitive API](../extension/primitives.md).

## Internal trace operations

High-level actions call additional wrapped operations for data, scale, mark,
guide, title, and layout materialization. Names such as
`materializeCompleteData`, `materializeDensityData`, `materializeImputedData`,
`materializeWindowData`, `materializeBin2DData`, `rematerializeScale`, `rematerializePointMark`,
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
chainable methods. `hconcat` and `vconcat` create a new composition program and
record their wrapped composition action and children in its trace. They leave
input programs unchanged. `chart` starts an empty trace; rendering reads the
concrete graphics without recording an authoring action.

<!-- BEGIN GENERATED RUNTIME SIGNATURES -->
<!-- END GENERATED RUNTIME SIGNATURES -->

## Rendering functions

Use [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable child replacement. Use [Rendering](../api/rendering.md) for
complete Browser Canvas, SVG, Node PNG, and vector PDF examples.
