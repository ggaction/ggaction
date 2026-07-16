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
deterministic role ID `"point" | "line" | "bar" | "area" | "rule"`. A second mark of the same type requires an
explicit user ID; the library never invents numbered public-resource IDs. Explicit IDs retain the existing
validation and uniqueness contract.

## `createPointMark`

- Signature: `createPointMark({ id?, data?, shape? } = {})`
- `id`: Implemented optional 새 layer/graphic ID. 첫 unnamed point는 `"point"`; 동일 type이 이미 있으면 required다.
- `data`: Implemented, existing dataset ID. 생략하면 current data를 사용한다.
- `shape`
  - Status: Implemented. shared `PointShape` 12종, 기본값 `"circle"`.
  - Effect: semantic mark는 항상 `point`지만 concrete child는 circle, rect 또는 normalized path가 된다.
- Effect: dataset cardinality와 같은 길이의 point graphic collection을 만들며 아직 위치 property가
  없으므로 encoding 전에는 보이지 않을 수 있다.
- Coverage: `test/unit/actions/marks/create-point-mark.test.js`가 두 shape, empty data,
  multiple marks, inference, conflicts와 trace를 검증한다.

### Formal values — `createPointMark`

- Implemented: `createPointMark({ id?: UserId; data?: UserId; shape?: PointShape } = {})`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createPointMark`

- `id`, `data`
  - ✅ Covered: omission→`"point"`, current/explicit dataset, empty dataset, explicit multiple marks,
    second unnamed ambiguity, unknown data와 duplicate IDs.
- `shape`
  - ✅ Covered: 12-value vocabulary, omission→circle, equal-area normalized recipes and unknown rejection.
- Evidence: `test/unit/actions/marks/create-point-mark.test.js` and
  `test/unit/grammar/schemas/mark-schema.test.js`.

## `editPointMark`

- Implemented: immutable constant shape and appearance edits for existing point marks.
- Signature: `editPointMark({ target?, shape?, opacity?, stroke?, strokeWidth? })`.
- `target`은 existing point mark다. current compatible mark 또는 유일한 point mark로 infer하며
  ambiguity는 explicit target을 요구한다.
- `shape`은 shared `PointShape` 12종 중 하나다. Field-driven `encodeShape`가 있으면 constant shape
  edit와 충돌하므로 오류다.
- `opacity`는 `[0, 1]`, `stroke`는 non-empty color string, `strokeWidth`는 non-negative finite logical pixel이다.
- 최소 한 appearance property가 필요하며 omitted properties는 기존 stored config를 보존한다.
- Effect: mark materialization config를 갱신하고 wrapped `rematerializePointMark`로 concrete children을
  equal-area circle, rect 또는 path recipe로 교체한다. Semantic mark/data/encoding은 바꾸지 않는다.

### Formal values — `editPointMark`

- Implemented: `editPointMark({ target?: UserId; shape?: PointShape; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editPointMark`

- ✅ Covered: inferred/explicit target, all 12 shapes, equal target area and nested rematerialization trace.
- ✅ Covered: missing/unknown/ambiguous target, invalid shape, field-driven shape conflict and immutable failure.
- ✅ Covered: opacity/stroke/strokeWidth validation and persistence across position rematerialization.
- No proposal: fill, radius and field-driven opacity remain owned by their corresponding encoding actions.
- Evidence: `test/unit/actions/marks/edit-point-mark.test.js`.

## `createLineMark`

- Signature: `createLineMark({ id?, data?, strokeWidth?, curve? } = {})`
- `id`, `data`: `createPointMark`와 같은 ID/data 계약이다.
- `strokeWidth`: Implemented, non-negative finite number이며 concrete default는 `2`다. 명시한 값은
  mark materialization config에 저장되어 path 재생성 후에도 유지된다.
- `curve`: Implemented. `linear | step | step-before | step-after | basis | cardinal | monotone | natural`이며
  기본값은 `linear`다. Curve는 graphical materialization config이고 semantic field/scale/group을 바꾸지 않는다.
- Effect: semantic `line` layer와 길이 0의 path collection을 만든다. x/y encoding이 완성되기
  전에는 path가 없다.
- Coverage: `test/unit/actions/marks/create-line-mark.test.js`가 default/explicit data,
  empty dataset, invalid width와 conflicts를 검증한다.

### Formal values — `createLineMark`

- Implemented: `createLineMark({ id?: UserId; data?: UserId; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation } = {})`
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
- Evidence: `test/unit/actions/marks/create-line-mark.test.js`, `test/unit/grammar/curve-commands.test.js`,
  `test/charts/cars-line-chart/variants/capabilities.test.js`.

## `editLineMark`

- Signature: `editLineMark({ target?, strokeWidth?, curve? })`.
- `target`: existing line mark. Current compatible mark 또는 유일한 line mark로 infer하며 ambiguity는 explicit target을 요구한다.
- `strokeWidth`: non-negative finite number. 전달되면 stored line config와 every concrete series path를 갱신한다.
- `curve`: shared `CurveInterpolation`. Field, grouping, coordinates와 scale semantics를 유지한 채 commands를 다시 만든다.
- 최소 한 변경값이 필요하다. 아직 x/y encoding이 완성되지 않은 line은 config만 저장하고, complete line은 wrapped
  `rematerializeLineMark`를 호출한다.

### Formal values — `editLineMark`

- Implemented: `editLineMark({ target?: UserId; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation })`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editLineMark`

- ✅ Covered: explicit/current/unique target, stroke width zero/positive와 전체 curve vocabulary.
- ✅ Covered: empty edit, unknown option/target, ambiguity, invalid width/curve와 earlier-program immutability.
- ✅ Covered: Canvas resize, group rematerialization, deterministic nested trace and approved monotone primitive/public pair.
- Evidence: `test/unit/actions/marks/edit-line-mark.test.js` and
  `test/charts/cars-line-chart/variants/capabilities.test.js`.

## `createBarMark`

- Signature: `createBarMark({ id?, data? } = {})`
- `id`, `data`: 첫 unnamed bar의 deterministic `"bar"` 또는 explicit 새 ID와 optional existing/current data다.
- Effect: semantic `bar` layer와 길이 0의 rect collection을 만든다. 관련 x/y/grouping semantics가
  완성될 때 rect가 materialize된다.
- Coverage: `test/unit/actions/marks/create-bar-mark.test.js`가 inference, empty data,
  invalid options와 conflicts를 검증한다.

### Formal values — `createBarMark`

- Implemented: `createBarMark({ id?: UserId; data?: UserId } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBarMark`

- `id`, `data`
  - ✅ Covered: omission→`"bar"`, current/explicit/empty dataset, second unnamed ambiguity, invalid options와 conflicts.
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
  `test/charts/density-area/variants/primitive.test.js`.

## `createRuleMark`

- Signature: `createRuleMark({ id?, data? } = {})`.
- `id`: 첫 unnamed rule은 deterministic `"rule"`을 사용한다. 동일 type의 두 번째 rule은 explicit ID가
  필요하며 numbered public ID를 만들지 않는다.
- `data`: existing dataset ID. 생략하면 current dataset을 사용하며 안전한 current source가 없으면 오류다.
- Effect: semantic `rule` layer와 길이 0의 backend-neutral `line` collection을 만든다. 위치와 appearance는
  create parameter가 아니라 `encodeX/Y/X2/Y2`, `encodeStroke`, `encodeStrokeWidth`, `encodeStrokeDash`,
  `encodeOpacity`가 독립적으로 소유한다.
- Lifecycle: immutable create-only. `editRuleMark`는 없으며 endpoint/style 변경은 owning encode action을
  다시 호출한다.

### Formal values — `createRuleMark`

- Implemented: `createRuleMark({ id?: UserId; data?: UserId } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRuleMark`

- ✅ Covered: omitted ID→`"rule"`, current/explicit data, empty data, explicit multiple roles, second unnamed
  ambiguity, invalid ID/data/options와 graphic/layer conflict.
- ✅ Covered: empty line collection, default appearance config, immutable earlier program과 wrapped trace.
- Evidence: `test/unit/actions/marks/create-rule-mark.test.js` and
  `test/charts/cars-error-bar/primitive.test.js`.
