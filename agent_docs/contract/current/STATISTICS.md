# Statistical action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## `createIntervalData`

- Signature: `createIntervalData({ id, source?, field, groupBy?, center?, extent?, level?, as? })`.
- `id`: required new immutable derived-dataset ID. `source` defaults to current data.
- `field`: finite quantitative input field. Missing and non-finite rows are omitted.
- `groupBy`: one field, a unique field array, or omission for one ungrouped summary. Group output follows
  source first appearance.
- Defaults: `center: "mean"`, `extent: "ci"`, `level: 0.95`. Mean supports `stderr`, sample `stdev`, and
  two-sided Student-t `ci`; median supports only `iqr` and does not accept `level`.
- `as`: optional distinct `{ center, lower, upper }` output fields. Omission namespaces all three from `id`.
- Effect: wrapped `createDerivedData` records complete interval provenance and wrapped
  `materializeIntervalData` stores owned concrete rows rounded to a deterministic 12-decimal boundary.
  It creates no graphics and never changes source values.

### Formal values — `createIntervalData`

- Implemented: `createIntervalData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName | readonly FieldName[]; center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; level?: UnitIntervalExclusive; as?: { center: FieldName; lower: FieldName; upper: FieldName } })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createIntervalData`

- ✅ Covered: grouped/ungrouped output, first-appearance order, default mean/CI/0.95, stderr, sample stdev,
  IQR, custom output fields, missing values, undersized groups, ownership, trace and invalid combinations.
- ✅ Covered: independent cars Student-t fixtures and interval containment invariants.
- Evidence: `test/unit/actions/data/interval-data.test.js`,
  `test/unit/grammar/transforms/interval.test.js`, and
  `test/unit/grammar/transforms/interval-reference.test.js`.

## `createErrorBar`

- Current signature: `createErrorBar({ id?, target?, data?, x?, y?, groupBy?, coordinate?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})`.
- Exactly one of x/y is a nominal, ordinal, or temporal position channel and the other is a quantitative
  interval channel. This supports vertical or horizontal orientation without a separate orientation flag.
- Statistical intervals accept `{ field, center?, extent?, level?, scale? }` and default to
  mean/Student-t CI/0.95. Explicit intervals accept `{ center, lower, upper, scale? }`, use existing rows,
  and never create derived data.
- With explicit x/y, `data` defaults to current or unique data, `coordinate` to `"main"`, position scales to
  their channel ID, and quantitative interval scales use `nice: true, zero: false`.
- A scale object containing only an existing `id` reuses that stored scale definition exactly; interval defaults
  apply only when the action must create a new scale.
- With an omitted channel, source selection is explicit `target` → current eligible encoded layer → unique
  eligible encoded layer → error. It reuses persisted data, coordinate and compatible x/y scale IDs by
  semantic capability, independently of source mark type.
- The independent position field is always statistical grouping. A persisted `group` encoding adds its field;
  color is appearance and never silently becomes grouping. Two quantitative axes or multiple source layers
  require explicit disambiguation.
- Omitted `id` resolves once to `"errorBar"`; child data and rules are namespaced as
  `errorBarIntervalData`, `errorBarLowerCap`, and `errorBarUpperCap`.
- Effect: statistical mode calls wrapped `createIntervalData`; explicit mode uses the source dataset directly.
  The aggregate then calls main `createRuleMark`, endpoint/style assignments and, unless `caps: false`, two
  wrapped `createErrorBarCap` components. Vertical intervals store x/y/y2 and horizontal intervals y/x/x2.
- Appearance defaults are enabled 8-logical-pixel caps, `#4c78a8`, width `1.5`, solid dash and opacity `1`.
  `capSize` is a positive finite graphical span. Stroke width is non-negative, opacity is in `[0, 1]`, and dash
  accepts the shared named styles or an explicit dash pattern. Fixed cap spans survive Canvas/scale
  rematerialization. Statistical provenance restores titles such as `mean(field)`; explicit mode uses its center
  field as the interval-axis title.

