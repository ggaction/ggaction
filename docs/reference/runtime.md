---
layout: default
title: Program and Rendering Functions
description: Create, compose, render, and inspect programs without confusing package functions with chainable actions.
---

# Program and Rendering Functions

## Program functions

Package-level functions create, compose, or render programs. They are not
chainable methods. `hconcat` and `vconcat` create a new composition program and
record their wrapped composition action and children in its trace. They leave
input programs unchanged. `chart` starts an empty trace; rendering reads the
concrete graphics without recording an authoring action.

<!-- BEGIN GENERATED RUNTIME SIGNATURES -->
### Exact TypeScript signatures

These blocks are generated from the declaration file owned by each package entry.

#### `ggaction`

[Complete declaration and relative dependencies](../types/index.d.ts)

```typescript
export type { GeoCameraOperation, NavigateProjectionOptions, ProjectionViewport } from "./program.js";
export type { GeoAnnotationAnchor, GeoAnnotationOptions, EditGeoAnnotationOptions, GeoAnnotationBinding } from "./program.js";
export type { GeoMarkStyleOptions, GeoSourceMarkOptions, GeoShapeMarkOptions, GeoPointMarkOptions, GeoLineMarkOptions, GraticuleOptions, EditGeoShapeMarkOptions, EditGeoPointMarkOptions, EditGeoLineMarkOptions, EditGraticuleOptions, GeoMarkBinding, SemanticNativeCoordinate, SemanticGeoCoordinate, CreateNativeCoordinateOptions } from "./program.js";
export type { TableCellPaint, TableLabelPaint, TableBandPaint, TableSparklinePaint, TableFooterOptions, TableSparklineCell, TableColumn, CreateTablePlotOptions, EditTablePlotOptions } from "./program.js";
export type { TrailBodyPaint, TrailPosition, TrailPlotOptions, CreateTrailPlotOptions, EditTrailPlotOptions } from "./program.js";
export type { WaterfallBarPaint, WaterfallConnectorPaint, WaterfallLabelPaint, WaterfallX, WaterfallColor, WaterfallWidth, CreateWaterfallPlotOptions, EditWaterfallPlotOptions } from "./program.js";
export type { OHLCBodyPaint, OHLCStemPaint, OHLCLabelPaint, OHLCX, OHLCColor, OHLCWidth, CreateOHLCPlotOptions, EditOHLCPlotOptions } from "./program.js";
export type { GeometryJSONValue, GeometryPosition, GeographicGeometry, GeometryFeature, GeoJSONInput, TopologyGeometry, TopoJSONInput, GeometryLimits, GeometryFeatureKey, CreateGeometryDataOptions, EditGeometryDataOptions, GeometrySourceResource } from "./program.js";
export type { ProjectionType, ProjectionPlaneParameters, ProjectionSphereParameters, ProjectionParameters, ProjectionFitOptions, CreateProjectionOptions, EditProjectionOptions, ProjectionResource } from "./program.js";
export type { PyramidStagePaint, PyramidLabelPaint, PyramidColor, PyramidLayoutOptions, CreatePyramidPlotOptions, EditPyramidPlotOptions } from "./program.js";
export type { CalendarDayOptions, CalendarDefinition, CreateCalendarLayoutOptions, CalendarLayoutPatch, CalendarCell, CalendarLayoutResult, CalendarLayoutResource, CalendarCellPaint, CalendarBoundaryPaint, CalendarLabelPaint, CalendarLabelRole, CalendarPlotOptions, EditCalendarPlotOptions } from "./program.js";
export type { ContourGridFrame, ContourGrid, ContourDensityDefinition, CreateContourDataOptions, CreateDensityContourDataOptions, EditContourDataOptions, ContourPolygon, ContourResult, ContourResource, ContourMarkOptions, EditContourMarkOptions } from "./program.js";
export type { FlowDefinition, CreateFlowDataOptions, EditFlowDataOptions, FlowNodeTotals, FlowResource, FlowLayoutOptions, LayoutFlowOptions, FlowLayoutNode, FlowLayoutEdge, FlowLayoutResource, FlowBodyPaint, FlowLabelPaint, FlowLabelsOptions, FlowNodesOptions, FlowLinksOptions, EditFlowNodesOptions, EditFlowLinksOptions } from "./program.js";
export type { ImageResourceSource, CreateImageResourceRequest, ReplaceImageResourceRequest, ImageResourceRequest, ImageResourceHost,
  PreparedImageResource, ApplyImageResourceOptions, ImageRef, ImageResource, ImageMarkOptions, CreateImageMarkOptions, EditImageMarkOptions } from "./program.js";
import type { CreateImageResourceRequest, ReplaceImageResourceRequest, ImageResourceRequest, ImageResourceHost, PreparedImageResource } from "./program.js";
import type { CanvasTransitionScene } from "./scene.js";
export type { ConcreteImage, ImageMimeType, PreparedImageRendering, ImageRenderingHost, CanvasRenderOptions } from "./program.js";
import type { PreparedImageRendering, ImageRenderingHost, CanvasRenderOptions } from "./program.js";
export type { PartitionPlotOptions, EditPartitionPlotOptions, PartitionViewState } from "./program.js";
export type { HierarchyValueMode, HierarchySource, CreateHierarchyDataOptions, EditHierarchyDataOptions, HierarchyOrder, HierarchyTreeOptions, HierarchyTreemapOptions, LayoutHierarchyOptions, EditLayoutOptions, RemoveStoredResourceOptions, HierarchyNode, HierarchyModel, HierarchyResource, HierarchyRectangle, HierarchyTreeResult, HierarchyPartitionResult, HierarchyTreemapResult, HierarchyLayoutResource, HierarchyNodeTarget, HierarchyBodyPaint, HierarchyNodePaint, HierarchyLabelPaint, HierarchyLabelsOptions, TreePlotOptions, EditTreePlotOptions, TreemapPlotOptions, EditTreemapPlotOptions } from "./program.js";
export type { ConditionalEncodingOptions } from "./program.js";
export type { GraphKeyField, ObservedGraphDefinition, CreateGraphDataOptions, EditGraphDataOptions, GraphNode, GraphEdge, GraphModel, GraphResource } from "./program.js";
export type { GraphPosition, GraphPin, GraphLayoutLimits, GraphFixedOptions, GraphCircularOptions, GraphForceOptions, LayoutGraphOptions, GraphLayoutResource } from "./program.js";
export type { GraphNodePaint, GraphEdgePaint, GraphLabelPaint, GraphLabelsOptions, GraphPlotOptions, EditGraphPlotOptions } from "./program.js";
export type { EdgeRouteMethod, EdgeRouteLimits, EdgeRouteCommonOptions, HierarchicalEdgeRouteOptions, ForceDirectedEdgeRouteOptions, EdgePathRouteOptions, EdgeRouteDefinition, BundleGraphEdgesOptions, EditEdgeRouteOptions, PreparedGraphEdgeRoutes, ApplyGraphEdgeRoutesOptions, EdgeRoutePoint, EdgeRouteVector, EdgeRouteResult, EdgeRouteResource } from "./program.js";
export type { ParameterType, ParameterValue, ParameterRef, ParameterResource, CreateParameterOptions, EditParameterOptions, RemoveParameterOptions, ComputedExpressionV1, ComputedExpressionV2, ExpressionNode, ExpressionCall } from "./program.js";
export type { RowKeyScalar, RowKey, DataKeyOptions, DataKeySpec, InputRowRef, RowLineage, InputRef, StoredResourceKind, PersistentSelectionResource, GraphicIdentity, GraphicLineageRef } from "./program.js";
export type { DataSourceValue, DataParseDirective, DataParse, DataSource, CreateDataUpdateRequest,
  ReviseDataUpdateRequest, ParameterDataUpdateRequest, DataUpdateRequest, DataSourceResponse,
  DataUpdateHost, PreparedDataUpdate, ApplyDataUpdateOptions, DataSourceProvenance,
  DataSourceReceipt, DataSourceResource } from "./program.js";
import type { ChartProgram, CompositionOptions, DataUpdateRequest, CreateDataUpdateRequest,
  ReviseDataUpdateRequest, ParameterDataUpdateRequest, DataUpdateHost, PreparedDataUpdate } from "./program.js";

export type {
  CreateOverlayOptions,
  EditOverlayOptions,
  OverlayLineAppearance,
  OverlayPointAppearance,
  LinearNiceCountOptions,
  AxisTickRounding,
  ArcInnerRadius,
  PieRadiusChannel,
  TextMetricFontWeight,
  TextMeasurement,
  TextMetricsProfile,
  ApplyTextMetricsOptions,
  ReviseDataOptions,
  ActionOptions,
  AxisFormat,
  AxisFormatString,
  RotationInput,
  RotationUnit,
  NumericFormatString,
  UtcFormatString,
  ValueFormat,
  AxisLabelOptions,
  AxisLabelLayoutOptions,
  AxisLabelStyleOptions,
  AxisLineStyleOptions,
  AxisTickOptions,
  CartesianGuideDashMap,
  AxisTicksAndLabelsOptions,
  AxisTickStyleOptions,
  AxisTitleOptions,
  AxisTitleOffset,
  AxisValue,
  DisplayLabelMap,
  DisplayLabelOptions,
  BarWidthOptions,
  BoxPlotOptions,
  BoxPlotSummaryFields,
  BinnedHeatmapColorOptions,
  BinnedHeatmapOptions,
  BinnedHeatmapPositionChannel,
  Bin2DAssignment,
  Bin2DCounts,
  Bin2DDataOptions,
  Bin2DExtent,
  Bin2DOutputFields,
  BinDataOptions,
  BinDataOutputFields,
  BindMarkDataOptions,
  RemoveResourceOptions,
  CanvasOptions,
  ResponsiveCanvasOptions,
  ResponsiveLabelOptions,
  FitCanvasOptions,
  PivotColumn,
  PivotNumericOperation,
  PivotDataOptions,
  DatasetPivotTransform,
  EditPivotDataOptions,
  FoldDataOptions,
  FoldDataOutputFields,
  CategoricalEncodingOptions,
  CategoryOrder,
  CategoryOrderSummary,
  CategoryValue,
  ColorLayout,
  SeriesLayoutOptions,
  BasicSeriesLayoutOptions,
  StrokeStyleDetails,
  RectStyleDetails,
  CreateAreaPlotOptions,
  AreaPlotIndependentChannel,
  AreaPlotMeasureChannel,
  ColorEncodingOptions,
  StrokeEncodingOptions,
  EncodeChannelsOptions,
  EncodingChannelAssignments,
  SizeEncodingOptions,
  ShapeEncodingOptions,
  AngleEncodingOptions,
  CompleteAxisOptions,
  NamedCompleteAxis,
  ConcatCompositionSpec,
  CompositionAlign,
  CompositionShares,
  ScopedActionTarget,
  ActionTargetList,
  TargetedOptions,
  EditCompositionScalesOptions,
  AdjacentPlotSpecification,
  CreateAdjacentPlotOptions,
  CompositionOptions,
  EditFacetSourceOptions,
  FacetHeaderRole,
  FacetHeaderSide,
  FacetHeaderAlign,
  CompositionPadding,
  CompositionProgramEntry,
  CompositionSpec,
  ComputedDataOptions,
  ComputedExpression,
  CompleteDataOptions,
  CalendarDayDomain,
  ImputedDataOptions,
  NormalizedDataOptions,
  NormalizeBaseline,
  NormalizeMethod,
  NormalizeZeroDenominator,
  ChartProgram,
  ConcretePathCommand,
  CurveInterpolation,
  CreateDerivedDataOptions,
  CreateAxesOptions,
  PolarAxisTickSelection,
  ParallelAxisTickSelection,
  ParallelAxisTicksOptions,
  ParallelAxisLabelsOptions,
  ParallelAxisTitleOptions,
  ParallelAxisComponentsOptions,
  CreateParallelAxisOptions,
  EditParallelAxisOptions,
  ParallelAxesOptions,
  RemoveParallelAxisOptions,
  CreateThetaAxisLineOptions,
  CreateRadialAxisLineOptions,
  CreateThetaAxisTicksOptions,
  CreateRadialAxisTicksOptions,
  CreateThetaAxisLabelsOptions,
  ThetaAxisLabelOptions,
  ThetaTicksAndLabelsOptions,
  CompleteThetaAxisOptions,
  EditThetaAxisOptions,
  CreateRadialAxisLabelsOptions,
  CreateThetaAxisTitleOptions,
  CreateRadialAxisTitleOptions,
  CreateCoordinateOptions,
  CoordinateAspect,
  CoordinateAspectAlign,
  PolarFrameCenter,
  PolarFrameRadius,
  PolarFrameOptions,
  EditCoordinateOptions,
  CreateGuidesOptions,
  CreateGridOptions,
  CreateBarPlotOptions,
  BarRangePositionChannel,
  CreateHeatmapOptions,
  CreateHistogramOptions,
  CreatePiePlotOptions,
  CreateRosePlotOptions,
  CreateRadialBarPlotOptions,
  MeasuredRadialGuideOptions,
  MeasuredRadiusScaleOptions,
  RadialMapping,
  RadialEncodingOptions,
  RadiusScaleOptions,
  CreateDensityPlotOptions,
  CreateHorizonPlotOptions,
  HorizonPlotGuideOptions,
  DensityPlotGuideOptions,
  DensityPlotLegendOptions,
  PieCategory,
  PieColor,
  PieLegendOptions,
  CreateRegressionBandOptions,
  CreateRegressionLineOptions,
  CreateLinePlotOptions,
  CreatePolarLinePlotOptions,
  CreatePolarScatterPlotOptions,
  CreateRadarPlotOptions,
  CreateRugPlotOptions,
  CreateStripPlotOptions,
  CreateBeeswarmPlotOptions,
  RaincloudDensityOptions,
  RaincloudBoxSummaryOptions,
  RaincloudIntervalSummaryOptions,
  RaincloudSummaryOptions,
  RaincloudPointAppearanceOptions,
  RaincloudPointsOptions,
  CreateRaincloudPlotOptions,
  EditRaincloudPlotOptions,
  BeeswarmPackingOptions,
  RadarCategoryChannel,
  RadarCategoryScaleOptions,
  RadarCategoryValue,
  RadarWideOptions,
  RugGuideOptions,
  RugMeasureChannel,
  RugTickOptions,
  StripCategoryChannel,
  StripBandJitterOptions,
  StripJitterOptions,
  StripPixelJitterOptions,
  CreateParallelCoordinatesOptions,
  CreateScatterPlotOptions,
  CreateTextPlotOptions,
  CreateIntervalPlotOptions,
  CreateRegressionPlotOptions,
  CreateDotPlotOptions,
  CreateLollipopPlotOptions,
  CreateDumbbellPlotOptions,
  EditEndpointPlotOptions,
  CreateECDFPlotOptions,
  EditECDFPlotOptions,
  EndpointCategoryChannel,
  EndpointValueChannel,
  EndpointPlotSummary,
  EndpointLabelOptions,
  IntervalPlotErrorBarOptions,
  RegressionPlotPositionChannel,
  CreateScaleOptions,
  DashPattern,
  DashScaleOptions,
  DashStyle,
  DatasetDensityTransform,
  DatasetECDFResolvedGroup,
  DatasetECDFTransform,
  ECDFOutputFields,
  ECDFDataOptions,
  DatasetComputedTransform,
  DatasetCompleteTransform,
  DatasetImputedTransform,
  DatasetNormalizedTransform,
  DatasetHorizonTransform,
  DensityPlacement,
  BaselineDensityPlacement,
  CategoryDensityPlacement,
  DensityPlacementSide,
  DensityPlacementSplit,
  DensityPlacementWidth,
  DensityWidthResolution,
  DatasetBin2DOutputFields,
  DatasetBin2DTransform,
  DatasetFilterTransform,
  DatasetFoldTransform,
  DatasetIntervalOutputFields,
  DatasetIntervalTransform,
  DatasetTimeUnitTransform,
  DatasetWindowOperation,
  DatasetWindowSort,
  DatasetWindowTransform,
  DurationWindowFrame,
  DurationWindowUnit,
  DatasetRegressionTransform,
  DatasetRegressionStatisticsTransform,
  DatasetScalar,
  StatisticalWeight,
  DatasetStackTransform,
  DatasetTransform,
  RequestedDatasetTransform,
  DerivedDataDependents,
  EditDerivedDataOptions,
  EditGraphicsOptions,
  EditBin2DDataOptions,
  EditComputedDataOptions,
  EditFilteredDataOptions,
  EditFoldDataOptions,
  EditSummaryDataOptions,
  EditBinDataOptions,
  EditTimeUnitDataOptions,
  EditWindowDataOptions,
  EditDensityDataOptions,
  EditStackDataOptions,
  EditRegressionDataOptions,
  EditRegressionStatisticsDataOptions,
  EditIntervalDataOptions,
  EditECDFDataOptions,
  EditNormalizedDataOptions,
  EditCompleteDataOptions,
  EditImputedDataOptions,
  EditHorizonOptions,
  EditCompositionLayoutOptions,
  EditFacetHeadersOptions,
  FacetHeadersOptions,
  FacetHeaderTitleOptions,
  EditAxesOptions,
  EditAxisOptions,
  EditGradientPlotOptions,
  EditViolinPlotOptions,
  EditGridDirectionsOptions,
  EditGridOptions,
  EditErrorBandBoundaryOptions,
  EditErrorBandOptions,
  EditErrorBarOptions,
  RuleStyleOptions,
  EditBoxPlotOptions,
  EditLegendBorderOptions,
  EditLegendLabelsOptions,
  EditLegendLayoutOptions,
  EditLegendSymbolsOptions,
  EditLegendTitleOptions,
  EditScaleOptions,
  EditXScaleOptions,
  EditYScaleOptions,
  EditParallelScaleOptions,
  EditThetaScaleOptions,
  EditRScaleOptions,
  EditColorScaleOptions,
  EditStrokeScaleOptions,
  EditSizeScaleOptions,
  EditOpacityScaleOptions,
  EditShapeScaleOptions,
  EditStrokeWidthScaleOptions,
  EditStrokeDashScaleOptions,
  EditSemanticOptions,
  FieldType,
  FillPaint, MarkOutline, MarkShadow, BlendMode,
  PatternPaint,
  RadialGradientPaint,
  FacetCompositionSpec,
  FacetGap,
  FacetGuideOptions,
  FacetOptions,
  FacetTopLaneMode,
  FacetGridOptions,
  FacetGridRole,
  FacetScaleResolution,
  FacetScaleResolutions,
  GraphicClipRect,
  GraphicClipPath,
  GraphicClip,
  PathFillRule,
  GraphicObject,
  GraphicSpec,
  GraphicType,
  GraphicBlendSource,
  GraphicWeightedBlendProperties,
  GroupEncodingOptions,
  GradientPlotAppearanceOptions,
  GradientPlotCenterOptions,
  GradientPlotDensityOptions,
  GradientPlotOptions,
  GradientPlotPositionChannel,
  ViolinPlotAreaOptions,
  ViolinPlotColorOptions,
  ViolinPlotDensityOptions,
  ViolinPlotOptions,
  ViolinPlotPositionChannel,
  ViolinPlotSplitOptions,
  LinearGradientPaint,
  LinearGradientPoint,
  LinearGradientStop,
  GridDirectionOptions,
  HeatmapBaseOptions,
  HeatmapBinOptions,
  HistogramEncodingOptions,
  HorizonEncodingOptions,
  HorizonMissingPolicy,
  HorizonOutputFields,
  HorizonOverflowPolicy,
  HorizonPaletteOptions,
  HorizonResolution,
  HorizonXEncoding,
  HorizonYEncoding,
  HighlightMarksOptions,
  JitterMaxOffset,
  JitterPointsOptions,
  PointPackingMaxOffset,
  PackPointsOptions,
  RemovePointPackingOptions,
  LabelLayoutAxis,
  LabelLayoutBounds,
  LabelLayoutOptions,
  LabelLeaderOptions,
  LegendOptions,
  LegendChannel,
  LegendBlockTextPatch,
  LegendBlockSymbolPatch,
  EditLegendBlockOptions,
  EditLegendOptions,
  ContinuousColorInterpolation,
  ContinuousColorScaleOptions,
  OpacityEncodingOptions,
  OpacityScaleOptions,
  OrderCategoriesOptions,
  OffsetScaleOptions,
  OffsetScaleEditPatch,
  EditXOffsetScaleOptions,
  EditYOffsetScaleOptions,
  PathOrderEncodingOptions,
  ParallelCoordinatesEncodingOptions,
  ParallelDimension,
  ParallelMissingPolicy,
  PointShape,
  PointPolygonShape,
  PreGriddedHeatmapOptions,
  MarkSelector,
  MarkGraphicProperty,
  Palette,
  PaletteName,
  NonPointQuantitativePositionScaleOptions,
  PositionEncodingOptions,
  YPositionEncodingOptions,
  RulePositionEncodingOptions,
  SecondaryPositionEncodingOptions,
  RegressionBandOptions,
  RegressionDataOptions,
  RegressionStatisticsDataOptions,
  RegressionInterval,
  RegressionMethod,
  RegressionOptions,
  RectMarkOptions,
  ReplaceCompositionChildOptions,
  InsertCompositionChildOptions,
  RemoveCompositionChildOptions,
  ReorderCompositionChildrenOptions,
  RepeatChartsOptions,
  EditRegressionOptions,
  EditRectMarkOptions,
  RemoveAxisOptions,
  RemoveCategoryOrderOptions,
  RemoveGridOptions,
  RemoveJitterOptions,
  RemoveLabelLayoutOptions,
  RemoveLegendOptions,
  RemoveMarkOptions,
  RemovePathOrderOptions,
  ScaleRange,
  ScaleOptions,
  ScaleType,
  ShapeScaleOptions,
  SizeScaleOptions,
  CategoricalSizeScaleOptions,
  StackMode,
  StackDataMode,
  StackDataOptions,
  StackDataOutputFields,
  BootstrapMeanIntervalMethod,
  MeanConfidenceIntervalMethod,
  SummaryAggregateOptions,
  SummaryDataOptions,
  YStackMode,
  SemanticCoordinate,
  SemanticDataset,
  SemanticLayer,
  SemanticScale,
  SemanticSpec,
  SelectMarksOptions,
  MarkSelectionSelector,
  SelectionRegionAxis,
  SelectionRegion,
  StrokeDashEncodingOptions,
  StrokeWidthEncodingOptions,
  StrokeWidthScaleOptions,
  ThetaEncodingOptions,
  ThetaScaleOptions,
  TimeUnit,
  TimeUnitDataOptions,
  RowWindowFrame,
  TemporalInputUnit,
  ThemeDefinition,
  ThemeName,
  ThemeTokens,
  ApplyThemeOptions,
  TraceNode,
  TitleOptions,
  EditTitleOptions,
  EditTextMarkOptions,
  TitleTextStyleOptions,
  TextEncodingOptions,
  TextFormat,
  TextMarkOptions,
  DatumPositionEncodingOptions,
  CreateMarkLabelsOptions,
  EditMarkLabelPlacementOptions,
  EditMarkLabelSelectionOptions,
  MarkLabelAnchor,
  MarkLabelPlacement,
  MarkLabelPlacementLeaderOptions,
  MarkLabelSelectionOptions,
  RemoveMarkLabelsOptions,
  CreateAnnotationOptions,
  EditAnnotationOptions,
  ReferenceStatistic,
  CreateStatisticalReferenceOptions,
  CreateReferenceLineOptions,
  CreateReferenceBandOptions,
  XAxisPosition,
  YAxisPosition,
  WindowDataOptions,
  WindowFrame,
  WindowOperation,
  WindowSort,
  WindowSortOrder,
  XOffsetEncodingOptions
} from "./program.js";

export function chart(): ChartProgram;
export function prepareDataUpdate(program: ChartProgram, request: CreateDataUpdateRequest, host: DataUpdateHost): Promise<PreparedDataUpdate<"create">>;
export function prepareDataUpdate(program: ChartProgram, request: ReviseDataUpdateRequest, host: DataUpdateHost): Promise<PreparedDataUpdate<"revise">>;
export function prepareDataUpdate(program: ChartProgram, request: ParameterDataUpdateRequest, host: DataUpdateHost): Promise<PreparedDataUpdate<"parameter">>;
export function prepareDataUpdate(program: ChartProgram, request: DataUpdateRequest, host: DataUpdateHost): Promise<PreparedDataUpdate>;
export function hconcat(options: CompositionOptions): ChartProgram;
export function vconcat(options: CompositionOptions): ChartProgram;
export function render(
  program: Pick<ChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: CanvasRenderOptions
): void;

export function prepareImageRendering(program: Pick<ChartProgram, "graphicSpec">, host: ImageRenderingHost): Promise<PreparedImageRendering>;
export function prepareImageRendering(scene: CanvasTransitionScene, host: ImageRenderingHost): Promise<PreparedImageRendering>;

export function prepareImageResource(program: ChartProgram, request: CreateImageResourceRequest, host: ImageResourceHost): Promise<PreparedImageResource<"create">>;
export function prepareImageResource(program: ChartProgram, request: ReplaceImageResourceRequest, host: ImageResourceHost): Promise<PreparedImageResource<"replace">>;
export function prepareImageResource(program: ChartProgram, request: ImageResourceRequest, host: ImageResourceHost): Promise<PreparedImageResource>;
export type { FontIdentity, FontMimeType, ConcreteFont, FontRef, FontMetricsProfile, FontResourceSource, CreateFontResourceRequest,
  ReplaceFontResourceRequest, FontResourceRequest, FontMeasurementHost, TextMetricsHost, FontResourceHost,
  PreparedFontResource, ApplyFontResourceOptions, PreparedTextMetrics, TextMetricsRequest, FontResource,
  PreparedFontRendering, FontRenderingHost } from "./program.js";
import type { CreateFontResourceRequest, ReplaceFontResourceRequest, FontResourceRequest, FontResourceHost, PreparedFontResource,
  PreparedTextMetrics, TextMetricsRequest, TextMetricsHost, PreparedFontRendering, FontRenderingHost } from "./program.js";
export function prepareFontResource(program: ChartProgram, request: CreateFontResourceRequest, host: FontResourceHost): Promise<PreparedFontResource<"create">>;
export function prepareFontResource(program: ChartProgram, request: ReplaceFontResourceRequest, host: FontResourceHost): Promise<PreparedFontResource<"replace">>;
export function prepareFontResource(program: ChartProgram, request: FontResourceRequest, host: FontResourceHost): Promise<PreparedFontResource>;
export function prepareTextMetrics(program: ChartProgram, request: TextMetricsRequest, host: TextMetricsHost): Promise<PreparedTextMetrics>;
export function prepareFontRendering(program: Pick<ChartProgram, "graphicSpec">, host: FontRenderingHost): Promise<PreparedFontRendering>;
export function prepareFontRendering(scene: CanvasTransitionScene, host: FontRenderingHost): Promise<PreparedFontRendering>;

export type { GraphMetric, GraphFeatures, GraphSearchOptions, GraphFeaturePolicy, InferredGraphSource, GraphMetricDefinition, GraphNeighborDefinition, GraphMetricMstDefinition, GraphCandidateMstDefinition, GraphStructuralDefinition, InferredGraphDefinition, CreateInferredGraphDataOptions, EditInferredGraphDataOptions, GraphInferenceDiagnostics, ObservedGraphResource, InferredGraphResource } from "./program.js";
export type { PreparedShadowRendering, ShadowRenderingHost } from "./program.js";
import type { PreparedShadowRendering, ShadowRenderingHost } from "./program.js";
export function prepareShadowRendering(program: Pick<ChartProgram, "graphicSpec">, host: ShadowRenderingHost): Promise<PreparedShadowRendering>;
export function prepareShadowRendering(scene: CanvasTransitionScene, host: ShadowRenderingHost): Promise<PreparedShadowRendering>;
export type { GeoJoinKeyOptions, CreateGeoJoinDataOptions, EditGeoJoinDataOptions, GeoJoinResource } from "./program.js";

export type { GeoLODBaseLevel, GeoLODChildLevel, GeoLODLevels, CreateGeoLODDataOptions, EditGeoLODDataOptions, GeoLODResource } from "./program.js";
```

