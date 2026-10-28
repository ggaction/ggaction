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
  options?: { pixelRatio?: number }
): void;
