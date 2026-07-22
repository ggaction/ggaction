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
export interface LinearGradientPoint {
  readonly x: number;
  readonly y: number;
}
export interface LinearGradientStop {
  readonly offset: number;
  readonly color: string;
}
export interface LinearGradientPaint {
  readonly type: "linear-gradient";
  readonly from: LinearGradientPoint;
  readonly to: LinearGradientPoint;
  readonly stops: readonly [
    LinearGradientStop,
    LinearGradientStop,
    ...LinearGradientStop[]
  ];
}
export type FillPaint = string | LinearGradientPaint;
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
export type JitterMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };
export interface JitterPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset: JitterMaxOffset;
  seed?: string | number;
  key?: string;
}
export interface RemoveJitterOptions {
  target?: string;
}
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
export type CompositionAlign = "start" | "center" | "end";
export interface CompositionPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}
export type CompositionProgramEntry =
  | ChartProgram
  | { id?: string; program: ChartProgram };
export interface CompositionOptions {
  id?: string;
  programs: readonly CompositionProgramEntry[];
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
}
export interface EditCompositionLayoutOptions {
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
}
export interface ReplaceCompositionChildOptions {
  target: string;
  program: ChartProgram;
}
export type FacetScaleResolution = "shared" | "independent";
export interface FacetScaleResolutions {
  x?: FacetScaleResolution;
  y?: FacetScaleResolution;
  xOffset?: FacetScaleResolution;
  yOffset?: FacetScaleResolution;
  color?: FacetScaleResolution;
  size?: FacetScaleResolution;
  shape?: FacetScaleResolution;
  opacity?: FacetScaleResolution;
  strokeDash?: FacetScaleResolution;
}
export interface FacetGuideOptions {
  axes?: "each" | "outer";
  legend?: false | "shared";
}
export interface FacetOptions {
  id?: string;
  field: string;
  data?: string;
  columns?: number;
  gap?: number;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
}
export interface EditFacetHeadersOptions {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
}
export interface ConcatCompositionSpec {
  readonly id: string;
  readonly direction: "horizontal" | "vertical";
  readonly children: readonly string[];
  readonly gap: number;
  readonly align: CompositionAlign;
  readonly padding: Readonly<Required<CompositionPadding>>;
}
export interface FacetCompositionSpec {
  readonly id: string;
  readonly type: "facet";
  readonly children: readonly string[];
  readonly columns: number;
  readonly gap: number;
  readonly align: CompositionAlign;
  readonly padding: Readonly<Required<CompositionPadding>>;
  readonly facet: {
    readonly data: string;
    readonly field: string;
    readonly values: readonly DatasetScalar[];
    readonly scales: Readonly<Required<FacetScaleResolutions>>;
    readonly guides: {
      readonly axes: "each" | "outer";
      readonly legend: false | "shared";
    };
  };
}
export type CompositionSpec = ConcatCompositionSpec | FacetCompositionSpec;
export type DensityKernel =
  | "gaussian"
  | "epanechnikov"
  | "uniform"
  | "triangular";
export type DensityNormalization = "unit" | "count";
export type DensityPlacementSide =
  | "both"
  | "left"
  | "right"
  | "top"
  | "bottom";
