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
  deterministic role ID `"point" | "line" | "bar" | "area" | "arc" | "rule" | "text"`. A second mark of the same type requires an
explicit user ID; the library never invents numbered public-resource IDs. Explicit IDs retain the existing
validation and uniqueness contract.

When `data` is omitted, every ordinary mark family uses one shared layered-inference policy. The current eligible
layer, otherwise one unique layer on the current dataset, may contribute its coordinate and compatible field-based
x/y encodings. The target mark re-resolves every candidate against its own position policy. A transform policy is
copied only when both source and target support the same final grain: an aggregate line layered over an aggregate
bar may inherit `mean`, while bin, stack, offset and grouped color layout are not copied into an incompatible recipe.
Incompatible field/scale pairs remain absent, and ambiguity is an error. Passing `data` explicitly opts into
independent assembly and does not inherit position encodings.

## `createPointMark`

- Signature: `createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})`
- `id`: Implemented optional 새 layer/graphic ID. 첫 unnamed point는 `"point"`; 동일 type이 이미 있으면 required다.
- `data`: Implemented, existing dataset ID. 생략하면 current data를 사용한다.
- `shape`
  - Status: Implemented. shared `PointShape` 12종, 기본값 `"circle"`.
  - Effect: semantic mark는 항상 `point`지만 concrete child는 circle, rect 또는 normalized path가 된다.
- `fill`, `opacity`, `stroke`, `strokeWidth`: Implemented creation-time appearance shorthand. 각각
  `editPointMark`와 같은 validation/config persistence를 사용하며 wrapped `editPointMark`로 적용한다.
  Field-driven color와 constant fill은 충돌한다.
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

- Implemented: `createPointMark({ id?: UserId; data?: UserId; shape?: PointShape; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite } = {})`
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
- `opacity`는 `[0, 1]`, `stroke`는 non-empty color string, `strokeWidth`는 non-negative finite logical pixel이다.
- 최소 한 appearance property가 필요하며 omitted properties는 기존 stored config를 보존한다.
- Effect: mark materialization config를 갱신하고 wrapped `rematerializePointMark`로 concrete items를
  equal-area circle, rect 또는 path recipe로 교체한다. Semantic mark/data/encoding은 바꾸지 않는다.

### Formal values — `editPointMark`

- Implemented: `editPointMark({ target?: UserId; shape?: PointShape; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editPointMark`

- ✅ Covered: inferred/explicit target, all 12 shapes, equal target area and nested rematerialization trace.
- ✅ Covered: missing/unknown/ambiguous target, invalid shape, field-driven shape conflict and immutable failure.
- ✅ Covered: fill/opacity/stroke/strokeWidth validation and persistence across position rematerialization;
  field-driven color conflict.
- No proposal: radius and field-driven opacity remain owned by their corresponding encoding actions.
- Evidence: `test/unit/actions/marks/edit-point-mark.test.js`.

## `removeMark`

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
  기본값은 `linear`다. Curve는 graphical materialization config이고 semantic field/scale/group을 바꾸지 않는다.
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
- `strokeWidth`: non-negative finite number. 전달되면 stored line config와 every concrete series path를 갱신한다.
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
  `editBarMark`와 동일한 validation/config persistence를 사용한다. Creation에서는 `stroke: false`를 받지 않는다.
- Coverage: `test/unit/actions/marks/create-bar-mark.test.js`가 inference, empty data,
  invalid options와 conflicts를 검증한다.

### Formal values — `createBarMark`

- Implemented: `createBarMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBarMark`

- `id`, `data`
  - ✅ Covered: omission→`"bar"`, current/explicit/empty dataset, second unnamed ambiguity, invalid options와 conflicts.
- `fill`, `opacity`, `stroke`, `strokeWidth`
  - ✅ Covered: representative combined creation, validation reuse, config persistence and grouped-bar rematerialization.
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

- Signature: `createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve? } = {})`
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

- Implemented: `createAreaMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createAreaMark`

- `id`, `data`
  - ✅ Covered: omission→`"area"`, current/explicit derived dataset, second unnamed ambiguity와 invalid resources.
- `fill`
  - ⚠️ Partial: omission/theme default와 representative explicit color; empty/non-string rejection은 action
    validation에 있으나 dedicated boundary test가 부족하다.
- `opacity`
  - ⚠️ Partial: default `0.2`, representative `0.18`/`0.5`, invalid range; exact 0/1 endpoints direct test가 부족하다.
- `stroke`, `strokeWidth`
  - ✅ Covered: omission/no outline, string with default/explicit/zero width, width-without-stroke rejection,
    edit replacement/removal and Canvas rematerialization persistence.
- `curve`
  - ✅ Covered: all 8 values, linear exact commands, cubic commands, horizontal independent-axis orientation,
    invalid token rejection, edit/rematerialization and immutability.
