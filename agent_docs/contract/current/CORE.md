# Core action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## `createCanvas`

- Signature: `createCanvas({ width?, height?, background?, margin? })`
- 목적과 필수 state: Canvas가 없는 program에 logical Canvas와 plot bounds를 만든다.
- `width`
  - Status: Implemented. 양의 finite number이며 기본값은 `640`이다.
  - Effect: `canvas.properties.width`와 plot width를 결정한다. 이후 auto-range scale,
    mark, axis, grid, legend와 title geometry의 기준이 된다.
- `height`
  - Status: Implemented. 양의 finite number이며 기본값은 `400`이다.
  - Effect: Canvas와 plot height를 결정하고 모든 y geometry 및 reserved layout에 영향을 준다.
- `background`
  - Status: Implemented. 비어 있지 않은 color string이며 기본값은 `"white"`다.
  - Effect: concrete Canvas background만 바꾸며 semantic state에는 들어가지 않는다.
- `margin`
  - Status: Implemented. non-negative finite scalar 또는 `{ top?, right?, bottom?, left? }`다.
    scalar는 네 방향에 broadcast되고 partial object는 기본 margin의 나머지 방향을 유지한다.
  - Effect: graphical materialization config의 plot bounds를 결정한다. Canvas 생성 시 아직
    consumer가 없으므로 rematerialization은 발생하지 않는다.
- 오류와 상호작용: unknown option, invalid dimension/color/margin, 두 번째 Canvas를 거부한다.
- Coverage: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`가 defaults, partial options, invalid values와
  duplicate를 검증한다.

### Formal values — `createCanvas`

- Implemented: `createCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin } = {})`
- Proposed (NOT IMPLEMENTED): `{ width?: "auto"; height?: "auto"; margin?: "auto" }`

### Value coverage — `createCanvas`

- `width`, `height`
  - ✅ Covered: 생략(default `640 × 400`), 양의 정수/소수, 0·음수·`NaN`·`Infinity` rejection.
  - 🟣 Proposed: `"auto"` 또는 responsive dimension. Canvas resize observer와 renderer logical size
    contract가 필요하며 모든 auto-range consumer를 rematerialize해야 한다.
- `background`
  - ✅ Covered: 생략(`"white"`), non-empty color string, empty/non-string rejection.
  - No proposal: 현재 arbitrary Canvas-compatible color string으로 충분하다.
- `margin`
  - ✅ Covered: 생략, scalar, partial/full object, zero, negative/non-finite rejection, plot보다 큰 margin rejection.
  - 🟣 Proposed: `"auto"` margin. guide/title text measurement가 생기기 전에는 안전하게 계산할 수 없다.
- Evidence: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`.

## `editCanvas`

- Signature: `editCanvas({ width?, height?, background?, margin? })`
- 목적과 필수 state: 기존 Canvas의 한 개 이상 property를 immutable하게 편집한다.
- `width`, `height`, `background`, `margin`
  - Status: Implemented. 값 계약은 `createCanvas`와 같다. 생략한 property는 기존 값을 유지한다.
  - Effect: width/height/margin은 auto-range scale을 시작점으로 모든 registered consumer의
    deterministic materialization plan을 실행한다. background만 바꾸면 consumer를 다시 만들지 않는다.
  - Interaction: explicit scale range는 Canvas bounds 변경으로 재계산되지 않는다.
- 오류: 빈 edit, Canvas 부재, unknown option과 invalid resolved bounds를 거부한다.
- Coverage: `test/unit/actions/canvas/edit-canvas.test.js`가 partial edit, margin-only edit,
  auto/explicit range 차이와 rematerialization을 검증한다.

### Formal values — `editCanvas`

- Implemented: `editCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin })`; 최소 한 property가 필요하다.
- Proposed (NOT IMPLEMENTED): `createCanvas`의 `"auto"` dimension/margin과 동일하다.

### Value coverage — `editCanvas`

- `width`, `height`, `margin`
  - ✅ Covered: 한 property만 변경, 여러 property 변경, unchanged omission, auto-range rematerialization,
    explicit-range preservation과 invalid resolved bounds.
  - ⚠️ Partial: 여러 legend/title block과 다중 shared scale이 동시에 존재할 때의 resize 조합.
