# Encoding action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared scale option contract

Encoding의 `scale` object는 channel에 따라 아래 subset을 사용한다.

- `id`: Implemented. user-defined scale ID; 생략하면 channel 이름(`x`, `y`, `color`, `size`,
  `shape`, `strokeDash`, `xOffset`)을 사용한다.
- `type`: Implemented. position은 field type에 따라 `linear | time | ordinal`, color/shape/dash/offset은
  `ordinal`, size는 `linear`만 허용한다.
- `domain`: Implemented. `"auto"` 또는 type에 맞는 explicit array. explicit domain은 data inference,
  `zero`, `nice`보다 우선한다.
- `range`: Implemented. `"auto"` 또는 type/channel에 맞는 explicit array. position auto range는
  Canvas plot bounds를 사용한다.
- `nice`: Implemented for linear/time position scale. boolean이며 auto domain만 읽기 좋은 경계로
  확장한다. ordinal에는 허용되지 않는다.
- `zero`: Implemented for linear scale. boolean이며 auto domain에만 zero를 포함한다. explicit domain이
  있으면 적용되지 않는다.
- `palette`: Implemented for color scale. palette name이며 `range`와 동시에 사용할 수 없다.
- Planned: transformed quantitative, UTC, explicit band/point, discretizing scale types와
  clamp/reverse/unknown mapping policies는 `planned/SCALES.md`, Vega named palette vocabulary는
  이 domain의 planned palette contract가 소유한다.
- Proposed: quantitative/temporal color, interpolation과 continuous gradient legend.

## `encodeX`

