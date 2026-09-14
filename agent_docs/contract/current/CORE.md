# Core action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## `createCanvas`

- Signature: `createCanvas({ width?, height?, background?, margin? })`
- 목적과 필수 state: Canvas가 없는 program에 logical Canvas와 plot bounds를 만든다.
- `width`
  - Status: Implemented. 양의 finite number이며 기본값은 `640`이다.
  - Effect: `canvas.properties.width`와 plot width를 결정한다. 이후 auto-range scale,
    mark, axis, grid, legend와 title geometry의 기준이 된다.
- `height`
  - Status: Implemented. 양의 finite number이며 기본값은 `400`이다.
  - Effect: Canvas와 plot height를 결정하고 모든 y geometry 및 reserved layout에 영향을 준다.
- `background`
  - Status: Implemented. 비어 있지 않은 color string이며 기본값은 `"white"`다.
  - Effect: concrete Canvas background만 바꾸며 semantic state에는 들어가지 않는다.
- `margin`
  - Status: Implemented. non-negative finite scalar 또는 `{ top?, right?, bottom?, left? }`다.
    scalar는 네 방향에 broadcast되고 partial object는 기본 margin의 나머지 방향을 유지한다.
  - Effect: graphical materialization config의 plot bounds를 결정한다. Canvas 생성 시 아직
    consumer가 없으므로 rematerialization은 발생하지 않는다.
- 오류와 상호작용: unknown option, invalid dimension/color/margin, 두 번째 Canvas를 거부한다.
- Coverage: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`가 defaults, partial options, invalid values와
  duplicate를 검증한다.

### Formal values — `createCanvas`

- Implemented: `createCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin } = {})`
- Proposed (NOT IMPLEMENTED): `{ width?: "auto"; height?: "auto"; margin?: "auto" }`

### Value coverage — `createCanvas`

- `width`, `height`
  - ✅ Covered: 생략(default `640 × 400`), 양의 정수/소수, 0·음수·`NaN`·`Infinity` rejection.
  - 🟣 Proposed: `"auto"` 또는 responsive dimension. Canvas resize observer와 renderer logical size
    contract가 필요하며 모든 auto-range consumer를 rematerialize해야 한다.
- `background`
  - ✅ Covered: 생략(`"white"`), non-empty color string, empty/non-string rejection.
  - No proposal: 현재 arbitrary Canvas-compatible color string으로 충분하다.
- `margin`
  - ✅ Covered: 생략, scalar, partial/full object, zero, negative/non-finite rejection, plot보다 큰 margin rejection.
  - 🟣 Proposed: `"auto"` margin. guide/title text measurement가 생기기 전에는 안전하게 계산할 수 없다.
- Evidence: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`.

## `editCanvas`

- Signature: `editCanvas({ width?, height?, background?, margin? })`
- 목적과 필수 state: 기존 Canvas의 한 개 이상 property를 immutable하게 편집한다.
- `width`, `height`, `background`, `margin`
  - Status: Implemented. 값 계약은 `createCanvas`와 같다. 생략한 property는 기존 값을 유지한다.
  - Effect: width/height/margin은 auto-range scale을 시작점으로 모든 registered consumer의
    deterministic materialization plan을 실행한다. background만 바꾸면 consumer를 다시 만들지 않는다.
  - Interaction: explicit scale range는 Canvas bounds 변경으로 재계산되지 않는다.
- 오류: 빈 edit, Canvas 부재, unknown option과 invalid resolved bounds를 거부한다.
- Coverage: `test/unit/actions/canvas/edit-canvas.test.js`가 partial edit, margin-only edit,
  auto/explicit range 차이와 rematerialization을 검증한다.

### Formal values — `editCanvas`

- Implemented: `editCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin })`; 최소 한 property가 필요하다.
- Proposed (NOT IMPLEMENTED): `createCanvas`의 `"auto"` dimension/margin과 동일하다.

### Value coverage — `editCanvas`

- `width`, `height`, `margin`
  - ✅ Covered: 한 property만 변경, 여러 property 변경, unchanged omission, auto-range rematerialization,
    explicit-range preservation과 invalid resolved bounds.
  - ✅ Covered: multi-legend/title resize와 shared-scale consumer plan은 각 owning layout test와
    `editCanvas` plan/convergence test의 bounded composition으로 검증하며 exhaustive cross-product는 비대상이다.
- `background`
  - ✅ Covered: background-only edit가 scale/mark/guide를 rematerialize하지 않음.
- Empty options
  - ✅ Covered: `{}` rejection.
- Proposed values는 `createCanvas`의 responsive/auto 후보와 동일하다.
- Evidence: `test/unit/actions/canvas/edit-canvas.test.js`.

## `fitCanvas`

- Signature: `fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow? } = {})`
- 목적과 필수 state: Full unit program의 기존 Canvas와 현재 layout resource를 기준으로 네 margin을
  줄여 plot 영역을 확장한다. Canvas `width`/`height`, semantic state와 explicit resource option은
  유지한다. Basic에는 노출하지 않으며 composition 호출은 명시적 scope 오류로 거부한다.
- `padding`: 각 edge가 가질 최소 margin인 non-negative finite number이며 기본값은 `0`이다.
- `minPlotWidth`, `minPlotHeight`: 최종 plot의 양의 finite 최소 크기이며 기본값은 각각 `160`, `120`이다.
- `iterationLimit`: edge별 probe 상한인 `1..64` 정수이며 기본값은 `32`다.
- `overflow`: `"error" | "report"`, 기본값은 `"error"`다. Error는 원자적으로 거부한다. Report는
  마지막 유효 margin을 적용하고 `materializationConfigs.fitting.result`에 `"overflow"` 상태와 issue를 저장한다.
- Effect: top→right→bottom→left 순서로 0.25px 격자의 bounded binary search를 수행한다. 각 probe는
  `editCanvas({ margin })`의 기존 consumer rematerialization과 guide collision 검증을 사용한다.
  성공 결과는 normalized policy, final margin/plot, probe 수, status, issue, layout signature를 저장한다.
- 결정성과 lifecycle: 같은 layout과 policy의 반복 호출은 graphic/config가 정확히 같은 상태로 수렴한다.
  이후 resource가 바뀌면 다음 명시적 `fitCanvas` 호출이 새 signature로 다시 계산한다. 저장된 결과는
  마지막 호출의 기록이며 자동 resize observer나 지속 compiler가 아니다.
- 오류: Canvas 부재, unknown/invalid option, minimum plot 또는 iteration bound 미충족을 정책에 따라
  거부하거나 보고한다. 어떤 경우에도 Canvas를 확대하거나 guide를 임의 이동하지 않는다.

### Formal values — `fitCanvas`

- Implemented: `fitCanvas({ padding?: NonNegativeFinite; minPlotWidth?: PositiveFinite; minPlotHeight?: PositiveFinite; iterationLimit?: Integer<1,64>; overflow?: "error" | "report" } = {}): ChartProgram`
- Proposed (NOT IMPLEMENTED): automatic/persistent fitting, Canvas dimension expansion, composition-wide fitting.

### Value coverage — `fitCanvas`

- ✅ Covered: fixed Canvas, margin-only child edit, 0.25px output, bounded probes, exact repeated convergence.
- ✅ Covered: invalid policy, Canvas absence, Full/Basic boundary, minimum plot error/report와 input immutability.
- ✅ Covered: semantic/scale-domain/order invariance, explicit-range preservation, Current catalog,
  package와 browser consumer. Auto range는 fitted plot bounds로 재계산한다.
- Visual boundary는 `fitted-long-labels`에서 explicit final margin primitive와 public fitting 결과의
  graphic/renderer/PNG equivalence로 검증한다.
- Evidence: `test/unit/actions/canvas/fit-canvas.test.js`, `test/contracts/fitting.test.js`,
  `test/charts/fitted-long-labels/`.

## `applyTheme`

- Signature: `applyTheme({ theme, scope? })`
- 목적과 필수 state: Unit 또는 composition program에 지속되는 시각 기본값을 적용한다. Canvas나
  mark가 생기기 전에도 호출할 수 있고, 이후 action이 만드는 resource에도 active policy를 적용한다.
- `theme`
  - Status: Implemented. `"light" | "dark"` 또는
    `{ base: "light" | "dark", tokens: Partial<ThemeTokens> }`다.
  - Custom object는 `base`와 `tokens`를 모두 요구한다. `tokens`는 `background`, `mark`, `text`,
    `strongText`, `mutedText`, `axis`, `axisTitle`, `grid`, `border`, `sizeSymbol`,
    `regressionBand`, `boxLine`, `boxMedian`, `referenceLine`, `referenceBand`,
    `gradientCenter`, `highlight`, `fontFamily`의 closed vocabulary다. 값은 non-empty string이다.
  - Partial token은 base 위에 한 번만 overlay한다. 다음 `applyTheme`은 이전 partial token과 merge하지
    않으므로 생략한 token은 새 base 값으로 돌아간다.
- `scope`
  - Status: Implemented. `"self" | "descendants"`다.
  - Unit 기본값은 `self`이며 `descendants`도 unit state에서는 `self`로 정규화한다.
  - Composition 기본값은 `descendants`다. `self`는 composition root Canvas background만 바꾼다.
    `descendants`는 root, 현재 nested child, facet/repeat 재생으로 생기는 future child와 parent-owned
    facet header/shared guide를 갱신한다.
- 우선순위와 상호작용: explicit user style > newest applicable theme request > earlier request >
  built-in light다. 같은 값으로 직접 지정한 style도 explicit이다. Parent theme은 child-local frame을
  덮어쓰지 않고 아래에 보존하므로 parent removal 뒤 newest child frame이 복원된다. Field-driven
  palette, categorical legend symbol, semantic state, resolved scale, grouping, 통계와 order는 보존한다.
  기본 highlight paint는 active `highlight` token을 사용하고 explicit highlight paint는 보존한다.
  `fontFamily` 변경은 Text, axis, legend, title, facet header를 다시 materialize해 text bounds와
  composition layout을 검증한다.
- 상태와 불변성: request는 owner/scope/base/partial token frame으로 immutable하게 저장한다. Full
  resolved token object와 계산된 layout을 theme request state에 저장하지 않는다. Composition 전파는
  retained child input을 변경하지 않고 postorder로 새 snapshots를 만든다.
- 오류: non-object/empty options, unknown root/token key, missing `base`/`tokens`, invalid theme/scope,
  empty 또는 non-string token을 거부한다. 전체 candidate materialization이 실패하면 receiver와 caller
  input은 변경되지 않는다.
- Coverage: `test/unit/theme/defaults.test.js`, `test/unit/theme/state.test.js`,
  `test/unit/actions/theme.test.js`, `test/unit/actions/theme-composition.test.js`가 schema, frame ordering,
  custom replacement, explicit provenance, highlight/font, self/descendant 전파, nested removal과 facet replay를
  검증한다. `test/contracts/theme.test.js`는 runtime/type/Current surface와 public chart corpus를 검증한다.

### Formal values — `applyTheme`

- Implemented: `applyTheme({ theme: ThemeName | { base: ThemeName; tokens: Partial<ThemeTokens> }; scope?: "self" | "descendants" }): ChartProgram`
- `ThemeName = "light" | "dark"`이며 `ThemeTokens`는 위 18개 required string property다.
- Proposed (NOT IMPLEMENTED): No proposal. Theme creation/import와 arbitrary token vocabulary는 현재 범위 밖이다.

### Value coverage — `applyTheme`

- Theme definition
  - ✅ Covered: built-in light/dark, custom partial, exact 18-token vocabulary, input ownership/freeze,
    replacement without partial merge, malformed/unknown values와 atomic rejection.
- Scope와 lifecycle
  - ✅ Covered: unit normalization, composition default descendants, explicit self, nested concat/facet,
    future facet source replay, same-owner reapply, newest direct-scope removal과 child-local restoration.
- Explicit precedence
  - ✅ Covered: mark/Canvas, Cartesian/Polar/Parallel guides, title/subtitle, legend root/block,
    facet headers, statistical/reference components, field-driven palettes와 default/explicit highlight.
- Layout와 semantic boundary
  - ✅ Covered: font-dependent resource rematerialization, composition snapshot/layout rebuild, semantic spec,
    resolved scales, statistics, ordering과 caller program immutability.
- Visual boundary
  - ✅ Covered: `dark-theme-scatterplot`의 explicit low-level style primitive와 public `applyTheme`
    program 사이 exact graphic/renderer/decoded PNG pixel equivalence.
- Evidence: `test/unit/theme/`, `test/unit/actions/theme.test.js`,
  `test/unit/actions/theme-composition.test.js`, `test/contracts/theme.test.js`,
  `test/charts/dark-theme-scatterplot/`.

## `removeTheme`

- Signature: `removeTheme()`
- 목적과 필수 state: receiver가 직접 적용한 가장 최근 theme scope 하나를 제거한다.
- Unit effect: local frame을 제거하고 inherited frame 또는 built-in light default를 드러낸다.
- Composition effect: `localOrder`의 newest `self` 또는 `descendants` owner만 제거한다. Descendant
  removal은 nested children과 future-child policy에서 그 parent owner만 제거하고, 보존된 child-local
  또는 다른 ancestor frame으로 color/font/layout을 다시 계산한다. `self` removal은 root Canvas만
  이전 applicable background로 되돌린다.
- 우선순위와 상호작용: explicit local style과 다른 owner의 frame은 보존한다. 마지막 frame이 사라지면
  theme config를 제거한다. 이전 immutable program과 composition input은 그대로다.
- 오류: direct active theme이 없거나 option을 전달하면 거부한다.
- Coverage: unit reset, self/descendants newest-scope removal, nested owner-only restoration, explicit style,
  highlight와 facet replay는 theme unit/contract suites가 검증한다.

### Formal values — `removeTheme`

- Implemented: `removeTheme(): ChartProgram`
- Proposed (NOT IMPLEMENTED): No proposal. Scope를 지정하는 selective removal은 현재 범위 밖이다.

### Value coverage — `removeTheme`

- ✅ Covered: unit active/inactive lifecycle, no-argument validation, built-in fallback와 explicit preservation.
- ✅ Covered: composition self/descendants ordering, same-owner replacement, nested child frame restoration,
  root/child rematerialization과 empty-state cleanup.
- Evidence: `test/unit/actions/theme.test.js`,
  `test/unit/actions/theme-composition.test.js`, `test/contracts/theme.test.js`.

## `createData`

- Signature: `createData({ id?, values })`
- `id`
  - Status: Implemented. Optional user-defined ID다. 첫 dataset에서 생략하면 deterministic role ID
    `"data"`를 사용한다. Dataset이 이미 있으면 생략은 ambiguous하므로 explicit ID가 필요하다.
    명시한 ID는 지원 문자 규칙을 통과하고 기존 dataset과 중복되지 않아야 한다.
  - Effect: `semanticSpec.datasets`의 key 역할을 하며 성공 후 current data가 된다.