- `background`
  - ✅ Covered: background-only edit가 scale/mark/guide를 rematerialize하지 않음.
- Empty options
  - ✅ Covered: `{}` rejection.
- Proposed values는 `createCanvas`의 responsive/auto 후보와 동일하다.
- Evidence: `test/unit/actions/canvas/edit-canvas.test.js`.

## `createData`

- Signature: `createData({ id, values })`
- `id`
  - Status: Implemented. 필수 user-defined ID다. 지원 문자 규칙을 통과하고 기존 dataset과
    중복되지 않아야 한다.
  - Effect: `semanticSpec.datasets`의 key 역할을 하며 성공 후 current data가 된다.
- `values`
  - Status: Implemented. 필수 array이며 각 row는 plain object여야 한다. 빈 배열, nested array,
    object-valued cell은 허용한다.
  - Effect: caller-owned 값을 deep clone/freeze하여 immutable source dataset으로 저장한다.
    graphic output은 만들지 않는다.
- 오류: missing/invalid ID, non-array, non-object row와 duplicate dataset을 거부한다.
- Coverage: `test/unit/actions/data/create-data.test.js`가 empty/multiple data, ownership,
  trace summary, invalid values와 duplicates를 검증한다.

### Formal values — `createData`

- Implemented: `createData({ id: UserId; values: readonly Record<string, unknown>[] })`
- Proposed (NOT IMPLEMENTED): `{ values: AsyncIterable<Record<string, unknown>> | Readonly<Record<FieldName, readonly unknown[]>> }`

### Value coverage — `createData`

- `id`
  - ✅ Covered: valid custom ID, empty/malformed ID, duplicate ID.
  - No proposal: ID vocabulary는 user-defined 상태를 유지한다.
- `values`
  - ✅ Covered: empty/non-empty array, multiple datasets, plain-object rows, caller ownership/immutability.
  - ⚠️ Partial: deeply nested arrays/objects와 unusual scalar cells의 explicit contract cases.
  - 🟣 Proposed: async iterable/columnar input adapter. Source dataset immutability와 deterministic trace
    completion 정책이 먼저 필요하다.
- Evidence: `test/unit/actions/data/create-data.test.js`.

## `filterData`

- Signature: `filterData({ id, source?, field, oneOf?, predicate?, range? })`
- `id`: Implemented, 필수 derived dataset ID. 새 ID여야 한다.
- `source`: Implemented, dataset ID. 생략하면 current data를 사용하며 유일하게 추론되지 않으면 오류다.
- `field`: Implemented, 비어 있지 않은 필드 이름. 각 row에 값이 없어도 비교 결과가 false일 수 있다.
- `oneOf`: Implemented, scalar accepted-value array. strict equality membership으로 row를 유지하며
  transform input은 소유권 복사된다.
- `predicate`, `range`: Planned comparison/range modes이며 oneOf와 mutually exclusive다.
- Effect: filter provenance를 가진 immutable derived dataset을 만들고 wrapped
  `materializeFilteredData`가 concrete values를 저장한다. 기존 source는 변하지 않는다.
- Coverage: `test/unit/actions/data/filter-data.test.js`가 source inference, scalar types,
  ownership, invalid options와 primitive equivalence를 검증한다.

### Formal values — `filterData`

- Implemented: `filterData({ id: UserId; source?: UserId; field: FieldName; oneOf: readonly unknown[] })`
- Planned (NOT IMPLEMENTED): `filterData({ id: UserId; source?: UserId; field: FieldName } & ({ oneOf: readonly unknown[] } | { predicate: FilterComparison } | { range: FilterRange }))`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `filterData`

- `id`, `source`
  - ✅ Covered: explicit source, current-data inference, missing/ambiguous source, duplicate derived ID.
- `field`
  - ✅ Covered: non-empty string과 invalid field option.
  - ⚠️ Partial: rows에 field가 일부만 존재하는 sparse data의 명시적 result case.
- `oneOf`
  - ✅ Covered: string/number/boolean scalar membership, owned input, invalid transform values.
  - ⚠️ Partial: empty list, duplicate values와 `null` membership의 direct behavior.
  - 🟡 Planned: mutually exclusive comparison/range modes, ordered type rules와 inclusive endpoints.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