export type DensityWidthResolution = "shared" | "independent";
export interface DensityPlacementWidth {
  band?: number;
  resolve?: DensityWidthResolution;
}
export interface DensityPlacementSplit {
  field: string;
  domain?: readonly [unknown, unknown];
}
export interface BaselineDensityPlacement {
  type: "baseline";
}
export interface CategoryDensityPlacement {
  type: "category";
  side?: DensityPlacementSide;
  width?: DensityPlacementWidth;
  split?: DensityPlacementSplit;
  scale?: ScaleOptions;
}
export type DensityPlacement =
  | BaselineDensityPlacement
  | CategoryDensityPlacement;
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
export type DatasetScalar = string | number | boolean | null;
export type DatasetFilterTransform = {
  type: "filter";
  field: string;
} & (
  | { oneOf: readonly DatasetScalar[]; predicate?: never; range?: never }
  | { oneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; predicate?: never; range: FilterRange }
);
export type DatasetRegressionTransform = {
  type: "regression";
  x: string;
  y: string;
  groupBy?: string;
} & (
  | {
      method: "linear";
      confidence: number;
      interval: "mean" | "prediction";
      degree?: never;
      span?: never;
    }
  | {
      method: "polynomial";
      degree: number;
      confidence: number;
      interval: "mean" | "prediction";
      span?: never;
    }
  | {
      method: "loess";
      span: number;
      degree?: never;
      confidence?: never;
      interval?: never;
    }
);
export interface DatasetDensityTransform {
  type: "density";
  field: string;
  groupBy?: string;
  bandwidth: "auto" | number;
  extent: "auto" | readonly [number, number];
  steps: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  as: readonly [string, string];
  resolve: "shared";
  placement?: {
    readonly type: "category";
    readonly channel: "x" | "y";
    readonly categoryField: string;
    readonly side: DensityPlacementSide;
    readonly width: {
      readonly band: number;
      readonly resolve: DensityWidthResolution;
    };
    readonly split?: {
      readonly field: string;
      readonly domain?: readonly [unknown, unknown];
    };
  };
  resolved?: {
    readonly bandwidth: number;
    readonly extent: readonly [number, number];
    readonly splitDomain?: readonly [unknown, unknown];
  };
}
export type HorizonResolution = "shared" | "independent";
export type HorizonMissingPolicy = "break" | "error";
export type HorizonOverflowPolicy = "clip" | "error";
export interface HorizonOutputFields {
  readonly x: string;
  readonly lower: string;
  readonly upper: string;
  readonly group: string;
  readonly color: string;
  readonly sign: string;
  readonly band: string;
  readonly segment: string;
}
export interface DatasetHorizonTransform {
  readonly type: "horizon";
  readonly x: {
    readonly field: string;
    readonly fieldType: "quantitative" | "temporal";
  };
  readonly y: {
    readonly field: string;
    readonly fieldType: "quantitative";
  };
  readonly groupBy?: string;
  readonly bands: number;
  readonly baseline: number;
  readonly extent: "auto" | number;
  readonly resolve: HorizonResolution;
  readonly missing: HorizonMissingPolicy;
  readonly overflow: HorizonOverflowPolicy;
  readonly palette: {
    readonly positive: Readonly<Exclude<Palette, string>>;
    readonly negative: Readonly<Exclude<Palette, string>>;
  };
  readonly as: HorizonOutputFields;
  readonly resolved?: {
    readonly extents: readonly {
      readonly group?: DatasetScalar;
      readonly extent: number;
      readonly bandHeight: number;
    }[];
  };
}
export interface DatasetIntervalOutputFields {
  center: string;
  lower: string;
  upper: string;
}
export type DatasetIntervalTransform = {
  type: "interval";
  field: string;
  groupBy: readonly string[];
  as: DatasetIntervalOutputFields;
} & (
  | {
      center: "mean";
      extent: "stderr" | "stdev";
      level?: never;
    }
  | {
      center: "mean";
      extent: "ci";
      level: number;
    }
  | {
      center: "median";
      extent: "iqr";
      level?: never;
    }
);
export type WindowSortOrder = "ascending" | "descending";
export interface WindowSort {
  field: string;
  order?: WindowSortOrder;
}
export type WindowOperation =
  | { op: "rowNumber" | "rank" | "denseRank"; as: string }
  | { op: "cumulativeSum"; field: string; as: string }
  | {
      op: "lag" | "lead";
      field: string;
      as: string;
      offset?: number;
      default?: unknown;
    };
export interface DatasetWindowSort {
  readonly field: string;
  readonly order: WindowSortOrder;
}
export type DatasetWindowOperation =
  | { readonly op: "rowNumber" | "rank" | "denseRank"; readonly as: string }
  | {
      readonly op: "cumulativeSum";
      readonly field: string;
      readonly as: string;
    }
  | {
      readonly op: "lag" | "lead";
      readonly field: string;
      readonly as: string;
      readonly offset: number;
      readonly default: unknown;
    };
export interface DatasetWindowTransform {
  readonly type: "window";
  readonly partitionBy: readonly string[];
  readonly sortBy: readonly DatasetWindowSort[];
  readonly operations: readonly DatasetWindowOperation[];
}
export interface Bin2DCounts {
  x: number;
  y: number;
}
export interface Bin2DExtent {
  x?: readonly [number, number];
  y?: readonly [number, number];
}
export interface Bin2DOutputFields {
  x0?: string;
  x1?: string;
  y0?: string;
  y1?: string;
  count?: string;
  members?: string;
}
export interface DatasetBin2DOutputFields {
  readonly x0: string;
  readonly x1: string;
  readonly y0: string;
  readonly y1: string;
  readonly count: string;
  readonly members?: string;
}
export interface DatasetBin2DTransform {
  readonly type: "bin2d";
  readonly x: string;
  readonly y: string;
  readonly bins: Readonly<Bin2DCounts>;
  readonly extent: {
    readonly x: "auto" | readonly [number, number];
    readonly y: "auto" | readonly [number, number];
  };
  readonly includeEmpty: boolean;
  readonly members: boolean;
  readonly as: DatasetBin2DOutputFields;
  readonly resolved?: {
    readonly extent: {
      readonly x: readonly [number, number];
      readonly y: readonly [number, number];
    };
    readonly edges: {
      readonly x: readonly number[];
      readonly y: readonly number[];
    };
    readonly eligibleCount: number;
    readonly occupiedCount: number;
  };
}
export type DatasetTransform =
  | DatasetBin2DTransform
  | DatasetFilterTransform
  | DatasetRegressionTransform
  | DatasetDensityTransform
  | DatasetHorizonTransform
  | DatasetIntervalTransform
  | DatasetWindowTransform;