#### `ggaction/basic`

[Complete declaration and relative dependencies](../types/basic.d.ts)

```typescript
export type { GraphicBlendSource, GraphicWeightedBlendProperties } from "./program.js";
export type { FillPaint, MarkOutline, MarkShadow, BlendMode, LinearGradientPaint, PatternPaint, RadialGradientPaint, LinearGradientStop } from "./program.js";
import type { CanvasTransitionScene } from "./scene.js";
export type { ConcreteImage, ImageMimeType, PreparedImageRendering, ImageRenderingHost, CanvasRenderOptions } from "./program.js";
import type { PreparedImageRendering, ImageRenderingHost, CanvasRenderOptions } from "./program.js";
export type { ConditionalEncodingOptions } from "./program.js";
export type { ParameterType, ParameterValue, ParameterRef, ParameterResource, CreateParameterOptions, EditParameterOptions, RemoveParameterOptions, ComputedExpressionV1, ComputedExpressionV2, ExpressionNode, ExpressionCall } from "./program.js";
export type { RowKeyScalar, RowKey, DataKeyOptions, DataKeySpec } from "./program.js";
export type { DataSourceValue, DataParseDirective, DataParse, DataSource, CreateDataUpdateRequest,
  DataSourceResponse, DataUpdateHost, PreparedDataUpdate, ApplyDataUpdateOptions,
  DataSourceProvenance, DataSourceReceipt, DataSourceResource } from "./program.js";
import type { CreateNativeCoordinateOptions, ChartProgram, BasicSeriesLayoutOptions, CreateDataOptions, ScopedActionTarget,
  CreateDataUpdateRequest, DataUpdateHost, PreparedDataUpdate, ApplyDataUpdateOptions } from "./program.js";

export type {
  LinearNiceCountOptions,
  PointPolygonShape,
  AxisTickRounding,
  AxisLabelOptions,
  AxisLineStyleOptions,
  AxisTickOptions,
  CartesianGuideDashMap,
  AxisTicksAndLabelsOptions,
  AxisTitleOptions,
  AxisTitleOffset,
  DisplayLabelMap,
  DisplayLabelOptions,
  ApplyThemeOptions,
  BarWidthOptions,
  BasicSeriesLayoutOptions,
  Bin2DAssignment,
  Bin2DDataOptions,
  CanvasOptions,
  ResponsiveCanvasOptions,
  ResponsiveLabelOptions,
  ColorEncodingOptions,
  CompleteAxisOptions,
  NamedCompleteAxis,
  CreateAxesOptions,
  CreateBarPlotOptions,
  BarRangePositionChannel,
  CreateDataOptions,
  FlattenDataOptions,
  LookupDataOptions,
  CreateGridOptions,
  CreateGuidesOptions,
  CreateHeatmapOptions,
  CreateHistogramOptions,
  CreateLinePlotOptions,
  CreateScatterPlotOptions,
  CreateScaleOptions,
  GraphicSpec,
  GroupEncodingOptions,
  GridDirectionOptions,
  HistogramEncodingOptions,
  LegendOptions,
  PositionEncodingOptions,
  RectMarkOptions,
  RectStyleDetails,
  ScaleOptions,
  SecondaryPositionEncodingOptions,
  SemanticSpec,
  StrokeDashEncodingOptions,
  StrokeStyleDetails,
  TemporalInputUnit,
  ThemeDefinition,
  ThemeName,
  ThemeTokens,
  TraceNode,
  XAxisPosition,
  XOffsetEncodingOptions,
  YAxisPosition
} from "./program.js";

type BasicStateKey =
  | "semanticSpec"
  | "graphicSpec"
  | "resolvedScales"
  | "materializationConfigs"
  | "context"
  | "trace"
  | "actionStack";

type BasicMethodKey =
  | "createCanvas"
  | "applyTheme"
  | "removeTheme"
  | "createData"
  | "createParameter"
  | "createComputedData"
  | "createFlattenData"
  | "createLookupData"
  | "createPointMark"
  | "createLineMark"
  | "createBarMark"
  | "createRectMark"
  | "encodeX"
  | "encodeY"
  | "encodeX2"
  | "encodeY2"
  | "encodeGroup"
  | "encodePointRadius"
  | "encodeColor"
  | "encodeStrokeDash"
  | "encodeSize"
  | "encodeShape"
  | "encodeXOffset"
  | "encodeYOffset"
  | "encodeHistogram"
  | "encodeBarWidth"
  | "createCoordinate"
  | "createScale"
  | "createScatterPlot"
  | "createLinePlot"
  | "createBarPlot"
  | "createHistogram"
  | "createHeatmap"
  | "createAxes"
  | "createXAxis"
  | "createYAxis"
  | "createXAxisLine"
  | "createYAxisLine"
  | "createXAxisTicks"
  | "createYAxisTicks"
  | "createXAxisLabels"
  | "createYAxisLabels"
  | "createXAxisTicksAndLabels"
  | "createYAxisTicksAndLabels"
  | "createXAxisTitle"
  | "createYAxisTitle"
  | "createGrid"
  | "createHorizontalGrid"
  | "createVerticalGrid"
  | "createLegend"
  | "createGuides";

type RebindMethod<T> = T extends (...args: infer Args) => ChartProgram
  ? (...args: { [K in keyof Args]: Exclude<Args[K], { target: ScopedActionTarget | readonly unknown[] }> }) => BasicChartProgram
  : never;

export type BasicChartProgram =
  Pick<ChartProgram, BasicStateKey> &
  { readonly [Key in Exclude<BasicMethodKey, "createData" | "createCoordinate">]: RebindMethod<ChartProgram[Key]> } &
  { createCoordinate(options?: CreateNativeCoordinateOptions): BasicChartProgram } &
  { createData<Row extends object>(options: CreateDataOptions<Row>): BasicChartProgram } &
  { applyDataUpdate(options: ApplyDataUpdateOptions<"create">): BasicChartProgram } &
  { readonly layoutSeries: (options: BasicSeriesLayoutOptions) => BasicChartProgram };

export function chart(): BasicChartProgram;
export function prepareDataUpdate(
  program: BasicChartProgram, request: CreateDataUpdateRequest, host: DataUpdateHost
): Promise<PreparedDataUpdate<"create">>;
export function render(
  program: Pick<BasicChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: CanvasRenderOptions
): void;

export function prepareImageRendering(program: Pick<BasicChartProgram, "graphicSpec">, host: ImageRenderingHost): Promise<PreparedImageRendering>;
export function prepareImageRendering(scene: CanvasTransitionScene, host: ImageRenderingHost): Promise<PreparedImageRendering>;
export type { FontIdentity, FontMimeType, ConcreteFont, PreparedFontRendering, FontRenderingHost } from "./program.js";
import type { PreparedFontRendering, FontRenderingHost } from "./program.js";
export function prepareFontRendering(program: Pick<BasicChartProgram, "graphicSpec">, host: FontRenderingHost): Promise<PreparedFontRendering>;
export function prepareFontRendering(scene: CanvasTransitionScene, host: FontRenderingHost): Promise<PreparedFontRendering>;

export type { PreparedShadowRendering, ShadowRenderingHost } from "./program.js";
import type { PreparedShadowRendering, ShadowRenderingHost } from "./program.js";
export function prepareShadowRendering(program: Pick<BasicChartProgram, "graphicSpec">, host: ShadowRenderingHost): Promise<PreparedShadowRendering>;
export function prepareShadowRendering(scene: CanvasTransitionScene, host: ShadowRenderingHost): Promise<PreparedShadowRendering>;
```

