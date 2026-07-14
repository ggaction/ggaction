# Mark action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

```typescript
type PointShape =
  | "circle" | "square" | "diamond"
  | "triangle-up" | "triangle-down" | "triangle-left" | "triangle-right"
  | "plus" | "cross" | "star" | "hexagon" | "wye";
```

This closed vocabulary is owned by the shared point-shape grammar and reused by mark creation/editing,
shape encoding, concrete materialization, and legend symbols.

## `createPointMark`

- Signature: `createPointMark({ id, data?, shape? })`
- `id`: Implemented, 필수 새 layer/graphic ID.
- `data`: Implemented, existing dataset ID. 생략하면 current data를 사용한다.
- `shape`
  - Status: Implemented. shared `PointShape` 12종, 기본값 `"circle"`.
  - Effect: semantic mark는 항상 `point`지만 concrete child는 circle, rect 또는 normalized path가 된다.
- Effect: dataset cardinality와 같은 길이의 point graphic collection을 만들며 아직 위치 property가
  없으므로 encoding 전에는 보이지 않을 수 있다.
- Coverage: `test/unit/actions/marks/create-point-mark.test.js`가 두 shape, empty data,
  multiple marks, inference, conflicts와 trace를 검증한다.

### Formal values — `createPointMark`

- Implemented: `createPointMark({ id: UserId; data?: UserId; shape?: PointShape })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createPointMark`

- `id`, `data`
  - ✅ Covered: current/explicit dataset, empty dataset, multiple marks, unknown data와 duplicate IDs.
- `shape`
  - ✅ Covered: 12-value vocabulary, omission→circle, equal-area normalized recipes and unknown rejection.
- Evidence: `test/unit/actions/marks/create-point-mark.test.js` and
  `test/unit/grammar/schemas/mark-schema.test.js`.

## `editPointMark`

- Implemented: immutable constant-shape edits for existing point marks.
- Signature: `editPointMark({ target?, shape })`.
- `target`은 existing point mark다. current compatible mark 또는 유일한 point mark로 infer하며
  ambiguity는 explicit target을 요구한다.
- `shape`은 shared `PointShape` 12종 중 하나다. Field-driven `encodeShape`가 있으면 constant shape
  edit와 충돌하므로 오류다.
- Effect: mark materialization config를 갱신하고 wrapped `rematerializePointMark`로 concrete children을
  equal-area circle, rect 또는 path recipe로 교체한다. Semantic mark/data/encoding은 바꾸지 않는다.

### Formal values — `editPointMark`

- Implemented: `editPointMark({ target?: UserId; shape: PointShape })`.
- Planned (NOT IMPLEMENTED): additional independently editable point appearance properties are owned by
  their encoding actions rather than this surface.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editPointMark`

- ✅ Covered: inferred/explicit target, all 12 shapes, equal target area and nested rematerialization trace.
- ✅ Covered: missing/unknown/ambiguous target, invalid shape, field-driven shape conflict and immutable failure.
- No proposal: color, radius, size and opacity remain owned by their corresponding encoding actions.
- Evidence: `test/unit/actions/marks/edit-point-mark.test.js`.

## `createLineMark`

- Signature: `createLineMark({ id, data?, strokeWidth?, curve? })`
- `id`, `data`: `createPointMark`와 같은 ID/data 계약이다.
- `strokeWidth`: Implemented, non-negative finite number이며 concrete default는 `2`다. 명시한 값은
  mark materialization config에 저장되어 path 재생성 후에도 유지된다.
- Effect: semantic `line` layer와 길이 0의 path collection을 만든다. x/y encoding이 완성되기
  전에는 path가 없다.
- Coverage: `test/unit/actions/marks/create-line-mark.test.js`가 default/explicit data,
  empty dataset, invalid width와 conflicts를 검증한다.

### Formal values — `createLineMark`

- Implemented: `createLineMark({ id: UserId; data?: UserId; strokeWidth?: NonNegativeFinite })`
- Planned (NOT IMPLEMENTED): `{ curve?: CurveInterpolation }`; default는 `"linear"`이며 accepted 8-value vocabulary를 사용한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createLineMark`

- `id`, `data`
  - ✅ Covered: current/explicit/empty dataset, invalid IDs와 conflicts.
- `strokeWidth`
  - ✅ Covered: omission→`2`, zero, positive representative, negative/non-finite rejection.
- 🟡 Planned: 8-value curve grammar, graphical config persistence, concrete commands와 rematerialization parity.
- Evidence: `test/unit/actions/marks/create-line-mark.test.js`.

## `createBarMark`

- Signature: `createBarMark({ id, data? })`
- `id`, `data`: 필수 새 ID와 optional existing dataset/current data다.
- Effect: semantic `bar` layer와 길이 0의 rect collection을 만든다. 관련 x/y/grouping semantics가
  완성될 때 rect가 materialize된다.
- Coverage: `test/unit/actions/marks/create-bar-mark.test.js`가 inference, empty data,
  invalid options와 conflicts를 검증한다.

### Formal values — `createBarMark`

- Implemented: `createBarMark({ id: UserId; data?: UserId })`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBarMark`

- `id`, `data`
  - ✅ Covered: current/explicit/empty dataset, invalid options와 conflicts.
- No proposal: orientation/group/stack/width는 mark parameter가 아니라 encoding action이 소유한다.
- Evidence: `test/unit/actions/marks/create-bar-mark.test.js`.

## `createAreaMark`

- Signature: `createAreaMark({ id, data?, fill?, opacity?, stroke?, strokeWidth?, curve? })`
- `id`, `data`: 필수 새 ID와 optional existing/current dataset이다.
- `fill`: Implemented, non-empty color string. 기본값은 theme mark color `"#4c78a8"`다.
- `opacity`: Implemented, `[0, 1]` finite number. 기본값은 `0.2`다.
- `stroke`, `strokeWidth`: Planned. optional outline color와 non-negative width이며 stroke 없이
  width만 지정할 수 없다.
- Effect: semantic `area` layer와 빈 path collection을 만들고 fill/opacity는 graphical config에
  저장한다. ranged y 또는 density encoding이 완성되면 closed path를 만든다.
- Coverage: density/regression chart와 area materialization tests가 default와 representative
  appearance를 검증한다. fill vocabulary와 opacity 양 끝값의 direct action coverage는 부분적이다.

### Formal values — `createAreaMark`

- Implemented: `createAreaMark({ id: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval })`
- Planned (NOT IMPLEMENTED): `{ stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; curve?: CurveInterpolation }`; curve default는 `"linear"`다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createAreaMark`

- `id`, `data`
  - ✅ Covered: current/explicit derived dataset과 invalid resources through density/regression flows.
- `fill`
  - ⚠️ Partial: omission/theme default와 representative explicit color; empty/non-string rejection은 action
    validation에 있으나 dedicated boundary test가 부족하다.
- `opacity`
  - ⚠️ Partial: default `0.2`, representative `0.18`/`0.5`, invalid range; exact 0/1 endpoints direct test가 부족하다.
- 🟡 Planned: `stroke`, `strokeWidth`, no-outline default, 8-value curve grammar, edit removal와 rematerialization persistence.
- Evidence: area materialization, density and regression chart tests.
