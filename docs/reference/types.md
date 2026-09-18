---
layout: default
title: Exact TypeScript Contract
description: Read the complete generated TypeScript interface for every chainable ChartProgram action.
---

# Exact TypeScript Contract

This generated interface is the exact callable contract from
`types/program.d.ts`. Use the family reference pages for defaults, inference,
effects, and errors.

<!-- BEGIN GENERATED TYPESCRIPT SIGNATURES -->
## Exact TypeScript signatures

This generated block is the exact callable contract from `types/program.d.ts`.
The action entries below provide the readable form, behavior, defaults, and routes.

```typescript
interface ChartProgramActions {
  createCanvas(options?: CanvasOptions): ChartProgram;
  editCanvas(options: CanvasOptions): ChartProgram;
  fitCanvas(options?: FitCanvasOptions): ChartProgram;
  applyTextMetrics(options: ApplyTextMetricsOptions): ChartProgram;
  removeTextMetrics(): ChartProgram;
  applyTheme(options: ApplyThemeOptions): ChartProgram;
  removeTheme(): ChartProgram;
  createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram;
  reviseData<Row extends object>(options: ReviseDataOptions<Row>): ChartProgram;
  removeData(options: RemoveResourceOptions): ChartProgram;
  removeScale(options: RemoveResourceOptions): ChartProgram;
  removeCoordinate(options: RemoveResourceOptions): ChartProgram;
  bindMarkData(options: BindMarkDataOptions): ChartProgram;
  filterData(options: FilterDataOptions): ChartProgram;
  filterMarks(options: FilterMarksOptions): ChartProgram;
  removeMarkFilter(options?: RemoveMarkFilterOptions): ChartProgram;
  selectMarks(options: SelectMarksOptions): ChartProgram;
  editMarkSelection(options: EditMarkSelectionOptions): ChartProgram;
  removeMarkHighlight(options?: RemoveMarkSelectionOptions): ChartProgram;
  removeMarkSelection(options?: RemoveMarkSelectionOptions): ChartProgram;
  highlightMarks(options: HighlightMarksOptions): ChartProgram;
  createDensityData(options: DensityDataOptions): ChartProgram;
  createSummaryData(options: SummaryDataOptions): ChartProgram;
  createBinData(options: BinDataOptions): ChartProgram;
  createFoldData(options: FoldDataOptions): ChartProgram;
  createComputedData(options: ComputedDataOptions): ChartProgram;
  createNormalizedData(options: NormalizedDataOptions): ChartProgram;
  createCompleteData(options: CompleteDataOptions): ChartProgram;
  createImputedData(options: ImputedDataOptions): ChartProgram;
  createStackData(options: StackDataOptions): ChartProgram;
  createRegressionData(options: RegressionDataOptions): ChartProgram;
  createIntervalData(options: IntervalDataOptions): ChartProgram;
  createECDFData(options: ECDFDataOptions): ChartProgram;
  createTimeUnitData(options: TimeUnitDataOptions): ChartProgram;
  createWindowData(options: WindowDataOptions): ChartProgram;
  createBin2DData(options: Bin2DDataOptions): ChartProgram;
  createSortedData(options: SortedDataOptions): ChartProgram;
  editDerivedData(options: EditDerivedDataOptions): ChartProgram;
  editComputedData(options: EditComputedDataOptions): ChartProgram;
  editFilteredData(options: EditFilteredDataOptions): ChartProgram;
  editFoldData(options: EditFoldDataOptions): ChartProgram;
  editSummaryData(options: EditSummaryDataOptions): ChartProgram;
  editBinData(options: EditBinDataOptions): ChartProgram;
  editTimeUnitData(options: EditTimeUnitDataOptions): ChartProgram;
  editWindowData(options: EditWindowDataOptions): ChartProgram;
  editDensityData(options: EditDensityDataOptions): ChartProgram;
  editStackData(options: EditStackDataOptions): ChartProgram;
  editRegressionData(options: EditRegressionDataOptions): ChartProgram;
  editSortedData(options: EditSortedDataOptions): ChartProgram;
  editIntervalData(options: EditIntervalDataOptions): ChartProgram;
  editECDFData(options: EditECDFDataOptions): ChartProgram;
  editNormalizedData(options: EditNormalizedDataOptions): ChartProgram;
  editCompleteData(options: EditCompleteDataOptions): ChartProgram;
  editImputedData(options: EditImputedDataOptions): ChartProgram;
  editBin2DData(options: EditBin2DDataOptions): ChartProgram;
  createPointMark(options?: StrokeStyleDetails & { id?: string; data?: string; missing?: "error" | "skip"; shape?: PointShape; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
  editPointMark(options: StrokeStyleDetails & { target?: string; missing?: "error" | "skip"; shape?: PointShape; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
  createTickMark(options?: StrokeStyleDetails & { id?: string; data?: string; missing?: "error" | "skip"; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }): ChartProgram;
  editTickMark(options: StrokeStyleDetails & { target?: string; missing?: "error" | "skip"; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }): ChartProgram;
  jitterPoints(options: JitterPointsOptions): ChartProgram;
  removeJitter(options?: RemoveJitterOptions): ChartProgram;
  packPoints(options: PackPointsOptions): ChartProgram;
  removePointPacking(options?: RemovePointPackingOptions): ChartProgram;
  createLineMark(options?: StrokeStyleDetails & { id?: string; data?: string; strokeWidth?: number; curve?: CurveInterpolation; tension?: number; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  editLineMark(options: StrokeStyleDetails & { target?: string; strokeWidth?: number; curve?: CurveInterpolation; tension?: number; stroke?: string; opacity?: number; closed?: boolean; }): ChartProgram;
  createBarMark(options?: RectStyleDetails & { id?: string; data?: string; missing?: "error" | "skip"; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
  editBarMark(options: RectStyleDetails & { target?: string; missing?: "error" | "skip"; fill?: string; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }): ChartProgram;
  createAreaMark(options?: StrokeStyleDetails & { id?: string; data?: string; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }): ChartProgram;
  createArcMark(options?: StrokeStyleDetails & { id?: string; data?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; }): ChartProgram;
  editArcMark(options: StrokeStyleDetails & { target?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; }): ChartProgram;
  createRectMark(options?: RectMarkOptions): ChartProgram;
  editRectMark(options: EditRectMarkOptions): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string; missing?: "error" | "skip" } & RuleStyleOptions): ChartProgram;
  editRuleMark(options: { target?: string; missing?: "error" | "skip" } & RuleStyleOptions): ChartProgram;
  createTextMark(options?: TextMarkOptions): ChartProgram;
  createMarkLabels(options?: CreateMarkLabelsOptions): ChartProgram;
  editMarkLabelSelection(options: EditMarkLabelSelectionOptions): ChartProgram;
  editMarkLabelPlacement(options: EditMarkLabelPlacementOptions): ChartProgram;
  removeMarkLabels(options: RemoveMarkLabelsOptions): ChartProgram;
  createAnnotation(options: CreateAnnotationOptions): ChartProgram;
  createReferenceLine(options: CreateReferenceLineOptions): ChartProgram;
  createReferenceBand(options: CreateReferenceBandOptions): ChartProgram;
  editTextMark(options: EditTextMarkOptions): ChartProgram;
  layoutLabels(options?: LabelLayoutOptions): ChartProgram;
  removeLabelLayout(options?: RemoveLabelLayoutOptions): ChartProgram;
  editAreaMark(options: StrokeStyleDetails & { target?: string; fill?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }): ChartProgram;
  encodeX(options: PositionEncodingOptions | DatumPositionEncodingOptions): ChartProgram;
  encodeY(options: YPositionEncodingOptions | DatumPositionEncodingOptions): ChartProgram;
  encodeTheta(options: ThetaEncodingOptions): ChartProgram;
  encodeR(options: RadialEncodingOptions): ChartProgram;
  encodeX2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeColor(options: ColorEncodingOptions): ChartProgram;
  encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
  encodeSize(options: SizeEncodingOptions): ChartProgram;
  encodeShape(options: ShapeEncodingOptions): ChartProgram;
  encodeAngle(options: AngleEncodingOptions): ChartProgram;
  encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodePointRadius(options: { value: number; target?: string }): ChartProgram;
  removePointRadius(options?: { target?: string }): ChartProgram;
  encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
  encodeYOffset(options: YOffsetEncodingOptions): ChartProgram;
  encodeY2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeYRange(options: RangePositionEncodingOptions): ChartProgram;
  encodeXRange(options: RangePositionEncodingOptions): ChartProgram;
  encodeGroup(options: GroupEncodingOptions): ChartProgram;
  layoutSeries(options: SeriesLayoutOptions): ChartProgram;
  encodePathOrder(options: PathOrderEncodingOptions): ChartProgram;
  orderCategories(options: OrderCategoriesOptions): ChartProgram;
  encodeParallelCoordinates(options: ParallelCoordinatesEncodingOptions): ChartProgram;
  removePathOrder(options?: RemovePathOrderOptions): ChartProgram;
  removeCategoryOrder(options: RemoveCategoryOrderOptions): ChartProgram;
  removeEncoding(options: { target?: string; channel: | "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "angle" | "group" | "opacity" | "text"; }): ChartProgram;
  encodeText(options: TextEncodingOptions): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeHorizon(options?: HorizonEncodingOptions): ChartProgram;
  editHorizon(options: EditHorizonOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: StrokeEncodingOptions): ChartProgram;
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
  createGradientPlot(options?: GradientPlotOptions): ChartProgram;
  editGradientPlot(options: EditGradientPlotOptions): ChartProgram;
  createViolinPlot(options: ViolinPlotOptions): ChartProgram;
  editViolinPlot(options: EditViolinPlotOptions): ChartProgram;
  createScatterPlot(options: CreateScatterPlotOptions): ChartProgram;
  createIntervalPlot(options: CreateIntervalPlotOptions): ChartProgram;
  createRegressionPlot(options: CreateRegressionPlotOptions): ChartProgram;
  createDotPlot(options: CreateDotPlotOptions): ChartProgram;
  createLollipopPlot(options: CreateLollipopPlotOptions): ChartProgram;
  createDumbbellPlot(options: CreateDumbbellPlotOptions): ChartProgram;
  editEndpointPlot(options: EditEndpointPlotOptions): ChartProgram;
  createECDFPlot(options: CreateECDFPlotOptions): ChartProgram;
  editECDFPlot(options: EditECDFPlotOptions): ChartProgram;
  createLinePlot(options: CreateLinePlotOptions): ChartProgram;
  createPolarScatterPlot(options: CreatePolarScatterPlotOptions): ChartProgram;
  createPolarLinePlot(options: CreatePolarLinePlotOptions): ChartProgram;
  createRadarPlot(options: CreateRadarPlotOptions): ChartProgram;
  createRugPlot(options: CreateRugPlotOptions): ChartProgram;
  createStripPlot(options: CreateStripPlotOptions): ChartProgram;
  createBeeswarmPlot(options: CreateBeeswarmPlotOptions): ChartProgram;
  createRaincloudPlot(options: CreateRaincloudPlotOptions): ChartProgram;
  editRaincloudPlot(options: EditRaincloudPlotOptions): ChartProgram;
  createAreaPlot(options: CreateAreaPlotOptions): ChartProgram;
  createBarPlot(options: CreateBarPlotOptions): ChartProgram;
  createHistogram(options: CreateHistogramOptions): ChartProgram;
  createPiePlot(options: CreatePiePlotOptions): ChartProgram;
  createRosePlot(options: CreateRosePlotOptions): ChartProgram;
  createRadialBarPlot(options: CreateRadialBarPlotOptions): ChartProgram;
  createDensityPlot(options: CreateDensityPlotOptions): ChartProgram;
  createHorizonPlot(options: CreateHorizonPlotOptions): ChartProgram;
  createHeatmap(options: CreateHeatmapOptions): ChartProgram;
  createParallelCoordinates(options: CreateParallelCoordinatesOptions): ChartProgram;
  removeMark(options?: RemoveMarkOptions): ChartProgram;
  createParallelAxes(options?: ParallelAxesOptions): ChartProgram;
  createParallelAxis(options: CreateParallelAxisOptions): ChartProgram;
  editParallelAxis(options: EditParallelAxisOptions): ChartProgram;
  removeParallelAxis(options: RemoveParallelAxisOptions): ChartProgram;
  removeParallelAxes(options?: ParallelAxesOptions): ChartProgram;
  createAxes(options?: CreateAxesOptions): ChartProgram;
  createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
  createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
  createThetaAxis(options?: CompleteThetaAxisOptions): ChartProgram;
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
  editThetaAxisLabels(options?: ThetaAxisLabelOptions): ChartProgram;
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
  editThetaAxis(options: EditThetaAxisOptions): ChartProgram;
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
  editLegendBlock(options: EditLegendBlockOptions): ChartProgram;
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
  editXScale(options: EditXScaleOptions): ChartProgram;
  editYScale(options: EditYScaleOptions): ChartProgram;
  editXOffsetScale(options: EditXOffsetScaleOptions): ChartProgram;
  editYOffsetScale(options: EditYOffsetScaleOptions): ChartProgram;
  editParallelScale(options: EditParallelScaleOptions): ChartProgram;
  editThetaScale(options: EditThetaScaleOptions): ChartProgram;
  editRScale(options: EditRScaleOptions): ChartProgram;
  editColorScale(options: EditColorScaleOptions): ChartProgram;
  editStrokeScale(options: EditStrokeScaleOptions): ChartProgram;
  editSizeScale(options: EditSizeScaleOptions): ChartProgram;
  editOpacityScale(options: EditOpacityScaleOptions): ChartProgram;
  editShapeScale(options: EditShapeScaleOptions): ChartProgram;
  editStrokeWidthScale(options: EditStrokeWidthScaleOptions): ChartProgram;
  editStrokeDashScale(options: EditStrokeDashScaleOptions): ChartProgram;
  createDerivedData(options: CreateDerivedDataOptions): ChartProgram;
  createRegressionBand(options: CreateRegressionBandOptions): ChartProgram;
  editRegressionBand(options: StrokeStyleDetails & { target?: string; color?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  createRegressionLine(options: CreateRegressionLineOptions): ChartProgram;
  editRegressionLine(options: StrokeStyleDetails & { target?: string; strokeWidth?: number; curve?: CurveInterpolation; }): ChartProgram;
  editCompositionLayout(options: EditCompositionLayoutOptions): ChartProgram;
  replaceCompositionChild(options: ReplaceCompositionChildOptions): ChartProgram;
  insertCompositionChild(options: InsertCompositionChildOptions): ChartProgram;
  removeCompositionChild(options: RemoveCompositionChildOptions): ChartProgram;
  reorderCompositionChildren(options: ReorderCompositionChildrenOptions): ChartProgram;
  facet(options: FacetOptions): ChartProgram;
  facetGrid(options: FacetGridOptions): ChartProgram;
  repeatCharts(options: RepeatChartsOptions): ChartProgram;
  editFacetSource(options: EditFacetSourceOptions): ChartProgram;
  editFacetScales(options: FacetScaleResolutions): ChartProgram;
  editFacetGuides(options: FacetGuideOptions): ChartProgram;
  editFacetHeaders(options: EditFacetHeadersOptions): ChartProgram;
  editSemantic(options: EditSemanticOptions): ChartProgram;
  createGraphics(options: { id: string; type: GraphicType; length?: number; parent?: string; before?: string; after?: string; }): ChartProgram;
  editGraphics(options: EditGraphicsOptions): ChartProgram;
}
```

## Named option contracts

These declarations are generated from the same source as the action signatures. Follow named nested types to inspect union branches, required combinations, and shared styles. The raw [declaration file](../types/program.d.ts) is also available.

### `AggregateOperation` {#type-aggregateoperation}

<details markdown="1">
<summary>Expand AggregateOperation</summary>

```typescript
export type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
```

</details>

Related types: [`ScalarAggregateOperation`](#type-scalaraggregateoperation) · [`ParameterizedAggregateOperation`](#type-parameterizedaggregateoperation).

### `AngleEncodingOptions` {#type-angleencodingoptions}

<details markdown="1">
<summary>Expand AngleEncodingOptions</summary>

```typescript
export type AngleEncodingOptions =
  | { target?: string; value: number; field?: never; fieldType?: never }
  | { target?: string; field: string; fieldType?: "quantitative"; value?: never };
```

</details>

### `AnnotationAnchor` {#type-annotationanchor}

<details markdown="1">
<summary>Expand AnnotationAnchor</summary>

```typescript
type AnnotationAnchor =
  | {
      x?: never;
      y?: never;
      space?: never;
      source?: string;
      data?: never;
      coordinate?: never;
    }
  | {
      x: unknown;
      y: unknown;
      space?: "data";
      source?: string;
      data?: never;
      coordinate?: never;
    }
  | {
      x: number;
      y: number;
      space: "plot";
      source?: never;
      data?: string;
      coordinate?: string;
    };
```

</details>

### `AnnotationBaseOptions` {#type-annotationbaseoptions}

<details markdown="1">
<summary>Expand AnnotationBaseOptions</summary>

```typescript
type AnnotationBaseOptions = Omit<TextMarkOptions, "id" | "data" | "source" | "text"> & {
  id?: string;
  text: unknown;
  format?: TextFormat;
  layout?: false | Omit<LabelLayoutOptions, "target">;
};
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`TextFormat`](#type-textformat) · [`LabelLayoutOptions`](#type-labellayoutoptions).

### `ApplyTextMetricsOptions` {#type-applytextmetricsoptions}

<details markdown="1">
<summary>Expand ApplyTextMetricsOptions</summary>

```typescript
export interface ApplyTextMetricsOptions { profile: TextMetricsProfile; }
```

</details>

Related types: [`TextMetricsProfile`](#type-textmetricsprofile).

### `ApplyThemeOptions` {#type-applythemeoptions}

<details markdown="1">
<summary>Expand ApplyThemeOptions</summary>

```typescript
export interface ApplyThemeOptions {
  theme: ThemeDefinition;
  scope?: "self" | "descendants";
}
```

</details>

Related types: [`ThemeDefinition`](#type-themedefinition).

### `ArcInnerRadius` {#type-arcinnerradius}

<details markdown="1">
<summary>Expand ArcInnerRadius</summary>

```typescript
export type ArcInnerRadius = number | { unit: "px"; value: number };
```

</details>

### `AreaPlotIndependentChannel` {#type-areaplotindependentchannel}

<details markdown="1">
<summary>Expand AreaPlotIndependentChannel</summary>

```typescript
export type AreaPlotIndependentChannel = string | ({ field: string } & (
  | { fieldType: "nominal" | "ordinal"; scale?: NonPointCategoricalPositionScaleOptions }
  | { fieldType?: "quantitative"; scale?: NonPointQuantitativePositionScaleOptions }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit; scale?: NonPointTemporalPositionScaleOptions }
));
```

</details>

Related types: [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `AreaPlotMeasureChannel` {#type-areaplotmeasurechannel}

<details markdown="1">
<summary>Expand AreaPlotMeasureChannel</summary>

```typescript
export type AreaPlotMeasureChannel = string | { field: string; scale?: NonPointQuantitativePositionScaleOptions }
  | ({ scale?: NonPointQuantitativePositionScaleOptions } & (
    | { lower: string; upper: string | { datum: number } }
    | { lower: { datum: number }; upper: string }
  ));
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `AreaRangePositionEncodingOptions` {#type-arearangepositionencodingoptions}

<details markdown="1">
<summary>Expand AreaRangePositionEncodingOptions</summary>

```typescript
type AreaRangePositionEncodingOptions = {
  target?: string;
  coordinate?: string;
  fieldType?: "quantitative";
  temporalUnit?: never;
  scale?: NonPointQuantitativePositionScaleOptions;
} & (
  | { lower: string; upper: { datum: number } }
  | { lower: { datum: number }; upper: string }
);
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `AtLeastOne` {#type-atleastone}

<details markdown="1">
<summary>Expand AtLeastOne</summary>

```typescript
type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>
}[keyof T];
```

</details>

### `AxisFormat` {#type-axisformat}

<details markdown="1">
<summary>Expand AxisFormat</summary>

```typescript
export type AxisFormat =
  | ValueFormat
  | { decimals: number };
