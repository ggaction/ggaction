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
- `remove`: `true`일 때 value 대신 supported encoding channel, legend branch 또는 complete layer resource를
  삭제하고 empty parent object를 prune한다. Source dataset은 삭제할 수 없고 unreferenced derived dataset만
  complete resource removal을 허용한다. Unreferenced scale container도 제거할 수 있고 resolvedScales/currentScale을 정리한다.
  Layer/guide/parallel reference가 남은 scale은 오류이며 graphics는 이 primitive가 변경하지 않는다.
- Series policy leaves: `layer[id].layout.mode`는 group/stack/fill/overlay/diverging/center,
  `layer[id].mark.missing`은 error/break, `layer[id].encoding.group.inferredFrom`은 color/offset이다.
  `layer[id].layout` container 제거를 지원한다. 이 primitive 저장은 layout·path segmentation을 실행하지 않는다.
- Measured radial primitive leaves: `scale[id].radialMapping`은 `area | radius-length`,
  `layer[id].encoding.radius.aggregate`는 기존 aggregate vocabulary를 저장한다. Materialization은
  measured Arc에서 count/sum, equal-angle categorical theta, nonnegative finite aggregate와 positive maximum,
  zero-based linear domain, increasing radius range 및 padAngle 0을 요구한다. Count는 field를 저장하지 않는다.
  이 leaves의 저장 자체는 graphics를 바꾸지 않으며 후속 scale/Arc materialization이 같은 mapper를 사용한다.
  일반 `encodeR` mapping 옵션과 Rose/Radial facade는 Current다.
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
  - ✅ Covered: schema-family table covers dataset/layer/encoding/scale/coordinate/guide/title leaves; representative
    direct paths prove structural ownership without duplicating every domain action case.
  - Maybe Future: wildcard/batch paths; current primitive remains one-property-per-action by design.
- `value`
  - ✅ Covered: scalar, nested object/array ownership, closed vocabulary/schema validation, trace summarization.
  - ✅ Covered: scalar aggregate vocabulary, quantile probability, ordered first/last options와 invalid forms.
  - ✅ Covered: source dataset values cannot be replaced.
  - ✅ Covered: transform/guide schema validation is exercised through shared semantic validation and owning domain
    actions; primitive tests prove the same validator and immutable path transition are used.
- Effect
  - ✅ Covered: structural copy and context inference without automatic graphic compilation.
  - ✅ Covered: encoding/legend branch와 complete layer removal, empty-parent pruning, idempotence와 dataset
    immutability.
- Radial evidence: `test/unit/grammar/measured-radius.test.js`, `test/unit/actions/marks/measured-arc-primitives.test.js`.
- Evidence: `test/unit/actions/primitives/edit-semantic.test.js`, `test/unit/actions/primitives/series-policy-state.test.js`.

## `createGraphics`

- Signature: `createGraphics({ id, type, length?, parent?, before?, after? })`.
- `id`: 필수 global graphic ID. tree depth와 무관하게 unique하며 equivalent repeated definition과
  attachment는 idempotent하다.
- `type`: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"`.
- `length`: `0..10,000` integer. homogeneous drawable type에 지정하면 generated `items`를 만들며
  생략 시 single graphic, `0`이면 empty collection이다. heterogeneous `collection`은 `items` edit로 채운다.
- `parent`: optional existing `canvas | collection` ID. 지정하면 새 named graphic을 parent의 direct
  `children` ID list에 붙인다. 생략하면 top-level `order`에 둔다.
- `before`, `after`: 같은 parent의 direct sibling ID; mutually exclusive다. top-level에서는 Canvas 앞
  배치를 허용하지 않는다.
- Effect: backend-neutral concrete object와 structural attachment/order를 structural copy로 추가한다.
  Attachment는 좌표 변환, clipping 또는 layout을 암시하지 않는다.
- 오류: invalid ID/type/length, second Canvas, conflicting repeated definition/attachment/placement,
  self/unknown/non-container parent, cross-parent anchor를 거부한다. Reparent는 지원하지 않는다.
- Coverage: `test/unit/actions/primitives/create-graphics.test.js`가 all creation modes, idempotence,
  placement, attachment immutability와 invalid definitions를 검증하고,
  `test/unit/renderers/canvas-renderer.test.js`가 invalid stored tree rejection을 검증한다.

### Formal values — `createGraphics`

- Implemented: `createGraphics({ id: UserId; type: "canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"; length?: NonNegativeInteger; parent?: UserId; before?: UserId; after?: UserId })`; `before | after` 중 최대 하나이며 anchor는 같은 parent의 direct sibling이다.
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
  - ✅ Covered: top-level/nested sibling placement, mutual exclusion, unknown/cross-parent anchor, Canvas-before restriction,
    idempotent/conflicting placement.