- Evidence: `test/unit/actions/marks/create-area-mark.test.js`, area materialization,
  `test/unit/actions/marks/edit-area-mark.test.js`, density and regression chart tests.

## `editAreaMark`

- Signature: `editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve? })`.
- `target`: existing area mark. Current compatible mark 또는 유일한 area mark를 infer하고 ambiguity는
  explicit target을 요구한다.
- `fill`, `opacity`: constant graphical appearance다. Field-driven color encoding이 있으면 fill edit는
  오류지만 opacity는 독립적으로 수정할 수 있다.
- `stroke`: non-empty string은 outline을 생성/교체하고 `false`는 outline과 stored width를 제거한다.
- `strokeWidth`: non-negative finite number. Width-only edit은 active outline을 요구한다.
- `curve`: shared 8-value interpolation. Complete area는 즉시 concrete commands를 다시 만든다.
- Effect: private mark config를 immutable하게 갱신하고 complete mark는 wrapped `rematerializeAreaMark`를
  호출한다. Data, encodings, scales와 coordinates는 바꾸지 않는다.

### Formal values — `editAreaMark`

- Implemented: `editAreaMark({ target?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`.
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
- Effect: creates semantic mark type `arc` and an empty path collection. Count theta alone completes a pie/donut;
  categorical theta plus quantitative radius completes equal-band radial sectors. Concrete output contains only closed
  `M/L/C/Z` commands and appearance properties.
- Multiple rows in one theta band use stable larger-first overlay order. A mapped outer radius equal to the inner
  baseline is omitted. Automatic radius range starts at `innerRadius * availableRadius`.

### Formal values — `createArcMark`

- Implemented: `createArcMark({ id?: UserId; data?: UserId; innerRadius?: number; padAngle?: NonNegativeFinite; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite } = {})`, where `0 <= innerRadius < 1`.
- Proposed (NOT IMPLEMENTED): explicit secondary theta/radius endpoints.

### Value coverage — `createArcMark`

- ✅ Covered: inferred/explicit ID and data, empty initial path collection, duplicate role ambiguity and immutable trace.
- ✅ Covered: count donut, categorical radial sectors, larger-first overlay, zero-radius omission and encoding order.
- ✅ Covered: representative inner radius, pad, fill/opacity/stroke/width defaults and invalid geometry.
- Evidence: `test/unit/actions/marks/create-arc-mark.test.js`, `test/unit/actions/marks/arc-mark.test.js`, and
  `test/unit/grammar/arcs.test.js`.

## `editArcMark`

- Signature: `editArcMark({ target?, innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth? })`.
- Target inference follows other focused mark editors. At least one edited property is required.
- Complete arcs rematerialize immediately; incomplete arcs retain the configuration until their encodings complete.
- Constant fill cannot replace a field-driven color encoding. Geometry edits re-resolve automatic radial ranges.

### Formal values — `editArcMark`

- Implemented: `editArcMark({ target?: UserId; innerRadius?: number; padAngle?: NonNegativeFinite; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editArcMark`

- ✅ Covered: inferred target, geometry/appearance persistence, Canvas and scale rematerialization, color conflict,
  invalid values and earlier-program immutability.
- Evidence: `test/unit/actions/marks/arc-mark.test.js`.

## `createRuleMark`

- Signature: `createRuleMark({ id?, data? } = {})`.
- `id`: 첫 unnamed rule은 deterministic `"rule"`을 사용한다. 동일 type의 두 번째 rule은 explicit ID가
  필요하며 numbered public ID를 만들지 않는다.
- `data`: existing dataset ID. 생략하면 current dataset을 사용하며 안전한 current source가 없으면 오류다.
- Effect: semantic `rule` layer와 길이 0의 backend-neutral `line` collection을 만든다. 위치와 appearance는
  create parameter가 아니라 `encodeX/Y/X2/Y2`, `encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`,
  `encodeOpacity`가 독립적으로 소유한다.
- Layered position provenance: omitted `data`로 compatible layer의 position을 상속하면 source와 inherited
  channel을 internal mark config에 기록한다. 이후 datum x 또는 y를 작성할 때 반대 primary channel만
  inherited이고 secondary endpoint가 없으면 그 inherited branch를 제거해 full-span rule을 만든다.
  Field endpoint는 orthogonal inherited channel을 보존해 interval을 구성하며, explicit `data`로 만든 rule은
  이 provenance 기반 정리를 적용하지 않는다.
- Lifecycle: immutable create-only. `editRuleMark`는 없으며 endpoint/style 변경은 owning encode action을
  다시 호출한다.

### Formal values — `createRuleMark`

- Implemented: `createRuleMark({ id?: UserId; data?: UserId } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRuleMark`

