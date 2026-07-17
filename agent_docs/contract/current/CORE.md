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

- Signature: `createData({ id?, values })`
- `id`
  - Status: Implemented. Optional user-defined ID다. 첫 dataset에서 생략하면 deterministic role ID
    `"data"`를 사용한다. Dataset이 이미 있으면 생략은 ambiguous하므로 explicit ID가 필요하다.
    명시한 ID는 지원 문자 규칙을 통과하고 기존 dataset과 중복되지 않아야 한다.
  - Effect: `semanticSpec.datasets`의 key 역할을 하며 성공 후 current data가 된다.
- `values`
  - Status: Implemented. 필수 array이며 각 row는 plain object여야 한다. 빈 배열, nested array,
    object-valued cell은 허용한다.
  - Effect: caller-owned 값을 deep clone/freeze하여 immutable source dataset으로 저장한다.
    graphic output은 만들지 않는다.
- 오류: ambiguous omitted ID, invalid/duplicate ID, non-array와 non-object row를 거부한다.
- Coverage: `test/unit/actions/data/create-data.test.js`가 empty/multiple data, ownership,
  trace summary, invalid values와 duplicates를 검증한다.

### Formal values — `createData`

- Implemented: `createData({ id?: UserId; values: readonly Record<string, unknown>[] })`; 첫 unnamed source는
  `"data"`를 저장하고 이후 source는 explicit ID가 필요하다.
- Proposed (NOT IMPLEMENTED): `{ values: AsyncIterable<Record<string, unknown>> | Readonly<Record<FieldName, readonly unknown[]>> }`

### Value coverage — `createData`

- `id`
  - ✅ Covered: omission→`"data"`, valid custom ID, second unnamed ambiguity, empty/malformed ID, duplicate ID.
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
- `predicate`: Implemented `{ op, value }` comparison. `eq | neq`는 strict equality를 사용하고
  `lt | lte | gt | gte`는 같은 type의 finite number 또는 string만 순서 비교한다.
- `range`: Implemented `{ min, max, inclusive? }`. 같은 type의 finite number/string endpoint를
  요구하고 `inclusive` 기본값은 `true`다.
- `oneOf`, `predicate`, `range` 중 정확히 하나만 허용한다. Ordered comparison/range에서 missing 또는
  incompatible field value는 제외하고 source order를 보존한다.
- Effect: filter provenance를 가진 immutable derived dataset을 만들고 wrapped
  `materializeFilteredData`가 concrete values를 저장한다. 기존 source는 변하지 않는다.
- Coverage: `test/unit/actions/data/filter-data.test.js`가 source inference, scalar types,
  ownership, invalid options와 primitive equivalence를 검증한다.

### Formal values — `filterData`

- Implemented: `filterData({ id: UserId; source?: UserId; field: FieldName } & ({ oneOf: readonly unknown[] } | { predicate: FilterComparison } | { range: FilterRange }))`
- `FilterComparison = { op: "eq" | "neq"; value: unknown } | { op: "lt" | "lte" | "gt" | "gte"; value: Finite | string }`
- `FilterRange = { min: Finite | string; max: Finite | string; inclusive?: boolean }`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `filterData`

- `id`, `source`
  - ✅ Covered: explicit source, current-data inference, missing/ambiguous source, duplicate derived ID.
- `field`
  - ✅ Covered: non-empty string, invalid option, sparse와 incompatible ordered values.
- `oneOf`
  - ✅ Covered: string/number/boolean scalar membership, owned input, invalid transform values.
  - ⚠️ Partial: empty list, duplicate values와 `null` membership의 direct behavior.
- `predicate`
  - ✅ Covered: 모든 여섯 operator, strict no-coercion, numeric/string order, invalid operator/operand와 owned provenance.
- `range`
  - ✅ Covered: inclusive default, exclusive endpoints, equal-endpoint empty result, invalid order/type/inclusive와 owned provenance.
- Mode interaction
  - ✅ Covered: exactly-one mutual exclusivity, source immutability/order와 primitive/public chart equivalence.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

## `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear" | "polynomial" | "loess"`. 기본값은 `"linear"`다.
- `degree`, `span`: Implemented method-specific parameter다. polynomial degree 기본값은 `2`, LOESS
  span 기본값은 `0.75`이며 다른 method와 함께 주면 오류다.
- `confidence`: Implemented. `(0, 1)`의 finite number이며 기본값은 `0.95`다. Student-t
  mean-response confidence bounds의 폭을 바꾼다.
- `interval`: Implemented `"mean" | "prediction"`이며 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping과 resolved method defaults를 transform provenance에 저장하고 observed
  unique x별 fitted row를 materialize한다. Polynomial은 normalized basis의 stable least squares를 사용하고
  LOESS는 source-order tie를 가진 tricube local-linear neighbors를 사용한다. Linear/polynomial은
  lower/upper를 만들고 LOESS는 fitted y만 만든다. graphic은 직접 만들지 않는다.
