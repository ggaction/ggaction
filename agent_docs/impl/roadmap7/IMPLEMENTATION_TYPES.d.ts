/**
 * Roadmap 7 Proposed 타입 설계. 제품 타입/런타임 구현이 아니다.
 * baseline 타입을 재사용하여 이름·union 오류를 문서 단계에서 검사한다.
 * 숫자 범위, existing target capability, nonempty patch는 runtime 검증 의무다.
 */
import type * as C from "../../../types/program.js";

type Drop<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type PartialEach<T> = T extends unknown ? Partial<T> : never;
type NonEmpty<T> = readonly [T, ...T[]];
type Pair<T> = readonly [T, T];
type AtLeastTwo<T> = readonly [T, T, ...T[]];
type Scalar = C.DatasetScalar;
type DataBase = { id: string; source?: string };
type GroupBy = string | readonly string[];
type Call<K extends keyof C.ChartProgram> =
  C.ChartProgram[K] extends (options: infer O) => unknown ? NonNullable<O> : never;

export type ComputedExpression =
  | { field: string }
  | { constant: Scalar }
  | { op: "negate" | "absolute" | "log" | "sqrt" | "not" | "isNull"; operand: ComputedExpression }
  | { op: "add" | "subtract" | "multiply" | "divide" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      left: ComputedExpression; right: ComputedExpression }
  | { op: "and" | "or" | "coalesce"; operands: AtLeastTwo<ComputedExpression> }
  | { op: "concat"; operands: NonEmpty<ComputedExpression> }
  | { op: "if"; condition: ComputedExpression; then: ComputedExpression; else: ComputedExpression };
export type ComputedDataOptions = Omit<C.ComputedDataOptions, "expression"> & { expression: ComputedExpression };

export type CompleteDataOptions = DataBase & {
  groupBy?: GroupBy; key: string; fill?: Readonly<Record<string, Scalar>>; members?: string;
} & (
  | { values: NonEmpty<Scalar>; sequence?: never }
  | { values?: never; sequence: { start: number; end: number; step: number } }
  | { values?: never; sequence?: never }
);
export type ImputedDataOptions = DataBase & {
  fields: NonEmpty<string>; groupBy?: GroupBy; edges?: "keep" | "error"; maxGap?: number;
} & (
  | { method: "constant"; value: Scalar; sortBy?: readonly C.WindowSort[] }
  | { method: "forward" | "backward"; value?: never; sortBy: NonEmpty<C.WindowSort> }
  | { method: "linear"; value?: never; sortBy: readonly [{ field: string; order?: "ascending" }] }
);
type ZeroPolicy = "error" | "null" | "zero";
type Baseline =
  | { baseline?: { position: "first" | "last"; value?: never }; sortBy: NonEmpty<C.WindowSort> }
  | { baseline: { value: number; position?: never }; sortBy?: readonly C.WindowSort[] };
export type NormalizedDataOptions = DataBase & { field: string; as: string; groupBy?: GroupBy } & (
  | { method: "share" | "minmax"; zeroDenominator?: ZeroPolicy; variance?: never; baseline?: never; sortBy?: never }
  | { method: "zscore"; variance?: "population" | "sample"; zeroDenominator?: ZeroPolicy; baseline?: never; sortBy?: never }
  | ({ method: "index" | "percentChange"; zeroDenominator?: ZeroPolicy; variance?: never } & Baseline)
  | ({ method: "change"; zeroDenominator?: never; variance?: never } & Baseline)
);
export type TimeUnitDataOptions = Omit<C.TimeUnitDataOptions, "unit"> & { timeZone?: string } & (
  | { unit: C.TimeUnit | "weekday"; weekStartsOn?: never; weekRule?: never }
  | { unit: "week"; weekRule?: "calendar"; weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 }
  | { unit: "week"; weekRule: "iso"; weekStartsOn?: 1 }
);
export type WindowFrame =
  | { preceding: number; following?: number; duration?: never }
  | { preceding?: never; following?: never;
      duration: { preceding: number; following?: number;
        unit: "millisecond" | "second" | "minute" | "hour" | "day" } };
