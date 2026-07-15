export type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
export type GraphicType =
  | "canvas"
  | "collection"
  | "circle"
  | "rect"
  | "line"
  | "text"
  | "path";
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
export type CurveInterpolation =
  | "linear"
  | "step"
  | "step-before"
  | "step-after"
  | "basis"
  | "cardinal"
  | "monotone"
  | "natural";
export type DashStyle = "solid" | "dashed" | "dotted" | "dashdot";
export type DashPattern = readonly number[];
export type ScaleType = "linear" | "time" | "ordinal";
export type StackMode = "zero" | "normalize" | null;
export type DensityKernel =
  | "gaussian"
  | "epanechnikov"
  | "uniform"
  | "triangular";
export type DensityNormalization = "unit" | "count";
export type FilterComparison =
  | { op: "eq" | "neq"; value: unknown }
  | { op: "lt" | "lte" | "gt" | "gte"; value: number | string };
export type FilterRange = {
  min: number | string;
  max: number | string;
  inclusive?: boolean;
};
export type FilterModeOptions =
  | { oneOf: readonly unknown[]; predicate?: never; range?: never }
  | { oneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; predicate?: never; range: FilterRange };
export type FilterDataOptions = {
  id: string;
  source?: string;
  field: string;
} & FilterModeOptions;
export type FilterMarkOptions = {
  target?: string;
  field: string;
} & FilterModeOptions;
export type ColorLayout =
  | "stack"
  | "fill"
  | "group"
  | "overlay"
  | "diverging";
export type ScalarAggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";
export type ParameterizedAggregateOperation =
  | { op: "quantile"; probability: number }
  | {
      op: "first" | "last";
      orderBy: string;
      order?: "ascending" | "descending";
    };
export type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
export type ContinuousColorInterpolation =
  | "rgb"
  | "hsl"
  | "hsl-long"
  | "lab"
  | "hcl"
  | "hcl-long"
  | "cubehelix"
  | "cubehelix-long";
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
export type Palette = PaletteName | {
  name: PaletteName;
  count?: number;
  extent?: readonly [number, number];
};
export type ScaleRange = "auto" | readonly unknown[] | {
  readonly palette: Palette;
};
export type ActionOptions = Record<string, unknown>;
export type EditSemanticOptions =
  | { property: string; value: unknown; remove?: false }
  | { property: string; remove: true; value?: never };
export type EditGraphicsOptions =
  | { target: string; property: string; value: unknown; remove?: false }
  | { target: string; remove: true; property?: never; value?: never };

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
  range?: ScaleRange;
  nice?: boolean;
  zero?: boolean;
  palette?: Palette;
}

export interface EditScaleOptions {
  id?: string;
  domain?: "auto" | readonly unknown[];
  range?: ScaleRange;
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
  aggregate?: AggregateOperation;
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

export type HistogramEncodingOptions = {
  field: string;
  target?: string;
  coordinate?: string;
  stack?: StackMode;
  xScale?: ScaleOptions;
  yScale?: ScaleOptions;
} & (
  | { maxBins?: number; binStep?: never; binBoundaries?: never }
  | { maxBins?: never; binStep: number; binBoundaries?: never }
  | {
      maxBins?: never;
      binStep?: never;
      binBoundaries: readonly [number, number, ...number[]];
    }
);

export interface CategoricalEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: ScaleOptions;
  layout?: ColorLayout;
}

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
  as?: readonly [string, string];
}

export interface DensityEncodingOptions
  extends Omit<DensityDataOptions, "id"> {
  target?: string;
  densityChannel?: "x" | "y";
  coordinate?: string;
  valueScale?: ScaleOptions;
  densityScale?: ScaleOptions;
}

export interface EditDensityOptions {
  target?: string;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
}

export interface OffsetScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
}

export interface XOffsetEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: OffsetScaleOptions;
  paddingInner?: number;
  paddingOuter?: number;
}

export type BarWidthOptions = { target?: string } & (
  | { band?: number; pixels?: never }
  | { band?: never; pixels: number }
);

export interface DashScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly (DashStyle | DashPattern)[];
}

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

export interface ContinuousColorScaleOptions {
  id?: string;
  type?: "sequential";
  domain?: "auto" | readonly [unknown, unknown];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | {
    name: PaletteName;
    extent?: readonly [number, number];
  };
  interpolate?: ContinuousColorInterpolation;
  clamp?: boolean;
  reverse?: boolean;
}

