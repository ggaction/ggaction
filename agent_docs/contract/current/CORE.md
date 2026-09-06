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
  - ✅ Covered: multi-legend/title resize와 shared-scale consumer plan은 각 owning layout test와
    `editCanvas` plan/convergence test의 bounded composition으로 검증하며 exhaustive cross-product는 비대상이다.
- `background`
  - ✅ Covered: background-only edit가 scale/mark/guide를 rematerialize하지 않음.
- Empty options
  - ✅ Covered: `{}` rejection.
- Proposed values는 `createCanvas`의 responsive/auto 후보와 동일하다.
- Evidence: `test/unit/actions/canvas/edit-canvas.test.js`.

## `fitCanvas`

- Signature: `fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow? } = {})`
- 목적과 필수 state: Full unit program의 기존 Canvas와 현재 layout resource를 기준으로 네 margin을
  줄여 plot 영역을 확장한다. Canvas `width`/`height`, semantic state와 explicit resource option은
  유지한다. Basic에는 노출하지 않으며 composition 호출은 명시적 scope 오류로 거부한다.
- `padding`: 각 edge가 가질 최소 margin인 non-negative finite number이며 기본값은 `0`이다.
- `minPlotWidth`, `minPlotHeight`: 최종 plot의 양의 finite 최소 크기이며 기본값은 각각 `160`, `120`이다.
- `iterationLimit`: edge별 probe 상한인 `1..64` 정수이며 기본값은 `32`다.
- `overflow`: `"error" | "report"`, 기본값은 `"error"`다. Error는 원자적으로 거부한다. Report는
  마지막 유효 margin을 적용하고 `materializationConfigs.fitting.result`에 `"overflow"` 상태와 issue를 저장한다.
- Effect: top→right→bottom→left 순서로 0.25px 격자의 bounded binary search를 수행한다. 각 probe는
  `editCanvas({ margin })`의 기존 consumer rematerialization과 guide collision 검증을 사용한다.
  성공 결과는 normalized policy, final margin/plot, probe 수, status, issue, layout signature를 저장한다.
- 결정성과 lifecycle: 같은 layout과 policy의 반복 호출은 graphic/config가 정확히 같은 상태로 수렴한다.
  이후 resource가 바뀌면 다음 명시적 `fitCanvas` 호출이 새 signature로 다시 계산한다. 저장된 결과는
  마지막 호출의 기록이며 자동 resize observer나 지속 compiler가 아니다.
- 오류: Canvas 부재, unknown/invalid option, minimum plot 또는 iteration bound 미충족을 정책에 따라
  거부하거나 보고한다. 어떤 경우에도 Canvas를 확대하거나 guide를 임의 이동하지 않는다.

### Formal values — `fitCanvas`

- Implemented: `fitCanvas({ padding?: NonNegativeFinite; minPlotWidth?: PositiveFinite; minPlotHeight?: PositiveFinite; iterationLimit?: Integer<1,64>; overflow?: "error" | "report" } = {}): ChartProgram`
- Proposed (NOT IMPLEMENTED): automatic/persistent fitting, Canvas dimension expansion, composition-wide fitting.

### Value coverage — `fitCanvas`

- ✅ Covered: fixed Canvas, margin-only child edit, 0.25px output, bounded probes, exact repeated convergence.
- ✅ Covered: invalid policy, Canvas absence, Full/Basic boundary, minimum plot error/report와 input immutability.
- ✅ Covered: semantic/scale-domain/order invariance, explicit-range preservation, Current catalog,
  package와 browser consumer. Auto range는 fitted plot bounds로 재계산한다.
- Visual boundary는 `fitted-long-labels`에서 explicit final margin primitive와 public fitting 결과의
  graphic/renderer/PNG equivalence로 검증한다.
- Evidence: `test/unit/actions/canvas/fit-canvas.test.js`, `test/contracts/fitting.test.js`,
  `test/charts/fitted-long-labels/`.

## `applyTheme`

- Signature: `applyTheme({ theme })`
- 목적과 필수 state: Unit program에 지속되는 시각 기본값을 적용한다. Canvas나 mark가
  생기기 전에도 호출할 수 있으며, 기존 inherited style과 이후 action이 만드는 resource에
  같은 theme을 적용한다.
- `theme`
  - Status: Implemented. 정확히 `"light" | "dark"`다.
  - Effect: Canvas background와 기존 mark/text/axis/axis-title/grid/legend/title color token을
    원자적으로 교체한다. Box/reference처럼 이전 component가 shared token 밖의 기본색을 쓰는
    경우에도 concrete role을 판정해 읽을 수 있는 dark mark color로 수렴한다. `light`는 library
    default이고 `dark`는 어두운 Canvas에서 읽을 수 있는 대응 token 집합이다.
- 우선순위와 상호작용: explicit local style > program theme > library default다. 사용자가
  현재 theme이나 library default와 같은 값을 명시해도 local override로 저장한다. Field-driven
  color/palette, highlight/selection policy, opacity, geometry, spacing, statistics, grouping,
  domain과 order는 바꾸지 않는다.
- 오류: options 생략/빈 object, unknown theme/option, composition program 호출을 거부한다.
- Coverage: `test/unit/actions/theme.test.js`가 immediate/later apply, light↔dark swap,
  same-value override, Parallel/Polar/legend/title/Box/reference, semantic stability와 immutability를
  검증한다. `test/contracts/theme.test.js`는 public unit chart corpus 전체를 검증한다.

### Formal values — `applyTheme`

- Implemented: `applyTheme({ theme: "light" | "dark" }): ChartProgram`
- Proposed (NOT IMPLEMENTED): custom theme-token object와 composition-wide theme propagation.

### Value coverage — `applyTheme`

- `theme`
  - ✅ Covered: `"light"`, `"dark"`, repeated apply, swap, apply-before-resources와 invalid value rejection.
- Local override
  - ✅ Covered: custom value, built-in default와 같은 explicit value, theme 적용 전후 authored value,
    Parallel field별 override, facade/component override와 field-driven mark/legend appearance 보존.
- Semantic boundary
  - ✅ Covered: semantic spec와 resolved scale byte-equivalent snapshot, statistical regression output,
    draw order, source program immutability, public unit chart 51개 corpus.
- Visual boundary
  - ✅ Covered: `dark-theme-scatterplot`의 explicit low-level style primitive와 public `applyTheme`
    program 사이 exact graphic/renderer/decoded PNG pixel equivalence.
- Proposed custom/composition values는 token validation과 child-owner propagation 계약 뒤에 검토한다.
- Evidence: `test/unit/actions/theme.test.js`, `test/contracts/theme.test.js`,
  `test/charts/dark-theme-scatterplot/`.

## `removeTheme`