type NonMovingWindow = Exclude<C.WindowOperation, { op: "movingMean" | "movingSum" }> & {
  frame?: never; minPeriods?: never; missing?: never;
};
export type WindowOperation = NonMovingWindow | {
  op: "movingMean" | "movingSum"; field: string; as: string;
  frame: WindowFrame; minPeriods?: number; missing?: "error" | "skip";
};
export type WindowDataOptions = Omit<C.WindowDataOptions, "operations"> & {
  operations: NonEmpty<WindowOperation>; temporalUnit?: C.TemporalInputUnit;
};
// duration가 하나 이상인 경우에만 temporalUnit 허용/ascending sort1개: runtime cross-option validation.
export type StatisticalWeight = { field: string; kind: "frequency" | "reliability" };
export type SummaryDataOptions = C.SummaryDataOptions & { weight?: StatisticalWeight };
export type BinDataOptions = C.BinDataOptions & { weight?: StatisticalWeight };
export type DensityDataOptions = C.DensityDataOptions & { weight?: StatisticalWeight };
// weighted aggregate whitelist와 facade nested pass-through는 R10 표를 그대로 적용한다.
export type HistogramEncodingOptions = C.HistogramEncodingOptions & { weight?: StatisticalWeight };
export type DensityEncodingOptions = C.DensityEncodingOptions & { weight?: StatisticalWeight };
export type CreateHistogramOptions = C.CreateHistogramOptions & { weight?: StatisticalWeight };
export type CreateDensityPlotOptions = C.CreateDensityPlotOptions & { weight?: StatisticalWeight };
export type ViolinPlotDensityOptions = C.ViolinPlotDensityOptions & { weight?: StatisticalWeight };
export type ViolinPlotOptions = Omit<C.ViolinPlotOptions, "density"> & { density?: ViolinPlotDensityOptions };
export type EditDensityOptions = C.EditDensityOptions & { weight?: StatisticalWeight | false };
export type EditViolinPlotOptions = Omit<C.EditViolinPlotOptions, "density"> & {
  density?: C.ViolinPlotDensityOptions & { weight?: StatisticalWeight | false };
};

export type DatasetComputedTransform = Omit<C.DatasetComputedTransform, "expression"> & { readonly expression: ComputedExpression };
export type DatasetCompleteTransform = Drop<CompleteDataOptions, "id" | "source" | "groupBy"> & {
  readonly type: "complete"; readonly groupBy: readonly string[];
};
export type DatasetImputedTransform = Drop<ImputedDataOptions, "id" | "source" | "groupBy"> & {
  readonly type: "impute"; readonly groupBy: readonly string[];
};
export type DatasetNormalizedTransform = Drop<NormalizedDataOptions, "id" | "source" | "groupBy"> & {
  readonly type: "normalize"; readonly groupBy: readonly string[];
};
export type RequestedDatasetTransform =
  | Drop<Exclude<C.DatasetTransform, { type: "computed" | "timeUnit" | "window" | "horizon" }>, "resolved">
  | DatasetComputedTransform | DatasetCompleteTransform | DatasetImputedTransform | DatasetNormalizedTransform
  | (Drop<TimeUnitDataOptions, "id" | "source"> & { type: "timeUnit" })
  | (Drop<WindowDataOptions, "id" | "source"> & { type: "window" });
// Summary/Bin/Density의 weight도 같은 requested transform에 보존한다.
export type WeightedRequestedDatasetTransform = RequestedDatasetTransform extends infer T
  ? T extends { type: "summary" | "bin" | "density" } ? T & { weight?: StatisticalWeight } : T
  : never;