- `values`
  - Status: Implemented. 필수 dense array이며 모든 index의 row는 plain object여야 한다.
    빈 배열과 nested array/plain-object cell은 허용한다. 함수, class instance, cycle은 저장하지 않는다.
    누락된 row는 index를 포함한 오류로 첫 저장 전에 거부한다.
  - Effect: caller-owned 값을 deep clone/freeze하여 immutable source dataset으로 저장한다.
    graphic output은 만들지 않는다.
- 오류: ambiguous omitted ID, invalid/duplicate ID, non-array와 non-object row를 거부한다.
- Coverage: `test/unit/actions/data/create-data.test.js`가 empty/multiple data, ownership,
  trace summary, invalid values와 duplicates를 검증한다.

### Formal values — `createData`

- Implemented: `createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram`.
  Options의 ID는 `id?: UserId`이며 구조적 row interface와 readonly nested cell 타입을 보존하고
  non-object/array row 및 함수 cell을 타입에서 거부한다. 첫 unnamed source는
  `"data"`를 저장하고 이후 source는 explicit ID가 필요하다.
- Proposed (NOT IMPLEMENTED): `{ values: AsyncIterable<Record<string, unknown>> | Readonly<Record<FieldName, readonly unknown[]>> }`

### Value coverage — `createData`

- `id`
  - ✅ Covered: omission→`"data"`, valid custom ID, second unnamed ambiguity, empty/malformed ID, duplicate ID.
  - No proposal: ID vocabulary는 user-defined 상태를 유지한다.
- `values`
  - ✅ Covered: empty/non-empty array, multiple datasets, plain-object rows, caller ownership/immutability.
  - ✅ Covered: deeply nested arrays/objects, `null`, `undefined`, non-finite number와 bigint cell ownership/freeze.
  - 🟣 Proposed: async iterable/columnar input adapter. Source dataset immutability와 deterministic trace
    completion 정책이 먼저 필요하다.
- Evidence: `test/unit/actions/data/create-data.test.js`, `test/contracts/input-boundaries.test.js`,
  `test/contracts/source-data-types.test.js`.

## `removeData`

- Signature: `removeData({ id })`
- 목적과 범위: Full entry의 unit 또는 facet parent에서 현재 참조가 없는 named dataset 하나를
  제거한다. `id`는 필수 user ID다. current/unique resource 추론, batch, cascade, force는 지원하지 않는다.
- 참조 계약: layer binding, 다른 dataset의 `source`, materialization data owner, composite mark의
  retained data/source, facet·repeat source가 live edge다. Historical trace argument와 이전 immutable
  program은 참조가 아니다. `context.currentData`만 target을 가리키면 삭제할 수 있고 pointer를
  `undefined`로 만든다.
- 소유권: mark·statistical facade가 만든 private dataset은 직접 제거하지 않고 owning mark/action을
  요구한다. Top-level derived action이 만든 standalone logical owner는 logical ID로 제거한다. 이때
  `owner.current` 자기 edge만 제외하며, 외부 edge가 0이면 current snapshot과 owner registry를 함께
  지우고 upstream source는 보존한다.
- 원자성과 결과: 모든 known-schema edge를 먼저 수집해 `ownerKind`, `ownerId`, canonical path 순으로
  정렬한다. 하나라도 남으면 `Cannot remove data "<id>"; live references: ...`로 거부한다. 성공은
  `semanticSpec.datasets`와 필요한 standalone owner/current pointer만 바꾸며 `graphicSpec`과 `children`은
  reference-identical하다. domain, layout, mark 또는 guide를 재물질화하지 않는다.
- Trace와 구현 경계: 전체 dependency preflight 후 실제 semantic ID에 대해 `editSemantic({ property, remove:true })`를
  wrapped child로 호출한다. Standalone logical data-owner config와 logical current pointer는 preflight 후
  primitive 호출 전에 domain action이 정리한다. Facet의 수정된 physical revision도 logical owner로 삭제할 수 있다.
- 적용 제한: concat composition parent는 거부한다. 같은 문자열 ID를 가진 child resource는 다른 program
  namespace이므로 parent의 전역 참조로 추론하지 않는다.

### Formal values — `removeData`