- Signature: `removeTheme()`
- 목적과 필수 state: active program theme을 제거하고 inherited style을 library default로 되돌린다.
- Effect: active theme metadata를 제거한다. Explicit local style과 semantic/scale state는 보존한다.
- 오류와 상호작용: active theme이 없거나 option을 전달하면 거부한다. 이전 immutable themed
  program은 그대로 유지된다.
- Coverage: `test/unit/actions/theme.test.js`가 dark reset, local override 보존, invalid lifecycle,
  source immutability를 검증한다.

### Formal values — `removeTheme`

- Implemented: `removeTheme(): ChartProgram`
- Proposed (NOT IMPLEMENTED): resource-subtree별 partial theme removal.

### Value coverage — `removeTheme`

- Active lifecycle
  - ✅ Covered: dark→library default, local value 유지, theme metadata 제거와 inactive rejection.
- Arguments
  - ✅ Covered: no arguments only; unknown option rejection.
- Partial removal은 program-wide precedence를 모호하게 하므로 현재 future proposal이다.
- Evidence: `test/unit/actions/theme.test.js`.

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
  - ✅ Covered: deeply nested arrays/objects, `null`, `undefined`, non-finite number와 bigint cell ownership/freeze.
  - 🟣 Proposed: async iterable/columnar input adapter. Source dataset immutability와 deterministic trace
    completion 정책이 먼저 필요하다.
- Evidence: `test/unit/actions/data/create-data.test.js`.

## `bindMarkData`

- Signature: `bindMarkData({ target, data })`
- 목적과 필수 state: 기존 independent mark를 이미 materialize된 다른 dataset에 원자적으로 연결하고
  해당 mark가 소비하는 scale, guide, label, selection/highlight와 concrete graphic을 dependency 순서로
  다시 만든다.
- `target`: 필수 mark ID다. Composite owner나 그 child, density/horizon/final-item filter처럼 자체
  source lifecycle을 가진 mark는 해당 resource의 edit/filter action을 사용해야 하며 이 action은 거부한다.
- `data`: 필수 existing dataset ID다. `values`가 없는 definition-only `createDerivedData` 결과는 mark가
  소비할 수 없으므로 거부한다.
- preflight와 atomicity: immutable speculative branch에서 전체 rebind와 rematerialization plan을 먼저
  실행한다. 새 row가 encoding field/type/grain, coordinate placement, shared scale domain, guide, label,
  selection/highlight의 기존 계약을 충족하지 못하면 첫 public 상태 변경 전에 전체 action이 실패한다.
- Effect: wrapped `rebindLayerData`가 semantic consumer transition을 trace에 남기고, 기존 registered
  rematerializer가 새 dataset을 기준으로 concrete state를 수렴시킨다. Source program과 이전 dataset은
  그대로 유지하며 같은 dataset으로의 빈 변경은 거부한다.
- Coverage: `test/unit/actions/data/bind-mark-data.test.js`가 호환 data 재연결, field/type/definition-only
  rejection, composite lifecycle, full trace와 이전 program 불변성을 검증한다.

### Formal values — `bindMarkData`

