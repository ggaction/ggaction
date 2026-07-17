# Grid action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared grid-direction contract

- `scale`: optional continuous scale ID; horizontal은 y, vertical은 x에서 유일하게 추론한다.
- `coordinate`: optional Cartesian coordinate ID; encoded layers에서 추론한다.
- `count`: positive integer, `values`와 mutually exclusive다.
- `values`: non-empty finite number array이며 scale domain 안에 있어야 한다.
- `color`: non-empty string, 기본 `"#e2e8f0"`.
- `lineWidth`: non-negative finite number, 기본 `1`.
- `strokeDash`: even-length non-negative finite number array, 기본 `[]`.
- Effect: semantic guide에는 scale/coordinate, graphical config에는 tick policy/style, concrete line
  collection에는 endpoints를 저장한다. 관련 mark보다 앞에 graphic을 배치한다.

## Shared formal types

```typescript
type GridDirectionOptions = {
  scale?: UserId;
  coordinate?: UserId;
  count?: PositiveInteger;
  values?: readonly Finite[];
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
};
type EditGridOptions = {
  count?: PositiveInteger;
  values?: readonly Finite[] | "auto";
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
};
```

## `createGrid`

- Signature: `createGrid({ horizontal?, vertical?, theta?, radial? })`.
- `horizontal`: boolean 또는 direction options, 기본 `true`.
- `vertical`: boolean 또는 direction options, 기본 `false`.
- `false`는 끄고 `true`/`{}`는 inference로 생성한다. 최소 한 방향이 필요하다.
- Coverage: `test/unit/actions/guides/grid-actions.test.js`가 default/both directions, tick reuse,
  explicit values, rendering order와 rematerialization을 검증한다.

### Formal values — `createGrid`

- Implemented: `createGrid({ horizontal?: boolean | GridDirectionOptions; vertical?: boolean | GridDirectionOptions } = {})`; horizontal default true, vertical default false.
- Proposed (NOT IMPLEMENTED): —; Polar-only default는 radial과 theta가 모두 enabled다.

### Value coverage — `createGrid`

- `horizontal`
  - ✅ Covered: omission→enabled, `true`, `{}`, option object, `false`.
- `vertical`
  - ✅ Covered: omission→disabled, `true`, `{}`, option object, `false`.
- Interaction
  - ✅ Covered: horizontal only, both directions, neither selected error, invalid non-object value.
- No proposal at aggregate level; future direction options belong to direction actions.
- Evidence: `test/unit/actions/guides/grid-actions.test.js`.

## Polar grid actions

`createThetaGrid`는 theta ticks를 center-to-edge spokes로, `createRadialGrid`는 positive radius ticks를
concentric closed paths로 만든다. 둘 다 mark보다 앞에 배치되며 shared grid style contract를 사용한다.

```typescript
createThetaGrid(options?: PolarGridOptions): ChartProgram;
createRadialGrid(options?: PolarGridOptions): ChartProgram;
editThetaGrid(options: EditPolarGridOptions): ChartProgram;
editRadialGrid(options: EditPolarGridOptions): ChartProgram;
```

- theta count 기본값 `6`, radius count 기본값 `5`; radial zero tick은 axis에는 남지만 degenerate circle은 만들지 않는다.
- Polar grid 기본 color는 approved `"#d7e0ea"`, lineWidth `1`, strokeDash `[]`다.
- `createGrid()`는 Polar-only program에서 radial과 theta grid를 모두 추론한다.
- `editGrid({ theta?, radial? })`와 `removeGrid({ theta?, radial? })`가 aggregate routing을 제공한다.
- Canvas/scale/encoding 변경은 wrapped rematerialization을 통해 geometry를 다시 계산한다.
- Evidence: `test/unit/actions/guides/polar-grid-actions.test.js`, `test/charts/polar-guides/`.

## `createThetaGrid`

### Formal values — `createThetaGrid`

- Implemented: `createThetaGrid(options?: PolarGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaGrid`

- ✅ Covered: inference, count/values, appearance, draw order and errors.
- No proposal; Evidence: `test/unit/actions/guides/polar-grid-actions.test.js`.

## `createRadialGrid`

### Formal values — `createRadialGrid`

- Implemented: `createRadialGrid(options?: PolarGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialGrid`

- ✅ Covered: inference, count/values, zero omission, paths and errors.
- No proposal; Evidence: `test/unit/actions/guides/polar-grid-actions.test.js`.

## `editThetaGrid`

### Formal values — `editThetaGrid`

- Implemented: `editThetaGrid(options: EditPolarGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaGrid`

- ✅ Covered: count/value replacement, appearance and rematerialization.
- No proposal; Evidence: Polar grid unit tests.

## `editRadialGrid`

### Formal values — `editRadialGrid`

- Implemented: `editRadialGrid(options: EditPolarGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialGrid`

- ✅ Covered: count/value replacement, appearance and rematerialization.
- No proposal; Evidence: Polar grid unit tests.

## `createHorizontalGrid`

- Signature: `createHorizontalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })`.
- Shared direction contract를 y scale에 적용한다.
- Coverage: grid tests; style boundary 조합은 부분적이다.

