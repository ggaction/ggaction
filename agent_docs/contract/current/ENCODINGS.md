# Encoding action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared scale option contract

Encoding의 `scale` object는 channel에 따라 아래 subset을 사용한다.

- `id`: Implemented. user-defined scale ID; 생략하면 channel 이름(`x`, `y`, `color`, `size`,
  `shape`, `strokeDash`, `xOffset`)을 사용한다.
- `type`: Implemented. compatible quantitative position은 `linear | log | pow | sqrt | symlog`, temporal position은 `time`, discrete position은 `band | point`; nominal color/shape/dash/offset은
  `ordinal`, continuous point/aggregate-bar color는 `sequential`, quantitative point color는 추가로
  `quantize | quantile | threshold`, size는 `linear`만 허용한다.
- `domain`: Implemented. `"auto"` 또는 type에 맞는 explicit array. explicit domain은 data inference,
  `zero`, `nice`보다 우선한다.
- `range`: Implemented. `"auto"` 또는 type/channel에 맞는 explicit array. position auto range는
  Canvas plot bounds를 사용한다.
- `nice`: Implemented for linear/time position scale. boolean이며 auto domain만 읽기 좋은 경계로
  확장한다. ordinal에는 허용되지 않는다.
- `zero`: Implemented for linear scale. boolean이며 auto domain에만 zero를 포함한다. explicit domain이
  있으면 적용되지 않는다.
- `palette`: Implemented for color scale. palette name이며 `range`와 동시에 사용할 수 없다.
- `base`, `exponent`, `constant`: Implemented for position `log`, `pow`, `symlog`; defaults는 `10`, `1`, `1`이다. `sqrt`는 fixed exponent `0.5`다.
- `clamp`, `reverse`: Implemented for compatible continuous position/color mappings and final resolved ranges.
- `paddingInner`, `paddingOuter`, `padding`, `align`: Implemented for type-compatible band/point position.
- `unknown`: Implemented for row-owned point `x`, `y`, `color`, `size`, `shape`, `opacity`. Missing/invalid input과
  explicit ordinal domain 밖의 값에 channel-valid concrete fallback을 사용하며 scale domain에는 추가하지 않는다.
  Compound path/bar/area/rule, xOffset와 strokeDash에서는 topology-safe fallback contract가 없어 거부한다.
- Direct `createScale`/`editScale`은 complete current scale vocabulary를 노출한다. Encoding attachment가
  field type, channel, mark grain과 existing consumers에 맞는 subset을 검증한다.
- Proposed: —

## `encodeX`