- Implemented: `bindMarkData({ target: UserId; data: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): composite 전체 역할 변경. 각 composite owner의 aggregate edit가 담당한다.

### Value coverage — `bindMarkData`

- ✅ Covered: explicit target/data, existing materialized data, scale+mark rematerialization과 item cardinality 변경.
- ✅ Covered: missing field, incompatible quantitative type, definition-only dataset, missing IDs, empty/same bind,
  unknown option과 immutable atomic rejection.
- ✅ Covered: Box와 owned transform consumer가 generic single-layer bind를 우회하지 못함.
- Evidence: `test/unit/actions/data/bind-mark-data.test.js`.

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
  - ✅ Covered: empty-list rejection, duplicate-value set semantics와 direct `null` membership.
- `predicate`
  - ✅ Covered: 모든 여섯 operator, strict no-coercion, numeric/string order, invalid operator/operand와 owned provenance.
- `range`
  - ✅ Covered: inclusive default, exclusive endpoints, equal-endpoint empty result, invalid order/type/inclusive와 owned provenance.
- Mode interaction
  - ✅ Covered: exactly-one mutual exclusivity, source immutability/order와 primitive/public chart equivalence.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

## `createSummaryData`

- Signature: `createSummaryData({ id, source?, groupBy?, aggregates, members? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `groupBy`: field name 또는 unique field-name array이며 기본은 `[]`다. Observed group을 source의 첫
  등장 순서로 만들며 categorical combination을 합성하지 않는다.
- `aggregates`: 1..64개의 `{ op, field?, as }`다. `op`는 공통 `AggregateOperation` 전체를 재사용한다.
  `count`는 row count이므로 field를 받지 않고 다른 op는 field가 필수다. `as`는 group/output과 겹치지
  않는 고유 field 이름이다.
- `members`: optional output field 이름이다. 각 summary row가 해당 source group의 원래 rows를 보존한다.
  Group/output alias와 충돌하면 거부한다.
- Effect: normalized `summary` provenance와 concrete values를 같은 호출에서 완성한다. Ungrouped empty
  source는 aggregate identity를 표현하는 한 row를 만들며 `count`는 0이다. Grouped empty source는
  observed group이 없으므로 `[]`다. Missing 수치 결과는 기존 aggregate owner와 동일하게 `undefined`다.
- 오류: missing source/group/aggregate/order field, duplicate group/output, incompatible aggregate field
  type, non-scalar group key, unsupported op와 10,000 group 초과를 첫 semantic change 전에 거부한다.
- Coverage: `test/unit/actions/data/summary-data.test.js`가 multi-aggregate, ordered aggregate, members,
  stable group order, empty grain, ownership, mark consumption과 invalid matrix를 검증한다.

### Formal values — `createSummaryData`

- Implemented: `createSummaryData({ id: UserId; source?: UserId; groupBy?: FieldName | readonly FieldName[]; aggregates: readonly { op: AggregateOperation; field?: FieldName; as: FieldName }[]; members?: FieldName }): ChartProgram`
- Proposed (NOT IMPLEMENTED): full categorical cube/empty-group synthesis, callback aggregate.

### Value coverage — `createSummaryData`

- ✅ Covered: grouped/ungrouped, first-appearance ordering, count/mean/missing/ordered first, multiple outputs.
- ✅ Covered: ungrouped/grouped empty input, null numeric member, members provenance and caller ownership.
- ✅ Covered: field/type/alias/shape/unknown option and immutable rejection.
- Evidence: `test/unit/actions/data/summary-data.test.js`.

## `createBinData`

- Signature: `createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as? })`
- `id`, `source`, `field`: 새 immutable derived ID, materialized source와 필수 quantitative field다.
- Bin mode: `maxBins`(기본 10), positive `step`, 또는 strictly increasing finite `boundaries` 중 하나다.
  기존 Histogram의 `resolveHistogramBins`와 `findHistogramBinIndex`를 그대로 사용한다.
- `extent`: 기본 `"auto"` 또는 ascending finite pair다. Explicit extent/boundaries는 모든 source value를
  포함해야 하며 out-of-range row를 조용히 버리지 않는다.
- `nice`, `zero`: Histogram boundary policy와 같은 boolean이며 기본값은 `true`, `false`다.
- `includeEmpty`: 기본 `true`로 resolved boundary의 모든 bin을 보존한다. `false`는 count 0 bin만 제거한다.
- `members`: 기본 `false`. `true`면 각 bin의 original source rows를 output에 저장한다.
- `as`: `{ lower?, upper?, count?, members? }`; 기본은 `${field}_start`, `${field}_end`, `count`, `members`다.
  모든 enabled output은 고유해야 하며 `as.members`는 `members:true`에서만 허용한다.
- Edge: `[lower, upper)`이고 마지막 bin만 upper endpoint를 포함한다. Resolved domain, step와 boundaries를
  transform provenance의 `resolved`에 저장한다. Output은 lower/upper/count/member로 즉시 소비 가능하다.
- 오류: non-finite source, mixed modes, invalid/alignment/coverage boundary, alias collision, invalid boolean과
  generated-bin bound를 첫 state change 전에 거부한다.
- Coverage: `test/unit/actions/data/bin-data.test.js`가 boundary edge, max/step/explicit mode, empty omission,
  resolved provenance, ranged Rect consumption과 invalid matrix를 검증한다.

### Formal values — `createBinData`

- Implemented: `createBinData({ id: UserId; source?: UserId; field: FieldName; maxBins?: PositiveInteger; step?: PositiveFinite; boundaries?: readonly [Finite, Finite, ...Finite[]]; extent?: "auto" | OrderedFinitePair; nice?: boolean; zero?: boolean; includeEmpty?: boolean; members?: boolean; as?: BinDataOutputFields }): ChartProgram`; bin mode는 상호 배타다.
- Proposed (NOT IMPLEMENTED): out-of-range drop/clamp policy와 weighted count.

### Value coverage — `createBinData`

- ✅ Covered: explicit boundaries와 마지막 endpoint, equal max bins, zero-anchored step, auto/explicit extent.
- ✅ Covered: include/omit empty, members, custom/default outputs, concrete ranged mark consumption.
- ✅ Covered: out-of-range, non-finite/missing field, invalid mode/boundary/boolean/alias와 immutable rejection.
- Evidence: `test/unit/actions/data/bin-data.test.js`.

## `createFoldData`

- Signature: `createFoldData({ id, source?, fields, as? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `fields`: 1..64개의 unique source field 이름이다. Output은 source row 순서 안에서 이 목록의 순서를
  사용하므로 grain은 정확히 `source row × selected field`다.
- `as`: `{ key?, value? }`이며 기본은 `key`, `value`다. 두 output 이름은 서로 달라야 하고 source에
  이미 존재하는 field와 겹칠 수 없다.
- Effect: 각 output row는 source row의 모든 cell을 보존하고 key output에 선택한 field 이름, value
  output에 해당 cell을 추가한다. Selected value는 finite number, string 또는 boolean 중 하나이며 한
  materialization에서는 공통 primitive type이어야 한다. Empty source는 empty output을 만든다.
- 오류: duplicate/missing selected field, null/undefined/non-finite/structured value, mixed primitive type,
  output collision, unknown option과 10,000 output row 초과를 첫 semantic change 전에 거부한다.
- Coverage: `test/unit/actions/data/fold-data.test.js`가 stable row/field order, source-cell 보존, defaults,
  empty input, ordinary mark consumption, alias/type/missing/shape와 bounds를 검증한다.

### Formal values — `createFoldData`

- Implemented: `createFoldData({ id: UserId; source?: UserId; fields: readonly FieldName[]; as?: { key?: FieldName; value?: FieldName } }): ChartProgram`
- Proposed (NOT IMPLEMENTED): heterogeneous value union, null-preserving fold와 source-field replacement.

### Value coverage — `createFoldData`

- ✅ Covered: explicit field order, row-major expansion, default/custom aliases and original cell preservation.
- ✅ Covered: numeric common type, mixed/missing/non-finite/structured rejection, empty source.
- ✅ Covered: field/output uniqueness, source collision, 64-field and 10,000-row bounds, immutable rejection.
- Evidence: `test/unit/actions/data/fold-data.test.js`.

## `createComputedData`

- Signature: `createComputedData({ id, source?, as, expression })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `as`: 모든 source row에서 아직 존재하지 않는 non-empty output field다.
- `expression`: callback/string/eval이 아닌 recursive data AST다. Leaf는 `{ field }` 또는 finite
  `{ constant }`; unary는 `{ op: "negate" | "absolute", operand }`; binary는
  `{ op: "add" | "subtract" | "multiply" | "divide", left, right }`다.
- Effect: source row와 모든 existing cell을 보존하고 각 row에 한 finite quantitative output을 추가한다.
  Serialized transform 자체가 exact formula provenance다. Facet replay에서는 row-preserving transform으로
  처리한다.
- 오류: missing/non-finite operand, divide-by-zero, overflow/non-finite result, output collision, unknown 또는
  malformed expression node를 첫 state change 전에 거부한다. Expression은 depth 16, 128 nodes,
  `rows × nodes` 10,000,000 work로 제한한다.
- Coverage: `test/unit/actions/data/computed-data.test.js`가 field/constant, 모든 unary/binary family,
  nested formula, ownership, mark consumption과 invalid/non-finite matrix를 검증한다.

### Formal values — `createComputedData`

- Implemented: `createComputedData({ id: UserId; source?: UserId; as: FieldName; expression: ComputedExpression }): ChartProgram`
- Proposed (NOT IMPLEMENTED): callbacks, expression strings, conditionals, group aggregates, null propagation,
  transcendental functions와 arbitrary code evaluation.

### Value coverage — `createComputedData`

- ✅ Covered: add/subtract/multiply/divide, negate/absolute, field/finite constant and nested expressions.
- ✅ Covered: missing/non-finite input, zero denominator, finite overflow and output collision rejection.
- ✅ Covered: strict node shape/vocabulary, immutable ownership, row grain, depth/node/work bounds.
- Evidence: `test/unit/actions/data/computed-data.test.js`.

## `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear" | "polynomial" | "loess"`. 기본값은 `"linear"`다.
- `degree`, `span`: Implemented method-specific parameter다. polynomial degree 기본값은 `2`, LOESS
  span 기본값은 `0.75`이며 다른 method와 함께 주면 오류다. Degree는 `1..32`다.
- `confidence`: Implemented. `(0, 1)`의 finite number이며 기본값은 `0.95`다. Student-t
  mean-response confidence bounds의 폭을 바꾼다.
- `interval`: Implemented `"mean" | "prediction"`이며 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping과 resolved method defaults를 transform provenance에 저장하고 observed
  unique x별 fitted row를 materialize한다. Polynomial은 normalized basis의 stable least squares를 사용하고
  LOESS는 source-order tie를 가진 tricube local-linear neighbors를 사용한다. Linear/polynomial은
  lower/upper를 만들고 LOESS는 fitted y만 만든다. Finite extreme input은 centered/scaled arithmetic으로
  계산하며 fitted value, model coefficient 또는 interval endpoint가 finite number로 표현될 수 없으면
  materialization 전에 명확히 거부한다. 전체 unique group/x output은 최대 `10,000` rows다.
  Polynomial work `sum(n*(degree+1)^2+(degree+1)^3)`와 LOESS work
  `sum(n*uniqueX*ceil(log2(n+1)))`는 각각 `10,000,000`을 넘기 전에 거부한다. graphic은 직접 만들지 않는다.
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
  - ✅ Covered: near-zero positive confidence normalization과 invalid 0/1 boundaries; numerical kernels have
    independent finite-bound invariants.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - ✅ Covered: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Numeric range
  - ✅ Covered: overflow-safe linear/polynomial response means, full-range LOESS distance normalization,
    finite fitted rows와 unrepresentable interval rejection.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/cars-regression-scatterplot/reference-values.test.js`.

## `createDensityData`

- Signature: `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as? })`
- `id`, `source`, `field`, `groupBy`: Implemented. 새 derived ID, existing source, 필수 quantitative
  field와 optional grouping field다.
- `bandwidth`
  - Status: Implemented. positive finite number 또는 `"auto"`; 기본은 `"auto"`다.
  - Effect: 선택한 kernel 폭을 결정한다. requested `"auto"`는 그대로 보존하고 deterministic
    Scott-rule 결과는 revision-owned `resolved.bandwidth`에 별도로 저장한다.
- `extent`
  - Status: Implemented. `"auto"` 또는 오름차순 finite `[min, max]`; 기본은 `"auto"`다.
  - Effect: 모든 group이 공유하는 sample grid의 시작과 끝을 결정한다. requested `"auto"`는 그대로
    보존하고 concrete extent는 `resolved.extent`에 저장한다.
- `steps`
  - Status: Implemented. `2..10,000` integer이며 기본값은 `100`이다.
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
- Effect: grouped KDE provenance와 deterministic values를 저장한다. Requested bandwidth/extent와
  revision-owned resolved bandwidth/extent를 분리하며, resolved kernel과 normalization default도 항상
  provenance에 기록한다. Finite extent difference가 overflow해도 convex interpolation으로 sample grid를
  만들며, requested step 수만큼 strictly increasing finite sample이나 finite density를 표현할 수 없으면
  derived dataset을 만들기 전에 거부한다.
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
  - ✅ Covered: positive finite validation, representative explicit/auto values and kernel formula invariants;
    exhaustive magnitude stress is outside the deterministic contract.
- `extent`
  - ✅ Covered: `"auto"`, explicit `[min, max]`, reversed/non-finite rejection.
  - ✅ Covered: strict ascending extent rejects constant/reversed pairs; explicit source-external extent materializes
    its requested sample endpoints.
- `steps`
  - ✅ Covered: default `100`, explicit representative, `<2`/non-integer rejection.
  - ✅ Covered: exact minimum `2`, representative/default counts and invalid bounds. Unbounded performance stress is
    not a public semantic contract.
- `as`
  - ✅ Covered: inferred names, two explicit names, wrong cardinality/invalid names rejection.
- `kernel`
  - ✅ Covered: four formulas, Gaussian default, invalid value, provenance와 primitive/public parity.
- `normalization`
  - ✅ Covered: unit/count formulas, unit default, group-local scaling, invalid value와 provenance.
- Numeric range
  - ✅ Covered: full finite-range extent interpolation, large-offset auto bandwidth, finite density invariant와
    unrepresentable grid/estimate rejection.
- Resource limits: 실제 non-empty group/split profile의 `steps` 합은 최대 `10,000` rows이며,
  `validRows * steps` density work는 최대 `10,000,000`이다.
- Evidence: `test/unit/actions/data/density-data.test.js`,
  `test/charts/cars-density-area/reference-values.test.js`.

## `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 정확히 하나의 transform definition을 가진 tuple. Public direct-authoring union은
  filter/fold/computed/regression/density/interval/time-unit/window/summary/bin/bin2d schema이며 값 materialization은 해당 전용 action이 담당한다. Box summary,
  box outlier, mark filter provenance는 composite action이 생성하는 internal transform으로 public union에 넣지 않는다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty/multiple transform schema를 거부한다.
