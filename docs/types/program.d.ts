import type { RegisteredExtensionActions } from "./extension.js";

export type TemporalInputUnit = "auto" | "year" | "timestamp";
export type TextMetricFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export interface TextMeasurement {
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: TextMetricFontWeight;
  readonly fontStyle?: "normal" | "italic";
  readonly width: number;
}
export interface TextMetricsProfile {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly measurements: readonly TextMeasurement[];
}
export type ApplyTextMetricsOptions = TargetedOptions<{ profile: TextMetricsProfile; prepared?: never; requestToken?: never }> |
  { profile?: never; prepared: PreparedTextMetrics; requestToken: string; target?: never };
export interface FontIdentity {
  readonly contentHash: string; readonly family: string; readonly style: "normal" | "italic";
  readonly weight: TextMetricFontWeight; readonly metricsProviderVersion: string;
}
export type FontMimeType = "font/ttf" | "font/otf" | "font/woff" | "font/woff2";
export interface ConcreteFont extends FontIdentity {
  readonly mimeType: FontMimeType; readonly byteLength: number;
  readonly payload: { readonly encoding: "base64"; readonly data: string };
}
export interface FontRef { readonly kind: "font"; readonly id: string; readonly revision: number; }
export interface FontMetricsProfile {
  readonly schemaVersion: 2; readonly id: string;
  readonly fonts: readonly Readonly<{ resource: FontRef; identity: FontIdentity }>[];
  readonly measurements: readonly (TextMeasurement & { readonly fontStyle: "normal" | "italic" })[];
}
export interface FontResourceSource extends Omit<FontIdentity, "contentHash"> {
  uri: string; expectedHash: string; mimeType: FontMimeType; maxBytes?: number; license?: string; attribution?: string;
}
export type CreateFontResourceRequest = FontResourceSource & { kind: "create"; id: string; target?: never };
export type ReplaceFontResourceRequest = FontResourceSource & { kind: "replace"; target: string; id?: never };
export type FontResourceRequest = CreateFontResourceRequest | ReplaceFontResourceRequest;
export interface FontMeasurementHost {
  measure(request: Readonly<{ asset: ConcreteFont; queries: readonly Readonly<{ text: string; fontSize: number }>[]; signal?: AbortSignal }>):
    Readonly<{ contentHash: string; metricsProviderVersion: string; widths: readonly number[] }> |
    Promise<Readonly<{ contentHash: string; metricsProviderVersion: string; widths: readonly number[] }>>;
}
export interface TextMetricsHost extends FontMeasurementHost {
  requestToken: string; signal?: AbortSignal;
  decode(request: Readonly<FontIdentity & { bytes: Uint8Array; mimeType: FontMimeType; signal?: AbortSignal }>): FontIdentity | Promise<FontIdentity>;
}
export interface FontResourceHost extends Omit<TextMetricsHost, "measure"> {
  load(request: Readonly<FontResourceSource & { maxBytes: number; signal?: AbortSignal }>):
    Readonly<{ bytes: Uint8Array; mimeType: FontMimeType }> | Promise<Readonly<{ bytes: Uint8Array; mimeType: FontMimeType }>>;
  /** Required when replacing a font referenced by an exact metric profile. */
  measure?: FontMeasurementHost["measure"];
}
declare const preparedFontResourceBrand: unique symbol;
export interface PreparedFontResource<Kind extends "create" | "replace" = "create" | "replace"> {
  readonly [preparedFontResourceBrand]: Kind; readonly kind: "font-resource";
  readonly request: Kind extends "create" ? Readonly<{ kind: "create"; id: string }> : Readonly<{ kind: "replace"; target: string }>;
}
export interface ApplyFontResourceOptions<Kind extends "create" | "replace"> { prepared: PreparedFontResource<Kind>; requestToken: string; }
declare const preparedTextMetricsBrand: unique symbol;
export interface PreparedTextMetrics {
  readonly [preparedTextMetricsBrand]: true; readonly kind: "text-metrics";
  readonly request: Readonly<{ id: string; fonts: readonly string[] }>;
}
export interface TextMetricsRequest { id: string; fonts: readonly string[]; }
export interface FontResource {
  readonly kind: "font"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" }; readonly inputs: readonly never[];
  readonly options: Readonly<FontResourceSource & { maxBytes: number }>;
  readonly result: Pick<ConcreteFont, "byteLength" | "payload">;
  readonly provenance: { readonly origin: "authored" };
}
declare const preparedFontRenderingBrand: unique symbol;
export interface PreparedFontRendering {
  readonly [preparedFontRenderingBrand]: true; readonly kind: "font-rendering"; readonly fontCount: number;
  /** Invalidates the handle and releases its host registrations. */
  dispose(): void;
}
export interface FontRenderingHost {
  register(request: Readonly<FontIdentity & { bytes: Uint8Array; mimeType: FontMimeType; sourceFamily: string; signal?: AbortSignal }>):
    (FontIdentity & { dispose(): void }) | Promise<FontIdentity & { dispose(): void }>;
  signal?: AbortSignal;
}

export type ThemeName = "light" | "dark";
export interface ThemeTokens {
  axisLabel?: string;
  axisLabelFontFamily?: string;
  axisTitleFontFamily?: string;
  axisLabelFontSize?: number;
  axisTitleFontSize?: number;
  background: string;
  mark: string;
  text: string;
  strongText: string;
  mutedText: string;
  axis: string;
  axisTitle: string;
  grid: string;
  border: string;
  sizeSymbol: string;
  regressionBand: string;
  boxLine: string;
  boxMedian: string;
  referenceLine: string;
  referenceBand: string;
  gradientCenter: string;
  highlight: string;
  fontFamily: string;
}
export type ThemeDefinition =
  | ThemeName
  | { base: ThemeName; tokens: Partial<ThemeTokens> };
export interface ApplyThemeOptions {
  theme: ThemeDefinition;
  scope?: "self" | "descendants";
}
export type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
export type GraphicType =
  | "canvas"
  | "collection"
  | "circle"
  | "rect"
  | "line"
  | "text"
  | "path"
  | "image";
export type ImageMimeType = "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
export interface ConcreteImage {
  readonly contentHash: string;
  readonly mimeType: ImageMimeType;
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
  readonly payload: { readonly encoding: "base64"; readonly data: string };
}
declare const preparedImageRenderingBrand: unique symbol;
export interface PreparedImageRendering {
  readonly [preparedImageRenderingBrand]: true;
  readonly kind: "image-rendering";
  readonly imageCount: number;
}
export interface ImageRenderingHost {
  decode(request: Readonly<{ bytes: Uint8Array; mimeType: ImageMimeType; contentHash: string;
    width: number; height: number; signal?: AbortSignal }>):
    Promise<Readonly<{ image: object; width: number; height: number; originClean: true }>> |
    Readonly<{ image: object; width: number; height: number; originClean: true }>;
  signal?: AbortSignal;
}
declare const preparedShadowRenderingBrand: unique symbol;
export interface PreparedShadowRendering {
  readonly [preparedShadowRenderingBrand]: true;
  readonly kind: "shadow-rendering";
  readonly glyphCount: number;
  readonly pixelRatio: number;
  dispose(): void;
}
export interface ShadowRenderingHost {
  createCanvas(width: number, height: number): {
    readonly width: number; readonly height: number;
    getContext(type: "2d"): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  };
  /** Required for Canvas output and image source masks; SVG embeds the prepared bytes directly. */
  decode?: ImageRenderingHost["decode"];
  /** Exact font preparation is required for Text shadows. */
  fonts?: PreparedFontRendering;
  pixelRatio?: number;
  signal?: AbortSignal;
}
export interface CanvasRenderOptions { pixelRatio?: number; images?: PreparedImageRendering; fonts?: PreparedFontRendering; shadows?: PreparedShadowRendering; }
export interface ImageResourceSource {
  uri: string; expectedHash: string; mimeType: ImageMimeType; maxBytes?: number; license?: string; attribution?: string;
}
export type CreateImageResourceRequest = ImageResourceSource & { kind: "create"; id: string };
export type ReplaceImageResourceRequest = ImageResourceSource & { kind: "replace"; target: string };
export type ImageResourceRequest = CreateImageResourceRequest | ReplaceImageResourceRequest;
export interface ImageResourceHost {
  requestToken: string;
  load(request: Readonly<ImageResourceSource & { maxBytes: number; signal?: AbortSignal }>):
    Promise<Readonly<{ bytes: Uint8Array; mimeType: ImageMimeType }>> | Readonly<{ bytes: Uint8Array; mimeType: ImageMimeType }>;
  decode(request: Readonly<{ bytes: Uint8Array; mimeType: ImageMimeType; maxPixels: number; signal?: AbortSignal }>):
    Promise<Readonly<{ width: number; height: number; originClean: true }>> | Readonly<{ width: number; height: number; originClean: true }>;
  signal?: AbortSignal;
}
declare const preparedImageResourceBrand: unique symbol;
export interface PreparedImageResource<Kind extends "create" | "replace" = "create" | "replace"> {
  readonly [preparedImageResourceBrand]: Kind;
  readonly kind: "image-resource";
  readonly request: Kind extends "create" ? Readonly<{ kind: "create"; id: string }> : Readonly<{ kind: "replace"; target: string }>;
}
export interface ApplyImageResourceOptions<Kind extends "create" | "replace"> {
  prepared: PreparedImageResource<Kind>; requestToken: string;
}
export interface ImageRef { readonly kind: "image"; readonly id: string; readonly revision: number; }
export interface ImageResource {
  readonly kind: "image"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" }; readonly inputs: readonly never[];
  readonly options: Readonly<ImageResourceSource & { maxBytes: number }>;
  readonly result: Pick<ConcreteImage, "width" | "height" | "byteLength" | "payload">;
  readonly provenance: { readonly origin: "authored" };
}
export interface ImageMarkOptions {
  image?: string;
  viewport?: "auto" | { x: number; y: number; width: number; height: number };
  fit?: "contain" | "cover" | "fill";
  align?: readonly [number, number];
  opacity?: number; alt?: string; clip?: false | GraphicClip; shadow?: MarkShadow | false;
}
export interface CreateImageMarkOptions extends ImageMarkOptions { id?: string; }
export interface EditImageMarkOptions extends ImageMarkOptions { target?: string; }
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
export interface PatternPaint {
  readonly type: "pattern";
  readonly style?: "solid" | "diagonal" | "antidiagonal" | "horizontal" | "vertical" | "cross" | "dots";
  readonly pitch?: number;
  readonly strokeWidth?: number;
  readonly phase?: readonly [number, number];
  readonly foreground?: string;
  readonly background?: string;
  readonly coordinateSpace?: "plot" | "object";
}
export interface RadialGradientPaint {
  readonly type: "radial-gradient";
  readonly center: LinearGradientPoint;
  readonly focal?: LinearGradientPoint;
  readonly radius: number;
  readonly stops: readonly [LinearGradientStop, LinearGradientStop, ...LinearGradientStop[]];
}
/** Stroke painted before the fill; white produces a halo. */
export type BlendMode = "normal" | "multiply" | "screen" | "difference";
export interface MarkOutline { color: string; width: number; }
export interface MarkShadow { color: string; offsetX?: number; offsetY?: number; blurRadius?: number; }
export type FillPaint = string | LinearGradientPaint | PatternPaint | RadialGradientPaint;
type FilledMarkStroke = string | false;
export type CurveInterpolation =
  | "linear"
  | "step"
  | "step-before"
  | "step-after"
  | "basis"
  | "cardinal"
  | "monotone"
  | "monotone-steffen"
  | "natural";
export type DashStyle = "solid" | "dashed" | "dotted" | "dashdot";
export type DashPattern = readonly number[];
export type JitterMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };
export interface JitterPointsOptions {
  target?: string;
  channel: "x" | "y" | "both";
  maxOffset: JitterMaxOffset;
  seed?: string | number;
  key?: string;
}
export interface RemoveJitterOptions {
  target?: string;
}
export type PointPackingMaxOffset =
  | { pixels: number; band?: never }
  | { pixels?: never; band: number };