- Implemented: `removeData({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): batch removal, cascade, orphan collection, force removal.

### Value coverage — `removeData`

- ✅ Covered: unused source, context-only/trace-only mention, derived source and direct layer rejection.
- ✅ Covered: standalone owner success/consumer rejection, private statistical dataset rejection, facet source와
  concat scope, deterministic error paths, immutable failure.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `removeScale`

- Signature: `removeScale({ id })`
- 목적과 범위: Full unit 또는 facet parent에서 참조 없는 named semantic scale을 제거한다. ID는
  필수이며 target/current 추론, batch와 cascade를 지원하지 않는다.
- live edge: 모든 scaled encoding, offset, Parallel dimension, semantic/config guide와 retained recipe의
  실제 scale ID가 참조다. resolved domain/range/sample 값과 같은 문자열의 text/color/style token은
  참조가 아니다. `context.currentScale`은 삭제를 막지 않으며 성공 시 unset한다.
- 결과: semantic scale과 같은 ID의 `resolvedScales` cache를 함께 제거한다. live edge가 있으면 정렬된
  referrer path를 포함해 원자적으로 거부한다. 성공 전후 `graphicSpec`과 `children`은 같은 object이며
  mark/domain/layout을 다시 계산하지 않는다. Semantic 삭제와 cache/current pointer 정리는 wrapped `editSemantic` 자식이 담당한다.

### Formal values — `removeScale`

- Implemented: `removeScale({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): consumer rewiring, replacement-scale inference, cascade.

### Value coverage — `removeScale`

- ✅ Covered: unused semantic/cache cleanup, context-only removal, wrong kind/unknown ID.
- ✅ Covered: Cartesian position과 Parallel dimension rejection, canonical indexed path, visual invariance.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `removeCoordinate`

- Signature: `removeCoordinate({ id })`
- 목적과 범위: Full unit 또는 facet parent에서 참조 없는 named coordinate를 제거한다. Layer,
  semantic/config guide, annotation·statistical retained data-space binding이 live edge다. Concrete pixel
  geometry나 graphic parent ID는 coordinate edge가 아니다.
- 결과: semantic coordinate만 제거한다. `context.currentCoordinate`만 가리키면 unset하고 삭제한다.
  다른 coordinate를 자동 선택하지 않으며 mark, scale, guide와 concrete graphics를 재물질화하지 않는다.
  실제 semantic 삭제와 current pointer 정리는 wrapped `editSemantic` 자식이 담당한다.
  live edge, wrong kind, unknown ID, concat parent와 closed option 오류는 caller state와 trace를 유지한다.

### Formal values — `removeCoordinate`

- Implemented: `removeCoordinate({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): layer migration, replacement-coordinate inference, cascade.

### Value coverage — `removeCoordinate`

- ✅ Covered: empty coordinate와 context pointer cleanup, attached layer rejection, wrong/unknown ID.
- ✅ Covered: facet parent success, concat rejection, graphics/children identity와 rendered-call equality.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `bindMarkData`

- Signature: `bindMarkData({ target, data })`
- 목적과 필수 state: 기존 independent mark를 이미 materialize된 다른 dataset에 원자적으로 연결하고
  해당 mark가 소비하는 scale, guide, label, selection/highlight와 concrete graphic을 dependency 순서로
  다시 만든다.
- `target`: 필수 mark ID다. Composite owner나 그 child, density/horizon/final-item filter처럼 자체
  source lifecycle을 가진 mark는 해당 resource의 edit/filter action을 사용해야 하며 이 action은 거부한다.
- `data`: 필수 existing dataset ID다. `values`가 없는 definition-only `createDerivedData` 결과는 mark가
  소비할 수 없으므로 거부한다.
- preflight와 atomicity: immutable speculative branch에서 전체 rebind와 rematerialization plan을 먼저
  실행한다. 새 row가 encoding field/type/grain, coordinate placement, shared scale domain, guide, label,
  selection/highlight의 기존 계약을 충족하지 못하면 첫 public 상태 변경 전에 전체 action이 실패한다.
- Effect: wrapped `rebindLayerData`가 semantic consumer transition을 trace에 남기고, 기존 registered
  rematerializer가 새 dataset을 기준으로 concrete state를 수렴시킨다. Source program과 이전 dataset은
  그대로 유지하며 같은 dataset으로의 빈 변경은 거부한다.
- Coverage: `test/unit/actions/data/bind-mark-data.test.js`가 호환 data 재연결, field/type/definition-only
  rejection, composite lifecycle, full trace와 이전 program 불변성을 검증한다.

### Formal values — `bindMarkData`

- Implemented: `bindMarkData({ target: UserId; data: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): composite 전체 역할 변경. 각 composite owner의 aggregate edit가 담당한다.

### Value coverage — `bindMarkData`

- ✅ Covered: explicit target/data, existing materialized data, scale+mark rematerialization과 item cardinality 변경.
- ✅ Covered: missing field, incompatible quantitative type, definition-only dataset, missing IDs, empty/same bind,
  unknown option과 immutable atomic rejection.
- ✅ Covered: Box와 owned transform consumer가 generic single-layer bind를 우회하지 못함.
- Evidence: `test/unit/actions/data/bind-mark-data.test.js`.

## `filterData`

- Signature: `filterData({ id, source?, field, oneOf?, predicate?, range? })`
- `id`: Implemented, 필수 derived dataset ID. 새 ID여야 한다.
- `source`: Implemented, dataset ID. 생략하면 current data를 사용하며 유일하게 추론되지 않으면 오류다.
- `field`: Implemented, 비어 있지 않은 필드 이름. 각 row에 값이 없어도 비교 결과가 false일 수 있다.
- `oneOf`: Implemented, scalar accepted-value array. strict equality membership으로 row를 유지하며
  transform input은 소유권 복사된다.
- `predicate`: Implemented `{ op, value }` comparison. `eq | neq`는 strict equality를 사용하고
  `lt | lte | gt | gte`는 같은 type의 finite number 또는 string만 순서 비교한다.
- `range`: Implemented `{ min, max, inclusive? }`. 같은 type의 finite number/string endpoint를
  요구하고 `inclusive` 기본값은 `true`다.
- `oneOf`, `predicate`, `range` 중 정확히 하나만 허용한다. Ordered comparison/range에서 missing 또는
  incompatible field value는 제외하고 source order를 보존한다.
- Effect: filter provenance를 가진 immutable derived dataset을 만들고 wrapped
  `materializeFilteredData`가 concrete values를 저장한다. 기존 source는 변하지 않는다.
- Coverage: `test/unit/actions/data/filter-data.test.js`가 source inference, scalar types,
  ownership, invalid options와 primitive equivalence를 검증한다.

### Formal values — `filterData`

- Implemented: `filterData({ id: UserId; source?: UserId; field: FieldName } & ({ oneOf: readonly unknown[] } | { predicate: FilterComparison } | { range: FilterRange }))`
- `FilterComparison = { op: "eq" | "neq"; value: unknown } | { op: "lt" | "lte" | "gt" | "gte"; value: Finite | string }`
- `FilterRange = { min: Finite | string; max: Finite | string; inclusive?: boolean }`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `filterData`

- `id`, `source`
  - ✅ Covered: explicit source, current-data inference, missing/ambiguous source, duplicate derived ID.
- `field`
  - ✅ Covered: non-empty string, invalid option, sparse와 incompatible ordered values.
- `oneOf`
  - ✅ Covered: string/number/boolean scalar membership, owned input, invalid transform values.
  - ✅ Covered: empty-list rejection, duplicate-value set semantics와 direct `null` membership.
- `predicate`
  - ✅ Covered: 모든 여섯 operator, strict no-coercion, numeric/string order, invalid operator/operand와 owned provenance.
- `range`
  - ✅ Covered: inclusive default, exclusive endpoints, equal-endpoint empty result, invalid order/type/inclusive와 owned provenance.
- Mode interaction
  - ✅ Covered: exactly-one mutual exclusivity, source immutability/order와 primitive/public chart equivalence.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

## `createSummaryData`

- Signature: `createSummaryData({ id, source?, groupBy?, aggregates, members?, weight? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `groupBy`: field name 또는 unique field-name array이며 기본은 `[]`다. Observed group을 source의 첫
  등장 순서로 만들며 categorical combination을 합성하지 않는다.
- `aggregates`: 1..64개의 `{ op, field?, as }`다. `op`는 공통 `AggregateOperation` 전체를 재사용한다.
  `count`는 row count이므로 field를 받지 않고 다른 op는 field가 필수다. `as`는 group/output과 겹치지
  않는 고유 field 이름이다.
- `members`: optional output field 이름이다. 각 summary row가 해당 source group의 원래 rows를 보존한다.
  Group/output alias와 충돌하면 거부한다.
- `weight`: optional `{ field, kind: "frequency" | "reliability" }`다. 생략하면 기존 unweighted 결과를
  유지한다. Frequency weight와 group total은 non-negative safe integer여야 하고 reliability weight는
  non-negative finite number여야 한다. 모든 요청 value와 weight를 zero-weight row까지 먼저 검증하며,
  zero-weight rows는 통계와 `members`에서 제외한다. Positive total이 없는 observed group은 오류다.
- Weighted branch는 `count`, `sum`, `mean`, population/sample variance와 stdev, `stderr`, `median`,
  `q1`, `q3`, parameterized `quantile`만 지원한다. Frequency quantile은 virtual repetition에 기존 linear
  quantile을 적용하고 실제 row를 복제하지 않는다. Reliability quantile은 equal values의 weight를 합친
  inverse CDF다. Sample denominator는 frequency `W-1`, reliability `W-W2/W`; standard error의 effective
  size는 각각 `W`, `W²/W2`다. Weighted CI와 ordered/nominal aggregates는 명시적으로 거부한다.
- Effect: normalized `summary` provenance와 concrete values를 같은 호출에서 완성한다. Ungrouped empty
  source는 aggregate identity를 표현하는 한 row를 만들며 `count`는 0이다. Grouped empty source는
  observed group이 없으므로 `[]`다. Missing 수치 결과는 기존 aggregate owner와 동일하게 `undefined`다.
- 오류: missing source/group/aggregate/order field, duplicate group/output, incompatible aggregate field
  type, non-scalar group key, unsupported op와 10,000 group 초과를 첫 semantic change 전에 거부한다.
- Coverage: `test/unit/actions/data/summary-data.test.js`가 multi-aggregate, ordered aggregate, members,
  stable group order, empty grain, ownership, mark consumption과 invalid matrix를 검증한다.

### Formal values — `createSummaryData`

- Implemented: `createSummaryData({ id: UserId; source?: UserId; groupBy?: FieldName | readonly FieldName[]; aggregates: readonly { op: AggregateOperation; field?: FieldName; as: FieldName }[]; members?: FieldName; weight?: StatisticalWeight }): ChartProgram`
- Proposed (NOT IMPLEMENTED): full categorical cube/empty-group synthesis, callback aggregate.

### Value coverage — `createSummaryData`

- ✅ Covered: grouped/ungrouped, first-appearance ordering, count/mean/missing/ordered first, multiple outputs.
- ✅ Covered: ungrouped/grouped empty input, null numeric member, members provenance and caller ownership.
- ✅ Covered: field/type/alias/shape/unknown option and immutable rejection.
- ✅ Covered: frequency/reliability formulas, distinct quantiles, scale invariance, zero-weight membership,
  invalid/all-zero/overflow weights and weighted-operation whitelist.
- Evidence: `test/unit/actions/data/summary-data.test.js`.

## `createBinData`

- Signature: `createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as?, weight? })`
- `id`, `source`, `field`: 새 immutable derived ID, materialized source와 필수 quantitative field다.
- Bin mode: `maxBins`(기본 10), positive `step`, 또는 strictly increasing finite `boundaries` 중 하나다.
  기존 Histogram의 `resolveHistogramBins`와 `findHistogramBinIndex`를 그대로 사용한다.
- `extent`: 기본 `"auto"` 또는 ascending finite pair다. Explicit extent/boundaries는 모든 source value를
  포함해야 하며 out-of-range row를 조용히 버리지 않는다.
- `nice`, `zero`: Histogram boundary policy와 같은 boolean이며 기본값은 `true`, `false`다.
- `includeEmpty`: 기본 `true`로 resolved boundary의 모든 bin을 보존한다. `false`는 count 0 bin만 제거한다.
- `members`: 기본 `false`. `true`면 각 bin의 original source rows를 output에 저장한다.
- `weight`: optional `StatisticalWeight`. 지정하면 count는 positive-weight row의 weight mass이고 extent와
  members도 그 rows만 사용한다. 모든 source value/weight는 기여 여부와 관계없이 먼저 검증하며 total
  weight 0은 오류다. Empty bin의 mass 0은 정상이고 마지막 upper endpoint 포함 규칙은 그대로다.
- `as`: `{ lower?, upper?, count?, members? }`; 기본은 `${field}_start`, `${field}_end`, `count`, `members`다.
  모든 enabled output은 고유해야 하며 `as.members`는 `members:true`에서만 허용한다.
- Edge: `[lower, upper)`이고 마지막 bin만 upper endpoint를 포함한다. Resolved domain, step와 boundaries를
  transform provenance의 `resolved`에 저장한다. Output은 lower/upper/count/member로 즉시 소비 가능하다.
- 오류: non-finite source, mixed modes, invalid/alignment/coverage boundary, alias collision, invalid boolean과
  generated-bin bound를 첫 state change 전에 거부한다.
- Coverage: `test/unit/actions/data/bin-data.test.js`가 boundary edge, max/step/explicit mode, empty omission,
  resolved provenance, ranged Rect consumption과 invalid matrix를 검증한다.

### Formal values — `createBinData`

- Implemented: `createBinData({ id: UserId; source?: UserId; field: FieldName; maxBins?: PositiveInteger; step?: PositiveFinite; boundaries?: readonly [Finite, Finite, ...Finite[]]; extent?: "auto" | OrderedFinitePair; nice?: boolean; zero?: boolean; includeEmpty?: boolean; members?: boolean; as?: BinDataOutputFields; weight?: StatisticalWeight }): ChartProgram`; bin mode는 상호 배타다.
- Proposed (NOT IMPLEMENTED): out-of-range drop/clamp policy.

### Value coverage — `createBinData`

- ✅ Covered: explicit boundaries와 마지막 endpoint, equal max bins, zero-anchored step, auto/explicit extent.
- ✅ Covered: include/omit empty, members, custom/default outputs, concrete ranged mark consumption.
- ✅ Covered: out-of-range, non-finite/missing field, invalid mode/boundary/boolean/alias와 immutable rejection.
- ✅ Covered: weighted mass, positive-weight extent/members, zero-weight prevalidation과 invalid/all-zero weights.
- Evidence: `test/unit/actions/data/bin-data.test.js`.

## `createFoldData`

- Signature: `createFoldData({ id, source?, fields, as? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `fields`: 1..64개의 unique source field 이름이다. Output은 source row 순서 안에서 이 목록의 순서를
  사용하므로 grain은 정확히 `source row × selected field`다.
- `as`: `{ key?, value? }`이며 기본은 `key`, `value`다. 두 output 이름은 서로 달라야 하고 source에
  이미 존재하는 field와 겹칠 수 없다.
- Effect: 각 output row는 source row의 모든 cell을 보존하고 key output에 선택한 field 이름, value
  output에 해당 cell을 추가한다. Selected value는 finite number, string 또는 boolean 중 하나이며 한
  materialization에서는 공통 primitive type이어야 한다. Empty source는 empty output을 만든다.
- 오류: duplicate/missing selected field, null/undefined/non-finite/structured value, mixed primitive type,
  output collision, unknown option과 10,000 output row 초과를 첫 semantic change 전에 거부한다.
- Coverage: `test/unit/actions/data/fold-data.test.js`가 stable row/field order, source-cell 보존, defaults,
  empty input, ordinary mark consumption, alias/type/missing/shape와 bounds를 검증한다.

### Formal values — `createFoldData`

- Implemented: `createFoldData({ id: UserId; source?: UserId; fields: readonly FieldName[]; as?: { key?: FieldName; value?: FieldName } }): ChartProgram`
- Proposed (NOT IMPLEMENTED): heterogeneous value union, null-preserving fold와 source-field replacement.

### Value coverage — `createFoldData`

- ✅ Covered: explicit field order, row-major expansion, default/custom aliases and original cell preservation.
- ✅ Covered: numeric common type, mixed/missing/non-finite/structured rejection, empty source.
- ✅ Covered: field/output uniqueness, source collision, 64-field and 10,000-row bounds, immutable rejection.
- Evidence: `test/unit/actions/data/fold-data.test.js`.

## `createComputedData`

- Signature: `createComputedData({ id, source?, as, expression })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `as`: 모든 source row에서 아직 존재하지 않는 non-empty output field다.
- `expression`: callback/string/eval이 아닌 recursive typed data AST다. Leaf는 `{ field }` 또는 finite
  number/string/boolean/null `{ constant }`다. 산술, 비교, boolean, `if`, `coalesce`, `concat`,
  `log`, `sqrt`의 닫힌 node union을 지원한다. `if`·`and`·`or`·`coalesce`는 값 평가를
  short-circuit하지만 모든 branch의 구조와 field 존재는 먼저 검증한다.
- Effect: source row와 모든 existing cell을 보존하고 각 row에 한 primitive 또는 null output을 추가한다.
  Serialized transform 자체가 exact formula provenance다. Facet replay에서는 row-preserving transform으로
  처리한다. undefined cell은 null로 평가하지만 field key 자체가 없는 row는 오류다. 한 materialization의
  non-null output type은 하나여야 한다.
- 오류: missing/structured operand, typed-operation mismatch, divide-by-zero, invalid log/sqrt,
  overflow/non-finite result, mixed output type, output collision, unknown 또는 malformed expression node를
  첫 state change 전에 거부한다. Expression은 depth 16, 128 nodes, `rows × nodes` 10,000,000 work로 제한한다.
- Coverage: `test/unit/actions/data/computed-data.test.js`가 기존 산술, nullable/string/boolean,
  conditional short-circuit, Unicode code-point ordering, ownership, mark consumption과 invalid matrix를 검증한다.

### Formal values — `createComputedData`

- Implemented: `createComputedData({ id: UserId; source?: UserId; as: FieldName; expression: ComputedExpression }): ChartProgram`
- Implemented nodes: field; number/string/boolean/null constant; add/subtract/multiply/divide;
  negate/absolute/log/sqrt; eq/neq/lt/lte/gt/gte; and/or/not/isNull; if/coalesce/concat.
- Proposed (NOT IMPLEMENTED): callbacks, expression strings, group aggregates, arbitrary regex와 arbitrary code evaluation.

### Value coverage — `createComputedData`

- ✅ Covered: arithmetic, comparison, logic, conditional, coalesce/concat, log/sqrt and all primitive constants.
- ✅ Covered: missing/invalid typed input, lazy value evaluation with eager structural/field validation,
  zero denominator, invalid domains, finite overflow, mixed output and collision rejection.
- ✅ Covered: strict node shape/vocabulary, immutable deep ownership, row grain, depth/node/work bounds.
- Evidence: `test/unit/actions/data/computed-data.test.js`.

## `createNormalizedData`

- Signature: `createNormalizedData({ id, source?, field, as, groupBy?, method, variance?, zeroDenominator?, baseline?, sortBy? })`
- `field` is finite quantitative input; `as` must not overwrite any source cell. `groupBy` defaults to `[]`
  and isolates every summary or baseline by scalar group identity while final rows retain source order and grain.
- `share` computes `x / sum(group)` and rejects every negative input. `minmax` computes
  `(x-min)/(max-min)`. `zscore` uses the shared stable mean/deviation implementation; `variance` defaults
  to `"population"` and also accepts `"sample"`.
- `index`, `change`, and `percentChange` compare against a finite explicit baseline value or a stable
  first/last row selected by non-empty `sortBy`. Omitted baseline means first. Index has baseline 100;
  percent change is a fraction and does not multiply by 100.
- Exact zero denominators reject by default. `zeroDenominator: "null" | "zero"` explicitly substitutes
  those values for share, minmax, zscore, index, and percentChange. It is invalid for change. Sample zscore
  with fewer than two group rows always rejects.
- Effect: stores one `normalize` transform with requested roles and normalized policies, then materializes
  the output through `materializeNormalizedData`. Its facet topology is statistical, so facet replay
  recomputes group results from each local source partition.
- Errors: unknown or method-inapplicable options, missing/non-finite fields, invalid group/sort scalars,
  duplicate group/sort fields, output collision, negative share inputs, zero denominators, non-finite output,
  and invalid baseline/variance policies reject before returning changed state.

### Formal values — `createNormalizedData`

- Implemented: `createNormalizedData(options: NormalizedDataOptions): ChartProgram` (Full only).
- Implemented methods: `"share" | "zscore" | "minmax" | "index" | "change" | "percentChange"`.
- Proposed (NOT IMPLEMENTED): negative shares, generic lookup/join, source replacement and arbitrary reducers.

### Value coverage — `createNormalizedData`

- ✅ Covered: share/minmax, population/sample zscore, stable ordered and explicit baselines, index/change/fractional
  percent change, group isolation and source order.
- ✅ Covered: error/null/zero denominator policies, constant/singleton/negative/missing/collision and option-shape errors.
- ✅ Covered: empty source, immutable input/program, transform ownership and trace hierarchy.
- Evidence: `test/unit/actions/data/normalized-data.test.js`, `test/contracts/transform-registry.test.js`.

## `createCompleteData`

- Signature: `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })`
- Lifecycle: Full-only immutable create action이다. 새 dataset ID를 만들며 source 또는 기존 consumer를 수정하지 않는다.
  `source` 생략은 현재 dataset을 안전하게 하나로 추론할 수 있을 때만 허용한다.
- `key`: 모든 source row에 있는 non-empty field다. `groupBy`와 겹치지 않아야 한다. `groupBy`는
  field 하나 또는 field 배열이고 기본은 `[]`다.
- Domain: `values`와 `sequence`는 배타다. `values`는 하나의 scalar type으로 구성된 non-empty unique
  array다. `sequence`는 finite `start <= end`, positive `step`을 받고 `start + i * step <= end`를 생성한다.
  둘 다 없으면 source 전체 key의 typed first-appearance domain을 사용한다.
- Group semantics: 실제 관측된 group tuple만 사용하고 group field별 Cartesian product를 만들지 않는다.
  동일 group×key source row가 둘 이상이면 자동 집계하지 않고 오류다. explicit domain 밖의 관측 key도 오류다.
- Output: group first appearance와 domain order를 따른다. 원본 row의 모든 cell을 보존하고 합성 row는 key와
  group fields를 채운 뒤 나머지 source-field union을 `fill[field]` 또는 `null`로 채운다. `fill`은 key,
  group 또는 members field를 바꿀 수 없다.
- `members`: 생략 가능 output field다. 지정하면 원본 row는 `[sourceIndex]`, 합성 row는 `[]`를 갖는다.
  기존 source field와 충돌하면 오류다.
- Bounds and replay: allocation 전에 output 10,000-row 한도를 검사한다. `complete`는 statistical facet
  topology라 각 child의 local source rows에서 domain/group completion을 다시 계산한다.
- Errors: invalid/duplicate ID, unknown/ambiguous source, unknown option, missing field, mixed/non-scalar key,
  duplicate domain/group×key, invalid sequence/fill/members, field collision와 output budget 초과를 첫 state change
  전에 거부한다.

### Formal values — `createCompleteData`

- Implemented: `createCompleteData(options: CompleteDataOptions): ChartProgram` (Full only).
- Implemented domain modes: observed typed domain, explicit typed values, finite numeric sequence.
- Proposed (NOT IMPLEMENTED): multi-key completion, group Cartesian expansion, automatic duplicate aggregation,
  calendar-month sequence와 source replacement/edit revision.

### Value coverage — `createCompleteData`

- ✅ Covered: observed/explicit/sequence domain, group/domain stable ordering, sparse observed tuple handling,
  fill and membership provenance, global/grouped empty inputs.
- ✅ Covered: duplicate/mixed/domain-missing/collision/budget errors, immutable caller rows/options/program and trace hierarchy.
- ✅ Covered: transform registry and facet-local statistical replay.
- Evidence: `test/unit/actions/data/complete-impute-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/contracts/phase2-data-types.test.js`.

## `createImputedData`

- Signature: `createImputedData({ id, source?, fields, groupBy?, sortBy?, method, value?, edges?, maxGap? })`
- Lifecycle: Full-only immutable create action이다. source row grain과 최종 source order를 유지한다.
- `fields`: non-empty unique field 하나 또는 배열이다. missing은 `null`/`undefined`만이며 `NaN`/`Infinity`는
  invalid value다. 한 group 안의 각 target field는 하나의 non-null scalar type이어야 한다.
- `groupBy`: 기본 `[]`; anchor와 missing run은 group 밖으로 넘어가지 않는다. `sortBy`는 stable lexicographic
  sort이고 order 기본은 ascending이다. 계산 뒤 output은 원래 row order로 복원한다.
- `constant`: `value`가 필수이며 target field type과 일치해야 한다. `sortBy`는 선택 사항이다.
- `forward`/`backward`: `value`를 금지하고 non-empty `sortBy`가 필요하다. 각각 이전/다음 non-missing anchor를 쓴다.
- `linear`: `value`를 금지하고 정확히 하나의 ascending numeric 또는 temporal-string sort field가 필요하다.
  position은 unique해야 하고 행 index가 아니라 실제 x-distance로 finite numeric target을 보간한다.
- `edges`: 기본 `"keep"`. 필요한 anchor가 없는 eligible edge run은 유지하거나 `"error"`로 거부한다.
  `maxGap`은 positive safe integer이며 이를 초과한 missing run은 그대로 유지하고 edges error를 적용하지 않는다.
- Effect: 지정한 target fields만 대체하고 다른 cell을 보존한다. `impute`는 statistical facet topology라
  group anchor와 interpolation을 child-local source에서 다시 계산한다.
- Errors: invalid method별 option 조합, missing field, duplicate field/sort role, mixed type, invalid scalar,
  invalid linear position/target, unfillable `edges:"error"`, duplicate ID 또는 source resolution 오류를 원자적으로 거부한다.

### Formal values — `createImputedData`

- Implemented: `createImputedData(options: ImputedDataOptions): ChartProgram` (Full only).
- Implemented methods: `"constant" | "forward" | "backward" | "linear"`; edges `"keep" | "error"`.
- Proposed (NOT IMPLEMENTED): spline/model imputation, callback functions, automatic aggregation과 source replacement.

### Value coverage — `createImputedData`

- ✅ Covered: constant, forward, backward, non-uniform-distance linear interpolation, group isolation, stable sort,
  source-order restoration, edge and max-gap precedence.
- ✅ Covered: nullish-only missing policy, method/type/field/sort/edge errors and immutable failure.
- ✅ Covered: transform registry and facet-local statistical replay.
- Evidence: `test/unit/actions/data/complete-impute-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/contracts/phase2-data-types.test.js`.

## `createStackData`

- Signature: `createStackData({ id, source?, category, group, value, mode?, as? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `category`, `group`, `value`: 서로 다른 field다. 각 source row는 한 unique category/group cell이며
  value는 finite number다. Category와 group은 null/string/boolean/finite-number scalar identity를 쓴다.
- `mode`: `"stack" | "fill" | "center" | "diverging"`, 기본 `"stack"`이다. Phase 4의
  `layoutSeriesPartition`을 그대로 사용한다. Stack/fill/center는 non-negative values, diverging은 positive와
  negative를 zero에서 별도로 누적한다.
- `as`: `{ start?, end?, value?, share? }`; 기본은 `${value}_start`, `${value}_end`, `${value}_value`,
  `${value}_share`다. 모든 output은 고유하고 source field를 덮어쓰지 않는다.
- Effect: category는 source first appearance, group stack order는 전체 source의 first appearance를 쓴다.
  Output row order와 original cells를 보존하고 start/end, raw value, absolute-magnitude partition share를
  추가한다. Zero cell은 zero-thickness endpoint와 share 0으로 보존한다. Fill의 endpoints는 [0,1]이다.
- 오류: missing/non-finite roles, duplicate category/group cell, invalid mode/sign, output collision과 10,000
  output row 초과를 첫 state change 전에 거부한다.
- Coverage: `test/unit/actions/data/stack-data.test.js`가 stable cross-category group order, 모든 네 mode,
  zero/negative/share math, ranged mark consumption, alias/cell/type/mode errors와 ownership을 검증한다.

### Formal values — `createStackData`

- Implemented: `createStackData({ id: UserId; source?: UserId; category: FieldName; group: FieldName; value: FieldName; mode?: "stack" | "fill" | "center" | "diverging"; as?: StackDataOutputFields }): ChartProgram`
- Proposed (NOT IMPLEMENTED): duplicate-cell aggregation, missing-cell synthesis와 explicit series order.

### Value coverage — `createStackData`

- ✅ Covered: stack/fill/center/diverging shared math, stable order, zero thickness and absolute-magnitude shares.
- ✅ Covered: mixed-sign diverging and negative rejection in non-negative modes.
- ✅ Covered: missing/duplicate/non-finite cells, role/output uniqueness, source collision and immutable rejection.
- Evidence: `test/unit/actions/data/stack-data.test.js`, `test/unit/grammar/transforms/series-layout.test.js`.

## `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidenceMethod?, level?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear" | "polynomial" | "loess"`. 기본값은 `"linear"`다.
- `degree`, `span`: Implemented method-specific parameter다. polynomial degree 기본값은 `2`, LOESS
  span 기본값은 `0.75`이며 다른 method와 함께 주면 오류다. Degree는 `1..32`다.
- `confidenceMethod`, `level`: Implemented. method는 `"normal" | "student-t"`, level은 `(0, 1)`의
  finite number다. 기본은 Student-t와 `0.95`이며 둘 다 transform provenance에 저장된다.
- `confidence`: Implemented compatibility alias for `level`. 둘을 함께 주면 값이 같아야 하며 새 코드에는
  `level`을 권장한다.
- `interval`: Implemented `"mean" | "prediction"`이며 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping과 resolved method defaults를 transform provenance에 저장하고 observed
  unique x별 fitted row를 materialize한다. Polynomial은 normalized basis의 stable least squares를 사용하고
  LOESS는 source-order tie를 가진 tricube local-linear neighbors를 사용한다. Linear/polynomial은
  lower/upper를 만들고 LOESS는 fitted y만 만든다. Finite extreme input은 centered/scaled arithmetic으로
  계산하며 fitted value, model coefficient 또는 interval endpoint가 finite number로 표현될 수 없으면
  materialization 전에 명확히 거부한다. 전체 unique group/x output은 최대 `10,000` rows다.
  Polynomial work `sum(n*(degree+1)^2+(degree+1)^3)`와 LOESS work
  `sum(n*uniqueX*ceil(log2(n+1)))`는 각각 `10,000,000`을 넘기 전에 거부한다. graphic은 직접 만들지 않는다.
- Coverage: `test/unit/actions/data/regression-data.test.js`와
  `test/charts/cars-regression-scatterplot/reference-values.test.js`가 grouped/ungrouped 값,
  confidence bounds와 invalid/degenerate groups를 검증한다. 여러 confidence 대표값 coverage는 부분적이다.

### Formal values — `createRegressionData`

- Implemented: `createRegressionData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; groupBy?: FieldName } & ({ method?: "linear"; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "polynomial"; degree?: PositiveInteger; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "loess"; span?: UnitIntervalExclusiveZero }))`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionData`

- `id`, `source`, `x`, `y`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing fields, non-finite data와 degenerate groups.
- `method`
  - ✅ Covered: all three methods, unknown rejection, degree/span defaults and boundaries, deterministic provenance/output ordering.
- `confidenceMethod`, `level`, `confidence`
  - ✅ Covered: Student-t/normal, default `0.95`, compatibility alias, alias conflict, invalid method와 0/1 boundaries.
  - ✅ Covered: near-zero positive level normalization과 numerical kernels have
    independent finite-bound invariants.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - ✅ Covered: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Numeric range
  - ✅ Covered: overflow-safe linear/polynomial response means, full-range LOESS distance normalization,
    finite fitted rows와 unrepresentable interval rejection.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/cars-regression-scatterplot/reference-values.test.js`.

## `createDensityData`

- Signature: `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, weight?, as? })`
- `id`, `source`, `field`, `groupBy`: Implemented. 새 derived ID, existing source, 필수 quantitative
  field와 optional grouping field다.
- `bandwidth`
  - Status: Implemented. positive finite number 또는 `"auto"`; 기본은 `"auto"`다.
  - Effect: 선택한 kernel 폭을 결정한다. requested `"auto"`는 그대로 보존하고 deterministic
    rule-of-thumb 결과는 revision-owned `resolved.bandwidth`에 별도로 저장한다.
- `extent`
  - Status: Implemented. `"auto"` 또는 오름차순 finite `[min, max]`; 기본은 `"auto"`다.
  - Effect: 모든 group이 공유하는 sample grid의 시작과 끝을 결정한다. requested `"auto"`는 그대로
    보존하고 concrete extent는 `resolved.extent`에 저장한다.
- `steps`
  - Status: Implemented. `2..10,000` integer이며 기본값은 `100`이다.
  - Effect: inclusive grid의 row 수와 area path resolution을 결정한다.
- `kernel`
  - Status: Implemented. `"gaussian" | "epanechnikov" | "uniform" | "triangular"`; 기본값은
    `"gaussian"`이다.
  - Effect: bandwidth와 sample grid를 유지하면서 각 sample의 normalized weight recipe를 결정한다.
- `normalization`
  - Status: Implemented. `"unit" | "count"`; 기본값은 `"unit"`이다.
  - Effect: unit은 group density integral을 1로 맞추고 count는 같은 estimate에 group의 valid sample
    count를 곱한다.
- `weight`
  - Status: Implemented. Optional `StatisticalWeight`; 생략은 이전 unweighted KDE transform shape와
    계산 경로를 유지한다.
  - Effect: unit은 `sum(w*K)/(W*h)`, count는 `sum(w*K)/h`다. Positive-weight rows만 extent, group
    membership과 density에 기여하지만 every requested value/weight row는 선검증한다. Auto bandwidth는
    `1.06*s*nEff^(-1/5)`, `s=min(weighted sample stdev,IQR/1.34)`이며 IQR 0이면 sample stdev를 쓴다.
    Frequency/reliability의 quantile과 effective-size 정의는 weighted summary와 같다. Auto는
    `nEff>1`과 positive spread를 요구하고 explicit positive bandwidth는 singleton을 허용한다.
    Weighted grouped/split auto bandwidth는 profile마다 다시 계산한다. Profile이 하나면
    `resolved.bandwidth`, 여러 개면 first-appearance 순서의 `resolved.bandwidths`에
    `{ group?, split?, bandwidth }`를 저장하며 두 필드는 배타다. Explicit bandwidth와 unweighted
    호출은 기존 단일 `resolved.bandwidth` shape를 유지한다. Facet replay도 각 child source에서 재계산한다.
- `as`
  - Status: Implemented. 서로 다른 두 개의 non-empty field 이름이며 기본은
    `[`${field}_value`, `${field}_density`]`다.
  - Effect: derived row와 이후 encoding이 참조할 output field 이름을 결정한다.
- Effect: grouped KDE provenance와 deterministic values를 저장한다. Requested bandwidth/extent와
  revision-owned resolved bandwidth/extent를 분리하며, resolved kernel과 normalization default도 항상
  provenance에 기록한다. Finite extent difference가 overflow해도 convex interpolation으로 sample grid를
  만들며, requested step 수만큼 strictly increasing finite sample이나 finite density를 표현할 수 없으면
  derived dataset을 만들기 전에 거부한다.
- Coverage: `test/unit/actions/data/density-data.test.js`와
  `test/charts/cars-density-area/reference-values.test.js`가 auto/explicit bandwidth, extent,
  grouped/ungrouped, ownership과 오류를 검증한다. steps의 여러 경계/대표 조합은 부분적이다.

### Formal values — `createDensityData`

- Implemented: `createDensityData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; weight?: StatisticalWeight; as?: readonly [FieldName, FieldName] })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDensityData`

- `id`, `source`, `field`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing field와 non-finite samples.
- `bandwidth`
  - ✅ Covered: 생략/`"auto"`, positive finite representative, zero/negative/non-finite rejection.
  - ✅ Covered: positive finite validation, representative explicit/auto values and kernel formula invariants;
    exhaustive magnitude stress is outside the deterministic contract.
- `extent`
  - ✅ Covered: `"auto"`, explicit `[min, max]`, reversed/non-finite rejection.
  - ✅ Covered: strict ascending extent rejects constant/reversed pairs; explicit source-external extent materializes
    its requested sample endpoints.
- `steps`
  - ✅ Covered: default `100`, explicit representative, `<2`/non-integer rejection.
  - ✅ Covered: exact minimum `2`, representative/default counts and invalid bounds. Unbounded performance stress is
    not a public semantic contract.
- `as`
  - ✅ Covered: inferred names, two explicit names, wrong cardinality/invalid names rejection.
- `kernel`
  - ✅ Covered: four formulas, Gaussian default, invalid value, provenance와 primitive/public parity.
- `normalization`
  - ✅ Covered: unit/count formulas, unit default, group-local scaling, invalid value와 provenance.
- `weight`
  - ✅ Covered: frequency/reliability formulas, auto bandwidth, positive-row extent, scale invariance,
    zero-weight value validation, all-zero groups and explicit-bandwidth singleton.
- Numeric range
  - ✅ Covered: full finite-range extent interpolation, large-offset auto bandwidth, finite density invariant와
    unrepresentable grid/estimate rejection.
- Resource limits: 실제 non-empty group/split profile의 `steps` 합은 최대 `10,000` rows이며,
  `validRows * steps` density work는 최대 `10,000,000`이다.
- Evidence: `test/unit/actions/data/density-data.test.js`,
  `test/charts/cars-density-area/reference-values.test.js`.

## `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 정확히 하나의 transform definition을 가진 tuple. Public direct-authoring union은
  filter/fold/computed/stack/regression/density/interval/time-unit/window/summary/bin/bin2d schema이며 값 materialization은 해당 전용 action이 담당한다. Box summary,
  box outlier, mark filter provenance는 composite action이 생성하는 internal transform으로 public union에 넣지 않는다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty/multiple transform schema를 거부한다.
- Consumer precondition: chart facade와 ordinary mark의 공통 data selection은 `values`가 있는 dataset을 요구한다.
  Definition-only ID를 explicit/current data로 소비하면 dataset ID와 materialized values의 필요성을 설명하는
  domain error를 낸다. 정의 생성·internal rebind는 유지하며 자동 실행하거나 다른 dataset으로 fallback하지 않는다.
- Coverage: `test/unit/actions/data/derived-data.test.js`가 public branch의 direct call, 배열 cardinality,
  invalid discriminant와 caller-owned input immutability를 검증한다. Package consumer는 documented filter call과
  closed union을 strict TypeScript로 compile한다.

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [DatasetTransform] })`, where public `DatasetTransform = FilterTransform | FoldTransform | ComputedTransform | StackTransform | RegressionTransform | DensityTransform | IntervalTransform | TimeUnitTransform | WindowTransform | SummaryTransform | BinTransform | Bin2DTransform`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/fold/computed/stack/regression/density/interval/time-unit/window/summary/bin/bin2d direct schema, object/empty/multiple/unknown rejection,
    one-element tuple acceptance와 deep immutable ownership.
  - Built-in value materializer는 owning high-level action이 만든 single-transform resource만 받는다.
- Evidence: `test/unit/actions/data/derived-data.test.js`, `test/unit/actions/data/derived-consumers.test.js`,
  `scripts/package-consumer.js`, 각 high-level data action test.

## `editDerivedData`

- Signature: `editDerivedData({ target, definition, dependents? })`.
- Target: 필수 stable logical standalone-derived owner ID 또는 그 owner의 current snapshot ID다. Source dataset,
  stale revision ID와 chart-owned internal dataset은 오류다. 기존 owner registry가 없는 serialized program은 direct
  top-level creator trace, single transform과 source를 모두 확인할 수 있을 때만 lazy owner로 migration한다.
- `definition`: 현재 transform과 같은 type의 complete requested definition이다. Dataset envelope가 아니므로 `id`,
  `source`, `current`, materializer가 추가한 `resolved`를 받지 않는다. Complete transform의 domain option `values`는
  이 금지 목록과 무관하며 허용된다. Arrays, AST, aggregate/output maps는 전체 교체다.
- `dependents`: `"reject" | "recompute"`, 기본 `"reject"`. Reject는 첫 downstream derived dataset을 deterministic하게
  보고하고 쓰기 전에 중단한다. Recompute는 `dataset.source` DAG의 reachable closure를 semantic dataset 순서 기반
  topological order로 새 immutable revisions에 materialize한다. Cycle, unsupported transform, 잘못된 downstream field,
  non-finite output 또는 visual consumer incompatibility가 하나라도 있으면 원본 state와 trace를 그대로 보존한다.
- Output roles: 같은 semantic output role의 일대일 rename만 direct layer encoding, category-order summary,
  weighted theta, Parallel dimension/key, selection selector와 jitter key에 전달한다. Downstream expression/predicate의
  임의 field 문자열은 치환하지 않는다.
- Effect: `materializationConfigs.data.<family>.<owner>.current`를 새 snapshot으로 이동하고 direct consumers를 모두
  rebind/rematerialize한다. Context는 원래 값을 보존하되 `currentData`가 retired snapshot을 가리켰을 때만 대응 revision으로
  이동한다. 새 owner/current와 모든 live references를 연결한 뒤 실제 미참조 old revision만 release한다.
- No-op: canonical requested definition이 동일하면 dataset revision을 만들지 않는다. Public action trace node는 남지만
  materialize/rebind/release child는 없다.
- Immutability: caller definition/patch/source rows, 이전 program의 semantic/graphic/config/context/trace/resolved scales와
  composition children을 성공·실패 모두 변경하지 않는다.

### Formal values — `editDerivedData`

- Implemented: `editDerivedData({ target: UserId; definition: RequestedDatasetTransform; dependents?: "reject" | "recompute" }): ChartProgram`.
- Editable transform types: `computed | filter | fold | summary | bin | bin2d | timeUnit | window | density | stack |
  regression | interval | ecdf | normalize | complete | impute`.
- Planned (NOT IMPLEMENTED): source 교체와 transform type 교체. 기존 `editBin2DData.source`는 전용 compatibility 예외다.
- Proposed (NOT IMPLEMENTED): 추가 transform family가 standalone create lifecycle을 얻을 때 같은 registry 계약으로 검토한다.

### Value coverage — `editDerivedData`

- ✅ Covered: explicit owner/current target, lazy legacy owner, wrong/source/chart-owned/stale target, complete definition,
  resolved/source injection, same-type enforcement, no-op, deterministic revision IDs, default reject, full DAG recompute,
  sibling preservation, logical-source reuse, direct output-role rename와 원자적 downstream failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`, `test/unit/actions/data/bin2d-data.test.js`.

