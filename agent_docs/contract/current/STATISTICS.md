# Statistical action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## `createIntervalData`

- Signature: `createIntervalData({ id, source?, field, groupBy?, center?, extent?, method?, level?, as? })`.
- `id`: required new immutable derived-dataset ID. `source` defaults to current data.
- `field`: finite quantitative input field. Missing and non-finite rows are omitted.
- `groupBy`: one field, a unique field array, or omission for one ungrouped summary. Group output follows
  source first appearance.
- Defaults: `center: "mean"`, `extent: "ci"`, `method: "student-t"`, `level: 0.95`. Mean supports
  `stderr`, sample `stdev`, and two-sided `ci` with `"normal" | "student-t"`; median supports only `iqr`
  and does not accept `method` or `level`.
- `as`: optional distinct `{ center, lower, upper }` output fields. Omission namespaces all three from `id`.
- Effect: wrapped `createDerivedData` records complete interval provenance and wrapped
  `materializeIntervalData` stores owned concrete rows at a deterministic 12-decimal boundary. Values below
  `1e-12` retain 12 significant digits so a finite nonzero interval cannot collapse to zero solely from rounding.
  Center/lower/upper 중 하나라도 finite number로 표현할 수 없으면 atomic `RangeError`다. It creates no
  graphics and never changes source values.

### Formal values — `createIntervalData`

- Implemented: `createIntervalData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName | readonly FieldName[]; center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; method?: "normal" | "student-t"; level?: UnitIntervalExclusive; as?: { center: FieldName; lower: FieldName; upper: FieldName } })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createIntervalData`

- ✅ Covered: grouped/ungrouped output, first-appearance order, normal/Student-t, default mean/CI/0.95, stderr, sample stdev,
  IQR, custom output fields, missing values, undersized groups, ownership, trace and invalid combinations.
- ✅ Covered: independent cars Student-t fixtures, interval containment invariants, and sub-picounit ordering.
- Evidence: `test/unit/actions/data/interval-data.test.js`,
  `test/unit/grammar/transforms/interval.test.js`, and
  `test/unit/grammar/transforms/interval-reference.test.js`.

## `createErrorBar`

- Temporal independent position options forward `temporalUnit` to the body and every cap, including later
  cap recreation. The interval itself remains quantitative; input-unit options are invalid on that interval.

- Current signature: `createErrorBar({ id?, target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, coordinate?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})`.
- Exactly one of x/y is an identifiable quantitative interval channel and the other is a quantitative, nominal,
  ordinal, or temporal position channel. Interval options such as `lower`/`upper` disambiguate a quantitative
  position from a quantitative interval. This supports vertical or horizontal orientation without a separate
  orientation flag.
- Statistical intervals accept `{ field, center?, extent?, method?, level?, scale? }` and default to
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
- A categorical independent position may add its matching `xOffset` or `yOffset`. The offset accepts
  `{ field?, fieldType?, scale?, paddingInner?, paddingOuter? }`, is inferred from an encoded source when omitted, and
  adds its field to statistical grouping. Main rule and both caps reuse the same ordinal offset scale and padding as the
  source point. The opposite-direction offset and offsets on quantitative/temporal independent positions are rejected.
- Omitted `id` resolves once to `"errorBar"`; child data and rules are namespaced as
  `errorBarIntervalData`, `errorBarLowerCap`, and `errorBarUpperCap`.
- Effect: statistical mode calls wrapped `createIntervalData`; explicit mode uses the source dataset directly.
  The aggregate then calls main `createRuleMark`, endpoint/style assignments and, unless `caps: false`, two
  wrapped `createErrorBarCap` components. Vertical intervals store x/y/y2 and optional xOffset; horizontal intervals
  store y/x/x2 and optional yOffset. Offset center mapping survives Canvas/parent-scale rematerialization and cap
  removal/restoration.
- Appearance defaults are enabled 8-logical-pixel caps, `#4c78a8`, width `1.5`, solid dash and opacity `1`.
  `capSize` is a positive finite graphical span. Stroke width is non-negative, opacity is in `[0, 1]`, and dash
  accepts the shared named styles or an explicit dash pattern. Fixed cap spans survive Canvas/scale
  rematerialization. Statistical provenance restores titles such as `mean(field)`; explicit mode uses its center
  field as the interval-axis title.

### Formal values — `createErrorBar`