export interface PackPointsOptions {
  target?: string;
  channel: "x" | "y";
  maxOffset?: PointPackingMaxOffset;
  padding?: number;
  key?: string;
  overflow?: "error" | "overlap";
}
export interface RemovePointPackingOptions {
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
export type YStackMode = StackMode | "center";
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
/** Explicit child paths avoid ambiguous IDs in composed charts. An empty path addresses this view. */
export interface ScopedActionTarget { childPath: readonly string[]; id?: string; /** Persist this action in a facet source, then regenerate its cells. */ facetSource?: true; }
export type ActionTargetList = readonly [string | ScopedActionTarget, ...(string | ScopedActionTarget)[]];
/** Full authoring can apply one native action atomically to named resources or views. */
export type TargetedOptions<T> = T | (T extends unknown ? Omit<T, "target"> & { target: ScopedActionTarget | ActionTargetList } : never);
export interface CompositionShares {
  x?: boolean; y?: boolean; color?: boolean; stroke?: boolean; size?: boolean; shape?: boolean;
  opacity?: boolean; strokeWidth?: boolean; strokeDash?: boolean;
}
export interface EditCompositionScalesOptions { share: CompositionShares; }
export interface CompositionOptions {
  /** Keep non-shared guides local (default), or collect all displayed blocks around the parent plot union. */
  legends?: "local" | "collect";
  share?: CompositionShares;
  id?: string;
  programs: readonly CompositionProgramEntry[];
  gap?: number;
  align?: CompositionAlign | "plot";
  padding?: number | CompositionPadding;
}
/** Facets may set independent axis gaps; concat continues to require a number. */
export type FacetGap = number | Readonly<{ x: number; y: number }>;
export interface EditCompositionLayoutOptions {
  /** Concat only. Change guide collection without changing scale sharing. */
  legends?: "local" | "collect";
  columns?: number;
  gap?: FacetGap;
  align?: CompositionAlign | "plot";
  padding?: number | CompositionPadding;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share existing top margin with parent title and headers; requires plot spacing. Stacked restores the default. */
  topLane?: FacetTopLaneMode;
}
export type FacetTopLaneMode = "stacked" | "shared";
export interface ReplaceCompositionChildOptions {
  target: string;
  program: ChartProgram;
}
export interface InsertCompositionChildOptions {
  id: string;
  program: ChartProgram;
  before?: string;
  after?: string;
}
export interface RemoveCompositionChildOptions { target: string; }
export interface ReorderCompositionChildrenOptions {
  order: readonly [string, ...string[]];
}
type AdjacentConstructorOptions<T> = T extends unknown ? Partial<Omit<T, "id">> : never;
export type AdjacentPlotSpecification = (
  | { action: "createScatterPlot"; options?: AdjacentConstructorOptions<CreateScatterPlotOptions> }
  | { action: "createLinePlot"; options?: Partial<AdjacentConstructorOptions<CreateLinePlotOptions>> }
  | { action: "createBarPlot"; options?: Partial<AdjacentConstructorOptions<CreateBarPlotOptions>> }
  | { action: "createAreaPlot"; options?: AdjacentConstructorOptions<CreateAreaPlotOptions> }
  | { action: "createDotPlot"; options?: AdjacentConstructorOptions<CreateDotPlotOptions> }
  | { action: "createLollipopPlot"; options?: AdjacentConstructorOptions<CreateLollipopPlotOptions> }
  | { action: "createDumbbellPlot"; options?: AdjacentConstructorOptions<CreateDumbbellPlotOptions> }
  | { action: "createECDFPlot"; options?: AdjacentConstructorOptions<CreateECDFPlotOptions> }
  | { action: "createIntervalPlot"; options?: AdjacentConstructorOptions<CreateIntervalPlotOptions> }
  | { action: "createRegressionPlot"; options?: AdjacentConstructorOptions<CreateRegressionPlotOptions> }
  | { action: "createRugPlot"; options?: AdjacentConstructorOptions<CreateRugPlotOptions> }
  | { action: "createStripPlot"; options?: AdjacentConstructorOptions<CreateStripPlotOptions> }
  | { action: "createBeeswarmPlot"; options?: AdjacentConstructorOptions<CreateBeeswarmPlotOptions> }
  | { action: "createRaincloudPlot"; options?: AdjacentConstructorOptions<CreateRaincloudPlotOptions> }
  | { action: "createBoxPlot"; options?: AdjacentConstructorOptions<BoxPlotOptions> }
  | { action: "createGradientPlot"; options?: AdjacentConstructorOptions<GradientPlotOptions> }
  | { action: "createViolinPlot"; options?: AdjacentConstructorOptions<ViolinPlotOptions> }
  | { action: "createDensityPlot"; options?: AdjacentConstructorOptions<CreateDensityPlotOptions> }
  | { action: "createHorizonPlot"; options?: AdjacentConstructorOptions<CreateHorizonPlotOptions> }
  | { action: "createHistogram"; options?: AdjacentConstructorOptions<CreateHistogramOptions> }
  | { action: "createHeatmap"; options?: AdjacentConstructorOptions<CreateHeatmapOptions> }
  | { action: "createPiePlot"; options?: AdjacentConstructorOptions<CreatePiePlotOptions> }
  | { action: "createRosePlot"; options?: AdjacentConstructorOptions<CreateRosePlotOptions> }
  | { action: "createRadialBarPlot"; options?: AdjacentConstructorOptions<CreateRadialBarPlotOptions> }
  | { action: "createPolarScatterPlot"; options?: AdjacentConstructorOptions<CreatePolarScatterPlotOptions> }
  | { action: "createPolarLinePlot"; options?: AdjacentConstructorOptions<CreatePolarLinePlotOptions> }
  | { action: "createRadarPlot"; options?: AdjacentConstructorOptions<CreateRadarPlotOptions> }
  | { action: "createParallelCoordinates"; options?: AdjacentConstructorOptions<CreateParallelCoordinatesOptions> }
  | { action: "createTextPlot"; options?: AdjacentConstructorOptions<CreateTextPlotOptions> }) & { inherit?: { color?: boolean } };
/** A native constructor with positional/data decisions inferred from the source.
 * Omitted color is inherited only when valid at the new plot's grain. Line and
 * Polar Line require one color value per series; otherwise the default is a
 * single color. Explicit color/groupBy options remain validated and authoritative.
 */
export type LayerPlotSpecification = {
  [Action in AdjacentPlotSpecification["action"]]: {
    action: Action;
    inherit?: { color?: boolean };
    options?: Partial<NonNullable<Extract<AdjacentPlotSpecification, { action: Action }>["options"]>> & { guides?: false };
  }
}[AdjacentPlotSpecification["action"]];
export interface CreateLayerPlotOptions {
  id?: string;
  source?: string;
  plot: LayerPlotSpecification;
  placement?: "front" | "back";
}

export interface CreateAdjacentPlotOptions {
  /** Collect all legends around the combined view by default. Local retains panel-owned placement. */
  legends?: "local" | "collect";
  id?: string;
  /** Source mark in a unit/facet, or an explicit panel path relative to the receiving concat. */
  source?: string | { childPath: readonly string[]; id: string };
  position?: "left" | "right" | "top" | "bottom";
  plot?: AdjacentPlotSpecification; share?: CompositionShares; gap?: number;
  align?: CompositionAlign | "plot";
}

export type FacetScaleResolution = "shared" | "independent";
export interface FacetScaleResolutions {
  x?: FacetScaleResolution;
  y?: FacetScaleResolution;
  xOffset?: FacetScaleResolution;
  yOffset?: FacetScaleResolution;
  theta?: FacetScaleResolution;
  r?: FacetScaleResolution;
  color?: FacetScaleResolution;
  stroke?: FacetScaleResolution;
  size?: FacetScaleResolution;
  shape?: FacetScaleResolution;
  opacity?: FacetScaleResolution;
  strokeDash?: FacetScaleResolution;
  parallelDimensions?: FacetScaleResolution;
}
interface StoredFacetLegendIntent {
  readonly type: "authored-legend";
  readonly blocks: Readonly<Record<string, {
    readonly config: Readonly<Record<string, unknown>>;
    readonly guide?: Readonly<Record<string, unknown>>;
  }>>;
  readonly groups: Readonly<Record<string, unknown>>;
}
export interface FacetGuideOptions {
  axes?: "each" | "outer" | { x?: "each" | "outer"; y?: "each" | "outer" };
  legend?: false | "shared" | LegendOptions;
}
export interface FacetOptions {
  id?: string;
  field: string;
  /** Common row-preserving ancestor, or an explicit materialized fold ancestor of every layer. */
  data?: string;
  values?: readonly DatasetScalar[];
  columns?: number;
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
export interface FacetGridRole {
  field: string;
  values?: readonly DatasetScalar[];
}
export interface FacetGridOptions {
  id?: string;
  data?: string;
  rows: FacetGridRole;
  columns: FacetGridRole;
  combinations?: "observed" | "full";
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
export interface RepeatChartsOptions {
  id?: string;
  target?: string;
  channel: "x" | "y" | "theta" | "r" | { parallelDimension: string };
  fields: readonly [string, ...string[]];
  columns?: number;
  gap?: FacetGap;
  align?: CompositionAlign;
  padding?: number | CompositionPadding;
  scales?: FacetScaleResolutions;
  guides?: FacetGuideOptions;
  headers?: FacetHeadersOptions;
  /** Interpret gap between child canvases (default), inner plots, or retained full content (wrapped facets). */
  spacing?: "canvas" | "plot" | "content";
  /** Share the existing top margin rather than adding title/header reservations. Requires plot spacing. */
  topLane?: FacetTopLaneMode;
}
export type EditFacetSourceOptions =
  | { program: ChartProgram; action?: never }
  | { program?: never; action: { method: string; options?: Readonly<Record<string, unknown>> } };
export interface FacetHeaderTitleOptions {
  /** Required when introducing a title; edits preserve the existing text. One line. */
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
  align?: FacetHeaderAlign;
  rotation?: RotationInput;
  alongOffset?: number;
}
export interface EditFacetHeadersOptions {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
  /** Content follows concrete mark bounds with plot spacing; plot preserves existing placement. */
  anchor?: "plot" | "content" | "view";
  role?: FacetHeaderRole;
  labelMap?: DisplayLabelMap | "auto";
  side?: FacetHeaderSide;
  align?: FacetHeaderAlign;
  /** Numbers are radians; zero restores the existing unrotated header layout. */
  rotation?: RotationInput;
  /** Requires an explicit row or column role. False removes that role's field title. */
  title?: FacetHeaderTitleOptions | false;
}
export type FacetHeadersOptions = Omit<EditFacetHeadersOptions, "role" | "side" | "title"> & {
  row?: Omit<EditFacetHeadersOptions, "role">;
  column?: Omit<EditFacetHeadersOptions, "role">;
};
export type FacetHeaderRole = "all" | "row" | "column";
export type FacetHeaderSide = "top" | "bottom" | "left" | "right";
export type FacetHeaderAlign = "start" | "center" | "end";
export interface ConcatCompositionSpec {
  readonly legends?: "local" | "collect";
  readonly id: string;
  readonly direction: "horizontal" | "vertical";
  readonly children: readonly string[];
  readonly gap: number;
  readonly align: CompositionAlign | "plot";
  readonly share?: Readonly<CompositionShares>;
  readonly padding: Readonly<Required<CompositionPadding>>;
}
export interface FacetCompositionSpec {
  readonly id: string;
  readonly type: "facet";
  readonly children: readonly string[];
  readonly columns: number;
  readonly spacing?: "canvas" | "plot" | "content";
  /** Canonical opt-in intent; stacked is represented by omission. */
  readonly topLane?: "shared";
  readonly gap: FacetGap;
  readonly align: CompositionAlign;
  readonly padding: Readonly<Required<CompositionPadding>>;
  readonly facet: {
    readonly data: string;
    readonly field?: string;
    readonly values: readonly DatasetScalar[];
    readonly grid?: {
      readonly rows: { readonly field: string; readonly values: readonly DatasetScalar[] };
      readonly columns: { readonly field: string; readonly values: readonly DatasetScalar[] };
      readonly combinations: "observed" | "full";
      readonly cells: readonly {
        readonly id: string;
        readonly row: number;
        readonly column: number;
        readonly rowValue: DatasetScalar;
        readonly columnValue: DatasetScalar;
        readonly empty: boolean;
      }[];
    };
    readonly repeat?: {
      readonly target: string;
      readonly channel: "x" | "y" | "theta" | "r" | { readonly parallelDimension: string };
      readonly fields: readonly string[];
    };
    readonly scales: Readonly<Required<FacetScaleResolutions>>;
    readonly guides: {
      readonly axes: "each" | "outer" | { readonly x: "each" | "outer"; readonly y: "each" | "outer" };
      readonly legend: false | "shared" | Readonly<LegendOptions> | StoredFacetLegendIntent;
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
export interface StatisticalWeight {
  readonly field: string;
  readonly kind: "frequency" | "reliability";
}
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
  scale?: NonPointBandPositionScaleOptions;
}
export type DensityPlacement =
  | BaselineDensityPlacement
  | CategoryDensityPlacement;
export type FilterComparison =
  | { op: "eq" | "neq"; value: unknown }
  | { op: "lt" | "lte" | "gt" | "gte"; value: number | string };
type FilterBound = number | string;
type FilterRangeBounds =
  | { min: FilterBound; max?: FilterBound }
  | { min?: FilterBound; max: FilterBound };
type FilterRangeClosure =
  | { inclusive?: boolean; minInclusive?: never; maxInclusive?: never }
  | { inclusive?: never; minInclusive?: boolean; maxInclusive?: boolean };
export type FilterRange = FilterRangeBounds & FilterRangeClosure;
export type FilterModeOptions =
  | { oneOf: readonly [DatasetScalar, ...DatasetScalar[]]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly [DatasetScalar, ...DatasetScalar[]]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRange };
export type ExpressionFilterOptions = {
  where: ComputedExpressionV2;
  field?: never;
  nulls?: never;
  oneOf?: never;
  noneOf?: never;
  predicate?: never;
  range?: never;
};
export type FilterDataOptions = { id: string; source?: string } & (
  | ({ field: string; nulls?: "include" | "exclude"; where?: never } & FilterModeOptions)
  | ExpressionFilterOptions
);
export type DatasetScalar = string | number | boolean | null;
export type RegressionPredictOptions =
  | { values: readonly [number, ...number[]]; domain?: never; steps?: never }
  | { values?: never; domain: readonly [number, number]; steps: number };
export type DisplayLabelMap = ReadonlyArray<Readonly<{
  value: DatasetScalar;
  label: string;
}>>;
export interface DisplayLabelOptions {
  labelMap?: DisplayLabelMap | "auto";
}
export type DatasetFilterTransform = ({
  type: "filter";
  field: string;
  nulls?: "include" | "exclude";
} & (
  | { oneOf: readonly DatasetScalar[]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly DatasetScalar[]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRange }
)) | ({ type: "filter" } & ExpressionFilterOptions);
export type DatasetRegressionTransform = {
  type: "regression";
  x: string;
  y: string;
  groupBy?: string;
} & (
  | ({
      method: "linear";
      degree?: never;
      span?: never;
      robustIterations?: never;
    } & ({ interval: false; confidenceMethod?: never; level?: never; confidence?: never } | ({ interval: "mean" | "prediction" } & (
      | { confidenceMethod: ConfidenceIntervalMethod; level: number; confidence?: never }
      | { confidence: number; confidenceMethod?: never; level?: never }
    ))))
  | ({
      method: "polynomial";
      degree: number;
      span?: never;
      robustIterations?: never;
    } & ({ interval: false; confidenceMethod?: never; level?: never; confidence?: never } | ({ interval: "mean" | "prediction" } & (
      | { confidenceMethod: ConfidenceIntervalMethod; level: number; confidence?: never }
      | { confidence: number; confidenceMethod?: never; level?: never }
    ))))
  | {
      method: "exp";
      interval: false;
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
    }
  | {
      method: "loess";
      span: number;
      robustIterations?: number;
      degree?: 2;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      interval?: never;
    }
) & { readonly predict?: RegressionPredictOptions; readonly missing?: "error" | "drop" };
export interface DatasetDensityTransform {
  type: "density";
  field: string;
  groupBy?: string;
  bandwidth: "auto" | number;
  extent: "auto" | readonly [number, number];
  steps: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
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
    readonly extent: readonly [number, number];
    readonly splitDomain?: readonly [unknown, unknown];
  } & (
    | {
        readonly bandwidth: number;
        readonly bandwidths?: never;
      }
    | {
        readonly bandwidth?: never;
        readonly bandwidths: readonly {
          readonly group?: unknown;
          readonly split?: unknown;
          readonly bandwidth: number;
        }[];
      }
  );
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
  readonly x: { readonly field: string } & (
    | { readonly fieldType: "quantitative"; readonly temporalUnit?: never }
    | { readonly fieldType: "temporal"; readonly temporalUnit?: TemporalInputUnit }
  );
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
  missing?: "error" | "drop";
} & (
  | {
      center: "mean";
      extent: "stderr" | "stdev";
      method?: never;
      level?: never;
    }
  | {
      center: "mean";
      extent: "ci";
      method?: MeanConfidenceIntervalMethod;
      level: number;
    }
  | {
      center: "median";
      extent: "iqr";
      method?: never;
      level?: never;
    }
);
export type WindowSortOrder = "ascending" | "descending";
export interface WindowSort {
  field: string;
  order?: WindowSortOrder;
}
export type RowWindowFrame = {
  preceding: number;
  following?: number;
  duration?: never;
};
export type DurationWindowUnit = "millisecond" | "second" | "minute" | "hour" | "day";
export type DurationWindowFrame = {
  preceding?: never;
  following?: never;
  duration: {
    preceding: number;
    following?: number;
    unit: DurationWindowUnit;
  };
};
export type WindowFrame = RowWindowFrame | DurationWindowFrame;
export type WindowOperation =
  | { op: "rowNumber" | "rank" | "denseRank"; as: string }
  | { op: "cumulativeSum"; field: string; as: string }
  | {
      op: "lag" | "lead";
      field: string;
      as: string;
      offset?: number;
      default?: unknown;
    }
  | {
      op: "movingMean" | "movingSum";
      field: string;
      as: string;
      frame: WindowFrame;
      minPeriods?: number;
      missing?: "error" | "skip";
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
    }
  | {
      readonly op: "movingMean" | "movingSum";
      readonly field: string;
      readonly as: string;
      readonly frame:
        | {
            readonly preceding: number;
            readonly following: number;
          }
        | {
            readonly duration: {
              readonly preceding: number;
              readonly following: number;
              readonly unit: DurationWindowUnit;
            };
          };
      readonly minPeriods: number;
      readonly missing: "error" | "skip";
    };
export interface DatasetWindowTransform {
  readonly type: "window";
  readonly partitionBy: readonly string[];
  readonly sortBy: readonly DatasetWindowSort[];
  readonly operations: readonly DatasetWindowOperation[];
  readonly temporalUnit?: TemporalInputUnit;
}
export interface SortKey {
  field: string;
  order?: "ascending" | "descending";
  nulls?: "first" | "last";
  temporalUnit?: "year" | "timestamp";
}
export interface DatasetSortTransform {
  readonly type: "sort";
  readonly sortBy: readonly {
    readonly field: string;
    readonly order: "ascending" | "descending";
    readonly nulls: "first" | "last";
    readonly temporalUnit?: "year" | "timestamp";
  }[];
}
export interface ECDFOutputFields {
  value: string;
  cumulative: string;
  probability: string;
}
export interface DatasetECDFResolvedGroup {
  readonly keys: Readonly<Record<string, string | number | boolean>>;
  readonly denominator: number;
  readonly validCount: number;
}
export interface DatasetECDFTransform {
  readonly type: "ecdf";
  readonly field: string;
  readonly groupBy: readonly string[];
  readonly weight?: string;
  readonly missing: "drop" | "error";
  readonly as: Readonly<ECDFOutputFields>;
  readonly resolved?: {
    readonly groups: readonly DatasetECDFResolvedGroup[];
  };
}
export type TimeUnit =
  | "year"
  | "quarter"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second"
  | "week"
  | "weekday";
type DatasetTimeUnitTransformBase = {
  readonly missing?: "error" | "null";
  readonly type: "timeUnit";
  readonly field: string;
  readonly temporalUnit?: TemporalInputUnit;
  readonly as: string;
  readonly timeZone?: string;
};
export type DatasetTimeUnitTransform = DatasetTimeUnitTransformBase & (
  | {
      readonly unit: Exclude<TimeUnit, "week">;
      readonly weekStartsOn?: never;
      readonly weekRule?: never;
    }
  | {
      readonly unit: "week";
      readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      readonly weekRule: "calendar" | "iso";
    }
);
export type Bin2DAssignment = "edges" | "step";
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
  readonly assignment?: "step";
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
export interface DatasetBinTransform {
  readonly type: "bin";
  readonly field: string;
  readonly bin:
    | { readonly maxBins: number }
    | { readonly step: number }
    | { readonly boundaries: readonly [number, number, ...number[]] };
  readonly extent: "auto" | readonly [number, number];
  readonly nice: boolean;
  readonly zero: boolean;
  readonly includeEmpty: boolean;
  readonly members: boolean;
  readonly weight?: StatisticalWeight;
  readonly missing?: "error" | "drop";
  readonly as: {
    readonly lower: string;
    readonly upper: string;
    readonly count: string;
    readonly members?: string;
  };
  readonly resolved?: {
    readonly domain: readonly [number, number];
    readonly step?: number;
    readonly boundaries: readonly [number, number, ...number[]];
  };
}
export interface DatasetFlattenTransform {
  readonly type: "flatten";
  readonly fields: readonly string[];
  readonly as: readonly string[];
}
export interface DatasetLookupTransform {
  readonly type: "lookup";
  readonly field: string;
  readonly lookup: {
    readonly data: string;
    readonly key: string;
    readonly fields: readonly string[];
    readonly as: readonly string[];
  };
}
export interface DatasetFoldTransform {
  readonly type: "fold";
  readonly fields: readonly string[];
  readonly as: {
    readonly key: string;
    readonly value: string;
  };
}
export type ParseTimeFormat = "auto" | "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y";
export type ComputedExpressionV1 =
  | { readonly field: string }
  | { readonly constant: number | string | boolean | null }
  | {
      readonly op: "getPath";
      readonly operand: { readonly field: string };
      readonly path: readonly [string, ...string[]];
    }
  | {
      readonly op: "replaceLiteral";
      readonly operand: ComputedExpressionV1;
      readonly search: string;
      readonly replacement: string;
    }
  | {
      readonly op: "datePart";
      readonly part: "year";
      readonly operand: ComputedExpressionV1;
      readonly timeZone?: string;
    }
  | {
      readonly op: "parseTime";
      readonly operand: ComputedExpressionV1;
      readonly format?: ParseTimeFormat;
    }
  | {
      readonly op: "negate" | "absolute" | "log" | "sqrt" | "floor" | "not" | "isNull" | "toNumber";
      readonly operand: ComputedExpressionV1;
    }
  | {
      readonly op: "add" | "subtract" | "multiply" | "divide" |
        "eq" | "neq" | "lt" | "lte" | "gt" | "gte";
      readonly left: ComputedExpressionV1;
      readonly right: ComputedExpressionV1;
    }
  | {
      readonly op: "and" | "or" | "coalesce";
      readonly operands: readonly [ComputedExpressionV1, ComputedExpressionV1, ...ComputedExpressionV1[]];
    }
  | {
      readonly op: "concat";
      readonly operands: readonly [ComputedExpressionV1, ...ComputedExpressionV1[]];
    }
  | {
      readonly op: "if";
      readonly condition: ComputedExpressionV1;
      readonly then: ComputedExpressionV1;
      readonly else: ComputedExpressionV1;
    };
export type ExpressionNode =
  | { readonly type: "literal"; readonly value: number | string | boolean | null }
  | { readonly type: "field"; readonly name: string }
  | { readonly type: "fieldPath"; readonly root: string; readonly path: readonly [string, ...string[]] }
  | { readonly type: "parameter"; readonly id: string }
  | { readonly type: "unary"; readonly op: "negate" | "not"; readonly operand: ExpressionNode }
  | { readonly type: "binary"; readonly op: "add" | "subtract" | "multiply" | "divide" | "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "and" | "or"; readonly left: ExpressionNode; readonly right: ExpressionNode }
  | { readonly type: "if"; readonly condition: ExpressionNode; readonly then: ExpressionNode; readonly else: ExpressionNode }
  | ExpressionCall;
export type ExpressionCall =
  | { readonly type: "call"; readonly name: "abs" | "sqrt" | "log" | "exp" | "round" | "floor" | "ceil" | "min" | "max" | "pow" | "toNumber" | "lower" | "upper" | "length" | "substring" | "replace" | "concat" | "isNull" | "isMissing" | "isFinite" | "coalesce" | "arrayLength" | "at"; readonly args: readonly ExpressionNode[] }
  | { readonly type: "call"; readonly name: "sin" | "cos" | "tan" | "atan2"; readonly args: readonly ExpressionNode[]; readonly options: { readonly angleUnit: "radians" | "degrees" } }
  | { readonly type: "call"; readonly name: "parseTime"; readonly args: readonly ExpressionNode[]; readonly options: { readonly format: "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y" | "iso-offset" } }
  | { readonly type: "call"; readonly name: "datePart"; readonly args: readonly ExpressionNode[]; readonly options: { readonly part: "year" | "quarter" | "month" | "day" | "weekday" | "hour" | "minute" | "second" | "millisecond"; readonly timeZone: string } }
  | { readonly type: "call"; readonly name: "timeFloor"; readonly args: readonly ExpressionNode[]; readonly options: { readonly timeZone: string } & ({ readonly unit: "week"; readonly weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 } | { readonly unit: "year" | "quarter" | "month" | "day" | "hour" | "minute" | "second" }) };
export interface ComputedExpressionV2 {
  readonly version: 2;
  readonly registry: "standard@1";
  readonly root: ExpressionNode;
}
export type ComputedExpression = ComputedExpressionV1 | ComputedExpressionV2;
export interface DatasetComputedTransform {
  readonly type: "computed";
  readonly as: string;
  readonly expression: ComputedExpression;
}
export type NormalizeMethod =
  | "share"
  | "zscore"
  | "minmax"
  | "index"
  | "change"
  | "percentChange";
export type NormalizeZeroDenominator = "error" | "null" | "zero";
export type NormalizeBaseline =
  | { readonly position: "first" | "last" }
  | { readonly value: number };
type DatasetNormalizedBaseTransform = {
  readonly type: "normalize";
  readonly field: string;
  readonly as: string;
  readonly groupBy: readonly string[];
};
type DatasetNormalizeBaselineTransform = {
  readonly baseline: NormalizeBaseline;
  readonly sortBy: readonly WindowSort[];
};
export type DatasetNormalizedTransform = DatasetNormalizedBaseTransform & (
  | {
      readonly method: "share" | "minmax";
      readonly zeroDenominator: NormalizeZeroDenominator;
    }
  | {
      readonly method: "zscore";
      readonly variance: "population" | "sample";
      readonly zeroDenominator: NormalizeZeroDenominator;
    }
  | ({
      readonly method: "index" | "percentChange";
      readonly zeroDenominator: NormalizeZeroDenominator;
    } & DatasetNormalizeBaselineTransform)
  | ({ readonly method: "change" } & DatasetNormalizeBaselineTransform)
);
export interface CalendarDayDomain {
  readonly unit: "day";
  /** Inclusive strict Gregorian YYYY-MM-DD date. */
  readonly start: string;
  /** Inclusive strict Gregorian YYYY-MM-DD date. */
  readonly end: string;
  readonly timeZone: string;
}
export type DatasetCompleteTransform = {
  readonly type: "complete";
  readonly key: string;
  readonly groupBy: readonly string[];
  readonly fill: Readonly<Record<string, DatasetScalar>>;
  readonly members?: string;
} & (
  | { readonly values: readonly DatasetScalar[]; readonly sequence?: never; readonly calendar?: never }
  | {
      readonly sequence: { readonly start: number; readonly end: number; readonly step: number };
      readonly values?: never;
      readonly calendar?: never;
    }
  | { readonly calendar: CalendarDayDomain; readonly values?: never; readonly sequence?: never }
  | { readonly values?: never; readonly sequence?: never; readonly calendar?: never }
);
type DatasetImputedBaseTransform = {
  readonly type: "impute";
  readonly fields: readonly string[];
  readonly groupBy: readonly string[];
  readonly edges: "keep" | "error";
  readonly maxGap?: number;
};
export type DatasetImputedTransform = DatasetImputedBaseTransform & (
  | { readonly method: "mean"; readonly value?: never; readonly sortBy: readonly DatasetWindowSort[]; }
  | {
      readonly method: "constant";
      readonly value: DatasetScalar;
      readonly sortBy: readonly DatasetWindowSort[];
    }
  | {
      readonly method: "forward" | "backward";
      readonly value?: never;
      readonly sortBy: readonly [DatasetWindowSort, ...DatasetWindowSort[]];
    }
  | {
      readonly method: "linear";
      readonly value?: never;
      readonly sortBy: readonly [{ readonly field: string; readonly order: "ascending" }];
    }
);
export type StackDataMode = "stack" | "fill" | "center" | "diverging";
export interface StackDataOutputFields {
  start?: string;
  end?: string;
  value?: string;
  share?: string;
}
export interface DatasetStackTransform {
  readonly type: "stack";
  readonly category: string;
  readonly group: string;
  readonly value: string;
  readonly mode: StackDataMode;
  readonly as: Required<StackDataOutputFields>;
}
interface DatasetStatisticalReferenceTransform {
  readonly type: "statisticalReference";
  readonly target: string;
}
export interface PivotColumn {
  readonly value: string | number | boolean | null;
  readonly as: string;
}
export type PivotNumericOperation = "none" | "sum" | "mean" | "min" | "max";
export type DatasetPivotTransform = {
  readonly type: "pivot";
  readonly field: string;
  readonly groupBy: readonly string[];
  readonly columns: readonly PivotColumn[];
  readonly fill: number | null;
} & (
  | { readonly op: PivotNumericOperation; readonly value: string }
  | { readonly op: "count"; readonly value?: never }
);
export type PivotDataOptions = {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly string[];
  columns?: readonly PivotColumn[];
  fill?: number | null;
} & (
  | { op?: PivotNumericOperation; value: string }
  | { op: "count"; value?: never }
);
export type DatasetTransform =
  | DatasetPivotTransform
  | DatasetBinTransform
  | DatasetBin2DTransform
  | DatasetCompleteTransform
  | DatasetComputedTransform
  | DatasetImputedTransform
  | DatasetNormalizedTransform
  | DatasetFilterTransform
  | DatasetFlattenTransform
  | DatasetLookupTransform
  | DatasetFoldTransform
  | DatasetRegressionTransform
  | DatasetRegressionStatisticsTransform
  | DatasetSortTransform
  | DatasetDensityTransform
  | DatasetECDFTransform
  | DatasetHorizonTransform
  | DatasetIntervalTransform
  | DatasetSummaryTransform
  | DatasetStackTransform
  | DatasetStatisticalReferenceTransform
  | DatasetTimeUnitTransform
  | DatasetWindowTransform;
type RequestedTransform<T> = T extends unknown ? Omit<T, "resolved"> : never;
export type RequestedDatasetTransform = RequestedTransform<Exclude<
  DatasetTransform,
  DatasetHorizonTransform | DatasetStatisticalReferenceTransform
>>;
export type DerivedDataDependents = "reject" | "recompute";
export interface EditDerivedDataOptions {
  target: string;
  definition: RequestedDatasetTransform;
  dependents?: DerivedDataDependents;
}
export interface CreateDerivedDataOptions {
  id: string;
  source: string;
  transform: readonly [DatasetTransform];
}
export interface DatasetSummaryTransform {
  type: "summary";
  groupBy: readonly string[];
  aggregates: readonly SummaryAggregateOptions[];
  members?: string;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  empty?: "null" | "identity";
}
export interface SummaryAggregateOptions {
  op: AggregateOperation | { op: "ciLower" | "ciUpper"; method: BootstrapMeanIntervalMethod; level?: number };
  field?: string;
  as: string;
}
export interface SummaryDataOptions {
  id: string;
  source?: string;
  groupBy?: string | readonly string[];
  aggregates: readonly SummaryAggregateOptions[];
  members?: string;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  empty?: "null" | "identity";
}
export interface SortedDataOptions {
  id: string;
  source?: string;
  sortBy: readonly [SortKey, ...SortKey[]];
}
export interface EditSortedDataOptions {
  target: string;
  sortBy: readonly [SortKey, ...SortKey[]];
  dependents?: DerivedDataDependents;
}
export interface BindMarkDataOptions {
  target: string;
  data: string;
}

export interface RemoveStoredResourceOptions { kind: StoredResourceKind; id: string; cascade?: boolean; }

export interface RemoveResourceOptions {
  readonly id: string;
}
export type MarkGraphicProperty =
  | "x" | "y" | "width" | "height" | "radius"
  | "x1" | "y1" | "x2" | "y2"
  | "fill" | "stroke" | "strokeWidth" | "opacity";
export type MarkSelector = { grain?: "item" | "stack"; rows: { data: string; indices: readonly number[] }; } | {
  grain?: "item" | "stack";
} & (
  | { field: string; channel?: never; property?: never }
  | { channel: "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth" | "size" | "shape" | "group" | "opacity"; field?: never; property?: never }
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
  /** Graph plots retain matching nodes and their induced edges without recomputing the stored graph or layout. */
  target?: string;
  mode?: "replace" | "compose";
} & MarkSelector;
export interface RemoveMarkFilterOptions {
  target?: string;
}
export interface HighlightMarksOptions {
  fontSize?: number;
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
  | "diverging"
  | "center";
export type ScalarAggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";
export type ConfidenceIntervalMethod = "normal" | "student-t";
/** Seeded percentile bootstrap of nonweighted means; samples defaults to 1000. */
export interface BootstrapMeanIntervalMethod {
  type: "bootstrap";
  seed: number;
  samples?: number;
}
export type MeanConfidenceIntervalMethod = ConfidenceIntervalMethod | BootstrapMeanIntervalMethod;
export type ParameterizedAggregateOperation =
  | { op: "quantile"; probability: number }
  | {
      op: "first" | "last";
      orderBy: string;
      order?: "ascending" | "descending";
    }
  | {
      op: "ciLower" | "ciUpper";
      method?: ConfidenceIntervalMethod;
      level?: number;
    };
export type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
/** HCL modes borrow a chromatic endpoint's hue across an exact RGB-neutral endpoint. */
export type ContinuousColorInterpolation =
  | "rgb"
  | "hsl"
  | "hsl-long"
  | "lab"
  | "hcl"
  | "hcl-long"
  | "cubehelix"
  | "cubehelix-long";
/** A simple polygon around its unchanged input origin; defaults to equal-area normalization. */
export type PointPolygonShape = {
  polygon: readonly { x: number; y: number }[];
  normalization?: "area" | "radius";
};
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
  | "wye"
  | "wedge"
  | "arrow"
  | PointPolygonShape;
export type StrokeStyleDetails = {
  lineCap?: "butt" | "round" | "square";
  lineJoin?: "miter" | "round" | "bevel";
  miterLimit?: number;
};
export type RectStyleDetails = StrokeStyleDetails & {
  cornerRadius?: number;
  cornerRadiusTopLeft?: number;
  cornerRadiusTopRight?: number;
  cornerRadiusBottomRight?: number;
  cornerRadiusBottomLeft?: number;
};
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
/**
 * One semantic assignment or removal. Complete unreferenced source datasets and
 * coordinates can be removed; source values remain immutable. Domain removal
 * actions own full resource/configuration lifecycle checks and cleanup.
 */
export type EditSemanticOptions =
  | { property: string; value: unknown; remove?: false }
  | { property: string; remove: true; value?: never };
export type EditGraphicsOptions =
  | { target: string; property: string; value: unknown; remove?: false }
  | { target: string | readonly string[]; remove: true; property?: never; value?: never };

export interface TraceNode {
  readonly id: string;
  readonly op: string;
  readonly description: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly children: readonly TraceNode[];
}

/** Typed keys distinguish strings, numbers, bigint, boolean and Date epochs. */
export type RowKeyScalar = string | number | bigint | boolean | Date;
export type RowKey = RowKeyScalar | readonly RowKeyScalar[];
export type DataKeySpec = { readonly mode: "generated" } | { readonly mode: "explicit" }
  | { readonly mode: "field"; readonly field: string }
  | { readonly mode: "fields"; readonly fields: readonly string[] };
export interface InputRowRef {
  readonly data: string; readonly logicalDataId: string; readonly revision: number;
  readonly rowKey: string; readonly role: string;
}
export interface RowLineage {
  readonly entries: readonly (readonly InputRowRef[])[];
  readonly rowRefs: readonly number[];
}
export type ParameterType = "number" | "string" | "boolean";
export type ParameterValue = number | string | boolean | null;
type ParameterDefinition<T extends ParameterType, V> =
  | { readonly type?: T; readonly value: V; readonly nullable?: boolean }
  | { readonly type: T; readonly value: null; readonly nullable: true };
export type CreateParameterOptions = { readonly id: string } & (
  ParameterDefinition<"number", number> | ParameterDefinition<"string", string> | ParameterDefinition<"boolean", boolean>
);
export interface EditParameterOptions { readonly target: string; readonly value: ParameterValue; }
export interface RemoveParameterOptions { readonly id: string; }
export interface ParameterRef { readonly kind: "parameter"; readonly id: string; readonly revision: number; }
export interface ParameterResource extends ParameterRef {
  readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" };
  readonly inputs: readonly [];
  readonly options: { readonly type: ParameterType; readonly nullable: boolean };
  readonly result: { readonly value: ParameterValue };
  readonly provenance: { readonly origin: "authored" };
}
export type DataSourceValue = null | boolean | number | string
  | readonly DataSourceValue[] | { readonly [key: string]: DataSourceValue };
export type DataParseDirective =
  | { readonly type: "string" | "number" | "boolean"; readonly nullable?: boolean; readonly format?: never; readonly timeZone?: never }
  | { readonly type: "date"; readonly nullable?: boolean; readonly timeZone: string;
      readonly format?: "%Y-%m-%d" | "%d/%m/%Y" | "%m/%d/%Y" | "iso" };
export type DataParse = Readonly<Record<string, DataParseDirective>>;
type DataSourceParsing = { readonly parse?: DataParse; readonly schema?: SourceSchemaInput };
type DataSourceFormat = { readonly format: "csv"; readonly delimiter?: string }
  | { readonly format: "json"; readonly delimiter?: never };
export type DataSource = DataSourceParsing & (
  | { readonly kind: "inline"; readonly values: readonly Readonly<Record<string, DataSourceValue>>[];
      readonly text?: never; readonly format?: never; readonly delimiter?: never }
  | (DataSourceFormat & { readonly kind: "inline"; readonly text: string; readonly values?: never })
  | (DataSourceFormat & { readonly kind: "url"; readonly url: string | ComputedExpressionV2 })
  | (DataSourceFormat & { readonly kind: "named"; readonly name: string })
);
type DataSourceKeys =
  | { readonly keyField?: never; readonly keyFields?: never }
  | { readonly keyField: string; readonly keyFields?: never }
  | { readonly keyField?: never; readonly keyFields: readonly string[] };
export type CreateDataUpdateRequest = DataSourceKeys & {
  readonly kind: "create"; readonly id: string; readonly source: DataSource;
};
export interface ReviseDataUpdateRequest {
  readonly kind: "revise"; readonly target: string; readonly id: string;
  readonly rowMap?: readonly (number | null)[];
}
export interface ParameterDataUpdateRequest {
  readonly kind: "parameter"; readonly target: string; readonly value: ParameterValue;
}
export type DataUpdateRequest = CreateDataUpdateRequest | ReviseDataUpdateRequest | ParameterDataUpdateRequest;
export type DataSourceResponse = { readonly encoding: "utf-8"; readonly mimeType: string } & (
  | { readonly text: string; readonly bytes?: never }
  | { readonly bytes: Uint8Array; readonly text?: never }
);
export interface DataUpdateHost {
  /** Supply the application's current request token again when applying. */
  readonly requestToken: string;
  /** Absolute URL for resolving a newly created relative URL source. */
  readonly baseURL?: string;
  readonly signal?: AbortSignal;
  readonly load?: (request: Readonly<{ url: string; signal?: AbortSignal }>) => DataSourceResponse | PromiseLike<DataSourceResponse>;
  readonly resolveNamed?: (request: Readonly<{ name: string; signal?: AbortSignal }>) => DataSourceResponse | PromiseLike<DataSourceResponse>;
}
interface DataUpdateDescriptors {
  create: { readonly kind: "create"; readonly id: string; readonly sourceKind: DataSource["kind"]; readonly format?: "csv" | "json" };
  revise: { readonly kind: "revise"; readonly target: string; readonly id: string };
  parameter: { readonly kind: "parameter"; readonly target: string };
}
declare const preparedDataUpdate: unique symbol;
/** Opaque preparation evidence. Only prepareDataUpdate can create a valid handle. */
export interface PreparedDataUpdate<Kind extends DataUpdateRequest["kind"] = DataUpdateRequest["kind"]> {
  readonly [preparedDataUpdate]: Kind;
  readonly kind: "data-update";
  readonly request: DataUpdateDescriptors[Kind];
}
export interface ApplyDataUpdateOptions<Kind extends DataUpdateRequest["kind"] = DataUpdateRequest["kind"]> {
  readonly prepared: PreparedDataUpdate<Kind>;
  readonly requestToken: string;
}
export type DataSourceProvenance =
  | { readonly parserVersion: "rows@1"; readonly format: "rows"; readonly contentHash: string; readonly hashKind: "encoded-rows" }
  | { readonly parserVersion: "csv@1" | "json@1"; readonly format: "csv" | "json";
      readonly contentHash: string; readonly hashKind: "utf8-bytes"; readonly mimeType: string;
      readonly encoding: "utf-8"; readonly byteLength: number };
export interface DataSourceReceipt {
  readonly sourceId: string;
  readonly parsing: { readonly parse: DataParse; readonly format?: "csv" | "json";
    readonly delimiter?: string; readonly schema?: SourceSchemaInput };
  readonly resolvedURL?: string;
  readonly name?: string;
  readonly original: { readonly kind: "text"; readonly text: string }
    | { readonly kind: "rows"; readonly values: readonly Readonly<Record<string, DataSourceValue>>[] };
  readonly provenance: DataSourceProvenance;
}
export interface DataSourceResource {
  readonly kind: "data-source"; readonly id: string; readonly revision: number;
  readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" };
  readonly inputs: readonly ParameterRef[];
  readonly options: DataSourceKeys & { readonly source: DataSource; readonly baseURL?: string };
  readonly result: { readonly data: Extract<InputRef, { readonly kind: "data" }>; readonly inputHash: string };
  readonly provenance: { readonly origin: "authored" };
}
export type GraphKeyField = string | readonly string[];
export interface ObservedGraphDefinition {
  readonly nodeKey: GraphKeyField;
  readonly source: GraphKeyField;
  readonly target: GraphKeyField;
  readonly edgeKey?: GraphKeyField;
  readonly weight?: string;
  readonly attributes?: readonly string[];
  readonly directed?: boolean;
  readonly selfLoops?: boolean;
  readonly maxNodes?: number;
  readonly maxEdges?: number;
}
export interface CreateGraphDataOptions extends ObservedGraphDefinition {
  readonly id: string; readonly nodes: string; readonly edges: string;
}
export interface EditGraphDataOptions {
  readonly target?: string; readonly nodes?: string; readonly edges?: string;
  readonly definition?: Partial<ObservedGraphDefinition>;
}
export type GraphMetric = "euclidean" | "manhattan" | "cosine" | "jaccard" | "great-circle";
export type GraphFeatures = readonly string[] | { readonly set: string } | { readonly longitude: string; readonly latitude: string };
export type GraphSearchOptions = { readonly mode?: "exact"; readonly algorithm?: "brute-force" | "kd-tree" | "grid" } |
  { readonly mode: "approximate"; readonly algorithm?: "projection-forest"; readonly seed: number; readonly trees?: number;
    readonly projections?: 1; readonly leafSize?: number; readonly searchLeaves?: number; readonly fallback?: "error" | "exact"; readonly minRecall?: number };
export interface GraphFeaturePolicy { readonly missing?: "error" | "omit-node"; readonly zeroVector?: "error" | "zero-similarity"; }
export interface InferredGraphSource {
  readonly nodeKey: GraphKeyField; readonly ruleId: string; readonly attributes?: readonly string[];
  readonly maxNodes?: number; readonly maxEdges?: number;
}
export type GraphMetricDefinition =
  { readonly metric: "euclidean" | "manhattan" | "cosine"; readonly features: readonly string[]; readonly preprocess?: "none" | "standardize" | "minmax" } |
  { readonly metric: "jaccard"; readonly features: readonly string[] | { readonly set: string }; readonly preprocess?: "none" } |
  { readonly metric: "great-circle"; readonly features: readonly string[] | { readonly longitude: string; readonly latitude: string }; readonly preprocess?: "none" };
export type GraphNeighborDefinition = InferredGraphSource & GraphMetricDefinition & (
  { readonly rule: "knn"; readonly options?: GraphFeaturePolicy & { readonly k?: number; readonly symmetrize?: "directed" | "union" | "mutual"; readonly search?: GraphSearchOptions } } |
  { readonly rule: "radius"; readonly options: GraphFeaturePolicy & { readonly radius: number; readonly directed?: boolean; readonly search?: Extract<GraphSearchOptions, { readonly mode?: "exact" }> } } |
  { readonly rule: "similarity"; readonly metric: "cosine" | "jaccard"; readonly options: GraphFeaturePolicy & { readonly threshold: number; readonly directed?: boolean; readonly search?: { readonly mode?: "exact"; readonly algorithm?: "brute-force" } } });
export type GraphMetricMstDefinition = InferredGraphSource & GraphMetricDefinition & { readonly rule: "mst"; readonly options?: GraphFeaturePolicy & { readonly forest?: boolean } };
export type GraphCandidateMstDefinition = InferredGraphSource & { readonly rule: "mst"; readonly options?: { readonly forest?: boolean }; readonly features?: never; readonly metric?: never; readonly preprocess?: never };
export type GraphStructuralDefinition = InferredGraphSource & { readonly features?: never; readonly metric?: never; readonly preprocess?: never } & (
  { readonly rule: "group"; readonly options: { readonly fields: readonly string[]; readonly missing?: "error" | "omit-node" | "include"; readonly mode?: "clique" | "star";
    readonly hubKey?: RowKey; readonly hubs?: readonly { readonly group: readonly unknown[]; readonly key: RowKey }[] } } |
  { readonly rule: "sequence"; readonly options: { readonly orderField: string; readonly groupBy?: readonly string[]; readonly missing?: "error" | "omit-node";
    readonly lag?: number; readonly maxGap?: number; readonly temporalUnit?: TemporalInputUnit } });
export type InferredGraphDefinition = GraphNeighborDefinition | GraphMetricMstDefinition | GraphCandidateMstDefinition | GraphStructuralDefinition;
export type CreateInferredGraphDataOptions = { readonly id: string; readonly data?: string } & (
  (GraphNeighborDefinition | GraphMetricMstDefinition | GraphStructuralDefinition) & { readonly candidateGraph?: never } |
  GraphCandidateMstDefinition & { readonly candidateGraph: string });
export interface EditInferredGraphDataOptions {
  readonly target?: string; readonly data?: string; readonly candidateGraph?: string | null;
  readonly definition?: Partial<InferredGraphDefinition>;
}
export interface GraphInferenceDiagnostics {
  readonly options: Readonly<Record<string, unknown>>;
  readonly preparation?: { readonly metric: GraphMetric; readonly preprocess: "none" | "standardize" | "minmax";
    readonly missing: "error" | "omit-node"; readonly zeroVector?: "error" | "zero-similarity";
    readonly sourceIndices: readonly number[]; readonly omitted: readonly { readonly index: number; readonly feature: number; readonly reason: "missing-value" }[];
    readonly statistics: readonly { readonly scale: number; readonly center: number; readonly spread: number }[] };
  readonly sourceIndices?: readonly number[]; readonly omitted?: readonly { readonly index: number; readonly reason: "missing-group" | "missing-order" }[];
  readonly search?: Readonly<Record<string, unknown>>; readonly effectiveK?: number; readonly pairCount?: number;
  readonly cost?: number; readonly components?: number; readonly componentNodes?: readonly (readonly number[])[]; readonly candidateCount?: number;
}
export interface GraphNode {
  readonly key: string;
  readonly sourceRows: readonly number[];
  readonly attributes: Readonly<Record<string, unknown>>;
}
export interface GraphEdge<Origin extends "observed" | "inferred" = "observed" | "inferred"> {
  readonly key: string; readonly sourceKey: string; readonly targetKey: string;
  readonly directed: boolean; readonly weight: number;
  readonly origin: Origin; readonly ruleId: Origin extends "observed" ? null : string; readonly sourceRows: readonly number[];
}
export interface GraphModel<Origin extends "observed" | "inferred" = "observed" | "inferred"> {
  readonly nodes: readonly GraphNode[]; readonly edges: readonly GraphEdge<Origin>[];
  readonly directed: boolean; readonly selfLoops: boolean;
  readonly adjacency: readonly { readonly key: string; readonly incoming: readonly string[];
    readonly outgoing: readonly string[]; readonly neighbors: readonly string[] }[];
}
export interface ObservedGraphResource {
  readonly kind: "graph"; readonly id: string; readonly revision: number;
  readonly algorithmVersion: "1"; readonly ownership: { readonly mode: "authored" };
  readonly inputs: readonly Extract<InputRef, { readonly kind: "data" }>[];
  readonly options: { readonly roles: { readonly nodes: 0; readonly edges: 0 | 1 };
    readonly definition: ObservedGraphDefinition & Required<Pick<ObservedGraphDefinition, "attributes" | "directed" | "selfLoops" | "maxNodes" | "maxEdges">> };
  readonly result: { readonly model: GraphModel<"observed">; readonly diagnostics: null };
  readonly provenance: { readonly origin: "observed"; readonly sourceRows: readonly InputRowRef[] };
}
export interface InferredGraphResource {
  readonly kind: "graph"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" };
  readonly inputs: readonly [Extract<InputRef, { readonly kind: "data" }>, ...Extract<InputRef, { readonly kind: "graph" }>[]];
  readonly options: { readonly roles: { readonly nodes: 0; readonly edges: 0 }; readonly definition: InferredGraphDefinition &
    Required<Pick<InferredGraphSource, "attributes" | "maxNodes" | "maxEdges">> & { readonly options: Readonly<Record<string, unknown>> } };
  readonly result: { readonly model: GraphModel<"inferred">; readonly diagnostics: GraphInferenceDiagnostics };
  readonly provenance: { readonly origin: "inferred"; readonly sourceRows: readonly InputRowRef[] };
}
export type GraphResource = ObservedGraphResource | InferredGraphResource;
export interface GraphPosition { readonly key: RowKey; readonly x: number; readonly y: number; }
export interface GraphNodePaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; radius?: number; fill?: FillPaint; stroke?: string; strokeWidth?: number; opacity?: number; }
export interface GraphEdgePaint { shadow?: MarkShadow | false; stroke?: string; strokeWidth?: number; opacity?: number; parallelGap?: number; loopRadius?: number; arrowSize?: number; arrows?: "auto" | boolean; }
export interface GraphLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; fontSize?: number; fontFamily?: string; fontWeight?: string | number; }
export interface GraphLabelsOptions extends GraphLabelPaint {
  field?: string; offset?: readonly [number, number]; overrides?: readonly (GraphLabelPaint & { key: RowKey; text?: string })[];
}
export interface GraphPlotOptions {
  id?: string; layout?: string; origin?: "auto" | readonly [number, number]; clip?: boolean;
  nodes?: GraphNodePaint & { overrides?: readonly (GraphNodePaint & { key: RowKey })[] };
  edges?: GraphEdgePaint; labels?: false | GraphLabelsOptions;
}
export interface EditGraphPlotOptions extends Omit<GraphPlotOptions, "id"> { target?: string; }
export interface GraphPin { readonly key: RowKey; readonly fx: number; readonly fy: number; }
export interface GraphLayoutLimits { readonly maxNodes?: number; readonly maxEdges?: number; }
export interface GraphFixedOptions extends GraphLayoutLimits { readonly positions: readonly GraphPosition[]; }
export interface GraphCircularOptions extends GraphLayoutLimits { readonly center?: readonly [number, number]; readonly radius?: number; readonly startAngle?: number; }
export interface GraphForceOptions extends GraphLayoutLimits {
  readonly seed?: number; readonly iterations?: number; readonly linkDistance?: number; readonly repulsion?: number;
  readonly collisionRadius?: number; readonly damping?: number; readonly center?: readonly [number, number];
  readonly componentGap?: number; readonly initialPositions?: readonly GraphPosition[]; readonly pinned?: readonly GraphPin[];
}
export type LayoutGraphOptions = { readonly id: string; readonly graph?: string } &
  ({ readonly method: "fixed"; readonly options: GraphFixedOptions }
  | { readonly method: "circular"; readonly options?: GraphCircularOptions }
  | { readonly method: "force"; readonly options?: GraphForceOptions });
export type GraphLayoutResource = {
  readonly kind: "layout"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" }; readonly inputs: readonly { readonly kind: "graph"; readonly id: string; readonly revision: number }[];
  readonly provenance: { readonly origin: "inferred"; readonly sourceRows: readonly InputRowRef[] };
  readonly result: {
    readonly nodes: readonly { readonly key: string; readonly x: number; readonly y: number }[];
    readonly algorithm: "fixed@1" | "circular@1" | "exact-pair-spring@1";
    readonly packing: null | { readonly method: "horizontal"; readonly gap: number; readonly components: readonly {
      readonly nodeIndices: readonly number[]; readonly pinned: boolean;
      readonly bounds: { readonly left: number; readonly right: number; readonly top: number; readonly bottom: number };
    }[] };
  };
} & { readonly options:
  { readonly method: "fixed"; readonly options: Readonly<Required<GraphFixedOptions>> }
  | { readonly method: "circular"; readonly options: Readonly<Required<GraphCircularOptions>> }
  | { readonly method: "force"; readonly options: Readonly<Required<Omit<GraphForceOptions, "initialPositions">> & Pick<GraphForceOptions, "initialPositions">> }
};
/** Directed observed flow: value is a required finite nonnegative edge column. */
export interface FlowDefinition extends Omit<ObservedGraphDefinition, "weight" | "directed"> {
  readonly value: string;
  readonly balance?: "allow" | "strict";
}
export interface CreateFlowDataOptions extends FlowDefinition {
  readonly id: string; readonly nodes: string; readonly edges: string;
}
export interface EditFlowDataOptions {
  readonly target?: string; readonly nodes?: string; readonly edges?: string;
  readonly definition?: Partial<FlowDefinition>;
}
export interface FlowNodeTotals {
  readonly key: string; readonly incoming: number; readonly outgoing: number;
  readonly throughput: number; readonly imbalance: number;
}
export interface FlowResource extends Omit<ObservedGraphResource, "options" | "result"> {
  readonly options: ObservedGraphResource["options"] & { readonly flow: { readonly balance: "allow" | "strict" } };
  readonly result: { readonly model: GraphModel; readonly diagnostics: { readonly flow: { readonly nodes: readonly FlowNodeTotals[] } } };
}
/** Layout dimensions are independent of Canvas size; marks fit the stored bounds uniformly. */
export interface FlowLayoutOptions extends GraphLayoutLimits {
  readonly width?: number; readonly height?: number; readonly nodeWidth?: number; readonly nodePadding?: number;
  readonly align?: "left" | "right" | "center" | "justify";
  readonly order?: "input" | "barycentric" | readonly RowKey[];
  readonly iterations?: number; readonly laneGap?: number; readonly orientation?: "horizontal" | "vertical";
}
export interface LayoutFlowOptions {
  readonly id: string; readonly graph?: string; readonly method: "dag" | "cyclic"; readonly options?: FlowLayoutOptions;
}
export interface FlowLayoutNode extends FlowNodeTotals {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
  readonly rank: number; readonly order: number;
}
export interface FlowLayoutEdge {
  readonly key: string; readonly sourceKey: string; readonly targetKey: string; readonly value: number; readonly thickness: number;
  readonly source: { readonly x: number; readonly y: number }; readonly target: { readonly x: number; readonly y: number };
  readonly route: "forward" | "feedback" | "loop";
  /** Lane coordinates use the canonical horizontal layout frame. */
  readonly lane: null | { readonly side: "top" | "bottom"; readonly index: number; readonly center: number; readonly sourceX: number; readonly targetX: number };
}
export interface FlowLayoutResource extends Omit<GraphLayoutResource, "options" | "result"> {
  readonly options: { readonly method: "dag" | "cyclic"; readonly options: Readonly<Required<FlowLayoutOptions>> };
  readonly result: {
    readonly algorithm: "sankey@1"; readonly nodes: readonly FlowLayoutNode[]; readonly edges: readonly FlowLayoutEdge[]; readonly scale: number;
    readonly columns: readonly { readonly rank: number; readonly keys: readonly string[] }[];
    readonly components: readonly { readonly rank: number; readonly keys: readonly string[] }[];
    readonly bounds: { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number };
  };
}
export interface FlowBodyPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; readonly fill?: FillPaint; readonly stroke?: string; readonly strokeWidth?: number; readonly opacity?: number; }
export interface FlowLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; readonly fill?: FillPaint; readonly fontFamily?: string; readonly fontSize?: number; readonly fontWeight?: string | number; }
export interface FlowLabelsOptions extends FlowLabelPaint {
  readonly content?: "key" | "value" | { readonly field: string }; readonly offset?: readonly [number, number];
  readonly overrides?: readonly (FlowLabelPaint & { readonly key: RowKey; readonly text?: string })[];
}
export interface FlowNodesOptions {
  readonly id?: string; readonly layout?: string; readonly coordinate?: string; readonly clip?: boolean;
  readonly nodes?: FlowBodyPaint & { readonly overrides?: readonly (FlowBodyPaint & { readonly key: RowKey })[] };
  readonly labels?: false | FlowLabelsOptions;
}
export interface FlowLinksOptions {
  readonly id?: string; readonly layout?: string; readonly coordinate?: string; readonly clip?: boolean;
  readonly links?: FlowBodyPaint & { readonly overrides?: readonly (FlowBodyPaint & { readonly key: RowKey })[] };
}
export interface EditFlowNodesOptions extends Omit<FlowNodesOptions, "id"> { readonly target?: string; }
export interface EditFlowLinksOptions extends Omit<FlowLinksOptions, "id"> { readonly target?: string; }
export type StoredResourceKind = "persistent-selection" | "parameter" | "data-source" | "hierarchy" | "layout" | "image" | "graph" | "font";
export type InputRef = { readonly kind: "data"; readonly id: string; readonly logicalId: string; readonly revision: number }
  | { readonly kind: StoredResourceKind; readonly id: string; readonly revision: number };
export interface PersistentSelectionResource {
  readonly kind: "persistent-selection"; readonly id: string; readonly revision: number;
  readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" } | { readonly mode: "generated"; readonly owner: InputRef };
  readonly inputs: readonly InputRef[];
  readonly options: { readonly mode: "predicate"; readonly predicate: Readonly<Record<string, unknown>> }
    | { readonly mode: "row-keys"; readonly logicalDataId: string; readonly rowKeys: readonly string[] };
  readonly result: Readonly<Record<string, never>>;
  readonly provenance: { readonly origin: "authored" | "observed" | "inferred"; readonly sourceRows?: readonly InputRowRef[] };
}


export type HierarchyValueMode = "leaf-sum" | "inclusive" | "own-plus-children";
export type HierarchySource =
  | { key: string; parent: string; value: string; children?: never; groupFields?: never; valueMode?: HierarchyValueMode; forest?: boolean; missingCategory?: never }
  | { key: string; children: string; value: string; parent?: never; groupFields?: never; valueMode?: HierarchyValueMode; forest?: boolean; missingCategory?: never }
  | { groupFields: readonly string[]; value: string; key?: never; parent?: never; children?: never; valueMode?: "leaf-sum"; forest?: never; missingCategory?: "error" | "include" };
export type CreateHierarchyDataOptions = HierarchySource & { id: string; data?: string; maxNodes?: number };
/** Omitted fields preserve the existing source form; every edit must change at least one option. */
export type EditHierarchyDataOptions = Partial<HierarchySource> & { target?: string; data?: string; maxNodes?: number };
export type HierarchyOrder = "input"
  | { by: "value" | "key"; direction: "ascending" | "descending" }
  | { by: "field"; field: string; direction: "ascending" | "descending"; nulls?: "first" | "last"; temporalUnit?: "year" | "timestamp" };
export type HierarchyTreeOptions = { nodeSize: readonly [number, number]; siblingGap: number; depthGap: number; maxNodes?: number } &
  ({ orientation: "vertical" | "horizontal"; radius?: never; startAngle?: never; sweep?: never }
  | { orientation: "radial"; radius: number; startAngle: number; sweep: number });
export interface HierarchyTreemapOptions { size: readonly [number, number]; padding: number; method: "slice-dice" | "squarify"; maxNodes?: number; }
export type LayoutHierarchyOptions = { id: string; hierarchy?: string; order?: HierarchyOrder } &
  ({ method: "partition"; options?: { maxNodes?: number } }
  | { method: "tree"; options: HierarchyTreeOptions }
  | { method: "treemap"; options: HierarchyTreemapOptions });
/** The method remains fixed; supplied options patch its existing layout intent. */
export type EditLayoutOptions = { target?: string } & (
  { order?: HierarchyOrder; options?: Partial<HierarchyTreeOptions> | Partial<HierarchyTreemapOptions> | { maxNodes?: number } }
  | { order?: never; options: Partial<GraphFixedOptions> | GraphCircularOptions | GraphForceOptions | FlowLayoutOptions });
export interface RemoveStoredResourceOptions { kind: StoredResourceKind; id: string; cascade?: boolean; }
export interface HierarchyNode {
  readonly key: string; readonly parentKey: string | null; readonly childrenKeys: readonly string[]; readonly depth: number;
  readonly ownValue: number; readonly totalValue: number; readonly residual: number; readonly sourceRows: readonly number[]; readonly synthetic?: true;
}
export interface HierarchyModel {
  readonly nodes: readonly HierarchyNode[]; readonly rootKey: string | null; readonly valueMode: HierarchyValueMode; readonly totalValue: number;
  readonly diagnostics: { readonly emptyHierarchy: boolean; readonly emptyValue: boolean; readonly ignoredInternalValues: readonly { readonly key: string; readonly value: number }[] };
}
export interface HierarchyResource {
  readonly kind: "hierarchy"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" }; readonly inputs: readonly Extract<InputRef, { readonly kind: "data" }>[];
  readonly options: Readonly<HierarchySource & { format: "flat" | "nested" | "groups"; maxNodes: number }>;
  readonly result: HierarchyModel; readonly provenance: { readonly origin: "observed"; readonly sourceRows: readonly InputRowRef[] };
}
export interface HierarchyRectangle { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number; }
export interface HierarchyTreeResult { readonly nodes: readonly { readonly key: string; readonly parentKey: string | null; readonly depth: number; readonly x: number; readonly y: number; readonly theta?: number; readonly radius?: number; readonly synthetic?: true }[]; }
export interface HierarchyPartitionResult extends Omit<HierarchyModel, "nodes"> { readonly nodes: readonly (HierarchyNode & { readonly u0: number; readonly u1: number; readonly residualStart: number })[]; }
export interface HierarchyTreemapResult extends Omit<HierarchyModel, "nodes"> { readonly nodes: readonly (HierarchyNode & { readonly rect: HierarchyRectangle; readonly content: HierarchyRectangle; readonly residualRect: HierarchyRectangle; readonly childOrder: readonly string[]; readonly area: number })[]; }
export type HierarchyLayoutResource = {
  readonly kind: "layout"; readonly id: string; readonly revision: number; readonly algorithmVersion: "1";
  readonly ownership: { readonly mode: "authored" }; readonly inputs: readonly { readonly kind: "hierarchy"; readonly id: string; readonly revision: number }[];
  readonly provenance: { readonly origin: "inferred"; readonly sourceRows: readonly InputRowRef[] };
} & ({ readonly options: { readonly method: "tree"; readonly order: HierarchyOrder; readonly options: Readonly<HierarchyTreeOptions> }; readonly result: HierarchyTreeResult }
  | { readonly options: { readonly method: "partition"; readonly order: HierarchyOrder; readonly options: { readonly maxNodes?: number } }; readonly result: HierarchyPartitionResult }
  | { readonly options: { readonly method: "treemap"; readonly order: HierarchyOrder; readonly options: Readonly<HierarchyTreemapOptions> }; readonly result: HierarchyTreemapResult });
export type HierarchyNodeTarget = { key: RowKeyScalar; path?: never } | { path: readonly (RowKeyScalar | null)[]; key?: never };
export interface HierarchyBodyPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; stroke?: string; strokeWidth?: number; opacity?: number; }
export interface HierarchyNodePaint extends HierarchyBodyPaint { radius?: number; }
export interface HierarchyLabelPaint { outline?: MarkOutline | false; shadow?: MarkShadow | false; fill?: FillPaint; fontSize?: number; fontFamily?: string; fontWeight?: string | number; }
export interface HierarchyLabelsOptions extends HierarchyLabelPaint {
  content?: "value"; offset?: readonly [number, number]; overrides?: readonly (HierarchyNodeTarget & HierarchyLabelPaint & { text?: string })[];
}
export interface TreePlotOptions {
  id?: string; layout?: string; origin?: "auto" | readonly [number, number]; clip?: boolean;
  nodes?: HierarchyNodePaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyNodePaint)[] };
  links?: false | { stroke?: string; strokeWidth?: number; opacity?: number; shadow?: MarkShadow | false }; labels?: false | HierarchyLabelsOptions;
}
export interface EditTreePlotOptions extends Omit<TreePlotOptions, "id"> { target?: string; }
export interface TreemapPlotOptions {
  id?: string; layout?: string; origin?: "auto" | readonly [number, number]; clip?: boolean;
  cells?: HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] }; labels?: false | HierarchyLabelsOptions;
}
export interface EditTreemapPlotOptions extends Omit<TreemapPlotOptions, "id"> { target?: string; }