- Consumer precondition: chart facade와 ordinary mark의 공통 data selection은 `values`가 있는 dataset을 요구한다.
  Definition-only ID를 explicit/current data로 소비하면 dataset ID와 materialized values의 필요성을 설명하는
  domain error를 낸다. 정의 생성·internal rebind는 유지하며 자동 실행하거나 다른 dataset으로 fallback하지 않는다.
- Coverage: `test/unit/actions/data/derived-data.test.js`가 public branch의 direct call, 배열 cardinality,
  invalid discriminant와 caller-owned input immutability를 검증한다. Package consumer는 documented filter call과
  closed union을 strict TypeScript로 compile한다.

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [DatasetTransform] })`, where public `DatasetTransform = FilterTransform | FoldTransform | ComputedTransform | RegressionTransform | DensityTransform | IntervalTransform | TimeUnitTransform | WindowTransform | SummaryTransform | BinTransform | Bin2DTransform`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/fold/computed/regression/density/interval/time-unit/window/summary/bin/bin2d direct schema, object/empty/multiple/unknown rejection,
    one-element tuple acceptance와 deep immutable ownership.
  - Built-in value materializer는 owning high-level action이 만든 single-transform resource만 받는다.
- Evidence: `test/unit/actions/data/derived-data.test.js`, `test/unit/actions/data/derived-consumers.test.js`,
  `scripts/package-consumer.js`, 각 high-level data action test.

## `createTimeUnitData`

- Optional temporalUnit uses the common explicit input parser and is stored on the timeUnit transform.
  It controls input interpretation; unit controls the calendar bucket. Output is always a UTC timestamp.
  Bind output as temporal with temporalUnit:"timestamp" to avoid the legacy numeric-year heuristic.

유효한 input timestamp라도 요청한 bucket 시작이 Date의 표현 범위 밖이면 RangeError로 거절한다.
NaN bucket을 저장하지 않으며 실패 시 source program과 trace는 유지된다.

- Signature: `createTimeUnitData({ id, source?, field, temporalUnit?, unit, as })`
- Lifecycle: immutable create-only다. `id`는 필수 새 derived dataset ID이며 existing dataset을 수정하거나 consumer를
  rebind하지 않는다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하며 안전하게 추론할 수 없으면 오류다.
- `field`: 모든 row에 존재하는 temporal input field다. Existing temporal normalization과 동일하게 finite timestamp,
  ISO/date string 또는 four-digit year를 받는다.
- `unit`: `"year" | "quarter" | "month" | "day" | "hour" | "minute" | "second"`의 closed vocabulary다.
- `as`: source의 어느 row에도 존재하지 않는 새 output field다. Input field와 달라야 한다.
- Effect: source row order와 모든 existing cell을 보존하고 `as`에 UTC calendar bucket 시작의 finite timestamp를
  추가한다. Stored provenance는 `{ type: "timeUnit", field, unit, as }`이며 wrapped
  `materializeTimeUnitData`가 concrete values를 기록한다.
- UTC policy: year는 1월 1일, quarter는 1·4·7·10월 첫날, 나머지는 requested calendar component의 시작이다.
  Second는 millisecond를 내림한다. Local timezone, DST와 locale에 의존하지 않는다.
- Facet: row-preserving transform으로 분류한다. Explicit earlier partition anchor를 사용하면 각 child에서 canonical
  materializer를 replay하고, transform 자체가 latest common anchor이면 materialized rows를 직접 partition한다.
- 오류: invalid/duplicate ID, unknown source, unknown option/unit, invalid/missing temporal value, input/output identity와
  existing output collision을 첫 state change 전에 거부한다.

### Formal values — `createTimeUnitData`

- Implemented: `createTimeUnitData({ id: UserId; source?: UserId; field: FieldName; temporalUnit?: "auto" | "year" | "timestamp"; unit: "year" | "quarter" | "month" | "day" | "hour" | "minute" | "second"; as: FieldName })`.
- `DatasetTimeUnitTransform = { readonly type: "timeUnit"; readonly field: FieldName; readonly unit: TimeUnit; readonly as: FieldName }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): Week, local timezone/DST, aggregation, resampling과 edit/revision action은 없다.