- Signature: `encodeX({ field, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: Implemented, dataset에 존재하는 field. 현재 supported mark grain에 맞는 값 type이 필요하다.
- `target`: Implemented, mark ID. 생략하면 current mark, 아니면 유일한 eligible mark를 추론한다.
- `fieldType`: Implemented. point/area는 `quantitative`, line은 `temporal`, bar는 `quantitative`
  bin 또는 `ordinal`을 지원한다. 생략 시 지원되는 mark별 기본을 사용한다.
- `scale`: Implemented. 위 shared contract를 사용한다. 기본 ID는 `x`, auto range는 left-to-right plot bounds다.
- `coordinate`: Implemented, coordinate ID. 생략 시 positional action이 Cartesian `main` coordinate를
  만들거나 existing compatible coordinate를 사용하고 layer에 저장한다.
- `bin.maxBins`: Implemented for quantitative bar x. positive integer이며 histogram aggregate의
  default는 `10`; bin boundaries와 bar x/width를 결정한다. Planned `bin.step`과
  `bin.boundaries`는 exact width 또는 explicit irregular intervals를 저장한다.
- `aggregate`, `stack`: x의 현재 supported combinations에는 사용되지 않으며 잘못된 combination은 거부된다.
- Effect: x encoding과 scale을 semantic state에 저장하고 scale 및 compatible mark/guide consumers를
  rematerialize한다.
- Coverage: position, histogram, ordinal bar, temporal chart tests가 주요 mark 조합을 검증한다.
  explicit scale option의 전체 교차조합은 부분적이다.

### Formal values — `encodeX`

- Implemented: `encodeX({ field: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal"; scale?: PositionScale; coordinate?: UserId; bin?: { maxBins?: PositiveInteger } })`; 실제 fieldType/bin 조합은 mark policy가 제한한다.
- Planned (NOT IMPLEMENTED): broader mark-specific `fieldType?: "quantitative" | "temporal" | "ordinal"` compatibility; `{ bin?: { step: PositiveFinite } | { boundaries: readonly [Finite, Finite, ...Finite[]] }; scale?: { type?: "log" | "pow" | "sqrt" | "symlog" | "utc" | "band" | "point"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean; unknown?: unknown } }`
- Proposed (NOT IMPLEMENTED): Polar positional action.

### Value coverage — `encodeX`

- `field`, `target`
  - ✅ Covered: inferred/explicit point, line, bar, area targets; missing field, ambiguous/invalid target.
- `fieldType`
  - ✅ Covered: point/area `"quantitative"`, line `"temporal"`, bar `"quantitative"` bin과 `"ordinal"`.
  - ✅ Covered: unsupported mark/type pairs rejection.
  - 🟡 Planned: broader raw temporal/ordinal combinations with an explicit mark × channel compatibility matrix.
- `coordinate`
  - ✅ Covered: omitted Cartesian default, explicit/reused coordinate, incompatible coordinate rejection.
  - 🟣 Proposed: Polar theta/radial mapping; action naming unresolved.
- `aggregate`
  - ⚠️ Partial: 현재 x에서는 생략만 supported; unsupported aggregate rejection matrix가 부분적이다.
- `bin.maxBins`
  - ✅ Covered: default via histogram, representative positive integer, invalid integer/value.
  - ⚠️ Partial: `1`, very large maxBins와 constant field interaction.
  - 🟡 Planned: mutually exclusive `bin.step`/`bin.boundaries`, exact/irregular geometry와 scale conflicts.
- `scale.id/type/domain/range/nice/zero`
  - ✅ Covered: auto/explicit linear, time, ordinal definitions; explicit domain/range precedence;
    wrong type and shared-channel conflicts.
  - ⚠️ Partial: 모든 fieldType × nice × zero × explicit bound pairwise 조합.
  - 🟡 Planned: compatible transformed/UTC/band/point scale types and clamp/reverse/unknown policies.
- Evidence: position, temporal, histogram-bin and ordinal-bar action tests.

## `encodeY`

- Signature: `encodeY({ field?, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: point/area/line/ordinal-bar에서는 필수 field다. histogram count y는 x field에서 추론한다.
- `target`, `fieldType`, `scale`, `coordinate`: x와 같은 selection/storage contract이며 auto range는
  bottom-to-top plot bounds다.
- `aggregate`: Implemented values `"mean" | "count"`. line과 ordinal bar는 mean, histogram은 count를
  사용한다. Planned values는 `"sum" | "median" | "min" | "max" | "distinct" | "valid" |
  "missing" | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" |
  "ciLower" | "ciUpper"`이며 raw quantitative point/area는 생략한다.
- `stack`: Implemented values `"zero" | null`. histogram color series는 zero stack, grouped ordinal
  bar는 `null`이다.
- `bin`: 현재 y에서는 지원되지 않는다.
- Effect: y semantic, scale, bar aggregate grain 또는 line mean grain을 저장하고 mark geometry와
  existing guides를 rematerialize한다.
- Coverage: supported charts가 raw/mean/count, zero/null 조합을 검증한다. unsupported 조합과
  scale override의 pairwise coverage는 부분적이다.

### Formal values — `encodeY`

- Implemented: `encodeY({ field?: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: PositionScale; coordinate?: UserId; aggregate?: "mean" | "count"; stack?: "zero" | null })`; mark/x policy가 가능한 조합을 제한한다.
- Planned (NOT IMPLEMENTED): `{ fieldType?: "temporal" | "ordinal"; aggregate?: "sum" | "median" | "min" | "max" | "distinct" | "valid" | "missing" | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" | "ciLower" | "ciUpper" | { op: "quantile"; probability: UnitInterval } | { op: "first" | "last"; orderBy: FieldName; order?: "ascending" | "descending" }; stack?: "normalize"; scale?: { type?: "log" | "pow" | "sqrt" | "symlog" | "utc" | "band" | "point"; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; clamp?: boolean; reverse?: boolean; unknown?: unknown } }`
- Proposed (NOT IMPLEMENTED): `{ stack?: "center" }`; `argmin`/`argmax`는 row-selecting transform 후보다.

### Value coverage — `encodeY`

- `field`, `target`, `coordinate`
  - ✅ Covered: raw quantitative point/area, aggregate line/bar, inferred histogram count and target ambiguity.
- `fieldType`
  - ✅ Covered: current quantitative combinations와 invalid types.
  - 🟡 Planned: temporal/ordinal y combinations allowed by the mark × channel compatibility matrix.
- `aggregate`
  - ✅ Covered: omission, `"mean"`, `"count"`, incompatible aggregate rejection.
  - 🟡 Planned: `"sum" | "median" | "min" | "max" | "distinct" | "valid" | "missing" |
    "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" | "ciLower" |
    "ciUpper"`; final visual grain, sample validity, title/domain inference가 필요하다.
  - 🟡 Planned: parameterized quantile과 ordered first/last.
  - 🟣 Proposed: `argmin`/`argmax` row-selection transform.
- `stack`
  - ✅ Covered: `"zero"`, `null`, incompatible policy rejection.
  - 🟡 Planned: `"normalize"`; non-negative partition과 auto `[0, 1]` domain을 사용한다.
  - 🟣 Proposed: `"center"`; streamgraph baseline contract가 필요하다.
- `scale`
  - ✅ Covered: auto/explicit domain/range, nice/zero precedence, shared consumer conflicts.
  - ⚠️ Partial: aggregate/stack/scale option pairwise matrix.
  - 🟡 Planned: compatible transformed/UTC/band/point scale types and clamp/reverse/unknown policies.
- Evidence: point position, line aggregate, histogram y and ordinal aggregate bar tests.

## `encodeXOffset`

- Signature: `encodeXOffset({ field, target?, fieldType?, scale? })`
- `field`: Implemented, nominal grouping field. ordinal x/mean y/non-stacked bar에만 허용된다.
- `target`: optional eligible bar ID.
- `fieldType`: Implemented, 유일한 값 `"nominal"`, 기본값도 nominal이다.
- `scale`: ordinal scale contract; 기본 ID `xOffset`, domain은 grouping order, range는 parent x band다.
- Effect: x band 안에 group sub-band를 만들고 scale을 materialize한다. concrete rect는 color/group
  semantics와 width가 완성될 때 생성된다.
- Coverage: grouped-bar semantic/reference tests가 automatic child action과 geometry를 검증한다.
  direct explicit range 조합은 부분적이다.

### Formal values — `encodeXOffset`

- Implemented: `encodeXOffset({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: NumericRange } })`
- Planned (NOT IMPLEMENTED): `{ paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite }`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeXOffset`

- `field`, `target`
  - ✅ Covered: nominal grouping field, explicit/inferred eligible grouped bar, missing/incompatible prerequisites.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid alternatives.
- `scale.id/type/domain/range`
  - ✅ Covered: defaults, explicit order, reversed range, auto range rematerialization, invalid definitions.
  - 🟡 Planned: `encodeXOffset`-owned inner/outer padding; `encodeBarWidth`는 slot 내부 width만 소유한다.
- Evidence: `test/unit/actions/encodings/x-offset-encoding.test.js`.

## `encodeY2`

- Signature: `encodeY2({ field, target?, fieldType?, scale? })`
- `field`: 필수 quantitative upper-bound field.
- `target`: optional area ID.
- `fieldType`: 유일한 값 `"quantitative"`, 기본값도 quantitative다.
- `scale`: 생략 또는 `{ id: existingYScale }`만 허용하며 y와 다른 scale을 만들 수 없다.
- Effect: semantic y2를 existing y scale에 연결하고 closed area path를 rematerialize한다.
- Coverage: ranged area/regression tests가 shared scale과 invalid prerequisites를 검증한다.

### Formal values — `encodeY2`

- Implemented: `encodeY2({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId } })`
- Proposed (NOT IMPLEMENTED): —; y2는 y scale 공유를 유지한다.

### Value coverage — `encodeY2`

- `field`, `target`
  - ✅ Covered: quantitative upper field, eligible area, missing y/missing field errors.
- `fieldType`
  - ✅ Covered: `"quantitative"`와 invalid alternatives.
- `scale.id`
  - ✅ Covered: omission/shared y ID, same explicit ID, conflicting ID rejection.
  - No proposal: y2는 y scale 공유가 semantic invariant다.
- Evidence: ranged-area and regression semantic/materialization tests.

## `encodeYRange`

- Signature: `encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })`
- `lower`, `upper`: 필수 quantitative field names이며 각각 y와 y2가 된다.
- `target`, `fieldType`, `coordinate`, `scale`: `encodeY` 계약을 공유한다.
- Effect: wrapped `encodeY` 뒤 `encodeY2`를 호출하는 atomic action이다. 중간의 incomplete area
  상태를 public workflow에 노출하지 않는다.
- Coverage: regression band와 area tests가 hierarchy와 path geometry를 검증하며 explicit scale
  variations는 부분적이다.

### Formal values — `encodeYRange`

- Implemented: `encodeYRange({ lower: FieldName; upper: FieldName; target?: UserId; fieldType?: "quantitative"; coordinate?: UserId; scale?: PositionScale })`
- Planned (NOT IMPLEMENTED): 별도 `encodeX2({ field; ... })`와 atomic `encodeXRange({ lower; upper; ... })` actions.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeYRange`