export interface PartitionPlotOptions {
  id?: string; layout?: string; coordinate?: string; focus?: HierarchyNodeTarget | null;
  rootVisible?: boolean; prunedSelection?: "keep-hidden" | "drop";
  orientation?: "horizontal" | "vertical"; reverseU?: boolean; reverseV?: boolean;
  padding?: number | readonly [number, number]; innerRadius?: number; outerRadius?: number | "auto";
  startAngle?: number; sweep?: number; direction?: "clockwise" | "counterclockwise";
  radiusPolicy?: "equal-depth" | "equal-depth-area"; clip?: boolean;
  cells?: HierarchyBodyPaint & { overrides?: readonly (HierarchyNodeTarget & HierarchyBodyPaint)[] };
  labels?: false | (HierarchyLabelsOptions & { minWidth?: number; minArcLength?: number });
}
export interface EditPartitionPlotOptions extends Omit<PartitionPlotOptions, "id"> { target?: string; }
export interface PartitionViewState {
  readonly focusKey: string | null; readonly rootVisible: boolean; readonly prunedSelection: "keep-hidden" | "drop";
  readonly recovery?: { readonly previousFocusKey: string | null; readonly reason: "ancestor" | "root" | "empty" };
}

export interface SemanticDataset {
  readonly id: string;
  readonly logicalId?: string;
  readonly revision?: number;
  readonly allocationId?: string;
  readonly keySpec?: DataKeySpec;
  readonly rowKeys?: readonly string[];
  readonly nextGeneratedKey?: number;
  readonly lineage?: RowLineage;
  readonly sourceReceipt?: DataSourceReceipt;
  readonly schema: DatasetSchema;
  readonly values?: readonly Readonly<Record<string, unknown>>[];
  readonly source?: string;
  readonly transform?: readonly Readonly<Record<string, unknown>>[];
  readonly [key: string]: unknown;
}

export type DatasetStorageType =
  | "number"
  | "string"
  | "boolean"
  | "array"
  | "object"
  | "unknown"
  | "mixed";
export interface DatasetFieldLineage {
  readonly inputs: readonly Readonly<{ data: string; field: string }>[];
  readonly owner: string;
  readonly role: string;
}
export interface DatasetSchemaField {
  /** Lossless stored row key; empty names cannot be used as action field references. */
  readonly name: string;
  readonly storageType: DatasetStorageType;
  readonly nullable: boolean;
  readonly optional: boolean;
  readonly lineage?: DatasetFieldLineage;
}
export interface DatasetSchema {
  readonly version: 1;
  readonly completeness: "known" | "unknown";
  readonly origin: "declared" | "inferred" | "derived";
  readonly fields: readonly DatasetSchemaField[];
}
export interface SourceSchemaField {
  /** Exact source row key, including an empty string or whitespace. */
  name: string;
  storageType: Exclude<DatasetStorageType, "unknown" | "mixed">;
  nullable?: boolean;
  optional?: boolean;
}
export interface SourceSchemaInput {
  fields: readonly SourceSchemaField[];
}

export interface SemanticLayer {
  readonly id: string;
  readonly image?: ImageRef;
  readonly alt?: string;
  readonly partitionView?: PartitionViewState;
  readonly flowBinding?: { readonly layout: { readonly kind: "layout"; readonly id: string; readonly revision: number } };
  readonly flowLabels?: false | { readonly content: "key" | "value" | { readonly field: string }; readonly overrides: readonly { readonly key: string; readonly text: string }[] };
  readonly hierarchyBinding?: { readonly layout: { readonly kind: "layout"; readonly id: string; readonly revision: number } };
  readonly hierarchyLabels?: false | { readonly content: "value"; readonly overrides: readonly { readonly key: string; readonly text: string }[] };
  readonly graphBinding?: { readonly layout: { readonly kind: "layout"; readonly id: string; readonly revision: number } };
  readonly graphLabels?: false | { readonly field?: string; readonly overrides: readonly { readonly key: string; readonly text: string }[] };
  readonly data?: string;
  readonly source?: string;
  readonly coordinate?: string;
  readonly mark?: Readonly<{ type?: string; missing?: "error" | "break" | "skip"; blend?: "multiply" | "screen" | "difference"; [key: string]: unknown }>;
  readonly layout?: Readonly<{ mode?: ColorLayout }>;
  readonly derivedBindings?: Readonly<{ regression?: Readonly<{ mode: "follow"; roles: readonly ["data", "x", "y"] }>;
    overlay?: Readonly<{ source: string; basis: "visibleItems"; mode: "follow"; series: "source" | "total";
      missing: "break" | "connect"; orderBy?: "x" | "y"; inheritColor: boolean }> }>;
  readonly encoding?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly conditionals?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  readonly [key: string]: unknown;
}

export interface OverlayLineAppearance extends StrokeStyleDetails {
  clip?: boolean;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  curve?: CurveInterpolation;
  tension?: number;
  closed?: boolean;
}
export interface OverlayPointAppearance extends StrokeStyleDetails {
  clip?: boolean;
  shape?: PointShape;
  fill?: FillPaint;
  stroke?: FilledMarkStroke;
  strokeWidth?: number;
  opacity?: number;
}
export type CreateOverlayOptions = {
  id?: string;
  source?: string;
  basis?: "visibleItems";
  series?: "source" | "total";
  missing?: "break" | "connect";
  orderBy?: "x" | "y";
} & ({ type?: "line"; line?: OverlayLineAppearance; point?: never } |
  { type: "point"; point?: OverlayPointAppearance; line?: never });
export type EditOverlayOptions = { target?: string } & ({ follow: false; source?: never;
  series?: never; missing?: never; orderBy?: never } | { follow?: true; source?: string;
  series?: "source" | "total"; missing?: "break" | "connect"; orderBy?: "x" | "y" });

export interface SemanticScale {
  readonly id: string;
  readonly type?: ScaleType;
  readonly domain?: "auto" | readonly unknown[];
  readonly emptyDomain?: "preserve" | "require-explicit";
  readonly range?: ScaleRange;
  readonly [key: string]: unknown;
}

export interface SemanticCoordinate {
  readonly id: string;
  readonly type?: "cartesian" | "polar" | "parallel";
  readonly aspect?: CoordinateAspect;
  readonly polarFrame?: Exclude<PolarFrameOptions, "auto">;
  readonly layers?: readonly string[];
  readonly [key: string]: unknown;
}

export interface SemanticSpec {
  readonly resources: readonly (PersistentSelectionResource | ParameterResource | DataSourceResource | ImageResource | HierarchyResource | HierarchyLayoutResource | GraphResource | GraphLayoutResource | FontResource | FlowResource | FlowLayoutResource)[];
  readonly datasets: readonly SemanticDataset[];
  readonly layers: readonly SemanticLayer[];
  readonly scales: readonly SemanticScale[];
  readonly coordinates: readonly SemanticCoordinate[];
  readonly guides: Readonly<Record<string, unknown>>;
  readonly title: Readonly<Record<string, unknown>>;
}

export type GraphicLineageRef = {
  readonly data: string; readonly logicalDataId: string; readonly revision: number; readonly rowKeys: readonly string[];
} | { readonly kind: "resource"; readonly resource: { readonly kind: "image" | "hierarchy" | "layout"; readonly id: string; readonly revision: number } };

export interface GraphicIdentity {
  readonly key: string; readonly topology: string; readonly role: string; readonly lineage: GraphicLineageRef;
}

export interface GraphicItem {
  readonly identity?: GraphicIdentity;
  readonly id: string;
  readonly type?: Exclude<GraphicType, "canvas" | "collection">;
  readonly properties: Readonly<Record<string, unknown>>;
}

export interface GraphicClipRect {
  readonly x: number; readonly y: number; readonly width: number; readonly height: number;
}

export type PathFillRule = "nonzero" | "evenodd";
export interface GraphicClipPath {
  readonly type: "path";
  readonly commands: readonly ConcretePathCommand[];
  readonly fillRule?: PathFillRule;
}
export type GraphicClip = GraphicClipRect | GraphicClipPath;

export interface GraphicObject {
  /** Optional named non-Canvas owner clip in its unchanged parent frame. */
  readonly clip?: GraphicClip;
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
  /** Exact inner dimensions with automatic outer guide margins; false disables this mode. */
  plot?: { width: number; height: number } | false;
  /** Optional inner plot outline. Defaults off; an object replaces the complete style on edit. */
  plotBorder?: false | {
    /** Non-empty color string. Defaults to #ddd. */
    color?: string;
    /** Positive finite width smaller than both plot dimensions. Defaults to 1. */
    lineWidth?: number;
    /** Paint this border before ordinary marks. Defaults to false. */
    underlay?: boolean;
  };
}

export interface FitCanvasOptions {
  /** Exact inner plot mode: distribute spare outer space around visible content. */
  align?: "preserve" | "center";
  /** Minimum fitted margin on every Canvas edge. Defaults to 0. */
  padding?: number;
  /** Required final plot width. Defaults to 160. */
  minPlotWidth?: number;
  /** Required final plot height. Defaults to 120. */
  minPlotHeight?: number;
  /** Maximum binary-search probes per edge. Defaults to 32; maximum 64. */
  iterationLimit?: number;
  /** Reject an unsatisfied fit or preserve it with a structured overflow result. */
  overflow?: "error" | "report";
}

export type XAxisPosition = "bottom" | "top";
export type YAxisPosition = "left" | "right";
export type RotationUnit = "radians" | "degrees";
export type RotationInput = number | { value: number; unit: RotationUnit };
type ValueFormatDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type ValueFormatPrecision = ValueFormatDigit | 10 | 11 | 12 | `0${ValueFormatDigit}`;
type TimeAxisDirective = "Y" | "m" | "d" | "b" | "a" | "H" | "M" | "S" | "L";
export type NumericFormatString =
  | `.${ValueFormatPrecision}${"f" | "%" | "e"}`
  | ","
  | `,.${ValueFormatPrecision}f`;
export type UtcFormatString = `${string}%${TimeAxisDirective}${string}`;
export type ValueFormat = "auto" | NumericFormatString | UtcFormatString;
export type AxisFormatString = NumericFormatString | UtcFormatString;
export type AxisFormat =
  | "ticks"
  | ValueFormat
  | { decimals: number };