#### `ggaction/extension`

[Complete declaration and relative dependencies](../types/extension.d.ts)

```typescript
import type { ActionOptions } from "./program.js";
import { ChartProgram } from "./program.js";

export { ChartProgram };
export type {
  InputRef, InputRowRef, RowLineage, GraphicIdentity, GraphicLineageRef, PersistentSelectionResource,
  FillPaint, MarkOutline, MarkShadow, GraphicBlendSource, GraphicWeightedBlendProperties,
  PatternPaint,
  RadialGradientPaint,
  LinearGradientPaint,
  LinearGradientPoint,
  LinearGradientStop
} from "./program.js";

export interface ActionMetadata {
  op: string;
  description: string;
  scope?: "unit" | "composition" | "any";
}

export interface RegisteredExtensionActions {}

export type RegisteredExtensionAction = (
  this: ChartProgram,
  ...args: any[]
) => ChartProgram;

export interface ExtensionDefinition<
  TActions extends Readonly<Record<string, RegisteredExtensionAction>> =
    Readonly<Record<string, RegisteredExtensionAction>>
> {
  name: string;
  actions: TActions;
}

export function action<TOptions extends ActionOptions = ActionOptions>(
  metadata: ActionMetadata,
  implementation: (this: ChartProgram, options: TOptions) => ChartProgram
): <TProgram extends ChartProgram>(
  this: TProgram,
  options?: TOptions
) => TProgram;

export function registerExtension<
  TActions extends Readonly<Record<string, RegisteredExtensionAction>>
>(definition: ExtensionDefinition<TActions>): void;
export type { GraphKeyField, ObservedGraphDefinition, CreateGraphDataOptions, EditGraphDataOptions, GraphNode, GraphEdge, GraphModel, GraphResource } from "./program.js";
```

