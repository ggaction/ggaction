# Mark action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

```typescript
type PointShape =
  | "circle" | "square" | "diamond"
  | "triangle-up" | "triangle-down" | "triangle-left" | "triangle-right"
  | "plus" | "cross" | "star" | "hexagon" | "wye";

type CurveInterpolation =
  | "linear" | "step" | "step-before" | "step-after"
  | "basis" | "cardinal" | "monotone" | "natural";
```

This closed vocabulary is owned by the shared point-shape grammar and reused by mark creation/editing,
shape encoding, concrete materialization, and legend symbols.

Ordinary mark creation may omit `id` for the first mark of that semantic type. The library persists the
  deterministic role ID `"point" | "line" | "bar" | "area" | "arc" | "rule" | "tick" | "text"`. A second mark of the same type requires an
explicit user ID; the library never invents numbered public-resource IDs. Explicit IDs retain the existing
validation and uniqueness contract.
Prototype property names such as constructor, toString and __proto__ are ordinary explicit IDs. Only an
own resource with the same ID is a collision.

When `data` is omitted, every ordinary mark family uses one shared layered-inference policy. The current eligible
layer, otherwise one unique layer on the current dataset, may contribute its coordinate and compatible field-based
x/y encodings. The target mark re-resolves every candidate against its own position policy. A transform policy is
copied only when both source and target support the same final grain: an aggregate line layered over an aggregate
bar may inherit `mean`, while bin, stack, offset and grouped color layout are not copied into an incompatible recipe.
Incompatible field/scale pairs remain absent, and ambiguity is an error. Passing `data` explicitly opts into
independent assembly and does not inherit position encodings.

Every ordinary mark requires materialized `values` on its selected dataset, including an empty array. A definition-only
dataset from `createDerivedData` is rejected with an error explaining the required value-producing data action.
Definition registration and internal layer rebinding remain available without automatic transform execution.

## `createPointMark`

- Signature: `createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})`
- `id`: Implemented optional 새 layer/graphic ID. 첫 unnamed point는 `"point"`; 동일 type이 이미 있으면 required다.
- `data`: Implemented, existing dataset ID. 생략하면 current data를 사용한다.
- `shape`
  - Status: Implemented. shared `PointShape` 12종, 기본값 `"circle"`.
  - Effect: semantic mark는 항상 `point`지만 concrete child는 circle, rect 또는 normalized path가 된다.
- `fill`, `opacity`, `stroke`, `strokeWidth`: Implemented creation-time appearance shorthand. 각각
  `editPointMark`와 같은 validation/config persistence를 사용하며 wrapped `editPointMark`로 적용한다.
  `stroke: false`는 outline과 width를 끈다. Field-driven color와 constant fill은 충돌한다.
- Effect: dataset cardinality와 같은 길이의 point graphic collection을 만들며 아직 위치 property가
  없으므로 encoding 전에는 보이지 않을 수 있다.
- Default glyph size: compatible Cartesian x/y 또는 Polar theta/r position이 완성되면 materializer가
  radius `3`을 concrete child에 적용한다. 이는 renderer fallback이나 semantic property가 아니다.
  Field-driven size, 명시적 `encodeRadius`, 보존 가능한 concrete size, default radius 순으로 결정한다.
  Position이 불완전할 때는 명시적 radius가 없는 한 default size만 먼저 materialize하지 않는다.
- Layered inference: current compatible layer, otherwise one unique compatible layer에서 omitted data,
  coordinate와 x/y field, fieldType, scale, title을 복사한다. Aggregate/bin/stack은 다른 mark recipe로
  복사하지 않는다. Inferred decision은 새 layer semantic state에 저장하며 ambiguity는 오류다.
- Coverage: `test/unit/actions/marks/create-point-mark.test.js`가 두 shape, empty data,
  multiple marks, inference, conflicts와 trace를 검증한다. `test/contracts/point-default-radius.test.js`는
  Cartesian/Polar default, explicit radius와 field size 우선순위, resize, Browser Canvas와 Node PNG를 검증한다.

### Formal values — `createPointMark`

- Implemented: `createPointMark({ id?: UserId; data?: UserId; shape?: PointShape; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createPointMark`

- `id`, `data`
  - ✅ Covered: omission→`"point"`, current/explicit dataset, empty dataset, explicit multiple marks,
    second unnamed ambiguity, unknown data와 duplicate IDs.
- `shape`
  - ✅ Covered: 12-value vocabulary, omission→circle, equal-area normalized recipes and unknown rejection.
- `default radius`
  - ✅ Covered: complete Cartesian/Polar position→`3`, explicit radius와 field-driven size override,
    Canvas resize, immutable earlier program, Browser Canvas와 Node PNG.
- `fill`, `opacity`, `stroke`, `strokeWidth`
  - ✅ Covered: representative combined creation, validation reuse, stored config and later position rematerialization.
- Evidence: `test/unit/actions/marks/create-point-mark.test.js` and
  `test/unit/grammar/schemas/mark-schema.test.js`.

## `editPointMark`

- Implemented: immutable constant shape and appearance edits for existing point marks.
- Signature: `editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })`.
- `target`은 existing point mark다. current compatible mark 또는 유일한 point mark로 infer하며
  ambiguity는 explicit target을 요구한다.
- `shape`은 shared `PointShape` 12종 중 하나다. Field-driven `encodeShape`가 있으면 constant shape
  edit와 충돌하므로 오류다.
- `fill`은 non-empty color string이며 field-driven `encodeColor`가 있으면 충돌하므로 오류다.
- `opacity`는 `[0, 1]`, `stroke`는 non-empty color string 또는 edit-time `false`, `strokeWidth`는 non-negative
  finite logical pixel이다. `stroke: false`는 outline과 stored width를 함께 비활성화하며 simultaneous
  `strokeWidth`는 오류다. 이후 string stroke는 point default width `1`로 복원한다.
- Scalar opacity conflicts with active field opacity; use `encodeOpacity({ value })` for explicit replacement.
- 최소 한 appearance property가 필요하며 omitted properties는 기존 stored config를 보존한다.
- Effect: mark materialization config를 갱신하고 wrapped `rematerializePointMark`로 concrete items를
  equal-area circle, rect 또는 path recipe로 교체한다. Semantic mark/data/encoding은 바꾸지 않는다.

### Formal values — `editPointMark`

- Implemented: `editPointMark({ target?: UserId; shape?: PointShape; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editPointMark`

- ✅ Covered: inferred/explicit target, all 12 shapes, equal target area and nested rematerialization trace.
- ✅ Covered: missing/unknown/ambiguous target, invalid shape, field-driven shape conflict and immutable failure.
- ✅ Covered: fill/opacity/stroke/strokeWidth validation and persistence across position rematerialization;
  field-driven color conflict.
- ✅ Covered: outline disable, simultaneous/disabled width rejection, default-width restoration, Canvas replay.
- No proposal: radius and field-driven opacity remain owned by their corresponding encoding actions.
- Evidence: `test/unit/actions/marks/edit-point-mark.test.js`.

## `createTickMark`

- Signature: `createTickMark({ id?, data?, length?, stroke?, strokeWidth?, opacity? } = {})`.
- `id`: 첫 unnamed Tick은 `"tick"`을 사용한다. 같은 type의 두 번째 mark는 explicit ID가 필요하다.
- `data`: existing dataset ID. 생략하면 current data를 사용하고, compatible current/unique Cartesian
  layer가 있으면 data, coordinate와 x/y field encoding을 shared layered-inference policy로 상속한다.