export type AxisValue = string | boolean | number;
export interface AxisLineStyleOptions {
  color?: string;
  lineWidth?: number;
}
export interface AxisTickStyleOptions extends AxisLineStyleOptions {
  length?: number;
}
export interface CartesianAxisTickStyleOptions extends AxisTickStyleOptions {
  strokeDash?: readonly number[];
  /** Typed raw-value overrides. Empty arrays and auto clear only the map. */
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Signed logical pixels along the axis: positive right for x, down for y. */
  alongOffset?: number;
}
export type CartesianGuideDashMap = ReadonlyArray<Readonly<{
  value: AxisValue;
  strokeDash: readonly number[];
}>>;
export interface AxisLabelStyleOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
  offset?: number;
  format?: AxisFormat;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export type CartesianAxisLabelColorMap = ReadonlyArray<Readonly<{
  value: DatasetScalar;
  color: string;
}>>;
export interface CartesianAxisLabelStyleOptions extends AxisLabelStyleOptions {
  /** Local text alignment before rotation; omitted edits retain existing intent. */
  align?: "left" | "center" | "right";
  /** Typed raw-tick color overrides; missing entries use color. Auto removes the map. */
  colorMap?: CartesianAxisLabelColorMap | "auto";
  /** Keep unrotated label bounds inside the mapped axis span; defaults to false. */
  flush?: boolean;
  /** Only flush mapped ticks within this non-negative distance of a range edge. Auto restores all-label containment. */
  flushThreshold?: number | "auto";
  /** Signed displacement from the mapped tick position, independent of outward offset. */
  alongOffset?: number;
}
export interface AxisLabelLayoutOptions {
  /** Legacy numbers are radians; structured values make radians or degrees explicit. */
  rotation?: RotationInput;
  /** Wrap each label to this measured width; false removes an existing wrap policy. */
  maxWidth?: number | false;
  /** Both modes keep grapheme clusters intact; hard breaks preserve line spacing. */
  wrap?: "word" | "character";
  lineHeight?: number;
  /** Defaults to error; allow stores an intentional label-label overlap policy. */
  overlap?: "error" | "allow";
}
export type AxisTickRounding = "ceiling" | "nearest";
export interface AxisTicksAndLabelsOptions<P extends string> {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
  ticks?: CartesianAxisTickStyleOptions;
  labels?: CartesianAxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
}
export type AxisTitleOffset = number | Readonly<{ from: "labels"; gap: number }>;
export interface AxisTitleOptions<P extends string> {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  /** Signed logical pixels: positive right for x, down for y, independent of scale reversal. */
  alongOffset?: number;
  align?: "left" | "center" | "right";
  /** Defaults to error; allow permits only this title to intersect its own axis labels. */
  overlap?: "error" | "allow";
  baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  /** Hard breaks retain ordered lines with the chosen block baseline, spaced at 1.2 times fontSize. */
  text?: string;
  scale?: string;
  position?: P;
  at?: "start" | "center" | "end" | number;
  /** Signed distance from the axis frame, or a nonnegative gap outside same-owner labels. */
  offset?: AxisTitleOffset;
  rotation?: RotationInput;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export interface CompleteAxisOptions<P extends string> {
  /** Paint the complete Cartesian axis before ordinary marks. Defaults to false. */
  underlay?: boolean;
  /** Omission retains the canonical x/y identity. */
  id?: string;
  /** Non-negative outward displacement of the complete axis frame in logical pixels. */
  offset?: number;
  scale?: string;
  coordinate?: string;
  position?: P;
  line?: false | AxisLineStyleOptions;
  ticksAndLabels?: false | Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position" | "target">;
  title?: false | Omit<AxisTitleOptions<P>, "scale" | "position" | "target">;
}
export type NamedCompleteAxis<P extends string> = CompleteAxisOptions<P> & { id: string };
export interface CreateAxesOptions {
  coordinate?: {
    id?: string;
    type?: "auto" | "cartesian" | "polar" | "parallel";
  };
  x?: false | CompleteAxisOptions<XAxisPosition> | readonly [NamedCompleteAxis<XAxisPosition>, ...NamedCompleteAxis<XAxisPosition>[]];
  y?: false | CompleteAxisOptions<YAxisPosition> | readonly [NamedCompleteAxis<YAxisPosition>, ...NamedCompleteAxis<YAxisPosition>[]];
  theta?: false | CompletePolarAxisOptions;
  radius?: false | CompleteRadialAxisOptions;
}
export interface AxisTickOptions<P extends string>
  extends CartesianAxisTickStyleOptions {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
}
/** Cartesian label maps use typed category values or finite numeric/timestamp keys on continuous scales. Empty mapped labels are omitted without removing ticks. */
export interface AxisLabelOptions<P extends string>
  extends CartesianAxisLabelStyleOptions, AxisLabelLayoutOptions, DisplayLabelOptions {
  /** Axis resource identity; omission prefers canonical, then a unique named owner. */
  target?: string;
  scale?: string;
  position?: P;
  count?: number;
  rounding?: AxisTickRounding;
  values?: readonly AxisValue[];
}

export type ParallelAxisTickSelection =
  | { count?: number; values?: never }
  | { values: readonly AxisValue[]; count?: never };
export type ParallelAxisTicksOptions = AxisTickStyleOptions & ParallelAxisTickSelection;
export type ParallelAxisLabelsOptions = AxisLabelStyleOptions & DisplayLabelOptions & ParallelAxisTickSelection;
export interface ParallelAxisTitleOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
  text?: string;
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}
export type ParallelAxisComponentsOptions = {
  field: string;
  target?: string;
  line?: false | AxisLineStyleOptions;
  title?: false | ParallelAxisTitleOptions;
} & (
  | { ticksAndLabels?: false | (ParallelAxisTickSelection & {
      ticks?: AxisTickStyleOptions; labels?: AxisLabelStyleOptions & DisplayLabelOptions;
    }); ticks?: never; labels?: never }
  | { ticks?: false | ParallelAxisTicksOptions; labels?: false | ParallelAxisLabelsOptions;
      ticksAndLabels?: never }
);
export type CreateParallelAxisOptions = ParallelAxisComponentsOptions;
export type EditParallelAxisOptions = GuideVisibilityOptions & { field: string; target?: string;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  title?: false | VisibleGuide<ParallelAxisTitleOptions>;
} & (
  | { ticksAndLabels?: false | (ParallelAxisTickSelection & {
      ticks?: VisibleGuide<AxisTickStyleOptions>; labels?: VisibleGuide<AxisLabelStyleOptions & DisplayLabelOptions>;
    }); ticks?: never; labels?: never }
  | { ticks?: false | VisibleGuide<ParallelAxisTicksOptions>; labels?: false | VisibleGuide<ParallelAxisLabelsOptions>; ticksAndLabels?: never }
);
export interface ParallelAxesOptions { target?: string; coordinate?: string; }
export interface RemoveParallelAxisOptions { field: string; target?: string; }

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
export type ThetaAxisLabelOptions = PolarLabelOptions & DisplayLabelOptions;
export interface ThetaTicksAndLabelsOptions
  extends Omit<PolarTicksAndLabelsOptions, "labels"> {
  labels?: AxisLabelStyleOptions & DisplayLabelOptions;
}
export interface PolarTitleOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
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
export type PolarAxisTickSelection =
  | { count?: number; values?: never }
  | { values: readonly AxisValue[]; count?: never };
export type CreateThetaAxisLineOptions = AxisLineStyleOptions &
  Omit<PolarGuideResourceOptions, "angle">;
export type CreateRadialAxisLineOptions = AxisLineStyleOptions & PolarGuideResourceOptions;
export type CreateThetaAxisTicksOptions = Omit<PolarTickOptions, "count" | "values"> &
  PolarAxisTickSelection & Omit<PolarGuideResourceOptions, "angle">;
export type CreateRadialAxisTicksOptions = Omit<PolarTickOptions, "count" | "values"> &
  PolarAxisTickSelection & PolarGuideResourceOptions;
export type CreateThetaAxisLabelsOptions = Omit<PolarLabelOptions, "count" | "values"> &
  PolarAxisTickSelection & Omit<PolarGuideResourceOptions, "angle"> &
  DisplayLabelOptions;
export type CreateRadialAxisLabelsOptions = Omit<PolarLabelOptions, "count" | "values"> &
  PolarAxisTickSelection & PolarGuideResourceOptions;
export type CreateThetaAxisTitleOptions = PolarTitleOptions &
  Omit<PolarGuideResourceOptions, "angle">;
export type CreateRadialAxisTitleOptions = RadialTitleOptions & PolarGuideResourceOptions;
export interface CompletePolarAxisOptions extends Omit<PolarGuideResourceOptions, "angle"> {
  line?: false | AxisLineStyleOptions;
  ticksAndLabels?: false | PolarTicksAndLabelsOptions;
  title?: false | PolarTitleOptions;
}
export interface CompleteThetaAxisOptions
  extends Omit<CompletePolarAxisOptions, "ticksAndLabels"> {
  ticksAndLabels?: false | ThetaTicksAndLabelsOptions;
}
export interface CompleteRadialAxisOptions
  extends Omit<CompletePolarAxisOptions, "title"> {
  angle?: number;
  title?: false | RadialTitleOptions;
}
export interface EditPolarAxisOptions {
  visible?: boolean;
  angle?: number;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  ticks?: false | VisibleGuide<PolarTickOptions>;
  labels?: false | VisibleGuide<PolarLabelOptions>;
  ticksAndLabels?: false | VisibleTickGroup<PolarTicksAndLabelsOptions>;
  title?: false | VisibleGuide<PolarTitleOptions>;
}
export interface EditThetaAxisOptions
  extends Omit<EditPolarAxisOptions, "angle" | "labels" | "ticksAndLabels"> {
  labels?: false | VisibleGuide<ThetaAxisLabelOptions>;
  ticksAndLabels?: false | VisibleTickGroup<ThetaTicksAndLabelsOptions>;
}
export interface EditRadialAxisOptions
  extends Omit<EditPolarAxisOptions, "title"> {
  title?: false | VisibleGuide<RadialTitleOptions>;
}

export interface GridDirectionOptions {
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Signed logical pixels along the scale: vertical lines right, horizontal lines down. */
  alongOffset?: number;
  /** Grid draw order relative to marks at zero: positive above, nonpositive behind. */
  zIndex?: number;
  /** Band centers by default; boundary draws both edges of each selected band. */
  bandPosition?: "center" | "boundary";
  scale?: string;
  coordinate?: string;
  count?: number;
  values?: readonly CategoryValue[];
  color?: string;
  lineWidth?: number;
  strokeDash?: readonly number[];
}
export interface EditGridOptions {
  visible?: boolean;
  strokeDashMap?: CartesianGuideDashMap | "auto";
  /** Absolute signed logical-pixel displacement; omission preserves the current value. */
  alongOffset?: number;
  /** Preserve omitted order; finite values sort Cartesian grids relative to marks at zero. */
  zIndex?: number;
  /** Band centers by default; boundary draws both edges of each selected band. */
  bandPosition?: "center" | "boundary";
  count?: number;
  values?: readonly CategoryValue[] | "auto";
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
  visible?: boolean;
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

type CartesianAxesOptions = Omit<
  CreateAxesOptions,
  "coordinate" | "theta" | "radius"
> & {
  coordinate?: { id?: string; type?: "auto" | "cartesian" };
};
type CAxisTicks<P extends string> = Omit<AxisTicksAndLabelsOptions<P>, "labels"> & {
  labels?: CartesianAxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
};
type CAxis<P extends string> = Omit<CompleteAxisOptions<P>, "ticksAndLabels"> & {
  ticksAndLabels?: false | Omit<CAxisTicks<P>, "scale" | "position" | "target">;
};
type CAxes = Omit<CartesianAxesOptions, "x" | "y"> & {
  x?: false | CAxis<XAxisPosition> | readonly [CAxis<XAxisPosition> & { id: string }, ...(CAxis<XAxisPosition> & { id: string })[]];
  y?: false | CAxis<YAxisPosition> | readonly [CAxis<YAxisPosition> & { id: string }, ...(CAxis<YAxisPosition> & { id: string })[]];
};
type CartesianGridOptions = Pick<CreateGridOptions, "horizontal" | "vertical">;
type FilledLegendSymbolRecipe = "auto"
  | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
  | { layers: readonly LegendSymbolLayer[] };
type FilledMarkLegendOptions = Omit<LegendOptions, "symbol" | "representation" | "combine"> & (
  | { combine?: "separate" | "size-shape"; representation?: "gradient"; symbol?: FilledLegendSymbolRecipe }
  | { combine?: "separate" | "size-shape"; representation: "symbols"; symbol?: "auto" | { type?: "point"; radius?: number; stroke?: string; strokeWidth?: number } }
  | { combine: "color-size-shape"; representation?: never; symbol?: "auto" | { type?: "point"; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } }
  | { combine: "color-size"; representation?: never; symbol?: "auto" | { type?: "point"; stroke?: string; strokeWidth?: number; opacity?: number } }
);
type DistributiveLegendOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type SeparateFilledLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "combine"> & { combine?: "separate" };
type CategoricalPointLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "representation">;
type CategoricalLegendTextOptions = {
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  format?: "auto";
};
type PathLegendOptions = Omit<
  LegendOptions,
  "symbol" | "gradient" | "count" | "values" | "labels" | "representation" | "combine" | "titlePosition"
> & {
  titlePosition?: "top" | "left";
  combine?: "separate";
  symbol?: "auto" | { length?: number; lineWidth?: number }
    | { layers: readonly LegendSymbolLayer[] };
  labels?: CategoricalLegendTextOptions;
};
type CartesianGuideOptions = {
  axes?: false | CartesianAxesOptions;
  grid?: false | CartesianGridOptions;
  legend?: false | (DistributiveLegendOmit<FilledMarkLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
// These constructors map hue through color, so their combined legend cannot
// override fill. Scatter and direct legend actions also support mapped stroke.
type ColorMappedPointLegendOptions =
  | Exclude<FilledMarkLegendOptions, { combine: "color-size-shape" }>
  | (Omit<Extract<FilledMarkLegendOptions, { combine: "color-size-shape" }>, "symbol"> & {
      symbol?: "auto" | { type?: "point"; stroke?: string; strokeWidth?: number; opacity?: number };
    });
type ColorMappedPointGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (DistributiveLegendOmit<ColorMappedPointLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
type CartesianPathGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};
type CartesianSeparateGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (DistributiveLegendOmit<SeparateFilledLegendOptions, "order"> & { order?: CartesianLegendOrder });
};
type CartesianCategoricalPointGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<CategoricalPointLegendOptions, "count" | "values" | "gradient" | "labels" | "order" | "symbol" | "titlePosition"> & {
    titlePosition?: "top" | "left";
    symbol?: FilledLegendSymbolRecipe; labels?: CategoricalLegendTextOptions; order?: CartesianLegendOrder;
  });
};
type CartesianCategoricalGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (Omit<
    SeparateFilledLegendOptions,
    "count" | "values" | "gradient" | "labels" | "order" | "representation" | "symbol" | "titlePosition"
  > & {
    titlePosition?: "top" | "left";
    symbol?: FilledLegendSymbolRecipe;
    labels?: CategoricalLegendTextOptions;
    order?: CartesianLegendOrder;
  });
};
type CPathGuides = Omit<CartesianPathGuideOptions, "axes"> & {
  axes?: false | CAxes;
};
type CCategoricalGuides = Omit<CartesianCategoricalGuideOptions, "axes"> & {
  axes?: false | CAxes;
};
type ColorGuides = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | (DistributiveLegendOmit<SeparateFilledLegendOptions, "order"> & {
    order?: CartesianLegendOrder;
  });
};
type BoxPlotGuideOptions = Omit<CartesianGuideOptions, "legend"> & { legend?: false };
type GradientPlotDensityLegendOptions = {
  title?: string;
  position?: "right";
};
type GradientPlotGuideOptions = Omit<CartesianGuideOptions, "legend"> & {
  legend?: false | GradientPlotDensityLegendOptions;
};
type ParallelGuideOptions = {
  axes?: false | {
    coordinate?: { id?: string; type?: "auto" | "parallel" };
  };
  grid?: false;
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};

export interface CreateCoordinateOptions {
  id?: string;
  type?: "cartesian" | "polar" | "parallel";
  layers?: readonly string[];
}

export type CoordinateAspectAlign = "start" | "center" | "end";
export type CoordinateAspect = "auto" | {
  mode: "frame" | "data";
  ratio: number;
  alignX?: CoordinateAspectAlign;
  alignY?: CoordinateAspectAlign;
};

export type PolarFrameCenter = {
  x: number;
  y: number;
};
export type PolarFrameRadius =
  | { unit: "fraction"; value: number }
  | { unit: "px"; value: number };
export type ArcInnerRadius = number | { unit: "px"; value: number };
export type PolarFrameOptions = "auto" | {
  center?: PolarFrameCenter;
  radius?: PolarFrameRadius;
  overflow?: "error" | "allow";
};

type EditCoordinateTarget = {
  target: string;
};
export type EditCoordinateOptions = EditCoordinateTarget & (
  | { aspect: CoordinateAspect; polarFrame?: PolarFrameOptions }
  | { aspect?: CoordinateAspect; polarFrame: PolarFrameOptions }
);

export type RadialMapping = "area" | "radius-length";

/** Automatic linear position-domain rounding density, not a guide tick count. */
export interface LinearNiceCountOptions {
  readonly count: number;
}

export interface ScaleOptions {
  radialMapping?: RadialMapping;
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  emptyDomain?: "preserve" | "require-explicit";
  range?: ScaleRange;
  nice?: boolean | LinearNiceCountOptions;
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
  whitePoint?: "d65" | "d50";
  /** Finite Cubehelix lightness gamma, including zero and negative values. Defaults to 1. */
  gamma?: number;
  midpoint?: number | "auto";
  unknown?: unknown;
}

export type QuantitativePositionScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog";
type ScaleFields<Keys extends keyof ScaleOptions> = Pick<ScaleOptions, Keys>;
export type NonPointQuantitativePositionScaleOptions = ScaleFields<
  "id" | "zero" | "clamp" | "reverse" |
  "base" | "exponent" | "constant"
> & {
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
} & (
  | { type?: "linear"; nice?: boolean | LinearNiceCountOptions }
  | { type: Exclude<QuantitativePositionScaleType, "linear">; nice?: boolean }
);
export type QuantitativePositionScaleOptions =
  NonPointQuantitativePositionScaleOptions & { unknown?: number };
export type ZeroSupportingPositionScaleType =
  | "linear" | "pow" | "sqrt" | "symlog";
export type NonPointZeroSupportingPositionScaleOptions = Omit<
  NonPointQuantitativePositionScaleOptions,
  "base" | "type" | "nice"
> & (
  | { type?: "linear"; nice?: boolean | LinearNiceCountOptions }
  | { type: Exclude<ZeroSupportingPositionScaleType, "linear">; nice?: boolean }
);
export type NonPointTemporalPositionScaleOptions = ScaleFields<
  "id" | "clamp" | "reverse"
> & {
  type?: "time";
  nice?: boolean;
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
};
export type TemporalPositionScaleOptions =
  NonPointTemporalPositionScaleOptions & { unknown?: number };
export type NonPointBandPositionScaleOptions = ScaleFields<
  "id" | "reverse" | "paddingInner" | "paddingOuter" | "align"
> & {
  type?: "band";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
};
export type BandPositionScaleOptions =
  NonPointBandPositionScaleOptions & { unknown?: number };
export type NonPointPointPositionScaleOptions = ScaleFields<
  "id" | "reverse" | "padding" | "align"
> & {
  type?: "point";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly [number, number];
};
export type PointPositionScaleOptions =
  NonPointPointPositionScaleOptions & { unknown?: number };
export type CategoricalPositionScaleOptions =
  | BandPositionScaleOptions
  | PointPositionScaleOptions;
export type NonPointCategoricalPositionScaleOptions =
  | NonPointBandPositionScaleOptions
  | NonPointPointPositionScaleOptions;
type WithoutScaleId<T> = T extends unknown ? Omit<T, "id"> : never;
export type NonPointCategoricalColorScaleOptions = ScaleFields<"id" | "palette"> & {
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly string[] | { readonly palette: Palette };
};
export type CategoricalColorScaleOptions =
  NonPointCategoricalColorScaleOptions & { unknown?: string };
type SizeScaleCommonOptions = ScaleFields<"id" | "reverse"> & {
  unknown?: number;
};
type ContinuousSizeScaleOptions = SizeScaleCommonOptions &
  ScaleFields<"clamp"> & {
    domain?: "auto" | readonly [number, number];
    range?: "auto" | readonly [number, number];
  };
export type CategoricalSizeScaleOptions = SizeScaleCommonOptions & {
  type?: "ordinal";
  domain?: "auto" | readonly (string | number | boolean)[];
  range?: "auto" | readonly [number, ...number[]];
  clamp?: never;
  base?: never;
  exponent?: never;
};
export type SizeScaleOptions =
  | (ContinuousSizeScaleOptions & {
      type?: "linear";
      base?: never;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "log";
      base?: number;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "sqrt";
      base?: never;
      exponent?: never;
    })
  | (ContinuousSizeScaleOptions & {
      type: "pow";
      exponent: number;
      base?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "quantize";
      domain?: "auto" | readonly [number, number];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "quantile";
      domain?: "auto" | readonly [number, ...number[]];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    })
  | (SizeScaleCommonOptions & {
      type: "threshold";
      domain: readonly [number, ...number[]];
      range: readonly [number, number, ...number[]];
      clamp?: never;
      base?: never;
      exponent?: never;
    });
export type ShapeScaleOptions = ScaleFields<"id"> & {
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  /** One entry per domain value; explicit repeated shapes are allowed. Auto uses distinct shapes. */
  range?: "auto" | readonly PointShape[];
  unknown?: PointShape;
};

export type CreateScaleOptions = ScaleOptions & { id: string };

export interface EditScaleOptions {
  radialMapping?: RadialMapping;
  id?: string;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  emptyDomain?: "preserve" | "require-explicit";
  range?: ScaleRange;
  nice?: boolean | LinearNiceCountOptions;
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
  whitePoint?: "d65" | "d50" | "auto";
  /** Finite Cubehelix lightness gamma; auto restores 1. */
  gamma?: number | "auto";
  midpoint?: number | "auto";
  unknown?: unknown;
}

type FocusedScaleSelection = { id?: string; target?: string };
export type EditXScaleOptions = FocusedScaleSelection & WithoutScaleId<
  QuantitativePositionScaleOptions | TemporalPositionScaleOptions | CategoricalPositionScaleOptions
>;
export type EditYScaleOptions = EditXScaleOptions;
export type OffsetScaleEditPatch = Pick<
  ScaleOptions,
  "domain" | "reverse" | "padding" | "paddingInner" | "paddingOuter" | "align"
>;
export type EditXOffsetScaleOptions = { target: string } & OffsetScaleEditPatch;
export type EditYOffsetScaleOptions = EditXOffsetScaleOptions;
export type EditParallelScaleOptions = {
  target: string;
  dimension: string;
} & WithoutScaleId<
  QuantitativePositionScaleOptions | CategoricalPositionScaleOptions
>;
export type EditThetaScaleOptions = FocusedScaleSelection & WithoutScaleId<ThetaScaleOptions>;
export type EditRScaleOptions = FocusedScaleSelection & WithoutScaleId<RadiusScaleOptions> & {
  radialMapping?: RadialMapping;
};
export type EditColorScaleOptions = FocusedScaleSelection & WithoutScaleId<
  CategoricalColorScaleOptions | Omit<ContinuousColorScaleOptions, "whitePoint" | "gamma"> | DiscretizedColorScaleOptions
> & { whitePoint?: "d65" | "d50" | "auto"; gamma?: number | "auto" };
type WithoutScaleSelection<T> = T extends unknown ? Omit<T, "id" | "target"> : never;
export type EditStrokeScaleOptions = { target: string } & WithoutScaleSelection<EditColorScaleOptions>;
type ExistingSizeScaleEditPatch = {
  type?: never;
  domain?: "auto" | readonly [string | number | boolean, ...(string | number | boolean)[]];
  range?: "auto" | readonly [number, ...number[]];
  unknown?: number;
  clamp?: boolean;
  reverse?: boolean;
  base?: number;
  exponent?: number;
};
type SizeScaleTypeEditPatch =
  | (WithoutScaleId<CategoricalSizeScaleOptions> & { type: "ordinal" })
  | (Omit<WithoutScaleId<SizeScaleOptions>, "type"> & { type?: "linear" })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "log" }>, "type"> & {
      type: "log";
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "sqrt" }>, "type"> & {
      type: "sqrt";
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "pow" }>, "type" | "exponent"> & {
      type: "pow";
      exponent?: number;
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "quantize" }>, "type" | "range"> & {
      type: "quantize";
      range?: readonly [number, number, ...number[]];
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "quantile" }>, "type" | "range"> & {
      type: "quantile";
      range?: readonly [number, number, ...number[]];
    })
  | (Omit<Extract<WithoutScaleId<SizeScaleOptions>, { type: "threshold" }>, "type" | "domain" | "range"> & {
      type: "threshold";
      domain?: readonly [number, ...number[]];
      range?: readonly [number, number, ...number[]];
    });
export type EditSizeScaleOptions = FocusedScaleSelection &
  (ExistingSizeScaleEditPatch | SizeScaleTypeEditPatch);
export type EditOpacityScaleOptions = FocusedScaleSelection & WithoutScaleId<OpacityScaleOptions>;
export type EditShapeScaleOptions = FocusedScaleSelection & WithoutScaleId<ShapeScaleOptions>;
export type EditStrokeWidthScaleOptions = FocusedScaleSelection & WithoutScaleId<StrokeWidthScaleOptions>;
export type EditStrokeDashScaleOptions = FocusedScaleSelection &
  Omit<WithoutScaleId<DashScaleOptions>, "unknown"> & { unknown?: DashStyle | DashPattern | undefined };

interface PositionEncodingBase {
  field: string;
  target?: string;
  coordinate?: string;
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

type PositionScaleBranches<Quantitative, Temporal, Categorical> =
  | {
      fieldType?: "quantitative";
      aggregate?: never;
      scale?: Quantitative;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      scale?: Temporal;
    }
  | {
      fieldType: "nominal" | "ordinal";
      aggregate?: never;
      scale?: Categorical;
    }
  | {
      fieldType?: FieldType;
      aggregate: AggregateOperation;
      scale?: Quantitative;
    };

export type PositionEncodingOptions = PositionEncodingBase & PositionScaleBranches<
  QuantitativePositionScaleOptions,
  TemporalPositionScaleOptions,
  CategoricalPositionScaleOptions
>;

export type YPositionEncodingOptions =
  PositionEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "bin" | "stack"> & { stack?: YStackMode } : never
    : never;

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
}