## `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear"`; Planned `"polynomial" | "loess"`. 기본값은 `"linear"`다.
- `degree`, `span`: Planned method-specific parameter다. polynomial degree 기본값은 `2`, LOESS span
  기본값은 `0.75`이며 다른 method와 함께 주면 오류다.
- `confidence`: Implemented. `(0, 1)`의 finite number이며 기본값은 `0.95`다. Student-t
  mean-response confidence bounds의 폭을 바꾼다.
- `interval`: Implemented `"mean"`; Planned `"prediction"`은 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping, resolved defaults를 transform provenance에 저장하고 observed
  unique x별 fitted y/lower/upper row를 materialize한다. graphic은 직접 만들지 않는다.
- Coverage: `test/unit/actions/data/regression-data.test.js`와
  `test/charts/regression-scatterplot/reference-values.test.js`가 grouped/ungrouped 값,
  confidence bounds와 invalid/degenerate groups를 검증한다. 여러 confidence 대표값 coverage는 부분적이다.

### Formal values — `createRegressionData`

- Implemented: `createRegressionData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; groupBy?: FieldName; method?: "linear"; confidence?: UnitIntervalExclusive; interval?: "mean" })`
- Planned (NOT IMPLEMENTED): `{ method?: "linear" | "polynomial" | "loess"; degree?: PositiveInteger; span?: UnitIntervalExclusiveZero; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" }`; method별 허용 조합은 accepted regression contracts가 제한한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionData`

- `id`, `source`, `x`, `y`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing fields, non-finite data와 degenerate groups.
- `method`
  - ✅ Covered: `"linear"`와 unknown value rejection.
  - 🟡 Planned: `"polynomial"`, `"loess"`, method-specific degree/span, deterministic provenance/output ordering.
- `confidence`
  - ✅ Covered: default `0.95`, representative explicit value, 0/1/out-of-range rejection.
  - ⚠️ Partial: near-boundary positive values의 numeric stability.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - 🟡 Planned: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/regression-scatterplot/reference-values.test.js`.

## `createDensityData`

- Signature: `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as? })`
- `id`, `source`, `field`, `groupBy`: Implemented. 새 derived ID, existing source, 필수 quantitative
  field와 optional grouping field다.
- `bandwidth`
  - Status: Implemented. positive finite number 또는 `"auto"`; 기본은 `"auto"`다.
  - Effect: 선택한 kernel 폭을 결정한다. auto는 deterministic Scott-rule 결과를 provenance에
    concrete number로 다시 저장한다.
- `extent`
  - Status: Implemented. `"auto"` 또는 오름차순 finite `[min, max]`; 기본은 `"auto"`다.
  - Effect: 모든 group이 공유하는 sample grid의 시작과 끝을 결정한다.
- `steps`
  - Status: Implemented. 2 이상의 integer이며 기본값은 `100`이다.
  - Effect: inclusive grid의 row 수와 area path resolution을 결정한다.
- `kernel`
  - Status: Implemented. `"gaussian" | "epanechnikov" | "uniform" | "triangular"`; 기본값은
    `"gaussian"`이다.
  - Effect: bandwidth와 sample grid를 유지하면서 각 sample의 normalized weight recipe를 결정한다.
- `normalization`
  - Status: Implemented. `"unit" | "count"`; 기본값은 `"unit"`이다.
  - Effect: unit은 group density integral을 1로 맞추고 count는 같은 estimate에 group의 valid sample
    count를 곱한다.
- `as`
  - Status: Implemented. 서로 다른 두 개의 non-empty field 이름이며 기본은
    `[`${field}_value`, `${field}_density`]`다.
  - Effect: derived row와 이후 encoding이 참조할 output field 이름을 결정한다.
- Effect: grouped KDE provenance와 deterministic values를 저장한다. Resolved kernel과 normalization은
  항상 provenance에 기록한다.
- Coverage: `test/unit/actions/data/density-data.test.js`와
  `test/charts/density-area/reference-values.test.js`가 auto/explicit bandwidth, extent,
  grouped/ungrouped, ownership과 오류를 검증한다. steps의 여러 경계/대표 조합은 부분적이다.

### Formal values — `createDensityData`

- Implemented: `createDensityData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; as?: readonly [FieldName, FieldName] })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDensityData`