## Focused derived-data editor rules

아래 focused actions는 모두 `target`을 필수로 받고 `dependents?`를 공유한다. 나머지 keys는 해당 create action에서
`id`와 `source`를 뺀 partial transform options다. 최소 한 transform option이 필요하며 omission은 current requested
definition을 보존한다. `undefined`와 `null`은 삭제 기호가 아니다. Arrays/objects/AST는 전체 교체다. `weight:false`는
weight를 지원하는 focused editors에서만 stored weight를 제거한다. 각 action은 자신의 trace node 아래 wrapped
`editDerivedData`를 두며 모든 lifecycle/error/immutability 규칙을 상속한다.

## `editComputedData`

- Signature: `editComputedData({ target, as?, expression?, dependents? })`.
- `as` 또는 typed `ComputedExpression` AST를 교체한다. Output rename은 direct semantic role만 rebind한다.

### Formal values — `editComputedData`

- Implemented: `editComputedData(options: EditComputedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 임의 함수·문자열 식 실행.

### Value coverage — `editComputedData`

- ✅ Covered: output·AST 전체 교체, direct output-role rename, downstream AST의 unsafe field 유지 시 atomic failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editFilteredData`

- Signature: `editFilteredData({ target, field?, oneOf? | predicate? | range?, dependents? })`.
- Filter mode option을 제공하면 이전 mode keys를 모두 제거한 뒤 exactly-one mode를 검증한다. `field`만 편집하면
  현재 mode를 유지한다.