export type ThetaEncodingOptions = {
  target?: string;
  scale?: ThetaScaleOptions;
  coordinate?: string;
} & (
  /** Arc quantitative fields are sector weights; categorical fields support count or sum. */
  | { field: string; datum?: never; aggregate?: "count" | "sum"; weight?: string }
  /** Constant polar angles are supported by Point marks. */
  | { field?: never; datum: unknown; aggregate?: never; weight?: never }
) & (
  | { fieldType?: Exclude<FieldType, "temporal">; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
);

export type MeasuredRadiusScaleOptions = Pick<RadiusScaleOptions, "id" | "domain" | "range" | "clamp"> & {
  type?: "linear";
  zero?: true;
  nice?: false;
  reverse?: false;
};

export type RadialEncodingOptions = {
  target?: string;
  fieldType?: "quantitative";
  coordinate?: string;
} & (
  | { field: string; datum?: never; mapping?: false; aggregate?: never; scale?: RadiusScaleOptions }
  /** Constant polar distances are supported by Point marks. */
  | { field?: never; datum: number; mapping?: never; aggregate?: never; scale?: RadiusScaleOptions }
  | { field: string; mapping?: never; aggregate: "sum"; scale?: RadiusScaleOptions }
  | { field?: never; mapping?: never; aggregate: "count"; scale?: RadiusScaleOptions }
  | { field: string; mapping?: RadialMapping; aggregate: "sum"; scale?: MeasuredRadiusScaleOptions }
  | { field?: never; mapping?: RadialMapping; aggregate: "count"; scale?: MeasuredRadiusScaleOptions }
);

type RulePositionValue =
  | { field: string; datum?: never }
  | { field?: never; datum: unknown };

type RulePositionEncodingBase = RulePositionValue & {
  target?: string;
  coordinate?: string;
};

type InferredRuleDatumPositionEncodingOptions = {
  field?: never;
  datum: unknown;
  target?: string;
  coordinate?: string;
  fieldType?: undefined;
  scale?:
    | NonPointQuantitativePositionScaleOptions
    | NonPointCategoricalPositionScaleOptions;
};

export type DatumPositionEncodingOptions =
  | InferredRuleDatumPositionEncodingOptions
  | RulePositionEncodingBase & (
    | {
        fieldType: "quantitative";
        scale?: NonPointQuantitativePositionScaleOptions;
      }
    | {
        fieldType: "temporal";
        temporalUnit?: TemporalInputUnit;
        scale?: NonPointTemporalPositionScaleOptions;
      }
    | {
        fieldType: "nominal" | "ordinal";
        scale?: NonPointCategoricalPositionScaleOptions;
      }
    );

/** Constant primary position accepted by Rule, Rect, Area, Point, Tick, and independent Text policies. */
export type RulePositionEncodingOptions = DatumPositionEncodingOptions;

type TemporalBindingBranch =
  | { fieldType?: "quantitative"; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit };

type SecondaryRulePositionEncodingOptions = RulePositionEncodingBase & {
  scale?: { id?: string };
} & (
  | { fieldType: Exclude<FieldType, "temporal">; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
);

export type SecondaryPositionEncodingOptions =
  | SecondaryRulePositionEncodingOptions
  | { datum: unknown; field?: never; fieldType?: "quantitative"; target?: string; scale?: { id?: string }; coordinate?: string }
  | ({ field: string; datum?: never; target?: string; scale?: { id?: string }; coordinate?: string } & TemporalBindingBranch);

type QuantitativeRangePositionEncodingOptions = {
  lower: string | { datum: number };
  upper: string | { datum: number };
  target?: string;
  coordinate?: string;
  fieldType?: "quantitative";
  temporalUnit?: never;
  scale?: NonPointQuantitativePositionScaleOptions;
};

type RangePositionEncodingOptions = QuantitativeRangePositionEncodingOptions | {
  lower: string;
  upper: string;
  target?: string;
  coordinate?: string;
  fieldType: "temporal";
  temporalUnit?: TemporalInputUnit;
  scale?: NonPointTemporalPositionScaleOptions;
};

export type HistogramEncodingOptions = {
  field: string;
  target?: string;
  coordinate?: string;
  stack?: StackMode;
  xScale?: NonPointQuantitativePositionScaleOptions;
  yScale?: NonPointZeroSupportingPositionScaleOptions;
  weight?: StatisticalWeight;
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
  scale?: CategoricalColorScaleOptions;
  palette?: Palette;
  /** Aggregate bars default to overlay for their category field, otherwise group;
   * existing groups and stored or explicit layouts take precedence. */
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
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  as?: readonly [string, string];
}

type DensityEncodingBase = Omit<DensityDataOptions, "id" | "groupBy"> & {
  groupBy?: string | false;
  target?: string;
  densityChannel?: "x" | "y";
  coordinate?: string;
  valueScale?: NonPointQuantitativePositionScaleOptions;
};

export type DensityEncodingOptions = DensityEncodingBase & (
  | {
      placement?: BaselineDensityPlacement;
      densityScale?: NonPointZeroSupportingPositionScaleOptions;
    }
  | {
      placement: CategoryDensityPlacement;
      densityScale?: never;
    }
);

export type HorizonXEncoding = { field: string } & (
  | {
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | {
      fieldType?: undefined;
      scale?:
        | NonPointQuantitativePositionScaleOptions
        | NonPointTemporalPositionScaleOptions;
    }
);

export type HorizonYScaleOptions = ScaleFields<"id" | "clamp" | "reverse"> & {
  type?: "linear";
  domain?: readonly [0, 1];
  range?: "auto" | readonly [number, number];
};

export interface HorizonYEncoding {
  field: string;
  fieldType?: "quantitative";
  scale?: HorizonYScaleOptions;
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
  groupBy?: string | false;
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
  method?: MeanConfidenceIntervalMethod;
  level?: number;
  missing?: "error" | "drop";
  as?: IntervalOutputFields;
}

export interface WindowDataOptions {
  id: string;
  source?: string;
  partitionBy?: string | readonly string[];
  sortBy?: readonly WindowSort[];
  operations: readonly WindowOperation[];
  temporalUnit?: TemporalInputUnit;
}

export interface ECDFDataOptions {
  id: string;
  source?: string;
  field: string;
  groupBy?: string | readonly [string, ...string[]];
  weight?: string;
  missing?: "drop" | "error";
  as?: ECDFOutputFields;
}

type TimeUnitDataBaseOptions = {
  /** Preserve null or absent inputs as null buckets; defaults to strict errors. */
  missing?: "error" | "null";
  id: string;
  source?: string;
  field: string;
  temporalUnit?: TemporalInputUnit;
  /** Defaults to `${field}_${unit}`; collisions are rejected. */
  as?: string;
  timeZone?: string;
};
export type TimeUnitDataOptions = TimeUnitDataBaseOptions & (
  | {
      unit: Exclude<TimeUnit, "week">;
      weekStartsOn?: never;
      weekRule?: never;
    }
  | {
      unit: "week";
      weekRule?: "calendar";
      weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    }
  | {
      unit: "week";
      weekRule: "iso";
      weekStartsOn?: 1;
    }
);

export interface BinDataOutputFields {
  lower?: string;
  upper?: string;
  count?: string;
  members?: string;
}
type BinDataMode =
  | { maxBins?: number; step?: never; boundaries?: never }
  | { maxBins?: never; step: number; boundaries?: never }
  | {
      maxBins?: never;
      step?: never;
      boundaries: readonly [number, number, ...number[]];
    };
export type BinDataOptions = {
  id: string;
  source?: string;
  field: string;
  extent?: "auto" | readonly [number, number];
  nice?: boolean;
  zero?: boolean;
  includeEmpty?: boolean;
  members?: boolean;
  weight?: StatisticalWeight;
  missing?: "error" | "drop";
  as?: BinDataOutputFields;
} & BinDataMode;

export interface FoldDataOutputFields {
  key?: string;
  value?: string;
}
export interface FlattenDataOptions {
  id: string;
  source?: string;
  fields: readonly string[];
  as?: readonly string[];
}
export interface LookupDataOptions {
  id: string;
  source?: string;
  field: string;
  lookup: { data: string; key: string; fields: readonly string[]; as?: readonly string[] };
}
export interface FoldDataOptions {
  id: string;
  source?: string;
  fields: readonly string[];
  as?: FoldDataOutputFields;
}
export interface ComputedDataOptions {
  id: string;
  source?: string;
  as: string;
  expression: ComputedExpression;
}
type NormalizedDataBaseOptions = {
  id: string;
  source?: string;
  field: string;
  as: string;
  groupBy?: string | readonly string[];
};
type NormalizeBaselineOptions =
  | {
      baseline?: { position: "first" | "last" };
      sortBy: readonly [WindowSort, ...WindowSort[]];
    }
  | {
      baseline: { value: number };
      sortBy?: readonly WindowSort[];
    };
export type NormalizedDataOptions = NormalizedDataBaseOptions & (
  | {
      method: "share" | "minmax";
      zeroDenominator?: NormalizeZeroDenominator;
    }
  | {
      method: "zscore";
      variance?: "population" | "sample";
      zeroDenominator?: NormalizeZeroDenominator;
    }
  | ({
      method: "index" | "percentChange";
      zeroDenominator?: NormalizeZeroDenominator;
    } & NormalizeBaselineOptions)
  | ({ method: "change" } & NormalizeBaselineOptions)
);
type CompleteDataBaseOptions = {
  id: string;
  source?: string;
  key: string;
  groupBy?: string | readonly string[];
  fill?: Readonly<Record<string, DatasetScalar>>;
  members?: string;
};
export type CompleteDataOptions = CompleteDataBaseOptions & (
  | { values: readonly [DatasetScalar, ...DatasetScalar[]]; sequence?: never; calendar?: never }
  | {
      values?: never;
      sequence: { start: number; end: number; step: number };
      calendar?: never;
    }
  | { calendar: CalendarDayDomain; values?: never; sequence?: never }
  | { values?: never; sequence?: never; calendar?: never }
);
type ImputedDataBaseOptions = {
  id: string;
  source?: string;
  fields: string | readonly [string, ...string[]];
  groupBy?: string | readonly string[];
  edges?: "keep" | "error";
  maxGap?: number;
};
export type ImputedDataOptions = ImputedDataBaseOptions & (
  | { method?: "mean"; value?: never; sortBy?: readonly WindowSort[]; }
  | {
      method: "constant";
      value: DatasetScalar;
      sortBy?: readonly WindowSort[];
    }
  | {
      method: "forward" | "backward";
      value?: never;
      sortBy: readonly [WindowSort, ...WindowSort[]];
    }
  | {
      method: "linear";
      value?: never;
      sortBy: readonly [{ field: string; order?: "ascending" }];
    }
);
export interface StackDataOptions {
  id?: string;
  source?: string;
  category: string;
  group: string;
  value: string;
  mode?: StackDataMode;
  as?: StackDataOutputFields;
}

export interface Bin2DDataOptions {
  id: string;
  source?: string;
  x: string;
  y: string;
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  assignment?: "edges" | "step";
  includeEmpty?: boolean;
  members?: boolean;
  as?: Bin2DOutputFields;
}

export interface EditBin2DDataOptions {
  target?: string;
  source?: string;
  x?: string;
  y?: string;
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  assignment?: "edges" | "step";
  includeEmpty?: boolean;
  members?: boolean;
  as?: DatasetBin2DOutputFields;
  dependents?: DerivedDataDependents;
}

type FocusedDerivedDataPatch<T> = T extends unknown
  ? Partial<Omit<T, "id" | "source">>
  : never;
type FocusedDerivedDataEdit<T> = {
  target: string;
  dependents?: DerivedDataDependents;
} & FocusedDerivedDataPatch<T>;
type FocusedWeightedDerivedDataEdit<T, Weight> = {
  target: string;
  dependents?: DerivedDataDependents;
} & (T extends unknown
  ? Omit<FocusedDerivedDataPatch<T>, "weight"> & { weight?: Weight | false }
  : never);

export type EditComputedDataOptions = FocusedDerivedDataEdit<ComputedDataOptions>;
export type FilterRangePatch = FilterRangeClosure & {
  min?: FilterBound | false;
  max?: FilterBound | false;
};
type FilterModePatch =
  | { oneOf: readonly [DatasetScalar, ...DatasetScalar[]]; noneOf?: never; predicate?: never; range?: never }
  | { oneOf?: never; noneOf: readonly [DatasetScalar, ...DatasetScalar[]]; predicate?: never; range?: never }
  | { oneOf?: never; noneOf?: never; predicate: FilterComparison; range?: never }
  | { oneOf?: never; noneOf?: never; predicate?: never; range: FilterRangePatch }
  | { oneOf?: never; noneOf?: never; predicate?: never; range?: never };
export type EditFilteredDataOptions = (FilterModePatch & {
  where?: never;
  target: string;
  field?: string;
  nulls?: "include" | "exclude" | false;
  dependents?: DerivedDataDependents;
}) | (ExpressionFilterOptions & { target: string; dependents?: DerivedDataDependents });
export type EditFlattenDataOptions = FocusedDerivedDataEdit<FlattenDataOptions>;
export type EditLookupDataOptions = FocusedDerivedDataEdit<LookupDataOptions>;
export type EditPivotDataOptions = FocusedDerivedDataEdit<PivotDataOptions>;
export type EditFoldDataOptions = FocusedDerivedDataEdit<FoldDataOptions>;
export type EditSummaryDataOptions = FocusedWeightedDerivedDataEdit<
  SummaryDataOptions,
  StatisticalWeight
>;
export type EditBinDataOptions = FocusedWeightedDerivedDataEdit<
  BinDataOptions,
  StatisticalWeight
>;
export type EditTimeUnitDataOptions = FocusedDerivedDataEdit<TimeUnitDataOptions>;
export type EditWindowDataOptions = FocusedDerivedDataEdit<WindowDataOptions>;
export type EditDensityDataOptions = FocusedWeightedDerivedDataEdit<
  DensityDataOptions,
  StatisticalWeight
>;
export type EditStackDataOptions = FocusedDerivedDataEdit<StackDataOptions>;
export type EditRegressionDataOptions = FocusedDerivedDataEdit<RegressionDataOptions>;
export type EditIntervalDataOptions = FocusedDerivedDataEdit<IntervalDataOptions>;
export type EditECDFDataOptions = FocusedWeightedDerivedDataEdit<
  ECDFDataOptions,
  string
>;
export type EditNormalizedDataOptions = FocusedDerivedDataEdit<NormalizedDataOptions>;
export type EditCompleteDataOptions = FocusedDerivedDataEdit<CompleteDataOptions>;
export type EditImputedDataOptions = FocusedDerivedDataEdit<ImputedDataOptions>;

export type ErrorBarPositionChannel = { field?: string } & (
  | {
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalPositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | {
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
);

export interface ErrorBarStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  scale?: NonPointQuantitativePositionScaleOptions;
}

export interface ErrorBarExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: NonPointQuantitativePositionScaleOptions;
}

export type ErrorBarIntervalChannel =
  | ErrorBarStatisticalIntervalChannel
  | ErrorBarExplicitIntervalChannel;

export interface ErrorBarOffsetChannel {
  field?: string;
  fieldType?: "nominal" | "ordinal";
  scale?: OffsetScaleOptions;
  paddingInner?: number;
  paddingOuter?: number;
}

export interface ErrorBarOptions extends StrokeStyleDetails {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  y?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  xOffset?: ErrorBarOffsetChannel;
  yOffset?: ErrorBarOffsetChannel;
  groupBy?: string | false;
  coordinate?: string;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}

export interface EditErrorBarOptions extends StrokeStyleDetails {
  target?: string;
  data?: string;
  x?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  y?: ErrorBarPositionChannel | ErrorBarIntervalChannel;
  xOffset?: ErrorBarOffsetChannel | false;
  yOffset?: ErrorBarOffsetChannel | false;
  groupBy?: string | false;
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
  statistics?: {
    center?: IntervalCenter;
    extent?: IntervalExtent;
    method?: ConfidenceIntervalMethod;
    level?: number;
  };
}

export interface BoxPlotCategoryChannel {
  field: string;
  fieldType: "nominal" | "ordinal";
  scale?: NonPointBandPositionScaleOptions;
}

export interface BoxPlotMeasureChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
}

export type BoxPlotPositionChannel =
  | BoxPlotCategoryChannel
  | BoxPlotMeasureChannel;

export type BoxPlotWhisker = (
  | { type?: "tukey"; factor?: number }
  | { type: "minmax"; factor?: never }
) & Pick<ErrorBarOptions, "caps" | "capSize" | "stroke" | "strokeWidth" | "strokeDash" | "opacity" |
  "lineCap" | "lineJoin" | "miterLimit">;

export interface BoxPlotSummaryFields {
  min: string;
  q1: string;
  median: string;
  q3: string;
  max: string;
}

type BoxPlotWidth = { band?: number; pixels?: never } | { band?: never; pixels: number };

export interface BoxPlotOptions {
  summary?: BoxPlotSummaryFields;
  id?: string;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  coordinate?: string;
  color?: string | {
    field: string;
    fieldType?: "nominal" | "ordinal";
    scale?: NonPointCategoricalColorScaleOptions;
    palette?: Palette;
  } | { value: string };
  whisker?: BoxPlotWhisker;
  width?: BoxPlotWidth;
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    width?: { pixels: number } | "auto";
    stroke?: string;
    strokeWidth?: number;
  };
  outlier?: StrokeStyleDetails & {
    shape?: PointShape;
    radius?: number;
    opacity?: number;
  };
  guides?: false | BoxPlotGuideOptions;
}

export interface EditBoxPlotOptions {
  summary?: BoxPlotSummaryFields | false;
  target?: string;
  data?: string;
  x?: BoxPlotPositionChannel;
  y?: BoxPlotPositionChannel;
  whisker?: BoxPlotWhisker;
  width?: BoxPlotWidth;
  outliers?: boolean;
  box?: RectStyleDetails & {
    fill?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  };
  median?: StrokeStyleDetails & {
    width?: { pixels: number } | "auto";
    stroke?: string;
    strokeWidth?: number;
  };
  outlier?: StrokeStyleDetails & {
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

export interface GradientPlotCenterOptions extends StrokeStyleDetails {
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
  color?: BasicColorChannel | { value: string };
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
  guides?: false | GradientPlotGuideOptions;
}

export type ViolinPlotPositionChannel =
  | string
  | {
      field: string;
      fieldType: "nominal" | "ordinal";
      scale?: NonPointBandPositionScaleOptions;
    }
  | {
      field: string;
      fieldType: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      field: string;
      fieldType?: undefined;
      scale?:
        | NonPointBandPositionScaleOptions
        | NonPointQuantitativePositionScaleOptions;
    };

export interface ViolinPlotDensityOptions
  extends GradientPlotDensityOptions {
  weight?: StatisticalWeight;
  width?: DensityPlacementWidth;
  side?: "both" | "left" | "right" | "top" | "bottom";
}

export interface ViolinPlotSplitOptions {
  field: string;
  domain?: readonly [unknown, unknown];
}

export type ViolinPlotColorOptions =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: "overlay";
    };

export interface ViolinPlotAreaOptions extends StrokeStyleDetails {
  fill?: FillPaint;
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
  guides?: false | CartesianCategoricalGuideOptions;
}

export interface EditViolinPlotOptions {
  target?: string;
  data?: string;
  x?: ViolinPlotPositionChannel;
  y?: ViolinPlotPositionChannel;
  split?: false | ViolinPlotSplitOptions;
  density?: Omit<ViolinPlotDensityOptions, "weight"> & {
    weight?: StatisticalWeight | false;
  };
}

export interface EditGradientPlotOptions {
  target?: string;
  data?: string;
  x?: GradientPlotPositionChannel;
  y?: GradientPlotPositionChannel;
  density?: GradientPlotDensityOptions;
  width?: { band?: number };
  gradient?: GradientPlotAppearanceOptions;
  center?: false | GradientPlotCenterOptions;
}

type FacadePositionChannel<Quantitative, Temporal, Categorical> =
  | string
  | (Omit<PositionEncodingBase, "target" | "coordinate"> &
      PositionScaleBranches<Quantitative, Temporal, Categorical>);
type PointFacadePositionChannel =
  | string
  | ({ field: string } & (
      | {
          fieldType?: "quantitative";
          scale?: QuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          scale?: TemporalPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          scale?: CategoricalPositionScaleOptions;
        }
    ));
type LineXPositionChannel =
  | string
  | ({ field: string; bin?: PositionEncodingBase["bin"]; aggregate?: never } & (
      | {
          fieldType?: "quantitative";
          scale?: NonPointQuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          scale?: NonPointTemporalPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          bin?: never;
          scale?: NonPointCategoricalPositionScaleOptions;
        }
    ));
type LineYPositionChannel =
  | string
  | ({ field: string } & (
      | {
          fieldType?: "quantitative";
          aggregate?: AggregateOperation;
          scale?: NonPointQuantitativePositionScaleOptions;
        }
      | {
          fieldType: "temporal";
          temporalUnit?: TemporalInputUnit;
          aggregate?: never;
          scale?: NonPointTemporalPositionScaleOptions;
        }
      | { fieldType: "nominal" | "ordinal"; aggregate?: never; scale?: NonPointCategoricalPositionScaleOptions }
    ));
type BandPositionChannel = FacadePositionChannel<
  NonPointZeroSupportingPositionScaleOptions,
  NonPointTemporalPositionScaleOptions,
  NonPointBandPositionScaleOptions
>;
/** With binned quantitative X, aggregate Y per exact interval (and optional series). */
type BarYPositionChannel =
  | string
  | {
      field: string;
      bin?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      stack?: never;
      scale?: NonPointTemporalPositionScaleOptions;
    }
  | ({ field: string; bin?: never; stack?: StackMode } & (
      | {
          fieldType?: "quantitative";
          aggregate?: never;
          scale?: NonPointZeroSupportingPositionScaleOptions;
        }
      | {
          fieldType: "nominal" | "ordinal";
          aggregate?: never;
          scale?: NonPointBandPositionScaleOptions;
        }
      | {
          fieldType?: "quantitative" | "nominal" | "ordinal";
          aggregate: AggregateOperation;
          scale?: NonPointZeroSupportingPositionScaleOptions;
        }
    ));
type BasicColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: CategoricalColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "quantitative";
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
    };
type NonPointCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: ColorLayout;
    };
type HistogramCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: Exclude<ColorLayout, "center">;
    };
type LineCategoricalColorChannel<Scale = NonPointCategoricalColorScaleOptions> =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: Scale;
      palette?: Palette;
    };
type QuantitativeBarColorChannel = {
  field: string;
  fieldType: "quantitative";
  aggregate?: AggregateOperation;
  scale?:
    | NonPointContinuousColorScaleOptions
    | NonPointDiscretizedColorScaleOptions;
  palette?: Palette;
  layout?: never;
};
type BarCategoricalColorChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointCategoricalColorScaleOptions;
      palette?: Palette;
      layout?: Exclude<ColorLayout, "center">;
    };
type BarColorChannel =
  | BarCategoricalColorChannel
  | QuantitativeBarColorChannel;
type RectColorChannel =
  | LineCategoricalColorChannel
  | {
      field: string;
      fieldType: "quantitative";
      scale?:
        | NonPointContinuousColorScaleOptions
        | NonPointDiscretizedColorScaleOptions;
      palette?: Palette;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<NonPointContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
    };
export type BasicSizeChannel = string | WithoutEncodingTarget<SizeEncodingOptions>;
export type BasicShapeChannel = string | {
  field: string;
  fieldType?: "nominal";
  scale?: ShapeScaleOptions;
};
export type BasicStrokeDashChannel =
  StrokeDashEncodingOptions extends infer T
    ? T extends unknown ? Omit<T, "target"> : never
    : never;

type NonCartesianStrokeDashChannel = BasicStrokeDashChannel extends infer T
  ? T extends { field: string } ? Omit<T, "scale"> & { scale?: Omit<DashScaleOptions, "unknown"> } : T
  : never;

export type ParallelMissingPolicy = "break" | "drop-row" | "error";
export type ParallelDimension = string | ({
  field: string;
  title?: string;
} & (
  | {
      fieldType: "quantitative";
      scale?: QuantitativePositionScaleOptions;
    }
  | {
      fieldType: "ordinal";
      scale?: CategoricalPositionScaleOptions;
    }
  | {
      fieldType?: undefined;
      scale?: QuantitativePositionScaleOptions | CategoricalPositionScaleOptions;
    }
));
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
  color?: LineCategoricalColorChannel;
  strokeDash?: NonCartesianStrokeDashChannel;
  line?: StrokeStyleDetails & {
    strokeWidth?: number;
    stroke?: string;
    opacity?: number;
    curve?: "linear";
    closed?: false;
  };
  guides?: false | ParallelGuideOptions;
}

export interface CreateScatterPlotOptions {
  /** Forward the native mark missing-value policy. */
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  x: PointFacadePositionChannel;
  y: PointFacadePositionChannel;
  color?: BasicColorChannel;
  stroke?: string | WithoutEncodingTarget<Extract<StrokeEncodingOptions, { field: string }>>;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | CartesianGuideOptions;
}

export interface IntervalPlotErrorBarOptions extends StrokeStyleDetails {
  caps?: boolean;
  capSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}
type IntervalPlotBaseOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  xOffset?: ErrorBarOffsetChannel;
  yOffset?: ErrorBarOffsetChannel;
  groupBy?: string | false;
  color?: BasicColorChannel;
  point?: CreateScatterPlotOptions["point"];
  errorBar?: IntervalPlotErrorBarOptions;
  guides?: false | CartesianSeparateGuideOptions;
};
export type CreateIntervalPlotOptions = IntervalPlotBaseOptions & (
  | {
      x: string | ErrorBarPositionChannel;
      y: string | ErrorBarIntervalChannel;
    }
  | {
      x: string | ErrorBarIntervalChannel;
      y: string | ErrorBarPositionChannel;
    }
);

export type RegressionPlotPositionChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
type RegressionPlotBaseOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  x: RegressionPlotPositionChannel;
  y: RegressionPlotPositionChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: CreateScatterPlotOptions["point"];
  guides?: false | ColorMappedPointGuideOptions;
};
type RegressionPlotStatisticalOptions<T> = T extends unknown
  ? Omit<T, "target" | "x" | "y">
  : never;
export type CreateRegressionPlotOptions = RegressionPlotBaseOptions &
  RegressionPlotStatisticalOptions<RegressionOptions>;

export type EndpointPlotSummary = false | "mean" | "median" | "sum" | "min" | "max";
export type EndpointCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointCategoricalPositionScaleOptions;
};
export type EndpointValueChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
export type EndpointLabelOptions = Omit<
  TextMarkOptions,
  "id" | "data" | "source" | "text"
> & {
  format?: TextFormat;
  layout?: false | Omit<LabelLayoutOptions, "target">;
} & (
  | { field?: string; value?: never }
  | { field?: never; value: unknown }
);
type EndpointPlotBaseOptions = {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  category: EndpointCategoryChannel;
  orientation?: "horizontal" | "vertical";
  summary?: EndpointPlotSummary;
  guides?: false | CartesianSeparateGuideOptions;
};
export interface CreateDotPlotOptions extends EndpointPlotBaseOptions {
  value: EndpointValueChannel;
  point?: CreateScatterPlotOptions["point"];
  labels?: false | EndpointLabelOptions;
}
export interface CreateLollipopPlotOptions extends EndpointPlotBaseOptions {
  value: EndpointValueChannel;
  baseline?: number;
  point?: CreateScatterPlotOptions["point"];
  stem?: RuleStyleOptions & { clip?: boolean };
  labels?: false | EndpointLabelOptions;
}
export interface CreateDumbbellPlotOptions extends EndpointPlotBaseOptions {
  start: EndpointValueChannel;
  end: EndpointValueChannel;
  startPoint?: CreateScatterPlotOptions["point"];
  endPoint?: CreateScatterPlotOptions["point"];
  connector?: RuleStyleOptions & { clip?: boolean };
  labels?: false | (EndpointLabelOptions & { endpoint?: "start" | "end" | "both" });
}
export type EditEndpointPlotOptions = { target?: string } & Partial<Pick<
  CreateDumbbellPlotOptions,
  "data" | "coordinate" | "category" | "start" | "end" | "orientation" | "summary" | "missing"
>> & {
  value?: EndpointValueChannel;
  baseline?: number;
};

export interface CreateECDFPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  groupBy?: string | readonly [string, ...string[]];
  weight?: string;
  missing?: "drop" | "error";
  as?: ECDFOutputFields;
  color?: string | LineCategoricalColorChannel;
  line?: StrokeStyleDetails & { clip?: boolean; strokeWidth?: number; stroke?: string; opacity?: number };
  labels?: false | EndpointLabelOptions;
  guides?: false | CartesianPathGuideOptions;
}
export type EditECDFPlotOptions = { target?: string } & Partial<Pick<
  CreateECDFPlotOptions,
  "data" | "coordinate" | "field" | "missing" | "as"
>> & {
  groupBy?: CreateECDFPlotOptions["groupBy"] | false;
  weight?: string | false;
  color?: CreateECDFPlotOptions["color"] | false;
};

export type PolarThetaChannel = string | ({ field: string; scale?: ThetaScaleOptions } & (
  | { fieldType?: "quantitative" | "nominal" | "ordinal"; temporalUnit?: never }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit }
));
export type PolarRadiusChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: RadiusScaleOptions;
};
export type PolarChartGuideOptions = {
  axes?: false | Pick<CreateAxesOptions, "theta" | "radius"> & {
    coordinate?: { id?: string; type?: "auto" | "polar" };
  };
  grid?: false | Pick<CreateGridOptions, "theta" | "radial">;
  legend?: false | LegendOptions;
};
type PolarLegendOrder = LegendValueOrder | { channel: "theta"; values?: never };
type PolarPathLegendOptions = Omit<PathLegendOptions, "order"> & {
  order?: PolarLegendOrder;
};
type PolarPointLegendOptions = DistributiveLegendOmit<Exclude<FilledMarkLegendOptions, { combine: "color-size" | "color-size-shape" }>, "order"> & {
  order?: PolarLegendOrder;
};
export type PolarPathGuideOptions = Omit<PolarChartGuideOptions, "legend"> & {
  legend?: false | PolarPathLegendOptions;
};
export type PolarPointGuideOptions = Omit<PolarChartGuideOptions, "legend"> & {
  legend?: false | PolarPointLegendOptions;
};
export interface CreatePolarScatterPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  theta: PolarThetaChannel;
  radius: PolarRadiusChannel;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: Omit<NonNullable<CreateScatterPlotOptions["point"]>, "clip">;
  guides?: false | PolarPointGuideOptions;
}
export interface CreatePolarLinePlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  theta: PolarThetaChannel;
  radius: PolarRadiusChannel;
  color?: LineCategoricalColorChannel;
  groupBy?: string | readonly [string, ...string[]];
  strokeDash?: NonCartesianStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "clip" | "missing" | "closed" | "curve" | "tension"> & {
    curve?: "linear";
    closed?: boolean;
  };
  guides?: false | PolarPathGuideOptions;
}
export type RadarCategoryValue = string | number | boolean;
export type RadarCategoryScaleOptions = Pick<
  ThetaScaleOptions,
  "id" | "domain" | "range" | "reverse" | "paddingInner" | "paddingOuter" |
  "padding" | "align"
> & { type?: "band" | "point" };
export type RadarCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: RadarCategoryScaleOptions;
};
type CategoricalThetaTicksAndLabelsOptions = Omit<
  PolarTicksAndLabelsOptions,
  "count" | "labels"
> & {
  count?: never;
  labels?: Omit<AxisLabelStyleOptions, "format"> & DisplayLabelOptions &
    { format?: "auto" };
};
type CategoricalThetaAxisOptions = Omit<CompletePolarAxisOptions, "ticksAndLabels"> & {
  ticksAndLabels?: false | CategoricalThetaTicksAndLabelsOptions;
};
type CategoricalThetaGridOptions = Omit<PolarGridOptions, "count"> & {
  count?: never;
};
type CategoricalPolarAxesOptions = Omit<
  Pick<CreateAxesOptions, "theta" | "radius">,
  "theta"
> & {
  coordinate?: { id?: string; type?: "auto" | "polar" };
  theta?: false | CategoricalThetaAxisOptions;
};
type CategoricalPolarGridOptions = Omit<
  Pick<CreateGridOptions, "theta" | "radial">,
  "theta"
