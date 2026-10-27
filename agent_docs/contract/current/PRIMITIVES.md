# Primitive action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

세 primitive의 최상위 option object는 closed key 검증을 공유하며 unknown key를 거부한다.
`dataset[id].values`는 dense plain-row array만 받고 함수·class instance·cycle을 저장하지 않는다.
외부 함수가 extension 실행 인자라면 trace는 함수 자체 대신 lightweight type summary를 보관한다.
공통 검증 근거는 `test/contracts/input-boundaries.test.js`다.

## `editSemantic`

- Signature: `editSemantic({ property, value }) | editSemantic({ property, remove: true })`.
- `property`: 필수 supported semantic path string. user ID selector는 `dataset[id]`, `layer[id]`,
  `scale[id]`, `coordinate[id]`; system guide keys는 `guide.axis.x` 같은 closed path를 사용한다.
- `value`: selected path schema에 맞는 scalar, object 또는 array. caller-owned nested value를 복사/freeze한다.
  position encoding과 `encoding.color.aggregate`는 accepted scalar aggregate token과 parameterized quantile/ordered object를
  primitive authoring state로 저장할 수 있다. 이 primitive validation은 aggregate 계산이나 graphical
  materialization을 수행하지 않는다.
- `remove`: `true`일 때 value 대신 supported encoding channel, legend branch 또는 complete layer resource를
  삭제하고 empty parent object를 prune한다. Full primitive는 complete source dataset과 coordinate container도
  제거할 수 있으며 이 두 경로는 named-resource registry의 전체 live-reference 검사를 사용한다. Source values의
  생성 후 수정·부분 삭제는 계속 거부한다. Unit derived dataset의 기존 primitive removal은 semantic layer/source
  reference를 검사하고, configuration/graphics 수명주기는 owning domain action이 조정한다. Scale container removal은
  semantic references를 검사하고 resolvedScales/currentScale을 정리한다. Coordinate/currentData pointer도 삭제된 실제
  ID를 가리키면 unset한다. Facet parent는 title과 전체 참조 검사에 통과한 named-resource removal만 허용한다.
  그래픽은 변경하지 않는다. Basic 내부 primitive에는 Full resource-removal policy dependency를 포함하지 않는다.
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

### Typed resource lifecycle

`resource[persistent-selection:id]`는 complete resource assignment와 removal을 지원한다.
resource의 kind+id는 path와 같아야 하고 생성 revision은 0, 교체는 이전 revision+1이다.
`algorithmVersion: "1"`, ownership, typed inputs, closed options/result, provenance를 검증한다.
현재 지원 kind는 persistent-selection뿐이다. Options는 predicate 또는 logicalDataId+rowKeys이며
result는 빈 object다. 정확한 stored shape는 `PersistentSelectionResource` declaration이 소유한다.
입력 revision 오류·cycle·중복 ID는 원자적으로 거부한다. 기존 dependent resource와 selection consumer의
revision ref를 같은 transaction에서 갱신한다. remove는 live consumer가 있으면 거부한다.
자동 graphical materialization은 하지 않는다. Evidence: `test/unit/core/resource-state.test.js`.

### Formal values — `editSemantic`

- Implemented: `editSemantic(options: EditSemanticOptions): ChartProgram`; property string은 runtime의 supported path vocabulary로 검증하며 assignment와 removal은 mutually exclusive다.
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
  - ✅ Covered: source/coordinate 전체 삭제와 current pointer 정리, live reference 거부, Basic dependency 경계.
- Radial evidence: `test/unit/grammar/measured-radius.test.js`, `test/unit/actions/marks/measured-arc-primitives.test.js`.
- Evidence: `test/unit/actions/primitives/edit-semantic.test.js`, `test/unit/actions/primitives/series-policy-state.test.js`.

## `createGraphics`

- Signature: `createGraphics({ id, type, length?, parent?, before?, after? })`.
- `id`: 필수 global graphic ID. tree depth와 무관하게 unique하며 equivalent repeated definition과
  attachment는 idempotent하다.
- `type`: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"`.
- `length`: 일반 graphic은 `0..10,000` integer. semantic point layer와 selected materialized
  dataset 및 graphic ID/type의 소유권이 증명된 circle/rect/path/collection만 50,000 inclusive다.
  retained child의 namespace도 실제 child owner까지 추적한다. 우회 flag나 trace 문자열은 사용하지 않는다.
  homogeneous drawable type에 지정하면 generated `items`를 만들며
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

`layer[id].mark.blend`는 bar에만 optional `"difference"`를 저장하고 leaf 제거로
normal로 돌아간다. Concrete rect/path만 optional `blend:"difference"`를 받는다.
생략은 source-over이며 collection, circle, line, text와 explicit normal/unknown enum은
거부한다. 각 glyph의 fill+outline source를 한 번 합성한다. 저장/renderer는 같은
closed grammar로 검증하며 backend state를 프로그램에 저장하지 않는다.

