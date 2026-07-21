# Shared formal notation

이 registry는 현재 호출 가능한 값과 future candidate를 문법적으로 분리한다.

- **Implemented** code block만 현재 API 계약이다.
- **Planned (NOT IMPLEMENTED)**는 사용자와 계약이 합의됐지만 아직 public type/runtime에는 없다.
- **Proposed (NOT IMPLEMENTED)** code block은 구현, TypeScript declaration, public docs 또는 runtime
  validation에 아직 존재하지 않는다.
- **Maybe Future (NOT IMPLEMENTED)**는 active design review 대상이 아니며 public API에 존재하지 않는다.
  구체적인 chart/extension 요구가 생기면 Proposed로 다시 승격해 검토한다.
- `—`는 현재 proposed parameter/value가 없다는 뜻이다.
- 아래 type alias는 문서용 formal notation이며 새로운 runtime export가 아니다.

```typescript
type UserId = string;                 // non-empty, identifier grammar 통과
type FieldName = string;              // non-empty dataset field name
type NonEmptyString = string;
type Finite = number;                 // Number.isFinite(value)
type PositiveFinite = number;         // finite && value > 0
type NonNegativeFinite = number;      // finite && value >= 0
type UnitInterval = number;           // finite && 0 <= value <= 1
type UnitIntervalExclusive = number;  // finite && 0 < value < 1
type PositiveInteger = number;        // Number.isInteger(value) && value > 0
type IntegerAtLeast2 = number;        // Number.isInteger(value) && value >= 2
type NonNegativeInteger = number;     // Number.isInteger(value) && value >= 0
type FontWeight = NonEmptyString | Finite;
type Margin = NonNegativeFinite | {
  top?: NonNegativeFinite;
  right?: NonNegativeFinite;
  bottom?: NonNegativeFinite;
  left?: NonNegativeFinite;
};
type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
type ScalarAggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";

type ParameterizedAggregateOperation =
  | { op: "quantile"; probability: UnitInterval }
  | {
      op: "first" | "last";
      orderBy: FieldName;
      order?: "ascending" | "descending";
    };

type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal"
  | "sequential" | "quantize" | "quantile" | "threshold";
type ContinuousDomain = "auto" | readonly [unknown, unknown];
type OrdinalDomain = "auto" | readonly unknown[];
type NumericRange = "auto" | readonly [Finite, Finite];
type OrderedFinitePair = readonly [Finite, Finite]; // first <= second
type ColorRange = readonly NonEmptyString[] | { palette: Palette };
type ShapeRange = readonly PointShape[];
type GeneratedChildId = `${UserId}:${NonNegativeInteger}`;
type FilterTransform = {
  type: "filter";
  field: FieldName;
  oneOf: readonly unknown[];
};
type LinearRegressionTransform = {
  type: "regression";
  method: "linear";
  x: FieldName;
  y: FieldName;
  groupBy?: FieldName;
  confidence: UnitIntervalExclusive;
  interval: "mean";
};
type GaussianDensityTransform = {
  type: "density";
  field: FieldName;
  groupBy?: FieldName;
  bandwidth: "auto" | PositiveFinite;
  extent: "auto" | OrderedFinitePair;
  steps: IntegerAtLeast2;
  as: readonly [FieldName, FieldName];
  resolved?: {
    bandwidth: PositiveFinite;
    extent: OrderedFinitePair;
  };
};
type PositionScale = {
  id?: UserId;
  type?: "linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "band" | "point";
  domain?: ContinuousDomain | OrdinalDomain;
  range?: NumericRange;
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  unknown?: Finite;
};
type ColorScale = {
  id?: UserId;
  type?: "ordinal";
  domain?: OrdinalDomain;
  range?: "auto" | readonly NonEmptyString[];
  palette?: Palette;
};
type DashPattern = readonly NonNegativeFinite[]; // even length
type DashScale = {
  id?: UserId;
  type?: "ordinal";
  domain?: OrdinalDomain;
  range?: "auto" | readonly DashPattern[];
};
type DatasetProperty = "source" | "transform" | "values";
type ScaledEncodingChannel = "x" | "y" | "y2" | "xOffset" | "theta" | "radius" | "color" | "strokeDash" | "size" | "shape" | "opacity";
type LayerProperty =
  | "data" | "coordinate" | "transform" | "mark.type"
  | `encoding.${ScaledEncodingChannel}.${"field" | "datum" | "fieldType" | "scale"}`
  | `encoding.group.${"field" | "datum" | "fieldType"}`
  | "encoding.x.bin.maxBins" | "encoding.y.aggregate" | "encoding.y.stack";
type ScaleProperty = "type" | "domain" | "range" | "nice" | "zero";
type GuideProperty =
  | `axis.${"x" | "y"}.${"scale" | "coordinate" | "title"}`
  | `legend.${"color" | "size" | "opacity"}.${"scale" | "title"}`
  | "legend.series.channels" | "legend.series.scales" | "legend.series.title"
  | `grid.${"horizontal" | "vertical"}.${"scale" | "coordinate"}`;
type SemanticPropertyPath =
  | `dataset[${UserId}].${DatasetProperty}`
  | `layer[${UserId}].${LayerProperty}`
  | `scale[${UserId}].${ScaleProperty}`
  | `coordinate[${UserId}].type`
  | `guide.${GuideProperty}`
  | `title.${"text" | "subtitle"}`;
type ValueForSemanticPath<P extends SemanticPropertyPath> = unknown; // P별 semantic value schema
type CanvasProperty = "width" | "height" | "background";
type CircleProperty = "x" | "y" | "radius" | "fill" | "stroke" | "strokeWidth" | "opacity" | "length";
type RectProperty = "x" | "y" | "width" | "height" | "fill" | "stroke" | "strokeWidth" | "opacity" | "length";
type LineProperty = "x1" | "y1" | "x2" | "y2" | "stroke" | "strokeWidth" | "strokeDash" | "opacity" | "length";
type TextProperty = "x" | "y" | "text" | "fill" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign" | "textBaseline" | "rotation" | "opacity" | "length";
type PathProperty = "points" | "fill" | "stroke" | "strokeWidth" | "strokeDash" | "closed" | "opacity" | "length";
type CollectionProperty = "items" | Exclude<CircleProperty | RectProperty | LineProperty | TextProperty | PathProperty, "length">;
type GraphicPropertyForTarget = CanvasProperty | CircleProperty | RectProperty | LineProperty | TextProperty | PathProperty | CollectionProperty;
type GraphicValueForProperty = unknown; // target type + property별 concrete graphic value schema
type TextStyle = {
  color?: NonEmptyString;
  fontSize?: PositiveFinite;
  fontFamily?: NonEmptyString;
  fontWeight?: FontWeight;
};
```