export interface CreateDerivedDataOptions {
  id: string;
  source: string;
  transform: readonly [DatasetTransform];
}
export type MarkGraphicProperty =
  | "x" | "y" | "width" | "height" | "radius"
  | "x1" | "y1" | "x2" | "y2"
  | "fill" | "stroke" | "strokeWidth" | "opacity";
export type MarkSelector = {
  grain?: "item" | "stack";
} & (
  | { field: string; channel?: never; property?: never }
  | { channel: "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "strokeDash" | "size" | "shape" | "group" | "opacity"; field?: never; property?: never }
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
export type EditMarkSelectionOptions = {
  selection?: string;
} & MarkSelector;
export interface RemoveMarkSelectionOptions {
  selection?: string;
}
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

export interface SemanticDataset {
  readonly id: string;
  readonly values?: readonly Readonly<Record<string, unknown>>[];
  readonly source?: string;
  readonly transform?: readonly Readonly<Record<string, unknown>>[];
  readonly [key: string]: unknown;
}

export interface SemanticLayer {
  readonly id: string;
  readonly data?: string;
  readonly source?: string;
  readonly coordinate?: string;
  readonly mark?: Readonly<{ type?: string; [key: string]: unknown }>;
  readonly encoding?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly [key: string]: unknown;
}

export interface SemanticScale {
  readonly id: string;
  readonly type?: ScaleType;
  readonly domain?: "auto" | readonly unknown[];
  readonly range?: ScaleRange;
  readonly [key: string]: unknown;
}

export interface SemanticCoordinate {
  readonly id: string;
  readonly type?: "cartesian" | "polar";
  readonly layers?: readonly string[];
  readonly [key: string]: unknown;
}

export interface SemanticSpec {
  readonly datasets: readonly SemanticDataset[];
  readonly layers: readonly SemanticLayer[];
  readonly scales: readonly SemanticScale[];
  readonly coordinates: readonly SemanticCoordinate[];
  readonly guides: Readonly<Record<string, unknown>>;
  readonly title: Readonly<Record<string, unknown>>;
}

export interface GraphicItem {
  readonly id: string;
  readonly type?: Exclude<GraphicType, "canvas" | "collection">;
  readonly properties: Readonly<Record<string, unknown>>;
}

export interface GraphicObject {
  readonly type: GraphicType;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly items?: readonly GraphicItem[];
  readonly children?: readonly string[];
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
    type?: "auto" | "cartesian" | "polar" | "parallel";
  };
  x?: false | CompleteAxisOptions<XAxisPosition>;
  y?: false | CompleteAxisOptions<YAxisPosition>;
  theta?: false | CompletePolarAxisOptions;
  radius?: false | CompleteRadialAxisOptions;
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

export interface PolarGuideResourceOptions {
  scale?: string;
  coordinate?: string;
  angle?: number;
}
export interface PolarTickOptions extends AxisTickStyleOptions {
  count?: number;
  values?: readonly AxisValue[];
}
export interface PolarLabelOptions extends AxisLabelStyleOptions {
  count?: number;
  values?: readonly AxisValue[];
}
export interface PolarTicksAndLabelsOptions {
  count?: number;
  values?: readonly AxisValue[];
  ticks?: AxisTickStyleOptions;
  labels?: AxisLabelStyleOptions;
}
export interface PolarTitleOptions {
  text?: string;
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export interface RadialTitleOptions extends PolarTitleOptions {
  position?: "inside" | "outside";
}
export interface CompletePolarAxisOptions extends PolarGuideResourceOptions {
  line?: AxisLineStyleOptions;
  ticksAndLabels?: PolarTicksAndLabelsOptions;
  title?: false | PolarTitleOptions;
}
export interface CompleteRadialAxisOptions
  extends Omit<CompletePolarAxisOptions, "title"> {
  title?: false | RadialTitleOptions;
}
export interface EditPolarAxisOptions {
  angle?: number;
  line?: AxisLineStyleOptions;
  ticks?: PolarTickOptions;
  labels?: PolarLabelOptions;
  ticksAndLabels?: PolarTicksAndLabelsOptions;
  title?: PolarTitleOptions;
}
export interface EditRadialAxisOptions
  extends Omit<EditPolarAxisOptions, "title"> {
  title?: RadialTitleOptions;
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
export interface EditGridDirectionsOptions {
  horizontal?: EditGridOptions;
  vertical?: EditGridOptions;
  theta?: EditPolarGridOptions;
  radial?: EditPolarGridOptions;
}
export interface CreateGridOptions {
  horizontal?: boolean | GridDirectionOptions;
  vertical?: boolean | GridDirectionOptions;
  theta?: boolean | PolarGridOptions;
  radial?: boolean | PolarGridOptions;
}
export interface PolarGridOptions {
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly AxisValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
export interface EditPolarGridOptions {
  count?: number;
  values?: readonly AxisValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}

export interface CreateGuidesOptions {
  axes?: false | CreateAxesOptions;
  grid?: false | CreateGridOptions;
  legend?: false | LegendOptions;
}

export interface CreateCoordinateOptions {
  id?: string;
  type?: "cartesian" | "polar" | "parallel";
  layers?: readonly string[];
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

export type CreateScaleOptions = ScaleOptions & { id: string };

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
  palette?: Palette;
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

export interface ThetaScaleOptions {
  id?: string;
  type?: "linear" | "time" | "band" | "point";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  paddingInner?: number;
  paddingOuter?: number;
  padding?: number;
  align?: number;
  unknown?: unknown;
}

export interface RadiusScaleOptions {
  id?: string;
  type?: "linear" | "log" | "pow" | "sqrt" | "symlog";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
  constant?: number;
  unknown?: unknown;
}

export interface ThetaEncodingOptions {
  field: string;
  target?: string;
  fieldType?: FieldType;
  scale?: ThetaScaleOptions;
  coordinate?: string;
  aggregate?: "count" | "sum";
  weight?: string;
}

export interface RadialEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "quantitative";
  scale?: RadiusScaleOptions;
  coordinate?: string;
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
      fieldType?: "quantitative" | "temporal";
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
  fieldType?: "nominal" | "ordinal";
  scale?: ScaleOptions;
  palette?: Palette;
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

type DensityEncodingBase = Omit<DensityDataOptions, "id"> & {
  target?: string;
  densityChannel?: "x" | "y";
  coordinate?: string;
  valueScale?: ScaleOptions;
};

export type DensityEncodingOptions = DensityEncodingBase & (
  | {
      placement?: BaselineDensityPlacement;
      densityScale?: ScaleOptions;
    }
  | {
      placement: CategoryDensityPlacement;
      densityScale?: never;
    }
);

export interface HorizonXEncoding {
  field: string;
  fieldType?: "quantitative" | "temporal";
  scale?: ScaleOptions;
}

export interface HorizonYEncoding {
  field: string;
  fieldType?: "quantitative";
  scale?: ScaleOptions;
}

export interface HorizonPaletteOptions {
  positive?: Palette;
  negative?: Palette;
}

export interface HorizonEncodingOptions {
  target?: string;
  source?: string;
  x?: string | HorizonXEncoding;
  y?: string | HorizonYEncoding;
  groupBy?: string;
  bands?: number;
  baseline?: number;
  extent?: "auto" | number;
  resolve?: HorizonResolution;
  missing?: HorizonMissingPolicy;
  overflow?: HorizonOverflowPolicy;
  palette?: HorizonPaletteOptions;
}

export interface EditHorizonOptions
  extends Omit<HorizonEncodingOptions, "groupBy"> {
  groupBy?: string | false;
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

export interface WindowDataOptions {
  id: string;
  source?: string;
  partitionBy?: string | readonly string[];
  sortBy?: readonly WindowSort[];
  operations: readonly WindowOperation[];
}

export interface Bin2DDataOptions {
  id: string;
  source?: string;
  x: string;
  y: string;
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  includeEmpty?: boolean;
  members?: boolean;
  as?: Bin2DOutputFields;
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

export interface EditErrorBarOptions {
  target?: string;
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
  guides?: false | CreateGuidesOptions;
}

export interface EditBoxPlotOptions {
  target?: string;
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

export type GradientPlotPositionChannel = BoxPlotPositionChannel;

export interface GradientPlotDensityOptions {
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
}

export interface GradientPlotAppearanceOptions {
  palette?: Palette;
  opacity?: readonly [number, number];
}

export interface GradientPlotCenterOptions {
  type?: "mean" | "median";
  stroke?: string;
  strokeWidth?: number;
}

export interface GradientPlotOptions {
  id?: string;
  target?: string;
  data?: string;
  x?: GradientPlotPositionChannel;
  y?: GradientPlotPositionChannel;
  coordinate?: string;
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
  guides?: false | CreateGuidesOptions;
}

export type ViolinPlotPositionChannel =
  | string
  | BoxPlotPositionChannel;

export interface ViolinPlotDensityOptions
  extends GradientPlotDensityOptions {
  width?: DensityPlacementWidth;
}

export interface ViolinPlotSplitOptions {
  field: string;
  domain?: readonly [unknown, unknown];
}

export type ViolinPlotColorOptions =
  | string
  | Omit<CategoricalEncodingOptions, "target">;

export interface ViolinPlotAreaOptions {
  fill?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}

export interface ViolinPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: ViolinPlotPositionChannel;
  y: ViolinPlotPositionChannel;
  split?: ViolinPlotSplitOptions;
  color?: ViolinPlotColorOptions;
  density?: ViolinPlotDensityOptions;
  area?: ViolinPlotAreaOptions;
  guides?: false | CreateGuidesOptions;
}

export interface EditGradientPlotOptions {
  target?: string;
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
}

type BasicPositionChannel =
  | string
  | Omit<PositionEncodingOptions, "target" | "coordinate">;
type BasicColorChannel =
  | string
  | (ColorEncodingOptions extends infer T
      ? T extends unknown ? Omit<T, "target"> : never
      : never);
export type BasicSizeChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: ScaleOptions;
};
export type BasicShapeChannel = string | {
  field: string;
  fieldType?: "nominal";
  scale?: ScaleOptions;
};
export type BasicStrokeDashChannel =
  StrokeDashEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "target"> : never
    : never;

export type ParallelMissingPolicy = "break" | "drop-row" | "error";
export type ParallelDimension = string | {
  field: string;
  fieldType?: "quantitative" | "ordinal";
  title?: string;
  scale?: Omit<ScaleOptions, "id">;
};
export interface ParallelCoordinatesEncodingOptions {
  target?: string;
  coordinate?: string;
  dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]];
  key?: string;
  missing?: ParallelMissingPolicy;
}
export interface CreateParallelCoordinatesOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]];
  key?: string;
  missing?: ParallelMissingPolicy;
  color?: BasicColorChannel;
  strokeDash?: BasicStrokeDashChannel;
  line?: {
    strokeWidth?: number;
    stroke?: string;
    opacity?: number;
    curve?: "linear";
    closed?: false;
  };
  guides?: false | CreateGuidesOptions;
}

export interface CreateScatterPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: BasicPositionChannel;
  y: BasicPositionChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: {
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  guides?: false | CreateGuidesOptions;
}

export interface CreateLinePlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: BasicPositionChannel;
  y: BasicPositionChannel;
  color?: BasicColorChannel;
  groupBy?: string;
  strokeDash?: BasicStrokeDashChannel;
  line?: {
    strokeWidth?: number;
    curve?: CurveInterpolation;
    stroke?: string;
    opacity?: number;
    closed?: boolean;
  };
  guides?: false | CreateGuidesOptions;
}

type BasicHistogramEncoding =
  HistogramEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "field" | "target" | "coordinate"> : never
    : never;

export interface CreateBarPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: BasicPositionChannel;
  y: BasicPositionChannel;
  color?: BasicColorChannel;
  width?: Omit<BarWidthOptions, "target">;
  bar?: {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  guides?: false | CreateGuidesOptions;
}

export type CreateHistogramOptions = BasicHistogramEncoding & {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  color?: BasicColorChannel;
  bar?: {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  guides?: false | CreateGuidesOptions;
};

export interface HeatmapBaseOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  rect?: {
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  };
  guides?: false | CreateGuidesOptions;
}

export interface PreGriddedHeatmapOptions extends HeatmapBaseOptions {
  x: BasicPositionChannel;
  y: BasicPositionChannel;
  bin?: never;
  color: BasicColorChannel;
}

export interface BinnedHeatmapPositionChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: ScaleOptions;
}