- `lower`, `upper`
  - ✅ Covered: distinct quantitative fields와 missing/invalid fields.
- `target`, `fieldType`, `coordinate`, `scale`
  - ✅ Covered: inferred/explicit target와 shared y/y2 child hierarchy.
  - ⚠️ Partial: explicit coordinate/scale option combinations direct test.
- 🟡 Planned: `encodeX2`를 wrapped child로 사용하는 horizontal ranged area의 atomic `encodeXRange`.
- Evidence: ranged-area and regression tests.

## `encodeGroup`

- Signature: `encodeGroup({ field, target?, fieldType? })`
- `field`: 필수 nominal field. density area에서는 density transform의 `groupBy`와 일치해야 한다.
- `target`: line 또는 area ID; 생략 시 current/unique eligible target을 추론한다.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- Effect: series를 path별로 나누는 semantic group만 저장한다. scale이나 guide는 만들지 않으며
  필요한 position encoding이 이미 완성됐을 때 path를 rematerialize한다.
- Coverage: line, regression, density tests가 grouped/ungrouped와 mismatch를 검증한다.

### Formal values — `encodeGroup`

- Implemented: `encodeGroup({ field: FieldName; target?: UserId; fieldType?: "nominal" })`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeGroup`

- `field`, `target`
  - ✅ Covered: nominal line/area grouping, inferred/explicit target, density group match/mismatch.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid values.
- No proposal: group은 scale-free path partition이라는 현재 역할을 유지한다.
- Evidence: line-series, ranged-area and density-area tests.

## `encodeHistogram`

- Signature: `encodeHistogram({ field, target?, coordinate?, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale? })`
- `field`, `target`, `coordinate`: binned x에 전달되는 field와 optional target/coordinate다.
- `maxBins`: positive integer, 기본값 `10`; `encodeX.bin.maxBins`로 전달된다.
- `binStep`, `binBoundaries`: Planned exact-width/explicit-boundary modes이며 maxBins와 mutually exclusive다.
- `stack`: `"zero" | null`, 기본값 `"zero"`; `encodeY`로 전달된다.
- `xScale`, `yScale`: optional scale objects이며 각각 child x/y action에 전달된다.
- Effect: wrapped `encodeX`와 `encodeY`를 원자적으로 결합해 bin/count semantics와 concrete rects를 만든다.
- Coverage: histogram unit/chart tests가 defaults, stack, bin boundaries, scale rules와 trace hierarchy를 검증한다.

### Formal values — `encodeHistogram`

- Implemented: `encodeHistogram({ field: FieldName; target?: UserId; coordinate?: UserId; maxBins?: PositiveInteger; stack?: "zero" | null; xScale?: PositionScale; yScale?: PositionScale })`
- Planned (NOT IMPLEMENTED): `{ binStep?: PositiveFinite; binBoundaries?: readonly [Finite, Finite, ...Finite[]] }`; `maxBins`와 mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeHistogram`