- Signature: `encodeX({ field, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: Implemented, dataset에 존재하는 field. 현재 supported mark grain에 맞는 값 type이 필요하다.
- `target`: Implemented, mark ID. 생략하면 current mark, 아니면 유일한 eligible mark를 추론한다.
- `fieldType`: Implemented. Point x/y는 quantitative/temporal/ordinal/nominal, line과 area는 아래 canonical
  compatibility matrix, bar는 quantitative/temporal/ordinal을 mark grain에 맞게 지원한다.
- `scale`: Implemented. 위 shared contract를 사용한다. 기본 ID는 `x`, auto range는 left-to-right plot bounds다.
- `coordinate`: Implemented, coordinate ID. 생략 시 positional action이 Cartesian `main` coordinate를
  만들거나 existing compatible coordinate를 사용하고 layer에 저장한다.
- `bin`: Implemented for quantitative bar x. `{ maxBins?: PositiveInteger }`,
  `{ step: PositiveFinite }`, `{ boundaries: readonly [Finite, Finite, ...Finite[]] }` 중 하나다.
  생략된 maxBins default는 `10`; 세 mode는 mutually exclusive이며 bin boundaries와 bar x/width를
  결정한다.
- `aggregate`, `stack`: Horizontal bar의 quantitative x measure에 사용한다. Binned histogram x와
  category x에서는 거부된다.
- Effect: x encoding과 scale을 semantic state에 저장하고 scale 및 compatible mark/guide consumers를
  rematerialize한다.
- Reassignment: 같은 target에 다시 호출하면 compatible field와 scale binding을 교체한다. scale ID를
  생략하면 현재 x scale을 재사용하고, explicit new ID는 이전 scale을 남긴 채 axis/vertical grid를
  새 scale에 rebind한다. inferred title은 새 field로 바뀌고 custom title/style은 유지된다.
- Coverage: position, histogram, ordinal bar, temporal chart tests가 주요 mark 조합을 검증한다.
  explicit scale option의 전체 교차조합은 부분적이다.

### Formal values — `encodeX`

- Implemented: `encodeX({ field: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal"; scale?: PositionScale; coordinate?: UserId; aggregate?: AggregateOperation; bin?: BinDefinition; stack?: "zero" | "normalize" | null })`; 실제 조합은 canonical matrix와 mark grain policy가 제한한다.
- Implemented quantitative extension: `{ scale?: { type?: "log" | "pow" | "sqrt" | "symlog"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean } }` for compatible point, line, area, bar and rule materializers.
- Implemented point fallback: `{ scale?: { unknown?: Finite } }`; temporal `time` remains UTC-only.
- Proposed (NOT IMPLEMENTED): Polar positional action.

### Value coverage — `encodeX`

- `field`, `target`
  - ✅ Covered: inferred/explicit point, line, bar, area targets; missing field, ambiguous/invalid target.
- `fieldType`
  - ✅ Covered: point quantitative/temporal/ordinal, line/area current matrix, vertical ordinal/temporal bar,
    horizontal ordinal/temporal bar와 unsupported pair rejection.
  - ✅ Covered: unsupported mark/type pairs rejection.
- `coordinate`
  - ✅ Covered: omitted Cartesian default, explicit/reused coordinate, incompatible coordinate rejection.
  - 🟣 Proposed: Polar theta/radial mapping; action naming unresolved.
- `aggregate`
  - ⚠️ Partial: 현재 x에서는 생략만 supported; unsupported aggregate rejection matrix가 부분적이다.
- `bin`
  - ✅ Covered: default via histogram, representative positive integer, invalid integer/value.
  - ✅ Covered: exact step, negative/positive constant, zero policy, irregular boundaries, half-open/final-upper
    assignment, empty-bin omission, exclusivity와 explicit-domain conflicts.
  - ⚠️ Partial: `maxBins: 1`과 very large maxBins performance boundary.
- `scale.id/type/domain/range/nice/zero`
  - ✅ Covered: auto/explicit linear, time, ordinal definitions; explicit domain/range precedence;
    wrong type and shared-channel conflicts.
  - ⚠️ Partial: 모든 fieldType × nice × zero × explicit bound pairwise 조합.
  - ✅ Covered: point/line/area/bar/rule log/pow/sqrt/symlog mapping, parameters, clamp/reverse, guides and Canvas resize.
  - ✅ Covered: band/point defaults, padding/alignment, reversed range, bar bandwidth compatibility and shared point centers.
  - ✅ Covered: point missing/invalid and explicit-domain `unknown`; compound-grain rejection.
- Evidence: position, temporal, histogram-bin and ordinal-bar action tests.

## `encodeY`

```typescript
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
```

- Signature: `encodeY({ field?, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: point/area/line/ordinal-bar에서는 필수 field다. histogram count y는 x field에서 추론한다.
- `target`, `fieldType`, `scale`, `coordinate`: x와 같은 selection/storage contract이다. Continuous y
  auto range는 bottom-to-top, ordinal y band는 top-to-bottom이다.
- `aggregate`: line과 ordinal bar는 `"count" | "sum" | "mean" | "median" | "min" | "max" |
  "distinct" | "valid" | "missing" | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" |
  "q1" | "q3" | "ciLower" | "ciUpper"`를 지원한다. Histogram은 count를 사용하고 raw quantitative
  point/area는 aggregate를 생략한다.
- `count`는 group row 수, `valid`/`missing`은 null·undefined·NaN 여부, `distinct`는 valid value의
  SameValueZero distinct count를 반환한다. 이 네 연산은 nominal input도 허용하되 output scale은 linear다.
- 나머지 연산은 finite quantitative sample만 사용한다. Sample variance/stdev/stderr와 CI는 `n < 2`,
  다른 quantitative 연산은 finite sample이 없으면 해당 final group을 생략한다. Quartile은 linear
  interpolation, CI endpoint는 `mean ± 1.96 * stderr`다.
- `{ op: "quantile", probability }`는 finite quantitative sample을 정렬해 linear interpolation한다.
  Probability는 필수 `[0, 1]` 값이며 `0`/`1`은 min/max다.
- `{ op: "first" | "last", orderBy, order? }`는 valid comparable order key를 가진 row를 stable
  source order fallback으로 정렬한 뒤 encoded finite quantitative value를 선택한다. `order`는
  `"ascending"`으로 normalize되어 semantic state에 저장된다. 유효한 candidate가 없거나 order-key
  type이 한 group 안에서 섞이면 해당 group을 생략한다.
- `stack`: Implemented values `"zero" | "normalize" | null`. `"normalize"`은 각 non-negative
  partition을 합계 1로 정규화하고 automatic y domain을 `[0, 1]`로 고정한다. 합계가 0인 partition은
  graphic을 만들지 않는다.
- `bin`: 현재 y에서는 지원되지 않는다.
- Effect: y semantic, scale, final bar/line aggregate grain을 저장하고 mark geometry와
  existing guides를 rematerialize한다.
- Reassignment: 같은 target의 existing fieldType, aggregate/bin/stack mode와 coordinate를 유지하며
  compatible field를 교체한다. current scale reuse, explicit new-scale rebind, inferred/custom title
  규칙은 x와 같다.
- Coverage: 전체 scalar vocabulary의 numeric/validity fixture, line public materialization, ordinal bar
  final grain, zero/null 조합을 검증한다. Aggregate × scale override pairwise coverage는 부분적이다.

### Formal values — `encodeY`

- Implemented: `encodeY({ field?: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal" | "nominal"; scale?: PositionScale; coordinate?: UserId; aggregate?: AggregateOperation; stack?: "zero" | "normalize" | null })`; nominal은 compatible count-style aggregate에만 허용되고 mark/pair policy가 조합을 제한한다.
- Implemented quantitative extension: `{ scale?: { type?: "log" | "pow" | "sqrt" | "symlog"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean } }` for compatible point, line, area, bar and rule materializers.
- Implemented point fallback: `{ scale?: { unknown?: Finite } }`; temporal `time` remains UTC-only.
- Proposed (NOT IMPLEMENTED): `{ stack?: "center" }`; full-item extreme selection은 Planned `selectMarks`가 소유한다.

### Value coverage — `encodeY`

- `field`, `target`, `coordinate`
  - ✅ Covered: raw quantitative point/area, aggregate line/bar, inferred histogram count and target ambiguity.
- `fieldType`
  - ✅ Covered: quantitative combinations, nominal count/distinct/valid/missing, ordinal point/horizontal bar와
    invalid compatibility.
- `aggregate`
  - ✅ Covered: full scalar vocabulary, final line/bar grain, missing/sample boundary, inferred/custom title,
    domain/rematerialization과 incompatible aggregate rejection.
  - ✅ Covered: parameterized quantile boundaries, ordered first/last direction, stable ties, missing/invalid
    candidates, final grain, inferred title, rematerialization과 caller-owned object isolation.
  - 🟡 Planned: full-item min/max selection은 scalar aggregate가 아닌 `selectMarks` selector로 제공한다.
- `stack`
  - ✅ Covered: `"zero"`, `"normalize"`, `null`, positive/zero partition, auto `[0, 1]` domain과
    incompatible policy rejection.
  - 🟣 Proposed: `"center"`; streamgraph baseline contract가 필요하다.
- `scale`
  - ✅ Covered: auto/explicit domain/range, nice/zero precedence, shared consumer conflicts.
  - ⚠️ Partial: aggregate/stack/scale option pairwise matrix.
  - ✅ Covered: point/line/area/bar/rule transformed mapping and shared axes/grid rematerialization.
  - ✅ Covered: compatible band/point types, padding/alignment and shared consumer rematerialization.
  - ✅ Covered: point missing/invalid and explicit-domain `unknown`; compound-grain rejection.
- Evidence: point position, line aggregate, histogram y and ordinal aggregate bar tests.

## Position field-type compatibility

- Canonical owner: `src/grammar/positionCompatibility.js`. Generic mark × channel acceptance는 여기서만
  정의하고 bar grain narrowing은 `src/grammar/bars/policy.js`가 소유한다.
- Point x/y: `"quantitative" | "temporal" | "ordinal" | "nominal"`.
- Line x: `"quantitative" | "temporal"`; line y는 aggregate policy에 따라
  `"quantitative" | "temporal" | "ordinal" | "nominal"`을 더 좁힌다.
- Area x: ranged area는 `"quantitative" | "temporal"`, density area는 `"quantitative"`; area y는
  `"quantitative"`.
- Bar vertical: `ordinal | temporal x + quantitative aggregate y`.
- Bar horizontal: `quantitative aggregate x + ordinal | temporal y`.
- Bar orientation은 complete pair에서 추론하며 semantic mark에 중복 저장하지 않는다. Histogram은
  binned quantitative x/count y로 vertical을 결정한다.
- Temporal normalization은 source dataset을 바꾸지 않는다. 1000–9999 정수와 4자리 문자열은 UTC
  year, `YYYY-MM-DD`/`YYYY/MM/DD`는 검증된 UTC date, 그 밖의 valid string과 finite number는
  timestamp로 해석한다.
- Current scale vocabulary는 UTC temporal `time`, discrete position `band | point`, appearance/offset
  `ordinal`, quantitative `linear`과 point-only transformed aliases다.
- Horizontal `layout: "group"`은 yOffset이 없으므로 명시적으로 거부한다. Stack/fill/overlay/diverging은
  quantitative x measure에서 materialize한다.
- Evidence: `test/unit/grammar/position-compatibility.test.js`, scale temporal normalization tests,
  point mixed-position tests, jobs `temporal-x`/`horizontal-bar` primitive-public exact pairs.

## `encodeXOffset`

- Signature: `encodeXOffset({ field, target?, fieldType?, scale?, paddingInner?, paddingOuter? })`
- `field`: nominal grouping field. complete histogram 또는 ordinal aggregate bar에 허용된다. Existing grouped
  color가 있으면 같은 field만 직접 설정할 수 있고 field 교체는 atomic `encodeColor`가 소유한다.
- `target`: optional eligible bar ID.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- `scale`: ordinal scale contract; 기본 ID `xOffset`, domain은 grouping order, range는 parent x band다.
- `paddingInner`: finite `[0, 1)`, sibling slot 사이의 step fraction. 기본값은 `0`이다.
- `paddingOuter`: non-negative finite, 첫/마지막 slot 바깥의 step fraction. 기본값은 `0`이다.
- Effect: x band 안에 group sub-band를 만들고 padding intent를 immutable mark materialization config에
  저장한다. 같은 field 재호출에서 생략한 padding은 기존 값을 유지한다. Explicit/reversed range endpoint를
  유지한 채 signed step, start와 positive bandwidth를 계산하고 dependent bar를 rematerialize한다.
- Shared xOffset scale의 consumer는 같은 padding policy와 parent bandwidth를 사용해야 한다.

### Formal values — `encodeXOffset`

- Implemented: `encodeXOffset({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: NumericRange }; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeXOffset`

- `field`, `target`
  - ✅ Covered: nominal grouping field, explicit/inferred eligible grouped bar, missing/incompatible prerequisites.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid alternatives.
- `scale.id/type/domain/range`
  - ✅ Covered: defaults, explicit order, reversed range, auto range rematerialization, invalid definitions.
- `paddingInner`, `paddingOuter`
  - ✅ Covered: defaults, partial reassignment preservation, boundaries, explicit/reversed range, Canvas resize,
    zero-bandwidth와 shared-policy rejection.
- Reassignment
  - ✅ Covered: same-field scale/padding edit, grouped color mismatch rejection와 atomic color-owned field change.
- Evidence: `test/unit/actions/encodings/x-offset-encoding.test.js`.

## `encodeY2`

- Signature: area와 ranged bar는 `encodeY2({ field, target?, fieldType?, scale? })`; rule은
  `encodeY2({ field | datum, target?, fieldType, scale?, coordinate? })`다.
- Area/ranged-bar `field`는 quantitative upper-bound field다. Bar는 stale aggregate/stack intent를 제거해
  lower/upper endpoints를 one range grain으로 저장한다. Rule은 field/datum 중 정확히 하나를 요구하고 primary y의
  field type, scale과 coordinate를 공유한다.
- 같은 action 재호출은 area/bar/rule secondary endpoint만 교체하고 dependent graphics를 rematerialize한다.
- Effect: area는 closed path, bar는 concrete rect range, rule은 vertical/diagonal concrete line endpoint를 다시 만든다.
- Coverage: ranged area/bar/regression tests와 rule position tests가 shared scale, reassignment와 invalid
  prerequisites를 검증한다.

### Formal values — `encodeY2`

- Implemented: area/bar `encodeY2({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId } })`; rule `encodeY2(RulePositionAssignment)`.
- Proposed (NOT IMPLEMENTED): —; y2는 y scale 공유를 유지한다.

### Value coverage — `encodeY2`

- `field`, `target`
  - ✅ Covered: quantitative upper field, eligible area, missing y/missing field errors.
- `fieldType`
  - ✅ Covered: `"quantitative"`와 invalid alternatives.
- `scale.id`
  - ✅ Covered: omission/shared y ID, same explicit ID, conflicting ID rejection.
  - No proposal: y2는 y scale 공유가 semantic invariant다.
- Evidence: ranged-area, ranged-bar and regression semantic/materialization tests.

## `encodeX2`

```typescript
type RulePositionAssignment =
  | { field: FieldName; datum?: never; target?: UserId; fieldType: FieldType; scale?: PositionScale; coordinate?: UserId }
  | { field?: never; datum: unknown; target?: UserId; fieldType: FieldType; scale?: PositionScale; coordinate?: UserId };

type AreaSecondaryXAssignment = {
  field: FieldName;
  target?: UserId;
  fieldType?: "quantitative";
  scale?: { id?: UserId };
  coordinate?: UserId;
};

encodeX2(options: RulePositionAssignment | AreaSecondaryXAssignment): ChartProgram;
```

- Rule `encodeX`/`encodeY`와 `encodeX2`/`encodeY2`는 field 또는 datum 중 정확히 하나를 저장한다.
  Secondary endpoint는 primary channel 없이는 생성할 수 없고 같은 scale, coordinate와 field type을 공유한다.
- x-only/y-only는 plot-bound full span, `x+y+y2`/`y+x+x2`는 vertical/horizontal interval,
  `x+y+x2+y2`는 diagonal interval이다. Field mode는 row당 line 하나, datum-only mode는 line 하나다.
- Area mode는 existing quantitative x와 같은 scale/coordinate를 공유하며 x/x2 horizontal closed path를
  rematerialize한다. Ranged bar mode materializes a horizontal rect range. Rule endpoint/style reassignment는
  wrapped `rematerializeRuleMark`를 실행한다.

### Formal values — `encodeX2`

- Implemented: `encodeX2(RulePositionAssignment | AreaSecondaryXAssignment)` where the field assignment also accepts a ranged bar.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): field-driven rule stroke width.

### Value coverage — `encodeX2`

- ✅ Covered: rule field/datum exclusivity, quantitative/nominal position, full span, bounded and diagonal geometry,
  plus area quantitative x2, shared endpoint scale, endpoint reassignment and invalid/incomplete prerequisites.
- Evidence: `test/unit/actions/encodings/rule-position-encodings.test.js`,
  `test/charts/cars-error-bar/primitive.test.js`.

## `encodeStroke`

- Signature: `encodeStroke({ target?, value })`.
- `target`: current or uniquely eligible rule mark; ambiguity requires an explicit ID.
- `value`: required non-empty constant graphical stroke string. It creates no scale or legend.
- Effect: updates immutable rule materialization config and invokes wrapped `rematerializeRuleMark`.

### Formal values — `encodeStroke`

- Implemented: `encodeStroke({ target?: UserId; value: NonEmptyString })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): field-driven stroke color is not part of the current rule contract.

### Value coverage — `encodeStroke`

- ✅ Covered: inferred/explicit target, replacement, non-empty validation, immutable failure and primitive/public parity.
- Evidence: `test/unit/actions/encodings/rule-appearance-encodings.test.js` and
  `test/charts/cars-error-bar/primitive.test.js`.

## `encodeStrokeWidth`

- Signature: `encodeStrokeWidth({ target?, value })`.
- `target`: current or uniquely eligible rule mark; ambiguity requires an explicit ID.
- `value`: required non-negative finite logical Canvas width. It is graphical and creates no scale or legend.
- Effect: updates immutable rule materialization config and invokes wrapped `rematerializeRuleMark`.
- Existing `encodeStrokeDash`와 `encodeOpacity`의 value/field modes also support rule marks; field mode
  materializes one concrete appearance value per rule child.

### Formal values — `encodeStrokeWidth`

- Implemented: `encodeStrokeWidth({ target?: UserId; value: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): field-driven rule width remains outside the current contract.

### Value coverage — `encodeStrokeWidth`

- ✅ Covered: zero/positive replacement, negative/non-finite rejection, dash/opacity interoperability,
  Canvas rematerialization and primitive/public parity.
- Evidence: `test/unit/actions/encodings/rule-appearance-encodings.test.js` and
  `test/charts/cars-error-bar/primitive.test.js`.

## `encodeYRange`

- Signature: `encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })`
- `lower`, `upper`: 필수 quantitative field names이며 각각 y와 y2가 된다.
- `target`, `fieldType`, `coordinate`, `scale`: `encodeY` 계약을 공유한다.
- Effect: wrapped `encodeY` 뒤 `encodeY2`를 호출하는 atomic action이다. 중간의 incomplete area/bar
  상태를 public workflow에 노출하지 않는다.
- Reassignment: 같은 area 또는 ranged bar에 다시 호출하면 wrapped y/y2 assignments가 두 field를 함께 교체하고
  shared scale, concrete closed paths/rects와 consumers를 rematerialize한다. Earlier programs remain unchanged.
- Coverage: regression band, ranged area와 vertical error-band tests가 hierarchy, temporal/quantitative path
  geometry, reassignment and rematerialization을 검증한다.

### Formal values — `encodeYRange`

- Implemented: `encodeYRange({ lower: FieldName; upper: FieldName; target?: UserId; fieldType?: "quantitative"; coordinate?: UserId; scale?: PositionScale })`
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeYRange`

- `lower`, `upper`
  - ✅ Covered: distinct quantitative fields와 missing/invalid fields.
- `target`, `fieldType`, `coordinate`, `scale`
  - ✅ Covered: inferred/explicit target와 shared y/y2 child hierarchy.
  - ⚠️ Partial: explicit coordinate/scale option combinations direct test.
- Reassignment
  - ✅ Covered: lower/upper 동시 교체, wrapped child order, concrete path change와 earlier-program immutability.
- Evidence: ranged-area, ranged-bar and regression tests.

## `encodeXRange`

- Signature: `encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })`
- `lower`, `upper`: required quantitative field names이며 각각 x와 x2가 된다.
- Effect: wrapped `encodeX` 뒤 area/bar-compatible `encodeX2`를 호출하는 atomic action이다.
- Horizontal area는 y independent position 순서로 lower path와 reversed upper path를 연결해 Z-closed
  concrete path를 만들고 ranged bar는 one rect per observed category를 만든다. x/x2는 one shared scale and coordinate를 사용한다.
- Reassignment는 두 fields를 함께 교체하고 scale, area와 connected guides를 rematerialize하며 earlier
  programs를 바꾸지 않는다.

### Formal values — `encodeXRange`

- Implemented: `encodeXRange({ lower: FieldName; upper: FieldName; target?: UserId; fieldType?: "quantitative"; coordinate?: UserId; scale?: PositionScale })`.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `encodeXRange`

- ✅ Covered: shortest horizontal area assignment, explicit target, wrapped x/x2 order, shared scale/coordinate,
  invalid/missing fields, conflicting scale, atomic reassignment, Canvas rematerialization and primitive parity.
- Evidence: `test/unit/actions/encodings/area-encodings.test.js` and
  `test/charts/gapminder-error-band/public.test.js`.

## `encodeGroup`

- Signature: `encodeGroup({ field, target?, fieldType? })`
- `field`: 필수 nominal field. density area에서는 density transform의 `groupBy`와 일치해야 한다.
- `target`: line 또는 area ID; 생략 시 current/unique eligible target을 추론한다.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- Effect: series를 path별로 나누는 semantic group만 저장한다. scale이나 guide는 만들지 않으며
  필요한 position encoding이 이미 완성됐을 때 path를 rematerialize한다.
- Reassignment: 같은 target에 다시 호출하면 group field를 원자적으로 교체한다. Line의 color 또는
  strokeDash field가 이미 있으면 반드시 같은 field여야 하며, 불일치하면 기존 program을 유지한 채
  오류를 낸다.
- Coverage: line, regression, density tests가 grouped/ungrouped, reassignment와 mismatch를 검증한다.

### Formal values — `encodeGroup`

- Implemented: `encodeGroup({ field: FieldName; target?: UserId; fieldType?: "nominal" })`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeGroup`

- `field`, `target`
  - ✅ Covered: nominal line/area grouping, inferred/explicit target, density group match/mismatch,
    line field reassignment와 immutable failure.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid values.
- No proposal: group은 scale-free path partition이라는 현재 역할을 유지한다.
- Evidence: line-series, ranged-area and density-area tests.

## `encodeHistogram`

- Signature: `encodeHistogram({ field, target?, coordinate?, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale? })`
- `field`, `target`, `coordinate`: binned x에 전달되는 field와 optional target/coordinate다.
- `maxBins`: positive integer, 기본값 `10`; `encodeX.bin.maxBins`로 전달된다.
- `binStep`, `binBoundaries`: exact-width/explicit-boundary modes이며 maxBins와 mutually exclusive다.
- `stack`: `"zero" | "normalize" | null`, 기본값 `"zero"`; `encodeY`로 전달된다.
- `xScale`, `yScale`: optional scale objects이며 각각 child x/y action에 전달된다.
- Effect: wrapped `encodeX`와 `encodeY`를 원자적으로 결합해 bin/count semantics와 concrete rects를 만든다.
- Coverage: histogram unit/chart tests가 defaults, stack, bin boundaries, scale rules와 trace hierarchy를 검증한다.

### Formal values — `encodeHistogram`

- Implemented: `encodeHistogram({ field: FieldName; target?: UserId; coordinate?: UserId; maxBins?: PositiveInteger; binStep?: PositiveFinite; binBoundaries?: readonly [Finite, Finite, ...Finite[]]; stack?: "zero" | "normalize" | null; xScale?: PositionScale; yScale?: PositionScale })`; 세 bin option은 mutually exclusive다.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeHistogram`

- `field`, `target`, `coordinate`
  - ✅ Covered: shortest/inferred call, explicit forwarding, missing/invalid child prerequisites.
- `maxBins`
  - ✅ Covered: omission→`10`, representative explicit values, invalid through child `encodeX`.
  - ⚠️ Partial: minimum/large values와 sparse/constant data pair.
- `stack`
  - ✅ Covered: omission→`"zero"`, explicit `"zero"`, `"normalize"`, `null`, unit domain과 invalid vocabulary.
- `xScale`, `yScale`
  - ✅ Covered: explicit objects, default policies, domain/range precedence.
  - ⚠️ Partial: independent scale IDs and all policy combinations.
- `binStep`, `binBoundaries`
  - ✅ Covered: zero-anchored exact steps, irregular widths, explicit domain ownership, invalid values,
    exclusivity, concrete rects와 inferred tick/grid rematerialization.
- Reassignment
  - ✅ Covered: full x/y field replacement, stale bin-mode removal, existing stack/color/legend preservation,
    inferred guide refresh, explicit guide-value preservation, atomic failure와 primitive/public parity.
- Evidence: `test/unit/actions/encodings/encode-histogram.test.js`와 histogram chart tests.

## `encodeDensity`

- Signature: `encodeDensity({ field, target?, source?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, coordinate?, valueScale?, densityScale? })`
- `field`, `source`, `groupBy`, `bandwidth`, `extent`, `steps`, `as`: `createDensityData`와 같은 계약이며
  derived ID는 `${target}DensityData`로 namespace된다.
- `kernel`: `"gaussian" | "epanechnikov" | "uniform" | "triangular"`; 생략 시 Gaussian이다.
- `normalization`: `"unit" | "count"`; 생략 시 unit이며 count는 group-local sample count로 magnitude를
  조정한다.
- `target`: area mark ID. 생략하면 current 또는 유일한 eligible area를 추론한다.
- `densityChannel`: `"x" | "y"`, 기본값 `"y"`. y이면 value→x/density→y, x이면 반대로 연결한다.
- `coordinate`: optional compatible coordinate ID.
- `valueScale`: position scale object, 기본 `{ nice: false, zero: false }`.
- `densityScale`: position scale object, 기본 `{ nice: true, zero: true }`; baseline을 그리기 위해 domain이
  zero를 포함해야 한다.
- Effect: density data 생성, layer data rebinding, x/y encoding, optional group encoding, baseline-closed
  area path materialization을 하나의 hierarchy로 수행한다.
- Coverage: density data/mark/chart/guide tests가 두 orientation, grouped/ungrouped, explicit/auto
  density options와 rematerialization을 검증한다. 여러 steps×bandwidth pair는 부분적이다.

### Formal values — `encodeDensity`

- Implemented: `encodeDensity({ field: FieldName; target?: UserId; source?: UserId; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; as?: readonly [FieldName, FieldName]; densityChannel?: "x" | "y"; coordinate?: UserId; valueScale?: PositionScale; densityScale?: PositionScale })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeDensity`

- `field`, `target`, `source`, `groupBy`
  - ✅ Covered: inferred/explicit target/source, grouped/ungrouped, ambiguity와 conflicting pre-encodings.
- `bandwidth`, `extent`, `steps`, `as`
  - ✅ Covered: forwarding of auto/default and representative explicit values, invalid input atomicity.
  - ⚠️ Partial: full numeric boundary matrix는 `createDensityData` coverage에 의존한다.
- `densityChannel`
  - ✅ Covered: omission→`"y"`, explicit `"x"`, unknown value rejection.
- `coordinate`
  - ✅ Covered: omitted/inferred and explicit compatible Cartesian coordinate.
- `valueScale`, `densityScale`
  - ✅ Covered: defaults, explicit IDs/domain/range, baseline zero requirement.
  - ⚠️ Partial: reversed ranges and explicit density domain excluding zero across both orientations.
- `kernel`, `normalization`
  - ✅ Covered: closed vocabularies, defaults, forwarding, provenance, formula fixtures와 scale/path parity.
- Evidence: density encoding/data/mark/chart tests.

## `editDensity`

- Signature: `editDensity({ target?, bandwidth?, extent?, steps?, kernel?, normalization? })`.
- `target`: existing density-encoded area layer ID. current 또는 유일한 eligible layer를 추론하며 ambiguity는
  explicit target을 요구한다.
- 최소 한 density option이 필요하다. 생략한 option과 source, input/output fields, groupBy,
  densityChannel, coordinate, scale binding은 기존 provenance와 encoding에서 유지한다.
- `${target}DensityDataRevision${n}` ID로 wrapped `createDensityData`를 호출하고 layer data를 explicit
  `editSemantic` child로 rebind한다. 이전 derived dataset이 더 이상 참조되지 않으면 internal wrapped
  `releaseDerivedData`가 전체 resource를 제거한다.
- Affected positional scales를 공유하는 mark, axes와 grids는 deterministic materialization plan으로
  갱신한다. Earlier programs, source values와 old derived values는 바뀌지 않는다.
- validation, derivation 또는 materialization failure는 original program의 어느 branch도 변경하지 않는다.

### Formal values — `editDensity`

- Implemented: `editDensity({ target?: UserId; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count" })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editDensity`

- `target`
  - ✅ Covered: explicit/current/unique inference, missing target와 ambiguous target.
- `bandwidth`, `extent`, `steps`, `kernel`, `normalization`
  - ✅ Covered: representative edits, omitted-value preservation, invalid/empty options와 repeated revisions.
  - ⚠️ Partial: every cross-product of numeric extremes and kernel/normalization combinations.
- Revision lifecycle
  - ✅ Covered: deterministic IDs, explicit rebind, orphan release, retained shared old dataset, earlier-program
    immutability and shared-scale mark rematerialization.
- No future edit parameters are currently Planned or Proposed.
- Evidence: `test/unit/actions/encodings/edit-density.test.js`, density-area variant equivalence and PNG tests.

## `encodeColor`

- Signature: `encodeColor({ field, target?, fieldType?, layout?, aggregate?, scale? })`
- `field`: 필수 field. nominal은 모든 current mark contract에, quantitative/temporal은 point에 사용하며
  aggregate bar는 quantitative field를 지원한다.
- `target`: point, line, bar 또는 area ID; current/unique inference를 지원한다.
- `fieldType`: `"nominal" | "quantitative" | "temporal"`; 기본값은 nominal이다.
- `layout`: bar는 `"stack" | "fill" | "group" | "overlay" | "diverging"`, area는 group을 제외한
  네 layout을 지원한다. Histogram default는 stack, ordinal aggregate bar default는 group, area default는
  overlay다. Point/line과 continuous color는 layout을 거부하며 `"center"`는 Proposed다.
- `aggregate`: aggregate bar continuous color에서만 사용한다. Color field가 measure field와 같으면 measure
  aggregate를 상속하고, 다른 field는 compatible aggregate를 명시해야 한다. 집계는 최종 category rect
  grain에서 독립적으로 계산한다.
- `scale`: nominal은 ordinal, continuous point/bar color는 internal sequential scale이다. Quantitative point는
  `quantize | quantile | threshold`도 지원한다. `palette` 또는
  explicit `range` 중 하나를 사용할 수 있다. Palette는
  [`PALETTES.md`](PALETTES.md)의 frozen 68-name vocabulary와 `{ name, count?, extent? }` object를 받는다.
- Continuous color는 default `viridis`, eight interpolation tokens, `clamp`, `reverse`, quantitative/temporal
  point auto domain과 aggregate-bar quantitative auto domain을 지원하며 layout을 거부한다.
  `sequential | quantize | quantile | threshold`는 direct scale vocabulary에도 포함된다.
- Quantize는 auto 또는 explicit pair를 동일 폭으로 나누고, quantile은 auto 또는 explicit sample에서
  동일 개수에 가까운 class를 만들며, threshold는 strictly increasing explicit domain과 정확히 하나 더
  많은 color를 요구한다. Boundary equality는 upper class에 포함되고 interval legend도 같은 경계를 읽는다.
- Effect: color semantic, resolved layout과 scale을 저장한다. `group`은 wrapped `encodeXOffset`, `fill`은
  wrapped `encodeY({ stack: "normalize" })`, overlay는 non-stacked y, stack/diverging은 zero-stack y를
  사용한다. Bar는 rect, area는 closed path로 concrete materialize한다.
- Reassignment: 같은 target의 nominal color field를 교체한다. omitted scale ID는 current color scale을
  재사용하고 explicit new ID는 새 scale을 만든다. Existing compatible legend의 domain, symbols,
  labels와 inferred title을 갱신하며 custom title/layout/style은 보존한다.
- Grouped-bar reassignment는 color semantic을 먼저 교체한 뒤 wrapped `encodeXOffset`으로 matching field와
  domain을 원자적으로 교체하고 y policy, bars와 existing legend를 rematerialize한다. Direct xOffset field
  mismatch나 layout transition은 earlier program을 바꾸지 않고 거부한다.
- Coverage: 모든 대표 chart와 legend tests가 mark별 materialization을 검증한다. Five-layout bar matrix,
  four-layout area matrix, normalized/signed domains, primitive/public equivalence와 transition rejection을 포함한다.

### Formal values — `encodeColor`

- Implemented: `encodeColor({ field: FieldName; target?: UserId; fieldType?: "nominal"; layout?: "stack" | "fill" | "group" | "overlay" | "diverging"; scale?: ColorScale } | { field: FieldName; target?: UserId; fieldType: "quantitative" | "temporal"; aggregate?: AggregateOperation; scale?: SequentialColorScale | DiscretizedColorScale })`; discretized scales require quantitative point color, aggregate is valid only for quantitative aggregate bars, and mark compatibility narrows the nominal layout set.
- Proposed (NOT IMPLEMENTED): `{ layout?: "center" }`.

### Value coverage — `encodeColor`

- `field`, `target`
  - ✅ Covered: point/line/bar/area, inferred/explicit target, missing/invalid nominal values.
- `fieldType`
  - ✅ Covered: nominal, quantitative/temporal point color, quantitative aggregate-bar color와 invalid alternatives.
- `aggregate`
  - ✅ Covered: matching-field inheritance, explicit alternate-field aggregate, ambiguous omission and invalid operation.
- `layout`
  - ✅ Covered: omission, all five values, bar/area compatibility, normalized and signed baseline policies,
    no-auto-opacity overlay, invalid transition atomicity와 `encodeGroup`과의 distinct ownership.
  - 🟣 Proposed: `"center"` streamgraph layout.
- `scale.id/type/domain`
  - ✅ Covered: ordinal default, explicit ID/order, incomplete explicit domain rejection.
- `scale.range/palette`
  - ✅ Covered: explicit color array, all 68 named palettes, `{ name, count?, extent? }`, conflict와 invalid values.
  - ✅ Covered: categorical/continuous-family sampling, cycling, reverse and mark/legend parity.
  - ✅ Covered: quantitative/temporal point color, sequential mapping, eight interpolation tokens,
    reverse/extent/clamp and gradient legend parity.
  - ✅ Covered: aggregate-bar sequential domain, concrete rect fills, gradient legend, reverse rematerialization,
    primitive/public semantic, graphic, Canvas and decoded-pixel parity.
  - ✅ Covered: quantize/quantile/threshold boundaries, upper-boundary equality, explicit colors, reverse,
    invalid threshold definitions, interval legend editing, primitive/public and Canvas parity.
  - ✅ Covered: point color missing/invalid `unknown`, channel-invalid fallback rejection and shared-scale editing.
- Evidence: color, palette, line-series, bar-color, continuous-bar-color, area-color, grouped-bar and Roadmap 2
  continuous-color bar integration tests.

## `encodeStrokeDash`

- Signature: `encodeStrokeDash({ field, target?, fieldType?, scale? } | { value, target? })`
- `field`, `target`, `fieldType`: field mode의 nominal field, optional line ID, nominal-only type다.
- `value`: constant mode의 `"solid" | "dashed" | "dotted" | "dashdot" | DashPattern`이다.
- `scale`: field mode의 ordinal dash scale이다. range는 named style 또는 direct pattern의 array다.
- Effect: field mode는 line series별 concrete dash와 categorical legend symbol을 rematerialize한다.
  Constant mode는 모든 series에 같은 concrete dash를 적용하며 scale이나 legend를 만들지 않는다.
- Reassignment: `field`와 `value`는 mutually exclusive하며 같은 action이 두 mode를 원자적으로
  교체한다. 같은 field에서 scale ID를 생략하면 기존 binding을 재사용한다. 다른 field로 바꾸며
  ID를 생략하면 default `strokeDash` scale을 사용하고 이전 named scale은 보존한다. Existing legend는
  inferred title/domain/symbol을 갱신하고 custom config는 유지한다. Constant mode 전환은 legend의
  strokeDash component를 제거하고 남은 channel이 없으면 legend 전체를 제거한다.
- Compatibility: line의 group 또는 color field가 이미 있으면 field mode의 field와 같아야 한다.
- Coverage: named/direct vocabulary, field/constant 전환, field/group reassignment, legend cleanup,
  Canvas rematerialization과 invalid option matrix를 검증한다.

### Formal values — `encodeStrokeDash`

- Implemented: `encodeStrokeDash({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: DashScale } | { value: DashStyle | DashPattern; target?: UserId })`
- `DashStyle = "solid" | "dashed" | "dotted" | "dashdot"`
- `DashPattern = readonly number[]`; empty array는 solid, non-empty array는 even-length,
  non-negative finite values이며 all-zero는 허용하지 않는다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeStrokeDash`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal line series, inferred/explicit target, invalid mark/type/field, compatible/incompatible
    group/color field, same/different-field reassignment.
- `value`
  - ✅ Covered: four named styles, direct pattern, field↔constant replacement, field/value exclusivity,
    scale/type rejection in constant mode.
- `scale.domain`
  - ✅ Covered: auto and explicit order.
- `scale.range`
  - ✅ Covered: automatic cycling, direct patterns, named styles, resolved numeric recipes, invalid patterns.
- Named recipes: `solid → []`, `dashed → [6, 4]`, `dotted → [1, 3]`,
  `dashdot → [6, 3, 1, 3]`.
- Evidence: line-series encoding and scale tests.

## `encodeSize`

- Signature: `encodeSize({ field, target?, fieldType?, scale? })`
- `field`: 필수 quantitative field.
- `target`: optional point ID.
- `fieldType`: 유일한 값 `"quantitative"`.
- `scale`: linear size-area scale; auto range는 `[24, 196]`이다.
- Effect: semantic size를 concrete area로 mapping하고 circle radius=`sqrt(area/pi)`, square side=`sqrt(area)`로
  materialize한다. constant `encodeRadius`와 함께 사용할 수 없다.
- Reassignment: 다시 호출하면 size field와 compatible scale binding을 교체하고 point 및 existing
  size legend를 rematerialize한다. constant radius conflict는 자동 제거하지 않는다.
- Coverage: regression scatterplot과 size legend tests가 representative mapping을 검증한다. explicit
  domain/range와 constant-size conflict의 값 matrix는 부분적이다.

### Formal values — `encodeSize`

- Implemented: `encodeSize({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear"; domain?: ContinuousDomain; range?: "auto" | readonly [NonNegativeFinite, NonNegativeFinite] } })`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeSize`

- `field`, `target`, `fieldType`
  - ✅ Covered: quantitative point field, inferred/explicit target, invalid type/field.
- `scale.domain/range`
  - ✅ Covered: auto domain/range `[24, 196]`, representative mapping and explicit values through shared scale tests.
  - ⚠️ Partial: zero/negative area range rejection and constant domains in direct action tests.
- Interaction
  - ✅ Covered: constant radius conflict and shape-independent equal-area materialization.
- No proposal: explicit `scale.range` remains the single size-area range API.
- Evidence: point appearance and regression-guide tests.

## `encodeShape`

- Signature: `encodeShape({ field, target?, fieldType?, scale? })`
- `field`, `target`, `fieldType`: nominal field, optional point ID, nominal-only type다.
- `scale`: ordinal shape scale. Shared `PointShape` 12종을 non-repeating automatic range로 사용한다.
- Effect: point graphic을 heterogeneous collection으로 바꾸고 각 datum의 concrete primitive type과
  legend symbol을 rematerialize한다.
- Coverage: regression scatterplot과 point/legend tests가 circle/square mapping을 검증한다.

### Formal values — `encodeShape`

- Implemented: `encodeShape({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: "auto" | readonly PointShape[] } })`
- Reassignment: 다시 호출하면 shape field와 compatible scale binding을 교체하고 heterogeneous point
  children 및 existing shape legend를 rematerialize한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeShape`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal point field와 invalid alternatives.
- `scale.domain/range`
  - ✅ Covered: automatic and explicit 12-shape range, unique validation, capacity error and heterogeneous output.
  - ✅ Covered: equal-area mark/legend recipes and Canvas path-ready concrete geometry.
- Evidence: point appearance, mark-schema and regression chart/guide tests.

## `encodeOpacity`

- Signature: `encodeOpacity({ value, target? } | { field, target?, fieldType?, scale? })`
- `value`: field와 mutually exclusive인 finite `[0, 1]` number.
- `field`: value와 mutually exclusive인 quantitative point field. auto linear range는 `[0.2, 1]`이다.
- `target`: optional point ID.
- Effect: constant는 graphical config, field는 semantic encoding과 linear scale을 저장한다. 같은 target에
  다시 호출하면 constant↔field 또는 field↔field를 structural copy로 교체하고 point/legend를 rematerialize한다.
- Coverage: point/regression tests와 validation이 representative, reassignment 및 invalid range를 검증한다.

### Formal values — `encodeOpacity`

- Implemented: `encodeOpacity({ value: UnitInterval; target?: UserId } | { field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear"; domain?: ContinuousDomain; range?: "auto" | readonly [UnitInterval, UnitInterval]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean } })`
- Planned (NOT IMPLEMENTED): transformed opacity scale types.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeOpacity`

- `value`
  - ✅ Covered: representative value, 0, 1, below/above range와 non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point, unknown/incompatible target.
- Reassignment
  - ✅ Covered: constant↔constant, field↔field and constant↔field immutable replacement.
- ✅ Covered: auto/explicit descending range, clamp/reverse, continuous sample legend and constant-mode cleanup.
- Evidence: point appearance, continuous legend, regression and Phase 1 integration tests.

## `encodeRadius`

- Signature: `encodeRadius({ value, target? })`
- `value`: 필수 non-negative finite number. 0은 보이지 않는 point, 양수는 circle radius 또는 square
  half-side가 된다.
- `target`: optional point ID.
- Effect: graphical mark config와 concrete size만 바꾸며 semanticSpec에는 기록하지 않는다.
  field-driven `encodeSize`와 동시에 사용할 수 없다. 같은 target에 다시 호출하면 기존 radius를
  교체하고 point를 rematerialize한다.
- Coverage: scatterplot/point tests가 constant radius, reassignment, rematerialization과 invalid values를 검증한다.
- Proposed: Polar position의 radial channel 이름은 이미 이 action이 차지한 `encodeRadius`와 충돌한다.
  Polar API를 설계할 때 별도 이름을 사용자와 결정해야 한다.

### Formal values — `encodeRadius`

- Implemented: `encodeRadius({ value: NonNegativeFinite; target?: UserId })`
- Proposed (NOT IMPLEMENTED): —; constant value는 radius unit만 유지한다.

### Value coverage — `encodeRadius`

- `value`
  - ✅ Covered: 0, positive representative, negative/non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point와 invalid target.
- Interaction
  - ✅ Covered: semanticSpec unchanged, child broadcast, same-action reassignment, encodeSize conflict.
- No proposal: constant area shorthand는 추가하지 않고 field-driven area는 `encodeSize`가 소유한다.
- Evidence: `test/unit/actions/encodings/radius-encoding.test.js`.

## `encodeBarWidth`

- Signature: `encodeBarWidth({ band?, pixels?, target? })`
- `band`: `(0, 1]` finite number. Resolved xOffset slot 중 rect가 차지하는 비율이다.
- `pixels`: positive finite logical Canvas pixel width. `band`와 mutually exclusive이며 PNG `pixelRatio`와
  무관하다.
- 첫 assignment에서 width mode를 생략하면 `{ band: 0.72 }`; reassignment에서 생략하면 current mode와
  value를 유지한다. Group slot spacing은 `encodeXOffset`이 소유한다.
- `target`: optional complete ordinal aggregate bar ID. Group layout은 matching xOffset를 추가로 요구한다.
- Effect: graphical mark config에 exactly one width mode를 저장하고 centered rect x/width를
  rematerialize한다. Band width는 Canvas resize에 반응하고 pixel width는 고정된다. Slot보다 큰 explicit
  pixel width와 overlap은 허용한다.
- 오류: ordinal x, scalar aggregate y와 color가 완성되지 않으면 거부한다. Group layout은 matching
  color/xOffset가 완성되지 않으면 거부한다.
- Coverage: grouped-bar semantic/reference tests가 default, explicit value, invalid range와 geometry를 검증한다.

### Formal values — `encodeBarWidth`

- Implemented: mutually exclusive `encodeBarWidth({ band?: number; pixels?: never; target?: UserId } | { band?: never; pixels: PositiveFinite; target?: UserId })`; first-assignment default `{ band: 0.72 }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeBarWidth`

- `band`
  - ✅ Covered: omission→`0.72`, representative `(0,1)`, exact `1`, 0/negative/>1/non-finite rejection.
- `pixels`
  - ✅ Covered: representative fixed width, slot보다 큰 overlap, zero/negative/non-finite rejection와
    `band` mutual exclusion.
- `target`
  - ✅ Covered: inferred/explicit grouped bar와 incomplete prerequisites.
- Reassignment
  - ✅ Covered: explicit mode switching, omitted-mode retention와 immutable concrete rematerialization.
- Resize/order
  - ✅ Covered: band responsive, pixels fixed, width/padding action-order convergence와 2× PNG parity.
- Evidence: grouped-bar width and chart reference tests.