export type DerivedDataDependents = "reject" | "recompute";
export type EditDerivedDataOptions = {
  target: string; definition: WeightedRequestedDatasetTransform; dependents?: DerivedDataDependents;
};
type FocusedEdit<T> = { target: string; dependents?: DerivedDataDependents;
  id?: never; source?: never; type?: never; resolved?: never; values?: never
} & PartialEach<Drop<T, "id" | "source">>;
export type EditComputedDataOptions = FocusedEdit<ComputedDataOptions>;
export type EditFilteredDataOptions = FocusedEdit<Call<"filterData">>;
export type EditFoldDataOptions = FocusedEdit<C.FoldDataOptions>;
export type EditSummaryDataOptions = FocusedEdit<Drop<SummaryDataOptions, "weight">> & { weight?: StatisticalWeight | false };
export type EditBinDataOptions = FocusedEdit<Drop<BinDataOptions, "weight">> & { weight?: StatisticalWeight | false };
export type EditTimeUnitDataOptions = FocusedEdit<TimeUnitDataOptions>;
export type EditWindowDataOptions = FocusedEdit<WindowDataOptions>;
export type EditDensityDataOptions = FocusedEdit<Drop<DensityDataOptions, "weight">> & { weight?: StatisticalWeight | false };
export type EditStackDataOptions = FocusedEdit<C.StackDataOptions>;
export type EditRegressionDataOptions = FocusedEdit<Call<"createRegressionData">>;
export type EditIntervalDataOptions = FocusedEdit<C.IntervalDataOptions>;
export type EditECDFDataOptions = FocusedEdit<C.ECDFDataOptions>;
export type EditNormalizedDataOptions = FocusedEdit<NormalizedDataOptions>;
export type EditCompleteDataOptions = FocusedEdit<CompleteDataOptions>;
export type EditImputedDataOptions = FocusedEdit<ImputedDataOptions>;
// existing editBin2DData는 기존 target/source union을 보존한다.

type SizeBase = { id?: string; unknown?: number; reverse?: boolean };
type ContinuousSize = SizeBase & { domain?: "auto" | Pair<number>;
  range?: "auto" | Pair<number>; clamp?: boolean };
export type SizeScaleOptions =
  | (ContinuousSize & { type?: "linear"; base?: never; exponent?: never })
  | (ContinuousSize & { type: "log"; base?: number; exponent?: never })
  | (ContinuousSize & { type: "sqrt"; base?: never; exponent?: never })
  | (ContinuousSize & { type: "pow"; exponent: number; base?: never })
  | (SizeBase & { type: "quantize"; domain?: "auto" | Pair<number>; range: AtLeastTwo<number>; clamp?: never })
  | (SizeBase & { type: "quantile"; domain?: "auto" | NonEmpty<number>; range: AtLeastTwo<number>; clamp?: never })
  | (SizeBase & { type: "threshold"; domain: NonEmpty<number>; range: AtLeastTwo<number>; clamp?: never });
export type StrokeEncodingOptions =
  | { target?: string; value: string; field?: never; fieldType?: never; temporalUnit?: never; scale?: never }
  | (Drop<C.ColorEncodingOptions, "aggregate" | "palette" | "layout"> & { value?: never });
export type EditStrokeScaleOptions = { target: string } & Drop<C.EditColorScaleOptions, "id" | "target">;
export type EditParallelScaleOptions = { target: string; dimension: string } & Drop<
  C.QuantitativePositionScaleOptions | C.CategoricalPositionScaleOptions, "id">;
// family compatibility는 R20의 role-aware runtime validator로 제한한다.
type OffsetPadding =
  | { padding?: number; paddingInner?: never; paddingOuter?: never }
  | { padding?: never; paddingInner?: number; paddingOuter?: number };
export type EditXOffsetScaleOptions = { target: string; domain?: "auto" | readonly Scalar[];
  reverse?: boolean; align?: number } & OffsetPadding;