- `field`, `target`, `coordinate`
  - ✅ Covered: shortest/inferred call, explicit forwarding, missing/invalid child prerequisites.
- `maxBins`
  - ✅ Covered: omission→`10`, representative explicit values, invalid through child `encodeX`.
  - ⚠️ Partial: minimum/large values와 sparse/constant data pair.
- `stack`
  - ✅ Covered: omission→`"zero"`, explicit `"zero"`와 `null` forwarding/rejection by supported semantics.
- `xScale`, `yScale`
  - ✅ Covered: explicit objects, default policies, domain/range precedence.
  - ⚠️ Partial: independent scale IDs and all policy combinations.
- 🟡 Planned: `binStep`/explicit bin boundaries; maxBins exclusivity, domain ownership와 guide effects를 고정한다.
- Evidence: `test/unit/actions/encodings/encode-histogram.test.js`와 histogram chart tests.

## `encodeDensity`

- Signature: `encodeDensity({ field, target?, source?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, coordinate?, valueScale?, densityScale? })`
- `field`, `source`, `groupBy`, `bandwidth`, `extent`, `steps`, `as`: `createDensityData`와 같은 계약이며
  derived ID는 `${target}DensityData`로 namespace된다.
- `kernel`: Planned shared density kernel이며 생략 시 Gaussian이다.
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