### Value coverage — `createTimeUnitData`

- `unit`
  - ✅ Covered: seven literal boundaries, quarter endpoints, leap-day input, sub-day precision와 early year.
- `field`, `as`
  - ✅ Covered: timestamp/ISO/date/year inputs, missing/invalid input, distinct output와 collision rejection.
- Lifecycle and integration
  - ✅ Covered: current/explicit source, immutable provenance/rows/options, action hierarchy, direct transform schema,
    temporal position consumption, registered replay와 explicit-anchor facet rederivation.
- Evidence: `test/unit/grammar/transforms/time-unit.test.js`,
  `test/unit/actions/data/time-unit-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `scripts/package-consumer.js`.

## `createWindowData`

결과 field 이름은 일반 own data property로 저장한다. __proto__, constructor, toString도 허용하며
source row의 prototype을 바꾸거나 결과를 누락하지 않는다. 뒤 operation은 앞의 해당 결과를 field로 읽을 수 있다.

- Signature: `createWindowData({ id, source?, partitionBy?, sortBy?, operations })`
- Lifecycle: immutable create-only다. `id`는 새 derived dataset ID여야 하며 동일 ID를 다시 만들면 오류다.
  기존 source나 consumer를 교체하거나 rebind하지 않는다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하고 유일하게 추론할 수 없으면 오류다.
- `partitionBy`: field 이름 하나 또는 field 이름 array다. 기본은 `[]`이며 전체 source가 한 partition이다.
- `sortBy`: `{ field, order? }` array다. 기본은 `[]`, order 기본은 `"ascending"`이다. 여러 field는
  앞에서부터 비교하고 동률은 source row order로 안정적으로 해소한다. `null`/missing은 각 방향의 끝에 둔다.
- `operations`: 비어 있지 않은 ordered array다. 앞 operation의 output을 뒤 operation의 `field`로 사용할 수 있다.
  - `rowNumber`, `rank`, `denseRank`: `{ op, as }`; rank 계열은 non-empty `sortBy`가 필요하다.
  - `cumulativeSum`: `{ op, field, as }`; field 값은 모두 finite number여야 한다.
  - `lag`, `lead`: `{ op, field, as, offset?, default? }`; offset 기본은 `1`, default 기본은 `null`이다.
  - `movingMean`, `movingSum`: `{ op, field, as, frame }`; `frame.preceding`은 required non-negative
    integer, `following`은 optional non-negative integer이며 기본 `0`이다. Sorted partition의 current row를
    포함하고 양쪽 edge에서는 available rows로 truncate한다. Sum과 mean은 scaled compensated arithmetic을
    사용하며 input과 모든 materialized output은 finite number여야 한다. 표현 불가능한 prefix/frame output은
    partial row를 만들기 전에 거부한다.
- Effect: normalized provenance와 materialized values를 새 dataset에 저장한다. 계산은 partition마다 정렬된
  순서로 수행하지만 최종 rows는 source row order를 보존한다. 모든 input과 output은 구조적으로 복사되고 freeze된다.
- 오류: duplicate/invalid ID, unknown source, missing field, duplicate sort/output field, output collision,
  incomparable sort values, invalid operation 또는 operation-specific option을 명확히 거부한다.
- Coverage: grammar, public action, direct derived schema, trace, facet replay와 package consumer를 각각 검증한다.

### Formal values — `createWindowData`

- Implemented: `createWindowData({ id: UserId; source?: UserId; partitionBy?: FieldName | readonly FieldName[]; sortBy?: readonly { field: FieldName; order?: "ascending" | "descending" }[]; operations: readonly WindowOperation[] })`
- `WindowOperation = { op: "rowNumber" | "rank" | "denseRank"; as: FieldName } | { op: "cumulativeSum"; field: FieldName; as: FieldName } | { op: "lag" | "lead"; field: FieldName; as: FieldName; offset?: PositiveInteger; default?: unknown } | { op: "movingMean" | "movingSum"; field: FieldName; as: FieldName; frame: { preceding: NonNegativeInteger; following?: NonNegativeInteger } }`
- Planned (NOT IMPLEMENTED): edit/revision action, percent rank, ntile.
- Proposed (NOT IMPLEMENTED): duration/weighted windows, `minPeriods`와 missing-row imputation.

### Value coverage — `createWindowData`

- `partitionBy`, `sortBy`
  - ✅ Covered: omitted/single/multiple partition fields, omitted/multiple sort fields, both directions,
    stable ties, null/missing placement, invalid fields and mixed comparable types.
- `operations`
  - ✅ Covered: all eight operations, offset/frame defaults, one/two-sided and zero frames, truncated edges,
    sequential dependency, output collision, missing fields, invalid values, finite extreme means,
    unrepresentable sum outputs and empty operation list.
- Lifecycle and integration
  - ✅ Covered: source inference, duplicate ID rejection, source immutability, trace hierarchy, registry dispatch,
    facet replay, direct `createDerivedData` validation and packaged TypeScript/runtime consumption.
- Evidence: `test/unit/grammar/transforms/window.test.js`, `test/unit/actions/data/window-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-window-rank-scatterplot/data.test.js`,
  `test/charts/airline-passenger-moving-windows/`, `scripts/package-consumer.js`.

## `createBin2DData`

- Signature: `createBin2DData({ id, source?, x, y, bins?, extent?, includeEmpty?, members?, as? })`
- Lifecycle: stable logical owner를 가진 mutable resource다. 첫 호출은 `id` dataset을 만들고, 같은 `id`의
  후속 호출은 deterministic revision dataset을 만든 뒤 direct layer consumer를 명시적으로 rebind하고 이전
  unreferenced revision을 release한다. Earlier program과 caller input은 바뀌지 않는다.
- `source`: existing materialized dataset ID다. 첫 호출에서 생략하면 current data를 사용한다. Revision에서
  생략하면 이전 revision의 source를 보존한다.
- `x`, `y`: finite numeric pair를 읽을 source field다. 한쪽이라도 invalid/missing인 row는 eligible하지 않다.
- `bins`: positive integer 또는 `{ x, y }`; 기본 `{ x: 10, y: 10 }`이다. 각 축은 최대 10,000 bins,
  전체 grid는 최대 1,000,000 cells다.
- `extent`: optional `{ x?, y? }` explicit increasing finite endpoints다. 생략 axis는 eligible min/max를 쓴다.
  Explicit extent는 모든 eligible 값을 포함해야 하며 auto extent가 constant면 오류다.
- `includeEmpty`: 기본 `false`. `true`면 deterministic y-major/x-minor 순서로 빈 cell도 저장한다.
- `members`: 기본 `false`. `true`면 source row object가 아니라 source row index array를 cell에 저장한다.
- `as`: generated `x0/x1/y0/y1/count/members` field 이름을 부분 override한다. Default는 `id` namespace를 쓴다.
- Revision에서 output 이름이 바뀌면 direct visual consumer의 같은 output role을 참조하던 encoding field,
  category-order summary, theta weight, Parallel dimension field/key, stored field selection과 jitter key도 새 이름으로
  rebind한다. Parallel dimension의 stored title label은 보존한다. Scale, mark와 inferred guide title은 그 semantic
  binding에서 다시 materialize된다. Optional members
  output을 제거할 때 남은 direct consumer binding이 이를 참조하면 revision을 원자적으로 거부한다.
- Effect: normalized request와 resolved extent/edges/count metadata를 transform provenance에 저장하고, 각 cell의
  lower/upper bounds와 count를 immutable values로 저장한다. Cell은 `[lower, upper)`이며 마지막 upper bound만
  포함한다. 모든 edge는 finite strictly increasing number다. Full finite numeric range처럼 raw span이 overflow하는
  extent도 안정적으로 보간하며, 요청한 bin 수만큼 서로 다른 edge를 표현할 수 없으면 bin 수를 조용히 줄이지 않고
  materialization 전에 `RangeError`를 던진다.
- Facet: source partition 뒤 requested transform을 child마다 replay하므로 automatic extent와 counts는 child
  rows에서 다시 계산된다.
- 오류: invalid field/bin/extent/output contract, per-axis/total grid limit 초과, unrepresentable edge count,
  eligible row 부재, silent explicit-extent data loss, duplicate output names를 state 생성 전에 거부한다. 현재
  direct derived-dataset consumer가 있는 owner revision replacement는 dependency를 조용히 stale하게 두지 않고
  명확히 거부한다.

### Formal values — `createBin2DData`

- Implemented: `createBin2DData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; includeEmpty?: boolean; members?: boolean; as?: { x0?, x1?, y0?, y1?, count?, members? } })`
- Planned (NOT IMPLEMENTED): dependent derived-dataset revision cascade, weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBin2DData`

