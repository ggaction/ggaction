# Mark selection action contracts

Current direct-action contracts for cross-mark selection and highlighting. Shared notation and
lifecycle rules live in [`../README.md`](../README.md).

## Source-row inspection and highlight revision

- 승인 근거: 2026-10-26 사용자가 `docs/mark-highlighting.md`의 공개 확장 계약에
  “이 API 확장으로 진행”이라고 명시적으로 승인했다.
- `MarkSelector`는 기존 조건 대신 `{ rows: { data, indices }, grain? }`를 받는다.
  indices는 해당 named dataset의 zero-based materialized row 위치다. 중복 값도
  서로 다른 관측치로 취급한다. 최종 마크의 contributing row 중 하나가 일치하면
  item 전체를 선택한다. 잘못된 index와 확인할 수 없는 lineage는 거부한다.
- `highlightMarks`의 explicit `id` 재사용은 같은 target의 selector와 appearance를
  원자적으로 갱신한다. 다른 target이 소유한 ID는 거부한다. ID 생략 동작은 유지한다.
- 복합 plot target은 owned component들로 확장된다. root에서 선택한 관측치의
  provenance를 child에 전달하고, 저장된 `groupSelection`으로 그룹 제거를 추적한다.
  component selection의 `sourceSelection`은 root의 현재 조건을 참조하여 데이터·역할 변경 후 다시 평가한다.
  저장 복원은 owner/child 관계와 row dataset/index를 검증한다. Root 또는 component
  selection을 참조하는 label이 있으면 전체 selection 삭제를 거부한다.
  독립 overlay/statistical additions는 확장하지 않는다. concrete child target은
  해당 component 범위다. 지원하지 않는 component 전용 style은 전파하지 않는다.
- text item은 color/fill, opacity, fontSize, offset을 지원하고 같은 rematerialization
  baseline lifecycle을 사용한다. 다른 마크는 fontSize를 거부한다.
- `ggaction/inspection.getMarkItems(program, { target, grain? })`는 final-item 값,
  backend-neutral geometry/bounds, dataset-row references를 반환한다. raw graphic ID는
  노출하지 않는다. immutable snapshot별 weak cache를 사용한다.
- Mark filter materialization은 선택된 source row index를 `materializationConfigs.rowProvenance`
  에 저장하여 snapshot 복원 후 동일 값의 서로 다른 행을 혼동하지 않는다. Derived dataset을
  해제할 때 이 cache도 해제하며, 복원 시 source index 범위·순서·행 값을 검증한다.
- 검증: `test/unit/actions/selection/row-highlighting.test.js`, 기존 mark selection
  suite, package-boundary contract tests.

## Capability: `mark-item-selection-grammar`

`filterMarks`, `selectMarks`, and `highlightMarks` share the following current selector algebra and final-item grain.

```typescript
type MarkSelector =
  & { grain?: "item" | "stack" }
  & (
    | { field: FieldName; channel?: never; property?: never }
    | { channel: Channel; field?: never; property?: never }
    | { property: GraphicProperty; field?: never; channel?: never }
  )
  & (
    | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: unknown }
    | { op: "oneOf"; values: readonly unknown[] }
    | { op: "range"; min: Finite | string; max: Finite | string; inclusive?: boolean }
    | {
        op: "min" | "max";
        count?: PositiveInteger;
        groupBy?: FieldName | readonly FieldName[];
        ties?: "first" | "all";
      }
  );
```

- `field`, `channel`, `property` 중 정확히 하나를 사용한다. `field`는 member data에서 item 전체에 unique한
  값, `channel`은 scale 적용 전 resolved semantic encoding 값, `property`는 final `graphicSpec`의 concrete
  scalar 값만 읽는다. 값 비교는 strict하며 coercion하지 않는다. Rect도 공통 channel resolver를 사용하여
  temporal field/datum과 color/stroke를 epoch milliseconds로 정규화하며 field 값은 원본을 유지한다.
  근거: `test/unit/actions/marks/rect-span.test.js`.
- `range`의 `inclusive` 기본값은 `true`다. Ordered comparison은 같은 type의 finite number 또는 string만
  비교하고 missing/incompatible item은 제외한다.