#### `ggaction/png`

[Complete declaration and relative dependencies](../types/png.d.ts)

```typescript
export interface PNGRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly bytes: number;
}

export function renderToPNG(
  program: Pick<ChartProgram, "graphicSpec">,
  options: { output: string; pixelRatio?: number }
): Promise<PNGRenderResult>;

export interface PNGBufferResult extends Omit<PNGRenderResult, "output"> {
  readonly buffer: Uint8Array;
}

export function renderToPNGBuffer(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: { pixelRatio?: number }
): Promise<PNGBufferResult>;
```

#### `ggaction/pdf`

[Complete declaration and relative dependencies](../types/pdf.d.ts)

```typescript
export interface PDFMetadata {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: readonly string[];
}

export interface PDFRenderOptions {
  readonly output: string;
  readonly metadata?: PDFMetadata;
}

export interface PDFRenderResult {
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly pages: 1;
  readonly bytes: number;
}

export function renderToPDF(
  program: Pick<ChartProgram, "graphicSpec">,
  options: PDFRenderOptions
): Promise<PDFRenderResult>;

export interface PDFBufferResult extends Omit<PDFRenderResult, "output"> {
  readonly buffer: Uint8Array;
}

export function renderToPDFBuffer(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: { metadata?: PDFMetadata }
): Promise<PDFBufferResult>;
```

#### `ggaction/svg`

[Complete declaration and relative dependencies](../types/svg.d.ts)

```typescript
export interface SVGRenderOptions {
  readonly shadows?: PreparedShadowRendering;
  readonly title?: string;
  readonly description?: string;
  readonly resourceNamespace?: string;
}

export function renderToSVG(
  program: Pick<ChartProgram, "graphicSpec">,
  options?: SVGRenderOptions
): string;
```

#### `ggaction/diagnostics`

[Complete declaration and relative dependencies](../types/diagnostics.d.ts)

```typescript
export type ErrorCode = "invalid-option" | "invalid-value" | "missing-resource" |
  "ambiguous-resource" | "incompatible-resource" | "resource-in-use" |
  "resource-limit" | "unsupported-format" | "action-failed" | "duplicate-id" | "ambiguous-identity" | "cyclic-dependency" | "stale-result";

export interface ErrorDetails {
  readonly code: ErrorCode;
  readonly operation?: string;
  readonly optionPath?: string;
  readonly resourceId?: string;
  readonly ownerId?: string;
  readonly expected?: number | string;
  readonly dependencies?: readonly string[];
  readonly candidates?: readonly string[];
  readonly limit?: number;
  readonly actual?: number;
}

export function getErrorDetails(error: unknown): ErrorDetails | undefined;
```

#### `ggaction/persistence`

[Complete declaration and relative dependencies](../types/persistence.d.ts)

```typescript
import type { ChartProgram } from "./program.js";
import type { BasicChartProgram } from "./basic.js";

export function serializeProgram(program: ChartProgram | BasicChartProgram): string;
export function deserializeProgram(text: string): ChartProgram;
export function serializeGraphic(program: Pick<ChartProgram, "graphicSpec">): string;
export function deserializeGraphic(text: string): Readonly<Pick<ChartProgram, "graphicSpec">>;
```

#### `ggaction/accessibility`

[Complete declaration and relative dependencies](../types/accessibility.d.ts)

