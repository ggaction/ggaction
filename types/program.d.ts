export type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
export type GraphicType =
  | "canvas"
  | "collection"
  | "circle"
  | "rect"
  | "line"
  | "text"
  | "path";
export type ScaleType = "linear" | "time" | "ordinal";
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
export type ActionOptions = Record<string, unknown>;

export interface TraceNode {
  readonly id: string;
  readonly op: string;
  readonly description: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly children: readonly TraceNode[];
}

export interface SemanticSpec {
  readonly datasets: readonly Readonly<Record<string, unknown>>[];
  readonly layers: readonly Readonly<Record<string, unknown>>[];
  readonly scales: readonly Readonly<Record<string, unknown>>[];
  readonly coordinates: readonly Readonly<Record<string, unknown>>[];
  readonly guides: Readonly<Record<string, unknown>>;
  readonly title: Readonly<Record<string, unknown>>;
}

export interface GraphicObject {
  readonly type: GraphicType;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly children?: readonly GraphicObject[];
}

export interface GraphicSpec {
  readonly objects: Readonly<Record<string, GraphicObject>>;
  readonly order: readonly string[];
}

export interface CanvasOptions {
  width?: number;
  height?: number;
  background?: string;
  margin?: number | Partial<Record<"top" | "right" | "bottom" | "left", number>>;
}

export interface ScaleOptions {
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  palette?: string;
}

export interface EditScaleOptions {
  id?: string;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
}

export interface PositionEncodingOptions {
  field: string;
  target?: string;
  fieldType?: FieldType;
  scale?: ScaleOptions;
  coordinate?: string;
  aggregate?: "mean" | "count";
  bin?: { maxBins?: number };
  stack?: "zero" | null;
}

export interface CategoricalEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: ScaleOptions;
  layout?: "stack" | "group";
}

export interface RegressionOptions {
  target?: string;
  x?: string;
  y?: string;
  groupBy?: string;
  confidence?: number;
  band?: { color?: string; opacity?: number };
  line?: { strokeWidth?: number };
}

export interface LegendOptions extends ActionOptions {
  target?: string;
  channels?: readonly ("color" | "strokeDash" | "shape")[];
  position?: "right" | "bottom" | "top";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: number;
  offset?: number;
  titlePosition?: "top" | "left";
  title?: string;
  count?: number;
}

export class ChartProgram {
  constructor(state?: ActionOptions);
  readonly semanticSpec: SemanticSpec;
  readonly graphicSpec: GraphicSpec;
  readonly resolvedScales: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly materializationConfigs: Readonly<Record<string, unknown>>;
  readonly context: Readonly<Record<string, unknown>>;
  readonly trace: TraceNode;
  readonly actionStack: readonly unknown[];

  createCanvas(options?: CanvasOptions): ChartProgram;
  editCanvas(options: CanvasOptions): ChartProgram;
  createData(options: { id: string; values: readonly unknown[] }): ChartProgram;
  filterData(options: { id: string; source?: string; field: string; oneOf: readonly unknown[] }): ChartProgram;
  createDensityData(options: ActionOptions): ChartProgram;
  createRegressionData(options: ActionOptions): ChartProgram;

  createPointMark(options: { id: string; data?: string; shape?: PointShape }): ChartProgram;
  editPointMark(options: { target?: string; shape: PointShape }): ChartProgram;
  createLineMark(options: { id: string; data?: string; strokeWidth?: number }): ChartProgram;
  createBarMark(options: { id: string; data?: string }): ChartProgram;
  createAreaMark(options: { id: string; data?: string; fill?: string; opacity?: number }): ChartProgram;

  encodeX(options: PositionEncodingOptions): ChartProgram;
  encodeY(options: PositionEncodingOptions): ChartProgram;
  encodeColor(options: CategoricalEncodingOptions): ChartProgram;
  encodeStrokeDash(options: CategoricalEncodingOptions): ChartProgram;
  encodeSize(options: { field: string; target?: string; fieldType?: "quantitative"; scale?: ScaleOptions }): ChartProgram;
  encodeShape(options: { field: string; target?: string; fieldType?: "nominal"; scale?: ScaleOptions }): ChartProgram;
  encodeOpacity(options: { value: number; target?: string }): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodeXOffset(options: ActionOptions): ChartProgram;
  encodeY2(options: ActionOptions): ChartProgram;
  encodeYRange(options: ActionOptions): ChartProgram;
  encodeGroup(options: { field: string; target?: string; fieldType?: "nominal" }): ChartProgram;
  encodeHistogram(options: ActionOptions): ChartProgram;
  encodeDensity(options: ActionOptions): ChartProgram;
  encodeBarWidth(options: { band?: number; target?: string }): ChartProgram;

  createRegression(options?: RegressionOptions): ChartProgram;
  createAxes(options?: ActionOptions): ChartProgram;
  createXAxis(options?: ActionOptions): ChartProgram;
  createYAxis(options?: ActionOptions): ChartProgram;
  createXAxisLine(options?: ActionOptions): ChartProgram;
  createYAxisLine(options?: ActionOptions): ChartProgram;
  editXAxisLine(options: ActionOptions): ChartProgram;
  editYAxisLine(options: ActionOptions): ChartProgram;
  createXAxisTicks(options?: ActionOptions): ChartProgram;
  createYAxisTicks(options?: ActionOptions): ChartProgram;
  editXAxisTicks(options: ActionOptions): ChartProgram;
  editYAxisTicks(options: ActionOptions): ChartProgram;
  createXAxisLabels(options?: ActionOptions): ChartProgram;
  createYAxisLabels(options?: ActionOptions): ChartProgram;
  editXAxisLabels(options: ActionOptions): ChartProgram;
  editYAxisLabels(options: ActionOptions): ChartProgram;
  createXAxisTicksAndLabels(options?: ActionOptions): ChartProgram;
  createYAxisTicksAndLabels(options?: ActionOptions): ChartProgram;
  editXAxisTicksAndLabels(options: ActionOptions): ChartProgram;
  editYAxisTicksAndLabels(options: ActionOptions): ChartProgram;
  createXAxisTitle(options?: ActionOptions): ChartProgram;
  createYAxisTitle(options?: ActionOptions): ChartProgram;
  editXAxisTitle(options: ActionOptions): ChartProgram;
  editYAxisTitle(options: ActionOptions): ChartProgram;
  createGrid(options?: ActionOptions): ChartProgram;
  createHorizontalGrid(options?: ActionOptions): ChartProgram;
  createVerticalGrid(options?: ActionOptions): ChartProgram;
  createLegend(options?: LegendOptions): ChartProgram;
  createGuides(options?: ActionOptions): ChartProgram;
  createTitle(options: ActionOptions & { text: string; subtitle?: string }): ChartProgram;

  createCoordinate(options?: ActionOptions): ChartProgram;
  createScale(options: ActionOptions & { id: string }): ChartProgram;
  editScale(options: EditScaleOptions): ChartProgram;
  createDerivedData(options: ActionOptions): ChartProgram;
  createRegressionBand(options: ActionOptions & { id: string }): ChartProgram;
  createRegressionLine(options: ActionOptions & { id: string }): ChartProgram;

  editSemantic(options: { property: string; value: unknown }): ChartProgram;
  createGraphics(options: {
    id: string;
    type: GraphicType;
    length?: number;
    before?: string;
    after?: string;
  }): ChartProgram;
  editGraphics(options: { target: string; property: string; value: unknown }): ChartProgram;
}
