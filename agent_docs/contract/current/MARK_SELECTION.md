# Mark selection action contracts

Current direct-action contracts for cross-mark selection and highlighting. Shared notation and
lifecycle rules live in [`../README.md`](../README.md).

## Shared selector algebra and mark-item grain

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
  scalar 값만 읽는다. 값 비교는 strict하며 coercion하지 않는다.
- `range`의 `inclusive` 기본값은 `true`다. Ordered comparison은 같은 type의 finite number 또는 string만
  비교하고 missing/incompatible item은 제외한다.
- `min | max`의 `count` 기본값은 `1`, `ties` 기본값은 `"first"`다. `"first"`는 stable source order로
  정확히 count개를 고르고 `"all"`은 boundary tie를 모두 포함할 수 있다. `groupBy`는 extrema에만 유효하다.
- `grain` 기본값은 `"item"`이다. Item grain은 point symbol, final bar segment/rectangle, line/area series path,
  rule line이다. Bar의 `grain: "stack"`은 stack/fill/diverging layout에서 같은 bin/category의 모든 segment를
  한 item으로 묶는다. Group/overlay/ranged bar와 non-bar mark는 stack grain을 거부한다.
- Bar semantic geometry는 start endpoint `x`/`y`와 end endpoint `x2`/`y2`를 사용한다. Concrete rect는
  property `x`/`y`(top-left), `width`/`height`를 사용한다. 예를 들어 vertical zero-based stack의 전체 높이는
  `channel: "y2"`, concrete pixel 높이는 `property: "height"`로 선택한다.
- Stable key는 semantic item identity에서 만들며 collection child order를 selector identity로 사용하지 않는다.
  Multi-row path의 field/channel은 series grain에서 값이 하나로 unique할 때만 selectable하다.
- Empty selection은 `selectMarks`/`highlightMarks`에서 성공이다. `filterMarks`는 empty retained dataset을
  거부한다. Ambiguous field/channel/property, target 또는 incompatible selector는 state와 trace를 만들기 전에
  실패한다.

## `filterMarks`

- Signature: `filterMarks({ target?, ...selector })`
- Target and selection: `selectMarks`와 같은 target inference, selector normalization, native item/stack grain을
  사용한다. Point field selection은 position/size가 아직 없어도 row grain에서 동작하며 channel/property와
  non-point mark는 materialized final items를 요구한다.
- Effect: selected final items의 source member rows를 원래 source order로 보존하는 immutable
  `${target}FilteredData`를 만들고 `layer[target].data`를 explicit `editSemantic` child로 rebind한다. Stored
  `markFilter` transform은 target과 normalized selector를 기록한다. Existing derived ID와 repeat application은
  거부한다.
- Native grain: aggregate/ranged bar는 selected cell members, stacked bar는 complete selected stack members,
  line/area는 selected series members, rule은 selected line members를 보존한다. Histogram은 filtering 전 resolved
  boundaries를 explicit semantic boundaries로 고정해서 selected bins가 subset domain에서 다시 나뉘지 않게 한다.
- Rematerialization: target scale을 deduplicate한 순서로 resolve하고 target mark를 다시 만든 뒤 connected axes,
  grids와 legends를 갱신한다. Coupled categorical legend scales는 intermediate mismatch를 노출하지 않고 final
  domains에서 한 번 다시 materialize한다. Density area는 upstream density provenance를 유지한다.
- Boundary: source dataset, unrelated marks와 earlier program은 바뀌지 않는다. Existing independent downstream
  statistical/composite layers를 암묵적으로 rebind하지 않으므로 filtered rows를 사용해야 하는 aggregate는
  `filterMarks` 뒤에 생성한다. Automatic scales cannot resolve an empty retained dataset, so zero matching items fail
  before state changes. Singular compatibility alias는 없다.

### Formal values — `filterMarks`

- Implemented: `filterMarks({ target?: UserId } & MarkSelector)` for point/bar/line/area/rule item grain and stacked-bar
  grain using field, channel or concrete property with comparison, set, range and grouped/ungrouped rank modes.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `filterMarks`

- ✅ Covered: omitted/explicit/invalid target, incomplete point field fallback, all shared selector families and value
  sources, deterministic derived ID, repeat conflict, immutable source/earlier program and explicit layer rebind.
- ✅ Covered: point scale/axis/grid rematerialization, histogram boundary retention, stack grain, line/area series,
  density provenance, rule endpoints and categorical legend convergence.
- ✅ Covered: regression scatterplot primitive/public equivalence when filtering before statistical layers.
- Evidence: `test/unit/actions/data/filter-marks.test.js`,
  `test/charts/regression-scatterplot/variants/primitive.test.js`.

## `selectMarks`

- Signature: `selectMarks({ id?, target?, ...selector })`
- `target`: explicit mark ID, current eligible mark, unique eligible mark 순으로 추론한다. Point, bar, line,
  area와 rule의 final semantic item resolver를 제공한다.
- `id`: 생략한 첫 selection은 `${target}Selection`을 사용한다. 같은 role의 두 번째 selection은 explicit
  ID가 필요하며 기존 ID를 교체하지 않는다.