### Formal values — `editFilteredData`

- Implemented: `editFilteredData(options: EditFilteredDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 callback predicate.

### Value coverage — `editFilteredData`

- ✅ Covered: field-only 유지, oneOf/predicate/range 상호배타 전환, invalid range와 empty patch 거부.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editFoldData`

- Signature: `editFoldData({ target, fields?, as?, dependents? })`.
- `fields`와 `{key,value}` output map은 각자 전체 교체다.

### Formal values — `editFoldData`

- Implemented: `editFoldData(options: EditFoldDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 부분 output-map merge.

### Value coverage — `editFoldData`

- ✅ Covered: fields와 as whole replacement, output role migration, row-limit·type validation 재사용.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editSummaryData`

- Signature: `editSummaryData({ target, groupBy?, aggregates?, members?, weight?, dependents? })`.
- `aggregates`는 전체 교체하며 output role은 unique aggregate operation+source field identity로만 대응한다. 배열 index로
  rename을 추론하지 않는다. `weight:false`는 weight를 제거한다.

### Formal values — `editSummaryData`

- Implemented: `editSummaryData(options: EditSummaryDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): aggregate 배열의 index 기반 patch와 source 교체.

### Value coverage — `editSummaryData`

- ✅ Covered: groupBy/aggregate/member replacement, semantic aggregate role, weighted→unweighted 제거, dependent recompute.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editBinData`

- Signature: `editBinData({ target, field?, maxBins? | step? | boundaries?, extent?, nice?, zero?, includeEmpty?, members?, as?, weight?, dependents? })`.
- Bin mode key를 제공하면 이전 maxBins/step/boundaries mode를 지운다. `as`는 complete map replacement이고
  `weight:false`는 weight를 제거한다.

### Formal values — `editBinData`

- Implemented: `editBinData(options: EditBinDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 bin-mode partial merge.

### Value coverage — `editBinData`

- ✅ Covered: maxBins/step/boundaries exclusivity, exact output roles, includeEmpty/members와 weight removal.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editTimeUnitData`

- Signature: `editTimeUnitData({ target, field?, unit?, as?, temporalUnit?, timeZone?, weekStartsOn?, weekRule?, dependents? })`.
- Non-week unit으로 전환하면 week-only keys를 제거한다. Week로 전환하면 create defaults와 ISO/Monday constraint를
  동일하게 적용한다.

### Formal values — `editTimeUnitData`

- Implemented: `editTimeUnitData(options: EditTimeUnitDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 host-local implicit timezone.

### Value coverage — `editTimeUnitData`

- ✅ Covered: unit/zone/input/output 교체, week-only key cleanup, deterministic calendar validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editWindowData`

- Signature: `editWindowData({ target, partitionBy?, sortBy?, operations?, temporalUnit?, dependents? })`.
- 모든 목록과 operation/frame 객체는 전체 교체이며 row/duration frame exclusivity와 duration temporal policy를
  create와 동일하게 검증한다.

### Formal values — `editWindowData`

- Implemented: `editWindowData(options: EditWindowDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): operation별 index patch와 source 교체.

### Value coverage — `editWindowData`

- ✅ Covered: partition/sort/operation whole replacement, row·duration frame validation, logical-source replay.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editDensityData`

- Signature: `editDensityData({ target, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, weight?, dependents? })`.
- Resolved bandwidth/extent는 carried state가 아니며 새 source/current requested definition에서 재계산한다.
  `weight:false`는 weight를 제거한다.

### Formal values — `editDensityData`

- Implemented: `editDensityData(options: EditDensityDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned density facade의 standalone target adoption.

### Value coverage — `editDensityData`

- ✅ Covered: requested/resolved 분리, bandwidth/extent/steps/kernel/normalization/as 편집과 weight removal.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editStackData`

- Signature: `editStackData({ target, category?, group?, value?, mode?, as?, dependents? })`.
- Category/group/value grain과 complete output map을 final candidate에서 함께 검증한다.

### Formal values — `editStackData`

- Implemented: `editStackData(options: EditStackDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 output-map partial merge.

### Value coverage — `editStackData`

- ✅ Covered: grain fields, four modes, complete semantic output roles와 duplicate-cell failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editRegressionData`

- Signature: `editRegressionData({ target, x?, y?, groupBy?, method?, degree?, span?, confidenceMethod?, level?, confidence?, interval?, dependents? })`.
- Linear↔polynomial은 공통 confidence/interval을 보존하고 degree만 mode에 맞게 추가/제거한다. Loess 전환은
  confidence/interval을 제거하며 loess 밖으로 전환할 때 해당 defaults를 다시 정규화한다.

### Formal values — `editRegressionData`

- Implemented: `editRegressionData(options: EditRegressionDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned regression facade의 standalone target adoption과 source 교체.

### Value coverage — `editRegressionData`

- ✅ Covered: linear/polynomial/loess mode cleanup, confidence policy, group/field edit와 finite model validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editIntervalData`

- Signature: `editIntervalData({ target, field?, groupBy?, center?, extent?, method?, level?, as?, dependents? })`.
- Non-CI extent로 전환하면 CI-only method/level을 제거한다. Mean/median과 extent의 valid pair는 final candidate에서
  검증하며 자동으로 반대쪽 option을 추측하지 않는다.

### Formal values — `editIntervalData`

- Implemented: `editIntervalData(options: EditIntervalDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): center/extent pair 자동 교정과 source 교체.

### Value coverage — `editIntervalData`

- ✅ Covered: mean/median extent pairs, CI-only cleanup, complete center/lower/upper output role migration.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editECDFData`

- Signature: `editECDFData({ target, field?, groupBy?, weight?, missing?, as?, dependents? })`.
- `weight:false`는 weight field를 제거하고 explicit output map은 전체 교체한다.

### Formal values — `editECDFData`

- Implemented: `editECDFData(options: EditECDFDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned ECDF facade의 standalone target adoption과 source 교체.

### Value coverage — `editECDFData`

- ✅ Covered: field/group/missing/as edit, weighted→unweighted 제거와 cumulative output roles.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editNormalizedData`

- Signature: `editNormalizedData({ target, field?, as?, groupBy?, method?, variance?, zeroDenominator?, baseline?, sortBy?, dependents? })`.
- Method 변경은 새 method에서 유효한 shared options만 유지한다. Baseline-family 내부 전환은 baseline/sortBy를 유지하고,
  다른 family에서 들어오면 명시 patch 또는 create defaults를 사용한다.

### Formal values — `editNormalizedData`

- Implemented: `editNormalizedData(options: EditNormalizedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 method-incompatible option 자동 보존.

### Value coverage — `editNormalizedData`

- ✅ Covered: share/zscore/minmax/baseline family cleanup, zero-denominator policy와 output rename.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editCompleteData`

- Signature: `editCompleteData({ target, key?, groupBy?, values? | sequence?, fill?, members?, dependents? })`.
- `values` 또는 `sequence`를 제공하면 이전 domain mode를 제거한다. `values`는 materialized rows가 아니라 Complete의
  requested typed domain이다. `fill`은 whole-map replacement다.

### Formal values — `editCompleteData`

- Implemented: `editCompleteData(options: EditCompleteDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 values/sequence 병합.

### Value coverage — `editCompleteData`

- ✅ Covered: observed/values/sequence domain 전환, Complete values 허용, fill/members/grouping validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editImputedData`

- Signature: `editImputedData({ target, fields?, groupBy?, sortBy?, method?, value?, edges?, maxGap?, dependents? })`.
- Constant↔ordered mode 전환에서 `value`를 정리하고 final method의 sort/value requirements를 검증한다.

### Formal values — `editImputedData`

- Implemented: `editImputedData(options: EditImputedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 method-required fields 자동 추론.

### Value coverage — `editImputedData`

- ✅ Covered: constant/forward/backward/linear 전환, value cleanup, sort/edges/maxGap validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `createTimeUnitData`

- Signature: `createTimeUnitData({ id, source?, field, temporalUnit?, unit, as, timeZone?, weekStartsOn?, weekRule? })`
- Lifecycle: standalone 호출은 stable logical owner를 만들고 `editTimeUnitData`가 immutable revision을 생성해
  consumer를 rebind한다. `id`는 최초 생성 시 필수 새 derived dataset ID다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하며 안전하게 추론할 수 없으면 오류다.
- `field`: 모든 row에 존재하는 temporal input field다. Existing temporal normalization과 동일하게 finite timestamp,
  ISO/date string 또는 four-digit year를 받는다. `temporalUnit`은 입력 해석만 제어하며 transform에 보존된다.
- `unit`: `"year" | "quarter" | "month" | "day" | "hour" | "minute" | "second" | "week" | "weekday"`의
  closed vocabulary다.
- `as`: source의 어느 row에도 존재하지 않는 새 output field다. Input field와 달라야 한다.
- `timeZone`: optional non-empty IANA name이다. 생략은 `"UTC"` 계산과 같지만 기존 7-unit 호출은 이전 stored
  transform shape를 유지한다. host local timezone과 locale에 의존하지 않는다.
- Week policy: `unit:"week"`에서 `weekStartsOn` 기본은 Monday `1`, `weekRule` 기본은 `"calendar"`다.
  ISO rule은 Monday만 허용한다. week 전용 options를 다른 unit과 함께 쓰면 오류다.
- Effect: source row order와 모든 existing cell을 보존한다. `weekday`는 zone-local Sunday `0`부터 Saturday `6`의
  nominal integer를 추가한다. 다른 unit은 해당 zone civil bucket 시작을 나타내는 finite epoch milliseconds를 추가한다.
  Output timestamp를 temporal encoding에 연결할 때는 `temporalUnit:"timestamp"`를 사용해 numeric-year heuristic을 피한다.
- Boundary policy: instant를 Gregorian civil parts로 바꾸고 requested unit 시작을 만든 뒤 instant로 역변환한다.
  DST fold는 가장 이른 matching instant, gap은 같은 bucket 안의 첫 유효 instant를 선택한다. 완전히 존재하지 않는
  civil boundary/date 또는 Date 범위 밖 결과는 RangeError다. UTC는 기존 direct arithmetic 결과를 유지한다.
- Facet: row-preserving transform으로 분류한다. Explicit earlier partition anchor를 사용하면 각 child에서 canonical
  materializer를 replay하고, transform 자체가 latest common anchor이면 materialized rows를 직접 partition한다.
- 오류: invalid/duplicate ID, unknown source, unknown option/unit/zone/week policy, invalid/missing temporal value,
  input/output identity, existing output collision와 unrepresentable boundary를 첫 state change 전에 거부한다.

### Formal values — `createTimeUnitData`

- Implemented: `createTimeUnitData(options: TimeUnitDataOptions): ChartProgram` (Full only).
- `TimeUnit`은 기존 7개 unit과 `"week" | "weekday"`를 포함한다. Week transform만 normalized
  `weekStartsOn`과 `weekRule`을 저장하며 explicit `timeZone`은 모든 unit에서 저장한다.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): locale calendar 선택, aggregation과 resampling.

### Value coverage — `createTimeUnitData`

- `unit`
  - ✅ Covered: 기존 seven boundaries, week/weekday, custom week starts, ISO Monday, quarter/leap/sub-day/early-year.
- `timeZone`
  - ✅ Covered: UTC/Seoul/New_York/Kolkata/Lord_Howe/Apia, hour/half-hour offsets, DST gap/fold와 skipped date.
- `field`, `as`
  - ✅ Covered: timestamp/ISO/date/year inputs, missing/invalid input, distinct output와 collision rejection.
- Lifecycle and integration
  - ✅ Covered: current/explicit source, immutable provenance/rows/options, action hierarchy, direct transform schema,
    temporal position consumption, registered replay와 explicit-anchor facet rederivation.
- Evidence: `test/unit/grammar/transforms/time-unit.test.js`,
  `test/unit/actions/data/time-unit-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `scripts/package-consumer.js`.

