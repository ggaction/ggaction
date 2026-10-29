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
import type { ChartProgram, BasicSeriesLayoutOptions, CreateDataOptions, ScopedActionTarget,
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
  { readonly [Key in Exclude<BasicMethodKey, "createData">]: RebindMethod<ChartProgram[Key]> } &
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
