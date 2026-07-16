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
export type MarkGraphicProperty =
  | "x" | "y" | "width" | "height" | "radius"
  | "x1" | "y1" | "x2" | "y2"
  | "fill" | "stroke" | "strokeWidth" | "opacity";
export type MarkSelector = {
  grain?: "item" | "stack";
} & (
  | { field: string; channel?: never; property?: never }
  | { channel: "x" | "y" | "x2" | "y2" | "xOffset" | "theta" | "radius" | "color" | "strokeDash" | "size" | "shape" | "group" | "opacity"; field?: never; property?: never }
  | { property: MarkGraphicProperty; field?: never; channel?: never }
) & (
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: unknown }
  | { op: "oneOf"; values: readonly unknown[] }
  | {
      op: "range";
      min: number | string;
      max: number | string;
      inclusive?: boolean;
    }
  | {
      op: "min" | "max";
      count?: number;
      groupBy?: string | readonly string[];
      ties?: "first" | "all";
    }
);
export type SelectMarksOptions = {
  id?: string;
  target?: string;
} & MarkSelector;
export type FilterMarksOptions = {
  target?: string;
} & MarkSelector;
export interface HighlightMarksOptions {
  id?: string;
  target?: string;
  select?: MarkSelector;
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

export type XAxisPosition = "bottom" | "top";
export type YAxisPosition = "left" | "right";
export type AxisFormatString =
  | ".0f" | ".1f" | ".2f"
  | ".0%" | ".1%" | ".2e"
  | "%Y" | "%Y-%m" | "%Y-%m-%d";
export type AxisFormat =
  | "auto"
  | AxisFormatString
  | { decimals: number };
export type AxisValue = string | boolean | number;
export interface AxisLineStyleOptions {
  color?: string;
  lineWidth?: number;
}
export interface AxisTickStyleOptions extends AxisLineStyleOptions {
  length?: number;
}
export interface AxisLabelStyleOptions {
  offset?: number;
  format?: AxisFormat;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export interface AxisTicksAndLabelsOptions<P extends string> {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
  ticks?: AxisTickStyleOptions;
  labels?: AxisLabelStyleOptions;
}
export interface AxisTitleOptions<P extends string> {
  text?: string;
  scale?: string;
  position?: P;
  at?: "start" | "center" | "end" | number;
  offset?: number;
  rotation?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export interface CompleteAxisOptions<P extends string> {
  scale?: string;
  coordinate?: string;
  position?: P;
  line?: AxisLineStyleOptions;
  ticksAndLabels?: Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position">;
  title?: Omit<AxisTitleOptions<P>, "scale" | "position">;
}
export interface CreateAxesOptions {
  coordinate?: {
    id?: string;
    type?: "auto" | "cartesian" | "polar";
  };
  x?: false | CompleteAxisOptions<XAxisPosition>;
  y?: false | CompleteAxisOptions<YAxisPosition>;
}
export interface AxisTickOptions<P extends string>
  extends AxisTickStyleOptions {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
}
export interface AxisLabelOptions<P extends string>
  extends AxisLabelStyleOptions {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
}

export interface GridDirectionOptions {
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly number[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
export interface EditGridOptions {
  count?: number;
  values?: readonly number[] | "auto";
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
export interface CreateGridOptions {
  horizontal?: boolean | GridDirectionOptions;
  vertical?: boolean | GridDirectionOptions;
}

export interface ScaleOptions {
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: ScaleRange;
  nice?: boolean;
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
  unknown?: unknown;
}

export interface EditScaleOptions {
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: ScaleRange;
  nice?: boolean;
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
  interpolate?: ContinuousColorInterpolation;
  unknown?: unknown;
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

type RulePositionValue =
  | { field: string; datum?: never }
  | { field?: never; datum: unknown };

export type RulePositionEncodingOptions = RulePositionValue & {
  target?: string;
  fieldType: FieldType;
  scale?: ScaleOptions;
  coordinate?: string;
};

export type SecondaryPositionEncodingOptions =
  | RulePositionEncodingOptions
  | {
      field: string;
      datum?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: { id?: string };
      coordinate?: string;
    };

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

export type IntervalCenter = "mean" | "median";
export type IntervalExtent = "stderr" | "stdev" | "ci" | "iqr";

export interface IntervalOutputFields {
  center: string;
  lower: string;
  upper: string;
}

export interface IntervalDataOptions {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly string[];
  center?: IntervalCenter;
  extent?: IntervalExtent;
  level?: number;
  as?: IntervalOutputFields;
}

export interface ErrorBarPositionChannel {
  field?: string;
  fieldType?: "nominal" | "ordinal" | "temporal";
  scale?: ScaleOptions;
}

export interface ErrorBarStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  level?: number;
  scale?: ScaleOptions;
}

export interface ErrorBarExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: ScaleOptions;
}

export type ErrorBarIntervalChannel =
  | ErrorBarStatisticalIntervalChannel
  | ErrorBarExplicitIntervalChannel;

export interface ErrorBarOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  y?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  groupBy?: string;
  coordinate?: string;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}

export interface BoxPlotCategoryChannel {
  field: string;
  fieldType: "nominal" | "ordinal" | "temporal";
  scale?: ScaleOptions;
}

export interface BoxPlotMeasureChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: ScaleOptions;
}

export type BoxPlotPositionChannel =
  | BoxPlotCategoryChannel
  | BoxPlotMeasureChannel;

export type BoxPlotWhisker =
  | { type?: "tukey"; factor?: number }
  | { type: "minmax"; factor?: never };

export interface BoxPlotOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  coordinate?: string;
  whisker?: BoxPlotWhisker;
  width?: { band?: number };
  outliers?: boolean;
  box?: {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: {
    stroke?: string;
    strokeWidth?: number;
  };
  outlier?: {
    shape?: PointShape;
    radius?: number;
    opacity?: number;
  };
}

export interface ErrorBandPositionChannel {
  field?: string;
  fieldType?: "quantitative" | "temporal";
  scale?: ScaleOptions;
}

export interface ErrorBandStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  level?: number;
  scale?: ScaleOptions;
}

export interface ErrorBandExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: ScaleOptions;
}

export type ErrorBandIntervalChannel =
  | ErrorBandStatisticalIntervalChannel
  | ErrorBandExplicitIntervalChannel;

export interface ErrorBandOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  y?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  groupBy?: string;
  coordinate?: string;
  fill?: string;
  opacity?: number;
  curve?: CurveInterpolation;
  boundaries?: false | {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: DashStyle | DashPattern;
    opacity?: number;
    curve?: CurveInterpolation;
  };
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

export type DiscretizedColorScaleOptions =
  | {
      id?: string;
      type: "quantize";
      domain?: "auto" | readonly [number, number];
      range?: "auto" | readonly [string, string, ...string[]];
      palette?: PaletteName | { name: PaletteName; count?: number };
      clamp?: boolean;
      reverse?: boolean;
    }
  | {
      id?: string;
      type: "quantile";
      domain?: "auto" | readonly number[];
      range?: "auto" | readonly [string, string, ...string[]];
      palette?: PaletteName | { name: PaletteName; count?: number };
      reverse?: boolean;
    }
  | {
      id?: string;
      type: "threshold";
      domain: readonly number[];
      range?: "auto" | readonly [string, string, ...string[]];
      palette?: PaletteName | { name: PaletteName; count?: number };
      reverse?: boolean;
    };

export type ColorEncodingOptions =
  | CategoricalEncodingOptions
  | {
      field: string;
      target?: string;
      fieldType: "quantitative";
      aggregate?: AggregateOperation;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      layout?: never;
    }
  | {
      field: string;
      target?: string;
      fieldType: "temporal";
      aggregate?: never;
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
  curve?: CurveInterpolation;
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

export interface EditLegendOptions
  extends Omit<LegendOptions, "channels" | "title"> {
  title?: string | "auto" | false;
}

export interface TitleTextStyleOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface TitleOptions {
  text: string;
  subtitle?: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: number;
  gap?: number;
  maxWidth?: number;
  wrap?: "word" | "character";
  lineHeight?: number;
  titleStyle?: TitleTextStyleOptions;
  subtitleStyle?: TitleTextStyleOptions;
}

export interface EditTitleOptions
  extends Omit<TitleOptions, "text" | "subtitle"> {
  text?: string;
  subtitle?: string | false;
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
  createData(options: { id?: string; values: readonly unknown[] }): ChartProgram;
  filterData(options: FilterDataOptions): ChartProgram;
  filterMarks(options: FilterMarksOptions): ChartProgram;
  selectMarks(options: SelectMarksOptions): ChartProgram;
  highlightMarks(options: HighlightMarksOptions): ChartProgram;
  createDensityData(options: DensityDataOptions): ChartProgram;
  createRegressionData(options: RegressionDataOptions): ChartProgram;
  createIntervalData(options: IntervalDataOptions): ChartProgram;

  createPointMark(options?: { id?: string; data?: string; shape?: PointShape }): ChartProgram;
  editPointMark(options: {
    target?: string;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
  createLineMark(options?: {
    id?: string;
    data?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  editLineMark(options: {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  createBarMark(options?: { id?: string; data?: string }): ChartProgram;
  editBarMark(options: {
    target?: string;
    fill?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }): ChartProgram;
  createAreaMark(options?: {
    id?: string;
    data?: string;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string }): ChartProgram;
  editAreaMark(options: {
    target?: string;
    fill?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;

  encodeX(options: PositionEncodingOptions | RulePositionEncodingOptions): ChartProgram;
  encodeY(options: PositionEncodingOptions | RulePositionEncodingOptions): ChartProgram;
  encodeX2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeColor(options: ColorEncodingOptions): ChartProgram;
  encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
  encodeSize(options: { field: string; target?: string; fieldType?: "quantitative"; scale?: ScaleOptions }): ChartProgram;
  encodeShape(options: { field: string; target?: string; fieldType?: "nominal"; scale?: ScaleOptions }): ChartProgram;
  encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
  encodeY2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeYRange(options: {
    lower: string;
    upper: string;
    target?: string;
    fieldType?: "quantitative";
    coordinate?: string;
    scale?: ScaleOptions;
  }): ChartProgram;
  encodeXRange(options: {
    lower: string;
    upper: string;
    target?: string;
    fieldType?: "quantitative";
    coordinate?: string;
    scale?: ScaleOptions;
  }): ChartProgram;
  encodeGroup(options: { field: string; target?: string; fieldType?: "nominal" }): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: { target?: string; value: string }): ChartProgram;
  encodeStrokeWidth(options: { target?: string; value: number }): ChartProgram;

  createRegression(options?: RegressionOptions): ChartProgram;
  createErrorBar(options?: ErrorBarOptions): ChartProgram;
  createErrorBand(options?: ErrorBandOptions): ChartProgram;
  createBoxPlot(options?: BoxPlotOptions): ChartProgram;
  createAxes(options?: CreateAxesOptions): ChartProgram;
  createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
  createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
  createXAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: XAxisPosition }): ChartProgram;
  createYAxisLine(options?: AxisLineStyleOptions & { scale?: string; position?: YAxisPosition }): ChartProgram;
  editXAxisLine(options?: AxisLineStyleOptions & { position?: XAxisPosition }): ChartProgram;
  editYAxisLine(options?: AxisLineStyleOptions & { position?: YAxisPosition }): ChartProgram;
  createXAxisTicks(options?: AxisTickOptions<XAxisPosition>): ChartProgram;
  createYAxisTicks(options?: AxisTickOptions<YAxisPosition>): ChartProgram;
  editXAxisTicks(options?: Omit<AxisTickOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTicks(options?: Omit<AxisTickOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisLabels(options?: AxisLabelOptions<XAxisPosition>): ChartProgram;
  createYAxisLabels(options?: AxisLabelOptions<YAxisPosition>): ChartProgram;
  editXAxisLabels(options?: Omit<AxisLabelOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisLabels(options?: Omit<AxisLabelOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<XAxisPosition>): ChartProgram;
  createYAxisTicksAndLabels(options?: AxisTicksAndLabelsOptions<YAxisPosition>): ChartProgram;
  editXAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTicksAndLabels(options: Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "scale">): ChartProgram;
  createXAxisTitle(options?: AxisTitleOptions<XAxisPosition>): ChartProgram;
  createYAxisTitle(options?: AxisTitleOptions<YAxisPosition>): ChartProgram;
  editXAxisTitle(options?: Omit<AxisTitleOptions<XAxisPosition>, "scale">): ChartProgram;
  editYAxisTitle(options?: Omit<AxisTitleOptions<YAxisPosition>, "scale">): ChartProgram;
  createGrid(options?: CreateGridOptions): ChartProgram;
  createHorizontalGrid(options?: GridDirectionOptions): ChartProgram;
  createVerticalGrid(options?: GridDirectionOptions): ChartProgram;
  editHorizontalGrid(options: EditGridOptions): ChartProgram;
  editVerticalGrid(options: EditGridOptions): ChartProgram;
  createLegend(options?: LegendOptions): ChartProgram;
  editLegend(options: EditLegendOptions): ChartProgram;
  createGuides(options?: ActionOptions): ChartProgram;
  createTitle(options: TitleOptions): ChartProgram;
  editTitle(options: EditTitleOptions): ChartProgram;

  createCoordinate(options?: ActionOptions): ChartProgram;
  createScale(options: ActionOptions & { id: string }): ChartProgram;
  editScale(options: EditScaleOptions): ChartProgram;
  createDerivedData(options: ActionOptions): ChartProgram;
  createRegressionBand(options: ActionOptions & {
    id: string;
    stroke?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  editRegressionBand(options: {
    target?: string;
    color?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
    curve?: CurveInterpolation;
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