export type EditYOffsetScaleOptions = EditXOffsetScaleOptions;
type Payload<K extends keyof C.ChartProgram> = Drop<Call<K>, "target" | "coordinate"> & {
  target?: never; coordinate?: never; id?: never;
};
export interface EncodingChannelRequests {
  x?: Payload<"encodeX">; y?: Payload<"encodeY">;
  x2?: Payload<"encodeX2">; y2?: Payload<"encodeY2">;
  theta?: Payload<"encodeTheta">; r?: Payload<"encodeR">;
  xOffset?: Payload<"encodeXOffset">; yOffset?: Payload<"encodeYOffset">;
  group?: Payload<"encodeGroup">; pathOrder?: Payload<"encodePathOrder">;
  color?: Payload<"encodeColor">; stroke?: Drop<StrokeEncodingOptions, "target">;
  size?: { field: string; fieldType?: "quantitative"; scale?: SizeScaleOptions };
  shape?: Payload<"encodeShape">; opacity?: Payload<"encodeOpacity">;
  strokeWidth?: Payload<"encodeStrokeWidth">; strokeDash?: Payload<"encodeStrokeDash">;
  angle?: Payload<"encodeAngle">; text?: Payload<"encodeText">;
}
export type EncodeChannelsOptions = { target: string; channels: EncodingChannelRequests };
export type CoordinateAspect = "auto" | {
  mode: "frame" | "data"; ratio: number; alignX?: C.CompositionAlign; alignY?: C.CompositionAlign;
};
export type PolarFrameOptions = "auto" | {
  center?: { x: number; y: number };
  radius?: { unit: "fraction" | "px"; value: number };
};
export type EditCoordinateOptions = { target: string } & (
  | { aspect: CoordinateAspect; polarFrame?: PolarFrameOptions }
  | { aspect?: CoordinateAspect; polarFrame: PolarFrameOptions }
);
export type RemoveMarkLabelsOptions =
  | { target: string; source?: never } | { source: string; target?: never };
type LabelSelection =
  | { select?: never; selection?: never }
  | { select: C.MarkSelector; selection?: never }
  | { selection: string; select?: never };
export type MarkLabelPlacement = {
  anchor: "center" | "insideStart" | "insideEnd" | "outsideStart" | "outsideEnd";
  gap?: number; overflow?: "hide" | "outside" | "allow";
  leader?: false | { stroke?: string; strokeWidth?: number };
};
export type CreateMarkLabelsOptions = C.CreateMarkLabelsOptions & LabelSelection & { placement?: MarkLabelPlacement };
export type EditMarkLabelSelectionOptions = { target: string } & (
  | { select: C.MarkSelector; selection?: never; all?: never }
  | { selection: string; select?: never; all?: never }
  | { all: true; select?: never; selection?: never }
);
export type EditMarkLabelPlacementOptions = { target: string; placement: MarkLabelPlacement | "auto" };
export type ReferenceStatistic =
  | { op: "mean" | "median" | "min" | "max"; p?: never }
  | { op: "quantile"; p: number };
type DynamicReference = { id?: string; source: string; axis: "x" | "y";
  population?: "boundData" | "visibleItems"; field?: string;
  x?: never; y?: never; space?: never; data?: never; coordinate?: never; temporalUnit?: never };
export type CreateReferenceLineOptions = C.CreateReferenceLineOptions |
  (DynamicReference & C.RuleStyleOptions & { statistic: ReferenceStatistic; statistics?: never });
export type CreateReferenceBandOptions = C.CreateReferenceBandOptions |
  (DynamicReference & Drop<C.RectMarkOptions, "id" | "data" | "source"> & {
    statistics: Pair<ReferenceStatistic>; statistic?: never;
  });