- Effect: normalized selector와 target을 immutable `materializationConfigs.selections`에 저장하고
  `currentSelection` context를 갱신한다. `semanticSpec`과 `graphicSpec`은 바꾸지 않는다.
- Rematerialization: stored selector는 현재 semantic point item에 다시 평가되므로 Canvas/scale/encoding/data
  cardinality 변경 뒤에도 stale graphic child ID를 저장하지 않는다.

### Formal values — `selectMarks`

- Implemented: `selectMarks({ id?: UserId; target?: UserId } & MarkSelector)` for point/bar/line/area/rule item grain,
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
  - ⚠️ Partial: multiple simultaneous selections through every rematerialization producer.
- Line/area/rule selection and highlight appearance use the same stored selection identity as point/bar.
- Evidence: `test/unit/grammar/transforms/mark-selection.test.js`,
  `test/unit/selectors/mark-items.test.js`,
  `test/unit/actions/selection/mark-selection.test.js`,
  `test/charts/mark-selection-points/public.test.js`,
  `test/charts/mark-selection-bars/public.test.js`.

## `highlightMarks`

- Signature: `highlightMarks({ id?, target?, select?, selection?, color?, opacity?, fill?, stroke?, strokeWidth?, strokeDash?, shape?, size?, offset?, dimOthers?, bringToFront? })`
- Selection source: inline `select`, explicit `selection`, current unique compatible selection 순으로 resolve한다.
  Inline selection은 real wrapped `selectMarks` child를 호출하며 `select`와 `selection`은 함께 쓸 수 없다.
- Current mark capability: point, bar, line, area and rule. Omitted appearance uses accent `#dc2626`. Point default size is area
  multiplier `2`; `shape` accepts the shared 12 point shapes and logical offset is available. Point/bar `color` aliases
  fill and conflicts with explicit `fill`. Bar rejects shape, size, offset and strokeDash. Area uses fill with optional
  stroke and rejects shape, size and strokeDash. Line/rule use stroke with optional width and shared named/array dash.
- `opacity` is selected-item opacity. Area/point optional `strokeWidth` requires `stroke`. Logical `offset.x/y` defaults
  to zero and translates point geometry, complete path commands, or rule endpoints without changing semantic values.
- `dimOthers` defaults to `false`; `true` uses opacity `0.25`, or `{ opacity }` supplies an explicit unit interval.
  `bringToFront` defaults to `true` and stores selected collection children last. Empty selection changes no selected
  child and may still dim the full complement when requested.
- Effect: selected concrete children receive overrides after ordinary encoding appearance. Stack selection applies the
  override to every attached rect. Assignment intent is stored in `materializationConfigs.highlights`; reapplying the
  same selection immutably replaces it. Every owning mark rematerializer rebuilds base children, resolves selected keys once,
  then passes the same key snapshot to highlight, dimming and ordering children.
- When a categorical selection exactly includes or excludes whole groups matching the target legend field, legend symbols
  reflect selected appearance and complement opacity. Legend labels remain unchanged. Partial/non-corresponding selections
  leave the legend untouched.

### Formal values — `highlightMarks`

- Implemented: `highlightMarks({ id?: UserId; target?: UserId; select?: MarkSelector; selection?: UserId; color?: NonEmptyString; opacity?: UnitInterval; fill?: NonEmptyString; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; strokeDash?: DashStyle | readonly NonNegativeFinite[]; shape?: PointShape; size?: PositiveFinite; offset?: { x?: Finite; y?: Finite }; dimOthers?: boolean | { opacity?: UnitInterval }; bringToFront?: boolean })` for point/bar/line/area/rule with mark-specific option applicability.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `highlightMarks`

- Selection flow
  - ✅ Covered: inline and reusable selection, source conflict, inferred current selection and target agreement.
- Point appearance
  - ✅ Covered: shortest default, color/fill conflict, opacity, stroke/width dependency, shape, size, offset and errors.
  - ⚠️ Partial: every supported point shape as a highlighted replacement rather than through shared shape grammar alone.
- Bar appearance and grain
  - ✅ Covered: default/explicit fill, opacity, stroke/width, point-only option rejection, item/stack attachment and
    selected-last behavior.
  - ✅ Covered: approved maximum-`y2` item/stack primitive-public pairs and Canvas rematerialization.
- Complement and ordering
  - ✅ Covered: disabled/default/explicit dimming, selected-last order, disabled front placement and empty-selection no-op.
- Persistence and visual equality
  - ✅ Covered: Canvas resize and filtered cardinality rematerialization; approved primitive/public semantic,
    graphic, renderer-call and same-run pixel equality.
- Path/rule appearance
  - ✅ Covered: line stroke/width/named dash, area fill/opacity/outline, rule stroke/width/dash, logical offsets,
    Canvas/mark rematerialization, and mark-specific option rejection.
  - ✅ Covered: exact categorical legend-symbol reflection without label dimming and approved Gate C equality.
- Evidence: `test/unit/actions/selection/mark-selection.test.js`,
  `test/charts/mark-selection-points/public.test.js`,
  `test/charts/mark-selection-bars/public.test.js`, and their PNG render tests.
  Gate C evidence: `test/charts/mark-selection-lines/public.test.js`.