- Implemented: `createErrorBar({ id?: UserId; target?: UserId; data?: UserId; x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; xOffset?: OffsetChannel; yOffset?: OffsetChannel; groupBy?: FieldName; coordinate?: UserId; caps?: boolean; capSize?: PositiveFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval } = {})`, where `PositionChannel = { field?: FieldName; fieldType?: "quantitative" | "nominal" | "ordinal" | "temporal"; scale?: PositionScale }`, `OffsetChannel = { field?: FieldName; fieldType?: "nominal" | "ordinal"; scale?: OffsetScale; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite }`, `StatisticalIntervalChannel = { field?: FieldName; center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; method?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; scale?: PositionScale }`, and `ExplicitIntervalChannel = { center: FieldName; lower: FieldName; upper: FieldName; scale?: PositionScale }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createErrorBar`

- ✅ Covered: explicit canonical call, zero-option current-layer inference, explicit target, unique/ambiguous
  sources, orientation ambiguity rejection, point and line source marks, semantic group reuse and color exclusion.
- ✅ Covered: vertical/horizontal statistical intervals, explicit rows without derivation, caps on/off, cap size,
  stroke/width/dash/opacity, statistical/explicit convergence, deterministic namespacing and complete child trace.
- ✅ Covered: explicit and statistical intervals on a quantitative independent position and shared transformed-scale
  rematerialization of the main rule and both caps.
- ✅ Covered: inferred vertical xOffset and explicit horizontal yOffset, automatic inclusion in statistical grouping,
  shared point/main/cap centers, padding, Canvas resize, cap removal/restoration, orientation and parent-type rejection.
- ✅ Covered: fixed cap span through Canvas and shared-scale rematerialization, six primitive/public
  semantic-graphic-Canvas/pixel pairs, immutable source rows and atomic validation failure.
- ✅ Covered: executable child trace and interval tests cover custom center/extent/level forwarding; visual variants
  remain representative because every statistic shares the same rule/cap materialization branch.
- Evidence: `test/unit/actions/error-bars/create-error-bar.test.js` and
  `test/charts/cars-error-bar/primitive.test.js`, `test/charts/cars-error-bar/public.test.js`.

## `editErrorBar`

- Signature: `editErrorBar({ target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?, statistics? })`.
- `target` selects the stable main error-bar layer; omission uses current/unique eligible owner inference.
- `data`, `x`, and `y` replace source and channel roles in one preflighted owner edit. The edit may change
  orientation or convert statistical `{ field, center?, extent?, method?, level? }` intervals to explicit
  `{ center, lower, upper }` intervals and back. The main rule and enabled caps keep their stable IDs; statistical
  changes create a namespaced immutable interval revision and explicit changes release an unreferenced old revision.
- `xOffset`/`yOffset` follows the categorical independent axis; `false` removes it. A preserved offset moves with
  that axis when orientation changes and remains part of statistical grouping. `groupBy: false` removes explicit
  grouping when the resulting interval roles permit it.
- Omitted appearance leaves the stored value unchanged. `caps: false` removes both owned cap layers and graphics;
  `caps: true` restores missing caps from the owner's stored data, fields, coordinate, position/offset scales and padding.
- `statistics: { center?, extent?, method?, level? }` is valid only for a statistical interval owner. It partially merges with
  stored interval provenance, validates the complete center/extent/method/level combination, creates one namespaced immutable
  interval revision, explicitly rebinds the main rule and enabled caps, rematerializes them, and safely releases the
  old unreferenced dataset. Explicit center/lower/upper owners reject this option rather than changing modes.
- Without data-role options or `statistics`, the edit retains the existing interval dataset. Main and cap
  appearance is reconciled through one wrapped `rematerializeErrorBar` action; generated cap IDs are not public
  parameters. Attached mark labels are rebound with interval revisions, and stored selections/highlights replay.

### Formal values — `editErrorBar`

- Implemented: `editErrorBar({ target?: UserId; data?: UserId; x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; xOffset?: OffsetChannel | false; yOffset?: OffsetChannel | false; groupBy?: FieldName | false; caps?: boolean; capSize?: PositiveFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval; statistics?: { center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; method?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive } })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editErrorBar`