## `createWindowData`

결과 field 이름은 일반 own data property로 저장한다. __proto__, constructor, toString도 허용하며
source row의 prototype을 바꾸거나 결과를 누락하지 않는다. 뒤 operation은 앞의 해당 결과를 field로 읽을 수 있다.

- Signature: `createWindowData({ id, source?, partitionBy?, sortBy?, operations, temporalUnit? })`
- Lifecycle: standalone 호출은 stable logical owner를 만들고 `editWindowData`가 immutable revision을 생성해
  consumer를 rebind한다. `id`는 최초 생성 시 새 derived dataset ID여야 한다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하고 유일하게 추론할 수 없으면 오류다.
- `partitionBy`: field 이름 하나 또는 field 이름 array다. 기본은 `[]`이며 전체 source가 한 partition이다.
- `sortBy`: `{ field, order? }` array다. 기본은 `[]`, order 기본은 `"ascending"`이다. 여러 field는
  앞에서부터 비교하고 동률은 source row order로 안정적으로 해소한다. `null`/missing은 각 방향의 끝에 둔다.
- `operations`: 비어 있지 않은 ordered array다. 앞 operation의 output을 뒤 operation의 `field`로 사용할 수 있다.
  - `rowNumber`, `rank`, `denseRank`: `{ op, as }`; rank 계열은 non-empty `sortBy`가 필요하다.
  - `cumulativeSum`: `{ op, field, as }`; field 값은 모두 finite number여야 한다.
  - `lag`, `lead`: `{ op, field, as, offset?, default? }`; offset 기본은 `1`, default 기본은 `null`이다.
  - `movingMean`, `movingSum`: `{ op, field, as, frame, minPeriods?, missing? }`다. Row frame은
    `{ preceding, following? }`, duration frame은 `{ duration:{ preceding, following?, unit } }`이며 둘을 섞지 않는다.
    `minPeriods` 기본은 `1`, `missing` 기본은 `"error"`; `"skip"`도 허용한다. Error mode는 nullish/nonfinite를
    거부한다. Skip mode만 nullish value를 window count와 합계에서 제외하며 NaN/Infinity는 항상 오류다.
- Row frame: preceding/following은 non-negative safe integer이고 current sorted row를 포함한다. 양쪽 edge는
  available rows로 truncate한다.
- Duration frame: unit은 `"millisecond" | "second" | "minute" | "hour" | "day"`; day는 정확히 24시간이다.
  정확히 하나의 ascending `sortBy`가 필수이며 position은 `temporalUnit`으로 해석한 epoch milliseconds다.
  Closed lower/upper boundary를 사용하고 동일 timestamp peers는 같은 window와 결과를 공유한다.
- Numeric policy: moving sum/mean은 scaled compensated rolling arithmetic을 쓰며 final output이 finite여야 한다.
  Duration은 stable sort와 two pointers로 group마다 sort `O(n log n)`, scan `O(n)`이다.
- Effect: normalized provenance와 materialized values를 새 dataset에 저장한다. 계산은 partition마다 정렬된
  순서로 수행하지만 최종 rows는 source row order를 보존한다. 모든 input과 output은 구조적으로 복사되고 freeze된다.
- 오류: duplicate/invalid ID, unknown source, missing field, duplicate sort/output field, output collision,
  incomparable sort values, invalid row/duration frame, invalid temporal position, minPeriods/missing policy,
  nonfinite result 또는 operation-specific option을 명확히 거부한다.
- Coverage: grammar, public action, direct derived schema, trace, facet replay와 package consumer를 각각 검증한다.

### Formal values — `createWindowData`

- Implemented: `createWindowData(options: WindowDataOptions): ChartProgram` (Full only).
- `WindowOperation`은 rank/cumulative/lag/lead와 row 또는 duration frame을 가진 movingMean/movingSum의 strict union이다.
- Planned (NOT IMPLEMENTED): percent rank와 ntile.
- Proposed (NOT IMPLEMENTED): weighted windows와 calendar-duration windows.

### Value coverage — `createWindowData`

- `partitionBy`, `sortBy`
  - ✅ Covered: omitted/single/multiple partition fields, omitted/multiple sort fields, both directions,
    stable ties, null/missing placement, invalid fields and mixed comparable types.
- `operations`
  - ✅ Covered: all eight operations, offset/frame defaults, one/two-sided and zero frames, truncated edges,
    sequential dependency, output collision, missing fields, invalid values, finite extreme means,
    unrepresentable sum outputs and empty operation list.
  - ✅ Covered: elapsed-duration frames, irregular positions, closed endpoints, timestamp peers, minPeriods,
    nullish skip behavior, invalid mixed frame/temporal policies and source-order restoration.
- Lifecycle and integration
  - ✅ Covered: source inference, duplicate ID rejection, source immutability, trace hierarchy, registry dispatch,
    facet replay, direct `createDerivedData` validation and packaged TypeScript/runtime consumption.
- Evidence: `test/unit/grammar/transforms/window.test.js`, `test/unit/actions/data/window-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-window-rank-scatterplot/data.test.js`,
  `test/charts/airline-passenger-moving-windows/`, `scripts/package-consumer.js`.

## `createBin2DData`

- Signature: `createBin2DData({ id, source?, x, y, bins?, extent?, includeEmpty?, members?, as? })`
- Lifecycle: stable logical owner를 가진 mutable resource다. 첫 호출은 `id` dataset을 만들고, 같은 `id`의
  후속 호출은 deterministic revision dataset을 만든 뒤 direct layer consumer를 명시적으로 rebind하고 이전
  unreferenced revision을 release한다. Earlier program과 caller input은 바뀌지 않는다.
- `source`: existing materialized dataset ID다. 첫 호출에서 생략하면 current data를 사용한다. Revision에서
  생략하면 이전 revision의 source를 보존한다.
- `x`, `y`: finite numeric pair를 읽을 source field다. 한쪽이라도 invalid/missing인 row는 eligible하지 않다.
- `bins`: positive integer 또는 `{ x, y }`; 기본 `{ x: 10, y: 10 }`이다. 각 축은 최대 10,000 bins,
  전체 grid는 최대 1,000,000 cells다.
- `extent`: optional `{ x?, y? }` explicit increasing finite endpoints다. 생략 axis는 eligible min/max를 쓴다.
  Explicit extent는 모든 eligible 값을 포함해야 하며 auto extent가 constant면 오류다.
- `includeEmpty`: 기본 `false`. `true`면 deterministic y-major/x-minor 순서로 빈 cell도 저장한다.
- `members`: 기본 `false`. `true`면 source row object가 아니라 source row index array를 cell에 저장한다.
- `as`: generated `x0/x1/y0/y1/count/members` field 이름을 부분 override한다. Default는 `id` namespace를 쓴다.
- Revision에서 output 이름이 바뀌면 direct visual consumer의 같은 output role을 참조하던 encoding field,
  category-order summary, theta weight, Parallel dimension field/key, stored field selection과 jitter key도 새 이름으로
  rebind한다. Parallel dimension의 stored title label은 보존한다. Scale, mark와 inferred guide title은 그 semantic
  binding에서 다시 materialize된다. Optional members
  output을 제거할 때 남은 direct consumer binding이 이를 참조하면 revision을 원자적으로 거부한다.
- Effect: normalized request와 resolved extent/edges/count metadata를 transform provenance에 저장하고, 각 cell의
  lower/upper bounds와 count를 immutable values로 저장한다. Cell은 `[lower, upper)`이며 마지막 upper bound만
  포함한다. 모든 edge는 finite strictly increasing number다. Full finite numeric range처럼 raw span이 overflow하는
  extent도 안정적으로 보간하며, 요청한 bin 수만큼 서로 다른 edge를 표현할 수 없으면 bin 수를 조용히 줄이지 않고
  materialization 전에 `RangeError`를 던진다.
- Facet: source partition 뒤 requested transform을 child마다 replay하므로 automatic extent와 counts는 child
  rows에서 다시 계산된다.
- 오류: invalid field/bin/extent/output contract, per-axis/total grid limit 초과, unrepresentable edge count,
  eligible row 부재, silent explicit-extent data loss, duplicate output names를 state 생성 전에 거부한다. 현재
  direct derived-dataset consumer가 있는 owner revision replacement는 dependency를 조용히 stale하게 두지 않고
  명확히 거부한다.

### Formal values — `createBin2DData`

- Implemented: `createBin2DData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; includeEmpty?: boolean; members?: boolean; as?: { x0?, x1?, y0?, y1?, count?, members? } })`
- Planned (NOT IMPLEMENTED): dependent derived-dataset revision cascade, weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBin2DData`

- Grid and boundaries
  - ✅ Covered: scalar/per-axis counts, automatic/partial/complete explicit extents, interior and final boundaries,
    row-major order, empty omission/inclusion, constant extent, per-axis/total limits, full finite-range interpolation,
    unrepresentable edge count and silent-loss rejection.
- Output
  - ✅ Covered: namespaced/partial/custom fields, optional member indexes, unique fields, count conservation and
    independent Cars oracle parity.
- Lifecycle and integration
  - ✅ Covered: source inference, filtered source, repeated immutable revision, direct mark/scale/guide rematerialization,
    release, facet replay, direct transform schema, runtime and strict TypeScript package consumption.
- Evidence: `test/unit/grammar/transforms/bin2d.test.js`, `test/unit/actions/data/bin2d-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-binned-heatmap/data.test.js`,
  `scripts/package-consumer.js`.

## `editBin2DData`

- Signature: `editBin2DData({ target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?, dependents? })`.
- Target: `target`은 materialization registry의 stable logical Bin2D owner ID다. 생략하면
  `context.currentData`가 가리키는 current revision의 owner, 그 다음 유일한 owner를 사용한다. Current match가 없고
  owner가 둘 이상이면 명시적 `target`을 요구하며 첫 owner를 선택하지 않는다.
- Partial edit: `target` 외 최소 한 option과 complete candidate 기준 실제 source/transform 변화가 필요하다. Omitted
  top-level option은 current revision의 requested transform provenance에서 보존한다. Explicit `bins`와 `extent`는
  create-time vocabulary 전체를 교체하므로 `extent` object에서 생략한 axis는 automatic extent로 돌아간다.
- Output and members: explicit `as`는 `x0/x1/y0/y1/count`와, `members: true`일 때 `members`까지 complete output map을
  요구한다. `as`를 생략하고 members를 켜면 logical owner namespace의 members field를 추가하고, 끄면 prior members
  output을 제거한다. 다른 output field는 보존한다.
- `dependents`: `"reject" | "recompute"`, 기본 `"reject"`. 공통 `editDerivedData` revision executor를 사용한다.
  Recompute는 current Bin2D를 source로 삼는 전체 derived closure를 새 revision으로 갱신한다. `source`가 자기 downstream을
  가리키는 cycle과 downstream output-field incompatibility는 첫 쓰기 전에 거부한다.
- Atomic effect: complete source rows와 transform을 계산하고 derived-dataset dependency 및 모든 direct visual
  consumer의 rematerialization을 speculative immutable branch에서 먼저 검증한다. 성공하면 deterministic revision ID로
  새 dataset을 만들고 wrapped `rebindLayerData` 뒤 output role에 연결된 downstream semantic/config field를 새 output
  이름으로 옮긴 다음 scale/mark/guide materialization plan을 적용하며, 참조가 없어진 prior revision만
  `releaseDerivedData`로 정리한다. Logical owner ID와 consumer layer/scale/coordinate/guide/selection identity는 유지한다.
- Compatibility: `createBin2DData({ id: existing, ...completeTransform })`의 full reauthor/revision 동작과
  `editBin2DData`의 optional target/source는 유지한다. Partial intent에는 `editBin2DData`를 사용한다. Derived dataset이
  current revision을 직접 소비하면 기본 reject하고 명시적인 `dependents:"recompute"`만 cascade한다.
- Immutability: previous program, prior revision, source rows와 caller-owned nested options를 변경하지 않는다.

### Formal values — `editBin2DData`

- Implemented: `editBin2DData({ target?: UserId; source?: UserId; x?: FieldName; y?: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; includeEmpty?: boolean; members?: boolean; as?: { x0: FieldName; x1: FieldName; y0: FieldName; y1: FieldName; count: FieldName; members?: FieldName }; dependents?: "reject" | "recompute" })`.
- Planned (NOT IMPLEMENTED): weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editBin2DData`

- Owner and partial state
  - ✅ Covered: explicit/current/unique owner resolution, missing/empty/ambiguous/no-op rejection, every editable top-level
    option, omission preservation, complete output map and members output transition.
- Revision and dependencies
  - ✅ Covered: deterministic immutable revision, every direct layer rebind, scale/mark/guide rematerialization, prior release,
    derived-consumer rejection, output-role rename across Cartesian/category/Polar/Parallel bindings and stored selection/jitter,
    referenced optional-output removal rejection, downstream failure preflight and exact trace uniqueness.
- Compatibility and immutability
  - ✅ Covered: repeated-create behavior, earlier program, source rows and caller option preservation, runtime/types/contracts,
    packed Node/TypeScript/Browser and representative Canvas/PNG consumers.
- Evidence: `test/unit/actions/data/bin2d-data.test.js`, `test/contracts/bin2d-lifecycle-render.test.js`,
  `test/browser/package-consumer.browser.js`, `scripts/package-consumer.js`.

## `createCoordinate`

- Signature: `createCoordinate({ id?, type?, layers? })`.
- `id`: valid user ID, 기본 `"main"`.
- `type`: `"cartesian" | "polar" | "parallel"`, 기본 cartesian.
- `layers`: existing unique layer ID array, 기본 `[]`.
- Effect: named semantic coordinate를 만들고 coordinate가 없는 selected layers에 reference를 저장한다.
  equivalent repeated definition은 idempotent이고 기존 layer를 다른 coordinate로 이동시키지 않는다.
- Coverage: `test/unit/actions/coordinates/create-coordinate.test.js`와 Parallel chart contract가 all three types, attachments,
  idempotence, conflicts와 validation을 검증한다.
- Cartesian, Polar와 Parallel resources는 모두 current materialized consumers와 guides를 가진다.

### Formal values — `createCoordinate`