- Coverage: `test/unit/actions/data/regression-data.test.js`와
  `test/charts/cars-regression-scatterplot/reference-values.test.js`가 grouped/ungrouped 값,
  confidence bounds와 invalid/degenerate groups를 검증한다. 여러 confidence 대표값 coverage는 부분적이다.

### Formal values — `createRegressionData`

- Implemented: `createRegressionData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; groupBy?: FieldName } & ({ method?: "linear"; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "polynomial"; degree?: PositiveInteger; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "loess"; span?: UnitIntervalExclusiveZero }))`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionData`

- `id`, `source`, `x`, `y`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing fields, non-finite data와 degenerate groups.
- `method`
  - ✅ Covered: all three methods, unknown rejection, degree/span defaults and boundaries, deterministic provenance/output ordering.
- `confidence`
  - ✅ Covered: default `0.95`, representative explicit value, 0/1/out-of-range rejection.
  - ⚠️ Partial: near-boundary positive values의 numeric stability.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - ✅ Covered: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/cars-regression-scatterplot/reference-values.test.js`.

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
  `test/charts/cars-density-area/reference-values.test.js`가 auto/explicit bandwidth, extent,
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
  `test/charts/cars-density-area/reference-values.test.js`.

## `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 필수 non-empty transform definition array. Public direct-authoring union은
  filter/regression/density/interval schema이며 값 materialization은 해당 전용 action이 담당한다. Box summary,
  box outlier, mark filter provenance는 composite action이 생성하는 internal transform으로 public union에 넣지 않는다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty transform schema를 거부한다.
- Coverage: `test/unit/actions/data/derived-data.test.js`가 네 public branch의 direct call, 배열 cardinality,
  invalid discriminant와 caller-owned input immutability를 검증한다. Package consumer는 documented filter call과
  closed union을 strict TypeScript로 compile한다.

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [DatasetTransform, ...DatasetTransform[]] })`, where public `DatasetTransform = FilterTransform | RegressionTransform | DensityTransform | IntervalTransform`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/regression/density/interval direct schema, object/empty/unknown rejection,
    non-empty array acceptance와 deep immutable ownership.
  - Built-in value materializer는 owning high-level action이 만든 single-transform resource만 받는다.
- Evidence: `test/unit/actions/data/derived-data.test.js`, `scripts/package-consumer.js`, 각 high-level data action test.

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

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "band" | "point" | "ordinal" | "sequential" | "quantize" | "quantile" | "threshold"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. Direct continuous/time scale은 두 finite numeric values를
  사용하며 time 값은 UTC timestamp다. Ordinal은 non-empty unique values를 사용한다. Threshold는
  strictly increasing explicit boundaries가 필수다.
- `range`: `"auto"` 또는 consumer-compatible array. continuous position은 finite pair, ordinal은
  channel에 따라 colors, shapes 또는 dash patterns가 될 수 있다. Sequential은 최소 두 colors,
  discretized color는 최소 두 colors를 사용하며 threshold는 domain보다 정확히 하나 더 필요하다.
- `nice`: boolean, continuous position scale의 auto domain에 적용된다.
- `zero`: boolean, `linear | pow | sqrt | symlog` auto domain에 적용되며 log에서는 오류다.
- `base`, `exponent`, `constant`: 각각 log, pow, symlog 전용 positive finite parameter다. Defaults는 `10`, `1`, `1`이고 sqrt는 fixed exponent `0.5`다.
- `clamp`: compatible continuous mapping을 resolved output extent로 제한한다. `reverse`는 final range direction을 뒤집는다.
- `band`는 `paddingInner` 기본 `0`, `paddingOuter` 기본 `0`, `align` 기본 `0.5`; `point`는
  `padding` 기본 `0.5`, `align` 기본 `0.5`를 저장한다. Bandwidth는 band만 positive다.
- `palette`는 sequential/discretized color range descriptor이며 explicit `range`와 mutually exclusive다.
  `interpolate`는 sequential 전용이고 기본은 `"rgb"`다.
- `unknown`은 direct unattached scale에서는 channel을 알 수 없으므로 그대로 저장한다. Consumer가 attach될 때
  concrete channel fallback validation과 supported item-grain policy를 적용한다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. Consumer-specific ordinal range와 `unknown`
  compatibility는 attachment 시점에 검증한다.

### Formal values — `createScale`

```typescript
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal"
  | "sequential" | "quantize" | "quantile" | "threshold";