- ✅ Covered: inferred/explicit target, complete appearance patch, cap removal/restoration, cap-size geometry,
  named/explicit dash, retained data for appearance edits, statistical revision/rebind/release, explicit-owner
  rejection, nested trace, immutability and atomic validation.
- ✅ Covered: source and role replacement, orientation change, statistical/explicit conversion, stable cap IDs,
  offset migration, attached-label rebinding, highlight replay, and invalid combined-role atomic rejection.
- ✅ Covered: approved primitive/public semantic, graphic and pixel parity.
- Evidence: `test/unit/actions/error-bars/edit-error-bar.test.js` and Roadmap 3 focused-editing Gate.

## `createErrorBand`

- Temporal independent position options forward `temporalUnit` to the area and both boundary lines. Stored
  unit survives boundary removal/recreation and interval revision; the quantitative interval rejects input units.

- Current signature: `createErrorBand({ id?, target?, data?, x?, y?, groupBy?, coordinate?, fill?, opacity?, curve?, boundaries? } = {})`.
- Exactly one of x/y is a quantitative statistical or explicit interval; the other is a quantitative or temporal
  independent position. Vertical uses y/y2 and horizontal uses x/x2 on ordinary area layers.
- A statistical interval accepts `{ field, center?, extent?, method?, level?, scale? }` and defaults to
  mean/Student-t CI/0.95. It calls wrapped `createIntervalData` grouped by x and optional `groupBy`.
- Explicit y accepts `{ center, lower, upper, scale? }`, consumes existing rows, and may still use `groupBy`
  to split one closed path per series. The center field is kept as title/provenance while geometry uses lower/upper.
- With explicit x/y, `data` uses current or unique data, coordinate defaults to `"main"`, x and y scales default
  to their channel IDs with readable automatic domains, and linear scales exclude zero by default.
- A scale object containing only an existing `id` reuses its stored definition rather than applying error-band
  defaults. This preserves layered source scales during regression delegation.
- With omitted channels, source selection is explicit `target` → current eligible encoded layer → unique eligible
  encoded layer → error. The action reuses that layer's data, coordinate, compatible scales, and explicit `group`
  encoding. Adding inherited interval bounds to an automatic shared position scale rematerializes the existing
  source mark and every other complete position consumer after the scale domain expands. Two quantitative source
  axes are ambiguous until an interval option identifies one axis.
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
the create contract. Use `editErrorBandBoundary({ boundary: "lower" | "upper" })`
without naming generated child layers.

### Value coverage — `createErrorBand`

- ✅ Covered: direct Gapminder temporal-x statistical mode, default mean/CI/0.95, grouped first-appearance paths,
  exact primitive/public semantic-graphic-Canvas/pixel equivalence, and existing color/legend composition.
- ✅ Covered: source-layer data/coordinate/scale/group inference, vertical and horizontal statistical/explicit
  rows, source-line rematerialization after inherited shared-domain expansion, horizontal x/x2 overlay-color
  composition, deterministic ID ownership and ambiguous quantitative roles.
- ✅ Covered: atomic y/y2 and x/x2 reassignment, temporal area materialization, lower/upper boundary order,
  quantitative/temporal direct boundary positions, basic stroke/width defaults and overrides, Canvas
  rematerialization, validation failure and immutability.
- ✅ Covered: all area curve values, inherited/overridden boundary curves, dash/opacity/style validation,
  deterministic child order, Canvas/scale rematerialization, and approved primitive/public/pixel variants.
- ✅ Covered: regression-band delegation through explicit interval mode with prior semantic, graphic, ordering,
  trace, grouped/ungrouped, method, appearance, and immutability compatibility.
- Current limitation: the aggregate accepts one shared boundary recipe rather
  than independent lower/upper appearance objects.
- Evidence: `test/unit/actions/error-bands/create-error-band.test.js` and
  `test/charts/gapminder-error-band/public.test.js`, plus
  `test/unit/actions/regression/create-regression.test.js` for delegation compatibility.

## `editErrorBand`

- Signature: `editErrorBand({ target?, data?, x?, y?, groupBy?, fill?, opacity?, curve?, statistics?, boundaries? })`.
- The stable owner is an error-band area created by `createErrorBand`; omission uses current/unique inference.
- `data`, `x`, and `y` revise the source and interval/position roles together. The edit may change orientation or
  convert between statistical and explicit center/lower/upper intervals while retaining the body and enabled
  boundary IDs. `groupBy` replaces the path grouping field and `groupBy: false` removes it.