### Formal values — `createHorizontalGrid`

- Implemented: `createHorizontalGrid(options?: GridDirectionOptions)`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createHorizontalGrid`

- `scale`, `coordinate`: ✅ Covered inference, explicit IDs, ambiguity/unknown/non-Cartesian errors.
- `count`: ✅ Covered default/inferred 5, positive integer, invalid and values conflict.
- `values`: ✅ Covered axis-tick reuse, explicit finite in-domain values, invalid/out-of-domain.
- `color`: ✅ Covered default/explicit/invalid.
- `lineWidth`: ✅ Covered default, zero/positive/invalid.
- `strokeDash`: ✅ Covered `[]`, even-length pattern, odd/negative/non-finite rejection.
- No proposal: the current contract remains continuous/time and histogram-bin grid positioning.
- Evidence: `test/unit/actions/guides/grid-actions.test.js`.

## `createVerticalGrid`

- Signature는 horizontal과 같고 x scale을 사용한다.
- Coverage: grid와 density-guide tests; style boundary 조합은 부분적이다.

### Formal values — `createVerticalGrid`

- Implemented: `createVerticalGrid(options?: GridDirectionOptions)`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createVerticalGrid`

- direction parameters
  - ✅ Covered: x-scale inference, histogram bin alignment, explicit values/styles and invalid resources.
  - ⚠️ Partial: temporal vertical grid with calendar ticks.
- No proposal: the current contract remains continuous/time and histogram-bin grid positioning.
- Evidence: grid and density-guide tests.

## `editHorizontalGrid`

- Signature: `editHorizontalGrid({ count?, values?, color?, lineWidth?, strokeDash? })`.
- Existing horizontal grid가 필요하며 scale/coordinate binding은 편집할 수 없다.
- `count`는 explicit values를 제거하고 count mode를 사용한다. Finite `values`는 count를 제거하며,
  `values: "auto"`는 current axis/scale inference를 복원한다. `count`와 `values`는 mutually exclusive다.
- Style option은 전달한 property만 바꾸고 wrapped `rematerializeHorizontalGrid`가 concrete lines를
  완전히 다시 만든다. 최소 한 option이 필요하다.

### Formal values — `editHorizontalGrid`

- Implemented: `editHorizontalGrid(options: EditGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editHorizontalGrid`

- `count`, `values`: ✅ Covered count/value mode, `"auto"` restoration, conflict, invalid/out-of-domain values.
- `color`, `lineWidth`, `strokeDash`: ✅ Covered partial merge, representative values and invalid boundaries.
- Binding/rematerialization: ✅ Covered missing resource, stable semantic binding, wrapped trace, Canvas/scale
  action-order convergence and primitive/public graphic equivalence.
- Evidence: `test/unit/actions/guides/grid-edit-actions.test.js`.

## `editVerticalGrid`

- Signature와 behavior는 horizontal edit와 같으며 existing vertical grid와 x scale을 사용한다.
- Scale/coordinate binding을 유지하고 wrapped `rematerializeVerticalGrid`만 호출한다.

### Formal values — `editVerticalGrid`

- Implemented: `editVerticalGrid(options: EditGridOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editVerticalGrid`

- 모든 parameter class와 stable-binding rule은 horizontal과 동일하다.
- ✅ Covered: explicit values, wrapped trace, missing/unknown option과 shared validation classes.
- ⚠️ Partial: repeated auto→count→values→auto transition과 temporal vertical grid edit.
- Evidence: `test/unit/actions/guides/grid-edit-actions.test.js`.

## `editGrid`

- Signature: `editGrid({ horizontal?, vertical? })` where each selected direction is `EditGridOptions`.
- 최소 한 existing direction patch가 필요하다. Boolean은 removal과 혼동되므로 받지 않으며 direction
  binding은 leaf edit과 동일하게 유지한다.
- Effect: 모든 nested patch를 먼저 검증하고 wrapped `editHorizontalGrid`/`editVerticalGrid`를
  deterministic horizontal→vertical order로 호출한다.

### Formal values — `editGrid`

- Implemented: `editGrid(options: { horizontal?: EditGridOptions; vertical?: EditGridOptions })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editGrid`

- ✅ Covered: one/both directions, nested style/tick policy, child trace and immutable validation failure.
- Evidence: `test/unit/actions/guides/grid-edit-actions.test.js` and Roadmap 3 focused-editing Gate.

## `removeGrid`

- Signature: `removeGrid({ horizontal?, vertical? } = {})`.
- No options removes every existing direction. Explicit booleans select only `true` directions; an explicit
  false/false selection is invalid. Each selected direction removes semantic guide state, concrete lines and
  stored materialization config while preserving scales, coordinates and marks.

### Formal values — `removeGrid`

- Implemented: `removeGrid(options?: { horizontal?: boolean; vertical?: boolean })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeGrid`

- ✅ Covered: all-direction default, one-direction removal, false/false error, recreation and immutability.
- Evidence: `test/unit/actions/guides/remove-guides.test.js` and Roadmap 3 focused-editing Gate.
