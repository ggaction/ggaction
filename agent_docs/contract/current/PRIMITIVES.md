# Primitive action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## `editSemantic`

- Signature: `editSemantic({ property, value }) | editSemantic({ property, remove: true })`.
- `property`: 필수 supported semantic path string. user ID selector는 `dataset[id]`, `layer[id]`,
  `scale[id]`, `coordinate[id]`; system guide keys는 `guide.axis.x` 같은 closed path를 사용한다.
- `value`: selected path schema에 맞는 scalar, object 또는 array. caller-owned nested value를 복사/freeze한다.
  position encoding과 `encoding.color.aggregate`는 accepted scalar aggregate token과 parameterized quantile/ordered object를
  primitive authoring state로 저장할 수 있다. 이 primitive validation은 aggregate 계산이나 graphical
  materialization을 수행하지 않는다.
- `remove`: `true`일 때 value 대신 supported encoding channel 또는 legend branch를 삭제하고 empty
  parent object를 prune한다. Dataset state는 삭제할 수 없다.
- Effect: 해당 path만 structural copy하고 기존 program을 보존한다. path가 dataset/layer/scale/coordinate를
  가리키면 current context를 내부적으로 갱신할 수 있다. graphic rematerialization은 자동으로 하지 않는다.
- 오류: unknown path, closed vocabulary 위반, invalid transform/scale/guide value, existing source dataset
  values 교체를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-semantic.test.js`가 structural copy, ownership,
  dataset immutability, path/schema validation과 trace summary를 검증한다.

### Formal values — `editSemantic`

- Implemented: `editSemantic({ property: SemanticPropertyPath; value: ValueForSemanticPath<typeof property> }) | editSemantic({ property: RemovableSemanticPath; remove: true })`; assignment와 removal은 mutually exclusive다.
- Proposed (NOT IMPLEMENTED): —
- Maybe Future (NOT IMPLEMENTED): wildcard path, multi-property object 또는 batch edit.

### Value coverage — `editSemantic`

- `property`
  - ✅ Covered: supported dataset/layer/encoding/scale/coordinate/guide/title paths, user IDs, unknown path rejection.
  - ⚠️ Partial: every supported leaf path does not yet have one direct primitive case.
  - Maybe Future: wildcard/batch paths; current primitive remains one-property-per-action by design.
- `value`
  - ✅ Covered: scalar, nested object/array ownership, closed vocabulary/schema validation, trace summarization.
  - ✅ Covered: scalar aggregate vocabulary, quantile probability, ordered first/last options와 invalid forms.
  - ✅ Covered: source dataset values cannot be replaced.
  - ⚠️ Partial: every transform schema leaf and every guide semantic leaf direct coverage.
- Effect
  - ✅ Covered: structural copy and context inference without automatic graphic compilation.
  - ✅ Covered: encoding/legend branch removal, empty-parent pruning, idempotence와 dataset immutability.
- Evidence: `test/unit/actions/primitives/edit-semantic.test.js`.

## `createGraphics`

- Signature: `createGraphics({ id, type, length?, before?, after? })`.
- `id`: 필수 새 top-level graphic ID. equivalent repeated definition은 idempotent하다.
- `type`: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"`.
- `length`: non-negative integer. homogeneous drawable type에 지정하면 generated child collection을 만들며
  생략 시 single graphic, `0`이면 empty collection이다. heterogeneous `collection`은 children edit로 채운다.
- `before`, `after`: existing top-level graphic ID; mutually exclusive다. concrete rendering order를
  명시하며 Canvas 앞 배치는 허용하지 않는다.
- Effect: backend-neutral concrete object와 order를 structural copy로 추가한다. visual property는 아직 없다.
- 오류: invalid ID/type/length, conflicting repeated definition/placement, unknown anchor를 거부한다.
- Coverage: `test/unit/actions/primitives/create-graphics.test.js`가 all creation modes, idempotence,
  placement와 invalid definitions를 검증한다.

### Formal values — `createGraphics`

- Implemented: `createGraphics({ id: UserId; type: "canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"; length?: NonNegativeInteger; before?: UserId; after?: UserId })`; `before | after` 중 최대 하나.
- Planned (NOT IMPLEMENTED): `{ parent?: UserId }` for backend-neutral graphic-tree attachment.
- Proposed (NOT IMPLEMENTED): —
- Maybe Future (NOT IMPLEMENTED): renderer-specific `svg | g` graphic types.