- Constant fill conflicts with an active color encoding. Remove color with `removeEncoding({ channel: "color" })`
  first; this also updates the owned legend. Conversely, encodeColor rejects an explicit ErrorBand fill.
- Edit-only `fill: false` removes the constant override, restoring active encoded color or the theme default.
  It is not transparency and is invalid at creation. Opacity and curve preserve interval data.
- `statistics` follows `editErrorBar`: it is statistical-owner-only, validates the complete partial merge, revisions
  immutable interval data, and rebinds/rematerializes the body and every enabled boundary.
- `boundaries: false` is a desired-state disable and succeeds when both are already absent. A boundary appearance
  object creates or edits both owned lines; `{}` enables both with defaults. Body/data and stable child role IDs remain.

### Formal values — `editErrorBand`

- Implemented: `editErrorBand({ target?: UserId; data?: UserId; x?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; y?: PositionChannel | StatisticalIntervalChannel | ExplicitIntervalChannel; groupBy?: FieldName | false; fill?: NonEmptyString | false; opacity?: UnitInterval; curve?: CurveInterpolation; statistics?: { center?: "mean" | "median"; extent?: "stderr" | "stdev" | "ci" | "iqr"; method?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive }; boundaries?: false | ErrorBandBoundaryAppearance })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editErrorBand`

- ✅ Covered: inferred/explicit owner, explicit color removal before constant fill, opacity/curve, statistical revision,
  both-boundary enable/edit/disable including repeated disable, Canvas persistence, immutability, empty/invalid edit
  rejection and exact Gate parity.
- ✅ Covered: both-direction color conflicts, reset to theme/field mode, selection/highlight and boundary/statistical
  replay; `test/unit/actions/encodings/style-assignment-lifecycle.test.js`.
- ✅ Covered: source/role/group replacement, orientation change, statistical/explicit conversion, stable boundary
  ownership, highlight replay and atomic rejection of invalid combined role edits.
- Evidence: `test/unit/actions/error-bands/edit-error-band.test.js` and Roadmap 3 focused-editing Gate.

## `editErrorBandBoundary`

- Signature: `editErrorBandBoundary({ target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve? })`.
- `boundary` is `"both" | "lower" | "upper"` and defaults to `"both"`. Missing selected boundaries are created
  from the owner provenance; existing selected boundaries are partially edited. The other boundary is untouched.
- The public target is always the error-band owner, never a generated lower/upper layer ID.

### Formal values — `editErrorBandBoundary`

- Implemented: `editErrorBandBoundary({ target?: UserId; boundary?: "both" | "lower" | "upper"; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval; curve?: CurveInterpolation })`.
- Proposed (NOT IMPLEMENTED): boundary removal is not part of this appearance edit.

### Value coverage — `editErrorBandBoundary`

- ✅ Covered: both/default, lower and upper selection, missing-component creation, existing-component edit,
  independent appearance, child trace, invalid selection/style and immutable failure.
- ✅ Covered: approved absent-to-both boundary primitive/public and pixel parity.
- ✅ Covered: both-direction color conflicts, reset to theme/field mode, selection/highlight and boundary/statistical
  replay; `test/unit/actions/encodings/style-assignment-lifecycle.test.js`.
- Evidence: `test/unit/actions/error-bands/edit-error-band.test.js` and Roadmap 3 focused-editing Gate.

## `createRegression`

- Signature: `createRegression({ target?, x?, y?, groupBy?, method?, degree?, span?, confidenceMethod?, level?, confidence?, interval?, band?, line? })`
- `target`: quantitative x/y point mark ID. 생략하면 current mark, 아니면 유일한 eligible point를 추론한다.
- `x`, `y`: non-empty field names. 생략하면 target의 x/y encoding field를 사용한다.
- `groupBy`: nominal field, false, or legacy explicit undefined. Omission infers one matching color/shape field;
  ambiguous candidates fail. False requests one ungrouped model and survives JSON serialization. Explicit undefined
  keeps its existing JavaScript opt-out. Editors preserve omission, reject undefined and clear with false.
- `method`, `degree`, `span`: Implemented regression method contract를 child `createRegressionData`에 전달한다.
  Polynomial degree는 `1..32`이며 derived output/work limits도 child data contract와 동일하다.
