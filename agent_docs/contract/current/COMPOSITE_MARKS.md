# Current Composite Mark contracts

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
  width?: { band?: UnitIntervalExclusive };
  outliers?: boolean;
  box?: {
    fill?: NonEmptyString;
    opacity?: UnitInterval;
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
  };
  median?: {
    stroke?: NonEmptyString;
    strokeWidth?: NonNegativeFinite;
  };
  outlier?: {
    shape?: PointShape;
    radius?: PositiveFinite;
    opacity?: UnitInterval;
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
  Deferred x/y authoring도 stored guide intent를 completion 시 replay한다.
- Body는 ordinary bar with y/y2 or x/x2, whiskers는 explicit `createErrorBar`, median은 ordinary rule, outliers는
  ordinary point actions를 wrapped children으로 조합한다. Canvas/scale changes rematerialize every concrete consumer.
- Lifecycle은 mutable aggregate다. `editBoxPlot`은 stable owner를 통해 statistics, topology와 component
  appearance를 함께 편집한다.

### Formal values — `createBoxPlot`

- Implemented: vertical/horizontal orientation, configurable Tukey/minmax whiskers, width/component styles,
  outlier opt-out and documented inference.
- Proposed (NOT IMPLEMENTED): subgroup partition/offset and notched or variable-width boxes.

### Value coverage — `createBoxPlot`

- ✅ Covered: direct and deferred position order, unique-data/encoded-source inference, explicit guide opt-in,
  ambiguity rejection, deterministic IDs, exact Cars primitive
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
  whisker?: BoxPlotWhisker;
  width?: { band?: UnitIntervalExclusive };
  outliers?: boolean;
  box?: BoxAppearance;
  median?: MedianAppearance;
  outlier?: OutlierAppearance;
}): ChartProgram;
```

- `target` is the stable box owner, never a generated whisker, cap, median or outlier ID. Omission resolves current,
  then unique owner and rejects ambiguity.
- Whisker or outlier-topology changes create one immutable summary revision and, when needed, one matching outlier
  revision. Body, whisker/caps, median and outlier consumers are rebound before old unreferenced revisions are released.
- Width and appearance-only patches retain current derived datasets. Missing selected outlier resources are created
  only when the revised Tukey result contains outliers; disabled or empty outliers leave no dataset/layer/graphic shell.
- Nested options use the same formal values as `createBoxPlot`. A constant `box.fill` is rejected when the body owns a
  field-driven color encoding because the request would not have a concrete effect.

### Formal values — `editBoxPlot`

- Implemented: `editBoxPlot({ target?: UserId; whisker?: BoxPlotWhisker; width?: { band?: UnitIntervalExclusive }; outliers?: boolean; box?: BoxAppearance; median?: MedianAppearance; outlier?: OutlierAppearance })`.
- Proposed (NOT IMPLEMENTED): category/measure reassignment, subgroup offsets, notches and variable-width boxes.

### Value coverage — `editBoxPlot`

- ✅ Covered: factor revision, all owned data rebindings, old revision release, exact body/whisker/median/outlier
  graphics, width and appearance-only retention, outlier disable/restore, owner and nested validation.
- ✅ Covered: approved box owner-edit primitive/public and PNG parity.
- Evidence: `test/unit/actions/statistics/edit-box-plot.test.js` and Roadmap 3 focused-editing Gate.