- `length`: positive finite logical pixel, default `14`.
- `stroke`: non-empty string, default shared theme mark color `"#4c78a8"`.
- `strokeWidth`: non-negative finite logical pixel, default `2`.
- `opacity`: unit interval, default `1`.
- Completeness: complete Cartesian x/y scale pair가 있을 때만 source row마다 centered line item을 만든다.
  x 또는 y 하나만 있는 상태는 semantic assignment와 scale을 보존하고 line collection을 비운다.
- Geometry: unrotated baseline은 `0°`가 위쪽인 vertical segment이며 center와 length를 보존한 concrete
  `x1/y1/x2/y2`만 `graphicSpec`에 저장한다. Renderer는 Tick identity를 읽지 않는다.
- Fixed-y rug plot은 ordinary y field를 명시해 작성한다. x-only plot-edge placement inference는 지원하지 않는다.

### Formal values — `createTickMark`

- Implemented: `createTickMark({ id?: UserId; data?: UserId; length?: PositiveFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; opacity?: UnitInterval } = {})`.
- Implemented direction assignment은 `encodeAngle`이 소유한다.
- Proposed (NOT IMPLEMENTED): x-only rug placement inference.

### Value coverage — `createTickMark`

- ✅ Covered: default/explicit ID와 data, empty/incomplete/complete x/y, x/y authoring order independence.
- ✅ Covered: default/explicit appearance, exact center/length, Canvas rematerialization과 earlier-program immutability.
- ✅ Covered: compatible layered inference, ambiguous/unknown/duplicate resources와 invalid options.
- Evidence: `test/unit/actions/marks/tick-mark.test.js`,
  `test/unit/grammar/direction.test.js`, and
  `test/unit/materialization/materialization-policies.test.js`.

## `editTickMark`

- Signature: `editTickMark({ target?, length?, stroke?, strokeWidth?, opacity? })`.
- `target`: current compatible Tick, otherwise unique Tick으로 infer하며 ambiguity는 explicit target을 요구한다.
- 최소 한 edit property가 필요하다. Omitted properties는 current config를 보존한다.
- Validation은 create action과 동일한 positive length, non-empty stroke, non-negative width와 unit opacity를 사용한다.
- Effect: identity, data, coordinate, x/y와 angle assignment를 보존하고 mark config를 structural copy한 뒤
  wrapped `rematerializeTickMark`로 concrete endpoints와 appearance를 다시 만든다.

### Formal values — `editTickMark`

- Implemented: `editTickMark({ target?: UserId; length?: PositiveFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; opacity?: UnitInterval })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editTickMark`

- ✅ Covered: inferred/explicit target, partial/full edit, resize persistence, immutable earlier program과 nested trace.
- ✅ Covered: missing/unknown/ambiguous target, empty edit와 invalid scalar rejection.
- Evidence: `test/unit/actions/marks/tick-mark.test.js`.

## `jitterPoints`

- Signature: `jitterPoints({ target?, channel, maxOffset, seed?, key? })`.
- Lifecycle: Assignment. 같은 target에 다시 호출하면 기존 policy를 semantic base position에서 교체하며
  이전 concrete offset을 누적하지 않는다. 제거는 `removeJitter`가 소유한다.
- `target`: complete Cartesian x/y point mark. Current compatible mark, otherwise unique compatible mark로
  infer하며 ambiguity는 explicit ID를 요구한다.
- `channel`: closed vocabulary `"x" | "y"`. 지정 channel의 concrete center만 이동한다.
- `maxOffset`: exactly one of `{ pixels: PositiveFinite }` or `{ band: PositiveFiniteAtMostHalf }`.
  `band`는 categorical position scale의 effective slot width에 대한 비율이다.
- `seed`: string 또는 finite number, default `0`. `key`는 optional non-empty source field이며 지정하면
  materialized item에서 unique string/finite-number/boolean identity를 요구한다. 생략하면 source item index다.
- State: requested policy와 resolved item offsets는
  `materializationConfigs.jitters[target]`이 단독 소유한다. `semanticSpec`의 field, scale와 channel value는
  변경하지 않고 final concrete centers만 `graphicSpec`에 materialize한다.
- Geometry: point shape, area/radius와 stroke extent를 고려해 plot bounds 안에 유지한다. Categorical
  channel은 category slot 안에도 유지한다. 들어갈 공간이 없으면 해당 item의 offset은 `0`이고 resolved
  metadata에 unavailable 상태가 남는다.
- Rematerialization: Canvas, scale, data/filter, point radius/shape/stroke, selection/highlight와 facet replay가
  같은 stored assignment를 다시 적용한다. Highlight offset은 jitter 이후 final concrete geometry에 적용된다.
- Non-goals: collision-free packing/beeswarm, density-aware displacement와 Polar point jitter는 구현하지 않는다.

### Formal values — `jitterPoints`