- ✅ Covered: omitted ID→`"rule"`, current/explicit data, empty data, explicit multiple roles, second unnamed
  ambiguity, invalid ID/data/options와 graphic/layer conflict.
- ✅ Covered: empty line collection, default appearance config, immutable earlier program과 wrapped trace.
- Evidence: `test/unit/actions/marks/create-rule-mark.test.js`,
  `test/contracts/rule-inherited-datum-span.test.js`, and `test/charts/cars-error-bar/primitive.test.js`.

## `createRectMark`

- Signature: `createRectMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth? } = {})`.
- The first omitted ID resolves to `"rect"`. Data is explicit or inferred from the current dataset; a newly layered
  rect may inherit one unique compatible Cartesian source's data, coordinate, and position encodings.
- Rect is a distinct semantic mark. It materializes either two discrete band positions (`x` and `y`) or two complete
  continuous endpoint pairs (`x`/`x2` and `y`/`y2`). It never receives bar aggregation, baseline, stacking, or width
  semantics implicitly. Incomplete position intent remains an empty concrete rect collection.
- Discrete mode creates one full-band cell for every complete observed row. Ranged mode maps both endpoint pairs and
  normalizes them into positive concrete bounds. Missing values omit only their own cell and do not extend automatic
  scale domains. Continuous or categorical `encodeColor` owns field-driven fill.
- Defaults are theme mark fill, opacity `1`, white stroke, and stroke width `1`. Explicit creation styles delegate to
  `editRectMark` and are preserved through scale, Canvas, data, selection, and highlight rematerialization.

### Formal values — `createRectMark`

- Implemented: `createRectMark({ id?: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString | false; strokeWidth?: NonNegativeFinite } = {})`.
- Proposed (NOT IMPLEMENTED): categorical cell completion and automatic missing-cell placeholders.

### Value coverage — `createRectMark`

- ✅ Covered: deterministic ID/data, discrete and ranged topology, encoding order independence, missing rows, continuous
  color, rect-source text, selection/highlight, Canvas rendering, exact approved primitive/public/PNG equivalence.
- Evidence: `test/unit/actions/marks/rect-mark.test.js` and
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

## `createTextMark`

- Signature: `createTextMark({ id?, data?, text?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? } = {})`.
- The first omitted ID resolves to `"text"`. Passing `data` explicitly creates an independent text layer; otherwise
  the current compatible point, bar, rect, or rule layer, then one unique compatible layer, supplies data, coordinate,
  Cartesian position encodings, and a persisted semantic `source` relation.
- `text` is a constant-content shorthand for wrapped `encodeText({ value: text })`. Appearance options use wrapped
  `editTextMark`; defaults are theme text fill, opacity `1`, 12px sans-serif normal text, left/alphabetic alignment,
  zero rotation, and zero offsets.
- Concrete children are backend-neutral text primitives. A source-owned annotation anchors to final point centers,
  bar measure endpoints, rect centers, or rule endpoints, so aggregate bars produce one label per final bar rather than one per row.
- Collision avoidance is intentionally not automatic. Authors control filtering, alignment, rotation, `dx`, and `dy`.

### Formal values — `createTextMark`

- Implemented: `createTextMark({ id?: UserId; data?: UserId; text?: unknown; fill?: NonEmptyString; opacity?: UnitInterval; fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; align?: "left" | "right" | "center" | "start" | "end"; baseline?: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom"; rotation?: Finite; dx?: Finite; dy?: Finite } = {})`.
- Proposed (NOT IMPLEMENTED): automatic collision avoidance and interactive tooltips.

### Value coverage — `createTextMark`

- ✅ Covered: deterministic ID, explicit/inferred data, point/bar/rule source inference, incomplete creation, constant
  content shorthand, explicit typography, offsets, ambiguity and invalid options.
- Evidence: `test/unit/actions/marks/text-mark.test.js` and the annotated IMDb Gate pair.

## `editTextMark`

- Signature: `editTextMark({ target?, fill?, opacity?, fontSize?, fontFamily?, fontWeight?, align?, baseline?, rotation?, dx?, dy? })`.
- At least one property is required. Omitted properties preserve current immutable materialization config.
- Complete text rematerializes immediately; incomplete text retains the edit until position and content complete.
- `dx` and `dy` are final graphical offsets and never alter inherited semantic position or source geometry.

### Formal values — `editTextMark`

- Implemented: the appearance subset and value vocabularies of `createTextMark`, plus optional inferred/explicit target.
- Proposed (NOT IMPLEMENTED): automatic placement and collision editing.

### Value coverage — `editTextMark`

- ✅ Covered: target inference, typography/alignment/rotation/offset edits, Canvas and scale rematerialization,
  validation, empty edit, and earlier-program immutability.
- Evidence: `test/unit/actions/marks/text-mark.test.js`.
