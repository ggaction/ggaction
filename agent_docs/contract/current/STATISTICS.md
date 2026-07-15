# Statistical action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

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
- `band.curve`: Planned shared area curve contract다.
- Effect: target ID로 namespace한 derived data, area band와 line layer를 만들고 point layer의 coordinate와
  x/y scales를 공유한다. group field가 point color와 같으면 color scale도 공유한다.
- Coverage: `test/unit/actions/regression/create-regression.test.js`와 regression chart tests가 inference,
  ambiguity, grouped/ungrouped, namespacing, geometry와 Canvas rematerialization을 검증한다. confidence와
  appearance boundary의 전체 조합은 부분적이다.

### Formal values — `createRegression`

- Implemented: `createRegression({ target?: UserId; x?: FieldName; y?: FieldName; groupBy?: FieldName; line?: { strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } } & ({ method?: "linear"; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "polynomial"; degree?: PositiveInteger; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction"; band?: false | RegressionBandOptions } | { method: "loess"; span?: UnitIntervalExclusiveZero; band?: false }))`
- Planned (NOT IMPLEMENTED): `{ band?: { curve?: CurveInterpolation } }` only.
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
- ✅ Covered: band outline and line curve forwarding through corresponding component actions.
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
- Effect: wrapped area mark, x, y/y2, optional group actions을 호출하고 shared-scale closed paths를 만든다.
- Coverage: regression unit/chart tests가 aggregate child hierarchy와 primitive equivalence를 검증하지만
  이 advanced action의 각 missing resource 오류는 부분적이다.

### Formal values — `createRegressionBand`

- Implemented: `createRegressionBand({ id: UserId; data: UserId; x: FieldName; lower: FieldName; upper: FieldName; groupBy?: FieldName; coordinate: UserId; xScale: UserId; yScale: UserId; color?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite })`
- Planned (NOT IMPLEMENTED): `{ curve?: CurveInterpolation }`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionBand`

- `id`, `data`, `x`, `lower`, `upper`, `coordinate`, `xScale`, `yScale`
  - ✅ Covered: valid aggregate flow and shared-scale output.
  - ⚠️ Partial: each missing/unknown resource as an independent direct-call case.
- `groupBy`
  - ✅ Covered: present/omitted.
- `color`, `opacity`
  - ⚠️ Partial: defaults/representative values; endpoints and invalid types rely on area child validation.
- ✅ Covered: optional outline and aggregate forwarding through shared area appearance validation.
- 🟡 Planned: area curve forwarding.
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

- Signature: `editRegressionBand({ target?, color?, opacity?, stroke?, strokeWidth? })`.
- Target은 regression-derived area component이며 unique compatible band를 infer할 수 있다.
- Effect: regression-specific target validation 뒤 wrapped `editAreaMark`를 호출한다. Statistical data,
  result fields, grouping, coordinate와 scales는 유지한다.
- 최소 한 변경값이 필요하다.

### Formal values — `editRegressionBand`

- Implemented: `editRegressionBand({ target?: UserId; color?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): `{ curve?: CurveInterpolation }`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRegressionBand`

- ✅ Covered: inferred/explicit target, color/opacity, outline create/replace/remove와 nested area trace.
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