### Formal values — `createErrorBar`

- Implemented: `createErrorBar({ id?: UserId; target?: UserId; data?: UserId; x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; groupBy?: FieldName; coordinate?: UserId; caps?: boolean; capSize?: PositiveFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval } = {})`, where `PositionChannel = { field?: FieldName; fieldType?: "nominal" | "ordinal" | "temporal"; scale?: PositionScale }`, `StatisticalIntervalChannel = { field?: FieldName; center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; level?: UnitIntervalExclusive; scale?: PositionScale }`, and `ExplicitIntervalChannel = { center: FieldName; lower: FieldName; upper: FieldName; scale?: PositionScale }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createErrorBar`

- ✅ Covered: explicit canonical call, zero-option current-layer inference, explicit target, unique/ambiguous
  sources, orientation ambiguity rejection, point and line source marks, semantic group reuse and color exclusion.
- ✅ Covered: vertical/horizontal statistical intervals, explicit rows without derivation, caps on/off, cap size,
  stroke/width/dash/opacity, statistical/explicit convergence, deterministic namespacing and complete child trace.
- ✅ Covered: fixed cap span through Canvas and shared-scale rematerialization, six primitive/public
  semantic-graphic-Canvas/pixel pairs, immutable source rows and atomic validation failure.
- ⚠️ Partial: current custom center/extent/level forwarding is covered by interval child tests rather than a
  visual variant for every statistic.
- Evidence: `test/unit/actions/error-bars/create-error-bar.test.js` and
  `test/charts/cars-error-bar/primitive.test.js`, `test/charts/cars-error-bar/public.test.js`.

## `createErrorBand`

- Current signature: `createErrorBand({ id?, target?, data?, x?, y?, groupBy?, coordinate?, fill?, opacity?, curve?, boundaries? } = {})`.
- Exactly one of x/y is a quantitative statistical or explicit interval; the other is a quantitative or temporal
  independent position. Vertical uses y/y2 and horizontal uses x/x2 on ordinary area layers.
- A statistical interval accepts `{ field, center?, extent?, level?, scale? }` and defaults to
  mean/Student-t CI/0.95. It calls wrapped `createIntervalData` grouped by x and optional `groupBy`.
- Explicit y accepts `{ center, lower, upper, scale? }`, consumes existing rows, and may still use `groupBy`
  to split one closed path per series. The center field is kept as title/provenance while geometry uses lower/upper.
- With explicit x/y, `data` uses current or unique data, coordinate defaults to `"main"`, x and y scales default
  to their channel IDs with readable automatic domains, and linear scales exclude zero by default.
- A scale object containing only an existing `id` reuses its stored definition rather than applying error-band
  defaults. This preserves layered source scales during regression delegation.
- With omitted channels, source selection is explicit `target` → current eligible encoded layer → unique eligible
  encoded layer → error. The action reuses that layer's data, coordinate, compatible scales, and explicit `group`
  encoding. Two quantitative source axes are ambiguous until an interval option identifies one axis.
- Omitted `id` resolves once to `"errorBand"`; statistical data is namespaced as
  `errorBandIntervalData`. The aggregate calls wrapped `createAreaMark`, independent position encoding, atomic
  `encodeYRange` or `encodeXRange`, and optional `encodeGroup`. It does not duplicate field-driven color; call
  `encodeColor` on the resulting area.
- `fill` and `opacity` use the area mark contract; defaults are the shared mark color and `0.2`. Existing
  `encodeColor` supports grouped ranged areas with inferred overlay layout and rematerializes concrete fills.
- The result is an ordinary area layer and immutable derived dataset, not a composite registry. Canvas and
  compatible scale changes rematerialize the same namespaced closed paths.