```

</details>

Related types: [`ValueFormat`](#type-valueformat).

### `AxisLabelLayoutOptions` {#type-axislabellayoutoptions}

<details markdown="1">
<summary>Expand AxisLabelLayoutOptions</summary>

```typescript
export interface AxisLabelLayoutOptions {
  /** Legacy numbers are radians; structured values make radians or degrees explicit. */
  rotation?: RotationInput;
  /** Wrap each label to this measured width; false removes an existing wrap policy. */
  maxWidth?: number | false;
  wrap?: "word" | "character";
  lineHeight?: number;
  /** Defaults to error; allow stores an intentional label-label overlap policy. */
  overlap?: "error" | "allow";
}
```

</details>

Related types: [`RotationInput`](#type-rotationinput).

### `AxisLabelOptions` {#type-axislabeloptions}

<details markdown="1">
<summary>Expand AxisLabelOptions</summary>

```typescript
export interface AxisLabelOptions<P extends string>
  extends AxisLabelStyleOptions, AxisLabelLayoutOptions, DisplayLabelOptions {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
}
```

</details>

Related types: [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions) · [`AxisValue`](#type-axisvalue).

### `AxisLabelStyleOptions` {#type-axislabelstyleoptions}

<details markdown="1">
<summary>Expand AxisLabelStyleOptions</summary>

```typescript
export interface AxisLabelStyleOptions {
  offset?: number;
  format?: AxisFormat;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

Related types: [`AxisFormat`](#type-axisformat).

### `AxisLineStyleOptions` {#type-axislinestyleoptions}

<details markdown="1">
<summary>Expand AxisLineStyleOptions</summary>

```typescript
export interface AxisLineStyleOptions {
  color?: string;
  lineWidth?: number;
}
```

</details>

### `AxisTickOptions` {#type-axistickoptions}

<details markdown="1">
<summary>Expand AxisTickOptions</summary>

```typescript
export interface AxisTickOptions<P extends string>
  extends AxisTickStyleOptions {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
}
```

</details>

Related types: [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisValue`](#type-axisvalue).

### `AxisTickStyleOptions` {#type-axistickstyleoptions}

<details markdown="1">
<summary>Expand AxisTickStyleOptions</summary>

```typescript
export interface AxisTickStyleOptions extends AxisLineStyleOptions {
  length?: number;
}
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions).

### `AxisTicksAndLabelsOptions` {#type-axisticksandlabelsoptions}

<details markdown="1">
<summary>Expand AxisTicksAndLabelsOptions</summary>

```typescript
export interface AxisTicksAndLabelsOptions<P extends string> {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
  ticks?: AxisTickStyleOptions;
  labels?: AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
}
```

</details>

Related types: [`AxisValue`](#type-axisvalue) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `AxisTitleOptions` {#type-axistitleoptions}

<details markdown="1">
<summary>Expand AxisTitleOptions</summary>

```typescript
export interface AxisTitleOptions<P extends string> {
  text?: string;
  scale?: string;
  position?: P;
  at?: "start" | "center" | "end" | number;
  offset?: number;
  rotation?: RotationInput;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

Related types: [`RotationInput`](#type-rotationinput).

### `AxisValue` {#type-axisvalue}

<details markdown="1">
<summary>Expand AxisValue</summary>

```typescript
export type AxisValue = string | boolean | number;
```

</details>

### `BandPositionChannel` {#type-bandpositionchannel}

<details markdown="1">
<summary>Expand BandPositionChannel</summary>

```typescript
type BandPositionChannel = FacadePositionChannel<
  NonPointZeroSupportingPositionScaleOptions,
  NonPointTemporalPositionScaleOptions,
  NonPointBandPositionScaleOptions
>;
```

</details>

Related types: [`FacadePositionChannel`](#type-facadepositionchannel) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `BandPositionScaleOptions` {#type-bandpositionscaleoptions}

<details markdown="1">
<summary>Expand BandPositionScaleOptions</summary>

```typescript
export type BandPositionScaleOptions =
  NonPointBandPositionScaleOptions & { unknown?: number };
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `BarCategoricalColorChannel` {#type-barcategoricalcolorchannel}

<details markdown="1">
<summary>Expand BarCategoricalColorChannel</summary>

```typescript
type BarCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: Exclude<ColorLayout, "center">;
    };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ColorLayout`](#type-colorlayout).

### `BarColorChannel` {#type-barcolorchannel}

<details markdown="1">
<summary>Expand BarColorChannel</summary>

```typescript
type BarColorChannel =
  | BarCategoricalColorChannel
  | QuantitativeBarColorChannel;
```

</details>

Related types: [`BarCategoricalColorChannel`](#type-barcategoricalcolorchannel) · [`QuantitativeBarColorChannel`](#type-quantitativebarcolorchannel).

### `BarFieldPosition` {#type-barfieldposition}

<details markdown="1">
<summary>Expand BarFieldPosition</summary>

```typescript
type BarFieldPosition<T> = T extends string ? T : T & { lower?: never; upper?: never };
```

</details>

### `BarRangePositionChannel` {#type-barrangepositionchannel}

<details markdown="1">
<summary>Expand BarRangePositionChannel</summary>

```typescript
export type BarRangePositionChannel = {
  lower: string;
  upper: string;
  fieldType?: "quantitative";
  scale?: NonPointZeroSupportingPositionScaleOptions;
  field?: never;
  aggregate?: never;
  stack?: never;
};
```

</details>

Related types: [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions).

### `BarWidthOptions` {#type-barwidthoptions}

<details markdown="1">
<summary>Expand BarWidthOptions</summary>

```typescript
export type BarWidthOptions = { target?: string } & (
  | { band?: number; pixels?: never }
  | { band?: never; pixels: number }
);
```

</details>

### `BarYPositionChannel` {#type-barypositionchannel}

<details markdown="1">
<summary>Expand BarYPositionChannel</summary>

```typescript
type BarYPositionChannel =
  | string
  | {
      field: string;
      bin?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      stack?: never;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | ({ field: string; bin?: never; stack?: StackMode } & (
      | {
          fieldType?: "quantitative";
          aggregate?: never;
          scale?: NonPointZeroSupportingPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          aggregate?: never;
          scale?: NonPointBandPositionScaleOptions;
        }
      | {
          fieldType?: "quantitative" | "nominal" | "ordinal";
          aggregate: AggregateOperation;
          scale?: NonPointZeroSupportingPositionScaleOptions;
        }
    ));
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`StackMode`](#type-stackmode) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions) · [`AggregateOperation`](#type-aggregateoperation).

### `BaselineDensityPlacement` {#type-baselinedensityplacement}

<details markdown="1">
<summary>Expand BaselineDensityPlacement</summary>

```typescript
export interface BaselineDensityPlacement {
  type: "baseline";
}
```

</details>

### `BasicColorChannel` {#type-basiccolorchannel}

<details markdown="1">
<summary>Expand BasicColorChannel</summary>

```typescript
type BasicColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: CategoricalColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "quantitative";
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
    };
```

</details>

Related types: [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit).

### `BasicHistogramEncoding` {#type-basichistogramencoding}

<details markdown="1">
<summary>Expand BasicHistogramEncoding</summary>

```typescript
type BasicHistogramEncoding =
  HistogramEncodingOptions extends infer T
    ? T extends unknown
      ? Omit<T, "field" | "target" | "coordinate" | "stack"> & {
          stack?: Exclude<StackMode, "center">;
        }
      : never
    : never;
```

</details>

Related types: [`HistogramEncodingOptions`](#type-histogramencodingoptions) · [`StackMode`](#type-stackmode).

### `BasicShapeChannel` {#type-basicshapechannel}

<details markdown="1">
<summary>Expand BasicShapeChannel</summary>

```typescript
export type BasicShapeChannel = string | {
  field: string;
  fieldType?: "nominal";
  scale?: ShapeScaleOptions;
};
```

</details>

Related types: [`ShapeScaleOptions`](#type-shapescaleoptions).

### `BasicSizeChannel` {#type-basicsizechannel}

<details markdown="1">
<summary>Expand BasicSizeChannel</summary>

```typescript
export type BasicSizeChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: SizeScaleOptions;
};
```

</details>

Related types: [`SizeScaleOptions`](#type-sizescaleoptions).

### `BasicStrokeDashChannel` {#type-basicstrokedashchannel}

<details markdown="1">
<summary>Expand BasicStrokeDashChannel</summary>

```typescript
export type BasicStrokeDashChannel =
  StrokeDashEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "target"> : never
    : never;
```

</details>

Related types: [`StrokeDashEncodingOptions`](#type-strokedashencodingoptions).

### `BeeswarmPackingOptions` {#type-beeswarmpackingoptions}

<details markdown="1">
<summary>Expand BeeswarmPackingOptions</summary>

```typescript
export interface BeeswarmPackingOptions {
  maxOffset?: PointPackingMaxOffset;
  padding?: number;
  key?: string;
  overflow?: "error" | "overlap";
}
```

</details>

Related types: [`PointPackingMaxOffset`](#type-pointpackingmaxoffset).

### `Bin2DCounts` {#type-bin2dcounts}

<details markdown="1">
<summary>Expand Bin2DCounts</summary>

```typescript
export interface Bin2DCounts {
  x: number;
  y: number;
}
```

</details>

### `Bin2DDataOptions` {#type-bin2ddataoptions}

<details markdown="1">
<summary>Expand Bin2DDataOptions</summary>

```typescript
export interface Bin2DDataOptions {
  id: string;
  source?: string;
  x: string;
  y: string;
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  includeEmpty?: boolean;
  members?: boolean;
  as?: Bin2DOutputFields;
}
```

</details>

Related types: [`Bin2DCounts`](#type-bin2dcounts) · [`Bin2DExtent`](#type-bin2dextent) · [`Bin2DOutputFields`](#type-bin2doutputfields).

### `Bin2DExtent` {#type-bin2dextent}

<details markdown="1">
<summary>Expand Bin2DExtent</summary>

```typescript
export interface Bin2DExtent {
  x?: readonly [number, number];
  y?: readonly [number, number];
}
```

</details>

### `Bin2DOutputFields` {#type-bin2doutputfields}

<details markdown="1">
<summary>Expand Bin2DOutputFields</summary>

```typescript
export interface Bin2DOutputFields {
  x0?: string;
  x1?: string;
  y0?: string;
  y1?: string;
  count?: string;
  members?: string;
}
```

</details>

### `BinDataMode` {#type-bindatamode}

<details markdown="1">
<summary>Expand BinDataMode</summary>

```typescript
type BinDataMode =
  | { maxBins?: number; step?: never; boundaries?: never }
  | { maxBins?: never; step: number; boundaries?: never }
  | {
      maxBins?: never;
      step?: never;
      boundaries: readonly [number, number, ...number[]];
    };
```

</details>

### `BinDataOptions` {#type-bindataoptions}

<details markdown="1">
<summary>Expand BinDataOptions</summary>

```typescript
export type BinDataOptions = {
  id: string;
  source?: string;
  field: string;
  extent?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  includeEmpty?: boolean;
  members?: boolean;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  as?: BinDataOutputFields;
} & BinDataMode;
```

</details>

Related types: [`StatisticalWeight`](#type-statisticalweight) · [`BinDataOutputFields`](#type-bindataoutputfields) · [`BinDataMode`](#type-bindatamode).

### `BinDataOutputFields` {#type-bindataoutputfields}

<details markdown="1">
<summary>Expand BinDataOutputFields</summary>

```typescript
export interface BinDataOutputFields {
  lower?: string;
  upper?: string;
  count?: string;
  members?: string;
}
```

</details>

### `BindMarkDataOptions` {#type-bindmarkdataoptions}

<details markdown="1">
<summary>Expand BindMarkDataOptions</summary>

```typescript
export interface BindMarkDataOptions {
  target: string;
  data: string;
}
```

</details>

### `BinnedHeatmapColorOptions` {#type-binnedheatmapcoloroptions}

<details markdown="1">
<summary>Expand BinnedHeatmapColorOptions</summary>

```typescript
export interface BinnedHeatmapColorOptions {
  scale?:
    | NonPointContinuousColorScaleOptions
    | NonPointDiscretizedColorScaleOptions;
  palette?: Palette;
}
```

</details>

Related types: [`NonPointContinuousColorScaleOptions`](#type-nonpointcontinuouscolorscaleoptions) · [`NonPointDiscretizedColorScaleOptions`](#type-nonpointdiscretizedcolorscaleoptions) · [`Palette`](#type-palette).

### `BinnedHeatmapOptions` {#type-binnedheatmapoptions}

<details markdown="1">
<summary>Expand BinnedHeatmapOptions</summary>

```typescript
export interface BinnedHeatmapOptions extends HeatmapBaseOptions {
  x: string | BinnedHeatmapPositionChannel;
  y: string | BinnedHeatmapPositionChannel;
  bin: HeatmapBinOptions;
  color?: BinnedHeatmapColorOptions;
}
```

</details>

Related types: [`HeatmapBaseOptions`](#type-heatmapbaseoptions) · [`BinnedHeatmapPositionChannel`](#type-binnedheatmappositionchannel) · [`HeatmapBinOptions`](#type-heatmapbinoptions) · [`BinnedHeatmapColorOptions`](#type-binnedheatmapcoloroptions).

### `BinnedHeatmapPositionChannel` {#type-binnedheatmappositionchannel}

<details markdown="1">
<summary>Expand BinnedHeatmapPositionChannel</summary>

```typescript
export interface BinnedHeatmapPositionChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `BoxPlotCategoryChannel` {#type-boxplotcategorychannel}

<details markdown="1">
<summary>Expand BoxPlotCategoryChannel</summary>

```typescript
export interface BoxPlotCategoryChannel {
  field: string;
  fieldType: "nominal" | "ordinal";
  scale?: NonPointBandPositionScaleOptions;
}
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `BoxPlotGuideOptions` {#type-boxplotguideoptions}

<details markdown="1">
<summary>Expand BoxPlotGuideOptions</summary>

```typescript
type BoxPlotGuideOptions = Omit<CartesianGuideOptions, "legend"> & { legend?: false };
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `BoxPlotMeasureChannel` {#type-boxplotmeasurechannel}

<details markdown="1">
<summary>Expand BoxPlotMeasureChannel</summary>

```typescript
export interface BoxPlotMeasureChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `BoxPlotOptions` {#type-boxplotoptions}

<details markdown="1">
<summary>Expand BoxPlotOptions</summary>

```typescript
export interface BoxPlotOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  coordinate?: string;
  whisker?: BoxPlotWhisker;
  width?: { band?: number };
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
  };
  outlier?: StrokeStyleDetails & {
    shape?: PointShape;
    radius?: number;
    opacity?: number;
  };
  guides?: false | BoxPlotGuideOptions;
}
```

</details>

Related types: [`BoxPlotPositionChannel`](#type-boxplotpositionchannel) · [`BoxPlotWhisker`](#type-boxplotwhisker) · [`RectStyleDetails`](#type-rectstyledetails) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`BoxPlotGuideOptions`](#type-boxplotguideoptions).

### `BoxPlotPositionChannel` {#type-boxplotpositionchannel}

<details markdown="1">
<summary>Expand BoxPlotPositionChannel</summary>

```typescript
export type BoxPlotPositionChannel =
  | BoxPlotCategoryChannel
  | BoxPlotMeasureChannel;
```

</details>

Related types: [`BoxPlotCategoryChannel`](#type-boxplotcategorychannel) · [`BoxPlotMeasureChannel`](#type-boxplotmeasurechannel).

### `BoxPlotWhisker` {#type-boxplotwhisker}

<details markdown="1">
<summary>Expand BoxPlotWhisker</summary>

```typescript
export type BoxPlotWhisker =
  | { type?: "tukey"; factor?: number }
  | { type: "minmax"; factor?: never };
```

</details>

### `CAxes` {#type-caxes}

<details markdown="1">
<summary>Expand CAxes</summary>

```typescript
type CAxes = Omit<CartesianAxesOptions, "x" | "y"> & {
  x?: false | CAxis<XAxisPosition>;
  y?: false | CAxis<YAxisPosition>;
};
```

</details>

Related types: [`CartesianAxesOptions`](#type-cartesianaxesoptions) · [`CAxis`](#type-caxis) · [`XAxisPosition`](#type-xaxisposition) · [`YAxisPosition`](#type-yaxisposition).

### `CAxis` {#type-caxis}

<details markdown="1">
<summary>Expand CAxis</summary>

```typescript
type CAxis<P extends string> = Omit<CompleteAxisOptions<P>, "ticksAndLabels"> & {
  ticksAndLabels?: false | Omit<CAxisTicks<P>, "scale" | "position">;
};
```

</details>

Related types: [`CompleteAxisOptions`](#type-completeaxisoptions) · [`CAxisTicks`](#type-caxisticks).

### `CAxisTicks` {#type-caxisticks}

<details markdown="1">
<summary>Expand CAxisTicks</summary>

```typescript
type CAxisTicks<P extends string> = Omit<AxisTicksAndLabelsOptions<P>, "labels"> & {
  labels?: AxisLabelStyleOptions & AxisLabelLayoutOptions;
};
```

</details>

Related types: [`AxisTicksAndLabelsOptions`](#type-axisticksandlabelsoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions).

### `CCategoricalGuides` {#type-ccategoricalguides}

<details markdown="1">
<summary>Expand CCategoricalGuides</summary>

```typescript
type CCategoricalGuides = Omit<CartesianCategoricalGuideOptions, "axes"> & {
  axes?: false | CAxes;
};
```

</details>

Related types: [`CartesianCategoricalGuideOptions`](#type-cartesiancategoricalguideoptions) · [`CAxes`](#type-caxes).

### `CPathGuides` {#type-cpathguides}

<details markdown="1">
<summary>Expand CPathGuides</summary>

```typescript
type CPathGuides = Omit<CartesianPathGuideOptions, "axes"> & {
  axes?: false | CAxes;
};
```

</details>

Related types: [`CartesianPathGuideOptions`](#type-cartesianpathguideoptions) · [`CAxes`](#type-caxes).

### `CanvasOptions` {#type-canvasoptions}

<details markdown="1">
<summary>Expand CanvasOptions</summary>

```typescript
export interface CanvasOptions {
  width?: number;
  height?: number;
  background?: string;
  margin?: number | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
}
```

</details>

### `CartesianAxesOptions` {#type-cartesianaxesoptions}

<details markdown="1">
<summary>Expand CartesianAxesOptions</summary>

```typescript
type CartesianAxesOptions = Omit<
  CreateAxesOptions,
  "coordinate" | "theta" | "radius"
> & {
  coordinate?: { id?: string; type?: "auto" | "cartesian" };
};
```

</details>

Related types: [`CreateAxesOptions`](#type-createaxesoptions).

### `CartesianCategoricalGuideOptions` {#type-cartesiancategoricalguideoptions}

<details markdown="1">
<summary>Expand CartesianCategoricalGuideOptions</summary>

```typescript
type CartesianCategoricalGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<
    FilledMarkLegendOptions,
    "count" | "values" | "gradient" | "labels" | "order"
  > & {
    labels?: CategoricalLegendTextOptions;
    order?: CartesianLegendOrder;
  });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `CartesianGridOptions` {#type-cartesiangridoptions}

<details markdown="1">
<summary>Expand CartesianGridOptions</summary>

```typescript
type CartesianGridOptions = Pick<CreateGridOptions, "horizontal" | "vertical">;
```

</details>

Related types: [`CreateGridOptions`](#type-creategridoptions).

### `CartesianGuideOptions` {#type-cartesianguideoptions}

<details markdown="1">
<summary>Expand CartesianGuideOptions</summary>

```typescript
type CartesianGuideOptions = {
  axes?: false | CartesianAxesOptions;
  grid?: false | CartesianGridOptions;
  legend?: false | (Omit<FilledMarkLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
```

</details>

Related types: [`CartesianAxesOptions`](#type-cartesianaxesoptions) · [`CartesianGridOptions`](#type-cartesiangridoptions) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `CartesianLegendOrder` {#type-cartesianlegendorder}

<details markdown="1">
<summary>Expand CartesianLegendOrder</summary>

```typescript
type CartesianLegendOrder = LegendValueOrder | { channel: "x" | "y"; values?: never };
```

</details>

Related types: [`LegendValueOrder`](#type-legendvalueorder).

### `CartesianPathGuideOptions` {#type-cartesianpathguideoptions}

<details markdown="1">
<summary>Expand CartesianPathGuideOptions</summary>

```typescript
type CartesianPathGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`PathLegendOptions`](#type-pathlegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `CategoricalColorScaleOptions` {#type-categoricalcolorscaleoptions}

<details markdown="1">
<summary>Expand CategoricalColorScaleOptions</summary>

```typescript
export type CategoricalColorScaleOptions =
  NonPointCategoricalColorScaleOptions & { unknown?: string };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions).

### `CategoricalEncodingOptions` {#type-categoricalencodingoptions}

<details markdown="1">
<summary>Expand CategoricalEncodingOptions</summary>

```typescript
export interface CategoricalEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal" | "ordinal";
  scale?: CategoricalColorScaleOptions;
  palette?: Palette;
  layout?: ColorLayout;
}
```

</details>

Related types: [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ColorLayout`](#type-colorlayout).

### `CategoricalLegendTextOptions` {#type-categoricallegendtextoptions}

<details markdown="1">
<summary>Expand CategoricalLegendTextOptions</summary>

```typescript
type CategoricalLegendTextOptions = {
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  format?: "auto";
};
```

</details>

### `CategoricalPolarAxesOptions` {#type-categoricalpolaraxesoptions}

<details markdown="1">
<summary>Expand CategoricalPolarAxesOptions</summary>

```typescript
type CategoricalPolarAxesOptions = Omit<
  Pick<CreateAxesOptions, "theta" | "radius">,
  "theta"
> & {
  coordinate?: { id?: string; type?: "auto" | "polar" };
  theta?: false | CategoricalThetaAxisOptions;
};
```

</details>

Related types: [`CreateAxesOptions`](#type-createaxesoptions) · [`CategoricalThetaAxisOptions`](#type-categoricalthetaaxisoptions).

### `CategoricalPolarGridOptions` {#type-categoricalpolargridoptions}

<details markdown="1">
<summary>Expand CategoricalPolarGridOptions</summary>

```typescript
type CategoricalPolarGridOptions = Omit<
  Pick<CreateGridOptions, "theta" | "radial">,
  "theta"
> & {
  theta?: boolean | CategoricalThetaGridOptions;
};
```

</details>

Related types: [`CreateGridOptions`](#type-creategridoptions) · [`CategoricalThetaGridOptions`](#type-categoricalthetagridoptions).

### `CategoricalPositionScaleOptions` {#type-categoricalpositionscaleoptions}

<details markdown="1">
<summary>Expand CategoricalPositionScaleOptions</summary>

```typescript
export type CategoricalPositionScaleOptions =
  | BandPositionScaleOptions
  | PointPositionScaleOptions;
```

</details>

Related types: [`BandPositionScaleOptions`](#type-bandpositionscaleoptions) · [`PointPositionScaleOptions`](#type-pointpositionscaleoptions).

### `CategoricalThetaAxisOptions` {#type-categoricalthetaaxisoptions}

<details markdown="1">
<summary>Expand CategoricalThetaAxisOptions</summary>

```typescript
type CategoricalThetaAxisOptions = Omit<CompletePolarAxisOptions, "ticksAndLabels"> & {
  ticksAndLabels?: false | CategoricalThetaTicksAndLabelsOptions;
};
```

</details>

Related types: [`CompletePolarAxisOptions`](#type-completepolaraxisoptions) · [`CategoricalThetaTicksAndLabelsOptions`](#type-categoricalthetaticksandlabelsoptions).

### `CategoricalThetaGridOptions` {#type-categoricalthetagridoptions}

<details markdown="1">
<summary>Expand CategoricalThetaGridOptions</summary>

```typescript
type CategoricalThetaGridOptions = Omit<PolarGridOptions, "count"> & {
  count?: never;
};
```

</details>

Related types: [`PolarGridOptions`](#type-polargridoptions).

### `CategoricalThetaTicksAndLabelsOptions` {#type-categoricalthetaticksandlabelsoptions}

<details markdown="1">
<summary>Expand CategoricalThetaTicksAndLabelsOptions</summary>

```typescript
type CategoricalThetaTicksAndLabelsOptions = Omit<
  PolarTicksAndLabelsOptions,
  "count" | "labels"
> & {
  count?: never;
  labels?: Omit<AxisLabelStyleOptions, "format"> & DisplayLabelOptions &
    { format?: "auto" };
};
```

</details>

Related types: [`PolarTicksAndLabelsOptions`](#type-polarticksandlabelsoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `CategoryDensityPlacement` {#type-categorydensityplacement}

<details markdown="1">
<summary>Expand CategoryDensityPlacement</summary>

```typescript
export interface CategoryDensityPlacement {
  type: "category";
  side?: DensityPlacementSide;
  width?: DensityPlacementWidth;
  split?: DensityPlacementSplit;
  scale?: NonPointBandPositionScaleOptions;
}
```

</details>

Related types: [`DensityPlacementSide`](#type-densityplacementside) · [`DensityPlacementWidth`](#type-densityplacementwidth) · [`DensityPlacementSplit`](#type-densityplacementsplit) · [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `CategoryOrder` {#type-categoryorder}

<details markdown="1">
<summary>Expand CategoryOrder</summary>

```typescript
export type CategoryOrder =
  | {
      values: readonly CategoryValue[];
      by?: never;
      direction?: never;
    }
  | {
      values?: never;
      by: "category" | "count" | CategoryOrderSummary;
      direction?: "ascending" | "descending";
    };
```

</details>

Related types: [`CategoryValue`](#type-categoryvalue) · [`CategoryOrderSummary`](#type-categoryordersummary).

### `CategoryOrderSummary` {#type-categoryordersummary}

<details markdown="1">
<summary>Expand CategoryOrderSummary</summary>

```typescript
export type CategoryOrderSummary = {
  field: string;
  aggregate: "sum" | "mean" | "min" | "max";
};
```

</details>

### `CategoryValue` {#type-categoryvalue}

<details markdown="1">
<summary>Expand CategoryValue</summary>

```typescript
export type CategoryValue = string | number | boolean;
```

</details>

### `ColorEncodingOptions` {#type-colorencodingoptions}

<details markdown="1">
<summary>Expand ColorEncodingOptions</summary>

```typescript
export type ColorEncodingOptions =
  | CategoricalEncodingOptions
  | {
      field: string;
      target?: string;
      fieldType: "quantitative";
      aggregate?: AggregateOperation;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      palette?: Palette;
      layout?: never;
    }
  | {
      field: string;
      target?: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
      layout?: never;
    };
```

</details>

Related types: [`CategoricalEncodingOptions`](#type-categoricalencodingoptions) · [`AggregateOperation`](#type-aggregateoperation) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions) · [`Palette`](#type-palette) · [`TemporalInputUnit`](#type-temporalinputunit).

### `ColorGuides` {#type-colorguides}

<details markdown="1">
<summary>Expand ColorGuides</summary>

```typescript
type ColorGuides = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<FilledMarkLegendOptions, "values" | "order"> & {
    order?: CartesianLegendOrder;
  });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `ColorLayout` {#type-colorlayout}

<details markdown="1">
<summary>Expand ColorLayout</summary>

```typescript
export type ColorLayout =
  | "stack"
  | "fill"
  | "group"
  | "overlay"
  | "diverging"
  | "center";
```

</details>

### `CompleteAxisOptions` {#type-completeaxisoptions}

<details markdown="1">
<summary>Expand CompleteAxisOptions</summary>

```typescript
export interface CompleteAxisOptions<P extends string> {
  scale?: string;
  coordinate?: string;
  position?: P;
  line?: false | AxisLineStyleOptions;
  ticksAndLabels?: false | Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position">;
  title?: false | Omit<AxisTitleOptions<P>, "scale" | "position">;
}
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`AxisTicksAndLabelsOptions`](#type-axisticksandlabelsoptions) · [`AxisTitleOptions`](#type-axistitleoptions).

### `CompleteDataBaseOptions` {#type-completedatabaseoptions}

<details markdown="1">
<summary>Expand CompleteDataBaseOptions</summary>

```typescript
type CompleteDataBaseOptions = {
  id: string;
  source?: string;
  key: string;
  groupBy?: string | readonly string[];
  fill?: Readonly<Record<string, DatasetScalar>>;
  members?: string;
};
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar).

### `CompleteDataOptions` {#type-completedataoptions}

<details markdown="1">
<summary>Expand CompleteDataOptions</summary>

```typescript
export type CompleteDataOptions = CompleteDataBaseOptions & (
  | { values: readonly [DatasetScalar, ...DatasetScalar[]]; sequence?: never }
  | {
      values?: never;
      sequence: { start: number; end: number; step: number };
    }
  | { values?: never; sequence?: never }
);
```

</details>

Related types: [`CompleteDataBaseOptions`](#type-completedatabaseoptions) · [`DatasetScalar`](#type-datasetscalar).

### `CompletePolarAxisOptions` {#type-completepolaraxisoptions}

<details markdown="1">
<summary>Expand CompletePolarAxisOptions</summary>

```typescript
export interface CompletePolarAxisOptions extends Omit<PolarGuideResourceOptions, "angle"> {
  line?: false | AxisLineStyleOptions;
  ticksAndLabels?: false | PolarTicksAndLabelsOptions;
  title?: false | PolarTitleOptions;
}
```

</details>

Related types: [`PolarGuideResourceOptions`](#type-polarguideresourceoptions) · [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`PolarTicksAndLabelsOptions`](#type-polarticksandlabelsoptions) · [`PolarTitleOptions`](#type-polartitleoptions).

### `CompleteRadialAxisOptions` {#type-completeradialaxisoptions}

<details markdown="1">
<summary>Expand CompleteRadialAxisOptions</summary>

```typescript
export interface CompleteRadialAxisOptions
  extends Omit<CompletePolarAxisOptions, "title"> {
  angle?: number;
  title?: false | RadialTitleOptions;
}
```

</details>

Related types: [`CompletePolarAxisOptions`](#type-completepolaraxisoptions) · [`RadialTitleOptions`](#type-radialtitleoptions).

### `CompleteThetaAxisOptions` {#type-completethetaaxisoptions}

<details markdown="1">
<summary>Expand CompleteThetaAxisOptions</summary>

```typescript
export interface CompleteThetaAxisOptions
  extends Omit<CompletePolarAxisOptions, "ticksAndLabels"> {
  ticksAndLabels?: false | ThetaTicksAndLabelsOptions;
}
```

</details>

Related types: [`CompletePolarAxisOptions`](#type-completepolaraxisoptions) · [`ThetaTicksAndLabelsOptions`](#type-thetaticksandlabelsoptions).

### `CompositionAlign` {#type-compositionalign}

<details markdown="1">
<summary>Expand CompositionAlign</summary>

```typescript
export type CompositionAlign = "start" | "center" | "end";
```

</details>

### `CompositionPadding` {#type-compositionpadding}

<details markdown="1">
<summary>Expand CompositionPadding</summary>

```typescript
export interface CompositionPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}
```

</details>

### `ComputedDataOptions` {#type-computeddataoptions}

<details markdown="1">
<summary>Expand ComputedDataOptions</summary>

```typescript
export interface ComputedDataOptions {
  id: string;
  source?: string;
  as: string;
  expression: ComputedExpression;
}
```

</details>

Related types: [`ComputedExpression`](#type-computedexpression).

### `ComputedExpression` {#type-computedexpression}

<details markdown="1">
<summary>Expand ComputedExpression</summary>

```typescript
export type ComputedExpression =
  | { readonly field: string }
  | { readonly constant: number | string | boolean | null }
  | {
      readonly op: "negate" | "absolute" | "log" | "sqrt" | "not" | "isNull";
      readonly operand: ComputedExpression;
    }
  | {
      readonly op: "add" | "subtract" | "multiply" | "divide" |
        "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      readonly left: ComputedExpression;
      readonly right: ComputedExpression;
    }
  | {
      readonly op: "and" | "or" | "coalesce";
      readonly operands: readonly [ComputedExpression, ComputedExpression, ...ComputedExpression[]];
    }
  | {
      readonly op: "concat";
      readonly operands: readonly [ComputedExpression, ...ComputedExpression[]];
    }
  | {
      readonly op: "if";
      readonly condition: ComputedExpression;
      readonly then: ComputedExpression;
      readonly else: ComputedExpression;
    };
```

</details>

### `ConfidenceIntervalMethod` {#type-confidenceintervalmethod}

<details markdown="1">
<summary>Expand ConfidenceIntervalMethod</summary>

```typescript
export type ConfidenceIntervalMethod = "normal" | "student-t";
```

</details>

### `ContinuousColorInterpolation` {#type-continuouscolorinterpolation}

<details markdown="1">
<summary>Expand ContinuousColorInterpolation</summary>

```typescript
export type ContinuousColorInterpolation =
  | "rgb"
  | "hsl"
  | "hsl-long"
  | "lab"
  | "hcl"
  | "hcl-long"
  | "cubehelix"
  | "cubehelix-long";
```

</details>

### `ContinuousColorScaleOptions` {#type-continuouscolorscaleoptions}

<details markdown="1">
<summary>Expand ContinuousColorScaleOptions</summary>

```typescript
export type ContinuousColorScaleOptions =
  NonPointContinuousColorScaleOptions & { unknown?: string };
```

</details>

Related types: [`NonPointContinuousColorScaleOptions`](#type-nonpointcontinuouscolorscaleoptions).

### `ContinuousSizeScaleOptions` {#type-continuoussizescaleoptions}

<details markdown="1">
<summary>Expand ContinuousSizeScaleOptions</summary>

```typescript
type ContinuousSizeScaleOptions = SizeScaleCommonOptions &
  ScaleFields<"clamp"> & {
    domain?: "auto" | readonly [number, number];
    range?: "auto" | readonly [number, number];
  };
```

</details>

Related types: [`SizeScaleCommonOptions`](#type-sizescalecommonoptions) · [`ScaleFields`](#type-scalefields).

### `CoordinateAspect` {#type-coordinateaspect}

<details markdown="1">
<summary>Expand CoordinateAspect</summary>

```typescript
export type CoordinateAspect = "auto" | {
  mode: "frame" | "data";
  ratio: number;
  alignX?: CoordinateAspectAlign;
  alignY?: CoordinateAspectAlign;
};
```

</details>

Related types: [`CoordinateAspectAlign`](#type-coordinateaspectalign).

### `CoordinateAspectAlign` {#type-coordinateaspectalign}

<details markdown="1">
<summary>Expand CoordinateAspectAlign</summary>

```typescript
export type CoordinateAspectAlign = "start" | "center" | "end";
```

</details>

### `CreateAnnotationOptions` {#type-createannotationoptions}

<details markdown="1">
<summary>Expand CreateAnnotationOptions</summary>

```typescript
export type CreateAnnotationOptions = AnnotationBaseOptions & AnnotationAnchor;
```

</details>

Related types: [`AnnotationBaseOptions`](#type-annotationbaseoptions) · [`AnnotationAnchor`](#type-annotationanchor).

### `CreateAreaPlotOptions` {#type-createareaplotoptions}

<details markdown="1">
<summary>Expand CreateAreaPlotOptions</summary>

```typescript
export type CreateAreaPlotOptions = {
  id?: string; data?: string; coordinate?: string;
  groupBy?: string | readonly [string, ...string[]];
  layout?: Exclude<ColorLayout, "group">; missing?: "error" | "break";
  color?: string | { field: string; fieldType?: "nominal" | "ordinal"; scale?: NonPointCategoricalColorScaleOptions; palette?: Palette };
  area?: StrokeStyleDetails & { fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | DensityPlotGuideOptions;
} & (
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: number }
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Extract<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: never }
  | { valueChannel: "x"; x: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: number }
  | { valueChannel: "x"; x: Extract<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: never }
);
```

</details>

Related types: [`ColorLayout`](#type-colorlayout) · [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation) · [`DensityPlotGuideOptions`](#type-densityplotguideoptions) · [`AreaPlotIndependentChannel`](#type-areaplotindependentchannel) · [`AreaPlotMeasureChannel`](#type-areaplotmeasurechannel).

### `CreateAxesOptions` {#type-createaxesoptions}

<details markdown="1">
<summary>Expand CreateAxesOptions</summary>

```typescript
export interface CreateAxesOptions {
  coordinate?: {
    id?: string;
    type?: "auto" | "cartesian" | "polar" | "parallel";
  };
  x?: false | CompleteAxisOptions<XAxisPosition>;
  y?: false | CompleteAxisOptions<YAxisPosition>;
  theta?: false | CompletePolarAxisOptions;
  radius?: false | CompleteRadialAxisOptions;
}
```

</details>

Related types: [`CompleteAxisOptions`](#type-completeaxisoptions) · [`XAxisPosition`](#type-xaxisposition) · [`YAxisPosition`](#type-yaxisposition) · [`CompletePolarAxisOptions`](#type-completepolaraxisoptions) · [`CompleteRadialAxisOptions`](#type-completeradialaxisoptions).

### `CreateBarPlotOptions` {#type-createbarplotoptions}

<details markdown="1">
<summary>Expand CreateBarPlotOptions</summary>

```typescript
export type CreateBarPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BarColorChannel;
  width?: Omit<BarWidthOptions, "target">;
  bar?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | ColorGuides;
} & (
  | { x: BarFieldPosition<BandPositionChannel>; y: BarFieldPosition<BarYPositionChannel> }
  | { x: BarRangePositionChannel; y: BarFieldPosition<BandPositionChannel> }
  | { x: BarFieldPosition<BandPositionChannel>; y: BarRangePositionChannel }
);
```

</details>

Related types: [`BarColorChannel`](#type-barcolorchannel) · [`BarWidthOptions`](#type-barwidthoptions) · [`RectStyleDetails`](#type-rectstyledetails) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`ColorGuides`](#type-colorguides) · [`BarFieldPosition`](#type-barfieldposition) · [`BandPositionChannel`](#type-bandpositionchannel) · [`BarYPositionChannel`](#type-barypositionchannel) · [`BarRangePositionChannel`](#type-barrangepositionchannel).

### `CreateBeeswarmPlotOptions` {#type-createbeeswarmplotoptions}

<details markdown="1">
<summary>Expand CreateBeeswarmPlotOptions</summary>

```typescript
export type CreateBeeswarmPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  packing?: false | BeeswarmPackingOptions;
  guides?: false | CartesianGuideOptions;
} & (
  | { x: RugMeasureChannel; y: StripCategoryChannel }
  | { x: StripCategoryChannel; y: RugMeasureChannel }
);
```

</details>

Related types: [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`BeeswarmPackingOptions`](#type-beeswarmpackingoptions) · [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`RugMeasureChannel`](#type-rugmeasurechannel) · [`StripCategoryChannel`](#type-stripcategorychannel).

### `CreateCoordinateOptions` {#type-createcoordinateoptions}

<details markdown="1">
<summary>Expand CreateCoordinateOptions</summary>

```typescript
export interface CreateCoordinateOptions {
  id?: string;
  type?: "cartesian" | "polar" | "parallel";
  layers?: readonly string[];
}
```

</details>

### `CreateDataOptions` {#type-createdataoptions}

<details markdown="1">
<summary>Expand CreateDataOptions</summary>

```typescript
export interface CreateDataOptions<Row extends object> {
  id?: string;
  values: readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[];
  schema?: SourceSchemaInput;
}
```

</details>

Related types: [`StoredCell`](#type-storedcell) · [`SourceSchemaInput`](#type-sourceschemainput).

### `CreateDensityPlotOptions` {#type-createdensityplotoptions}

<details markdown="1">
<summary>Expand CreateDensityPlotOptions</summary>

```typescript
export interface CreateDensityPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  groupBy?: string | false;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight;
  as?: readonly [string, string];
  densityChannel?: "x" | "y";
  valueScale?: NonPointQuantitativePositionScaleOptions;
  densityScale?: NonPointZeroSupportingPositionScaleOptions;
  color?: string | {
    field: string;
    fieldType?: "nominal" | "ordinal";
    scale?: NonPointCategoricalColorScaleOptions;
    palette?: Palette;
    layout?: "overlay";
  };
  area?: StrokeStyleDetails & { fill?: string; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | DensityPlotGuideOptions;
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization) · [`StatisticalWeight`](#type-statisticalweight) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation) · [`DensityPlotGuideOptions`](#type-densityplotguideoptions).

### `CreateDerivedDataOptions` {#type-createderiveddataoptions}

<details markdown="1">
<summary>Expand CreateDerivedDataOptions</summary>

```typescript
export interface CreateDerivedDataOptions {
  id: string;
  source: string;
  transform: readonly [DatasetTransform];
}
```

</details>

Related types: [`DatasetTransform`](#type-datasettransform).

### `CreateDotPlotOptions` {#type-createdotplotoptions}

<details markdown="1">
<summary>Expand CreateDotPlotOptions</summary>

```typescript
export interface CreateDotPlotOptions extends EndpointPlotBaseOptions {
  value: EndpointValueChannel;
  point?: CreateScatterPlotOptions["point"];
  labels?: false | EndpointLabelOptions;
}
```

</details>

Related types: [`EndpointPlotBaseOptions`](#type-endpointplotbaseoptions) · [`EndpointValueChannel`](#type-endpointvaluechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`EndpointLabelOptions`](#type-endpointlabeloptions).

### `CreateDumbbellPlotOptions` {#type-createdumbbellplotoptions}

<details markdown="1">
<summary>Expand CreateDumbbellPlotOptions</summary>

```typescript
export interface CreateDumbbellPlotOptions extends EndpointPlotBaseOptions {
  start: EndpointValueChannel;
  end: EndpointValueChannel;
  startPoint?: CreateScatterPlotOptions["point"];
  endPoint?: CreateScatterPlotOptions["point"];
  connector?: RuleStyleOptions;
  labels?: false | (EndpointLabelOptions & { endpoint?: "start" | "end" | "both" });
}
```

</details>

Related types: [`EndpointPlotBaseOptions`](#type-endpointplotbaseoptions) · [`EndpointValueChannel`](#type-endpointvaluechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`RuleStyleOptions`](#type-rulestyleoptions) · [`EndpointLabelOptions`](#type-endpointlabeloptions).

### `CreateECDFPlotOptions` {#type-createecdfplotoptions}

<details markdown="1">
<summary>Expand CreateECDFPlotOptions</summary>

```typescript
export interface CreateECDFPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  groupBy?: string | readonly [string, ...string[]];
  weight?: string;
  missing?: "drop" | "error";
  as?: ECDFOutputFields;
  color?: string | LineCategoricalColorChannel;
  line?: StrokeStyleDetails & { strokeWidth?: number; stroke?: string; opacity?: number };
  labels?: false | EndpointLabelOptions;
  guides?: false | CartesianPathGuideOptions;
}
```

</details>

Related types: [`ECDFOutputFields`](#type-ecdfoutputfields) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`EndpointLabelOptions`](#type-endpointlabeloptions) · [`CartesianPathGuideOptions`](#type-cartesianpathguideoptions).

### `CreateGridOptions` {#type-creategridoptions}

<details markdown="1">
<summary>Expand CreateGridOptions</summary>

```typescript
export interface CreateGridOptions {
  horizontal?: boolean | GridDirectionOptions;
  vertical?: boolean | GridDirectionOptions;
  theta?: boolean | PolarGridOptions;
  radial?: boolean | PolarGridOptions;
}
```

</details>

Related types: [`GridDirectionOptions`](#type-griddirectionoptions) · [`PolarGridOptions`](#type-polargridoptions).

### `CreateGuidesOptions` {#type-createguidesoptions}

<details markdown="1">
<summary>Expand CreateGuidesOptions</summary>

```typescript
export interface CreateGuidesOptions {
  axes?: false | CreateAxesOptions;
  grid?: false | CreateGridOptions;
  legend?: false | LegendOptions;
}
```

</details>

Related types: [`CreateAxesOptions`](#type-createaxesoptions) · [`CreateGridOptions`](#type-creategridoptions) · [`LegendOptions`](#type-legendoptions).

### `CreateHeatmapOptions` {#type-createheatmapoptions}

<details markdown="1">
<summary>Expand CreateHeatmapOptions</summary>

```typescript
export type CreateHeatmapOptions =
  | PreGriddedHeatmapOptions
  | BinnedHeatmapOptions;
```

</details>

Related types: [`PreGriddedHeatmapOptions`](#type-pregriddedheatmapoptions) · [`BinnedHeatmapOptions`](#type-binnedheatmapoptions).

### `CreateHistogramOptions` {#type-createhistogramoptions}

<details markdown="1">
<summary>Expand CreateHistogramOptions</summary>

```typescript
export type CreateHistogramOptions = BasicHistogramEncoding & {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  color?: HistogramCategoricalColorChannel;
  bar?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | CartesianCategoricalGuideOptions;
};
```

</details>

Related types: [`BasicHistogramEncoding`](#type-basichistogramencoding) · [`HistogramCategoricalColorChannel`](#type-histogramcategoricalcolorchannel) · [`RectStyleDetails`](#type-rectstyledetails) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`CartesianCategoricalGuideOptions`](#type-cartesiancategoricalguideoptions).

### `CreateHorizonPlotOptions` {#type-createhorizonplotoptions}

<details markdown="1">
<summary>Expand CreateHorizonPlotOptions</summary>

```typescript
export interface CreateHorizonPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: string | HorizonXEncoding;
  y: string | HorizonYEncoding;
  groupBy?: string | false;
  bands?: number;
  baseline?: number;
  extent?: "auto" | number;
  resolve?: HorizonResolution;
  missing?: HorizonMissingPolicy;
  overflow?: HorizonOverflowPolicy;
  palette?: HorizonPaletteOptions;
  area?: StrokeStyleDetails & { opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | HorizonPlotGuideOptions;
}
```

</details>

Related types: [`HorizonXEncoding`](#type-horizonxencoding) · [`HorizonYEncoding`](#type-horizonyencoding) · [`HorizonResolution`](#type-horizonresolution) · [`HorizonMissingPolicy`](#type-horizonmissingpolicy) · [`HorizonOverflowPolicy`](#type-horizonoverflowpolicy) · [`HorizonPaletteOptions`](#type-horizonpaletteoptions) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation) · [`HorizonPlotGuideOptions`](#type-horizonplotguideoptions).

### `CreateIntervalPlotOptions` {#type-createintervalplotoptions}

<details markdown="1">
<summary>Expand CreateIntervalPlotOptions</summary>

```typescript
export type CreateIntervalPlotOptions = IntervalPlotBaseOptions & (
  | {
      x: string | ErrorBarPositionChannel;
      y: string | ErrorBarIntervalChannel;
    }
  | {
      x: string | ErrorBarIntervalChannel;
      y: string | ErrorBarPositionChannel;
    }
);
```

</details>

Related types: [`IntervalPlotBaseOptions`](#type-intervalplotbaseoptions) · [`ErrorBarPositionChannel`](#type-errorbarpositionchannel) · [`ErrorBarIntervalChannel`](#type-errorbarintervalchannel).

### `CreateLinePlotOptions` {#type-createlineplotoptions}

<details markdown="1">
<summary>Expand CreateLinePlotOptions</summary>

```typescript
export interface CreateLinePlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: LineXPositionChannel;
  y: LineYPositionChannel;
  color?: LineCategoricalColorChannel;
  groupBy?: string | readonly [string, ...string[]];
  strokeDash?: BasicStrokeDashChannel;
  line?: StrokeStyleDetails & {
    strokeWidth?: number;
    curve?: CurveInterpolation;
    tension?: number;
    stroke?: string;
    opacity?: number;
    closed?: false;
  };
  guides?: false | (Omit<CPathGuides, "legend"> & {
    legend?: false | (Omit<PathLegendOptions, "order"> & {
      order?: LegendValueOrder | { channel: "x"; values?: never };
    });
  });
}
```

</details>

Related types: [`LineXPositionChannel`](#type-linexpositionchannel) · [`LineYPositionChannel`](#type-lineypositionchannel) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation) · [`CPathGuides`](#type-cpathguides) · [`PathLegendOptions`](#type-pathlegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `CreateLollipopPlotOptions` {#type-createlollipopplotoptions}

<details markdown="1">
<summary>Expand CreateLollipopPlotOptions</summary>

```typescript
export interface CreateLollipopPlotOptions extends EndpointPlotBaseOptions {
  value: EndpointValueChannel;
  baseline?: number;
  point?: CreateScatterPlotOptions["point"];
  stem?: RuleStyleOptions;
  labels?: false | EndpointLabelOptions;
}
```

</details>

Related types: [`EndpointPlotBaseOptions`](#type-endpointplotbaseoptions) · [`EndpointValueChannel`](#type-endpointvaluechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`RuleStyleOptions`](#type-rulestyleoptions) · [`EndpointLabelOptions`](#type-endpointlabeloptions).

### `CreateMarkLabelsOptions` {#type-createmarklabelsoptions}

<details markdown="1">
<summary>Expand CreateMarkLabelsOptions</summary>

```typescript
export type CreateMarkLabelsOptions = Omit<TextMarkOptions, "data" | "text"> & {
  layout?: false | Omit<LabelLayoutOptions, "target">;
  placement?: MarkLabelPlacement;
} & (
  | (TextEncodingOptions extends infer Options
      ? Options extends TextEncodingOptions ? Omit<Options, "target"> : never
      : never)
  | { field?: never; value?: never; content?: never; normalizeBy?: never; format?: TextFormat }
) & MarkLabelSelectionOptions;

/** Replace the requested final-item membership of one attached label layer. */
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`LabelLayoutOptions`](#type-labellayoutoptions) · [`MarkLabelPlacement`](#type-marklabelplacement) · [`TextEncodingOptions`](#type-textencodingoptions) · [`TextFormat`](#type-textformat) · [`MarkLabelSelectionOptions`](#type-marklabelselectionoptions).

### `CreateParallelAxisOptions` {#type-createparallelaxisoptions}

<details markdown="1">
<summary>Expand CreateParallelAxisOptions</summary>

```typescript
export type CreateParallelAxisOptions = ParallelAxisComponentsOptions;
```

</details>

Related types: [`ParallelAxisComponentsOptions`](#type-parallelaxiscomponentsoptions).

### `CreateParallelCoordinatesOptions` {#type-createparallelcoordinatesoptions}

<details markdown="1">
<summary>Expand CreateParallelCoordinatesOptions</summary>

```typescript
export interface CreateParallelCoordinatesOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]];
  key?: string;
  missing?: ParallelMissingPolicy;
  color?: LineCategoricalColorChannel;
  strokeDash?: BasicStrokeDashChannel;
  line?: StrokeStyleDetails & {
    strokeWidth?: number;
    stroke?: string;
    opacity?: number;
    curve?: "linear";
    closed?: false;
  };
  guides?: false | ParallelGuideOptions;
}
```

</details>

Related types: [`ParallelDimension`](#type-paralleldimension) · [`ParallelMissingPolicy`](#type-parallelmissingpolicy) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ParallelGuideOptions`](#type-parallelguideoptions).

### `CreatePiePlotOptions` {#type-createpieplotoptions}

<details markdown="1">
<summary>Expand CreatePiePlotOptions</summary>

```typescript
export type CreatePiePlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  category: PieCategory;
  color?: false | PieColor;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: number; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | { axes?: false; grid?: false; legend?: false | PieLegendOptions };
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate: "sum" });
```

</details>

Related types: [`PieCategory`](#type-piecategory) · [`PieColor`](#type-piecolor) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ArcInnerRadius`](#type-arcinnerradius) · [`PieLegendOptions`](#type-pielegendoptions).

### `CreatePolarLinePlotOptions` {#type-createpolarlineplotoptions}

<details markdown="1">
<summary>Expand CreatePolarLinePlotOptions</summary>

```typescript
export interface CreatePolarLinePlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  theta: PolarThetaChannel;
  radius: PolarRadiusChannel;
  color?: LineCategoricalColorChannel;
  groupBy?: string | readonly [string, ...string[]];
  strokeDash?: BasicStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "closed" | "curve" | "tension"> & {
    curve?: "linear";
    closed?: boolean;
  };
  guides?: false | PolarPathGuideOptions;
}
```

</details>

Related types: [`PolarThetaChannel`](#type-polarthetachannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`CreateLinePlotOptions`](#type-createlineplotoptions) · [`PolarPathGuideOptions`](#type-polarpathguideoptions).

### `CreatePolarScatterPlotOptions` {#type-createpolarscatterplotoptions}

<details markdown="1">
<summary>Expand CreatePolarScatterPlotOptions</summary>

```typescript
export interface CreatePolarScatterPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  theta: PolarThetaChannel;
  radius: PolarRadiusChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: CreateScatterPlotOptions["point"];
  guides?: false | PolarPointGuideOptions;
}
```

</details>

Related types: [`PolarThetaChannel`](#type-polarthetachannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`PolarPointGuideOptions`](#type-polarpointguideoptions).

### `CreateRadarPlotOptions` {#type-createradarplotoptions}

<details markdown="1">
<summary>Expand CreateRadarPlotOptions</summary>

```typescript
export type CreateRadarPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  groupBy?: string | readonly [string, ...string[]];
  order?: readonly [
    RadarCategoryValue,
    RadarCategoryValue,
    RadarCategoryValue,
    ...RadarCategoryValue[]
  ];
  color?: LineCategoricalColorChannel;
  strokeDash?: BasicStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "closed" | "curve" | "tension"> & {
    curve?: "linear";
    closed?: true;
  };
  guides?: false | RadarGuideOptions;
} & (
  | { category: RadarCategoryChannel; value: PolarRadiusChannel; wide?: never }
  | { wide: RadarWideOptions; category?: never; value?: never }
);
```

</details>

Related types: [`RadarCategoryValue`](#type-radarcategoryvalue) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`CreateLinePlotOptions`](#type-createlineplotoptions) · [`RadarGuideOptions`](#type-radarguideoptions) · [`RadarCategoryChannel`](#type-radarcategorychannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`RadarWideOptions`](#type-radarwideoptions).

### `CreateRadialAxisLabelsOptions` {#type-createradialaxislabelsoptions}

<details markdown="1">
<summary>Expand CreateRadialAxisLabelsOptions</summary>

```typescript
export type CreateRadialAxisLabelsOptions = Omit<PolarLabelOptions, "count" | "values"> &
  PolarAxisTickSelection & PolarGuideResourceOptions;
```

</details>

Related types: [`PolarLabelOptions`](#type-polarlabeloptions) · [`PolarAxisTickSelection`](#type-polaraxistickselection) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateRadialAxisLineOptions` {#type-createradialaxislineoptions}

<details markdown="1">
<summary>Expand CreateRadialAxisLineOptions</summary>

```typescript
export type CreateRadialAxisLineOptions = AxisLineStyleOptions & PolarGuideResourceOptions;
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateRadialAxisTicksOptions` {#type-createradialaxisticksoptions}

<details markdown="1">
<summary>Expand CreateRadialAxisTicksOptions</summary>

```typescript
export type CreateRadialAxisTicksOptions = Omit<PolarTickOptions, "count" | "values"> &
  PolarAxisTickSelection & PolarGuideResourceOptions;
```

</details>

Related types: [`PolarTickOptions`](#type-polartickoptions) · [`PolarAxisTickSelection`](#type-polaraxistickselection) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateRadialAxisTitleOptions` {#type-createradialaxistitleoptions}

<details markdown="1">
<summary>Expand CreateRadialAxisTitleOptions</summary>

```typescript
export type CreateRadialAxisTitleOptions = RadialTitleOptions & PolarGuideResourceOptions;
```

</details>

Related types: [`RadialTitleOptions`](#type-radialtitleoptions) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateRadialBarPlotOptions` {#type-createradialbarplotoptions}

<details markdown="1">
<summary>Expand CreateRadialBarPlotOptions</summary>

```typescript
export type CreateRadialBarPlotOptions = CreateRosePlotOptions;
```

</details>

Related types: [`CreateRosePlotOptions`](#type-createroseplotoptions).

### `CreateRaincloudPlotOptions` {#type-createraincloudplotoptions}

<details markdown="1">
<summary>Expand CreateRaincloudPlotOptions</summary>

```typescript
export interface CreateRaincloudPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  category: RaincloudCategoryChannel;
  value: RaincloudValueChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | RaincloudDensityOptions;
  summary?: false | RaincloudSummaryOptions;
  points?: false | RaincloudPointsOptions;
  color?: LineCategoricalColorChannel;
  guides?: false | CartesianCategoricalGuideOptions;
}
```

</details>

Related types: [`RaincloudCategoryChannel`](#type-raincloudcategorychannel) · [`RaincloudValueChannel`](#type-raincloudvaluechannel) · [`RaincloudDensityOptions`](#type-rainclouddensityoptions) · [`RaincloudSummaryOptions`](#type-raincloudsummaryoptions) · [`RaincloudPointsOptions`](#type-raincloudpointsoptions) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`CartesianCategoricalGuideOptions`](#type-cartesiancategoricalguideoptions).

### `CreateReferenceBandOptions` {#type-createreferencebandoptions}

<details markdown="1">
<summary>Expand CreateReferenceBandOptions</summary>

```typescript
export type CreateReferenceBandOptions =
  | (Omit<RectMarkOptions, "data"> &
      ReferenceBinding<readonly [unknown, unknown], readonly [number, number]>)
  | (DynamicReferenceBinding & Omit<RectMarkOptions, "id" | "data" | "source"> & {
      readonly statistics: readonly [ReferenceStatistic, ReferenceStatistic];
    });
```

</details>

Related types: [`RectMarkOptions`](#type-rectmarkoptions) · [`ReferenceBinding`](#type-referencebinding) · [`DynamicReferenceBinding`](#type-dynamicreferencebinding) · [`ReferenceStatistic`](#type-referencestatistic).

### `CreateReferenceLineOptions` {#type-createreferencelineoptions}

<details markdown="1">
<summary>Expand CreateReferenceLineOptions</summary>

```typescript
export type CreateReferenceLineOptions =
  | ({ id?: string } & RuleStyleOptions & ReferenceBinding<unknown, number>)
  | (DynamicReferenceBinding & RuleStyleOptions & {
      readonly statistic: ReferenceStatistic;
    });
```

</details>

Related types: [`RuleStyleOptions`](#type-rulestyleoptions) · [`ReferenceBinding`](#type-referencebinding) · [`DynamicReferenceBinding`](#type-dynamicreferencebinding) · [`ReferenceStatistic`](#type-referencestatistic).

### `CreateRegressionBandOptions` {#type-createregressionbandoptions}

<details markdown="1">
<summary>Expand CreateRegressionBandOptions</summary>

```typescript
export interface CreateRegressionBandOptions extends StrokeStyleDetails {
  id: string;
  data: string;
  x: string;
  lower: string;
  upper: string;
  groupBy?: string;
  coordinate: string;
  xScale: string;
  yScale: string;
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `CreateRegressionLineOptions` {#type-createregressionlineoptions}

<details markdown="1">
<summary>Expand CreateRegressionLineOptions</summary>

```typescript
export interface CreateRegressionLineOptions extends StrokeStyleDetails {
  id: string;
  data: string;
  x: string;
  y: string;
  groupBy?: string;
  coordinate: string;
  xScale: string;
  yScale: string;
  colorScale?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `CreateRegressionPlotOptions` {#type-createregressionplotoptions}

<details markdown="1">
<summary>Expand CreateRegressionPlotOptions</summary>

```typescript
export type CreateRegressionPlotOptions = RegressionPlotBaseOptions &
  RegressionPlotStatisticalOptions<RegressionOptions>;
```

</details>

Related types: [`RegressionPlotBaseOptions`](#type-regressionplotbaseoptions) · [`RegressionPlotStatisticalOptions`](#type-regressionplotstatisticaloptions) · [`RegressionOptions`](#type-regressionoptions).

### `CreateRosePlotOptions` {#type-createroseplotoptions}

<details markdown="1">
<summary>Expand CreateRosePlotOptions</summary>

```typescript
export type CreateRosePlotOptions = Omit<CreatePiePlotOptions, "guides" | "arc" | "aggregate" | "value"> & {
  radiusScale?: MeasuredRadiusScaleOptions;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: 0; fill?: string; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | MeasuredRadialGuideOptions;
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate: "sum" });
```

</details>

Related types: [`CreatePiePlotOptions`](#type-createpieplotoptions) · [`MeasuredRadiusScaleOptions`](#type-measuredradiusscaleoptions) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ArcInnerRadius`](#type-arcinnerradius) · [`MeasuredRadialGuideOptions`](#type-measuredradialguideoptions).

### `CreateRugPlotOptions` {#type-createrugplotoptions}

<details markdown="1">
<summary>Expand CreateRugPlotOptions</summary>

```typescript
export type CreateRugPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  tick?: RugTickOptions;
  guides?: false | RugGuideOptions;
} & (
  | { x: RugMeasureChannel; y?: never; edge: "top" | "bottom" }
  | { y: RugMeasureChannel; x?: never; edge: "left" | "right" }
);
```

</details>

Related types: [`RugTickOptions`](#type-rugtickoptions) · [`RugGuideOptions`](#type-rugguideoptions) · [`RugMeasureChannel`](#type-rugmeasurechannel).

### `CreateScaleOptions` {#type-createscaleoptions}

<details markdown="1">
<summary>Expand CreateScaleOptions</summary>

```typescript
export type CreateScaleOptions = ScaleOptions & { id: string };
```

</details>

Related types: [`ScaleOptions`](#type-scaleoptions).

### `CreateScatterPlotOptions` {#type-createscatterplotoptions}

<details markdown="1">
<summary>Expand CreateScatterPlotOptions</summary>

```typescript
export interface CreateScatterPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: PointFacadePositionChannel;
  y: PointFacadePositionChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | CartesianGuideOptions;
}
```

</details>

Related types: [`PointFacadePositionChannel`](#type-pointfacadepositionchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `CreateStripPlotOptions` {#type-createstripplotoptions}

<details markdown="1">
<summary>Expand CreateStripPlotOptions</summary>

```typescript
export type CreateStripPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | CartesianGuideOptions;
} & (
  | { x: RugMeasureChannel; y?: never; jitter?: false | StripPixelJitterOptions }
  | { x: RugMeasureChannel; y: StripCategoryChannel; jitter?: false | StripBandJitterOptions }
  | { x: StripCategoryChannel; y: RugMeasureChannel; jitter?: false | StripBandJitterOptions }
);
```

</details>

Related types: [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`RugMeasureChannel`](#type-rugmeasurechannel) · [`StripPixelJitterOptions`](#type-strippixeljitteroptions) · [`StripCategoryChannel`](#type-stripcategorychannel) · [`StripBandJitterOptions`](#type-stripbandjitteroptions).

### `CreateThetaAxisLabelsOptions` {#type-createthetaaxislabelsoptions}

<details markdown="1">
<summary>Expand CreateThetaAxisLabelsOptions</summary>

```typescript
export type CreateThetaAxisLabelsOptions = Omit<PolarLabelOptions, "count" | "values"> &
  PolarAxisTickSelection & Omit<PolarGuideResourceOptions, "angle"> &
  DisplayLabelOptions;
```

</details>

Related types: [`PolarLabelOptions`](#type-polarlabeloptions) · [`PolarAxisTickSelection`](#type-polaraxistickselection) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `CreateThetaAxisLineOptions` {#type-createthetaaxislineoptions}

<details markdown="1">
<summary>Expand CreateThetaAxisLineOptions</summary>

```typescript
export type CreateThetaAxisLineOptions = AxisLineStyleOptions &
  Omit<PolarGuideResourceOptions, "angle">;
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateThetaAxisTicksOptions` {#type-createthetaaxisticksoptions}

<details markdown="1">
<summary>Expand CreateThetaAxisTicksOptions</summary>

```typescript
export type CreateThetaAxisTicksOptions = Omit<PolarTickOptions, "count" | "values"> &
  PolarAxisTickSelection & Omit<PolarGuideResourceOptions, "angle">;
```

</details>

Related types: [`PolarTickOptions`](#type-polartickoptions) · [`PolarAxisTickSelection`](#type-polaraxistickselection) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CreateThetaAxisTitleOptions` {#type-createthetaaxistitleoptions}

<details markdown="1">
<summary>Expand CreateThetaAxisTitleOptions</summary>

```typescript
export type CreateThetaAxisTitleOptions = PolarTitleOptions &
  Omit<PolarGuideResourceOptions, "angle">;
```

</details>

Related types: [`PolarTitleOptions`](#type-polartitleoptions) · [`PolarGuideResourceOptions`](#type-polarguideresourceoptions).

### `CurveInterpolation` {#type-curveinterpolation}

<details markdown="1">
<summary>Expand CurveInterpolation</summary>

```typescript
export type CurveInterpolation =
  | "linear"
  | "step"
  | "step-before"
  | "step-after"
  | "basis"
  | "cardinal"
  | "monotone"
  | "natural";
```

</details>

### `DashPattern` {#type-dashpattern}

<details markdown="1">
<summary>Expand DashPattern</summary>

```typescript
export type DashPattern = readonly number[];
```

</details>

### `DashScaleOptions` {#type-dashscaleoptions}

<details markdown="1">
<summary>Expand DashScaleOptions</summary>

```typescript
export interface DashScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly (DashStyle | DashPattern)[];
}
```

</details>

Related types: [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `DashStyle` {#type-dashstyle}

<details markdown="1">
<summary>Expand DashStyle</summary>

```typescript
export type DashStyle = "solid" | "dashed" | "dotted" | "dashdot";
```

</details>

### `DatasetBin2DOutputFields` {#type-datasetbin2doutputfields}

<details markdown="1">
<summary>Expand DatasetBin2DOutputFields</summary>

```typescript
export interface DatasetBin2DOutputFields {
  readonly x0: string;
  readonly x1: string;
  readonly y0: string;
  readonly y1: string;
  readonly count: string;
  readonly members?: string;
}
```

</details>

### `DatasetBin2DTransform` {#type-datasetbin2dtransform}

<details markdown="1">
<summary>Expand DatasetBin2DTransform</summary>

```typescript
export interface DatasetBin2DTransform {
  readonly type: "bin2d";
  readonly x: string;
  readonly y: string;
  readonly bins: Readonly<Bin2DCounts>;
  readonly extent: {
    readonly x: "auto" | readonly [number, number];
    readonly y: "auto" | readonly [number, number];
  };
  readonly includeEmpty: boolean;
  readonly members: boolean;
  readonly as: DatasetBin2DOutputFields;
  readonly resolved?: {
    readonly extent: {
      readonly x: readonly [number, number];
      readonly y: readonly [number, number];
    };
    readonly edges: {
      readonly x: readonly number[];
      readonly y: readonly number[];
    };
    readonly eligibleCount: number;
    readonly occupiedCount: number;
  };
}
```

</details>

Related types: [`Bin2DCounts`](#type-bin2dcounts) · [`DatasetBin2DOutputFields`](#type-datasetbin2doutputfields).

### `DatasetBinTransform` {#type-datasetbintransform}

<details markdown="1">
<summary>Expand DatasetBinTransform</summary>

```typescript
export interface DatasetBinTransform {
  readonly type: "bin";
  readonly field: string;
  readonly bin:
    | { readonly maxBins: number }
    | { readonly step: number }
    | { readonly boundaries: readonly [number, number, ...number[]] };
  readonly extent: "auto" | readonly [number, number];
  readonly nice: boolean;
  readonly zero: boolean;
  readonly includeEmpty: boolean;
  readonly members: boolean;
  readonly weight?: StatisticalWeight;
  readonly missing?: "error" | "drop";
  readonly as: {
    readonly lower: string;
    readonly upper: string;
    readonly count: string;
    readonly members?: string;
  };
  readonly resolved?: {
    readonly domain: readonly [number, number];
    readonly step?: number;
    readonly boundaries: readonly [number, number, ...number[]];
  };
}
```

</details>

Related types: [`StatisticalWeight`](#type-statisticalweight).

### `DatasetCompleteTransform` {#type-datasetcompletetransform}

<details markdown="1">
<summary>Expand DatasetCompleteTransform</summary>

```typescript
export type DatasetCompleteTransform = {
  readonly type: "complete";
  readonly key: string;
  readonly groupBy: readonly string[];
  readonly fill: Readonly<Record<string, DatasetScalar>>;
  readonly members?: string;
} & (
  | { readonly values: readonly DatasetScalar[]; readonly sequence?: never }
  | {
      readonly sequence: { readonly start: number; readonly end: number; readonly step: number };
      readonly values?: never;
    }
  | { readonly values?: never; readonly sequence?: never }
);
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar).

### `DatasetComputedTransform` {#type-datasetcomputedtransform}

<details markdown="1">
<summary>Expand DatasetComputedTransform</summary>

```typescript
export interface DatasetComputedTransform {
  readonly type: "computed";
  readonly as: string;
  readonly expression: ComputedExpression;
}
```

</details>

Related types: [`ComputedExpression`](#type-computedexpression).

### `DatasetDensityTransform` {#type-datasetdensitytransform}

<details markdown="1">
<summary>Expand DatasetDensityTransform</summary>

```typescript
export interface DatasetDensityTransform {
  type: "density";
  field: string;
  groupBy?: string;
  bandwidth: "auto" | number;
  extent: "auto" | readonly [number, number];
  steps: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  as: readonly [string, string];
  resolve: "shared";
  placement?: {
    readonly type: "category";
    readonly channel: "x" | "y";
    readonly categoryField: string;
    readonly side: DensityPlacementSide;
    readonly width: {
      readonly band: number;
      readonly resolve: DensityWidthResolution;
    };
    readonly split?: {
      readonly field: string;
      readonly domain?: readonly [unknown, unknown];
    };
  };
  resolved?: {
    readonly extent: readonly [number, number];
    readonly splitDomain?: readonly [unknown, unknown];
  } & (
    | {
        readonly bandwidth: number;
        readonly bandwidths?: never;
      }
    | {
        readonly bandwidth?: never;
        readonly bandwidths: readonly {
          readonly group?: unknown;
          readonly split?: unknown;
          readonly bandwidth: number;
        }[];
      }
  );
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization) · [`StatisticalWeight`](#type-statisticalweight) · [`DensityPlacementSide`](#type-densityplacementside) · [`DensityWidthResolution`](#type-densitywidthresolution).

### `DatasetECDFResolvedGroup` {#type-datasetecdfresolvedgroup}

<details markdown="1">
<summary>Expand DatasetECDFResolvedGroup</summary>

```typescript
export interface DatasetECDFResolvedGroup {
  readonly keys: Readonly<Record<string, string | number | boolean>>;
  readonly denominator: number;
  readonly validCount: number;
}
```

</details>

### `DatasetECDFTransform` {#type-datasetecdftransform}

<details markdown="1">
<summary>Expand DatasetECDFTransform</summary>

```typescript
export interface DatasetECDFTransform {
  readonly type: "ecdf";
  readonly field: string;
  readonly groupBy: readonly string[];
  readonly weight?: string;
  readonly missing: "drop" | "error";
  readonly as: Readonly<ECDFOutputFields>;
  readonly resolved?: {
    readonly groups: readonly DatasetECDFResolvedGroup[];
  };
}
```

</details>

Related types: [`ECDFOutputFields`](#type-ecdfoutputfields) · [`DatasetECDFResolvedGroup`](#type-datasetecdfresolvedgroup).

### `DatasetFilterTransform` {#type-datasetfiltertransform}

<details markdown="1">
<summary>Expand DatasetFilterTransform</summary>

```typescript
export type DatasetFilterTransform = {
  type: "filter";
  field: string;
  nulls?: "include" | "exclude";
} & (
  | { oneOf: readonly DatasetScalar[]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly DatasetScalar[]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRange }
);
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`FilterComparison`](#type-filtercomparison) · [`FilterRange`](#type-filterrange).

### `DatasetFoldTransform` {#type-datasetfoldtransform}

<details markdown="1">
<summary>Expand DatasetFoldTransform</summary>

```typescript
export interface DatasetFoldTransform {
  readonly type: "fold";
  readonly fields: readonly string[];
  readonly as: {
    readonly key: string;
    readonly value: string;
  };
}
```

</details>

### `DatasetHorizonTransform` {#type-datasethorizontransform}

<details markdown="1">
<summary>Expand DatasetHorizonTransform</summary>

```typescript
export interface DatasetHorizonTransform {
  readonly type: "horizon";
  readonly x: { readonly field: string } & (
    | { readonly fieldType: "quantitative"; readonly temporalUnit?: never }
    | { readonly fieldType: "temporal"; readonly temporalUnit?: TemporalInputUnit }
  );
  readonly y: {
    readonly field: string;
    readonly fieldType: "quantitative";
  };
  readonly groupBy?: string;
  readonly bands: number;
  readonly baseline: number;
  readonly extent: "auto" | number;
  readonly resolve: HorizonResolution;
  readonly missing: HorizonMissingPolicy;
  readonly overflow: HorizonOverflowPolicy;
  readonly palette: {
    readonly positive: Readonly<Exclude<Palette, string>>;
    readonly negative: Readonly<Exclude<Palette, string>>;
  };
  readonly as: HorizonOutputFields;
  readonly resolved?: {
    readonly extents: readonly {
      readonly group?: DatasetScalar;
      readonly extent: number;
      readonly bandHeight: number;
    }[];
  };
}
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit) · [`HorizonResolution`](#type-horizonresolution) · [`HorizonMissingPolicy`](#type-horizonmissingpolicy) · [`HorizonOverflowPolicy`](#type-horizonoverflowpolicy) · [`Palette`](#type-palette) · [`HorizonOutputFields`](#type-horizonoutputfields) · [`DatasetScalar`](#type-datasetscalar).

### `DatasetImputedBaseTransform` {#type-datasetimputedbasetransform}

<details markdown="1">
<summary>Expand DatasetImputedBaseTransform</summary>

```typescript
type DatasetImputedBaseTransform = {
  readonly type: "impute";
  readonly fields: readonly string[];
  readonly groupBy: readonly string[];
  readonly edges: "keep" | "error";
  readonly maxGap?: number;
};
```

</details>

### `DatasetImputedTransform` {#type-datasetimputedtransform}

<details markdown="1">
<summary>Expand DatasetImputedTransform</summary>

```typescript
export type DatasetImputedTransform = DatasetImputedBaseTransform & (
  | {
      readonly method: "constant";
      readonly value: DatasetScalar;
      readonly sortBy: readonly DatasetWindowSort[];
    }
  | {
      readonly method: "forward" | "backward";
      readonly value?: never;
      readonly sortBy: readonly [DatasetWindowSort, ...DatasetWindowSort[]];
    }
  | {
      readonly method: "linear";
      readonly value?: never;
      readonly sortBy: readonly [{ readonly field: string; readonly order: "ascending" }];
    }
);
```

</details>

Related types: [`DatasetImputedBaseTransform`](#type-datasetimputedbasetransform) · [`DatasetScalar`](#type-datasetscalar) · [`DatasetWindowSort`](#type-datasetwindowsort).

### `DatasetIntervalOutputFields` {#type-datasetintervaloutputfields}

<details markdown="1">
<summary>Expand DatasetIntervalOutputFields</summary>

```typescript
export interface DatasetIntervalOutputFields {
  center: string;
  lower: string;
  upper: string;
}
```

</details>

### `DatasetIntervalTransform` {#type-datasetintervaltransform}

<details markdown="1">
<summary>Expand DatasetIntervalTransform</summary>

```typescript
export type DatasetIntervalTransform = {
  type: "interval";
  field: string;
  groupBy: readonly string[];
  as: DatasetIntervalOutputFields;
  missing?: "error" | "drop";
} & (
  | {
      center: "mean";
      extent: "stderr" | "stdev";
      method?: never;
      level?: never;
    }
  | {
      center: "mean";
      extent: "ci";
      method?: ConfidenceIntervalMethod;
      level: number;
    }
  | {
      center: "median";
      extent: "iqr";
      method?: never;
      level?: never;
    }
);
```

</details>

Related types: [`DatasetIntervalOutputFields`](#type-datasetintervaloutputfields) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod).

### `DatasetNormalizeBaselineTransform` {#type-datasetnormalizebaselinetransform}

<details markdown="1">
<summary>Expand DatasetNormalizeBaselineTransform</summary>

```typescript
type DatasetNormalizeBaselineTransform = {
  readonly baseline: NormalizeBaseline;
  readonly sortBy: readonly WindowSort[];
};
```

</details>

Related types: [`NormalizeBaseline`](#type-normalizebaseline) · [`WindowSort`](#type-windowsort).

### `DatasetNormalizedBaseTransform` {#type-datasetnormalizedbasetransform}

<details markdown="1">
<summary>Expand DatasetNormalizedBaseTransform</summary>

```typescript
type DatasetNormalizedBaseTransform = {
  readonly type: "normalize";
  readonly field: string;
  readonly as: string;
  readonly groupBy: readonly string[];
};
```

</details>

### `DatasetNormalizedTransform` {#type-datasetnormalizedtransform}

<details markdown="1">
<summary>Expand DatasetNormalizedTransform</summary>

```typescript
export type DatasetNormalizedTransform = DatasetNormalizedBaseTransform & (
  | {
      readonly method: "share" | "minmax";
      readonly zeroDenominator: NormalizeZeroDenominator;
    }
  | {
      readonly method: "zscore";
      readonly variance: "population" | "sample";
      readonly zeroDenominator: NormalizeZeroDenominator;
    }
  | ({
      readonly method: "index" | "percentChange";
      readonly zeroDenominator: NormalizeZeroDenominator;
    } & DatasetNormalizeBaselineTransform)
  | ({ readonly method: "change" } & DatasetNormalizeBaselineTransform)
);
```

</details>

Related types: [`DatasetNormalizedBaseTransform`](#type-datasetnormalizedbasetransform) · [`NormalizeZeroDenominator`](#type-normalizezerodenominator) · [`DatasetNormalizeBaselineTransform`](#type-datasetnormalizebaselinetransform).

### `DatasetRegressionTransform` {#type-datasetregressiontransform}

<details markdown="1">
<summary>Expand DatasetRegressionTransform</summary>

```typescript
export type DatasetRegressionTransform = {
  type: "regression";
  x: string;
  y: string;
  groupBy?: string;
} & (
  | ({
      method: "linear";
      degree?: never;
      span?: never;
      robustIterations?: never;
    } & ({ interval: false; confidenceMethod?: never; level?: never; confidence?: never } | ({ interval: "mean" | "prediction" } & (
      | { confidenceMethod: ConfidenceIntervalMethod; level: number; confidence?: never }
      | { confidence: number; confidenceMethod?: never; level?: never }
    ))))
  | ({
      method: "polynomial";
      degree: number;
      span?: never;
      robustIterations?: never;
    } & ({ interval: false; confidenceMethod?: never; level?: never; confidence?: never } | ({ interval: "mean" | "prediction" } & (
      | { confidenceMethod: ConfidenceIntervalMethod; level: number; confidence?: never }
      | { confidence: number; confidenceMethod?: never; level?: never }
    ))))
  | {
      method: "loess";
      span: number;
      robustIterations?: number;
      degree?: never;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      interval?: never;
    }
) & { readonly predict?: RegressionPredictOptions; readonly missing?: "error" | "drop" };
```

</details>

Related types: [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`RegressionPredictOptions`](#type-regressionpredictoptions).

### `DatasetScalar` {#type-datasetscalar}

<details markdown="1">
<summary>Expand DatasetScalar</summary>

```typescript
export type DatasetScalar = string | number | boolean | null;
```

</details>

### `DatasetSortTransform` {#type-datasetsorttransform}

<details markdown="1">
<summary>Expand DatasetSortTransform</summary>

```typescript
export interface DatasetSortTransform {
  readonly type: "sort";
  readonly sortBy: readonly {
    readonly field: string;
    readonly order: "ascending" | "descending";
    readonly nulls: "first" | "last";
    readonly temporalUnit?: "year" | "timestamp";
  }[];
}
```

</details>

### `DatasetStackTransform` {#type-datasetstacktransform}

<details markdown="1">
<summary>Expand DatasetStackTransform</summary>

```typescript
export interface DatasetStackTransform {
  readonly type: "stack";
  readonly category: string;
  readonly group: string;
  readonly value: string;
  readonly mode: StackDataMode;
  readonly as: Required<StackDataOutputFields>;
}
```

</details>

Related types: [`StackDataMode`](#type-stackdatamode) · [`StackDataOutputFields`](#type-stackdataoutputfields).

### `DatasetStatisticalReferenceTransform` {#type-datasetstatisticalreferencetransform}

<details markdown="1">
<summary>Expand DatasetStatisticalReferenceTransform</summary>

```typescript
interface DatasetStatisticalReferenceTransform {
  readonly type: "statisticalReference";
  readonly target: string;
}
```

</details>

### `DatasetStorageType` {#type-datasetstoragetype}

<details markdown="1">
<summary>Expand DatasetStorageType</summary>

```typescript
export type DatasetStorageType =
  | "number"
  | "string"
  | "boolean"
  | "array"
  | "object"
  | "unknown"
  | "mixed";
```

</details>

### `DatasetSummaryTransform` {#type-datasetsummarytransform}

<details markdown="1">
<summary>Expand DatasetSummaryTransform</summary>

```typescript
export interface DatasetSummaryTransform {
  type: "summary";
  groupBy: readonly string[];
  aggregates: readonly SummaryAggregateOptions[];
  members?: string;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  empty?: "null" | "identity";
}
```

</details>

Related types: [`SummaryAggregateOptions`](#type-summaryaggregateoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `DatasetTimeUnitTransform` {#type-datasettimeunittransform}

<details markdown="1">
<summary>Expand DatasetTimeUnitTransform</summary>

```typescript
export type DatasetTimeUnitTransform = DatasetTimeUnitTransformBase & (
  | {
      readonly unit: Exclude<TimeUnit, "week">;
      readonly weekStartsOn?: never;
      readonly weekRule?: never;
    }
  | {
      readonly unit: "week";
      readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly weekRule: "calendar" | "iso";
    }
);
```

</details>

Related types: [`DatasetTimeUnitTransformBase`](#type-datasettimeunittransformbase) · [`TimeUnit`](#type-timeunit).

### `DatasetTimeUnitTransformBase` {#type-datasettimeunittransformbase}

<details markdown="1">
<summary>Expand DatasetTimeUnitTransformBase</summary>

```typescript
type DatasetTimeUnitTransformBase = {
  readonly type: "timeUnit";
  readonly field: string;
  readonly temporalUnit?: TemporalInputUnit;
  readonly as: string;
  readonly timeZone?: string;
};
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit).

### `DatasetTransform` {#type-datasettransform}

<details markdown="1">
<summary>Expand DatasetTransform</summary>

```typescript
export type DatasetTransform =
  | DatasetBinTransform
  | DatasetBin2DTransform
  | DatasetCompleteTransform
  | DatasetComputedTransform
  | DatasetImputedTransform
  | DatasetNormalizedTransform
  | DatasetFilterTransform
  | DatasetFoldTransform
  | DatasetRegressionTransform
  | DatasetSortTransform
  | DatasetDensityTransform
  | DatasetECDFTransform
  | DatasetHorizonTransform
  | DatasetIntervalTransform
  | DatasetSummaryTransform
  | DatasetStackTransform
  | DatasetStatisticalReferenceTransform
  | DatasetTimeUnitTransform
  | DatasetWindowTransform;
```

</details>

Related types: [`DatasetBinTransform`](#type-datasetbintransform) · [`DatasetBin2DTransform`](#type-datasetbin2dtransform) · [`DatasetCompleteTransform`](#type-datasetcompletetransform) · [`DatasetComputedTransform`](#type-datasetcomputedtransform) · [`DatasetImputedTransform`](#type-datasetimputedtransform) · [`DatasetNormalizedTransform`](#type-datasetnormalizedtransform) · [`DatasetFilterTransform`](#type-datasetfiltertransform) · [`DatasetFoldTransform`](#type-datasetfoldtransform) · [`DatasetRegressionTransform`](#type-datasetregressiontransform) · [`DatasetSortTransform`](#type-datasetsorttransform) · [`DatasetDensityTransform`](#type-datasetdensitytransform) · [`DatasetECDFTransform`](#type-datasetecdftransform) · [`DatasetHorizonTransform`](#type-datasethorizontransform) · [`DatasetIntervalTransform`](#type-datasetintervaltransform) · [`DatasetSummaryTransform`](#type-datasetsummarytransform) · [`DatasetStackTransform`](#type-datasetstacktransform) · [`DatasetStatisticalReferenceTransform`](#type-datasetstatisticalreferencetransform) · [`DatasetTimeUnitTransform`](#type-datasettimeunittransform) · [`DatasetWindowTransform`](#type-datasetwindowtransform).

### `DatasetWindowOperation` {#type-datasetwindowoperation}

<details markdown="1">
<summary>Expand DatasetWindowOperation</summary>

```typescript
export type DatasetWindowOperation =
  | { readonly op: "rowNumber" | "rank" | "denseRank"; readonly as: string }
  | {
      readonly op: "cumulativeSum";
      readonly field: string;
      readonly as: string;
    }
  | {
      readonly op: "lag" | "lead";
      readonly field: string;
      readonly as: string;
      readonly offset: number;
      readonly default: unknown;
    }
  | {
      readonly op: "movingMean" | "movingSum";
      readonly field: string;
      readonly as: string;
      readonly frame:
        | {
            readonly preceding: number;
            readonly following: number;
          }
        | {
            readonly duration: {
              readonly preceding: number;
              readonly following: number;
              readonly unit: DurationWindowUnit;
            };
          };
      readonly minPeriods: number;
      readonly missing: "error" | "skip";
    };
```

</details>

Related types: [`DurationWindowUnit`](#type-durationwindowunit).

### `DatasetWindowSort` {#type-datasetwindowsort}

<details markdown="1">
<summary>Expand DatasetWindowSort</summary>

```typescript
export interface DatasetWindowSort {
  readonly field: string;
  readonly order: WindowSortOrder;
}
```

</details>

Related types: [`WindowSortOrder`](#type-windowsortorder).

### `DatasetWindowTransform` {#type-datasetwindowtransform}

<details markdown="1">
<summary>Expand DatasetWindowTransform</summary>

```typescript
export interface DatasetWindowTransform {
  readonly type: "window";
  readonly partitionBy: readonly string[];
  readonly sortBy: readonly DatasetWindowSort[];
  readonly operations: readonly DatasetWindowOperation[];
  readonly temporalUnit?: TemporalInputUnit;
}
```

</details>

Related types: [`DatasetWindowSort`](#type-datasetwindowsort) · [`DatasetWindowOperation`](#type-datasetwindowoperation) · [`TemporalInputUnit`](#type-temporalinputunit).

### `DatumPositionEncodingOptions` {#type-datumpositionencodingoptions}

<details markdown="1">
<summary>Expand DatumPositionEncodingOptions</summary>

```typescript
export type DatumPositionEncodingOptions =
  | InferredRuleDatumPositionEncodingOptions
  | RulePositionEncodingBase & (
    | {
        fieldType: "quantitative";
        scale?: NonPointQuantitativePositionScaleOptions;
      }
    | {
        fieldType: "temporal";
        temporalUnit?: TemporalInputUnit;
        scale?: NonPointTemporalPositionScaleOptions;
      }
    | {
        fieldType: "nominal" | "ordinal";
        scale?: NonPointCategoricalPositionScaleOptions;
      }
    );

/** Constant primary position accepted by Rule, Rect, Area, Point, Tick, and independent Text policies. */
```

</details>

Related types: [`InferredRuleDatumPositionEncodingOptions`](#type-inferredruledatumpositionencodingoptions) · [`RulePositionEncodingBase`](#type-rulepositionencodingbase) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `DensityDataOptions` {#type-densitydataoptions}

<details markdown="1">
<summary>Expand DensityDataOptions</summary>

```typescript
export interface DensityDataOptions {
  id: string;
  source?: string;
  field: string;
  groupBy?: string;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  as?: readonly [string, string];
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization) · [`StatisticalWeight`](#type-statisticalweight).

### `DensityEncodingBase` {#type-densityencodingbase}

<details markdown="1">
<summary>Expand DensityEncodingBase</summary>

```typescript
type DensityEncodingBase = Omit<DensityDataOptions, "id" | "groupBy"> & {
  groupBy?: string | false;
  target?: string;
  densityChannel?: "x" | "y";
  coordinate?: string;
  valueScale?: NonPointQuantitativePositionScaleOptions;
};
```

</details>

Related types: [`DensityDataOptions`](#type-densitydataoptions) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `DensityEncodingOptions` {#type-densityencodingoptions}

<details markdown="1">
<summary>Expand DensityEncodingOptions</summary>

```typescript
export type DensityEncodingOptions = DensityEncodingBase & (
  | {
      placement?: BaselineDensityPlacement;
      densityScale?: NonPointZeroSupportingPositionScaleOptions;
    }
  | {
      placement: CategoryDensityPlacement;
      densityScale?: never;
    }
);
```

</details>

Related types: [`DensityEncodingBase`](#type-densityencodingbase) · [`BaselineDensityPlacement`](#type-baselinedensityplacement) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`CategoryDensityPlacement`](#type-categorydensityplacement).

### `DensityKernel` {#type-densitykernel}

<details markdown="1">
<summary>Expand DensityKernel</summary>

```typescript
export type DensityKernel =
  | "gaussian"
  | "epanechnikov"
  | "uniform"
  | "triangular";
```

</details>

### `DensityNormalization` {#type-densitynormalization}

<details markdown="1">
<summary>Expand DensityNormalization</summary>

```typescript
export type DensityNormalization = "unit" | "count";
```

</details>

### `DensityPlacement` {#type-densityplacement}

<details markdown="1">
<summary>Expand DensityPlacement</summary>

```typescript
export type DensityPlacement =
  | BaselineDensityPlacement
  | CategoryDensityPlacement;
```

</details>

Related types: [`BaselineDensityPlacement`](#type-baselinedensityplacement) · [`CategoryDensityPlacement`](#type-categorydensityplacement).

### `DensityPlacementSide` {#type-densityplacementside}

<details markdown="1">
<summary>Expand DensityPlacementSide</summary>

```typescript
export type DensityPlacementSide =
  | "both"
  | "left"
  | "right"
  | "top"
  | "bottom";
```

</details>

### `DensityPlacementSplit` {#type-densityplacementsplit}

<details markdown="1">
<summary>Expand DensityPlacementSplit</summary>

```typescript
export interface DensityPlacementSplit {
  field: string;
  domain?: readonly [unknown, unknown];
}
```

</details>

### `DensityPlacementWidth` {#type-densityplacementwidth}

<details markdown="1">
<summary>Expand DensityPlacementWidth</summary>

```typescript
export interface DensityPlacementWidth {
  band?: number;
  resolve?: DensityWidthResolution;
}
```

</details>

Related types: [`DensityWidthResolution`](#type-densitywidthresolution).

### `DensityPlotGuideOptions` {#type-densityplotguideoptions}

<details markdown="1">
<summary>Expand DensityPlotGuideOptions</summary>

```typescript
export type DensityPlotGuideOptions = Omit<CCategoricalGuides, "legend"> & {
  legend?: false | DensityPlotLegendOptions;
};
```

</details>

Related types: [`CCategoricalGuides`](#type-ccategoricalguides) · [`DensityPlotLegendOptions`](#type-densityplotlegendoptions).

### `DensityPlotLegendOptions` {#type-densityplotlegendoptions}

<details markdown="1">
<summary>Expand DensityPlotLegendOptions</summary>

```typescript
export type DensityPlotLegendOptions = Omit<PieLegendOptions, "order"> & { order?: LegendValueOrder };
```

</details>

Related types: [`PieLegendOptions`](#type-pielegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `DensityWidthResolution` {#type-densitywidthresolution}

<details markdown="1">
<summary>Expand DensityWidthResolution</summary>

```typescript
export type DensityWidthResolution = "shared" | "independent";
```

</details>

### `DerivedDataDependents` {#type-deriveddatadependents}

<details markdown="1">
<summary>Expand DerivedDataDependents</summary>

```typescript
export type DerivedDataDependents = "reject" | "recompute";
```

</details>

### `DiscretizedColorScaleOptions` {#type-discretizedcolorscaleoptions}

<details markdown="1">
<summary>Expand DiscretizedColorScaleOptions</summary>

```typescript
export type DiscretizedColorScaleOptions =
  | QuantizeColorScaleOptions
  | QuantileColorScaleOptions
  | ThresholdColorScaleOptions;
```

</details>

Related types: [`QuantizeColorScaleOptions`](#type-quantizecolorscaleoptions) · [`QuantileColorScaleOptions`](#type-quantilecolorscaleoptions) · [`ThresholdColorScaleOptions`](#type-thresholdcolorscaleoptions).

### `DisplayLabelMap` {#type-displaylabelmap}

<details markdown="1">
<summary>Expand DisplayLabelMap</summary>

```typescript
export type DisplayLabelMap = ReadonlyArray<Readonly<{
  value: DatasetScalar;
  label: string;
}>>;
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar).

### `DisplayLabelOptions` {#type-displaylabeloptions}

<details markdown="1">
<summary>Expand DisplayLabelOptions</summary>

```typescript
export interface DisplayLabelOptions {
  labelMap?: DisplayLabelMap | "auto";
}
```

</details>

Related types: [`DisplayLabelMap`](#type-displaylabelmap).

### `DurationWindowFrame` {#type-durationwindowframe}

<details markdown="1">
<summary>Expand DurationWindowFrame</summary>

```typescript
export type DurationWindowFrame = {
  preceding?: never;
  following?: never;
  duration: {
    preceding: number;
    following?: number;
    unit: DurationWindowUnit;
  };
};
```

</details>

Related types: [`DurationWindowUnit`](#type-durationwindowunit).

### `DurationWindowUnit` {#type-durationwindowunit}

<details markdown="1">
<summary>Expand DurationWindowUnit</summary>

```typescript
export type DurationWindowUnit = "millisecond" | "second" | "minute" | "hour" | "day";
```

</details>

### `DynamicReferenceBinding` {#type-dynamicreferencebinding}

<details markdown="1">
<summary>Expand DynamicReferenceBinding</summary>

```typescript
type DynamicReferenceBinding = {
  readonly id?: string;
  readonly source: string;
  readonly axis: "x" | "y";
  readonly population?: "boundData" | "visibleItems";
  readonly field?: string;
  readonly x?: never;
  readonly y?: never;
  readonly space?: never;
  readonly data?: never;
  readonly coordinate?: never;
  readonly temporalUnit?: never;
};
```

</details>

### `ECDFDataOptions` {#type-ecdfdataoptions}

<details markdown="1">
<summary>Expand ECDFDataOptions</summary>

```typescript
export interface ECDFDataOptions {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly [string, ...string[]];
  weight?: string;
  missing?: "drop" | "error";
  as?: ECDFOutputFields;
}
```

</details>

Related types: [`ECDFOutputFields`](#type-ecdfoutputfields).

### `ECDFOutputFields` {#type-ecdfoutputfields}

<details markdown="1">
<summary>Expand ECDFOutputFields</summary>

```typescript
export interface ECDFOutputFields {
  value: string;
  cumulative: string;
  probability: string;
}
```

</details>

### `EditAxisOptions` {#type-editaxisoptions}

<details markdown="1">
<summary>Expand EditAxisOptions</summary>

```typescript
export interface EditAxisOptions<P extends string> {
  position?: P;
  line?: false | AxisLineStyleOptions;
  ticks?: false | Omit<AxisTickOptions<P>, "scale" | "position">;
  labels?: false | Omit<AxisLabelOptions<P>, "scale" | "position">;
  ticksAndLabels?: false | Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position">;
  title?: false | Omit<AxisTitleOptions<P>, "scale" | "position">;
}
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`AxisTickOptions`](#type-axistickoptions) · [`AxisLabelOptions`](#type-axislabeloptions) · [`AxisTicksAndLabelsOptions`](#type-axisticksandlabelsoptions) · [`AxisTitleOptions`](#type-axistitleoptions).

### `EditBin2DDataOptions` {#type-editbin2ddataoptions}

<details markdown="1">
<summary>Expand EditBin2DDataOptions</summary>

```typescript
export interface EditBin2DDataOptions {
  target?: string;
  source?: string;
  x?: string;
  y?: string;
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  includeEmpty?: boolean;
  members?: boolean;
  as?: DatasetBin2DOutputFields;
  dependents?: DerivedDataDependents;
}
```

</details>

Related types: [`Bin2DCounts`](#type-bin2dcounts) · [`Bin2DExtent`](#type-bin2dextent) · [`DatasetBin2DOutputFields`](#type-datasetbin2doutputfields) · [`DerivedDataDependents`](#type-deriveddatadependents).

### `EditBinDataOptions` {#type-editbindataoptions}

<details markdown="1">
<summary>Expand EditBinDataOptions</summary>

```typescript
export type EditBinDataOptions = FocusedWeightedDerivedDataEdit<
  BinDataOptions,
  StatisticalWeight
>;
```

</details>

Related types: [`FocusedWeightedDerivedDataEdit`](#type-focusedweightedderiveddataedit) · [`BinDataOptions`](#type-bindataoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `EditBoxPlotOptions` {#type-editboxplotoptions}

<details markdown="1">
<summary>Expand EditBoxPlotOptions</summary>

```typescript
export interface EditBoxPlotOptions {
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  whisker?: BoxPlotWhisker;
  width?: { band?: number };
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
  };
  outlier?: StrokeStyleDetails & {
    shape?: PointShape;
    radius?: number;
    opacity?: number;
  };
}
```

</details>

Related types: [`BoxPlotPositionChannel`](#type-boxplotpositionchannel) · [`BoxPlotWhisker`](#type-boxplotwhisker) · [`RectStyleDetails`](#type-rectstyledetails) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape).

### `EditColorScaleOptions` {#type-editcolorscaleoptions}

<details markdown="1">
<summary>Expand EditColorScaleOptions</summary>

```typescript
export type EditColorScaleOptions = FocusedScaleSelection & WithoutScaleId<
  CategoricalColorScaleOptions | ContinuousColorScaleOptions | DiscretizedColorScaleOptions
>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions).

### `EditCompleteDataOptions` {#type-editcompletedataoptions}

<details markdown="1">
<summary>Expand EditCompleteDataOptions</summary>

```typescript
export type EditCompleteDataOptions = FocusedDerivedDataEdit<CompleteDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`CompleteDataOptions`](#type-completedataoptions).

### `EditCompositionLayoutOptions` {#type-editcompositionlayoutoptions}

<details markdown="1">
<summary>Expand EditCompositionLayoutOptions</summary>

```typescript
export interface EditCompositionLayoutOptions {
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
}
```

</details>

Related types: [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding).

### `EditComputedDataOptions` {#type-editcomputeddataoptions}

<details markdown="1">
<summary>Expand EditComputedDataOptions</summary>

```typescript
export type EditComputedDataOptions = FocusedDerivedDataEdit<ComputedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`ComputedDataOptions`](#type-computeddataoptions).

### `EditCoordinateOptions` {#type-editcoordinateoptions}

<details markdown="1">
<summary>Expand EditCoordinateOptions</summary>

```typescript
export type EditCoordinateOptions = EditCoordinateTarget & (
  | { aspect: CoordinateAspect; polarFrame?: PolarFrameOptions }
  | { aspect?: CoordinateAspect; polarFrame: PolarFrameOptions }
);
```

</details>

Related types: [`EditCoordinateTarget`](#type-editcoordinatetarget) · [`CoordinateAspect`](#type-coordinateaspect) · [`PolarFrameOptions`](#type-polarframeoptions).

### `EditCoordinateTarget` {#type-editcoordinatetarget}

<details markdown="1">
<summary>Expand EditCoordinateTarget</summary>

```typescript
type EditCoordinateTarget = {
  target: string;
};
```

</details>

### `EditDensityDataOptions` {#type-editdensitydataoptions}

<details markdown="1">
<summary>Expand EditDensityDataOptions</summary>

```typescript
export type EditDensityDataOptions = FocusedWeightedDerivedDataEdit<
  DensityDataOptions,
  StatisticalWeight
>;
```

</details>

Related types: [`FocusedWeightedDerivedDataEdit`](#type-focusedweightedderiveddataedit) · [`DensityDataOptions`](#type-densitydataoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `EditDensityOptions` {#type-editdensityoptions}

<details markdown="1">
<summary>Expand EditDensityOptions</summary>

```typescript
export interface EditDensityOptions {
  target?: string;
  source?: string;
  field?: string;
  groupBy?: string | false;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight | false;
  densityChannel?: "x" | "y";
  valueScale?: NonPointQuantitativePositionScaleOptions;
  placement?: DensityPlacement;
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization) · [`StatisticalWeight`](#type-statisticalweight) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`DensityPlacement`](#type-densityplacement).

### `EditDerivedDataOptions` {#type-editderiveddataoptions}

<details markdown="1">
<summary>Expand EditDerivedDataOptions</summary>

```typescript
export interface EditDerivedDataOptions {
  target: string;
  definition: RequestedDatasetTransform;
  dependents?: DerivedDataDependents;
}
```

</details>

Related types: [`RequestedDatasetTransform`](#type-requesteddatasettransform) · [`DerivedDataDependents`](#type-deriveddatadependents).

### `EditECDFDataOptions` {#type-editecdfdataoptions}

<details markdown="1">
<summary>Expand EditECDFDataOptions</summary>

```typescript
export type EditECDFDataOptions = FocusedWeightedDerivedDataEdit<
  ECDFDataOptions,
  string
>;
```

</details>

Related types: [`FocusedWeightedDerivedDataEdit`](#type-focusedweightedderiveddataedit) · [`ECDFDataOptions`](#type-ecdfdataoptions).

### `EditECDFPlotOptions` {#type-editecdfplotoptions}

<details markdown="1">
<summary>Expand EditECDFPlotOptions</summary>

```typescript
export type EditECDFPlotOptions = { target?: string } & Partial<Pick<
  CreateECDFPlotOptions,
  "data" | "coordinate" | "field" | "missing" | "as"
>> & {
  groupBy?: CreateECDFPlotOptions["groupBy"] | false;
  weight?: string | false;
  color?: CreateECDFPlotOptions["color"] | false;
};
```

</details>

Related types: [`CreateECDFPlotOptions`](#type-createecdfplotoptions).

### `EditEndpointPlotOptions` {#type-editendpointplotoptions}

<details markdown="1">
<summary>Expand EditEndpointPlotOptions</summary>

```typescript
export type EditEndpointPlotOptions = { target?: string } & Partial<Pick<
  CreateDumbbellPlotOptions,
  "data" | "coordinate" | "category" | "start" | "end" | "orientation" | "summary"
>> & {
  value?: EndpointValueChannel;
  baseline?: number;
};
```

</details>

Related types: [`CreateDumbbellPlotOptions`](#type-createdumbbellplotoptions) · [`EndpointValueChannel`](#type-endpointvaluechannel).

### `EditErrorBandBoundaryOptions` {#type-editerrorbandboundaryoptions}

<details markdown="1">
<summary>Expand EditErrorBandBoundaryOptions</summary>

```typescript
export interface EditErrorBandBoundaryOptions extends StrokeStyleDetails {
  target?: string;
  boundary?: "both" | "lower" | "upper";
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern) · [`CurveInterpolation`](#type-curveinterpolation).

### `EditErrorBandOptions` {#type-editerrorbandoptions}

<details markdown="1">
<summary>Expand EditErrorBandOptions</summary>

```typescript
export interface EditErrorBandOptions extends StrokeStyleDetails {
  target?: string;
  data?: string;
  x?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  y?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  groupBy?: string | false;
  fill?: string | false;
  opacity?: number;
  curve?: CurveInterpolation;
  statistics?: {
    center?: IntervalCenter;
    extent?: IntervalExtent;
    method?: ConfidenceIntervalMethod;
    level?: number;
  };
  boundaries?: false | (StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: DashStyle | DashPattern;
    opacity?: number;
    curve?: CurveInterpolation;
  });
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBandPositionChannel`](#type-errorbandpositionchannel) · [`ErrorBandIntervalChannel`](#type-errorbandintervalchannel) · [`CurveInterpolation`](#type-curveinterpolation) · [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `EditErrorBarOptions` {#type-editerrorbaroptions}

<details markdown="1">
<summary>Expand EditErrorBarOptions</summary>

```typescript
export interface EditErrorBarOptions extends StrokeStyleDetails {
  target?: string;
  data?: string;
  x?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  y?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  xOffset?: ErrorBarOffsetChannel | false;
  yOffset?: ErrorBarOffsetChannel | false;
  groupBy?: string | false;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
  statistics?: {
    center?: IntervalCenter;
    extent?: IntervalExtent;
    method?: ConfidenceIntervalMethod;
    level?: number;
  };
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBarPositionChannel`](#type-errorbarpositionchannel) · [`ErrorBarIntervalChannel`](#type-errorbarintervalchannel) · [`ErrorBarOffsetChannel`](#type-errorbaroffsetchannel) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern) · [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod).

### `EditFacetHeadersOptions` {#type-editfacetheadersoptions}

<details markdown="1">
<summary>Expand EditFacetHeadersOptions</summary>

```typescript
export interface EditFacetHeadersOptions {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
  role?: FacetHeaderRole;
  labelMap?: DisplayLabelMap | "auto";
  side?: FacetHeaderSide;
  align?: FacetHeaderAlign;
}
```

</details>

Related types: [`FacetHeaderRole`](#type-facetheaderrole) · [`DisplayLabelMap`](#type-displaylabelmap) · [`FacetHeaderSide`](#type-facetheaderside) · [`FacetHeaderAlign`](#type-facetheaderalign).

### `EditFacetSourceOptions` {#type-editfacetsourceoptions}

<details markdown="1">
<summary>Expand EditFacetSourceOptions</summary>

```typescript
export interface EditFacetSourceOptions { program: ChartProgram; }
```

</details>

### `EditFilteredDataOptions` {#type-editfiltereddataoptions}

<details markdown="1">
<summary>Expand EditFilteredDataOptions</summary>

```typescript
export type EditFilteredDataOptions = FilterModePatch & {
  target: string;
  field?: string;
  nulls?: "include" | "exclude" | false;
  dependents?: DerivedDataDependents;
};
```

</details>

Related types: [`FilterModePatch`](#type-filtermodepatch) · [`DerivedDataDependents`](#type-deriveddatadependents).

### `EditFoldDataOptions` {#type-editfolddataoptions}

<details markdown="1">
<summary>Expand EditFoldDataOptions</summary>

```typescript
export type EditFoldDataOptions = FocusedDerivedDataEdit<FoldDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`FoldDataOptions`](#type-folddataoptions).

### `EditGradientPlotOptions` {#type-editgradientplotoptions}

<details markdown="1">
<summary>Expand EditGradientPlotOptions</summary>

```typescript
export interface EditGradientPlotOptions {
  target?: string;
  data?: string;
  x?: GradientPlotPositionChannel;
  y?: GradientPlotPositionChannel;
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
}
```

</details>

Related types: [`GradientPlotPositionChannel`](#type-gradientplotpositionchannel) · [`GradientPlotDensityOptions`](#type-gradientplotdensityoptions) · [`GradientPlotAppearanceOptions`](#type-gradientplotappearanceoptions) · [`GradientPlotCenterOptions`](#type-gradientplotcenteroptions).

### `EditGraphicsOptions` {#type-editgraphicsoptions}

<details markdown="1">
<summary>Expand EditGraphicsOptions</summary>

```typescript
export type EditGraphicsOptions =
  | { target: string; property: string; value: unknown; remove?: false }
  | { target: string; remove: true; property?: never; value?: never };
```

</details>

### `EditGridDirectionsOptions` {#type-editgriddirectionsoptions}

<details markdown="1">
<summary>Expand EditGridDirectionsOptions</summary>

```typescript
export interface EditGridDirectionsOptions {
  horizontal?: EditGridOptions;
  vertical?: EditGridOptions;
  theta?: EditPolarGridOptions;
  radial?: EditPolarGridOptions;
}
```

</details>

Related types: [`EditGridOptions`](#type-editgridoptions) · [`EditPolarGridOptions`](#type-editpolargridoptions).

### `EditGridOptions` {#type-editgridoptions}

<details markdown="1">
<summary>Expand EditGridOptions</summary>

```typescript
export interface EditGridOptions {
  count?: number;
  values?: readonly number[] | "auto";
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

### `EditHorizonOptions` {#type-edithorizonoptions}

<details markdown="1">
<summary>Expand EditHorizonOptions</summary>

```typescript
export interface EditHorizonOptions
  extends Omit<HorizonEncodingOptions, "groupBy"> {
  groupBy?: string | false;
}
```

</details>

Related types: [`HorizonEncodingOptions`](#type-horizonencodingoptions).

### `EditImputedDataOptions` {#type-editimputeddataoptions}

<details markdown="1">
<summary>Expand EditImputedDataOptions</summary>

```typescript
export type EditImputedDataOptions = FocusedDerivedDataEdit<ImputedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`ImputedDataOptions`](#type-imputeddataoptions).

### `EditIntervalDataOptions` {#type-editintervaldataoptions}

<details markdown="1">
<summary>Expand EditIntervalDataOptions</summary>

```typescript
export type EditIntervalDataOptions = FocusedDerivedDataEdit<IntervalDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`IntervalDataOptions`](#type-intervaldataoptions).

### `EditLegendBlockOptions` {#type-editlegendblockoptions}

<details markdown="1">
<summary>Expand EditLegendBlockOptions</summary>

```typescript
export interface EditLegendBlockOptions {
  target: string;
  channel: LegendChannel;
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly CategoryValue[];
  gap?: number;
  text?: LegendBlockTextPatch;
  symbol?: LegendBlockSymbolPatch;
  labelMap?: DisplayLabelMap | "auto";
}
```

</details>

Related types: [`LegendChannel`](#type-legendchannel) · [`CategoryValue`](#type-categoryvalue) · [`LegendBlockTextPatch`](#type-legendblocktextpatch) · [`LegendBlockSymbolPatch`](#type-legendblocksymbolpatch) · [`DisplayLabelMap`](#type-displaylabelmap).

### `EditLegendBorderOptions` {#type-editlegendborderoptions}

<details markdown="1">
<summary>Expand EditLegendBorderOptions</summary>

```typescript
export interface EditLegendBorderOptions {
  target?: string;
  border: boolean | LegendBorderOptions;
}
```

</details>

Related types: [`LegendBorderOptions`](#type-legendborderoptions).

### `EditLegendLabelsOptions` {#type-editlegendlabelsoptions}

<details markdown="1">
<summary>Expand EditLegendLabelsOptions</summary>

```typescript
export interface EditLegendLabelsOptions extends LegendTextOptions {
  target?: string;
}
```

</details>

Related types: [`LegendTextOptions`](#type-legendtextoptions).

### `EditLegendLayoutOptions` {#type-editlegendlayoutoptions}

<details markdown="1">
<summary>Expand EditLegendLayoutOptions</summary>

```typescript
export interface EditLegendLayoutOptions {
  target?: string;
  layout?: "edge" | "legacy-bottom";
  position?: "right" | "left" | "bottom" | "top";
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Categorical sides require vertical (the default); horizontal edges default to horizontal. */
  direction?: "horizontal" | "vertical";
  /** Categorical sides allow omission or 1; multiple columns require a horizontal edge. */
  columns?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  titlePosition?: "top" | "left";
  itemGap?: number;
}
```

</details>

### `EditLegendOptions` {#type-editlegendoptions}

<details markdown="1">
<summary>Expand EditLegendOptions</summary>

```typescript
export interface EditLegendOptions
  extends Omit<LegendOptions, "title" | "values"> {
  /** Exact final content set for the whole target; omission preserves content. */
  channels?: LegendOptions["channels"];
  title?: string | "auto" | false;
  /** Replace exact samples, or reset them to the remembered automatic count. */
  values?: readonly number[] | "auto";
}
```

</details>

Related types: [`LegendOptions`](#type-legendoptions).

### `EditLegendSymbolsOptions` {#type-editlegendsymbolsoptions}

<details markdown="1">
<summary>Expand EditLegendSymbolsOptions</summary>

```typescript
export interface EditLegendSymbolsOptions {
  target?: string;
  symbol?: LegendSymbolRecipe;
  count?: number;
  gradient?: { length?: number; thickness?: number };
}
```

</details>

Related types: [`LegendSymbolRecipe`](#type-legendsymbolrecipe).

### `EditLegendTitleOptions` {#type-editlegendtitleoptions}

<details markdown="1">
<summary>Expand EditLegendTitleOptions</summary>

```typescript
export interface EditLegendTitleOptions extends LegendTitleStyleOptions {
  target?: string;
  title?: string | "auto" | false;
}
```

</details>

Related types: [`LegendTitleStyleOptions`](#type-legendtitlestyleoptions).

### `EditMarkLabelPlacementOptions` {#type-editmarklabelplacementoptions}

<details markdown="1">
<summary>Expand EditMarkLabelPlacementOptions</summary>

```typescript
export interface EditMarkLabelPlacementOptions {
  target: string;
  placement: MarkLabelPlacement | "auto";
}

/** Remove one attached label layer or every attached label owned by a source mark. */
```

</details>

Related types: [`MarkLabelPlacement`](#type-marklabelplacement).

### `EditMarkLabelSelectionOptions` {#type-editmarklabelselectionoptions}

<details markdown="1">
<summary>Expand EditMarkLabelSelectionOptions</summary>

```typescript
export type EditMarkLabelSelectionOptions = { target: string } & (
  | { select: MarkSelector; selection?: never; all?: never }
  | { selection: string; select?: never; all?: never }
  | { all: true; select?: never; selection?: never }
);

/** Replace semantic placement or reset one attached label layer to its legacy anchor. */
```

</details>

Related types: [`MarkSelector`](#type-markselector).

### `EditMarkSelectionOptions` {#type-editmarkselectionoptions}

<details markdown="1">
<summary>Expand EditMarkSelectionOptions</summary>

```typescript
export type EditMarkSelectionOptions = {
  selection?: string;
} & MarkSelector;
```

</details>

Related types: [`MarkSelector`](#type-markselector).

### `EditNormalizedDataOptions` {#type-editnormalizeddataoptions}

<details markdown="1">
<summary>Expand EditNormalizedDataOptions</summary>

```typescript
export type EditNormalizedDataOptions = FocusedDerivedDataEdit<NormalizedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`NormalizedDataOptions`](#type-normalizeddataoptions).

### `EditOpacityScaleOptions` {#type-editopacityscaleoptions}

<details markdown="1">
<summary>Expand EditOpacityScaleOptions</summary>

```typescript
export type EditOpacityScaleOptions = FocusedScaleSelection & WithoutScaleId<OpacityScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`OpacityScaleOptions`](#type-opacityscaleoptions).

### `EditParallelAxisOptions` {#type-editparallelaxisoptions}

<details markdown="1">
<summary>Expand EditParallelAxisOptions</summary>

```typescript
export type EditParallelAxisOptions = ParallelAxisComponentsOptions;
```

</details>

Related types: [`ParallelAxisComponentsOptions`](#type-parallelaxiscomponentsoptions).

### `EditParallelScaleOptions` {#type-editparallelscaleoptions}

<details markdown="1">
<summary>Expand EditParallelScaleOptions</summary>

```typescript
export type EditParallelScaleOptions = {
  target: string;
  dimension: string;
} & WithoutScaleId<
  QuantitativePositionScaleOptions | CategoricalPositionScaleOptions
>;
```

</details>

Related types: [`WithoutScaleId`](#type-withoutscaleid) · [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `EditPolarAxisOptions` {#type-editpolaraxisoptions}

<details markdown="1">
<summary>Expand EditPolarAxisOptions</summary>

```typescript
export interface EditPolarAxisOptions {
  angle?: number;
  line?: false | AxisLineStyleOptions;
  ticks?: false | PolarTickOptions;
  labels?: false | PolarLabelOptions;
  ticksAndLabels?: false | PolarTicksAndLabelsOptions;
  title?: false | PolarTitleOptions;
}
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`PolarTickOptions`](#type-polartickoptions) · [`PolarLabelOptions`](#type-polarlabeloptions) · [`PolarTicksAndLabelsOptions`](#type-polarticksandlabelsoptions) · [`PolarTitleOptions`](#type-polartitleoptions).

### `EditPolarGridOptions` {#type-editpolargridoptions}

<details markdown="1">
<summary>Expand EditPolarGridOptions</summary>

```typescript
export interface EditPolarGridOptions {
  count?: number;
  values?: readonly AxisValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `EditRScaleOptions` {#type-editrscaleoptions}

<details markdown="1">
<summary>Expand EditRScaleOptions</summary>

```typescript
export type EditRScaleOptions = FocusedScaleSelection & WithoutScaleId<RadiusScaleOptions> & {
  radialMapping?: RadialMapping;
};
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`RadiusScaleOptions`](#type-radiusscaleoptions) · [`RadialMapping`](#type-radialmapping).

### `EditRadialAxisOptions` {#type-editradialaxisoptions}

<details markdown="1">
<summary>Expand EditRadialAxisOptions</summary>

```typescript
export interface EditRadialAxisOptions
  extends Omit<EditPolarAxisOptions, "title"> {
  title?: false | RadialTitleOptions;
}
```

</details>

Related types: [`EditPolarAxisOptions`](#type-editpolaraxisoptions) · [`RadialTitleOptions`](#type-radialtitleoptions).

### `EditRaincloudPlotOptions` {#type-editraincloudplotoptions}

<details markdown="1">
<summary>Expand EditRaincloudPlotOptions</summary>

```typescript
export interface EditRaincloudPlotOptions {
  target?: string;
  data?: string;
  category?: RaincloudCategoryChannel;
  value?: RaincloudValueChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | RaincloudDensityOptions;
  summary?: false | RaincloudSummaryOptions;
  points?: false | RaincloudPointsOptions;
  color?: false | LineCategoricalColorChannel;
}
```

</details>

Related types: [`RaincloudCategoryChannel`](#type-raincloudcategorychannel) · [`RaincloudValueChannel`](#type-raincloudvaluechannel) · [`RaincloudDensityOptions`](#type-rainclouddensityoptions) · [`RaincloudSummaryOptions`](#type-raincloudsummaryoptions) · [`RaincloudPointsOptions`](#type-raincloudpointsoptions) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel).

### `EditRectMarkOptions` {#type-editrectmarkoptions}

<details markdown="1">
<summary>Expand EditRectMarkOptions</summary>

```typescript
export interface EditRectMarkOptions extends Omit<RectMarkOptions, "id" | "data"> {
  target?: string;
}
```

</details>

Related types: [`RectMarkOptions`](#type-rectmarkoptions).

### `EditRegressionDataOptions` {#type-editregressiondataoptions}

<details markdown="1">
<summary>Expand EditRegressionDataOptions</summary>

```typescript
export type EditRegressionDataOptions = FocusedDerivedDataEdit<RegressionDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`RegressionDataOptions`](#type-regressiondataoptions).

### `EditRegressionOptions` {#type-editregressionoptions}

<details markdown="1">
<summary>Expand EditRegressionOptions</summary>

```typescript
export interface EditRegressionOptions {
  target?: string;
  data?: string;
  x?: string;
  y?: string;
  groupBy?: string | false;
  method?: RegressionMethod;
  degree?: number;
  span?: number;
  robustIterations?: number;
  confidenceMethod?: ConfidenceIntervalMethod;
  level?: number;
  confidence?: number;
  interval?: RegressionInterval | false;
  missing?: "error" | "drop";
  predict?: RegressionPredictOptions | false;
  band?: false | RegressionBandOptions;
  line?: StrokeStyleDetails & { strokeWidth?: number; curve?: CurveInterpolation };
  sourceBinding?: "fixed" | "follow";
}
```

</details>

Related types: [`RegressionMethod`](#type-regressionmethod) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`RegressionInterval`](#type-regressioninterval) · [`RegressionPredictOptions`](#type-regressionpredictoptions) · [`RegressionBandOptions`](#type-regressionbandoptions) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `EditScaleOptions` {#type-editscaleoptions}

<details markdown="1">
<summary>Expand EditScaleOptions</summary>

```typescript
export interface EditScaleOptions {
  radialMapping?: RadialMapping;
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  emptyDomain?: "preserve" | "require-explicit";
  range?: ScaleRange;
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
  constant?: number;
  paddingInner?: number;
  paddingOuter?: number;
  padding?: number;
  align?: number;
  palette?: Palette;
  interpolate?: ContinuousColorInterpolation;
  midpoint?: number | "auto";
  unknown?: unknown;
}
```

</details>

Related types: [`RadialMapping`](#type-radialmapping) · [`ScaleType`](#type-scaletype) · [`ScaleRange`](#type-scalerange) · [`Palette`](#type-palette) · [`ContinuousColorInterpolation`](#type-continuouscolorinterpolation).

### `EditSemanticOptions` {#type-editsemanticoptions}

<details markdown="1">
<summary>Expand EditSemanticOptions</summary>

```typescript
export type EditSemanticOptions =
  | { property: string; value: unknown; remove?: false }
  | { property: string; remove: true; value?: never };
```

</details>

### `EditShapeScaleOptions` {#type-editshapescaleoptions}

<details markdown="1">
<summary>Expand EditShapeScaleOptions</summary>

```typescript
export type EditShapeScaleOptions = FocusedScaleSelection & WithoutScaleId<ShapeScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`ShapeScaleOptions`](#type-shapescaleoptions).

### `EditSizeScaleOptions` {#type-editsizescaleoptions}

<details markdown="1">
<summary>Expand EditSizeScaleOptions</summary>

```typescript
export type EditSizeScaleOptions = FocusedScaleSelection &
  (ExistingSizeScaleEditPatch | SizeScaleTypeEditPatch);
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`ExistingSizeScaleEditPatch`](#type-existingsizescaleeditpatch) · [`SizeScaleTypeEditPatch`](#type-sizescaletypeeditpatch).

### `EditSortedDataOptions` {#type-editsorteddataoptions}

<details markdown="1">
<summary>Expand EditSortedDataOptions</summary>

```typescript
export interface EditSortedDataOptions {
  target: string;
  sortBy: readonly [SortKey, ...SortKey[]];
  dependents?: DerivedDataDependents;
}
```

</details>

Related types: [`SortKey`](#type-sortkey) · [`DerivedDataDependents`](#type-deriveddatadependents).

### `EditStackDataOptions` {#type-editstackdataoptions}

<details markdown="1">
<summary>Expand EditStackDataOptions</summary>

```typescript
export type EditStackDataOptions = FocusedDerivedDataEdit<StackDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`StackDataOptions`](#type-stackdataoptions).

### `EditStrokeDashScaleOptions` {#type-editstrokedashscaleoptions}

<details markdown="1">
<summary>Expand EditStrokeDashScaleOptions</summary>

```typescript
export type EditStrokeDashScaleOptions = FocusedScaleSelection & WithoutScaleId<DashScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`DashScaleOptions`](#type-dashscaleoptions).

### `EditStrokeScaleOptions` {#type-editstrokescaleoptions}

<details markdown="1">
<summary>Expand EditStrokeScaleOptions</summary>

```typescript
export type EditStrokeScaleOptions = { target: string } & Omit<
  EditColorScaleOptions,
  "id" | "target"
>;
```

</details>

Related types: [`EditColorScaleOptions`](#type-editcolorscaleoptions).

### `EditStrokeWidthScaleOptions` {#type-editstrokewidthscaleoptions}

<details markdown="1">
<summary>Expand EditStrokeWidthScaleOptions</summary>

```typescript
export type EditStrokeWidthScaleOptions = FocusedScaleSelection & WithoutScaleId<StrokeWidthScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`StrokeWidthScaleOptions`](#type-strokewidthscaleoptions).

### `EditSummaryDataOptions` {#type-editsummarydataoptions}

<details markdown="1">
<summary>Expand EditSummaryDataOptions</summary>

```typescript
export type EditSummaryDataOptions = FocusedWeightedDerivedDataEdit<
  SummaryDataOptions,
  StatisticalWeight
>;
```

</details>

Related types: [`FocusedWeightedDerivedDataEdit`](#type-focusedweightedderiveddataedit) · [`SummaryDataOptions`](#type-summarydataoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `EditTextMarkOptions` {#type-edittextmarkoptions}

<details markdown="1">
<summary>Expand EditTextMarkOptions</summary>

```typescript
export interface EditTextMarkOptions extends Omit<TextMarkOptions, "id" | "data" | "source" | "text"> {
  target?: string;
}
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions).

### `EditThetaAxisOptions` {#type-editthetaaxisoptions}

<details markdown="1">
<summary>Expand EditThetaAxisOptions</summary>

```typescript
export interface EditThetaAxisOptions
  extends Omit<EditPolarAxisOptions, "angle" | "labels" | "ticksAndLabels"> {
  labels?: false | ThetaAxisLabelOptions;
  ticksAndLabels?: false | ThetaTicksAndLabelsOptions;
}
```

</details>

Related types: [`EditPolarAxisOptions`](#type-editpolaraxisoptions) · [`ThetaAxisLabelOptions`](#type-thetaaxislabeloptions) · [`ThetaTicksAndLabelsOptions`](#type-thetaticksandlabelsoptions).

### `EditThetaScaleOptions` {#type-editthetascaleoptions}

<details markdown="1">
<summary>Expand EditThetaScaleOptions</summary>

```typescript
export type EditThetaScaleOptions = FocusedScaleSelection & WithoutScaleId<ThetaScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`ThetaScaleOptions`](#type-thetascaleoptions).

### `EditTimeUnitDataOptions` {#type-edittimeunitdataoptions}

<details markdown="1">
<summary>Expand EditTimeUnitDataOptions</summary>

```typescript
export type EditTimeUnitDataOptions = FocusedDerivedDataEdit<TimeUnitDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`TimeUnitDataOptions`](#type-timeunitdataoptions).

### `EditTitleOptions` {#type-edittitleoptions}

<details markdown="1">
<summary>Expand EditTitleOptions</summary>

```typescript
export interface EditTitleOptions
  extends Omit<TitleOptions, "text" | "subtitle"> {
  text?: string;
  subtitle?: string | false;
}
```

</details>

Related types: [`TitleOptions`](#type-titleoptions).

### `EditViolinPlotOptions` {#type-editviolinplotoptions}

<details markdown="1">
<summary>Expand EditViolinPlotOptions</summary>

```typescript
export interface EditViolinPlotOptions {
  target?: string;
  data?: string;
  x?: ViolinPlotPositionChannel;
  y?: ViolinPlotPositionChannel;
  split?: false | ViolinPlotSplitOptions;
  density?: Omit<ViolinPlotDensityOptions, "weight"> & {
    weight?: StatisticalWeight | false;
  };
}
```

</details>

Related types: [`ViolinPlotPositionChannel`](#type-violinplotpositionchannel) · [`ViolinPlotSplitOptions`](#type-violinplotsplitoptions) · [`ViolinPlotDensityOptions`](#type-violinplotdensityoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `EditWindowDataOptions` {#type-editwindowdataoptions}

<details markdown="1">
<summary>Expand EditWindowDataOptions</summary>

```typescript
export type EditWindowDataOptions = FocusedDerivedDataEdit<WindowDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`WindowDataOptions`](#type-windowdataoptions).

### `EditXOffsetScaleOptions` {#type-editxoffsetscaleoptions}

<details markdown="1">
<summary>Expand EditXOffsetScaleOptions</summary>

```typescript
export type EditXOffsetScaleOptions = { target: string } & OffsetScaleEditPatch;
```

</details>

Related types: [`OffsetScaleEditPatch`](#type-offsetscaleeditpatch).

### `EditXScaleOptions` {#type-editxscaleoptions}

<details markdown="1">
<summary>Expand EditXScaleOptions</summary>

```typescript
export type EditXScaleOptions = FocusedScaleSelection & WithoutScaleId<
  QuantitativePositionScaleOptions | TemporalPositionScaleOptions | CategoricalPositionScaleOptions
>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`TemporalPositionScaleOptions`](#type-temporalpositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `EditYOffsetScaleOptions` {#type-edityoffsetscaleoptions}

<details markdown="1">
<summary>Expand EditYOffsetScaleOptions</summary>

```typescript
export type EditYOffsetScaleOptions = EditXOffsetScaleOptions;
```

</details>

Related types: [`EditXOffsetScaleOptions`](#type-editxoffsetscaleoptions).

### `EditYScaleOptions` {#type-edityscaleoptions}

<details markdown="1">
<summary>Expand EditYScaleOptions</summary>

```typescript
export type EditYScaleOptions = EditXScaleOptions;
```

</details>

Related types: [`EditXScaleOptions`](#type-editxscaleoptions).

### `EncodeChannelsOptions` {#type-encodechannelsoptions}

<details markdown="1">
<summary>Expand EncodeChannelsOptions</summary>

```typescript
export interface EncodeChannelsOptions {
  target: string;
  channels: AtLeastOne<EncodingChannelAssignments>;
}
```

</details>

Related types: [`AtLeastOne`](#type-atleastone) · [`EncodingChannelAssignments`](#type-encodingchannelassignments).

### `EncodingChannelAssignments` {#type-encodingchannelassignments}

<details markdown="1">
<summary>Expand EncodingChannelAssignments</summary>

```typescript
export interface EncodingChannelAssignments {
  x?: WithoutEncodingTarget<PositionEncodingOptions | DatumPositionEncodingOptions>;
  y?: WithoutEncodingTarget<YPositionEncodingOptions | DatumPositionEncodingOptions>;
  x2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions>;
  y2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions>;
  theta?: WithoutEncodingTarget<ThetaEncodingOptions>;
  r?: WithoutEncodingTarget<RadialEncodingOptions>;
  xOffset?: WithoutEncodingTarget<XOffsetEncodingOptions>;
  yOffset?: WithoutEncodingTarget<YOffsetEncodingOptions>;
  group?: WithoutEncodingTarget<GroupEncodingOptions>;
  pathOrder?: WithoutEncodingTarget<PathOrderEncodingOptions>;
  color?: WithoutEncodingTarget<ColorEncodingOptions>;
  stroke?: WithoutEncodingTarget<StrokeEncodingOptions>;
  size?: WithoutEncodingTarget<SizeEncodingOptions>;
  shape?: WithoutEncodingTarget<ShapeEncodingOptions>;
  opacity?: WithoutEncodingTarget<OpacityEncodingOptions>;
  strokeWidth?: WithoutEncodingTarget<StrokeWidthEncodingOptions>;
  strokeDash?: WithoutEncodingTarget<StrokeDashEncodingOptions>;
  angle?: WithoutEncodingTarget<AngleEncodingOptions>;
  text?: WithoutEncodingTarget<TextEncodingOptions>;
}
```

</details>

Related types: [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`PositionEncodingOptions`](#type-positionencodingoptions) · [`DatumPositionEncodingOptions`](#type-datumpositionencodingoptions) · [`YPositionEncodingOptions`](#type-ypositionencodingoptions) · [`SecondaryPositionEncodingOptions`](#type-secondarypositionencodingoptions) · [`ThetaEncodingOptions`](#type-thetaencodingoptions) · [`RadialEncodingOptions`](#type-radialencodingoptions) · [`XOffsetEncodingOptions`](#type-xoffsetencodingoptions) · [`YOffsetEncodingOptions`](#type-yoffsetencodingoptions) · [`GroupEncodingOptions`](#type-groupencodingoptions) · [`PathOrderEncodingOptions`](#type-pathorderencodingoptions) · [`ColorEncodingOptions`](#type-colorencodingoptions) · [`StrokeEncodingOptions`](#type-strokeencodingoptions) · [`SizeEncodingOptions`](#type-sizeencodingoptions) · [`ShapeEncodingOptions`](#type-shapeencodingoptions) · [`OpacityEncodingOptions`](#type-opacityencodingoptions) · [`StrokeWidthEncodingOptions`](#type-strokewidthencodingoptions) · [`StrokeDashEncodingOptions`](#type-strokedashencodingoptions) · [`AngleEncodingOptions`](#type-angleencodingoptions) · [`TextEncodingOptions`](#type-textencodingoptions).

### `EndpointCategoryChannel` {#type-endpointcategorychannel}

<details markdown="1">
<summary>Expand EndpointCategoryChannel</summary>

```typescript
export type EndpointCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointCategoricalPositionScaleOptions;
};
```

</details>

Related types: [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `EndpointLabelOptions` {#type-endpointlabeloptions}

<details markdown="1">
<summary>Expand EndpointLabelOptions</summary>

```typescript
export type EndpointLabelOptions = Omit<
  TextMarkOptions,
  "id" | "data" | "source" | "text"
> & {
  format?: TextFormat;
  layout?: false | Omit<LabelLayoutOptions, "target">;
} & (
  | { field?: string; value?: never }
  | { field?: never; value: unknown }
);
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`TextFormat`](#type-textformat) · [`LabelLayoutOptions`](#type-labellayoutoptions).

### `EndpointPlotBaseOptions` {#type-endpointplotbaseoptions}

<details markdown="1">
<summary>Expand EndpointPlotBaseOptions</summary>

```typescript
type EndpointPlotBaseOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  category: EndpointCategoryChannel;
  orientation?: "horizontal" | "vertical";
  summary?: EndpointPlotSummary;
  guides?: false | CartesianGuideOptions;
};
```

</details>

Related types: [`EndpointCategoryChannel`](#type-endpointcategorychannel) · [`EndpointPlotSummary`](#type-endpointplotsummary) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `EndpointPlotSummary` {#type-endpointplotsummary}

<details markdown="1">
<summary>Expand EndpointPlotSummary</summary>

```typescript
export type EndpointPlotSummary = false | "mean" | "median" | "sum" | "min" | "max";
```

</details>

### `EndpointValueChannel` {#type-endpointvaluechannel}

<details markdown="1">
<summary>Expand EndpointValueChannel</summary>

```typescript
export type EndpointValueChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ErrorBandExplicitIntervalChannel` {#type-errorbandexplicitintervalchannel}

<details markdown="1">
<summary>Expand ErrorBandExplicitIntervalChannel</summary>

```typescript
export interface ErrorBandExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ErrorBandIntervalChannel` {#type-errorbandintervalchannel}

<details markdown="1">
<summary>Expand ErrorBandIntervalChannel</summary>

```typescript
export type ErrorBandIntervalChannel =
  | ErrorBandStatisticalIntervalChannel
  | ErrorBandExplicitIntervalChannel;
```

</details>

Related types: [`ErrorBandStatisticalIntervalChannel`](#type-errorbandstatisticalintervalchannel) · [`ErrorBandExplicitIntervalChannel`](#type-errorbandexplicitintervalchannel).

### `ErrorBandOptions` {#type-errorbandoptions}

<details markdown="1">
<summary>Expand ErrorBandOptions</summary>

```typescript
export interface ErrorBandOptions extends StrokeStyleDetails {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  y?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  groupBy?: string;
  coordinate?: string;
  fill?: string;
  opacity?: number;
  curve?: CurveInterpolation;
  boundaries?: false | (StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: DashStyle | DashPattern;
    opacity?: number;
    curve?: CurveInterpolation;
  });
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBandPositionChannel`](#type-errorbandpositionchannel) · [`ErrorBandIntervalChannel`](#type-errorbandintervalchannel) · [`CurveInterpolation`](#type-curveinterpolation) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `ErrorBandPositionChannel` {#type-errorbandpositionchannel}

<details markdown="1">
<summary>Expand ErrorBandPositionChannel</summary>

```typescript
export type ErrorBandPositionChannel = { field?: string } & (
  | {
      fieldType?: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
);
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `ErrorBandStatisticalIntervalChannel` {#type-errorbandstatisticalintervalchannel}

<details markdown="1">
<summary>Expand ErrorBandStatisticalIntervalChannel</summary>

```typescript
export interface ErrorBandStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ErrorBarExplicitIntervalChannel` {#type-errorbarexplicitintervalchannel}

<details markdown="1">
<summary>Expand ErrorBarExplicitIntervalChannel</summary>

```typescript
export interface ErrorBarExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ErrorBarIntervalChannel` {#type-errorbarintervalchannel}

<details markdown="1">
<summary>Expand ErrorBarIntervalChannel</summary>

```typescript
export type ErrorBarIntervalChannel =
  | ErrorBarStatisticalIntervalChannel
  | ErrorBarExplicitIntervalChannel;
```

</details>

Related types: [`ErrorBarStatisticalIntervalChannel`](#type-errorbarstatisticalintervalchannel) · [`ErrorBarExplicitIntervalChannel`](#type-errorbarexplicitintervalchannel).

### `ErrorBarOffsetChannel` {#type-errorbaroffsetchannel}

<details markdown="1">
<summary>Expand ErrorBarOffsetChannel</summary>

```typescript
export interface ErrorBarOffsetChannel {
  field?: string;
  fieldType?: "nominal" | "ordinal";
  scale?: OffsetScaleOptions;
  paddingInner?: number;
  paddingOuter?: number;
}
```

</details>

Related types: [`OffsetScaleOptions`](#type-offsetscaleoptions).

### `ErrorBarOptions` {#type-errorbaroptions}

<details markdown="1">
<summary>Expand ErrorBarOptions</summary>

```typescript
export interface ErrorBarOptions extends StrokeStyleDetails {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  y?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  xOffset?: ErrorBarOffsetChannel;
  yOffset?: ErrorBarOffsetChannel;
  groupBy?: string | false;
  coordinate?: string;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBarPositionChannel`](#type-errorbarpositionchannel) · [`ErrorBarIntervalChannel`](#type-errorbarintervalchannel) · [`ErrorBarOffsetChannel`](#type-errorbaroffsetchannel) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `ErrorBarPositionChannel` {#type-errorbarpositionchannel}

<details markdown="1">
<summary>Expand ErrorBarPositionChannel</summary>

```typescript
export type ErrorBarPositionChannel = { field?: string } & (
  | {
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalPositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | {
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
);
```

</details>

Related types: [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ErrorBarStatisticalIntervalChannel` {#type-errorbarstatisticalintervalchannel}

<details markdown="1">
<summary>Expand ErrorBarStatisticalIntervalChannel</summary>

```typescript
export interface ErrorBarStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  scale?: NonPointQuantitativePositionScaleOptions;
}
```

</details>

Related types: [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ExistingSizeScaleEditPatch` {#type-existingsizescaleeditpatch}

<details markdown="1">
<summary>Expand ExistingSizeScaleEditPatch</summary>

```typescript
type ExistingSizeScaleEditPatch = {
  type?: never;
  domain?: "auto" | readonly [number, ...number[]];
  range?: "auto" | readonly [number, number, ...number[]];
  unknown?: number;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
};
```

</details>

### `FacadePositionChannel` {#type-facadepositionchannel}

<details markdown="1">
<summary>Expand FacadePositionChannel</summary>

```typescript
type FacadePositionChannel<Quantitative, Temporal, Categorical> =
  | string
  | (Omit<PositionEncodingBase, "target" | "coordinate"> &
      PositionScaleBranches<Quantitative, Temporal, Categorical>);
```

</details>

Related types: [`PositionEncodingBase`](#type-positionencodingbase) · [`PositionScaleBranches`](#type-positionscalebranches).

### `FacetGridOptions` {#type-facetgridoptions}

<details markdown="1">
<summary>Expand FacetGridOptions</summary>

```typescript
export interface FacetGridOptions {
  id?: string;
  data?: string;
  rows: FacetGridRole;
  columns: FacetGridRole;
  combinations?: "observed" | "full";
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}
```

</details>

Related types: [`FacetGridRole`](#type-facetgridrole) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions).

### `FacetGridRole` {#type-facetgridrole}

<details markdown="1">
<summary>Expand FacetGridRole</summary>

```typescript
export interface FacetGridRole {
  field: string;
  values?: readonly DatasetScalar[];
}
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar).

### `FacetGuideOptions` {#type-facetguideoptions}

<details markdown="1">
<summary>Expand FacetGuideOptions</summary>

```typescript
export interface FacetGuideOptions {
  axes?: "each" | "outer";
  legend?: false | "shared";
}
```

</details>

### `FacetHeaderAlign` {#type-facetheaderalign}

<details markdown="1">
<summary>Expand FacetHeaderAlign</summary>

```typescript
export type FacetHeaderAlign = "start" | "center" | "end";
```

</details>

### `FacetHeaderRole` {#type-facetheaderrole}

<details markdown="1">
<summary>Expand FacetHeaderRole</summary>

```typescript
export type FacetHeaderRole = "all" | "row" | "column";
```

</details>

### `FacetHeaderSide` {#type-facetheaderside}

<details markdown="1">
<summary>Expand FacetHeaderSide</summary>

```typescript
export type FacetHeaderSide = "top" | "bottom" | "left" | "right";
```

</details>

### `FacetOptions` {#type-facetoptions}

<details markdown="1">
<summary>Expand FacetOptions</summary>

```typescript
export interface FacetOptions {
  id?: string;
  field: string;
  data?: string;
  values?: readonly DatasetScalar[];
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions).

### `FacetScaleResolution` {#type-facetscaleresolution}

<details markdown="1">
<summary>Expand FacetScaleResolution</summary>

```typescript
export type FacetScaleResolution = "shared" | "independent";
```

</details>

### `FacetScaleResolutions` {#type-facetscaleresolutions}

<details markdown="1">
<summary>Expand FacetScaleResolutions</summary>

```typescript
export interface FacetScaleResolutions {
  x?: FacetScaleResolution;
  y?: FacetScaleResolution;
  xOffset?: FacetScaleResolution;
  yOffset?: FacetScaleResolution;
  theta?: FacetScaleResolution;
  r?: FacetScaleResolution;
  color?: FacetScaleResolution;
  stroke?: FacetScaleResolution;
  size?: FacetScaleResolution;
  shape?: FacetScaleResolution;
  opacity?: FacetScaleResolution;
  strokeDash?: FacetScaleResolution;
  parallelDimensions?: FacetScaleResolution;
}
```

</details>

Related types: [`FacetScaleResolution`](#type-facetscaleresolution).

### `FieldType` {#type-fieldtype}

<details markdown="1">
<summary>Expand FieldType</summary>

```typescript
export type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
```

</details>

### `FilledMarkLegendOptions` {#type-filledmarklegendoptions}

<details markdown="1">
<summary>Expand FilledMarkLegendOptions</summary>

```typescript
type FilledMarkLegendOptions = Omit<LegendOptions, "symbol"> & {
  symbol?: "auto"
    | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
    | { layers: readonly LegendSymbolLayer[] };
};
```

</details>

Related types: [`LegendOptions`](#type-legendoptions) · [`LegendSymbolLayer`](#type-legendsymbollayer).

### `FilledMarkStroke` {#type-filledmarkstroke}

<details markdown="1">
<summary>Expand FilledMarkStroke</summary>

```typescript
type FilledMarkStroke = string | false;
```

</details>

### `FilterBound` {#type-filterbound}

<details markdown="1">
<summary>Expand FilterBound</summary>

```typescript
type FilterBound = number | string;
```

</details>

### `FilterComparison` {#type-filtercomparison}

<details markdown="1">
<summary>Expand FilterComparison</summary>

```typescript
export type FilterComparison =
  | { op: "eq" | "neq"; value: unknown }
  | { op: "lt" | "lte" | "gt" | "gte"; value: number | string };
```

</details>

### `FilterDataOptions` {#type-filterdataoptions}

<details markdown="1">
<summary>Expand FilterDataOptions</summary>

```typescript
export type FilterDataOptions = {
  id: string;
  source?: string;
  field: string;
  nulls?: "include" | "exclude";
} & FilterModeOptions;
```

</details>

Related types: [`FilterModeOptions`](#type-filtermodeoptions).

### `FilterMarksOptions` {#type-filtermarksoptions}

<details markdown="1">
<summary>Expand FilterMarksOptions</summary>

```typescript
export type FilterMarksOptions = {
  target?: string;
  mode?: "replace" | "compose";
} & MarkSelector;
```

</details>

Related types: [`MarkSelector`](#type-markselector).

### `FilterModeOptions` {#type-filtermodeoptions}

<details markdown="1">
<summary>Expand FilterModeOptions</summary>

```typescript
export type FilterModeOptions =
  | { oneOf: readonly [DatasetScalar, ...DatasetScalar[]]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly [DatasetScalar, ...DatasetScalar[]]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRange };
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`FilterComparison`](#type-filtercomparison) · [`FilterRange`](#type-filterrange).

### `FilterModePatch` {#type-filtermodepatch}

<details markdown="1">
<summary>Expand FilterModePatch</summary>

```typescript
type FilterModePatch =
  | { oneOf: readonly [DatasetScalar, ...DatasetScalar[]]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly [DatasetScalar, ...DatasetScalar[]]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRangePatch }
  | { oneOf?: never; noneOf?: never; predicate?: never; range?: never };
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`FilterComparison`](#type-filtercomparison) · [`FilterRangePatch`](#type-filterrangepatch).

### `FilterRange` {#type-filterrange}

<details markdown="1">
<summary>Expand FilterRange</summary>

```typescript
export type FilterRange = FilterRangeBounds & FilterRangeClosure;
```

</details>

Related types: [`FilterRangeBounds`](#type-filterrangebounds) · [`FilterRangeClosure`](#type-filterrangeclosure).

### `FilterRangeBounds` {#type-filterrangebounds}

<details markdown="1">
<summary>Expand FilterRangeBounds</summary>

```typescript
type FilterRangeBounds =
  | { min: FilterBound; max?: FilterBound }
  | { min?: FilterBound; max: FilterBound };
```

</details>

Related types: [`FilterBound`](#type-filterbound).

### `FilterRangeClosure` {#type-filterrangeclosure}

<details markdown="1">
<summary>Expand FilterRangeClosure</summary>

```typescript
type FilterRangeClosure =
  | { inclusive?: boolean; minInclusive?: never; maxInclusive?: never }
  | { inclusive?: never; minInclusive?: boolean; maxInclusive?: boolean };
```

</details>

### `FilterRangePatch` {#type-filterrangepatch}

<details markdown="1">
<summary>Expand FilterRangePatch</summary>

```typescript
export type FilterRangePatch = FilterRangeClosure & {
  min?: FilterBound | false;
  max?: FilterBound | false;
};
```

</details>

Related types: [`FilterRangeClosure`](#type-filterrangeclosure) · [`FilterBound`](#type-filterbound).

### `FitCanvasOptions` {#type-fitcanvasoptions}

<details markdown="1">
<summary>Expand FitCanvasOptions</summary>

```typescript
export interface FitCanvasOptions {
  /** Minimum fitted margin on every Canvas edge. Defaults to 0. */
  padding?: number;
  /** Required final plot width. Defaults to 160. */
  minPlotWidth?: number;
  /** Required final plot height. Defaults to 120. */
  minPlotHeight?: number;
  /** Maximum binary-search probes per edge. Defaults to 32; maximum 64. */
  iterationLimit?: number;
  /** Reject an unsatisfied fit or preserve it with a structured overflow result. */
  overflow?: "error" | "report";
}
```

</details>

### `FocusedDerivedDataEdit` {#type-focusedderiveddataedit}

<details markdown="1">
<summary>Expand FocusedDerivedDataEdit</summary>

```typescript
type FocusedDerivedDataEdit<T> = {
  target: string;
  dependents?: DerivedDataDependents;
} & FocusedDerivedDataPatch<T>;
```

</details>

Related types: [`DerivedDataDependents`](#type-deriveddatadependents) · [`FocusedDerivedDataPatch`](#type-focusedderiveddatapatch).

### `FocusedDerivedDataPatch` {#type-focusedderiveddatapatch}

<details markdown="1">
<summary>Expand FocusedDerivedDataPatch</summary>

```typescript
type FocusedDerivedDataPatch<T> = T extends unknown
  ? Partial<Omit<T, "id" | "source">>
  : never;
```

</details>

### `FocusedScaleSelection` {#type-focusedscaleselection}

<details markdown="1">
<summary>Expand FocusedScaleSelection</summary>

```typescript
type FocusedScaleSelection = { id?: string; target?: string };
```

</details>

### `FocusedWeightedDerivedDataEdit` {#type-focusedweightedderiveddataedit}

<details markdown="1">
<summary>Expand FocusedWeightedDerivedDataEdit</summary>

```typescript
type FocusedWeightedDerivedDataEdit<T, Weight> = {
  target: string;
  dependents?: DerivedDataDependents;
} & (T extends unknown
  ? Omit<FocusedDerivedDataPatch<T>, "weight"> & { weight?: Weight | false }
  : never);
```

</details>

Related types: [`DerivedDataDependents`](#type-deriveddatadependents) · [`FocusedDerivedDataPatch`](#type-focusedderiveddatapatch).

### `FoldDataOptions` {#type-folddataoptions}

<details markdown="1">
<summary>Expand FoldDataOptions</summary>

```typescript
export interface FoldDataOptions {
  id: string;
  source?: string;
  fields: readonly string[];
  as?: FoldDataOutputFields;
}
```

</details>

Related types: [`FoldDataOutputFields`](#type-folddataoutputfields).

### `FoldDataOutputFields` {#type-folddataoutputfields}

<details markdown="1">
<summary>Expand FoldDataOutputFields</summary>

```typescript
export interface FoldDataOutputFields {
  key?: string;
  value?: string;
}
```

</details>

### `GradientPlotAppearanceOptions` {#type-gradientplotappearanceoptions}

<details markdown="1">
<summary>Expand GradientPlotAppearanceOptions</summary>

```typescript
export interface GradientPlotAppearanceOptions {
  palette?: Palette;
  opacity?: readonly [number, number];
}
```

</details>

Related types: [`Palette`](#type-palette).

### `GradientPlotCenterOptions` {#type-gradientplotcenteroptions}

<details markdown="1">
<summary>Expand GradientPlotCenterOptions</summary>

```typescript
export interface GradientPlotCenterOptions extends StrokeStyleDetails {
  type?: "mean" | "median";
  stroke?: string;
  strokeWidth?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails).

### `GradientPlotDensityLegendOptions` {#type-gradientplotdensitylegendoptions}

<details markdown="1">
<summary>Expand GradientPlotDensityLegendOptions</summary>

```typescript
type GradientPlotDensityLegendOptions = {
  title?: string;
  position?: "right";
};
```

</details>

### `GradientPlotDensityOptions` {#type-gradientplotdensityoptions}

<details markdown="1">
<summary>Expand GradientPlotDensityOptions</summary>

```typescript
export interface GradientPlotDensityOptions {
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization).

### `GradientPlotGuideOptions` {#type-gradientplotguideoptions}

<details markdown="1">
<summary>Expand GradientPlotGuideOptions</summary>

```typescript
type GradientPlotGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | GradientPlotDensityLegendOptions;
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`GradientPlotDensityLegendOptions`](#type-gradientplotdensitylegendoptions).

### `GradientPlotOptions` {#type-gradientplotoptions}

<details markdown="1">
<summary>Expand GradientPlotOptions</summary>

```typescript
export interface GradientPlotOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: GradientPlotPositionChannel;
  y?: GradientPlotPositionChannel;
  coordinate?: string;
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
  guides?: false | GradientPlotGuideOptions;
}
```

</details>

Related types: [`GradientPlotPositionChannel`](#type-gradientplotpositionchannel) · [`GradientPlotDensityOptions`](#type-gradientplotdensityoptions) · [`GradientPlotAppearanceOptions`](#type-gradientplotappearanceoptions) · [`GradientPlotCenterOptions`](#type-gradientplotcenteroptions) · [`GradientPlotGuideOptions`](#type-gradientplotguideoptions).

### `GradientPlotPositionChannel` {#type-gradientplotpositionchannel}

<details markdown="1">
<summary>Expand GradientPlotPositionChannel</summary>

```typescript
export type GradientPlotPositionChannel = BoxPlotPositionChannel;
```

</details>

Related types: [`BoxPlotPositionChannel`](#type-boxplotpositionchannel).

### `GraphicType` {#type-graphictype}

<details markdown="1">
<summary>Expand GraphicType</summary>

```typescript
export type GraphicType =
  | "canvas"
  | "collection"
  | "circle"
  | "rect"
  | "line"
  | "text"
  | "path";
```

</details>

### `GridDirectionOptions` {#type-griddirectionoptions}

<details markdown="1">
<summary>Expand GridDirectionOptions</summary>

```typescript
export interface GridDirectionOptions {
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly number[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

### `GroupEncodingOptions` {#type-groupencodingoptions}

<details markdown="1">
<summary>Expand GroupEncodingOptions</summary>

```typescript
export type GroupEncodingOptions = { target?: string; fieldType?: "nominal" } & (
  | { field: string; fields?: never }
  | { fields: readonly [string, ...string[]]; field?: never }
);
```

</details>

### `HeatmapBaseOptions` {#type-heatmapbaseoptions}

<details markdown="1">
<summary>Expand HeatmapBaseOptions</summary>

```typescript
export interface HeatmapBaseOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  rect?: RectStyleDetails & {
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  };
  guides?: false | CartesianGuideOptions;
}
```

</details>

Related types: [`RectStyleDetails`](#type-rectstyledetails) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `HeatmapBinOptions` {#type-heatmapbinoptions}

<details markdown="1">
<summary>Expand HeatmapBinOptions</summary>

```typescript
export interface HeatmapBinOptions {
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  includeEmpty?: boolean;
}
```

</details>

Related types: [`Bin2DCounts`](#type-bin2dcounts) · [`Bin2DExtent`](#type-bin2dextent).

### `HeatmapCategoryPositionChannel` {#type-heatmapcategorypositionchannel}

<details markdown="1">
<summary>Expand HeatmapCategoryPositionChannel</summary>

```typescript
export type HeatmapCategoryPositionChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointBandPositionScaleOptions;
    };
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `HighlightMarksOptions` {#type-highlightmarksoptions}

<details markdown="1">
<summary>Expand HighlightMarksOptions</summary>

```typescript
export interface HighlightMarksOptions {
  id?: string;
  target?: string;
  select?: MarkSelector;
  selection?: string;
  color?: string;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  shape?: PointShape;
  size?: number;
  offset?: { x?: number; y?: number };
  dimOthers?: boolean | { opacity?: number };
  bringToFront?: boolean;
}
```

</details>

Related types: [`MarkSelector`](#type-markselector) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern) · [`PointShape`](#type-pointshape).

### `HistogramCategoricalColorChannel` {#type-histogramcategoricalcolorchannel}

<details markdown="1">
<summary>Expand HistogramCategoricalColorChannel</summary>

```typescript
type HistogramCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: Exclude<ColorLayout, "center">;
    };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ColorLayout`](#type-colorlayout).

### `HistogramEncodingOptions` {#type-histogramencodingoptions}

<details markdown="1">
<summary>Expand HistogramEncodingOptions</summary>

```typescript
export type HistogramEncodingOptions = {
  field: string;
  target?: string;
  coordinate?: string;
  stack?: StackMode;
  xScale?: NonPointQuantitativePositionScaleOptions;
  yScale?: NonPointZeroSupportingPositionScaleOptions;
  weight?: StatisticalWeight;
} & (
  | { maxBins?: number; binStep?: never; binBoundaries?: never }
  | { maxBins?: never; binStep: number; binBoundaries?: never }
  | {
      maxBins?: never;
      binStep?: never;
      binBoundaries: readonly [number, number, ...number[]];
    }
);
```

</details>

Related types: [`StackMode`](#type-stackmode) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `HorizonEncodingOptions` {#type-horizonencodingoptions}

<details markdown="1">
<summary>Expand HorizonEncodingOptions</summary>

```typescript
export interface HorizonEncodingOptions {
  target?: string;
  source?: string;
  x?: string | HorizonXEncoding;
  y?: string | HorizonYEncoding;
  groupBy?: string | false;
  bands?: number;
  baseline?: number;
  extent?: "auto" | number;
  resolve?: HorizonResolution;
  missing?: HorizonMissingPolicy;
  overflow?: HorizonOverflowPolicy;
  palette?: HorizonPaletteOptions;
}
```

</details>

Related types: [`HorizonXEncoding`](#type-horizonxencoding) · [`HorizonYEncoding`](#type-horizonyencoding) · [`HorizonResolution`](#type-horizonresolution) · [`HorizonMissingPolicy`](#type-horizonmissingpolicy) · [`HorizonOverflowPolicy`](#type-horizonoverflowpolicy) · [`HorizonPaletteOptions`](#type-horizonpaletteoptions).

### `HorizonMissingPolicy` {#type-horizonmissingpolicy}

<details markdown="1">
<summary>Expand HorizonMissingPolicy</summary>

```typescript
export type HorizonMissingPolicy = "break" | "error";
```

</details>

### `HorizonOutputFields` {#type-horizonoutputfields}

<details markdown="1">
<summary>Expand HorizonOutputFields</summary>

```typescript
export interface HorizonOutputFields {
  readonly x: string;
  readonly lower: string;
  readonly upper: string;
  readonly group: string;
  readonly color: string;
  readonly sign: string;
  readonly band: string;
  readonly segment: string;
}
```

</details>

### `HorizonOverflowPolicy` {#type-horizonoverflowpolicy}

<details markdown="1">
<summary>Expand HorizonOverflowPolicy</summary>

```typescript
export type HorizonOverflowPolicy = "clip" | "error";
```

</details>

### `HorizonPaletteOptions` {#type-horizonpaletteoptions}

<details markdown="1">
<summary>Expand HorizonPaletteOptions</summary>

```typescript
export interface HorizonPaletteOptions {
  positive?: Palette;
  negative?: Palette;
}
```

</details>

Related types: [`Palette`](#type-palette).

### `HorizonPlotGuideOptions` {#type-horizonplotguideoptions}

<details markdown="1">
<summary>Expand HorizonPlotGuideOptions</summary>

```typescript
export type HorizonPlotGuideOptions = {
  axes?: false | (Omit<CAxes, "y"> & { y?: false });
  grid?: false | (Pick<CartesianGridOptions, "vertical"> & { horizontal?: false });
  legend?: false;
};
```

</details>

Related types: [`CAxes`](#type-caxes) · [`CartesianGridOptions`](#type-cartesiangridoptions).

### `HorizonResolution` {#type-horizonresolution}

<details markdown="1">
<summary>Expand HorizonResolution</summary>

```typescript
export type HorizonResolution = "shared" | "independent";
```

</details>

### `HorizonXEncoding` {#type-horizonxencoding}

<details markdown="1">
<summary>Expand HorizonXEncoding</summary>

```typescript
export type HorizonXEncoding = { field: string } & (
  | {
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | {
      fieldType?: undefined;
      scale?:
        | NonPointQuantitativePositionScaleOptions
        | NonPointTemporalPositionScaleOptions;
    }
);
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `HorizonYEncoding` {#type-horizonyencoding}

<details markdown="1">
<summary>Expand HorizonYEncoding</summary>

```typescript
export interface HorizonYEncoding {
  field: string;
  fieldType?: "quantitative";
  scale?: HorizonYScaleOptions;
}
```

</details>

Related types: [`HorizonYScaleOptions`](#type-horizonyscaleoptions).

### `HorizonYScaleOptions` {#type-horizonyscaleoptions}

<details markdown="1">
<summary>Expand HorizonYScaleOptions</summary>

```typescript
export type HorizonYScaleOptions = ScaleFields<"id" | "clamp" | "reverse"> & {
  type?: "linear";
  domain?: readonly [0, 1];
  range?: "auto" | readonly [number, number];
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `ImputedDataBaseOptions` {#type-imputeddatabaseoptions}

<details markdown="1">
<summary>Expand ImputedDataBaseOptions</summary>

```typescript
type ImputedDataBaseOptions = {
  id: string;
  source?: string;
  fields: string | readonly [string, ...string[]];
  groupBy?: string | readonly string[];
  edges?: "keep" | "error";
  maxGap?: number;
};
```

</details>

### `ImputedDataOptions` {#type-imputeddataoptions}

<details markdown="1">
<summary>Expand ImputedDataOptions</summary>

```typescript
export type ImputedDataOptions = ImputedDataBaseOptions & (
  | {
      method: "constant";
      value: DatasetScalar;
      sortBy?: readonly WindowSort[];
    }
  | {
      method: "forward" | "backward";
      value?: never;
      sortBy: readonly [WindowSort, ...WindowSort[]];
    }
  | {
      method: "linear";
      value?: never;
      sortBy: readonly [{ field: string; order?: "ascending" }];
    }
);
```

</details>

Related types: [`ImputedDataBaseOptions`](#type-imputeddatabaseoptions) · [`DatasetScalar`](#type-datasetscalar) · [`WindowSort`](#type-windowsort).

### `InferredRuleDatumPositionEncodingOptions` {#type-inferredruledatumpositionencodingoptions}

<details markdown="1">
<summary>Expand InferredRuleDatumPositionEncodingOptions</summary>

```typescript
type InferredRuleDatumPositionEncodingOptions = {
  field?: never;
  datum: unknown;
  target?: string;
  coordinate?: string;
  fieldType?: undefined;
  scale?:
    | NonPointQuantitativePositionScaleOptions
    | NonPointCategoricalPositionScaleOptions;
};
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `InsertCompositionChildOptions` {#type-insertcompositionchildoptions}

<details markdown="1">
<summary>Expand InsertCompositionChildOptions</summary>

```typescript
export interface InsertCompositionChildOptions {
  id: string;
  program: ChartProgram;
  before?: string;
  after?: string;
}
```

</details>

### `IntervalCenter` {#type-intervalcenter}

<details markdown="1">
<summary>Expand IntervalCenter</summary>

```typescript
export type IntervalCenter = "mean" | "median";
```

</details>

### `IntervalDataOptions` {#type-intervaldataoptions}

<details markdown="1">
<summary>Expand IntervalDataOptions</summary>

```typescript
export interface IntervalDataOptions {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly string[];
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  missing?: "error" | "drop";
  as?: IntervalOutputFields;
}
```

</details>

Related types: [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`IntervalOutputFields`](#type-intervaloutputfields).

### `IntervalExtent` {#type-intervalextent}

<details markdown="1">
<summary>Expand IntervalExtent</summary>

```typescript
export type IntervalExtent = "stderr" | "stdev" | "ci" | "iqr";
```

</details>

### `IntervalOutputFields` {#type-intervaloutputfields}

<details markdown="1">
<summary>Expand IntervalOutputFields</summary>

```typescript
export interface IntervalOutputFields {
  center: string;
  lower: string;
  upper: string;
}
```

</details>

### `IntervalPlotBaseOptions` {#type-intervalplotbaseoptions}

<details markdown="1">
<summary>Expand IntervalPlotBaseOptions</summary>

```typescript
type IntervalPlotBaseOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  xOffset?: ErrorBarOffsetChannel;
  yOffset?: ErrorBarOffsetChannel;
  groupBy?: string | false;
  color?: BasicColorChannel;
  point?: CreateScatterPlotOptions["point"];
  errorBar?: IntervalPlotErrorBarOptions;
  guides?: false | CartesianGuideOptions;
};
```

</details>

Related types: [`ErrorBarOffsetChannel`](#type-errorbaroffsetchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`IntervalPlotErrorBarOptions`](#type-intervalploterrorbaroptions) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `IntervalPlotErrorBarOptions` {#type-intervalploterrorbaroptions}

<details markdown="1">
<summary>Expand IntervalPlotErrorBarOptions</summary>

```typescript
export interface IntervalPlotErrorBarOptions extends StrokeStyleDetails {
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `JitterMaxOffset` {#type-jittermaxoffset}

<details markdown="1">
<summary>Expand JitterMaxOffset</summary>

```typescript
export type JitterMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };
```

</details>

### `JitterPointsOptions` {#type-jitterpointsoptions}

<details markdown="1">
<summary>Expand JitterPointsOptions</summary>

```typescript
export interface JitterPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset: JitterMaxOffset;
  seed?: string | number;
  key?: string;
}
```

</details>

Related types: [`JitterMaxOffset`](#type-jittermaxoffset).

### `LabelLayoutAxis` {#type-labellayoutaxis}

<details markdown="1">
<summary>Expand LabelLayoutAxis</summary>

```typescript
export type LabelLayoutAxis = "x" | "y" | "both";
```

</details>

### `LabelLayoutBounds` {#type-labellayoutbounds}

<details markdown="1">
<summary>Expand LabelLayoutBounds</summary>

```typescript
export type LabelLayoutBounds = "plot" | "canvas";
```

</details>

### `LabelLayoutOptions` {#type-labellayoutoptions}

<details markdown="1">
<summary>Expand LabelLayoutOptions</summary>

```typescript
export interface LabelLayoutOptions {
  target?: string;
  axis?: LabelLayoutAxis;
  padding?: number;
  maxDisplacement?: number;
  bounds?: LabelLayoutBounds;
  leader?: false | LabelLeaderOptions;
}
```

</details>

Related types: [`LabelLayoutAxis`](#type-labellayoutaxis) · [`LabelLayoutBounds`](#type-labellayoutbounds) · [`LabelLeaderOptions`](#type-labelleaderoptions).

### `LabelLeaderOptions` {#type-labelleaderoptions}

<details markdown="1">
<summary>Expand LabelLeaderOptions</summary>

```typescript
export interface LabelLeaderOptions {
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: readonly number[];
  opacity?: number;
}
```

</details>

### `LegendBlockSymbolPatch` {#type-legendblocksymbolpatch}

<details markdown="1">
<summary>Expand LegendBlockSymbolPatch</summary>

```typescript
export interface LegendBlockSymbolPatch {
  /** Point glyph area in square pixels. */
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}
```

</details>

### `LegendBlockTextPatch` {#type-legendblocktextpatch}

<details markdown="1">
<summary>Expand LegendBlockTextPatch</summary>

```typescript
export interface LegendBlockTextPatch {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
}
```

</details>

### `LegendBorderOptions` {#type-legendborderoptions}

<details markdown="1">
<summary>Expand LegendBorderOptions</summary>

```typescript
export interface LegendBorderOptions {
  color?: string;
  lineWidth?: number;
  padding?: number;
  background?: string;
}
```

</details>

### `LegendChannel` {#type-legendchannel}

<details markdown="1">
<summary>Expand LegendChannel</summary>

```typescript
export type LegendChannel = NonNullable<LegendOptions["channels"]>[number];
```

</details>

Related types: [`LegendOptions`](#type-legendoptions).

### `LegendOptions` {#type-legendoptions}

<details markdown="1">
<summary>Expand LegendOptions</summary>

```typescript
export interface LegendOptions {
  /** Categorical, interval, size, or stroke-width layout. Defaults to edge; legacy-bottom is categorical and requires bottom position. */
  layout?: "edge" | "legacy-bottom";
  /** Categorical item order; preserves the appearance scale's assignments. */
  order?: LegendOrder;
  target?: string;
  /** Exact requested content; omission infers encoded point color/shape/size. Explicit subsets include size only when listed. */
  channels?: readonly ("color" | "stroke" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
  position?: "right" | "left" | "bottom" | "top";
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Categorical sides require vertical (the default); horizontal edges default to horizontal. */
  direction?: "horizontal" | "vertical";
  /** Categorical sides allow omission or 1; multiple columns require a horizontal edge. */
  columns?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  titlePosition?: "top" | "left";
  title?: string;
  /** Exact ascending samples for continuous size, opacity, or stroke-width legends. Cannot be combined with count. */
  values?: readonly number[];
  count?: number;
  gradient?: { length?: number; thickness?: number };
  symbol?: LegendSymbolRecipe;
  labels?: LegendTextOptions;
  /** New categorical+size blocks share typography on every edge; retained standalone size styles remain independent. */
  titleStyle?: LegendTitleStyleOptions;
  itemGap?: number;
  border?: boolean | LegendBorderOptions;
}
```

</details>

Related types: [`LegendOrder`](#type-legendorder) · [`LegendSymbolRecipe`](#type-legendsymbolrecipe) · [`LegendTextOptions`](#type-legendtextoptions) · [`LegendTitleStyleOptions`](#type-legendtitlestyleoptions) · [`LegendBorderOptions`](#type-legendborderoptions).

### `LegendOrder` {#type-legendorder}

<details markdown="1">
<summary>Expand LegendOrder</summary>

```typescript
export type LegendOrder = LegendValueOrder |
  { channel: "x" | "y" | "theta"; values?: never };
```

</details>

Related types: [`LegendValueOrder`](#type-legendvalueorder).

### `LegendSymbolLayer` {#type-legendsymbollayer}

<details markdown="1">
<summary>Expand LegendSymbolLayer</summary>

```typescript
export type LegendSymbolLayer =
  | { type: "line"; length?: number; lineWidth?: number }
  | {
      type: "point";
      shape?: "circle";
      size?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
    }
  | {
      type: "swatch";
      width?: number;
      height?: number;
      stroke?: string;
      strokeWidth?: number;
    };
```

</details>

### `LegendSymbolRecipe` {#type-legendsymbolrecipe}

<details markdown="1">
<summary>Expand LegendSymbolRecipe</summary>

```typescript
export type LegendSymbolRecipe =
  | "auto"
  /** Sampled opacity uses a single point recipe; radius defaults to 7 and must be positive. */
  | { type?: "point"; radius?: number; fill?: string; stroke?: string; strokeWidth?: number }
  | { length?: number; lineWidth?: number }
  | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
  | { layers: readonly LegendSymbolLayer[] };
```

</details>

Related types: [`LegendSymbolLayer`](#type-legendsymbollayer).

### `LegendTextOptions` {#type-legendtextoptions}

<details markdown="1">
<summary>Expand LegendTextOptions</summary>

```typescript
export interface LegendTextOptions {
  /** Gap after the occupied sample slot: categorical color/interval default 8; series 10; size/width 12.
   * Categorical slots include all recipe strokes and mapped shape extents.
   * Size retains a minimum 32px slot. Width includes the widest line stroke.
   * Opacity: visible circle-stroke gap, default 12 (inline 8). */
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Continuous numeric/temporal label format. Categorical legends accept auto only. */
  format?: ValueFormat;
}
```

</details>

Related types: [`ValueFormat`](#type-valueformat).

### `LegendTitleStyleOptions` {#type-legendtitlestyleoptions}

<details markdown="1">
<summary>Expand LegendTitleStyleOptions</summary>

```typescript
export interface LegendTitleStyleOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

### `LegendValueOrder` {#type-legendvalueorder}

<details markdown="1">
<summary>Expand LegendValueOrder</summary>

```typescript
type LegendValueOrder = "scale" | { values: readonly CategoryValue[]; channel?: never };
```

</details>

Related types: [`CategoryValue`](#type-categoryvalue).

### `LineCategoricalColorChannel` {#type-linecategoricalcolorchannel}

<details markdown="1">
<summary>Expand LineCategoricalColorChannel</summary>

```typescript
type LineCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
    };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette).

### `LineXPositionChannel` {#type-linexpositionchannel}

<details markdown="1">
<summary>Expand LineXPositionChannel</summary>

```typescript
type LineXPositionChannel =
  | string
  | ({ field: string; bin?: PositionEncodingBase["bin"] } & (
      | {
          fieldType?: "quantitative";
          scale?: NonPointQuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          scale?: NonPointTemporalPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          bin?: never;
          scale?: NonPointCategoricalPositionScaleOptions;
        }
    ));
```

</details>

Related types: [`PositionEncodingBase`](#type-positionencodingbase) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `LineYPositionChannel` {#type-lineypositionchannel}

<details markdown="1">
<summary>Expand LineYPositionChannel</summary>

```typescript
type LineYPositionChannel =
  | string
  | ({ field: string } & (
      | {
          fieldType?: "quantitative";
          aggregate?: AggregateOperation;
          scale?: NonPointQuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          aggregate?: never;
          scale?: NonPointTemporalPositionScaleOptions;
        }
    ));
```

</details>

Related types: [`AggregateOperation`](#type-aggregateoperation) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `MarkGraphicProperty` {#type-markgraphicproperty}

<details markdown="1">
<summary>Expand MarkGraphicProperty</summary>

```typescript
export type MarkGraphicProperty =
  | "x" | "y" | "width" | "height" | "radius"
  | "x1" | "y1" | "x2" | "y2"
  | "fill" | "stroke" | "strokeWidth" | "opacity";
```

</details>

### `MarkLabelAnchor` {#type-marklabelanchor}

<details markdown="1">
<summary>Expand MarkLabelAnchor</summary>

```typescript
export type MarkLabelAnchor =
  | "center"
  | "insideStart"
  | "insideEnd"
  | "outsideStart"
  | "outsideEnd";
```

</details>

### `MarkLabelPlacement` {#type-marklabelplacement}

<details markdown="1">
<summary>Expand MarkLabelPlacement</summary>

```typescript
export interface MarkLabelPlacement {
  anchor: MarkLabelAnchor;
  /** Pixel gap between the source boundary and the nearest text edge. Defaults to 4. */
  gap?: number;
  /** Inside-fit behavior. Defaults to hide. */
  overflow?: "hide" | "outside" | "allow";
  leader?: false | MarkLabelPlacementLeaderOptions;
}
```

</details>

Related types: [`MarkLabelAnchor`](#type-marklabelanchor) · [`MarkLabelPlacementLeaderOptions`](#type-marklabelplacementleaderoptions).

### `MarkLabelPlacementLeaderOptions` {#type-marklabelplacementleaderoptions}

<details markdown="1">
<summary>Expand MarkLabelPlacementLeaderOptions</summary>

```typescript
export interface MarkLabelPlacementLeaderOptions {
  stroke?: string;
  strokeWidth?: number;
}
```

</details>

### `MarkLabelSelectionOptions` {#type-marklabelselectionoptions}

<details markdown="1">
<summary>Expand MarkLabelSelectionOptions</summary>

```typescript
export type MarkLabelSelectionOptions =
  | { select?: never; selection?: never }
  | { select: MarkSelector; selection?: never }
  | { selection: string; select?: never };
```

</details>

Related types: [`MarkSelector`](#type-markselector).

### `MarkSelector` {#type-markselector}

<details markdown="1">
<summary>Expand MarkSelector</summary>

```typescript
export type MarkSelector = {
  grain?: "item" | "stack";
} & (
  | { field: string; channel?: never; property?: never }
  | { channel: "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "group" | "opacity"; field?: never; property?: never }
  | { property: MarkGraphicProperty; field?: never; channel?: never }
) & (
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: unknown }
  | { op: "oneOf"; values: readonly unknown[] }
  | {
      op: "range";
      min: number | string;
      max: number | string;
      inclusive?: boolean;
    }
  | {
      op: "min" | "max";
      count?: number;
      groupBy?: string | readonly string[];
      ties?: "first" | "all";
    }
);
```

</details>

Related types: [`MarkGraphicProperty`](#type-markgraphicproperty).

### `MeasuredRadialGuideOptions` {#type-measuredradialguideoptions}

<details markdown="1">
<summary>Expand MeasuredRadialGuideOptions</summary>

```typescript
export type MeasuredRadialGuideOptions = {
  axes?: false | CategoricalPolarAxesOptions;
  grid?: false | CategoricalPolarGridOptions;
  legend?: false | PieLegendOptions;
};
```

</details>

Related types: [`CategoricalPolarAxesOptions`](#type-categoricalpolaraxesoptions) · [`CategoricalPolarGridOptions`](#type-categoricalpolargridoptions) · [`PieLegendOptions`](#type-pielegendoptions).

### `MeasuredRadiusScaleOptions` {#type-measuredradiusscaleoptions}

<details markdown="1">
<summary>Expand MeasuredRadiusScaleOptions</summary>

```typescript
export type MeasuredRadiusScaleOptions = Pick<RadiusScaleOptions, "id" | "domain" | "range" | "clamp"> & {
  type?: "linear";
  zero?: true;
  nice?: false;
  reverse?: false;
};
```

</details>

Related types: [`RadiusScaleOptions`](#type-radiusscaleoptions).

### `NonPointBandPositionScaleOptions` {#type-nonpointbandpositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointBandPositionScaleOptions</summary>

```typescript
export type NonPointBandPositionScaleOptions = ScaleFields<
  "id" | "reverse" | "paddingInner" | "paddingOuter" | "align"
> & {
  type?: "band";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `NonPointCategoricalColorScaleOptions` {#type-nonpointcategoricalcolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointCategoricalColorScaleOptions</summary>

```typescript
export type NonPointCategoricalColorScaleOptions = ScaleFields<"id" | "palette"> & {
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly string[] | { readonly palette: Palette };
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`Palette`](#type-palette).

### `NonPointCategoricalPositionScaleOptions` {#type-nonpointcategoricalpositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointCategoricalPositionScaleOptions</summary>

```typescript
export type NonPointCategoricalPositionScaleOptions =
  | NonPointBandPositionScaleOptions
  | NonPointPointPositionScaleOptions;
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions) · [`NonPointPointPositionScaleOptions`](#type-nonpointpointpositionscaleoptions).

### `NonPointContinuousColorScaleOptions` {#type-nonpointcontinuouscolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointContinuousColorScaleOptions</summary>

```typescript
export type NonPointContinuousColorScaleOptions = ScaleFields<
  "id" | "interpolate" | "midpoint" | "clamp" | "reverse"
> & {
  type?: "sequential" | "log" | "symlog";
  base?: number;
  constant?: number;
  domain?: "auto" | readonly [unknown, unknown];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | {
    name: PaletteName;
    extent?: readonly [number, number];
  };
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`PaletteName`](#type-palettename).

### `NonPointDiscretizedColorScaleOptions` {#type-nonpointdiscretizedcolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointDiscretizedColorScaleOptions</summary>

```typescript
export type NonPointDiscretizedColorScaleOptions =
  | NonPointQuantizeColorScaleOptions
  | NonPointQuantileColorScaleOptions
  | NonPointThresholdColorScaleOptions;
```

</details>

Related types: [`NonPointQuantizeColorScaleOptions`](#type-nonpointquantizecolorscaleoptions) · [`NonPointQuantileColorScaleOptions`](#type-nonpointquantilecolorscaleoptions) · [`NonPointThresholdColorScaleOptions`](#type-nonpointthresholdcolorscaleoptions).

### `NonPointPointPositionScaleOptions` {#type-nonpointpointpositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointPointPositionScaleOptions</summary>

```typescript
export type NonPointPointPositionScaleOptions = ScaleFields<
  "id" | "reverse" | "padding" | "align"
> & {
  type?: "point";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `NonPointQuantileColorScaleOptions` {#type-nonpointquantilecolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointQuantileColorScaleOptions</summary>

```typescript
export type NonPointQuantileColorScaleOptions = ScaleFields<"id" | "reverse"> & {
  type: "quantile";
  domain?: "auto" | readonly number[];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`PaletteName`](#type-palettename).

### `NonPointQuantitativePositionScaleOptions` {#type-nonpointquantitativepositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointQuantitativePositionScaleOptions</summary>

```typescript
export type NonPointQuantitativePositionScaleOptions = ScaleFields<
  "id" | "nice" | "zero" | "clamp" | "reverse" |
  "base" | "exponent" | "constant"
> & {
  type?: QuantitativePositionScaleType;
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`QuantitativePositionScaleType`](#type-quantitativepositionscaletype).

### `NonPointQuantizeColorScaleOptions` {#type-nonpointquantizecolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointQuantizeColorScaleOptions</summary>

```typescript
export type NonPointQuantizeColorScaleOptions = ScaleFields<
  "id" | "clamp" | "reverse"
> & {
  type: "quantize";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`PaletteName`](#type-palettename).

### `NonPointTemporalPositionScaleOptions` {#type-nonpointtemporalpositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointTemporalPositionScaleOptions</summary>

```typescript
export type NonPointTemporalPositionScaleOptions = ScaleFields<
  "id" | "nice" | "clamp" | "reverse"
> & {
  type?: "time";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `NonPointThresholdColorScaleOptions` {#type-nonpointthresholdcolorscaleoptions}

<details markdown="1">
<summary>Expand NonPointThresholdColorScaleOptions</summary>

```typescript
export type NonPointThresholdColorScaleOptions = ScaleFields<"id" | "reverse"> & {
  type: "threshold";
  domain: readonly number[];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`PaletteName`](#type-palettename).

### `NonPointZeroSupportingPositionScaleOptions` {#type-nonpointzerosupportingpositionscaleoptions}

<details markdown="1">
<summary>Expand NonPointZeroSupportingPositionScaleOptions</summary>

```typescript
export type NonPointZeroSupportingPositionScaleOptions = Omit<
  NonPointQuantitativePositionScaleOptions,
  "base" | "type"
> & { type?: ZeroSupportingPositionScaleType };
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`ZeroSupportingPositionScaleType`](#type-zerosupportingpositionscaletype).

### `NormalizeBaseline` {#type-normalizebaseline}

<details markdown="1">
<summary>Expand NormalizeBaseline</summary>

```typescript
export type NormalizeBaseline =
  | { readonly position: "first" | "last" }
  | { readonly value: number };
```

</details>

### `NormalizeBaselineOptions` {#type-normalizebaselineoptions}

<details markdown="1">
<summary>Expand NormalizeBaselineOptions</summary>

```typescript
type NormalizeBaselineOptions =
  | {
      baseline?: { position: "first" | "last" };
      sortBy: readonly [WindowSort, ...WindowSort[]];
    }
  | {
      baseline: { value: number };
      sortBy?: readonly WindowSort[];
    };
```

</details>

Related types: [`WindowSort`](#type-windowsort).

### `NormalizeZeroDenominator` {#type-normalizezerodenominator}

<details markdown="1">
<summary>Expand NormalizeZeroDenominator</summary>

```typescript
export type NormalizeZeroDenominator = "error" | "null" | "zero";
```

</details>

### `NormalizedDataBaseOptions` {#type-normalizeddatabaseoptions}

<details markdown="1">
<summary>Expand NormalizedDataBaseOptions</summary>

```typescript
type NormalizedDataBaseOptions = {
  id: string;
  source?: string;
  field: string;
  as: string;
  groupBy?: string | readonly string[];
};
```

</details>

### `NormalizedDataOptions` {#type-normalizeddataoptions}

<details markdown="1">
<summary>Expand NormalizedDataOptions</summary>

```typescript
export type NormalizedDataOptions = NormalizedDataBaseOptions & (
  | {
      method: "share" | "minmax";
      zeroDenominator?: NormalizeZeroDenominator;
    }
  | {
      method: "zscore";
      variance?: "population" | "sample";
      zeroDenominator?: NormalizeZeroDenominator;
    }
  | ({
      method: "index" | "percentChange";
      zeroDenominator?: NormalizeZeroDenominator;
    } & NormalizeBaselineOptions)
  | ({ method: "change" } & NormalizeBaselineOptions)
);
```

</details>

Related types: [`NormalizedDataBaseOptions`](#type-normalizeddatabaseoptions) · [`NormalizeZeroDenominator`](#type-normalizezerodenominator) · [`NormalizeBaselineOptions`](#type-normalizebaselineoptions).

### `NumericFormatString` {#type-numericformatstring}

<details markdown="1">
<summary>Expand NumericFormatString</summary>

```typescript
export type NumericFormatString = `.${ValueFormatPrecision}${"f" | "%" | "e"}`;
```

</details>

Related types: [`ValueFormatPrecision`](#type-valueformatprecision).

### `OffsetEncodingOptions` {#type-offsetencodingoptions}

<details markdown="1">
<summary>Expand OffsetEncodingOptions</summary>

```typescript
export interface OffsetEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal" | "ordinal";
  scale?: OffsetScaleOptions;
  paddingInner?: number;
  paddingOuter?: number;
}
```

</details>

Related types: [`OffsetScaleOptions`](#type-offsetscaleoptions).

### `OffsetScaleEditPatch` {#type-offsetscaleeditpatch}

<details markdown="1">
<summary>Expand OffsetScaleEditPatch</summary>

```typescript
export type OffsetScaleEditPatch = Pick<
  ScaleOptions,
  "domain" | "reverse" | "padding" | "paddingInner" | "paddingOuter" | "align"
>;
```

</details>

Related types: [`ScaleOptions`](#type-scaleoptions).

### `OffsetScaleOptions` {#type-offsetscaleoptions}

<details markdown="1">
<summary>Expand OffsetScaleOptions</summary>

```typescript
export interface OffsetScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  reverse?: boolean;
  padding?: number;
  paddingInner?: number;
  paddingOuter?: number;
  align?: number;
}
```

</details>

### `OpacityEncodingOptions` {#type-opacityencodingoptions}

<details markdown="1">
<summary>Expand OpacityEncodingOptions</summary>

```typescript
export type OpacityEncodingOptions =
  | { value: number; field?: never; target?: string; fieldType?: never; scale?: never }
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: OpacityScaleOptions;
    };
```

</details>

Related types: [`OpacityScaleOptions`](#type-opacityscaleoptions).

### `OpacityScaleOptions` {#type-opacityscaleoptions}

<details markdown="1">
<summary>Expand OpacityScaleOptions</summary>

```typescript
export type OpacityScaleOptions = ScaleFields<
  "id" | "nice" | "zero" | "clamp" | "reverse"
> & {
  type?: "linear";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  unknown?: number;
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `OrderCategoriesOptions` {#type-ordercategoriesoptions}

<details markdown="1">
<summary>Expand OrderCategoriesOptions</summary>

```typescript
export type OrderCategoriesOptions = {
  target?: string;
  channel: "x" | "y" | "theta";
} & CategoryOrder;
```

</details>

Related types: [`CategoryOrder`](#type-categoryorder).

### `PackPointsOptions` {#type-packpointsoptions}

<details markdown="1">
<summary>Expand PackPointsOptions</summary>

```typescript
export interface PackPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset?: PointPackingMaxOffset;
  padding?: number;
  key?: string;
  overflow?: "error" | "overlap";
}
```

</details>

Related types: [`PointPackingMaxOffset`](#type-pointpackingmaxoffset).

### `Palette` {#type-palette}

<details markdown="1">
<summary>Expand Palette</summary>

```typescript
export type Palette = PaletteName | {
  name: PaletteName;
  count?: number;
  extent?: readonly [number, number];
};
```

</details>

Related types: [`PaletteName`](#type-palettename).

### `PaletteName` {#type-palettename}

<details markdown="1">
<summary>Expand PaletteName</summary>

```typescript
export type PaletteName =
  | "accent"
  | "category10" | "category20" | "category20b" | "category20c"
  | "observable10"
  | "dark2" | "paired" | "pastel1" | "pastel2"
  | "set1" | "set2" | "set3"
  | "tableau10" | "tableau20"
  | "blues" | "tealblues" | "teals" | "greens" | "browns"
  | "oranges" | "reds" | "purples" | "warmgreys" | "greys"
  | "viridis" | "magma" | "inferno" | "plasma" | "cividis" | "turbo"
  | "bluegreen" | "bluepurple"
  | "goldgreen" | "goldorange" | "goldred"
  | "greenblue" | "orangered"
  | "purplebluegreen" | "purpleblue" | "purplered" | "redpurple"
  | "yellowgreenblue" | "yellowgreen" | "yelloworangebrown" | "yelloworangered"
  | "darkblue" | "darkgold" | "darkgreen" | "darkmulti" | "darkred"
  | "lightgreyred" | "lightgreyteal" | "lightmulti" | "lightorange" | "lighttealblue"
  | "blueorange" | "brownbluegreen" | "purplegreen" | "pinkyellowgreen"
  | "purpleorange" | "redblue" | "redgrey"
  | "redyellowblue" | "redyellowgreen" | "spectral"
  | "rainbow" | "sinebow";
```

</details>

### `ParallelAxesOptions` {#type-parallelaxesoptions}

<details markdown="1">
<summary>Expand ParallelAxesOptions</summary>

```typescript
export interface ParallelAxesOptions { target?: string; coordinate?: string; }
```

</details>

### `ParallelAxisComponentsOptions` {#type-parallelaxiscomponentsoptions}

<details markdown="1">
<summary>Expand ParallelAxisComponentsOptions</summary>

```typescript
export type ParallelAxisComponentsOptions = {
  field: string;
  target?: string;
  line?: false | AxisLineStyleOptions;
  title?: false | ParallelAxisTitleOptions;
} & (
  | { ticksAndLabels?: false | (ParallelAxisTickSelection & {
      ticks?: AxisTickStyleOptions; labels?: AxisLabelStyleOptions;
    }); ticks?: never; labels?: never }
  | { ticks?: false | ParallelAxisTicksOptions; labels?: false | ParallelAxisLabelsOptions;
      ticksAndLabels?: never }
);
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`ParallelAxisTitleOptions`](#type-parallelaxistitleoptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`ParallelAxisTicksOptions`](#type-parallelaxisticksoptions) · [`ParallelAxisLabelsOptions`](#type-parallelaxislabelsoptions).

### `ParallelAxisLabelsOptions` {#type-parallelaxislabelsoptions}

<details markdown="1">
<summary>Expand ParallelAxisLabelsOptions</summary>

```typescript
export type ParallelAxisLabelsOptions = AxisLabelStyleOptions & ParallelAxisTickSelection;
```

</details>

Related types: [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection).

### `ParallelAxisTickSelection` {#type-parallelaxistickselection}

<details markdown="1">
<summary>Expand ParallelAxisTickSelection</summary>

```typescript
export type ParallelAxisTickSelection =
  | { count?: number; values?: never }
  | { values: readonly AxisValue[]; count?: never };
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `ParallelAxisTicksOptions` {#type-parallelaxisticksoptions}

<details markdown="1">
<summary>Expand ParallelAxisTicksOptions</summary>

```typescript
export type ParallelAxisTicksOptions = AxisTickStyleOptions & ParallelAxisTickSelection;
```

</details>

Related types: [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection).

### `ParallelAxisTitleOptions` {#type-parallelaxistitleoptions}

<details markdown="1">
<summary>Expand ParallelAxisTitleOptions</summary>

```typescript
export interface ParallelAxisTitleOptions {
  text?: string;
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

### `ParallelCoordinatesEncodingOptions` {#type-parallelcoordinatesencodingoptions}

<details markdown="1">
<summary>Expand ParallelCoordinatesEncodingOptions</summary>

```typescript
export interface ParallelCoordinatesEncodingOptions {
  target?: string;
  coordinate?: string;
  dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]];
  key?: string;
  missing?: ParallelMissingPolicy;
}
```

</details>

Related types: [`ParallelDimension`](#type-paralleldimension) · [`ParallelMissingPolicy`](#type-parallelmissingpolicy).

### `ParallelDimension` {#type-paralleldimension}

<details markdown="1">
<summary>Expand ParallelDimension</summary>

```typescript
export type ParallelDimension = string | ({
  field: string;
  title?: string;
} & (
  | {
      fieldType: "quantitative";
      scale?: WithoutScaleId<QuantitativePositionScaleOptions>;
    }
  | {
      fieldType: "ordinal";
      scale?: WithoutScaleId<CategoricalPositionScaleOptions>;
    }
  | {
      fieldType?: undefined;
      scale?: WithoutScaleId<
        QuantitativePositionScaleOptions | CategoricalPositionScaleOptions
      >;
    }
));
```

</details>

Related types: [`WithoutScaleId`](#type-withoutscaleid) · [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `ParallelGuideOptions` {#type-parallelguideoptions}

<details markdown="1">
<summary>Expand ParallelGuideOptions</summary>

```typescript
type ParallelGuideOptions = {
  axes?: false | {
    coordinate?: { id?: string; type?: "auto" | "parallel" };
  };
  grid?: false;
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};
```

</details>

Related types: [`PathLegendOptions`](#type-pathlegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `ParallelMissingPolicy` {#type-parallelmissingpolicy}

<details markdown="1">
<summary>Expand ParallelMissingPolicy</summary>

```typescript
export type ParallelMissingPolicy = "break" | "drop-row" | "error";
```

</details>

### `ParameterizedAggregateOperation` {#type-parameterizedaggregateoperation}

<details markdown="1">
<summary>Expand ParameterizedAggregateOperation</summary>

```typescript
export type ParameterizedAggregateOperation =
  | { op: "quantile"; probability: number }
  | {
      op: "first" | "last";
      orderBy: string;
      order?: "ascending" | "descending";
    }
  | {
      op: "ciLower" | "ciUpper";
      method?: ConfidenceIntervalMethod;
      level?: number;
    };
```

</details>

Related types: [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod).

### `PathLegendOptions` {#type-pathlegendoptions}

<details markdown="1">
<summary>Expand PathLegendOptions</summary>

```typescript
type PathLegendOptions = Omit<
  LegendOptions,
  "symbol" | "gradient" | "count" | "values" | "labels"
> & {
  symbol?: "auto" | { length?: number; lineWidth?: number }
    | { layers: readonly LegendSymbolLayer[] };
  labels?: CategoricalLegendTextOptions;
};
```

</details>

Related types: [`LegendOptions`](#type-legendoptions) · [`LegendSymbolLayer`](#type-legendsymbollayer) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions).

### `PathOrderEncodingOptions` {#type-pathorderencodingoptions}

<details markdown="1">
<summary>Expand PathOrderEncodingOptions</summary>

```typescript
export interface PathOrderEncodingOptions {
  target?: string;
  field: string;
  fieldType?: "quantitative";
  order?: "ascending" | "descending";
}
```

</details>

### `PieCategory` {#type-piecategory}

<details markdown="1">
<summary>Expand PieCategory</summary>

```typescript
export type PieCategory = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: Pick<ThetaScaleOptions, "id" | "domain" | "range" | "reverse"> & { type?: "band" };
};
```

</details>

Related types: [`ThetaScaleOptions`](#type-thetascaleoptions).

### `PieColor` {#type-piecolor}

<details markdown="1">
<summary>Expand PieColor</summary>

```typescript
export type PieColor = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointCategoricalColorScaleOptions;
  palette?: Palette;
};
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette).

### `PieLegendOptions` {#type-pielegendoptions}

<details markdown="1">
<summary>Expand PieLegendOptions</summary>

```typescript
export type PieLegendOptions = Omit<
  FilledMarkLegendOptions,
  "count" | "values" | "gradient" | "channels" | "order" | "labels"
> & {
  channels?: readonly ["color"];
  order?: LegendValueOrder | { channel: "theta"; values?: never };
  labels?: CategoricalLegendTextOptions;
};
```

</details>

Related types: [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`LegendValueOrder`](#type-legendvalueorder) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions).

### `PointFacadePositionChannel` {#type-pointfacadepositionchannel}

<details markdown="1">
<summary>Expand PointFacadePositionChannel</summary>

```typescript
type PointFacadePositionChannel =
  | string
  | ({ field: string } & (
      | {
          fieldType?: "quantitative";
          scale?: QuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          scale?: TemporalPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          scale?: CategoricalPositionScaleOptions;
        }
    ));
```

</details>

Related types: [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`TemporalPositionScaleOptions`](#type-temporalpositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `PointPackingMaxOffset` {#type-pointpackingmaxoffset}

<details markdown="1">
<summary>Expand PointPackingMaxOffset</summary>

```typescript
export type PointPackingMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };
```

</details>

### `PointPositionScaleOptions` {#type-pointpositionscaleoptions}

<details markdown="1">
<summary>Expand PointPositionScaleOptions</summary>

```typescript
export type PointPositionScaleOptions =
  NonPointPointPositionScaleOptions & { unknown?: number };
```

</details>

Related types: [`NonPointPointPositionScaleOptions`](#type-nonpointpointpositionscaleoptions).

### `PointShape` {#type-pointshape}

<details markdown="1">
<summary>Expand PointShape</summary>

```typescript
export type PointShape =
  | "circle"
  | "square"
  | "diamond"
  | "triangle-up"
  | "triangle-down"
  | "triangle-left"
  | "triangle-right"
  | "plus"
  | "cross"
  | "star"
  | "hexagon"
  | "wye";
```

</details>

### `PolarAxisTickSelection` {#type-polaraxistickselection}

<details markdown="1">
<summary>Expand PolarAxisTickSelection</summary>

```typescript
export type PolarAxisTickSelection =
  | { count?: number; values?: never }
  | { values: readonly AxisValue[]; count?: never };
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `PolarChartGuideOptions` {#type-polarchartguideoptions}

<details markdown="1">
<summary>Expand PolarChartGuideOptions</summary>

```typescript
export type PolarChartGuideOptions = {
  axes?: false | Pick<CreateAxesOptions, "theta" | "radius"> & {
    coordinate?: { id?: string; type?: "auto" | "polar" };
  };
  grid?: false | Pick<CreateGridOptions, "theta" | "radial">;
  legend?: false | LegendOptions;
};
```

</details>

Related types: [`CreateAxesOptions`](#type-createaxesoptions) · [`CreateGridOptions`](#type-creategridoptions) · [`LegendOptions`](#type-legendoptions).

### `PolarFrameCenter` {#type-polarframecenter}

<details markdown="1">
<summary>Expand PolarFrameCenter</summary>

```typescript
export type PolarFrameCenter = {
  x: number;
  y: number;
};
```

</details>

### `PolarFrameOptions` {#type-polarframeoptions}

<details markdown="1">
<summary>Expand PolarFrameOptions</summary>

```typescript
export type PolarFrameOptions = "auto" | {
  center?: PolarFrameCenter;
  radius?: PolarFrameRadius;
  overflow?: "error" | "allow";
};
```

</details>

Related types: [`PolarFrameCenter`](#type-polarframecenter) · [`PolarFrameRadius`](#type-polarframeradius).

### `PolarFrameRadius` {#type-polarframeradius}

<details markdown="1">
<summary>Expand PolarFrameRadius</summary>

```typescript
export type PolarFrameRadius =
  | { unit: "fraction"; value: number }
  | { unit: "px"; value: number };
```

</details>

### `PolarGridOptions` {#type-polargridoptions}

<details markdown="1">
<summary>Expand PolarGridOptions</summary>

```typescript
export interface PolarGridOptions {
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly AxisValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `PolarGuideResourceOptions` {#type-polarguideresourceoptions}

<details markdown="1">
<summary>Expand PolarGuideResourceOptions</summary>

```typescript
export interface PolarGuideResourceOptions {
  scale?: string;
  coordinate?: string;
  angle?: number;
}
```

</details>

### `PolarLabelOptions` {#type-polarlabeloptions}

<details markdown="1">
<summary>Expand PolarLabelOptions</summary>

```typescript
export interface PolarLabelOptions extends AxisLabelStyleOptions {
  count?: number;
  values?: readonly AxisValue[];
}
```

</details>

Related types: [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`AxisValue`](#type-axisvalue).

### `PolarLegendOrder` {#type-polarlegendorder}

<details markdown="1">
<summary>Expand PolarLegendOrder</summary>

```typescript
type PolarLegendOrder = LegendValueOrder | { channel: "theta"; values?: never };
```

</details>

Related types: [`LegendValueOrder`](#type-legendvalueorder).

### `PolarPathGuideOptions` {#type-polarpathguideoptions}

<details markdown="1">
<summary>Expand PolarPathGuideOptions</summary>

```typescript
export type PolarPathGuideOptions = Omit<PolarChartGuideOptions, "legend"> & {
  legend?: false | PolarPathLegendOptions;
};
```

</details>

Related types: [`PolarChartGuideOptions`](#type-polarchartguideoptions) · [`PolarPathLegendOptions`](#type-polarpathlegendoptions).

### `PolarPathLegendOptions` {#type-polarpathlegendoptions}

<details markdown="1">
<summary>Expand PolarPathLegendOptions</summary>

```typescript
type PolarPathLegendOptions = Omit<PathLegendOptions, "order"> & {
  order?: PolarLegendOrder;
};
```

</details>

Related types: [`PathLegendOptions`](#type-pathlegendoptions) · [`PolarLegendOrder`](#type-polarlegendorder).

### `PolarPointGuideOptions` {#type-polarpointguideoptions}

<details markdown="1">
<summary>Expand PolarPointGuideOptions</summary>

```typescript
export type PolarPointGuideOptions = Omit<PolarChartGuideOptions, "legend"> & {
  legend?: false | PolarPointLegendOptions;
};
```

</details>

Related types: [`PolarChartGuideOptions`](#type-polarchartguideoptions) · [`PolarPointLegendOptions`](#type-polarpointlegendoptions).

### `PolarPointLegendOptions` {#type-polarpointlegendoptions}

<details markdown="1">
<summary>Expand PolarPointLegendOptions</summary>

```typescript
type PolarPointLegendOptions = Omit<FilledMarkLegendOptions, "order"> & {
  order?: PolarLegendOrder;
};
```

</details>

Related types: [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`PolarLegendOrder`](#type-polarlegendorder).

### `PolarRadiusChannel` {#type-polarradiuschannel}

<details markdown="1">
<summary>Expand PolarRadiusChannel</summary>

```typescript
export type PolarRadiusChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: RadiusScaleOptions;
};
```

</details>

Related types: [`RadiusScaleOptions`](#type-radiusscaleoptions).

### `PolarThetaChannel` {#type-polarthetachannel}

<details markdown="1">
<summary>Expand PolarThetaChannel</summary>

```typescript
export type PolarThetaChannel = string | ({ field: string; scale?: ThetaScaleOptions } & (
  | { fieldType?: "quantitative" | "nominal" | "ordinal"; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
));
```

</details>

Related types: [`ThetaScaleOptions`](#type-thetascaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit).

### `PolarTickOptions` {#type-polartickoptions}

<details markdown="1">
<summary>Expand PolarTickOptions</summary>

```typescript
export interface PolarTickOptions extends AxisTickStyleOptions {
  count?: number;
  values?: readonly AxisValue[];
}
```

</details>

Related types: [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisValue`](#type-axisvalue).

### `PolarTicksAndLabelsOptions` {#type-polarticksandlabelsoptions}

<details markdown="1">
<summary>Expand PolarTicksAndLabelsOptions</summary>

```typescript
export interface PolarTicksAndLabelsOptions {
  count?: number;
  values?: readonly AxisValue[];
  ticks?: AxisTickStyleOptions;
  labels?: AxisLabelStyleOptions;
}
```

</details>

Related types: [`AxisValue`](#type-axisvalue) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions).

### `PolarTitleOptions` {#type-polartitleoptions}

<details markdown="1">
<summary>Expand PolarTitleOptions</summary>

```typescript
export interface PolarTitleOptions {
  text?: string;
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

### `PositionEncodingBase` {#type-positionencodingbase}

<details markdown="1">
<summary>Expand PositionEncodingBase</summary>

```typescript
interface PositionEncodingBase {
  field: string;
  target?: string;
  coordinate?: string;
  bin?:
    | { maxBins?: number; step?: never; boundaries?: never }
    | { maxBins?: never; step: number; boundaries?: never }
    | {
        maxBins?: never;
        step?: never;
        boundaries: readonly [number, number, ...number[]];
      };
  stack?: StackMode;
}
```

</details>

Related types: [`StackMode`](#type-stackmode).

### `PositionEncodingOptions` {#type-positionencodingoptions}

<details markdown="1">
<summary>Expand PositionEncodingOptions</summary>

```typescript
export type PositionEncodingOptions = PositionEncodingBase & PositionScaleBranches<
  QuantitativePositionScaleOptions,
  TemporalPositionScaleOptions,
  CategoricalPositionScaleOptions
>;
```

</details>

Related types: [`PositionEncodingBase`](#type-positionencodingbase) · [`PositionScaleBranches`](#type-positionscalebranches) · [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`TemporalPositionScaleOptions`](#type-temporalpositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `PositionScaleBranches` {#type-positionscalebranches}

<details markdown="1">
<summary>Expand PositionScaleBranches</summary>

```typescript
type PositionScaleBranches<Quantitative, Temporal, Categorical> =
  | {
      fieldType?: "quantitative";
      aggregate?: never;
      scale?: Quantitative;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      scale?: Temporal;
    }
  | {
      fieldType: "nominal" | "ordinal";
      aggregate?: never;
      scale?: Categorical;
    }
  | {
      fieldType?: FieldType;
      aggregate: AggregateOperation;
      scale?: Quantitative;
    };
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit) · [`FieldType`](#type-fieldtype) · [`AggregateOperation`](#type-aggregateoperation).

### `PreGriddedHeatmapOptions` {#type-pregriddedheatmapoptions}

<details markdown="1">
<summary>Expand PreGriddedHeatmapOptions</summary>

```typescript
export interface PreGriddedHeatmapOptions extends HeatmapBaseOptions {
  x: HeatmapCategoryPositionChannel;
  y: HeatmapCategoryPositionChannel;
  bin?: never;
  color: RectColorChannel;
}
```

</details>

Related types: [`HeatmapBaseOptions`](#type-heatmapbaseoptions) · [`HeatmapCategoryPositionChannel`](#type-heatmapcategorypositionchannel) · [`RectColorChannel`](#type-rectcolorchannel).

### `QuantileColorScaleOptions` {#type-quantilecolorscaleoptions}

<details markdown="1">
<summary>Expand QuantileColorScaleOptions</summary>

```typescript
export type QuantileColorScaleOptions =
  NonPointQuantileColorScaleOptions & { unknown?: string };
```

</details>

Related types: [`NonPointQuantileColorScaleOptions`](#type-nonpointquantilecolorscaleoptions).

### `QuantitativeBarColorChannel` {#type-quantitativebarcolorchannel}

<details markdown="1">
<summary>Expand QuantitativeBarColorChannel</summary>

```typescript
type QuantitativeBarColorChannel = {
  field: string;
  fieldType: "quantitative";
  aggregate?: AggregateOperation;
  scale?:
    | NonPointContinuousColorScaleOptions
    | NonPointDiscretizedColorScaleOptions;
  palette?: Palette;
  layout?: never;
};
```

</details>

Related types: [`AggregateOperation`](#type-aggregateoperation) · [`NonPointContinuousColorScaleOptions`](#type-nonpointcontinuouscolorscaleoptions) · [`NonPointDiscretizedColorScaleOptions`](#type-nonpointdiscretizedcolorscaleoptions) · [`Palette`](#type-palette).

### `QuantitativePositionScaleOptions` {#type-quantitativepositionscaleoptions}

<details markdown="1">
<summary>Expand QuantitativePositionScaleOptions</summary>

```typescript
export type QuantitativePositionScaleOptions =
  NonPointQuantitativePositionScaleOptions & { unknown?: number };
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `QuantitativePositionScaleType` {#type-quantitativepositionscaletype}

<details markdown="1">
<summary>Expand QuantitativePositionScaleType</summary>

```typescript
export type QuantitativePositionScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog";
```

</details>

### `QuantizeColorScaleOptions` {#type-quantizecolorscaleoptions}

<details markdown="1">
<summary>Expand QuantizeColorScaleOptions</summary>

```typescript
export type QuantizeColorScaleOptions =
  NonPointQuantizeColorScaleOptions & { unknown?: string };
```

</details>

Related types: [`NonPointQuantizeColorScaleOptions`](#type-nonpointquantizecolorscaleoptions).

### `RadarCategoryChannel` {#type-radarcategorychannel}

<details markdown="1">
<summary>Expand RadarCategoryChannel</summary>

```typescript
export type RadarCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: RadarCategoryScaleOptions;
};
```

</details>

Related types: [`RadarCategoryScaleOptions`](#type-radarcategoryscaleoptions).

### `RadarCategoryScaleOptions` {#type-radarcategoryscaleoptions}

<details markdown="1">
<summary>Expand RadarCategoryScaleOptions</summary>

```typescript
export type RadarCategoryScaleOptions = Pick<
  ThetaScaleOptions,
  "id" | "domain" | "range" | "reverse" | "paddingInner" | "paddingOuter" |
  "padding" | "align"
> & { type?: "band" | "point" };
```

</details>

Related types: [`ThetaScaleOptions`](#type-thetascaleoptions).

### `RadarCategoryValue` {#type-radarcategoryvalue}

<details markdown="1">
<summary>Expand RadarCategoryValue</summary>

```typescript
export type RadarCategoryValue = string | number | boolean;
```

</details>

### `RadarGuideOptions` {#type-radarguideoptions}

<details markdown="1">
<summary>Expand RadarGuideOptions</summary>

```typescript
export type RadarGuideOptions = Omit<PolarPathGuideOptions, "axes" | "grid" | "legend"> & {
  axes?: false | CategoricalPolarAxesOptions;
  grid?: false | CategoricalPolarGridOptions;
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};
```

</details>

Related types: [`PolarPathGuideOptions`](#type-polarpathguideoptions) · [`CategoricalPolarAxesOptions`](#type-categoricalpolaraxesoptions) · [`CategoricalPolarGridOptions`](#type-categoricalpolargridoptions) · [`PathLegendOptions`](#type-pathlegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `RadarWideOptions` {#type-radarwideoptions}

<details markdown="1">
<summary>Expand RadarWideOptions</summary>

```typescript
export interface RadarWideOptions {
  fields: readonly [string, string, string, ...string[]];
  as?: { key?: string; value?: string };
}
```

</details>

### `RadialEncodingOptions` {#type-radialencodingoptions}

<details markdown="1">
<summary>Expand RadialEncodingOptions</summary>

```typescript
export type RadialEncodingOptions = {
  target?: string;
  fieldType?: "quantitative";
  coordinate?: string;
} & (
  | { field: string; mapping?: false; aggregate?: never; scale?: RadiusScaleOptions }
  | { field: string; mapping?: RadialMapping; aggregate: "sum"; scale?: MeasuredRadiusScaleOptions }
  | { field?: never; mapping?: RadialMapping; aggregate: "count"; scale?: MeasuredRadiusScaleOptions }
);
```

</details>

Related types: [`RadiusScaleOptions`](#type-radiusscaleoptions) · [`RadialMapping`](#type-radialmapping) · [`MeasuredRadiusScaleOptions`](#type-measuredradiusscaleoptions).

### `RadialMapping` {#type-radialmapping}

<details markdown="1">
<summary>Expand RadialMapping</summary>

```typescript
export type RadialMapping = "area" | "radius-length";
```

</details>

### `RadialTitleOptions` {#type-radialtitleoptions}

<details markdown="1">
<summary>Expand RadialTitleOptions</summary>

```typescript
export interface RadialTitleOptions extends PolarTitleOptions {
  position?: "inside" | "outside";
}
```

</details>

Related types: [`PolarTitleOptions`](#type-polartitleoptions).

### `RadiusScaleOptions` {#type-radiusscaleoptions}

<details markdown="1">
<summary>Expand RadiusScaleOptions</summary>

```typescript
export interface RadiusScaleOptions {
  id?: string;
  type?: "linear" | "log" | "pow" | "sqrt" | "symlog";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
  constant?: number;
}
```

</details>

### `RaincloudBoxSummaryOptions` {#type-raincloudboxsummaryoptions}

<details markdown="1">
<summary>Expand RaincloudBoxSummaryOptions</summary>

```typescript
export interface RaincloudBoxSummaryOptions {
  type?: "box";
  whisker?: BoxPlotWhisker;
  width?: { band?: number };
  outliers?: boolean;
  box?: BoxPlotOptions["box"];
  median?: BoxPlotOptions["median"];
  outlier?: BoxPlotOptions["outlier"];
}
```

</details>

Related types: [`BoxPlotWhisker`](#type-boxplotwhisker) · [`BoxPlotOptions`](#type-boxplotoptions).

### `RaincloudCategoryChannel` {#type-raincloudcategorychannel}

<details markdown="1">
<summary>Expand RaincloudCategoryChannel</summary>

```typescript
export type RaincloudCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointBandPositionScaleOptions;
};
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions).

### `RaincloudDensityOptions` {#type-rainclouddensityoptions}

<details markdown="1">
<summary>Expand RaincloudDensityOptions</summary>

```typescript
export interface RaincloudDensityOptions extends GradientPlotDensityOptions {
  width?: DensityPlacementWidth;
  area?: ViolinPlotAreaOptions;
}
```

</details>

Related types: [`GradientPlotDensityOptions`](#type-gradientplotdensityoptions) · [`DensityPlacementWidth`](#type-densityplacementwidth) · [`ViolinPlotAreaOptions`](#type-violinplotareaoptions).

### `RaincloudIntervalSummaryOptions` {#type-raincloudintervalsummaryoptions}

<details markdown="1">
<summary>Expand RaincloudIntervalSummaryOptions</summary>

```typescript
export interface RaincloudIntervalSummaryOptions {
  type: "interval";
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  point?: CreateScatterPlotOptions["point"];
  errorBar?: IntervalPlotErrorBarOptions;
}
```

</details>

Related types: [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`IntervalPlotErrorBarOptions`](#type-intervalploterrorbaroptions).

### `RaincloudPointAppearanceOptions` {#type-raincloudpointappearanceoptions}

<details markdown="1">
<summary>Expand RaincloudPointAppearanceOptions</summary>

```typescript
export interface RaincloudPointAppearanceOptions {
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: CreateScatterPlotOptions["point"];
}
```

</details>

Related types: [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions).

### `RaincloudPointsOptions` {#type-raincloudpointsoptions}

<details markdown="1">
<summary>Expand RaincloudPointsOptions</summary>

```typescript
export type RaincloudPointsOptions =
  | (RaincloudPointAppearanceOptions & {
      type: "strip";
      jitter?: false | StripBandJitterOptions;
      packing?: never;
    })
  | (RaincloudPointAppearanceOptions & {
      type?: "beeswarm";
      packing?: false | BeeswarmPackingOptions;
      jitter?: never;
    });
```

</details>

Related types: [`RaincloudPointAppearanceOptions`](#type-raincloudpointappearanceoptions) · [`StripBandJitterOptions`](#type-stripbandjitteroptions) · [`BeeswarmPackingOptions`](#type-beeswarmpackingoptions).

### `RaincloudSummaryOptions` {#type-raincloudsummaryoptions}

<details markdown="1">
<summary>Expand RaincloudSummaryOptions</summary>

```typescript
export type RaincloudSummaryOptions =
  | RaincloudBoxSummaryOptions
  | RaincloudIntervalSummaryOptions;
```

</details>

Related types: [`RaincloudBoxSummaryOptions`](#type-raincloudboxsummaryoptions) · [`RaincloudIntervalSummaryOptions`](#type-raincloudintervalsummaryoptions).

### `RaincloudValueChannel` {#type-raincloudvaluechannel}

<details markdown="1">
<summary>Expand RaincloudValueChannel</summary>

```typescript
export type RaincloudValueChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `RangePositionEncodingOptions` {#type-rangepositionencodingoptions}

<details markdown="1">
<summary>Expand RangePositionEncodingOptions</summary>

```typescript
type RangePositionEncodingOptions = AreaRangePositionEncodingOptions | {
  lower: string;
  upper: string;
  target?: string;
  coordinate?: string;
} & (
  | { fieldType?: "quantitative"; temporalUnit?: never; scale?: NonPointQuantitativePositionScaleOptions }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit; scale?: NonPointTemporalPositionScaleOptions }
);
```

</details>

Related types: [`AreaRangePositionEncodingOptions`](#type-arearangepositionencodingoptions) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `RectColorChannel` {#type-rectcolorchannel}

<details markdown="1">
<summary>Expand RectColorChannel</summary>

```typescript
type RectColorChannel =
  | LineCategoricalColorChannel
  | {
      field: string;
      fieldType: "quantitative";
      scale?:
        | NonPointContinuousColorScaleOptions
        | NonPointDiscretizedColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<NonPointContinuousColorScaleOptions, "midpoint" | "type" | "base" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
    };
```

</details>

Related types: [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`NonPointContinuousColorScaleOptions`](#type-nonpointcontinuouscolorscaleoptions) · [`NonPointDiscretizedColorScaleOptions`](#type-nonpointdiscretizedcolorscaleoptions) · [`Palette`](#type-palette) · [`TemporalInputUnit`](#type-temporalinputunit).

### `RectMarkOptions` {#type-rectmarkoptions}

<details markdown="1">
<summary>Expand RectMarkOptions</summary>

```typescript
export interface RectMarkOptions extends RectStyleDetails {
  id?: string;
  data?: string;
  missing?: "error" | "skip";
  fill?: string;
  opacity?: number;
  stroke?: string | false;
  strokeWidth?: number;
}
```

</details>

Related types: [`RectStyleDetails`](#type-rectstyledetails).

### `RectStyleDetails` {#type-rectstyledetails}

<details markdown="1">
<summary>Expand RectStyleDetails</summary>

```typescript
export type RectStyleDetails = StrokeStyleDetails & {
  cornerRadius?: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomRight?: number;
  cornerRadiusBottomLeft?: number;
};
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails).

### `ReferenceAxis` {#type-referenceaxis}

<details markdown="1">
<summary>Expand ReferenceAxis</summary>

```typescript
type ReferenceAxis<Value> = { x: Value; y?: never } | { y: Value; x?: never };
```

</details>

### `ReferenceBinding` {#type-referencebinding}

<details markdown="1">
<summary>Expand ReferenceBinding</summary>

```typescript
type ReferenceBinding<DataValue, PlotValue> =
  | ({ space?: "data"; source?: string; temporalUnit?: TemporalInputUnit;
       data?: never; coordinate?: never } & ReferenceAxis<DataValue>)
  | ({ space: "plot"; data?: string; coordinate?: string;
       source?: never; temporalUnit?: never } & ReferenceAxis<PlotValue>);
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit) · [`ReferenceAxis`](#type-referenceaxis).

### `ReferenceStatistic` {#type-referencestatistic}

<details markdown="1">
<summary>Expand ReferenceStatistic</summary>

```typescript
export type ReferenceStatistic =
  | { readonly op: "mean" | "median" | "min" | "max"; readonly p?: never }
  | { readonly op: "quantile"; readonly p: number };
```

</details>

### `RegressionBandOptions` {#type-regressionbandoptions}

<details markdown="1">
<summary>Expand RegressionBandOptions</summary>

```typescript
export interface RegressionBandOptions extends StrokeStyleDetails {
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `RegressionCommonOptions` {#type-regressioncommonoptions}

<details markdown="1">
<summary>Expand RegressionCommonOptions</summary>

```typescript
type RegressionCommonOptions = {
  target?: string;
  x?: string;
  y?: string;
  groupBy?: string | false;
  line?: StrokeStyleDetails & { strokeWidth?: number; curve?: CurveInterpolation };
  sourceBinding?: "fixed" | "follow";
  missing?: "error" | "drop";
};
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `RegressionDataOptions` {#type-regressiondataoptions}

<details markdown="1">
<summary>Expand RegressionDataOptions</summary>

```typescript
export type RegressionDataOptions = {
  id: string;
  source?: string;
  x: string;
  y: string;
  groupBy?: string;
  missing?: "error" | "drop";
} & RegressionParameterOptions;
```

</details>

Related types: [`RegressionParameterOptions`](#type-regressionparameteroptions).

### `RegressionInterval` {#type-regressioninterval}

<details markdown="1">
<summary>Expand RegressionInterval</summary>

```typescript
export type RegressionInterval = "mean" | "prediction";
```

</details>

### `RegressionMethod` {#type-regressionmethod}

<details markdown="1">
<summary>Expand RegressionMethod</summary>

```typescript
export type RegressionMethod = "linear" | "polynomial" | "loess";
```

</details>

### `RegressionOptions` {#type-regressionoptions}

<details markdown="1">
<summary>Expand RegressionOptions</summary>

```typescript
export type RegressionOptions = RegressionCommonOptions & (
  | (Extract<RegressionParameterOptions, { method?: "linear" }> & {
      band?: false | RegressionBandOptions;
    })
  | (Extract<RegressionParameterOptions, { method: "polynomial" }> & {
      band?: false | RegressionBandOptions;
    })
  | (Extract<RegressionParameterOptions, { method: "loess" }> & {
      band?: false;
    })
);
```

</details>

Related types: [`RegressionCommonOptions`](#type-regressioncommonoptions) · [`RegressionParameterOptions`](#type-regressionparameteroptions) · [`RegressionBandOptions`](#type-regressionbandoptions).

### `RegressionParameterOptions` {#type-regressionparameteroptions}

<details markdown="1">
<summary>Expand RegressionParameterOptions</summary>

```typescript
type RegressionParameterOptions =
  | {
      method?: "linear";
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: ConfidenceIntervalMethod;
      level?: number;
      confidence?: number;
      interval?: RegressionInterval | false;
      predict?: RegressionPredictOptions;
    }
  | {
      method: "polynomial";
      degree?: number;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: ConfidenceIntervalMethod;
      level?: number;
      confidence?: number;
      interval?: RegressionInterval | false;
      predict?: RegressionPredictOptions;
    }
  | {
      method: "loess";
      degree?: never;
      span?: number;
      /** Residual reweighting passes, integer 0..32; default 0. */
      robustIterations?: number;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      interval?: never;
      predict?: RegressionPredictOptions;
    };
```

</details>

Related types: [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`RegressionInterval`](#type-regressioninterval) · [`RegressionPredictOptions`](#type-regressionpredictoptions).

### `RegressionPlotBaseOptions` {#type-regressionplotbaseoptions}

<details markdown="1">
<summary>Expand RegressionPlotBaseOptions</summary>

```typescript
type RegressionPlotBaseOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  x: RegressionPlotPositionChannel;
  y: RegressionPlotPositionChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: CreateScatterPlotOptions["point"];
  guides?: false | CartesianGuideOptions;
};
```

</details>

Related types: [`RegressionPlotPositionChannel`](#type-regressionplotpositionchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `RegressionPlotPositionChannel` {#type-regressionplotpositionchannel}

<details markdown="1">
<summary>Expand RegressionPlotPositionChannel</summary>

```typescript
export type RegressionPlotPositionChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `RegressionPlotStatisticalOptions` {#type-regressionplotstatisticaloptions}

<details markdown="1">
<summary>Expand RegressionPlotStatisticalOptions</summary>

```typescript
type RegressionPlotStatisticalOptions<T> = T extends unknown
  ? Omit<T, "target" | "x" | "y">
  : never;
```

</details>

### `RegressionPredictOptions` {#type-regressionpredictoptions}

<details markdown="1">
<summary>Expand RegressionPredictOptions</summary>

```typescript
export type RegressionPredictOptions =
  | { values: readonly [number, ...number[]]; domain?: never; steps?: never }
  | { values?: never; domain: readonly [number, number]; steps: number };
```

</details>

### `RemoveAxisOptions` {#type-removeaxisoptions}

<details markdown="1">
<summary>Expand RemoveAxisOptions</summary>

```typescript
export interface RemoveAxisOptions {
  coordinate?: string;
  scale?: string;
}
```

</details>

### `RemoveCategoryOrderOptions` {#type-removecategoryorderoptions}

<details markdown="1">
<summary>Expand RemoveCategoryOrderOptions</summary>

```typescript
export interface RemoveCategoryOrderOptions {
  target?: string;
  channel: "x" | "y" | "theta";
}
```

</details>

### `RemoveCompositionChildOptions` {#type-removecompositionchildoptions}

<details markdown="1">
<summary>Expand RemoveCompositionChildOptions</summary>

```typescript
export interface RemoveCompositionChildOptions { target: string; }
```

</details>

### `RemoveGridOptions` {#type-removegridoptions}

<details markdown="1">
<summary>Expand RemoveGridOptions</summary>

```typescript
export interface RemoveGridOptions {
  horizontal?: boolean;
  vertical?: boolean;
  theta?: boolean;
  radial?: boolean;
}
```

</details>

### `RemoveJitterOptions` {#type-removejitteroptions}

<details markdown="1">
<summary>Expand RemoveJitterOptions</summary>

```typescript
export interface RemoveJitterOptions {
  target?: string;
}
```

</details>

### `RemoveLabelLayoutOptions` {#type-removelabellayoutoptions}

<details markdown="1">
<summary>Expand RemoveLabelLayoutOptions</summary>

```typescript
export interface RemoveLabelLayoutOptions {
  target?: string;
}
```

</details>

### `RemoveLegendOptions` {#type-removelegendoptions}

<details markdown="1">
<summary>Expand RemoveLegendOptions</summary>

```typescript
export interface RemoveLegendOptions {
  target?: string;
  /** Remove selected content, including part of a combined categorical legend; omission removes every owned block. */
  channels?: readonly ("color" | "stroke" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
}
```

</details>

### `RemoveMarkFilterOptions` {#type-removemarkfilteroptions}

<details markdown="1">
<summary>Expand RemoveMarkFilterOptions</summary>

```typescript
export interface RemoveMarkFilterOptions {
  target?: string;
}
```

</details>

### `RemoveMarkLabelsOptions` {#type-removemarklabelsoptions}

<details markdown="1">
<summary>Expand RemoveMarkLabelsOptions</summary>

```typescript
export type RemoveMarkLabelsOptions =
  | { target: string; source?: never }
  | { source: string; target?: never };
```

</details>

### `RemoveMarkOptions` {#type-removemarkoptions}

<details markdown="1">
<summary>Expand RemoveMarkOptions</summary>

```typescript
export interface RemoveMarkOptions {
  target?: string;
}
```

</details>

### `RemoveMarkSelectionOptions` {#type-removemarkselectionoptions}

<details markdown="1">
<summary>Expand RemoveMarkSelectionOptions</summary>

```typescript
export interface RemoveMarkSelectionOptions {
  selection?: string;
}
```

</details>

### `RemoveParallelAxisOptions` {#type-removeparallelaxisoptions}

<details markdown="1">
<summary>Expand RemoveParallelAxisOptions</summary>

```typescript
export interface RemoveParallelAxisOptions { field: string; target?: string; }
```

</details>

### `RemovePathOrderOptions` {#type-removepathorderoptions}

<details markdown="1">
<summary>Expand RemovePathOrderOptions</summary>

```typescript
export interface RemovePathOrderOptions {
  target?: string;
}
```

</details>

### `RemovePointPackingOptions` {#type-removepointpackingoptions}

<details markdown="1">
<summary>Expand RemovePointPackingOptions</summary>

```typescript
export interface RemovePointPackingOptions {
  target?: string;
}
```

</details>

### `RemoveResourceOptions` {#type-removeresourceoptions}

<details markdown="1">
<summary>Expand RemoveResourceOptions</summary>

```typescript
export interface RemoveResourceOptions {
  readonly id: string;
}
```

</details>

### `ReorderCompositionChildrenOptions` {#type-reordercompositionchildrenoptions}

<details markdown="1">
<summary>Expand ReorderCompositionChildrenOptions</summary>

```typescript
export interface ReorderCompositionChildrenOptions {
  order: readonly [string, ...string[]];
}
```

</details>

### `RepeatChartsOptions` {#type-repeatchartsoptions}

<details markdown="1">
<summary>Expand RepeatChartsOptions</summary>

```typescript
export interface RepeatChartsOptions {
  id?: string;
  target?: string;
  channel: "x" | "y" | "theta" | "r" | { parallelDimension: string };
  fields: readonly [string, ...string[]];
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}
```

</details>

Related types: [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions).

### `ReplaceCompositionChildOptions` {#type-replacecompositionchildoptions}

<details markdown="1">
<summary>Expand ReplaceCompositionChildOptions</summary>

```typescript
export interface ReplaceCompositionChildOptions {
  target: string;
  program: ChartProgram;
}
```

</details>

### `RequestedDatasetTransform` {#type-requesteddatasettransform}

<details markdown="1">
<summary>Expand RequestedDatasetTransform</summary>

```typescript
export type RequestedDatasetTransform = RequestedTransform<Exclude<
  DatasetTransform,
  DatasetHorizonTransform | DatasetStatisticalReferenceTransform
>>;
```

</details>

Related types: [`RequestedTransform`](#type-requestedtransform) · [`DatasetTransform`](#type-datasettransform) · [`DatasetHorizonTransform`](#type-datasethorizontransform) · [`DatasetStatisticalReferenceTransform`](#type-datasetstatisticalreferencetransform).

### `RequestedTransform` {#type-requestedtransform}

<details markdown="1">
<summary>Expand RequestedTransform</summary>

```typescript
type RequestedTransform<T> = T extends unknown ? Omit<T, "resolved"> : never;
```

</details>

### `ReviseDataOptions` {#type-revisedataoptions}

<details markdown="1">
<summary>Expand ReviseDataOptions</summary>

```typescript
export interface ReviseDataOptions<Row extends object> extends CreateDataOptions<Row> {
  source: string;
  id: string;
}
```

</details>

Related types: [`CreateDataOptions`](#type-createdataoptions).

### `RotationInput` {#type-rotationinput}

<details markdown="1">
<summary>Expand RotationInput</summary>

```typescript
export type RotationInput = number | { value: number; unit: RotationUnit };
```

</details>

Related types: [`RotationUnit`](#type-rotationunit).

### `RotationUnit` {#type-rotationunit}

<details markdown="1">
<summary>Expand RotationUnit</summary>

```typescript
export type RotationUnit = "radians" | "degrees";
```

</details>

### `RowWindowFrame` {#type-rowwindowframe}

<details markdown="1">
<summary>Expand RowWindowFrame</summary>

```typescript
export type RowWindowFrame = {
  preceding: number;
  following?: number;
  duration?: never;
};
```

</details>

### `RugGuideOptions` {#type-rugguideoptions}

<details markdown="1">
<summary>Expand RugGuideOptions</summary>

```typescript
export type RugGuideOptions = Omit<CartesianGuideOptions, "axes" | "legend"> & {
  axes?: false | CAxes;
  legend?: false;
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`CAxes`](#type-caxes).

### `RugMeasureChannel` {#type-rugmeasurechannel}

<details markdown="1">
<summary>Expand RugMeasureChannel</summary>

```typescript
export type RugMeasureChannel = string | (
  | {
      field: string;
      fieldType?: "quantitative";
      temporalUnit?: never;
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
);
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `RugTickOptions` {#type-rugtickoptions}

<details markdown="1">
<summary>Expand RugTickOptions</summary>

```typescript
export interface RugTickOptions extends StrokeStyleDetails {
  length?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails).

### `RulePositionEncodingBase` {#type-rulepositionencodingbase}

<details markdown="1">
<summary>Expand RulePositionEncodingBase</summary>

```typescript
type RulePositionEncodingBase = RulePositionValue & {
  target?: string;
  coordinate?: string;
};
```

</details>

Related types: [`RulePositionValue`](#type-rulepositionvalue).

### `RulePositionValue` {#type-rulepositionvalue}

<details markdown="1">
<summary>Expand RulePositionValue</summary>

```typescript
type RulePositionValue =
  | { field: string; datum?: never }
  | { field?: never; datum: unknown };
```

</details>

### `RuleStyleOptions` {#type-rulestyleoptions}

<details markdown="1">
<summary>Expand RuleStyleOptions</summary>

```typescript
export interface RuleStyleOptions extends StrokeStyleDetails {
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `ScalarAggregateOperation` {#type-scalaraggregateoperation}

<details markdown="1">
<summary>Expand ScalarAggregateOperation</summary>

```typescript
export type ScalarAggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";
```

</details>

### `ScaleFields` {#type-scalefields}

<details markdown="1">
<summary>Expand ScaleFields</summary>

```typescript
type ScaleFields<Keys extends keyof ScaleOptions> = Pick<ScaleOptions, Keys>;
```

</details>

Related types: [`ScaleOptions`](#type-scaleoptions).

### `ScaleOptions` {#type-scaleoptions}

<details markdown="1">
<summary>Expand ScaleOptions</summary>

```typescript
export interface ScaleOptions {
  radialMapping?: RadialMapping;
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  emptyDomain?: "preserve" | "require-explicit";
  range?: ScaleRange;
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
  constant?: number;
  paddingInner?: number;
  paddingOuter?: number;
  padding?: number;
  align?: number;
  palette?: Palette;
  interpolate?: ContinuousColorInterpolation;
  midpoint?: number | "auto";
  unknown?: unknown;
}
```

</details>

Related types: [`RadialMapping`](#type-radialmapping) · [`ScaleType`](#type-scaletype) · [`ScaleRange`](#type-scalerange) · [`Palette`](#type-palette) · [`ContinuousColorInterpolation`](#type-continuouscolorinterpolation).

### `ScaleRange` {#type-scalerange}

<details markdown="1">
<summary>Expand ScaleRange</summary>

```typescript
export type ScaleRange = "auto" | readonly unknown[] | {
  readonly palette: Palette;
};
```

</details>

Related types: [`Palette`](#type-palette).

### `ScaleType` {#type-scaletype}

<details markdown="1">
<summary>Expand ScaleType</summary>

```typescript
export type ScaleType =
  | "linear"
  | "log"
  | "pow"
  | "sqrt"
  | "symlog"
  | "time"
  | "band"
  | "point"
  | "ordinal"
  | "sequential"
  | "quantize"
  | "quantile"
  | "threshold";
```

</details>

### `SecondaryPositionEncodingOptions` {#type-secondarypositionencodingoptions}

<details markdown="1">
<summary>Expand SecondaryPositionEncodingOptions</summary>

```typescript
export type SecondaryPositionEncodingOptions =
  | SecondaryRulePositionEncodingOptions
  | { datum: unknown; field?: never; fieldType?: "quantitative"; target?: string; scale?: { id?: string }; coordinate?: string }
  | ({ field: string; datum?: never; target?: string; scale?: { id?: string }; coordinate?: string } & TemporalBindingBranch);
```

</details>

Related types: [`SecondaryRulePositionEncodingOptions`](#type-secondaryrulepositionencodingoptions) · [`TemporalBindingBranch`](#type-temporalbindingbranch).

### `SecondaryRulePositionEncodingOptions` {#type-secondaryrulepositionencodingoptions}

<details markdown="1">
<summary>Expand SecondaryRulePositionEncodingOptions</summary>

```typescript
type SecondaryRulePositionEncodingOptions = RulePositionEncodingBase & {
  scale?: { id?: string };
} & (
  | { fieldType: Exclude<FieldType, "temporal">; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
);
```

</details>

Related types: [`RulePositionEncodingBase`](#type-rulepositionencodingbase) · [`FieldType`](#type-fieldtype) · [`TemporalInputUnit`](#type-temporalinputunit).

### `SelectMarksOptions` {#type-selectmarksoptions}

<details markdown="1">
<summary>Expand SelectMarksOptions</summary>

```typescript
export type SelectMarksOptions = {
  id?: string;
  target?: string;
} & MarkSelector;
```

</details>

Related types: [`MarkSelector`](#type-markselector).

### `SeriesLayoutOptions` {#type-serieslayoutoptions}

<details markdown="1">
<summary>Expand SeriesLayoutOptions</summary>

```typescript
export interface SeriesLayoutOptions { target?: string; mode: ColorLayout; }
```

</details>

Related types: [`ColorLayout`](#type-colorlayout).

### `ShapeEncodingOptions` {#type-shapeencodingoptions}

<details markdown="1">
<summary>Expand ShapeEncodingOptions</summary>

```typescript
export type ShapeEncodingOptions = {
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: ShapeScaleOptions;
};
```

</details>

Related types: [`ShapeScaleOptions`](#type-shapescaleoptions).

### `ShapeScaleOptions` {#type-shapescaleoptions}

<details markdown="1">
<summary>Expand ShapeScaleOptions</summary>

```typescript
export type ShapeScaleOptions = ScaleFields<"id"> & {
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly PointShape[];
  unknown?: PointShape;
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`PointShape`](#type-pointshape).

### `SizeEncodingOptions` {#type-sizeencodingoptions}

<details markdown="1">
<summary>Expand SizeEncodingOptions</summary>

```typescript
export type SizeEncodingOptions = {
  field: string;
  target?: string;
  fieldType?: "quantitative";
  scale?: SizeScaleOptions;
};
```

</details>

Related types: [`SizeScaleOptions`](#type-sizescaleoptions).

### `SizeScaleCommonOptions` {#type-sizescalecommonoptions}

<details markdown="1">
<summary>Expand SizeScaleCommonOptions</summary>

```typescript
type SizeScaleCommonOptions = ScaleFields<"id" | "reverse"> & {
  unknown?: number;
};
```

</details>

Related types: [`ScaleFields`](#type-scalefields).

### `SizeScaleOptions` {#type-sizescaleoptions}

<details markdown="1">
<summary>Expand SizeScaleOptions</summary>

```typescript
export type SizeScaleOptions =
  | (ContinuousSizeScaleOptions & {
      type?: "linear";
      base?: never;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "log";
      base?: number;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "sqrt";
      base?: never;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "pow";
      exponent: number;
      base?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "quantize";
      domain?: "auto" | readonly [number, number];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "quantile";
      domain?: "auto" | readonly [number, ...number[]];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "threshold";
      domain: readonly [number, ...number[]];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    });
```

</details>

Related types: [`ContinuousSizeScaleOptions`](#type-continuoussizescaleoptions) · [`SizeScaleCommonOptions`](#type-sizescalecommonoptions).

### `SizeScaleTypeEditPatch` {#type-sizescaletypeeditpatch}

<details markdown="1">
<summary>Expand SizeScaleTypeEditPatch</summary>

```typescript
type SizeScaleTypeEditPatch =
  | (Omit<WithoutScaleId<SizeScaleOptions>, "type"> & { type?: "linear" })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "log" }>, "type"> & {
      type: "log";
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "sqrt" }>, "type"> & {
      type: "sqrt";
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "pow" }>, "type" | "exponent"> & {
      type: "pow";
      exponent?: number;
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "quantize" }>, "type" | "range"> & {
      type: "quantize";
      range?: readonly [number, number, ...number[]];
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "quantile" }>, "type" | "range"> & {
      type: "quantile";
      range?: readonly [number, number, ...number[]];
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "threshold" }>, "type" | "domain" | "range"> & {
      type: "threshold";
      domain?: readonly [number, ...number[]];
      range?: readonly [number, number, ...number[]];
    });
```

</details>

Related types: [`WithoutScaleId`](#type-withoutscaleid) · [`SizeScaleOptions`](#type-sizescaleoptions).

### `SortKey` {#type-sortkey}

<details markdown="1">
<summary>Expand SortKey</summary>

```typescript
export interface SortKey {
  field: string;
  order?: "ascending" | "descending";
  nulls?: "first" | "last";
  temporalUnit?: "year" | "timestamp";
}
```

</details>

### `SortedDataOptions` {#type-sorteddataoptions}

<details markdown="1">
<summary>Expand SortedDataOptions</summary>

```typescript
export interface SortedDataOptions {
  id: string;
  source?: string;
  sortBy: readonly [SortKey, ...SortKey[]];
}
```

</details>

Related types: [`SortKey`](#type-sortkey).

### `SourceSchemaField` {#type-sourceschemafield}

<details markdown="1">
<summary>Expand SourceSchemaField</summary>

```typescript
export interface SourceSchemaField {
  name: string;
  storageType: Exclude<DatasetStorageType, "unknown" | "mixed">;
  nullable?: boolean;
  optional?: boolean;
}
```

</details>

Related types: [`DatasetStorageType`](#type-datasetstoragetype).

### `SourceSchemaInput` {#type-sourceschemainput}

<details markdown="1">
<summary>Expand SourceSchemaInput</summary>

```typescript
export interface SourceSchemaInput {
  fields: readonly SourceSchemaField[];
}
```

</details>

Related types: [`SourceSchemaField`](#type-sourceschemafield).

### `StackDataMode` {#type-stackdatamode}

<details markdown="1">
<summary>Expand StackDataMode</summary>

```typescript
export type StackDataMode = "stack" | "fill" | "center" | "diverging";
```

</details>

### `StackDataOptions` {#type-stackdataoptions}

<details markdown="1">
<summary>Expand StackDataOptions</summary>

```typescript
export interface StackDataOptions {
  id: string;
  source?: string;
  category: string;
  group: string;
  value: string;
  mode?: StackDataMode;
  as?: StackDataOutputFields;
}
```

</details>

Related types: [`StackDataMode`](#type-stackdatamode) · [`StackDataOutputFields`](#type-stackdataoutputfields).

### `StackDataOutputFields` {#type-stackdataoutputfields}

<details markdown="1">
<summary>Expand StackDataOutputFields</summary>

```typescript
export interface StackDataOutputFields {
  start?: string;
  end?: string;
  value?: string;
  share?: string;
}
```

</details>

### `StackMode` {#type-stackmode}

<details markdown="1">
<summary>Expand StackMode</summary>

```typescript
export type StackMode = "zero" | "normalize" | null;
```

</details>

### `StatisticalWeight` {#type-statisticalweight}

<details markdown="1">
<summary>Expand StatisticalWeight</summary>

```typescript
export interface StatisticalWeight {
  readonly field: string;
  readonly kind: "frequency" | "reliability";
}
```

</details>

### `StoredCell` {#type-storedcell}

<details markdown="1">
<summary>Expand StoredCell</summary>

```typescript
type StoredCell<T> = T extends (...args: never[]) => unknown ? never
  : T extends readonly (infer Value)[] ? readonly StoredCell<Value>[]
  : T extends object ? { readonly [Key in keyof T]: StoredCell<T[Key]> }
  : T;
```

</details>

### `StripBandJitterOptions` {#type-stripbandjitteroptions}

<details markdown="1">
<summary>Expand StripBandJitterOptions</summary>

```typescript
export interface StripBandJitterOptions {
  maxOffset: { pixels?: never; band: number };
  seed?: string | number;
  key?: string;
}
```

</details>

### `StripCategoryChannel` {#type-stripcategorychannel}

<details markdown="1">
<summary>Expand StripCategoryChannel</summary>

```typescript
export type StripCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: CategoricalPositionScaleOptions;
};
```

</details>

Related types: [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

### `StripPixelJitterOptions` {#type-strippixeljitteroptions}

<details markdown="1">
<summary>Expand StripPixelJitterOptions</summary>

```typescript
export interface StripPixelJitterOptions {
  maxOffset: { pixels: number; band?: never };
  seed?: string | number;
  key?: string;
}
```

</details>

### `StrokeDashEncodingOptions` {#type-strokedashencodingoptions}

<details markdown="1">
<summary>Expand StrokeDashEncodingOptions</summary>

```typescript
export type StrokeDashEncodingOptions =
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "nominal";
      scale?: DashScaleOptions;
    }
  | {
      value: DashStyle | DashPattern;
      field?: never;
      target?: string;
      fieldType?: never;
      scale?: never;
    };
```

</details>

Related types: [`DashScaleOptions`](#type-dashscaleoptions) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `StrokeEncodingOptions` {#type-strokeencodingoptions}

<details markdown="1">
<summary>Expand StrokeEncodingOptions</summary>

```typescript
export type StrokeEncodingOptions =
  | {
      target?: string;
      value: string;
      field?: never;
      fieldType?: never;
      temporalUnit?: never;
      scale?: never;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType?: "nominal" | "ordinal";
      temporalUnit?: never;
      scale?: CategoricalColorScaleOptions;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType: "quantitative";
      temporalUnit?: never;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint"> & {
        midpoint?: "auto";
      };
    };
```

</details>

Related types: [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit).

### `StrokeStyleDetails` {#type-strokestyledetails}

<details markdown="1">
<summary>Expand StrokeStyleDetails</summary>

```typescript
export type StrokeStyleDetails = {
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  miterLimit?: number;
};
```

</details>

### `StrokeWidthEncodingOptions` {#type-strokewidthencodingoptions}

<details markdown="1">
<summary>Expand StrokeWidthEncodingOptions</summary>

```typescript
export type StrokeWidthEncodingOptions =
  | {
      value: number;
      field?: never;
      target?: string;
      fieldType?: never;
      scale?: never;
    }
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: StrokeWidthScaleOptions;
    };
```

</details>

Related types: [`StrokeWidthScaleOptions`](#type-strokewidthscaleoptions).

### `StrokeWidthScaleOptions` {#type-strokewidthscaleoptions}

<details markdown="1">
<summary>Expand StrokeWidthScaleOptions</summary>

```typescript
export type StrokeWidthScaleOptions = NonPointQuantitativePositionScaleOptions;
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `SummaryAggregateOptions` {#type-summaryaggregateoptions}

<details markdown="1">
<summary>Expand SummaryAggregateOptions</summary>

```typescript
export interface SummaryAggregateOptions {
  op: AggregateOperation;
  field?: string;
  as: string;
}
```

</details>

Related types: [`AggregateOperation`](#type-aggregateoperation).

### `SummaryDataOptions` {#type-summarydataoptions}

<details markdown="1">
<summary>Expand SummaryDataOptions</summary>

```typescript
export interface SummaryDataOptions {
  id: string;
  source?: string;
  groupBy?: string | readonly string[];
  aggregates: readonly SummaryAggregateOptions[];
  members?: string;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  empty?: "null" | "identity";
}
```

</details>

Related types: [`SummaryAggregateOptions`](#type-summaryaggregateoptions) · [`StatisticalWeight`](#type-statisticalweight).

### `TemporalBindingBranch` {#type-temporalbindingbranch}

<details markdown="1">
<summary>Expand TemporalBindingBranch</summary>

```typescript
type TemporalBindingBranch =
  | { fieldType?: "quantitative"; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit };
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit).

### `TemporalInputUnit` {#type-temporalinputunit}

<details markdown="1">
<summary>Expand TemporalInputUnit</summary>

```typescript
export type TemporalInputUnit = "auto" | "year" | "timestamp";
```

</details>

### `TemporalPositionScaleOptions` {#type-temporalpositionscaleoptions}

<details markdown="1">
<summary>Expand TemporalPositionScaleOptions</summary>

```typescript
export type TemporalPositionScaleOptions =
  NonPointTemporalPositionScaleOptions & { unknown?: number };
```

</details>

Related types: [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

### `TextEncodingOptions` {#type-textencodingoptions}

<details markdown="1">
<summary>Expand TextEncodingOptions</summary>

```typescript
export type TextEncodingOptions = {
  target?: string;
  format?: TextFormat;
} & (
  | { field: string; value?: never; content?: never; normalizeBy?: never }
  | { field?: never; value: unknown; content?: never; normalizeBy?: never }
  | { field?: never; value?: never; content: "category" | "value"; normalizeBy?: never }
  | { field?: never; value?: never; content: "share"; normalizeBy?: "source" | "category" }
);

/** Attached final-item labels; lower text actions own subsequent edits. */
```

</details>

Related types: [`TextFormat`](#type-textformat).

### `TextFormat` {#type-textformat}

<details markdown="1">
<summary>Expand TextFormat</summary>

```typescript
export type TextFormat = ValueFormat;
```

</details>

Related types: [`ValueFormat`](#type-valueformat).

### `TextMarkOptions` {#type-textmarkoptions}

<details markdown="1">
<summary>Expand TextMarkOptions</summary>

```typescript
export interface TextMarkOptions {
  /** Logical-pixel baseline spacing; defaults to 1.2 times fontSize. */
  lineHeight?: number;
  /** Anchor the first line or center the complete multiline block. */
  blockAlign?: "first" | "middle";
  /** Follow resolved source appearance; an explicit fill takes precedence. Source-owned labels only. */
  inheritColor?: "fill" | "stroke" | false;
  id?: string;
  data?: string;
  /** Explicit source mark. Mutually exclusive with data; may be incomplete. */
  source?: string;
  text?: unknown;
  missing?: "error" | "skip";
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  align?: "left" | "right" | "center" | "start" | "end";
  baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  rotation?: RotationInput;
  dx?: number;
  dy?: number;
}
```

</details>

Related types: [`RotationInput`](#type-rotationinput).

### `TextMeasurement` {#type-textmeasurement}

<details markdown="1">
<summary>Expand TextMeasurement</summary>

```typescript
export interface TextMeasurement {
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: TextMetricFontWeight;
  readonly fontStyle?: "normal" | "italic";
  readonly width: number;
}
```

</details>

Related types: [`TextMetricFontWeight`](#type-textmetricfontweight).

### `TextMetricFontWeight` {#type-textmetricfontweight}

<details markdown="1">
<summary>Expand TextMetricFontWeight</summary>

```typescript
export type TextMetricFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
```

</details>

### `TextMetricsProfile` {#type-textmetricsprofile}

<details markdown="1">
<summary>Expand TextMetricsProfile</summary>

```typescript
export interface TextMetricsProfile {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly measurements: readonly TextMeasurement[];
}
```

</details>

Related types: [`TextMeasurement`](#type-textmeasurement).

### `ThemeDefinition` {#type-themedefinition}

<details markdown="1">
<summary>Expand ThemeDefinition</summary>

```typescript
export type ThemeDefinition =
  | ThemeName
  | { base: ThemeName; tokens: Partial<ThemeTokens> };
```

</details>

Related types: [`ThemeName`](#type-themename) · [`ThemeTokens`](#type-themetokens).

### `ThemeName` {#type-themename}

<details markdown="1">
<summary>Expand ThemeName</summary>

```typescript
export type ThemeName = "light" | "dark";
```

</details>

### `ThemeTokens` {#type-themetokens}

<details markdown="1">
<summary>Expand ThemeTokens</summary>

```typescript
export interface ThemeTokens {
  background: string;
  mark: string;
  text: string;
  strongText: string;
  mutedText: string;
  axis: string;
  axisTitle: string;
  grid: string;
  border: string;
  sizeSymbol: string;
  regressionBand: string;
  boxLine: string;
  boxMedian: string;
  referenceLine: string;
  referenceBand: string;
  gradientCenter: string;
  highlight: string;
  fontFamily: string;
}
```

</details>

### `ThetaAxisLabelOptions` {#type-thetaaxislabeloptions}

<details markdown="1">
<summary>Expand ThetaAxisLabelOptions</summary>

```typescript
export type ThetaAxisLabelOptions = PolarLabelOptions & DisplayLabelOptions;
```

</details>

Related types: [`PolarLabelOptions`](#type-polarlabeloptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `ThetaEncodingOptions` {#type-thetaencodingoptions}

<details markdown="1">
<summary>Expand ThetaEncodingOptions</summary>

```typescript
export type ThetaEncodingOptions = {
  /**
   * Arc marks interpret an aggregate-free quantitative field as per-row sector
   * weights. Categorical arc theta retains the count and weighted-sum modes.
   */
  field: string;
  target?: string;
  scale?: ThetaScaleOptions;
  coordinate?: string;
  aggregate?: "count" | "sum";
  weight?: string;
} & (
  | { fieldType?: Exclude<FieldType, "temporal">; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
);
```

</details>

Related types: [`ThetaScaleOptions`](#type-thetascaleoptions) · [`FieldType`](#type-fieldtype) · [`TemporalInputUnit`](#type-temporalinputunit).

### `ThetaScaleOptions` {#type-thetascaleoptions}

<details markdown="1">
<summary>Expand ThetaScaleOptions</summary>

```typescript
export interface ThetaScaleOptions {
  id?: string;
  type?: "linear" | "time" | "band" | "point";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  paddingInner?: number;
  paddingOuter?: number;
  padding?: number;
  align?: number;
}
```

</details>

### `ThetaTicksAndLabelsOptions` {#type-thetaticksandlabelsoptions}

<details markdown="1">
<summary>Expand ThetaTicksAndLabelsOptions</summary>

```typescript
export interface ThetaTicksAndLabelsOptions
  extends Omit<PolarTicksAndLabelsOptions, "labels"> {
  labels?: AxisLabelStyleOptions & DisplayLabelOptions;
}
```

</details>

Related types: [`PolarTicksAndLabelsOptions`](#type-polarticksandlabelsoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `ThresholdColorScaleOptions` {#type-thresholdcolorscaleoptions}

<details markdown="1">
<summary>Expand ThresholdColorScaleOptions</summary>

```typescript
export type ThresholdColorScaleOptions =
  NonPointThresholdColorScaleOptions & { unknown?: string };
```

</details>

Related types: [`NonPointThresholdColorScaleOptions`](#type-nonpointthresholdcolorscaleoptions).

### `TimeAxisDirective` {#type-timeaxisdirective}

<details markdown="1">
<summary>Expand TimeAxisDirective</summary>

```typescript
type TimeAxisDirective = "Y" | "m" | "d" | "b" | "H" | "M" | "S" | "L";
```

</details>

### `TimeUnit` {#type-timeunit}

<details markdown="1">
<summary>Expand TimeUnit</summary>

```typescript
export type TimeUnit =
  | "year"
  | "quarter"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "week"
  | "weekday";
```

</details>

### `TimeUnitDataBaseOptions` {#type-timeunitdatabaseoptions}

<details markdown="1">
<summary>Expand TimeUnitDataBaseOptions</summary>

```typescript
type TimeUnitDataBaseOptions = {
  id: string;
  source?: string;
  field: string;
  temporalUnit?: TemporalInputUnit;
  as: string;
  timeZone?: string;
};
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit).

### `TimeUnitDataOptions` {#type-timeunitdataoptions}

<details markdown="1">
<summary>Expand TimeUnitDataOptions</summary>

```typescript
export type TimeUnitDataOptions = TimeUnitDataBaseOptions & (
  | {
      unit: Exclude<TimeUnit, "week">;
      weekStartsOn?: never;
      weekRule?: never;
    }
  | {
      unit: "week";
      weekRule?: "calendar";
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
  | {
      unit: "week";
      weekRule: "iso";
      weekStartsOn?: 1;
    }
);
```

</details>

Related types: [`TimeUnitDataBaseOptions`](#type-timeunitdatabaseoptions) · [`TimeUnit`](#type-timeunit).

### `TitleOptions` {#type-titleoptions}

<details markdown="1">
<summary>Expand TitleOptions</summary>

```typescript
export interface TitleOptions {
  text: string;
  subtitle?: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: number;
  gap?: number;
  maxWidth?: number;
  wrap?: "word" | "character";
  lineHeight?: number;
  titleStyle?: TitleTextStyleOptions;
  subtitleStyle?: TitleTextStyleOptions;
}
```

</details>

Related types: [`TitleTextStyleOptions`](#type-titletextstyleoptions).

### `TitleTextStyleOptions` {#type-titletextstyleoptions}

<details markdown="1">
<summary>Expand TitleTextStyleOptions</summary>

```typescript
export interface TitleTextStyleOptions {
  fontStyle?: "normal" | "italic";
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

### `UtcFormatString` {#type-utcformatstring}

<details markdown="1">
<summary>Expand UtcFormatString</summary>

```typescript
export type UtcFormatString = `${string}%${TimeAxisDirective}${string}`;
```

</details>

Related types: [`TimeAxisDirective`](#type-timeaxisdirective).

### `ValueFormat` {#type-valueformat}

<details markdown="1">
<summary>Expand ValueFormat</summary>

```typescript
export type ValueFormat = "auto" | NumericFormatString | UtcFormatString;
```

</details>

Related types: [`NumericFormatString`](#type-numericformatstring) · [`UtcFormatString`](#type-utcformatstring).

### `ValueFormatDigit` {#type-valueformatdigit}

<details markdown="1">
<summary>Expand ValueFormatDigit</summary>

```typescript
type ValueFormatDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
```

</details>

### `ValueFormatPrecision` {#type-valueformatprecision}

<details markdown="1">
<summary>Expand ValueFormatPrecision</summary>

```typescript
type ValueFormatPrecision = ValueFormatDigit | 10 | 11 | 12 | `0${ValueFormatDigit}`;
```

</details>

Related types: [`ValueFormatDigit`](#type-valueformatdigit).

### `ViolinPlotAreaOptions` {#type-violinplotareaoptions}

<details markdown="1">
<summary>Expand ViolinPlotAreaOptions</summary>

```typescript
export interface ViolinPlotAreaOptions extends StrokeStyleDetails {
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `ViolinPlotColorOptions` {#type-violinplotcoloroptions}

<details markdown="1">
<summary>Expand ViolinPlotColorOptions</summary>

```typescript
export type ViolinPlotColorOptions =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: "overlay";
    };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette).

### `ViolinPlotDensityOptions` {#type-violinplotdensityoptions}

<details markdown="1">
<summary>Expand ViolinPlotDensityOptions</summary>

```typescript
export interface ViolinPlotDensityOptions
  extends GradientPlotDensityOptions {
  weight?: StatisticalWeight;
  width?: DensityPlacementWidth;
  side?: "both" | "left" | "right" | "top" | "bottom";
}
```

</details>

Related types: [`GradientPlotDensityOptions`](#type-gradientplotdensityoptions) · [`StatisticalWeight`](#type-statisticalweight) · [`DensityPlacementWidth`](#type-densityplacementwidth).

### `ViolinPlotOptions` {#type-violinplotoptions}

<details markdown="1">
<summary>Expand ViolinPlotOptions</summary>

```typescript
export interface ViolinPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: ViolinPlotPositionChannel;
  y: ViolinPlotPositionChannel;
  split?: ViolinPlotSplitOptions;
  color?: ViolinPlotColorOptions;
  density?: ViolinPlotDensityOptions;
  area?: ViolinPlotAreaOptions;
  guides?: false | CartesianCategoricalGuideOptions;
}
```

</details>

Related types: [`ViolinPlotPositionChannel`](#type-violinplotpositionchannel) · [`ViolinPlotSplitOptions`](#type-violinplotsplitoptions) · [`ViolinPlotColorOptions`](#type-violinplotcoloroptions) · [`ViolinPlotDensityOptions`](#type-violinplotdensityoptions) · [`ViolinPlotAreaOptions`](#type-violinplotareaoptions) · [`CartesianCategoricalGuideOptions`](#type-cartesiancategoricalguideoptions).

### `ViolinPlotPositionChannel` {#type-violinplotpositionchannel}

<details markdown="1">
<summary>Expand ViolinPlotPositionChannel</summary>

```typescript
export type ViolinPlotPositionChannel =
  | string
  | {
      field: string;
      fieldType: "nominal" | "ordinal";
      scale?: NonPointBandPositionScaleOptions;
    }
  | {
      field: string;
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      field: string;
      fieldType?: undefined;
      scale?:
        | NonPointBandPositionScaleOptions
        | NonPointQuantitativePositionScaleOptions;
    };
```

</details>

Related types: [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `ViolinPlotSplitOptions` {#type-violinplotsplitoptions}

<details markdown="1">
<summary>Expand ViolinPlotSplitOptions</summary>

```typescript
export interface ViolinPlotSplitOptions {
  field: string;
  domain?: readonly [unknown, unknown];
}
```

</details>

### `WindowDataOptions` {#type-windowdataoptions}

<details markdown="1">
<summary>Expand WindowDataOptions</summary>

```typescript
export interface WindowDataOptions {
  id: string;
  source?: string;
  partitionBy?: string | readonly string[];
  sortBy?: readonly WindowSort[];
  operations: readonly WindowOperation[];
  temporalUnit?: TemporalInputUnit;
}
```

</details>

Related types: [`WindowSort`](#type-windowsort) · [`WindowOperation`](#type-windowoperation) · [`TemporalInputUnit`](#type-temporalinputunit).

### `WindowFrame` {#type-windowframe}

<details markdown="1">
<summary>Expand WindowFrame</summary>

```typescript
export type WindowFrame = RowWindowFrame | DurationWindowFrame;
```

</details>

Related types: [`RowWindowFrame`](#type-rowwindowframe) · [`DurationWindowFrame`](#type-durationwindowframe).

### `WindowOperation` {#type-windowoperation}

<details markdown="1">
<summary>Expand WindowOperation</summary>

```typescript
export type WindowOperation =
  | { op: "rowNumber" | "rank" | "denseRank"; as: string }
  | { op: "cumulativeSum"; field: string; as: string }
  | {
      op: "lag" | "lead";
      field: string;
      as: string;
      offset?: number;
      default?: unknown;
    }
  | {
      op: "movingMean" | "movingSum";
      field: string;
      as: string;
      frame: WindowFrame;
      minPeriods?: number;
      missing?: "error" | "skip";
    };
```

</details>

Related types: [`WindowFrame`](#type-windowframe).

### `WindowSort` {#type-windowsort}

<details markdown="1">
<summary>Expand WindowSort</summary>

```typescript
export interface WindowSort {
  field: string;
  order?: WindowSortOrder;
}
```

</details>

Related types: [`WindowSortOrder`](#type-windowsortorder).

### `WindowSortOrder` {#type-windowsortorder}

<details markdown="1">
<summary>Expand WindowSortOrder</summary>

```typescript
export type WindowSortOrder = "ascending" | "descending";
```

</details>

### `WithoutEncodingTarget` {#type-withoutencodingtarget}

<details markdown="1">
<summary>Expand WithoutEncodingTarget</summary>

```typescript
type WithoutEncodingTarget<T> = T extends unknown
  ? Omit<T, "target" | "coordinate">
  : never;
```

</details>

### `WithoutScaleId` {#type-withoutscaleid}

<details markdown="1">
<summary>Expand WithoutScaleId</summary>

```typescript
type WithoutScaleId<T> = T extends unknown ? Omit<T, "id"> : never;
```

</details>

### `XAxisPosition` {#type-xaxisposition}

<details markdown="1">
<summary>Expand XAxisPosition</summary>

```typescript
export type XAxisPosition = "bottom" | "top";
```

</details>

### `XOffsetEncodingOptions` {#type-xoffsetencodingoptions}

<details markdown="1">
<summary>Expand XOffsetEncodingOptions</summary>

```typescript
export interface XOffsetEncodingOptions extends OffsetEncodingOptions {}
```

</details>

Related types: [`OffsetEncodingOptions`](#type-offsetencodingoptions).

### `YAxisPosition` {#type-yaxisposition}

<details markdown="1">
<summary>Expand YAxisPosition</summary>

```typescript
export type YAxisPosition = "left" | "right";
```

</details>

### `YOffsetEncodingOptions` {#type-yoffsetencodingoptions}

<details markdown="1">
<summary>Expand YOffsetEncodingOptions</summary>

```typescript
export interface YOffsetEncodingOptions extends OffsetEncodingOptions {}
```

</details>

Related types: [`OffsetEncodingOptions`](#type-offsetencodingoptions).

### `YPositionEncodingOptions` {#type-ypositionencodingoptions}

<details markdown="1">
<summary>Expand YPositionEncodingOptions</summary>

```typescript
export type YPositionEncodingOptions =
  PositionEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "bin" | "stack"> & { stack?: YStackMode } : never
    : never;
```

</details>

Related types: [`PositionEncodingOptions`](#type-positionencodingoptions) · [`YStackMode`](#type-ystackmode).

### `YStackMode` {#type-ystackmode}

<details markdown="1">
<summary>Expand YStackMode</summary>

```typescript
export type YStackMode = StackMode | "center";
```

</details>

Related types: [`StackMode`](#type-stackmode).

### `ZeroSupportingPositionScaleType` {#type-zerosupportingpositionscaletype}

<details markdown="1">
<summary>Expand ZeroSupportingPositionScaleType</summary>

```typescript
export type ZeroSupportingPositionScaleType =
  | "linear" | "pow" | "sqrt" | "symlog";
```

</details>

<!-- END GENERATED TYPESCRIPT SIGNATURES -->

## Related

[Action Reference](./actions.md) · [Extension Actions](./actions/extension.md)