export interface BinnedHeatmapColorOptions {
  scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
  palette?: Palette;
}

export interface HeatmapBinOptions {
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  includeEmpty?: boolean;
}

export interface BinnedHeatmapOptions extends HeatmapBaseOptions {
  x: string | BinnedHeatmapPositionChannel;
  y: string | BinnedHeatmapPositionChannel;
  bin: HeatmapBinOptions;
  color?: BinnedHeatmapColorOptions;
}

export type CreateHeatmapOptions =
  | PreGriddedHeatmapOptions
  | BinnedHeatmapOptions;

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

export interface EditErrorBandOptions {
  target?: string;
  fill?: string;
  opacity?: number;
  curve?: CurveInterpolation;
}

export interface EditErrorBandBoundaryOptions {
  target?: string;
  boundary?: "both" | "lower" | "upper";
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
  curve?: CurveInterpolation;
}

export interface EditDensityOptions {
  target?: string;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  placement?: DensityPlacement;
}

export interface OffsetScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
}

export interface OffsetEncodingOptions {
  field: string;
  target?: string;
  fieldType?: "nominal" | "ordinal";
  scale?: OffsetScaleOptions;
  paddingInner?: number;
  paddingOuter?: number;
}

export interface XOffsetEncodingOptions extends OffsetEncodingOptions {}
export interface YOffsetEncodingOptions extends OffsetEncodingOptions {}