Concrete rectangle의 outline은 네 모서리 모두 closed join을 갖는다. Canvas의
단순 lineTo 복귀는 이를 대신하지 않는다. `test/contracts/rect-outline.test.js`가
세 join과 세 cap의 전체 RGBA를 독립 native rectangle과 정확히 대조한다.

## `editGraphics`

- Signature: `editGraphics({ target, property, value }) | editGraphics({ target, remove: true })`.
- `target`: assignment는 existing named graphic ID 또는 generated item ID(`points:1`). Removal은 named ID 하나 또는 비어 있지 않은 named ID 배열이다. 배열은 atomic하게 검증하며 중복·중첩 subtree는 한 번만 제거한다. 하나라도 unknown/generated item/root Canvas이면 전체 요청을 거부한다.
- `property`: selected graphic type가 지원하는 concrete property. 공통 opaque style bag은 허용하지 않는다.
- `value`
  - single graphic: property schema에 맞는 scalar, nested array 또는 object.
  - collection + scalar/non-distributed value: compatible items 모두에 broadcast.
  - collection + outer array: item count와 길이가 같으면 index별 distribute. path `commands`처럼 property
    자체가 nested array인 경우 한 item value 단위를 보존한다.
  - `items`: heterogeneous collection의 typed concrete item array를 원자적으로 교체하며 최대 길이는
    일반 graphic은 `10,000`, 위에서 정의한 point-owned collection만 `50,000`이다.
- `children`: named Canvas/collection의 기존 직접 자식 ID의 정확한 순열을 편집한다. 기존 ID·parent·property·items·clip·object 선언 순서와 root order는 유지한다. 누락/추가/중복/다른 parent/비문자열과 generated item/drawable owner는 거부한다. 빈 container의 `[]`와 동일 순열도 허용한다. Caller array와 이전 상태는 불변이다. 실제 `children` field를 편집하며 property bag에 저장하지 않는다. Evidence: `test/unit/actions/primitives/graphic-child-order.test.js`.
- `clip`: named non-Canvas owner의 node-level rectangle 또는 compound path를 편집한다. `value: {type:"path",commands,fillRule?}`는 아래 path grammar를 공유하며 fill 영역으로만 clip한다. `value: {x,y,width,height}`는 finite x/y와 nonnegative finite width/height를 요구하며 끝점도 finite여야 한다. 같은 parent frame에서 전체 items/subtree를 자르고 item properties/좌표/ID를 바꾸지 않는다. `false`는 optional field를 제거한다. Generated/inline item과 Canvas에는 지원하지 않는다. `items`/`length` 변경, renderer와 persistence가 같은 owner clip을 보존한다. Evidence: `test/unit/renderers/graphic-owner-clipping.test.js`.
- `remove`: `true`일 때 property/value 없이 named graphic과 owned named subtree를 삭제하고 parent의
  `children` 또는 top-level `order`에서 detach한다. Canvas root와 generated item의 독립 삭제는 허용하지 않는다.
