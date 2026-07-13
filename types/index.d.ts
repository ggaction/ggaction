import type { ChartProgram } from "./program.js";

export type {
  ActionOptions,
  CanvasOptions,
  CategoricalEncodingOptions,
  ChartProgram,
  FieldType,
  GraphicObject,
  GraphicSpec,
  GraphicType,
  LegendOptions,
  PositionEncodingOptions,
  RegressionOptions,
  ScaleOptions,
  ScaleType,
  SemanticSpec,
  TraceNode
} from "./program.js";

export function chart(): ChartProgram;
export function render(
  program: Pick<ChartProgram, "graphicSpec">,
  context: CanvasRenderingContext2D,
  options?: { pixelRatio?: number }
): void;