- Implemented: `encodeDensity({ field: FieldName; target?: UserId; source?: UserId; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; as?: readonly [FieldName, FieldName]; densityChannel?: "x" | "y"; coordinate?: UserId; valueScale?: PositionScale; densityScale?: PositionScale })`
- Planned (NOT IMPLEMENTED): `{ kernel?: DensityKernel; normalization?: "unit" | "count" }`; defaults는 `"gaussian"`과 `"unit"`이다.
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
- 🟡 Planned: shared `"gaussian" | "epanechnikov" | "uniform" | "triangular"` kernel grammar,
  provenance and derived revision behavior.
- 🟡 Planned: `"unit" | "count"` normalization forwarding, provenance and density-scale rematerialization.
- Evidence: density encoding/data/mark/chart tests.

## `encodeColor`

- Signature: `encodeColor({ field, target?, fieldType?, layout?, scale? })`
- `field`: 필수 nominal field.
- `target`: point, line, bar 또는 area ID; current/unique inference를 지원한다.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- `layout`: 현재 bar에서 `"stack" | "group"`; histogram default는 stack이고 ordinal grouped bar는
  group이다. Planned vocabulary는 bar/area별 `"fill" | "overlay" | "diverging"` compatibility를
  추가한다. `"center"` streamgraph는 Proposed이며 다른 mark에서는 layout을 생략해야 한다.
- `scale`: ordinal color scale. `palette` 또는 explicit `range` 중 하나를 사용할 수 있다.
- Effect: color semantic과 scale을 저장한다. point fill, line stroke, bar fill, area fill로 materialize한다.
  group layout은 wrapped `encodeXOffset`, stack layout은 zero-stack bar geometry를 사용한다.
- Coverage: 모든 대표 chart와 legend tests가 mark별 materialization을 검증한다. palette vocabulary,
  explicit ranges와 layout 오류의 전체 matrix는 부분적이다.

### Formal values — `encodeColor`