- `id`, `source`, `field`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing field와 non-finite samples.
- `bandwidth`
  - ✅ Covered: 생략/`"auto"`, positive finite representative, zero/negative/non-finite rejection.
  - ⚠️ Partial: 매우 작은/큰 positive bandwidth numeric behavior.
- `extent`
  - ✅ Covered: `"auto"`, explicit `[min, max]`, reversed/non-finite rejection.
  - ⚠️ Partial: constant extent와 source 밖으로 확장한 extent.
- `steps`
  - ✅ Covered: default `100`, explicit representative, `<2`/non-integer rejection.
  - ⚠️ Partial: minimum `2`와 매우 큰 steps의 performance boundary.
- `as`
  - ✅ Covered: inferred names, two explicit names, wrong cardinality/invalid names rejection.
- `kernel`
  - ✅ Covered: four formulas, Gaussian default, invalid value, provenance와 primitive/public parity.
- `normalization`
  - ✅ Covered: unit/count formulas, unit default, group-local scaling, invalid value와 provenance.
- Evidence: `test/unit/actions/data/density-data.test.js`,
  `test/charts/density-area/reference-values.test.js`.

## `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 필수 transform definition array. 현재 filter/regression/density schema만
  semantic validation이 가능하며 값 materialization은 해당 전용 action이 담당한다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty transform schema를 거부한다.
- Coverage: transform schema는 data action 및 `test/charts/regression-scatterplot/semantic.test.js`에서
  검증되지만 각 transform을 이 low-level action으로 직접 호출하는 조합은 부분적이다.

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [FilterTransform | LinearRegressionTransform | GaussianDensityTransform] })`
- Planned (NOT IMPLEMENTED): `SelectRowsTransform` as one additional single-transform provenance schema.
- Proposed (NOT IMPLEMENTED): —; one-transform provenance resource라는 현재 역할을 유지한다.

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/regression/density schema through their public parent actions.
  - ⚠️ Partial: direct low-level call의 각 schema와 multi-entry array rejection/acceptance boundary.
  - No proposal: one-transform provenance resource라는 현재 역할을 유지한다.
- Evidence: data action tests와 `test/charts/regression-scatterplot/semantic.test.js`.

## `createCoordinate`

- Signature: `createCoordinate({ id?, type?, layers? })`.
- `id`: valid user ID, 기본 `"main"`.
- `type`: `"cartesian" | "polar"`, 기본 cartesian.
- `layers`: existing unique layer ID array, 기본 `[]`.
- Effect: named semantic coordinate를 만들고 coordinate가 없는 selected layers에 reference를 저장한다.
  equivalent repeated definition은 idempotent이고 기존 layer를 다른 coordinate로 이동시키지 않는다.
- Coverage: `test/unit/actions/coordinates/create-coordinate.test.js`가 both types, attachments,
  idempotence, conflicts와 validation을 검증한다.
- Planned: Polar resource storage는 Implemented, Polar positional materialization과 guides는 Planned capability다.

### Formal values — `createCoordinate`

- Implemented: `createCoordinate({ id?: UserId; type?: "cartesian" | "polar"; layers?: readonly UserId[] } = {})`; Polar resource storage만 현재 materialized behavior다.
- Proposed (NOT IMPLEMENTED): Polar positional/guide options.

### Value coverage — `createCoordinate`

- `id`: ✅ Covered omission→`"main"`, valid custom IDs, malformed IDs and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"cartesian"`, `"cartesian"`, `"polar"`, unknown value.
  - Planned capability: Polar resource는 저장되지만 positional/guide materialization은 아직 없다.
- `layers`
  - ✅ Covered: omission/empty, one/multiple existing IDs, duplicates, unknown layer, reattachment conflict.
- Evidence: `test/unit/actions/coordinates/create-coordinate.test.js`.

## `createScale`

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "time" | "ordinal"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. continuous는 두 finite/temporal values, ordinal은 non-empty
  unique values를 사용한다.
- `range`: `"auto"` 또는 consumer-compatible array. continuous position은 finite pair, ordinal은
  channel에 따라 colors, shapes 또는 dash patterns가 될 수 있다.