- Effect: concrete graphic path만 structural copy한다. semantic state나 automatic compiler는 관여하지 않는다.
- 오류: unknown target/property, incompatible child type, `length`/`items` cardinality의 해당 소유권 한도 초과,
  mismatched distributed length, non-finite geometry,
  negative dimensions/strokes, opacity 밖의 값과 invalid Canvas text vocabulary를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-graphics.test.js`와
  `test/contracts/shared-graphic-validation.test.js`가 distribution, broadcast, nested paths,
  heterogeneous items, subtree removal, resize, structural copy와 renderer-shared validation을 검증한다.

### Formal values — `editGraphics`

- Implemented: assignment `editGraphics({ target: UserId | GeneratedItemId; property: GraphicPropertyForTarget; value: GraphicValueForProperty })` 또는 named-subtree removal `editGraphics({ target: UserId | readonly UserId[]; remove: true })`; 두 mode는 mutually exclusive다.
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
  - ✅ Covered: finite `M | L | C | Z` path command arrays, maximum 30,000 commands, and command-order validation.
    각 `M`이 새 subpath를 시작한다. `L/C`는 열린 subpath에서만 허용하고 `Z`는 그 subpath를 닫는다.
    `Z` 뒤에는 `M`만 허용한다. `M`, `M Z`, 연속 `M`은 zero-area position-only subpath로 유효하다.
    모든 command는 exact own data fields와 finite 좌표만 받으며 배열은 dense하다.
  - ✅ Covered: path-only `fillRule: "nonzero" | "evenodd"`; 생략은 nonzero이며 기존 저장값에 필드를 추가하지 않는다.
    Fill은 열린 subpath를 암묵적으로 닫고 stroke는 명시한 `Z`만 닫는다. 각 subpath의 cap/join은 독립적이다.
    Named path, path item, compatible collection broadcast/distribution이 같은 schema를 사용한다.
    Evidence: `test/charts/compound-path/public.test.js`, `test/unit/grammar/compound-path-topology.test.js`,
    `test/unit/grammar/path-geometry.test.js`, `test/charts/compound-path/backends.render.js`.
- `value` distribution
  - ✅ Covered: scalar broadcast, outer array distribution, mismatched length, nested points arrays preserved,
    heterogeneous item replacement and shared compatible-property broadcast.
- concrete value classes
  - ✅ Covered: finite geometry, non-negative dimensions/strokes, `[0,1]` opacity, non-empty appearance strings,
    Canvas text vocabulary and renderer-shared validation.
  - ✅ Covered: a concrete text graphic accepts `text:""` so a high-level display map can retain stable item
    identity while rendering no glyph. High-level titles, annotations and author-supplied text contracts keep their
    own non-empty validation. Evidence: `test/unit/renderers/empty-text-renderer.test.js`.
  - ✅ Covered: native PNG/PDF retain authored font-family precedence and append installed common CJK,
    Unicode and emoji fallback families to resolve missing glyphs without changing text or layout.
    No fonts are downloaded; available glyphs depend on the export host's installed fonts.
    Evidence: `test/unit/renderers/native-font-fallback.test.js`.
  - ✅ Covered: finite/non-negative/unit-interval boundaries and font/text vocabularies are shared with renderers.
    The exact string `"none"` means no paint for fill, stroke, text fill and canvas background across SVG
    and Canvas-backed outputs. Canvas assigns a real transparent color for this sentinel, so a previous
    opaque context paint cannot leak into a later graphic. Geometry, opacity and stroke bounds are unchanged.
    Evidence: `test/contracts/none-paint.test.js` and `test/browser/none-paint.browser.js`.
    Exhaustive backend parsing of arbitrary accepted color strings is outside library validation. Renderer output
    capacity is checked separately and atomically: Canvas/PNG enforce physical side and total-pixel limits; all
    Canvas-backed outputs cap native geometry/style magnitude at `16777216`; PDF additionally requires an exactly
    representable positive integer page size; SVG retains finite-number geometry and rejects XML-forbidden scalars.
- Maybe Future: multi-property dictionary/batch edit; current action continues to represent one property change.
- Evidence: `test/unit/actions/primitives/edit-graphics.test.js`,
  `test/contracts/shared-graphic-validation.test.js`, and
  `test/unit/grammar/path-commands.test.js`.

Measured radius의 양수 값이 수치 정밀도 때문에 inner radius와 구별되지 않으면 오류다. 양수 sector를 조용히 생략하거나 epsilon 값으로 대체하지 않는다.

### Concrete text lines

Text의 optional `lines`는 `{text: string, x: finite, y: finite}` 배열이다. 각 좌표는 text anchor에 상대적이고 공통 rotation을 따른다. renderer는 줄을 재분할/측정하지 않고 이 좌표를 그린다. `text`는 전체 논리 문자열을 유지한다.


Concrete rect/path blend is optional normal|difference; circle blend is optional
normal only. Other graphic types reject blend. Normal is an explicit source-over
whole-glyph paint instruction, with bounded source attenuation once; omitted
legacy output and semantic bar normal reset remain unchanged. The approved normal
path adds no numerical tolerance. Preflight checks source arc/transform/mask and
target compositing support before destination resize or clear.

### Concrete item identity

`items` entries는 optional `identity: GraphicIdentity`를 받는다. key는 child path·owner·role·final grain을
식별하고 topology는 ordered path membership을 식별한다. lineage는 정확한 dataset snapshot의 logicalId,
revision, rowKeys를 참조한다. primitive role과 semantic key로 private child ID를 생성한다. key·role 중복과
malformed metadata는 거부한다. Metadata가 없는 extension graphics는 기존 순서 기반 private ID를 쓴다.
의미를 바꾸지 않는 graphics edit는 metadata를 보존하고, domain materializer가 의미 변경의 metadata를 갱신한다.

### Compound path persistence and scenes

Editable envelope 4와 graphic envelope 1은 commands·fillRule·owner clip을 그대로 보존한다.
기존 생략값은 생성하지 않는다. Legacy editable 1–3은 기존 단일 subpath grammar를 검증하고
fillRule 및 path clip을 거부한다. 구버전 runtime이 새 값을 읽는 호환성은 제공하지 않는다.
SVG scene version 1은 path clip을 definitions와 node SVG에 보존한다. `node.clip`은 rectangular viewport/owner 교집합을 유지한다. Path bounds를 다시 clip으로 적용하여
fractional edge의 antialias를 중복 곱하지 않는다. Canvas scene version 2의 `node.clips`는 outer-to-inner global
rectangle tuple 또는 path clip이며 replay가 각 실제 fill 영역을 적용한다.
JSON/structured clone과 fresh-process restore/edit/remove는 `test/charts/compound-path/public.test.js`,
scene pixel replay는 `test/charts/compound-path/backends.render.js`가 검증한다.
