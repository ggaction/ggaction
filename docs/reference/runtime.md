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
export type {
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
  FitCanvasOptions,
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
  FillPaint,
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
  GraphicObject,
  GraphicSpec,
  GraphicType,
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
export function hconcat(options: CompositionOptions): ChartProgram;
export function vconcat(options: CompositionOptions): ChartProgram;
export function render(
  program: Pick<ChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
```

#### `ggaction/basic`

[Complete declaration and relative dependencies](../types/basic.d.ts)

```typescript
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
  DisplayLabelMap,
  DisplayLabelOptions,
  ApplyThemeOptions,
  BarWidthOptions,
  BasicSeriesLayoutOptions,
  Bin2DAssignment,
  Bin2DDataOptions,
  CanvasOptions,
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
  ? (...args: Args) => BasicChartProgram
  : never;

export type BasicChartProgram =
  Pick<ChartProgram, BasicStateKey> &
  { readonly [Key in Exclude<BasicMethodKey, "createData">]: RebindMethod<ChartProgram[Key]> } &
  { createData<Row extends object>(options: CreateDataOptions<Row>): BasicChartProgram } &
  { readonly layoutSeries: (options: BasicSeriesLayoutOptions) => BasicChartProgram };

export function chart(): BasicChartProgram;
export function render(
  program: Pick<BasicChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
```

#### `ggaction/extension`

[Complete declaration and relative dependencies](../types/extension.d.ts)

```typescript
import type { ActionOptions } from "./program.js";
import { ChartProgram } from "./program.js";

export { ChartProgram };
export type {
  FillPaint,
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
  "resource-limit" | "unsupported-format" | "action-failed";

export interface ErrorDetails {
  readonly code: ErrorCode;
  readonly operation?: string;
  readonly optionPath?: string;
  readonly resourceId?: string;
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
export function exportAccessibleData(program: ChartProgram | BasicChartProgram, options?: { readonly target?: string }): AccessibleData;
```

#### `ggaction/inspection`

[Complete declaration and relative dependencies](../types/inspection.d.ts)

```typescript
import type { BasicChartProgram } from "./basic.js";
import type { ChartProgram, DatasetSchema } from "./program.js";
export type ProgramInput = ChartProgram | BasicChartProgram;
export interface ResourceRef { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide" | "canvas" | "composition"; readonly id: string; readonly childPath?: readonly string[]; }
export interface InspectionTarget { readonly kind: "data" | "mark" | "scale" | "coordinate" | "guide"; readonly id: string; readonly childPath?: readonly string[]; }
export interface Finding { readonly severity: "error" | "warning" | "info"; readonly code: string; readonly reason: string; readonly message: string; readonly resource?: ResourceRef; readonly optionPath?: string; }
export interface CheckResult { readonly name: string; readonly status: "not_run" | "passed" | "failed" | "not_applicable"; readonly evidencePaths: readonly string[]; readonly findings: readonly Finding[]; }
export interface ParameterDefinition { readonly path: string; readonly kind: "field" | "enum" | "number" | "string" | "boolean" | "range" | "array" | "object" | "resource"; readonly required: boolean; readonly active: boolean; readonly choices?: readonly (string | number | boolean | null)[]; readonly minimum?: number; readonly maximum?: number; readonly unit?: string; readonly fieldRole?: string; }
export interface ActionDescription { readonly version: 1; readonly action: string; readonly applicability: "supported" | "needs-input" | "incompatible" | "unsupported" | "unverified"; readonly parameterDefinitions: readonly ParameterDefinition[]; readonly requirements: readonly { readonly reason: string; readonly optionPath?: string }[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; }
export interface Change { readonly resource: ResourceRef; readonly operation: "add" | "remove" | "modify"; readonly effect: "data" | "binding" | "structure" | "scale" | "guide" | "style"; readonly roles: readonly string[]; }
export interface ProgramComparison { readonly version: 1; readonly equivalence: "equal" | "different" | "unknown"; readonly completeProgramComparison: boolean; readonly changes: readonly Change[]; readonly affected: readonly ResourceRef[]; readonly findings: readonly Finding[]; }
export interface OwnerInspection { readonly owner: ResourceRef; readonly grain: "item" | "series" | "composite" | "unknown"; readonly rawRows: number | null; readonly logicalDataItems: number | null; readonly drawablePrimitives: number | null; readonly visibleCandidates: number | null; readonly flags: readonly { readonly reason: "opacity-zero" | "zero-size" | "outside-clip" | "missing-skipped"; readonly count: number | null }[]; readonly bounds: Readonly<{x:number;y:number;width:number;height:number}> | null; readonly sourceRefs: readonly ResourceRef[]; readonly checks: readonly CheckResult[]; }
export interface ProgramInspection { readonly version: 1; readonly views: readonly OwnerInspection[]; readonly calculations: readonly unknown[]; readonly checks: readonly CheckResult[]; readonly findings: readonly Finding[]; readonly coverage: Readonly<{partial:boolean;unsupported:readonly ResourceRef[]}>; }
export function getDatasetSchema(program: ProgramInput, options: {readonly data:string;readonly childPath?:readonly string[]}): Readonly<{data:string;schema:DatasetSchema}>;
export function describeAction(program: ProgramInput, options: {readonly action:string;readonly target?:InspectionTarget;readonly options?:Readonly<Record<string,unknown>>}): ActionDescription;
export function comparePrograms(before: ProgramInput, after: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramComparison;
export function inspectProgram(program: ProgramInput, options?: {readonly target?:InspectionTarget}): ProgramInspection;
```

#### `ggaction/scene`

[Complete declaration and relative dependencies](../types/scene.d.ts)

```typescript
import type { ChartProgram, GraphicObject } from './program.js';
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
  readonly type: 'circle' | 'rect' | 'line' | 'path' | 'text';
  readonly topology: string;
  readonly properties: Readonly<NonNullable<GraphicObject['properties']>>;
  /** Explicit outer-to-inner global clip frames; the root physical viewport is implicit. */
  readonly clips?: readonly (readonly [number, number, number, number])[];
  readonly offset: readonly [number, number];
  readonly clip: readonly [number, number, number, number];
}
export interface CanvasTransitionScene {
  readonly version: 2;
  readonly width: number;
  readonly height: number;
  readonly nodes: readonly CanvasTransitionNode[];
}
export declare function createTransitionScene(program: ChartProgram, options?: {format?: 'svg'}): TransitionScene;
export declare function createTransitionScene(program: ChartProgram, options: {format: 'canvas'}): CanvasTransitionScene;
export declare function renderTransitionScene(scene: CanvasTransitionScene, context: CanvasRenderingContext2D, options?: {pixelRatio?: number}): void;
```

<!-- END GENERATED RUNTIME SIGNATURES -->

## Rendering functions

Use [Program composition](../api/composition.md) for sizing, nesting, layout
editing, and stable child replacement. Use [Rendering](../api/rendering.md) for
complete Browser Canvas, SVG, Node PNG, and vector PDF examples.

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