- `min | max`의 `count` 기본값은 `1`, `ties` 기본값은 `"first"`다. `"first"`는 stable source order로
  정확히 count개를 고르고 `"all"`은 boundary tie를 모두 포함할 수 있다. `groupBy`는 extrema에만 유효하다.
- `grain` 기본값은 `"item"`이다. Item grain은 point symbol, final bar segment/rectangle, observed rect cell, line/area series path,
  arc sector, rule line, Tick glyph이다. Bar의 `grain: "stack"`은 stack/fill/diverging layout에서 같은 bin/category의 모든 segment를
  한 item으로 묶는다. Group/overlay/ranged bar와 non-bar mark는 stack grain을 거부한다.
- Bar semantic geometry는 start endpoint `x`/`y`와 end endpoint `x2`/`y2`를 사용한다. Concrete rect는
  property `x`/`y`(top-left), `width`/`height`를 사용한다. 예를 들어 vertical zero-based stack의 전체 높이는
  `channel: "y2"`, concrete pixel 높이는 `property: "height"`로 선택한다.
- Mark owner clipping changes visible bounds only. Selection properties retain the original concrete item geometry,
  including multi-segment stack unions and fully invisible items. Existing nested Canvas viewport behavior is preserved.
  Evidence: `test/unit/actions/marks/plot-clipping.test.js`.
- Stable key는 semantic item identity에서 만들며 collection child order를 selector identity로 사용하지 않는다.
  Multi-row path의 field/channel은 series grain에서 값이 하나로 unique할 때만 selectable하다.
  Explicit tuple group의 각 field를 선택할 수 있으며 Line/Area의 stroke와 Line의
  strokeWidth/opacity channel도 series grain이다.
  해당 channel selection이 남아 있으면 constant encoding으로 교체할 수 없다.
- Empty selection은 `selectMarks`/`highlightMarks`와 `filterMarks`에서 성공이다. Mark filter의 empty view는
  직전 resolved domain을 유지하며 mark items, source labels와 highlight graphics를 비운다. 처음부터 domain을
  정할 수 없는 empty chart와 이미 materialized된 chart의 empty filter 결과는 구분한다. Ambiguous
  field/channel/property, target 또는 incompatible selector는 state와 trace를 만들기 전에 실패한다.

## Logical item selection and set updates

- `MarkSelector` also accepts `{ items: readonly string[], empty?: "none" | "all", grain? }`, exclusively of row or value selectors. Keys are the opaque `getMarkItems(...).key` or interaction hit `itemKey` at the same target/grain. Duplicates normalize by first occurrence; malformed, sparse, accessor or non-string key arrays fail. The cumulative key count plus UTF-16 key length is bounded by the shared 10,000,000 work limit.
- Default `empty: "none"` selects nothing for an explicit empty key list. `empty: "all"` selects every current item only when the stored key list itself is empty. A nonempty list whose keys are hidden or deleted selects nothing; it never expands to all items. Absent keys are retained and can reappear after filtering or source revision. This checkpoint has no automatic drop policy or orphan event.
- Selection resources add normalized `options: { mode: "item-keys", itemKeys, empty }` with unchanged algorithm version `"1"`; the existing resource/config ownership and exact revision binding remain. Row-key and predicate resources retain their current storage and behavior. Input indices are never stored as logical item keys.
- `editMarkSelection` accepts `mode?: "replace" | "add" | "toggle" | "subtract" | "intersect"`, default `"replace"`. Replace stores the supplied complete selector, retaining live predicate and row-key behavior. Other modes require the existing grain and store the resulting logical key set. Add preserves previous keys and appends new keys in incoming order; toggle removes common keys and appends previously absent keys; subtract/intersect preserve previous key order. An incoming predicate or row selector resolves once at update time. Existing and incoming nonempty item lists retain hidden keys. An explicit empty-all list is evaluated against current items for set operations. The resulting empty policy preserves the existing policy unless `empty` is supplied with an items selector.
- Logical keys are relative to the owning program. Scoped actions accept namespaced keys from inspection of that exact explicit child path, remove only those ancestor namespaces, and reject keys from another scope. Nested snapshots add namespaces back through the existing identity owner. A composite inspection may report several component targets; use each item's reported target when selecting that component.
- `selectMarks`, `editMarkSelection`, inline/named `highlightMarks`, mark labels and `filterMarks` share this selector. Compound highlights project root membership through existing source-row lineage. Conditional encodings rebind the updated resource revision before rematerializing. Resize, filter removal, compatible source revision and editable snapshot restoration preserve key meaning. Full authors these actions; Basic authoring support is unchanged.
- Evidence: `test/unit/grammar/selection-set.test.js`, `test/unit/actions/selection/logical-item-selection.test.js`, `test/contracts/logical-selection-types.test.js`, `test/contracts/realistic-logical-selection.test.js`.