- `curve` uses the shared area curve vocabulary and defaults to `"linear"`.
- `boundaries` defaults to false. `{}` creates deterministic lower/upper ordinary line layers after the band;
  `stroke`, `strokeWidth`, `strokeDash`, and `opacity` default to the shared mark color, `1`, solid, and `1`.
  Boundary curve inherits the band curve unless an explicit boundary `curve` overrides it.
- Composite ownership uses ordinary resources only. No `semanticSpec.composites` registry is introduced:
  interval rows use the existing derived-dataset/provenance model, the representative area keeps the user ID,
  and repeatable boundary layers and graphics are deterministically namespaced by owner and role.
- The aggregate orchestrates wrapped child actions instead of duplicating their validation or materialization.
  Its rematerialization is the ordered, deduplicated union of ordinary area and boundary consumer plans, while
  earlier immutable programs retain their datasets, semantic bindings, and concrete graphics.

### Formal values — `createErrorBand`

- Implemented: `createErrorBand({ id?: UserId; target?: UserId; data?: UserId; x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; groupBy?: FieldName; coordinate?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; curve?: CurveInterpolation; boundaries?: false | { stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashPattern; opacity?: UnitInterval; curve?: CurveInterpolation } } = {})`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

Independent lower/upper boundary appearance objects are intentionally outside
the aggregate contract. Edit the deterministic ordinary child line layers when
the two boundaries need different styles.

### Value coverage — `createErrorBand`

- ✅ Covered: direct Gapminder temporal-x statistical mode, default mean/CI/0.95, grouped first-appearance paths,
  exact primitive/public semantic-graphic-Canvas/pixel equivalence, and existing color/legend composition.
- ✅ Covered: source-layer data/coordinate/scale/group inference, vertical and horizontal statistical/explicit
  rows, horizontal x/x2 overlay-color composition, deterministic ID ownership and ambiguous quantitative roles.
- ✅ Covered: atomic y/y2 and x/x2 reassignment, temporal area materialization, lower/upper boundary order,
  basic stroke/width defaults and overrides, Canvas rematerialization, validation failure and immutability.
- ✅ Covered: all area curve values, inherited/overridden boundary curves, dash/opacity/style validation,
  deterministic child order, Canvas/scale rematerialization, and approved primitive/public/pixel variants.
- ✅ Covered: regression-band delegation through explicit interval mode with prior semantic, graphic, ordering,
  trace, grouped/ungrouped, method, appearance, and immutability compatibility.
- Current limitation: the aggregate accepts one shared boundary recipe rather
  than independent lower/upper appearance objects.
- Evidence: `test/unit/actions/error-bands/create-error-band.test.js` and
  `test/charts/gapminder-error-band/public.test.js`, plus
  `test/unit/actions/regression/create-regression.test.js` for delegation compatibility.

## `createRegression`

- Signature: `createRegression({ target?, x?, y?, groupBy?, method?, degree?, span?, confidence?, interval?, band?, line? })`
- `target`: quantitative x/y point mark ID. 생략하면 current mark, 아니면 유일한 eligible point를 추론한다.
- `x`, `y`: non-empty field names. 생략하면 target의 x/y encoding field를 사용한다.
- `groupBy`: nominal field 또는 explicit `undefined`. 생략하면 matching color/shape field가 하나일 때
  추론한다. 후보가 둘 이상이면 오류이며 explicit undefined는 ungrouped regression을 요청한다.
- `method`, `degree`, `span`: Implemented regression method contract를 child `createRegressionData`에 전달한다.
- `confidence`: `(0, 1)` finite number, 기본값 `0.95`.
- `interval`: Implemented `"mean" | "prediction"`; 기본값은 `"mean"`이며 LOESS에서는 생략해야 한다.
- `band`: style object 또는 `false`. linear/polynomial은 생략 시 band를 만들고,
  LOESS는 생략/false일 때 band child를 만들지 않으며 object는 오류다.
