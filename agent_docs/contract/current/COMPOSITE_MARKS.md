# Current Composite Mark contracts

Composite appearance objects reuse ordinary mark style ownership. `box` accepts `cornerRadius`, `lineCap`,
`lineJoin`, and `miterLimit`; whisker, cap, median, outlier, and other strokable child styles accept the three
stroke details appropriate to their Rule or Point family. Create/edit actions forward the requested fields to every
generated child and preserve them during topology/statistics replay. Exact values and errors are defined by
[the shared mark-style contract](MARKS.md#shared-stroke-and-rounded-rectangle-style-details).

## `createBoxPlot`

```typescript
createBoxPlot({
  id?: UserId;
  target?: UserId;
  data?: UserId;
  x?: PositionChannel;
  y?: PositionChannel;
  coordinate?: UserId;
  whisker?:
    | { type?: "tukey"; factor?: PositiveFinite }
    | { type: "minmax"; factor?: never };
  summary?: BoxPlotSummaryFields;
  width?: { band?: UnitIntervalExclusive } | { pixels: PositiveFinite };
  outliers?: boolean;
  box?: {
    fill?: NonEmptyString;
    opacity?: UnitInterval;
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
    cornerRadius?: NonNegativeFinite;
    lineCap?: LineCap;
    lineJoin?: LineJoin;
    miterLimit?: PositiveFinite;
  };
  median?: {
    width?: { pixels: PositiveFinite } | "auto";
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
    lineCap?: LineCap;
    lineJoin?: LineJoin;
    miterLimit?: PositiveFinite;
  };
  outlier?: {
    shape?: PointShape;
    radius?: PositiveFinite;
    opacity?: UnitInterval;
    lineCap?: LineCap;
    lineJoin?: LineJoin;
    miterLimit?: PositiveFinite;
  };
  guides?: false | CreateGuidesOptions;
} = {}): ChartProgram;
```

- Exactly one position is categorical and the other is quantitative. Categorical x produces vertical boxes;
  categorical y produces horizontal boxes. Omitted x/y는 current 또는 unique compatible encoded source에서
  data, coordinate와 scale과 함께 추론한다. 아니면 `createBoxPlot()`이 owner를 먼저 만들고 later
  `encodeX`/`encodeY`가 완성할 수 있다.
- Data resolution은 explicit `data`, inferred source data, current data, unique dataset 순서다. Multiple datasets
  또는 compatible source가 ambiguous하면 임의 선택하지 않고 explicit `data`/`target` 또는 x/y를 요구한다.
- Omitted first ID는 `boxPlot`이다. Summary/outlier datasets와 whisker/cap, median, outlier resources는 owner
  ID에서 deterministic하게 namespace된다. 두 번째 box plot은 explicit ID가 필요하다.
- Linear `(n - 1) × p` quartiles, Tukey factor `1.5`, observed in-fence whiskers와 source-order outliers를
  immutable derived datasets에 저장한다. Empty categories are not synthesized; missing category/measure rows are
  omitted and non-missing non-finite measures fail.
- Tukey accepts a positive finite `factor` and defaults to `1.5`. `{ type: "minmax" }` stores observed
  minima/maxima as whiskers, rejects `factor`, and creates no outlier dataset, layer or graphic.
- Concrete order는 whiskers/caps → ranged bar body → median → outliers다. Body width는 category band의 `0.7`,
  box opacity는 `1`, box/median/whisker widths는 `1.5`, outliers는 black diamond radius `3`, opacity `0.75`다.
  Outlier rows가 없으면 outlier dataset/layer/graphic을 만들지 않는다.
- `width.band`, box fill/opacity/stroke/strokeWidth, median stroke/strokeWidth와 outlier shape/radius/opacity를
  override할 수 있다. `outliers: false`는 Tukey summary를 유지하면서 outlier dataset/layer/graphic을 만들지 않는다.
- Guide lifecycle은 기존 opt-in behavior를 보존한다. `guides` omission과 `false`는 guide를 만들지 않고,
  explicit `{}` 또는 `CreateGuidesOptions`만 complete materialization 뒤 applicable guide를 wrapped child로 만든다.
  Deferred x/y authoring도 stored guide intent를 completion 시 replay한다. 호환 guide는 재사용하고 missing
  component만 생성하며 [공통 확보 계약](BASIC_CHARTS.md#facade-guide-reuse)을 따른다.
- Discovery 역할은 deferred owner다. 생성 성공만으로 complete chart를 뜻하지 않으며 compatible x/y가
  완성돼야 geometry와 opt-in guide가 생긴다. 기존 mutable aggregate lifecycle은 유지한다.
- Body는 ordinary bar with y/y2 or x/x2, whiskers는 explicit `createErrorBar`, median은 ordinary rule, outliers는
  ordinary point actions를 wrapped children으로 조합한다. Canvas/scale changes rematerialize every concrete consumer.
- Lifecycle은 mutable aggregate다. `editBoxPlot`은 stable owner를 통해 statistics, topology와 component
  appearance를 함께 편집한다.

- `summary:{min,q1,median,q3,max}`는 existing source의 field mapping이다. 한 row당 box 하나를 유지하며
  finite, min≤q1≤median≤q3≤max를 검증한다. Missing category는 기존처럼 생략하되 missing
  summary 값은 거부한다. Repeated category rows는 합치지 않으며 facet partition이 가능하다. 원본 값을 rounding/통계 재계산 없이 복사한다.
- Summary mode는 quantitative position에 median field를 사용한다. 다른 categorical position이 있으면
  생략된 measure를 infer한다. Minmax whisker만 허용하며 outliers 기본 false/true 거부다.
  Canonical derived `boxSummary` transform은 method:precomputed와 summary mapping을 보관한다.
  Lower/upper fence와 sample count는 없는 정보를 합성하지 않고 생략한다.
- `width:{pixels}`는 positive fixed box span이며 기존 band width와 배타적이다. `median.width:{pixels}`는
  body center에서 지정 폭을 유지하고 "auto"는 body span을 따른다. 두 방향/resize에 같은 정책이다.
- Whisker는 기존 statistical type/factor와 별개로 ErrorBar의 caps/capSize/stroke/strokeWidth/strokeDash,
  opacity/lineCap/lineJoin/miterLimit 옵션을 받는다. Child ErrorBar가 materialization과 cap lifecycle을 소유한다.

### Formal values — `createBoxPlot`

- Implemented: vertical/horizontal orientation, configurable Tukey/minmax whiskers, width/component styles,
  outlier opt-out and documented inference.
- Proposed (NOT IMPLEMENTED): subgroup partition/offset and notched or variable-width boxes.

### Value coverage — `createBoxPlot`

- ✅ Covered: precomputed field summaries, fixed pixel spans, cap/style edits, role/source replay, serialization and facets.
- Evidence: `test/unit/actions/statistics/precomputed-box-plot.test.js`.
- ✅ Covered: direct and deferred position order, unique-data/encoded-source inference, explicit guide opt-in,
  ambiguity rejection, deterministic IDs, sub-picounit summary ordering, exact Cars primitive
  equality, missing/outlier ownership, Canvas rematerialization, trace and immutability.
- ✅ Covered: 1.5px box, median and whisker/cap defaults; opaque colored body and black diamond outliers.
- ✅ Covered: horizontal x/x2 body, minmax provenance, vertical median/caps, no outlier resources and pixel equality.
- ✅ Covered: factor `1`, band `0.5`, custom box/median/diamond appearance, `outliers: false`, edge rows and exact pixels.
- Evidence: `test/unit/actions/statistics/create-box-plot.test.js`,
  `test/charts/cars-box-plot/public.test.js`, and `test/charts/cars-box-plot/png.render.js`.

## `editBoxPlot`

```typescript
editBoxPlot({
  target?: UserId;
  data?: UserId;
  x?: PositionChannel;
  y?: PositionChannel;
  whisker?: BoxPlotWhisker;
  summary?: BoxPlotSummaryFields | false;
  width?: { band?: UnitIntervalExclusive } | { pixels: PositiveFinite };
  outliers?: boolean;
  box?: BoxAppearance;
  median?: MedianAppearance;
  outlier?: OutlierAppearance;
}): ChartProgram;
```

- `target` is the stable box owner, never a generated whisker, cap, median or outlier ID. Omission resolves current,
  then unique owner and rejects ambiguity.
- `data`, `x`, `y`는 create-time position vocabulary의 partial edit다. Omitted option은 current raw source와 role을
  보존하고 supplied position은 complete replacement다. Result는 exactly one categorical와 one quantitative role이어야
  한다. Orientation change에서 category/measure scale identity가 새 channel로 handoff되고 explicit scale option은
  create-time scale vocabulary를 사용한다.
- Whisker or outlier-topology changes create one immutable summary revision and, when needed, one matching outlier
  revision. Body, whisker/caps, median and outlier consumers are rebound before old unreferenced revisions are released.
- Data/role change도 raw source에서 immutable summary/outlier revision을 만들고 stable body, whisker/cap, median과
  applicable outlier IDs를 그대로 유지한다. Position scales를 먼저 resolve한 뒤 axes, continuous grid direction,
  every component와 selection/highlight를 새 final item에서 replay한다. Stale selector, shared-scale handoff 또는
  downstream materialization failure는 speculative branch 전체를 버린다.
- Width and appearance-only patches retain current derived datasets. Missing selected outlier resources are created
  only when the revised Tukey result contains outliers; disabled or empty outliers leave no dataset/layer/graphic shell.
- Nested options use the same formal values as `createBoxPlot`. A constant `box.fill` is rejected when the body owns a
  field-driven color encoding because the request would not have a concrete effect.

- Summary mapping 편집은 create-time 검증을 재사용한다. `summary:false`는 raw measure 계산으로 돌아가며
  기존 source/measure는 명시적으로 바꾸기 전까지 보존한다. Summary/statistical 정책 변경만 derived data를
  재계산하고 cap/style 변경은 기존 summary를 유지한다. Median width "auto"는 fixed span 설정을 제거한다.

### Formal values — `editBoxPlot`

- Implemented: `editBoxPlot({ target?: UserId; data?: UserId; x?: BoxPlotPositionChannel; y?: BoxPlotPositionChannel; summary?: BoxPlotSummaryFields | false; whisker?: BoxPlotWhisker; width?: { band?: UnitIntervalExclusive } | { pixels: PositiveFinite }; outliers?: boolean; box?: BoxAppearance; median?: MedianAppearance; outlier?: OutlierAppearance })`.
- Proposed (NOT IMPLEMENTED): subgroup offsets, notches and variable-width boxes.

### Value coverage — `editBoxPlot`

- ✅ Covered: factor revision, all owned data rebindings, old revision release, exact body/whisker/median/outlier
  graphics, width and appearance-only retention, outlier disable/restore, owner and nested validation.
- ✅ Covered: approved box owner-edit primitive/public and PNG parity.
- ✅ Covered: source-only, field-role and vertical↔horizontal revisions, stable components, scale/axis/grid handoff,
  highlight replay, equivalent calls, invalid candidate and immutable failure.
- Evidence: `test/unit/actions/statistics/edit-box-plot.test.js` and Roadmap 3 focused-editing Gate.