## `filterMarks`

- Signature: `filterMarks({ target?, mode?: "replace" | "compose", ...selector })`
- Target and selection: `selectMarks`와 같은 target inference, selector normalization, native item/stack grain을
  사용한다. Point field selection은 position/size가 아직 없어도 row grain에서 동작하며 channel/property와
  non-point mark는 materialized final items를 요구한다.
- Effect: selected final items의 source member rows를 원래 source order로 보존하는 immutable
  `${target}FilteredData`를 만들고 `layer[target].data`를 explicit `editSemantic` child로 rebind한다. Stored
  owner와 `markFilter` transform은 canonical source와 ordered normalized selector recipe를 기록한다.
- Repeated lifecycle: 같은 마지막 selector의 반복은 semantic/graphic idempotent다. 다른 selector를 반복하면
  `mode`가 필요하다. `replace`는 canonical source에서 새 recipe를 시작하고 `compose`는 기존 recipe 결과에
  다음 selector를 순서대로 적용한다. 이전 filtered dataset을 downstream dataset이 참조하면 그 snapshot은
  보존하고 `${target}FilteredData2`, `3`, …의 첫 빈 revision ID를 사용한다.
- Raincloud parent: an explicit facade ID accepts field/item selectors over raw observations and
  recomputes all enabled components. Comparisons, sets, ranges and grouped ranks use the same
  selector algebra. The recipe is retained across appearance/component edits; explicit source
  replacement clears it. Parent filters require nonempty input for enabled statistics. Named
  child IDs retain display-only filtering, including empty views.
- Native grain: aggregate/ranged bar는 selected cell members, stacked bar는 complete selected stack members,
  line/area는 selected series members, arc는 selected sector members, rule/Tick은 selected line members를 보존한다. Histogram은 filtering 전 resolved
  boundaries를 explicit semantic boundaries로 고정해서 selected bins가 subset domain에서 다시 나뉘지 않게 한다.
  이 boundaries는 bin partition이며 display domain을 고정하지 않는다. 자동 position domain은 남은 bin의
  양끝 경계로 줄어들고 내부 빈 구간은 유지한다. 같은 scale을 사용하는 다른 mark의 범위는 합집합에
  포함하며 explicit scale domain과 zero 포함 정책은 유지한다. 자동 tick/grid는 새 display domain 안의
  bin 경계를 사용하고 사용자가 지정한 tick 값은 기존 검증 정책을 유지한다.
  직접 line의 `missing: "break"`는 선택된 logical series의 보이지 않는 null/absent 좌표 행도 보존해
  filtering 후 구간이 연결되지 않게 한다. Selection item의 실제 sourceIndices는 유효한 vertex만 소유한다.
  결측 판정과 구간 순서는 [MARKS.md](./MARKS.md)의 line 계약을 따른다.
- Box owner의 선택은 category 전체를 보존한다. 소유 median/whisker/cap은 같은 filtered summary로 rebind하고,
  outlier는 선택된 category만 보존한다. empty/compose/replace/remove도 모든 owned component에 함께 적용한다.
- Rematerialization: target scale을 deduplicate한 순서로 resolve하고 target과 그 scale을 공유하는 모든
  complete mark 및 source-dependent mark를 다시 만든 뒤 connected axes,
  grids와 legends를 갱신한다. Coupled categorical legend scales는 intermediate mismatch를 노출하지 않고 final
  domains에서 한 번 다시 materialize한다. Density area는 upstream density provenance를 유지한다.