- `nice`: boolean, linear/time only; auto domain에 적용된다.
- `zero`: boolean, linear only; auto domain에 적용된다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. raw `createScale`의 consumer별 ordinal range
  compatibility는 부분적이다.

### Formal values — `createScale`

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean })`; type별 validation이 값을 제한한다.
- Planned (NOT IMPLEMENTED): `{ type?: "log" | "pow" | "sqrt" | "symlog" | "utc" | "band" | "point" | "sequential" | "quantize" | "quantile" | "threshold"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean; unknown?: unknown }`
- Proposed (NOT IMPLEMENTED): `{ type?: "identity" | "bin-ordinal" }`

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, `"linear" | "time" | "ordinal"`, unknown value.
  - 🟡 Planned: `"log" | "pow" | "sqrt" | "symlog" | "utc" | "band" | "point" |
    "sequential" | "quantize" | "quantile" | "threshold"`; type-specific domain, range, mapping and tick contracts는
    `planned/SCALES.md`가 소유한다.
  - 🟣 Proposed: `"identity" | "bin-ordinal"`.
- `domain`
  - ✅ Covered: `"auto"`, continuous pair, ordinal unique array, reversed pair and invalid arrays.
  - ⚠️ Partial: temporal Date/string/timestamp normalization at direct action boundary.
- `range`
  - ✅ Covered: `"auto"`, numeric pair, colors, palette descriptor and dash patterns through consumers.
  - ⚠️ Partial: raw createScale cannot fully validate consumer-specific ordinal range until consumers exist.
- `nice`
  - ✅ Covered: omitted, true, false, non-boolean and ordinal rejection.
- `zero`
  - ✅ Covered: omitted, true, false, non-boolean and time/ordinal rejection.
- Precedence
  - ✅ Covered: explicit domain overrides nice/zero; zero applies before nice on auto linear domain.
- 🟡 Planned: clamp, reverse and channel-valid unknown/missing policies.
- Evidence: `test/unit/actions/scales/scale-actions.test.js` and grammar scale tests.

## `editScale`

- Implemented: immutable edits for existing `linear | time | ordinal` scales.
- Signature: `editScale({ id?, domain?, range?, nice?, zero?, clamp?, reverse? })`.
- `id`는 existing scale을 선택한다. 생략하면 current scale, 그렇지 않으면 유일한 scale을 사용하며
  안전하게 하나를 정할 수 없으면 explicit ID를 요구한다.
- 최소 한 editable property가 필요하다. `type`, scale 삭제, consumer rebind와 `unknown`은 지원하지 않는다.
- `domain`/`range`의 `"auto"`는 reset이고 omission은 기존 값을 보존한다. Explicit domain은
  `nice`/`zero`보다 우선하며 `reverse`는 auto 또는 explicit 최종 range에 적용된다.
- `nice`는 linear/time, `zero`는 linear, `clamp`는 linear/time에만 적용된다. `reverse`는 현재
  linear/time/ordinal scale에서 지원한다.
- Complete patch와 shared-consumer channel compatibility를 먼저 검증한 뒤 semantic scale을 수정하고,
  scale, mark, axes, grids와 legend consumer를 wrapped materialization plan으로 갱신한다.
- 실패하면 이전 program의 semantic, graphic, context와 trace는 변하지 않는다.

### Formal values — `editScale`

```typescript
type EditableCurrentScale = {
  id?: UserId;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
};
```

- Implemented for existing `linear | time | ordinal` scales.
- Planned (NOT IMPLEMENTED): `unknown` mapping and the additional scale types in
  [`../planned/SCALES.md`](../planned/SCALES.md).
- Proposed (NOT IMPLEMENTED): no additional direct `editScale` surface beyond the planned vocabulary.

### Value coverage — `editScale`

- ✅ Covered: existing scale selection through explicit ID, current scale, sole scale, unknown and ambiguous failures.
- ✅ Covered: domain/range patch, `"auto"` reset, omission preservation and caller-owned array isolation.
- ✅ Covered: `nice`, `zero`, `clamp`, `reverse`, type compatibility and invalid value rejection.
- ✅ Covered: concrete point/guide rematerialization, immutable failure and nested trace.
- Evidence: `test/unit/actions/scales/edit-scale.test.js`,
  `test/unit/grammar/scales/scale.test.js` and the Phase 1 chart integration test.