- `confidenceMethod`, `level`: `"normal" | "student-t"`와 `(0, 1)` finite number. 기본은
  Student-t와 `0.95`. 회귀 모델 선택의 `method`와 이름 충돌을 피하기 위해 CI method는
  `confidenceMethod`로 드러낸다. `confidence`는 `level`의 compatibility alias이며 함께 주면 같아야 한다.
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

- Implemented: `createRegression({ target?: UserId; x?: FieldName; y?: FieldName; groupBy?: FieldName | false; line?: { strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } } & ({ method?: "linear"; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "polynomial"; degree?: PositiveInteger; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "loess"; span?: UnitIntervalExclusiveZero; band?: false }))`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegression`

- `target`, `x`, `y`
  - ✅ Covered: current/unique inference, explicit values, ambiguous/invalid target와 field override.
- `groupBy`
  - ✅ Covered: color/shape inference, explicit field, explicit ungrouped `undefined`, ambiguous candidates.
- `confidenceMethod`, `level`, `confidence`
  - ✅ Covered: omission→Student-t/`0.95`, normal opt-in, alias/conflict and invalid values via child data action.
- `band.color`, `band.opacity`, `line.strokeWidth`
  - ✅ Covered: defaults and representative explicit styles.
  - ✅ Covered: executable child actions own color/type and numeric endpoint validation while aggregate tests verify
    exact forwarding, hierarchy and atomic failure.
- ✅ Covered: band outline/curve and line curve forwarding through corresponding component actions.
- ✅ Covered: polynomial/LOESS method forwarding, linear/polynomial prediction interval, method-specific
  band creation/opt-out와 child trace hierarchy.
- Evidence: `test/unit/actions/regression/create-regression.test.js` and regression chart tests.

## `editRegression`

- Signature: `editRegression({ target?, data?, x?, y?, groupBy?, method?, degree?, span?, confidenceMethod?, level?, confidence?, interval?, band?, line? })`.
- `target` is the stable point owner passed to or inferred by `createRegression`; generated band and line IDs are not
  ordinary targets. Omission resolves the current owner, then one unique regression owner, and rejects ambiguity.
- `data`, `x`, and `y` partially replace fitted-data provenance. `groupBy` accepts a field or `false` to remove
  grouping. Omitted data roles remain stored. Stable owner, line/band IDs, coordinate, and position scale IDs remain;
  line/band encodings and band provenance are reconciled to the complete candidate.
- Method-specific values follow `createRegression`. A data-role or statistical change creates one deterministic
  immutable derived dataset revision, rebinds the owned band and line to it, rematerializes them, and releases the old
  unreferenced revision. Appearance-only `band`/`line` patches retain the current derived dataset.
- `band: false` removes the owned band. Switching to LOESS also removes it; switching back to linear/polynomial or
  passing a band object recreates it under the same stable owner role. `line` is always retained.
- The complete patch is validated before any returned program state changes. Earlier programs and source data remain
  immutable.

### Formal values — `editRegression`

- Implemented: `editRegression({ target?: UserId; data?: UserId; x?: FieldName; y?: FieldName; groupBy?: FieldName | false; method?: "linear" | "polynomial" | "loess"; degree?: PositiveInteger; span?: UnitIntervalExclusiveZero; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions; line?: { strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } })` with method-specific runtime validation.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRegression`

- ✅ Covered: linear→polynomial and data/x/y/group revisions, exact derived rows and band/line graphics,
  group removal/addition, stable component/position identities, appearance-only data retention, LOESS band removal,
  later band restoration, owner inference, invalid data/fields/nested options and immutable failure.
- ✅ Covered: approved regression owner-edit primitive/public and PNG parity.
- Evidence: `test/unit/actions/regression/edit-regression.test.js` and Roadmap 3 focused-editing Gate.

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
  - ✅ Covered: required-resource preflight partitions missing dataset, coordinate and scale failures before child state;
    equivalent ID repetitions are not distinct behavior classes.
- `groupBy`
  - ✅ Covered: present/omitted.
- `color`, `opacity`
  - ✅ Covered: defaults/representatives plus executable `createAreaMark` delegation cover exact opacity endpoints,
    fill types and outline validation.
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
  - ✅ Covered: required-resource preflight partitions dataset, coordinate, positional scale and grouped color-scale
    failures; child line validation owns appearance boundaries.
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
