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
  createCanvas(options?: TargetedOptions<CanvasOptions>): ChartProgram;
  editCanvas(options: TargetedOptions<CanvasOptions>): ChartProgram;
  fitCanvas(options?: TargetedOptions<FitCanvasOptions>): ChartProgram;
  applyTextMetrics(options: ApplyTextMetricsOptions): ChartProgram;
  removeTextMetrics(): ChartProgram;
  applyTheme(options: TargetedOptions<ApplyThemeOptions>): ChartProgram;
  removeTheme(): ChartProgram;
  createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram;
  applyDataUpdate(options: ApplyDataUpdateOptions): ChartProgram;
  reviseData<Row extends object>(options: TargetedOptions<ReviseDataOptions<Row>>): ChartProgram;
  removeResource(options: RemoveStoredResourceOptions): ChartProgram;
  removeData(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  removeScale(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  removeCoordinate(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  bindMarkData(options: TargetedOptions<BindMarkDataOptions>): ChartProgram;
  filterData(options: TargetedOptions<FilterDataOptions>): ChartProgram;
  filterMarks(options: TargetedOptions<FilterMarksOptions>): ChartProgram;
  removeMarkFilter(options?: TargetedOptions<RemoveMarkFilterOptions>): ChartProgram;
  setMarkVisibility(options: TargetedOptions<MarkVisibilityOptions>): ChartProgram;
  removeMarkVisibility(options?: TargetedOptions<RemoveMarkVisibilityOptions>): ChartProgram;
  selectMarks(options: TargetedOptions<SelectMarksOptions>): ChartProgram;
  editMarkSelection(options: TargetedOptions<EditMarkSelectionOptions>): ChartProgram;
  removeMarkHighlight(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
  removeMarkSelection(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
  highlightMarks(options: TargetedOptions<HighlightMarksOptions>): ChartProgram;
  createDensityData(options: TargetedOptions<DensityDataOptions>): ChartProgram;
  createSummaryData(options: TargetedOptions<SummaryDataOptions>): ChartProgram;
  createBinData(options: TargetedOptions<BinDataOptions>): ChartProgram;
  createFlattenData(options: TargetedOptions<FlattenDataOptions>): ChartProgram;
  createLookupData(options: TargetedOptions<LookupDataOptions>): ChartProgram;
  createPivotData(options: TargetedOptions<PivotDataOptions>): ChartProgram;
  createFoldData(options: TargetedOptions<FoldDataOptions>): ChartProgram;
  createImageResource(options: ApplyImageResourceOptions<"create">): ChartProgram;
  replaceImageResource(options: ApplyImageResourceOptions<"replace">): ChartProgram;
  createFontResource(options: ApplyFontResourceOptions<"create">): ChartProgram;
  replaceFontResource(options: ApplyFontResourceOptions<"replace">): ChartProgram;
  createImageMark(options?: TargetedOptions<CreateImageMarkOptions>): ChartProgram;
  editImageMark(options: TargetedOptions<EditImageMarkOptions>): ChartProgram;
  createHierarchyData(options: TargetedOptions<CreateHierarchyDataOptions>): ChartProgram;
  editHierarchyData(options: TargetedOptions<EditHierarchyDataOptions>): ChartProgram;
  layoutHierarchy(options: TargetedOptions<LayoutHierarchyOptions>): ChartProgram;
  editLayout(options: TargetedOptions<EditLayoutOptions>): ChartProgram;
  createTreePlot(options?: TargetedOptions<TreePlotOptions>): ChartProgram;
  createGraphPlot(options?: TargetedOptions<GraphPlotOptions>): ChartProgram;
  editGraphPlot(options: TargetedOptions<EditGraphPlotOptions>): ChartProgram;
  bundleGraphEdges(options: TargetedOptions<BundleGraphEdgesOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
  editEdgeRoute(options: TargetedOptions<EditEdgeRouteOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
  editTreePlot(options: TargetedOptions<EditTreePlotOptions>): ChartProgram;
  createPartitionPlot(options?: TargetedOptions<PartitionPlotOptions>): ChartProgram;
  editPartitionPlot(options: TargetedOptions<EditPartitionPlotOptions>): ChartProgram;
  createTreemapPlot(options?: TargetedOptions<TreemapPlotOptions>): ChartProgram;
  editTreemapPlot(options: TargetedOptions<EditTreemapPlotOptions>): ChartProgram;
  createParameter(options: TargetedOptions<CreateParameterOptions>): ChartProgram;
  createCalendarLayout(options: TargetedOptions<CreateCalendarLayoutOptions>): ChartProgram;
  createTrailPlot(options: TargetedOptions<CreateTrailPlotOptions>): ChartProgram;
  editTrailPlot(options: TargetedOptions<EditTrailPlotOptions>): ChartProgram;
  createWaterfallPlot(options: TargetedOptions<CreateWaterfallPlotOptions>): ChartProgram;
  editWaterfallPlot(options: TargetedOptions<EditWaterfallPlotOptions>): ChartProgram;
  createOHLCPlot(options: TargetedOptions<CreateOHLCPlotOptions>): ChartProgram;
  editOHLCPlot(options: TargetedOptions<EditOHLCPlotOptions>): ChartProgram;
  createPyramidPlot(options: TargetedOptions<CreatePyramidPlotOptions>): ChartProgram;
  editPyramidPlot(options: TargetedOptions<EditPyramidPlotOptions>): ChartProgram;
  createCalendarPlot(options?: TargetedOptions<CalendarPlotOptions>): ChartProgram;
  editCalendarPlot(options: TargetedOptions<EditCalendarPlotOptions>): ChartProgram;
  createGeometryData(options: TargetedOptions<CreateGeometryDataOptions>): ChartProgram;
  createProjection(options: TargetedOptions<CreateProjectionOptions>): ChartProgram;
  editProjection(options: TargetedOptions<EditProjectionOptions>): ChartProgram;
  navigateProjection(options: TargetedOptions<NavigateProjectionOptions>): ChartProgram;
  editGeometryData(options: TargetedOptions<EditGeometryDataOptions>): ChartProgram;
  createGeoLODData(options: TargetedOptions<CreateGeoLODDataOptions>): ChartProgram;
  editGeoLODData(options: TargetedOptions<EditGeoLODDataOptions>): ChartProgram;
  createGeoJoinData(options: TargetedOptions<CreateGeoJoinDataOptions>): ChartProgram;
  editGeoJoinData(options: TargetedOptions<EditGeoJoinDataOptions>): ChartProgram;
  createContourData(options: TargetedOptions<CreateContourDataOptions>): ChartProgram;
  createDensityContourData(options: TargetedOptions<CreateDensityContourDataOptions>): ChartProgram;
  editContourData(options: TargetedOptions<EditContourDataOptions>): ChartProgram;
  createGeoShapeMark(options?: TargetedOptions<GeoShapeMarkOptions>): ChartProgram;
  editGeoShapeMark(options: TargetedOptions<EditGeoShapeMarkOptions>): ChartProgram;
  createGeoPointMark(options?: TargetedOptions<GeoPointMarkOptions>): ChartProgram;
  editGeoPointMark(options: TargetedOptions<EditGeoPointMarkOptions>): ChartProgram;
  createGeoLineMark(options?: TargetedOptions<GeoLineMarkOptions>): ChartProgram;
  editGeoLineMark(options: TargetedOptions<EditGeoLineMarkOptions>): ChartProgram;
  createGraticule(options?: TargetedOptions<GraticuleOptions>): ChartProgram;
  editGraticule(options: TargetedOptions<EditGraticuleOptions>): ChartProgram;
  createGeoAnnotation(options: TargetedOptions<GeoAnnotationOptions>): ChartProgram;
  editGeoAnnotation(options: TargetedOptions<EditGeoAnnotationOptions>): ChartProgram;
  createContourMark(options?: TargetedOptions<ContourMarkOptions>): ChartProgram;
  editContourMark(options: TargetedOptions<EditContourMarkOptions>): ChartProgram;
  createFlowData(options: CreateFlowDataOptions): ChartProgram;
  editFlowData(options: TargetedOptions<EditFlowDataOptions>): ChartProgram;
  layoutFlow(options: TargetedOptions<LayoutFlowOptions>): ChartProgram;
  createFlowNodes(options?: TargetedOptions<FlowNodesOptions>): ChartProgram;
  editFlowNodes(options: TargetedOptions<EditFlowNodesOptions>): ChartProgram;
  createFlowLinks(options?: TargetedOptions<FlowLinksOptions>): ChartProgram;
  editFlowLinks(options: TargetedOptions<EditFlowLinksOptions>): ChartProgram;
  createGraphData(options: CreateGraphDataOptions): ChartProgram;
  createInferredGraphData(options: CreateInferredGraphDataOptions): ChartProgram;
  editInferredGraphData(options: TargetedOptions<EditInferredGraphDataOptions>): ChartProgram;
  editGraphData(options: TargetedOptions<EditGraphDataOptions>): ChartProgram;
  layoutGraph(options: TargetedOptions<LayoutGraphOptions>): ChartProgram;
  editParameter(options: TargetedOptions<EditParameterOptions>): ChartProgram;
  removeParameter(options: TargetedOptions<RemoveParameterOptions>): ChartProgram;
  createComputedData(options: TargetedOptions<ComputedDataOptions>): ChartProgram;
  createNormalizedData(options: TargetedOptions<NormalizedDataOptions>): ChartProgram;
  createCompleteData(options: TargetedOptions<CompleteDataOptions>): ChartProgram;
  createImputedData(options: TargetedOptions<ImputedDataOptions>): ChartProgram;
  createStackData(options: TargetedOptions<StackDataOptions>): ChartProgram;
  createRegressionData(options: TargetedOptions<RegressionDataOptions>): ChartProgram;
  createRegressionStatisticsData(options: TargetedOptions<RegressionStatisticsDataOptions>): ChartProgram;
  editRegressionStatisticsData(options?: TargetedOptions<EditRegressionStatisticsDataOptions>): ChartProgram;
  createIntervalData(options: TargetedOptions<IntervalDataOptions>): ChartProgram;
  createECDFData(options: TargetedOptions<ECDFDataOptions>): ChartProgram;
  createTimeUnitData(options: TargetedOptions<TimeUnitDataOptions>): ChartProgram;
  createWindowData(options: TargetedOptions<WindowDataOptions>): ChartProgram;
  createBin2DData(options: TargetedOptions<Bin2DDataOptions>): ChartProgram;
  createSortedData(options: TargetedOptions<SortedDataOptions>): ChartProgram;
  editDerivedData(options: TargetedOptions<EditDerivedDataOptions>): ChartProgram;
  editComputedData(options: TargetedOptions<EditComputedDataOptions>): ChartProgram;
  editFilteredData(options: TargetedOptions<EditFilteredDataOptions>): ChartProgram;
  editFlattenData(options: TargetedOptions<EditFlattenDataOptions>): ChartProgram;
  editLookupData(options: TargetedOptions<EditLookupDataOptions>): ChartProgram;
  editPivotData(options: TargetedOptions<EditPivotDataOptions>): ChartProgram;
  editFoldData(options: TargetedOptions<EditFoldDataOptions>): ChartProgram;
  editSummaryData(options: TargetedOptions<EditSummaryDataOptions>): ChartProgram;
  editBinData(options: TargetedOptions<EditBinDataOptions>): ChartProgram;
  editTimeUnitData(options: TargetedOptions<EditTimeUnitDataOptions>): ChartProgram;
  editWindowData(options: TargetedOptions<EditWindowDataOptions>): ChartProgram;
  editDensityData(options: TargetedOptions<EditDensityDataOptions>): ChartProgram;
  editStackData(options: TargetedOptions<EditStackDataOptions>): ChartProgram;
  editRegressionData(options: TargetedOptions<EditRegressionDataOptions>): ChartProgram;
  editSortedData(options: TargetedOptions<EditSortedDataOptions>): ChartProgram;
  editIntervalData(options: TargetedOptions<EditIntervalDataOptions>): ChartProgram;
  editECDFData(options: TargetedOptions<EditECDFDataOptions>): ChartProgram;
  editNormalizedData(options: TargetedOptions<EditNormalizedDataOptions>): ChartProgram;
  editCompleteData(options: TargetedOptions<EditCompleteDataOptions>): ChartProgram;
  editImputedData(options: TargetedOptions<EditImputedDataOptions>): ChartProgram;
  editBin2DData(options: TargetedOptions<EditBin2DDataOptions>): ChartProgram;
  createPointMark(options?: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; id?: string; data?: string; missing?: "error" | "skip"; shape?: PointShape; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }>): ChartProgram;
  editPointMark(options: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; target?: string; missing?: "error" | "skip"; shape?: PointShape; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }>): ChartProgram;
  createTickMark(options?: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; id?: string; data?: string; missing?: "error" | "skip"; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }>): ChartProgram;
  editTickMark(options: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; target?: string; missing?: "error" | "skip"; length?: number; stroke?: string; strokeWidth?: number; opacity?: number; }>): ChartProgram;
  jitterPoints(options: TargetedOptions<JitterPointsOptions>): ChartProgram;
  removeJitter(options?: TargetedOptions<RemoveJitterOptions>): ChartProgram;
  packPoints(options: TargetedOptions<PackPointsOptions>): ChartProgram;
  removePointPacking(options?: TargetedOptions<RemovePointPackingOptions>): ChartProgram;
  createLineMark(options?: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; missing?: "error" | "break"; id?: string; data?: string; strokeWidth?: number; curve?: CurveInterpolation; tension?: number; stroke?: string; opacity?: number; closed?: boolean; }>): ChartProgram;
  editLineMark(options: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; missing?: "error" | "break"; target?: string; strokeWidth?: number; curve?: CurveInterpolation; tension?: number; stroke?: string; opacity?: number; closed?: boolean; }>): ChartProgram;
  createBarMark(options?: TargetedOptions<RectStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; id?: string; data?: string; orientation?: "vertical" | "horizontal"; missing?: "error" | "skip"; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }>): ChartProgram;
  editBarMark(options: TargetedOptions<RectStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; target?: string; missing?: "error" | "skip"; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: FilledMarkStroke; strokeWidth?: number; }>): ChartProgram;
  createAreaMark(options?: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; id?: string; data?: string; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }>): ChartProgram;
  createArcMark(options?: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; id?: string; data?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: string; strokeWidth?: number; }>): ChartProgram;
  editArcMark(options: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; target?: string; innerRadius?: ArcInnerRadius; padAngle?: number; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: string | false; strokeWidth?: number; }>): ChartProgram;
  createRectMark(options?: TargetedOptions<RectMarkOptions>): ChartProgram;
  editRectMark(options: TargetedOptions<EditRectMarkOptions>): ChartProgram;
  createRuleMark(options?: TargetedOptions<{ clip?: boolean; id?: string; data?: string; missing?: "error" | "skip" } & RuleStyleOptions>): ChartProgram;
  editRuleMark(options: TargetedOptions<{ clip?: boolean; target?: string; missing?: "error" | "skip" } & RuleStyleOptions>): ChartProgram;
  createTextMark(options?: TargetedOptions<TextMarkOptions>): ChartProgram;
  createTextPlot(options: TargetedOptions<CreateTextPlotOptions>): ChartProgram;
  createMarkLabels(options?: TargetedOptions<CreateMarkLabelsOptions>): ChartProgram;
  editMarkLabelSelection(options: TargetedOptions<EditMarkLabelSelectionOptions>): ChartProgram;
  editMarkLabelPlacement(options: TargetedOptions<EditMarkLabelPlacementOptions>): ChartProgram;
  removeMarkLabels(options: TargetedOptions<RemoveMarkLabelsOptions>): ChartProgram;
  createAnnotation(options: TargetedOptions<CreateAnnotationOptions>): ChartProgram;
  editAnnotation(options: TargetedOptions<EditAnnotationOptions>): ChartProgram;
  createStatisticalReference(options: TargetedOptions<CreateStatisticalReferenceOptions>): ChartProgram;
  createOverlay(options?: TargetedOptions<CreateOverlayOptions>): ChartProgram;
  createLayerPlot(options: TargetedOptions<CreateLayerPlotOptions>): ChartProgram;
  createAdjacentPlot(options?: TargetedOptions<CreateAdjacentPlotOptions>): ChartProgram;
  editCompositionScales(options: TargetedOptions<EditCompositionScalesOptions>): ChartProgram;
  editOverlay(options: TargetedOptions<EditOverlayOptions>): ChartProgram;
  createReferenceLine(options: TargetedOptions<CreateReferenceLineOptions>): ChartProgram;
  createReferenceBand(options: TargetedOptions<CreateReferenceBandOptions>): ChartProgram;
  editTextMark(options: TargetedOptions<EditTextMarkOptions>): ChartProgram;
  layoutLabels(options?: TargetedOptions<LabelLayoutOptions>): ChartProgram;
  removeLabelLayout(options?: TargetedOptions<RemoveLabelLayoutOptions>): ChartProgram;
  editAreaMark(options: TargetedOptions<StrokeStyleDetails & { blend?: BlendMode; shadow?: MarkShadow | false; clip?: boolean; target?: string; fill?: FillPaint; outline?: MarkOutline | false; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; missing?: "error" | "break"; }>): ChartProgram;
  encodeX(options: TargetedOptions<PositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<PositionEncodingOptions | DatumPositionEncodingOptions>>): ChartProgram;
  encodeY(options: TargetedOptions<YPositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<YPositionEncodingOptions | DatumPositionEncodingOptions>>): ChartProgram;
  encodeTheta(options: TargetedOptions<ThetaEncodingOptions | ConditionalEncodingOptions<ThetaEncodingOptions>>): ChartProgram;
  encodeR(options: TargetedOptions<RadialEncodingOptions | ConditionalEncodingOptions<RadialEncodingOptions>>): ChartProgram;
  encodeX2(options: TargetedOptions<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>): ChartProgram;
  encodeColor(options: TargetedOptions<ColorEncodingOptions | ConditionalEncodingOptions<ColorEncodingOptions>>): ChartProgram;
  encodeStrokeDash(options: TargetedOptions<StrokeDashEncodingOptions | ConditionalEncodingOptions<StrokeDashEncodingOptions>>): ChartProgram;
  encodeSize(options: TargetedOptions<SizeEncodingOptions | ConditionalEncodingOptions<SizeEncodingOptions>>): ChartProgram;
  encodeShape(options: TargetedOptions<ShapeEncodingOptions | ConditionalEncodingOptions<ShapeEncodingOptions>>): ChartProgram;
  encodeAngle(options: TargetedOptions<AngleEncodingOptions | ConditionalEncodingOptions<AngleEncodingOptions>>): ChartProgram;
  encodeOpacity(options: TargetedOptions<OpacityEncodingOptions | ConditionalEncodingOptions<OpacityEncodingOptions>>): ChartProgram;
  encodeRadius(options: TargetedOptions<{ value: number; target?: string } | ConditionalEncodingOptions<{ value: number }>>): ChartProgram;
  encodePointRadius(options: TargetedOptions<{ value: number; target?: string } | ConditionalEncodingOptions<{ value: number }>>): ChartProgram;
  removePointRadius(options?: TargetedOptions<{ target?: string }>): ChartProgram;
  encodeXOffset(options: TargetedOptions<XOffsetEncodingOptions | ConditionalEncodingOptions<XOffsetEncodingOptions>>): ChartProgram;
  encodeYOffset(options: TargetedOptions<YOffsetEncodingOptions | ConditionalEncodingOptions<YOffsetEncodingOptions>>): ChartProgram;
  encodeY2(options: TargetedOptions<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>): ChartProgram;
  encodeYRange(options: TargetedOptions<RangePositionEncodingOptions>): ChartProgram;
  encodeXRange(options: TargetedOptions<RangePositionEncodingOptions>): ChartProgram;
  encodeGroup(options: TargetedOptions<GroupEncodingOptions>): ChartProgram;
  layoutSeries(options: TargetedOptions<SeriesLayoutOptions>): ChartProgram;
  encodePathOrder(options: TargetedOptions<PathOrderEncodingOptions>): ChartProgram;
  orderCategories(options: TargetedOptions<OrderCategoriesOptions>): ChartProgram;
  encodeParallelCoordinates(options: TargetedOptions<ParallelCoordinatesEncodingOptions>): ChartProgram;
  removePathOrder(options?: TargetedOptions<RemovePathOrderOptions>): ChartProgram;
  removeCategoryOrder(options: TargetedOptions<RemoveCategoryOrderOptions>): ChartProgram;
  removeEncoding(options: TargetedOptions<{ target?: string; channel: | "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "angle" | "group" | "opacity" | "text" | "dx" | "dy"; }>): ChartProgram;
  encodeText(options: TargetedOptions<TextEncodingOptions | ConditionalEncodingOptions<TextEncodingOptions>>): ChartProgram;
  encodeDx(options: TargetedOptions<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>): ChartProgram;
  encodeDy(options: TargetedOptions<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>): ChartProgram;
  encodeHistogram(options: TargetedOptions<HistogramEncodingOptions>): ChartProgram;
  encodeDensity(options: TargetedOptions<DensityEncodingOptions>): ChartProgram;
  editDensity(options: TargetedOptions<EditDensityOptions>): ChartProgram;
  encodeHorizon(options?: TargetedOptions<HorizonEncodingOptions>): ChartProgram;
  editHorizon(options: TargetedOptions<EditHorizonOptions>): ChartProgram;
  encodeBarWidth(options?: TargetedOptions<BarWidthOptions>): ChartProgram;
  encodeStroke(options: TargetedOptions<StrokeEncodingOptions | ConditionalEncodingOptions<StrokeEncodingOptions>>): ChartProgram;
  encodeStrokeWidth(options: TargetedOptions<StrokeWidthEncodingOptions | ConditionalEncodingOptions<StrokeWidthEncodingOptions>>): ChartProgram;
  encodeChannels(options: TargetedOptions<EncodeChannelsOptions>): ChartProgram;
  createRegression(options?: TargetedOptions<RegressionOptions>): ChartProgram;
  editRegression(options: TargetedOptions<EditRegressionOptions>): ChartProgram;
  createErrorBar(options?: TargetedOptions<ErrorBarOptions>): ChartProgram;
  editErrorBar(options: TargetedOptions<EditErrorBarOptions>): ChartProgram;
  createErrorBand(options?: TargetedOptions<ErrorBandOptions>): ChartProgram;
  editErrorBand(options: TargetedOptions<EditErrorBandOptions>): ChartProgram;
  editErrorBandBoundary(options: TargetedOptions<EditErrorBandBoundaryOptions>): ChartProgram;
  createBoxPlot(options?: TargetedOptions<BoxPlotOptions>): ChartProgram;
  editBoxPlot(options: TargetedOptions<EditBoxPlotOptions>): ChartProgram;
  createGradientPlot(options?: TargetedOptions<GradientPlotOptions>): ChartProgram;
  editGradientPlot(options: TargetedOptions<EditGradientPlotOptions>): ChartProgram;
  createViolinPlot(options: TargetedOptions<ViolinPlotOptions>): ChartProgram;
  editViolinPlot(options: TargetedOptions<EditViolinPlotOptions>): ChartProgram;
  createScatterPlot(options: TargetedOptions<CreateScatterPlotOptions>): ChartProgram;
  createIntervalPlot(options: TargetedOptions<CreateIntervalPlotOptions>): ChartProgram;
  createRegressionPlot(options: TargetedOptions<CreateRegressionPlotOptions>): ChartProgram;
  createDotPlot(options: TargetedOptions<CreateDotPlotOptions>): ChartProgram;
  createLollipopPlot(options: TargetedOptions<CreateLollipopPlotOptions>): ChartProgram;
  createDumbbellPlot(options: TargetedOptions<CreateDumbbellPlotOptions>): ChartProgram;
  editEndpointPlot(options: TargetedOptions<EditEndpointPlotOptions>): ChartProgram;
  createECDFPlot(options: TargetedOptions<CreateECDFPlotOptions>): ChartProgram;
  editECDFPlot(options: TargetedOptions<EditECDFPlotOptions>): ChartProgram;
  createLinePlot(options: TargetedOptions<CreateLinePlotOptions>): ChartProgram;
  createPolarScatterPlot(options: TargetedOptions<CreatePolarScatterPlotOptions>): ChartProgram;
  createPolarLinePlot(options: TargetedOptions<CreatePolarLinePlotOptions>): ChartProgram;
  createRadarPlot(options: TargetedOptions<CreateRadarPlotOptions>): ChartProgram;
  editRadarPlot(options: TargetedOptions<EditRadarPlotOptions>): ChartProgram;
  createRugPlot(options: TargetedOptions<CreateRugPlotOptions>): ChartProgram;
  createStripPlot(options: TargetedOptions<CreateStripPlotOptions>): ChartProgram;
  createBeeswarmPlot(options: TargetedOptions<CreateBeeswarmPlotOptions>): ChartProgram;
  createRaincloudPlot(options: TargetedOptions<CreateRaincloudPlotOptions>): ChartProgram;
  editRaincloudPlot(options: TargetedOptions<EditRaincloudPlotOptions>): ChartProgram;
  createAreaPlot(options: TargetedOptions<CreateAreaPlotOptions>): ChartProgram;
  createBarPlot(options: TargetedOptions<CreateBarPlotOptions>): ChartProgram;
  createHistogram(options: TargetedOptions<CreateHistogramOptions>): ChartProgram;
  createPiePlot(options: TargetedOptions<CreatePiePlotOptions>): ChartProgram;
  createRosePlot(options: TargetedOptions<CreateRosePlotOptions>): ChartProgram;
  createRadialBarPlot(options: TargetedOptions<CreateRadialBarPlotOptions>): ChartProgram;
  createDensityPlot(options: TargetedOptions<CreateDensityPlotOptions>): ChartProgram;
  createHorizonPlot(options: TargetedOptions<CreateHorizonPlotOptions>): ChartProgram;
  createHeatmap(options: TargetedOptions<CreateHeatmapOptions>): ChartProgram;
  createParallelCoordinates(options: TargetedOptions<CreateParallelCoordinatesOptions>): ChartProgram;
  removeMark(options?: TargetedOptions<RemoveMarkOptions>): ChartProgram;
  createParallelAxes(options?: TargetedOptions<ParallelAxesOptions>): ChartProgram;
  createParallelAxis(options: TargetedOptions<CreateParallelAxisOptions>): ChartProgram;
  editParallelAxis(options: TargetedOptions<EditParallelAxisOptions>): ChartProgram;
  removeParallelAxis(options: TargetedOptions<RemoveParallelAxisOptions>): ChartProgram;
  removeParallelAxes(options?: TargetedOptions<ParallelAxesOptions>): ChartProgram;
  createAxes(options?: TargetedOptions<CreateAxesOptions>): ChartProgram;
  editAxes(options: TargetedOptions<EditAxesOptions>): ChartProgram;
  createXAxis(options?: TargetedOptions<CompleteAxisOptions<XAxisPosition>>): ChartProgram;
  createYAxis(options?: TargetedOptions<CompleteAxisOptions<YAxisPosition>>): ChartProgram;
  createThetaAxis(options?: TargetedOptions<CompleteThetaAxisOptions>): ChartProgram;
  createRadialAxis(options?: TargetedOptions<CompleteRadialAxisOptions>): ChartProgram;
  createThetaAxisLine(options?: TargetedOptions<CreateThetaAxisLineOptions>): ChartProgram;
  createRadialAxisLine(options?: TargetedOptions<CreateRadialAxisLineOptions>): ChartProgram;
  createThetaAxisTicks(options?: TargetedOptions<CreateThetaAxisTicksOptions>): ChartProgram;
  createRadialAxisTicks(options?: TargetedOptions<CreateRadialAxisTicksOptions>): ChartProgram;
  createThetaAxisLabels(options?: TargetedOptions<CreateThetaAxisLabelsOptions>): ChartProgram;
  createRadialAxisLabels(options?: TargetedOptions<CreateRadialAxisLabelsOptions>): ChartProgram;
  createThetaAxisTitle(options?: TargetedOptions<CreateThetaAxisTitleOptions>): ChartProgram;
  createRadialAxisTitle(options?: TargetedOptions<CreateRadialAxisTitleOptions>): ChartProgram;
  editThetaAxisLine(options?: TargetedOptions<AxisLineStyleOptions>): ChartProgram;
  editRadialAxisLine(options?: TargetedOptions<AxisLineStyleOptions>): ChartProgram;
  editThetaAxisTicks(options?: TargetedOptions<PolarTickOptions>): ChartProgram;
  editRadialAxisTicks(options?: TargetedOptions<PolarTickOptions>): ChartProgram;
  editThetaAxisLabels(options?: TargetedOptions<ThetaAxisLabelOptions>): ChartProgram;
  editRadialAxisLabels(options?: TargetedOptions<PolarLabelOptions>): ChartProgram;
  editThetaAxisTitle(options?: TargetedOptions<PolarTitleOptions>): ChartProgram;
  editRadialAxisTitle(options?: TargetedOptions<RadialTitleOptions>): ChartProgram;
  createXAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; scale?: string; position?: XAxisPosition }>): ChartProgram;
  createYAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; scale?: string; position?: YAxisPosition }>): ChartProgram;
  editXAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; position?: XAxisPosition }>): ChartProgram;
  editYAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; position?: YAxisPosition }>): ChartProgram;
  createXAxisTicks(options?: TargetedOptions<AxisTickOptions<XAxisPosition>>): ChartProgram;
  createYAxisTicks(options?: TargetedOptions<AxisTickOptions<YAxisPosition>>): ChartProgram;
  editXAxisTicks(options?: TargetedOptions<Omit<AxisTickOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTicks(options?: TargetedOptions<Omit<AxisTickOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisLabels(options?: TargetedOptions<AxisLabelOptions<XAxisPosition>>): ChartProgram;
  createYAxisLabels(options?: TargetedOptions<AxisLabelOptions<YAxisPosition>>): ChartProgram;
  editXAxisLabels(options?: TargetedOptions<Omit<AxisLabelOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisLabels(options?: TargetedOptions<Omit<AxisLabelOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisTicksAndLabels(options?: TargetedOptions<AxisTicksAndLabelsOptions<XAxisPosition>>): ChartProgram;
  createYAxisTicksAndLabels(options?: TargetedOptions<AxisTicksAndLabelsOptions<YAxisPosition>>): ChartProgram;
  editXAxisTicksAndLabels(options: TargetedOptions<Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTicksAndLabels(options: TargetedOptions<Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisTitle(options?: TargetedOptions<AxisTitleOptions<XAxisPosition>>): ChartProgram;
  createYAxisTitle(options?: TargetedOptions<AxisTitleOptions<YAxisPosition>>): ChartProgram;
  editXAxisTitle(options?: TargetedOptions<Omit<AxisTitleOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTitle(options?: TargetedOptions<Omit<AxisTitleOptions<YAxisPosition>, "scale">>): ChartProgram;
  editXAxis(options: TargetedOptions<EditAxisOptions<XAxisPosition>>): ChartProgram;
  editYAxis(options: TargetedOptions<EditAxisOptions<YAxisPosition>>): ChartProgram;
  editThetaAxis(options: TargetedOptions<EditThetaAxisOptions>): ChartProgram;
  editRadialAxis(options: TargetedOptions<EditRadialAxisOptions>): ChartProgram;
  removeXAxis(options?: TargetedOptions<RemoveAxisOptions>): ChartProgram;
  removeYAxis(options?: TargetedOptions<RemoveAxisOptions>): ChartProgram;
  removeThetaAxis(options?: TargetedOptions<Omit<RemoveAxisOptions, "target">>): ChartProgram;
  removeRadialAxis(options?: TargetedOptions<Omit<RemoveAxisOptions, "target">>): ChartProgram;
  createGrid(options?: TargetedOptions<CreateGridOptions>): ChartProgram;
  createHorizontalGrid(options?: TargetedOptions<GridDirectionOptions>): ChartProgram;
  createVerticalGrid(options?: TargetedOptions<GridDirectionOptions>): ChartProgram;
  createThetaGrid(options?: TargetedOptions<PolarGridOptions>): ChartProgram;
  createRadialGrid(options?: TargetedOptions<PolarGridOptions>): ChartProgram;
  editHorizontalGrid(options: TargetedOptions<EditGridOptions>): ChartProgram;
  editVerticalGrid(options: TargetedOptions<EditGridOptions>): ChartProgram;
  editThetaGrid(options: TargetedOptions<EditPolarGridOptions>): ChartProgram;
  editRadialGrid(options: TargetedOptions<EditPolarGridOptions>): ChartProgram;
  editGrid(options: TargetedOptions<EditGridDirectionsOptions>): ChartProgram;
  removeGrid(options?: TargetedOptions<RemoveGridOptions>): ChartProgram;
  createLegend(options?: TargetedOptions<LegendOptions>): ChartProgram;
  editLegend(options: TargetedOptions<EditLegendOptions>): ChartProgram;
  editLegendBlock(options: TargetedOptions<EditLegendBlockOptions>): ChartProgram;
  editLegendLayout(options: TargetedOptions<EditLegendLayoutOptions>): ChartProgram;
  editLegendLabels(options: TargetedOptions<EditLegendLabelsOptions>): ChartProgram;
  editLegendTitle(options: TargetedOptions<EditLegendTitleOptions>): ChartProgram;
  editLegendSymbols(options: TargetedOptions<EditLegendSymbolsOptions>): ChartProgram;
  editLegendBorder(options: TargetedOptions<EditLegendBorderOptions>): ChartProgram;
  removeLegend(options?: TargetedOptions<RemoveLegendOptions>): ChartProgram;
  createGuides(options?: TargetedOptions<CreateGuidesOptions>): ChartProgram;
  createTitle(options: TargetedOptions<TitleOptions>): ChartProgram;
  editTitle(options: TargetedOptions<EditTitleOptions>): ChartProgram;
  removeTitle(): ChartProgram;
  createCoordinate(options?: TargetedOptions<CreateCoordinateOptions>): ChartProgram;
  editCoordinate(options: TargetedOptions<EditCoordinateOptions>): ChartProgram;
  createScale(options: TargetedOptions<CreateScaleOptions>): ChartProgram;
  editScale(options: TargetedOptions<EditScaleOptions>): ChartProgram;
  editXScale(options: TargetedOptions<EditXScaleOptions>): ChartProgram;
  editYScale(options: TargetedOptions<EditYScaleOptions>): ChartProgram;
  editXOffsetScale(options: TargetedOptions<EditXOffsetScaleOptions>): ChartProgram;
  editYOffsetScale(options: TargetedOptions<EditYOffsetScaleOptions>): ChartProgram;
  editParallelScale(options: TargetedOptions<EditParallelScaleOptions>): ChartProgram;
  editThetaScale(options: TargetedOptions<EditThetaScaleOptions>): ChartProgram;
  editRScale(options: TargetedOptions<EditRScaleOptions>): ChartProgram;
  editColorScale(options: TargetedOptions<EditColorScaleOptions>): ChartProgram;
  editStrokeScale(options: TargetedOptions<EditStrokeScaleOptions>): ChartProgram;
  editSizeScale(options: TargetedOptions<EditSizeScaleOptions>): ChartProgram;
  editOpacityScale(options: TargetedOptions<EditOpacityScaleOptions>): ChartProgram;
  editShapeScale(options: TargetedOptions<EditShapeScaleOptions>): ChartProgram;
  editStrokeWidthScale(options: TargetedOptions<EditStrokeWidthScaleOptions>): ChartProgram;
  editStrokeDashScale(options: TargetedOptions<EditStrokeDashScaleOptions>): ChartProgram;
  createDerivedData(options: TargetedOptions<CreateDerivedDataOptions>): ChartProgram;
  createRegressionBand(options: TargetedOptions<CreateRegressionBandOptions>): ChartProgram;
  editRegressionBand(options: TargetedOptions<StrokeStyleDetails & { target?: string; color?: string; opacity?: number; stroke?: string | false; strokeWidth?: number; curve?: CurveInterpolation; }>): ChartProgram;
  createRegressionLine(options: TargetedOptions<CreateRegressionLineOptions>): ChartProgram;
  editRegressionLine(options: TargetedOptions<StrokeStyleDetails & { target?: string; strokeWidth?: number; curve?: CurveInterpolation; }>): ChartProgram;
  editCompositionLayout(options: TargetedOptions<EditCompositionLayoutOptions>): ChartProgram;
  replaceCompositionChild(options: TargetedOptions<ReplaceCompositionChildOptions>): ChartProgram;
  insertCompositionChild(options: TargetedOptions<InsertCompositionChildOptions>): ChartProgram;
  removeCompositionChild(options: TargetedOptions<RemoveCompositionChildOptions>): ChartProgram;
  reorderCompositionChildren(options: TargetedOptions<ReorderCompositionChildrenOptions>): ChartProgram;
  facet(options: TargetedOptions<FacetOptions>): ChartProgram;
  facetGrid(options: TargetedOptions<FacetGridOptions>): ChartProgram;
  repeatCharts(options: TargetedOptions<RepeatChartsOptions>): ChartProgram;
  editFacetSource(options: TargetedOptions<EditFacetSourceOptions>): ChartProgram;
  editFacetScales(options: TargetedOptions<FacetScaleResolutions>): ChartProgram;
  editFacetGuides(options: TargetedOptions<FacetGuideOptions>): ChartProgram;
  editFacetHeaders(options: TargetedOptions<EditFacetHeadersOptions>): ChartProgram;
  editSemantic(options: EditSemanticOptions): ChartProgram;
  createGraphics(options: { id: string; type: GraphicType; length?: number; parent?: string; before?: string; after?: string; }): ChartProgram;
  editGraphics(options: EditGraphicsOptions): ChartProgram;
}
```

## Named option contracts

These declarations are generated from the same source as the action signatures. Follow named nested types to inspect union branches, required combinations, and shared styles. The raw [declaration file](../types/program.d.ts) is also available.

### `ActionTargetList` {#type-actiontargetlist}

<details markdown="1">
<summary>Expand ActionTargetList</summary>

```typescript
export type ActionTargetList = readonly [string | ScopedActionTarget, ...(string | ScopedActionTarget)[]];
/** Full authoring can apply one native action atomically to named resources or views. */
```

</details>

Related types: [`ScopedActionTarget`](#type-scopedactiontarget).

### `AdjacentConstructorOptions` {#type-adjacentconstructoroptions}

<details markdown="1">
<summary>Expand AdjacentConstructorOptions</summary>

```typescript
type AdjacentConstructorOptions<T> = T extends unknown ? Partial<Omit<T, "id">> : never;
```

</details>

### `AdjacentPlotSpecification` {#type-adjacentplotspecification}

<details markdown="1">
<summary>Expand AdjacentPlotSpecification</summary>

```typescript
export type AdjacentPlotSpecification = (
  | { action: "createScatterPlot"; options?: AdjacentConstructorOptions<CreateScatterPlotOptions> }
  | { action: "createLinePlot"; options?: Partial<AdjacentConstructorOptions<CreateLinePlotOptions>> }
  | { action: "createBarPlot"; options?: Partial<AdjacentConstructorOptions<CreateBarPlotOptions>> }
  | { action: "createAreaPlot"; options?: AdjacentConstructorOptions<CreateAreaPlotOptions> }
  | { action: "createDotPlot"; options?: AdjacentConstructorOptions<CreateDotPlotOptions> }
  | { action: "createLollipopPlot"; options?: AdjacentConstructorOptions<CreateLollipopPlotOptions> }
  | { action: "createDumbbellPlot"; options?: AdjacentConstructorOptions<CreateDumbbellPlotOptions> }
  | { action: "createECDFPlot"; options?: AdjacentConstructorOptions<CreateECDFPlotOptions> }
  | { action: "createIntervalPlot"; options?: AdjacentConstructorOptions<CreateIntervalPlotOptions> }
  | { action: "createRegressionPlot"; options?: AdjacentConstructorOptions<CreateRegressionPlotOptions> }
  | { action: "createRugPlot"; options?: AdjacentConstructorOptions<CreateRugPlotOptions> }
  | { action: "createStripPlot"; options?: AdjacentConstructorOptions<CreateStripPlotOptions> }
  | { action: "createBeeswarmPlot"; options?: AdjacentConstructorOptions<CreateBeeswarmPlotOptions> }
  | { action: "createRaincloudPlot"; options?: AdjacentConstructorOptions<CreateRaincloudPlotOptions> }
  | { action: "createBoxPlot"; options?: AdjacentConstructorOptions<BoxPlotOptions> }
  | { action: "createGradientPlot"; options?: AdjacentConstructorOptions<GradientPlotOptions> }
  | { action: "createViolinPlot"; options?: AdjacentConstructorOptions<ViolinPlotOptions> }
  | { action: "createDensityPlot"; options?: AdjacentConstructorOptions<CreateDensityPlotOptions> }
  | { action: "createHorizonPlot"; options?: AdjacentConstructorOptions<CreateHorizonPlotOptions> }
  | { action: "createHistogram"; options?: AdjacentConstructorOptions<CreateHistogramOptions> }
  | { action: "createHeatmap"; options?: AdjacentConstructorOptions<CreateHeatmapOptions> }
  | { action: "createPiePlot"; options?: AdjacentConstructorOptions<CreatePiePlotOptions> }
  | { action: "createRosePlot"; options?: AdjacentConstructorOptions<CreateRosePlotOptions> }
  | { action: "createRadialBarPlot"; options?: AdjacentConstructorOptions<CreateRadialBarPlotOptions> }
  | { action: "createPolarScatterPlot"; options?: AdjacentConstructorOptions<CreatePolarScatterPlotOptions> }
  | { action: "createPolarLinePlot"; options?: AdjacentConstructorOptions<CreatePolarLinePlotOptions> }
  | { action: "createRadarPlot"; options?: AdjacentConstructorOptions<CreateRadarPlotOptions> }
  | { action: "createParallelCoordinates"; options?: AdjacentConstructorOptions<CreateParallelCoordinatesOptions> }
  | { action: "createTextPlot"; options?: AdjacentConstructorOptions<CreateTextPlotOptions> }) & { inherit?: { color?: boolean } };
/** A native constructor with positional/data decisions inferred from the source.
 * Omitted color is inherited only when valid at the new plot's grain. Line and
 * Polar Line require one color value per series; otherwise the default is a
 * single color. Explicit color/groupBy options remain validated and authoritative.
 */
```

</details>

Related types: [`AdjacentConstructorOptions`](#type-adjacentconstructoroptions) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`CreateLinePlotOptions`](#type-createlineplotoptions) · [`CreateBarPlotOptions`](#type-createbarplotoptions) · [`CreateAreaPlotOptions`](#type-createareaplotoptions) · [`CreateDotPlotOptions`](#type-createdotplotoptions) · [`CreateLollipopPlotOptions`](#type-createlollipopplotoptions) · [`CreateDumbbellPlotOptions`](#type-createdumbbellplotoptions) · [`CreateECDFPlotOptions`](#type-createecdfplotoptions) · [`CreateIntervalPlotOptions`](#type-createintervalplotoptions) · [`CreateRegressionPlotOptions`](#type-createregressionplotoptions) · [`CreateRugPlotOptions`](#type-createrugplotoptions) · [`CreateStripPlotOptions`](#type-createstripplotoptions) · [`CreateBeeswarmPlotOptions`](#type-createbeeswarmplotoptions) · [`CreateRaincloudPlotOptions`](#type-createraincloudplotoptions) · [`BoxPlotOptions`](#type-boxplotoptions) · [`GradientPlotOptions`](#type-gradientplotoptions) · [`ViolinPlotOptions`](#type-violinplotoptions) · [`CreateDensityPlotOptions`](#type-createdensityplotoptions) · [`CreateHorizonPlotOptions`](#type-createhorizonplotoptions) · [`CreateHistogramOptions`](#type-createhistogramoptions) · [`CreateHeatmapOptions`](#type-createheatmapoptions) · [`CreatePiePlotOptions`](#type-createpieplotoptions) · [`CreateRosePlotOptions`](#type-createroseplotoptions) · [`CreateRadialBarPlotOptions`](#type-createradialbarplotoptions) · [`CreatePolarScatterPlotOptions`](#type-createpolarscatterplotoptions) · [`CreatePolarLinePlotOptions`](#type-createpolarlineplotoptions) · [`CreateRadarPlotOptions`](#type-createradarplotoptions) · [`CreateParallelCoordinatesOptions`](#type-createparallelcoordinatesoptions) · [`CreateTextPlotOptions`](#type-createtextplotoptions).

### `AggregateOperation` {#type-aggregateoperation}

<details markdown="1">
<summary>Expand AggregateOperation</summary>

```typescript
export type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
/** HCL modes borrow a chromatic endpoint's hue across an exact RGB-neutral endpoint. */
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

/** Unscaled, signed logical-pixel offsets for independent Text marks. */
```

</details>

### `AnnotationAnchor` {#type-annotationanchor}

<details markdown="1">
<summary>Expand AnnotationAnchor</summary>

```typescript
type AnnotationAnchor =
  | { anchor?: never; space: "screen"; x: number; y: number; source?: never; data?: never;
      coordinate?: never; select?: never; selection?: never; }
  | {
      anchor: "plot-center";
      select?: never;
      selection?: never;
      x?: never;
      y?: never;
      space?: never;
      source?: never;
      align?: never;
      baseline?: never;
      data?: string;
      coordinate?: string;
    }
  | ({
      anchor?: never;
      x?: never;
      y?: never;
      space?: never;
      source?: string;
      data?: never;
      coordinate?: never;
    } & MarkLabelSelectionOptions)
  | {
      anchor?: never;
      select?: never;
      selection?: never;
      x: unknown;
      y: unknown;
      space?: "data";
      source?: string;
      data?: never;
      coordinate?: never;
    }
  | {
      anchor?: never;
      x: number;
      y: number;
      select?: never;
      selection?: never;
      space: "plot";
      source?: never;
      data?: string;
      coordinate?: string;
    };
```

</details>

Related types: [`MarkLabelSelectionOptions`](#type-marklabelselectionoptions).

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

### `ApplyDataUpdateOptions` {#type-applydataupdateoptions}

<details markdown="1">
<summary>Expand ApplyDataUpdateOptions</summary>

```typescript
export interface ApplyDataUpdateOptions<Kind extends DataUpdateRequest["kind"] = DataUpdateRequest["kind"]> {
  readonly prepared: PreparedDataUpdate<Kind>;
  readonly requestToken: string;
}
```

</details>

Related types: [`DataUpdateRequest`](#type-dataupdaterequest) · [`PreparedDataUpdate`](#type-prepareddataupdate).

### `ApplyFontResourceOptions` {#type-applyfontresourceoptions}

<details markdown="1">
<summary>Expand ApplyFontResourceOptions</summary>

```typescript
export interface ApplyFontResourceOptions<Kind extends "create" | "replace"> { prepared: PreparedFontResource<Kind>; requestToken: string; }
declare const preparedTextMetricsBrand: unique symbol;
```

</details>

Related types: [`PreparedFontResource`](#type-preparedfontresource).

### `ApplyGraphEdgeRoutesOptions` {#type-applygraphedgeroutesoptions}

<details markdown="1">
<summary>Expand ApplyGraphEdgeRoutesOptions</summary>

```typescript
export interface ApplyGraphEdgeRoutesOptions { readonly prepared: PreparedGraphEdgeRoutes; readonly requestToken: string; }
```

</details>

Related types: [`PreparedGraphEdgeRoutes`](#type-preparedgraphedgeroutes).

### `ApplyImageResourceOptions` {#type-applyimageresourceoptions}

<details markdown="1">
<summary>Expand ApplyImageResourceOptions</summary>

```typescript
export interface ApplyImageResourceOptions<Kind extends "create" | "replace"> {
  prepared: PreparedImageResource<Kind>; requestToken: string;
}
```

</details>

Related types: [`PreparedImageResource`](#type-preparedimageresource).

### `ApplyTextMetricsOptions` {#type-applytextmetricsoptions}

<details markdown="1">
<summary>Expand ApplyTextMetricsOptions</summary>

```typescript
export type ApplyTextMetricsOptions = TargetedOptions<{ profile: TextMetricsProfile; prepared?: never; requestToken?: never }> |
  { profile?: never; prepared: PreparedTextMetrics; requestToken: string; target?: never };
```

</details>

Related types: [`TargetedOptions`](#type-targetedoptions) · [`TextMetricsProfile`](#type-textmetricsprofile) · [`PreparedTextMetrics`](#type-preparedtextmetrics).

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
  | "ticks"
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
  /** Both modes keep grapheme clusters intact; hard breaks preserve line spacing. */
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
  extends CartesianAxisLabelStyleOptions, AxisLabelLayoutOptions, DisplayLabelOptions {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
}
```

</details>

Related types: [`CartesianAxisLabelStyleOptions`](#type-cartesianaxislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions) · [`AxisTickRounding`](#type-axistickrounding) · [`AxisValue`](#type-axisvalue).

### `AxisLabelStyleOptions` {#type-axislabelstyleoptions}

<details markdown="1">
<summary>Expand AxisLabelStyleOptions</summary>

```typescript
export interface AxisLabelStyleOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
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
  extends CartesianAxisTickStyleOptions {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
}
/** Cartesian label maps use typed category values or finite numeric/timestamp keys on continuous scales. Empty mapped labels are omitted without removing ticks. */
```

</details>

Related types: [`CartesianAxisTickStyleOptions`](#type-cartesianaxistickstyleoptions) · [`AxisTickRounding`](#type-axistickrounding) · [`AxisValue`](#type-axisvalue).

### `AxisTickRounding` {#type-axistickrounding}

<details markdown="1">
<summary>Expand AxisTickRounding</summary>

```typescript
export type AxisTickRounding = "ceiling" | "nearest";
```

</details>

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
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
  ticks?: CartesianAxisTickStyleOptions;
  labels?: CartesianAxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
}
```

</details>

Related types: [`AxisTickRounding`](#type-axistickrounding) · [`AxisValue`](#type-axisvalue) · [`CartesianAxisTickStyleOptions`](#type-cartesianaxistickstyleoptions) · [`CartesianAxisLabelStyleOptions`](#type-cartesianaxislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

### `AxisTitleOffset` {#type-axistitleoffset}

<details markdown="1">
<summary>Expand AxisTitleOffset</summary>

```typescript
export type AxisTitleOffset = number | Readonly<{ from: "labels"; gap: number }>;
```

</details>

### `AxisTitleOptions` {#type-axistitleoptions}

<details markdown="1">
<summary>Expand AxisTitleOptions</summary>

```typescript
export interface AxisTitleOptions<P extends string> {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  /** Signed logical pixels: positive right for x, down for y, independent of scale reversal. */
  alongOffset?: number;
  align?: "left" | "center" | "right";
  /** Defaults to error; allow permits only this title to intersect its own axis labels. */
  overlap?: "error" | "allow";
  baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  /** Hard breaks retain ordered lines with the chosen block baseline, spaced at 1.2 times fontSize. */
  text?: string;
  scale?: string;
  position?: P;
  at?: "start" | "center" | "end" | number;
  /** Signed distance from the axis frame, or a nonnegative gap outside same-owner labels. */
  offset?: AxisTitleOffset;
  rotation?: RotationInput;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

Related types: [`AxisTitleOffset`](#type-axistitleoffset) · [`RotationInput`](#type-rotationinput).

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
/** With binned quantitative X, aggregate Y per exact interval (and optional series). */
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
      layout?: Exclude<ColorLayout, "center" | "wiggle">;
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

### `BarRangeOppositePositionChannel` {#type-barrangeoppositepositionchannel}

<details markdown="1">
<summary>Expand BarRangeOppositePositionChannel</summary>

```typescript
type BarRangeOppositePositionChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal" | "temporal";
  temporalUnit?: TemporalInputUnit;
  scale?: NonPointBandPositionScaleOptions | NonPointTemporalPositionScaleOptions;
  bin?: never;
  aggregate?: never;
  stack?: never;
};
```

</details>

Related types: [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointBandPositionScaleOptions`](#type-nonpointbandpositionscaleoptions) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

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
  | { band?: number; pixels?: never; interval?: never }
  | { band?: never; pixels: number; interval?: never }
  | { band?: never; pixels?: never; interval: { unit: Exclude<TimeUnit, "week" | "weekday">; insetStart?: number; insetEnd?: number } }
);
```

</details>

Related types: [`TimeUnit`](#type-timeunit).

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
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
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
export type BasicSizeChannel = string | WithoutEncodingTarget<SizeEncodingOptions>;
```

</details>

Related types: [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`SizeEncodingOptions`](#type-sizeencodingoptions).

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
  assignment?: "edges" | "step";
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

### `BlendMode` {#type-blendmode}

<details markdown="1">
<summary>Expand BlendMode</summary>

```typescript
export type BlendMode = "normal" | "multiply" | "screen" | "difference";
```

</details>

### `BootstrapMeanIntervalMethod` {#type-bootstrapmeanintervalmethod}

<details markdown="1">
<summary>Expand BootstrapMeanIntervalMethod</summary>

```typescript
export interface BootstrapMeanIntervalMethod {
  type: "bootstrap";
  seed: number;
  samples?: number;
}
```

</details>

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
  summary?: BoxPlotSummaryFields;
  id?: string;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  coordinate?: string;
  color?: string | {
    field: string;
    fieldType?: "nominal" | "ordinal";
    scale?: NonPointCategoricalColorScaleOptions;
    palette?: Palette;
  } | { value: string };
  whisker?: BoxPlotWhisker;
  width?: BoxPlotWidth;
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    width?: { pixels: number } | "auto";
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

Related types: [`BoxPlotSummaryFields`](#type-boxplotsummaryfields) · [`BoxPlotPositionChannel`](#type-boxplotpositionchannel) · [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`BoxPlotWhisker`](#type-boxplotwhisker) · [`BoxPlotWidth`](#type-boxplotwidth) · [`RectStyleDetails`](#type-rectstyledetails) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`BoxPlotGuideOptions`](#type-boxplotguideoptions).

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

### `BoxPlotSummaryFields` {#type-boxplotsummaryfields}

<details markdown="1">
<summary>Expand BoxPlotSummaryFields</summary>

```typescript
export interface BoxPlotSummaryFields {
  min: string;
  q1: string;
  median: string;
  q3: string;
  max: string;
}
```

</details>

### `BoxPlotWhisker` {#type-boxplotwhisker}

<details markdown="1">
<summary>Expand BoxPlotWhisker</summary>

```typescript
export type BoxPlotWhisker = (
  | { type?: "tukey"; factor?: number }
  | { type: "minmax"; factor?: never }
) & Pick<ErrorBarOptions, "caps" | "capSize" | "stroke" | "strokeWidth" | "strokeDash" | "opacity" |
  "lineCap" | "lineJoin" | "miterLimit">;
```

</details>

Related types: [`ErrorBarOptions`](#type-errorbaroptions).

### `BoxPlotWidth` {#type-boxplotwidth}

<details markdown="1">
<summary>Expand BoxPlotWidth</summary>

```typescript
type BoxPlotWidth = { band?: number; pixels?: never } | { band?: never; pixels: number };
```

</details>

### `BundleGraphEdgesOptions` {#type-bundlegraphedgesoptions}

<details markdown="1">
<summary>Expand BundleGraphEdgesOptions</summary>

```typescript
export type BundleGraphEdgesOptions = { readonly id: string; readonly graph?: string; readonly layout?: string; readonly coordinateSpace?: "world" | "screen" } & EdgeRouteDefinition;
/** Same-method options patch existing values; changing method starts from that method's defaults. */
```

</details>

Related types: [`EdgeRouteDefinition`](#type-edgeroutedefinition).

### `CAxes` {#type-caxes}

<details markdown="1">
<summary>Expand CAxes</summary>

```typescript
type CAxes = Omit<CartesianAxesOptions, "x" | "y"> & {
  x?: false | CAxis<XAxisPosition> | readonly [CAxis<XAxisPosition> & { id: string }, ...(CAxis<XAxisPosition> & { id: string })[]];
  y?: false | CAxis<YAxisPosition> | readonly [CAxis<YAxisPosition> & { id: string }, ...(CAxis<YAxisPosition> & { id: string })[]];
};
```

</details>

Related types: [`CartesianAxesOptions`](#type-cartesianaxesoptions) · [`CAxis`](#type-caxis) · [`XAxisPosition`](#type-xaxisposition) · [`YAxisPosition`](#type-yaxisposition).

### `CAxis` {#type-caxis}

<details markdown="1">
<summary>Expand CAxis</summary>

```typescript
type CAxis<P extends string> = Omit<CompleteAxisOptions<P>, "ticksAndLabels"> & {
  ticksAndLabels?: false | Omit<CAxisTicks<P>, "scale" | "position" | "target">;
};
```

</details>

Related types: [`CompleteAxisOptions`](#type-completeaxisoptions) · [`CAxisTicks`](#type-caxisticks).

### `CAxisTicks` {#type-caxisticks}

<details markdown="1">
<summary>Expand CAxisTicks</summary>

```typescript
type CAxisTicks<P extends string> = Omit<AxisTicksAndLabelsOptions<P>, "labels"> & {
  labels?: CartesianAxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
};
```

</details>

Related types: [`AxisTicksAndLabelsOptions`](#type-axisticksandlabelsoptions) · [`CartesianAxisLabelStyleOptions`](#type-cartesianaxislabelstyleoptions) · [`AxisLabelLayoutOptions`](#type-axislabellayoutoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions).

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

### `CalendarBoundaryPaint` {#type-calendarboundarypaint}

<details markdown="1">
<summary>Expand CalendarBoundaryPaint</summary>

```typescript
export interface CalendarBoundaryPaint {
  readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number; readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `CalendarCellPaint` {#type-calendarcellpaint}

<details markdown="1">
<summary>Expand CalendarCellPaint</summary>

```typescript
export interface CalendarCellPaint {
  readonly fill?: FillPaint; readonly emptyFill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number;
  readonly opacity?: number; readonly gap?: number; readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `CalendarDayDomain` {#type-calendardaydomain}

<details markdown="1">
<summary>Expand CalendarDayDomain</summary>

```typescript
export interface CalendarDayDomain {
  readonly unit: "day";
  /** Inclusive strict Gregorian YYYY-MM-DD date. */
  readonly start: string;
  /** Inclusive strict Gregorian YYYY-MM-DD date. */
  readonly end: string;
  readonly timeZone: string;
}
```

</details>

### `CalendarDayOptions` {#type-calendardayoptions}

<details markdown="1">
<summary>Expand CalendarDayOptions</summary>

```typescript
export interface CalendarDayOptions {
  readonly start: string; readonly end: string; readonly timeZone: string;
  readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; readonly missing: "empty" | "omit";
}
```

</details>

### `CalendarDefinition` {#type-calendardefinition}

<details markdown="1">
<summary>Expand CalendarDefinition</summary>

```typescript
export type CalendarDefinition = CalendarDayOptions & { readonly date: string } &
  ({ readonly aggregate: "count"; readonly value?: never }
  | { readonly aggregate: "sum" | "mean" | "median" | "min" | "max"; readonly value: string });
```

</details>

Related types: [`CalendarDayOptions`](#type-calendardayoptions).

### `CalendarLabelPaint` {#type-calendarlabelpaint}

<details markdown="1">
<summary>Expand CalendarLabelPaint</summary>

```typescript
export interface CalendarLabelPaint {
  readonly fill?: FillPaint; readonly fontFamily?: string; readonly fontSize?: number; readonly fontWeight?: string | number;
  readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `CalendarLabelRole` {#type-calendarlabelrole}

<details markdown="1">
<summary>Expand CalendarLabelRole</summary>

```typescript
export type CalendarLabelRole = "month" | "weekday" | "week" | "year";
/** A filled ribbon whose width is measured in logical screen pixels per source sample. */
```

</details>

### `CalendarLayoutPatch` {#type-calendarlayoutpatch}

<details markdown="1">
<summary>Expand CalendarLayoutPatch</summary>

```typescript
export type CalendarLayoutPatch = Partial<CalendarDayOptions> & { readonly date?: string; readonly value?: string;
  readonly aggregate?: "count" | "sum" | "mean" | "median" | "min" | "max" };
```

</details>

Related types: [`CalendarDayOptions`](#type-calendardayoptions).

### `CalendarPlotOptions` {#type-calendarplotoptions}

<details markdown="1">
<summary>Expand CalendarPlotOptions</summary>

```typescript
export interface CalendarPlotOptions {
  readonly id?: string; readonly layout?: string; readonly coordinate?: string; readonly clip?: boolean;
  readonly color?: false | ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
  readonly cells?: CalendarCellPaint; readonly monthBoundary?: false | CalendarBoundaryPaint;
  readonly labels?: false | Readonly<Partial<Record<CalendarLabelRole, false | CalendarLabelPaint>>>;
}
```

</details>

Related types: [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions) · [`CalendarCellPaint`](#type-calendarcellpaint) · [`CalendarBoundaryPaint`](#type-calendarboundarypaint) · [`CalendarLabelRole`](#type-calendarlabelrole) · [`CalendarLabelPaint`](#type-calendarlabelpaint).

### `CanvasOptions` {#type-canvasoptions}

<details markdown="1">
<summary>Expand CanvasOptions</summary>

```typescript
export interface CanvasOptions {
  width?: number;
  height?: number;
  background?: string;
  margin?: number | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
  /** Preserve outer dimensions and authored margins while reserving guide lanes. False disables. */
  responsive?: false | ResponsiveCanvasOptions;
  /** Exact inner dimensions with automatic outer guide margins; false disables this mode. */
  plot?: { width: number; height: number } | false;
  /** Optional inner plot outline. Defaults off; an object replaces the complete style on edit. */
  plotBorder?: false | {
    /** Non-empty color string. Defaults to #ddd. */
    color?: string;
    /** Positive finite width smaller than both plot dimensions. Defaults to 1. */
    lineWidth?: number;
    /** Paint this border before ordinary marks. Defaults to false. */
    underlay?: boolean;
  };
}
```

</details>

Related types: [`ResponsiveCanvasOptions`](#type-responsivecanvasoptions).

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

### `CartesianAxisLabelColorMap` {#type-cartesianaxislabelcolormap}

<details markdown="1">
<summary>Expand CartesianAxisLabelColorMap</summary>

```typescript
export type CartesianAxisLabelColorMap = ReadonlyArray<Readonly<{
  value: DatasetScalar;
  color: string;
}>>;
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar).

### `CartesianAxisLabelStyleOptions` {#type-cartesianaxislabelstyleoptions}

<details markdown="1">
<summary>Expand CartesianAxisLabelStyleOptions</summary>

```typescript
export interface CartesianAxisLabelStyleOptions extends AxisLabelStyleOptions {
  /** Opt-in measured fallback; requires responsive Canvas mode. False removes the policy. */
  responsive?: false | ResponsiveLabelOptions;
  /** Local text alignment before rotation; omitted edits retain existing intent. */
  align?: "left" | "center" | "right";
  /** Typed raw-tick color overrides; missing entries use color. Auto removes the map. */
  colorMap?: CartesianAxisLabelColorMap | "auto";
  /** Keep unrotated label bounds inside the mapped axis span; defaults to false. */
  flush?: boolean;
  /** Only flush mapped ticks within this non-negative distance of a range edge. Auto restores all-label containment. */
  flushThreshold?: number | "auto";
  /** Signed displacement from the mapped tick position, independent of outward offset. */
  alongOffset?: number;
}
```

</details>

Related types: [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`ResponsiveLabelOptions`](#type-responsivelabeloptions) · [`CartesianAxisLabelColorMap`](#type-cartesianaxislabelcolormap).

### `CartesianAxisTickStyleOptions` {#type-cartesianaxistickstyleoptions}

<details markdown="1">
<summary>Expand CartesianAxisTickStyleOptions</summary>

```typescript
export interface CartesianAxisTickStyleOptions extends AxisTickStyleOptions {
  strokeDash?: readonly number[];
  /** Typed raw-value overrides. Empty arrays and auto clear only the map. */
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Signed logical pixels along the axis: positive right for x, down for y. */
  alongOffset?: number;
}
```

</details>

Related types: [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`CartesianGuideDashMap`](#type-cartesianguidedashmap).

### `CartesianCategoricalGuideOptions` {#type-cartesiancategoricalguideoptions}

<details markdown="1">
<summary>Expand CartesianCategoricalGuideOptions</summary>

```typescript
type CartesianCategoricalGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<
    SeparateFilledLegendOptions,
    "count" | "values" | "gradient" | "labels" | "order" | "representation" | "symbol" | "titlePosition"
  > & {
    titlePosition?: "top" | "left";
    symbol?: FilledLegendSymbolRecipe;
    labels?: CategoricalLegendTextOptions;
    order?: CartesianLegendOrder;
  });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`SeparateFilledLegendOptions`](#type-separatefilledlegendoptions) · [`FilledLegendSymbolRecipe`](#type-filledlegendsymbolrecipe) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `CartesianCategoricalPointGuideOptions` {#type-cartesiancategoricalpointguideoptions}

<details markdown="1">
<summary>Expand CartesianCategoricalPointGuideOptions</summary>

```typescript
type CartesianCategoricalPointGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<CategoricalPointLegendOptions, "count" | "values" | "gradient" | "labels" | "order" | "symbol" | "titlePosition"> & {
    titlePosition?: "top" | "left";
    symbol?: FilledLegendSymbolRecipe; labels?: CategoricalLegendTextOptions; order?: CartesianLegendOrder;
  });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`CategoricalPointLegendOptions`](#type-categoricalpointlegendoptions) · [`FilledLegendSymbolRecipe`](#type-filledlegendsymbolrecipe) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `CartesianGridOptions` {#type-cartesiangridoptions}

<details markdown="1">
<summary>Expand CartesianGridOptions</summary>

```typescript
type CartesianGridOptions = Pick<CreateGridOptions, "horizontal" | "vertical">;
```

</details>

Related types: [`CreateGridOptions`](#type-creategridoptions).

### `CartesianGuideDashMap` {#type-cartesianguidedashmap}

<details markdown="1">
<summary>Expand CartesianGuideDashMap</summary>

```typescript
export type CartesianGuideDashMap = ReadonlyArray<Readonly<{
  value: AxisValue;
  strokeDash: readonly number[];
}>>;
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `CartesianGuideOptions` {#type-cartesianguideoptions}

<details markdown="1">
<summary>Expand CartesianGuideOptions</summary>

```typescript
type CartesianGuideOptions = {
  axes?: false | CartesianAxesOptions;
  grid?: false | CartesianGridOptions;
  legend?: false | (DistributiveLegendOmit<FilledMarkLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
// These constructors map hue through color, so their combined legend cannot
// override fill. Scatter and direct legend actions also support mapped stroke.
```

</details>

Related types: [`CartesianAxesOptions`](#type-cartesianaxesoptions) · [`CartesianGridOptions`](#type-cartesiangridoptions) · [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

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

### `CartesianSeparateGuideOptions` {#type-cartesianseparateguideoptions}

<details markdown="1">
<summary>Expand CartesianSeparateGuideOptions</summary>

```typescript
type CartesianSeparateGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (DistributiveLegendOmit<SeparateFilledLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`SeparateFilledLegendOptions`](#type-separatefilledlegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

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
  /** Aggregate bars default to overlay for their category field, otherwise group;
   * existing groups and stored or explicit layouts take precedence. */
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

### `CategoricalPointLegendOptions` {#type-categoricalpointlegendoptions}

<details markdown="1">
<summary>Expand CategoricalPointLegendOptions</summary>

```typescript
type CategoricalPointLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "representation">;
```

</details>

Related types: [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions).

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

### `CategoricalSizeScaleOptions` {#type-categoricalsizescaleoptions}

<details markdown="1">
<summary>Expand CategoricalSizeScaleOptions</summary>

```typescript
export type CategoricalSizeScaleOptions = SizeScaleCommonOptions & {
  type?: "ordinal";
  domain?: "auto" | readonly (string | number | boolean)[];
  range?: "auto" | readonly [number, ...number[]];
  clamp?: never;
  base?: never;
  exponent?: never;
};
```

</details>

Related types: [`SizeScaleCommonOptions`](#type-sizescalecommonoptions).

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
  | { value: string; target?: string; field?: never; fieldType?: never;
      scale?: never; palette?: never; layout?: never; aggregate?: never; temporalUnit?: never }
  | (CategoricalEncodingOptions & { value?: never })
  | {
      field: string;
      target?: string;
      value?: never;
      fieldType: "quantitative";
      aggregate?: AggregateOperation;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      palette?: Palette;
      layout?: never;
    }
  | {
      field: string;
      target?: string;
      value?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
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
  legend?: false | (DistributiveLegendOmit<SeparateFilledLegendOptions, "order"> & {
    order?: CartesianLegendOrder;
  });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`SeparateFilledLegendOptions`](#type-separatefilledlegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

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
  | "center"
  | "wiggle";
```

</details>

### `ColorMappedPointGuideOptions` {#type-colormappedpointguideoptions}

<details markdown="1">
<summary>Expand ColorMappedPointGuideOptions</summary>

```typescript
type ColorMappedPointGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (DistributiveLegendOmit<ColorMappedPointLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`ColorMappedPointLegendOptions`](#type-colormappedpointlegendoptions) · [`CartesianLegendOrder`](#type-cartesianlegendorder).

### `ColorMappedPointLegendOptions` {#type-colormappedpointlegendoptions}

<details markdown="1">
<summary>Expand ColorMappedPointLegendOptions</summary>

```typescript
type ColorMappedPointLegendOptions =
  | Exclude<FilledMarkLegendOptions, { combine: "color-size-shape" }>
  | (Omit<Extract<FilledMarkLegendOptions, { combine: "color-size-shape" }>, "symbol"> & {
      symbol?: "auto" | { type?: "point"; stroke?: string; strokeWidth?: number; opacity?: number };
    });
```

</details>

Related types: [`FilledMarkLegendOptions`](#type-filledmarklegendoptions).

### `CompleteAxisOptions` {#type-completeaxisoptions}

<details markdown="1">
<summary>Expand CompleteAxisOptions</summary>

```typescript
export interface CompleteAxisOptions<P extends string> {
  /** Paint the complete Cartesian axis before ordinary marks. Defaults to false. */
  underlay?: boolean;
  /** Omission retains the canonical x/y identity. */
  id?: string;
  /** Non-negative outward displacement of the complete axis frame in logical pixels. */
  offset?: number;
  scale?: string;
  coordinate?: string;
  position?: P;
  line?: false | AxisLineStyleOptions;
  ticksAndLabels?: false | Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position" | "target">;
  title?: false | Omit<AxisTitleOptions<P>, "scale" | "position" | "target">;
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
  | { values: readonly [DatasetScalar, ...DatasetScalar[]]; sequence?: never; calendar?: never }
  | {
      values?: never;
      sequence: { start: number; end: number; step: number };
      calendar?: never;
    }
  | { calendar: CalendarDayDomain; values?: never; sequence?: never }
  | { values?: never; sequence?: never; calendar?: never }
);
```

</details>

Related types: [`CompleteDataBaseOptions`](#type-completedatabaseoptions) · [`DatasetScalar`](#type-datasetscalar) · [`CalendarDayDomain`](#type-calendardaydomain).

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

### `CompositionShares` {#type-compositionshares}

<details markdown="1">
<summary>Expand CompositionShares</summary>

```typescript
export interface CompositionShares {
  x?: boolean; y?: boolean; color?: boolean; stroke?: boolean; size?: boolean; shape?: boolean;
  opacity?: boolean; strokeWidth?: boolean; strokeDash?: boolean;
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
export type ComputedExpression = ComputedExpressionV1 | ComputedExpressionV2;
```

</details>

Related types: [`ComputedExpressionV1`](#type-computedexpressionv1) · [`ComputedExpressionV2`](#type-computedexpressionv2).

### `ComputedExpressionV1` {#type-computedexpressionv1}

<details markdown="1">
<summary>Expand ComputedExpressionV1</summary>

```typescript
export type ComputedExpressionV1 =
  | { readonly field: string }
  | { readonly constant: number | string | boolean | null }
  | {
      readonly op: "getPath";
      readonly operand: { readonly field: string };
      readonly path: readonly [string, ...string[]];
    }
  | {
      readonly op: "replaceLiteral";
      readonly operand: ComputedExpressionV1;
      readonly search: string;
      readonly replacement: string;
    }
  | {
      readonly op: "datePart";
      readonly part: "year";
      readonly operand: ComputedExpressionV1;
      readonly timeZone?: string;
    }
  | {
      readonly op: "parseTime";
      readonly operand: ComputedExpressionV1;
      readonly format?: ParseTimeFormat;
    }
  | {
      readonly op: "negate" | "absolute" | "log" | "sqrt" | "floor" | "not" | "isNull" | "toNumber";
      readonly operand: ComputedExpressionV1;
    }
  | {
      readonly op: "add" | "subtract" | "multiply" | "divide" |
        "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      readonly left: ComputedExpressionV1;
      readonly right: ComputedExpressionV1;
    }
  | {
      readonly op: "and" | "or" | "coalesce";
      readonly operands: readonly [ComputedExpressionV1, ComputedExpressionV1, ...ComputedExpressionV1[]];
    }
  | {
      readonly op: "concat";
      readonly operands: readonly [ComputedExpressionV1, ...ComputedExpressionV1[]];
    }
  | {
      readonly op: "if";
      readonly condition: ComputedExpressionV1;
      readonly then: ComputedExpressionV1;
      readonly else: ComputedExpressionV1;
    };
```

</details>

Related types: [`ParseTimeFormat`](#type-parsetimeformat).

### `ComputedExpressionV2` {#type-computedexpressionv2}

<details markdown="1">
<summary>Expand ComputedExpressionV2</summary>

```typescript
export interface ComputedExpressionV2 {
  readonly version: 2;
  readonly registry: "standard@1";
  readonly root: ExpressionNode;
}
```

</details>

Related types: [`ExpressionNode`](#type-expressionnode).

### `ConcretePathCommand` {#type-concretepathcommand}

<details markdown="1">
<summary>Expand ConcretePathCommand</summary>

```typescript
export type ConcretePathCommand =
  | { readonly op: "M"; readonly x: number; readonly y: number }
  | { readonly op: "L"; readonly x: number; readonly y: number }
  | {
      readonly op: "C";
      readonly x1: number;
      readonly y1: number;
      readonly x2: number;
      readonly y2: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly op: "Z" };
```

</details>

### `ConditionalEncodingBranch` {#type-conditionalencodingbranch}

<details markdown="1">
<summary>Expand ConditionalEncodingBranch</summary>

```typescript
interface ConditionalEncodingBranch<Value> {
  when: ComputedExpressionV2 | { selection: string };
  value: WithoutEncodingTarget<Value>;
}
```

</details>

Related types: [`ComputedExpressionV2`](#type-computedexpressionv2) · [`WithoutEncodingTarget`](#type-withoutencodingtarget).

### `ConditionalEncodingOptions` {#type-conditionalencodingoptions}

<details markdown="1">
<summary>Expand ConditionalEncodingOptions</summary>

```typescript
export type ConditionalEncodingOptions<Value> = {
  target?: string;
  conditions: readonly ConditionalEncodingBranch<Value>[];
  otherwise: WithoutEncodingTarget<Value>;
};
```

</details>

Related types: [`ConditionalEncodingBranch`](#type-conditionalencodingbranch) · [`WithoutEncodingTarget`](#type-withoutencodingtarget).

### `ConfidenceIntervalMethod` {#type-confidenceintervalmethod}

<details markdown="1">
<summary>Expand ConfidenceIntervalMethod</summary>

```typescript
export type ConfidenceIntervalMethod = "normal" | "student-t";
/** Seeded percentile bootstrap of nonweighted means; samples defaults to 1000. */
```

</details>

### `ContinuousCartesianGridOptions` {#type-continuouscartesiangridoptions}

<details markdown="1">
<summary>Expand ContinuousCartesianGridOptions</summary>

```typescript
type ContinuousCartesianGridOptions = {
  vertical?: boolean | ContinuousGridDirectionOptions;
  horizontal?: boolean | ContinuousGridDirectionOptions;
};
```

</details>

Related types: [`ContinuousGridDirectionOptions`](#type-continuousgriddirectionoptions).

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
/** A simple polygon around its unchanged input origin; defaults to equal-area normalization. */
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

### `ContinuousGridDirectionOptions` {#type-continuousgriddirectionoptions}

<details markdown="1">
<summary>Expand ContinuousGridDirectionOptions</summary>

```typescript
type ContinuousGridDirectionOptions = Omit<GridDirectionOptions, "bandPosition"> & {
  /** Continuous position scales do not have categorical band edges. */
  bandPosition?: never;
};
```

</details>

Related types: [`GridDirectionOptions`](#type-griddirectionoptions).

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

### `ContourDensityDefinition` {#type-contourdensitydefinition}

<details markdown="1">
<summary>Expand ContourDensityDefinition</summary>

```typescript
export type ContourDensityDefinition = {
  readonly x: string; readonly y: string; readonly weight?: string;
  readonly grid: ContourGridFrame; readonly normalization: "unit" | "count";
} & ({ readonly estimator: "histogram"; readonly bandwidth?: never; readonly kernel?: never }
  | { readonly estimator: "kde"; readonly bandwidth: readonly [number, number]; readonly kernel: DensityKernel });
```

</details>

Related types: [`ContourGridFrame`](#type-contourgridframe) · [`DensityKernel`](#type-densitykernel).

### `ContourGrid` {#type-contourgrid}

<details markdown="1">
<summary>Expand ContourGrid</summary>

```typescript
export interface ContourGrid extends ContourGridFrame { readonly values: readonly (number | null)[]; }
```

</details>

Related types: [`ContourGridFrame`](#type-contourgridframe).

### `ContourGridFrame` {#type-contourgridframe}

<details markdown="1">
<summary>Expand ContourGridFrame</summary>

```typescript
export interface ContourGridFrame {
  readonly origin: readonly [number, number]; readonly dx: number; readonly dy: number;
  readonly width: number; readonly height: number;
}
```

</details>

### `ContourMarkOptions` {#type-contourmarkoptions}

<details markdown="1">
<summary>Expand ContourMarkOptions</summary>

```typescript
export interface ContourMarkOptions {
  readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
  readonly id?: string; readonly geometry?: string; readonly coordinate?: string; readonly mode?: "line" | "filled";
  readonly x?: QuantitativePositionScaleOptions; readonly y?: QuantitativePositionScaleOptions;
  readonly color?: false | ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
  readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number; readonly clip?: boolean;
}
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions) · [`FillPaint`](#type-fillpaint).

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

### `CreateAdjacentPlotOptions` {#type-createadjacentplotoptions}

<details markdown="1">
<summary>Expand CreateAdjacentPlotOptions</summary>

```typescript
export interface CreateAdjacentPlotOptions {
  /** Collect all legends around the combined view by default. Local retains panel-owned placement. */
  legends?: "local" | "collect";
  id?: string;
  /** Source mark in a unit/facet, or an explicit panel path relative to the receiving concat. */
  source?: string | { childPath: readonly string[]; id: string };
  position?: "left" | "right" | "top" | "bottom";
  plot?: AdjacentPlotSpecification; share?: CompositionShares; gap?: number;
  align?: CompositionAlign | "plot";
}
```

</details>

Related types: [`AdjacentPlotSpecification`](#type-adjacentplotspecification) · [`CompositionShares`](#type-compositionshares) · [`CompositionAlign`](#type-compositionalign).

### `CreateAnnotationOptions` {#type-createannotationoptions}

<details markdown="1">
<summary>Expand CreateAnnotationOptions</summary>

```typescript
export type CreateAnnotationOptions = AnnotationBaseOptions & AnnotationAnchor;

/** Existing Text or attached labels; preserves stored anchor bindings. Full-only. */
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
  missing?: "error" | "break";
  color?: string | { field: string; fieldType?: "nominal" | "ordinal"; scale?: NonPointCategoricalColorScaleOptions; palette?: Palette };
  area?: StrokeStyleDetails & { clip?: boolean; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | (Omit<DensityPlotGuideOptions, "grid"> & { grid?: false | CartesianGridOptions });
} & (({ layout?: Exclude<ColorLayout, "group" | "wiggle"> } & (
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: number }
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Extract<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: never }
  | { valueChannel: "x"; x: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: number }
  | { valueChannel: "x"; x: Extract<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: never }
)) | {
  layout: "wiggle"; valueChannel?: "y";
  x: Exclude<AreaPlotIndependentChannel, { fieldType: "nominal" | "ordinal" }>;
  y: string | { field: string; scale?: NonPointZeroSupportingPositionScaleOptions }
    | ({ scale?: NonPointZeroSupportingPositionScaleOptions } & (
      | { lower: string; upper: { datum: 0 } }
      | { lower: { datum: 0 }; upper: string }
    ));
  baseline?: 0;
});
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`FillPaint`](#type-fillpaint) · [`CurveInterpolation`](#type-curveinterpolation) · [`DensityPlotGuideOptions`](#type-densityplotguideoptions) · [`CartesianGridOptions`](#type-cartesiangridoptions) · [`ColorLayout`](#type-colorlayout) · [`AreaPlotIndependentChannel`](#type-areaplotindependentchannel) · [`AreaPlotMeasureChannel`](#type-areaplotmeasurechannel) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions).

### `CreateAxesOptions` {#type-createaxesoptions}

<details markdown="1">
<summary>Expand CreateAxesOptions</summary>

```typescript
export interface CreateAxesOptions {
  coordinate?: {
    id?: string;
    type?: "auto" | "cartesian" | "polar" | "parallel";
  };
  x?: false | CompleteAxisOptions<XAxisPosition> | readonly [NamedCompleteAxis<XAxisPosition>, ...NamedCompleteAxis<XAxisPosition>[]];
  y?: false | CompleteAxisOptions<YAxisPosition> | readonly [NamedCompleteAxis<YAxisPosition>, ...NamedCompleteAxis<YAxisPosition>[]];
  theta?: false | CompletePolarAxisOptions;
  radius?: false | CompleteRadialAxisOptions;
}
```

</details>

Related types: [`CompleteAxisOptions`](#type-completeaxisoptions) · [`XAxisPosition`](#type-xaxisposition) · [`NamedCompleteAxis`](#type-namedcompleteaxis) · [`YAxisPosition`](#type-yaxisposition) · [`CompletePolarAxisOptions`](#type-completepolaraxisoptions) · [`CompleteRadialAxisOptions`](#type-completeradialaxisoptions).

### `CreateBarPlotOptions` {#type-createbarplotoptions}

<details markdown="1">
<summary>Expand CreateBarPlotOptions</summary>

```typescript
export type CreateBarPlotOptions = {
  /** Forward the native mark missing-value policy. */
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  orientation?: "vertical" | "horizontal";
  color?: BarColorChannel;
  width?: Omit<BarWidthOptions, "target" | "interval">;
  bar?: RectStyleDetails & {
    clip?: boolean;
    fill?: FillPaint;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | ColorGuides;
} & (
  | { x: BarFieldPosition<BandPositionChannel>; y: BarFieldPosition<BarYPositionChannel> }
  | { x: BarRangePositionChannel; y: BarRangeOppositePositionChannel }
  | { x: BarRangeOppositePositionChannel; y: BarRangePositionChannel }
);
```

</details>

Related types: [`BarColorChannel`](#type-barcolorchannel) · [`BarWidthOptions`](#type-barwidthoptions) · [`RectStyleDetails`](#type-rectstyledetails) · [`FillPaint`](#type-fillpaint) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`ColorGuides`](#type-colorguides) · [`BarFieldPosition`](#type-barfieldposition) · [`BandPositionChannel`](#type-bandpositionchannel) · [`BarYPositionChannel`](#type-barypositionchannel) · [`BarRangePositionChannel`](#type-barrangepositionchannel) · [`BarRangeOppositePositionChannel`](#type-barrangeoppositepositionchannel).

### `CreateBeeswarmPlotOptions` {#type-createbeeswarmplotoptions}

<details markdown="1">
<summary>Expand CreateBeeswarmPlotOptions</summary>

```typescript
export type CreateBeeswarmPlotOptions = {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  packing?: false | BeeswarmPackingOptions;
  guides?: false | ColorMappedPointGuideOptions;
} & (
  | { x: RugMeasureChannel; y: StripCategoryChannel }
  | { x: StripCategoryChannel; y: RugMeasureChannel }
);
```

</details>

Related types: [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`BeeswarmPackingOptions`](#type-beeswarmpackingoptions) · [`ColorMappedPointGuideOptions`](#type-colormappedpointguideoptions) · [`RugMeasureChannel`](#type-rugmeasurechannel) · [`StripCategoryChannel`](#type-stripcategorychannel).

### `CreateCalendarLayoutOptions` {#type-createcalendarlayoutoptions}

<details markdown="1">
<summary>Expand CreateCalendarLayoutOptions</summary>

```typescript
export type CreateCalendarLayoutOptions = CalendarDefinition & { readonly id?: string; readonly data?: string };
```

</details>

Related types: [`CalendarDefinition`](#type-calendardefinition).

### `CreateContourDataOptions` {#type-createcontourdataoptions}

<details markdown="1">
<summary>Expand CreateContourDataOptions</summary>

```typescript
export interface CreateContourDataOptions { readonly id: string; readonly grid: ContourGrid; readonly thresholds: readonly number[]; }
```

</details>

Related types: [`ContourGrid`](#type-contourgrid).

### `CreateCoordinateOptions` {#type-createcoordinateoptions}

<details markdown="1">
<summary>Expand CreateCoordinateOptions</summary>

```typescript
export type CreateCoordinateOptions = CreateNativeCoordinateOptions | {
  id?: string; type: "geo"; projection?: string; layers?: readonly string[];
};
```

</details>

Related types: [`CreateNativeCoordinateOptions`](#type-createnativecoordinateoptions).

### `CreateDataOptions` {#type-createdataoptions}

<details markdown="1">
<summary>Expand CreateDataOptions</summary>

```typescript
export type CreateDataOptions<Row extends object> = DataKeyOptions & {
  id?: string;
  values: readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[];
  schema?: SourceSchemaInput;
};
```

</details>

Related types: [`DataKeyOptions`](#type-datakeyoptions) · [`StoredCell`](#type-storedcell) · [`SourceSchemaInput`](#type-sourceschemainput).

### `CreateDataUpdateRequest` {#type-createdataupdaterequest}

<details markdown="1">
<summary>Expand CreateDataUpdateRequest</summary>

```typescript
export type CreateDataUpdateRequest = DataSourceKeys & {
  readonly kind: "create"; readonly id: string; readonly source: DataSource;
};
```

</details>

Related types: [`DataSourceKeys`](#type-datasourcekeys) · [`DataSource`](#type-datasource).

### `CreateDensityContourDataOptions` {#type-createdensitycontourdataoptions}

<details markdown="1">
<summary>Expand CreateDensityContourDataOptions</summary>

```typescript
export type CreateDensityContourDataOptions = ContourDensityDefinition & { readonly id: string; readonly data?: string; readonly thresholds: readonly number[]; };
```

</details>

Related types: [`ContourDensityDefinition`](#type-contourdensitydefinition).

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
  area?: StrokeStyleDetails & { clip?: boolean; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | DensityPlotGuideOptions;
}
```

</details>

Related types: [`DensityKernel`](#type-densitykernel) · [`DensityNormalization`](#type-densitynormalization) · [`StatisticalWeight`](#type-statisticalweight) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`FillPaint`](#type-fillpaint) · [`CurveInterpolation`](#type-curveinterpolation) · [`DensityPlotGuideOptions`](#type-densityplotguideoptions).

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
  connector?: RuleStyleOptions & { clip?: boolean };
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
  line?: StrokeStyleDetails & { clip?: boolean; strokeWidth?: number; stroke?: string; opacity?: number };
  labels?: false | EndpointLabelOptions;
  guides?: false | CartesianPathGuideOptions;
}
```

</details>

Related types: [`ECDFOutputFields`](#type-ecdfoutputfields) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`EndpointLabelOptions`](#type-endpointlabeloptions) · [`CartesianPathGuideOptions`](#type-cartesianpathguideoptions).

### `CreateFlowDataOptions` {#type-createflowdataoptions}

<details markdown="1">
<summary>Expand CreateFlowDataOptions</summary>

```typescript
export interface CreateFlowDataOptions extends FlowDefinition {
  readonly id: string; readonly nodes: string; readonly edges: string;
}
```

</details>

Related types: [`FlowDefinition`](#type-flowdefinition).

### `CreateGeoJoinDataOptions` {#type-creategeojoindataoptions}

<details markdown="1">
<summary>Expand CreateGeoJoinDataOptions</summary>

```typescript
export interface CreateGeoJoinDataOptions extends GeoJoinKeyOptions {
  readonly id: string; readonly geometry?: string; readonly data?: string;
}
```

</details>

Related types: [`GeoJoinKeyOptions`](#type-geojoinkeyoptions).

### `CreateGeoLODDataOptions` {#type-creategeoloddataoptions}

<details markdown="1">
<summary>Expand CreateGeoLODDataOptions</summary>

```typescript
export interface CreateGeoLODDataOptions { readonly id: string; readonly levels: GeoLODLevels; readonly zoom?: number; }
```

</details>

Related types: [`GeoLODLevels`](#type-geolodlevels).

### `CreateGeometryDataOptions` {#type-creategeometrydataoptions}

<details markdown="1">
<summary>Expand CreateGeometryDataOptions</summary>

```typescript
export type CreateGeometryDataOptions = {
  readonly id: string; readonly coordinateKind: "geographic" | "planar";
  /** An own field or exact own-property path, such as "id" or ["properties", "code"]. Omission allocates persisted generated keys. */
  readonly featureKey?: GeometryFeatureKey; readonly limits?: GeometryLimits;
} & ({ readonly format: "geojson"; readonly values: GeoJSONInput; readonly topoObject?: never }
  | { readonly format: "topojson"; readonly values: TopoJSONInput; readonly topoObject?: string });
```

</details>

Related types: [`GeometryFeatureKey`](#type-geometryfeaturekey) · [`GeometryLimits`](#type-geometrylimits) · [`GeoJSONInput`](#type-geojsoninput) · [`TopoJSONInput`](#type-topojsoninput).

### `CreateGraphDataOptions` {#type-creategraphdataoptions}

<details markdown="1">
<summary>Expand CreateGraphDataOptions</summary>

```typescript
export interface CreateGraphDataOptions extends ObservedGraphDefinition {
  readonly id: string; readonly nodes: string; readonly edges: string;
}
```

</details>

Related types: [`ObservedGraphDefinition`](#type-observedgraphdefinition).

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

### `CreateHierarchyDataOptions` {#type-createhierarchydataoptions}

<details markdown="1">
<summary>Expand CreateHierarchyDataOptions</summary>

```typescript
export type CreateHierarchyDataOptions = HierarchySource & { id: string; data?: string; maxNodes?: number };
/** Omitted fields preserve the existing source form; every edit must change at least one option. */
```

</details>

Related types: [`HierarchySource`](#type-hierarchysource).

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
    clip?: boolean;
    fill?: FillPaint;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | (Omit<CartesianCategoricalGuideOptions, "grid"> & {
    /** Bin position and count axes are continuous; neither grid has categorical band edges. */
    grid?: false | ContinuousCartesianGridOptions;
  });
};
```

</details>

Related types: [`BasicHistogramEncoding`](#type-basichistogramencoding) · [`HistogramCategoricalColorChannel`](#type-histogramcategoricalcolorchannel) · [`RectStyleDetails`](#type-rectstyledetails) · [`FillPaint`](#type-fillpaint) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`CartesianCategoricalGuideOptions`](#type-cartesiancategoricalguideoptions) · [`ContinuousCartesianGridOptions`](#type-continuouscartesiangridoptions).

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
  area?: StrokeStyleDetails & { clip?: boolean; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | HorizonPlotGuideOptions;
}
```

</details>

Related types: [`HorizonXEncoding`](#type-horizonxencoding) · [`HorizonYEncoding`](#type-horizonyencoding) · [`HorizonResolution`](#type-horizonresolution) · [`HorizonMissingPolicy`](#type-horizonmissingpolicy) · [`HorizonOverflowPolicy`](#type-horizonoverflowpolicy) · [`HorizonPaletteOptions`](#type-horizonpaletteoptions) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation) · [`HorizonPlotGuideOptions`](#type-horizonplotguideoptions).

### `CreateImageMarkOptions` {#type-createimagemarkoptions}

<details markdown="1">
<summary>Expand CreateImageMarkOptions</summary>

```typescript
export interface CreateImageMarkOptions extends ImageMarkOptions { id?: string; }
```

</details>

Related types: [`ImageMarkOptions`](#type-imagemarkoptions).

### `CreateInferredGraphDataOptions` {#type-createinferredgraphdataoptions}

<details markdown="1">
<summary>Expand CreateInferredGraphDataOptions</summary>

```typescript
export type CreateInferredGraphDataOptions = { readonly id: string; readonly data?: string } & (
  (GraphNeighborDefinition | GraphMetricMstDefinition | GraphStructuralDefinition) & { readonly candidateGraph?: never } |
  GraphCandidateMstDefinition & { readonly candidateGraph: string });
```

</details>

Related types: [`GraphNeighborDefinition`](#type-graphneighbordefinition) · [`GraphMetricMstDefinition`](#type-graphmetricmstdefinition) · [`GraphStructuralDefinition`](#type-graphstructuraldefinition) · [`GraphCandidateMstDefinition`](#type-graphcandidatemstdefinition).

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

### `CreateLayerPlotOptions` {#type-createlayerplotoptions}

<details markdown="1">
<summary>Expand CreateLayerPlotOptions</summary>

```typescript
export interface CreateLayerPlotOptions {
  id?: string;
  source?: string;
  plot: LayerPlotSpecification;
  placement?: "front" | "back";
}
```

</details>

Related types: [`LayerPlotSpecification`](#type-layerplotspecification).

### `CreateLinePlotOptions` {#type-createlineplotoptions}

<details markdown="1">
<summary>Expand CreateLinePlotOptions</summary>

```typescript
export type CreateLinePlotOptions = LinePlotCommonOptions & (
  | { x: LineXPositionChannel; y: Exclude<LineYPositionChannel, { fieldType: "nominal" | "ordinal" }>; guides?: false | LinePlotGuides<"horizontal"> }
  | { x: string | { field: string; fieldType?: "quantitative"; aggregate?: AggregateOperation; scale?: NonPointQuantitativePositionScaleOptions };
      y: Extract<LineYPositionChannel, { fieldType: "nominal" | "ordinal" }>; guides?: false | LinePlotGuides<"vertical"> }
  | { x: { field: string; fieldType?: "quantitative"; aggregate: AggregateOperation; scale?: NonPointQuantitativePositionScaleOptions };
      y: string | (Exclude<AreaPlotIndependentChannel, string> & { aggregate?: never }); guides?: false | LinePlotGuides<"vertical"> }
);
```

</details>

Related types: [`LinePlotCommonOptions`](#type-lineplotcommonoptions) · [`LineXPositionChannel`](#type-linexpositionchannel) · [`LineYPositionChannel`](#type-lineypositionchannel) · [`LinePlotGuides`](#type-lineplotguides) · [`AggregateOperation`](#type-aggregateoperation) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`AreaPlotIndependentChannel`](#type-areaplotindependentchannel).

### `CreateLollipopPlotOptions` {#type-createlollipopplotoptions}

<details markdown="1">
<summary>Expand CreateLollipopPlotOptions</summary>

```typescript
export interface CreateLollipopPlotOptions extends EndpointPlotBaseOptions {
  value: EndpointValueChannel;
  baseline?: number;
  point?: CreateScatterPlotOptions["point"];
  stem?: RuleStyleOptions & { clip?: boolean };
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

### `CreateNativeCoordinateOptions` {#type-createnativecoordinateoptions}

<details markdown="1">
<summary>Expand CreateNativeCoordinateOptions</summary>

```typescript
export interface CreateNativeCoordinateOptions {
  id?: string;
  type?: "cartesian" | "polar" | "parallel";
  layers?: readonly string[];
}
```

</details>

### `CreateOHLCPlotOptions` {#type-createohlcplotoptions}

<details markdown="1">
<summary>Expand CreateOHLCPlotOptions</summary>

```typescript
export interface CreateOHLCPlotOptions {
  readonly id?: string; readonly data?: string; readonly coordinate?: string; readonly x: OHLCX;
  readonly low: string; readonly high: string; readonly open: string; readonly close: string; readonly yScale?: NonPointQuantitativePositionScaleOptions;
  readonly invalid?: "error" | "omit-row"; readonly doji?: "line" | "none"; readonly width?: OHLCWidth;
  readonly body?: OHLCBodyPaint; readonly stem?: OHLCStemPaint; readonly labels?: false | OHLCLabelPaint;
  readonly color?: false | OHLCColor; readonly clip?: boolean; readonly guides?: false | ColorGuides;
}
```

</details>

Related types: [`OHLCX`](#type-ohlcx) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`OHLCWidth`](#type-ohlcwidth) · [`OHLCBodyPaint`](#type-ohlcbodypaint) · [`OHLCStemPaint`](#type-ohlcstempaint) · [`OHLCLabelPaint`](#type-ohlclabelpaint) · [`OHLCColor`](#type-ohlccolor) · [`ColorGuides`](#type-colorguides).

### `CreateOverlayOptions` {#type-createoverlayoptions}

<details markdown="1">
<summary>Expand CreateOverlayOptions</summary>

```typescript
export type CreateOverlayOptions = {
  id?: string;
  source?: string;
  basis?: "visibleItems";
  series?: "source" | "total";
  missing?: "break" | "connect";
  orderBy?: "x" | "y";
} & ({ type?: "line"; line?: OverlayLineAppearance; point?: never } |
  { type: "point"; point?: OverlayPointAppearance; line?: never });
```

</details>

Related types: [`OverlayLineAppearance`](#type-overlaylineappearance) · [`OverlayPointAppearance`](#type-overlaypointappearance).

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
  strokeDash?: NonCartesianStrokeDashChannel;
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

Related types: [`ParallelDimension`](#type-paralleldimension) · [`ParallelMissingPolicy`](#type-parallelmissingpolicy) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`NonCartesianStrokeDashChannel`](#type-noncartesianstrokedashchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ParallelGuideOptions`](#type-parallelguideoptions).

### `CreateParameterOptions` {#type-createparameteroptions}

<details markdown="1">
<summary>Expand CreateParameterOptions</summary>

```typescript
export type CreateParameterOptions = { readonly id: string } & (
  ParameterDefinition<"number", number> | ParameterDefinition<"string", string> | ParameterDefinition<"boolean", boolean>
);
```

</details>

Related types: [`ParameterDefinition`](#type-parameterdefinition).

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
  radius?: PieRadiusChannel;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: number; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | { axes?: false; grid?: false; legend?: false | PieLegendOptions };
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate?: "sum" });
```

</details>

Related types: [`PieCategory`](#type-piecategory) · [`PieColor`](#type-piecolor) · [`PieRadiusChannel`](#type-pieradiuschannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ArcInnerRadius`](#type-arcinnerradius) · [`FillPaint`](#type-fillpaint) · [`PieLegendOptions`](#type-pielegendoptions).

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
  strokeDash?: NonCartesianStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "clip" | "missing" | "closed" | "curve" | "tension"> & {
    curve?: "linear";
    closed?: boolean;
  };
  guides?: false | PolarPathGuideOptions;
}
```

</details>

Related types: [`PolarThetaChannel`](#type-polarthetachannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`NonCartesianStrokeDashChannel`](#type-noncartesianstrokedashchannel) · [`CreateLinePlotOptions`](#type-createlineplotoptions) · [`PolarPathGuideOptions`](#type-polarpathguideoptions).

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
  point?: Omit<NonNullable<CreateScatterPlotOptions["point"]>, "clip">;
  guides?: false | PolarPointGuideOptions;
}
```

</details>

Related types: [`PolarThetaChannel`](#type-polarthetachannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`PolarPointGuideOptions`](#type-polarpointguideoptions).

### `CreateProjectionOptions` {#type-createprojectionoptions}

<details markdown="1">
<summary>Expand CreateProjectionOptions</summary>

```typescript
export type CreateProjectionOptions = { readonly id: string } & ((ProjectionParameters & { readonly fit?: never }) | ProjectionFittedOptions);
```

</details>

Related types: [`ProjectionParameters`](#type-projectionparameters) · [`ProjectionFittedOptions`](#type-projectionfittedoptions).

### `CreatePyramidPlotOptions` {#type-createpyramidplotoptions}

<details markdown="1">
<summary>Expand CreatePyramidPlotOptions</summary>

```typescript
export type CreatePyramidPlotOptions = PyramidLayoutOptions & {
  readonly id?: string; readonly data?: string; readonly coordinate?: string; readonly stage: string; readonly value: string;
  readonly stages?: PyramidStagePaint; readonly labels?: false | PyramidLabelPaint; readonly color?: false | PyramidColor; readonly clip?: boolean;
};
```

</details>

Related types: [`PyramidLayoutOptions`](#type-pyramidlayoutoptions) · [`PyramidStagePaint`](#type-pyramidstagepaint) · [`PyramidLabelPaint`](#type-pyramidlabelpaint) · [`PyramidColor`](#type-pyramidcolor).

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
  strokeDash?: NonCartesianStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "clip" | "missing" | "closed" | "curve" | "tension"> & {
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

Related types: [`RadarCategoryValue`](#type-radarcategoryvalue) · [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`NonCartesianStrokeDashChannel`](#type-noncartesianstrokedashchannel) · [`CreateLinePlotOptions`](#type-createlineplotoptions) · [`RadarGuideOptions`](#type-radarguideoptions) · [`RadarCategoryChannel`](#type-radarcategorychannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`RadarWideOptions`](#type-radarwideoptions).

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
  missing?: "error" | "skip";
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
  color?: false | RaincloudColorChannel;
  guides?: false | CartesianCategoricalPointGuideOptions;
}
```

</details>

Related types: [`RaincloudCategoryChannel`](#type-raincloudcategorychannel) · [`RaincloudValueChannel`](#type-raincloudvaluechannel) · [`RaincloudDensityOptions`](#type-rainclouddensityoptions) · [`RaincloudSummaryOptions`](#type-raincloudsummaryoptions) · [`RaincloudPointsOptions`](#type-raincloudpointsoptions) · [`RaincloudColorChannel`](#type-raincloudcolorchannel) · [`CartesianCategoricalPointGuideOptions`](#type-cartesiancategoricalpointguideoptions).

### `CreateReferenceBandOptions` {#type-createreferencebandoptions}

<details markdown="1">
<summary>Expand CreateReferenceBandOptions</summary>

```typescript
export type CreateReferenceBandOptions =
  | (Omit<RectMarkOptions, "clip" | "data"> &
      ReferenceBinding<readonly [unknown, unknown], readonly [number, number]>)
  | (DynamicReferenceBinding & Omit<RectMarkOptions, "clip" | "id" | "data" | "source"> & {
      readonly statistics: readonly [ReferenceStatistic, ReferenceStatistic];
    });

/** Constant or quantitative stroke width on Line, Rule, or row-owned Rect marks. */
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
export type CreateRosePlotOptions = Omit<CreatePiePlotOptions, "guides" | "arc" | "aggregate" | "value" | "radius"> & {
  radiusScale?: MeasuredRadiusScaleOptions;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: 0; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | MeasuredRadialGuideOptions;
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate?: "sum" });
```

</details>

Related types: [`CreatePiePlotOptions`](#type-createpieplotoptions) · [`MeasuredRadiusScaleOptions`](#type-measuredradiusscaleoptions) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`ArcInnerRadius`](#type-arcinnerradius) · [`FillPaint`](#type-fillpaint) · [`MeasuredRadialGuideOptions`](#type-measuredradialguideoptions).

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
  /** Forward the native mark missing-value policy. */
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  x: PointFacadePositionChannel;
  y: PointFacadePositionChannel;
  color?: BasicColorChannel;
  stroke?: string | WithoutEncodingTarget<Extract<StrokeEncodingOptions, { field: string }>>;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
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

Related types: [`PointFacadePositionChannel`](#type-pointfacadepositionchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`StrokeEncodingOptions`](#type-strokeencodingoptions) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`CartesianGuideOptions`](#type-cartesianguideoptions).

### `CreateStatisticalReferenceOptions` {#type-createstatisticalreferenceoptions}

<details markdown="1">
<summary>Expand CreateStatisticalReferenceOptions</summary>

```typescript
export type CreateStatisticalReferenceOptions = DynamicReferenceBinding & (
  | (RuleStyleOptions & { readonly statistic?: ReferenceStatistic; readonly statistics?: never })
  | (Omit<RectMarkOptions, "id" | "data" | "source" | "missing"> & {
      readonly statistics: readonly [ReferenceStatistic, ReferenceStatistic]; readonly statistic?: never;
    })
);
```

</details>

Related types: [`DynamicReferenceBinding`](#type-dynamicreferencebinding) · [`RuleStyleOptions`](#type-rulestyleoptions) · [`ReferenceStatistic`](#type-referencestatistic) · [`RectMarkOptions`](#type-rectmarkoptions).

### `CreateStripPlotOptions` {#type-createstripplotoptions}

<details markdown="1">
<summary>Expand CreateStripPlotOptions</summary>

```typescript
export type CreateStripPlotOptions = {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | ColorMappedPointGuideOptions;
} & (
  | { x: RugMeasureChannel; y?: never; jitter?: false | StripPixelJitterOptions }
  | { x: RugMeasureChannel; y: StripCategoryChannel; jitter?: false | StripBandJitterOptions }
  | { x: StripCategoryChannel; y: RugMeasureChannel; jitter?: false | StripBandJitterOptions }
);
```

</details>

Related types: [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FilledMarkStroke`](#type-filledmarkstroke) · [`ColorMappedPointGuideOptions`](#type-colormappedpointguideoptions) · [`RugMeasureChannel`](#type-rugmeasurechannel) · [`StripPixelJitterOptions`](#type-strippixeljitteroptions) · [`StripCategoryChannel`](#type-stripcategorychannel) · [`StripBandJitterOptions`](#type-stripbandjitteroptions).

### `CreateTextPlotOptions` {#type-createtextplotoptions}

<details markdown="1">
<summary>Expand CreateTextPlotOptions</summary>

```typescript
export interface CreateTextPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: TextPlotPositionChannel;
  y: TextPlotPositionChannel;
  text: string | WithoutEncodingTarget<Extract<TextEncodingOptions, { field: string } | { value: unknown }>>;
  color?: RectColorChannel;
  style?: Omit<TextMarkOptions, "id" | "data" | "source" | "text" | "inheritColor">;
  guides?: false | ColorGuides;
}
```

</details>

Related types: [`TextPlotPositionChannel`](#type-textplotpositionchannel) · [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`TextEncodingOptions`](#type-textencodingoptions) · [`RectColorChannel`](#type-rectcolorchannel) · [`TextMarkOptions`](#type-textmarkoptions) · [`ColorGuides`](#type-colorguides).

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

### `CreateTrailPlotOptions` {#type-createtrailplotoptions}

<details markdown="1">
<summary>Expand CreateTrailPlotOptions</summary>

```typescript
export type CreateTrailPlotOptions = TrailPlotOptions & (
  | { readonly x: TrailPosition; readonly y: TrailPosition; readonly theta?: never; readonly radius?: never;
      readonly order?: string | { readonly field: string; readonly order?: "ascending" | "descending" } | false;
      readonly curve?: CurveInterpolation; readonly tension?: number; readonly guides?: false | ColorGuides }
  | { readonly theta: PolarThetaChannel; readonly radius: PolarRadiusChannel; readonly x?: never; readonly y?: never;
      readonly order?: never; readonly curve?: "linear"; readonly tension?: never; readonly guides?: false | PolarPathGuideOptions }
);
```

</details>

Related types: [`TrailPlotOptions`](#type-trailplotoptions) · [`TrailPosition`](#type-trailposition) · [`CurveInterpolation`](#type-curveinterpolation) · [`ColorGuides`](#type-colorguides) · [`PolarThetaChannel`](#type-polarthetachannel) · [`PolarRadiusChannel`](#type-polarradiuschannel) · [`PolarPathGuideOptions`](#type-polarpathguideoptions).

### `CreateWaterfallPlotOptions` {#type-createwaterfallplotoptions}

<details markdown="1">
<summary>Expand CreateWaterfallPlotOptions</summary>

```typescript
export interface CreateWaterfallPlotOptions {
  readonly id?: string; readonly data?: string; readonly coordinate?: string; readonly x: WaterfallX;
  readonly role: string; readonly value: string; readonly reset?: string | false; readonly yScale?: NonPointZeroSupportingPositionScaleOptions;
  readonly width?: WaterfallWidth; readonly bars?: WaterfallBarPaint; readonly connectors?: false | WaterfallConnectorPaint; readonly labels?: false | WaterfallLabelPaint;
  readonly color?: false | WaterfallColor; readonly clip?: boolean; readonly guides?: false | ColorGuides;
}
```

</details>

Related types: [`WaterfallX`](#type-waterfallx) · [`NonPointZeroSupportingPositionScaleOptions`](#type-nonpointzerosupportingpositionscaleoptions) · [`WaterfallWidth`](#type-waterfallwidth) · [`WaterfallBarPaint`](#type-waterfallbarpaint) · [`WaterfallConnectorPaint`](#type-waterfallconnectorpaint) · [`WaterfallLabelPaint`](#type-waterfalllabelpaint) · [`WaterfallColor`](#type-waterfallcolor) · [`ColorGuides`](#type-colorguides).

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
  | "monotone-steffen"
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
  unknown?: DashStyle | DashPattern;
}

/** Ordered first-match predicates; otherwise is required. All branches are validated.
 * Each value uses the existing encoder payload without target. Selection predicates
 * reference stored logical selection IDs. Legends require one unique field/scale binding.
 */
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

### `DataKeyOptions` {#type-datakeyoptions}

<details markdown="1">
<summary>Expand DataKeyOptions</summary>

```typescript
export type DataKeyOptions =
  | { keyField?: never; keyFields?: never; keys?: never }
  | { keyField: string; keyFields?: never; keys?: never }
  | { keyField?: never; keyFields: readonly string[]; keys?: never }
  | { keyField?: never; keyFields?: never; keys: readonly RowKey[] };
```

</details>

Related types: [`RowKey`](#type-rowkey).

### `DataParse` {#type-dataparse}

<details markdown="1">
<summary>Expand DataParse</summary>

```typescript
export type DataParse = Readonly<Record<string, DataParseDirective>>;
```

</details>

Related types: [`DataParseDirective`](#type-dataparsedirective).

### `DataParseDirective` {#type-dataparsedirective}

<details markdown="1">
<summary>Expand DataParseDirective</summary>

```typescript
export type DataParseDirective =
  | { readonly type: "string" | "number" | "boolean"; readonly nullable?: boolean; readonly format?: never; readonly timeZone?: never }
  | { readonly type: "date"; readonly nullable?: boolean; readonly timeZone: string;
      readonly format?: "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y" | "iso" };
```

</details>

### `DataSource` {#type-datasource}

<details markdown="1">
<summary>Expand DataSource</summary>

```typescript
export type DataSource = DataSourceParsing & (
  | { readonly kind: "inline"; readonly values: readonly Readonly<Record<string, DataSourceValue>>[];
      readonly text?: never; readonly format?: never; readonly delimiter?: never }
  | (DataSourceFormat & { readonly kind: "inline"; readonly text: string; readonly values?: never })
  | (DataSourceFormat & { readonly kind: "url"; readonly url: string | ComputedExpressionV2 })
  | (DataSourceFormat & { readonly kind: "named"; readonly name: string })
);
```

</details>

Related types: [`DataSourceParsing`](#type-datasourceparsing) · [`DataSourceValue`](#type-datasourcevalue) · [`DataSourceFormat`](#type-datasourceformat) · [`ComputedExpressionV2`](#type-computedexpressionv2).

### `DataSourceFormat` {#type-datasourceformat}

<details markdown="1">
<summary>Expand DataSourceFormat</summary>

```typescript
type DataSourceFormat = { readonly format: "csv"; readonly delimiter?: string }
  | { readonly format: "json"; readonly delimiter?: never };
```

</details>

### `DataSourceKeys` {#type-datasourcekeys}

<details markdown="1">
<summary>Expand DataSourceKeys</summary>

```typescript
type DataSourceKeys =
  | { readonly keyField?: never; readonly keyFields?: never }
  | { readonly keyField: string; readonly keyFields?: never }
  | { readonly keyField?: never; readonly keyFields: readonly string[] };
```

</details>

### `DataSourceParsing` {#type-datasourceparsing}

<details markdown="1">
<summary>Expand DataSourceParsing</summary>

```typescript
type DataSourceParsing = { readonly parse?: DataParse; readonly schema?: SourceSchemaInput };
```

</details>

Related types: [`DataParse`](#type-dataparse) · [`SourceSchemaInput`](#type-sourceschemainput).

### `DataSourceValue` {#type-datasourcevalue}

<details markdown="1">
<summary>Expand DataSourceValue</summary>

```typescript
export type DataSourceValue = null | boolean | number | string
  | readonly DataSourceValue[] | { readonly [key: string]: DataSourceValue };
```

</details>

### `DataUpdateDescriptors` {#type-dataupdatedescriptors}

<details markdown="1">
<summary>Expand DataUpdateDescriptors</summary>

```typescript
interface DataUpdateDescriptors {
  create: { readonly kind: "create"; readonly id: string; readonly sourceKind: DataSource["kind"]; readonly format?: "csv" | "json" };
  revise: { readonly kind: "revise"; readonly target: string; readonly id: string };
  parameter: { readonly kind: "parameter"; readonly target: string };
}
declare const preparedDataUpdate: unique symbol;
/** Opaque preparation evidence. Only prepareDataUpdate can create a valid handle. */
```

</details>

Related types: [`DataSource`](#type-datasource).

### `DataUpdateRequest` {#type-dataupdaterequest}

<details markdown="1">
<summary>Expand DataUpdateRequest</summary>

```typescript
export type DataUpdateRequest = CreateDataUpdateRequest | ReviseDataUpdateRequest | ParameterDataUpdateRequest;
```

</details>

Related types: [`CreateDataUpdateRequest`](#type-createdataupdaterequest) · [`ReviseDataUpdateRequest`](#type-revisedataupdaterequest) · [`ParameterDataUpdateRequest`](#type-parameterdataupdaterequest).

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
  readonly assignment?: "step";
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
  | { readonly values: readonly DatasetScalar[]; readonly sequence?: never; readonly calendar?: never }
  | {
      readonly sequence: { readonly start: number; readonly end: number; readonly step: number };
      readonly values?: never;
      readonly calendar?: never;
    }
  | { readonly calendar: CalendarDayDomain; readonly values?: never; readonly sequence?: never }
  | { readonly values?: never; readonly sequence?: never; readonly calendar?: never }
);
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`CalendarDayDomain`](#type-calendardaydomain).

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
export type DatasetFilterTransform = ({
  type: "filter";
  field: string;
  nulls?: "include" | "exclude";
} & (
  | { oneOf: readonly DatasetScalar[]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly DatasetScalar[]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRange }
)) | ({ type: "filter" } & ExpressionFilterOptions);
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`FilterComparison`](#type-filtercomparison) · [`FilterRange`](#type-filterrange) · [`ExpressionFilterOptions`](#type-expressionfilteroptions).

### `DatasetFlattenTransform` {#type-datasetflattentransform}

<details markdown="1">
<summary>Expand DatasetFlattenTransform</summary>

```typescript
export interface DatasetFlattenTransform {
  readonly type: "flatten";
  readonly fields: readonly string[];
  readonly as: readonly string[];
}
```

</details>

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
  | { readonly method: "mean"; readonly value?: never; readonly sortBy: readonly DatasetWindowSort[]; }
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

Related types: [`DatasetImputedBaseTransform`](#type-datasetimputedbasetransform) · [`DatasetWindowSort`](#type-datasetwindowsort) · [`DatasetScalar`](#type-datasetscalar).

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
      method?: MeanConfidenceIntervalMethod;
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

Related types: [`DatasetIntervalOutputFields`](#type-datasetintervaloutputfields) · [`MeanConfidenceIntervalMethod`](#type-meanconfidenceintervalmethod).

### `DatasetLookupTransform` {#type-datasetlookuptransform}

<details markdown="1">
<summary>Expand DatasetLookupTransform</summary>

```typescript
export interface DatasetLookupTransform {
  readonly type: "lookup";
  readonly field: string;
  readonly lookup: {
    readonly data: string;
    readonly key: string;
    readonly fields: readonly string[];
    readonly as: readonly string[];
  };
}
```

</details>

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

### `DatasetPivotTransform` {#type-datasetpivottransform}

<details markdown="1">
<summary>Expand DatasetPivotTransform</summary>

```typescript
export type DatasetPivotTransform = {
  readonly type: "pivot";
  readonly field: string;
  readonly groupBy: readonly string[];
  readonly columns: readonly PivotColumn[];
  readonly fill: number | null;
} & (
  | { readonly op: PivotNumericOperation; readonly value: string }
  | { readonly op: "count"; readonly value?: never }
);
```

</details>

Related types: [`PivotColumn`](#type-pivotcolumn) · [`PivotNumericOperation`](#type-pivotnumericoperation).

### `DatasetRegressionStatisticsTransform` {#type-datasetregressionstatisticstransform}

<details markdown="1">
<summary>Expand DatasetRegressionStatisticsTransform</summary>

```typescript
export interface DatasetRegressionStatisticsTransform {
  readonly type: "regressionStatistics";
}
```

</details>

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
      method: "exp";
      interval: false;
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
    }
  | {
      method: "loess";
      span: number;
      robustIterations?: number;
      degree?: 2;
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
  readonly missing?: "error" | "null";
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
  | DatasetPivotTransform
  | DatasetBinTransform
  | DatasetBin2DTransform
  | DatasetCompleteTransform
  | DatasetComputedTransform
  | DatasetImputedTransform
  | DatasetNormalizedTransform
  | DatasetFilterTransform
  | DatasetFlattenTransform
  | DatasetLookupTransform
  | DatasetFoldTransform
  | DatasetRegressionTransform
  | DatasetRegressionStatisticsTransform
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

Related types: [`DatasetPivotTransform`](#type-datasetpivottransform) · [`DatasetBinTransform`](#type-datasetbintransform) · [`DatasetBin2DTransform`](#type-datasetbin2dtransform) · [`DatasetCompleteTransform`](#type-datasetcompletetransform) · [`DatasetComputedTransform`](#type-datasetcomputedtransform) · [`DatasetImputedTransform`](#type-datasetimputedtransform) · [`DatasetNormalizedTransform`](#type-datasetnormalizedtransform) · [`DatasetFilterTransform`](#type-datasetfiltertransform) · [`DatasetFlattenTransform`](#type-datasetflattentransform) · [`DatasetLookupTransform`](#type-datasetlookuptransform) · [`DatasetFoldTransform`](#type-datasetfoldtransform) · [`DatasetRegressionTransform`](#type-datasetregressiontransform) · [`DatasetRegressionStatisticsTransform`](#type-datasetregressionstatisticstransform) · [`DatasetSortTransform`](#type-datasetsorttransform) · [`DatasetDensityTransform`](#type-datasetdensitytransform) · [`DatasetECDFTransform`](#type-datasetecdftransform) · [`DatasetHorizonTransform`](#type-datasethorizontransform) · [`DatasetIntervalTransform`](#type-datasetintervaltransform) · [`DatasetSummaryTransform`](#type-datasetsummarytransform) · [`DatasetStackTransform`](#type-datasetstacktransform) · [`DatasetStatisticalReferenceTransform`](#type-datasetstatisticalreferencetransform) · [`DatasetTimeUnitTransform`](#type-datasettimeunittransform) · [`DatasetWindowTransform`](#type-datasetwindowtransform).

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
export type DensityPlotGuideOptions = Omit<CCategoricalGuides, "legend" | "grid"> & {
  grid?: false | ContinuousCartesianGridOptions;
  legend?: false | DensityPlotLegendOptions;
};
```

</details>

Related types: [`CCategoricalGuides`](#type-ccategoricalguides) · [`ContinuousCartesianGridOptions`](#type-continuouscartesiangridoptions) · [`DensityPlotLegendOptions`](#type-densityplotlegendoptions).

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

/** Area quantitative color requires one finite value per existing series;
 * aggregate, temporal color and unknown fallback remain mark-specific restrictions.
 * Area authoring uses the Full facade; createAreaPlot.color stays categorical.
 * Tick quantitative/temporal color paints its stroke and excludes a simultaneous stroke encoding.
 */
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

### `DistributiveLegendOmit` {#type-distributivelegendomit}

<details markdown="1">
<summary>Expand DistributiveLegendOmit</summary>

```typescript
type DistributiveLegendOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
```

</details>

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
  /** Distribution/endpoint measurement axes and quantitative Horizon X use original bound observations, retaining multiplicity. Horizon folded Y is unsupported. */
  readonly population?: "boundData" | "visibleItems";
  readonly field?: string;
  /** Compute a separate reference for each observed value of this field. */
  readonly groupBy?: string;
  readonly x?: never;
  readonly y?: never;
  readonly space?: never;
  readonly data?: never;
  readonly coordinate?: never;
  readonly temporalUnit?: never;
};
/** A statistical line (mean by default) or an exact two-statistic interval. */
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

### `EdgePathRouteOptions` {#type-edgepathrouteoptions}

<details markdown="1">
<summary>Expand EdgePathRouteOptions</summary>

```typescript
export interface EdgePathRouteOptions extends EdgeRouteCommonOptions { readonly exponent?: number; readonly maxStretch?: number; }
```

</details>

Related types: [`EdgeRouteCommonOptions`](#type-edgeroutecommonoptions).

### `EdgeRouteCommonOptions` {#type-edgeroutecommonoptions}

<details markdown="1">
<summary>Expand EdgeRouteCommonOptions</summary>

```typescript
export interface EdgeRouteCommonOptions { readonly zeroLength?: "point"; readonly limits?: EdgeRouteLimits; }
```

</details>

Related types: [`EdgeRouteLimits`](#type-edgeroutelimits).

### `EdgeRouteDefinition` {#type-edgeroutedefinition}

<details markdown="1">
<summary>Expand EdgeRouteDefinition</summary>

```typescript
export type EdgeRouteDefinition =
  { readonly method: "hierarchical"; readonly options: HierarchicalEdgeRouteOptions }
  | { readonly method: "force-directed"; readonly options?: ForceDirectedEdgeRouteOptions }
  | { readonly method: "density"; readonly options?: EdgeRouteCommonOptions }
  | { readonly method: "edge-path"; readonly options?: EdgePathRouteOptions };
```

</details>

Related types: [`HierarchicalEdgeRouteOptions`](#type-hierarchicaledgerouteoptions) · [`ForceDirectedEdgeRouteOptions`](#type-forcedirectededgerouteoptions) · [`EdgeRouteCommonOptions`](#type-edgeroutecommonoptions) · [`EdgePathRouteOptions`](#type-edgepathrouteoptions).

### `EdgeRouteLimits` {#type-edgeroutelimits}

<details markdown="1">
<summary>Expand EdgeRouteLimits</summary>

```typescript
export interface EdgeRouteLimits {
  readonly maxNodes?: number; readonly maxEdges?: number; readonly maxCandidatePairs?: number; readonly maxSamples?: number;
}
```

</details>

### `EdgeRouteMethod` {#type-edgeroutemethod}

<details markdown="1">
<summary>Expand EdgeRouteMethod</summary>

```typescript
export type EdgeRouteMethod = "hierarchical" | "force-directed" | "density" | "edge-path";
```

</details>

### `EditAnnotationOptions` {#type-editannotationoptions}

<details markdown="1">
<summary>Expand EditAnnotationOptions</summary>

```typescript
export type EditAnnotationOptions = Omit<TextMarkOptions, "id" | "data" | "source" | "text" | "missing"> & {
  target?: string;
  text?: unknown;
  /** Without text, reformat the current constant content. */
  format?: TextFormat;
  /** Replace one existing independent Cartesian datum using its current scale and field type. */
  x?: unknown;
  y?: unknown;
  placement?: MarkLabelPlacement | "auto";
  layout?: false | Omit<LabelLayoutOptions, "target">;
} & ((MarkLabelSelectionOptions & { all?: never }) | { all: true; select?: never; selection?: never });
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`TextFormat`](#type-textformat) · [`MarkLabelPlacement`](#type-marklabelplacement) · [`LabelLayoutOptions`](#type-labellayoutoptions) · [`MarkLabelSelectionOptions`](#type-marklabelselectionoptions).

### `EditAxesOptions` {#type-editaxesoptions}

<details markdown="1">
<summary>Expand EditAxesOptions</summary>

```typescript
export interface EditAxesOptions {
  x?: false | EditAxisOptions<XAxisPosition> | readonly [EditAxisOptions<XAxisPosition> & { target: string }, ...(EditAxisOptions<XAxisPosition> & { target: string })[]];
  y?: false | EditAxisOptions<YAxisPosition> | readonly [EditAxisOptions<YAxisPosition> & { target: string }, ...(EditAxisOptions<YAxisPosition> & { target: string })[]];
  theta?: false | EditThetaAxisOptions;
  radius?: false | EditRadialAxisOptions;
  parallel?: false | EditParallelAxisOptions | readonly [EditParallelAxisOptions, ...EditParallelAxisOptions[]];
}
```

</details>

Related types: [`EditAxisOptions`](#type-editaxisoptions) · [`XAxisPosition`](#type-xaxisposition) · [`YAxisPosition`](#type-yaxisposition) · [`EditThetaAxisOptions`](#type-editthetaaxisoptions) · [`EditRadialAxisOptions`](#type-editradialaxisoptions) · [`EditParallelAxisOptions`](#type-editparallelaxisoptions).

### `EditAxisOptions` {#type-editaxisoptions}

<details markdown="1">
<summary>Expand EditAxisOptions</summary>

```typescript
export interface EditAxisOptions<P extends string> {
  visible?: boolean;
  /** Omission preserves placement; false restores the ordinary overlay. */
  underlay?: boolean;
  target?: string;
  /** Omitted edits preserve the frame; zero restores the plot-edge frame. */
  offset?: number;
  position?: P;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  ticks?: false | VisibleGuide<Omit<AxisTickOptions<P>, "scale" | "position" | "target">>;
  labels?: false | VisibleGuide<Omit<AxisLabelOptions<P>, "scale" | "position" | "target">>;
  ticksAndLabels?: false | VisibleTickGroup<Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position" | "target">>;
  title?: false | VisibleGuide<Omit<AxisTitleOptions<P>, "scale" | "position" | "target">>;
}
```

</details>

Related types: [`VisibleGuide`](#type-visibleguide) · [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`AxisTickOptions`](#type-axistickoptions) · [`AxisLabelOptions`](#type-axislabeloptions) · [`VisibleTickGroup`](#type-visibletickgroup) · [`AxisTicksAndLabelsOptions`](#type-axisticksandlabelsoptions) · [`AxisTitleOptions`](#type-axistitleoptions).

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
  assignment?: "edges" | "step";
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
  summary?: BoxPlotSummaryFields | false;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  whisker?: BoxPlotWhisker;
  width?: BoxPlotWidth;
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    width?: { pixels: number } | "auto";
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

Related types: [`BoxPlotSummaryFields`](#type-boxplotsummaryfields) · [`BoxPlotPositionChannel`](#type-boxplotpositionchannel) · [`BoxPlotWhisker`](#type-boxplotwhisker) · [`BoxPlotWidth`](#type-boxplotwidth) · [`RectStyleDetails`](#type-rectstyledetails) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape).

### `EditCalendarPlotOptions` {#type-editcalendarplotoptions}

<details markdown="1">
<summary>Expand EditCalendarPlotOptions</summary>

```typescript
export interface EditCalendarPlotOptions extends Omit<CalendarPlotOptions, "id"> { readonly target?: string; }
```

</details>

Related types: [`CalendarPlotOptions`](#type-calendarplotoptions).

### `EditColorScaleOptions` {#type-editcolorscaleoptions}

<details markdown="1">
<summary>Expand EditColorScaleOptions</summary>

```typescript
export type EditColorScaleOptions = FocusedScaleSelection & WithoutScaleId<
  CategoricalColorScaleOptions | Omit<ContinuousColorScaleOptions, "whitePoint" | "gamma"> | DiscretizedColorScaleOptions
> & { whitePoint?: "d65" | "d50" | "auto"; gamma?: number | "auto" };
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
  /** Concat only. Change guide collection without changing scale sharing. */
  legends?: "local" | "collect";
  columns?: number;
  gap?: FacetGap;
  align?: CompositionAlign | "plot";
  padding?: number | CompositionPadding;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share existing top margin with parent title and headers; requires plot spacing. Stacked restores the default. */
  topLane?: FacetTopLaneMode;
}
```

</details>

Related types: [`FacetGap`](#type-facetgap) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetTopLaneMode`](#type-facettoplanemode).

### `EditCompositionScalesOptions` {#type-editcompositionscalesoptions}

<details markdown="1">
<summary>Expand EditCompositionScalesOptions</summary>

```typescript
export interface EditCompositionScalesOptions { share: CompositionShares; }
```

</details>

Related types: [`CompositionShares`](#type-compositionshares).

### `EditComputedDataOptions` {#type-editcomputeddataoptions}

<details markdown="1">
<summary>Expand EditComputedDataOptions</summary>

```typescript
export type EditComputedDataOptions = FocusedDerivedDataEdit<ComputedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`ComputedDataOptions`](#type-computeddataoptions).

### `EditContourDataOptions` {#type-editcontourdataoptions}

<details markdown="1">
<summary>Expand EditContourDataOptions</summary>

```typescript
export interface EditContourDataOptions {
  readonly target?: string; readonly grid?: ContourGrid; readonly thresholds?: readonly number[];
  readonly data?: string; readonly definition?: Partial<ContourDensityDefinition>;
}
```

</details>

Related types: [`ContourGrid`](#type-contourgrid) · [`ContourDensityDefinition`](#type-contourdensitydefinition).

### `EditContourMarkOptions` {#type-editcontourmarkoptions}

<details markdown="1">
<summary>Expand EditContourMarkOptions</summary>

```typescript
export interface EditContourMarkOptions extends Omit<ContourMarkOptions, "id"> { readonly target?: string; }
```

</details>

Related types: [`ContourMarkOptions`](#type-contourmarkoptions).

### `EditCoordinateOptions` {#type-editcoordinateoptions}

<details markdown="1">
<summary>Expand EditCoordinateOptions</summary>

```typescript
export type EditCoordinateOptions = EditCoordinateTarget & (
  | { aspect: CoordinateAspect; polarFrame?: PolarFrameOptions; projection?: never }
  | { aspect?: CoordinateAspect; polarFrame: PolarFrameOptions; projection?: never }
  | { projection: string; aspect?: never; polarFrame?: never }
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

### `EditEdgeRouteOptions` {#type-editedgerouteoptions}

<details markdown="1">
<summary>Expand EditEdgeRouteOptions</summary>

```typescript
export interface EditEdgeRouteOptions {
  readonly target?: string; readonly graph?: string; readonly layout?: string; readonly method?: EdgeRouteMethod;
  readonly coordinateSpace?: "world" | "screen";
  readonly options?: Partial<HierarchicalEdgeRouteOptions> | ForceDirectedEdgeRouteOptions | EdgeRouteCommonOptions | EdgePathRouteOptions;
}
declare const preparedGraphEdgeRoutes: unique symbol;
/** Opaque, exact-receiver preparation. Obtain it from ggaction/graph. */
```

</details>

Related types: [`EdgeRouteMethod`](#type-edgeroutemethod) · [`HierarchicalEdgeRouteOptions`](#type-hierarchicaledgerouteoptions) · [`ForceDirectedEdgeRouteOptions`](#type-forcedirectededgerouteoptions) · [`EdgeRouteCommonOptions`](#type-edgeroutecommonoptions) · [`EdgePathRouteOptions`](#type-edgepathrouteoptions).

### `EditEndpointPlotOptions` {#type-editendpointplotoptions}

<details markdown="1">
<summary>Expand EditEndpointPlotOptions</summary>

```typescript
export type EditEndpointPlotOptions = { target?: string } & Partial<Pick<
  CreateDumbbellPlotOptions,
  "data" | "coordinate" | "category" | "start" | "end" | "orientation" | "summary" | "missing"
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
  fill?: FillPaint | false;
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

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBandPositionChannel`](#type-errorbandpositionchannel) · [`ErrorBandIntervalChannel`](#type-errorbandintervalchannel) · [`FillPaint`](#type-fillpaint) · [`CurveInterpolation`](#type-curveinterpolation) · [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

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
  /** Content follows concrete mark bounds with plot spacing; plot preserves existing placement. */
  anchor?: "plot" | "content" | "view";
  role?: FacetHeaderRole;
  labelMap?: DisplayLabelMap | "auto";
  side?: FacetHeaderSide;
  align?: FacetHeaderAlign;
  /** Numbers are radians; zero restores the existing unrotated header layout. */
  rotation?: RotationInput;
  /** Requires an explicit row or column role. False removes that role's field title. */
  title?: FacetHeaderTitleOptions | false;
}
```

</details>

Related types: [`FacetHeaderRole`](#type-facetheaderrole) · [`DisplayLabelMap`](#type-displaylabelmap) · [`FacetHeaderSide`](#type-facetheaderside) · [`FacetHeaderAlign`](#type-facetheaderalign) · [`RotationInput`](#type-rotationinput) · [`FacetHeaderTitleOptions`](#type-facetheadertitleoptions).

### `EditFacetSourceOptions` {#type-editfacetsourceoptions}

<details markdown="1">
<summary>Expand EditFacetSourceOptions</summary>

```typescript
export type EditFacetSourceOptions =
  | { program: ChartProgram; action?: never }
  | { program?: never; action: { method: string; options?: Readonly<Record<string, unknown>> } };
```

</details>

### `EditFilteredDataOptions` {#type-editfiltereddataoptions}

<details markdown="1">
<summary>Expand EditFilteredDataOptions</summary>

```typescript
export type EditFilteredDataOptions = (FilterModePatch & {
  where?: never;
  target: string;
  field?: string;
  nulls?: "include" | "exclude" | false;
  dependents?: DerivedDataDependents;
}) | (ExpressionFilterOptions & { target: string; dependents?: DerivedDataDependents });
```

</details>

Related types: [`FilterModePatch`](#type-filtermodepatch) · [`DerivedDataDependents`](#type-deriveddatadependents) · [`ExpressionFilterOptions`](#type-expressionfilteroptions).

### `EditFlattenDataOptions` {#type-editflattendataoptions}

<details markdown="1">
<summary>Expand EditFlattenDataOptions</summary>

```typescript
export type EditFlattenDataOptions = FocusedDerivedDataEdit<FlattenDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`FlattenDataOptions`](#type-flattendataoptions).

### `EditFlowDataOptions` {#type-editflowdataoptions}

<details markdown="1">
<summary>Expand EditFlowDataOptions</summary>

```typescript
export interface EditFlowDataOptions {
  readonly target?: string; readonly nodes?: string; readonly edges?: string;
  readonly definition?: Partial<FlowDefinition>;
}
```

</details>

Related types: [`FlowDefinition`](#type-flowdefinition).

### `EditFlowLinksOptions` {#type-editflowlinksoptions}

<details markdown="1">
<summary>Expand EditFlowLinksOptions</summary>

```typescript
export interface EditFlowLinksOptions extends Omit<FlowLinksOptions, "id"> { readonly target?: string; }
/** Grid coordinates are sample centers. Values are row-major; null excludes adjoining cells. */
```

</details>

Related types: [`FlowLinksOptions`](#type-flowlinksoptions).

### `EditFlowNodesOptions` {#type-editflownodesoptions}

<details markdown="1">
<summary>Expand EditFlowNodesOptions</summary>

```typescript
export interface EditFlowNodesOptions extends Omit<FlowNodesOptions, "id"> { readonly target?: string; }
```

</details>

Related types: [`FlowNodesOptions`](#type-flownodesoptions).

### `EditFoldDataOptions` {#type-editfolddataoptions}

<details markdown="1">
<summary>Expand EditFoldDataOptions</summary>

```typescript
export type EditFoldDataOptions = FocusedDerivedDataEdit<FoldDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`FoldDataOptions`](#type-folddataoptions).

### `EditGeoAnnotationOptions` {#type-editgeoannotationoptions}

<details markdown="1">
<summary>Expand EditGeoAnnotationOptions</summary>

```typescript
export type EditGeoAnnotationOptions = Partial<Omit<GeoAnnotationOptions, "id">> & { readonly target?: string };
```

</details>

Related types: [`GeoAnnotationOptions`](#type-geoannotationoptions).

### `EditGeoJoinDataOptions` {#type-editgeojoindataoptions}

<details markdown="1">
<summary>Expand EditGeoJoinDataOptions</summary>

```typescript
export interface EditGeoJoinDataOptions extends Partial<GeoJoinKeyOptions> {
  readonly target?: string; readonly geometry?: string; readonly data?: string;
}
```

</details>

Related types: [`GeoJoinKeyOptions`](#type-geojoinkeyoptions).

### `EditGeoLODDataOptions` {#type-editgeoloddataoptions}

<details markdown="1">
<summary>Expand EditGeoLODDataOptions</summary>

```typescript
export interface EditGeoLODDataOptions { readonly target?: string; readonly levels?: GeoLODLevels; readonly zoom?: number; }
```

</details>

Related types: [`GeoLODLevels`](#type-geolodlevels).

### `EditGeoLineMarkOptions` {#type-editgeolinemarkoptions}

<details markdown="1">
<summary>Expand EditGeoLineMarkOptions</summary>

```typescript
export type EditGeoLineMarkOptions = Omit<GeoLineMarkOptions, "id"> & { readonly target?: string };
```

</details>

Related types: [`GeoLineMarkOptions`](#type-geolinemarkoptions).

### `EditGeoPointMarkOptions` {#type-editgeopointmarkoptions}

<details markdown="1">
<summary>Expand EditGeoPointMarkOptions</summary>

```typescript
export type EditGeoPointMarkOptions = GeoEditOptions<GeoPointMarkOptions>;
```

</details>

Related types: [`GeoEditOptions`](#type-geoeditoptions) · [`GeoPointMarkOptions`](#type-geopointmarkoptions).

### `EditGeoShapeMarkOptions` {#type-editgeoshapemarkoptions}

<details markdown="1">
<summary>Expand EditGeoShapeMarkOptions</summary>

```typescript
export type EditGeoShapeMarkOptions = Omit<GeoShapeMarkOptions, "id"> & { readonly target?: string };
```

</details>

Related types: [`GeoShapeMarkOptions`](#type-geoshapemarkoptions).

### `EditGeometryDataOptions` {#type-editgeometrydataoptions}

<details markdown="1">
<summary>Expand EditGeometryDataOptions</summary>

```typescript
export interface EditGeometryDataOptions {
  readonly target?: string; readonly values?: GeoJSONInput | TopoJSONInput;
  readonly coordinateKind?: "geographic" | "planar"; readonly topoObject?: string; readonly limits?: GeometryLimits;
}
```

</details>

Related types: [`GeoJSONInput`](#type-geojsoninput) · [`TopoJSONInput`](#type-topojsoninput) · [`GeometryLimits`](#type-geometrylimits).

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

### `EditGraphDataOptions` {#type-editgraphdataoptions}

<details markdown="1">
<summary>Expand EditGraphDataOptions</summary>

```typescript
export interface EditGraphDataOptions {
  readonly target?: string; readonly nodes?: string; readonly edges?: string;
  readonly definition?: Partial<ObservedGraphDefinition>;
}
```

</details>

Related types: [`ObservedGraphDefinition`](#type-observedgraphdefinition).

### `EditGraphPlotOptions` {#type-editgraphplotoptions}

<details markdown="1">
<summary>Expand EditGraphPlotOptions</summary>

```typescript
export interface EditGraphPlotOptions extends Omit<GraphPlotOptions, "id"> { target?: string; }
```

</details>

Related types: [`GraphPlotOptions`](#type-graphplotoptions).

### `EditGraphicsOptions` {#type-editgraphicsoptions}

<details markdown="1">
<summary>Expand EditGraphicsOptions</summary>

```typescript
export type EditGraphicsOptions =
  | { target: string; property: string; value: unknown; remove?: false }
  | { target: string | readonly string[]; remove: true; property?: never; value?: never };
```

</details>

### `EditGraticuleOptions` {#type-editgraticuleoptions}

<details markdown="1">
<summary>Expand EditGraticuleOptions</summary>

```typescript
export type EditGraticuleOptions = Omit<GraticuleOptions, "id"> & { readonly target?: string };
```

</details>

Related types: [`GraticuleOptions`](#type-graticuleoptions).

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
  visible?: boolean;
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Absolute signed logical-pixel displacement; omission preserves the current value. */
  alongOffset?: number;
  /** Preserve omitted order; finite values sort Cartesian grids relative to marks at zero. */
  zIndex?: number;
  /** Band centers by default; boundary draws both edges of each selected band. */
  bandPosition?: "center" | "boundary";
  count?: number;
  values?: readonly CategoryValue[] | "auto";
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

Related types: [`CartesianGuideDashMap`](#type-cartesianguidedashmap) · [`CategoryValue`](#type-categoryvalue).

### `EditHierarchyDataOptions` {#type-edithierarchydataoptions}

<details markdown="1">
<summary>Expand EditHierarchyDataOptions</summary>

```typescript
export type EditHierarchyDataOptions = Partial<HierarchySource> & { target?: string; data?: string; maxNodes?: number };
```

</details>

Related types: [`HierarchySource`](#type-hierarchysource).

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

### `EditImageMarkOptions` {#type-editimagemarkoptions}

<details markdown="1">
<summary>Expand EditImageMarkOptions</summary>

```typescript
export interface EditImageMarkOptions extends ImageMarkOptions { target?: string; }
```

</details>

Related types: [`ImageMarkOptions`](#type-imagemarkoptions).

### `EditImputedDataOptions` {#type-editimputeddataoptions}

<details markdown="1">
<summary>Expand EditImputedDataOptions</summary>

```typescript
export type EditImputedDataOptions = FocusedDerivedDataEdit<ImputedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`ImputedDataOptions`](#type-imputeddataoptions).

### `EditInferredGraphDataOptions` {#type-editinferredgraphdataoptions}

<details markdown="1">
<summary>Expand EditInferredGraphDataOptions</summary>

```typescript
export interface EditInferredGraphDataOptions {
  readonly target?: string; readonly data?: string; readonly candidateGraph?: string | null;
  readonly definition?: Partial<InferredGraphDefinition>;
}
```

</details>

Related types: [`InferredGraphDefinition`](#type-inferredgraphdefinition).

### `EditIntervalDataOptions` {#type-editintervaldataoptions}

<details markdown="1">
<summary>Expand EditIntervalDataOptions</summary>

```typescript
export type EditIntervalDataOptions = FocusedDerivedDataEdit<IntervalDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`IntervalDataOptions`](#type-intervaldataoptions).

### `EditLayoutOptions` {#type-editlayoutoptions}

<details markdown="1">
<summary>Expand EditLayoutOptions</summary>

```typescript
export type EditLayoutOptions = { target?: string } & (
  { node?: never; order?: HierarchyOrder; options?: Partial<HierarchyTreeOptions> | Partial<HierarchyTreemapOptions> | { maxNodes?: number } }
  | { node?: never; order?: never; options: Partial<GraphFixedOptions> | GraphCircularOptions | GraphForceOptions | FlowLayoutOptions | CalendarLayoutPatch }
  | { node: GraphPosition; order?: never; options?: never });
```

</details>

Related types: [`HierarchyOrder`](#type-hierarchyorder) · [`HierarchyTreeOptions`](#type-hierarchytreeoptions) · [`HierarchyTreemapOptions`](#type-hierarchytreemapoptions) · [`GraphFixedOptions`](#type-graphfixedoptions) · [`GraphCircularOptions`](#type-graphcircularoptions) · [`GraphForceOptions`](#type-graphforceoptions) · [`FlowLayoutOptions`](#type-flowlayoutoptions) · [`CalendarLayoutPatch`](#type-calendarlayoutpatch) · [`GraphPosition`](#type-graphposition).

### `EditLegendBlockOptions` {#type-editlegendblockoptions}

<details markdown="1">
<summary>Expand EditLegendBlockOptions</summary>

```typescript
export interface EditLegendBlockOptions {
  /** Reset only the sample window with auto. */
  clipHeight?: number | "auto";
  target: string;
  channel: LegendChannel;
  /** Block-local anchor; inherit removes only this override. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly CategoryValue[];
  gap?: number;
  text?: LegendBlockTextPatch;
  symbol?: LegendBlockSymbolPatch;
  /** Display-only: categorical keys, or finite numeric keys for continuous size samples. Empty labels omit text only. */
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
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  border: boolean | LegendBorderOptions;
}

/** Omitted/false axes are preserved; component false values remove existing components. */
```

</details>

Related types: [`LegendChannel`](#type-legendchannel) · [`LegendBorderOptions`](#type-legendborderoptions).

### `EditLegendLabelsOptions` {#type-editlegendlabelsoptions}

<details markdown="1">
<summary>Expand EditLegendLabelsOptions</summary>

```typescript
export interface EditLegendLabelsOptions extends LegendTextOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
}
```

</details>

Related types: [`LegendTextOptions`](#type-legendtextoptions) · [`LegendChannel`](#type-legendchannel).

### `EditLegendLayoutOptions` {#type-editlegendlayoutoptions}

<details markdown="1">
<summary>Expand EditLegendLayoutOptions</summary>

```typescript
export interface EditLegendLayoutOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  layout?: "edge" | "legacy-bottom";
  /** Outside right/left: complete legend stack top aligns with the plot top, including borders and excluding chart titles. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  /** Opt into whole-target legend group layout; a requested row never wraps. */
  blockLayout?: "row" | "column" | "wrap";
  /** Move the complete occupied group top-left to plot-relative logical pixels. A later position clears this anchor. */
  at?: { x: number; y: number };
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Gradient orientation is independent of position; auto is gradient-only. Categorical sides require vertical. */
  direction?: "horizontal" | "vertical" | "auto";
  /** Categorical legends accept a positive column count on every supported position. */
  columns?: number;
  /** Signed logical pixels along the edge: right for top/bottom and in-plot corners, down for left/right. */
  alongOffset?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  /** bottom is gradient-only; left retains the existing categorical/opacity rules. */
  titlePosition?: "top" | "left" | "bottom";
  /** Explicit spacing override; vertical creation defaults to 18 logical pixels. */
  itemGap?: number;
  /** Non-negative occupied-row gap; auto restores the retained legacy pitch. */
  rowPadding?: number | "auto";
  /** Non-negative visible-title/body gap; auto restores the family default. */
  titlePadding?: number | "auto";
}
```

</details>

Related types: [`LegendChannel`](#type-legendchannel).

### `EditLegendOptions` {#type-editlegendoptions}

<details markdown="1">
<summary>Expand EditLegendOptions</summary>

```typescript
export interface EditLegendOptions
  extends Omit<LegendOptions, "channels" | "labels" | "title" | "values" | "titleStyle" | "direction" | "position" | "clipHeight" | "rowPadding" | "titlePadding"> {
  visible?: boolean;
  /** Body offset in pixels; auto resets. */
  itemsOffset?: { x?: number; y?: number } | "auto";
  labels?: LegendLabelEditStyle;
  clipHeight?: number | "auto";
  /** auto removes the row policy and restores the retained itemGap behavior. */
  rowPadding?: number | "auto";
  /** auto removes the title/body spacing override. */
  titlePadding?: number | "auto";
  /** Select a block or all. all excludes channels/combine/representation. */
  channel?: LegendChannel | "all";
  /** inherit is allowed only with a singular channel selector. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  /** Gradient-only auto resets orientation. */
  direction?: "horizontal" | "vertical" | "auto";
  titleStyle?: LegendTitleEditStyle;
  /** Exact final content set for the whole target; omission preserves content. */
  channels?: LegendOptions["channels"];
  title?: string | "auto" | false;
  /** Replace exact samples, or reset them to the remembered automatic count. */
  values?: readonly number[] | "auto";
}
```

</details>

Related types: [`LegendOptions`](#type-legendoptions) · [`LegendLabelEditStyle`](#type-legendlabeleditstyle) · [`LegendChannel`](#type-legendchannel) · [`LegendTitleEditStyle`](#type-legendtitleeditstyle).

### `EditLegendSymbolsOptions` {#type-editlegendsymbolsoptions}

<details markdown="1">
<summary>Expand EditLegendSymbolsOptions</summary>

```typescript
export interface EditLegendSymbolsOptions {
  clipHeight?: number | "auto";
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  symbol?: LegendSymbolRecipe;
  count?: number;
  gradient?: { length?: number; thickness?: number; opacity?: number };
}
```

</details>

Related types: [`LegendChannel`](#type-legendchannel) · [`LegendSymbolRecipe`](#type-legendsymbolrecipe).

### `EditLegendTitleOptions` {#type-editlegendtitleoptions}

<details markdown="1">
<summary>Expand EditLegendTitleOptions</summary>

```typescript
export interface EditLegendTitleOptions extends LegendTitleStyleEditOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  title?: string | "auto" | false;
}
```

</details>

Related types: [`LegendTitleStyleEditOptions`](#type-legendtitlestyleeditoptions) · [`LegendChannel`](#type-legendchannel).

### `EditLookupDataOptions` {#type-editlookupdataoptions}

<details markdown="1">
<summary>Expand EditLookupDataOptions</summary>

```typescript
export type EditLookupDataOptions = FocusedDerivedDataEdit<LookupDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`LookupDataOptions`](#type-lookupdataoptions).

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
  mode?: "replace" | "add" | "toggle" | "subtract" | "intersect";
} & MarkSelectionSelector;
```

</details>

Related types: [`MarkSelectionSelector`](#type-markselectionselector).

### `EditNormalizedDataOptions` {#type-editnormalizeddataoptions}

<details markdown="1">
<summary>Expand EditNormalizedDataOptions</summary>

```typescript
export type EditNormalizedDataOptions = FocusedDerivedDataEdit<NormalizedDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`NormalizedDataOptions`](#type-normalizeddataoptions).

### `EditOHLCPlotOptions` {#type-editohlcplotoptions}

<details markdown="1">
<summary>Expand EditOHLCPlotOptions</summary>

```typescript
export type EditOHLCPlotOptions = { readonly target?: string } & Partial<Omit<CreateOHLCPlotOptions, "id">>;
```

</details>

Related types: [`CreateOHLCPlotOptions`](#type-createohlcplotoptions).

### `EditOpacityScaleOptions` {#type-editopacityscaleoptions}

<details markdown="1">
<summary>Expand EditOpacityScaleOptions</summary>

```typescript
export type EditOpacityScaleOptions = FocusedScaleSelection & WithoutScaleId<OpacityScaleOptions>;
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`OpacityScaleOptions`](#type-opacityscaleoptions).

### `EditOverlayOptions` {#type-editoverlayoptions}

<details markdown="1">
<summary>Expand EditOverlayOptions</summary>

```typescript
export type EditOverlayOptions = { target?: string } & ({ follow: false; source?: never;
  series?: never; missing?: never; orderBy?: never } | { follow?: true; source?: string;
  series?: "source" | "total"; missing?: "break" | "connect"; orderBy?: "x" | "y" });
```

</details>

### `EditParallelAxisOptions` {#type-editparallelaxisoptions}

<details markdown="1">
<summary>Expand EditParallelAxisOptions</summary>

```typescript
export type EditParallelAxisOptions = GuideVisibilityOptions & { field: string; target?: string;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  title?: false | VisibleGuide<ParallelAxisTitleOptions>;
} & (
  | { ticksAndLabels?: false | (ParallelAxisTickSelection & {
      ticks?: VisibleGuide<AxisTickStyleOptions>; labels?: VisibleGuide<AxisLabelStyleOptions & DisplayLabelOptions>;
    }); ticks?: never; labels?: never }
  | { ticks?: false | VisibleGuide<ParallelAxisTicksOptions>; labels?: false | VisibleGuide<ParallelAxisLabelsOptions>; ticksAndLabels?: never }
);
```

</details>

Related types: [`GuideVisibilityOptions`](#type-guidevisibilityoptions) · [`VisibleGuide`](#type-visibleguide) · [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`ParallelAxisTitleOptions`](#type-parallelaxistitleoptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions) · [`ParallelAxisTicksOptions`](#type-parallelaxisticksoptions) · [`ParallelAxisLabelsOptions`](#type-parallelaxislabelsoptions).

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

### `EditParameterOptions` {#type-editparameteroptions}

<details markdown="1">
<summary>Expand EditParameterOptions</summary>

```typescript
export interface EditParameterOptions { readonly target: string; readonly value: ParameterValue; }
```

</details>

Related types: [`ParameterValue`](#type-parametervalue).

### `EditPartitionPlotOptions` {#type-editpartitionplotoptions}

<details markdown="1">
<summary>Expand EditPartitionPlotOptions</summary>

```typescript
export interface EditPartitionPlotOptions extends Omit<PartitionPlotOptions, "id"> { target?: string; }
```

</details>

Related types: [`PartitionPlotOptions`](#type-partitionplotoptions).

### `EditPivotDataOptions` {#type-editpivotdataoptions}

<details markdown="1">
<summary>Expand EditPivotDataOptions</summary>

```typescript
export type EditPivotDataOptions = FocusedDerivedDataEdit<PivotDataOptions>;
```

</details>

Related types: [`FocusedDerivedDataEdit`](#type-focusedderiveddataedit) · [`PivotDataOptions`](#type-pivotdataoptions).

### `EditPolarAxisOptions` {#type-editpolaraxisoptions}

<details markdown="1">
<summary>Expand EditPolarAxisOptions</summary>

```typescript
export interface EditPolarAxisOptions {
  visible?: boolean;
  angle?: number;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  ticks?: false | VisibleGuide<PolarTickOptions>;
  labels?: false | VisibleGuide<PolarLabelOptions>;
  ticksAndLabels?: false | VisibleTickGroup<PolarTicksAndLabelsOptions>;
  title?: false | VisibleGuide<PolarTitleOptions>;
}
```

</details>

Related types: [`VisibleGuide`](#type-visibleguide) · [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`PolarTickOptions`](#type-polartickoptions) · [`PolarLabelOptions`](#type-polarlabeloptions) · [`VisibleTickGroup`](#type-visibletickgroup) · [`PolarTicksAndLabelsOptions`](#type-polarticksandlabelsoptions) · [`PolarTitleOptions`](#type-polartitleoptions).

### `EditPolarGridOptions` {#type-editpolargridoptions}

<details markdown="1">
<summary>Expand EditPolarGridOptions</summary>

```typescript
export interface EditPolarGridOptions {
  visible?: boolean;
  count?: number;
  values?: readonly AxisValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

Related types: [`AxisValue`](#type-axisvalue).

### `EditProjectionOptions` {#type-editprojectionoptions}

<details markdown="1">
<summary>Expand EditProjectionOptions</summary>

```typescript
export type EditProjectionOptions = { readonly target?: string } & ((Partial<ProjectionParameters> & { readonly fit?: never })
  | ProjectionEditFittedOptions);
```

</details>

Related types: [`ProjectionParameters`](#type-projectionparameters) · [`ProjectionEditFittedOptions`](#type-projectioneditfittedoptions).

### `EditPyramidPlotOptions` {#type-editpyramidplotoptions}

<details markdown="1">
<summary>Expand EditPyramidPlotOptions</summary>

```typescript
export type EditPyramidPlotOptions = { readonly target?: string } & Partial<Omit<CreatePyramidPlotOptions, "id" | "encoding" | "lastStage" | "taperRatio">> &
  { readonly encoding?: "width" | "area"; readonly lastStage?: "flat" | "point"; readonly taperRatio?: number; };
```

</details>

Related types: [`CreatePyramidPlotOptions`](#type-createpyramidplotoptions).

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

### `EditRadarPlotOptions` {#type-editradarplotoptions}

<details markdown="1">
<summary>Expand EditRadarPlotOptions</summary>

```typescript
export interface EditRadarPlotOptions {
  target?: string;
  wide: { fields: readonly [string, string, ...string[]]; summary?: false | "mean" | "median"; normalize?: false | "minmax" };
}
```

</details>

### `EditRadialAxisOptions` {#type-editradialaxisoptions}

<details markdown="1">
<summary>Expand EditRadialAxisOptions</summary>

```typescript
export interface EditRadialAxisOptions
  extends Omit<EditPolarAxisOptions, "title"> {
  title?: false | VisibleGuide<RadialTitleOptions>;
}
```

</details>

Related types: [`EditPolarAxisOptions`](#type-editpolaraxisoptions) · [`VisibleGuide`](#type-visibleguide) · [`RadialTitleOptions`](#type-radialtitleoptions).

### `EditRaincloudPlotOptions` {#type-editraincloudplotoptions}

<details markdown="1">
<summary>Expand EditRaincloudPlotOptions</summary>

```typescript
export interface EditRaincloudPlotOptions {
  missing?: "error" | "skip";
  target?: string;
  data?: string;
  category?: RaincloudCategoryChannel;
  value?: RaincloudValueChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | RaincloudDensityOptions;
  summary?: false | RaincloudSummaryOptions;
  points?: false | RaincloudPointsOptions;
  color?: false | RaincloudColorChannel;
}
```

</details>

Related types: [`RaincloudCategoryChannel`](#type-raincloudcategorychannel) · [`RaincloudValueChannel`](#type-raincloudvaluechannel) · [`RaincloudDensityOptions`](#type-rainclouddensityoptions) · [`RaincloudSummaryOptions`](#type-raincloudsummaryoptions) · [`RaincloudPointsOptions`](#type-raincloudpointsoptions) · [`RaincloudColorChannel`](#type-raincloudcolorchannel).

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
  placement?: "source" | "plot-last";
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

### `EditRegressionStatisticsDataOptions` {#type-editregressionstatisticsdataoptions}

<details markdown="1">
<summary>Expand EditRegressionStatisticsDataOptions</summary>

```typescript
export interface EditRegressionStatisticsDataOptions {
  target?: string;
  source?: string;
}
```

</details>

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
  nice?: boolean | LinearNiceCountOptions;
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
  whitePoint?: "d65" | "d50" | "auto";
  /** Finite Cubehelix lightness gamma; auto restores 1. */
  gamma?: number | "auto";
  midpoint?: number | "auto";
  unknown?: unknown;
}
```

</details>

Related types: [`RadialMapping`](#type-radialmapping) · [`ScaleType`](#type-scaletype) · [`ScaleRange`](#type-scalerange) · [`LinearNiceCountOptions`](#type-linearnicecountoptions) · [`Palette`](#type-palette) · [`ContinuousColorInterpolation`](#type-continuouscolorinterpolation).

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
export type EditStrokeDashScaleOptions = FocusedScaleSelection &
  Omit<WithoutScaleId<DashScaleOptions>, "unknown"> & { unknown?: DashStyle | DashPattern | undefined };
```

</details>

Related types: [`FocusedScaleSelection`](#type-focusedscaleselection) · [`WithoutScaleId`](#type-withoutscaleid) · [`DashScaleOptions`](#type-dashscaleoptions) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

### `EditStrokeScaleOptions` {#type-editstrokescaleoptions}

<details markdown="1">
<summary>Expand EditStrokeScaleOptions</summary>

```typescript
export type EditStrokeScaleOptions = { target: string } & WithoutScaleSelection<EditColorScaleOptions>;
```

</details>

Related types: [`WithoutScaleSelection`](#type-withoutscaleselection) · [`EditColorScaleOptions`](#type-editcolorscaleoptions).

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
  /** Display-only semantic item overrides; auto restores encoded content. */
  textOverrides?: readonly TextOverride[] | "auto";
}
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`TextOverride`](#type-textoverride).

### `EditThetaAxisOptions` {#type-editthetaaxisoptions}

<details markdown="1">
<summary>Expand EditThetaAxisOptions</summary>

```typescript
export interface EditThetaAxisOptions
  extends Omit<EditPolarAxisOptions, "angle" | "labels" | "ticksAndLabels"> {
  labels?: false | VisibleGuide<ThetaAxisLabelOptions>;
  ticksAndLabels?: false | VisibleTickGroup<ThetaTicksAndLabelsOptions>;
}
```

</details>

Related types: [`EditPolarAxisOptions`](#type-editpolaraxisoptions) · [`VisibleGuide`](#type-visibleguide) · [`ThetaAxisLabelOptions`](#type-thetaaxislabeloptions) · [`VisibleTickGroup`](#type-visibletickgroup) · [`ThetaTicksAndLabelsOptions`](#type-thetaticksandlabelsoptions).

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

### `EditTrailPlotOptions` {#type-edittrailplotoptions}

<details markdown="1">
<summary>Expand EditTrailPlotOptions</summary>

```typescript
export type EditTrailPlotOptions = { readonly target?: string } & TrailPatch<CreateTrailPlotOptions>;
```

</details>

Related types: [`TrailPatch`](#type-trailpatch) · [`CreateTrailPlotOptions`](#type-createtrailplotoptions).

### `EditTreePlotOptions` {#type-edittreeplotoptions}

<details markdown="1">
<summary>Expand EditTreePlotOptions</summary>

```typescript
export interface EditTreePlotOptions extends Omit<TreePlotOptions, "id"> { target?: string; }
```

</details>

Related types: [`TreePlotOptions`](#type-treeplotoptions).

### `EditTreemapPlotOptions` {#type-edittreemapplotoptions}

<details markdown="1">
<summary>Expand EditTreemapPlotOptions</summary>

```typescript
export interface EditTreemapPlotOptions extends Omit<TreemapPlotOptions, "id"> { target?: string; }
```

</details>

Related types: [`TreemapPlotOptions`](#type-treemapplotoptions).

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

### `EditWaterfallPlotOptions` {#type-editwaterfallplotoptions}

<details markdown="1">
<summary>Expand EditWaterfallPlotOptions</summary>

```typescript
export type EditWaterfallPlotOptions = { readonly target?: string } & Partial<Omit<CreateWaterfallPlotOptions, "id">>;
```

</details>

Related types: [`CreateWaterfallPlotOptions`](#type-createwaterfallplotoptions).

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
  x?: WithoutEncodingTarget<PositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<PositionEncodingOptions | DatumPositionEncodingOptions>>;
  y?: WithoutEncodingTarget<YPositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<YPositionEncodingOptions | DatumPositionEncodingOptions>>;
  x2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>;
  y2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>;
  theta?: WithoutEncodingTarget<ThetaEncodingOptions | ConditionalEncodingOptions<ThetaEncodingOptions>>;
  r?: WithoutEncodingTarget<RadialEncodingOptions | ConditionalEncodingOptions<RadialEncodingOptions>>;
  xOffset?: WithoutEncodingTarget<XOffsetEncodingOptions | ConditionalEncodingOptions<XOffsetEncodingOptions>>;
  yOffset?: WithoutEncodingTarget<YOffsetEncodingOptions | ConditionalEncodingOptions<YOffsetEncodingOptions>>;
  group?: WithoutEncodingTarget<GroupEncodingOptions>;
  pathOrder?: WithoutEncodingTarget<PathOrderEncodingOptions>;
  color?: WithoutEncodingTarget<ColorEncodingOptions | ConditionalEncodingOptions<ColorEncodingOptions>>;
  stroke?: WithoutEncodingTarget<StrokeEncodingOptions | ConditionalEncodingOptions<StrokeEncodingOptions>>;
  size?: WithoutEncodingTarget<SizeEncodingOptions | ConditionalEncodingOptions<SizeEncodingOptions>>;
  shape?: WithoutEncodingTarget<ShapeEncodingOptions | ConditionalEncodingOptions<ShapeEncodingOptions>>;
  opacity?: WithoutEncodingTarget<OpacityEncodingOptions | ConditionalEncodingOptions<OpacityEncodingOptions>>;
  strokeWidth?: WithoutEncodingTarget<StrokeWidthEncodingOptions | ConditionalEncodingOptions<StrokeWidthEncodingOptions>>;
  strokeDash?: WithoutEncodingTarget<StrokeDashEncodingOptions | ConditionalEncodingOptions<StrokeDashEncodingOptions>>;
  angle?: WithoutEncodingTarget<AngleEncodingOptions | ConditionalEncodingOptions<AngleEncodingOptions>>;
  text?: WithoutEncodingTarget<TextEncodingOptions | ConditionalEncodingOptions<TextEncodingOptions>>;
  dx?: WithoutEncodingTarget<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>;
  dy?: WithoutEncodingTarget<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>;
}
```

</details>

Related types: [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`PositionEncodingOptions`](#type-positionencodingoptions) · [`DatumPositionEncodingOptions`](#type-datumpositionencodingoptions) · [`ConditionalEncodingOptions`](#type-conditionalencodingoptions) · [`YPositionEncodingOptions`](#type-ypositionencodingoptions) · [`SecondaryPositionEncodingOptions`](#type-secondarypositionencodingoptions) · [`ThetaEncodingOptions`](#type-thetaencodingoptions) · [`RadialEncodingOptions`](#type-radialencodingoptions) · [`XOffsetEncodingOptions`](#type-xoffsetencodingoptions) · [`YOffsetEncodingOptions`](#type-yoffsetencodingoptions) · [`GroupEncodingOptions`](#type-groupencodingoptions) · [`PathOrderEncodingOptions`](#type-pathorderencodingoptions) · [`ColorEncodingOptions`](#type-colorencodingoptions) · [`StrokeEncodingOptions`](#type-strokeencodingoptions) · [`SizeEncodingOptions`](#type-sizeencodingoptions) · [`ShapeEncodingOptions`](#type-shapeencodingoptions) · [`OpacityEncodingOptions`](#type-opacityencodingoptions) · [`StrokeWidthEncodingOptions`](#type-strokewidthencodingoptions) · [`StrokeDashEncodingOptions`](#type-strokedashencodingoptions) · [`AngleEncodingOptions`](#type-angleencodingoptions) · [`TextEncodingOptions`](#type-textencodingoptions) · [`TextOffsetEncodingOptions`](#type-textoffsetencodingoptions).

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
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  category: EndpointCategoryChannel;
  orientation?: "horizontal" | "vertical";
  summary?: EndpointPlotSummary;
  guides?: false | CartesianSeparateGuideOptions;
};
```

</details>

Related types: [`EndpointCategoryChannel`](#type-endpointcategorychannel) · [`EndpointPlotSummary`](#type-endpointplotsummary) · [`CartesianSeparateGuideOptions`](#type-cartesianseparateguideoptions).

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
  fill?: FillPaint;
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

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`ErrorBandPositionChannel`](#type-errorbandpositionchannel) · [`ErrorBandIntervalChannel`](#type-errorbandintervalchannel) · [`FillPaint`](#type-fillpaint) · [`CurveInterpolation`](#type-curveinterpolation) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

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
  domain?: "auto" | readonly [string | number | boolean, ...(string | number | boolean)[]];
  range?: "auto" | readonly [number, ...number[]];
  unknown?: number;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
};
```

</details>

### `ExpressionCall` {#type-expressioncall}

<details markdown="1">
<summary>Expand ExpressionCall</summary>

```typescript
export type ExpressionCall =
  | { readonly type: "call"; readonly name: "abs" | "sqrt" | "log" | "exp" | "round" | "floor" | "ceil" | "min" | "max" | "pow" | "toNumber" | "lower" | "upper" | "length" | "substring" | "replace" | "concat" | "isNull" | "isMissing" | "isFinite" | "coalesce" | "arrayLength" | "at"; readonly args: readonly ExpressionNode[] }
  | { readonly type: "call"; readonly name: "sin" | "cos" | "tan" | "atan2"; readonly args: readonly ExpressionNode[]; readonly options: { readonly angleUnit: "radians" | "degrees" } }
  | { readonly type: "call"; readonly name: "parseTime"; readonly args: readonly ExpressionNode[]; readonly options: { readonly format: "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y" | "iso-offset" } }
  | { readonly type: "call"; readonly name: "datePart"; readonly args: readonly ExpressionNode[]; readonly options: { readonly part: "year" | "quarter" | "month" | "day" | "weekday" | "hour" | "minute" | "second" | "millisecond"; readonly timeZone: string } }
  | { readonly type: "call"; readonly name: "timeFloor"; readonly args: readonly ExpressionNode[]; readonly options: { readonly timeZone: string } & ({ readonly unit: "week"; readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 } | { readonly unit: "year" | "quarter" | "month" | "day" | "hour" | "minute" | "second" }) };
```

</details>

Related types: [`ExpressionNode`](#type-expressionnode).

### `ExpressionFilterOptions` {#type-expressionfilteroptions}

<details markdown="1">
<summary>Expand ExpressionFilterOptions</summary>

```typescript
export type ExpressionFilterOptions = {
  where: ComputedExpressionV2;
  field?: never;
  nulls?: never;
  oneOf?: never;
  noneOf?: never;
  predicate?: never;
  range?: never;
};
```

</details>

Related types: [`ComputedExpressionV2`](#type-computedexpressionv2).

### `ExpressionNode` {#type-expressionnode}

<details markdown="1">
<summary>Expand ExpressionNode</summary>

```typescript
export type ExpressionNode =
  | { readonly type: "literal"; readonly value: number | string | boolean | null }
  | { readonly type: "field"; readonly name: string }
  | { readonly type: "fieldPath"; readonly root: string; readonly path: readonly [string, ...string[]] }
  | { readonly type: "parameter"; readonly id: string }
  | { readonly type: "unary"; readonly op: "negate" | "not"; readonly operand: ExpressionNode }
  | { readonly type: "binary"; readonly op: "add" | "subtract" | "multiply" | "divide" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "and" | "or"; readonly left: ExpressionNode; readonly right: ExpressionNode }
  | { readonly type: "if"; readonly condition: ExpressionNode; readonly then: ExpressionNode; readonly else: ExpressionNode }
  | ExpressionCall;
```

</details>

Related types: [`ExpressionCall`](#type-expressioncall).

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

### `FacetGap` {#type-facetgap}

<details markdown="1">
<summary>Expand FacetGap</summary>

```typescript
export type FacetGap = number | Readonly<{ x: number; y: number }>;
```

</details>

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
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
```

</details>

Related types: [`FacetGridRole`](#type-facetgridrole) · [`FacetGap`](#type-facetgap) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions) · [`FacetHeadersOptions`](#type-facetheadersoptions) · [`FacetTopLaneMode`](#type-facettoplanemode).

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
  axes?: "each" | "outer" | { x?: "each" | "outer"; y?: "each" | "outer" };
  legend?: false | "shared" | LegendOptions;
}
```

</details>

Related types: [`LegendOptions`](#type-legendoptions).

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

### `FacetHeaderTitleOptions` {#type-facetheadertitleoptions}

<details markdown="1">
<summary>Expand FacetHeaderTitleOptions</summary>

```typescript
export interface FacetHeaderTitleOptions {
  /** Required when introducing a title; edits preserve the existing text. One line. */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
  align?: FacetHeaderAlign;
  rotation?: RotationInput;
  alongOffset?: number;
}
```

</details>

Related types: [`FacetHeaderAlign`](#type-facetheaderalign) · [`RotationInput`](#type-rotationinput).

### `FacetHeadersOptions` {#type-facetheadersoptions}

<details markdown="1">
<summary>Expand FacetHeadersOptions</summary>

```typescript
export type FacetHeadersOptions = Omit<EditFacetHeadersOptions, "role" | "side" | "title"> & {
  row?: Omit<EditFacetHeadersOptions, "role">;
  column?: Omit<EditFacetHeadersOptions, "role">;
};
```

</details>

Related types: [`EditFacetHeadersOptions`](#type-editfacetheadersoptions).

### `FacetOptions` {#type-facetoptions}

<details markdown="1">
<summary>Expand FacetOptions</summary>

```typescript
export interface FacetOptions {
  id?: string;
  field: string;
  /** Common row-preserving ancestor, or an explicit materialized fold ancestor of every layer. */
  data?: string;
  values?: readonly DatasetScalar[];
  columns?: number;
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
```

</details>

Related types: [`DatasetScalar`](#type-datasetscalar) · [`FacetGap`](#type-facetgap) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions) · [`FacetHeadersOptions`](#type-facetheadersoptions) · [`FacetTopLaneMode`](#type-facettoplanemode).

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

### `FacetTopLaneMode` {#type-facettoplanemode}

<details markdown="1">
<summary>Expand FacetTopLaneMode</summary>

```typescript
export type FacetTopLaneMode = "stacked" | "shared";
```

</details>

### `FieldType` {#type-fieldtype}

<details markdown="1">
<summary>Expand FieldType</summary>

```typescript
export type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
```

</details>

### `FillPaint` {#type-fillpaint}

<details markdown="1">
<summary>Expand FillPaint</summary>

```typescript
export type FillPaint = string | LinearGradientPaint | PatternPaint | RadialGradientPaint;
```

</details>

Related types: [`LinearGradientPaint`](#type-lineargradientpaint) · [`PatternPaint`](#type-patternpaint) · [`RadialGradientPaint`](#type-radialgradientpaint).

### `FilledLegendSymbolRecipe` {#type-filledlegendsymbolrecipe}

<details markdown="1">
<summary>Expand FilledLegendSymbolRecipe</summary>

```typescript
type FilledLegendSymbolRecipe = "auto"
  | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
  | { layers: readonly LegendSymbolLayer[] };
```

</details>

Related types: [`LegendSymbolLayer`](#type-legendsymbollayer).

### `FilledMarkLegendOptions` {#type-filledmarklegendoptions}

<details markdown="1">
<summary>Expand FilledMarkLegendOptions</summary>

```typescript
type FilledMarkLegendOptions = Omit<LegendOptions, "symbol" | "representation" | "combine"> & (
  | { combine?: "separate" | "size-shape"; representation?: "gradient"; symbol?: FilledLegendSymbolRecipe }
  | { combine?: "separate" | "size-shape"; representation: "symbols"; symbol?: "auto" | { type?: "point"; radius?: number; stroke?: string; strokeWidth?: number } }
  | { combine: "color-size-shape"; representation?: never; symbol?: "auto" | { type?: "point"; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } }
  | { combine: "color-size"; representation?: never; symbol?: "auto" | { type?: "point"; stroke?: string; strokeWidth?: number; opacity?: number } }
);
```

</details>

Related types: [`LegendOptions`](#type-legendoptions) · [`FilledLegendSymbolRecipe`](#type-filledlegendsymbolrecipe).

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
export type FilterDataOptions = { id: string; source?: string } & (
  | ({ field: string; nulls?: "include" | "exclude"; where?: never } & FilterModeOptions)
  | ExpressionFilterOptions
);
```

</details>

Related types: [`FilterModeOptions`](#type-filtermodeoptions) · [`ExpressionFilterOptions`](#type-expressionfilteroptions).

### `FilterMarksOptions` {#type-filtermarksoptions}

<details markdown="1">
<summary>Expand FilterMarksOptions</summary>

```typescript
export type FilterMarksOptions = {
  /** Inferred graphs only: rebuild topology and dependent layouts from selected source identities. Omission preserves an existing filter mode. */
  recompute?: boolean;
  /** Graph plots select node items; the default induced view preserves topology and layout. */
  target?: string;
  mode?: "replace" | "compose";
} & MarkSelector;
/** Hide categorical final items independently of an existing user filter. */
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
  /** Exact inner plot mode: distribute spare outer space around visible content. */
  align?: "preserve" | "center";
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

### `FlattenDataOptions` {#type-flattendataoptions}

<details markdown="1">
<summary>Expand FlattenDataOptions</summary>

```typescript
export interface FlattenDataOptions {
  id: string;
  source?: string;
  fields: readonly string[];
  as?: readonly string[];
}
```

</details>

### `FlowBodyPaint` {#type-flowbodypaint}

<details markdown="1">
<summary>Expand FlowBodyPaint</summary>

```typescript
export interface FlowBodyPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `FlowDefinition` {#type-flowdefinition}

<details markdown="1">
<summary>Expand FlowDefinition</summary>

```typescript
export interface FlowDefinition extends Omit<ObservedGraphDefinition, "weight" | "directed"> {
  readonly value: string;
  readonly balance?: "allow" | "strict";
}
```

</details>

Related types: [`ObservedGraphDefinition`](#type-observedgraphdefinition).

### `FlowLabelPaint` {#type-flowlabelpaint}

<details markdown="1">
<summary>Expand FlowLabelPaint</summary>

```typescript
export interface FlowLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; readonly fill?: FillPaint; readonly fontFamily?: string; readonly fontSize?: number; readonly fontWeight?: string | number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `FlowLabelsOptions` {#type-flowlabelsoptions}

<details markdown="1">
<summary>Expand FlowLabelsOptions</summary>

```typescript
export interface FlowLabelsOptions extends FlowLabelPaint {
  readonly content?: "key" | "value" | { readonly field: string }; readonly offset?: readonly [number, number];
  readonly overrides?: readonly (FlowLabelPaint & { readonly key: RowKey; readonly text?: string })[];
}
```

</details>

Related types: [`FlowLabelPaint`](#type-flowlabelpaint) · [`RowKey`](#type-rowkey).

### `FlowLayoutOptions` {#type-flowlayoutoptions}

<details markdown="1">
<summary>Expand FlowLayoutOptions</summary>

```typescript
export interface FlowLayoutOptions extends GraphLayoutLimits {
  readonly width?: number; readonly height?: number; readonly nodeWidth?: number; readonly nodePadding?: number;
  readonly align?: "left" | "right" | "center" | "justify";
  readonly order?: "input" | "barycentric" | readonly RowKey[];
  readonly iterations?: number; readonly laneGap?: number; readonly orientation?: "horizontal" | "vertical";
}
```

</details>

Related types: [`GraphLayoutLimits`](#type-graphlayoutlimits) · [`RowKey`](#type-rowkey).

### `FlowLinksOptions` {#type-flowlinksoptions}

<details markdown="1">
<summary>Expand FlowLinksOptions</summary>

```typescript
export interface FlowLinksOptions {
  readonly id?: string; readonly layout?: string; readonly coordinate?: string; readonly clip?: boolean;
  readonly links?: FlowBodyPaint & { readonly overrides?: readonly (FlowBodyPaint & { readonly key: RowKey })[] };
}
```

</details>

Related types: [`FlowBodyPaint`](#type-flowbodypaint) · [`RowKey`](#type-rowkey).

### `FlowNodesOptions` {#type-flownodesoptions}

<details markdown="1">
<summary>Expand FlowNodesOptions</summary>

```typescript
export interface FlowNodesOptions {
  readonly id?: string; readonly layout?: string; readonly coordinate?: string; readonly clip?: boolean;
  readonly nodes?: FlowBodyPaint & { readonly overrides?: readonly (FlowBodyPaint & { readonly key: RowKey })[] };
  readonly labels?: false | FlowLabelsOptions;
}
```

</details>

Related types: [`FlowBodyPaint`](#type-flowbodypaint) · [`RowKey`](#type-rowkey) · [`FlowLabelsOptions`](#type-flowlabelsoptions).

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

### `ForceDirectedEdgeRouteOptions` {#type-forcedirectededgerouteoptions}

<details markdown="1">
<summary>Expand ForceDirectedEdgeRouteOptions</summary>

```typescript
export interface ForceDirectedEdgeRouteOptions extends EdgeRouteCommonOptions { readonly compatibilityThreshold?: number; }
```

</details>

Related types: [`EdgeRouteCommonOptions`](#type-edgeroutecommonoptions).

### `GeoAnnotationAnchor` {#type-geoannotationanchor}

<details markdown="1">
<summary>Expand GeoAnnotationAnchor</summary>

```typescript
export type GeoAnnotationAnchor = { readonly type: "position"; readonly position: readonly [number, number] }
  | { readonly type: "feature"; readonly geometry?: string; readonly key: RowKey; readonly level?: string };
```

</details>

Related types: [`RowKey`](#type-rowkey).

### `GeoAnnotationOptions` {#type-geoannotationoptions}

<details markdown="1">
<summary>Expand GeoAnnotationOptions</summary>

```typescript
export interface GeoAnnotationOptions extends Omit<TextMarkOptions, "data" | "source" | "missing" | "text" | "inheritColor"> {
  readonly coordinate?: string; readonly anchor: GeoAnnotationAnchor; readonly text: string;
}
```

</details>

Related types: [`TextMarkOptions`](#type-textmarkoptions) · [`GeoAnnotationAnchor`](#type-geoannotationanchor).

### `GeoCameraOperation` {#type-geocameraoperation}

<details markdown="1">
<summary>Expand GeoCameraOperation</summary>

```typescript
export type GeoCameraOperation =
  | { readonly type: "pan"; readonly deltaPx: readonly [number, number] }
  | { readonly type: "zoom"; readonly anchorPx: readonly [number, number]; readonly factor: number; readonly scaleExtent: readonly [number, number] }
  | { readonly type: "pinch"; readonly fromPx: readonly [readonly [number, number], readonly [number, number]]; readonly toPx: readonly [readonly [number, number], readonly [number, number]]; readonly scaleExtent: readonly [number, number] }
  | { readonly type: "rotate"; readonly rotateDeg: readonly [number, number] | readonly [number, number, number] }
  | { readonly type: "reset"; readonly initial: ProjectionParameters }
  | { readonly type: "fit"; readonly fit: ProjectionFitOptions }
  | { readonly type: "resize"; readonly canvas: { readonly width?: number; readonly height?: number; readonly plot?: false | { readonly width: number; readonly height: number } }; readonly scaling: "preserve" | "fit" };
/** Native projection edits; reset restores explicit view parameters, without restoring a prior fit policy. */
```

</details>

Related types: [`ProjectionParameters`](#type-projectionparameters) · [`ProjectionFitOptions`](#type-projectionfitoptions).

### `GeoEditOptions` {#type-geoeditoptions}

<details markdown="1">
<summary>Expand GeoEditOptions</summary>

```typescript
type GeoEditOptions<Options> = Options extends unknown ? Omit<Options, "id"> & { readonly target?: string } : never;
```

</details>

### `GeoJSONInput` {#type-geojsoninput}

<details markdown="1">
<summary>Expand GeoJSONInput</summary>

```typescript
export type GeoJSONInput = GeographicGeometry | GeometryFeature | (Readonly<Record<string, unknown>> & { readonly type: "FeatureCollection"; readonly features: readonly GeometryFeature[] }) | null;
```

</details>

Related types: [`GeographicGeometry`](#type-geographicgeometry) · [`GeometryFeature`](#type-geometryfeature).

### `GeoJoinKeyOptions` {#type-geojoinkeyoptions}

<details markdown="1">
<summary>Expand GeoJoinKeyOptions</summary>

```typescript
export interface GeoJoinKeyOptions {
  /** Exact own field or nonempty own-property path. Null and absent keys never match. */
  readonly geometryKey: GeometryFeatureKey;
  readonly dataKey: GeometryFeatureKey;
}
```

</details>

Related types: [`GeometryFeatureKey`](#type-geometryfeaturekey).

### `GeoLODBaseLevel` {#type-geolodbaselevel}

<details markdown="1">
<summary>Expand GeoLODBaseLevel</summary>

```typescript
export interface GeoLODBaseLevel {
  readonly id: string;
  /** Explicit geometry source or join with a stable featureKey; nested LOD is rejected. */
  readonly geometry: string;
  /** Maximum deviation in planar units or geographic degrees; positive values require shared topology. */
  readonly tolerance?: number;
}
```

</details>

### `GeoLODChildLevel` {#type-geolodchildlevel}

<details markdown="1">
<summary>Expand GeoLODChildLevel</summary>

```typescript
export interface GeoLODChildLevel extends GeoLODBaseLevel {
  readonly parents: readonly { readonly key: RowKey; readonly parent: RowKey }[];
  readonly enterZoom: number; readonly exitZoom: number;
}
```

</details>

Related types: [`GeoLODBaseLevel`](#type-geolodbaselevel) · [`RowKey`](#type-rowkey).

### `GeoLODLevels` {#type-geolodlevels}

<details markdown="1">
<summary>Expand GeoLODLevels</summary>

```typescript
export type GeoLODLevels = readonly [GeoLODBaseLevel, ...GeoLODChildLevel[]];
```

</details>

Related types: [`GeoLODBaseLevel`](#type-geolodbaselevel) · [`GeoLODChildLevel`](#type-geolodchildlevel).

### `GeoLineMarkOptions` {#type-geolinemarkoptions}

<details markdown="1">
<summary>Expand GeoLineMarkOptions</summary>

```typescript
export interface GeoLineMarkOptions extends Omit<GeoSourceMarkOptions, "fill"> { readonly fill?: "none"; }
```

</details>

Related types: [`GeoSourceMarkOptions`](#type-geosourcemarkoptions).

### `GeoMarkStyleOptions` {#type-geomarkstyleoptions}

<details markdown="1">
<summary>Expand GeoMarkStyleOptions</summary>

```typescript
export interface GeoMarkStyleOptions {
  readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number;
  readonly clip?: boolean; readonly lineCap?: "butt" | "round" | "square"; readonly lineJoin?: "miter" | "round" | "bevel";
  readonly miterLimit?: number; readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false; readonly blend?: BlendMode;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`BlendMode`](#type-blendmode).

### `GeoPointMarkOptions` {#type-geopointmarkoptions}

<details markdown="1">
<summary>Expand GeoPointMarkOptions</summary>

```typescript
export type GeoPointMarkOptions = GeoSourceMarkOptions & (
  | { readonly radiusPx?: number; readonly radiusDeg?: never }
  | { readonly radiusDeg: number; readonly radiusPx?: never }
);
```

</details>

Related types: [`GeoSourceMarkOptions`](#type-geosourcemarkoptions).

### `GeoShapeMarkOptions` {#type-geoshapemarkoptions}

<details markdown="1">
<summary>Expand GeoShapeMarkOptions</summary>

```typescript
export interface GeoShapeMarkOptions extends GeoSourceMarkOptions { readonly radiusPx?: number; }
```

</details>

Related types: [`GeoSourceMarkOptions`](#type-geosourcemarkoptions).

### `GeoSourceMarkOptions` {#type-geosourcemarkoptions}

<details markdown="1">
<summary>Expand GeoSourceMarkOptions</summary>

```typescript
export interface GeoSourceMarkOptions extends GeoMarkStyleOptions {
  readonly id?: string; readonly coordinate?: string; readonly geometry?: string;
  readonly interpolation?: "source-segment" | "great-circle";
  /** Explicit false removes a previous hint. */
  readonly routeHint?: readonly [number, number] | false;
}
```

</details>

Related types: [`GeoMarkStyleOptions`](#type-geomarkstyleoptions).

### `GeographicGeometry` {#type-geographicgeometry}

<details markdown="1">
<summary>Expand GeographicGeometry</summary>

```typescript
export type GeographicGeometry = Readonly<Record<string, unknown>> & (
  | { readonly type: "Point"; readonly coordinates: GeometryPosition }
  | { readonly type: "MultiPoint" | "LineString"; readonly coordinates: readonly GeometryPosition[] }
  | { readonly type: "MultiLineString" | "Polygon"; readonly coordinates: readonly (readonly GeometryPosition[])[] }
  | { readonly type: "MultiPolygon"; readonly coordinates: readonly (readonly (readonly GeometryPosition[])[])[] }
  | { readonly type: "GeometryCollection"; readonly geometries: readonly (GeographicGeometry | null)[] });
```

</details>

Related types: [`GeometryPosition`](#type-geometryposition).

### `GeometryFeature` {#type-geometryfeature}

<details markdown="1">
<summary>Expand GeometryFeature</summary>

```typescript
export interface GeometryFeature extends Readonly<Record<string, unknown>> {
  readonly type: "Feature"; readonly id?: string | number;
  readonly properties: Readonly<Record<string, GeometryJSONValue>> | null;
  readonly geometry: GeographicGeometry | null;
}
```

</details>

Related types: [`GeometryJSONValue`](#type-geometryjsonvalue) · [`GeographicGeometry`](#type-geographicgeometry).

### `GeometryFeatureKey` {#type-geometryfeaturekey}

<details markdown="1">
<summary>Expand GeometryFeatureKey</summary>

```typescript
export type GeometryFeatureKey = string | readonly string[];
```

</details>

### `GeometryJSONValue` {#type-geometryjsonvalue}

<details markdown="1">
<summary>Expand GeometryJSONValue</summary>

```typescript
export type GeometryJSONValue = null | boolean | number | string | readonly GeometryJSONValue[] | { readonly [key: string]: GeometryJSONValue };
```

</details>

### `GeometryLimits` {#type-geometrylimits}

<details markdown="1">
<summary>Expand GeometryLimits</summary>

```typescript
export interface GeometryLimits { readonly maxFeatures?: number; readonly maxPositions?: number; readonly maxArcs?: number; readonly maxValues?: number; readonly maxDepth?: number; }
```

</details>

### `GeometryPosition` {#type-geometryposition}

<details markdown="1">
<summary>Expand GeometryPosition</summary>

```typescript
export type GeometryPosition = readonly [number, number, ...number[]];
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
  color?: BasicColorChannel | { value: string };
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
  guides?: false | GradientPlotGuideOptions;
}
```

</details>

Related types: [`GradientPlotPositionChannel`](#type-gradientplotpositionchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`GradientPlotDensityOptions`](#type-gradientplotdensityoptions) · [`GradientPlotAppearanceOptions`](#type-gradientplotappearanceoptions) · [`GradientPlotCenterOptions`](#type-gradientplotcenteroptions) · [`GradientPlotGuideOptions`](#type-gradientplotguideoptions).

### `GradientPlotPositionChannel` {#type-gradientplotpositionchannel}

<details markdown="1">
<summary>Expand GradientPlotPositionChannel</summary>

```typescript
export type GradientPlotPositionChannel = BoxPlotPositionChannel;
```

</details>

Related types: [`BoxPlotPositionChannel`](#type-boxplotpositionchannel).

### `GraphCandidateMstDefinition` {#type-graphcandidatemstdefinition}

<details markdown="1">
<summary>Expand GraphCandidateMstDefinition</summary>

```typescript
export type GraphCandidateMstDefinition = InferredGraphSource & { readonly rule: "mst"; readonly options?: { readonly forest?: boolean }; readonly features?: never; readonly metric?: never; readonly preprocess?: never };
```

</details>

Related types: [`InferredGraphSource`](#type-inferredgraphsource).

### `GraphCircularOptions` {#type-graphcircularoptions}

<details markdown="1">
<summary>Expand GraphCircularOptions</summary>

```typescript
export interface GraphCircularOptions extends GraphLayoutLimits { readonly center?: readonly [number, number]; readonly radius?: number; readonly startAngle?: number; }
/** Source revisions retain dormant initial positions and pins; explicit replacement arrays use current keys. */
```

</details>

Related types: [`GraphLayoutLimits`](#type-graphlayoutlimits).

### `GraphEdgePaint` {#type-graphedgepaint}

<details markdown="1">
<summary>Expand GraphEdgePaint</summary>

```typescript
export interface GraphEdgePaint { shadow?: MarkShadow | false; stroke?: string; strokeWidth?: number; opacity?: number; parallelGap?: number; loopRadius?: number; arrowSize?: number; arrows?: "auto" | boolean; }
```

</details>

Related types: [`MarkShadow`](#type-markshadow).

### `GraphFeaturePolicy` {#type-graphfeaturepolicy}

<details markdown="1">
<summary>Expand GraphFeaturePolicy</summary>

```typescript
export interface GraphFeaturePolicy { readonly missing?: "error" | "omit-node"; readonly zeroVector?: "error" | "zero-similarity"; }
```

</details>

### `GraphFixedOptions` {#type-graphfixedoptions}

<details markdown="1">
<summary>Expand GraphFixedOptions</summary>

```typescript
export interface GraphFixedOptions extends GraphLayoutLimits { readonly positions: readonly GraphPosition[]; }
```

</details>

Related types: [`GraphLayoutLimits`](#type-graphlayoutlimits) · [`GraphPosition`](#type-graphposition).

### `GraphForceOptions` {#type-graphforceoptions}

<details markdown="1">
<summary>Expand GraphForceOptions</summary>

```typescript
export interface GraphForceOptions extends GraphLayoutLimits {
  readonly seed?: number; readonly iterations?: number; readonly linkDistance?: number; readonly repulsion?: number;
  readonly collisionRadius?: number; readonly damping?: number; readonly center?: readonly [number, number];
  readonly componentGap?: number; readonly initialPositions?: readonly GraphPosition[]; readonly pinned?: readonly GraphPin[];
}
```

</details>

Related types: [`GraphLayoutLimits`](#type-graphlayoutlimits) · [`GraphPosition`](#type-graphposition) · [`GraphPin`](#type-graphpin).

### `GraphKeyField` {#type-graphkeyfield}

<details markdown="1">
<summary>Expand GraphKeyField</summary>

```typescript
export type GraphKeyField = string | readonly string[];
```

</details>

### `GraphLabelPaint` {#type-graphlabelpaint}

<details markdown="1">
<summary>Expand GraphLabelPaint</summary>

```typescript
export interface GraphLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; fontSize?: number; fontFamily?: string; fontWeight?: string | number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `GraphLabelsOptions` {#type-graphlabelsoptions}

<details markdown="1">
<summary>Expand GraphLabelsOptions</summary>

```typescript
export interface GraphLabelsOptions extends GraphLabelPaint {
  field?: string; offset?: readonly [number, number]; overrides?: readonly (GraphLabelPaint & { key: RowKey; text?: string })[];
}
```

</details>

Related types: [`GraphLabelPaint`](#type-graphlabelpaint) · [`RowKey`](#type-rowkey).

### `GraphLayoutLimits` {#type-graphlayoutlimits}

<details markdown="1">
<summary>Expand GraphLayoutLimits</summary>

```typescript
export interface GraphLayoutLimits { readonly maxNodes?: number; readonly maxEdges?: number; }
/** Coordinate arrays cover current nodes when authored; source revisions retain absent keys for reuse. */
```

</details>

### `GraphMetricDefinition` {#type-graphmetricdefinition}

<details markdown="1">
<summary>Expand GraphMetricDefinition</summary>

```typescript
export type GraphMetricDefinition =
  { readonly metric: "euclidean" | "manhattan" | "cosine"; readonly features: readonly string[]; readonly preprocess?: "none" | "standardize" | "minmax" } |
  { readonly metric: "jaccard"; readonly features: readonly string[] | { readonly set: string }; readonly preprocess?: "none" } |
  { readonly metric: "great-circle"; readonly features: readonly string[] | { readonly longitude: string; readonly latitude: string }; readonly preprocess?: "none" };
```

</details>

### `GraphMetricMstDefinition` {#type-graphmetricmstdefinition}

<details markdown="1">
<summary>Expand GraphMetricMstDefinition</summary>

```typescript
export type GraphMetricMstDefinition = InferredGraphSource & GraphMetricDefinition & { readonly rule: "mst"; readonly options?: GraphFeaturePolicy & { readonly forest?: boolean } };
```

</details>

Related types: [`InferredGraphSource`](#type-inferredgraphsource) · [`GraphMetricDefinition`](#type-graphmetricdefinition) · [`GraphFeaturePolicy`](#type-graphfeaturepolicy).

### `GraphNeighborDefinition` {#type-graphneighbordefinition}

<details markdown="1">
<summary>Expand GraphNeighborDefinition</summary>

```typescript
export type GraphNeighborDefinition = InferredGraphSource & GraphMetricDefinition & (
  { readonly rule: "knn"; readonly options?: GraphFeaturePolicy & { readonly k?: number; readonly symmetrize?: "directed" | "union" | "mutual"; readonly search?: GraphSearchOptions } } |
  { readonly rule: "radius"; readonly options: GraphFeaturePolicy & { readonly radius: number; readonly directed?: boolean; readonly search?: Extract<GraphSearchOptions, { readonly mode?: "exact" }> } } |
  { readonly rule: "similarity"; readonly metric: "cosine" | "jaccard"; readonly options: GraphFeaturePolicy & { readonly threshold: number; readonly directed?: boolean; readonly search?: { readonly mode?: "exact"; readonly algorithm?: "brute-force" } } });
```

</details>

Related types: [`InferredGraphSource`](#type-inferredgraphsource) · [`GraphMetricDefinition`](#type-graphmetricdefinition) · [`GraphFeaturePolicy`](#type-graphfeaturepolicy) · [`GraphSearchOptions`](#type-graphsearchoptions).

### `GraphNodePaint` {#type-graphnodepaint}

<details markdown="1">
<summary>Expand GraphNodePaint</summary>

```typescript
export interface GraphNodePaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; radius?: number; fill?: FillPaint; stroke?: string; strokeWidth?: number; opacity?: number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `GraphPin` {#type-graphpin}

<details markdown="1">
<summary>Expand GraphPin</summary>

```typescript
export interface GraphPin { readonly key: RowKey; readonly fx: number; readonly fy: number; }
```

</details>

Related types: [`RowKey`](#type-rowkey).

### `GraphPlotOptions` {#type-graphplotoptions}

<details markdown="1">
<summary>Expand GraphPlotOptions</summary>

```typescript
export interface GraphPlotOptions {
  id?: string; layout?: string; routes?: string | false; origin?: "auto" | readonly [number, number]; clip?: boolean;
  nodes?: GraphNodePaint & { overrides?: readonly (GraphNodePaint & { key: RowKey })[] };
  edges?: GraphEdgePaint; labels?: false | GraphLabelsOptions;
}
```

</details>

Related types: [`GraphNodePaint`](#type-graphnodepaint) · [`RowKey`](#type-rowkey) · [`GraphEdgePaint`](#type-graphedgepaint) · [`GraphLabelsOptions`](#type-graphlabelsoptions).

### `GraphPosition` {#type-graphposition}

<details markdown="1">
<summary>Expand GraphPosition</summary>

```typescript
export interface GraphPosition { readonly key: RowKey; readonly x: number; readonly y: number; }
```

</details>

Related types: [`RowKey`](#type-rowkey).

### `GraphSearchOptions` {#type-graphsearchoptions}

<details markdown="1">
<summary>Expand GraphSearchOptions</summary>

```typescript
export type GraphSearchOptions = { readonly mode?: "exact"; readonly algorithm?: "brute-force" | "kd-tree" | "grid" } |
  { readonly mode: "approximate"; readonly algorithm?: "projection-forest"; readonly seed: number; readonly trees?: number;
    readonly projections?: 1; readonly leafSize?: number; readonly searchLeaves?: number; readonly fallback?: "error" | "exact"; readonly minRecall?: number };
```

</details>

### `GraphStructuralDefinition` {#type-graphstructuraldefinition}

<details markdown="1">
<summary>Expand GraphStructuralDefinition</summary>

```typescript
export type GraphStructuralDefinition = InferredGraphSource & { readonly features?: never; readonly metric?: never; readonly preprocess?: never } & (
  { readonly rule: "group"; readonly options: { readonly fields: readonly string[]; readonly missing?: "error" | "omit-node" | "include"; readonly mode?: "clique" | "star";
    readonly hubKey?: RowKey; readonly hubs?: readonly { readonly group: readonly unknown[]; readonly key: RowKey }[] } } |
  { readonly rule: "sequence"; readonly options: { readonly orderField: string; readonly groupBy?: readonly string[]; readonly missing?: "error" | "omit-node";
    readonly lag?: number; readonly maxGap?: number; readonly temporalUnit?: TemporalInputUnit } });
```

</details>

Related types: [`InferredGraphSource`](#type-inferredgraphsource) · [`RowKey`](#type-rowkey) · [`TemporalInputUnit`](#type-temporalinputunit).

### `GraphicClip` {#type-graphicclip}

<details markdown="1">
<summary>Expand GraphicClip</summary>

```typescript
export type GraphicClip = GraphicClipRect | GraphicClipPath;
```

</details>

Related types: [`GraphicClipRect`](#type-graphiccliprect) · [`GraphicClipPath`](#type-graphicclippath).

### `GraphicClipPath` {#type-graphicclippath}

<details markdown="1">
<summary>Expand GraphicClipPath</summary>

```typescript
export interface GraphicClipPath {
  readonly type: "path";
  readonly commands: readonly ConcretePathCommand[];
  readonly fillRule?: PathFillRule;
}
```

</details>

Related types: [`ConcretePathCommand`](#type-concretepathcommand) · [`PathFillRule`](#type-pathfillrule).

### `GraphicClipRect` {#type-graphiccliprect}

<details markdown="1">
<summary>Expand GraphicClipRect</summary>

```typescript
export interface GraphicClipRect {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}
```

</details>

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
  | "path"
  | "image";
```

</details>

### `GraticuleOptions` {#type-graticuleoptions}

<details markdown="1">
<summary>Expand GraticuleOptions</summary>

```typescript
export interface GraticuleOptions extends Omit<GeoMarkStyleOptions, "fill"> {
  readonly id?: string; readonly coordinate?: string; readonly fill?: "none";
  readonly stepDeg?: readonly [number, number];
  readonly extentDeg?: readonly [readonly [number, number], readonly [number, number]];
  readonly precisionDeg?: number;
}
```

</details>

Related types: [`GeoMarkStyleOptions`](#type-geomarkstyleoptions).

### `GridDirectionOptions` {#type-griddirectionoptions}

<details markdown="1">
<summary>Expand GridDirectionOptions</summary>

```typescript
export interface GridDirectionOptions {
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Signed logical pixels along the scale: vertical lines right, horizontal lines down. */
  alongOffset?: number;
  /** Grid draw order relative to marks at zero: positive above, nonpositive behind. */
  zIndex?: number;
  /** Band centers by default; boundary draws both edges of each selected band. */
  bandPosition?: "center" | "boundary";
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly CategoryValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
```

</details>

Related types: [`CartesianGuideDashMap`](#type-cartesianguidedashmap) · [`CategoryValue`](#type-categoryvalue).

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

### `GuideVisibilityOptions` {#type-guidevisibilityoptions}

<details markdown="1">
<summary>Expand GuideVisibilityOptions</summary>

```typescript
export interface GuideVisibilityOptions { /** Hide/show without deleting retained style or relative geometry. */ visible?: boolean; }
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
    clip?: boolean;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  };
  guides?: false | CartesianSeparateGuideOptions;
}
```

</details>

Related types: [`RectStyleDetails`](#type-rectstyledetails) · [`CartesianSeparateGuideOptions`](#type-cartesianseparateguideoptions).

### `HeatmapBinOptions` {#type-heatmapbinoptions}

<details markdown="1">
<summary>Expand HeatmapBinOptions</summary>

```typescript
export interface HeatmapBinOptions {
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  assignment?: "edges" | "step";
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

### `HierarchicalEdgeRouteOptions` {#type-hierarchicaledgerouteoptions}

<details markdown="1">
<summary>Expand HierarchicalEdgeRouteOptions</summary>

```typescript
export interface HierarchicalEdgeRouteOptions extends EdgeRouteCommonOptions {
  readonly hierarchy?: string; readonly hierarchyLayout?: string;
  readonly mapping: readonly { readonly nodeKey: RowKey; readonly hierarchyKey: RowKeyScalar }[];
  readonly strength?: number; readonly tolerance?: number; readonly maxSubdivisions?: number;
}
```

</details>

Related types: [`EdgeRouteCommonOptions`](#type-edgeroutecommonoptions) · [`RowKey`](#type-rowkey) · [`RowKeyScalar`](#type-rowkeyscalar).

### `HierarchyBodyPaint` {#type-hierarchybodypaint}

<details markdown="1">
<summary>Expand HierarchyBodyPaint</summary>

```typescript
export interface HierarchyBodyPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; stroke?: string; strokeWidth?: number; opacity?: number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `HierarchyLabelPaint` {#type-hierarchylabelpaint}

<details markdown="1">
<summary>Expand HierarchyLabelPaint</summary>

```typescript
export interface HierarchyLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; fontSize?: number; fontFamily?: string; fontWeight?: string | number; }
```

</details>

Related types: [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint).

### `HierarchyLabelsOptions` {#type-hierarchylabelsoptions}

<details markdown="1">
<summary>Expand HierarchyLabelsOptions</summary>

```typescript
export interface HierarchyLabelsOptions extends HierarchyLabelPaint {
  content?: "value"; offset?: readonly [number, number]; overrides?: readonly (HierarchyNodeTarget & HierarchyLabelPaint & { text?: string })[];
}
```

</details>

Related types: [`HierarchyLabelPaint`](#type-hierarchylabelpaint) · [`HierarchyNodeTarget`](#type-hierarchynodetarget).

### `HierarchyNodePaint` {#type-hierarchynodepaint}

<details markdown="1">
<summary>Expand HierarchyNodePaint</summary>

```typescript
export interface HierarchyNodePaint extends HierarchyBodyPaint { radius?: number; }
```

</details>

Related types: [`HierarchyBodyPaint`](#type-hierarchybodypaint).

### `HierarchyNodeTarget` {#type-hierarchynodetarget}

<details markdown="1">
<summary>Expand HierarchyNodeTarget</summary>

```typescript
export type HierarchyNodeTarget = { key: RowKeyScalar; path?: never } | { path: readonly (RowKeyScalar | null)[]; key?: never };
```

</details>

Related types: [`RowKeyScalar`](#type-rowkeyscalar).

### `HierarchyOrder` {#type-hierarchyorder}

<details markdown="1">
<summary>Expand HierarchyOrder</summary>

```typescript
export type HierarchyOrder = "input"
  | { by: "value" | "key"; direction: "ascending" | "descending" }
  | { by: "field"; field: string; direction: "ascending" | "descending"; nulls?: "first" | "last"; temporalUnit?: "year" | "timestamp" };
```

</details>

### `HierarchySource` {#type-hierarchysource}

<details markdown="1">
<summary>Expand HierarchySource</summary>

```typescript
export type HierarchySource =
  | { key: string; parent: string; value: string; children?: never; groupFields?: never; valueMode?: HierarchyValueMode; forest?: boolean; missingCategory?: never }
  | { key: string; children: string; value: string; parent?: never; groupFields?: never; valueMode?: HierarchyValueMode; forest?: boolean; missingCategory?: never }
  | { groupFields: readonly string[]; value: string; key?: never; parent?: never; children?: never; valueMode?: "leaf-sum"; forest?: never; missingCategory?: "error" | "include" };
```

</details>

Related types: [`HierarchyValueMode`](#type-hierarchyvaluemode).

### `HierarchyTreeOptions` {#type-hierarchytreeoptions}

<details markdown="1">
<summary>Expand HierarchyTreeOptions</summary>

```typescript
export type HierarchyTreeOptions = { nodeSize: readonly [number, number]; siblingGap: number; depthGap: number; maxNodes?: number } &
  ({ orientation: "vertical" | "horizontal"; radius?: never; startAngle?: never; sweep?: never }
  | { orientation: "radial"; radius: number; startAngle: number; sweep: number });
```

</details>

### `HierarchyTreemapOptions` {#type-hierarchytreemapoptions}

<details markdown="1">
<summary>Expand HierarchyTreemapOptions</summary>

```typescript
export interface HierarchyTreemapOptions { size: readonly [number, number]; padding: number; method: "slice-dice" | "squarify"; maxNodes?: number; }
```

</details>

### `HierarchyValueMode` {#type-hierarchyvaluemode}

<details markdown="1">
<summary>Expand HierarchyValueMode</summary>

```typescript
export type HierarchyValueMode = "leaf-sum" | "inclusive" | "own-plus-children";
```

</details>

### `HighlightMarksOptions` {#type-highlightmarksoptions}

<details markdown="1">
<summary>Expand HighlightMarksOptions</summary>

```typescript
export interface HighlightMarksOptions {
  fontSize?: number;
  id?: string;
  target?: string;
  select?: MarkSelectionSelector;
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

Related types: [`MarkSelectionSelector`](#type-markselectionselector) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern) · [`PointShape`](#type-pointshape).

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
      layout?: Exclude<ColorLayout, "center" | "wiggle">;
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
  grid?: false | { vertical?: boolean | ContinuousGridDirectionOptions; horizontal?: false };
  legend?: false;
};
```

</details>

Related types: [`CAxes`](#type-caxes) · [`ContinuousGridDirectionOptions`](#type-continuousgriddirectionoptions).

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

### `ImageMarkOptions` {#type-imagemarkoptions}

<details markdown="1">
<summary>Expand ImageMarkOptions</summary>

```typescript
export interface ImageMarkOptions {
  image?: string;
  viewport?: "auto" | { x: number; y: number; width: number; height: number };
  fit?: "contain" | "cover" | "fill";
  align?: readonly [number, number];
  opacity?: number; alt?: string; clip?: false | GraphicClip; shadow?: MarkShadow | false;
}
```

</details>

Related types: [`GraphicClip`](#type-graphicclip) · [`MarkShadow`](#type-markshadow).

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
  | { method?: "mean"; value?: never; sortBy?: readonly WindowSort[]; }
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

Related types: [`ImputedDataBaseOptions`](#type-imputeddatabaseoptions) · [`WindowSort`](#type-windowsort) · [`DatasetScalar`](#type-datasetscalar).

### `InferredGraphDefinition` {#type-inferredgraphdefinition}

<details markdown="1">
<summary>Expand InferredGraphDefinition</summary>

```typescript
export type InferredGraphDefinition = GraphNeighborDefinition | GraphMetricMstDefinition | GraphCandidateMstDefinition | GraphStructuralDefinition;
```

</details>

Related types: [`GraphNeighborDefinition`](#type-graphneighbordefinition) · [`GraphMetricMstDefinition`](#type-graphmetricmstdefinition) · [`GraphCandidateMstDefinition`](#type-graphcandidatemstdefinition) · [`GraphStructuralDefinition`](#type-graphstructuraldefinition).

### `InferredGraphSource` {#type-inferredgraphsource}

<details markdown="1">
<summary>Expand InferredGraphSource</summary>

```typescript
export interface InferredGraphSource {
  readonly nodeKey: GraphKeyField; readonly ruleId: string; readonly attributes?: readonly string[];
  readonly maxNodes?: number; readonly maxEdges?: number;
}
```

</details>

Related types: [`GraphKeyField`](#type-graphkeyfield).

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
  method?: MeanConfidenceIntervalMethod;
  level?: number;
  missing?: "error" | "drop";
  as?: IntervalOutputFields;
}
```

</details>

Related types: [`IntervalCenter`](#type-intervalcenter) · [`IntervalExtent`](#type-intervalextent) · [`MeanConfidenceIntervalMethod`](#type-meanconfidenceintervalmethod) · [`IntervalOutputFields`](#type-intervaloutputfields).

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
  guides?: false | CartesianSeparateGuideOptions;
};
```

</details>

Related types: [`ErrorBarOffsetChannel`](#type-errorbaroffsetchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`IntervalPlotErrorBarOptions`](#type-intervalploterrorbaroptions) · [`CartesianSeparateGuideOptions`](#type-cartesianseparateguideoptions).

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
  channel: "x" | "y" | "both";
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

### `LayerPlotSpecification` {#type-layerplotspecification}

<details markdown="1">
<summary>Expand LayerPlotSpecification</summary>

```typescript
export type LayerPlotSpecification = {
  [Action in AdjacentPlotSpecification["action"]]: {
    action: Action;
    inherit?: { color?: boolean };
    options?: Partial<NonNullable<Extract<AdjacentPlotSpecification, { action: Action }>["options"]>> & { guides?: false };
  }
}[AdjacentPlotSpecification["action"]];
```

</details>

Related types: [`AdjacentPlotSpecification`](#type-adjacentplotspecification).

### `LayoutFlowOptions` {#type-layoutflowoptions}

<details markdown="1">
<summary>Expand LayoutFlowOptions</summary>

```typescript
export interface LayoutFlowOptions {
  readonly id: string; readonly graph?: string; readonly method: "dag" | "cyclic"; readonly options?: FlowLayoutOptions;
}
```

</details>

Related types: [`FlowLayoutOptions`](#type-flowlayoutoptions).

### `LayoutGraphOptions` {#type-layoutgraphoptions}

<details markdown="1">
<summary>Expand LayoutGraphOptions</summary>

```typescript
export type LayoutGraphOptions = { readonly id: string; readonly graph?: string } &
  ({ readonly method: "fixed"; readonly options: GraphFixedOptions }
  | { readonly method: "circular"; readonly options?: GraphCircularOptions }
  | { readonly method: "force"; readonly options?: GraphForceOptions });
```

</details>

Related types: [`GraphFixedOptions`](#type-graphfixedoptions) · [`GraphCircularOptions`](#type-graphcircularoptions) · [`GraphForceOptions`](#type-graphforceoptions).

### `LayoutHierarchyOptions` {#type-layouthierarchyoptions}

<details markdown="1">
<summary>Expand LayoutHierarchyOptions</summary>

```typescript
export type LayoutHierarchyOptions = { id: string; hierarchy?: string; order?: HierarchyOrder } &
  ({ method: "partition"; options?: { maxNodes?: number } }
  | { method: "tree"; options: HierarchyTreeOptions }
  | { method: "treemap"; options: HierarchyTreemapOptions });
/** The method remains fixed; supplied options patch its existing layout intent. */
```

</details>

Related types: [`HierarchyOrder`](#type-hierarchyorder) · [`HierarchyTreeOptions`](#type-hierarchytreeoptions) · [`HierarchyTreemapOptions`](#type-hierarchytreemapoptions).

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
  /** Even-length non-negative finite dash sequence; [] restores a solid frame. */
  strokeDash?: readonly number[];
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

### `LegendLabelEditStyle` {#type-legendlabeleditstyle}

<details markdown="1">
<summary>Expand LegendLabelEditStyle</summary>

```typescript
export interface LegendLabelEditStyle extends LegendTextOptions { visible?: boolean; }
```

</details>

Related types: [`LegendTextOptions`](#type-legendtextoptions).

### `LegendOptions` {#type-legendoptions}

<details markdown="1">
<summary>Expand LegendOptions</summary>

```typescript
export interface LegendOptions {
  /** Positive sample window height. Clips point-bearing glyphs without changing mapped area. */
  clipHeight?: number;
  /** Combine size/shape, continuous color/size, or interval color/stroke + size + ordinal shape samples. Omission retains separate blocks. */
  combine?: "separate" | "size-shape" | "color-size" | "color-size-shape";
  /** Continuous color only. Omission creates the existing gradient; symbols samples the same scale without changing marks. */
  representation?: "gradient" | "symbols";
  /** Categorical, interval, size, or stroke-width layout. Defaults to edge; legacy-bottom is categorical and requires bottom position. */
  layout?: "edge" | "legacy-bottom";
  /** Categorical and ordinal-size display limit; omitted or false shows every item. */
  overflow?: false | { maxItems: number; summary?: "ellipsis-count"; summarySymbol?: "first-hidden" };
  /** Categorical item order; preserves the appearance scale's assignments. */
  order?: LegendOrder;
  target?: string;
  /** Exact requested content; omission infers encoded point color/shape/size. Explicit subsets include size only when listed. */
  channels?: readonly ("color" | "stroke" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
  /** Outside right/left: complete legend stack top aligns with the plot top, including borders and excluding chart titles. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Arrange every legend block owned by the selected target. Item direction and columns remain independent. */
  blockLayout?: "row" | "column" | "wrap";
  /** Occupied group top-left relative to the plot. Cannot be supplied with position, align, offset, or alongOffset in the same call. */
  at?: { x: number; y: number };
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Gradient orientation is independent of position; auto is gradient-only. Categorical sides require vertical. */
  direction?: "horizontal" | "vertical";
  /** Categorical legends accept a positive column count on every supported position. */
  columns?: number;
  /** Signed logical pixels along the edge: right for top/bottom and in-plot corners, down for left/right. */
  alongOffset?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  /** bottom is gradient-only; left retains the existing categorical/opacity rules. */
  titlePosition?: "top" | "left" | "bottom";
  /** false hides the title while retaining its inferred field text. */
  /** LF, CRLF and CR preserve explicit title lines, including blank lines. */
  title?: string | false;
  /** Exact ascending samples for continuous guides, or one representative per interval for color-size-shape. Cannot be combined with count. */
  values?: readonly number[];
  count?: number;
  /** Body-only opacity defaults to 1; edits preserve omitted fields. */
  gradient?: { length?: number; thickness?: number; opacity?: number };
  symbol?: LegendSymbolRecipe;
  labels?: LegendTextOptions;
  /** New categorical+size blocks share typography on every edge; retained standalone size styles remain independent. */
  titleStyle?: LegendTitleStyleOptions;
  /** Vertical items default to 18 logical pixels; the pitch grows to fit samples and labels. */
  itemGap?: number;
  /** Non-negative gap between occupied item rows; overrides vertical itemGap pitch. Item legends in edge layout only. */
  rowPadding?: number;
  /** Non-negative gap between visible title and body bounds; legacy-bottom is excluded. */
  titlePadding?: number;
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
  | { type: "line"; length?: number; lineWidth?: number; opacity?: number }
  | {
      type: "point";
      shape?: "circle";
      size?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      type: "swatch";
      width?: number;
      height?: number;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
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
  | { type?: "point"; radius?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
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
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
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

### `LegendTitleEditStyle` {#type-legendtitleeditstyle}

<details markdown="1">
<summary>Expand LegendTitleEditStyle</summary>

```typescript
export interface LegendTitleEditStyle extends LegendTitleStyleEditOptions { visible?: boolean; }
```

</details>

Related types: [`LegendTitleStyleEditOptions`](#type-legendtitlestyleeditoptions).

### `LegendTitleStyleEditOptions` {#type-legendtitlestyleeditoptions}

<details markdown="1">
<summary>Expand LegendTitleStyleEditOptions</summary>

```typescript
export interface LegendTitleStyleEditOptions extends Omit<LegendTitleStyleOptions, "align"> {
  align?: "left" | "center" | "right" | "auto";
}
```

</details>

Related types: [`LegendTitleStyleOptions`](#type-legendtitlestyleoptions).

### `LegendTitleStyleOptions` {#type-legendtitlestyleoptions}

<details markdown="1">
<summary>Expand LegendTitleStyleOptions</summary>

```typescript
export interface LegendTitleStyleOptions {
  /** Align a top title inside its measured content block; omission keeps native layout defaults. */
  align?: "left" | "center" | "right";
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
type LineCategoricalColorChannel<Scale = NonPointCategoricalColorScaleOptions> =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: Scale;
      palette?: Palette;
    };
```

</details>

Related types: [`NonPointCategoricalColorScaleOptions`](#type-nonpointcategoricalcolorscaleoptions) · [`Palette`](#type-palette).

### `LinePlotCommonOptions` {#type-lineplotcommonoptions}

<details markdown="1">
<summary>Expand LinePlotCommonOptions</summary>

```typescript
interface LinePlotCommonOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  color?: LineCategoricalColorChannel<CategoricalColorScaleOptions>;
  groupBy?: string | readonly [string, ...string[]];
  strokeDash?: BasicStrokeDashChannel;
  line?: StrokeStyleDetails & {
    clip?: boolean;
    missing?: "error" | "break";
    strokeWidth?: number;
    curve?: CurveInterpolation;
    tension?: number;
    stroke?: string;
    opacity?: number;
    closed?: false;
  };
 }
```

</details>

Related types: [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel) · [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `LinePlotGuides` {#type-lineplotguides}

<details markdown="1">
<summary>Expand LinePlotGuides</summary>

```typescript
type LinePlotGuides<Continuous extends "horizontal" | "vertical"> = Omit<CPathGuides, "legend" | "grid"> & {
  grid?: false | (Omit<CartesianGridOptions, Continuous> & {
    [Direction in Continuous]?: boolean | (Omit<GridDirectionOptions, "bandPosition"> & { bandPosition?: never });
  });
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder | { channel: Continuous extends "horizontal" ? "x" : "y"; values?: never } });
};
```

</details>

Related types: [`CPathGuides`](#type-cpathguides) · [`CartesianGridOptions`](#type-cartesiangridoptions) · [`GridDirectionOptions`](#type-griddirectionoptions) · [`PathLegendOptions`](#type-pathlegendoptions) · [`LegendValueOrder`](#type-legendvalueorder).

### `LineXPositionChannel` {#type-linexpositionchannel}

<details markdown="1">
<summary>Expand LineXPositionChannel</summary>

```typescript
type LineXPositionChannel =
  | string
  | ({ field: string; bin?: PositionEncodingBase["bin"]; aggregate?: never } & (
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
      | { fieldType: "nominal" | "ordinal"; aggregate?: never; scale?: NonPointCategoricalPositionScaleOptions }
    ));
```

</details>

Related types: [`AggregateOperation`](#type-aggregateoperation) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `LinearGradientPaint` {#type-lineargradientpaint}

<details markdown="1">
<summary>Expand LinearGradientPaint</summary>

```typescript
export interface LinearGradientPaint {
  readonly type: "linear-gradient";
  readonly from: LinearGradientPoint;
  readonly to: LinearGradientPoint;
  readonly stops: readonly [
    LinearGradientStop,
    LinearGradientStop,
    ...LinearGradientStop[]
  ];
}
```

</details>

Related types: [`LinearGradientPoint`](#type-lineargradientpoint) · [`LinearGradientStop`](#type-lineargradientstop).

### `LinearGradientPoint` {#type-lineargradientpoint}

<details markdown="1">
<summary>Expand LinearGradientPoint</summary>

```typescript
export interface LinearGradientPoint {
  readonly x: number;
  readonly y: number;
}
```

</details>

### `LinearGradientStop` {#type-lineargradientstop}

<details markdown="1">
<summary>Expand LinearGradientStop</summary>

```typescript
export interface LinearGradientStop {
  readonly offset: number;
  readonly color: string;
}
```

</details>

### `LinearNiceCountOptions` {#type-linearnicecountoptions}

<details markdown="1">
<summary>Expand LinearNiceCountOptions</summary>

```typescript
export interface LinearNiceCountOptions {
  readonly count: number;
}
```

</details>

### `LookupDataOptions` {#type-lookupdataoptions}

<details markdown="1">
<summary>Expand LookupDataOptions</summary>

```typescript
export interface LookupDataOptions {
  id: string;
  source?: string;
  field: string;
  lookup: { data: string; key: string; fields: readonly string[]; as?: readonly string[] };
}
```

</details>

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

### `MarkOutline` {#type-markoutline}

<details markdown="1">
<summary>Expand MarkOutline</summary>

```typescript
export interface MarkOutline { color: string; width: number; }
```

</details>

### `MarkSelectionSelector` {#type-markselectionselector}

<details markdown="1">
<summary>Expand MarkSelectionSelector</summary>

```typescript
export type MarkSelectionSelector = (MarkSelector & { where?: never; region?: never; screenPolygon?: never; screenAngles?: never }) | {
  grain?: "item" | "stack";
  /** Boolean v2 expression evaluated over fields uniquely defined at the final item grain. */
  where: ComputedExpressionV2;
  items?: never; rows?: never; field?: never; channel?: never; property?: never; op?: never; empty?: never; region?: never; screenPolygon?: never; screenAngles?: never;
} | {
  grain?: "item" | "stack";
  /** Intersection of final semantic channels; each axis is a range union or category set. */
  region: SelectionRegion;
  /** Normalized clockwise start/end radians; theta-region metadata only. */
  screenAngles?: readonly [number, number];
  items?: never; rows?: never; field?: never; channel?: never; property?: never; op?: never; empty?: never; where?: never; screenPolygon?: never;
} | {
  grain?: "item" | "stack";
  items: readonly string[];
  empty?: "none" | "all";
  /** CSS-local polygon metadata; keys alone define persistent selection membership. */
  screenPolygon: readonly { readonly x: number; readonly y: number }[];
  screenAngles?: never;
  rows?: never; field?: never; channel?: never; property?: never; op?: never; where?: never; region?: never;
} | {
  grain?: "item" | "stack"; items: readonly string[]; empty?: "none" | "all";
  /** Normalized clockwise start/end radians; keys define persistent membership. */
  screenAngles: readonly [number, number];
  screenPolygon?: never; rows?: never; field?: never; channel?: never; property?: never; op?: never; where?: never; region?: never;
};
```

</details>

Related types: [`MarkSelector`](#type-markselector) · [`ComputedExpressionV2`](#type-computedexpressionv2) · [`SelectionRegion`](#type-selectionregion).

### `MarkSelector` {#type-markselector}

<details markdown="1">
<summary>Expand MarkSelector</summary>

```typescript
export type MarkSelector = { grain?: "item" | "stack"; items: readonly string[]; empty?: "none" | "all"; rows?: never; field?: never; channel?: never; property?: never; op?: never; } | { items?: never; empty?: never; grain?: "item" | "stack"; rows: { data: string; indices: readonly number[] }; } | {
  items?: never; empty?: never;
  grain?: "item" | "stack";
} & (
  | { field: string; channel?: never; property?: never }
  | { channel: "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "group" | "opacity"; field?: never; property?: never }
  | { property: MarkGraphicProperty; field?: never; channel?: never }
) & (
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: unknown }
  | { op: "oneOf"; values: readonly unknown[] }
  | ({ op: "range" } & FilterRange)
  | {
      op: "min" | "max";
      count?: number;
      groupBy?: string | readonly string[];
      ties?: "first" | "all";
    }
);
```

</details>

Related types: [`MarkGraphicProperty`](#type-markgraphicproperty) · [`FilterRange`](#type-filterrange).

### `MarkShadow` {#type-markshadow}

<details markdown="1">
<summary>Expand MarkShadow</summary>

```typescript
export interface MarkShadow { color: string; offsetX?: number; offsetY?: number; blurRadius?: number; }
```

</details>

### `MarkVisibilityOptions` {#type-markvisibilityoptions}

<details markdown="1">
<summary>Expand MarkVisibilityOptions</summary>

```typescript
export interface MarkVisibilityOptions {
  target?: string;
  channel: LegendChannel;
  values: readonly (string | number | boolean)[];
  visible: boolean;
  /** all-data means the user-filtered input before visibility. Control legends retain its mapping. */
  scaleDomain: 'visible-data' | 'all-data';
}
```

</details>

Related types: [`LegendChannel`](#type-legendchannel).

### `MeanConfidenceIntervalMethod` {#type-meanconfidenceintervalmethod}

<details markdown="1">
<summary>Expand MeanConfidenceIntervalMethod</summary>

```typescript
export type MeanConfidenceIntervalMethod = ConfidenceIntervalMethod | BootstrapMeanIntervalMethod;
```

</details>

Related types: [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`BootstrapMeanIntervalMethod`](#type-bootstrapmeanintervalmethod).

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

### `NamedCompleteAxis` {#type-namedcompleteaxis}

<details markdown="1">
<summary>Expand NamedCompleteAxis</summary>

```typescript
export type NamedCompleteAxis<P extends string> = CompleteAxisOptions<P> & { id: string };
```

</details>

Related types: [`CompleteAxisOptions`](#type-completeaxisoptions).

### `NavigateProjectionOptions` {#type-navigateprojectionoptions}

<details markdown="1">
<summary>Expand NavigateProjectionOptions</summary>

```typescript
export interface NavigateProjectionOptions { readonly target?: string; readonly operation: GeoCameraOperation; }
```

</details>

Related types: [`GeoCameraOperation`](#type-geocameraoperation).

### `NonCartesianStrokeDashChannel` {#type-noncartesianstrokedashchannel}

<details markdown="1">
<summary>Expand NonCartesianStrokeDashChannel</summary>

```typescript
type NonCartesianStrokeDashChannel = BasicStrokeDashChannel extends infer T
  ? T extends { field: string } ? Omit<T, "scale"> & { scale?: Omit<DashScaleOptions, "unknown"> } : T
  : never;
```

</details>

Related types: [`BasicStrokeDashChannel`](#type-basicstrokedashchannel) · [`DashScaleOptions`](#type-dashscaleoptions).

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
  "id" | "interpolate" | "whitePoint" | "gamma" | "midpoint" | "clamp" | "reverse"
> & {
  base?: number;
  constant?: number;
  domain?: "auto" | readonly [unknown, unknown];
  range?: "auto" | readonly [string, string, ...string[]] | { readonly palette: Palette };
  palette?: Palette;
} & (
  | { type: "pow"; exponent?: number }
  | { type?: "sequential" | "log" | "sqrt" | "symlog"; exponent?: never }
);
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`Palette`](#type-palette).

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
  "id" | "zero" | "clamp" | "reverse" |
  "base" | "exponent" | "constant"
> & {
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
} & (
  | { type?: "linear"; nice?: boolean | LinearNiceCountOptions }
  | { type: Exclude<QuantitativePositionScaleType, "linear">; nice?: boolean }
);
```

</details>

Related types: [`ScaleFields`](#type-scalefields) · [`LinearNiceCountOptions`](#type-linearnicecountoptions) · [`QuantitativePositionScaleType`](#type-quantitativepositionscaletype).

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
  "id" | "clamp" | "reverse"
> & {
  type?: "time";
  nice?: boolean;
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
  "base" | "type" | "nice"
> & (
  | { type?: "linear"; nice?: boolean | LinearNiceCountOptions }
  | { type: Exclude<ZeroSupportingPositionScaleType, "linear">; nice?: boolean }
);
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`LinearNiceCountOptions`](#type-linearnicecountoptions) · [`ZeroSupportingPositionScaleType`](#type-zerosupportingpositionscaletype).

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
export type NumericFormatString =
  | `.${ValueFormatPrecision}${"f" | "%" | "e"}`
  | ","
  | `,.${ValueFormatPrecision}f`;
```

</details>

Related types: [`ValueFormatPrecision`](#type-valueformatprecision).

### `OHLCBodyPaint` {#type-ohlcbodypaint}

<details markdown="1">
<summary>Expand OHLCBodyPaint</summary>

```typescript
export interface OHLCBodyPaint {
  readonly upFill?: FillPaint; readonly downFill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number;
  readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `OHLCColor` {#type-ohlccolor}

<details markdown="1">
<summary>Expand OHLCColor</summary>

```typescript
export type OHLCColor = string | { readonly field: string; readonly fieldType?: "nominal" | "ordinal"; readonly scale?: CategoricalColorScaleOptions; readonly palette?: Palette }
  | { readonly field: string; readonly fieldType: "quantitative"; readonly scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions; readonly palette?: Palette }
  | { readonly field: string; readonly fieldType: "temporal"; readonly scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" }; readonly palette?: Palette };
```

</details>

Related types: [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions).

### `OHLCLabelPaint` {#type-ohlclabelpaint}

<details markdown="1">
<summary>Expand OHLCLabelPaint</summary>

```typescript
export interface OHLCLabelPaint extends CalendarLabelPaint { readonly content?: "open" | "close" | "low" | "high"; readonly format?: string; readonly offset?: number; }
```

</details>

Related types: [`CalendarLabelPaint`](#type-calendarlabelpaint).

### `OHLCStemPaint` {#type-ohlcstempaint}

<details markdown="1">
<summary>Expand OHLCStemPaint</summary>

```typescript
export type OHLCStemPaint = Omit<OHLCBodyPaint, "upFill" | "downFill">;
```

</details>

Related types: [`OHLCBodyPaint`](#type-ohlcbodypaint).

### `OHLCWidth` {#type-ohlcwidth}

<details markdown="1">
<summary>Expand OHLCWidth</summary>

```typescript
export type OHLCWidth = BarWidthOptions extends infer T ? T extends unknown ? Omit<T, "target"> : never : never;
```

</details>

Related types: [`BarWidthOptions`](#type-barwidthoptions).

### `OHLCX` {#type-ohlcx}

<details markdown="1">
<summary>Expand OHLCX</summary>

```typescript
export type OHLCX = string | { readonly field: string } & (
  { readonly fieldType?: "quantitative"; readonly scale?: NonPointQuantitativePositionScaleOptions }
  | { readonly fieldType: "temporal"; readonly temporalUnit?: TemporalInputUnit; readonly scale?: NonPointTemporalPositionScaleOptions }
  | { readonly fieldType: "nominal" | "ordinal"; readonly scale?: NonPointCategoricalPositionScaleOptions });
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `ObservedGraphDefinition` {#type-observedgraphdefinition}

<details markdown="1">
<summary>Expand ObservedGraphDefinition</summary>

```typescript
export interface ObservedGraphDefinition {
  readonly nodeKey: GraphKeyField;
  readonly source: GraphKeyField;
  readonly target: GraphKeyField;
  readonly edgeKey?: GraphKeyField;
  readonly weight?: string;
  readonly attributes?: readonly string[];
  readonly directed?: boolean;
  readonly selfLoops?: boolean;
  readonly maxNodes?: number;
  readonly maxEdges?: number;
}
```

</details>

Related types: [`GraphKeyField`](#type-graphkeyfield).

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
  "id" | "zero" | "clamp" | "reverse"
> & {
  nice?: boolean;
  type?: "linear";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  unknown?: number;
};

/** Constant or quantitative opacity on Point, Rule, Line, Area, Bar, or row-owned Rect marks.
 * Line and Area fields must be constant within each existing path series. */
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

### `OverlayLineAppearance` {#type-overlaylineappearance}

<details markdown="1">
<summary>Expand OverlayLineAppearance</summary>

```typescript
export interface OverlayLineAppearance extends StrokeStyleDetails {
  clip?: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  curve?: CurveInterpolation;
  tension?: number;
  closed?: boolean;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`CurveInterpolation`](#type-curveinterpolation).

### `OverlayPointAppearance` {#type-overlaypointappearance}

<details markdown="1">
<summary>Expand OverlayPointAppearance</summary>

```typescript
export interface OverlayPointAppearance extends StrokeStyleDetails {
  clip?: boolean;
  shape?: PointShape;
  fill?: FillPaint;
  stroke?: FilledMarkStroke;
  strokeWidth?: number;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`PointShape`](#type-pointshape) · [`FillPaint`](#type-fillpaint) · [`FilledMarkStroke`](#type-filledmarkstroke).

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
      ticks?: AxisTickStyleOptions; labels?: AxisLabelStyleOptions & DisplayLabelOptions;
    }); ticks?: never; labels?: never }
  | { ticks?: false | ParallelAxisTicksOptions; labels?: false | ParallelAxisLabelsOptions;
      ticksAndLabels?: never }
);
```

</details>

Related types: [`AxisLineStyleOptions`](#type-axislinestyleoptions) · [`ParallelAxisTitleOptions`](#type-parallelaxistitleoptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions) · [`ParallelAxisTicksOptions`](#type-parallelaxisticksoptions) · [`ParallelAxisLabelsOptions`](#type-parallelaxislabelsoptions).

### `ParallelAxisLabelsOptions` {#type-parallelaxislabelsoptions}

<details markdown="1">
<summary>Expand ParallelAxisLabelsOptions</summary>

```typescript
export type ParallelAxisLabelsOptions = AxisLabelStyleOptions & DisplayLabelOptions & ParallelAxisTickSelection;
```

</details>

Related types: [`AxisLabelStyleOptions`](#type-axislabelstyleoptions) · [`DisplayLabelOptions`](#type-displaylabeloptions) · [`ParallelAxisTickSelection`](#type-parallelaxistickselection).

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
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
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
      scale?: QuantitativePositionScaleOptions;
    }
  | {
      fieldType: "ordinal";
      scale?: CategoricalPositionScaleOptions;
    }
  | {
      fieldType?: undefined;
      scale?: QuantitativePositionScaleOptions | CategoricalPositionScaleOptions;
    }
));
```

</details>

Related types: [`QuantitativePositionScaleOptions`](#type-quantitativepositionscaleoptions) · [`CategoricalPositionScaleOptions`](#type-categoricalpositionscaleoptions).

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

### `ParameterDataUpdateRequest` {#type-parameterdataupdaterequest}

<details markdown="1">
<summary>Expand ParameterDataUpdateRequest</summary>

```typescript
export interface ParameterDataUpdateRequest {
  readonly kind: "parameter"; readonly target: string; readonly value: ParameterValue;
}
```

</details>

Related types: [`ParameterValue`](#type-parametervalue).

### `ParameterDefinition` {#type-parameterdefinition}

<details markdown="1">
<summary>Expand ParameterDefinition</summary>

```typescript
type ParameterDefinition<T extends ParameterType, V> =
  | { readonly type?: T; readonly value: V; readonly nullable?: boolean }
  | { readonly type: T; readonly value: null; readonly nullable: true };
```

</details>

Related types: [`ParameterType`](#type-parametertype).

### `ParameterType` {#type-parametertype}

<details markdown="1">
<summary>Expand ParameterType</summary>

```typescript
export type ParameterType = "number" | "string" | "boolean";
```

</details>

### `ParameterValue` {#type-parametervalue}

<details markdown="1">
<summary>Expand ParameterValue</summary>

```typescript
export type ParameterValue = number | string | boolean | null;
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

### `ParseTimeFormat` {#type-parsetimeformat}

<details markdown="1">
<summary>Expand ParseTimeFormat</summary>

```typescript
export type ParseTimeFormat = "auto" | "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y";
```

</details>

### `PartitionPlotOptions` {#type-partitionplotoptions}

<details markdown="1">
<summary>Expand PartitionPlotOptions</summary>

```typescript
export interface PartitionPlotOptions {
  id?: string; layout?: string; coordinate?: string; focus?: HierarchyNodeTarget | null;
  rootVisible?: boolean; prunedSelection?: "keep-hidden" | "drop";
  orientation?: "horizontal" | "vertical"; reverseU?: boolean; reverseV?: boolean;
  padding?: number | readonly [number, number]; innerRadius?: number; outerRadius?: number | "auto";
  startAngle?: number; sweep?: number; direction?: "clockwise" | "counterclockwise";
  radiusPolicy?: "equal-depth" | "equal-depth-area"; clip?: boolean;
  cells?: HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] };
  labels?: false | (HierarchyLabelsOptions & { minWidth?: number; minArcLength?: number });
}
```

</details>

Related types: [`HierarchyNodeTarget`](#type-hierarchynodetarget) · [`HierarchyBodyPaint`](#type-hierarchybodypaint) · [`HierarchyLabelsOptions`](#type-hierarchylabelsoptions).

### `PathFillRule` {#type-pathfillrule}

<details markdown="1">
<summary>Expand PathFillRule</summary>

```typescript
export type PathFillRule = "nonzero" | "evenodd";
```

</details>

### `PathLegendOptions` {#type-pathlegendoptions}

<details markdown="1">
<summary>Expand PathLegendOptions</summary>

```typescript
type PathLegendOptions = Omit<
  LegendOptions,
  "symbol" | "gradient" | "count" | "values" | "labels" | "representation" | "combine" | "titlePosition"
> & {
  titlePosition?: "top" | "left";
  combine?: "separate";
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

### `PatternPaint` {#type-patternpaint}

<details markdown="1">
<summary>Expand PatternPaint</summary>

```typescript
export interface PatternPaint {
  readonly type: "pattern";
  readonly style?: "solid" | "diagonal" | "antidiagonal" | "horizontal" | "vertical" | "cross" | "dots";
  readonly pitch?: number;
  readonly strokeWidth?: number;
  readonly phase?: readonly [number, number];
  readonly foreground?: string;
  readonly background?: string;
  readonly coordinateSpace?: "plot" | "object";
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
  SeparateFilledLegendOptions,
  "count" | "values" | "gradient" | "channels" | "order" | "labels" | "representation" | "symbol" | "titlePosition"
> & {
  titlePosition?: "top" | "left";
  symbol?: FilledLegendSymbolRecipe;
  channels?: readonly ["color"];
  order?: LegendValueOrder | { channel: "theta"; values?: never };
  labels?: CategoricalLegendTextOptions;
};
```

</details>

Related types: [`SeparateFilledLegendOptions`](#type-separatefilledlegendoptions) · [`FilledLegendSymbolRecipe`](#type-filledlegendsymbolrecipe) · [`LegendValueOrder`](#type-legendvalueorder) · [`CategoricalLegendTextOptions`](#type-categoricallegendtextoptions).

### `PieRadiusChannel` {#type-pieradiuschannel}

<details markdown="1">
<summary>Expand PieRadiusChannel</summary>

```typescript
export type PieRadiusChannel = string | {
  scale?: RadiusScaleOptions;
} & ({ field: string; aggregate?: "sum" } | { field?: never; aggregate: "count" });
```

</details>

Related types: [`RadiusScaleOptions`](#type-radiusscaleoptions).

### `PivotColumn` {#type-pivotcolumn}

<details markdown="1">
<summary>Expand PivotColumn</summary>

```typescript
export interface PivotColumn {
  readonly value: string | number | boolean | null;
  readonly as: string;
}
```

</details>

### `PivotDataOptions` {#type-pivotdataoptions}

<details markdown="1">
<summary>Expand PivotDataOptions</summary>

```typescript
export type PivotDataOptions = {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly string[];
  columns?: readonly PivotColumn[];
  fill?: number | null;
} & (
  | { op?: PivotNumericOperation; value: string }
  | { op: "count"; value?: never }
);
```

</details>

Related types: [`PivotColumn`](#type-pivotcolumn) · [`PivotNumericOperation`](#type-pivotnumericoperation).

### `PivotNumericOperation` {#type-pivotnumericoperation}

<details markdown="1">
<summary>Expand PivotNumericOperation</summary>

```typescript
export type PivotNumericOperation = "none" | "sum" | "mean" | "min" | "max";
```

</details>

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

### `PointPolygonShape` {#type-pointpolygonshape}

<details markdown="1">
<summary>Expand PointPolygonShape</summary>

```typescript
export type PointPolygonShape = {
  polygon: readonly { x: number; y: number }[];
  normalization?: "area" | "radius";
};
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
  | "wye"
  | "wedge"
  | "arrow"
  | PointPolygonShape;
```

</details>

Related types: [`PointPolygonShape`](#type-pointpolygonshape).

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
type PolarPointLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "order"> & {
  order?: PolarLegendOrder;
};
```

</details>

Related types: [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions) · [`PolarLegendOrder`](#type-polarlegendorder).

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
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
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
  color?: RectColorChannel;
}
```

</details>

Related types: [`HeatmapBaseOptions`](#type-heatmapbaseoptions) · [`HeatmapCategoryPositionChannel`](#type-heatmapcategorypositionchannel) · [`RectColorChannel`](#type-rectcolorchannel).

### `PreparedDataUpdate` {#type-prepareddataupdate}

<details markdown="1">
<summary>Expand PreparedDataUpdate</summary>

```typescript
export interface PreparedDataUpdate<Kind extends DataUpdateRequest["kind"] = DataUpdateRequest["kind"]> {
  readonly [preparedDataUpdate]: Kind;
  readonly kind: "data-update";
  readonly request: DataUpdateDescriptors[Kind];
}
```

</details>

Related types: [`DataUpdateRequest`](#type-dataupdaterequest) · [`DataUpdateDescriptors`](#type-dataupdatedescriptors).

### `PreparedFontResource` {#type-preparedfontresource}

<details markdown="1">
<summary>Expand PreparedFontResource</summary>

```typescript
export interface PreparedFontResource<Kind extends "create" | "replace" = "create" | "replace"> {
  readonly [preparedFontResourceBrand]: Kind; readonly kind: "font-resource";
  readonly request: Kind extends "create" ? Readonly<{ kind: "create"; id: string }> : Readonly<{ kind: "replace"; target: string }>;
}
```

</details>

### `PreparedGraphEdgeRoutes` {#type-preparedgraphedgeroutes}

<details markdown="1">
<summary>Expand PreparedGraphEdgeRoutes</summary>

```typescript
export interface PreparedGraphEdgeRoutes {
  readonly [preparedGraphEdgeRoutes]: true; readonly kind: "edge-route-preparation";
  readonly request: { readonly kind: "create" | "edit"; readonly id: string }; readonly inputHash: string;
}
```

</details>

### `PreparedImageResource` {#type-preparedimageresource}

<details markdown="1">
<summary>Expand PreparedImageResource</summary>

```typescript
export interface PreparedImageResource<Kind extends "create" | "replace" = "create" | "replace"> {
  readonly [preparedImageResourceBrand]: Kind;
  readonly kind: "image-resource";
  readonly request: Kind extends "create" ? Readonly<{ kind: "create"; id: string }> : Readonly<{ kind: "replace"; target: string }>;
}
```

</details>

### `PreparedTextMetrics` {#type-preparedtextmetrics}

<details markdown="1">
<summary>Expand PreparedTextMetrics</summary>

```typescript
export interface PreparedTextMetrics {
  readonly [preparedTextMetricsBrand]: true; readonly kind: "text-metrics";
  readonly request: Readonly<{ id: string; fonts: readonly string[] }>;
}
```

</details>

### `ProjectionEditFittedOptions` {#type-projectioneditfittedoptions}

<details markdown="1">
<summary>Expand ProjectionEditFittedOptions</summary>

```typescript
type ProjectionEditFittedOptions<Parameters = ProjectionParameters> = Parameters extends unknown
  ? Partial<Omit<Parameters, "scalePx" | "translatePx">> & { readonly fit: ProjectionFitOptions; readonly scalePx?: never; readonly translatePx?: never } : never;
/** Type changes start from the new type defaults. Explicit scale/translation edits detach a previous fit. */
```

</details>

Related types: [`ProjectionParameters`](#type-projectionparameters) · [`ProjectionFitOptions`](#type-projectionfitoptions).

### `ProjectionFitOptions` {#type-projectionfitoptions}

<details markdown="1">
<summary>Expand ProjectionFitOptions</summary>

```typescript
export interface ProjectionFitOptions {
  readonly geometry?: string; readonly width: number; readonly height: number; readonly padding?: number; readonly pointScale?: number;
}
```

</details>

### `ProjectionFittedOptions` {#type-projectionfittedoptions}

<details markdown="1">
<summary>Expand ProjectionFittedOptions</summary>

```typescript
type ProjectionFittedOptions<Parameters = ProjectionParameters> = Parameters extends unknown
  ? Omit<Parameters, "scalePx" | "translatePx"> & { readonly fit: ProjectionFitOptions; readonly scalePx?: never; readonly translatePx?: never } : never;
```

</details>

Related types: [`ProjectionParameters`](#type-projectionparameters) · [`ProjectionFitOptions`](#type-projectionfitoptions).

### `ProjectionParameters` {#type-projectionparameters}

<details markdown="1">
<summary>Expand ProjectionParameters</summary>

```typescript
export type ProjectionParameters = ({ readonly type: "identity" } & ProjectionPlaneParameters)
  | ({ readonly type: Exclude<ProjectionType, "identity" | "albers-usa" | "conic-equal-area" | "conic-conformal" | "conic-equidistant"> } & ProjectionSphereParameters)
  | ({ readonly type: "conic-equal-area" | "conic-conformal" | "conic-equidistant"; readonly parallelsDeg?: readonly [number, number] } & ProjectionSphereParameters)
  | { readonly type: "albers-usa"; readonly scalePx?: number; readonly translatePx?: readonly [number, number]; readonly precisionPx?: number };
```

</details>

Related types: [`ProjectionPlaneParameters`](#type-projectionplaneparameters) · [`ProjectionType`](#type-projectiontype) · [`ProjectionSphereParameters`](#type-projectionsphereparameters).

### `ProjectionPlaneParameters` {#type-projectionplaneparameters}

<details markdown="1">
<summary>Expand ProjectionPlaneParameters</summary>

```typescript
export interface ProjectionPlaneParameters {
  readonly scalePx?: number; readonly translatePx?: readonly [number, number]; readonly reflectX?: boolean; readonly reflectY?: boolean;
  readonly clipExtentPx?: readonly [readonly [number, number], readonly [number, number]] | null;
}
```

</details>

### `ProjectionSphereParameters` {#type-projectionsphereparameters}

<details markdown="1">
<summary>Expand ProjectionSphereParameters</summary>

```typescript
export interface ProjectionSphereParameters extends ProjectionPlaneParameters {
  readonly centerDeg?: readonly [number, number]; readonly rotateDeg?: readonly [number, number] | readonly [number, number, number];
  readonly precisionPx?: number; readonly clipAngleDeg?: number | null;
}
```

</details>

Related types: [`ProjectionPlaneParameters`](#type-projectionplaneparameters).

### `ProjectionType` {#type-projectiontype}

<details markdown="1">
<summary>Expand ProjectionType</summary>

```typescript
export type ProjectionType = "mercator" | "equirectangular" | "equal-earth" | "natural-earth" | "orthographic" | "stereographic" | "gnomonic"
  | "azimuthal-equal-area" | "azimuthal-equidistant" | "conic-equal-area" | "conic-conformal" | "conic-equidistant" | "transverse-mercator" | "albers-usa" | "identity";
```

</details>

### `PyramidColor` {#type-pyramidcolor}

<details markdown="1">
<summary>Expand PyramidColor</summary>

```typescript
export type PyramidColor = string | { readonly field: string; readonly fieldType?: "nominal" | "ordinal";
  readonly scale?: CategoricalColorScaleOptions; readonly palette?: Palette; }
  | { readonly field: string; readonly fieldType: "quantitative"; readonly scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions; readonly palette?: Palette; }
  | { readonly field: string; readonly fieldType: "temporal"; readonly scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" }; readonly palette?: Palette; };
```

</details>

Related types: [`CategoricalColorScaleOptions`](#type-categoricalcolorscaleoptions) · [`Palette`](#type-palette) · [`ContinuousColorScaleOptions`](#type-continuouscolorscaleoptions) · [`DiscretizedColorScaleOptions`](#type-discretizedcolorscaleoptions).

### `PyramidLabelPaint` {#type-pyramidlabelpaint}

<details markdown="1">
<summary>Expand PyramidLabelPaint</summary>

```typescript
export interface PyramidLabelPaint extends CalendarLabelPaint { readonly content?: "stage" | "value" | "percent"; readonly format?: string; }
```

</details>

Related types: [`CalendarLabelPaint`](#type-calendarlabelpaint).

### `PyramidLayoutOptions` {#type-pyramidlayoutoptions}

<details markdown="1">
<summary>Expand PyramidLayoutOptions</summary>

```typescript
export type PyramidLayoutOptions = { readonly orientation?: "down" | "up" | "right" | "left"; readonly gap?: number;
  readonly percentBase?: "first" | "total" | "previous"; } &
  ({ readonly encoding?: "width"; readonly lastStage?: "flat" | "point"; readonly taperRatio?: never; }
  | { readonly encoding: "area"; readonly taperRatio?: number; readonly lastStage?: never; });
```

</details>

### `PyramidStagePaint` {#type-pyramidstagepaint}

<details markdown="1">
<summary>Expand PyramidStagePaint</summary>

```typescript
export interface PyramidStagePaint {
  readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number;
  readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

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

### `QuantitativeRangePositionEncodingOptions` {#type-quantitativerangepositionencodingoptions}

<details markdown="1">
<summary>Expand QuantitativeRangePositionEncodingOptions</summary>

```typescript
type QuantitativeRangePositionEncodingOptions = {
  lower: string | { datum: number };
  upper: string | { datum: number };
  target?: string;
  coordinate?: string;
  fieldType?: "quantitative";
  temporalUnit?: never;
  scale?: NonPointQuantitativePositionScaleOptions;
};
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

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
  /** Explicit aggregation into one profile per group. False requires unique series rows. */
  summary?: false | "mean" | "median";
  /** Explicit min-max normalization of each selected dimension across the resulting profiles. Constant dimensions map to zero. */
  normalize?: false | "minmax";
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
  | { field: string; datum?: never; mapping?: false; aggregate?: never; scale?: RadiusScaleOptions }
  /** Constant polar distances are supported by Point marks. */
  | { field?: never; datum: number; mapping?: never; aggregate?: never; scale?: RadiusScaleOptions }
  | { field: string; mapping?: never; aggregate: "sum"; scale?: RadiusScaleOptions }
  | { field?: never; mapping?: never; aggregate: "count"; scale?: RadiusScaleOptions }
  | { field: string; mapping?: RadialMapping; aggregate: "sum"; scale?: MeasuredRadiusScaleOptions }
  | { field?: never; mapping?: RadialMapping; aggregate: "count"; scale?: MeasuredRadiusScaleOptions }
);
```

</details>

Related types: [`RadiusScaleOptions`](#type-radiusscaleoptions) · [`RadialMapping`](#type-radialmapping) · [`MeasuredRadiusScaleOptions`](#type-measuredradiusscaleoptions).

### `RadialGradientPaint` {#type-radialgradientpaint}

<details markdown="1">
<summary>Expand RadialGradientPaint</summary>

```typescript
export interface RadialGradientPaint {
  readonly type: "radial-gradient";
  readonly center: LinearGradientPoint;
  readonly focal?: LinearGradientPoint;
  readonly radius: number;
  readonly stops: readonly [LinearGradientStop, LinearGradientStop, ...LinearGradientStop[]];
}
/** Stroke painted before the fill; white produces a halo. */
```

</details>

Related types: [`LinearGradientPoint`](#type-lineargradientpoint) · [`LinearGradientStop`](#type-lineargradientstop).

### `RadialMapping` {#type-radialmapping}

<details markdown="1">
<summary>Expand RadialMapping</summary>

```typescript
export type RadialMapping = "area" | "radius-length";

/** Automatic linear position-domain rounding density, not a guide tick count. */
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

### `RaincloudColorChannel` {#type-raincloudcolorchannel}

<details markdown="1">
<summary>Expand RaincloudColorChannel</summary>

```typescript
export type RaincloudColorChannel = LineCategoricalColorChannel | { value: string };
```

</details>

Related types: [`LineCategoricalColorChannel`](#type-linecategoricalcolorchannel).

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
type RangePositionEncodingOptions = QuantitativeRangePositionEncodingOptions | {
  lower: string;
  upper: string;
  target?: string;
  coordinate?: string;
  fieldType: "temporal";
  temporalUnit?: TemporalInputUnit;
  scale?: NonPointTemporalPositionScaleOptions;
};
```

</details>

Related types: [`QuantitativeRangePositionEncodingOptions`](#type-quantitativerangepositionencodingoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions).

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
      scale?: Omit<NonPointContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
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
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  clip?: boolean;
  id?: string;
  data?: string;
  missing?: "error" | "skip";
  fill?: FillPaint;
  outline?: MarkOutline | false;
  opacity?: number;
  stroke?: string | false;
  strokeWidth?: number;
}
```

</details>

Related types: [`RectStyleDetails`](#type-rectstyledetails) · [`BlendMode`](#type-blendmode) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline).

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
  placement?: "source" | "plot-last";
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
export type RegressionMethod = "linear" | "polynomial" | "loess" | "exp";
```

</details>

### `RegressionOptions` {#type-regressionoptions}

<details markdown="1">
<summary>Expand RegressionOptions</summary>

```typescript
export type RegressionOptions = RegressionCommonOptions & (
  | (Extract<RegressionParameterOptions, { method: "exp" }> & {
      band?: false;
    })
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
      method: "exp";
      interval?: false;
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      predict?: RegressionPredictOptions;
    }
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
      /** Local polynomial degree; default 1. */
      degree?: 1 | 2;
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

Related types: [`RegressionPredictOptions`](#type-regressionpredictoptions) · [`ConfidenceIntervalMethod`](#type-confidenceintervalmethod) · [`RegressionInterval`](#type-regressioninterval).

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
  guides?: false | ColorMappedPointGuideOptions;
};
```

</details>

Related types: [`RegressionPlotPositionChannel`](#type-regressionplotpositionchannel) · [`BasicColorChannel`](#type-basiccolorchannel) · [`BasicSizeChannel`](#type-basicsizechannel) · [`BasicShapeChannel`](#type-basicshapechannel) · [`CreateScatterPlotOptions`](#type-createscatterplotoptions) · [`ColorMappedPointGuideOptions`](#type-colormappedpointguideoptions).

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

### `RegressionStatisticsDataOptions` {#type-regressionstatisticsdataoptions}

<details markdown="1">
<summary>Expand RegressionStatisticsDataOptions</summary>

```typescript
export interface RegressionStatisticsDataOptions {
  id: string;
  source: string;
}
```

</details>

### `RemoveAxisOptions` {#type-removeaxisoptions}

<details markdown="1">
<summary>Expand RemoveAxisOptions</summary>

```typescript
export interface RemoveAxisOptions {
  target?: string;
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
  /** Keep removed channels out of automatic guides until explicit createLegend restores them. Default false. */
  suppress?: boolean;
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

### `RemoveMarkVisibilityOptions` {#type-removemarkvisibilityoptions}

<details markdown="1">
<summary>Expand RemoveMarkVisibilityOptions</summary>

```typescript
export interface RemoveMarkVisibilityOptions { target?: string; }
```

</details>

### `RemoveParallelAxisOptions` {#type-removeparallelaxisoptions}

<details markdown="1">
<summary>Expand RemoveParallelAxisOptions</summary>

```typescript
export interface RemoveParallelAxisOptions { field: string; target?: string; }
```

</details>

### `RemoveParameterOptions` {#type-removeparameteroptions}

<details markdown="1">
<summary>Expand RemoveParameterOptions</summary>

```typescript
export interface RemoveParameterOptions { readonly id: string; }
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

### `RemoveStoredResourceOptions` {#type-removestoredresourceoptions}

<details markdown="1">
<summary>Expand RemoveStoredResourceOptions</summary>

```typescript
export interface RemoveStoredResourceOptions { kind: StoredResourceKind; id: string; cascade?: boolean; }
```

</details>

Related types: [`StoredResourceKind`](#type-storedresourcekind).

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
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
```

</details>

Related types: [`FacetGap`](#type-facetgap) · [`CompositionAlign`](#type-compositionalign) · [`CompositionPadding`](#type-compositionpadding) · [`FacetScaleResolutions`](#type-facetscaleresolutions) · [`FacetGuideOptions`](#type-facetguideoptions) · [`FacetHeadersOptions`](#type-facetheadersoptions) · [`FacetTopLaneMode`](#type-facettoplanemode).

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

### `ResponsiveCanvasOptions` {#type-responsivecanvasoptions}

<details markdown="1">
<summary>Expand ResponsiveCanvasOptions</summary>

```typescript
export interface ResponsiveCanvasOptions {
  /** Required final inner size. Defaults to 160 by 120 CSS pixels. */
  minPlotSize?: { width: number; height: number };
}
```

</details>

### `ResponsiveLabelOptions` {#type-responsivelabeloptions}

<details markdown="1">
<summary>Expand ResponsiveLabelOptions</summary>

```typescript
export interface ResponsiveLabelOptions {
  /** The declared fallback order. Defaults to wrap, skip, rotate. */
  sequence?: readonly ["wrap", "skip", "rotate"];
  /** Maximum physical lines per retained label; never truncates text. Defaults to 2. */
  maxLines?: number;
  /** Retain source indices 0, stride, 2*stride. Defaults to 2. */
  skipStride?: number;
  /** Tried in order after skipping. Defaults to -45 and -90 degrees. */
  rotationCandidates?: readonly RotationInput[];
}
```

</details>

Related types: [`RotationInput`](#type-rotationinput).

### `ReviseDataOptions` {#type-revisedataoptions}

<details markdown="1">
<summary>Expand ReviseDataOptions</summary>

```typescript
export type ReviseDataOptions<Row extends object> = ({ keys?: never; rowMap?: readonly (number | null)[] }
  | { keys: readonly RowKey[]; rowMap?: never }) & {
  values: readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[];
  schema?: SourceSchemaInput;
  source: string;
  id: string;
};
```

</details>

Related types: [`RowKey`](#type-rowkey) · [`StoredCell`](#type-storedcell) · [`SourceSchemaInput`](#type-sourceschemainput).

### `ReviseDataUpdateRequest` {#type-revisedataupdaterequest}

<details markdown="1">
<summary>Expand ReviseDataUpdateRequest</summary>

```typescript
export interface ReviseDataUpdateRequest {
  readonly kind: "revise"; readonly target: string; readonly id: string;
  readonly rowMap?: readonly (number | null)[];
}
```

</details>

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

### `RowKey` {#type-rowkey}

<details markdown="1">
<summary>Expand RowKey</summary>

```typescript
export type RowKey = RowKeyScalar | readonly RowKeyScalar[];
```

</details>

Related types: [`RowKeyScalar`](#type-rowkeyscalar).

### `RowKeyScalar` {#type-rowkeyscalar}

<details markdown="1">
<summary>Expand RowKeyScalar</summary>

```typescript
export type RowKeyScalar = string | number | bigint | boolean | Date;
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
export type RugGuideOptions = Omit<CartesianGuideOptions, "axes" | "legend" | "grid"> & {
  axes?: false | CAxes;
  grid?: false | ContinuousCartesianGridOptions;
  legend?: false;
};
```

</details>

Related types: [`CartesianGuideOptions`](#type-cartesianguideoptions) · [`CAxes`](#type-caxes) · [`ContinuousCartesianGridOptions`](#type-continuouscartesiangridoptions).

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
  clip?: boolean;
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
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`BlendMode`](#type-blendmode) · [`MarkShadow`](#type-markshadow) · [`DashStyle`](#type-dashstyle) · [`DashPattern`](#type-dashpattern).

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
  nice?: boolean | LinearNiceCountOptions;
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
  whitePoint?: "d65" | "d50";
  /** Finite Cubehelix lightness gamma, including zero and negative values. Defaults to 1. */
  gamma?: number;
  midpoint?: number | "auto";
  unknown?: unknown;
}
```

</details>

Related types: [`RadialMapping`](#type-radialmapping) · [`ScaleType`](#type-scaletype) · [`ScaleRange`](#type-scalerange) · [`LinearNiceCountOptions`](#type-linearnicecountoptions) · [`Palette`](#type-palette) · [`ContinuousColorInterpolation`](#type-continuouscolorinterpolation).

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

### `ScopedActionTarget` {#type-scopedactiontarget}

<details markdown="1">
<summary>Expand ScopedActionTarget</summary>

```typescript
export interface ScopedActionTarget { childPath: readonly string[]; id?: string; /** Persist this action in a facet source, then regenerate its cells. */ facetSource?: true; }
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
} & MarkSelectionSelector;
```

</details>

Related types: [`MarkSelectionSelector`](#type-markselectionselector).

### `SelectionRegion` {#type-selectionregion}

<details markdown="1">
<summary>Expand SelectionRegion</summary>

```typescript
export type SelectionRegion = ({ x?: SelectionRegionAxis; y?: SelectionRegionAxis; x2?: SelectionRegionAxis; y2?: SelectionRegionAxis; theta?: never } &
  ({ x: SelectionRegionAxis } | { y: SelectionRegionAxis } | { x2: SelectionRegionAxis } | { y2: SelectionRegionAxis }))
  | { theta: SelectionRegionAxis; x?: never; y?: never; x2?: never; y2?: never };
```

</details>

Related types: [`SelectionRegionAxis`](#type-selectionregionaxis).

### `SelectionRegionAxis` {#type-selectionregionaxis}

<details markdown="1">
<summary>Expand SelectionRegionAxis</summary>

```typescript
export type SelectionRegionAxis = { ranges: readonly ({ min: number; max: number } & FilterRange)[]; values?: never }
  | { values: readonly (string | number | boolean)[]; ranges?: never };
```

</details>

Related types: [`FilterRange`](#type-filterrange).

### `SeparateFilledLegendOptions` {#type-separatefilledlegendoptions}

<details markdown="1">
<summary>Expand SeparateFilledLegendOptions</summary>

```typescript
type SeparateFilledLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "combine"> & { combine?: "separate" };
```

</details>

Related types: [`DistributiveLegendOmit`](#type-distributivelegendomit) · [`FilledMarkLegendOptions`](#type-filledmarklegendoptions).

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
export type ShapeEncodingOptions =
  | { value: PointShape; target?: string; field?: never; fieldType?: never; scale?: never }
  | {
  value?: never;
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: ShapeScaleOptions;
};
```

</details>

Related types: [`PointShape`](#type-pointshape) · [`ShapeScaleOptions`](#type-shapescaleoptions).

### `ShapeScaleOptions` {#type-shapescaleoptions}

<details markdown="1">
<summary>Expand ShapeScaleOptions</summary>

```typescript
export type ShapeScaleOptions = ScaleFields<"id"> & {
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  /** One entry per domain value; explicit repeated shapes are allowed. Auto uses distinct shapes. */
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
export type SizeEncodingOptions =
  | { value: number; target?: string; field?: never; fieldType?: never; scale?: never }
  | ({
  value?: never;
  field: string;
  target?: string;
} & (
  | { fieldType?: "quantitative"; scale?: SizeScaleOptions }
  | { fieldType: "nominal" | "ordinal"; scale?: CategoricalSizeScaleOptions }
));
```

</details>

Related types: [`SizeScaleOptions`](#type-sizescaleoptions) · [`CategoricalSizeScaleOptions`](#type-categoricalsizescaleoptions).

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
  | (WithoutScaleId<CategoricalSizeScaleOptions> & { type: "ordinal" })
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

Related types: [`WithoutScaleId`](#type-withoutscaleid) · [`CategoricalSizeScaleOptions`](#type-categoricalsizescaleoptions) · [`SizeScaleOptions`](#type-sizescaleoptions).

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
  /** Exact source row key, including an empty string or whitespace. */
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
  id?: string;
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

### `StoredResourceKind` {#type-storedresourcekind}

<details markdown="1">
<summary>Expand StoredResourceKind</summary>

```typescript
export type StoredResourceKind = "persistent-selection" | "parameter" | "data-source" | "hierarchy" | "layout" | "image" | "graph" | "font" | "geometry" | "edge-route" | "projection";
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
      fieldType?: "nominal" | "ordinal";
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

/** Constant value and scale ranges are graphical areas in square pixels. */
```

</details>

Related types: [`StrokeWidthScaleOptions`](#type-strokewidthscaleoptions).

### `StrokeWidthScaleOptions` {#type-strokewidthscaleoptions}

<details markdown="1">
<summary>Expand StrokeWidthScaleOptions</summary>

```typescript
export type StrokeWidthScaleOptions = NonPointQuantitativePositionScaleOptions extends infer T
  ? T extends unknown ? Omit<T, "nice"> & { nice?: boolean } : never
  : never;
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions).

### `SummaryAggregateOptions` {#type-summaryaggregateoptions}

<details markdown="1">
<summary>Expand SummaryAggregateOptions</summary>

```typescript
export interface SummaryAggregateOptions {
  op: AggregateOperation | { op: "ciLower" | "ciUpper"; method: BootstrapMeanIntervalMethod; level?: number };
  field?: string;
  as: string;
}
```

</details>

Related types: [`AggregateOperation`](#type-aggregateoperation) · [`BootstrapMeanIntervalMethod`](#type-bootstrapmeanintervalmethod).

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

### `TargetedOptions` {#type-targetedoptions}

<details markdown="1">
<summary>Expand TargetedOptions</summary>

```typescript
export type TargetedOptions<T> = T | (T extends unknown ? Omit<T, "target"> & { target: ScopedActionTarget | ActionTargetList } : never);
```

</details>

Related types: [`ScopedActionTarget`](#type-scopedactiontarget) · [`ActionTargetList`](#type-actiontargetlist).

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

/** Source-owned Text also accepts Full geographic feature/graticule marks without a dataset.
 * Geographic anchors use the source centroid; field/value text, native styles and label layout retain their existing contracts. */
```

</details>

Related types: [`ValueFormat`](#type-valueformat).

### `TextMarkOptions` {#type-textmarkoptions}

<details markdown="1">
<summary>Expand TextMarkOptions</summary>

```typescript
export interface TextMarkOptions extends StrokeStyleDetails {
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  clip?: boolean;
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
  fill?: FillPaint;
  outline?: MarkOutline | false;
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

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`BlendMode`](#type-blendmode) · [`MarkShadow`](#type-markshadow) · [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`RotationInput`](#type-rotationinput).

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

### `TextOffsetEncodingOptions` {#type-textoffsetencodingoptions}

<details markdown="1">
<summary>Expand TextOffsetEncodingOptions</summary>

```typescript
export type TextOffsetEncodingOptions =
  | { target?: string; value: number; field?: never }
  | { target?: string; field: string; value?: never };
```

</details>

### `TextOverride` {#type-textoverride}

<details markdown="1">
<summary>Expand TextOverride</summary>

```typescript
export interface TextOverride {
  match: { fields?: Readonly<Record<string, string | number | boolean | null>>; channels?: Readonly<Record<string, string | number | boolean | null>> };
  occurrence: number;
  text: string;
}
```

</details>

### `TextPlotPositionChannel` {#type-textplotpositionchannel}

<details markdown="1">
<summary>Expand TextPlotPositionChannel</summary>

```typescript
type TextPlotPositionChannel =
  | string
  | ({ field: string } & PositionScaleBranches<
      NonPointQuantitativePositionScaleOptions,
      NonPointTemporalPositionScaleOptions,
      NonPointCategoricalPositionScaleOptions>)
  | WithoutEncodingTarget<Extract<DatumPositionEncodingOptions, { datum: unknown }>> & { coordinate?: never };
```

</details>

Related types: [`PositionScaleBranches`](#type-positionscalebranches) · [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions) · [`WithoutEncodingTarget`](#type-withoutencodingtarget) · [`DatumPositionEncodingOptions`](#type-datumpositionencodingoptions).

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
  axisLabelGap?: number;
  axisTitleGap?: number;
  legendItemGap?: number;
  palette?: readonly string[];
  patternPalette?: readonly PatternPaint[];
  axisStrokeWidth?: number;
  tickStrokeWidth?: number;
  tickSize?: number;
  gridStrokeWidth?: number;
  fontSize?: number;
  fontWeight?: string | number;
  axisLabel?: string;
  axisLabelFontFamily?: string;
  axisTitleFontFamily?: string;
  axisLabelFontSize?: number;
  axisTitleFontSize?: number;
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

Related types: [`PatternPaint`](#type-patternpaint).

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
  target?: string;
  scale?: ThetaScaleOptions;
  coordinate?: string;
} & (
  /** Arc quantitative fields are sector weights; categorical fields support count or sum. */
  | { field: string; datum?: never; aggregate?: "count" | "sum"; weight?: string }
  /** Constant polar angles are supported by Point marks. */
  | { field?: never; datum: unknown; aggregate?: never; weight?: never }
) & (
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
type TimeAxisDirective = "Y" | "m" | "d" | "b" | "a" | "H" | "M" | "S" | "L";
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
  /** Preserve null or absent inputs as null buckets; defaults to strict errors. */
  missing?: "error" | "null";
  id: string;
  source?: string;
  field: string;
  temporalUnit?: TemporalInputUnit;
  /** Defaults to `${field}_${unit}`; collisions are rejected. */
  as?: string;
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
  /** Explicit hard lines are retained; blank lines reserve spacing without painted text. */
  text: string;
  /** Multiline subtitle with at least one non-empty hard line. */
  subtitle?: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: number;
  /** Signed logical-pixel shift along the selected edge; defaults to zero. */
  alongOffset?: number;
  gap?: number;
  maxWidth?: number;
  /** Both modes keep grapheme clusters intact; hard breaks preserve line spacing. */
  wrap?: "word" | "character";
  lineHeight?: number;
  /** Subtitle-only line spacing; overrides lineHeight without requiring maxWidth. */
  subtitleLineHeight?: number;
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
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
  fontStyle?: "normal" | "italic";
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
```

</details>

### `TopoJSONInput` {#type-topojsoninput}

<details markdown="1">
<summary>Expand TopoJSONInput</summary>

```typescript
export interface TopoJSONInput extends Readonly<Record<string, unknown>> {
  readonly type: "Topology"; readonly objects: Readonly<Record<string, TopologyGeometry>>;
  readonly arcs: readonly (readonly GeometryPosition[])[];
  readonly transform?: { readonly scale: readonly [number, number]; readonly translate: readonly [number, number] };
}
```

</details>

Related types: [`TopologyGeometry`](#type-topologygeometry) · [`GeometryPosition`](#type-geometryposition).

### `TopologyGeometry` {#type-topologygeometry}

<details markdown="1">
<summary>Expand TopologyGeometry</summary>

```typescript
export type TopologyGeometry = Readonly<Record<string, unknown>> & ({ readonly id?: string | number; readonly properties?: Readonly<Record<string, GeometryJSONValue>> | null }) & (
  | { readonly type: null }
  | { readonly type: "Point"; readonly coordinates: GeometryPosition }
  | { readonly type: "MultiPoint"; readonly coordinates: readonly GeometryPosition[] }
  | { readonly type: "LineString"; readonly arcs: readonly number[] }
  | { readonly type: "MultiLineString" | "Polygon"; readonly arcs: readonly (readonly number[])[] }
  | { readonly type: "MultiPolygon"; readonly arcs: readonly (readonly (readonly number[])[])[] }
  | { readonly type: "GeometryCollection"; readonly geometries: readonly TopologyGeometry[] });
```

</details>

Related types: [`GeometryJSONValue`](#type-geometryjsonvalue) · [`GeometryPosition`](#type-geometryposition).

### `TrailBodyPaint` {#type-trailbodypaint}

<details markdown="1">
<summary>Expand TrailBodyPaint</summary>

```typescript
export interface TrailBodyPaint {
  readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number;
  readonly opacity?: number; readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `TrailPatch` {#type-trailpatch}

<details markdown="1">
<summary>Expand TrailPatch</summary>

```typescript
type TrailPatch<T> = T extends unknown ? Partial<Omit<T, "id">> : never;
```

</details>

### `TrailPlotOptions` {#type-trailplotoptions}

<details markdown="1">
<summary>Expand TrailPlotOptions</summary>

```typescript
export interface TrailPlotOptions {
  readonly id?: string; readonly data?: string; readonly coordinate?: string;
  /** A nonnegative finite pixel width or the name of a field containing one width per sample. */
  readonly width: number | string;
  readonly groupBy?: string | readonly string[] | false;
  readonly missing?: "error" | "break";
  readonly closed?: boolean; readonly lineJoin?: "miter" | "bevel" | "round";
  readonly lineCap?: "butt" | "square" | "round"; readonly miterLimit?: number;
  readonly fillRule?: "nonzero" | "evenodd"; readonly body?: TrailBodyPaint;
  readonly color?: false | OHLCColor; readonly clip?: boolean; readonly blend?: BlendMode;
}
```

</details>

Related types: [`TrailBodyPaint`](#type-trailbodypaint) · [`OHLCColor`](#type-ohlccolor) · [`BlendMode`](#type-blendmode).

### `TrailPosition` {#type-trailposition}

<details markdown="1">
<summary>Expand TrailPosition</summary>

```typescript
export type TrailPosition = string | ({ readonly field: string } & (
  | { readonly fieldType?: "quantitative"; readonly scale?: NonPointQuantitativePositionScaleOptions; readonly temporalUnit?: never }
  | { readonly fieldType: "temporal"; readonly scale?: NonPointTemporalPositionScaleOptions; readonly temporalUnit?: TemporalInputUnit }
  | { readonly fieldType: "nominal" | "ordinal"; readonly scale?: NonPointCategoricalPositionScaleOptions; readonly temporalUnit?: never }
));
```

</details>

Related types: [`NonPointQuantitativePositionScaleOptions`](#type-nonpointquantitativepositionscaleoptions) · [`NonPointTemporalPositionScaleOptions`](#type-nonpointtemporalpositionscaleoptions) · [`TemporalInputUnit`](#type-temporalinputunit) · [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

### `TreePlotOptions` {#type-treeplotoptions}

<details markdown="1">
<summary>Expand TreePlotOptions</summary>

```typescript
export interface TreePlotOptions {
  id?: string; layout?: string; origin?: "auto" | readonly [number, number]; clip?: boolean;
  nodes?: HierarchyNodePaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyNodePaint)[] };
  links?: false | { stroke?: string; strokeWidth?: number; opacity?: number; shadow?: MarkShadow | false }; labels?: false | HierarchyLabelsOptions;
}
```

</details>

Related types: [`HierarchyNodePaint`](#type-hierarchynodepaint) · [`HierarchyNodeTarget`](#type-hierarchynodetarget) · [`MarkShadow`](#type-markshadow) · [`HierarchyLabelsOptions`](#type-hierarchylabelsoptions).

### `TreemapPlotOptions` {#type-treemapplotoptions}

<details markdown="1">
<summary>Expand TreemapPlotOptions</summary>

```typescript
export interface TreemapPlotOptions {
  id?: string; layout?: string; origin?: "auto" | readonly [number, number]; clip?: boolean;
  cells?: HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] }; labels?: false | HierarchyLabelsOptions;
}
```

</details>

Related types: [`HierarchyBodyPaint`](#type-hierarchybodypaint) · [`HierarchyNodeTarget`](#type-hierarchynodetarget) · [`HierarchyLabelsOptions`](#type-hierarchylabelsoptions).

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
  fill?: FillPaint;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}
```

</details>

Related types: [`StrokeStyleDetails`](#type-strokestyledetails) · [`FillPaint`](#type-fillpaint) · [`CurveInterpolation`](#type-curveinterpolation).

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

### `VisibleGuide` {#type-visibleguide}

<details markdown="1">
<summary>Expand VisibleGuide</summary>

```typescript
export type VisibleGuide<T> = T & GuideVisibilityOptions;
```

</details>

Related types: [`GuideVisibilityOptions`](#type-guidevisibilityoptions).

### `VisibleTickGroup` {#type-visibletickgroup}

<details markdown="1">
<summary>Expand VisibleTickGroup</summary>

```typescript
export type VisibleTickGroup<T> = T & { ticks?: VisibleGuide<AxisTickStyleOptions>; labels?: VisibleGuide<AxisLabelStyleOptions>; };
```

</details>

Related types: [`VisibleGuide`](#type-visibleguide) · [`AxisTickStyleOptions`](#type-axistickstyleoptions) · [`AxisLabelStyleOptions`](#type-axislabelstyleoptions).

### `WaterfallBarPaint` {#type-waterfallbarpaint}

<details markdown="1">
<summary>Expand WaterfallBarPaint</summary>

```typescript
export interface WaterfallBarPaint {
  readonly positiveFill?: FillPaint; readonly negativeFill?: FillPaint; readonly totalFill?: FillPaint; readonly subtotalFill?: FillPaint;
  readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number;
  readonly outline?: MarkOutline | false; readonly shadow?: MarkShadow | false;
}
```

</details>

Related types: [`FillPaint`](#type-fillpaint) · [`MarkOutline`](#type-markoutline) · [`MarkShadow`](#type-markshadow).

### `WaterfallColor` {#type-waterfallcolor}

<details markdown="1">
<summary>Expand WaterfallColor</summary>

```typescript
export type WaterfallColor = OHLCColor;
```

</details>

Related types: [`OHLCColor`](#type-ohlccolor).

### `WaterfallConnectorPaint` {#type-waterfallconnectorpaint}

<details markdown="1">
<summary>Expand WaterfallConnectorPaint</summary>

```typescript
export type WaterfallConnectorPaint = Pick<WaterfallBarPaint, "stroke" | "strokeWidth" | "opacity" | "outline" | "shadow">;
```

</details>

Related types: [`WaterfallBarPaint`](#type-waterfallbarpaint).

### `WaterfallLabelPaint` {#type-waterfalllabelpaint}

<details markdown="1">
<summary>Expand WaterfallLabelPaint</summary>

```typescript
export interface WaterfallLabelPaint extends CalendarLabelPaint { readonly content?: "value" | "end" | "category"; readonly format?: string; readonly offset?: number; }
```

</details>

Related types: [`CalendarLabelPaint`](#type-calendarlabelpaint).

### `WaterfallWidth` {#type-waterfallwidth}

<details markdown="1">
<summary>Expand WaterfallWidth</summary>

```typescript
export type WaterfallWidth = { readonly band: number; readonly pixels?: never } | { readonly pixels: number; readonly band?: never };
```

</details>

### `WaterfallX` {#type-waterfallx}

<details markdown="1">
<summary>Expand WaterfallX</summary>

```typescript
export type WaterfallX = string | { readonly field: string; readonly fieldType?: "nominal" | "ordinal"; readonly scale?: NonPointCategoricalPositionScaleOptions };
```

</details>

Related types: [`NonPointCategoricalPositionScaleOptions`](#type-nonpointcategoricalpositionscaleoptions).

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

### `WithoutScaleSelection` {#type-withoutscaleselection}

<details markdown="1">
<summary>Expand WithoutScaleSelection</summary>

```typescript
type WithoutScaleSelection<T> = T extends unknown ? Omit<T, "id" | "target"> : never;
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