export type ColorEncodingOptions = CategoricalEncodingOptions | {
  field: string;
  target?: string;
  fieldType: "quantitative" | "temporal";
  scale?: ContinuousColorScaleOptions;
  layout?: never;
};

export interface OpacityScaleOptions {
  id?: string;
  type?: "linear";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
}

export type OpacityEncodingOptions =
  | { value: number; field?: never; target?: string }
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: OpacityScaleOptions;
    };

export type RegressionMethod = "linear" | "polynomial" | "loess";
export type RegressionInterval = "mean" | "prediction";

export interface RegressionBandOptions {
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
}

type RegressionParameterOptions =
  | {
      method?: "linear";
      degree?: never;
      span?: never;
      confidence?: number;
      interval?: RegressionInterval;
    }
  | {
      method: "polynomial";
      degree?: number;
      span?: never;
      confidence?: number;
      interval?: RegressionInterval;
    }
  | {
      method: "loess";
      degree?: never;
      span?: number;
      confidence?: never;
      interval?: never;
    };

export type RegressionDataOptions = {
  id: string;
  source?: string;
  x: string;
  y: string;
  groupBy?: string;
} & RegressionParameterOptions;

type RegressionCommonOptions = {
  target?: string;
  x?: string;
  y?: string;
  groupBy?: string;
  line?: { strokeWidth?: number; curve?: CurveInterpolation };
};

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

export interface LegendTextOptions {
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface LegendTitleStyleOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

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

export type LegendSymbolRecipe =
  | "auto"
  | { length?: number; lineWidth?: number }
  | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
  | { layers: readonly LegendSymbolLayer[] };

export interface LegendBorderOptions {
  color?: string;
  lineWidth?: number;
  padding?: number;
  background?: string;
}

export interface LegendOptions {
  target?: string;
  channels?: readonly ("color" | "strokeDash" | "shape" | "opacity")[];
  position?: "right" | "left" | "bottom" | "top";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: number;
  offset?: number;
  titlePosition?: "top" | "left";
  title?: string;
  count?: number;
  gradient?: { length?: number; thickness?: number };
  symbol?: LegendSymbolRecipe;
  labels?: LegendTextOptions;
  titleStyle?: LegendTitleStyleOptions;
  itemGap?: number;
  border?: boolean | LegendBorderOptions;
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
  filterData(options: FilterDataOptions): ChartProgram;
  filterMark(options: FilterMarkOptions): ChartProgram;
  createDensityData(options: DensityDataOptions): ChartProgram;
  createRegressionData(options: RegressionDataOptions): ChartProgram;

  createPointMark(options: { id: string; data?: string; shape?: PointShape }): ChartProgram;
  editPointMark(options: { target?: string; shape: PointShape }): ChartProgram;
  createLineMark(options: {
    id: string;
    data?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  editLineMark(options: {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  createBarMark(options: { id: string; data?: string }): ChartProgram;
  createAreaMark(options: {
    id: string;
    data?: string;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
  editAreaMark(options: {
    target?: string;
    fill?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }): ChartProgram;

  encodeX(options: PositionEncodingOptions): ChartProgram;
  encodeY(options: PositionEncodingOptions): ChartProgram;
  encodeColor(options: ColorEncodingOptions): ChartProgram;
  encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
  encodeSize(options: { field: string; target?: string; fieldType?: "quantitative"; scale?: ScaleOptions }): ChartProgram;
  encodeShape(options: { field: string; target?: string; fieldType?: "nominal"; scale?: ScaleOptions }): ChartProgram;
  encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
  encodeY2(options: ActionOptions): ChartProgram;
  encodeYRange(options: ActionOptions): ChartProgram;
  encodeGroup(options: { field: string; target?: string; fieldType?: "nominal" }): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;

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
  createRegressionBand(options: ActionOptions & {
    id: string;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
  editRegressionBand(options: {
    target?: string;
    color?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }): ChartProgram;
  createRegressionLine(options: ActionOptions & {
    id: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  editRegressionLine(options: {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;

  editSemantic(options: EditSemanticOptions): ChartProgram;
  createGraphics(options: {
    id: string;
    type: GraphicType;
    length?: number;
    before?: string;
    after?: string;
  }): ChartProgram;
  editGraphics(options: EditGraphicsOptions): ChartProgram;
}