- Empty와 removal: zero match는 직전 domain과 guide 설명을 유지하고 stale mark/label/highlight graphics를
  제거한다. `removeMarkFilter`는 target을 canonical source로 rebind하고 active filtered dataset이 더 이상
  참조되지 않을 때 해제한다. Histogram은 filter 전에 소유했던 bin policy를 복구한다.
- Boundary: source dataset, unrelated marks와 earlier program은 바뀌지 않는다. Existing independent downstream
  statistical/composite layers를 암묵적으로 rebind하지 않으므로 filtered rows를 사용해야 하는 aggregate는
  `filterMarks` 뒤에 생성한다. 이미 filtered snapshot을 명시적으로 소비하는 downstream dataset도 replace,
  compose, remove 때 그대로 유지된다. Singular compatibility alias는 없다.

### Formal values — `filterMarks`

- Implemented: `filterMarks({ target?: UserId; mode?: "replace" | "compose" } & MarkSelector)` for
  point/bar/rect/line/area/arc/rule/Tick item grain and stacked-bar grain using field, channel or concrete property with
  comparison, set, range and grouped/ungrouped rank modes.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `filterMarks`

- ✅ Covered: omitted/explicit/invalid target, incomplete point field fallback, all shared selector families and value
  sources, deterministic revision IDs, repeated idempotence, replace/compose distinction, immutable source/earlier
  program and explicit layer rebind.
- ✅ Covered: point scale/axis/grid rematerialization, histogram boundary retention, stack grain, line/area series,
  density provenance, arc sectors, rule/Tick endpoints and categorical legend convergence.
- ✅ Covered: empty domain preservation and stale graphic cleanup, removal/source restoration, histogram bin restoration,
  dependent filtered snapshot preservation and invalid mode/missing owner failure.
- ✅ Covered: regression scatterplot primitive/public equivalence when filtering before statistical layers.
- ✅ Covered: histogram/집계 bar의 자동 domain과 guide 축소, endpoint threshold, 내부 빈 구간,
  explicit domain/zero 보존, overlay/facet/병치 공유 범위, resize/replace/compose/remove 이후 유지.
- Evidence: `test/unit/actions/data/filter-marks.test.js`,
  `test/unit/actions/data/filter-domains.test.js`,
  `test/charts/cars-regression-scatterplot/variants/primitive.test.js`.

## `removeMarkFilter`

- Signature: `removeMarkFilter({ target? } = {})`.
- Resolves an active filter by explicit target, current eligible mark, or unique eligible mark. It restores the canonical
  source and any captured Histogram bin policy, clears the active owner, rematerializes scales/marks/guides, and releases
  the filtered dataset only when no downstream dataset still references that snapshot.
- Missing/ambiguous owner and unknown options fail without changing the earlier program. Stored selections and highlights
  remain as intent and are reevaluated against the restored source.

### Formal values — `removeMarkFilter`

- Implemented: `removeMarkFilter({ target?: UserId } = {})` for every mark supported by `filterMarks`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `removeMarkFilter`

- ✅ Covered: inferred/explicit target, source/domain/graphic restoration, Histogram bin restoration, dependent snapshot
  retention, owner/context cleanup and missing owner failure.
- Evidence: `test/unit/actions/data/filter-marks.test.js`.

## `selectMarks`

- Signature: `selectMarks({ id?, target?, ...selector })`
- `target`: explicit mark ID, current eligible mark, unique eligible mark 순으로 추론한다. Point, bar, line,
  area, arc, rule과 Tick의 final semantic item resolver를 제공한다.
- `id`: 생략한 첫 selection은 `${target}Selection`을 사용한다. 같은 role의 두 번째 selection은 explicit
  ID가 필요하며 기존 ID를 교체하지 않는다.
- Effect: normalized predicate, row-key or logical item-key meaning is stored once in `semanticSpec.resources` as a persistent-selection resource.
  `materializationConfigs.selections` stores target, grain, projection, exact resource ref and optional composite sourceSelection.
  `currentSelection` is updated; graphics stay unchanged. Input row indices are immediately resolved to stable row keys.