- Grid and boundaries
  - ✅ Covered: scalar/per-axis counts, automatic/partial/complete explicit extents, interior and final boundaries,
    row-major order, empty omission/inclusion, constant extent, per-axis/total limits, full finite-range interpolation,
    unrepresentable edge count and silent-loss rejection.
- Output
  - ✅ Covered: namespaced/partial/custom fields, optional member indexes, unique fields, count conservation and
    independent Cars oracle parity.
- Lifecycle and integration
  - ✅ Covered: source inference, filtered source, repeated immutable revision, direct mark/scale/guide rematerialization,
    release, facet replay, direct transform schema, runtime and strict TypeScript package consumption.
- Evidence: `test/unit/grammar/transforms/bin2d.test.js`, `test/unit/actions/data/bin2d-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-binned-heatmap/data.test.js`,
  `scripts/package-consumer.js`.

## `editBin2DData`

- Signature: `editBin2DData({ target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as? })`.
- Target: `target`은 materialization registry의 stable logical Bin2D owner ID다. 생략하면
  `context.currentData`가 가리키는 current revision의 owner, 그 다음 유일한 owner를 사용한다. Current match가 없고
  owner가 둘 이상이면 명시적 `target`을 요구하며 첫 owner를 선택하지 않는다.
- Partial edit: `target` 외 최소 한 option과 complete candidate 기준 실제 source/transform 변화가 필요하다. Omitted
  top-level option은 current revision의 requested transform provenance에서 보존한다. Explicit `bins`와 `extent`는
  create-time vocabulary 전체를 교체하므로 `extent` object에서 생략한 axis는 automatic extent로 돌아간다.
- Output and members: explicit `as`는 `x0/x1/y0/y1/count`와, `members: true`일 때 `members`까지 complete output map을
  요구한다. `as`를 생략하고 members를 켜면 logical owner namespace의 members field를 추가하고, 끄면 prior members
  output을 제거한다. 다른 output field는 보존한다.
- Atomic effect: complete source rows와 transform을 계산하고 derived-dataset dependency 및 모든 direct visual
  consumer의 rematerialization을 speculative immutable branch에서 먼저 검증한다. 성공하면 deterministic revision ID로
  새 dataset을 만들고 wrapped `rebindLayerData` 뒤 output role에 연결된 downstream semantic/config field를 새 output
  이름으로 옮긴 다음 scale/mark/guide materialization plan을 적용하며, 참조가 없어진 prior revision만
  `releaseDerivedData`로 정리한다. Logical owner ID와 consumer layer/scale/coordinate/guide/selection identity는 유지한다.
