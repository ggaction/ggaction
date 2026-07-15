import type { ChartProgram } from "./program.js";

export type {
  ActionOptions,
  BarWidthOptions,
  CanvasOptions,
  CategoricalEncodingOptions,
  ColorLayout,
  ColorEncodingOptions,
  ChartProgram,
  ConcretePathCommand,
  CurveInterpolation,
  DashPattern,
  DashScaleOptions,
  DashStyle,
  EditGraphicsOptions,
  EditScaleOptions,
  EditSemanticOptions,
  FieldType,
  GraphicObject,
  GraphicSpec,
  GraphicType,
  HistogramEncodingOptions,
  LegendOptions,
  ContinuousColorInterpolation,
  ContinuousColorScaleOptions,
  OpacityEncodingOptions,
  OpacityScaleOptions,
  OffsetScaleOptions,
  PointShape,
  Palette,
  PaletteName,
  PositionEncodingOptions,
  RegressionBandOptions,
  RegressionDataOptions,
  RegressionInterval,
  RegressionMethod,
  RegressionOptions,
  ScaleRange,
  ScaleOptions,
  ScaleType,
  StackMode,
  SemanticSpec,
  StrokeDashEncodingOptions,
  TraceNode,
  XOffsetEncodingOptions
} from "./program.js";

export function chart(): ChartProgram;
export function render(
  program: Pick<ChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