export type DisplayLabelMap = readonly { value: Scalar; label: string }[];
export type LegendChannel = NonNullable<C.LegendOptions["channels"]>[number] | "stroke";
export type LegendOptions = Omit<C.LegendOptions, "channels"> & {
  channels?: readonly LegendChannel[]; values?: NonEmpty<number>; labelMap?: DisplayLabelMap | "auto";
};
export type EditLegendOptions = Omit<C.EditLegendOptions, "channels"> & {
  channels?: readonly LegendChannel[]; values?: NonEmpty<number> | "auto"; labelMap?: DisplayLabelMap | "auto";
};
export type EditLegendBlockOptions = {
  target: string; channel: LegendChannel; title?: string;
  values?: NonEmpty<number> | "auto"; count?: number; order?: readonly C.CategoryValue[]; gap?: number;
  text?: Pick<C.LegendTextOptions, "fontSize" | "fontFamily" | "fontWeight" | "color">;
  symbol?: { size?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
  /** R39 addition. Omit this property from the R38 product checkpoint. */
  labelMap?: DisplayLabelMap | "auto";
};
export type EditFacetHeadersOptions = C.EditFacetHeadersOptions & {
  labelMap?: DisplayLabelMap | "auto"; align?: C.CompositionAlign;
} & (
  | { role?: "all"; side?: never }
  | { role: "row"; side?: "left" | "right" }
  | { role: "column"; side?: "top" | "bottom" }
);
export type FacetScaleResolutions = C.FacetScaleResolutions & {
  theta?: C.FacetScaleResolution; r?: C.FacetScaleResolution;
  stroke?: C.FacetScaleResolution; parallelDimensions?: C.FacetScaleResolution;
};
export type RepeatChartsOptions = Omit<C.RepeatChartsOptions, "channel" | "scales"> & {
  channel: "x" | "y" | "theta" | "r" | { parallelDimension: string };
  scales?: FacetScaleResolutions;
};
export type ThemeTokens = {
  background: string; mark: string; text: string; strongText: string; mutedText: string;
  axis: string; axisTitle: string; grid: string; border: string; sizeSymbol: string;
  regressionBand: string; boxLine: string; boxMedian: string; referenceLine: string;
  referenceBand: string; gradientCenter: string; highlight: string; fontFamily: string;
};
export type ThemeDefinition = C.ThemeName | { base: C.ThemeName; tokens: Partial<ThemeTokens> };
export type ApplyThemeOptions = { theme: ThemeDefinition; scope?: "self" | "descendants" };
export type StrokeStyleDetails = {
  lineCap?: "butt" | "round" | "square"; lineJoin?: "miter" | "round" | "bevel"; miterLimit?: number;
};
export type RectStyleDetails = StrokeStyleDetails & { cornerRadius?: number };
export type RemoveDataOptions = { id: string };
export type RemoveScaleOptions = { id: string };
export type RemoveCoordinateOptions = { id: string };

// 이 interface는 문서 검토용이다. 실제 제품 class를 선언 병합하거나 export하지 않는다.
export interface Roadmap7NewActions {
  createCompleteData(options: CompleteDataOptions): C.ChartProgram;
  createImputedData(options: ImputedDataOptions): C.ChartProgram;
  createNormalizedData(options: NormalizedDataOptions): C.ChartProgram;
  editDerivedData(options: EditDerivedDataOptions): C.ChartProgram;
  editComputedData(options: EditComputedDataOptions): C.ChartProgram;
  editFilteredData(options: EditFilteredDataOptions): C.ChartProgram;
  editFoldData(options: EditFoldDataOptions): C.ChartProgram;
  editSummaryData(options: EditSummaryDataOptions): C.ChartProgram;
  editBinData(options: EditBinDataOptions): C.ChartProgram;
  editTimeUnitData(options: EditTimeUnitDataOptions): C.ChartProgram;
  editWindowData(options: EditWindowDataOptions): C.ChartProgram;
  editDensityData(options: EditDensityDataOptions): C.ChartProgram;
  editStackData(options: EditStackDataOptions): C.ChartProgram;
  editRegressionData(options: EditRegressionDataOptions): C.ChartProgram;
  editIntervalData(options: EditIntervalDataOptions): C.ChartProgram;
  editECDFData(options: EditECDFDataOptions): C.ChartProgram;
  editNormalizedData(options: EditNormalizedDataOptions): C.ChartProgram;
  editCompleteData(options: EditCompleteDataOptions): C.ChartProgram;
  editImputedData(options: EditImputedDataOptions): C.ChartProgram;
  encodeChannels(options: EncodeChannelsOptions): C.ChartProgram;
  editParallelScale(options: EditParallelScaleOptions): C.ChartProgram;
  editXOffsetScale(options: EditXOffsetScaleOptions): C.ChartProgram;
  editYOffsetScale(options: EditYOffsetScaleOptions): C.ChartProgram;
  editStrokeScale(options: EditStrokeScaleOptions): C.ChartProgram;
  editCoordinate(options: EditCoordinateOptions): C.ChartProgram;
  removeMarkLabels(options: RemoveMarkLabelsOptions): C.ChartProgram;
  editMarkLabelSelection(options: EditMarkLabelSelectionOptions): C.ChartProgram;
  editMarkLabelPlacement(options: EditMarkLabelPlacementOptions): C.ChartProgram;
  editLegendBlock(options: EditLegendBlockOptions): C.ChartProgram;
  removeData(options: RemoveDataOptions): C.ChartProgram;
  removeScale(options: RemoveScaleOptions): C.ChartProgram;
  removeCoordinate(options: RemoveCoordinateOptions): C.ChartProgram;
}