- Compatibility: `createBin2DData({ id: existing, ...completeTransform })`의 full reauthor/revision 동작은 유지한다.
  Partial intent에는 `editBin2DData`를 사용한다. Derived dataset이 current revision을 직접 소비하면 silent cascade 대신
  edit를 state 생성 전에 거부한다.
- Immutability: previous program, prior revision, source rows와 caller-owned nested options를 변경하지 않는다.

### Formal values — `editBin2DData`

- Implemented: `editBin2DData({ target?: UserId; source?: UserId; x?: FieldName; y?: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; includeEmpty?: boolean; members?: boolean; as?: { x0: FieldName; x1: FieldName; y0: FieldName; y1: FieldName; count: FieldName; members?: FieldName } })`.
- Planned (NOT IMPLEMENTED): dependent derived-dataset revision cascade, weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editBin2DData`

- Owner and partial state
  - ✅ Covered: explicit/current/unique owner resolution, missing/empty/ambiguous/no-op rejection, every editable top-level
    option, omission preservation, complete output map and members output transition.
- Revision and dependencies
  - ✅ Covered: deterministic immutable revision, every direct layer rebind, scale/mark/guide rematerialization, prior release,
    derived-consumer rejection, output-role rename across Cartesian/category/Polar/Parallel bindings and stored selection/jitter,
    referenced optional-output removal rejection, downstream failure preflight and exact trace uniqueness.
- Compatibility and immutability
  - ✅ Covered: repeated-create behavior, earlier program, source rows and caller option preservation, runtime/types/contracts,
    packed Node/TypeScript/Browser and representative Canvas/PNG consumers.
- Evidence: `test/unit/actions/data/bin2d-data.test.js`, `test/contracts/bin2d-lifecycle-render.test.js`,
  `test/browser/package-consumer.browser.js`, `scripts/package-consumer.js`.

## `createCoordinate`

- Signature: `createCoordinate({ id?, type?, layers? })`.
- `id`: valid user ID, 기본 `"main"`.
- `type`: `"cartesian" | "polar" | "parallel"`, 기본 cartesian.
- `layers`: existing unique layer ID array, 기본 `[]`.
- Effect: named semantic coordinate를 만들고 coordinate가 없는 selected layers에 reference를 저장한다.
  equivalent repeated definition은 idempotent이고 기존 layer를 다른 coordinate로 이동시키지 않는다.
- Coverage: `test/unit/actions/coordinates/create-coordinate.test.js`와 Parallel chart contract가 all three types, attachments,
  idempotence, conflicts와 validation을 검증한다.
- Cartesian, Polar와 Parallel resources는 모두 current materialized consumers와 guides를 가진다.

### Formal values — `createCoordinate`

- Implemented: `createCoordinate({ id?: UserId; type?: "cartesian" | "polar" | "parallel"; layers?: readonly UserId[] } = {})`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createCoordinate`

- `id`: ✅ Covered omission→`"main"`, valid custom IDs, malformed IDs and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"cartesian"`, `"cartesian"`, `"polar"`, `"parallel"`, unknown value.
- `layers`
  - ✅ Covered: omission/empty, one/multiple existing IDs, duplicates, unknown layer, reattachment conflict.
- Evidence: `test/unit/actions/coordinates/create-coordinate.test.js`.

## `createScale`

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "band" | "point" | "ordinal" | "sequential" | "quantize" | "quantile" | "threshold"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. Direct continuous/time scale은 두 finite numeric values를
  사용하며 time 값은 UTC timestamp다. Quantitative transformed position의 auto domain이 하나의 finite
  관측값으로 축약되면 type-valid finite pair로 padding하고 양쪽 endpoint가 표현 가능할 때 그 관측값을
  transformed range 중앙에 둔다. Numeric limit에서는 관측값을 포함하는 가장 가까운 finite pair를 쓴다.
  Explicit transformed pair는 계속 distinct해야 한다. Ordinal은 non-empty unique values를 사용한다.
  Threshold는 strictly increasing explicit boundaries가 필수다.
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
  Sequential descriptor의 `count`는 2 이상의 gradient-stop count이며 top-level `palette`와
  `range.palette`가 같은 validation과 resolution을 사용한다. `interpolate`는 sequential 전용이고
  기본은 `"rgb"`다. Public palette `count`, sequential explicit range와 discretized explicit color
  range cardinality는 최대 `10,000`이다.
- `midpoint`: sequential quantitative color의 finite 기준값 또는 `"auto"`. Numeric 값은 최종 domain의 두 끝 사이에 엄격히 있어야 한다. Auto domain은 consumer resolution 때 검증한다. 생성 생략은 endpoint-linear mapping, 편집 생략은 보존이며 `"auto"`는 semantic leaf를 제거한다. Temporal/position/ordinal/discretized numeric midpoint는 오류다. 양쪽 domain 구간을 color parameter [0,.5]/[.5,1]로 나누고 reverse/clamp/interpolation을 기존 mapper에서 적용한다. Palette 중앙색이 항상 neutral/white라고 추론하지 않는다.
- `unknown`은 direct unattached scale에서는 channel을 알 수 없으므로 그대로 저장한다. Consumer가 attach될 때
  concrete channel fallback validation과 supported item-grain policy를 적용한다.
- Standalone `createScale`/`editScale`은 위의 전체 vocabulary를 유지하지만 action 안의 nested scale은
  consumer role별 public type만 노출한다. Quantitative position은 continuous transformed options, temporal
  position은 `time`, categorical position은 `band | point`를 사용하며 zero-baseline bar/histogram/density
  output에서는 `log`를 제외한다. Categorical color는 `ordinal`, size/opacity는 `linear`, shape/dash는
  `ordinal`이고 stroke width는 quantitative transformed scale이다. Palette/interpolation 같은 color-only
  option이나 padding 같은 discrete-position option을 다른 role에 전달하면 저장 후 무시하지 않고 즉시
  거부한다. Point row consumers만 channel-valid `unknown` fallback을 author할 수 있다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. Consumer-specific ordinal range와 `unknown`
  compatibility는 attachment 시점에 검증한다.

- `radialMapping?: "area"|"radius-length"`는 measured Arc radius의 canonical scale policy다. Linear, zero 기반, nice/reverse/unknown 없는 정의만 허용하고 domain/range의 auto는 consumer attachment 때 해석한다. Explicit domain은 [0,U], U>0, range는 0<=r0<R다. Generic radius나 다른 channel에 연결하면 오류다.

### Formal values — `createScale`

```typescript
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal"
  | "sequential" | "quantize" | "quantile" | "threshold";