- `band.color`: non-empty color string, 기본 theme regression-band color `"#111111"`.
- `band.opacity`: `[0, 1]` finite number, 기본값 `0.18`.
- `line.strokeWidth`: non-negative finite number, 기본값 `3`.
- `band.stroke`, `band.strokeWidth`: Implemented area outline contract다.
- `line.curve`: Implemented shared `CurveInterpolation`이며 line child로 전달된다.
- `band.curve`: Implemented shared `CurveInterpolation`이며 area child로 전달된다.
- Effect: target ID로 namespace한 derived data, area band와 line layer를 만들고 point layer의 coordinate와
  x/y scales를 공유한다. group field가 point color와 같으면 color scale도 공유한다.
- Coverage: `test/unit/actions/regression/create-regression.test.js`와 regression chart tests가 inference,
  ambiguity, grouped/ungrouped, namespacing, geometry와 Canvas rematerialization을 검증한다. confidence와
  appearance boundary의 전체 조합은 부분적이다.

### Formal values — `createRegression`

- Implemented: `createRegression({ target?: UserId; x?: FieldName; y?: FieldName; groupBy?: FieldName; line?: { strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } } & ({ method?: "linear"; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "polynomial"; degree?: PositiveInteger; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "loess"; span?: UnitIntervalExclusiveZero; band?: false }))`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegression`

- `target`, `x`, `y`
  - ✅ Covered: current/unique inference, explicit values, ambiguous/invalid target와 field override.
- `groupBy`
  - ✅ Covered: color/shape inference, explicit field, explicit ungrouped `undefined`, ambiguous candidates.
- `confidence`
  - ✅ Covered: omission→`0.95`, representative explicit and invalid via child data action.
- `band.color`, `band.opacity`, `line.strokeWidth`
  - ✅ Covered: defaults and representative explicit styles.
  - ⚠️ Partial: color/type and numeric endpoints are mostly child-action validation rather than aggregate direct tests.
- ✅ Covered: band outline/curve and line curve forwarding through corresponding component actions.
- ✅ Covered: polynomial/LOESS method forwarding, linear/polynomial prediction interval, method-specific
  band creation/opt-out와 child trace hierarchy.
- Evidence: `test/unit/actions/regression/create-regression.test.js` and regression chart tests.

## `createRegressionBand`

- Signature: `createRegressionBand({ id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale, color?, opacity?, stroke?, strokeWidth?, curve? })`
- `id`, `data`: 필수 새 area layer ID와 regression derived dataset ID.
- `x`, `lower`, `upper`: 필수 quantitative result fields.
- `groupBy`: optional nominal series field.
- `coordinate`, `xScale`, `yScale`: 필수 existing shared resource IDs.
- `color`, `opacity`: `createAreaMark` appearance contract; defaults는 regression band theme와 `0.18`.
- `stroke`, `strokeWidth`: Implemented optional area outline. Width default는 `1`이며 stroke 없이 width만
  지정할 수 없다.
- `curve`: Implemented shared area curve vocabulary이며 기본값은 `"linear"`다.
- Effect: regression provenance와 fields/grouping을 검증한 뒤 wrapped `createErrorBand` explicit mode에
  area, x, y/y2, group과 curve materialization을 위임한다. Generic explicit title은 제거해 기존 regression
  semantic output을 보존하고 optional outline은 wrapped `editAreaMark`로 적용한다.
- Coverage: regression unit/chart tests가 aggregate child hierarchy와 primitive equivalence를 검증하지만
  이 advanced action의 각 missing resource 오류는 부분적이다.

### Formal values — `createRegressionBand`

- Implemented: `createRegressionBand({ id: UserId; data: UserId; x: FieldName; lower: FieldName; upper: FieldName; groupBy?: FieldName; coordinate: UserId; xScale: UserId; yScale: UserId; color?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionBand`

- `id`, `data`, `x`, `lower`, `upper`, `coordinate`, `xScale`, `yScale`
  - ✅ Covered: valid aggregate flow and shared-scale output.
  - ⚠️ Partial: each missing/unknown resource as an independent direct-call case.
- `groupBy`
  - ✅ Covered: present/omitted.
- `color`, `opacity`
  - ⚠️ Partial: defaults/representative values; endpoints and invalid types rely on area child validation.
- ✅ Covered: optional outline/curve forwarding and nested `createErrorBand` hierarchy.
- ✅ Covered: non-regression, LOESS, and mismatched regression provenance rejection.
- Evidence: regression unit/chart tests.

## `createRegressionLine`

- Signature: `createRegressionLine({ id, data, x, y, groupBy?, coordinate, xScale, yScale, colorScale?, strokeWidth?, curve? })`
- `id`, `data`, `x`, `y`: 새 line ID, regression data와 fitted field names다.
- `groupBy`: optional nominal series field. 있으면 `colorScale`도 existing/shared ID여야 한다.
- `coordinate`, `xScale`, `yScale`: 필수 shared resource IDs.
- `strokeWidth`: non-negative finite number, 기본값 `3`.
- `curve`: Implemented shared curve interpolation이며 기본값 `"linear"`다.
- Effect: line mark와 x/y, optional color/group encoding을 만들고 fitted paths를 materialize한다.
- Coverage: regression unit/chart tests가 grouped/ungrouped와 shared resource 결과를 검증하며
  direct invalid combination matrix는 부분적이다.

### Formal values — `createRegressionLine`

- Implemented: `createRegressionLine({ id: UserId; data: UserId; x: FieldName; y: FieldName; groupBy?: FieldName; coordinate: UserId; xScale: UserId; yScale: UserId; colorScale?: UserId; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionLine`

- `id`, `data`, `x`, `y`, `coordinate`, `xScale`, `yScale`
  - ✅ Covered: valid grouped/ungrouped flow and shared coordinates/scales.
  - ⚠️ Partial: missing resource direct-call matrix.
- `groupBy`, `colorScale`
  - ✅ Covered: paired presence and omitted ungrouped case.
- `strokeWidth`
  - ✅ Covered: default `3`, representative explicit; invalid values delegated to line mark.
- ✅ Covered: shared 8-value curve option forwarded to `createLineMark` and concrete path grammar.
- Evidence: regression unit/chart tests.

## `editRegressionBand`

- Signature: `editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth?, curve? })`.
- Target은 regression-derived area component이며 unique compatible band를 infer할 수 있다.
- Effect: regression-specific target validation 뒤 wrapped `editAreaMark`를 호출한다. Statistical data,
  result fields, grouping, coordinate와 scales는 유지한다.
- 최소 한 변경값이 필요하다.

### Formal values — `editRegressionBand`

- Implemented: `editRegressionBand({ target?: UserId; color?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRegressionBand`

- ✅ Covered: inferred/explicit target, color/opacity/curve, outline create/replace/remove와 nested area trace.
- ✅ Covered: empty/unknown/non-regression targets, invalid options/appearance and earlier-program immutability.
- Evidence: `test/unit/actions/regression/edit-components.test.js` and approved component-edit pair.

## `editRegressionLine`

- Signature: `editRegressionLine({ target?, strokeWidth?, curve? })`.
- Target은 regression-derived line component이며 unique compatible line을 infer할 수 있다.
- Effect: regression-specific target validation 뒤 wrapped `editLineMark`를 호출한다. Statistical data,
  result fields, grouping, coordinate와 scales는 유지한다.
- 최소 한 변경값이 필요하다.

### Formal values — `editRegressionLine`

- Implemented: `editRegressionLine({ target?: UserId; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRegressionLine`

- ✅ Covered: inferred/explicit target, width/curve and nested line trace.
- ✅ Covered: empty/unknown/non-regression targets, invalid options/appearance and earlier-program immutability.
- Evidence: `test/unit/actions/regression/edit-components.test.js` and approved component-edit pair.
