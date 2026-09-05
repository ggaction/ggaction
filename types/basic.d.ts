import type { ChartProgram, BasicSeriesLayoutOptions } from "./program.js";

export type {
  AxisLabelOptions,
  AxisLineStyleOptions,
  AxisTickOptions,
  AxisTicksAndLabelsOptions,
  AxisTitleOptions,
  BarWidthOptions,
  BasicSeriesLayoutOptions,
  Bin2DDataOptions,
  CanvasOptions,
  ColorEncodingOptions,
  CompleteAxisOptions,
  CreateAxesOptions,
  CreateBarPlotOptions,
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
  ScaleOptions,
  SecondaryPositionEncodingOptions,
  SemanticSpec,
  StrokeDashEncodingOptions,
  TemporalInputUnit,
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
  | "createData"
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
  { readonly [Key in BasicMethodKey]: RebindMethod<ChartProgram[Key]> } &
  { readonly layoutSeries: (options: BasicSeriesLayoutOptions) => BasicChartProgram };

export function chart(): BasicChartProgram;
export function render(
  program: Pick<BasicChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