- Implemented: `jitterPoints({ target?: UserId; channel: "x" | "y"; maxOffset: { pixels: PositiveFinite } | { band: PositiveFiniteAtMostHalf }; seed?: string | FiniteNumber; key?: NonEmptyString })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `jitterPoints`

- ✅ Covered: exact deterministic hash vector, x/y, pixel/band offset, default/explicit seed and keyed reorder stability.
- ✅ Covered: plot/category containment for every point shape extent, replacement from semantic base, removal and immutability.
- ✅ Covered: Canvas, scale, filtering, appearance, highlight and facet rematerialization; primitive/public Canvas parity.
- ✅ Covered: incomplete/ambiguous/Polar target, invalid offsets, incompatible band scale and duplicate/invalid key errors.
- Evidence: `test/unit/grammar/layout/point-jitter.test.js`,
  `test/unit/actions/marks/point-jitter.test.js`, and `test/charts/point-jitter/public.test.js`.

## `removeJitter`

- Signature: `removeJitter({ target? } = {})`.
- Lifecycle: Assignment removal. Stored jitter가 있는 current/unique point target을 infer한다.
- Effect: `materializationConfigs.jitters[target]`을 structural remove하고 wrapped point rematerialization으로
  semantic scale position을 복구한다. Semantic encoding, data, scale, mark와 unrelated configs는 보존한다.

### Formal values — `removeJitter`

- Implemented: `removeJitter(options?: { target?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeJitter`

- ✅ Covered: inferred/explicit target, base-position restoration, config cleanup, nested trace and earlier-program immutability.
- Evidence: `test/unit/actions/marks/point-jitter.test.js`.

## `removeMark`

제거한 owner와 owned child가 사용하던 scale에 다른 consumer가 남으면 domain과 그 consumer의
mark/guide를 다시 계산한다. Explicit domain과 consumer가 없는 named scale은 보존한다.

- Signature: `removeMark({ target? } = {})`.
- Resolves one stable user-authored mark owner. Generated composite children cannot be removed directly; their
  owner must be selected. The action removes the owner, recursively owned layers and graphics, mark configs,
  selection/highlight ownership, legends owned by the removed marks and unreferenced generated datasets.
- User source datasets, coordinates and scales are preserved. Axes and grids are removed only when the removed
  mark was their last position-scale consumer; shared guides remain.

### Formal values — `removeMark`

- Implemented: `removeMark(options?: { target?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeMark`

- ✅ Covered: explicit/current owner, unknown/generated-child target, ordinary shared-resource removal,
  regression ownership closure, derived-data release, selection/highlight cleanup and immutability.
- Evidence: `test/unit/actions/marks/remove-mark.test.js` and Roadmap 3 focused-editing Gate.

## `createLineMark`

- Signature: `createLineMark({ id?, data?, stroke?, strokeWidth?, opacity?, curve?, closed? } = {})`
- `id`, `data`: `createPointMark`와 같은 ID/data 계약이다.
- `strokeWidth`: Implemented, non-negative finite number이며 concrete default는 `2`다. 명시한 값은
  mark materialization config에 저장되어 path 재생성 후에도 유지된다.
- `curve`: Implemented. `linear | step | step-before | step-after | basis | cardinal | monotone | natural`이며
  기본값은 `linear`다. Monotone은 materialized x가 strictly increasing 또는 decreasing일 때 동작하며
  duplicate/non-monotonic x는 거부한다. Curve는 graphical materialization config이고 semantic field/scale/group을 바꾸지 않는다.
- Resource bound: line path 또는 완성된 area path가 10,000개를 초과하는 concrete command로
  확장되면 command 배열을 만들기 전에 deterministic `RangeError`로 거부한다.
- `stroke`: Implemented non-empty constant color. Field-driven color encoding과 충돌한다.
- `opacity`: Implemented `[0, 1]` constant appearance이며 default concrete value는 `1`이다.
- `closed`: Implemented boolean, 기본값은 `false`다. Polar line에서만 사용할 수 있으며 `true`이면
  각 series의 마지막 명령에 정확히 하나의 `Z`를 추가한다. 첫 data point를 복제하지 않는다.
- Polar line은 theta/radius position을 사용하며 현재 `curve: "linear"`만 허용한다. 두 position
  encoding은 호출 순서와 무관하고, 하나만 존재하는 동안에는 semantic assignment를 보존하되 path를 만들지 않는다.
- Direct Cartesian quantitative x/y line도 호출 순서와 무관하다. 첫 position action은 semantic과 scale을
  보존하되 path를 만들지 않고, 두 번째 action이 compatible pair를 완성하면 같은 final line을 materialize한다.
  Aggregate y를 사용하는 line은 temporal x가 필요하므로 quantitative x와 결합하려 하면 명시적 validation error다.
- Creation-time `stroke`/`opacity`는 wrapped `editLineMark`로 적용해 direct edit과 같은 validation/config를 사용한다.
- Effect: semantic `line` layer와 길이 0의 path collection을 만든다. x/y encoding이 완성되기
  전에는 path가 없다.
- Layered aggregate inference: compatible current/unique source가 line과 같은 field, scale, coordinate와
  aggregate grain을 가지면 `aggregate`까지 저장하고 즉시 materialize한다. Temporal aggregate bar의 center
  mapping을 공유할 수 있지만 bar-only `stack`, bin과 offset은 상속하지 않는다.
- Coverage: `test/unit/actions/marks/create-line-mark.test.js`가 default/explicit data,
  empty dataset, invalid width와 conflicts를 검증한다.

### Formal values — `createLineMark`

- Implemented: `createLineMark({ id?: UserId; data?: UserId; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; opacity?: UnitInterval; curve?: CurveInterpolation; closed?: boolean } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createLineMark`

- `id`, `data`
  - ✅ Covered: omission→`"line"`, current/explicit/empty dataset, second unnamed ambiguity, invalid IDs와 conflicts.
- `strokeWidth`
  - ✅ Covered: omission→`2`, zero, positive representative, negative/non-finite rejection.
- `curve`
  - ✅ Covered: 전체 8-value vocabulary, omission→linear, exact straight/step/cubic commands, short smooth-series fallback와 invalid rejection.
  - ✅ Covered: create-time config persistence, Canvas/scale/group rematerialization과 approved step primitive/public pair.
- `stroke`, `opacity`
  - ✅ Covered: representative creation, invalid values, color-encoding conflict and grouping rematerialization persistence.
- `closed`
  - ✅ Covered: omission→false, Polar open/closed paths, one `Z` per series, edit convergence, Cartesian rejection,
    non-linear Polar rejection, reverse scales, resize, grouping, filtering and highlighting rematerialization.
- Evidence: `test/unit/actions/marks/create-line-mark.test.js`, `test/unit/grammar/curve-commands.test.js`,
  `test/unit/actions/marks/layered-mark-inference.test.js`,
  `test/contracts/line-position-order.test.js`,
  `test/charts/cars-line-chart/variants/capabilities.test.js`, and
  `test/charts/cars-temporal-bar-line/public.test.js`.

## `editLineMark`

- Signature: `editLineMark({ target?, stroke?, strokeWidth?, opacity?, curve?, closed? })`.
- `target`: existing line mark. Current compatible mark 또는 유일한 line mark로 infer하며 ambiguity는 explicit target을 요구한다.
- `strokeWidth`: non-negative finite number. Active field width와 scalar edit는 충돌한다. Constant mode에서
  전달되면 stored line config와 every concrete series path를 갱신한다. `opacity`도 active field와 scalar edit가
  충돌한다. 명시적 mode replacement는 encodeStrokeWidth/encodeOpacity({ value })를 사용한다.
- `curve`: shared `CurveInterpolation`. Field, grouping, coordinates와 scale semantics를 유지한 채 commands를 다시 만든다.
- `stroke`: non-empty constant color이며 field-driven color encoding과 충돌한다. `opacity`는 `[0, 1]`이다.
- `closed`: Polar line의 open/closed path를 전환하는 boolean이다. Cartesian line에는 적용할 수 없다.
- 최소 한 변경값이 필요하다. 아직 x/y encoding이 완성되지 않은 line은 config만 저장하고, complete line은 wrapped
  `rematerializeLineMark`를 호출한다.

### Formal values — `editLineMark`

- Implemented: `editLineMark({ target?: UserId; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; opacity?: UnitInterval; curve?: CurveInterpolation; closed?: boolean })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLineMark`

- ✅ Covered: explicit/current/unique target, stroke width zero/positive와 전체 curve vocabulary.
- ✅ Covered: empty edit, unknown option/target, ambiguity, invalid width/curve와 earlier-program immutability.
- ✅ Covered: Canvas resize, group rematerialization, deterministic nested trace and approved monotone primitive/public pair.
- ✅ Covered: constant stroke/opacity validation, create/edit convergence, color conflict and rematerialization persistence.
- ✅ Covered: open/closed Polar edit, exactly one closing command, invalid Cartesian/non-linear combinations and atomic failure.
- Evidence: `test/unit/actions/marks/edit-line-mark.test.js` and
  `test/charts/cars-line-chart/variants/capabilities.test.js`.

## `createBarMark`

- Signature: `createBarMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})`
- `id`, `data`: 첫 unnamed bar의 deterministic `"bar"` 또는 explicit 새 ID와 optional existing/current data다.
- Effect: semantic `bar` layer와 길이 0의 rect collection을 만든다. 관련 x/y/grouping semantics가
  완성될 때 rect가 materialize된다.
- `fill`, `opacity`, `stroke`, `strokeWidth`: Implemented creation-time appearance shorthand. Wrapped
  `editBarMark`와 동일한 validation/config persistence를 사용한다. `stroke: false`는 outline과 width를 끈다.
- Coverage: `test/unit/actions/marks/create-bar-mark.test.js`가 inference, empty data,
  invalid options와 conflicts를 검증한다.

### Formal values — `createBarMark`

- Implemented: `createBarMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBarMark`

- `id`, `data`
  - ✅ Covered: omission→`"bar"`, current/explicit/empty dataset, second unnamed ambiguity, invalid options와 conflicts.
- `fill`, `opacity`, `stroke`, `strokeWidth`
  - ✅ Covered: representative combined creation, validation reuse, config persistence and grouped-bar rematerialization.
  - ✅ Covered: false outline opt-out, create/edit convergence, facade forwarding, strict declaration positive/negative
    and existing Rect comparison in `test/unit/actions/marks/filled-mark-stroke.test.js` and `scripts/package-consumer.js`.
- No proposal: orientation/group/stack/width는 mark parameter가 아니라 encoding action이 소유한다.
- Evidence: `test/unit/actions/marks/create-bar-mark.test.js`.

## `editBarMark`

- Signature: `editBarMark({ target?, fill?, opacity?, stroke?, strokeWidth? })`.
- `target`: current compatible bar, unique bar, or explicit existing bar ID.
- `fill`: non-empty constant color. Field-driven color encoding과 함께 사용할 수 없다.
- `opacity`: unit interval. `stroke`: non-empty color or `false`; false는 concrete transparent zero-width outline로
  materialize한다. `strokeWidth`는 non-negative finite이며 removed stroke에 단독 적용할 수 없다.
- Effect: mark materialization config를 immutable하게 갱신하고 complete histogram/aggregate/grouped/ranged bar를
  `rematerializeBarMark`로 다시 만든다. Data, encoding, scale, bin, group과 stack semantics는 바꾸지 않는다.

### Formal values — `editBarMark`

- Implemented: `editBarMark({ target?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editBarMark`

- ✅ Covered: inferred/explicit target, fill, opacity, stroke, width, outline removal/restoration, combined edits.
- ✅ Covered: color-fill conflict, empty/unknown/invalid options, missing target and immutable failure.
- ✅ Covered: uncolored/color histogram, Canvas rematerialization and compatibility with selected bar overrides.
- Evidence: `test/unit/actions/marks/edit-bar-mark.test.js` and
  `test/charts/mark-selection-bars/public.test.js`.
- Evidence: `test/unit/actions/marks/create-bar-mark.test.js`.

## `createAreaMark`

- Signature: `createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? } = {})`
- `id`, `data`: 첫 unnamed area의 deterministic `"area"` 또는 explicit 새 ID와 optional existing/current dataset이다.
- `fill`: Implemented, non-empty color string. 기본값은 theme mark color `"#4c78a8"`다.
- `opacity`: Implemented, `[0, 1]` finite number. 기본값은 `0.2`다.
- `stroke`, `strokeWidth`: Implemented. optional non-empty outline string과 non-negative finite width다.
  Stroke가 있으면 width 기본값은 `1`이며 stroke 없이 width만 지정할 수 없다.
- `curve`: Implemented shared 8-value `CurveInterpolation`; default는 `"linear"`다. Lower/upper
  boundaries를 독립적으로 interpolate한 뒤 connector와 `Z`로 닫는다.
- Effect: semantic `area` layer와 빈 path collection을 만들고 fill/opacity는 graphical config에
  저장한다. ranged y 또는 density encoding이 완성되면 closed path를 만든다.
- Coverage: density/regression chart와 area materialization tests가 default와 representative
  appearance를 검증한다. fill vocabulary와 opacity 양 끝값의 direct action coverage는 부분적이다.

### Formal values — `createAreaMark`

- Implemented: `createAreaMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation; missing?: "error" | "break" } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createAreaMark`

- `id`, `data`
  - ✅ Covered: omission→`"area"`, current/explicit derived dataset, second unnamed ambiguity와 invalid resources.
- `fill`
  - ✅ Covered: omission/theme default, explicit color and direct empty/non-string rejection.
- `opacity`
  - ✅ Covered: default `0.2`, representative values, exact 0/1 endpoints and out-of-range rejection.
- `stroke`, `strokeWidth`
  - ✅ Covered: omission/no outline, string with default/explicit/zero width, width-without-stroke rejection,
    edit replacement/removal and Canvas rematerialization persistence.
- `curve`
  - ✅ Covered: all 8 values, linear exact commands, cubic commands, horizontal independent-axis orientation,
    invalid token rejection, edit/rematerialization and immutability.
- Evidence: `test/unit/actions/marks/create-area-mark.test.js`, area materialization,
  `test/unit/actions/marks/edit-area-mark.test.js`, density and regression chart tests.

- `missing`: Implemented `"error"|"break"`, 기본 error. Semantic mark.missing에만 저장한다. Break는 raw Area 측정 endpoint의 null/undefined에서 2점 이상 segment로 나누며 density/horizon 재해석을 거부한다.
- Evidence: test/unit/actions/encodings/area-endpoints.test.js.

## `editAreaMark`

- Signature: `editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve?, missing? })`.
- `target`: existing area mark. Current compatible mark 또는 유일한 area mark를 infer하고 ambiguity는
  explicit target을 요구한다.
- `fill`, `opacity`: constant graphical appearance다. Field-driven color encoding이 있으면 fill edit는
  오류지만 opacity는 독립적으로 수정할 수 있다.
- `stroke`: non-empty string은 outline을 생성/교체하고 `false`는 outline과 stored width를 제거한다.
- `strokeWidth`: non-negative finite number. Width-only edit은 active outline을 요구한다.
- `curve`: shared 8-value interpolation. Complete area는 즉시 concrete commands를 다시 만든다.
- `missing`: createAreaMark와 같은 semantic 정책을 재할당한다. 실패는 이전 program을 보존한다.
- Effect: private mark config 또는 missing semantic 정책을 immutable하게 갱신하고 complete mark는 wrapped `rematerializeAreaMark`를
  호출한다. Data와 coordinates는 바꾸지 않으며 missing 변경은 scales와 closed paths를 다시 계산한다.

### Formal values — `editAreaMark`

- Implemented: `editAreaMark({ target?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation; missing?: "error" | "break" })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editAreaMark`

- ✅ Covered: inferred/explicit target, fill/opacity, outline create/replace/width/remove와 incomplete config.
- ✅ Covered: empty/unknown/ambiguous target, invalid appearance, encoded-fill conflict, atomic failure and
  earlier-program immutability.
- ✅ Covered: approved density primitive/public pair and fill → stroke Canvas order.
- ✅ Covered: every curve token, invalid curve failure, earlier-program immutability and concrete closed commands.
- Evidence: `test/unit/actions/marks/edit-area-mark.test.js` and
  `test/charts/cars-density-area/variants/primitive.test.js`.

## `createArcMark`

- Signature: `createArcMark({ id?, data?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? } = {})`.
- The first inferred ID is `"arc"`; data follows the shared current/explicit dataset contract.
- `innerRadius` is a ratio in `[0, 1)` of the available Polar radius. `padAngle` is a non-negative degree value.
- Default appearance is theme fill, opacity `1`, white stroke, and stroke width `1`.
- Effect: creates semantic mark type `arc` and an empty path collection. Direct quantitative theta, categorical count,
  or categorical weighted-sum theta completes a proportional pie/donut; categorical theta plus quantitative radius
  completes equal-band radial sectors. Concrete output contains only closed `M/L/C/Z` commands and appearance
  properties.
- Multiple rows in one theta band use stable larger-first overlay order. A mapped outer radius equal to the inner
  baseline is omitted. Automatic radius range starts at `innerRadius * availableRadius`.

### Formal values — `createArcMark`

- Implemented: `createArcMark({ id?: UserId; data?: UserId; innerRadius?: number; padAngle?: NonNegativeFinite; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite } = {})`, where `0 <= innerRadius < 1`.
- Proposed (NOT IMPLEMENTED): explicit secondary theta/radius endpoints.

### Value coverage — `createArcMark`

- ✅ Covered: inferred/explicit ID and data, empty initial path collection, duplicate role ambiguity and immutable trace.
- ✅ Covered: direct quantitative and count donuts, categorical radial sectors, larger-first overlay, zero-radius
  omission and encoding order.
- ✅ Covered: representative inner radius, pad, fill/opacity/stroke/width defaults and invalid geometry.
- Evidence: `test/unit/actions/marks/create-arc-mark.test.js`, `test/unit/actions/marks/arc-mark.test.js`, and
  `test/unit/grammar/arcs.test.js`.

## `editArcMark`

- Signature: `editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })`.
- Target inference follows other focused mark editors. At least one edited property is required.
- Complete arcs rematerialize immediately; incomplete arcs retain the configuration until their encodings complete.
- Constant fill cannot replace a field-driven color encoding. Geometry edits re-resolve automatic radial ranges.
- Edit-time `stroke: false` disables the concrete outline and removes stored width. It rejects simultaneous
  `strokeWidth`; a later non-empty stroke restores arc default width `1`.

### Formal values — `editArcMark`

- Implemented: `editArcMark({ target?: UserId; innerRadius?: number; padAngle?: NonNegativeFinite; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editArcMark`

- ✅ Covered: inferred target, geometry/appearance persistence, Canvas and scale rematerialization, color conflict,
  invalid values and earlier-program immutability.
- ✅ Covered: outline disable, disabled-width rejection and default-width restoration after Canvas rematerialization.
- Evidence: `test/unit/actions/marks/arc-mark.test.js`.

## `createRuleMark`

- Signature: `createRuleMark({ id?, data?, stroke?, strokeWidth?, strokeDash?, opacity? } = {})`.
- `id`: 첫 unnamed rule은 deterministic `"rule"`을 사용한다. 동일 type의 두 번째 rule은 explicit ID가
  필요하며 numbered public ID를 만들지 않는다.
- `data`: existing dataset ID. 생략하면 current dataset을 사용하며 안전한 current source가 없으면 오류다.
- Effect: semantic `rule` layer와 길이 0의 backend-neutral `line` collection을 만든다. Position은
  `encodeX/Y/X2/Y2`가 소유한다. 생성 style은 모든 옵션을 먼저 검증한 뒤 요청된 순서대로
  `encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`, `encodeOpacity` wrapped child에 위임한다.
- Layered position provenance: omitted `data`로 compatible layer의 position을 상속하면 source와 inherited
  channel을 internal mark config에 기록한다. 이후 datum x 또는 y를 작성할 때 반대 primary channel만
  inherited이고 secondary endpoint가 없으면 그 inherited branch를 제거해 full-span rule을 만든다.
  Field endpoint는 orthogonal inherited channel을 보존해 interval을 구성하며, explicit `data`로 만든 rule은
  이 provenance 기반 정리를 적용하지 않는다.
- Lifecycle: immutable resource editing. Scalar style은 `editRuleMark`, field appearance와 endpoint는
  corresponding encoding action으로 편집한다. 위치가 불완전하면 style을 저장하고 빈 collection을 유지한다.

### Formal values — `createRuleMark`

- Implemented: `createRuleMark({ id?: UserId; data?: UserId; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRuleMark`

- ✅ Covered: omitted ID→`"rule"`, current/explicit data, empty data, explicit multiple roles, second unnamed
  ambiguity, invalid ID/data/options와 graphic/layer conflict.
- ✅ Covered: empty line collection, default appearance config, immutable earlier program과 wrapped trace.
- Evidence: `test/unit/actions/marks/create-rule-mark.test.js`,
  `test/contracts/rule-inherited-datum-span.test.js`, and `test/charts/cars-error-bar/primitive.test.js`.

## `editRuleMark`

- Signature: `editRuleMark({ target?, stroke?, strokeWidth?, strokeDash?, opacity? })`.
- Target resolution is explicit Rule → current Rule → unique Rule. Missing, non-Rule and ambiguous targets fail.
- At least one style is required. Full closed-option and value validation happens before the first child action.
- Requested children run in stroke → strokeWidth → strokeDash → opacity order and reuse their encoding owners.
  Active field appearance conflicts with a scalar edit; call that encoder with `{ value }` to replace the binding.
- Width accepts zero; opacity is in `[0,1]`; stroke is a non-empty color string; dash uses shared names/patterns.
- Endpoint, data, cap, and statistical ownership remain unchanged. ErrorBar appearance uses `editErrorBar`.
- Complete rules rematerialize immediately; incomplete rules retain appearance until completion. Canvas changes,
  legends and stored highlights replay through the same lower owners.

### Formal values — `editRuleMark`

- Implemented: `editRuleMark({ target?: UserId; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | DashPattern; opacity?: UnitInterval })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRuleMark`

- ✅ Covered: creation/editor/lower-chain exact graphic, draw-order and Canvas call parity; child order, pending
  style, full preflight, field conflicts, target inference, invalid values, resize and immutable failure.
- Evidence: `test/unit/actions/marks/rule-style-authoring.test.js`.

## `createRectMark`

- Signature: `createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})`.
- The first omitted ID resolves to `"rect"`. Data is explicit or inferred from the current dataset; a newly layered
  rect may inherit one unique compatible Cartesian source's data, coordinate, and position encodings.
- Rect is a distinct semantic mark. It materializes two discrete band positions (`x` and `y`), two complete
  continuous endpoint pairs (`x`/`x2` and `y`/`y2`), or one continuous/temporal endpoint pair with the other axis absent.
  A sole x/x2 pair spans the plot height; a sole y/y2 pair spans the plot width. A partly specified orthogonal pair is incomplete. It never receives bar aggregation, baseline, stacking, or width
  semantics implicitly. Incomplete position intent remains an empty concrete rect collection.
- Discrete mode creates one full-band cell for every complete observed row. Ranged mode maps both endpoint pairs and
  normalizes them into positive concrete bounds. Missing values omit only their own cell and do not extend automatic
  scale domains. Continuous or categorical `encodeColor` owns field-driven fill.
- Rect positions accept exactly one field or datum. Numeric primary datum infers quantitative, other supported scalars
  nominal; temporal is explicit. Secondary fieldType defaults to the primary type and must match. Constant-only positions
  yield one final Rect regardless of dataset length; any position/color field restores row grain and constant broadcast.
  Missing mixed rows do not contribute constants to automatic domains. Empty field data needs an explicit domain or another
  consumer. Constant-only selection membership is the whole dataset, with common fields only, like constant Rules.
- Full plot spans use current plot bounds and replay after margin/Canvas and scale edits. Text attaches to final centers;
  selections/highlights share the same Rect row resolution. Temporal selection channels use normalized epoch milliseconds
  for both fields and constants, while raw fields preserve the original strings/units. Zero extents are omitted.
- Defaults are theme mark fill, opacity `1`, white stroke, and stroke width `1`. Explicit creation styles delegate to
  `editRectMark` and are preserved through scale, Canvas, data, selection, and highlight rematerialization.

### Formal values — `createRectMark`

- Implemented: `createRectMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite } = {})`.
- Proposed (NOT IMPLEMENTED): categorical cell completion and automatic missing-cell placeholders.

### Value coverage — `createRectMark`

- ✅ Covered: deterministic ID/data, discrete and ranged topology, encoding order independence, missing rows, continuous
  color, rect-source text, selection/highlight, Canvas rendering, exact approved primitive/public/PNG equivalence.
- Evidence: `test/unit/actions/marks/rect-span.test.js`, `test/contracts/rect-span.test.js`, `test/unit/actions/marks/rect-mark.test.js` and
  `test/charts/gapminder-life-expectancy-heatmap/`.

## `editRectMark`

- Signature: `editRectMark({ target?, fill?, opacity?, stroke?, strokeWidth? })`.
- At least one property is required. Omitted target resolves only one eligible rect. Omitted properties preserve the
  immutable mark configuration; `stroke: false` disables the stroke and rejects a simultaneous width.
- Constant fill and `encodeColor` are mutually exclusive. Complete cells rematerialize immediately; incomplete rects
  retain the validated style until their position topology becomes complete.

### Formal values — `editRectMark`

- Implemented: `editRectMark({ target?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRectMark`

- ✅ Covered: inferred target, appearance persistence, disabled stroke, color conflict, invalid values, empty edit,
  rematerialization, and earlier-program immutability.
- Evidence: `test/unit/actions/marks/rect-mark.test.js`.

## `createReferenceLine`

- Signature: `createReferenceLine({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, stroke?, strokeWidth?, strokeDash?, opacity? })`.
- Aggregate create-only. 정확히 한 x/y 상수로 한 Rule을 만들고 반대 축 전체 plot bounds를 잇는다.
  문자열은 field 이름이 아닌 literal datum이다. Source의 선택 축 scale/coordinate/data/fieldType/temporalUnit을
  사용한다. Data space가 기본이며 explicit source → current eligible → unique eligible Cartesian layer 순이다.
  선택 축 encoding/scale이 없는 source, source-owned Text와 polar/parallel source는 제외한다. 모호하면 명시적 source가 필요하다.
- `space: "plot"`는 finite [0,1]만 허용한다. x=0은 왼쪽, y=0은 아래쪽. 기존 data는 explicit/current/unique
  규칙을 사용하고 빈 data도 허용한다. Coordinate는 하위 Cartesian encoder의 추론을 따른다.
  `<id>-<axis>` linear scale, domain=[0,1], range=auto를 기존 createScale로 만든다. 동일 definition 재사용,
  다른 definition 충돌 규칙도 그대로 따른다. Plot space의 source/temporalUnit과 data space의 data/coordinate는 오류다.
- Data space의 temporalUnit은 source 기본값을 명시적으로 override할 수 있다. 참조 datum도 자동 도메인에
  기여한다. Source 도메인을 동결하거나 복제하지 않으며 explicit domain을 사용하면 범위를 고정할 수 있다.
- 기본 ID=`referenceLine`, stroke=#64748b, strokeWidth=1, strokeDash=dashed, opacity=1. 추가 unnamed role은 오류다.
  스타일은 RuleStyleOptions의 기존 검증과 하위 appearance encoders를 따른다.
- 전체 하위 chain 사전 검증 후 createScale(plot only), createRuleMark, encodeX 또는 encodeY를 wrapped children으로 실행한다.
  새 dataset·종속 source link·전용 registry를 만들지 않는다. Source를 나중에 다른 scale로 rebind하거나 제거해도
  참조는 유지된다. 기존 공유 scale의 편집은 참조를 rematerialize한다. Canvas/margin 편집도 span을 다시 계산한다.
- 편집은 encodeX/Y/X2/Y2, editRuleMark, editScale, removeMark. 라벨은 createMarkLabels의 explicit value/field로 붙인다.
  removeMark는 label children을 제거하지만 일반 named scale은 유지한다. 편집한 plot scale이 원래 정의와 달라지면
  같은 ID로 재생성할 때 충돌한다. Full API 전용이며 Basic에는 없다.

### Formal values — `createReferenceLine`

- Implemented: `createReferenceLine(options: CreateReferenceLineOptions)`; exclusive axis, data datum은 lower position datum,
  plot datum은 UnitInterval, IDs는 UserId, temporalUnit은 auto/year/timestamp, style은 RuleStyleOptions.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createReferenceLine`

- ✅ Covered: source inference/ambiguity, empty data, scalar/category/year/timestamp, domain contribution, log/reverse,
  lower-chain trace, immutable errors, resize, labels, removal/recreation, styles, types, Full/Basic boundaries and PNG parity.
- Evidence: `test/unit/actions/marks/references.test.js`, `test/contracts/reference-marks.test.js`,
  `test/contracts/text-content-types.test.js`, `test/browser/package-consumer.browser.js`.

## `createReferenceBand`

- Signature: `createReferenceBand({ id?, x?, y?, space?, source?, data?, coordinate?, temporalUnit?, fill?, opacity?, stroke?, strokeWidth? })`.
- createReferenceLine의 coordinate/data/source/scale/ID 충돌과 생명주기 규칙을 공유한다. 정확히 하나의
  x:[lower,upper] 또는 y:[lower,upper]를 받으며 data source는 quantitative/temporal 축만 가능하다.
  Plot endpoints는 각각 finite [0,1]. 뒤집힌 endpoint는 양의 Rect bounds, 같은 endpoint는 빈 collection이다.
- 기본 ID=`referenceBand`, fill=#94a3b8, opacity=.15, stroke=false. strokeWidth만 주면 false와 충돌하므로 색도 명시한다.
  스타일은 RectMarkOptions를 따른다. createScale(plot only), createRectMark, primary encodeX/Y, secondary encodeX2/Y2로
  내려간다. 하위 primary/secondary 전부 사전 검증하므로 두 번째 endpoint가 잘못되어도 partial trace가 없다.
- 위치/스타일/스케일/삭제는 기존 하위 액션이 소유한다. 한 쌍은 반대 축의 현재 plot bounds를 가득 채운다.
  상수-only Rect grain, selection membership, labels, highlights, resize 및 scale replay는 Rect와 같다.

### Formal values — `createReferenceBand`

- Implemented: `createReferenceBand(options: CreateReferenceBandOptions)`; exclusive two-value axis tuple,
  data는 quantitative/temporal datum pair, plot은 UnitInterval pair. Style은 RectMarkOptions, binding은 위 shared rules.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createReferenceBand`

- ✅ Covered: both axes, data/plot, zero/reversed extent, exact two endpoints, invalid second endpoint atomicity,
  categorical rejection, time/log/reverse, row independence, resize, lower-chain parity, highlighting, styles and PNG.
- Evidence: `test/unit/actions/marks/references.test.js`, `test/contracts/reference-marks.test.js`,
  `test/contracts/text-content-types.test.js`, `test/browser/package-consumer.browser.js`.

## `createMarkLabels`

- Signature: `createMarkLabels({ id?, source?, field?, value?, content?, normalizeBy?, format?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? } = {})`.
- Aggregate create-only facade: wrapped `createTextMark`, `encodeText`, then optional `layoutLabels` remain visible children.
  Subsequent edits use those child resources through `editTextMark`, `encodeText`, `layoutLabels`, and `removeLabelLayout`.
- The source uses exactly the explicit/current/unique inference of `createTextMark`; no eligible source is an error.
  Explicit incomplete sources are supported. Independent `data`, the lower-level `text` alias, and `target` are not options.
- The omitted ID is `<source>-labels`; an existing semantic or graphical resource at that ID is an error. Use an explicit
  ID for an additional label layer on the same source. Different sources have independent default label IDs.
- `field`, `value`, and `content` are mutually exclusive with the same semantics, supported marks, formatting and validation
  as `encodeText`. Omitting all three means `content: "value"`; this requires a Bar or Arc with a supported semantic measure.
  Point/Line/Rule/Rect require an explicit field or constant rather than guessing one position channel as the value.
  `format` defaults to `"auto"`, including fractional shares; specify `".0%"` or another percent token for percentages.
- Appearance defaults to centered/middle text at the source's existing final-item anchor. Other appearance defaults and
  source-fill contrast use `createTextMark`. No sign-dependent offsets are inferred; use explicit baseline/dx/dy for endpoint
  placement. Explicit appearance overrides the facade defaults.
- A Line source creates one label per final series item. Its anchor is the last concrete path coordinate and an explicit
  field reads the final ordered member row. This supports endpoint labels without changing Line path or selection grain.
- `rotation` inherits the shared Text `RotationInput`: a legacy finite number means radians, while an exact
  `{ value: finite, unit: "degrees" | "radians" }` object makes the unit explicit and normalizes to radians.
- Omitted/false `layout` creates no collision policy. `{}` enables `layoutLabels` defaults; an object accepts its options
  except `target`, which the facade owns. Enabled layout requires complete text. For incomplete sources, create labels
  without layout, complete the source, then call `layoutLabels`. Best-effort layout warnings retain the lower action contract.
- Complete child effects are preflighted on a discarded immutable branch. Invalid source/content/appearance/layout or ID
  collisions leave the input program and trace unchanged. No additional facade registry or semantic resource is created.
- Source filtering/encoding/scale/Canvas edits replay content, appearance and optional layout through existing text dependencies.
  Existing `removeMark` ownership applies: attached text cannot be removed alone; removing its source owner cleans up labels.

### Formal values — `createMarkLabels`

- Implemented: `createMarkLabels(options?: CreateMarkLabelsOptions)`; ID/source and appearance use `TextMarkOptions`, content uses
  the exclusive `TextEncodingOptions` branches plus omission, and `layout?: false | Omit<LabelLayoutOptions, "target">`.
- Proposed (NOT IMPLEMENTED): automatic point measure selection and layout assignment before source completion.

### Value coverage — `createMarkLabels`

- ✅ Covered: shortest call, source-owned IDs, explicit/inferred Point/Bar/Line/Rule/Rect/Arc sources, all text content branches, appearance overrides,
  incomplete source completion, optional layout and lower edits, resize/filter replay, source removal, nested trace,
  invalid-state atomicity, literal primitive/public graphics and Canvas/PNG equality, public types and installed package/browser discovery.
- Evidence: `test/unit/actions/marks/mark-labels.test.js`, `test/contracts/mark-label-content.test.js`,
  `test/contracts/text-content-types.test.js`, `scripts/package-consumer.js`, `test/browser/package-consumer.browser.js`.

## `createAnnotation`

- Signature: `createAnnotation({ id?, text, format?, source?, x?, y?, space?, data?, coordinate?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy?, layout? })`.
- Exactly one anchor branch is selected. Mark anchor omits x/y/space and uses explicit/current/unique final-item source.
  Data anchor requires x and y and selects one explicit/current/unique complete Cartesian layer for data, coordinate,
  both scales, field types and temporal units. Plot anchor requires `space:"plot"`, finite x/y in [0,1], optional
  existing data/coordinate, and ordinary `<id>-x`/`<id>-y` linear [0,1] scales. x=0 is left; y=0 is bottom.
- `text` is required constant content. Text style and format delegate to createTextMark/encodeText. Omitted/false layout
  preserves the anchor; a target-free layout object delegates to layoutLabels. Default ID is `annotation`.
- `rotation` uses the same `RotationInput` and radians normalization as Text and Mark Labels.
- Data datum contributes to automatic domains and is independent after creation. Mark anchor retains source-owned
  final-item lifecycle. Plot named scales remain ordinary editable resources. No nearest-mark search, hidden dataset,
  annotation registry, or editAnnotation action exists.
- The full lower chain is preflighted on a discarded immutable branch. Branch conflicts, ambiguous/incomplete source,
  missing axis, plot bounds, content/style/layout errors fail before child effects. Source-owned Text aliases are excluded
  from data-source inference.
- Later edits use encodeText, encodeX/Y, editTextMark, layoutLabels/removeLabelLayout, editScale and removeMark.

### Formal values — `createAnnotation`

- Implemented: `CreateAnnotationOptions = TextStyle & { id?: UserId; text: unknown; format?: TextFormat;
  layout?: false | Omit<LabelLayoutOptions,"target"> } & (MarkAnchor | DataAnchor | PlotAnchor)`.
- MarkAnchor: `{ source?: UserId; x?: never; y?: never; space?: never; data?: never; coordinate?: never }`.
- DataAnchor: `{ x: unknown; y: unknown; space?: "data"; source?: UserId; data?: never; coordinate?: never }`.
- PlotAnchor: `{ x: UnitInterval; y: UnitInterval; space: "plot"; source?: never; data?: UserId; coordinate?: UserId }`.
- Proposed (NOT IMPLEMENTED): nearest-mark search, a dedicated annotation registry, and an `editAnnotation` facade.

### Value coverage — `createAnnotation`

- ✅ Covered: explicit/inferred mark source and aggregate final grain; quantitative/category/time data binding;
  plot fractions, empty data, domain/reverse/Canvas replay, layout displacement/leader cleanup, lower edits/removal,
  option/type exclusivity, ambiguity, invalid child inputs, previous/caller immutability, lower/literal graphic and PNG parity.
- Evidence: `test/unit/actions/marks/annotation.test.js`, `test/contracts/annotation.test.js`, installed package/browser probes.

## `createTextMark`

- Signature: `createTextMark({ id?, data?, source?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})`.
- The first omitted ID resolves to `"text"`. Passing `data` explicitly creates an independent text layer; otherwise
  the current compatible point, bar, rect, rule, or complete arc layer, then one unique compatible layer, supplies data,
  coordinate, compatible position encodings, and a persisted semantic `source` relation.
- Explicit `source` selects an existing point/bar/rule/rect/arc with data, regardless of current mark or dataset.
  It is mutually exclusive with `data`. Invalid IDs, missing layers and unsupported source kinds reject before creation.
  An explicit source may be incomplete: content and appearance persist, no text items are created until its position is
  complete, and later source encoding actions materialize the labels. Automatic inference retains its existing eligibility.
  Source position reassignment, scale edits and position removal/restoration refresh attached labels through the persisted
  source relation, including when inherited encoding scale IDs differ from the source's current scale IDs.
  `source` is creation-only; `editTextMark` remains an appearance editor.
  Direct encodeX/Y on source-owned Text rejects before child effects: edit the source positions, use dx/dy, or create
  independent Text with explicit data. Inherited encodings are provenance, not independent position assignments.
- `text` is a constant-content shorthand for wrapped `encodeText({ value: text })`. Appearance options use wrapped
  `editTextMark`; defaults are theme text fill, opacity `1`, 12px sans-serif normal text, left/alphabetic alignment,
  zero rotation, and zero offsets.
- `rotation` accepts `RotationInput = Finite | { value: Finite; unit: "degrees" | "radians" }`. The legacy numeric
  form remains radians. Structured input must contain exactly `value` and `unit`; both forms normalize to radians in
  the stored materialization config.
- Concrete children are backend-neutral text primitives. A source-owned annotation anchors to final point centers,
  bar measure endpoints, rect centers, rule endpoints, or arc-sector radial/angular midpoints, so aggregate bars and arcs
  produce one label per final visual item rather than one per row. Arc anchors derive from concrete sector paths and replay
  after Canvas, scale, padding, and inner-radius changes.
  Layered mark/reference inference also excludes inherited source-owned Text aliases; the independent source supplies fresh bindings.
  Source-owned text never contributes independent scale values. Source field/category/time changes, scale rebinding,
  Canvas/detach plans and guide inference/rebinding ignore inherited label aliases and follow the actual source instead.
  Count, normalized and histogram domains therefore remain unchanged by labels. Position scale refresh defers attached
  labels until source geometry completes. Independent Text retains its own scale values and shared-guide constraints.
- Independent Text created with explicit data accepts field or datum on each x/y encoding. When x, y, and text are
  all constants, it materializes exactly one text item even for an empty or multi-row dataset. If any of those three
  encodings is field-bound, constant positions broadcast across that row grain. Datum values are normalized by the
  shared quantitative/temporal/nominal position grammar and participate in automatic scale domains.
- Collision avoidance is not automatic. Authors may preserve explicit placement or assign it afterward with
  `layoutLabels()`.

### Formal values — `createTextMark`

- Implemented: `createTextMark({ id?: UserId; data?: UserId; source?: UserId; text?: unknown; fill?: NonEmptyString; opacity?: UnitInterval; fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; align?: "left" | "right" | "center" | "start" | "end"; baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom"; rotation?: RotationInput; dx?: Finite; dy?: Finite } = {})`.
- Proposed (NOT IMPLEMENTED): interactive tooltips.

### Value coverage — `createTextMark`

- ✅ Covered: deterministic ID, explicit/inferred data, point/bar/rule/arc source inference, incomplete creation, constant
  content shorthand, independent field/datum position grain, explicit typography, offsets, ambiguity and invalid options.
- Evidence: `test/unit/actions/marks/text-mark.test.js`, `test/unit/actions/marks/text-source.test.js`, `test/unit/actions/marks/text-scale-ownership.test.js`,
  `test/unit/actions/marks/text-datum-position.test.js`, `test/contracts/source-text-scale.test.js`,
  `test/contracts/text-datum-position.test.js`, installed package runtime/type probes, and the annotated IMDb chart pair.

## `editTextMark`

- Signature: `editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })`.
- At least one property is required. Omitted properties preserve current immutable materialization config.
- Complete text rematerializes immediately; incomplete text retains the edit until position and content complete.
- `dx` and `dy` are final graphical offsets and never alter inherited semantic position or source geometry.
- `rotation` uses `RotationInput`; numeric input remains radians and explicit degree/radian objects normalize to radians.

### Formal values — `editTextMark`

- Implemented: the appearance subset and value vocabularies of `createTextMark`, plus optional inferred/explicit target.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editTextMark`

- ✅ Covered: target inference, typography/alignment/rotation/offset edits, Canvas and scale rematerialization,
  validation, empty edit, and earlier-program immutability.
- Evidence: `test/unit/actions/marks/text-mark.test.js`.

## `layoutLabels`

- Signature: `layoutLabels({ target?, axis?, padding?, maxDisplacement?, bounds?, leader? } = {})`.
- Assigns one complete graphical layout policy to an existing text mark. Omitted target resolves the current complete
  text mark, then one unique complete text mark; ambiguity and incomplete targets fail before state changes.
- Defaults are `axis: "both"`, `padding: 3`, `maxDisplacement: 48`, `bounds: "plot"`, and `leader: false`.
  `bounds: "canvas"` uses the concrete Canvas rectangle. `axis` constrains displacement to x, y, or both axes.
- Candidate enumeration is bounded for extreme inputs: it exhaustively searches at most 28 lattice steps per axis,
  then adds deterministic distant samples on 16 rings (32 angles for `both`, both directions for a single axis),
  and never searches beyond 1,000,000 logical pixels even when `maxDisplacement` is larger.
- The action rematerializes semantic base text, visits concrete items in stable order, and selects the first in-bounds
  zero-overlap candidate. If no candidate satisfies both constraints, it stores deterministic `overlap` or `bounds`
  warnings and the best-effort result rather than silently claiming success.
- A leader object enables target-owned line graphics from the stored source anchor to a displaced label. Its optional
  `stroke`, `strokeWidth`, `strokeDash`, and `opacity` use ordinary line vocabularies. Repeated assignment replaces the
  complete policy and recomputes from semantic base text.
- Text semantics and source relations do not change. Requested policy and latest resolution summary live at
  `materializationConfigs.labelLayouts[target]`; final text and leader geometry live in `graphicSpec`. Text, encoding,
  data, scale, source-mark, and Canvas rematerialization replays the policy exactly once after base text.

### Formal values — `layoutLabels`

- Implemented: `layoutLabels({ target?: UserId; axis?: "x" | "y" | "both"; padding?: NonNegativeFinite; maxDisplacement?: NonNegativeFinite; bounds?: "plot" | "canvas"; leader?: false | { stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: readonly NonNegativeFinite[]; opacity?: UnitInterval } } = {})`.
- Proposed (NOT IMPLEMENTED): global force simulation, guide/title collision layout, automatic margin expansion, and
  arbitrary nearby-mark source inference.

### Value coverage — `layoutLabels`

- ✅ Covered: target inference, complete-policy replacement, deterministic axis-constrained placement,
  bounded extreme-displacement enumeration, plot/Canvas bounds, leader geometry, impossible-layout warnings,
  state/trace ownership, replay, validation, and immutability, including exact public/primitive Canvas and Node PNG
  parity.
- Evidence: `test/unit/layout/labels.test.js`, `test/unit/actions/marks/label-layout.test.js`, and
  `test/charts/gapminder-country-labels/`.

## `removeLabelLayout`

- Signature: `removeLabelLayout({ target? } = {})`.
- Resolves only a text mark with an assigned label-layout policy. It removes the private policy and target-owned leader
  collection, then rematerializes semantic base text positions and typography.
- Removal does not change text semantics, its stored source relation, or unrelated graphics. Removing the owning mark
  also removes its policy and leader collection.

### Formal values — `removeLabelLayout`

- Implemented: `removeLabelLayout({ target?: UserId } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeLabelLayout`

- ✅ Covered: explicit and inferred ownership, base-position restoration, leader cleanup, mark cleanup,
  validation, trace, immutability, and exact public/primitive visual parity.
- Evidence: `test/unit/actions/marks/label-layout.test.js` and `test/charts/gapminder-country-labels/`.