### Value coverage — `createGraphics`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicts.
- `type`
  - ✅ Covered: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"` creation paths.
  - ✅ Covered: unknown type rejection.
  - Maybe Future: renderer-specific `svg/g`; current contract adds only backend-neutral primitives needed by multiple actions.
- `length`
  - ✅ Covered: omitted single, zero empty, positive collection, invalid negative/non-integer and resize transition.
- `before`, `after`
  - ✅ Covered: each placement, mutual exclusion, unknown anchor, Canvas-before restriction, idempotent/conflicting placement.
- 🟡 Planned: collection/Canvas parent attachment, sibling ordering, global target lookup and depth-first rendering.
- Evidence: `test/unit/actions/primitives/create-graphics.test.js`.

## `editGraphics`

- Signature: `editGraphics({ target, property, value }) | editGraphics({ target, remove: true })`.
- `target`: existing top-level graphic ID 또는 generated child ID(`points:1`).
- `property`: selected graphic type가 지원하는 concrete property. 공통 opaque style bag은 허용하지 않는다.
- `value`
  - single graphic: property schema에 맞는 scalar, nested array 또는 object.
  - collection + scalar/non-distributed value: compatible children 모두에 broadcast.
  - collection + outer array: child count와 길이가 같으면 index별 distribute. path `points`처럼 property
    자체가 nested array인 경우 한 child value 단위를 보존한다.
  - `children`: heterogeneous collection의 typed child object array를 원자적으로 교체한다.
- `remove`: `true`일 때 property/value 없이 top-level graphic 전체와 render order entry를 삭제한다.
  Generated child의 독립 삭제는 허용하지 않는다.
- Effect: concrete graphic path만 structural copy한다. semantic state나 automatic compiler는 관여하지 않는다.
- 오류: unknown target/property, incompatible child type, mismatched distributed length, non-finite geometry,
  negative dimensions/strokes, opacity 밖의 값과 invalid Canvas text vocabulary를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-graphics.test.js`와
  `test/contracts/shared-graphic-validation.test.js`가 distribution, broadcast, nested paths,
  heterogeneous children, resize, structural copy와 renderer-shared validation을 검증한다.

### Formal values — `editGraphics`

- Implemented: assignment `editGraphics({ target: UserId | GeneratedChildId; property: GraphicPropertyForTarget; value: GraphicValueForProperty })` 또는 top-level removal `editGraphics({ target: UserId; remove: true })`; 두 mode는 mutually exclusive다.
- Planned (NOT IMPLEMENTED): path `{ property: "commands"; value: readonly ConcretePathCommand[] }` after the atomic points-to-commands migration.
- Proposed (NOT IMPLEMENTED): —
- Maybe Future (NOT IMPLEMENTED): multi-property dictionary/batch edit.

### Value coverage — `editGraphics`

- `target`
  - ✅ Covered: top-level ID, generated child ID, unknown target.
  - ✅ Covered: top-level removal과 order cleanup, generated child removal rejection.
- `property`
  - ✅ Covered: type-specific canvas/circle/rect/line/text/path properties, `length`, heterogeneous `children`.
  - ⚠️ Partial: every valid property does not yet have all boundary classes in direct primitive tests.
  - 🟡 Planned: finite `M | L | C | Z` path command arrays and command-order validation.
- `value` distribution
  - ✅ Covered: scalar broadcast, outer array distribution, mismatched length, nested points arrays preserved,
    heterogeneous child replacement and shared compatible-property broadcast.
- concrete value classes
  - ✅ Covered: finite geometry, non-negative dimensions/strokes, `[0,1]` opacity, non-empty appearance strings,
    Canvas text vocabulary and renderer-shared validation.
  - ⚠️ Partial: extreme finite magnitudes and every fontWeight/string color accepted by each backend.
- Maybe Future: multi-property dictionary/batch edit; current action continues to represent one property change.
- Evidence: `test/unit/actions/primitives/edit-graphics.test.js`,
  `test/contracts/shared-graphic-validation.test.js`.