- `parent`
  - ✅ Covered: Canvas/collection attachment, global lookup, nested sibling order, invalid parent and immutable updates.
  - ✅ Covered: depth-first renderer traversal, duplicate/cycle/orphan rejection.
- Evidence: `test/unit/actions/primitives/create-graphics.test.js`,
  `test/unit/renderers/canvas-renderer.test.js`,
  `test/contracts/graphic-hierarchy-migration.test.js`,
  `test/contracts/graphic-tree-equivalence.test.js`.

## `editGraphics`

- Signature: `editGraphics({ target, property, value }) | editGraphics({ target, remove: true })`.
- `target`: tree 어디에 있는 existing named graphic ID 또는 generated item ID(`points:1`).
- `property`: selected graphic type가 지원하는 concrete property. 공통 opaque style bag은 허용하지 않는다.
- `value`
  - single graphic: property schema에 맞는 scalar, nested array 또는 object.
  - collection + scalar/non-distributed value: compatible items 모두에 broadcast.
  - collection + outer array: item count와 길이가 같으면 index별 distribute. path `commands`처럼 property
    자체가 nested array인 경우 한 item value 단위를 보존한다.
  - `items`: heterogeneous collection의 typed concrete item array를 원자적으로 교체하며 최대 길이는
    `10,000`이다.
- `remove`: `true`일 때 property/value 없이 named graphic과 owned named subtree를 삭제하고 parent의
  `children` 또는 top-level `order`에서 detach한다. Canvas root와 generated item의 독립 삭제는 허용하지 않는다.
- Effect: concrete graphic path만 structural copy한다. semantic state나 automatic compiler는 관여하지 않는다.
- 오류: unknown target/property, incompatible child type, `length`/`items` cardinality `10,000` 초과,
  mismatched distributed length, non-finite geometry,
  negative dimensions/strokes, opacity 밖의 값과 invalid Canvas text vocabulary를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-graphics.test.js`와
  `test/contracts/shared-graphic-validation.test.js`가 distribution, broadcast, nested paths,
  heterogeneous items, subtree removal, resize, structural copy와 renderer-shared validation을 검증한다.

### Formal values — `editGraphics`

- Implemented: assignment `editGraphics({ target: UserId | GeneratedItemId; property: GraphicPropertyForTarget; value: GraphicValueForProperty })` 또는 named-subtree removal `editGraphics({ target: UserId; remove: true })`; 두 mode는 mutually exclusive다.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —
- Maybe Future (NOT IMPLEMENTED): multi-property dictionary/batch edit.

### Value coverage — `editGraphics`

- `target`
  - ✅ Covered: top-level/nested ID, generated item ID, unknown target.
  - ✅ Covered: top-level/nested subtree removal과 attachment cleanup, Canvas/generated item removal rejection.
- `property`
  - ✅ Covered: type-specific canvas/circle/rect/line/text/path properties, `length`, heterogeneous `items`.
  - ✅ Covered: the shared concrete-property schema is table-tested by type and `editGraphics` exercises single,
    broadcast, distributed and heterogeneous application paths.
  - ✅ Covered: finite `M | L | C | Z` path command arrays, maximum 10,000 commands, and command-order validation.
- `value` distribution
  - ✅ Covered: scalar broadcast, outer array distribution, mismatched length, nested points arrays preserved,
    heterogeneous item replacement and shared compatible-property broadcast.
- concrete value classes
  - ✅ Covered: finite geometry, non-negative dimensions/strokes, `[0,1]` opacity, non-empty appearance strings,
    Canvas text vocabulary and renderer-shared validation.
  - ✅ Covered: finite/non-negative/unit-interval boundaries and font/text vocabularies are shared with renderers.
    Exhaustive backend parsing of arbitrary accepted color strings is outside library validation. Renderer output
    capacity is checked separately and atomically: Canvas/PNG enforce physical side and total-pixel limits; all
    Canvas-backed outputs cap native geometry/style magnitude at `16777216`; PDF additionally requires an exactly
    representable positive integer page size; SVG retains finite-number geometry and rejects XML-forbidden scalars.
- Maybe Future: multi-property dictionary/batch edit; current action continues to represent one property change.
- Evidence: `test/unit/actions/primitives/edit-graphics.test.js`,
  `test/contracts/shared-graphic-validation.test.js`, and
  `test/unit/grammar/path-commands.test.js`.

Measured radius의 양수 값이 수치 정밀도 때문에 inner radius와 구별되지 않으면 오류다. 양수 sector를 조용히 생략하거나 epsilon 값으로 대체하지 않는다.