export type TextFormat = "auto" | `.${number}f`;

export interface TextMarkOptions {
  id?: string;
  data?: string;
  text?: unknown;
  fill?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  align?: "left" | "right" | "center" | "start" | "end";
  baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  rotation?: number;
  dx?: number;
  dy?: number;
}

export interface EditTextMarkOptions extends Omit<TextMarkOptions, "id" | "data" | "text"> {
  target?: string;
}

export type LabelLayoutAxis = "x" | "y" | "both";
export type LabelLayoutBounds = "plot" | "canvas";

export interface LabelLeaderOptions {
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: readonly number[];
  opacity?: number;
}

export interface LabelLayoutOptions {
  target?: string;
  axis?: LabelLayoutAxis;
  padding?: number;
  maxDisplacement?: number;
  bounds?: LabelLayoutBounds;
  leader?: false | LabelLeaderOptions;
}

export interface RemoveLabelLayoutOptions {
  target?: string;
}

export interface RectMarkOptions {
  id?: string;
  data?: string;
  fill?: string;
  opacity?: number;
  stroke?: string | false;
  strokeWidth?: number;
}

export interface EditRectMarkOptions extends Omit<RectMarkOptions, "id" | "data"> {
  target?: string;
}

export type TextEncodingOptions = {
  target?: string;
  format?: TextFormat;
} & (
  | { field: string; value?: never }
  | { field?: never; value: unknown }
);

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
      palette?: Palette;
      layout?: never;
    }
  | {
      field: string;
      target?: string;
      fieldType: "temporal";
      aggregate?: never;
      scale?: ContinuousColorScaleOptions;
      palette?: Palette;
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

export interface StrokeWidthScaleOptions {
  id?: string;
  type?: "linear" | "log" | "pow" | "sqrt" | "symlog";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
  constant?: number;
}

export type StrokeWidthEncodingOptions =
  | {
      value: number;
      field?: never;
      target?: string;
      fieldType?: never;
      scale?: never;
    }
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: StrokeWidthScaleOptions;
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

export interface CreateRegressionBandOptions {
  id: string;
  data: string;
  x: string;
  lower: string;
  upper: string;
  groupBy?: string;
  coordinate: string;
  xScale: string;
  yScale: string;
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}

export interface CreateRegressionLineOptions {
  id: string;
  data: string;
  x: string;
  y: string;
  groupBy?: string;
  coordinate: string;
  xScale: string;
  yScale: string;
  colorScale?: string;
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

export interface EditRegressionOptions {
  target?: string;
  method?: RegressionMethod;
  degree?: number;
  span?: number;
  confidence?: number;
  interval?: RegressionInterval;
  band?: false | RegressionBandOptions;
  line?: { strokeWidth?: number; curve?: CurveInterpolation };
}

export interface RemoveAxisOptions {
  coordinate?: string;
  scale?: string;
}

export interface RemoveGridOptions {
  horizontal?: boolean;
  vertical?: boolean;
  theta?: boolean;
  radial?: boolean;
}

export interface RemoveLegendOptions {
  target?: string;
}

export interface RemoveMarkOptions {
  target?: string;
}

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
  channels?: readonly ("color" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
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

export interface EditLegendLayoutOptions {
  target?: string;
  position?: "right" | "left" | "bottom" | "top";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: number;
  offset?: number;
  titlePosition?: "top" | "left";
  itemGap?: number;
}

export interface EditLegendLabelsOptions extends LegendTitleStyleOptions {
  target?: string;
}

export interface EditLegendTitleOptions extends LegendTitleStyleOptions {
  target?: string;
  title?: string | "auto" | false;
}

export interface EditLegendSymbolsOptions {
  target?: string;
  symbol?: LegendSymbolRecipe;
  count?: number;
  gradient?: { length?: number; thickness?: number };
}

export interface EditLegendBorderOptions {
  target?: string;
  border: boolean | LegendBorderOptions;
}

export interface EditAxisOptions<P extends string> {
  position?: P;
  line?: AxisLineStyleOptions;
  ticks?: Omit<AxisTickOptions<P>, "scale" | "position">;
  labels?: Omit<AxisLabelOptions<P>, "scale" | "position">;
  ticksAndLabels?: Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position">;
  title?: Omit<AxisTitleOptions<P>, "scale" | "position">;
}

export interface TitleTextStyleOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

export interface PathOrderEncodingOptions {
  target?: string;
  field: string;
  fieldType?: "quantitative";
  order?: "ascending" | "descending";
}

export interface RemovePathOrderOptions {
  target?: string;
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
  readonly children: Readonly<Record<string, ChartProgram>>;
  readonly compositionSpec?: CompositionSpec;
  readonly context: Readonly<Record<string, unknown>>;
  readonly trace: TraceNode;
  readonly actionStack: readonly unknown[];

  createCanvas(options?: CanvasOptions): ChartProgram;
  editCanvas(options: CanvasOptions): ChartProgram;
  createData(options: { id?: string; values: readonly unknown[] }): ChartProgram;
  filterData(options: FilterDataOptions): ChartProgram;
  filterMarks(options: FilterMarksOptions): ChartProgram;
  selectMarks(options: SelectMarksOptions): ChartProgram;
  editMarkSelection(options: EditMarkSelectionOptions): ChartProgram;
  removeMarkHighlight(options?: RemoveMarkSelectionOptions): ChartProgram;
  removeMarkSelection(options?: RemoveMarkSelectionOptions): ChartProgram;
  highlightMarks(options: HighlightMarksOptions): ChartProgram;
  createDensityData(options: DensityDataOptions): ChartProgram;
  createRegressionData(options: RegressionDataOptions): ChartProgram;
  createIntervalData(options: IntervalDataOptions): ChartProgram;
  createWindowData(options: WindowDataOptions): ChartProgram;
  createBin2DData(options: Bin2DDataOptions): ChartProgram;

  createPointMark(options?: {
    id?: string;
    data?: string;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
  editPointMark(options: {
    target?: string;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }): ChartProgram;
  jitterPoints(options: JitterPointsOptions): ChartProgram;
  removeJitter(options?: RemoveJitterOptions): ChartProgram;
  createLineMark(options?: {
    id?: string;
    data?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    stroke?: string;
    opacity?: number;
    closed?: boolean;
  }): ChartProgram;
  editLineMark(options: {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    stroke?: string;
    opacity?: number;
    closed?: boolean;
  }): ChartProgram;
  createBarMark(options?: {
    id?: string;
    data?: string;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
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
  createArcMark(options?: {
    id?: string;
    data?: string;
    innerRadius?: number;
    padAngle?: number;
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }): ChartProgram;
  editArcMark(options: {
    target?: string;
    innerRadius?: number;
    padAngle?: number;
    fill?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }): ChartProgram;
  createRectMark(options?: RectMarkOptions): ChartProgram;
  editRectMark(options: EditRectMarkOptions): ChartProgram;
  createRuleMark(options?: { id?: string; data?: string }): ChartProgram;
  createTextMark(options?: TextMarkOptions): ChartProgram;
  editTextMark(options: EditTextMarkOptions): ChartProgram;
  layoutLabels(options?: LabelLayoutOptions): ChartProgram;
  removeLabelLayout(options?: RemoveLabelLayoutOptions): ChartProgram;
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
  encodeTheta(options: ThetaEncodingOptions): ChartProgram;
  encodeR(options: RadialEncodingOptions): ChartProgram;
  encodeX2(options: SecondaryPositionEncodingOptions): ChartProgram;
  encodeColor(options: ColorEncodingOptions): ChartProgram;
  encodeStrokeDash(options: StrokeDashEncodingOptions): ChartProgram;
  encodeSize(options: { field: string; target?: string; fieldType?: "quantitative"; scale?: ScaleOptions }): ChartProgram;
  encodeShape(options: { field: string; target?: string; fieldType?: "nominal"; scale?: ScaleOptions }): ChartProgram;
  encodeOpacity(options: OpacityEncodingOptions): ChartProgram;
  encodeRadius(options: { value: number; target?: string }): ChartProgram;
  encodePointRadius(options: { value: number; target?: string }): ChartProgram;
  removePointRadius(options?: { target?: string }): ChartProgram;
  encodeXOffset(options: XOffsetEncodingOptions): ChartProgram;
  encodeYOffset(options: YOffsetEncodingOptions): ChartProgram;
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
  encodePathOrder(options: PathOrderEncodingOptions): ChartProgram;
  encodeParallelCoordinates(options: ParallelCoordinatesEncodingOptions): ChartProgram;
  removePathOrder(options?: RemovePathOrderOptions): ChartProgram;
  removeEncoding(options: {
    target?: string;
    channel:
      | "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset"
      | "theta" | "radius" | "color" | "strokeDash" | "strokeWidth"
      | "size" | "shape" | "group" | "opacity" | "text";
  }): ChartProgram;
  encodeText(options: TextEncodingOptions): ChartProgram;
  encodeHistogram(options: HistogramEncodingOptions): ChartProgram;
  encodeDensity(options: DensityEncodingOptions): ChartProgram;
  editDensity(options: EditDensityOptions): ChartProgram;
  encodeHorizon(options?: HorizonEncodingOptions): ChartProgram;
  editHorizon(options: EditHorizonOptions): ChartProgram;
  encodeBarWidth(options?: BarWidthOptions): ChartProgram;
  encodeStroke(options: { target?: string; value: string }): ChartProgram;
  encodeStrokeWidth(options: StrokeWidthEncodingOptions): ChartProgram;

  createRegression(options?: RegressionOptions): ChartProgram;
  editRegression(options: EditRegressionOptions): ChartProgram;
  createErrorBar(options?: ErrorBarOptions): ChartProgram;
  editErrorBar(options: EditErrorBarOptions): ChartProgram;
  createErrorBand(options?: ErrorBandOptions): ChartProgram;
  editErrorBand(options: EditErrorBandOptions): ChartProgram;
  editErrorBandBoundary(options: EditErrorBandBoundaryOptions): ChartProgram;
  createBoxPlot(options?: BoxPlotOptions): ChartProgram;
  editBoxPlot(options: EditBoxPlotOptions): ChartProgram;
  createGradientPlot(options?: GradientPlotOptions): ChartProgram;
  editGradientPlot(options: EditGradientPlotOptions): ChartProgram;
  createViolinPlot(options: ViolinPlotOptions): ChartProgram;
  createScatterPlot(options: CreateScatterPlotOptions): ChartProgram;
  createLinePlot(options: CreateLinePlotOptions): ChartProgram;
  createBarPlot(options: CreateBarPlotOptions): ChartProgram;
  createHistogram(options: CreateHistogramOptions): ChartProgram;
  createHeatmap(options: CreateHeatmapOptions): ChartProgram;
  createParallelCoordinates(options: CreateParallelCoordinatesOptions): ChartProgram;
  removeMark(options?: RemoveMarkOptions): ChartProgram;
  createAxes(options?: CreateAxesOptions): ChartProgram;
  createXAxis(options?: CompleteAxisOptions<XAxisPosition>): ChartProgram;
  createYAxis(options?: CompleteAxisOptions<YAxisPosition>): ChartProgram;
  createThetaAxis(options?: CompletePolarAxisOptions): ChartProgram;
  createRadialAxis(options?: CompleteRadialAxisOptions): ChartProgram;
  editThetaAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editRadialAxisLine(options?: AxisLineStyleOptions): ChartProgram;
  editThetaAxisTicks(options?: PolarTickOptions): ChartProgram;
  editRadialAxisTicks(options?: PolarTickOptions): ChartProgram;
  editThetaAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editRadialAxisLabels(options?: PolarLabelOptions): ChartProgram;
  editThetaAxisTitle(options?: PolarTitleOptions): ChartProgram;
  editRadialAxisTitle(options?: RadialTitleOptions): ChartProgram;
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
  editXAxis(options: EditAxisOptions<XAxisPosition>): ChartProgram;
  editYAxis(options: EditAxisOptions<YAxisPosition>): ChartProgram;
  editThetaAxis(options: Omit<EditPolarAxisOptions, "angle">): ChartProgram;
  editRadialAxis(options: EditRadialAxisOptions): ChartProgram;
  removeXAxis(options?: RemoveAxisOptions): ChartProgram;
  removeYAxis(options?: RemoveAxisOptions): ChartProgram;
  removeThetaAxis(options?: RemoveAxisOptions): ChartProgram;
  removeRadialAxis(options?: RemoveAxisOptions): ChartProgram;
  createGrid(options?: CreateGridOptions): ChartProgram;
  createHorizontalGrid(options?: GridDirectionOptions): ChartProgram;
  createVerticalGrid(options?: GridDirectionOptions): ChartProgram;
  createThetaGrid(options?: PolarGridOptions): ChartProgram;
  createRadialGrid(options?: PolarGridOptions): ChartProgram;
  editHorizontalGrid(options: EditGridOptions): ChartProgram;
  editVerticalGrid(options: EditGridOptions): ChartProgram;
  editThetaGrid(options: EditPolarGridOptions): ChartProgram;
  editRadialGrid(options: EditPolarGridOptions): ChartProgram;
  editGrid(options: EditGridDirectionsOptions): ChartProgram;
  removeGrid(options?: RemoveGridOptions): ChartProgram;
  createLegend(options?: LegendOptions): ChartProgram;
  editLegend(options: EditLegendOptions): ChartProgram;
  editLegendLayout(options: EditLegendLayoutOptions): ChartProgram;
  editLegendLabels(options: EditLegendLabelsOptions): ChartProgram;
  editLegendTitle(options: EditLegendTitleOptions): ChartProgram;
  editLegendSymbols(options: EditLegendSymbolsOptions): ChartProgram;
  editLegendBorder(options: EditLegendBorderOptions): ChartProgram;
  removeLegend(options?: RemoveLegendOptions): ChartProgram;
  createGuides(options?: CreateGuidesOptions): ChartProgram;
  createTitle(options: TitleOptions): ChartProgram;
  editTitle(options: EditTitleOptions): ChartProgram;
  removeTitle(): ChartProgram;

  createCoordinate(options?: CreateCoordinateOptions): ChartProgram;
  createScale(options: CreateScaleOptions): ChartProgram;
  editScale(options: EditScaleOptions): ChartProgram;
  createDerivedData(options: CreateDerivedDataOptions): ChartProgram;
  createRegressionBand(options: CreateRegressionBandOptions): ChartProgram;
  editRegressionBand(options: {
    target?: string;
    color?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;
  createRegressionLine(options: CreateRegressionLineOptions): ChartProgram;
  editRegressionLine(options: {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }): ChartProgram;

  editCompositionLayout(options: EditCompositionLayoutOptions): ChartProgram;
  replaceCompositionChild(options: ReplaceCompositionChildOptions): ChartProgram;
  facet(options: FacetOptions): ChartProgram;
  editFacetHeaders(options: EditFacetHeadersOptions): ChartProgram;

  editSemantic(options: EditSemanticOptions): ChartProgram;
  createGraphics(options: {
    id: string;
    type: GraphicType;
    length?: number;
    parent?: string;
    before?: string;
    after?: string;
  }): ChartProgram;
  editGraphics(options: EditGraphicsOptions): ChartProgram;
}