```typescript
import type { ChartProgram } from "./program.js";
import type { BasicChartProgram } from "./basic.js";

export interface AccessibleColumn {
  readonly key: string;
  readonly role: string;
  readonly component: string;
  readonly field?: string;
  readonly aggregate?: string;
  readonly unit?: "utc-milliseconds";
}
export interface AccessibleRow {
  readonly component: string;
  readonly series: Readonly<Record<string, unknown>>;
  readonly values: Readonly<Record<string, unknown>>;
}
export interface AccessibleOwnerView {
  readonly ownerId: string;
  readonly markType: string;
  readonly columns: readonly AccessibleColumn[];
  readonly rows: readonly AccessibleRow[];
  readonly units: Readonly<Record<string, "utc-milliseconds">>;
}
export interface AccessibleChildView {
  readonly ownerId: string;
  readonly kind: "composition-child";
  readonly title: string | null;
  readonly facet?: Readonly<Record<string, unknown>>;
  readonly views: readonly AccessibleView[];
}
export type AccessibleView = AccessibleOwnerView | AccessibleChildView;
export interface AccessibleData {
  readonly schemaVersion: 1;
  readonly title: string | null;
  readonly views: readonly AccessibleView[];
}

/** One final native logical item. Visibility does not infer opacity or clipping. */
export interface AccessibleItem {
  readonly key: string;
  readonly component: string;
  readonly markType: string;
  readonly role?: string;
  readonly fields: Readonly<Record<string, unknown>>;
  readonly channels: Readonly<Record<string, unknown>>;
  readonly selectedBy: readonly string[];
  readonly visible: boolean;
  readonly representationKeys?: readonly string[];
  /** Native hierarchy node keys, local to this view's childPath and component. */
  readonly navigation?: Readonly<Record<"key" | "parent" | "firstChild" | "previousSibling" | "nextSibling" | "root", string | null>>;
}
export interface AccessibleItemView {
  readonly kind: "items";
  readonly ownerId: string;
  readonly markType: string;
  readonly childPath: readonly string[];
  readonly items: readonly AccessibleItem[];
}
export interface AccessibleItemData {
  readonly schemaVersion: 1;
  readonly format: "items";
  readonly title: string | null;
  readonly views: readonly AccessibleItemView[];
}
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options: { readonly format: "items"; readonly target?: string }): AccessibleItemData;
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options?: { readonly format?: "table"; readonly target?: string }): AccessibleData;
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options: { readonly format?: "table" | "items"; readonly target?: string }): AccessibleData | AccessibleItemData;
```

#### `ggaction/inspection`

[Complete declaration and relative dependencies](../types/inspection.d.ts)

```typescript
import type { BasicChartProgram } from "./basic.js";
import type { ChartProgram, DatasetSchema, InputRowRef, StoredResourceKind, PartitionViewState, ProjectionParameters, ProjectionViewport } from "./program.js";
export type ProgramInput = ChartProgram | BasicChartProgram;
export interface ResourceRef { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide" | "canvas" | "composition" | StoredResourceKind; readonly id: string; readonly childPath?: readonly string[]; }
export interface InspectionTarget { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide" | StoredResourceKind; readonly id: string; readonly childPath?: readonly string[]; }
export interface Finding { readonly severity: "error" | "warning" | "info"; readonly code: string; readonly reason: string; readonly message: string; readonly resource?: ResourceRef; readonly optionPath?: string; }
export interface CheckResult { readonly name: string; readonly status: "not_run" | "passed" | "failed" | "not_applicable"; readonly evidencePaths: readonly string[]; readonly findings: readonly Finding[]; }
export interface ParameterDefinition { readonly path: string; readonly kind: "field" | "enum" | "number" | "string" | "boolean" | "range" | "array" | "object" | "resource"; readonly required: boolean; readonly active: boolean; readonly choices?: readonly (string | number | boolean | null)[]; readonly minimum?: number; readonly maximum?: number; readonly unit?: string; readonly fieldRole?: string; }
export interface ActionDescription { readonly version: 1; readonly action: string; readonly applicability: "supported" | "needs-input" | "incompatible" | "unsupported" | "unverified"; readonly parameterDefinitions: readonly ParameterDefinition[]; readonly requirements: readonly { readonly reason: string; readonly optionPath?: string }[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; }
export interface Change { readonly resource: ResourceRef; readonly operation: "add" | "remove" | "modify"; readonly effect: "data" | "binding" | "structure" | "scale" | "guide" | "style"; readonly roles: readonly string[]; }
export interface ProgramComparison { readonly version: 1; readonly equivalence: "equal" | "different" | "unknown"; readonly completeProgramComparison: boolean; readonly changes: readonly Change[]; readonly affected: readonly ResourceRef[]; readonly findings: readonly Finding[]; }
export interface PartitionInspection {
  readonly focusKey: string | null; readonly breadcrumbKeys: readonly string[]; readonly levels: number;
  readonly diagnostics: Readonly<{emptyHierarchy:boolean;emptyValue:boolean;emptyChildrenView:boolean}>;
  readonly recovery?: PartitionViewState["recovery"];
}
export interface PartitionNavigation {
  readonly key: string; readonly parent: string | null; readonly firstChild: string | null;
  readonly previousSibling: string | null; readonly nextSibling: string | null; readonly root: string | null;
}
export type AppearanceSource =
  | { readonly kind: "defaults" | "family"; readonly action?: string }
  | { readonly kind: "theme"; readonly owner: string; readonly name: "light" | "dark"; readonly token: keyof import("./program.js").ThemeTokens }
  | { readonly kind: "style"; readonly action?: string; readonly key?: string }
  | { readonly kind: "explicit"; readonly action: string; readonly channel?: string }
  | { readonly kind: "interaction"; readonly selection: string; readonly token?: "highlight"; readonly complement?: true }
  | { readonly kind: "unknown" };
export interface AppearanceProvenance {
  readonly owner: ResourceRef; readonly itemKey?: string; readonly component: string;
  readonly primitive?: number; readonly property: string; readonly value: unknown; readonly source: AppearanceSource;
}
export interface OwnerInspection { readonly appearance: readonly AppearanceProvenance[]; readonly partition?: PartitionInspection; readonly owner: ResourceRef; readonly grain: "item" | "series" | "composite" | "unknown"; readonly rawRows: number | null; readonly logicalDataItems: number | null; readonly drawablePrimitives: number | null; readonly visibleCandidates: number | null; readonly flags: readonly { readonly reason: "opacity-zero" | "zero-size" | "outside-clip" | "missing-skipped"; readonly count: number | null }[]; readonly bounds: Readonly<{x:number;y:number;width:number;height:number}> | null; readonly sourceRefs: readonly ResourceRef[]; readonly checks: readonly CheckResult[]; }
export interface ResponsiveLayoutInspection {
  readonly childPath: readonly string[];
  readonly policy: Readonly<{ minPlotSize: Readonly<{ width: number; height: number }> }>;
  readonly result: Readonly<{
    status: "satisfied"; reason: "converged"; iterations: number; change: number;
    requiredBounds: ResponsiveBounds;
    requiredPlotSize: Readonly<{ width: number; height: number }>;
    snapshot: Readonly<{ plot: ResponsiveBounds; occupied: ResponsiveBounds;
      lanes: readonly Readonly<{ id: string; bounds: ResponsiveBounds }>[] }>;
  }>;
  readonly labels: readonly Readonly<{ id: string;
    policy: Readonly<{ sequence: readonly ["wrap", "skip", "rotate"]; maxLines: number; skipStride: number; rotationCandidates: readonly number[] }>;
    result: Readonly<{ stage: "native" | "wrap" | "skip" | "rotate";
      reason: "native-fit" | "label-overlap" | "label-lines" | "label-size";
      indices: readonly number[]; rotation: number; maxWidth?: number; wrap?: "word" | "character" }>;
  }>[];
}
export interface ResponsiveBounds { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number; }
export interface ProgramInspection { readonly version: 1; readonly layouts?: readonly ResponsiveLayoutInspection[]; readonly views: readonly OwnerInspection[]; readonly calculations: readonly unknown[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; readonly coverage: Readonly<{partial:boolean;unsupported:readonly ResourceRef[]}>; }
export function getDatasetSchema(program: ProgramInput, options: {readonly data:string;readonly childPath?:readonly string[]}): Readonly<{data:string;schema:DatasetSchema}>;
export function describeAction(program: ProgramInput, options: {readonly action:string;readonly target?:InspectionTarget;readonly options?:Readonly<Record<string,unknown>>}): ActionDescription;
export function comparePrograms(before: ProgramInput, after: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramComparison;
export function inspectProgram(program: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramInspection;

export interface PlotCompositionChannel {
  readonly field?: string;
  readonly fields?: readonly string[];
  readonly fieldType: string;
  readonly scale: string;
  readonly data: string;
  readonly measurement: Readonly<{ unit: string; operations: readonly string[]; parameters?: Readonly<Record<string, unknown>> }>;
  readonly bin?: Readonly<Record<string, unknown>>;
  readonly temporalUnit?: string;
}
export interface PlotComposition {
  readonly version: 1;
  readonly owner: string;
  readonly ownedMarks: readonly string[];
  readonly data: string;
  readonly coordinate?: Readonly<{ id: string; type: string }>;
  readonly mark: string;
  readonly channels: Readonly<Record<string, PlotCompositionChannel>>;
  readonly dimensions?: readonly PlotCompositionChannel[];
  readonly role?: string;
  readonly groupBy?: string | readonly string[];
}
export function getPlotComposition(program: ProgramInput, options?: { readonly target?: string | { readonly childPath: readonly string[]; readonly id: string }; readonly childPath?: readonly string[] }): PlotComposition;

export interface MarkItemInspection {
  /** Original logical keys represented by this current geographic detail item. The hit key remains key. */
  readonly representationKeys?: readonly string[];
  readonly appearance: readonly AppearanceProvenance[];
  readonly visible?: boolean; readonly navigation?: PartitionNavigation;
  readonly key: string; readonly target: string; readonly markType: string; readonly grain: "item" | "stack";
  readonly fields: Readonly<Record<string, unknown>>; readonly channels: Readonly<Record<string, unknown>>;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly geometry: readonly {readonly type: string; readonly properties: Readonly<Record<string, unknown>>}[];
  readonly rows: readonly (InputRowRef & { readonly index: number })[];
  readonly bounds: Readonly<{left:number;top:number;right:number;bottom:number}> | null;
}
export function getMarkItems(program: ProgramInput, options?: {target?: string | {childPath?:readonly string[];id:string};grain?:"item"|"stack"}): readonly MarkItemInspection[];
export interface ExpressionFunctionDescriptor {
  readonly name: import("./program.js").ExpressionCall["name"];
  readonly min: number;
  readonly max: number;
  readonly inputs: readonly ("number" | "string" | "boolean" | "array")[];
  readonly output: "number" | "string" | "boolean" | "unknown";
  readonly options?: "angle" | "parse" | "part" | "floor";
  readonly lazy?: true;
}
export function getExpressionFunctions(options?: { readonly registry?: "standard@1" }): readonly ExpressionFunctionDescriptor[];

/** Immutable native view; Canvas-free resource programs report viewport:null. */
export interface ProjectionView {
  readonly projection: { readonly kind: "projection"; readonly id: string; readonly revision: number };
  readonly parameters: ProjectionParameters & { readonly scalePx: number; readonly translatePx: readonly [number, number] };
  readonly viewport: ProjectionViewport | null;
}
export function getProjectionView(program: ProgramInput, options?: { readonly target?: string; readonly childPath?: readonly string[] }): ProjectionView;
```