- Rematerialization: stored selector는 현재 semantic point item에 다시 평가되므로 Canvas/scale/encoding/data
  cardinality 변경 뒤에도 stale graphic child ID를 저장하지 않는다.

### Formal values — `selectMarks`

- Implemented: `selectMarks({ id?: UserId; target?: UserId } & MarkSelector)` for point/bar/line/area/arc/rule/Tick item grain,
  stacked bar grain, the three explicit value sources, and every comparison, set, range and grouped/ungrouped extrema
  mode above.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `selectMarks`

- Target and ID
  - ✅ Covered: omitted/explicit target, deterministic/explicit ID, duplicate ID, missing target and immutable failure.
- Predicate/set/range
  - ✅ Covered: strict comparison operators, `oneOf`, inclusive/exclusive range, numeric/string compatibility,
    missing values and empty result in selector grammar tests.
- Value source and grain
  - ✅ Covered: data field, semantic channel, concrete property, item/stack distinction, semantic bar endpoints,
    stack attachment IDs and Canvas-dependent concrete bounds.
- Extrema
  - ✅ Covered: min/max, count, grouped extrema, stable ties and both tie policies in selector grammar tests.
- Effects and reevaluation
  - ✅ Covered: selection-only graphic identity, exact point keys, trace, Canvas resize and filtered-cardinality reevaluation.
  - ✅ Covered: multiple simultaneous selections, independent highlight assignments, assignment replacement, and
    Canvas/scale/encoding/filter order convergence.
- Line/area/arc/rule/Tick selection and highlight appearance use the same stored selection identity as point/bar.
- Evidence: `test/unit/grammar/transforms/mark-selection.test.js`,
  `test/unit/selectors/mark-items.test.js`,
  `test/unit/actions/selection/mark-selection.test.js`,
  `test/charts/mark-selection-points/public.test.js`,
  `test/charts/mark-selection-bars/public.test.js`.

## `editMarkSelection`

- Signature: `editMarkSelection({ selection?, mode?: "replace" | "add" | "toggle" | "subtract" | "intersect", ...selector })`.
- `selection`: explicit ID, current selection, unique stored selection 순으로 resolve한다. Existing ID와 target은
  유지하며 default replace는 supplied selector의 complete replacement다. Explicit set update modes follow the logical item contract above. Target replacement는
  `removeMarkSelection` 뒤 `selectMarks`가 소유한다.
- Effect: 새 selector 전체를 normalize하고 current target의 final item grain에서 compatibility를 preflight한 뒤
  the persistent-selection resource at its next revision and rebinds all dependent selection references atomically.
  Matching currentSelection context is updated; all dependent highlights and named labels are rematerialized.
- Highlight replay: dependent highlight가 없으면 `graphicSpec`을 그대로 공유한다. Dependent highlight가 있으면
  target의 모든 highlight config를 잠시 분리하고 concrete mark와 categorical legend symbols를 empty baseline에서
  복구한 뒤 current keys로 remaining highlight, dimming, selected-last와 exact legend reflection을 declaration
  order대로 다시 적용한다.
- Empty replacement selection은 valid하다. Missing/ambiguous selection, incomplete selector, unsupported source/grain과
  incompatible final-item value는 첫 config change 전에 오류다.

### Formal values — `editMarkSelection`

- Implemented: `editMarkSelection({ selection?: UserId } & MarkSelector)` with the complete shared selector algebra.
- Proposed (NOT IMPLEMENTED): target/ID replacement and partial selector merge.

### Value coverage — `editMarkSelection`

- ✅ Covered: explicit/current/unique/ambiguous resolution, stable ID/target/context and complete replacement.
- ✅ Covered: every selector source/operator, item/stack grain, empty result, invalid atomic failure and caller ownership.
- ✅ Covered: multiple highlight replay, selected-last order, categorical legend reflection and Canvas rematerialization.
- Evidence: `test/unit/actions/selection/selection-lifecycle.test.js`.

## `removeMarkHighlight`

