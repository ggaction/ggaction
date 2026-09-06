# Encoding action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared scale option contract

공유 scale의 domain/range를 갱신하면 변경한 target뿐 아니라 모든 compatible consumer와
그 consumer에 붙은 source-dependent mark를 같은 완료 상태로 rematerialize한다. Data filtering과
appearance encoding도 이 규칙을 따른다. 근거: test/contracts/shared-scale-refresh.test.js.
Encoding 제거, 새 scale ID로의 재연결, field-driven appearance의 상수 전환은 이전 scale의
남은 consumer도 다시 계산한다. Automatic domain은 이탈한 consumer의 값을 제외하고 explicit domain은
보존한다. Consumer가 없는 named scale은 유지하며 해석을 강제하지 않는다.

Encoding의 `scale` object는 channel에 따라 아래 subset을 사용한다.

- `id`: Implemented. user-defined scale ID; 생략하면 channel 이름(`x`, `y`, `color`, `size`,
  `shape`, `strokeDash`, `xOffset`, `yOffset`)을 사용한다.
- `type`: Implemented. compatible quantitative position은 `linear | log | pow | sqrt | symlog`, temporal position은 `time`, discrete position은 `band | point`; nominal color/shape/dash/offset은
  `ordinal`, continuous point/aggregate-bar/rect color는 `sequential`, quantitative point/aggregate-bar/rect color는 추가로
  `quantize | quantile | threshold`, size는 `linear`만 허용한다.
- `domain`: Implemented. `"auto"` 또는 type에 맞는 explicit array. explicit domain은 data inference,
  `zero`, `nice`보다 우선한다. Quantitative transformed auto domain이 finite constant로 축약되면 log는
  zero를 건너지 않는 multiplicative pair, pow/sqrt/symlog는 표현 가능한 경우 transform-space 중심을
  보존하는 distinct finite pair로 padding한다. Numeric limit에서는 관측값을 포함하는 nearest finite pair를
  사용하고 explicit transformed constant domain은 계속 거부한다.
- `range`: Implemented. `"auto"` 또는 type/channel에 맞는 explicit array. position auto range는
  Canvas plot bounds를 사용한다.
- `nice`: Implemented for linear/time position scale. boolean이며 auto domain만 읽기 좋은 경계로
  확장한다. ordinal에는 허용되지 않는다.
- `zero`: Implemented for linear scale. boolean이며 auto domain에만 zero를 포함한다. explicit domain이
  있으면 적용되지 않는다.
- `palette`: Implemented for color scale. palette name이며 `range`와 동시에 사용할 수 없다.
  `encodeColor`에서는 top-level shorthand 또는 `scale.palette` 중 하나로 지정한다.
- `base`, `exponent`, `constant`: Implemented for position `log`, `pow`, `symlog`; defaults는 `10`, `1`, `1`이다. `sqrt`는 fixed exponent `0.5`다.
- `clamp`, `reverse`: Implemented for compatible continuous position/color mappings and final resolved ranges.
- `paddingInner`, `paddingOuter`, `padding`, `align`: Implemented for type-compatible band/point position.
- `unknown`: Implemented for row-owned point `x`, `y`, `color`, `size`, `shape`, `opacity`. Missing/invalid input과
  explicit ordinal domain 밖의 값에 channel-valid concrete fallback을 사용하며 scale domain에는 추가하지 않는다.
  Compound path/bar/area/rule, offset과 strokeDash에서는 topology-safe fallback contract가 없어 거부한다.
- Direct `createScale`/`editScale`은 complete current scale vocabulary를 노출한다. Encoding attachment가
  field type, channel, mark grain과 existing consumers에 맞는 subset을 검증한다.
- Proposed: —

## `removeEncoding`

- Signature: `removeEncoding({ target?, channel })`.
- `channel` is the closed vocabulary `"x" | "y" | "x2" | "y2" | "xOffset" | "yOffset" |
  "theta" | "radius" | "color" | "strokeDash" | "strokeWidth" | "size" | "shape" | "group" |
  "angle" | "opacity" | "text"`.
- `target` resolves the current mark when it owns the requested channel, otherwise the unique active owner;
  ambiguous ownership requires an explicit mark ID. A direct missing assignment is an error.
- The action removes the semantic assignment and starts rematerialization from an empty concrete mark baseline.
  Complete marks are rebuilt; incomplete marks remain as empty collections until a later encoding completes them.
  Canvas, surviving-scale and appearance edits preserve that empty state; they cannot recreate partial row graphics.
- Primary `x`/`y` removal also removes the same-mark secondary endpoint and directional offset. Grouped-bar color
  removal preserves canonical group/layout and active offsets. Legacy unnormalized area group removal also clears dependent color.
  A normalized bar color layout returns to the ordinary zero baseline.
- Categorical 재작성은 partial removeLegend와 같은 lifecycle owner를 사용한다. Hidden title, custom/inferred title,
  layout/styles/order와 explicit symbol recipe를 보존하며 automatic recipe만 남은 채널로 재추론한다.
  Evidence: `test/unit/actions/guides/legend-content-removal.test.js`.
- Matching categorical, gradient/interval color, size, opacity and stroke-width legend blocks are removed or
  reconstructed without deleting other blocks. Axis/grid resources are removed only when the removed primary
  scale has no remaining same-channel consumer.
- Stored selections are preserved. Removing a channel directly referenced by a stored selection is rejected before
  any state change; compatible highlights replay from the clean post-removal mark baseline.
- Source datasets, named scales and coordinates are retained. `pathOrder` remains owned by `removePathOrder`, and
  Parallel dimensions remain owned by `encodeParallelCoordinates`.

### Formal values — `removeEncoding`

- Implemented: `removeEncoding({ target?: UserId; channel: RemovableEncodingChannel })`.
- Proposed (NOT IMPLEMENTED): per-channel remove aliases and scale/data/coordinate deletion.

### Value coverage — `removeEncoding`

- ✅ Covered: all 17 channel values, current/unique/explicit/ambiguous target resolution and missing assignment.
- ✅ Covered: range endpoint and grouped-bar cascades, guide/legend cleanup, scale preservation, incomplete recovery,
  clean highlight replay and later Canvas/scale/data rematerialization.
- ✅ Covered: caller option and earlier-program immutability plus unsupported `pathOrder` rejection.
- Evidence: `test/unit/actions/encodings/remove-encoding.test.js`.

## `encodeX`

Source-owned Text는 독립 position consumer가 아니므로 encodeX/Y를 직접 적용하면 사전 오류다.
Source 위치를 편집하거나 editTextMark의 dx/dy를 사용한다. Explicit data로 만든 independent Text는 field 또는 datum 위치 encoding을 지원한다.
Independent Text의 x/y와 text가 모두 상수면 dataset 행 수나 빈 dataset과 무관하게 하나의 항목을 만든다. 어느 하나라도
field이면 dataset row grain을 사용하고 상수 위치를 각 행에 broadcast한다.
Source-owned Text의 inherited aliases는 domain, guide inference/rebinding, scale/Canvas dependency에서 제외한다.
근거: `test/unit/actions/marks/text-scale-ownership.test.js`, `test/contracts/source-text-scale.test.js`.