```

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite; padding?: NonNegativeFinite; align?: UnitInterval; palette?: Palette; interpolate?: ContinuousColorInterpolation; midpoint?: number | "auto"; radialMapping?: "area" | "radius-length"; unknown?: unknown })`; type별 validation이 값을 제한한다. `time`은 유일한 UTC temporal token이다.
- Maybe Future (NOT IMPLEMENTED): `{ type?: "identity" | "bin-ordinal" }`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, complete 13-value `ScaleType`, unknown value와 type-specific definition.
  - ⚪ Maybe Future: `"identity" | "bin-ordinal"`.
- `domain`
  - ✅ Covered: `"auto"`, continuous pair, ordinal unique array, reversed pair and invalid arrays.
  - ✅ Covered: log/pow/sqrt/symlog auto constant의 양수·0·음수 type-valid padding, transformed midpoint,
    numeric limits와 explicit constant rejection. Log zero는 strictly signed domain contract에 따라 거부한다.
  - ✅ Covered: direct `time` scale domain accepts finite UTC timestamp pairs. Date/string normalization belongs to
    temporal field resolution and is tested there rather than expanded into raw scale input.
- `range`
  - ✅ Covered: `"auto"`, numeric pair, colors, palette descriptor and dash patterns through consumers.
  - ✅ Covered: raw ordinal range ownership is validated structurally; consumer-specific dash/color/shape
    compatibility is deliberately deferred and executable at attachment.
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
- Signature: `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`.
- `id`는 existing scale을 선택한다. 생략하면 current scale, 그렇지 않으면 유일한 scale을 사용하며
  안전하게 하나를 정할 수 없으면 explicit ID를 요구한다.
- `midpoint`는 create contract의 동일한 검증·mapping·reset을 따르며 연결된 모든 mark와 gradient legend를 갱신한다. Type이 바뀌면 이전 midpoint를 제거하고 돌아올 때 복구하지 않는다. Evidence: `test/unit/actions/scales/midpoint.test.js`, `test/unit/grammar/scales/midpoint.test.js`, `test/charts/color-midpoint/`.
- 최소 한 editable property가 필요하다. `unknown: undefined`는 existing fallback을 제거한다.
- `domain`/`range`의 `"auto"`는 reset이고 omission은 기존 값을 보존한다. Explicit domain은
  `nice`/`zero`보다 우선하며 `reverse`는 auto 또는 explicit 최종 range에 적용된다.
- `palette`는 color scale의 top-level shorthand이며 canonical `range: { palette }`로 저장한다.
  같은 call의 `range`와는 mutually exclusive다.
- `type`은 unattached scale 또는 compatible consumers에서 atomic하게 전환한다. Quantitative position은
  `linear | log | pow | sqrt | symlog`, continuous quantitative color는 `sequential`, quantitative Point/aggregate Bar/Rect color는
  `quantize | quantile | threshold`를 사용한다. Complete definition과 every consumer를 먼저 검증하고 stale
  type-only properties를 제거한다.
- Sequential↔quantize/quantile/threshold와 nested encodeColor type reassignment는 같은 전환 owner를 사용한다. Creation/edit/materialization은 공통 quantitative color consumer validator를 사용하여 Point/aggregate Bar/Rect의 fieldType·aggregate·unknown·grain을 검증한다. 모든 shared consumer와 guide를 포함한 immutable candidate를 먼저 실행 검증하고 반환할 branch에 적용한다.
- Active gradient↔interval legend는 네 edge의 compatible 교집합에서 같은 transaction으로 교체한다. Left/right는 vertical·center align·top title, top/bottom는 기본 horizontal interval flow와 left/center/right align·top title이다. Target/channel, title·visibility·inferred mode, labels, titleStyle, border, position, align, offset을 보존한다. Count/gradient size 또는 interval symbol/itemGap이 해당 family default와 다르면 오류다. 새 family 고유 값은 새 default를 쓰며 source 스타일을 조용히 버리지 않는다. Interval의 horizontal columns, vertical flow 또는 inline title처럼 gradient에 보존할 수 없는 layout도 오류다. Side columns1은 기본 한 열과 동등해 허용한다. 비호환 설정은 removeLegend→editScale→createLegend의 명시 경로를 사용한다.
- Explicit domain의 의미가 extent, quantile sample, threshold 사이에 바뀌면 새 domain을 명시해야 한다. Sequential↔quantize의 compatible extent는 보존 가능하며 auto inference는 각 타입 계약을 따른다. Midpoint/interpolate 등 비호환 속성은 제거하고 돌아올 때 숨은 복구를 하지 않는다. 범례 overflow나 consumer 하나의 실패도 전체 상태·trace를 유지한다.
- Structural type transition은 Full 범위다. Basic은 기존 typed quantitative color와 interval legend 생성을 지원하며, 다른 타입은 새 scale ID로 작성한다.
- Evidence: `test/unit/actions/scales/color-transitions.test.js`, `test/charts/color-transitions/`.
- Discrete position은 compatible consumers에서 `band ↔ point`를 검증한다. Bar consumer가 있으면
  zero-bandwidth `point` 전환을 거부한다.
- `nice`, `zero`, `clamp`, transformed parameters와 `reverse`는 create contract의 type별 policy를 따른다.
- `unknown`은 row-owned point item에서만 지원한다. Missing/invalid input과 explicit ordinal domain 밖의 input을
  channel-valid concrete fallback으로 mapping하며 domain member를 추가하지 않는다. Compound path, bar, area,
  rule, xOffset와 strokeDash grains는 topology가 달라질 수 있어 명시적으로 거부한다.
- Complete patch와 shared-consumer channel compatibility를 먼저 검증한 뒤 semantic scale을 수정하고,
  scale, mark, axes, grids와 legend consumer를 wrapped materialization plan으로 갱신한다.
- Source-attached text는 source의 current scale consumer에서 dependency를 따라 갱신한다. Text의 inherited scale ID가 이전 binding을 유지해도 라벨이 이전 위치에 남지 않는다. Evidence: `test/unit/actions/marks/text-source.test.js`.
- 실패하면 이전 program의 semantic, graphic, context와 trace는 변하지 않는다.

- `radialMapping` 변경은 기존 모든 measured Arc 및 radius axis/grid를 갱신한다. 생략하면 보존한다. Explicit undefined는 제거지만 aggregate radius consumer가 남아 있으면 오류다. 해당 encoding을 제거한 orphan scale에서만 ordinary radius로 명시적으로 전환한다. Type 변경으로 mapping을 암묵적으로 제거하지 않는다.

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
  interpolate?: ContinuousColorInterpolation; midpoint?: number | "auto";
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