- Signature: `removeMarkHighlight({ selection? } = {})`.
- Resolves the selection by explicit/current/unique rules and requires its active highlight assignment. Missing direct
  removal is an error; selection intent and current-selection context are preserved.
- Removes only dependent highlight config, clears the target concrete mark and categorical legend symbol baseline, then
  rematerializes the ordinary mark and every remaining same-target highlight in stored order. Stale size, opacity, offset,
  item order or legend-symbol appearance cannot survive the removal.

### Formal values — `removeMarkHighlight`

- Implemented: `removeMarkHighlight({ selection?: UserId } = {})` for every selectable/highlightable mark policy.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `removeMarkHighlight`

- ✅ Covered: point/bar/rect/line/area/arc/rule/Tick baseline restoration, retained selection and missing error.
- ✅ Covered: remaining same-target highlight preservation and exact categorical legend symbol/label baseline.
- Evidence: `test/unit/actions/selection/selection-lifecycle.test.js`,
  `test/contracts/selection-lifecycle-render.test.js`.

## `removeMarkSelection`

- Signature: `removeMarkSelection({ selection? } = {})`.
- Resolves an existing selection by explicit/current/unique rules. When a dependent highlight exists, calls the real wrapped
  `removeMarkHighlight({ selection })` child first, then removes the selection config and clears matching
  `currentSelection`. Other selection/highlight assignments are preserved.
- Removes the persistent-selection resource when its last selection consumer is removed. A selection has no independent
  graphic resource, so selection-only removal does not rematerialize graphics. Missing/ambiguous direct removal fails
  before state changes.

### Formal values — `removeMarkSelection`

- Implemented: `removeMarkSelection({ selection?: UserId } = {})`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `removeMarkSelection`

- ✅ Covered: selection-only removal, dependent wrapped cascade, clean mark result, context cleanup and independent state.
- ✅ Covered: missing/ambiguous selection, unknown options, earlier-program and caller-option immutability.
- Evidence: `test/unit/actions/selection/selection-lifecycle.test.js`,
  `test/contracts/selection-lifecycle-render.test.js`.

## `highlightMarks`

- Signature: `highlightMarks({ id?, target?, select?, selection?, color?, opacity?, fill?, stroke?, strokeWidth?, strokeDash?, shape?, size?, fontSize?, offset?, dimOthers?, bringToFront? })`
- Selection source: inline `select`, explicit `selection`, current unique compatible selection 순으로 resolve한다.
  Inline selection은 real wrapped `selectMarks` child를 호출하며 `select`와 `selection`은 함께 쓸 수 없다.
- Current mark capability: point, bar, rect, line, area, arc, rule, Tick and text. Omitted appearance uses accent `#dc2626`. Point default size is area
  multiplier `2`; `shape` accepts the shared fourteen named shapes or explicit simple polygons from MARKS.md, and logical offset is available. Point/bar `color` aliases
  fill and conflicts with explicit `fill`. Bar rejects shape, size, offset and strokeDash. Area uses fill with optional
  stroke and rejects shape, size and strokeDash. Arc uses the same fill, optional outline, and path-offset recipe.
  Line/rule/Tick use stroke with optional width and shared named/array dash.
- `opacity` is selected-item opacity. Area/point optional `strokeWidth` requires `stroke`. Logical `offset.x/y` defaults
  to zero and translates point geometry, complete path commands, or rule/Tick endpoints without changing semantic values.
- `dimOthers` defaults to `false`; `true` uses opacity `0.25`, or `{ opacity }` supplies an explicit unit interval.
  `bringToFront` defaults to `true` and stores selected collection items last. Empty selection changes no selected
  child and may still dim the full complement when requested.
- Effect: selected concrete items receive overrides after ordinary encoding appearance. Stack selection applies the
  override to every attached rect. Assignment intent is stored in `materializationConfigs.highlights`; reapplying the
  same selection immutably replaces it. Every owning mark rematerializer rebuilds base children, resolves selected keys once,
  then passes the same key snapshot to highlight, dimming and ordering children.