- Signature: `encodeX({ field, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: Implemented, dataset에 존재하는 field. 현재 supported mark grain에 맞는 값 type이 필요하다.
- `target`: Implemented, mark ID. 생략하면 current mark, 아니면 유일한 eligible mark를 추론한다.
- `fieldType`: Implemented. Point와 rect x/y는 quantitative/temporal/ordinal/nominal, line과 area는 아래 canonical
  compatibility matrix, bar는 quantitative/temporal/ordinal을 mark grain에 맞게 지원한다. Rect categorical x/y는
  band scale cell을 만들고 continuous x는 matching x2와 함께 ranged cell을 완성한다.
- `scale`: Implemented. 위 shared contract를 사용한다. 기본 ID는 `x`, auto range는 left-to-right plot bounds다.
- `coordinate`: Implemented, coordinate ID. 생략 시 positional action이 Cartesian `main` coordinate를
  만들거나 existing compatible coordinate를 사용하고 layer에 저장한다.
- `bin`: Implemented for quantitative bar x and quantitative-x aggregate line. `{ maxBins?: PositiveInteger }`,
  `{ step: PositiveFinite }`, `{ boundaries: readonly [Finite, Finite, ...Finite[]] }` 중 하나다.
  생략된 maxBins default는 `10`; 세 mode는 mutually exclusive이며 bin boundaries와 bar x/width 또는
  line midpoint/aggregate grain을 결정한다. 자동 생성은 요청된 maxBins가 더 크더라도 최대 10,000개
  bin으로 제한하고, 명시적 step이 10,000개를 초과하는 bin을 요구하면 materialization 전에 거부한다.
  Explicit boundaries는 최대 10,001개, 즉 10,000 bins다.
- `aggregate`, `stack`: Horizontal bar의 quantitative x measure에 사용한다. Binned histogram x와
  category x에서는 거부된다.
- Effect: x encoding과 scale을 semantic state에 저장하고 scale 및 compatible mark/guide consumers를
  rematerialize한다.
- Bar order independence: quantitative measure를 category보다 먼저 쓰면 field/type/scale과 명시적
  aggregate/stack만 저장한다. 생략한 aggregate/stack은 아직 결정하지 않으며 graphic items는 비어 있다.
  반대 category가 완성되면 같은 Bar policy와 wrapped position action으로 mean/null을 적용한다.
  Histogram의 y-first는 같은 field의 binned x가 완성될 때 count/zero로 결정한다. 명시적 집계·stack·scale
  설정은 보존하며 잘못된 field/type/value는 미완성 상태에서도 즉시 거부한다. 두 위치가 모두 있는
  지원 불가 pair는 거부한다. Scale의 자동 zero 결정도 role이 완성될 때 적용한다.
- Line order independence: direct quantitative line은 y가 아직 없어도 x semantic과 scale을 저장한다.
  `encodeY`가 compatible quantitative pair를 완성할 때 materialize하며 y→x와 동일한 final
  layer/resolved scale/graphic을 만든다. Aggregate y line은 temporal x 또는 binned quantitative x를
  요구한다. Binned x는 각 resolved bin midpoint를 vertex로 사용하고 y aggregate를 bin 및 series grain에서
  계산하며 path, x domain과 y domain은 하나의 boundary set을 공유한다.
- Layered rule datum: inherited position provenance가 있는 rule에 datum x를 작성하면 secondary endpoint가
  없는 경우 inherited y branch만 제거해 vertical full-span을 만든다. Explicit data나 field x는 이 정리를
  적용하지 않는다.
- Rule/Rect/independent Text datum inference: finite number datum은 quantitative, 다른 supported scalar datum은 nominal로 추론한다.
  Temporal 또는 ambiguous datum은 `fieldType`을 명시해야 하며 rule field mode는 계속 explicit `fieldType`을 요구한다. Rect field mode는 기존 기본값을 유지한다.
- Reassignment: 같은 target에 다시 호출하면 compatible field와 scale binding을 교체한다. scale ID를
  생략하면 현재 x scale을 재사용하고, explicit new ID는 이전 scale을 남긴 채 axis/vertical grid를
  새 scale에 rebind한다. inferred title은 새 field로 바뀌고 custom title/style은 유지된다.
- Coverage: position, histogram, ordinal bar, temporal chart tests가 주요 mark 조합을 검증한다.
  explicit scale option의 전체 교차조합은 부분적이다.

### Formal values — `encodeX`

- Implemented: `encodeX({ field: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal"; scale?: PositionScale; coordinate?: UserId; aggregate?: AggregateOperation; bin?: BinDefinition; stack?: "zero" | "normalize" | null })`; 실제 조합은 canonical matrix와 mark grain policy가 제한한다.
- Implemented quantitative extension: `{ scale?: { type?: "log" | "pow" | "sqrt" | "symlog"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean } }` for compatible point, line, area, bar and rule materializers.
- Implemented point fallback: `{ scale?: { unknown?: Finite } }`; temporal `time` remains UTC-only.
- Implemented Rule/Rect/independent Text datum shorthand: `encodeX({ datum, target?, fieldType?, scale?, coordinate? })`; omitted
  `fieldType` infers finite numbers as quantitative and other supported scalars as nominal.
- Proposed (NOT IMPLEMENTED): Polar positional action.

### Value coverage — `encodeX`

- `field`, `target`
  - ✅ Covered: inferred/explicit point, line, bar, rect, area and independent text targets; missing field, ambiguous/invalid target.
- `fieldType`
  - ✅ Covered: point quantitative/temporal/ordinal, line/area current matrix, vertical ordinal/temporal bar,
    horizontal ordinal/temporal bar와 unsupported pair rejection.
  - ✅ Covered: unsupported mark/type pairs rejection.
- `coordinate`
  - ✅ Covered: omitted Cartesian default, explicit/reused coordinate, incompatible coordinate rejection.
  - 🟣 Proposed: Polar theta/radial mapping; action naming unresolved.
- `aggregate`
  - ✅ Covered: omission is the only supported x aggregate mode and bounded incompatible aggregate cases reject
    before state changes; exhaustive operation repetition adds no distinct policy branch.
- `bin`
  - ✅ Covered: default via histogram, representative positive integer, invalid integer/value와
    quantitative-x line bin/aggregate grain 및 action-order convergence.
  - ✅ Covered: exact step, negative/positive constant, zero policy, irregular boundaries, half-open/final-upper
    assignment, empty-bin omission, exclusivity와 explicit-domain conflicts.
  - ✅ Covered: exact minimum `1`, representative/default values and invalid integer classes; unbounded performance
    stress is not a persisted semantic guarantee.
- `scale.id/type/domain/range/nice/zero`
  - ✅ Covered: auto/explicit linear, time, ordinal definitions; explicit domain/range precedence;
    wrong type and shared-channel conflicts.
  - ✅ Covered: compatibility partitions and bounded pairwise nice/zero/explicit-domain precedence across
    quantitative, temporal and ordinal fields; exhaustive Cartesian products are intentionally excluded.
  - ✅ Covered: point/line/area/bar/rule log/pow/sqrt/symlog mapping, parameters, clamp/reverse, guides and Canvas resize.
  - ✅ Covered: band/point defaults, padding/alignment, reversed range, bar bandwidth compatibility and shared point centers.
  - ✅ Covered: temporal aggregate bar bandwidth plus compatible line, rule, and text consumers on the same
    field and scale; annotation-only temporal values do not change the bar-derived bandwidth, while matching
    values align to bar centers; explicit independent scales, incompatible field rejection, Canvas resize and
    scale reversal.
  - ✅ Covered: point missing/invalid and explicit-domain `unknown`; compound-grain rejection.
- Evidence: position, temporal, histogram-bin and ordinal-bar action tests, including
  `test/unit/actions/scales/temporal-bar-line-sharing.test.js`,
  `test/contracts/line-position-order.test.js`, and
  `test/contracts/rule-inherited-datum-span.test.js`.

## `encodeY`

Source-owned Text의 직접 위치 편집과 scale ownership은 위 encodeX의 공통 규칙을 따른다.

```typescript
type ScalarAggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";

type ConfidenceIntervalMethod = "normal" | "student-t";

type ParameterizedAggregateOperation =
  | { op: "quantile"; probability: UnitInterval }
  | {
      op: "first" | "last";
      orderBy: FieldName;
      order?: "ascending" | "descending";
    }
  | {
      op: "ciLower" | "ciUpper";
      method?: ConfidenceIntervalMethod;
      level?: UnitIntervalExclusive;
    };

type AggregateOperation =
  | ScalarAggregateOperation
  | ParameterizedAggregateOperation;
```

- Signature: `encodeY({ field?, target?, fieldType?, scale?, coordinate?, aggregate?, stack? })`
- `field`: point/line/ordinal-bar에서는 필수 field다. Rect는 field/datum 중 정확히 하나이며 area datum은 별도 endpoint 계약을 따른다. histogram count y는 x field에서 추론한다.
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
  interpolation이다. 문자열 CI endpoint는 호환 기본인 95% normal approximation
  `mean ± 1.96 * stderr`다. Sum, mean, quantile과 moments는 scaled finite
  arithmetic을 사용하며 최종 statistic 자체가 finite number로 표현될 수 없으면 action을 원자적으로 거부한다.
- `{ op: "quantile", probability }`는 finite quantitative sample을 정렬해 linear interpolation한다.
  Probability는 필수 `[0, 1]` 값이며 `0`/`1`은 min/max다.
- `{ op: "first" | "last", orderBy, order? }`는 valid comparable order key를 가진 row를 stable
  source order fallback으로 정렬한 뒤 encoded finite quantitative value를 선택한다. `order`는
  `"ascending"`으로 normalize되어 semantic state에 저장된다. 유효한 candidate가 없거나 order-key
  type이 한 group 안에서 섞이면 해당 group을 생략한다.
- `{ op: "ciLower" | "ciUpper", method?, level? }`는 method를 `"normal" | "student-t"`, level을
  `(0, 1)`로 명시한다. 기본은 문자열 축약형과 같은 `{ method: "normal", level: 0.95 }`이며 resolved
  method와 level을 semantic aggregate provenance에 저장한다.
- `stack`: Implemented values `"zero" | "normalize" | "center" | null`. `"normalize"`은 각 non-negative
  partition을 합계 1로 정규화하고 automatic y domain을 `[0, 1]`로 고정한다. 합계가 0인 partition은
  graphic을 만들지 않는다. Aggregate bar의 group/overlay는 `stack: null`이어도 semantic start endpoint
  `0`을 domain과 geometry가 함께 사용한다. Automatic domain은 `zero: false`와 무관하게 이 endpoint를
  포함하며 explicit domain이 0을 제외하면 preflight에서 거부한다. `"center"`는 nominal group을 가진
  non-negative raw/density area의 y에서만 허용한다. 모든 group은 같은 x position을 정확히 한 번씩 가져야
  하며 각 partition은 deterministic first-appearance group order로 `-total / 2`부터 쌓인다. Missing position,
  duplicate group/x, ranged area, negative value와 bar center stack은 atomic하게 거부한다.
  Normalize/fill partition과 representable centered half-total은 normalized sums로 total overflow를 피한다.
  Absolute stack/diverging endpoint 또는 positive segment 두께를 finite number로 표현할 수 없으면 거부한다.
- `bin`: 현재 y에서는 지원되지 않는다.
- Effect: y semantic, scale, final bar/line aggregate grain을 저장하고 mark geometry와
  existing guides를 rematerialize한다.
- Bar의 measure-first·histogram y-first는 위 `encodeX`의 공통 order contract를 따른다. 생략 field는
  binned x가 이미 있을 때만 추론하며, 위치가 없으면 field를 명시해야 한다.
- Line order independence: direct quantitative line은 x가 아직 없어도 y semantic과 scale을 저장하고,
  compatible x가 완성되면 x→y와 동일한 final line을 materialize한다. Complete direct quantitative pair는
  row grain을 보존하고 x ascending/source-order tie로 정렬하며 같은 x의 y를 암묵적으로 합계 내지 않는다.
  따라서 concrete path와 automatic y domain은 항상 같은 row values를 사용한다. Aggregate y는 temporal x 또는
  binned quantitative x와 함께 final grain을 만든다. Latter는 resolved bin별 summary와 midpoint vertex를 만들고,
  unbinned quantitative x와 aggregate y 조합은 명시적 validation error다.
- Layered rule datum: inherited position provenance가 있는 rule에 datum y를 작성하면 secondary endpoint가
  없는 경우 inherited x branch만 제거해 horizontal full-span을 만든다. Explicit data나 field y는 이 정리를
  적용하지 않는다.
- Reassignment: 같은 target의 existing fieldType, aggregate/bin/stack mode와 coordinate를 유지하며
  compatible field를 교체한다. current scale reuse, explicit new-scale rebind, inferred/custom title
  규칙은 x와 같다.
- Coverage: 전체 scalar vocabulary의 numeric/validity fixture, line public materialization, ordinal bar
  final grain, zero/null 조합을 검증한다. Aggregate × scale override pairwise coverage는 부분적이다.

### Formal values — `encodeY`

- Implemented: `encodeY({ field?: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal" | "nominal"; scale?: PositionScale; coordinate?: UserId; aggregate?: AggregateOperation; stack?: "zero" | "normalize" | "center" | null })`; `"center"`는 aligned non-negative grouped area y 전용이고, nominal은 compatible count-style aggregate에만 허용되며 mark/pair policy가 조합을 제한한다.
- Implemented quantitative extension: `{ scale?: { type?: "log" | "pow" | "sqrt" | "symlog"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean } }` for compatible point, line, area, bar and rule materializers.
- Implemented point fallback: `{ scale?: { unknown?: Finite } }`; temporal `time` remains UTC-only.
- Implemented Rule/Rect/independent Text datum shorthand: `encodeY({ datum, target?, fieldType?, scale?, coordinate? })`;
  independent Text uses one item when x/y/text are all constant and row grain when any is field-bound.
- Proposed (NOT IMPLEMENTED): full-item extreme selection은 Planned `selectMarks`가 소유한다.

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
  - ✅ Covered: finite extreme cancellation/means/deviations, normalized fill/center와 unrepresentable statistic
    또는 stack endpoint rejection.
  - 🟡 Planned: full-item min/max selection은 scalar aggregate가 아닌 `selectMarks` selector로 제공한다.
- `stack`
  - ✅ Covered: `"zero"`, `"normalize"`, `"center"`, `null`, positive/zero partition, auto `[0, 1]`,
    symmetric center domain, direct/order-independent area authoring과 incompatible policy rejection.
- `scale`
  - ✅ Covered: auto/explicit domain/range, nice/zero precedence, shared consumer conflicts.
  - ✅ Covered: bounded aggregate/stack/scale pairs cover raw, aggregate, zero/normalize/center/null and transformed
    mapping branches; invalid combinations fail atomically.
  - ✅ Covered: point/line/area/bar/rule transformed mapping and shared axes/grid rematerialization.
  - ✅ Covered: compatible band/point types, padding/alignment and shared consumer rematerialization.
  - ✅ Covered: point missing/invalid and explicit-domain `unknown`; compound-grain rejection.
- Evidence: point position, line aggregate, histogram y and ordinal aggregate bar tests.

## Position field-type compatibility

- Canonical owner: `src/grammar/positionCompatibility.js`. Generic mark × channel acceptance는 여기서만
  정의하고 bar grain narrowing은 `src/grammar/bars/policy.js`가 소유한다.
- Point x/y: `"quantitative" | "temporal" | "ordinal" | "nominal"`.
- Line x: `"quantitative" | "temporal"`; line y는 direct quantitative pair, regression/interval/window output,
  또는 temporal x aggregate policy에 따라 `"quantitative" | "temporal" | "ordinal" | "nominal"`을 더 좁힌다.
- Area x: ranged area는 `"quantitative" | "temporal"`, density area는 `"quantitative"`; area y는
  `"quantitative"`.
- Bar vertical: `ordinal | temporal x + quantitative aggregate y`.
- Bar horizontal: `quantitative aggregate x + ordinal | temporal y`.
- Bar orientation은 complete pair에서 추론하며 semantic mark에 중복 저장하지 않는다. Histogram은
  binned quantitative x/count y로 vertical을 결정한다.
- Temporal normalization은 source dataset을 바꾸지 않는다. 생략/auto에서 1000–9999 정수와 4자리 문자열은 UTC
  year, `YYYY-MM-DD`/`YYYY/MM/DD`는 검증된 UTC date, 그 밖의 valid string과 finite number는
  timestamp로 해석한다.
- Current scale vocabulary는 UTC temporal `time`, discrete position `band | point`, appearance/offset
  `ordinal`, quantitative `linear`과 point-only transformed aliases다.
- Horizontal `layout: "group"`은 yOffset을 사용한다. Stack/fill/overlay/diverging은 quantitative x measure에서
  materialize한다.
- Evidence: `test/unit/grammar/position-compatibility.test.js`, scale temporal normalization tests,
  point mixed-position tests, jobs `temporal-x`/`horizontal-bar` primitive-public exact pairs.

## Temporal input units

- `TemporalInputUnit = "auto" | "year" | "timestamp"`. Existing temporal branches of x/y, supported x2/y2,
  xRange/yRange, theta, color and Rule datum accept `temporalUnit`. Facade and interval-composite position
  objects forward it; no new mark/channel field-type support is introduced.
- Omission uses the existing parser without storing a new property. Explicit auto stores `"auto"`. Auto preserves
  four-digit year/date/zone parsing. Year accepts an integer 0–9999 or exactly four digits and uses UTC January 1.
  Timestamp accepts a finite numeric Unix millisecond value in the Date range; strings and Date objects fail.
  False, null and unknown units fail. No seconds inference is performed.
- Unit is stored in `layer.encoding.<channel>.temporalUnit`. Same-field or same-datum reassignment preserves
  the previous explicit unit when omitted. A new field or field/datum transition clears an omitted unit.
  Non-temporal reassignment removes it; explicitly supplying a unit to non-temporal args fails.
- Primary/secondary endpoints share their scale but own input units independently. Range shorthands forward one
  explicit unit to both. Scale domains and tick values are already timestamps and are never reparsed as years.
- Scale consumers, Line/Bar temporal grouping, geometry and channel selection/filter use normalized values.
  Raw-field selectors and source rows retain original values. Different input units can share a time scale.
- Horizon x input and TimeUnit transform input store the same unit. Horizon-generated x is explicitly bound as
  timestamp to avoid interpreting a small positive timestamp as a year. TimeUnit output should likewise be bound
  with `temporalUnit: "timestamp"`; its calendar `unit` is a separate option.
- Regression, Density and Horizon creation accept JSON-safe `groupBy:false`. Regression omission infers the
  unique Point color/shape field; explicit undefined remains its legacy opt-out. Density omission/undefined stays
  ungrouped. Horizon omission/undefined infers stored group. Their editors preserve omitted grouping, reject
  explicit undefined and clear with false. `"auto"` stays a literal field name, not a sentinel.
- Data-only groupBy options are unchanged. False is normalized before transform creation and is not stored as a field.
- Numeric color remains nominal by default and repeated Bar values still use mean. Explicit type and aggregate win.
- ✅ Covered: parser boundaries, owner/entry matrix, same/new binding transitions, scale/Canvas/legend/selection,
  grouping opt-out and independent primitive/public graphics and pixels. Evidence:
  `test/unit/actions/encodings/temporal-input-units.test.js`, `group-inference-opt-out.test.js`,
  `test/charts/temporal-input/`, `examples/temporal-input/`.

## `encodeXOffset`

- Signature: `encodeXOffset({ field, target?, fieldType?, scale?, paddingInner?, paddingOuter? })`
- `field`: categorical grouping field. Categorical x position을 가진 point/rule 또는 complete histogram/ordinal
  aggregate bar에 허용된다. Existing grouped bar color가 있으면 같은 field만 직접 설정할 수 있고 field 교체는
  atomic `encodeColor`가 소유한다.
- `target`: optional eligible bar, point, or rule ID.
- `fieldType`: `"nominal" | "ordinal"`; 기본값은 nominal이다.
- `scale`: ordinal scale contract; 기본 ID `xOffset`, domain은 grouping order, automatic range는 parent x band 또는
  point-scale step 크기의 categorical slot이다.
- `paddingInner`: finite `[0, 1)`, sibling slot 사이의 step fraction. 기본값은 `0`이다.
- `paddingOuter`: non-negative finite, 첫/마지막 slot 바깥의 step fraction. 기본값은 `0`이다.
- Effect: parent x category 안에 group sub-slots를 만들고 padding intent를 immutable mark materialization config에
  저장한다. 같은 field 재호출에서 생략한 padding은 기존 값을 유지한다. Explicit/reversed range endpoint를
  유지한 채 signed step, start와 positive bandwidth를 계산한다. Bar는 sub-band rectangle을, point와 rule은
  sub-slot center를 사용한다. Parent/offset scale, Canvas 또는 data가 바뀌면 dependent mark를 rematerialize한다.
- Shared xOffset scale의 consumer는 같은 padding policy와 같은 크기의 resolved parent categorical slot을 사용해야
  한다.

### Formal values — `encodeXOffset`

- Implemented: `encodeXOffset({ field: FieldName; target?: UserId; fieldType?: "nominal" | "ordinal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: NumericRange }; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeXOffset`

- `field`, `target`
  - ✅ Covered: nominal grouping field, explicit/inferred eligible bar/point/rule, missing/incompatible prerequisites.
- `fieldType`
  - ✅ Covered: `"nominal" | "ordinal"`와 invalid alternatives.
- `scale.id/type/domain/range`
  - ✅ Covered: defaults, explicit order, reversed range, auto range rematerialization, invalid definitions.
- `paddingInner`, `paddingOuter`
  - ✅ Covered: defaults, partial reassignment preservation, boundaries, explicit/reversed range, Canvas resize,
    zero-bandwidth와 shared-policy rejection.
- Reassignment
  - ✅ Covered: same-field scale/padding edit, grouped color mismatch rejection와 atomic color-owned field change.
- Point/rule materialization
  - ✅ Covered: categorical point-scale slots, reversed offset range, parent scale edit, Canvas resize, vertical error-bar
    main/cap alignment and cap reconstruction.
- Evidence: `test/unit/actions/encodings/x-offset-encoding.test.js`.

## `encodeYOffset`

- Signature: `encodeYOffset({ field, target?, fieldType?, scale?, paddingInner?, paddingOuter? })`
- `encodeXOffset`과 같은 categorical sub-slot 계약을 y category에 적용한다. Categorical y를 가진 point/rule 또는
  horizontal aggregate bar를 지원하며 grouped bar color가 있으면 같은 field를 사용해야 한다.
- 기본 scale ID는 `yOffset`이며 auto range는 parent y band 또는 point-scale step 크기다. Explicit/reversed range,
  padding intent, Canvas/parent-scale rematerialization과 shared-consumer compatibility는 xOffset과 동일하다.
- `encodeColor({ layout: "group" })`은 horizontal bar에서 이 action을 wrapped child로 호출한다.

### Formal values — `encodeYOffset`

- Implemented: `encodeYOffset({ field: FieldName; target?: UserId; fieldType?: "nominal" | "ordinal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: NumericRange }; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeYOffset`

- ✅ Covered: direct and color-owned assignment, bar/point/rule targets, nominal/ordinal field types, default and explicit
  scale definitions, padding, reversed range, Canvas rematerialization, explicit color-domain reassignment, incompatible
  orientation and earlier-program immutability.
- Evidence: `test/unit/actions/encodings/y-offset-encoding.test.js`,
  `test/charts/jobs-horizontal-grouped-bar/public.test.js`.

## `encodeY2`

- Signature: area, ranged bar는 `encodeY2({ field, target?, fieldType?, scale? })`; Rect는 `field | datum`과 primary에서 추론하는 fieldType을 받는다. Rule은
  `encodeY2({ field | datum, target?, fieldType, scale?, coordinate? })`다.
- Area/ranged-bar `field`는 quantitative upper-bound field다. Bar는 stale aggregate/stack intent를 제거해
  lower/upper endpoints를 one range grain으로 저장한다. Rule은 field/datum 중 정확히 하나를 요구하고 primary y의
  field type, scale과 coordinate를 공유한다.
- 같은 action 재호출은 area/bar/rule secondary endpoint만 교체하고 dependent graphics를 rematerialize한다.
- Effect: area는 closed path, bar는 concrete rect range, rule은 vertical/diagonal concrete line endpoint를 다시 만든다.
- Coverage: ranged area/bar/regression tests와 rule position tests가 shared scale, reassignment와 invalid
  prerequisites를 검증한다.

### Formal values — `encodeY2`

- Implemented: area/bar `encodeY2({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId } })`; rect accepts field or datum and inherits matching `"quantitative" | "temporal"`; rule `encodeY2(RulePositionAssignment)`.
- Proposed (NOT IMPLEMENTED): —; y2는 y scale 공유를 유지한다.

### Value coverage — `encodeY2`

- `field`, `target`
  - ✅ Covered: quantitative upper field, eligible area, missing y/missing field errors.
- `fieldType`
  - ✅ Covered: `"quantitative"`와 invalid alternatives.
- `scale.id`
  - ✅ Covered: omission/shared y ID, same explicit ID, conflicting ID rejection.
  - No proposal: y2는 y scale 공유가 semantic invariant다.
- Evidence: `test/unit/actions/marks/rect-span.test.js`, ranged-area, ranged-bar and regression semantic/materialization tests.

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

- Rule/Rect `encodeX`/`encodeY`와 `encodeX2`/`encodeY2`는 field 또는 datum 중 정확히 하나를 저장한다. Rect secondary는 primary fieldType을 기본으로 사용한다.
  Secondary endpoint는 primary channel 없이는 생성할 수 없고 같은 scale, coordinate와 field type을 공유한다.
- x-only/y-only는 plot-bound full span, `x+y+y2`/`y+x+x2`는 vertical/horizontal interval,
  `x+y+x2+y2`는 diagonal interval이다. Field mode는 row당 line 하나, datum-only mode는 line 하나다.
- Area mode는 existing quantitative x와 같은 scale/coordinate를 공유하며 x/x2 horizontal closed path를
  rematerialize한다. Ranged bar mode materializes a horizontal rect range. Rect mode는 x/x2와 y/y2가 모두
  matching quantitative 또는 temporal pair일 때 independent 2D cell을 materialize한다. Rule endpoint/style reassignment는
  wrapped `rematerializeRuleMark`를 실행한다.

### Formal values — `encodeX2`

- Implemented: `encodeX2(RulePositionAssignment | AreaSecondaryXAssignment)` where the field assignment also accepts a ranged bar and matching quantitative/temporal rect.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): field-driven rule stroke width.

### Value coverage — `encodeX2`

- ✅ Covered: rule field/datum exclusivity, quantitative/nominal position, full span, bounded and diagonal geometry,
  plus area quantitative x2, shared endpoint scale, endpoint reassignment and invalid/incomplete prerequisites.
- Evidence: `test/unit/actions/marks/rect-span.test.js`, `test/unit/actions/encodings/rule-position-encodings.test.js`,
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

- Signature: `encodeStrokeWidth({ target?, value })` or
  `encodeStrokeWidth({ target?, field, fieldType?, scale? })`.
- Constant mode targets Line or Rule: `value` is a non-negative finite logical Canvas
  width, creates no scale or legend, and rematerializes every rule child.
- Field mode targets a line or rule, defaults `fieldType` to `"quantitative"`, creates an independent
  `strokeWidth` scale, and maps to concrete logical Canvas widths. Default range is `[1, 8]`; explicit range
  must be an ascending pair of non-negative finite widths.
- Rule grain is one source row per concrete line. Line grain is one complete series path. Every source row
  contributing to a line series must have the same field value; the action never chooses or aggregates a
  representative value implicitly.
- Field values are finite and non-negative. Missing, non-finite, negative, ambiguous-target, and unequal
  within-series values fail atomically. Zero is valid.
- `value` and `field` are mutually exclusive. Reassignment structurally replaces the semantic field binding;
  returning a Line or Rule to constant mode removes the `strokeWidth` encoding and only its own legend.
  Constant mode rejects fieldType/scale and a selection bound to the replaced channel; detached shared scales
  retain other consumers. Field mode removes the constant override. Line scalar editors reject active field width.
- Field mode participates in `editScale`, `createLegend({ channels: ["strokeWidth"] })`, Canvas
  rematerialization, immutable state, and wrapped action trace. The scale is not shared with point `size`.

### Formal values — `encodeStrokeWidth`

- Implemented: `encodeStrokeWidth({ target?: UserId; value: NonNegativeFinite } | { target?: UserId; field: FieldName; fieldType?: "quantitative"; scale?: StrokeWidthScale })`.
- `StrokeWidthScale = { id?, type?: "linear" | "log" | "pow" | "sqrt" | "symlog", domain?: "auto" | [NonNegativeFinite, NonNegativeFinite], range?: "auto" | [NonNegativeFinite, NonNegativeFinite], nice?, zero?, clamp?, reverse?, base?, exponent?, constant? }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): tapered, segment-local width and ribbon geometry remain outside this encoding.

### Value coverage — `encodeStrokeWidth`

- ✅ Covered: constant compatibility; item-level rule mapping; series-level line mapping; zero and explicit
  ranges; missing/non-finite/negative and unequal-series rejection; field reassignment and constant restore;
  scale edit, standalone sampled legend, Canvas/PNG rendering, immutable earlier state, and primitive/public
  parity.
- Evidence: `test/unit/actions/encodings/rule-appearance-encodings.test.js`,
  `test/unit/actions/encodings/line-series-encodings.test.js`,
  `test/unit/actions/guides/stroke-width-legend.test.js`, and
  `test/charts/cars-error-bar/variants/field-stroke-width/`.

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
  - ✅ Covered: ranged area/bar and regression flows exercise explicit shared coordinate/scale forwarding,
    reassignment and rematerialization through both wrapped child actions.
- Reassignment
  - ✅ Covered: lower/upper 동시 교체, wrapped child order, concrete path change와 earlier-program immutability.
- Evidence: ranged-area, ranged-bar and regression tests.

## `encodeXRange`

- Signature: `encodeXRange({ lower, upper, target?, fieldType?, coordinate?, scale? })`
- `lower`, `upper`: Area는 field string 또는 finite datum 객체이며 최소 하나는 field다. Bar/Rect는 field names이고 각각 x와 x2가 된다.
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

- Signature: `encodeGroup({ field, target?, fieldType? } | { fields, target?, fieldType? })`.
- `field` 또는 `fields` 중 정확히 하나가 필요하다. `fields`는 non-empty unique field-name tuple이고
  각 값은 nominal scalar다. `[field]`는 기존 `{ field, fieldType: "nominal" }` state로 정규화한다.
  복수 key는 `{ fields: [...], fieldType: "nominal" }`로 저장하며 field와 fields를 함께 남기지 않는다.
- `target`: current/unique Line, Area 또는 Bar. `fieldType`은 nominal만 허용하며 생략 시 nominal이다.
- 명시적 group만 path identity를 결정한다. Ordinary ranged Area와 Cartesian direct/aggregate/bin 및
  Polar Line을 지원한다. Color/dash/width/opacity는 최종 series 안에서 raw field 값이 하나여야 한다.
  같은 mapped appearance로 합쳐지더라도 서로 다른 raw 값은 오류다. Appearance가 경로를 추가 분할하지 않는다.
- Group이 없는 Line은 기존 color 또는 strokeDash field로 나눈다. 둘 다 있으면 같은 field여야 한다.
  Width/opacity는 implicit group을 만들지 않는다. Ordinary Area는 명시적 group 없이 하나의 path다.
- Effect: scale-free semantic partition을 저장하고 position 완료 시 path·scale·guide·highlight를 재계산한다.
  Source first-appearance group order와 기존 vertex order/aggregate/bin math를 유지한다. 같은 group을
  지원하는 유효한 중간 상태에서는 appearance와 group assignment 순서가 결과에 영향을 주지 않는다.
- Reassignment는 alternate field/fields를 제거한다. `removeEncoding({ channel: "group" })`은 implicit
  identity로 돌아가며 남은 appearance가 모호하면 오류다. Field selector는 tuple의 각 field를 조회한다.
- Parallel은 row identity를 소유하므로 encodeGroup을 거부한다. Density/Violin, Horizon, Regression,
  ErrorBand의 owned group은 각 editor가 관리하며 tuple·잘못된 group·직접 removal을 거부한다.
  Raw Area와 Bar의 배치는 layoutSeries가 소유하며 explicit group과 color를 독립적으로 편집한다.

### Formal values — `encodeGroup`

- Implemented: `encodeGroup(options: GroupEncodingOptions)`.
- `GroupEncodingOptions = { target?: UserId; fieldType?: "nominal" } & ({ field: FieldName; fields?: never } | { fields: readonly [FieldName, ...FieldName[]]; field?: never })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeGroup`

- ✅ Covered: singleton/tuple normalization, typed-key collisions, nominal zero equality, group/color
  commutation, reassignment/removal, pending positions, scalar validation and immutable rejection.
- ✅ Covered: direct/temporal aggregate/binned/Polar Line, ordinary Area, independent color/dash/width,
  selection/filter/highlight, Canvas/scale refresh and specialized owner boundaries.
- Evidence: `test/unit/actions/encodings/path-series-identity.test.js`,
  `test/unit/actions/encodings/line-appearance-modes.test.js`, `test/charts/series-identity/`.

## `encodePathOrder`

- Signature: `encodePathOrder({ field, target?, fieldType?, order? })`
- `field`: 각 series 안에서 vertex 연결 순서를 정하는 필수 quantitative field다.
- `target`: raw 또는 row-preserving data를 사용하는 Cartesian line/ordinary ranged area ID다. 생략하면
  current compatible path, 그다음 unique compatible path만 추론한다.
- `fieldType`: `"quantitative"`만 허용하며 기본값도 quantitative다.
- `order`: `"ascending" | "descending"`, 기본값은 ascending이다. 같은 값은 source row order를 유지한다.
- Effect: `semanticSpec.layers[target].encoding.pathOrder`에 field/type/direction을 저장한다. Scale이나 guide는
  만들지 않고, group/color/strokeDash가 나눈 각 series를 독립적으로 정렬해 concrete commands를 다시 만든다.
  Explicit order에서는 repeated position row를 합치지 않는다.
- Reassignment: 같은 target에 다시 호출하면 field와 direction을 교체하고 complete path를 rematerialize한다.
  Position보다 먼저 호출한 incomplete path intent도 보존되며 최종 semantic state가 같으면 같은 graphics로 수렴한다.
- Compatibility: direct Cartesian quantitative/temporal line과 ordinary ranged area를 지원한다. Aggregate line,
  Polar line, density/error/regression 또는 다른 statistical/generated path는 명확히 거부한다. Missing/non-finite
  order 값은 부분 state 없이 전체 action을 거부한다.

### Formal values — `encodePathOrder`

- Implemented: `encodePathOrder({ field: FieldName; target?: UserId; fieldType?: "quantitative"; order?: "ascending" | "descending" })`.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `encodePathOrder`

- ✅ Covered: ascending/descending, stable ties, repeated-position conservation, group-local ordering, line/ranged-area,
  action-before/after-position convergence, reassignment, target inference/ambiguity, invalid field/type/direction,
  aggregate/generated/Polar rejection, Canvas/scale/data/filter and facet rematerialization, primitive/public exact parity.
- Evidence: `test/unit/actions/encodings/path-order.test.js`, `test/unit/grammar/path-order.test.js` and
  `test/charts/gapminder-development-trajectories/`.

## `encodeParallelCoordinates`

- Signature: `encodeParallelCoordinates({ dimensions, target?, coordinate?, key?, missing? })`
- `dimensions`: 최소 두 개의 ordered unique field. String은 field shorthand이고 object는
  `{ field, fieldType?, title?, scale? }`다. Finite numeric values는 quantitative, consistent string values는
  ordinal로 추론하며 numeric categories는 `fieldType: "ordinal"`을 명시한다. Normalized `title`은 display label이며
  이후 field binding이 바뀌어도 보존한다.
- `scale`: dimension-local position-scale options. Scale ID는 `<target>-parallel-<index>`가 소유하므로 nested
  `id`는 허용하지 않는다. Existing type/domain/range/nice/zero/reverse와 transformed-scale vocabulary를 재사용한다.
- `key`: optional dataset field. 생략하면 source lineage row identity를 사용하고 임의의 field를 추론하지 않는다.
  명시하면 모든 row에서 non-missing unique value여야 한다.
- `missing`: `"break" | "drop-row" | "error"`, 기본 `"break"`. Break는 같은 row identity 아래 drawable path
  fragments를 보존하고, drop-row는 incomplete row 전체를 제외하며, error는 state 변경 전에 거부한다.
- Effect: target line의 `encoding.parallel`에 ordered dimensions/key/missing을 한 번만 저장하고 compatible Parallel
  coordinate를 생성 또는 재사용한다. Dimension별 scales와 ordinary path graphics를 materialize한다.
- Reassignment: complete request를 preflight한 뒤 dimensions/key/missing과 scale consumers를 atomic replacement한다.
  Cartesian/Polar position encoding과 섞거나 ambiguous target/coordinate를 임의 선택하지 않는다.
- Consumer lifecycle: Canvas/data/filter/scale edits가 paths와 dimension axes를 함께 replay한다. 한 source row가
  selection/highlight/filter의 한 semantic item이다.
- Dimension reassignment도 기존 materialization planner로 scales→marks→guides를 갱신한다. 축의 title/tick/label/개수와 semantic/runtime scale dependency 목록이 최종 dimension 순서를 따른다. 생략된 축은 만들지 않고 다른 owner의 독립 축은 보존한다.

### Formal values — `encodeParallelCoordinates`

- Implemented: `encodeParallelCoordinates({ dimensions: readonly [ParallelDimension, ParallelDimension, ...ParallelDimension[]]; target?: UserId; coordinate?: UserId; key?: FieldName; missing?: "break" | "drop-row" | "error" })`.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `encodeParallelCoordinates`

- ✅ Covered: 2+ quantitative/ordinal dimensions, inferred/explicit type, explicit/auto domain, reverse and transformed scale.
- ✅ Covered: stable lineage/explicit key, field names distinct from resource IDs, break/drop-row/error and duplicate rejection.
- ✅ Covered: coordinate/target inference, assignment replacement, immutable failure, Canvas/data/filter/scale replay.
- ✅ Covered: selection/highlight/filter, color/strokeDash appearance, ordinary axes and Browser/Node rendering.
- Evidence: `test/unit/actions/encodings/parallel-coordinates.test.js` and
  `test/charts/cars-parallel-coordinates/`.
- Reassignment guide evidence: `test/unit/actions/guides/parallel-axis-reencoding.test.js`.

## `removePathOrder`

- Signature: `removePathOrder({ target? } = {})`
- `target`: active path-order owner. 생략하면 current/unique active owner만 추론한다.
- Effect: complete `encoding.pathOrder` branch를 structural removal하고 해당 path를 다시 materialize한다.
- Result: 기존 automatic independent-position ordering으로 복귀한다. Earlier programs와 caller data는 바뀌지 않는다.
- Error: active owner가 없거나 target이 ambiguous/unknown이면 추측하지 않고 명확히 거부한다.

### Formal values — `removePathOrder`

- Implemented: `removePathOrder({ target?: UserId } = {})`.
- Planned (NOT IMPLEMENTED): —.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `removePathOrder`

- ✅ Covered: inferred/explicit removal, automatic-order restoration, repeated-position contraction, immutable branch
  preservation, missing/ambiguous owner와 wrapped trace.
- Evidence: `test/unit/actions/encodings/path-order.test.js`.

## `orderCategories`

- Signature: `orderCategories({ target?, channel, values } | { target?, channel, by, direction? })`.
- `channel`: nominal/ordinal Cartesian `"x" | "y"` 또는 Polar `"theta"` (Arc/Point/Line). Temporal/quantitative position과 appearance channel은
  지원하지 않는다.
- `target`: explicit compatible mark ID. 생략하면 current compatible mark, 아니면 unique compatible mark만
  추론하며 ambiguity는 explicit ID를 요구한다.
- `values`: non-empty unique observed category list. 빠진 observed category는 source first appearance 순서로
  뒤에 붙고, dataset에 없는 값은 state 변경 전에 거부한다. Explicit mode는 `direction`과 함께 쓸 수 없다.
- `by`: `"category" | "count" | { field, aggregate }`. Summary `aggregate`는
  `"sum" | "mean" | "min" | "max"`이며 모든 source row의 summary field가 finite number여야 한다.
  Category mode는 하나의 primitive type만 비교하고 number는 numeric, boolean은 `false < true`, string은
  code-point lexical order를 사용한다.
- `direction`: computed mode의 `"ascending" | "descending"`, 기본값은 ascending이다. Count/summary/category
  tie는 source first appearance 순서를 유지한다.
- Effect: normalized intent를 `semanticSpec.layers[target].encoding[channel].categoryOrder`에 저장한다. Source
  theta에서도 weighted Arc의 각 category weight와 기존 color/shape/dash 배정을 보존하며 path vertex·drawing order는 바꾸지 않는다.
  Source row와 semantic scale domain은 바꾸지 않고 resolved scale domain, 모든 compatible scale consumer의 mark
  geometry, connected axis와 selection item order를 한 action에서 rematerialize한다.
- Scale authority: semantic scale domain은 `"auto"`여야 한다. Existing explicit domain과 category-order
  assignment를 동시에 두어 precedence를 추측하지 않는다.
- Shared scales: 같은 dataset/field를 읽는 consumer만 assignment를 공유할 수 있다. Facet shared policy는 base
  resolved order를 모든 셀에 적용하고 independent policy는 각 cell dataset에서 computed intent를 다시 푼다.
- Reassignment: 같은 target/channel 호출은 stored intent를 교체한다. Earlier program과 caller-owned arrays 및
  objects는 변경하지 않는다.

### Formal values — `orderCategories`

- Implemented: `orderCategories({ target?: UserId; channel: "x" | "y" | "theta" } & ({ values: readonly CategoryValue[] } | { by: "category" | "count" | { field: FieldName; aggregate: "sum" | "mean" | "min" | "max" }; direction?: "ascending" | "descending" }))`.
- Proposed (NOT IMPLEMENTED): locale/natural collation, comparator callbacks, null placement, temporal ordering,
  appearance-channel ordering and source-row reordering.

### Value coverage — `orderCategories`

- ✅ Covered: complete/partial explicit list, unknown/duplicate values and first-appearance completion.
- ✅ Covered: category/count and sum/mean/min/max in both direction families, stable ties and caller ownership.
- ✅ Covered: x/y/theta, Bar/Point/Arc/Polar Line, current/unique/explicit/ambiguous target, incompatible channel/type and shared consumers.
- ✅ Covered: linked categorical legend order, weighted sector conservation, explicit domain conflicts and reset.
- Evidence for theta: `test/unit/actions/guides/legend-order.test.js`, `test/charts/theta-legend-order/`, `test/contracts/category-legend-order-types.test.js`.
- ✅ Covered: scale domain, mark geometry, axes, selection item order, reassignment, shared/independent facet replay.
- Evidence: `test/unit/grammar/category-order.test.js`,
  `test/unit/actions/encodings/category-order.test.js` and
  `test/gates/ordered-category-bar/`.

## `removeCategoryOrder`

- Signature: `removeCategoryOrder({ target?, channel })`.
- Target/channel resolution은 `orderCategories`와 같고 active category-order assignment가 반드시 있어야 한다.
- Effect: complete `encoding[channel].categoryOrder` assignment를 structural removal하고 automatic observed
  first-appearance domain, mark geometry, connected axis와 selection item order를 다시 materialize한다.
- Earlier program, source row order, semantic scale definition과 guide identity는 유지한다.

### Formal values — `removeCategoryOrder`

- Implemented: `removeCategoryOrder({ target?: UserId; channel: "x" | "y" | "theta" })`.
- Proposed (NOT IMPLEMENTED): generic scale-domain removal alias.

### Value coverage — `removeCategoryOrder`

- ✅ Covered: inferred/explicit removal, automatic-order restoration, immutable branch preservation,
  missing/ambiguous assignment와 wrapped trace.
- Evidence: `test/unit/actions/encodings/category-order.test.js` and
  `test/gates/ordered-category-bar/`.

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

- Implemented: `encodeHistogram({ field: FieldName; target?: UserId; coordinate?: UserId; maxBins?: PositiveInteger; binStep?: PositiveFinite; binBoundaries?: readonly [Finite, Finite, ...Finite[]]; stack?: "zero" | "normalize" | null; xScale?: NonPointQuantitativePositionScale; yScale?: NonPointZeroSupportingPositionScale })`; 세 bin option은 mutually exclusive다.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeHistogram`

- `field`, `target`, `coordinate`
  - ✅ Covered: shortest/inferred call, explicit forwarding, missing/invalid child prerequisites.
- `maxBins`
  - ✅ Covered: omission→`10`, representative explicit values, invalid through child `encodeX`.
  - ✅ Covered: exact minimum, representative large count, sparse and constant-source bin behavior through shared
    `encodeX` bin validation and histogram geometry tests.
- `stack`
  - ✅ Covered: omission→`"zero"`, explicit `"zero"`, `"normalize"`, `null`, unit domain과 invalid vocabulary.
- `xScale`, `yScale`
  - ✅ Covered: explicit objects, default policies, domain/range precedence.
  - ✅ Covered: explicit independent x/y IDs, default/explicit domain/range precedence and bounded stack policy pairs;
    exhaustive independent-policy products are outside the bounded matrix.
- `binStep`, `binBoundaries`
  - ✅ Covered: zero-anchored exact steps, irregular widths, explicit domain ownership, invalid values,
    exclusivity, concrete rects와 inferred tick/grid rematerialization.
- Reassignment
  - ✅ Covered: full x/y field replacement, stale bin-mode removal, existing stack/color/legend preservation,
    inferred guide refresh, explicit guide-value preservation, atomic failure와 primitive/public parity.
- Evidence: `test/unit/actions/encodings/encode-histogram.test.js`와 histogram chart tests.

## `encodeDensity`

- Signature: `encodeDensity({ field, target?, source?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, coordinate?, valueScale?, densityScale?, placement? })`
- `groupBy:false` requests ungrouped density and survives JSON serialization.
- `field`, `source`, `bandwidth`, `extent`, `steps`, `as`: `createDensityData`와 같은 계약이며
  derived ID는 `${target}DensityData`로 namespace된다.
- `kernel`: `"gaussian" | "epanechnikov" | "uniform" | "triangular"`; 생략 시 Gaussian이다.
- `normalization`: `"unit" | "count"`; 생략 시 unit이며 count는 group-local sample count로 magnitude를
  조정한다.
- `target`: area mark ID. 생략하면 current 또는 유일한 eligible area를 추론한다.
- `densityChannel`: `"x" | "y"`. Baseline default는 `"y"`이고 y이면 value→x/density→y,
  x이면 반대로 연결한다. Category placement default는 `"x"`이고 category→x/value→y violin을 만든다.
- `coordinate`: optional compatible coordinate ID.
- `valueScale`: position scale object, 기본 `{ nice: false, zero: false }`.
- `densityScale`: position scale object, 기본 `{ nice: true, zero: true }`; baseline을 그리기 위해 domain이
  zero를 포함해야 한다.
- `placement`: 생략 또는 `{ type: "baseline" }`은 기존 baseline이다. Category branch는
  `{ type: "category", side?, width?, split?, scale? }`를 받는다. `side` default는 `"both"`,
  `width` default는 `{ band: 0.8, resolve: "shared" }`다. Split은 exactly two value를 left/right 또는
  top/bottom half로 배치하며 `side`와 mutually exclusive다. Category branch에서 `densityScale`은
  category scale과 의미가 겹치므로 거부한다.
- Effect: density data 생성, layer data rebinding, x/y encoding, optional group encoding, baseline-closed 또는
  category-centered full/half closed area path materialization을 하나의 hierarchy로 수행한다.
- Limits: `steps <= 10,000`, 전체 non-empty profile output `<= 10,000` rows,
  `validRows * steps <= 10,000,000` work units다.
- Coverage: density data/mark/chart/guide tests가 두 orientation, grouped/ungrouped, explicit/auto
  density options와 rematerialization을 검증한다. 여러 steps×bandwidth pair는 부분적이다.

### Formal values — `encodeDensity`

- Implemented: `encodeDensity({ field: FieldName; target?: UserId; source?: UserId; groupBy?: FieldName | false; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; as?: readonly [FieldName, FieldName]; densityChannel?: "x" | "y"; coordinate?: UserId; valueScale?: PositionScale; densityScale?: PositionScale; placement?: { type: "baseline" } | { type: "category"; side?: "both" | "left" | "right" | "top" | "bottom"; width?: { band?: UnitIntervalExclusiveOrOne; resolve?: "shared" | "independent" }; split?: { field: FieldName; domain?: readonly [unknown, unknown] }; scale?: BandScale } })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeDensity`

- `field`, `target`, `source`, `groupBy`
  - ✅ Covered: inferred/explicit target/source, grouped/ungrouped, ambiguity와 conflicting pre-encodings.
- `bandwidth`, `extent`, `steps`, `as`
  - ✅ Covered: forwarding of auto/default and representative explicit values, invalid input atomicity.
  - ✅ Covered: executable delegation trace invokes `createDensityData`, whose numeric boundaries own validation;
    aggregate tests cover forwarding, output identity and atomic failure.
- `densityChannel`
  - ✅ Covered: baseline omission→`"y"`, category omission→`"x"`, explicit x/y, unknown value rejection.
- `coordinate`
  - ✅ Covered: omitted/inferred and explicit compatible Cartesian coordinate.
- `valueScale`, `densityScale`
  - ✅ Covered: defaults, explicit IDs/domain/range, baseline zero requirement.
  - ✅ Covered: both orientations cover explicit/reversed mapping and baseline zero-domain preflight; a density domain
    excluding zero is rejected before materialization.
- `kernel`, `normalization`
  - ✅ Covered: closed vocabularies, defaults, forwarding, provenance, formula fixtures와 scale/path parity.
- `placement`
  - ✅ Covered: baseline omission compatibility, full/left/right/top/bottom, split inferred/explicit domain,
    shared/independent width, band containment, category scale, invalid side/split/band/densityScale combinations.
- Evidence: density encoding/data/mark/chart tests.

## `editDensity`

- Signature: `editDensity({ target?, source?, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, placement? })`.
- `target`: existing density-encoded area layer ID. current 또는 유일한 eligible layer를 추론하며 ambiguity는
  explicit target을 요구한다.
- 최소 한 density option이 필요하다. `source`와 `field`는 input provenance를 replace하고 `groupBy`는 field 또는
  grouping removal을 뜻하는 `false`를 받는다. 생략한 option과 output fields, densityChannel, coordinate,
  position scale IDs는 기존 provenance와 encoding에서 유지한다. `placement`는
  category width/split/scale를 revise하거나 `{ type: "baseline" }`으로 baseline mode를 복원한다.
- `${target}DensityDataRevision${n}` ID로 wrapped `createDensityData`를 호출하고 layer data를 explicit
  `editSemantic` child로 rebind한다. 이전 derived dataset이 더 이상 참조되지 않으면 internal wrapped
  `releaseDerivedData`가 전체 resource를 제거한다.
- Affected positional scales를 공유하는 mark, axes와 grids는 deterministic materialization plan으로
  갱신한다. Earlier programs, source values와 old derived values는 바뀌지 않는다.
- validation, derivation 또는 materialization failure는 original program의 어느 branch도 변경하지 않는다.

### Formal values — `editDensity`

- Implemented: `editDensity({ target?: UserId; source?: UserId; field?: FieldName; groupBy?: FieldName | false; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; placement?: DensityPlacement })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editDensity`

- `target`
  - ✅ Covered: explicit/current/unique inference, missing target와 ambiguous target.
- `bandwidth`, `extent`, `steps`, `kernel`, `normalization`
  - ✅ Covered: representative edits, omitted-value preservation, invalid/empty options와 repeated revisions.
  - ✅ Covered: repeated revisions preserve omitted options and a bounded kernel × normalization formula matrix owns
    equivalence; exhaustive numeric cross-products are intentionally excluded.
- `placement`
  - ✅ Covered: category width/split revision, placement scale edit, baseline↔category replacement, stale encoding/scale
    cleanup, color compatibility rejection와 previous-program immutability.
- `source`, `field`, `groupBy`
  - ✅ Covered: source/field replacement, output field and position identity retention, group add/change/removal,
    category-field reconciliation, grouping-color reassignment/removal, legend cleanup and invalid provenance.
- Revision lifecycle
  - ✅ Covered: deterministic IDs, explicit rebind, orphan release, retained shared old dataset, earlier-program
    immutability and shared-scale mark rematerialization.
- No future edit parameters are currently Planned or Proposed.
- Evidence: `test/unit/actions/encodings/edit-density.test.js`, density-area variant equivalence and PNG tests.

## `encodeHorizon`

- Signature: `encodeHorizon({ target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette? } = {})`.
- `target`: area mark ID. 생략하면 current 또는 유일한 eligible area를 추론한다.
- `source`: 원본 dataset ID. 생략하면 target layer data 또는 current data를 사용한다.
- `x`, `y`: field string 또는 `{ field, fieldType?, scale? }`. 생략하면 target이나 같은 source의 유일한 compatible
  encoding을 추론한다. x는 quantitative/temporal, y는 quantitative만 허용한다.
- `groupBy`: optional nominal field or false. Omission/undefined infers the target group; false explicitly opts out.
- `bands`: positive integer `<= 10,000`, 기본 `3`.
- `baseline`: finite number, 기본 `0`.
- `extent`: `"auto"` 또는 positive finite number, 기본 `"auto"`. Shared auto는 전체 group extent 하나를,
  independent auto는 group별 extent를 사용한다.
- `resolve`: `"shared" | "independent"`, 기본 `"shared"`.
- `missing`: `"break" | "error"`, 기본 `"break"`. break는 missing y에서 path segment를 나눈다.
- `overflow`: `"clip" | "error"`, 기본 `"clip"`. Explicit extent를 넘는 amplitude 처리 정책이다.
- `palette`: `{ positive?, negative? }`; 각 값은 Palette이며 기본은 positive `"blues"`, negative `"reds"`다.
- Effect: namespaced immutable derived dataset을 만들고 area layer를 rebind한 뒤 x, folded `[0, 1]` y/y2,
  group과 sign/band color encoding을 명시적으로 작성한다. Concrete result는 ordinary closed path collection이며
  renderer는 Horizon 의미를 알지 않는다. y axis와 legend는 만들지 않고 x axis/grid만 guide-compatible하다.
  전체 run-by-band generated row 수는 최대 `10,000`이며 signed deviation/fold extent가 finite로
  표현되지 않으면 materialization 전에 `RangeError`다.
- Facet replay: shared y scale이면 parent auto extent를 모든 cell에 고정하고, independent y scale이면 cell마다
  다시 계산한다.
- Shared x guides: 원래 x field의 title을 x position materialization 전에 저장한다. 같은 source x를 공유하는
  Horizon을 추가할 때 namespaced derived field 이름 때문에 title inference가 충돌하지 않는다.

### Formal values — `encodeHorizon`

- Implemented: `encodeHorizon({ target?: UserId; source?: UserId; x?: FieldName | { field: FieldName; fieldType?: "quantitative" | "temporal"; temporalUnit?: TemporalInputUnit (temporal only); scale?: PositionScale }; y?: FieldName | { field: FieldName; fieldType?: "quantitative"; scale?: PositionScale }; groupBy?: FieldName | false; bands?: PositiveInteger; baseline?: Finite; extent?: "auto" | PositiveFinite; resolve?: "shared" | "independent"; missing?: "break" | "error"; overflow?: "clip" | "error"; palette?: { positive?: Palette; negative?: Palette } })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeHorizon`

- Inference and fields
  - ✅ Covered: explicit and inferred target/source/x/y/groupBy, temporal x, ambiguity and incompatible target rejection.
- Fold policy
  - ✅ Covered: default/explicit bands, baseline, shared/independent auto extent, explicit extent, missing break/error,
    overflow clip/error, positive/negative palettes and empty all-baseline output.
- Materialization and guides
  - ✅ Covered: closed-path geometry, monotone curve, ordinary Canvas/PNG rendering, x-only axes/grid policy,
    shared-scale rematerialization and primitive/public pixel parity.
- Composition
  - ✅ Covered: facet shared extent freeze and independent per-cell recomputation.
- Evidence: Horizon grammar/data/encoding/materialization unit tests and `test/charts/gapminder-horizon/`.

## `editHorizon`

- Signature: `editHorizon({ target?, source?, x?, y?, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette? })`.
- `target`: existing Horizon-encoded area layer. 생략하면 current 또는 유일한 eligible layer를 추론한다.
- 최소 한 editable option이 필요하다. 생략한 option은 기존 requested transform에서 보존한다.
- `groupBy: false`는 grouping을 제거한다. 다른 option은 `encodeHorizon`과 같은 값 계약을 사용한다.
- `${target}HorizonDataRevision${n}` immutable revision을 만들고 target을 explicit rebind한 뒤 orphaned prior revision을
  제거한다. Scale ID는 유지하며 x field type이 바뀌면 linear/time type을 안전하게 갱신한다.
- Affected shared-scale marks와 compatible guides를 deterministic materialization plan으로 갱신한다. Selection과
  highlight config는 retained target layer에 남고 새 geometry에 재적용된다.
- Derivation 또는 validation failure는 original program과 모든 caller-owned input을 바꾸지 않는다.

### Formal values — `editHorizon`

- Implemented: `editHorizon({ target?: UserId; source?: UserId; x?: HorizonX; y?: HorizonY; groupBy?: FieldName | false; bands?: PositiveInteger; baseline?: Finite; extent?: "auto" | PositiveFinite; resolve?: "shared" | "independent"; missing?: "break" | "error"; overflow?: "clip" | "error"; palette?: HorizonPalette })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editHorizon`

- ✅ Covered: every editable option, empty edit rejection, target inference/ambiguity, repeated revisions and deterministic IDs.
- ✅ Covered: source/field/group replacement, group removal, palette merge, x scale type transition and scale-ID rejection.
- ✅ Covered: orphan cleanup, shared prior dataset retention, prior-program immutability, empty output cleanup, selection/highlight
  persistence and shared-scale consumer rematerialization.
- Evidence: `test/unit/actions/encodings/edit-horizon.test.js`, facet replay tests and stable Horizon chart tests.

## `encodeColor`

- An ErrorBand with explicit constant fill rejects color encoding. Use `editErrorBand({ fill: false })`
  to restore field eligibility. The reverse transition requires removing the color encoding first.

- Signature: `encodeColor({ field, target?, fieldType?, layout?, aggregate?, scale? })`
- `field`: 필수 field. nominal/ordinal은 categorical color contract에, quantitative/temporal은 point에 사용하며
  aggregate bar는 quantitative field를 지원한다.
- `target`: point, line, bar, rect 또는 area ID; current/unique inference를 지원한다.
- `fieldType`: `"nominal" | "ordinal" | "quantitative" | "temporal"`; 기본값은 nominal이다.
  Ordinal은 숫자를 포함한 ordered category를 categorical palette와 first-appearance domain으로 매핑한다.
- `layout`: bar는 `"stack" | "fill" | "group" | "overlay" | "diverging"`, area는 group을 제외하고
  `"center"`를 포함한 다섯 layout을 지원한다. Histogram default는 stack, ordinal aggregate bar default는
  group, area default는 overlay다. Point/line과 continuous color는 layout을 거부한다.
- `aggregate`: aggregate bar continuous color에서만 사용한다. Color field가 measure field와 같으면 measure
  aggregate를 상속하고, 다른 field는 compatible aggregate를 명시해야 한다. 집계는 최종 category rect
  grain에서 독립적으로 계산한다.
- Quantitative sequential nested scale은 `midpoint:number|"auto"`를 지원한다. Omission은 기존 scale policy를 보존하고 auto는 제거한다. 값은 최종 domain 내부에 있어야 하며 공통 mapper를 통해 mark/gradient legend에 적용한다. Temporal encoding은 numeric midpoint를 거부한다. Exact policy: CORE createScale/editScale. Evidence: `test/unit/actions/scales/midpoint.test.js`, `test/charts/color-midpoint/`.
- `scale`: nominal은 ordinal, continuous point/bar/rect color는 internal sequential scale이다. Quantitative point/aggregate bar/rect는
  `quantize | quantile | threshold`도 지원한다. `palette` 또는
  explicit `range` 중 하나를 사용할 수 있다. Palette는
  [`PALETTES.md`](PALETTES.md)의 frozen 68-name vocabulary와 `{ name, count?, extent? }` object를 받는다.
- Continuous color는 default `viridis`, eight interpolation tokens, `clamp`, `reverse`, quantitative/temporal
  point auto domain과 aggregate-bar quantitative auto domain을 지원하며 layout을 거부한다.
  `sequential | quantize | quantile | threshold`는 direct scale vocabulary에도 포함된다.
- Quantize는 auto 또는 explicit pair를 동일 폭으로 나누고, quantile은 auto 또는 explicit sample에서
  동일 개수에 가까운 class를 만들며, threshold는 strictly increasing explicit domain과 정확히 하나 더
  많은 color를 요구한다. Boundary equality는 upper class에 포함되고 interval legend도 같은 경계를 읽는다.
  Finite extent가 요청한 quantize class의 distinct boundary를 표현할 수 없으면 `RangeError`를 내며,
  interval/continuous legend label은 distinct finite sample을 구분할 때까지 precision을 높인다.
- Rect color는 categorical 또는 continuous fill을 final observed cell grain에 적용하며 layout/aggregate를 받지 않는다.
  Missing color나 incomplete position row는 cell과 automatic domain에서 함께 생략한다.
- Effect: color는 field/scale/appearance를 저장하고 Bar/Area의 layout 요청은 wrapped layoutSeries가 소유한다.
  Mode는 layer.layout.mode 한 곳에 저장하며 group→offset→scale→mark/guide 하위 owner를 합성한다.
  Legacy inferred group은 inferredFrom으로 추적하고 explicit group/color는 독립적이다. Center도 같은 owner를 사용한다.
  Bar 시작 endpoint는 0이며 concrete rect, Area는 concrete closed path다.
- Quantitative color의 type-changing nested scale도 CORE editScale의 shared consumer·legend transaction을 사용한다. Aggregate bar와 Rect의 grain은 유지한다. Basic의 구조 변경은 Full로 안내하는 명시 오류이며 다른 type 생성은 새 ID 경로를 사용한다.
- Reassignment: 같은 target의 categorical color field를 교체한다. omitted scale ID는 current color scale을
  재사용하고 explicit new ID는 새 scale을 만든다. Existing compatible legend의 domain, symbols,
  labels와 inferred title을 갱신하며 custom title/layout/style은 보존한다.
- Grouped-bar reassignment는 color semantic을 먼저 교체한 뒤 wrapped directional offset action으로 matching
  inferred group field와 source-first-appearance offset domain을 원자적으로 교체한다. Color scale domain 순서는
  slot 위치를 재정렬하지 않는다. Measure policy, bars와 existing legend를 rematerialize한다. Direct offset field
  mismatch는 오류지만 유효한 layout transition은 layoutSeries로 수행한다. 실패 시 이전 program은 불변이다.
- Line color and stroke-dash assignments may precede complete positions. Field scales resolve immediately, while
  line graphics stay empty until position prerequisites are complete. Compatible encoding orders converge.
- Coverage: 모든 대표 chart와 legend tests가 mark별 materialization을 검증한다. Five-layout bar matrix,
  five-layout area matrix, normalized/signed domains, primitive/public equivalence와 transition validation을 포함한다.

### Formal values — `encodeColor`

- Implemented: `encodeColor({ field: FieldName; target?: UserId; fieldType?: "nominal" | "ordinal"; layout?: "stack" | "fill" | "group" | "overlay" | "diverging" | "center"; scale?: ColorScale } | { field: FieldName; target?: UserId; fieldType: "quantitative" | "temporal"; aggregate?: AggregateOperation; scale?: SequentialColorScale | DiscretizedColorScale })`; `"center"` is area-only, ordinal supports ordered categorical values including finite numbers, rect supports categorical or continuous fill without layout/aggregate, discretized scales support quantitative point/rect consumers and quantitative aggregate bars, `unknown` remains point-row-only, and mark compatibility narrows the categorical layout set.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeColor`

- `field`, `target`
  - ✅ Covered: point/line/bar/rect/area, inferred/explicit target, missing/invalid nominal values.
- `fieldType`
  - ✅ Covered: nominal, numeric ordinal point/histogram color, quantitative/temporal point color,
    quantitative aggregate-bar color와 invalid alternatives.
- `aggregate`
  - ✅ Covered: matching-field inheritance, explicit alternate-field aggregate, ambiguous omission and invalid operation.
- `layout`
  - ✅ Covered: omission, all six values, bar/area compatibility, normalized, signed and centered baseline policies,
    group/overlay zero endpoint, positive/mixed/all-negative/zero partitions, incompatible explicit domain,
    aligned/missing/duplicate center topology, no-auto-opacity overlay, invalid transition atomicity와
    center의 wrapped `layoutSeries` ownership.
- `scale.id/type/domain`
  - ✅ Covered: ordinal scale default, nominal/ordinal field types, explicit ID/order, incomplete explicit domain rejection.
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
- Compatibility: 명시적 Line group이 있으면 다른 appearance field를 허용하되 series 안에서 유일해야 한다.
  명시적 group이 없으면 color와 strokeDash의 implicit identity field가 일치해야 한다.
- Field and constant stroke dash may be assigned before either line position; completing positions materializes
  the stored appearance without requiring another appearance call.
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

- Implemented: `encodeSize({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear"; domain?: ContinuousDomain; range?: "auto" | readonly [NonNegativeFinite, NonNegativeFinite]; unknown?: NonNegativeFinite } })`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeSize`

- `field`, `target`, `fieldType`
  - ✅ Covered: quantitative point field, inferred/explicit target, invalid type/field.
- `scale.domain/range`
  - ✅ Covered: auto domain/range `[24, 196]`, representative mapping and explicit values through shared scale tests.
  - ✅ Covered: zero area is accepted, negative/non-finite area rejects, and constant quantitative domains use the
    shared scale-domain policy with shape-independent equal-area output.
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

- Implemented: `encodeShape({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: "auto" | readonly PointShape[]; unknown?: PointShape } })`
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

## `encodeAngle`

- Signature: `encodeAngle({ target?, value } | { target?, field, fieldType? })`.
- `target`: current compatible point/Tick, otherwise the unique compatible mark. Ambiguity requires an explicit ID.
- Exactly one of `value` or `field` is required. Constant values are finite degrees; fields are non-empty names whose
  every source row contains a finite number. `fieldType` defaults to and only accepts `"quantitative"`.
- Degrees are direct graphical values with no scale or legend. 0° points up and positive values rotate clockwise;
  negative and greater-than-360 values retain their literal semantic value and use periodic geometry.
- Reassignment replaces the complete prior datum/field branch. Point and Tick identity, data, positions, appearance,
  selection, and highlight state remain intact.
- Tick endpoints rotate around each x/y anchor while preserving center and length. Non-circular point glyphs store
  rotated concrete path commands with unchanged area; circle rotation is a valid visual no-op.
- `removeEncoding({ target?, channel: "angle" })` removes the assignment and rematerializes the unrotated baseline.
- Filter, facet, Canvas/scale edits, point jitter, and durable highlight replay recompute from stored semantics.
- Renderers read only the resulting line endpoints, circle/rect children, or path commands from `graphicSpec`.

### Formal values — `encodeAngle`

- Implemented: `encodeAngle({ target?: UserId; value: Finite; field?: never; fieldType?: never } | { target?: UserId; field: FieldName; fieldType?: "quantitative"; value?: never })`.
- Proposed (NOT IMPLEMENTED): angle scales/legends, radians, automatic normalization, and rotation for other marks.

### Value coverage — `encodeAngle`

- ✅ Covered: point/Tick inferred and explicit targets, constant/field assignment, reassignment, and removal.
- ✅ Covered: cardinal/intercardinal direction, negative/greater-than-360 periodic geometry, Tick center/length and
  point-area invariance.
- ✅ Covered: incomplete/complete positions, Canvas, filter, facet, jitter, selection/highlight replay, and immutable
  earlier programs.
- ✅ Covered: missing/non-finite fields, invalid field type, exclusive arguments, unsupported/ambiguous targets.
- Evidence: `test/unit/actions/encodings/angle.test.js`, `test/unit/grammar/direction.test.js`,
  `test/unit/grammar/schemas/mark-schema.test.js`, and the Roadmap 5 Phase 4 chart parity suite.

## `encodeOpacity`

- Signature: `encodeOpacity({ value, target? } | { field, target?, fieldType?, scale? })`
- 상수로 전환할 때 target이 소유한 opacity legend만 제거하며 다른 layer의 범례는 보존한다.
- `value`: field와 mutually exclusive인 finite `[0, 1]` number.
- `field`: value와 mutually exclusive인 quantitative point/rule/line field. auto linear range는 `[0.2, 1]`이다.
- `target`: optional point, rule 또는 line ID.
- Effect: constant는 graphical config, field는 semantic encoding과 linear scale을 저장한다. 같은 target에
  다시 호출하면 constant↔field 또는 field↔field를 structural copy로 교체하고 target mark/legend를 rematerialize한다.
- Line은 final-series grain이며 모든 source row의 field 값이 같아야 한다. Width처럼 implicit grouping을
  만들지 않는다. Constant mode는 fieldType/scale 및 opacity-channel selection과 충돌하고 field/own legend만
  정리한다. Field mode는 constant override를 제거한다. Line은 unknown fallback을 지원하지 않는다.
- Field Line opacity는 scale/Canvas/filter/highlight replay와 sampled opacity legend를 지원한다.
- Coverage: point/rule/regression 및 line-appearance-modes tests가 replacement와 invalid range를 검증한다.

### Formal values — `encodeOpacity`

- Implemented: `encodeOpacity({ value: UnitInterval; target?: UserId } | { field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear"; domain?: ContinuousDomain; range?: "auto" | readonly [UnitInterval, UnitInterval]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean; unknown?: UnitInterval } })`
- Planned (NOT IMPLEMENTED): transformed opacity scale types.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeOpacity`

- `value`
  - ✅ Covered: representative value, 0, 1, below/above range와 non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point, rule and line, unknown/incompatible target.
- Reassignment
  - ✅ Covered: constant↔constant, field↔field and constant↔field immutable replacement.
- ✅ Covered: auto/explicit descending range, clamp/reverse, continuous sample legend and constant-mode cleanup.
- Evidence: `test/unit/actions/encodings/point-appearance-encodings.test.js`,
  `test/unit/actions/encodings/rule-appearance-encodings.test.js`, continuous legend and regression tests.

## `encodeRadius`

- Signature: `encodeRadius({ value, target? })`
- `value`: 필수 non-negative finite number. 0은 보이지 않는 point다. 양수 `r`은 circle radius이며
  모든 point shape에 같은 면적 `πr²`을 적용한다. Square의 한 변 길이는 `sqrt(π) * r`이다.
- `target`: optional point ID.
- Effect: graphical mark config와 concrete size만 바꾸며 semanticSpec에는 기록하지 않는다.
  field-driven `encodeSize`와 동시에 사용할 수 없다. 같은 target에 다시 호출하면 기존 radius를
  교체하고 point를 rematerialize한다.
- Priority: explicit constant radius는 point materializer의 default radius `3`보다 우선한다.
  Default radius는 user-authored constant로 취급하지 않으므로 `encodeSize`와 충돌하지 않는다;
  field-driven size가 default를 대체한다.
- Coverage: scatterplot/point tests가 constant radius, reassignment, rematerialization과 invalid values를 검증한다.
- Polar semantic radial position은 별도 `encodeR`이 소유하며 이 action은 glyph size만 소유한다.

### Formal values — `encodeRadius`

- Implemented: `encodeRadius({ value: NonNegativeFinite; target?: UserId })`
- Proposed (NOT IMPLEMENTED): —; constant value는 radius unit만 유지한다.

### Value coverage — `encodeRadius`

- `value`
  - ✅ Covered: 0, positive representative, negative/non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point와 invalid target.
- Interaction
  - ✅ Covered: semanticSpec unchanged, child broadcast, same-action reassignment, explicit-radius/encodeSize
    conflict, default-radius/encodeSize override.
- No proposal: constant area shorthand는 추가하지 않고 field-driven area는 `encodeSize`가 소유한다.
- Evidence: `test/unit/actions/encodings/radius-encoding.test.js` and
  `test/contracts/point-default-radius.test.js`.

## `encodeTheta`

- Signature: `encodeTheta({ field, target?, fieldType?, scale?, coordinate?, aggregate?, weight? })`
- Public angle unit은 degree다. 0°는 12시 방향이고 양의 방향은 clockwise다.
- `fieldType`은 quantitative, temporal, ordinal, nominal을 지원한다. Quantitative는 linear, temporal은 time,
  discrete 값은 point/band scale을 사용한다.
- Auto range는 `[0, 360]`이고 explicit range의 absolute span은 360° 이하이어야 한다.
- 첫 Polar position action은 `polar` coordinate를 생성·저장한다. 같은 layer의 Cartesian x/y와 혼합할 수 없다.
- Theta만 있는 incomplete point는 semantic과 resolved scale을 유지하지만 visible x/y geometry를 만들지 않는다.
- Reassignment는 같은 action과 scale lifecycle을 사용한다.
- Arc marks accept direct quantitative theta: without `aggregate` or `weight`, each positive source row becomes
  one sector and its numeric field value determines its share of the full theta range. Source-row order is
  preserved, zero values are omitted, negative/non-finite values and an all-zero total are rejected, and this mode
  cannot be combined with radius encoding.
- Arc marks also retain categorical theta modes. A band scale plus `aggregate: "count"` partitions the full theta
  range by category count. `aggregate: "sum"` requires a `weight` field and partitions it by each category's sum
  of non-negative finite weights. Cross-category totals use normalized ratios so a finite sector partition remains
  valid even when the raw grand total overflows; an individual unrepresentable group sum or indistinguishable
  positive angular sector is rejected. Both aggregate modes infer nominal field type when omitted. Categorical
  theta without aggregation remains available with quantitative radius for radial sectors.

### Formal values — `encodeTheta`

- Implemented: `encodeTheta({ field: FieldName; target?: UserId; fieldType?: FieldType; scale?: ThetaScaleOptions; coordinate?: UserId; aggregate?: "count" | "sum"; weight?: FieldName })`
- Theta scale type: `"linear" | "time" | "point" | "band"`.
- Range: `"auto" | readonly [Finite, Finite]`, with absolute span `<= 360`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeTheta`

- ✅ Covered: shortest call, quantitative and discrete mappings, explicit/reversed ranges, invalid span and type.
- ✅ Covered: order independence, one-channel incomplete state, Cartesian conflict and immutable failure.
- ✅ Covered: direct quantitative arc partition, row-order/source-grain preservation, zero omission,
  strict invalid/all-zero value rejection, arc count and weighted-sum partition, fractional/repeated categories,
  strict invalid/all-zero weight rejection, extreme normalized totals, circular categorical bands,
  larger-first radial overlay and zero-radius omission.
- Evidence: Polar grammar, encoding, chart, browser and render tests.

## `encodeR`

- Signature: `encodeR({ field?, aggregate?: "count" | "sum", mapping?: "area" | "radius-length", target?, fieldType?: "quantitative", scale?, coordinate? })`
- Radius is semantic Polar position, distinct from graphical `encodeRadius`/`encodePointRadius` glyph size.
- Auto range is `[0, min(plotWidth, plotHeight) / 2]`. Explicit range values are non-negative logical Canvas
  pixels and must fit current plot bounds.
- Linear/log/pow/sqrt/symlog quantitative scale policies are supported. Canvas edits re-resolve auto ranges and
  reject an explicit range that no longer fits before returning a new program.
- Radius만 있는 incomplete point는 semantic/config를 유지하고 complete theta/radius pair가 생기면 x/y를
  materialize한다.

- Measured Arc mode opts in with `mapping:"area"|"radius-length"` and `aggregate:"sum"` plus field, or `aggregate:"count"` without field. Omitted mapping/aggregate on reassignment preserve the existing assignment; ordinary radius does not infer aggregation.
- Measured radius groups by categorical theta, preserves source row membership, and uses one sector per positive category. Zero categories remain in theta/color domains. Empty/all-zero, negative, nonfinite values, category overflow, and conflicting colors within a category are errors.
- Area mapping uses `r=sqrt(r0²+t(R²-r0²))`; radius-length uses `r=r0+t(R-r0)`, where `t=value/U`. Positive thickness lost to numeric precision is an error. Axis/grid labels retain count or sum units through the same mapping.
- Measured scale subset is linear, zero:true, nice:false, reverse:false, optional clamp, domain:auto|[0,U], range:auto|[r0,R]. U must cover every category aggregate; 0<=r0<R. Theta is equal-angle categorical band without padding/aggregate/weight, and Arc padAngle is 0.
- Auto range follows Canvas and innerRadius. Explicit range defines the hole; an explicitly authored Arc innerRadius must agree with r0/R. Ordinary Point/Arc consumers cannot share a measured scale. Compatible measured Arc consumers share its mapping and require one auto innerRadius policy.
- Radius-first assignment stays pending until theta exists, without a fabricated domain or graphic. Pending explicit range still must fit Canvas. Remove measured radius before removing its category theta; this prevents orphaned aggregate guides. Adding a compatible Arc inherits the aggregate; ordinary Point inheritance excludes measured radius.
- Mapping is stored once on the scale as radialMapping. `editScale({radialMapping})` changes all compatible consumers; `encodeR({mapping})` changes the assigned scale through the same lower action. Clearing mapping while aggregate consumers remain is rejected. To reuse the scale for ordinary radius, remove the radius encoding, clear its orphaned radialMapping with editScale, then encodeR a field; a fresh scale id also works.

### Formal values — `encodeR`

- Implemented: `encodeR(RadialEncodingOptions)` — ordinary field/RadiusScaleOptions, or sum+field/count-without-field and optional inherited RadialMapping/MeasuredRadiusScaleOptions.
- Range: `"auto" | readonly [NonNegativeFinite, NonNegativeFinite]` within the current available radius.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeR`

- ✅ Covered: auto/explicit/reversed range, zero policy, resize, scale edit and out-of-bounds error.
- ✅ Covered: filter, selection, highlight, appearance encodings and order-independent completion.
- Evidence: Polar encoding, selection, chart, browser and render tests. Measured extension: `test/unit/actions/encodings/measured-radius-encoding.test.js`, `test/unit/grammar/measured-radius.test.js`, `test/unit/actions/marks/measured-arc-primitives.test.js`, `test/contracts/measured-radius-types.test.js`.

## `encodePointRadius`

- Signature: `encodePointRadius({ value, target? })`
- Additive public alias for `encodeRadius`. It calls `encodeRadius` as one wrapped child, so trace decomposition and
  all glyph-size validation remain owned by the existing action.
- It never writes the semantic Polar `radius` channel.
- Available in default and Basic entries. Scatter `point.radius` delegates to this wrapped alias. Basic keeps
  encodeRadius as its internal dependency and does not expose removePointRadius or general opacity.

### Formal values — `encodePointRadius`

- Implemented: `encodePointRadius({ value: NonNegativeFinite; target?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodePointRadius`

- ✅ Covered: nested action trace, concrete point radius and separation from `encodeR`.
- Evidence: Polar encoding and public chart tests.

## `removePointRadius`

- Signature: `removePointRadius({ target? } = {})`.
- Resolves the current or unique point mark with an explicit constant glyph radius. Missing and ambiguous ownership
  are errors.
- Removes only `materializationConfigs.marks[target].radius`, clears the concrete point collection and
  rematerializes it with the theme default radius. Semantic Polar `encoding.radius` is preserved.
- Field-driven size cannot coexist with the explicit radius and is therefore not changed by this action.

### Formal values — `removePointRadius`

- Implemented: `removePointRadius({ target?: UserId } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removePointRadius`

- ✅ Covered: inferred/explicit target, missing assignment, theme-default restoration, earlier-program immutability
  and Polar radius isolation.
- Evidence: `test/unit/actions/marks/edit-point-mark.test.js`.

## `encodeBarWidth`

- Signature: `encodeBarWidth({ band?, pixels?, target? })`
- `band`: `(0, 1]` finite number. Resolved category/offset slot 중 rect가 차지하는 비율이다.
- `pixels`: positive finite logical Canvas pixel width. `band`와 mutually exclusive이며 PNG `pixelRatio`와
  무관하다.
- Complete aggregate/ranged bar는 action 호출 전에도 implicit `{ band: 0.72 }`로 즉시 materialize된다.
  첫 assignment에서 width mode를 생략하면 그 기본값을 config에 저장하고, reassignment에서 생략하면 current
  mode와 value를 유지한다. Group slot spacing은 directional offset action이 소유한다.
- `target`: optional Bar ID. 위치가 없는 valid partial Bar도 받는다. 완성된 group layout은 matching offset를
  추가로 요구한다.
- Effect: graphical mark config에 exactly one width mode를 저장하고 centered rect x/width를
  rematerialize한다. Band width는 Canvas resize에 반응하고 pixel width는 고정된다. Slot보다 큰 explicit
  pixel width와 overlap은 허용한다.
- 위치가 미완성일 때는 기존 barWidth config만 저장하고 items를 생성하지 않는다. 나중에 category/measure
  또는 ranged pair가 완성되면 저장된 width를 적용한다. 위치 제거는 items를 비우고 width를 보존한다.
- Deferred Box는 전용 `createBoxPlot({ width })` owner를 사용하며, 기존처럼 range가 완성된 뒤에만
  lower `encodeBarWidth`를 받는다. Box의 미완성 measure에 자동 aggregate를 추가하지 않는다.
- 오류: 잘못된 width는 즉시 거부한다. Histogram bin은 category slot width를 지원하지 않으며 width를 먼저
  저장한 뒤 histogram을 완성하는 마지막 position action도 거부한다. 완성된 group layout은 matching
  group/directional offset이 없으면 거부한다. Color는 필수가 아니다.
- Coverage: aggregate/grouped/ranged bar tests가 implicit default, explicit value, invalid range, both orientations와
  resize geometry를 검증한다.

### Formal values — `encodeBarWidth`

- Implemented: mutually exclusive `encodeBarWidth({ band?: number; pixels?: never; target?: UserId } | { band?: never; pixels: PositiveFinite; target?: UserId })`; complete bar implicit default and first-assignment default are both `{ band: 0.72 }`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeBarWidth`

- `band`
  - ✅ Covered: omission→`0.72`, representative `(0,1)`, exact `1`, 0/negative/>1/non-finite rejection.
- `pixels`
  - ✅ Covered: representative fixed width, slot보다 큰 overlap, zero/negative/non-finite rejection와
    `band` mutual exclusion.
- `target`
  - ✅ Covered: inferred/explicit aggregate/grouped/ranged bar, both ranged orientations와 incomplete prerequisites.
- Reassignment
  - ✅ Covered: explicit mode switching, omitted-mode retention와 immutable concrete rematerialization.
- Resize/order
  - ✅ Covered: band responsive, pixels fixed, width/padding action-order convergence와 2× PNG parity.
- Evidence: grouped-bar width and chart reference tests, `test/unit/actions/encodings/bar-authoring-order.test.js`.

## `encodeText`

- Signature: `encodeText({ target?, field?, value?, content?, normalizeBy?, format? })` with exactly one of `field`, `value`, or `content`.
- `target`: current compatible text mark, otherwise one unique text mark; ambiguity requires an explicit ID.
- `field`: a field present on the text dataset. For a source-owned aggregate bar annotation, a matching measure field
  resolves to the final aggregate endpoint rather than an arbitrary source row. A measured Arc's radius field uses its
  final category aggregate. Common fields retain their common-item content. Use semantic `content:"value"` for the
  source statistic before stacking or normalization instead of interpreting a field as cumulative geometry.
- `value`: constant content repeated at every final text anchor.
- `content`: `"category" | "value" | "share"`, requiring an attached Bar or Arc source. Incomplete sources retain the
  intent until their position is complete. Point/Rule/Rect and independent text use explicit field or constant content.
  Category reads an aggregate Bar's category channel or categorical Arc theta; histogram intervals and quantitative theta
  require explicit field/constant labels. Ranged Bars have no inferred single value and require explicit content fields.
- Semantic value is the canonical aggregate over each final Bar item's members, histogram segment count, Pie sector
  count/weighted sum/quantitative theta, or Radial Arc radius. It is independent of stack endpoints and normalized heights.
- Share divides these values by the current final-item total. `normalizeBy:"source"` is the default on each share assignment;
  Bar also supports `"category"` for its category or histogram bin. Other content rejects normalizeBy. Source filtering and
  facet-local data change the denominator. Labels may be added to already-created facet child programs; current facet
  templates reject pre-existing text layers. Finite non-negative values and a positive denominator are required; an empty
  final-item set yields empty text. Zero-height bars excluded from final items produce no placeholder labels.
  Scaling by the maximum before summing preserves meaningful shares when the raw sum would overflow.
- `format`: `"auto"`, `.0`–`.12` precision with fixed-decimal `f`, percent `%`, or scientific `e`, or a UTC
  pattern containing `%Y | %m | %d | %b` and literals (`%%` emits `%`). Auto uses deterministic string conversion,
  so share content with auto is a fraction. Percent multiplies by 100, rounds to the specified decimals and appends `%`.
  Numeric formats require finite values and reject percent overflow; UTC formats require a valid date/timestamp.
  Precision is an integer from 0 through 12;
  two-digit zero-padded 00–09 forms remain supported in both runtime and TypeScript. Negative, fractional and >12
  precision tokens are rejected by declarations as well as runtime. Null/undefined/empty content creates no placeholders.
- Reassignment replaces incompatible field/datum/content/normalization branches, preserves previous format when omitted,
  and rematerializes final text. Source encoding/scale/filter changes replay semantic content and reject incompatible source
  meaning or invalid shares without mutating an earlier program. Geometry and source data remain owned by the source mark.

### Formal values — `encodeText`

- Implemented: `encodeText({ target?: UserId; format?: ValueFormat } & ({ field: FieldName } | { value: unknown } | { content: "category" | "value" } | { content: "share"; normalizeBy?: "source" | "category" }))`; branches are mutually exclusive. `ValueFormat` is `"auto" | NumericFormatString | UtcFormatString`; numeric precision is 0–12 and suffix is `f | % | e`.
- Proposed (NOT IMPLEMENTED): locale-aware text formatting tokens.

### Value coverage — `encodeText`

- ✅ Covered: field/value/content exclusivity and reassignment, every percent precision, missing/invalid inputs,
  source value/category/share, both Bar orientations, histogram bins, Pie/quantitative/radial Arc, canonical aggregates,
  normalization scope, finite/negative/zero/overflow cases, source completion and filter/scale/Canvas replay.
- Evidence: `test/unit/actions/marks/text-mark.test.js`, `test/unit/actions/marks/text-content.test.js`,
  `test/unit/grammar/mark-label-content.test.js`, `test/contracts/mark-label-content.test.js`, installed consumer type/runtime probes.

## Area endpoint와 range의 공통 계약

- Implemented: Area의 encodeX/Y/X2/Y2는 quantitative field 또는 finite datum 중 하나를 받는다. Primary datum은 aggregate/bin/stack/temporalUnit과 함께 쓸 수 없다. 독립 위치는 field이며 두 datum endpoint는 오류다.
- encodeXRange/encodeYRange의 lower/upper는 field string 또는 `{datum:number}`다. 최소 하나는 field. 최종 두 endpoint와 scale로 preflight한 뒤 companion semantics와 wrapped primary/secondary를 기록한다. 이전 endpoint의 log-zero 같은 중간 충돌은 최종 유효 range를 막지 않는다.
- 자동 domain에 두 endpoint를 포함한다. Explicit domain/clamp/reverse는 기존 정책이며 primary datum의 axis title은 측정 field인 secondary를 따른다.
- missing:error는 strict, break는 null/undefined 측정 endpoint만 제외하며 유효 연속점 2개 이상의 closed segment를 만든다. 독립 위치/그룹/NaN/Infinity는 오류다. 각 segment 선택 항목은 그 segment의 원본 행만 참조한다.
- Evidence: test/unit/actions/encodings/area-endpoints.test.js. 두 방향, field↔datum, 최종 log range, 가짜 field 없음, 결측 segmentation/selection, resize와 immutable rejection.

## `layoutSeries`

- Implemented: `layoutSeries({target?,mode}): ChartProgram`. Assignment, full and Basic; Basic supports Bar only
  and excludes center from its type. Target uses current/unique eligible Bar or Area. Mode is required.
- Modes: group/stack/fill/overlay/diverging/center. Aggregate/histogram Bar supports all except center;
  ranged Bar supports overlay only. Raw Area supports all except group, with center vertical only.
  Two-field ribbons only overlay. Density delegates to its existing statistical grain/orientation limits.
  Horizon, Line, Point, Arc, Rect and Rule use their own layout owners and reject this action.
- Canonical state: `layer.layout.mode`. Identity: `encoding.group` field/fields, in stable first-source appearance.
  Color is appearance and does not reorder the series. Bar color retains its per-aggregate-cell categorical or
  quantitative grain; Area color is constant within a series. Tuple keys never add derived source fields.
- Stack/fill/center require finite nonnegative values. Diverging accumulates signs separately from zero.
  Fill total zero has zero thickness and domain [0,1]. Center spans ±total/2. Numeric overflow/precision failures
  reject the entire action. Raw Area requires an aligned unique group×position grid and one zero datum endpoint;
  an incomplete simple vertical range can obtain its y2=0 through encodeY2. Missing rows are never synthesized.
- Reassignment recomputes scales, geometry, guides and selection. Overlay clears accumulation. Group creates the
  category-axis offset through its existing owner; leaving group removes active offsets and padding. Only an
  automatically generated, unreferenced offset scale is removed; explicit or shared scales are retained.
- Legacy color.layout, measure.stack and Bar offsets delegate to this owner. Zero/normalize/null/center map to
  stack/fill/overlay/center. The last explicit request wins; omitted color.layout preserves a stored mode.
  Related edits normalize legacy stack/color.layout leaves instead of keeping duplicate policies.
- Initial legacy color still supplies the usual group/stack default. Inferred group stores only
  `inferredFrom:color|offset`; each adapter may revise its own inferred identity. Explicit encodeGroup clears the
  marker. An offset conflicting with an explicit group rejects; independent color remains valid at its cell grain.
- Removing color preserves group/layout. Removing a group required by active accumulation/grouping rejects;
  first assign overlay. Incomplete lower encodings remain empty rather than silently recreating endpoints.
- Effects are explicit wrapped semantic/scale/offset/mark/guide owners. Renderers still consume only graphics.
  Every invalid target, mode, grain, shared-scale constraint or downstream guide/selection preflight is immutable.

### Formal values — `layoutSeries`

- Implemented: `SeriesLayoutOptions = {target?:string; mode:ColorLayout}`.
- Basic: `BasicSeriesLayoutOptions` excludes center; no encodeLayout alias.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `layoutSeries`

- ✅ Covered: complete mode math and group/stack/group transitions, raw shared breaks, tuple/color independence,
  legacy adapters, automatic/user offset ownership, invalid topology and immutable failures, Basic boundary.
- Evidence: `test/unit/actions/encodings/series-layout.test.js`, `test/unit/actions/encodings/bar-authoring-order.test.js`,
  `test/charts/area-layout/`, `test/contracts/area-endpoint-types.test.js`.

Parallel reencoding은 field identity로 axis component recipe와 explicit title을 보존하며 removed field를 정리한다. 전체/선택 생성 범위와 cleanup은 [Parallel field-axis contract](AXES.md#shared-parallel-field-axis-contract)를 따른다.