- Implemented: `encodeColor({ field: FieldName; target?: UserId; fieldType?: "nominal"; layout?: "stack" | "group"; scale?: ColorScale })`
- Planned (NOT IMPLEMENTED): `{ layout?: "fill" | "overlay" | "diverging"; scale?: { palette?: VegaPalette } }`; full accepted `ColorLayout`은 existing `"stack" | "group"`을 포함한다.
- Proposed (NOT IMPLEMENTED): `{ layout?: "center"; fieldType?: "quantitative" | "temporal"; scale?: { interpolate?: "rgb" | "hsl" | "hsl-long" | "lab" | "hcl" | "hcl-long" | "cubehelix" | "cubehelix-long" } }` 및 continuous gradient legend.

### Value coverage — `encodeColor`

- `field`, `target`
  - ✅ Covered: point/line/bar/area, inferred/explicit target, missing/invalid nominal values.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid alternatives.
- `layout`
  - ✅ Covered: omission, `"stack"`, `"group"`, incompatible mark/layout rejection.
  - 🟡 Planned: `"fill" | "overlay" | "diverging"` with mark compatibility, normalized and signed
    baseline policies; `encodeGroup`과 distinct ownership을 유지한다.
  - 🟣 Proposed: `"center"` streamgraph layout.
- `scale.id/type/domain`
  - ✅ Covered: ordinal default, explicit ID/order, incomplete explicit domain rejection.
- `scale.range/palette`
  - ✅ Covered: explicit color array, `{ palette: "tableau10" }`, range+palette conflict, invalid colors.
  - 🟡 Planned: all 68 Vega named schemes plus `{ name, count?, extent? }`, resolved as discrete
    categorical colors without a Vega runtime dependency.
  - 🟣 Proposed: quantitative/temporal continuous color, interpolation, gradient legend and custom schemes.
- Evidence: color, line-series, bar-color, area-color and grouped-bar tests.

## `encodeStrokeDash`

- Signature: `encodeStrokeDash({ field, target?, fieldType?, scale? })`
- `field`, `target`, `fieldType`: nominal field, optional line ID, nominal-only type다.
- `scale`: ordinal dash scale. range는 non-negative finite number array들의 array다.
- Effect: line series별 concrete `strokeDash`와 categorical legend symbol을 rematerialize한다.
- Coverage: line semantic, series legend와 scale tests가 auto/explicit dash를 검증하며 다양한 dash
  pattern 경계는 부분적이다.

### Formal values — `encodeStrokeDash`

- Implemented: `encodeStrokeDash({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: DashScale })`
- Planned (NOT IMPLEMENTED): `encodeStrokeDash({ value: "solid" | "dashed" | "dotted" | "dashdot" | DashPattern; target?: UserId })`; field-driven scale range도 같은 named styles를 허용한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeStrokeDash`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal line series, inferred/explicit target, invalid mark/type/field.
- `scale.domain`
  - ✅ Covered: auto and explicit order.
- `scale.range`
  - ✅ Covered: automatic pattern cycling, explicit even-length non-negative patterns, invalid patterns.
  - ⚠️ Partial: empty solid pattern mixed with repeated categories and very long patterns.
  - 🟡 Planned: `solid | dashed | dotted | dashdot` named values and their concrete recipes.
- 🟡 Planned: mutually exclusive constant `value` mode and atomic field↔constant reassignment.
- Evidence: line-series encoding and scale tests.

## `encodeSize`

- Signature: `encodeSize({ field, target?, fieldType?, scale? })`
- `field`: 필수 quantitative field.
- `target`: optional point ID.
- `fieldType`: 유일한 값 `"quantitative"`.
- `scale`: linear size-area scale; auto range는 `[24, 196]`이다.
- Effect: semantic size를 concrete area로 mapping하고 circle radius=`sqrt(area/pi)`, square side=`sqrt(area)`로
  materialize한다. constant `encodeRadius`와 함께 사용할 수 없다.
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
- `scale`: ordinal shape scale. 현재 resolved symbol vocabulary는 `"circle" | "square"`다.
- Planned: shared `PointShape` 12종과 non-repeating automatic range를 사용한다.
- Effect: point graphic을 heterogeneous collection으로 바꾸고 각 datum의 concrete primitive type과
  legend symbol을 rematerialize한다.
- Coverage: regression scatterplot과 point/legend tests가 circle/square mapping을 검증한다.

### Formal values — `encodeShape`

- Implemented: `encodeShape({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: "auto" | readonly ("circle" | "square")[] } })`
- Planned (NOT IMPLEMENTED): `range?: "auto" | readonly PointShape[]` with 12 distinct shared values.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeShape`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal point field와 invalid alternatives.
- `scale.domain/range`
  - ✅ Covered: auto domain, circle/square result, heterogeneous collection and legend symbol materialization.
  - ⚠️ Partial: explicit shape range order와 incomplete domain/range direct cases.
  - 🟡 Planned: shared 12-shape range, distinct-domain capacity, mark/legend/render parity.