#### `ggaction/scene`

[Complete declaration and relative dependencies](../types/scene.d.ts)

```typescript
import type { ChartProgram, GraphicObject, GraphicClipPath, CanvasRenderOptions, PreparedShadowRendering } from './program.js';
export interface TransitionNode {
  readonly key: string;
  readonly type: string;
  readonly topology: string;
  readonly svg: string;
  readonly offset: readonly [number, number];
  readonly clip: readonly [number, number, number, number];
}
export interface TransitionScene {
  readonly version: 1;
  readonly width: number;
  readonly height: number;
  readonly definitions: string;
  readonly nodes: readonly TransitionNode[];
}
export interface CanvasTransitionNode {
  readonly key: string;
  readonly type: 'circle' | 'rect' | 'line' | 'path' | 'text' | 'image' | 'weighted-blend';
  readonly topology: string;
  readonly properties: Readonly<NonNullable<GraphicObject['properties']>>;
  /** Explicit outer-to-inner global clip frames; the root physical viewport is implicit. */
  readonly clips?: readonly (readonly [number, number, number, number] | GraphicClipPath)[];
  readonly offset: readonly [number, number];
  readonly clip: readonly [number, number, number, number];
}
export interface CanvasTransitionScene {
  readonly version: 2;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly CanvasTransitionNode[];
}
export declare function createTransitionScene(program: ChartProgram, options?: {format?: 'svg'; shadows?: PreparedShadowRendering}): TransitionScene;
export declare function createTransitionScene(program: ChartProgram, options: {format: 'canvas'}): CanvasTransitionScene;
export declare function renderTransitionScene(scene: CanvasTransitionScene, context: CanvasRenderingContext2D, options?: CanvasRenderOptions): void;
```

#### `ggaction/interaction`

[Complete declaration and relative dependencies](../types/interaction.d.ts)