- When a categorical selection exactly includes or excludes whole groups matching the target legend field, legend symbols
  reflect selected appearance and complement opacity. Legend labels remain unchanged. Partial/non-corresponding selections
  leave the legend untouched.

### Formal values — `highlightMarks`

- Implemented: `highlightMarks({ id?: UserId; target?: UserId; select?: MarkSelector; selection?: UserId; color?: NonEmptyString; opacity?: UnitInterval; fill?: NonEmptyString; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | readonly NonNegativeFinite[]; shape?: PointShape; size?: PositiveFinite; offset?: { x?: Finite; y?: Finite }; dimOthers?: boolean | { opacity?: UnitInterval }; bringToFront?: boolean })` for point/bar/line/area/arc/rule/Tick with mark-specific option applicability.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `highlightMarks`

- Selection flow
  - ✅ Covered: inline and reusable selection, source conflict, inferred current selection and target agreement.
- Point appearance
  - Polygon replacement preflights resulting selected polygon commands plus retained path commands against the common 10,000,000 work limit before allocation. Oversized highlights fail atomically; mark/Canvas/data replay repeats the same check.
  - ✅ Covered: shortest default, color/fill conflict, opacity, stroke/width dependency, shape, size, offset and errors.
  - ✅ Covered: every supported point shape as a highlighted replacement through the shared point-shape grammar.
- Bar appearance and grain
  - ✅ Covered: default/explicit fill, opacity, stroke/width, point-only option rejection, item/stack attachment and
    selected-last behavior.
  - ✅ Covered: approved maximum-`y2` item/stack primitive-public pairs and Canvas rematerialization.
- Complement and ordering
  - ✅ Covered: disabled/default/explicit dimming, selected-last order, disabled front placement and empty-selection no-op.
- Persistence and visual equality
  - ✅ Covered: Canvas resize and filtered cardinality rematerialization; approved primitive/public semantic,
    graphic, renderer-call and same-run pixel equality.
- Path/rule/Tick appearance
  - ✅ Covered: line stroke/width/named dash, area/arc fill/opacity/outline, rule/Tick stroke/width/dash, logical offsets,
    Canvas/mark rematerialization, and mark-specific option rejection.
  - ✅ Covered: exact categorical legend-symbol reflection without label dimming and approved Gate C equality.
- Evidence: `test/unit/actions/selection/mark-selection.test.js`,
  `test/unit/actions/selection/arc-selection.test.js`,
  `test/unit/actions/selection/selection-robustness.test.js`,
  `test/charts/mark-selection-points/public.test.js`,
  `test/charts/mark-selection-bars/public.test.js`, and their PNG render tests.
  Gate C evidence: `test/charts/mark-selection-lines/public.test.js`.

## Persistent selection storage and concrete identity

Only persistent-selection is registered in the shared resource registry. Resources have unique kind/id, non-negative safe revision,
algorithmVersion "1", authored or generated ownership, exact typed data/resource inputs, closed options/result and provenance.
Predicate options contain mode/predicate; row-key options contain mode/logicalDataId/rowKeys; result is empty. Predicate membership is
reevaluated. Logical key membership survives deletion and reappearance. The stored target projection determines the current dataset.
Prepared results pin a sourceRevisionVector and inputHash; stale inputs and dependency cycles are rejected. Removal restricts live
references. Explicit generated ownership permits a preflighted cascade; authored shared consumers must be removed/rebound first.
The existing removeMarkSelection highlight cleanup and named-label restriction remain unchanged. There are no generic domain resource actions.

Final semantic item keys contain child path, owner, role and logical final-grain identity. Private graphic child IDs derive from item key
and primitive role. Concrete identity metadata stores key, topology and direct row-lineage references; dataset lineage provides their
complete contributors. Line/area series identity is separate from ordered member topology and segment roles. Composition namespaces
keys so moving between child paths enters/exits. SVG scene v1 and Canvas scene v2 read only concrete metadata from graphicSpec.

Evidence: `test/unit/actions/data/row-identity.test.js`, `test/unit/core/resource-state.test.js`,
`test/unit/persistence/legacy-selection.test.js`, `test/unit/persistence/legacy-derived.test.js`.