- Evidence: point appearance and regression chart/guide tests.

## `encodeOpacity`

- Signature: `encodeOpacity({ value, target? })`
- `value`: 필수 finite `[0, 1]` number. 0은 완전 투명, 1은 완전 불투명이다.
- `target`: optional point ID.
- Effect: semantic encoding이 아니라 mark graphical config와 모든 point child opacity를 바꾼다.
  같은 target에 다시 호출하면 기존 constant opacity를 교체하고 point를 rematerialize한다.
- Coverage: point/regression tests와 validation이 representative, reassignment 및 invalid range를 검증한다.

### Formal values — `encodeOpacity`

- Implemented: `encodeOpacity({ value: UnitInterval; target?: UserId })`
- Planned (NOT IMPLEMENTED): `encodeOpacity({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear" | "log" | "pow" | "sqrt" | "symlog"; domain?: ContinuousDomain; range?: "auto" | readonly [UnitInterval, UnitInterval]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean } })`; field와 value는 mutually exclusive.
- Proposed (NOT IMPLEMENTED): opacity legend.

### Value coverage — `encodeOpacity`

- `value`
  - ✅ Covered: representative value, 0, 1, below/above range와 non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point, unknown/incompatible target.
- Reassignment
  - ✅ Covered: same action replaces the stored constant and concrete child opacity immutably.
- 🟡 Planned: field-driven quantitative opacity, auto range `[0.2, 1]` and atomic constant↔field reassignment.
- 🟣 Proposed: opacity legend.
- Evidence: point appearance and regression tests.

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

- Signature: `encodeBarWidth({ band?, target? })`
- `band`: `(0, 1]` finite number, 기본값 `0.72`. 각 xOffset slot 중 rect가 차지하는 비율이다.
- `pixels`: Planned fixed logical-pixel width이며 band와 mutually exclusive다. Group slot spacing은
  `encodeXOffset`이 소유한다.
- `target`: optional complete grouped bar ID.
- Effect: graphical mark config에 band fraction을 저장하고 rect x/width를 rematerialize한다.
  같은 target에 다시 호출하면 기존 band fraction을 교체한다.
- 오류: ordinal x, mean/non-stacked y, matching color/xOffset가 완성되지 않으면 거부한다.
- Coverage: grouped-bar semantic/reference tests가 default, explicit value, invalid range와 geometry를 검증한다.

### Formal values — `encodeBarWidth`

- Implemented: `encodeBarWidth({ band?: number; target?: UserId })`, `0 < band <= 1`, default `0.72`.
- Planned (NOT IMPLEMENTED): `{ pixels?: PositiveFinite }`; `band`와 mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `encodeBarWidth`

- `band`
  - ✅ Covered: omission→`0.72`, representative `(0,1)`, exact `1`, 0/negative/>1/non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit grouped bar와 incomplete prerequisites.
- Reassignment
  - ✅ Covered: same action replaces the stored band and concrete rect widths immutably.
- 🟡 Planned: mutually exclusive fixed pixels/band modes; grouped padding은 `encodeXOffset` contract가 소유한다.
- Evidence: grouped-bar width and chart reference tests.