- Implemented: `createCoordinate({ id?: UserId; type?: "cartesian" | "polar" | "parallel"; layers?: readonly UserId[] } = {})`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createCoordinate`

- `id`: ✅ Covered omission→`"main"`, valid custom IDs, malformed IDs and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"cartesian"`, `"cartesian"`, `"polar"`, `"parallel"`, unknown value.
- `layers`
  - ✅ Covered: omission/empty, one/multiple existing IDs, duplicates, unknown layer, reattachment conflict.
- Evidence: `test/unit/actions/coordinates/create-coordinate.test.js`.

## `editCoordinate`

- Signature: `editCoordinate({ target, aspect?, polarFrame? })`; at least one patch is required.
- `target`: required existing coordinate ID. The action does not infer a coordinate.
- `aspect`: `"auto"` or `{ mode, ratio, alignX?, alignY? }`.
  - `mode: "frame"` fixes the effective plot width/height ratio.
  - `mode: "data"` fixes `(pixels per x unit) / (pixels per y unit)` and is available only for one complete Cartesian
    quantitative linear x/y scale pair.
  - `ratio` must be a positive finite number. `alignX` and `alignY` accept `"start" | "center" | "end"` and default
    to `"center"`.
  - `"auto"` removes the stored aspect request and returns to the complete allocated plot bounds.
- `polarFrame`: `"auto"` or `{ center?, radius? }`, available only for a Polar coordinate.
  - `center: { x, y }` uses finite fractions from 0 through 1 inside the aspect-adjusted effective bounds and defaults to
    `{ x: 0.5, y: 0.5 }`.
  - `radius` is `{ unit: "fraction", value }` with `0 < value <= 1` or `{ unit: "px", value }` with a positive
    finite value. It defaults to `{ unit: "fraction", value: 1 }`.
  - The frame object is a complete replacement. Supplying only center restores the default radius; supplying only radius
    restores the default center. `"auto"` removes the stored request.
  - The resolved maximum is the minimum distance from the requested center to the four effective-bound edges. A pixel
    radius larger than that maximum and a boundary center reject rather than clamp.
- Effect: stores normalized requested aspect on the semantic coordinate, resolves one largest-fit effective rectangle inside
  the allocated plot, then rematerializes coordinate scales, marks, dependent labels, guides, layout resources, and highlights.
  Allocated Canvas bounds remain unchanged.
- Data mode uses the absolute spans of the final nice-resolved domains. Reversed domains retain their direction. Explicit
  ranges must already equal the requested effective range and direction; they are never silently replaced.
- The whole edit is immutable and atomic. Incomplete/nonlinear/ambiguous positional consumers, zero spans, incompatible
  explicit ranges, and invalid options reject before any resulting program or trace is exposed.
- This action is available from the complete `ggaction` entry and absent from `ggaction/basic`.

### Formal values — `editCoordinate`

- Implemented: `editCoordinate({ target: UserId; aspect?: CoordinateAspect; polarFrame?: PolarFrameOptions })`, with at
  least one patch required by the public type union.
- Proposed (NOT IMPLEMENTED): coordinate type, attached-layer, viewport, clipping, and transpose edits.

### Value coverage — `editCoordinate`

- Target and registration
  - ✅ Covered: exact existing ID, unknown ID, required target, Full-only runtime and declaration boundary.
- Frame aspect
  - ✅ Covered: centered largest fit, independent horizontal/vertical alignment, Polar and Parallel frame consumers, `"auto"`
    reset, Canvas resize replay.
- Data aspect
  - ✅ Covered: exact unit-ratio oracles, absolute reversed spans, domain edit replay, shared mark/axis/grid effective bounds,
    zero span, nonlinear scale, explicit-range conflict, and multiple x/y pair rejection.
- Polar frame
  - ✅ Covered: centered defaults, moved fractional center/radius, fixed-pixel radius, exact point/line/arc and Polar-guide
    geometry, object replacement, aspect-before-frame ordering, Canvas resize, overflow atomicity, and `"auto"` reset.
- Immutability and lifecycle
  - ✅ Covered: caller-owned nested option preservation, prior program preservation, discarded-branch preflight, source/Canvas
    rematerialization, and trace ownership.
- Evidence: `test/contracts/coordinate-aspect.test.js`, `test/contracts/coordinate-aspect-types.test.js`,
  `test/contracts/shared-scale-refresh.test.js`, and the installed package consumer.

## `createScale`

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "band" | "point" | "ordinal" | "sequential" | "quantize" | "quantile" | "threshold"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. Direct continuous/time scale은 두 finite numeric values를
  사용하며 time 값은 UTC timestamp다. Quantitative transformed position의 auto domain이 하나의 finite
  관측값으로 축약되면 type-valid finite pair로 padding하고 양쪽 endpoint가 표현 가능할 때 그 관측값을
  transformed range 중앙에 둔다. Numeric limit에서는 관측값을 포함하는 가장 가까운 finite pair를 쓴다.
  Explicit transformed pair는 계속 distinct해야 한다. Ordinal은 non-empty unique values를 사용한다.
  Threshold는 strictly increasing explicit boundaries가 필수다.
- `range`: `"auto"` 또는 consumer-compatible array. continuous position은 finite pair, ordinal은
  channel에 따라 colors, shapes 또는 dash patterns가 될 수 있다. Sequential은 최소 두 colors,
  discretized color는 최소 두 colors를 사용하며 threshold는 domain보다 정확히 하나 더 필요하다.
- `nice`: boolean, continuous position scale의 auto domain에 적용된다.
- `zero`: boolean, `linear | pow | sqrt | symlog` auto domain에 적용되며 log에서는 오류다.
- `base`, `exponent`, `constant`: 각각 log, pow, symlog 전용 positive finite parameter다. Defaults는 `10`, `1`, `1`이고 sqrt는 fixed exponent `0.5`다.
- `clamp`: compatible continuous mapping을 resolved output extent로 제한한다. `reverse`는 final range direction을 뒤집는다.
- `band`는 `paddingInner` 기본 `0`, `paddingOuter` 기본 `0`, `align` 기본 `0.5`; `point`는
  `padding` 기본 `0.5`, `align` 기본 `0.5`를 저장한다. Bandwidth는 band만 positive다.
- `palette`는 sequential/discretized color range descriptor이며 explicit `range`와 mutually exclusive다.
  Sequential descriptor의 `count`는 2 이상의 gradient-stop count이며 top-level `palette`와
  `range.palette`가 같은 validation과 resolution을 사용한다. `interpolate`는 sequential 전용이고
  기본은 `"rgb"`다. Public palette `count`, sequential explicit range와 discretized explicit color
  range cardinality는 최대 `10,000`이다.
- `midpoint`: sequential quantitative color의 finite 기준값 또는 `"auto"`. Numeric 값은 최종 domain의 두 끝 사이에 엄격히 있어야 한다. Auto domain은 consumer resolution 때 검증한다. 생성 생략은 endpoint-linear mapping, 편집 생략은 보존이며 `"auto"`는 semantic leaf를 제거한다. Temporal/position/ordinal/discretized numeric midpoint는 오류다. 양쪽 domain 구간을 color parameter [0,.5]/[.5,1]로 나누고 reverse/clamp/interpolation을 기존 mapper에서 적용한다. Palette 중앙색이 항상 neutral/white라고 추론하지 않는다.
- `unknown`은 direct unattached scale에서는 channel을 알 수 없으므로 그대로 저장한다. Consumer가 attach될 때
  concrete channel fallback validation과 supported item-grain policy를 적용한다.
- Standalone `createScale`/`editScale`은 위의 전체 vocabulary를 유지하지만 action 안의 nested scale은
  consumer role별 public type만 노출한다. Quantitative position은 continuous transformed options, temporal
  position은 `time`, categorical position은 `band | point`를 사용하며 zero-baseline bar/histogram/density
  output에서는 `log`를 제외한다. Categorical color는 `ordinal`, size/opacity는 `linear`, shape/dash는
  `ordinal`이고 stroke width는 quantitative transformed scale이다. Palette/interpolation 같은 color-only
  option이나 padding 같은 discrete-position option을 다른 role에 전달하면 저장 후 무시하지 않고 즉시
  거부한다. Point row consumers만 channel-valid `unknown` fallback을 author할 수 있다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. Consumer-specific ordinal range와 `unknown`
  compatibility는 attachment 시점에 검증한다.

- `radialMapping?: "area"|"radius-length"`는 measured Arc radius의 canonical scale policy다. Linear, zero 기반, nice/reverse/unknown 없는 정의만 허용하고 domain/range의 auto는 consumer attachment 때 해석한다. Explicit domain은 [0,U], U>0, range는 0<=r0<R다. Generic radius나 다른 channel에 연결하면 오류다.

### Formal values — `createScale`

```typescript
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal"
  | "sequential" | "quantize" | "quantile" | "threshold";
```

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite; padding?: NonNegativeFinite; align?: UnitInterval; palette?: Palette; interpolate?: ContinuousColorInterpolation; midpoint?: number | "auto"; radialMapping?: "area" | "radius-length"; unknown?: unknown })`; type별 validation이 값을 제한한다. `time`은 유일한 UTC temporal token이다.
- Maybe Future (NOT IMPLEMENTED): `{ type?: "identity" | "bin-ordinal" }`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, complete 13-value `ScaleType`, unknown value와 type-specific definition.
  - ⚪ Maybe Future: `"identity" | "bin-ordinal"`.
- `domain`
  - ✅ Covered: `"auto"`, continuous pair, ordinal unique array, reversed pair and invalid arrays.
  - ✅ Covered: log/pow/sqrt/symlog auto constant의 양수·0·음수 type-valid padding, transformed midpoint,
    numeric limits와 explicit constant rejection. Log zero는 strictly signed domain contract에 따라 거부한다.
  - ✅ Covered: direct `time` scale domain accepts finite UTC timestamp pairs. Date/string normalization belongs to
    temporal field resolution and is tested there rather than expanded into raw scale input.
- `range`
  - ✅ Covered: `"auto"`, numeric pair, colors, palette descriptor and dash patterns through consumers.
  - ✅ Covered: raw ordinal range ownership is validated structurally; consumer-specific dash/color/shape
    compatibility is deliberately deferred and executable at attachment.
- `nice`
  - ✅ Covered: omitted, true, false, non-boolean and ordinal rejection.
- `zero`
  - ✅ Covered: omitted, true, false, non-boolean and time/ordinal rejection.
- Precedence
  - ✅ Covered: explicit domain overrides nice/zero; zero applies before nice on auto linear domain.
- ✅ Covered: transformed parameter defaults/validation, color interpolation/palette, mapping-policy persistence and
  deferred channel validation for unattached `unknown`.
- Evidence: `test/unit/actions/scales/scale-actions.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js` and grammar scale tests.

## `editScale`

- Implemented: immutable edits for every current `ScaleType`.
- Signature: `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, midpoint?, radialMapping?, unknown? })`.
- `id`는 existing scale을 선택한다. 생략하면 current scale, 그렇지 않으면 유일한 scale을 사용하며
  안전하게 하나를 정할 수 없으면 explicit ID를 요구한다.
- `midpoint`는 create contract의 동일한 검증·mapping·reset을 따르며 연결된 모든 mark와 gradient legend를 갱신한다. Type이 바뀌면 이전 midpoint를 제거하고 돌아올 때 복구하지 않는다. Evidence: `test/unit/actions/scales/midpoint.test.js`, `test/unit/grammar/scales/midpoint.test.js`, `test/charts/color-midpoint/`.
- 최소 한 editable property가 필요하다. `unknown: undefined`는 existing fallback을 제거한다.
- `domain`/`range`의 `"auto"`는 reset이고 omission은 기존 값을 보존한다. Explicit domain은
  `nice`/`zero`보다 우선하며 `reverse`는 auto 또는 explicit 최종 range에 적용된다.
- `palette`는 color scale의 top-level shorthand이며 canonical `range: { palette }`로 저장한다.
  같은 call의 `range`와는 mutually exclusive다.
- `type`은 unattached scale 또는 compatible consumers에서 atomic하게 전환한다. Quantitative position은
  `linear | log | pow | sqrt | symlog`, continuous quantitative color는 `sequential`, quantitative Point/aggregate Bar/Rect color는
  `quantize | quantile | threshold`를 사용한다. Complete definition과 every consumer를 먼저 검증하고 stale
  type-only properties를 제거한다.
- Sequential↔quantize/quantile/threshold와 nested encodeColor type reassignment는 같은 전환 owner를 사용한다. Creation/edit/materialization은 공통 quantitative color consumer validator를 사용하여 Point/aggregate Bar/Rect의 fieldType·aggregate·unknown·grain을 검증한다. 모든 shared consumer와 guide를 포함한 immutable candidate를 먼저 실행 검증하고 반환할 branch에 적용한다.
- Active gradient↔interval legend는 네 edge의 compatible 교집합에서 같은 transaction으로 교체한다. Left/right는 vertical·center align·top title, top/bottom는 기본 horizontal interval flow와 left/center/right align·top title이다. Target/channel, title·visibility·inferred mode, labels, titleStyle, border, position, align, offset을 보존한다. Count/gradient size 또는 interval symbol/itemGap이 해당 family default와 다르면 오류다. 새 family 고유 값은 새 default를 쓰며 source 스타일을 조용히 버리지 않는다. Interval의 horizontal columns, vertical flow 또는 inline title처럼 gradient에 보존할 수 없는 layout도 오류다. Side columns1은 기본 한 열과 동등해 허용한다. 비호환 설정은 removeLegend→editScale→createLegend의 명시 경로를 사용한다.
- Explicit domain의 의미가 extent, quantile sample, threshold 사이에 바뀌면 새 domain을 명시해야 한다. Sequential↔quantize의 compatible extent는 보존 가능하며 auto inference는 각 타입 계약을 따른다. Midpoint/interpolate 등 비호환 속성은 제거하고 돌아올 때 숨은 복구를 하지 않는다. 범례 overflow나 consumer 하나의 실패도 전체 상태·trace를 유지한다.
- Structural type transition은 Full 범위다. Basic은 기존 typed quantitative color와 interval legend 생성을 지원하며, 다른 타입은 새 scale ID로 작성한다.
- Evidence: `test/unit/actions/scales/color-transitions.test.js`, `test/charts/color-transitions/`.
- Discrete position은 compatible consumers에서 `band ↔ point`를 검증한다. Bar consumer가 있으면
  zero-bandwidth `point` 전환을 거부한다.
- `nice`, `zero`, `clamp`, transformed parameters와 `reverse`는 create contract의 type별 policy를 따른다.
- `unknown`은 row-owned point item에서만 지원한다. Missing/invalid input과 explicit ordinal domain 밖의 input을
  channel-valid concrete fallback으로 mapping하며 domain member를 추가하지 않는다. Compound path, bar, area,
  rule, xOffset와 strokeDash grains는 topology가 달라질 수 있어 명시적으로 거부한다.
- Complete patch와 shared-consumer channel compatibility를 먼저 검증한 뒤 semantic scale을 수정하고,
  scale, mark, axes, grids와 legend consumer를 wrapped materialization plan으로 갱신한다.
- Source-attached text는 source의 current scale consumer에서 dependency를 따라 갱신한다. Text의 inherited scale ID가 이전 binding을 유지해도 라벨이 이전 위치에 남지 않는다. Evidence: `test/unit/actions/marks/text-source.test.js`.
- 실패하면 이전 program의 semantic, graphic, context와 trace는 변하지 않는다.

- `radialMapping` 변경은 기존 모든 measured Arc 및 radius axis/grid를 갱신한다. 생략하면 보존한다. Explicit undefined는 제거지만 aggregate radius consumer가 남아 있으면 오류다. 해당 encoding을 제거한 orphan scale에서만 ordinary radius로 명시적으로 전환한다. Type 변경으로 mapping을 암묵적으로 제거하지 않는다.

### Formal values — `editScale`

```typescript
type EditableCurrentScale = {
  id?: UserId;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: PositiveFiniteExceptOne;
  exponent?: PositiveFinite;
  constant?: PositiveFinite;
  paddingInner?: UnitIntervalLessThan1;
  paddingOuter?: NonNegativeFinite;
  padding?: NonNegativeFinite;
  align?: UnitInterval;
  palette?: Palette;
  interpolate?: ContinuousColorInterpolation; midpoint?: number | "auto";
  unknown?: unknown;
};
```

- Implemented for unattached scales and compatible connected consumers. Consumer-specific compatibility can narrow
  the complete type vocabulary.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editScale`