```typescript
import type { ChartProgram, InputRef, MarkSelector, MarkSelectionSelector, CategoryOrder, LegendChannel, HierarchyNodeTarget, ProjectionSphereParameters, ProjectionParameters, GeoCameraOperation, GraphPosition, EditAnnotationOptions, EditGeoAnnotationOptions, ScopedActionTarget } from './program.js';
import type { BasicChartProgram } from './basic.js';
export type InteractionProgram = ChartProgram | BasicChartProgram;
import type { CanvasTransitionScene } from './scene.js';
import type { TransitionFrame } from './animation.js';
import type { PreparedImageRendering, PreparedFontRendering, PreparedShadowRendering } from './program.js';
export interface InteractionAssets {
  readonly images?: PreparedImageRendering;
  readonly fonts?: PreparedFontRendering;
  readonly shadows?: PreparedShadowRendering;
}
/** Host owns partially prepared assets; the session disposes each returned lease once. */
export interface InteractionAssetLease extends InteractionAssets { dispose(): void; }
export interface InteractionPreparation {
  /** Present only while preparing an authentic animation frame. */
  readonly frameVersion?: number;
  readonly sessionGeneration: number;
  readonly transactionId: string;
  readonly baseRevision: number;
  readonly resourceRevisionVector: readonly (InputRef & { readonly childPath: readonly string[] })[];
}
export interface InteractionUpdateRequest extends InteractionPreparation {
  readonly program: InteractionProgram;
  readonly signal: AbortSignal;
}
export interface InteractionAssetRequest extends InteractionUpdateRequest {
  /** Prepare this exact renderer-ready frame instead of program when present. */
  readonly frame?: TransitionFrame;
}
export interface InteractionSettlement {
  readonly status: 'settled' | 'cancelled' | 'error';
  readonly preparation?: InteractionPreparation;
}
export interface InteractionPoint { readonly x: number; readonly y: number; }
/** Explicit local-to-CSS affine matrix [a,b,c,d,e,f]; no device pixel ratio. */
export type InteractionTransform = readonly [number, number, number, number, number, number];
export interface HitCandidate {
  readonly itemKey: string;
  readonly ownerId: string;
  readonly role: string;
  readonly childPath: readonly string[];
  readonly rowKeys: readonly string[];
  readonly resourceRefs: readonly InputRef[];
  readonly screenPoint: InteractionPoint;
  readonly localPoint: InteractionPoint;
  readonly distance: number;
  readonly zIndex: number;
}
export interface InteractionHit {
  readonly target: HitCandidate | null;
  readonly candidates: readonly HitCandidate[];
  readonly diagnostics: readonly { readonly code: string; readonly transformIndex?: number; readonly itemKey?: string }[];
  readonly statistics: { readonly visited: number; readonly tested: number; readonly work: number };
  readonly frameVersion: number;
}
export interface InspectBinding {
  readonly type: 'inspect';
  readonly events?: readonly ('pointermove' | 'click')[];
  readonly slop?: number;
  readonly hitInvisible?: boolean;
}
/** Host-owned context UI receives current-frame semantic candidates through subscribe. */
export interface ContextMenuBinding {
  readonly type: 'contextMenu';
  readonly slop?: number;
  readonly hitInvisible?: boolean;
}
/** Host supplies a focusable surface and safe accessible descriptions. Targets are leaf marks. */
export interface KeyboardBinding {
  readonly type: 'keyboard';
  readonly targets: readonly {
    readonly target: InteractionTarget;
    readonly activation?: { readonly type: 'select'; readonly selection: string; readonly mode?: 'replace' | 'toggle' }
      | { readonly type: 'focusHierarchy' };
  }[];
}
/** Runtime-only focus. Null keys designate the configured owner container. */
export interface InteractionFocus {
  readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
  /** Stable authored scoped key, preserved when one current item represents it. */
  readonly itemKey: string | null;
  readonly currentItemKey: string | null;
  readonly screenPoint: InteractionPoint | null;
  readonly role: string | null;
}
export type InteractionFocusCommand = { readonly type: 'focus'; readonly target: InteractionTarget; readonly itemKey: string | null; readonly move?: never }
  | { readonly type: 'focus'; readonly move: 'next' | 'previous' | 'first' | 'last' | 'parent' | 'firstChild' | 'previousSibling' | 'nextSibling' | 'root'; readonly target?: never; readonly itemKey?: never };
/** Pointer arbitration uses explicit modifier conjunctions and bounded integer priorities. */
export interface GestureBindingOptions {
  readonly priority?: number;
  readonly modifiers?: { readonly alt?: boolean; readonly ctrl?: boolean; readonly meta?: boolean; readonly shift?: boolean };
}
export interface ClickSelectionBinding extends GestureBindingOptions {
  readonly type: 'select';
  /** Existing authored selection on an explicit root or concat mark owner. */
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly mode?: 'replace' | 'toggle';
  readonly onMiss?: 'clear' | 'ignore';
  readonly slop?: number;
  readonly hitInvisible?: boolean;
}
/** Activate a categorical legend block using its public channel and existing selection. */
export interface LegendSelectionBinding extends GestureBindingOptions {
  readonly type: 'legend';
  readonly effect: 'selection';
  readonly target: InteractionTarget;
  readonly channel: LegendChannel;
  readonly selection: string;
  /** toggle applies native symmetric difference to each category member. Defaults to toggle. */
  readonly mode?: 'replace' | 'toggle';
  readonly slop?: number;
}
/** Toggle actual category membership; the control legend remains available to restore it. */
export interface LegendVisibilityBinding extends GestureBindingOptions {
  readonly type: 'legend';
  readonly effect: 'visibility';
  readonly target: InteractionTarget;
  readonly channel: LegendChannel;
  readonly scaleDomain: 'visible-data' | 'all-data';
  readonly slop?: number;
}
interface RegionSelectionBindingOptions extends GestureBindingOptions {
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly mode?: 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
}
export type BrushSelectionBinding = RegionSelectionBindingOptions & { readonly type: 'brush' } & (
  { readonly axis?: 'xy'; readonly channels?: { readonly x?: 'x' | 'x2'; readonly y?: 'y' | 'y2' } }
  | { readonly axis: 'x'; readonly channels?: { readonly x?: 'x' | 'x2'; readonly y?: never } }
  | { readonly axis: 'y'; readonly channels?: { readonly y?: 'y' | 'y2'; readonly x?: never } }
  | { readonly axis: 'theta'; readonly channels?: { readonly theta?: 'theta'; readonly x?: never; readonly y?: never } }
);
export interface LassoSelectionBinding extends RegionSelectionBindingOptions {
  readonly type: 'lasso';
}
/** Drag one current graph node; target must have an explicit plot origin and fixed or force layout. */
export interface NodeMovementBinding extends GestureBindingOptions { readonly type: 'moveNode'; readonly target: InteractionTarget; }
/** Drag the target annotation layer by native pixel offsets, preserving its semantic anchor. */
export interface AnnotationMovementBinding extends GestureBindingOptions { readonly type: 'annotate'; readonly target: InteractionTarget; }
/** Native projection navigation. The host supplies focus and touch-action: none. */
export type NavigationBinding = GestureBindingOptions & {
  readonly type: 'navigate';
  readonly target: InteractionTarget;
  readonly scaleExtent: readonly [number, number];
  /** Explicit reset parameters; their type must match the target projection. */
  readonly initial: ProjectionParameters;
} & ({ readonly mode: 'pan'; readonly rotationStepDeg?: never }
  | { readonly mode: 'rotate'; readonly rotationStepDeg: number });
export type SelectionProjection = {
  readonly type: 'rows';
  readonly sourceData: string;
  readonly targetData: string;
} | {
  readonly type: 'fields';
  readonly sourceFields: readonly string[];
  readonly targetFields: readonly string[];
};
export interface LinkedSelectionSource {
  readonly target: InteractionTarget;
  readonly selection: string;
  readonly projection: SelectionProjection;
}
export interface LinkedSelectionBinding {
  readonly type: 'linkSelection';
  readonly id: string;
  readonly sources: readonly LinkedSelectionSource[];
  readonly target: InteractionTarget;
  readonly selection: string;
  /** global requires exactly one source owner. */
  readonly resolve: 'union' | 'intersection' | 'global';
}
/** Exclusively controls the target's native filter after source transactions.
 * Existing filters are retained at initialization and replaced on propagation. */
export interface LinkedFilterBinding extends Omit<LinkedSelectionBinding, 'type'> {
  readonly type: 'linkFilter';
}
export type SelectionPolicy = 'keep-hidden' | 'drop';
export interface SelectionChange {
  readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
  readonly selection: string;
  readonly policy: SelectionPolicy;
  readonly ownerMissing: boolean;
  /** Authored logical keys, including selections represented by another visible geographic detail item. */
  readonly hiddenKeys: readonly string[];
  readonly restoredKeys: readonly string[];
  readonly droppedKeys: readonly string[];
}
export interface LinkedSelectionState {
  readonly effect?: 'filter';
  readonly id: string;
  readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
  readonly selection: string;
  readonly resolve: 'union' | 'intersection' | 'global';
  readonly targetAvailable: boolean;
  readonly sources: readonly {
    readonly available: boolean;
    readonly target: Readonly<ScopedActionTarget> & { readonly id: string };
    readonly selection: string;
    /** Logical keys projected into the target owner, with its child namespace. */
    readonly keys: readonly string[];
  }[];
  readonly keys: readonly string[];
}
export interface InteractionState {
  readonly program: InteractionProgram;
  /** Separate transient editing result. Null outside an active preview. */
  readonly previewProgram: InteractionProgram | null;
  /** Exact accepted sampled frame; null for committed programs and plain scenes. */
  readonly animationFrame: TransitionFrame | null;
  readonly scene: CanvasTransitionScene;
  readonly frameVersion: number;
  readonly generation: number;
  /** Session-local committed program revision; inspection and frames do not increment it. */
  readonly revision: number;
  readonly hit: InteractionHit | null;
  readonly focus: InteractionFocus | null;
  readonly linkedSelections: readonly LinkedSelectionState[];
  /** Bounded immutable snapshots. Preview and cancelled edits are never recorded. */
  readonly history: { readonly undoCount: number; readonly redoCount: number; readonly limit: number };
  /** Prepared handles for this exact committed program; host passes them to its renderer. */
  readonly assets: Readonly<InteractionAssets> | null;
  /** Transient handles for the exact previewProgram; never use committed assets for that preview. */
  readonly previewAssets: Readonly<InteractionAssets> | null;
  /** Transient handles bound to animationFrame, separately from committed assets. */
  readonly frameAssets: Readonly<InteractionAssets> | null;
  /** Pending candidate identity. Program and history remain committed until ready. */
  readonly preparation: InteractionPreparation | null;
  readonly mounted: boolean;
  readonly destroyed: boolean;
}
export interface InteractionLifecycleEvent {
  readonly type: 'inspect' | 'contextMenu' | 'leave' | 'frame' | 'mount' | 'unmount' | 'destroy' | 'focus';
  readonly state: InteractionState;
}
/** One explicit owner; a facet edit addresses its retained source, never a generated cell. */
export type InteractionTarget = string | (Readonly<ScopedActionTarget> & { readonly id: string });
export interface InteractionTransaction {
  readonly transactionId?: string;
  readonly origin?: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
}
export type NearestSelection = {
  readonly space: 'screen';
  /** CSS-local point in the current accepted frame. */
  readonly point: InteractionPoint;
  readonly maxDistance: number;
  readonly hitInvisible?: boolean;
} | {
  readonly space: 'data';
  readonly fields: readonly string[];
  readonly values: readonly number[];
  readonly metric: 'euclidean' | 'manhattan';
  readonly maxDistance: number;
};
export type InteractionSelectionPayload = {
  readonly id: string;
  /** Creation requires replace; other modes require an existing selection. */
  readonly mode?: 'replace' | 'add' | 'toggle' | 'subtract' | 'intersect';
} & ({ readonly select: MarkSelectionSelector; readonly nearest?: never }
  | { readonly nearest: NearestSelection; readonly select?: never });
export type InteractionFilterPayload = {
  readonly select: MarkSelector;
  readonly mode?: 'replace' | 'compose';
  readonly recompute?: boolean;
  readonly clear?: never;
} | { readonly clear: true; readonly select?: never; readonly mode?: never; readonly recompute?: never };
export type InteractionVisibilityPayload = {
  readonly channel: LegendChannel;
  readonly values: readonly (string | number | boolean)[];
  readonly visible: boolean;
  readonly scaleDomain: 'visible-data' | 'all-data';
  readonly clear?: never;
} | { readonly clear: true; readonly channel?: never; readonly values?: never; readonly visible?: never; readonly scaleDomain?: never };
export type InteractionReorderPayload = { readonly channel: 'x' | 'y' | 'theta' } & (
  (CategoryOrder & { readonly clear?: never })
  | { readonly clear: true; readonly values?: never; readonly by?: never; readonly direction?: never }
);
/** Absolute transform patch or one native camera operation, exclusively. Full-only. */
export type InteractionViewportPayload = (Pick<ProjectionSphereParameters, 'scalePx' | 'translatePx' | 'centerDeg' | 'rotateDeg'> & { readonly operation?: never })
  | { readonly operation: GeoCameraOperation; readonly scalePx?: never; readonly translatePx?: never; readonly centerDeg?: never; readonly rotateDeg?: never };
/** Nonempty native Text/label or geographic annotation patch; target kind selects its editor. Full-only. */
export type InteractionAnnotationPayload = Omit<EditAnnotationOptions, 'target'> | Omit<EditGeoAnnotationOptions, 'target'>;
export type InteractionEditCommand = InteractionTransaction & ({
  readonly type: 'annotate';
  readonly target: InteractionTarget;
  readonly payload: InteractionAnnotationPayload;
} | {
  readonly type: 'select';
  readonly target: InteractionTarget;
  readonly payload: InteractionSelectionPayload;
} | {
  readonly type: 'clearSelection';
  readonly target: InteractionTarget;
  readonly payload: { readonly id: string };
} | {
  readonly type: 'setParameter';
  readonly target: InteractionTarget;
  readonly payload: { readonly value: number | string | boolean | null };
} | {
  readonly type: 'filter';
  readonly target: InteractionTarget;
  readonly payload: InteractionFilterPayload;
} | {
  readonly type: 'focusHierarchy';
  readonly target: InteractionTarget;
  readonly payload: { readonly focus: HierarchyNodeTarget | null };
} | {
  readonly type: 'moveNode';
  readonly target: InteractionTarget;
  readonly payload: GraphPosition;
} | {
  readonly type: 'setViewport';
  readonly target: InteractionTarget;
  readonly payload: InteractionViewportPayload;
} | {
  readonly type: 'setVisibility';
  readonly target: InteractionTarget;
  readonly payload: InteractionVisibilityPayload;
} | {
  readonly type: 'reorder';
  readonly target: InteractionTarget;
  readonly payload: InteractionReorderPayload;
});
/** Whole-session restore, without a target or editing payload. */
export type InteractionHistoryCommand = InteractionTransaction & { readonly type: 'undo' | 'redo' | 'reset' };
export interface InteractionTransactionEvent {
  readonly type: 'select' | 'clearSelection' | 'setParameter' | 'filter' | 'reorder' | 'setVisibility' | 'focusHierarchy' | 'setViewport' | 'moveNode' | 'annotate' | 'undo' | 'redo' | 'reset';
  readonly transactionId: string;
  readonly origin: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
  readonly phase: 'preview' | 'commit' | 'settled' | 'cancel' | 'error';
  readonly revision: number;
  readonly affectedOwners: readonly (Readonly<ScopedActionTarget> & { readonly id: string })[];
  readonly previous: InteractionProgram;
  readonly current: InteractionProgram;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
  readonly selectionChanges: readonly SelectionChange[];
  readonly state: InteractionState;
}
export interface InteractionProgramEvent {
  readonly type: 'program';
  readonly origin: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly history: 'reset' | 'record';
  readonly state: InteractionState;
  readonly selectionChanges: readonly SelectionChange[];
}
/** Initial and external replacement preparation; native edits retain their transaction event. */
export interface InteractionAssetEvent {
  readonly type: 'assets';
  readonly status: 'settled' | 'cancelled' | 'error';
  readonly preparation: InteractionPreparation;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
  readonly state: InteractionState;
}
export interface InteractionResizeEvent {
  readonly type: 'resize';
  /** Content-box CSS pixels; zero is allowed for a hidden or collapsed surface. */
  readonly size: { readonly width: number; readonly height: number };
  readonly state: InteractionState;
}
export interface InteractionUpdateEvent extends Omit<InteractionAssetEvent, 'type'> {
  readonly type: 'update';
  readonly transactionId: string;
  readonly origin: 'user' | 'programmatic' | 'replay' | 'linked';
  readonly causeTransactionId?: string;
}
export type InteractionEvent = InteractionLifecycleEvent | InteractionProgramEvent | InteractionTransactionEvent | InteractionAssetEvent | InteractionUpdateEvent | InteractionResizeEvent;
export type InteractionCommand = InteractionEditCommand | InteractionHistoryCommand | InteractionFocusCommand | { readonly type: 'activate' } | {
  readonly type: 'inspect' | 'contextMenu';
  /** CSS-local point, after subtracting the host client rectangle. */
  readonly point: InteractionPoint;
  readonly pointerType?: 'mouse' | 'pen' | 'touch';
  readonly slop?: number;
  readonly hitInvisible?: boolean;
} | { readonly type: 'leave' } | ({
  readonly type: 'frame';
  readonly version: number;
  readonly generation: number;
} & ({
  /** Scene containing only current program node keys and unchanged topology. */
  readonly scene: CanvasTransitionScene;
  readonly frame?: never;
} | {
  /** Authentic sample with the exact current native program in its displayed or direct endpoint owners.
   * Painted geographic source parts may focus/activate only within the same current native owner,
   * child scope, resource identity and logical feature membership. Endpoint revisions remain distinct. */
  readonly frame: TransitionFrame;
  readonly scene?: never;
}));
export interface InteractionDispatchResult { readonly status: 'applied' | 'queued' | 'stale' | 'unchanged'; }
export interface InteractionSession {
  mount(element: Element, options?: { readonly rootTransform?: InteractionTransform; readonly observeResize?: boolean }): () => boolean;
  /** External replacement cancels previews. Default clears history; record retains the previous snapshot. */
  updateProgram(program: InteractionProgram, options?: { readonly history?: 'reset' | 'record'; readonly origin?: 'user' | 'programmatic' | 'replay' | 'linked' }): InteractionDispatchResult;
  /** Prepare native async work from the exact committed base; stale results never replace newer state. */
  updateProgram(prepare: (request: InteractionUpdateRequest) => InteractionProgram | Promise<InteractionProgram>, options?: InteractionTransaction & { readonly history?: 'reset' | 'record' }): InteractionDispatchResult;
  dispatch(command: InteractionCommand): InteractionDispatchResult;
  subscribe(listener: (event: InteractionEvent) => void): () => boolean;
  getState(): InteractionState;
  /** Observe the job current at this call. Subscriber/disposer exceptions reject this promise. */
  whenSettled(): Promise<InteractionSettlement>;
  destroy(): boolean;
}
export declare function createInteractionSession(options: {
  readonly program: InteractionProgram;
  /** Explicit host preparation. Candidate state commits only after this lease is ready. */
  readonly assetResolver?: (request: InteractionAssetRequest) => InteractionAssetLease | Promise<InteractionAssetLease>;
  /** Integer 0..10000, default 100. Zero disables undo/redo, but preserves the initial reset baseline. */
  readonly historyLimit?: number;
  /** Removed final items remain selected by default; drop snapshots surviving membership. */
  readonly selectionPolicy?: SelectionPolicy;
  /** Omission enables pointermove and click inspection; [] enables headless dispatch only. */
  readonly bindings?: readonly (InspectBinding | ContextMenuBinding | KeyboardBinding | ClickSelectionBinding | LegendSelectionBinding | LegendVisibilityBinding | BrushSelectionBinding | LassoSelectionBinding | NodeMovementBinding | AnnotationMovementBinding | NavigationBinding | LinkedSelectionBinding | LinkedFilterBinding)[];
}): InteractionSession;
```