> & {
  theta?: boolean | CategoricalThetaGridOptions;
};
export type RadarGuideOptions = Omit<PolarPathGuideOptions, "axes" | "grid" | "legend"> & {
  axes?: false | CategoricalPolarAxesOptions;
  grid?: false | CategoricalPolarGridOptions;
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder });
};
export interface RadarWideOptions {
  /** Explicit aggregation into one profile per group. False requires unique series rows. */
  summary?: false | "mean" | "median";
  /** Explicit min-max normalization of each selected dimension across the resulting profiles. Constant dimensions map to zero. */
  normalize?: false | "minmax";
  fields: readonly [string, string, string, ...string[]];
  as?: { key?: string; value?: string };
}
export type CreateRadarPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  groupBy?: string | readonly [string, ...string[]];
  order?: readonly [
    RadarCategoryValue,
    RadarCategoryValue,
    RadarCategoryValue,
    ...RadarCategoryValue[]
  ];
  color?: LineCategoricalColorChannel;
  strokeDash?: NonCartesianStrokeDashChannel;
  line?: Omit<NonNullable<CreateLinePlotOptions["line"]>, "clip" | "missing" | "closed" | "curve" | "tension"> & {
    curve?: "linear";
    closed?: true;
  };
  guides?: false | RadarGuideOptions;
} & (
  | { category: RadarCategoryChannel; value: PolarRadiusChannel; wide?: never }
  | { wide: RadarWideOptions; category?: never; value?: never }
);
export interface EditRadarPlotOptions {
  target?: string;
  wide: { fields: readonly [string, string, ...string[]]; summary?: false | "mean" | "median"; normalize?: false | "minmax" };
}
export type RugMeasureChannel = string | (
  | {
      field: string;
      fieldType?: "quantitative";
      temporalUnit?: never;
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      field: string;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
);
export interface RugTickOptions extends StrokeStyleDetails {
  clip?: boolean;
  length?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}
type ContinuousGridDirectionOptions = Omit<GridDirectionOptions, "bandPosition"> & {
  /** Continuous position scales do not have categorical band edges. */
  bandPosition?: never;
};
type ContinuousCartesianGridOptions = {
  vertical?: boolean | ContinuousGridDirectionOptions;
  horizontal?: boolean | ContinuousGridDirectionOptions;
};
export type RugGuideOptions = Omit<CartesianGuideOptions, "axes" | "legend" | "grid"> & {
  axes?: false | CAxes;
  grid?: false | ContinuousCartesianGridOptions;
  legend?: false;
};
export type CreateRugPlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  tick?: RugTickOptions;
  guides?: false | RugGuideOptions;
} & (
  | { x: RugMeasureChannel; y?: never; edge: "top" | "bottom" }
  | { y: RugMeasureChannel; x?: never; edge: "left" | "right" }
);
export type StripCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: CategoricalPositionScaleOptions;
};
export interface StripPixelJitterOptions {
  maxOffset: { pixels: number; band?: never };
  seed?: string | number;
  key?: string;
}
export interface StripBandJitterOptions {
  maxOffset: { pixels?: never; band: number };
  seed?: string | number;
  key?: string;
}
export type StripJitterOptions = StripPixelJitterOptions | StripBandJitterOptions;
export type CreateStripPlotOptions = {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | ColorMappedPointGuideOptions;
} & (
  | { x: RugMeasureChannel; y?: never; jitter?: false | StripPixelJitterOptions }
  | { x: RugMeasureChannel; y: StripCategoryChannel; jitter?: false | StripBandJitterOptions }
  | { x: StripCategoryChannel; y: RugMeasureChannel; jitter?: false | StripBandJitterOptions }
);
export interface BeeswarmPackingOptions {
  maxOffset?: PointPackingMaxOffset;
  padding?: number;
  key?: string;
  overflow?: "error" | "overlap";
}
export type CreateBeeswarmPlotOptions = {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  color?: BasicColorChannel;
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: StrokeStyleDetails & {
    clip?: boolean;
    radius?: number;
    shape?: PointShape;
    fill?: string;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  packing?: false | BeeswarmPackingOptions;
  guides?: false | ColorMappedPointGuideOptions;
} & (
  | { x: RugMeasureChannel; y: StripCategoryChannel }
  | { x: StripCategoryChannel; y: RugMeasureChannel }
);

export interface RaincloudDensityOptions extends GradientPlotDensityOptions {
  width?: DensityPlacementWidth;
  area?: ViolinPlotAreaOptions;
}
export interface RaincloudBoxSummaryOptions {
  type?: "box";
  whisker?: BoxPlotWhisker;
  width?: { band?: number };
  outliers?: boolean;
  box?: BoxPlotOptions["box"];
  median?: BoxPlotOptions["median"];
  outlier?: BoxPlotOptions["outlier"];
}
export interface RaincloudIntervalSummaryOptions {
  type: "interval";
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  point?: CreateScatterPlotOptions["point"];
  errorBar?: IntervalPlotErrorBarOptions;
}
export type RaincloudSummaryOptions =
  | RaincloudBoxSummaryOptions
  | RaincloudIntervalSummaryOptions;
export interface RaincloudPointAppearanceOptions {
  size?: BasicSizeChannel;
  shape?: BasicShapeChannel;
  point?: CreateScatterPlotOptions["point"];
}
export type RaincloudPointsOptions =
  | (RaincloudPointAppearanceOptions & {
      type: "strip";
      jitter?: false | StripBandJitterOptions;
      packing?: never;
    })
  | (RaincloudPointAppearanceOptions & {
      type?: "beeswarm";
      packing?: false | BeeswarmPackingOptions;
      jitter?: never;
    });
export type RaincloudCategoryChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointBandPositionScaleOptions;
};
export type RaincloudValueChannel = string | {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
};
export type RaincloudColorChannel = LineCategoricalColorChannel | { value: string };
export interface CreateRaincloudPlotOptions {
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  category: RaincloudCategoryChannel;
  value: RaincloudValueChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | RaincloudDensityOptions;
  summary?: false | RaincloudSummaryOptions;
  points?: false | RaincloudPointsOptions;
  color?: false | RaincloudColorChannel;
  guides?: false | CartesianCategoricalPointGuideOptions;
}
export interface EditRaincloudPlotOptions {
  missing?: "error" | "skip";
  target?: string;
  data?: string;
  category?: RaincloudCategoryChannel;
  value?: RaincloudValueChannel;
  orientation?: "vertical" | "horizontal";
  side?: "before" | "after";
  density?: false | RaincloudDensityOptions;
  summary?: false | RaincloudSummaryOptions;
  points?: false | RaincloudPointsOptions;
  color?: false | RaincloudColorChannel;
}

export type GroupEncodingOptions = { target?: string; fieldType?: "nominal" } & (
  | { field: string; fields?: never }
  | { fields: readonly [string, ...string[]]; field?: never }
);

export interface SeriesLayoutOptions { target?: string; mode: ColorLayout; }
export interface BasicSeriesLayoutOptions { target?: string; mode: Exclude<ColorLayout, "center">; }
export type AreaPlotIndependentChannel = string | ({ field: string } & (
  | { fieldType: "nominal" | "ordinal"; scale?: NonPointCategoricalPositionScaleOptions }
  | { fieldType?: "quantitative"; scale?: NonPointQuantitativePositionScaleOptions }
  | { fieldType: "temporal"; temporalUnit?: TemporalInputUnit; scale?: NonPointTemporalPositionScaleOptions }
));
export type AreaPlotMeasureChannel = string | { field: string; scale?: NonPointQuantitativePositionScaleOptions }
  | ({ scale?: NonPointQuantitativePositionScaleOptions } & (
    | { lower: string; upper: string | { datum: number } }
    | { lower: { datum: number }; upper: string }
  ));
export type CreateAreaPlotOptions = {
  id?: string; data?: string; coordinate?: string;
  groupBy?: string | readonly [string, ...string[]];
  layout?: Exclude<ColorLayout, "group">; missing?: "error" | "break";
  color?: string | { field: string; fieldType?: "nominal" | "ordinal"; scale?: NonPointCategoricalColorScaleOptions; palette?: Palette };
  area?: StrokeStyleDetails & { clip?: boolean; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | (Omit<DensityPlotGuideOptions, "grid"> & { grid?: false | CartesianGridOptions });
} & (
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: number }
  | { valueChannel?: "y"; x: AreaPlotIndependentChannel; y: Extract<AreaPlotMeasureChannel, { lower: unknown }>; baseline?: never }
  | { valueChannel: "x"; x: Exclude<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: number }
  | { valueChannel: "x"; x: Extract<AreaPlotMeasureChannel, { lower: unknown }>; y: AreaPlotIndependentChannel; baseline?: never }
);

interface LinePlotCommonOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  color?: LineCategoricalColorChannel<CategoricalColorScaleOptions>;
  groupBy?: string | readonly [string, ...string[]];
  strokeDash?: BasicStrokeDashChannel;
  line?: StrokeStyleDetails & {
    clip?: boolean;
    missing?: "error" | "break";
    strokeWidth?: number;
    curve?: CurveInterpolation;
    tension?: number;
    stroke?: string;
    opacity?: number;
    closed?: false;
  };
 }
type LinePlotGuides<Continuous extends "horizontal" | "vertical"> = Omit<CPathGuides, "legend" | "grid"> & {
  grid?: false | (Omit<CartesianGridOptions, Continuous> & {
    [Direction in Continuous]?: boolean | (Omit<GridDirectionOptions, "bandPosition"> & { bandPosition?: never });
  });
  legend?: false | (Omit<PathLegendOptions, "order"> & { order?: LegendValueOrder | { channel: Continuous extends "horizontal" ? "x" : "y"; values?: never } });
};
export type CreateLinePlotOptions = LinePlotCommonOptions & (
  | { x: LineXPositionChannel; y: Exclude<LineYPositionChannel, { fieldType: "nominal" | "ordinal" }>; guides?: false | LinePlotGuides<"horizontal"> }
  | { x: string | { field: string; fieldType?: "quantitative"; aggregate?: AggregateOperation; scale?: NonPointQuantitativePositionScaleOptions };
      y: Extract<LineYPositionChannel, { fieldType: "nominal" | "ordinal" }>; guides?: false | LinePlotGuides<"vertical"> }
  | { x: { field: string; fieldType?: "quantitative"; aggregate: AggregateOperation; scale?: NonPointQuantitativePositionScaleOptions };
      y: string | (Exclude<AreaPlotIndependentChannel, string> & { aggregate?: never }); guides?: false | LinePlotGuides<"vertical"> }
);

type BasicHistogramEncoding =
  HistogramEncodingOptions extends infer T
    ? T extends unknown
      ? Omit<T, "field" | "target" | "coordinate" | "stack"> & {
          stack?: Exclude<StackMode, "center">;
        }
      : never
    : never;

export type BarRangePositionChannel = {
  lower: string;
  upper: string;
  fieldType?: "quantitative";
  scale?: NonPointZeroSupportingPositionScaleOptions;
  field?: never;
  aggregate?: never;
  stack?: never;
};
type BarFieldPosition<T> = T extends string ? T : T & { lower?: never; upper?: never };
type BarRangeOppositePositionChannel = string | {
  field: string;
  fieldType?: "nominal" | "ordinal" | "temporal";
  temporalUnit?: TemporalInputUnit;
  scale?: NonPointBandPositionScaleOptions | NonPointTemporalPositionScaleOptions;
  bin?: never;
  aggregate?: never;
  stack?: never;
};
export type CreateBarPlotOptions = {
  /** Forward the native mark missing-value policy. */
  missing?: "error" | "skip";
  id?: string;
  data?: string;
  coordinate?: string;
  orientation?: "vertical" | "horizontal";
  color?: BarColorChannel;
  width?: Omit<BarWidthOptions, "target" | "interval">;
  bar?: RectStyleDetails & {
    clip?: boolean;
    fill?: FillPaint;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | ColorGuides;
} & (
  | { x: BarFieldPosition<BandPositionChannel>; y: BarFieldPosition<BarYPositionChannel> }
  | { x: BarRangePositionChannel; y: BarRangeOppositePositionChannel }
  | { x: BarRangeOppositePositionChannel; y: BarRangePositionChannel }
);

export type CreateHistogramOptions = BasicHistogramEncoding & {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  color?: HistogramCategoricalColorChannel;
  bar?: RectStyleDetails & {
    clip?: boolean;
    fill?: FillPaint;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  };
  guides?: false | (Omit<CartesianCategoricalGuideOptions, "grid"> & {
    /** Bin position and count axes are continuous; neither grid has categorical band edges. */
    grid?: false | ContinuousCartesianGridOptions;
  });
};

export type HorizonPlotGuideOptions = {
  axes?: false | (Omit<CAxes, "y"> & { y?: false });
  grid?: false | { vertical?: boolean | ContinuousGridDirectionOptions; horizontal?: false };
  legend?: false;
};
export interface CreateHorizonPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: string | HorizonXEncoding;
  y: string | HorizonYEncoding;
  groupBy?: string | false;
  bands?: number;
  baseline?: number;
  extent?: "auto" | number;
  resolve?: HorizonResolution;
  missing?: HorizonMissingPolicy;
  overflow?: HorizonOverflowPolicy;
  palette?: HorizonPaletteOptions;
  area?: StrokeStyleDetails & { clip?: boolean; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | HorizonPlotGuideOptions;
}

export type DensityPlotLegendOptions = Omit<PieLegendOptions, "order"> & { order?: LegendValueOrder };
export type DensityPlotGuideOptions = Omit<CCategoricalGuides, "legend" | "grid"> & {
  grid?: false | ContinuousCartesianGridOptions;
  legend?: false | DensityPlotLegendOptions;
};
export interface CreateDensityPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  field: string;
  groupBy?: string | false;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight;
  as?: readonly [string, string];
  densityChannel?: "x" | "y";
  valueScale?: NonPointQuantitativePositionScaleOptions;
  densityScale?: NonPointZeroSupportingPositionScaleOptions;
  color?: string | {
    field: string;
    fieldType?: "nominal" | "ordinal";
    scale?: NonPointCategoricalColorScaleOptions;
    palette?: Palette;
    layout?: "overlay";
  };
  area?: StrokeStyleDetails & { clip?: boolean; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number; curve?: CurveInterpolation };
  guides?: false | DensityPlotGuideOptions;
}

export type PieCategory = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: Pick<ThetaScaleOptions, "id" | "domain" | "range" | "reverse"> & { type?: "band" };
};
export type PieColor = string | {
  field: string;
  fieldType?: "nominal" | "ordinal";
  scale?: NonPointCategoricalColorScaleOptions;
  palette?: Palette;
};
export type PieLegendOptions = Omit<
  SeparateFilledLegendOptions,
  "count" | "values" | "gradient" | "channels" | "order" | "labels" | "representation" | "symbol" | "titlePosition"
> & {
  titlePosition?: "top" | "left";
  symbol?: FilledLegendSymbolRecipe;
  channels?: readonly ["color"];
  order?: LegendValueOrder | { channel: "theta"; values?: never };
  labels?: CategoricalLegendTextOptions;
};
export type PieRadiusChannel = string | {
  scale?: RadiusScaleOptions;
} & ({ field: string; aggregate?: "sum" } | { field?: never; aggregate: "count" });

export type CreatePiePlotOptions = {
  id?: string;
  data?: string;
  coordinate?: string;
  category: PieCategory;
  color?: false | PieColor;
  radius?: PieRadiusChannel;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: number; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | { axes?: false; grid?: false; legend?: false | PieLegendOptions };
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate?: "sum" });

export type MeasuredRadialGuideOptions = {
  axes?: false | CategoricalPolarAxesOptions;
  grid?: false | CategoricalPolarGridOptions;
  legend?: false | PieLegendOptions;
};
export type CreateRosePlotOptions = Omit<CreatePiePlotOptions, "guides" | "arc" | "aggregate" | "value" | "radius"> & {
  radiusScale?: MeasuredRadiusScaleOptions;
  arc?: StrokeStyleDetails & { innerRadius?: ArcInnerRadius; padAngle?: 0; fill?: FillPaint; opacity?: number; stroke?: string; strokeWidth?: number };
  guides?: false | MeasuredRadialGuideOptions;
} & ({ value?: never; aggregate?: "count" } | { value: string; aggregate?: "sum" });
export type CreateRadialBarPlotOptions = CreateRosePlotOptions;

export interface HeatmapBaseOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  rect?: RectStyleDetails & {
    clip?: boolean;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  };
  guides?: false | CartesianSeparateGuideOptions;
}

export type HeatmapCategoryPositionChannel =
  | string
  | {
      field: string;
      fieldType?: "nominal" | "ordinal";
      scale?: NonPointBandPositionScaleOptions;
    };

export interface PreGriddedHeatmapOptions extends HeatmapBaseOptions {
  x: HeatmapCategoryPositionChannel;
  y: HeatmapCategoryPositionChannel;
  bin?: never;
  color?: RectColorChannel;
}

export interface BinnedHeatmapPositionChannel {
  field: string;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
}

export interface BinnedHeatmapColorOptions {
  scale?:
    | NonPointContinuousColorScaleOptions
    | NonPointDiscretizedColorScaleOptions;
  palette?: Palette;
}

export interface HeatmapBinOptions {
  bins?: number | Bin2DCounts;
  extent?: Bin2DExtent;
  assignment?: "edges" | "step";
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

export type ErrorBandPositionChannel = { field?: string } & (
  | {
      fieldType?: "quantitative";
      scale?: NonPointQuantitativePositionScaleOptions;
    }
  | {
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: NonPointTemporalPositionScaleOptions;
    }
);

export interface ErrorBandStatisticalIntervalChannel {
  field?: string;
  center?: IntervalCenter;
  extent?: IntervalExtent;
  method?: ConfidenceIntervalMethod;
  level?: number;
  scale?: NonPointQuantitativePositionScaleOptions;
}

export interface ErrorBandExplicitIntervalChannel {
  center: string;
  lower: string;
  upper: string;
  scale?: NonPointQuantitativePositionScaleOptions;
}

export type ErrorBandIntervalChannel =
  | ErrorBandStatisticalIntervalChannel
  | ErrorBandExplicitIntervalChannel;

export interface ErrorBandOptions extends StrokeStyleDetails {
  id?: string;
  target?: string;
  data?: string;
  x?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  y?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  groupBy?: string;
  coordinate?: string;
  fill?: FillPaint;
  opacity?: number;
  curve?: CurveInterpolation;
  boundaries?: false | (StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: DashStyle | DashPattern;
    opacity?: number;
    curve?: CurveInterpolation;
  });
}

export interface EditErrorBandOptions extends StrokeStyleDetails {
  target?: string;
  data?: string;
  x?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  y?: ErrorBandPositionChannel | ErrorBandIntervalChannel;
  groupBy?: string | false;
  fill?: FillPaint | false;
  opacity?: number;
  curve?: CurveInterpolation;
  statistics?: {
    center?: IntervalCenter;
    extent?: IntervalExtent;
    method?: ConfidenceIntervalMethod;
    level?: number;
  };
  boundaries?: false | (StrokeStyleDetails & {
    stroke?: string;
    strokeWidth?: number;
    strokeDash?: DashStyle | DashPattern;
    opacity?: number;
    curve?: CurveInterpolation;
  });
}

export interface EditErrorBandBoundaryOptions extends StrokeStyleDetails {
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
  source?: string;
  field?: string;
  groupBy?: string | false;
  bandwidth?: "auto" | number;
  extent?: "auto" | readonly [number, number];
  steps?: number;
  kernel?: DensityKernel;
  normalization?: DensityNormalization;
  weight?: StatisticalWeight | false;
  densityChannel?: "x" | "y";
  valueScale?: NonPointQuantitativePositionScaleOptions;
  placement?: DensityPlacement;
}

export interface OffsetScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  reverse?: boolean;
  padding?: number;
  paddingInner?: number;
  paddingOuter?: number;
  align?: number;
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

export type TextFormat = ValueFormat;

export interface TextMarkOptions extends StrokeStyleDetails {
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  clip?: boolean;
  /** Logical-pixel baseline spacing; defaults to 1.2 times fontSize. */
  lineHeight?: number;
  /** Anchor the first line or center the complete multiline block. */
  blockAlign?: "first" | "middle";
  /** Follow resolved source appearance; an explicit fill takes precedence. Source-owned labels only. */
  inheritColor?: "fill" | "stroke" | false;
  id?: string;
  data?: string;
  /** Explicit source mark. Mutually exclusive with data; may be incomplete. */
  source?: string;
  text?: unknown;
  missing?: "error" | "skip";
  fill?: FillPaint;
  outline?: MarkOutline | false;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  align?: "left" | "right" | "center" | "start" | "end";
  baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
  rotation?: RotationInput;
  dx?: number;
  dy?: number;
}

export interface TextOverride {
  match: { fields?: Readonly<Record<string, string | number | boolean | null>>; channels?: Readonly<Record<string, string | number | boolean | null>> };
  occurrence: number;
  text: string;
}

export interface EditTextMarkOptions extends Omit<TextMarkOptions, "id" | "data" | "source" | "text"> {
  target?: string;
  /** Display-only semantic item overrides; auto restores encoded content. */
  textOverrides?: readonly TextOverride[] | "auto";
}

export type LabelLayoutAxis = "x" | "y" | "both";
export type LabelLayoutBounds = "plot" | "canvas";

export interface LabelLeaderOptions {
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: readonly number[];
  opacity?: number;
}

export type MarkLabelAnchor =
  | "center"
  | "insideStart"
  | "insideEnd"
  | "outsideStart"
  | "outsideEnd";

export interface MarkLabelPlacementLeaderOptions {
  stroke?: string;
  strokeWidth?: number;
}

export interface MarkLabelPlacement {
  anchor: MarkLabelAnchor;
  /** Pixel gap between the source boundary and the nearest text edge. Defaults to 4. */
  gap?: number;
  /** Inside-fit behavior. Defaults to hide. */
  overflow?: "hide" | "outside" | "allow";
  leader?: false | MarkLabelPlacementLeaderOptions;
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

export interface RectMarkOptions extends RectStyleDetails {
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  clip?: boolean;
  id?: string;
  data?: string;
  missing?: "error" | "skip";
  fill?: FillPaint;
  outline?: MarkOutline | false;
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
  | { field: string; value?: never; content?: never; normalizeBy?: never }
  | { field?: never; value: unknown; content?: never; normalizeBy?: never }
  | { field?: never; value?: never; content: "category" | "value"; normalizeBy?: never }
  | { field?: never; value?: never; content: "share"; normalizeBy?: "source" | "category" }
);

/** Attached final-item labels; lower text actions own subsequent edits. */
export type MarkLabelSelectionOptions =
  | { select?: never; selection?: never }
  | { select: MarkSelector; selection?: never }
  | { selection: string; select?: never };

export type CreateMarkLabelsOptions = Omit<TextMarkOptions, "data" | "text"> & {
  layout?: false | Omit<LabelLayoutOptions, "target">;
  placement?: MarkLabelPlacement;
} & (
  | (TextEncodingOptions extends infer Options
      ? Options extends TextEncodingOptions ? Omit<Options, "target"> : never
      : never)
  | { field?: never; value?: never; content?: never; normalizeBy?: never; format?: TextFormat }
) & MarkLabelSelectionOptions;

/** Replace the requested final-item membership of one attached label layer. */
export type EditMarkLabelSelectionOptions = { target: string } & (
  | { select: MarkSelector; selection?: never; all?: never }
  | { selection: string; select?: never; all?: never }
  | { all: true; select?: never; selection?: never }
);

/** Replace semantic placement or reset one attached label layer to its legacy anchor. */
export interface EditMarkLabelPlacementOptions {
  target: string;
  placement: MarkLabelPlacement | "auto";
}

/** Remove one attached label layer or every attached label owned by a source mark. */
export type RemoveMarkLabelsOptions =
  | { target: string; source?: never }
  | { source: string; target?: never };

type AnnotationBaseOptions = Omit<TextMarkOptions, "id" | "data" | "source" | "text"> & {
  id?: string;
  text: unknown;
  format?: TextFormat;
  layout?: false | Omit<LabelLayoutOptions, "target">;
};

type AnnotationAnchor =
  | {
      anchor: "plot-center";
      x?: never;
      y?: never;
      space?: never;
      source?: never;
      align?: never;
      baseline?: never;
      data?: string;
      coordinate?: string;
    }
  | {
      anchor?: never;
      x?: never;
      y?: never;
      space?: never;
      source?: string;
      data?: never;
      coordinate?: never;
    }
  | {
      anchor?: never;
      x: unknown;
      y: unknown;
      space?: "data";
      source?: string;
      data?: never;
      coordinate?: never;
    }
  | {
      anchor?: never;
      x: number;
      y: number;
      space: "plot";
      source?: never;
      data?: string;
      coordinate?: string;
    };

export type CreateAnnotationOptions = AnnotationBaseOptions & AnnotationAnchor;

type TextPlotPositionChannel =
  | string
  | ({ field: string } & PositionScaleBranches<
      NonPointQuantitativePositionScaleOptions,
      NonPointTemporalPositionScaleOptions,
      NonPointCategoricalPositionScaleOptions>)
  | WithoutEncodingTarget<Extract<DatumPositionEncodingOptions, { datum: unknown }>> & { coordinate?: never };

export interface CreateTextPlotOptions {
  id?: string;
  data?: string;
  coordinate?: string;
  x: TextPlotPositionChannel;
  y: TextPlotPositionChannel;
  text: string | WithoutEncodingTarget<Extract<TextEncodingOptions, { field: string } | { value: unknown }>>;
  color?: RectColorChannel;
  style?: Omit<TextMarkOptions, "id" | "data" | "source" | "text" | "inheritColor">;
  guides?: false | ColorGuides;
}

export type BarWidthOptions = { target?: string } & (
  | { band?: number; pixels?: never; interval?: never }
  | { band?: never; pixels: number; interval?: never }
  | { band?: never; pixels?: never; interval: { unit: Exclude<TimeUnit, "week" | "weekday">; insetStart?: number; insetEnd?: number } }
);

export interface DashScaleOptions {
  id?: string;
  type?: "ordinal";
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly (DashStyle | DashPattern)[];
  unknown?: DashStyle | DashPattern;
}

/** Ordered first-match predicates; otherwise is required. All branches are validated.
 * Each value uses the existing encoder payload without target. Selection predicates
 * reference stored logical selection IDs. Legends require one unique field/scale binding.
 */
interface ConditionalEncodingBranch<Value> {
  when: ComputedExpressionV2 | { selection: string };
  value: WithoutEncodingTarget<Value>;
}
export type ConditionalEncodingOptions<Value> = {
  target?: string;
  conditions: readonly ConditionalEncodingBranch<Value>[];
  otherwise: WithoutEncodingTarget<Value>;
};

export type StrokeDashEncodingOptions =
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "nominal" | "ordinal";
      scale?: DashScaleOptions;
    }
  | {
      value: DashStyle | DashPattern;
      field?: never;
      target?: string;
      fieldType?: never;
      scale?: never;
    };

export type NonPointContinuousColorScaleOptions = ScaleFields<
  "id" | "interpolate" | "whitePoint" | "gamma" | "midpoint" | "clamp" | "reverse"
> & {
  base?: number;
  constant?: number;
  domain?: "auto" | readonly [unknown, unknown];
  range?: "auto" | readonly [string, string, ...string[]] | { readonly palette: Palette };
  palette?: Palette;
} & (
  | { type: "pow"; exponent?: number }
  | { type?: "sequential" | "log" | "sqrt" | "symlog"; exponent?: never }
);

export type ContinuousColorScaleOptions =
  NonPointContinuousColorScaleOptions & { unknown?: string };

export type NonPointQuantizeColorScaleOptions = ScaleFields<
  "id" | "clamp" | "reverse"