- ✅ Covered: existing scale selection through explicit ID, current scale, sole scale, unknown and ambiguous failures.
- ✅ Covered: domain/range patch, `"auto"` reset, omission preservation and caller-owned array isolation.
- ✅ Covered: categorical color palette shorthand, range conflict, invalid palette and non-color rejection.
- ✅ Covered: `nice`, `zero`, `clamp`, `reverse`, type compatibility and invalid value rejection.
- ✅ Covered: concrete point/guide rematerialization, immutable failure and nested trace.
- ✅ Covered: transformed line/area/bar/rule materialization, direct versus later type-edit convergence, stale
  parameter/interpolation removal, sequential/discretized color transitions and invalid atomic transitions.
- ✅ Covered: missing/invalid point fallback, explicit ordinal domain fallback, channel validation, shared point
  consumers and Canvas rematerialization. Unsupported compound-grain fallback is an explicit error contract.
- Evidence: `test/unit/actions/scales/edit-scale.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js`,
  `test/unit/actions/scales/transformed-position-scale.test.js`,
  `test/unit/grammar/scales/mapping-policies.test.js` and transformed-scale chart integration tests.

## Focused channel scale editors

- Implemented family: `editXScale`, `editYScale`, `editXOffsetScale`,
  `editYOffsetScale`, `editParallelScale`, `editThetaScale`, `editRScale`,
  `editColorScale`, `editStrokeScale`, `editSizeScale`, `editOpacityScale`, `editShapeScale`,
  `editStrokeWidthScale`, and `editStrokeDashScale`.
- Each action accepts the scale properties valid for its named channel plus
  optional `id` and `target`. At least one scale property is required. `editRScale`
  owns semantic Polar radius; constant point glyph radius remains under
  `encodePointRadius`/`removePointRadius`.
- Selection resolves an explicit scale ID and/or mark target first. If both are
  present they must identify the same scale. Without selectors, the current
  mark's scale for that channel wins; otherwise exactly one channel-bound scale
  must exist in the program. Several marks sharing one scale count as one
  candidate. Multiple scale IDs are ambiguous and never use array order.
- An explicit scale must have at least one consumer in the named channel. Its ID
  does not establish its role, and an unattached scale remains editable only
  through generic `editScale`.
- Every focused action is a thin wrapped delegate to `editScale`. The child owns
  value and type validation, immutable preflight, shared-consumer
  rematerialization, and compatible axis, grid, and legend transitions.
- Runtime option vocabularies and TypeScript unions are channel-specific. Omitted
  values preserve stored properties, `domain`/`range: "auto"` restore inference,
  and supported explicit `undefined` follows the underlying `editScale` removal
  contract.
- Available in the Full entry. Basic retains its smaller scale surface.
- `editStrokeScale` is the deliberate selector exception: `target` is required and raw `id`
  selection is rejected. A color/stroke shared scale is compatible when every consumer accepts the
  resulting color family; the edit refreshes both channels without treating stroke as a color alias.
- Evidence: `test/unit/actions/scales/channel-scale-editors.test.js` and
  `test/contracts/channel-scale-editor-types.test.js`.

## `editXScale`

- Implemented: edits a scale bound exclusively to normalized x/x2 consumers through the focused selection contract above.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXScale`

- Implemented: `editXScale(EditXScaleOptions)` with quantitative, temporal, band, and point position options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXScale`

- ✅ Covered: explicit target, current-mark inference, domain editing, ambiguity, selector disagreement, and wrapped `editScale` execution. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editYScale`

- Implemented: edits a scale bound exclusively to normalized y/y2 consumers through the focused selection contract above.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYScale`

- Implemented: `editYScale(EditYScaleOptions)` with quantitative, temporal, band, and point position options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYScale`

- ✅ Covered: current-mark inference, reverse editing, channel validation, and wrapped rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editXOffsetScale`

- Implemented: edits the ordinal subgroup scale bound to `target`'s `xOffset`
  encoding. `target` is mandatory and must resolve to an existing mark with an
  existing offset scale; scale ID, current-mark, and unique-program inference
  are intentionally absent.
- Accepted properties are `domain`, `reverse`, `padding`, `paddingInner`,
  `paddingOuter`, and `align`. At least one is required. `padding` is shorthand
  for equal inner and outer padding and cannot be combined with either explicit
  padding property. `paddingInner` and `padding` are finite in `[0, 1)`,
  `paddingOuter` is finite and non-negative, and `align` is finite in `[0, 1]`.
- The semantic scale is the single owner of requested padding and alignment.
  Older mark-owned `xOffset` padding is read only as a compatibility fallback;
  the first successful encoding or scale edit stores the complete policy on the
  semantic scale and removes every legacy copy for consumers of that scale.
  Conflicting legacy owners fail before any state or trace change.
- The concrete range always comes from the resolved parent x category slot.
  An absolute `range`, a scale `type`, and an `order` alias are rejected; an
  explicit domain array owns subgroup order and `domain: "auto"` restores
  observed order. Existing values omitted from an explicit domain are errors.
- For parent slot `S`, domain length `n`, inner padding `pi`, outer padding `po`,
  and alignment `a`, materialization uses
  `step=S/max(1,n-pi+2*po)`, `bandwidth=abs(step)*(1-pi)`, and
  `start=(S-step*(n-pi))*a`. Reverse mirrors the concrete range while retaining
  category identity. Parent Canvas/scale edits recompute the range and retain
  the requested policy.
- Shared consumers are validated and rematerialized together. Their parent slot
  sizes must agree; point-parent step and legacy binned-x slot policies remain
  supported. Offset domain changes do not mutate the parent or color domain.
- Available only in the Full entry.
- Evidence: `test/unit/actions/scales/offset-scale.test.js`,
  `test/unit/actions/encodings/x-offset-encoding.test.js`, and
  `test/contracts/phase5-scale-types.test.js`.

### Formal values — `editXOffsetScale`

- Implemented: `editXOffsetScale({ target: UserId; domain?; reverse?; padding?;
  paddingInner?; paddingOuter?; align? })`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editXOffsetScale`

- ✅ Covered: exact default and padded geometry, shorthand, alignment, explicit
  domain order, reverse, Canvas resize, shared consumers, point parents, legacy
  migration/conflict, unknown category, missing offset, invalid ranges, and
  immutable failure behavior.

## `editYOffsetScale`

- Implemented: the horizontal-orientation dual of `editXOffsetScale`, selected
  from `target`'s `yOffset` encoding with the same property, ownership,
  validation, sharing, migration, formula, and Full-only contracts.
- Its parent slot is the resolved y category bandwidth or point step. Reverse
  mirrors the nested y range and rematerializes all dependent marks.
- Evidence: `test/unit/actions/scales/offset-scale.test.js`,
  `test/unit/actions/encodings/y-offset-encoding.test.js`, and
  `test/contracts/phase5-scale-types.test.js`.

### Formal values — `editYOffsetScale`

- Implemented: `editYOffsetScale(EditYOffsetScaleOptions)` where
  `EditYOffsetScaleOptions` equals the explicit-target xOffset patch.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editYOffsetScale`

- ✅ Covered: horizontal parent geometry, padding, reverse, semantic ownership,
  missing target/offset rejection, wrapped trace, and prior-state immutability.

## `editParallelScale`

- Implemented: edits one scale nested in a Parallel line's ordered dimensions. `target` and `dimension` are both required; the dimension selector is the exact stored field identity and never an index, title, or display label.
- Resolution requires an existing Parallel coordinate, a stored `encoding.parallel.dimensions` array, exactly one matching field, and an existing semantic scale. It delegates the resolved scale ID to wrapped `editScale`, so shared consumers, paths, attached source marks, Parallel axes, layout, and highlights observe the same atomic preflight and rematerialization rules.
- Quantitative dimensions accept the current continuous position options. Ordinal dimensions accept point-scale domain/range/reverse/padding/align/fallback options. At least one editable property is required; `id`, inferred target, and properties from the other branch are errors.
- Reordering dimensions does not change selection by field. An explicit shared scale is edited for every consumer, subject to `editScale`'s all-consumer compatibility checks.
- Available only in the Full entry.
- Proposed (NOT IMPLEMENTED): drag-to-reorder axes and scale separation.

### Formal values — `editParallelScale`

- Implemented: `editParallelScale({ target: UserId; dimension: FieldName } & WithoutScaleId<QuantitativePositionScaleOptions | CategoricalPositionScaleOptions>)`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editParallelScale`

- `target`: ✅ Covered explicit Parallel layer, missing target, unknown/wrong-family target.
- `dimension`: ✅ Covered exact quantitative/ordinal field, post-reorder identity, unknown/empty field; title/index inference is absent by contract.
- scale patch: ✅ Covered domain, reverse, ordinal domain ordering, empty patch, branch-incompatible padding/type, path and axis refresh.
- lifecycle: ✅ Covered immutable prior program, wrapped trace, Canvas-compatible explicit range, and field-based resolution after dimension reorder.
- Evidence: `test/unit/actions/scales/parallel-scale.test.js`, `test/contracts/phase5-scale-types.test.js`.

## `editThetaScale`

- Implemented: edits the scale bound to semantic Polar angle without inferring from unrelated position scales.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editThetaScale`

- Implemented: `editThetaScale(EditThetaScaleOptions)` with linear, time, band, and point angular options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaScale`

- ✅ Covered: Polar current-mark selection, reverse editing, strict option typing, and graphical refresh. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editRScale`

- Implemented: edits semantic Polar radius, including measured `radialMapping`; it never edits point glyph radius.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editRScale`

- Implemented: `editRScale(EditRScaleOptions)` with quantitative radial options, `radialMapping?`, `id?`, and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRScale`

- ✅ Covered: Polar current-mark selection, domain editing, glyph-radius separation, strict option typing, and rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editColorScale`

- Implemented: edits categorical, sequential, or discretized color through a verified color consumer.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editColorScale`

- Implemented: `editColorScale(EditColorScaleOptions)` with color type/domain/range, palette, interpolation, midpoint, fallback, `id?`, and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editColorScale`

- ✅ Covered: current, target, explicit ID, unique shared-scale inference, palette and legend refresh, ambiguity, orphan/wrong-channel rejection, and immutable failures. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeScale`

- Implemented: edits the categorical, sequential, or discretized color scale bound to one target mark's
  field-driven stroke. `target` is mandatory; `id`, current-mark inference, and program-wide unique-scale
  inference are intentionally absent.
- A scale explicitly shared by color and stroke is accepted when all consumers support the requested
  scale family. The edit rematerializes every connected mark and active stroke/color guide atomically.

### Formal values — `editStrokeScale`

- Implemented: `editStrokeScale({ target: UserId } & Omit<EditColorScaleOptions, "id" | "target">)`.
- Proposed (NOT IMPLEMENTED): selector by raw scale ID.

### Value coverage — `editStrokeScale`

- ✅ Covered: required target, categorical range changes, sequential↔discretized family changes,
  gradient↔interval legend transitions, compatible color/stroke sharing, wrong/missing target or scale,
  strict type rejection, and immutable incompatible edits. Evidence: `test/contracts/stroke-color.test.js`,
  `test/contracts/channel-scale-editor-types.test.js`.

## `editSizeScale`

- Implemented: edits the area scale bound to point size across `linear`, `log`, `sqrt`, `pow`,
  `quantize`, `quantile`, and `threshold` mappings.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editSizeScale`

- Implemented: `editSizeScale(EditSizeScaleOptions)` with the state-dependent closed size patch,
  `id?`, and `target?`. It supports domain/range/fallback/reverse, continuous clamp, log base, and
  pow exponent. Family changes require an explicit new domain; a discrete destination requires an
  explicit range; discrete-to-continuous requires an explicit range or `"auto"`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editSizeScale`

- ✅ Covered: inferred and explicit selection, strict type unions, transformed/discrete mapping,
  stale-option removal, reverse, family migration, point/legend rematerialization, source revision,
  and immutable failures. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`,
  `test/contracts/channel-scale-editor-types.test.js`, `test/contracts/size-scale-types.test.js`.

## `editOpacityScale`

- Implemented: edits the quantitative scale bound to field-driven opacity.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editOpacityScale`

- Implemented: `editOpacityScale(EditOpacityScaleOptions)` with linear domain/range policies and fallback plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editOpacityScale`

- ✅ Covered: inferred range editing, strict option typing, and point rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editShapeScale`

- Implemented: edits the ordinal scale bound to point shape.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editShapeScale`

- Implemented: `editShapeScale(EditShapeScaleOptions)` with ordinal domain/range/fallback plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editShapeScale`

- ✅ Covered: inferred range editing, strict shape typing, and point rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeWidthScale`

- Implemented: edits the quantitative scale bound to line or rule stroke width.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editStrokeWidthScale`

- Implemented: `editStrokeWidthScale(EditStrokeWidthScaleOptions)` with quantitative scale policies plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editStrokeWidthScale`

- ✅ Covered: line-series range editing, strict option typing, and shared materialization ownership. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeDashScale`

- Implemented: edits the ordinal scale bound to categorical line or rule dash patterns.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editStrokeDashScale`

- Implemented: `editStrokeDashScale(EditStrokeDashScaleOptions)` with ordinal domain/range plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editStrokeDashScale`

- ✅ Covered: line-series dash-range editing, strict dash typing, and rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## Persistence package boundary

Browser-safe `ggaction/persistence`의 네 함수는 action replay 없이 canonical state를 저장·복원한다. 정확한 version 1 format과 Full/Basic/extension/render-only 경계는 [`../../../docs/data-updates.md`](../../../docs/data-updates.md#save-and-restore-snapshots)가 소유한다. `test/unit/persistence/`와 installed package consumer가 codec, immutable editing, 현재 action corpus의 state/SVG 동치 및 malformed input rejection을 검증한다.