#### `ggaction/graph`

[Complete declaration and relative dependencies](../types/graph.d.ts)

```typescript
import type { ChartProgram, BundleGraphEdgesOptions, EditEdgeRouteOptions, PreparedGraphEdgeRoutes, EdgeRouteResult, InputRef } from "./program.js";
export type { PreparedGraphEdgeRoutes } from "./program.js";

declare const graphRouteJob: unique symbol;
/** Immutable structured-clone job supplied to the worker by prepareGraphEdgeRoutes. */
export interface GraphRouteJob {
  readonly [graphRouteJob]: true; readonly schemaVersion: 1; readonly algorithmVersion: string;
  readonly inputHash: string; readonly inputs: readonly InputRef[];
}
export interface GraphRouteCompletion {
  readonly inputHash: string; readonly resultHash: string;
  readonly result: EdgeRouteResult & { readonly options: Readonly<Record<string, unknown>> };
}
/** A browser Worker satisfies this protocol. One request owns one worker until completion, error or cancellation. */
export interface GraphRouteWorker {
  postMessage(message: { readonly job: GraphRouteJob }): void;
  addEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  addEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  removeEventListener(type: "message", listener: (event: { readonly data: unknown }) => void): void;
  removeEventListener(type: "error", listener: (event: { readonly error: unknown }) => void): void;
  terminate(): void;
}
export interface GraphRouteExecutor {
  compute(job: GraphRouteJob, options?: { readonly signal?: AbortSignal }): Promise<GraphRouteCompletion>;
  evict(inputHash?: string): void;
  dispose(): void;
}
export type GraphEdgeRoutesRequest = ({ readonly kind: "create" } & BundleGraphEdgesOptions)
  | ({ readonly kind: "edit" } & EditEdgeRouteOptions);
export interface GraphEdgeRoutesHost { readonly requestToken: string; readonly signal?: AbortSignal; readonly executor?: GraphRouteExecutor; }
export function createGraphRouteExecutor(options?: { readonly createWorker?: () => GraphRouteWorker }): GraphRouteExecutor;
export function computeGraphEdgeRoutes(job: GraphRouteJob, signal?: AbortSignal): GraphRouteCompletion;
export function prepareGraphEdgeRoutes(program: ChartProgram, request: GraphEdgeRoutesRequest, host: GraphEdgeRoutesHost): Promise<PreparedGraphEdgeRoutes>;
```

#### `ggaction/animation`

[Complete declaration and relative dependencies](../types/animation.d.ts)

```typescript
import type { ChartProgram } from './program.js';
import type { BasicChartProgram } from './basic.js';
import type { CanvasTransitionScene } from './scene.js';

declare const transitionPlan: unique symbol;
declare const transitionFrame: unique symbol;
export type AnimationProgram = ChartProgram | BasicChartProgram;
export type AnimationEasing = 'linear' | 'cubic-in-out';
export interface TransitionOptions {
  readonly durationMs: number;
  readonly easing?: AnimationEasing;
}
/** Created only by planTransition or deserializeAnimation. */
export interface TransitionPlan {
  readonly [transitionPlan]: true;
  readonly kind: 'transition-plan';
  readonly version: 1;
  readonly durationMs: number;
  readonly easing: AnimationEasing;
}
/** Semantic kernels report cartesian-point, cartesian-geometry, polar-geometry, partition, or completed-graph.
 * Unsupported policies retain an explicit crossfade reason. */
export type TransitionDecision =
  | { readonly kind: 'geographic'; readonly kernel: 'native-geo'; readonly ownerKey: string;
      readonly itemKey: string; readonly role: string }
  | { readonly kind: 'enter'; readonly targetIndex: number }
  | { readonly kind: 'exit'; readonly sourceIndex: number }
  | { readonly kind: 'exact' | 'semantic-kernel' | 'crossfade'; readonly sourceIndex: number;
      readonly targetIndex: number; readonly itemKey?: string; readonly owner?: string;
      readonly role: string; readonly kernel?: string; readonly reason?: string };
/** An authentic immutable sample, directly accepted by all four renderers. */
export interface TransitionFrame extends Readonly<Pick<ChartProgram, 'graphicSpec'>> {
  readonly [transitionFrame]: true;
  readonly scene: CanvasTransitionScene;
  readonly progress: number;
  readonly decisions: readonly TransitionDecision[];
}
export interface ExportedAnimationFrame extends TransitionFrame { readonly timeMs: number; }
export interface PlaybackOptions {
  readonly rate?: number;
  /** Additional repetitions; Infinity repeats until cancelled. */
  readonly repeat?: number;
  readonly reducedMotion?: boolean;
}
export interface AnimationPlayback {
  readonly rate: number;
  readonly repeat: number;
  readonly reducedMotion: boolean;
}
export interface RestoredAnimation {
  readonly plan: TransitionPlan;
  readonly playback: AnimationPlayback;
}
export type AnimationFrameOptions =
  | { readonly timesMs: readonly number[]; readonly fps?: never }
  | { readonly fps: number; readonly timesMs?: never };
export declare function planTransition(input: {
  readonly from: AnimationProgram | TransitionFrame;
  readonly to: AnimationProgram | TransitionFrame;
  readonly options: TransitionOptions;
}): TransitionPlan;
export declare function sampleTransition(plan: TransitionPlan, timeMs: number): TransitionFrame;
export declare function serializeAnimation(plan: TransitionPlan, playback?: PlaybackOptions): string;
export declare function deserializeAnimation(text: string): RestoredAnimation;
export declare function exportAnimationFrames(plan: TransitionPlan, options: AnimationFrameOptions): readonly ExportedAnimationFrame[];

export interface AnimationClock<Handle = number> {
  now(): number;
  requestFrame(callback: () => void): Handle;
  cancelFrame(handle: Handle): void;
}
export interface AnimationPlayerState {
  readonly status: 'idle' | 'playing' | 'paused' | 'finished' | 'cancelled' | 'disposed';
  readonly timeMs: number;
  readonly durationMs: number;
  readonly rate: number;
  readonly iteration: number;
  readonly repeat: number;
}
export interface AnimationSettlement {
  readonly reason: 'completed' | 'cancelled' | 'disposed' | 'interrupted';
  readonly timeMs: number;
  readonly iteration: number;
}
export interface AnimationPlayer {
  play(): AnimationPlayer;
  pause(): AnimationPlayer;
  seek(timeMs: number): AnimationPlayer;
  reverse(): AnimationPlayer;
  setRate(rate: number): AnimationPlayer;
  setRepeat(repeat: number): AnimationPlayer;
  cancel(): AnimationPlayer;
  interrupt(input: PlaybackOptions & { readonly to: AnimationProgram | TransitionFrame; readonly options: TransitionOptions }): AnimationPlayer;
  dispose(): void;
  getState(): AnimationPlayerState;
  getFrame(): TransitionFrame | undefined;
  readonly finished: Promise<AnimationSettlement>;
}
export declare function createAnimationPlayer<Handle>(input: PlaybackOptions & {
  readonly plan: TransitionPlan;
  readonly clock: AnimationClock<Handle>;
  readonly render: (frame: TransitionFrame) => void;
  readonly commit?: (frame: TransitionFrame) => void;
}): AnimationPlayer;
```

<!-- END GENERATED RUNTIME SIGNATURES -->

## Rendering functions

Use [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable child replacement. Use [Rendering](../api/rendering.md) for
complete Browser Canvas, SVG, Node PNG, and vector PDF examples.


Shared mark fill options follow [Pattern and gradient fills](../api/appearance/mark-style.md#pattern-and-gradient-fills). Point, Rect, Bar, Area, Arc, and Text constructors and editors accept the complete FillPaint union; strokes remain solid colors.

The `blend` option on Point, Bar, Rect, Area, Arc, Text, Line, Rule, and Tick mark
creation/editing accepts normal, multiply, screen, or difference. It applies once
per final glyph and is preserved through rematerialization. See
[Mark Style](../api/appearance/mark-style.md#blending-each-mark-item) for ordering and output behavior.


The `shadow` option on Point, Bar, Rect, Area, Arc, Text, Line, Rule and Tick create/edit actions adds
`{color, offsetX?, offsetY?, blurRadius?}`; edit with `shadow: false` to remove it. Defaults are zero offsets
and zero blur. [Mark Style](../api/appearance/mark-style.md#shadows) explains source opacity and selection;
[Rendering](../api/rendering.md#prepared-shadows) specifies explicit Canvas/SVG preparation and automatic
native PNG/PDF preparation. Text requires exact prepared embedded fonts.

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