> & {
  type: "quantize";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
export type NonPointQuantileColorScaleOptions = ScaleFields<"id" | "reverse"> & {
  type: "quantile";
  domain?: "auto" | readonly number[];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
export type NonPointThresholdColorScaleOptions = ScaleFields<"id" | "reverse"> & {
  type: "threshold";
  domain: readonly number[];
  range?: "auto" | readonly [string, string, ...string[]];
  palette?: PaletteName | { name: PaletteName; count?: number };
};
export type NonPointDiscretizedColorScaleOptions =
  | NonPointQuantizeColorScaleOptions
  | NonPointQuantileColorScaleOptions
  | NonPointThresholdColorScaleOptions;
export type QuantizeColorScaleOptions =
  NonPointQuantizeColorScaleOptions & { unknown?: string };
export type QuantileColorScaleOptions =
  NonPointQuantileColorScaleOptions & { unknown?: string };
export type ThresholdColorScaleOptions =
  NonPointThresholdColorScaleOptions & { unknown?: string };
export type DiscretizedColorScaleOptions =
  | QuantizeColorScaleOptions
  | QuantileColorScaleOptions
  | ThresholdColorScaleOptions;

/** Area quantitative color requires one finite value per existing series;
 * aggregate, temporal color and unknown fallback remain mark-specific restrictions.
 * Area authoring uses the Full facade; createAreaPlot.color stays categorical.
 * Tick quantitative/temporal color paints its stroke and excludes a simultaneous stroke encoding.
 */
export type ColorEncodingOptions =
  | { value: string; target?: string; field?: never; fieldType?: never;
      scale?: never; palette?: never; layout?: never; aggregate?: never; temporalUnit?: never }
  | (CategoricalEncodingOptions & { value?: never })
  | {
      field: string;
      target?: string;
      value?: never;
      fieldType: "quantitative";
      aggregate?: AggregateOperation;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
      palette?: Palette;
      layout?: never;
    }
  | {
      field: string;
      target?: string;
      value?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      aggregate?: never;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint" | "type" | "base" | "exponent" | "constant"> & { midpoint?: "auto"; type?: "sequential" };
      palette?: Palette;
      layout?: never;
    };

export type StrokeEncodingOptions =
  | {
      target?: string;
      value: string;
      field?: never;
      fieldType?: never;
      temporalUnit?: never;
      scale?: never;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType?: "nominal" | "ordinal";
      temporalUnit?: never;
      scale?: CategoricalColorScaleOptions;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType: "quantitative";
      temporalUnit?: never;
      scale?: ContinuousColorScaleOptions | DiscretizedColorScaleOptions;
    }
  | {
      target?: string;
      field: string;
      value?: never;
      fieldType: "temporal";
      temporalUnit?: TemporalInputUnit;
      scale?: Omit<ContinuousColorScaleOptions, "midpoint"> & {
        midpoint?: "auto";
      };
    };

export type OpacityScaleOptions = ScaleFields<
  "id" | "zero" | "clamp" | "reverse"
> & {
  nice?: boolean;
  type?: "linear";
  domain?: "auto" | readonly [number, number];
  range?: "auto" | readonly [number, number];
  unknown?: number;
};

/** Constant or quantitative opacity on Point, Rule, Line, Area, Bar, or row-owned Rect marks.
 * Line and Area fields must be constant within each existing path series. */
export type OpacityEncodingOptions =
  | { value: number; field?: never; target?: string; fieldType?: never; scale?: never }
  | {
      field: string;
      value?: never;
      target?: string;
      fieldType?: "quantitative";
      scale?: OpacityScaleOptions;
    };

export type StrokeWidthScaleOptions = NonPointQuantitativePositionScaleOptions extends infer T
  ? T extends unknown ? Omit<T, "nice"> & { nice?: boolean } : never
  : never;

export interface RuleStyleOptions extends StrokeStyleDetails {
  blend?: BlendMode;
  shadow?: MarkShadow | false;
  stroke?: string;
  strokeWidth?: number;
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;
}

type ReferenceAxis<Value> = { x: Value; y?: never } | { y: Value; x?: never };
type ReferenceBinding<DataValue, PlotValue> =
  | ({ space?: "data"; source?: string; temporalUnit?: TemporalInputUnit;
       data?: never; coordinate?: never } & ReferenceAxis<DataValue>)
  | ({ space: "plot"; data?: string; coordinate?: string;
       source?: never; temporalUnit?: never } & ReferenceAxis<PlotValue>);

export type ReferenceStatistic =
  | { readonly op: "mean" | "median" | "min" | "max"; readonly p?: never }
  | { readonly op: "quantile"; readonly p: number };
type DynamicReferenceBinding = {
  readonly id?: string;
  readonly source: string;
  readonly axis: "x" | "y";
  /** Distribution/endpoint measurement axes and quantitative Horizon X use original bound observations, retaining multiplicity. Horizon folded Y is unsupported. */
  readonly population?: "boundData" | "visibleItems";
  readonly field?: string;
  /** Compute a separate reference for each observed value of this field. */
  readonly groupBy?: string;
  readonly x?: never;
  readonly y?: never;
  readonly space?: never;
  readonly data?: never;
  readonly coordinate?: never;
  readonly temporalUnit?: never;
};
/** A statistical line (mean by default) or an exact two-statistic interval. */
export type CreateStatisticalReferenceOptions = DynamicReferenceBinding & (
  | (RuleStyleOptions & { readonly statistic?: ReferenceStatistic; readonly statistics?: never })
  | (Omit<RectMarkOptions, "id" | "data" | "source" | "missing"> & {
      readonly statistics: readonly [ReferenceStatistic, ReferenceStatistic]; readonly statistic?: never;
    })
);
export type CreateReferenceLineOptions =
  | ({ id?: string } & RuleStyleOptions & ReferenceBinding<unknown, number>)
  | (DynamicReferenceBinding & RuleStyleOptions & {
      readonly statistic: ReferenceStatistic;
    });
export type CreateReferenceBandOptions =
  | (Omit<RectMarkOptions, "clip" | "data"> &
      ReferenceBinding<readonly [unknown, unknown], readonly [number, number]>)
  | (DynamicReferenceBinding & Omit<RectMarkOptions, "clip" | "id" | "data" | "source"> & {
      readonly statistics: readonly [ReferenceStatistic, ReferenceStatistic];
    });

/** Constant or quantitative stroke width on Line, Rule, or row-owned Rect marks. */
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

/** Constant value and scale ranges are graphical areas in square pixels. */
export type SizeEncodingOptions =
  | { value: number; target?: string; field?: never; fieldType?: never; scale?: never }
  | ({
  value?: never;
  field: string;
  target?: string;
} & (
  | { fieldType?: "quantitative"; scale?: SizeScaleOptions }
  | { fieldType: "nominal" | "ordinal"; scale?: CategoricalSizeScaleOptions }
));

export type ShapeEncodingOptions =
  | { value: PointShape; target?: string; field?: never; fieldType?: never; scale?: never }
  | {
  value?: never;
  field: string;
  target?: string;
  fieldType?: "nominal";
  scale?: ShapeScaleOptions;
};

export type AngleEncodingOptions =
  | { target?: string; value: number; field?: never; fieldType?: never }
  | { target?: string; field: string; fieldType?: "quantitative"; value?: never };

/** Unscaled, signed logical-pixel offsets for independent Text marks. */
export type TextOffsetEncodingOptions =
  | { target?: string; value: number; field?: never }
  | { target?: string; field: string; value?: never };

type WithoutEncodingTarget<T> = T extends unknown
  ? Omit<T, "target" | "coordinate">
  : never;

export interface EncodingChannelAssignments {
  x?: WithoutEncodingTarget<PositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<PositionEncodingOptions | DatumPositionEncodingOptions>>;
  y?: WithoutEncodingTarget<YPositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<YPositionEncodingOptions | DatumPositionEncodingOptions>>;
  x2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>;
  y2?: WithoutEncodingTarget<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>;
  theta?: WithoutEncodingTarget<ThetaEncodingOptions | ConditionalEncodingOptions<ThetaEncodingOptions>>;
  r?: WithoutEncodingTarget<RadialEncodingOptions | ConditionalEncodingOptions<RadialEncodingOptions>>;
  xOffset?: WithoutEncodingTarget<XOffsetEncodingOptions | ConditionalEncodingOptions<XOffsetEncodingOptions>>;
  yOffset?: WithoutEncodingTarget<YOffsetEncodingOptions | ConditionalEncodingOptions<YOffsetEncodingOptions>>;
  group?: WithoutEncodingTarget<GroupEncodingOptions>;
  pathOrder?: WithoutEncodingTarget<PathOrderEncodingOptions>;
  color?: WithoutEncodingTarget<ColorEncodingOptions | ConditionalEncodingOptions<ColorEncodingOptions>>;
  stroke?: WithoutEncodingTarget<StrokeEncodingOptions | ConditionalEncodingOptions<StrokeEncodingOptions>>;
  size?: WithoutEncodingTarget<SizeEncodingOptions | ConditionalEncodingOptions<SizeEncodingOptions>>;
  shape?: WithoutEncodingTarget<ShapeEncodingOptions | ConditionalEncodingOptions<ShapeEncodingOptions>>;
  opacity?: WithoutEncodingTarget<OpacityEncodingOptions | ConditionalEncodingOptions<OpacityEncodingOptions>>;
  strokeWidth?: WithoutEncodingTarget<StrokeWidthEncodingOptions | ConditionalEncodingOptions<StrokeWidthEncodingOptions>>;
  strokeDash?: WithoutEncodingTarget<StrokeDashEncodingOptions | ConditionalEncodingOptions<StrokeDashEncodingOptions>>;
  angle?: WithoutEncodingTarget<AngleEncodingOptions | ConditionalEncodingOptions<AngleEncodingOptions>>;
  text?: WithoutEncodingTarget<TextEncodingOptions | ConditionalEncodingOptions<TextEncodingOptions>>;
  dx?: WithoutEncodingTarget<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>;
  dy?: WithoutEncodingTarget<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>;
}

type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>
}[keyof T];

export interface EncodeChannelsOptions {
  target: string;
  channels: AtLeastOne<EncodingChannelAssignments>;
}

export type RegressionMethod = "linear" | "polynomial" | "loess" | "exp";
export type RegressionInterval = "mean" | "prediction";

export interface RegressionBandOptions extends StrokeStyleDetails {
  color?: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  curve?: CurveInterpolation;
}

export interface CreateRegressionBandOptions extends StrokeStyleDetails {
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

export interface CreateRegressionLineOptions extends StrokeStyleDetails {
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
      method: "exp";
      interval?: false;
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      predict?: RegressionPredictOptions;
    }
  | {
      method?: "linear";
      degree?: never;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: ConfidenceIntervalMethod;
      level?: number;
      confidence?: number;
      interval?: RegressionInterval | false;
      predict?: RegressionPredictOptions;
    }
  | {
      method: "polynomial";
      degree?: number;
      span?: never;
      robustIterations?: never;
      confidenceMethod?: ConfidenceIntervalMethod;
      level?: number;
      confidence?: number;
      interval?: RegressionInterval | false;
      predict?: RegressionPredictOptions;
    }
  | {
      method: "loess";
      /** Local polynomial degree; default 1. */
      degree?: 1 | 2;
      span?: number;
      /** Residual reweighting passes, integer 0..32; default 0. */
      robustIterations?: number;
      confidenceMethod?: never;
      level?: never;
      confidence?: never;
      interval?: never;
      predict?: RegressionPredictOptions;
    };

export type RegressionDataOptions = {
  id: string;
  source?: string;
  x: string;
  y: string;
  groupBy?: string;
  missing?: "error" | "drop";
} & RegressionParameterOptions;

export interface DatasetRegressionStatisticsTransform {
  readonly type: "regressionStatistics";
}
export interface RegressionStatisticsDataOptions {
  id: string;
  source: string;
}
export interface EditRegressionStatisticsDataOptions {
  target?: string;
  source?: string;
}

type RegressionCommonOptions = {
  placement?: "source" | "plot-last";
  target?: string;
  x?: string;
  y?: string;
  groupBy?: string | false;
  line?: StrokeStyleDetails & { strokeWidth?: number; curve?: CurveInterpolation };
  sourceBinding?: "fixed" | "follow";
  missing?: "error" | "drop";
};

export type RegressionOptions = RegressionCommonOptions & (
  | (Extract<RegressionParameterOptions, { method: "exp" }> & {
      band?: false;
    })
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
  placement?: "source" | "plot-last";
  target?: string;
  data?: string;
  x?: string;
  y?: string;
  groupBy?: string | false;
  method?: RegressionMethod;
  degree?: number;
  span?: number;
  robustIterations?: number;
  confidenceMethod?: ConfidenceIntervalMethod;
  level?: number;
  confidence?: number;
  interval?: RegressionInterval | false;
  missing?: "error" | "drop";
  predict?: RegressionPredictOptions | false;
  band?: false | RegressionBandOptions;
  line?: StrokeStyleDetails & { strokeWidth?: number; curve?: CurveInterpolation };
  sourceBinding?: "fixed" | "follow";
}

export interface RemoveAxisOptions {
  target?: string;
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
  /** Remove selected content, including part of a combined categorical legend; omission removes every owned block. */
  channels?: readonly ("color" | "stroke" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
  /** Keep removed channels out of automatic guides until explicit createLegend restores them. Default false. */
  suppress?: boolean;
}

export interface RemoveMarkOptions {
  target?: string;
}

export interface LegendTextOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
  /** Gap after the occupied sample slot: categorical color/interval default 8; series 10; size/width 12.
   * Categorical slots include all recipe strokes and mapped shape extents.
   * Size retains a minimum 32px slot. Width includes the widest line stroke.
   * Opacity: visible circle-stroke gap, default 12 (inline 8). */
  offset?: number;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  /** Continuous numeric/temporal label format. Categorical legends accept auto only. */
  format?: ValueFormat;
}

export interface LegendTitleStyleOptions {
  /** Align a top title inside its measured content block; omission keeps native layout defaults. */
  align?: "left" | "center" | "right";
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
}

export type LegendSymbolLayer =
  | { type: "line"; length?: number; lineWidth?: number; opacity?: number }
  | {
      type: "point";
      shape?: "circle";
      size?: number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    }
  | {
      type: "swatch";
      width?: number;
      height?: number;
      stroke?: string;
      strokeWidth?: number;
      opacity?: number;
    };

export type LegendSymbolRecipe =
  | "auto"
  /** Sampled opacity uses a single point recipe; radius defaults to 7 and must be positive. */
  | { type?: "point"; radius?: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { length?: number; lineWidth?: number }
  | { width?: number; height?: number; stroke?: string; strokeWidth?: number }
  | { layers: readonly LegendSymbolLayer[] };

export interface LegendBorderOptions {
  /** Even-length non-negative finite dash sequence; [] restores a solid frame. */
  strokeDash?: readonly number[];
  color?: string;
  lineWidth?: number;
  padding?: number;
  background?: string;
}

type LegendValueOrder = "scale" | { values: readonly CategoryValue[]; channel?: never };
type CartesianLegendOrder = LegendValueOrder | { channel: "x" | "y"; values?: never };
export type LegendOrder = LegendValueOrder |
  { channel: "x" | "y" | "theta"; values?: never };

export interface LegendOptions {
  /** Positive sample window height. Clips point-bearing glyphs without changing mapped area. */
  clipHeight?: number;
  /** Combine size/shape, continuous color/size, or interval color/stroke + size + ordinal shape samples. Omission retains separate blocks. */
  combine?: "separate" | "size-shape" | "color-size" | "color-size-shape";
  /** Continuous color only. Omission creates the existing gradient; symbols samples the same scale without changing marks. */
  representation?: "gradient" | "symbols";
  /** Categorical, interval, size, or stroke-width layout. Defaults to edge; legacy-bottom is categorical and requires bottom position. */
  layout?: "edge" | "legacy-bottom";
  /** Categorical and ordinal-size display limit; omitted or false shows every item. */
  overflow?: false | { maxItems: number; summary?: "ellipsis-count"; summarySymbol?: "first-hidden" };
  /** Categorical item order; preserves the appearance scale's assignments. */
  order?: LegendOrder;
  target?: string;
  /** Exact requested content; omission infers encoded point color/shape/size. Explicit subsets include size only when listed. */
  channels?: readonly ("color" | "stroke" | "strokeDash" | "strokeWidth" | "shape" | "size" | "opacity")[];
  /** Outside right/left: complete legend stack top aligns with the plot top, including borders and excluding chart titles. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Arrange every legend block owned by the selected target. Item direction and columns remain independent. */
  blockLayout?: "row" | "column" | "wrap";
  /** Occupied group top-left relative to the plot. Cannot be supplied with position, align, offset, or alongOffset in the same call. */
  at?: { x: number; y: number };
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Gradient orientation is independent of position; auto is gradient-only. Categorical sides require vertical. */
  direction?: "horizontal" | "vertical";
  /** Categorical legends accept a positive column count on every supported position. */
  columns?: number;
  /** Signed logical pixels along the edge: right for top/bottom and in-plot corners, down for left/right. */
  alongOffset?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  /** bottom is gradient-only; left retains the existing categorical/opacity rules. */
  titlePosition?: "top" | "left" | "bottom";
  /** false hides the title while retaining its inferred field text. */
  /** LF, CRLF and CR preserve explicit title lines, including blank lines. */
  title?: string | false;
  /** Exact ascending samples for continuous guides, or one representative per interval for color-size-shape. Cannot be combined with count. */
  values?: readonly number[];
  count?: number;
  /** Body-only opacity defaults to 1; edits preserve omitted fields. */
  gradient?: { length?: number; thickness?: number; opacity?: number };
  symbol?: LegendSymbolRecipe;
  labels?: LegendTextOptions;
  /** New categorical+size blocks share typography on every edge; retained standalone size styles remain independent. */
  titleStyle?: LegendTitleStyleOptions;
  /** Vertical items default to 18 logical pixels; the pitch grows to fit samples and labels. */
  itemGap?: number;
  /** Non-negative gap between occupied item rows; overrides vertical itemGap pitch. Item legends in edge layout only. */
  rowPadding?: number;
  /** Non-negative gap between visible title and body bounds; legacy-bottom is excluded. */
  titlePadding?: number;
  border?: boolean | LegendBorderOptions;
}

export type LegendChannel = NonNullable<LegendOptions["channels"]>[number];

export interface LegendBlockTextPatch {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
}

export interface LegendBlockSymbolPatch {
  /** Point glyph area in square pixels. */
  size?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface EditLegendBlockOptions {
  /** Reset only the sample window with auto. */
  clipHeight?: number | "auto";
  target: string;
  channel: LegendChannel;
  /** Block-local anchor; inherit removes only this override. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  title?: string;
  values?: readonly [number, ...number[]] | "auto";
  count?: number;
  order?: readonly CategoryValue[];
  gap?: number;
  text?: LegendBlockTextPatch;
  symbol?: LegendBlockSymbolPatch;
  /** Display-only: categorical keys, or finite numeric keys for continuous size samples. Empty labels omit text only. */
  labelMap?: DisplayLabelMap | "auto";
}

export interface LegendTitleStyleEditOptions extends Omit<LegendTitleStyleOptions, "align"> {
  align?: "left" | "center" | "right" | "auto";
}

export interface LegendLabelEditStyle extends LegendTextOptions { visible?: boolean; }
export interface LegendTitleEditStyle extends LegendTitleStyleEditOptions { visible?: boolean; }
export interface EditLegendOptions
  extends Omit<LegendOptions, "channels" | "labels" | "title" | "values" | "titleStyle" | "direction" | "position" | "clipHeight" | "rowPadding" | "titlePadding"> {
  visible?: boolean;
  /** Body offset in pixels; auto resets. */
  itemsOffset?: { x?: number; y?: number } | "auto";
  labels?: LegendLabelEditStyle;
  clipHeight?: number | "auto";
  /** auto removes the row policy and restores the retained itemGap behavior. */
  rowPadding?: number | "auto";
  /** auto removes the title/body spacing override. */
  titlePadding?: number | "auto";
  /** Select a block or all. all excludes channels/combine/representation. */
  channel?: LegendChannel | "all";
  /** inherit is allowed only with a singular channel selector. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  /** Gradient-only auto resets orientation. */
  direction?: "horizontal" | "vertical" | "auto";
  titleStyle?: LegendTitleEditStyle;
  /** Exact final content set for the whole target; omission preserves content. */
  channels?: LegendOptions["channels"];
  title?: string | "auto" | false;
  /** Replace exact samples, or reset them to the remembered automatic count. */
  values?: readonly number[] | "auto";
}

export interface EditLegendLayoutOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  layout?: "edge" | "legacy-bottom";
  /** Outside right/left: complete legend stack top aligns with the plot top, including borders and excluding chart titles. */
  position?: "right" | "left" | "bottom" | "top" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "inherit";
  /** Opt into whole-target legend group layout; a requested row never wraps. */
  blockLayout?: "row" | "column" | "wrap";
  /** Move the complete occupied group top-left to plot-relative logical pixels. A later position clears this anchor. */
  at?: { x: number; y: number };
  /** Single top/bottom edge: align complete occupied bounds, including border strokes, to the plot. Side positions require center. */
  align?: "left" | "center" | "right";
  /** Gradient orientation is independent of position; auto is gradient-only. Categorical sides require vertical. */
  direction?: "horizontal" | "vertical" | "auto";
  /** Categorical legends accept a positive column count on every supported position. */
  columns?: number;
  /** Signed logical pixels along the edge: right for top/bottom and in-plot corners, down for left/right. */
  alongOffset?: number;
  /** Single top/bottom edge: gap from the plot to the nearest occupied legend edge. */
  offset?: number;
  /** bottom is gradient-only; left retains the existing categorical/opacity rules. */
  titlePosition?: "top" | "left" | "bottom";
  /** Explicit spacing override; vertical creation defaults to 18 logical pixels. */
  itemGap?: number;
  /** Non-negative occupied-row gap; auto restores the retained legacy pitch. */
  rowPadding?: number | "auto";
  /** Non-negative visible-title/body gap; auto restores the family default. */
  titlePadding?: number | "auto";
}

export interface EditLegendLabelsOptions extends LegendTextOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
}

export interface EditLegendTitleOptions extends LegendTitleStyleEditOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  title?: string | "auto" | false;
}

export interface EditLegendSymbolsOptions {
  clipHeight?: number | "auto";
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  symbol?: LegendSymbolRecipe;
  count?: number;
  gradient?: { length?: number; thickness?: number; opacity?: number };
}

export interface EditLegendBorderOptions {
  target?: string;
  /** Select one existing block without changing its content. */
  channel?: LegendChannel;
  border: boolean | LegendBorderOptions;
}

/** Omitted/false axes are preserved; component false values remove existing components. */
export interface EditAxesOptions {
  x?: false | EditAxisOptions<XAxisPosition> | readonly [EditAxisOptions<XAxisPosition> & { target: string }, ...(EditAxisOptions<XAxisPosition> & { target: string })[]];
  y?: false | EditAxisOptions<YAxisPosition> | readonly [EditAxisOptions<YAxisPosition> & { target: string }, ...(EditAxisOptions<YAxisPosition> & { target: string })[]];
  theta?: false | EditThetaAxisOptions;
  radius?: false | EditRadialAxisOptions;
  parallel?: false | EditParallelAxisOptions | readonly [EditParallelAxisOptions, ...EditParallelAxisOptions[]];
}

export interface GuideVisibilityOptions { /** Hide/show without deleting retained style or relative geometry. */ visible?: boolean; }
export type VisibleGuide<T> = T & GuideVisibilityOptions;
export type VisibleTickGroup<T> = T & { ticks?: VisibleGuide<AxisTickStyleOptions>; labels?: VisibleGuide<AxisLabelStyleOptions>; };
export interface EditAxisOptions<P extends string> {
  visible?: boolean;
  /** Omission preserves placement; false restores the ordinary overlay. */
  underlay?: boolean;
  target?: string;
  /** Omitted edits preserve the frame; zero restores the plot-edge frame. */
  offset?: number;
  position?: P;
  line?: false | VisibleGuide<AxisLineStyleOptions>;
  ticks?: false | VisibleGuide<Omit<AxisTickOptions<P>, "scale" | "position" | "target">>;
  labels?: false | VisibleGuide<Omit<AxisLabelOptions<P>, "scale" | "position" | "target">>;
  ticksAndLabels?: false | VisibleTickGroup<Omit<AxisTicksAndLabelsOptions<P>, "scale" | "position" | "target">>;
  title?: false | VisibleGuide<Omit<AxisTitleOptions<P>, "scale" | "position" | "target">>;
}

export interface TitleTextStyleOptions {
  /** Local text alignment; omission preserves the native owner default. */
  align?: "left" | "center" | "right";
  fontStyle?: "normal" | "italic";
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

export type CategoryValue = string | number | boolean;
export type CategoryOrderSummary = {
  field: string;
  aggregate: "sum" | "mean" | "min" | "max";
};
export type CategoryOrder =
  | {
      values: readonly CategoryValue[];
      by?: never;
      direction?: never;
    }
  | {
      values?: never;
      by: "category" | "count" | CategoryOrderSummary;
      direction?: "ascending" | "descending";
    };
export type OrderCategoriesOptions = {
  target?: string;
  channel: "x" | "y" | "theta";
} & CategoryOrder;
export interface RemoveCategoryOrderOptions {
  target?: string;
  channel: "x" | "y" | "theta";
}

export interface TitleOptions {
  /** Explicit hard lines are retained; blank lines reserve spacing without painted text. */
  text: string;
  /** Multiline subtitle with at least one non-empty hard line. */
  subtitle?: string;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: number;
  /** Signed logical-pixel shift along the selected edge; defaults to zero. */
  alongOffset?: number;
  gap?: number;
  maxWidth?: number;
  /** Both modes keep grapheme clusters intact; hard breaks preserve line spacing. */
  wrap?: "word" | "character";
  lineHeight?: number;
  /** Subtitle-only line spacing; overrides lineHeight without requiring maxWidth. */
  subtitleLineHeight?: number;
  titleStyle?: TitleTextStyleOptions;
  subtitleStyle?: TitleTextStyleOptions;
}

export interface EditTitleOptions
  extends Omit<TitleOptions, "text" | "subtitle"> {
  text?: string;
  subtitle?: string | false;
}

export interface ChartProgram extends RegisteredExtensionActions {}

type StoredCell<T> = T extends (...args: never[]) => unknown ? never
  : T extends readonly (infer Value)[] ? readonly StoredCell<Value>[]
  : T extends object ? { readonly [Key in keyof T]: StoredCell<T[Key]> }
  : T;

export type DataKeyOptions =
  | { keyField?: never; keyFields?: never; keys?: never }
  | { keyField: string; keyFields?: never; keys?: never }
  | { keyField?: never; keyFields: readonly string[]; keys?: never }
  | { keyField?: never; keyFields?: never; keys: readonly RowKey[] };
export type CreateDataOptions<Row extends object> = DataKeyOptions & {
  id?: string;
  values: readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[];
  schema?: SourceSchemaInput;
};

export type ReviseDataOptions<Row extends object> = ({ keys?: never; rowMap?: readonly (number | null)[] }
  | { keys: readonly RowKey[]; rowMap?: never }) & {
  values: readonly (Row extends readonly unknown[] ? never : Row & StoredCell<Row>)[];
  schema?: SourceSchemaInput;
  source: string;
  id: string;
};

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

  createCanvas(options?: TargetedOptions<CanvasOptions>): ChartProgram;
  editCanvas(options: TargetedOptions<CanvasOptions>): ChartProgram;
  fitCanvas(options?: TargetedOptions<FitCanvasOptions>): ChartProgram;
  applyTextMetrics(options: ApplyTextMetricsOptions): ChartProgram;
  removeTextMetrics(): ChartProgram;
  applyTheme(options: TargetedOptions<ApplyThemeOptions>): ChartProgram;
  removeTheme(): ChartProgram;
  createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram;
  applyDataUpdate(options: ApplyDataUpdateOptions): ChartProgram;
  reviseData<Row extends object>(options: TargetedOptions<ReviseDataOptions<Row>>): ChartProgram;
  removeResource(options: RemoveStoredResourceOptions): ChartProgram;
  removeData(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  removeScale(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  removeCoordinate(options: TargetedOptions<RemoveResourceOptions>): ChartProgram;
  bindMarkData(options: TargetedOptions<BindMarkDataOptions>): ChartProgram;
  filterData(options: TargetedOptions<FilterDataOptions>): ChartProgram;
  filterMarks(options: TargetedOptions<FilterMarksOptions>): ChartProgram;
  removeMarkFilter(options?: TargetedOptions<RemoveMarkFilterOptions>): ChartProgram;
  selectMarks(options: TargetedOptions<SelectMarksOptions>): ChartProgram;
  editMarkSelection(options: TargetedOptions<EditMarkSelectionOptions>): ChartProgram;
  removeMarkHighlight(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
  removeMarkSelection(options?: TargetedOptions<RemoveMarkSelectionOptions>): ChartProgram;
  highlightMarks(options: TargetedOptions<HighlightMarksOptions>): ChartProgram;
  createDensityData(options: TargetedOptions<DensityDataOptions>): ChartProgram;
  createSummaryData(options: TargetedOptions<SummaryDataOptions>): ChartProgram;
  createBinData(options: TargetedOptions<BinDataOptions>): ChartProgram;
  createFlattenData(options: TargetedOptions<FlattenDataOptions>): ChartProgram;
  createLookupData(options: TargetedOptions<LookupDataOptions>): ChartProgram;
  createPivotData(options: TargetedOptions<PivotDataOptions>): ChartProgram;
  createFoldData(options: TargetedOptions<FoldDataOptions>): ChartProgram;
  createImageResource(options: ApplyImageResourceOptions<"create">): ChartProgram;
  replaceImageResource(options: ApplyImageResourceOptions<"replace">): ChartProgram;
  createFontResource(options: ApplyFontResourceOptions<"create">): ChartProgram;
  replaceFontResource(options: ApplyFontResourceOptions<"replace">): ChartProgram;
  createImageMark(options?: TargetedOptions<CreateImageMarkOptions>): ChartProgram;
  editImageMark(options: TargetedOptions<EditImageMarkOptions>): ChartProgram;
  createHierarchyData(options: TargetedOptions<CreateHierarchyDataOptions>): ChartProgram;
  editHierarchyData(options: TargetedOptions<EditHierarchyDataOptions>): ChartProgram;
  layoutHierarchy(options: TargetedOptions<LayoutHierarchyOptions>): ChartProgram;
  editLayout(options: TargetedOptions<EditLayoutOptions>): ChartProgram;
  createTreePlot(options?: TargetedOptions<TreePlotOptions>): ChartProgram;
  createGraphPlot(options?: TargetedOptions<GraphPlotOptions>): ChartProgram;
  editGraphPlot(options: TargetedOptions<EditGraphPlotOptions>): ChartProgram;
  editTreePlot(options: TargetedOptions<EditTreePlotOptions>): ChartProgram;
  createPartitionPlot(options?: TargetedOptions<PartitionPlotOptions>): ChartProgram;
  editPartitionPlot(options: TargetedOptions<EditPartitionPlotOptions>): ChartProgram;
  createTreemapPlot(options?: TargetedOptions<TreemapPlotOptions>): ChartProgram;
  editTreemapPlot(options: TargetedOptions<EditTreemapPlotOptions>): ChartProgram;
  createParameter(options: TargetedOptions<CreateParameterOptions>): ChartProgram;
  createFlowData(options: CreateFlowDataOptions): ChartProgram;
  editFlowData(options: TargetedOptions<EditFlowDataOptions>): ChartProgram;
  layoutFlow(options: TargetedOptions<LayoutFlowOptions>): ChartProgram;
  createFlowNodes(options?: TargetedOptions<FlowNodesOptions>): ChartProgram;
  editFlowNodes(options: TargetedOptions<EditFlowNodesOptions>): ChartProgram;
  createFlowLinks(options?: TargetedOptions<FlowLinksOptions>): ChartProgram;
  editFlowLinks(options: TargetedOptions<EditFlowLinksOptions>): ChartProgram;
  createGraphData(options: CreateGraphDataOptions): ChartProgram;
  createInferredGraphData(options: CreateInferredGraphDataOptions): ChartProgram;
  editInferredGraphData(options: TargetedOptions<EditInferredGraphDataOptions>): ChartProgram;
  editGraphData(options: TargetedOptions<EditGraphDataOptions>): ChartProgram;
  layoutGraph(options: TargetedOptions<LayoutGraphOptions>): ChartProgram;
  editParameter(options: TargetedOptions<EditParameterOptions>): ChartProgram;
  removeParameter(options: TargetedOptions<RemoveParameterOptions>): ChartProgram;
  createComputedData(options: TargetedOptions<ComputedDataOptions>): ChartProgram;
  createNormalizedData(options: TargetedOptions<NormalizedDataOptions>): ChartProgram;
  createCompleteData(options: TargetedOptions<CompleteDataOptions>): ChartProgram;
  createImputedData(options: TargetedOptions<ImputedDataOptions>): ChartProgram;
  createStackData(options: TargetedOptions<StackDataOptions>): ChartProgram;
  createRegressionData(options: TargetedOptions<RegressionDataOptions>): ChartProgram;
  createRegressionStatisticsData(options: TargetedOptions<RegressionStatisticsDataOptions>): ChartProgram;
  editRegressionStatisticsData(options?: TargetedOptions<EditRegressionStatisticsDataOptions>): ChartProgram;
  createIntervalData(options: TargetedOptions<IntervalDataOptions>): ChartProgram;
  createECDFData(options: TargetedOptions<ECDFDataOptions>): ChartProgram;
  createTimeUnitData(options: TargetedOptions<TimeUnitDataOptions>): ChartProgram;
  createWindowData(options: TargetedOptions<WindowDataOptions>): ChartProgram;
  createBin2DData(options: TargetedOptions<Bin2DDataOptions>): ChartProgram;
  createSortedData(options: TargetedOptions<SortedDataOptions>): ChartProgram;
  editDerivedData(options: TargetedOptions<EditDerivedDataOptions>): ChartProgram;
  editComputedData(options: TargetedOptions<EditComputedDataOptions>): ChartProgram;
  editFilteredData(options: TargetedOptions<EditFilteredDataOptions>): ChartProgram;
  editFlattenData(options: TargetedOptions<EditFlattenDataOptions>): ChartProgram;
  editLookupData(options: TargetedOptions<EditLookupDataOptions>): ChartProgram;
  editPivotData(options: TargetedOptions<EditPivotDataOptions>): ChartProgram;
  editFoldData(options: TargetedOptions<EditFoldDataOptions>): ChartProgram;
  editSummaryData(options: TargetedOptions<EditSummaryDataOptions>): ChartProgram;
  editBinData(options: TargetedOptions<EditBinDataOptions>): ChartProgram;
  editTimeUnitData(options: TargetedOptions<EditTimeUnitDataOptions>): ChartProgram;
  editWindowData(options: TargetedOptions<EditWindowDataOptions>): ChartProgram;
  editDensityData(options: TargetedOptions<EditDensityDataOptions>): ChartProgram;
  editStackData(options: TargetedOptions<EditStackDataOptions>): ChartProgram;
  editRegressionData(options: TargetedOptions<EditRegressionDataOptions>): ChartProgram;
  editSortedData(options: TargetedOptions<EditSortedDataOptions>): ChartProgram;
  editIntervalData(options: TargetedOptions<EditIntervalDataOptions>): ChartProgram;
  editECDFData(options: TargetedOptions<EditECDFDataOptions>): ChartProgram;
  editNormalizedData(options: TargetedOptions<EditNormalizedDataOptions>): ChartProgram;
  editCompleteData(options: TargetedOptions<EditCompleteDataOptions>): ChartProgram;
  editImputedData(options: TargetedOptions<EditImputedDataOptions>): ChartProgram;
  editBin2DData(options: TargetedOptions<EditBin2DDataOptions>): ChartProgram;

  /** One point layer accepts at most 50,000 selected rows, before missing-value filtering. */
  createPointMark(options?: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    id?: string;
    data?: string;
    missing?: "error" | "skip";
    shape?: PointShape;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  }>): ChartProgram;
  editPointMark(options: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    target?: string;
    missing?: "error" | "skip";
    shape?: PointShape;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  }>): ChartProgram;
  createTickMark(options?: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    id?: string;
    data?: string;
    missing?: "error" | "skip";
    length?: number;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }>): ChartProgram;
  editTickMark(options: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    target?: string;
    missing?: "error" | "skip";
    length?: number;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  }>): ChartProgram;
  jitterPoints(options: TargetedOptions<JitterPointsOptions>): ChartProgram;
  removeJitter(options?: TargetedOptions<RemoveJitterOptions>): ChartProgram;
  packPoints(options: TargetedOptions<PackPointsOptions>): ChartProgram;
  removePointPacking(options?: TargetedOptions<RemovePointPackingOptions>): ChartProgram;
  createLineMark(options?: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    missing?: "error" | "break";
    id?: string;
    data?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    tension?: number;
    stroke?: string;
    opacity?: number;
    closed?: boolean;
  }>): ChartProgram;
  editLineMark(options: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    missing?: "error" | "break";
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    tension?: number;
    stroke?: string;
    opacity?: number;
    closed?: boolean;
  }>): ChartProgram;
  createBarMark(options?: TargetedOptions<RectStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    id?: string;
    data?: string;
    orientation?: "vertical" | "horizontal";
    missing?: "error" | "skip";
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  }>): ChartProgram;
  editBarMark(options: TargetedOptions<RectStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    target?: string;
    missing?: "error" | "skip";
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: FilledMarkStroke;
    strokeWidth?: number;
  }>): ChartProgram;
  createAreaMark(options?: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    id?: string;
    data?: string;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    missing?: "error" | "break";
  }>): ChartProgram;
  createArcMark(options?: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    id?: string;
    data?: string;
    innerRadius?: ArcInnerRadius;
    padAngle?: number;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
  }>): ChartProgram;
  editArcMark(options: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    target?: string;
    innerRadius?: ArcInnerRadius;
    padAngle?: number;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
  }>): ChartProgram;
  createRectMark(options?: TargetedOptions<RectMarkOptions>): ChartProgram;
  editRectMark(options: TargetedOptions<EditRectMarkOptions>): ChartProgram;
  createRuleMark(options?: TargetedOptions<{ clip?: boolean; id?: string; data?: string; missing?: "error" | "skip" } & RuleStyleOptions>): ChartProgram;
  editRuleMark(options: TargetedOptions<{ clip?: boolean; target?: string; missing?: "error" | "skip" } & RuleStyleOptions>): ChartProgram;
  createTextMark(options?: TargetedOptions<TextMarkOptions>): ChartProgram;
  createTextPlot(options: TargetedOptions<CreateTextPlotOptions>): ChartProgram;
  createMarkLabels(options?: TargetedOptions<CreateMarkLabelsOptions>): ChartProgram;
  editMarkLabelSelection(options: TargetedOptions<EditMarkLabelSelectionOptions>): ChartProgram;
  editMarkLabelPlacement(options: TargetedOptions<EditMarkLabelPlacementOptions>): ChartProgram;
  removeMarkLabels(options: TargetedOptions<RemoveMarkLabelsOptions>): ChartProgram;
  createAnnotation(options: TargetedOptions<CreateAnnotationOptions>): ChartProgram;
  createStatisticalReference(options: TargetedOptions<CreateStatisticalReferenceOptions>): ChartProgram;
  createOverlay(options?: TargetedOptions<CreateOverlayOptions>): ChartProgram;
  createLayerPlot(options: TargetedOptions<CreateLayerPlotOptions>): ChartProgram;
  createAdjacentPlot(options?: TargetedOptions<CreateAdjacentPlotOptions>): ChartProgram;
  editCompositionScales(options: TargetedOptions<EditCompositionScalesOptions>): ChartProgram;
  editOverlay(options: TargetedOptions<EditOverlayOptions>): ChartProgram;
  createReferenceLine(options: TargetedOptions<CreateReferenceLineOptions>): ChartProgram;
  createReferenceBand(options: TargetedOptions<CreateReferenceBandOptions>): ChartProgram;
  editTextMark(options: TargetedOptions<EditTextMarkOptions>): ChartProgram;
  layoutLabels(options?: TargetedOptions<LabelLayoutOptions>): ChartProgram;
  removeLabelLayout(options?: TargetedOptions<RemoveLabelLayoutOptions>): ChartProgram;
  editAreaMark(options: TargetedOptions<StrokeStyleDetails & {
    blend?: BlendMode;
  shadow?: MarkShadow | false;
    clip?: boolean;
    target?: string;
    fill?: FillPaint;
    outline?: MarkOutline | false;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
    curve?: CurveInterpolation;
    missing?: "error" | "break";
  }>): ChartProgram;

  encodeX(options: TargetedOptions<PositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<PositionEncodingOptions | DatumPositionEncodingOptions>>): ChartProgram;
  encodeY(options: TargetedOptions<YPositionEncodingOptions | DatumPositionEncodingOptions | ConditionalEncodingOptions<YPositionEncodingOptions | DatumPositionEncodingOptions>>): ChartProgram;
  encodeTheta(options: TargetedOptions<ThetaEncodingOptions | ConditionalEncodingOptions<ThetaEncodingOptions>>): ChartProgram;
  encodeR(options: TargetedOptions<RadialEncodingOptions | ConditionalEncodingOptions<RadialEncodingOptions>>): ChartProgram;
  encodeX2(options: TargetedOptions<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>): ChartProgram;
  encodeColor(options: TargetedOptions<ColorEncodingOptions | ConditionalEncodingOptions<ColorEncodingOptions>>): ChartProgram;
  encodeStrokeDash(options: TargetedOptions<StrokeDashEncodingOptions | ConditionalEncodingOptions<StrokeDashEncodingOptions>>): ChartProgram;
  encodeSize(options: TargetedOptions<SizeEncodingOptions | ConditionalEncodingOptions<SizeEncodingOptions>>): ChartProgram;
  encodeShape(options: TargetedOptions<ShapeEncodingOptions | ConditionalEncodingOptions<ShapeEncodingOptions>>): ChartProgram;
  encodeAngle(options: TargetedOptions<AngleEncodingOptions | ConditionalEncodingOptions<AngleEncodingOptions>>): ChartProgram;
  encodeOpacity(options: TargetedOptions<OpacityEncodingOptions | ConditionalEncodingOptions<OpacityEncodingOptions>>): ChartProgram;
  encodeRadius(options: TargetedOptions<{ value: number; target?: string } | ConditionalEncodingOptions<{ value: number }>>): ChartProgram;
  encodePointRadius(options: TargetedOptions<{ value: number; target?: string } | ConditionalEncodingOptions<{ value: number }>>): ChartProgram;
  removePointRadius(options?: TargetedOptions<{ target?: string }>): ChartProgram;
  encodeXOffset(options: TargetedOptions<XOffsetEncodingOptions | ConditionalEncodingOptions<XOffsetEncodingOptions>>): ChartProgram;
  encodeYOffset(options: TargetedOptions<YOffsetEncodingOptions | ConditionalEncodingOptions<YOffsetEncodingOptions>>): ChartProgram;
  encodeY2(options: TargetedOptions<SecondaryPositionEncodingOptions | ConditionalEncodingOptions<SecondaryPositionEncodingOptions>>): ChartProgram;
  encodeYRange(options: TargetedOptions<RangePositionEncodingOptions>): ChartProgram;
  encodeXRange(options: TargetedOptions<RangePositionEncodingOptions>): ChartProgram;
  encodeGroup(options: TargetedOptions<GroupEncodingOptions>): ChartProgram;
  layoutSeries(options: TargetedOptions<SeriesLayoutOptions>): ChartProgram;
  encodePathOrder(options: TargetedOptions<PathOrderEncodingOptions>): ChartProgram;
  orderCategories(options: TargetedOptions<OrderCategoriesOptions>): ChartProgram;
  encodeParallelCoordinates(options: TargetedOptions<ParallelCoordinatesEncodingOptions>): ChartProgram;
  removePathOrder(options?: TargetedOptions<RemovePathOrderOptions>): ChartProgram;
  removeCategoryOrder(options: TargetedOptions<RemoveCategoryOrderOptions>): ChartProgram;
  removeEncoding(options: TargetedOptions<{
    target?: string;
    channel:
      | "x" | "y" | "x2" | "y2" | "xOffset" | "yOffset"
      | "theta" | "radius" | "color" | "stroke" | "strokeDash" | "strokeWidth"
      | "size" | "shape" | "angle" | "group" | "opacity" | "text" | "dx" | "dy";
  }>): ChartProgram;
  encodeText(options: TargetedOptions<TextEncodingOptions | ConditionalEncodingOptions<TextEncodingOptions>>): ChartProgram;
  encodeDx(options: TargetedOptions<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>): ChartProgram;
  encodeDy(options: TargetedOptions<TextOffsetEncodingOptions | ConditionalEncodingOptions<TextOffsetEncodingOptions>>): ChartProgram;
  encodeHistogram(options: TargetedOptions<HistogramEncodingOptions>): ChartProgram;
  encodeDensity(options: TargetedOptions<DensityEncodingOptions>): ChartProgram;
  editDensity(options: TargetedOptions<EditDensityOptions>): ChartProgram;
  encodeHorizon(options?: TargetedOptions<HorizonEncodingOptions>): ChartProgram;
  editHorizon(options: TargetedOptions<EditHorizonOptions>): ChartProgram;
  encodeBarWidth(options?: TargetedOptions<BarWidthOptions>): ChartProgram;
  encodeStroke(options: TargetedOptions<StrokeEncodingOptions | ConditionalEncodingOptions<StrokeEncodingOptions>>): ChartProgram;
  encodeStrokeWidth(options: TargetedOptions<StrokeWidthEncodingOptions | ConditionalEncodingOptions<StrokeWidthEncodingOptions>>): ChartProgram;
  encodeChannels(options: TargetedOptions<EncodeChannelsOptions>): ChartProgram;

  createRegression(options?: TargetedOptions<RegressionOptions>): ChartProgram;
  editRegression(options: TargetedOptions<EditRegressionOptions>): ChartProgram;
  createErrorBar(options?: TargetedOptions<ErrorBarOptions>): ChartProgram;
  editErrorBar(options: TargetedOptions<EditErrorBarOptions>): ChartProgram;
  createErrorBand(options?: TargetedOptions<ErrorBandOptions>): ChartProgram;
  editErrorBand(options: TargetedOptions<EditErrorBandOptions>): ChartProgram;
  editErrorBandBoundary(options: TargetedOptions<EditErrorBandBoundaryOptions>): ChartProgram;
  createBoxPlot(options?: TargetedOptions<BoxPlotOptions>): ChartProgram;
  editBoxPlot(options: TargetedOptions<EditBoxPlotOptions>): ChartProgram;
  createGradientPlot(options?: TargetedOptions<GradientPlotOptions>): ChartProgram;
  editGradientPlot(options: TargetedOptions<EditGradientPlotOptions>): ChartProgram;
  createViolinPlot(options: TargetedOptions<ViolinPlotOptions>): ChartProgram;
  editViolinPlot(options: TargetedOptions<EditViolinPlotOptions>): ChartProgram;
  createScatterPlot(options: TargetedOptions<CreateScatterPlotOptions>): ChartProgram;
  createIntervalPlot(options: TargetedOptions<CreateIntervalPlotOptions>): ChartProgram;
  createRegressionPlot(options: TargetedOptions<CreateRegressionPlotOptions>): ChartProgram;
  createDotPlot(options: TargetedOptions<CreateDotPlotOptions>): ChartProgram;
  createLollipopPlot(options: TargetedOptions<CreateLollipopPlotOptions>): ChartProgram;
  createDumbbellPlot(options: TargetedOptions<CreateDumbbellPlotOptions>): ChartProgram;
  editEndpointPlot(options: TargetedOptions<EditEndpointPlotOptions>): ChartProgram;
  createECDFPlot(options: TargetedOptions<CreateECDFPlotOptions>): ChartProgram;
  editECDFPlot(options: TargetedOptions<EditECDFPlotOptions>): ChartProgram;
  createLinePlot(options: TargetedOptions<CreateLinePlotOptions>): ChartProgram;
  createPolarScatterPlot(options: TargetedOptions<CreatePolarScatterPlotOptions>): ChartProgram;
  createPolarLinePlot(options: TargetedOptions<CreatePolarLinePlotOptions>): ChartProgram;
  createRadarPlot(options: TargetedOptions<CreateRadarPlotOptions>): ChartProgram;
  editRadarPlot(options: TargetedOptions<EditRadarPlotOptions>): ChartProgram;
  createRugPlot(options: TargetedOptions<CreateRugPlotOptions>): ChartProgram;
  createStripPlot(options: TargetedOptions<CreateStripPlotOptions>): ChartProgram;
  createBeeswarmPlot(options: TargetedOptions<CreateBeeswarmPlotOptions>): ChartProgram;
  createRaincloudPlot(options: TargetedOptions<CreateRaincloudPlotOptions>): ChartProgram;
  editRaincloudPlot(options: TargetedOptions<EditRaincloudPlotOptions>): ChartProgram;
  createAreaPlot(options: TargetedOptions<CreateAreaPlotOptions>): ChartProgram;
  createBarPlot(options: TargetedOptions<CreateBarPlotOptions>): ChartProgram;
  createHistogram(options: TargetedOptions<CreateHistogramOptions>): ChartProgram;
  createPiePlot(options: TargetedOptions<CreatePiePlotOptions>): ChartProgram;
  createRosePlot(options: TargetedOptions<CreateRosePlotOptions>): ChartProgram;
  createRadialBarPlot(options: TargetedOptions<CreateRadialBarPlotOptions>): ChartProgram;
  createDensityPlot(options: TargetedOptions<CreateDensityPlotOptions>): ChartProgram;
  createHorizonPlot(options: TargetedOptions<CreateHorizonPlotOptions>): ChartProgram;
  createHeatmap(options: TargetedOptions<CreateHeatmapOptions>): ChartProgram;
  createParallelCoordinates(options: TargetedOptions<CreateParallelCoordinatesOptions>): ChartProgram;
  removeMark(options?: TargetedOptions<RemoveMarkOptions>): ChartProgram;
  createParallelAxes(options?: TargetedOptions<ParallelAxesOptions>): ChartProgram;
  createParallelAxis(options: TargetedOptions<CreateParallelAxisOptions>): ChartProgram;
  editParallelAxis(options: TargetedOptions<EditParallelAxisOptions>): ChartProgram;
  removeParallelAxis(options: TargetedOptions<RemoveParallelAxisOptions>): ChartProgram;
  removeParallelAxes(options?: TargetedOptions<ParallelAxesOptions>): ChartProgram;
  createAxes(options?: TargetedOptions<CreateAxesOptions>): ChartProgram;
  editAxes(options: TargetedOptions<EditAxesOptions>): ChartProgram;
  createXAxis(options?: TargetedOptions<CompleteAxisOptions<XAxisPosition>>): ChartProgram;
  createYAxis(options?: TargetedOptions<CompleteAxisOptions<YAxisPosition>>): ChartProgram;
  createThetaAxis(options?: TargetedOptions<CompleteThetaAxisOptions>): ChartProgram;
  createRadialAxis(options?: TargetedOptions<CompleteRadialAxisOptions>): ChartProgram;
  createThetaAxisLine(options?: TargetedOptions<CreateThetaAxisLineOptions>): ChartProgram;
  createRadialAxisLine(options?: TargetedOptions<CreateRadialAxisLineOptions>): ChartProgram;
  createThetaAxisTicks(options?: TargetedOptions<CreateThetaAxisTicksOptions>): ChartProgram;
  createRadialAxisTicks(options?: TargetedOptions<CreateRadialAxisTicksOptions>): ChartProgram;
  createThetaAxisLabels(options?: TargetedOptions<CreateThetaAxisLabelsOptions>): ChartProgram;
  createRadialAxisLabels(options?: TargetedOptions<CreateRadialAxisLabelsOptions>): ChartProgram;
  createThetaAxisTitle(options?: TargetedOptions<CreateThetaAxisTitleOptions>): ChartProgram;
  createRadialAxisTitle(options?: TargetedOptions<CreateRadialAxisTitleOptions>): ChartProgram;
  editThetaAxisLine(options?: TargetedOptions<AxisLineStyleOptions>): ChartProgram;
  editRadialAxisLine(options?: TargetedOptions<AxisLineStyleOptions>): ChartProgram;
  editThetaAxisTicks(options?: TargetedOptions<PolarTickOptions>): ChartProgram;
  editRadialAxisTicks(options?: TargetedOptions<PolarTickOptions>): ChartProgram;
  editThetaAxisLabels(options?: TargetedOptions<ThetaAxisLabelOptions>): ChartProgram;
  editRadialAxisLabels(options?: TargetedOptions<PolarLabelOptions>): ChartProgram;
  editThetaAxisTitle(options?: TargetedOptions<PolarTitleOptions>): ChartProgram;
  editRadialAxisTitle(options?: TargetedOptions<RadialTitleOptions>): ChartProgram;
  createXAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; scale?: string; position?: XAxisPosition }>): ChartProgram;
  createYAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; scale?: string; position?: YAxisPosition }>): ChartProgram;
  editXAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; position?: XAxisPosition }>): ChartProgram;
  editYAxisLine(options?: TargetedOptions<AxisLineStyleOptions & { target?: string; position?: YAxisPosition }>): ChartProgram;
  createXAxisTicks(options?: TargetedOptions<AxisTickOptions<XAxisPosition>>): ChartProgram;
  createYAxisTicks(options?: TargetedOptions<AxisTickOptions<YAxisPosition>>): ChartProgram;
  editXAxisTicks(options?: TargetedOptions<Omit<AxisTickOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTicks(options?: TargetedOptions<Omit<AxisTickOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisLabels(options?: TargetedOptions<AxisLabelOptions<XAxisPosition>>): ChartProgram;
  createYAxisLabels(options?: TargetedOptions<AxisLabelOptions<YAxisPosition>>): ChartProgram;
  editXAxisLabels(options?: TargetedOptions<Omit<AxisLabelOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisLabels(options?: TargetedOptions<Omit<AxisLabelOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisTicksAndLabels(options?: TargetedOptions<AxisTicksAndLabelsOptions<XAxisPosition>>): ChartProgram;
  createYAxisTicksAndLabels(options?: TargetedOptions<AxisTicksAndLabelsOptions<YAxisPosition>>): ChartProgram;
  editXAxisTicksAndLabels(options: TargetedOptions<Omit<AxisTicksAndLabelsOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTicksAndLabels(options: TargetedOptions<Omit<AxisTicksAndLabelsOptions<YAxisPosition>, "scale">>): ChartProgram;
  createXAxisTitle(options?: TargetedOptions<AxisTitleOptions<XAxisPosition>>): ChartProgram;
  createYAxisTitle(options?: TargetedOptions<AxisTitleOptions<YAxisPosition>>): ChartProgram;
  editXAxisTitle(options?: TargetedOptions<Omit<AxisTitleOptions<XAxisPosition>, "scale">>): ChartProgram;
  editYAxisTitle(options?: TargetedOptions<Omit<AxisTitleOptions<YAxisPosition>, "scale">>): ChartProgram;
  editXAxis(options: TargetedOptions<EditAxisOptions<XAxisPosition>>): ChartProgram;
  editYAxis(options: TargetedOptions<EditAxisOptions<YAxisPosition>>): ChartProgram;
  editThetaAxis(options: TargetedOptions<EditThetaAxisOptions>): ChartProgram;
  editRadialAxis(options: TargetedOptions<EditRadialAxisOptions>): ChartProgram;
  removeXAxis(options?: TargetedOptions<RemoveAxisOptions>): ChartProgram;
  removeYAxis(options?: TargetedOptions<RemoveAxisOptions>): ChartProgram;
  removeThetaAxis(options?: TargetedOptions<Omit<RemoveAxisOptions, "target">>): ChartProgram;
  removeRadialAxis(options?: TargetedOptions<Omit<RemoveAxisOptions, "target">>): ChartProgram;
  createGrid(options?: TargetedOptions<CreateGridOptions>): ChartProgram;
  createHorizontalGrid(options?: TargetedOptions<GridDirectionOptions>): ChartProgram;
  createVerticalGrid(options?: TargetedOptions<GridDirectionOptions>): ChartProgram;
  createThetaGrid(options?: TargetedOptions<PolarGridOptions>): ChartProgram;
  createRadialGrid(options?: TargetedOptions<PolarGridOptions>): ChartProgram;
  editHorizontalGrid(options: TargetedOptions<EditGridOptions>): ChartProgram;
  editVerticalGrid(options: TargetedOptions<EditGridOptions>): ChartProgram;
  editThetaGrid(options: TargetedOptions<EditPolarGridOptions>): ChartProgram;
  editRadialGrid(options: TargetedOptions<EditPolarGridOptions>): ChartProgram;
  editGrid(options: TargetedOptions<EditGridDirectionsOptions>): ChartProgram;
  removeGrid(options?: TargetedOptions<RemoveGridOptions>): ChartProgram;
  /** Combined categorical and size legends support all four edges and plot corners with layout "edge". */
  createLegend(options?: TargetedOptions<LegendOptions>): ChartProgram;
  editLegend(options: TargetedOptions<EditLegendOptions>): ChartProgram;
  editLegendBlock(options: TargetedOptions<EditLegendBlockOptions>): ChartProgram;
  editLegendLayout(options: TargetedOptions<EditLegendLayoutOptions>): ChartProgram;
  editLegendLabels(options: TargetedOptions<EditLegendLabelsOptions>): ChartProgram;
  editLegendTitle(options: TargetedOptions<EditLegendTitleOptions>): ChartProgram;
  editLegendSymbols(options: TargetedOptions<EditLegendSymbolsOptions>): ChartProgram;
  editLegendBorder(options: TargetedOptions<EditLegendBorderOptions>): ChartProgram;
  removeLegend(options?: TargetedOptions<RemoveLegendOptions>): ChartProgram;
  createGuides(options?: TargetedOptions<CreateGuidesOptions>): ChartProgram;
  /** Omit target for one overall unit/facet/concat title; childPath targets one view. */
  createTitle(options: TargetedOptions<TitleOptions>): ChartProgram;
  /** Edit the selected view title, or the overall composition title when target is omitted. */
  editTitle(options: TargetedOptions<EditTitleOptions>): ChartProgram;
  removeTitle(): ChartProgram;

  createCoordinate(options?: TargetedOptions<CreateCoordinateOptions>): ChartProgram;
  editCoordinate(options: TargetedOptions<EditCoordinateOptions>): ChartProgram;
  createScale(options: TargetedOptions<CreateScaleOptions>): ChartProgram;
  editScale(options: TargetedOptions<EditScaleOptions>): ChartProgram;
  editXScale(options: TargetedOptions<EditXScaleOptions>): ChartProgram;
  editYScale(options: TargetedOptions<EditYScaleOptions>): ChartProgram;
  editXOffsetScale(options: TargetedOptions<EditXOffsetScaleOptions>): ChartProgram;
  editYOffsetScale(options: TargetedOptions<EditYOffsetScaleOptions>): ChartProgram;
  editParallelScale(options: TargetedOptions<EditParallelScaleOptions>): ChartProgram;
  editThetaScale(options: TargetedOptions<EditThetaScaleOptions>): ChartProgram;
  editRScale(options: TargetedOptions<EditRScaleOptions>): ChartProgram;
  editColorScale(options: TargetedOptions<EditColorScaleOptions>): ChartProgram;
  editStrokeScale(options: TargetedOptions<EditStrokeScaleOptions>): ChartProgram;
  editSizeScale(options: TargetedOptions<EditSizeScaleOptions>): ChartProgram;
  editOpacityScale(options: TargetedOptions<EditOpacityScaleOptions>): ChartProgram;
  editShapeScale(options: TargetedOptions<EditShapeScaleOptions>): ChartProgram;
  editStrokeWidthScale(options: TargetedOptions<EditStrokeWidthScaleOptions>): ChartProgram;
  editStrokeDashScale(options: TargetedOptions<EditStrokeDashScaleOptions>): ChartProgram;
  createDerivedData(options: TargetedOptions<CreateDerivedDataOptions>): ChartProgram;
  createRegressionBand(options: TargetedOptions<CreateRegressionBandOptions>): ChartProgram;
  editRegressionBand(options: TargetedOptions<StrokeStyleDetails & {
    target?: string;
    color?: string;
    opacity?: number;
    stroke?: string | false;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }>): ChartProgram;
  createRegressionLine(options: TargetedOptions<CreateRegressionLineOptions>): ChartProgram;
  editRegressionLine(options: TargetedOptions<StrokeStyleDetails & {
    target?: string;
    strokeWidth?: number;
    curve?: CurveInterpolation;
  }>): ChartProgram;

  editCompositionLayout(options: TargetedOptions<EditCompositionLayoutOptions>): ChartProgram;
  replaceCompositionChild(options: TargetedOptions<ReplaceCompositionChildOptions>): ChartProgram;
  insertCompositionChild(options: TargetedOptions<InsertCompositionChildOptions>): ChartProgram;
  removeCompositionChild(options: TargetedOptions<RemoveCompositionChildOptions>): ChartProgram;
  reorderCompositionChildren(options: TargetedOptions<ReorderCompositionChildrenOptions>): ChartProgram;
  facet(options: TargetedOptions<FacetOptions>): ChartProgram;
  facetGrid(options: TargetedOptions<FacetGridOptions>): ChartProgram;
  repeatCharts(options: TargetedOptions<RepeatChartsOptions>): ChartProgram;
  editFacetSource(options: TargetedOptions<EditFacetSourceOptions>): ChartProgram;
  editFacetScales(options: TargetedOptions<FacetScaleResolutions>): ChartProgram;
  editFacetGuides(options: TargetedOptions<FacetGuideOptions>): ChartProgram;
  editFacetHeaders(options: TargetedOptions<EditFacetHeadersOptions>): ChartProgram;

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