```

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite; padding?: NonNegativeFinite; align?: UnitInterval; palette?: Palette; interpolate?: ContinuousColorInterpolation; unknown?: unknown })`; type별 validation이 값을 제한한다. `time`은 유일한 UTC temporal token이다.
- Maybe Future (NOT IMPLEMENTED): `{ type?: "identity" | "bin-ordinal" }`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, complete 13-value `ScaleType`, unknown value와 type-specific definition.
  - ⚪ Maybe Future: `"identity" | "bin-ordinal"`.
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
- ✅ Covered: transformed parameter defaults/validation, color interpolation/palette, mapping-policy persistence and
  deferred channel validation for unattached `unknown`.
- Evidence: `test/unit/actions/scales/scale-actions.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js` and grammar scale tests.

## `editScale`

- Implemented: immutable edits for every current `ScaleType`.
- Signature: `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, unknown? })`.
- `id`는 existing scale을 선택한다. 생략하면 current scale, 그렇지 않으면 유일한 scale을 사용하며
  안전하게 하나를 정할 수 없으면 explicit ID를 요구한다.
- 최소 한 editable property가 필요하다. `unknown: undefined`는 existing fallback을 제거한다.
- `domain`/`range`의 `"auto"`는 reset이고 omission은 기존 값을 보존한다. Explicit domain은
  `nice`/`zero`보다 우선하며 `reverse`는 auto 또는 explicit 최종 range에 적용된다.
- `palette`는 color scale의 top-level shorthand이며 canonical `range: { palette }`로 저장한다.
  같은 call의 `range`와는 mutually exclusive다.
- `type`은 unattached scale 또는 compatible consumers에서 atomic하게 전환한다. Quantitative position은
  `linear | log | pow | sqrt | symlog`, continuous quantitative color는 `sequential`, quantitative point color는
  `quantize | quantile | threshold`를 사용한다. Complete definition과 every consumer를 먼저 검증하고 stale
  type-only properties를 제거한다.
- Existing gradient/interval legend는 graphical recipe family를 고정한다. Sequential↔discretized type change처럼
  recipe가 달라지는 edit은 automatic guide replacement 대신 preflight에서 거부한다. Same-family scale edits는
  existing guide를 rematerialize한다.
- Discrete position은 compatible consumers에서 `band ↔ point`를 검증한다. Bar consumer가 있으면
  zero-bandwidth `point` 전환을 거부한다.
- `nice`, `zero`, `clamp`, transformed parameters와 `reverse`는 create contract의 type별 policy를 따른다.
- `unknown`은 row-owned point item에서만 지원한다. Missing/invalid input과 explicit ordinal domain 밖의 input을
  channel-valid concrete fallback으로 mapping하며 domain member를 추가하지 않는다. Compound path, bar, area,
  rule, xOffset와 strokeDash grains는 topology가 달라질 수 있어 명시적으로 거부한다.
- Complete patch와 shared-consumer channel compatibility를 먼저 검증한 뒤 semantic scale을 수정하고,
  scale, mark, axes, grids와 legend consumer를 wrapped materialization plan으로 갱신한다.
- 실패하면 이전 program의 semantic, graphic, context와 trace는 변하지 않는다.

### Formal values — `editScale`

```typescript
type EditableCurrentScale = {
  id?: UserId;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: PositiveFiniteExceptOne;
  exponent?: PositiveFinite;
  constant?: PositiveFinite;
  paddingInner?: UnitIntervalLessThan1;
  paddingOuter?: NonNegativeFinite;
  padding?: NonNegativeFinite;
  align?: UnitInterval;
  palette?: Palette;
  interpolate?: ContinuousColorInterpolation;
  unknown?: unknown;
};
```

- Implemented for unattached scales and compatible connected consumers. Consumer-specific compatibility can narrow
  the complete type vocabulary.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editScale`

- ✅ Covered: existing scale selection through explicit ID, current scale, sole scale, unknown and ambiguous failures.
- ✅ Covered: domain/range patch, `"auto"` reset, omission preservation and caller-owned array isolation.
- ✅ Covered: categorical color palette shorthand, range conflict, invalid palette and non-color rejection.
- ✅ Covered: `nice`, `zero`, `clamp`, `reverse`, type compatibility and invalid value rejection.
- ✅ Covered: concrete point/guide rematerialization, immutable failure and nested trace.
- ✅ Covered: transformed line/area/bar/rule materialization, direct versus later type-edit convergence, stale
  parameter/interpolation removal, sequential/discretized color transitions and invalid atomic transitions.
- ✅ Covered: missing/invalid point fallback, explicit ordinal domain fallback, channel validation, shared point
  consumers and Canvas rematerialization. Unsupported compound-grain fallback is an explicit error contract.
- Evidence: `test/unit/actions/scales/edit-scale.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js`,
  `test/unit/actions/scales/transformed-position-scale.test.js`,
  `test/unit/grammar/scales/mapping-policies.test.js` and transformed-scale chart integration tests.
