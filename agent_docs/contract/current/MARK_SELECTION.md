# Mark selection action contracts

Current direct-action contracts for semantic mark-item selection and point highlighting. Shared notation and
lifecycle rules live in [`../README.md`](../README.md).

## Shared selector algebra and mark-item grain

```typescript
type MarkSelector =
  & ({ field: FieldName; channel?: never } | { channel: Channel; field?: never })
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

- `field`와 `channel` 중 정확히 하나를 사용한다. 값 비교는 strict하며 coercion하지 않는다.
- `range`의 `inclusive` 기본값은 `true`다. Ordered comparison은 같은 type의 finite number 또는 string만
  비교하고 missing/incompatible item은 제외한다.
- `min | max`의 `count` 기본값은 `1`, `ties` 기본값은 `"first"`다. `"first"`는 stable source order로
  정확히 count개를 고르고 `"all"`은 boundary tie를 모두 포함할 수 있다. `groupBy`는 extrema에만 유효하다.
- 현재 selectable grain은 point symbol, final bar rectangle, line/area series path, rule line이다. Stable key는
  semantic item identity에서 만들며 Canvas pixel geometry나 collection child 순서를 selector 값으로 사용하지 않는다.
  Multi-row path의 field/channel은 series grain에서 값이 하나로 unique할 때만 selectable하다.
- Empty selection은 성공이다. Ambiguous field/channel, target 또는 incompatible selector는 state와 trace를
  만들기 전에 실패한다.

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

- Implemented: `selectMarks({ id?: UserId; target?: UserId } & MarkSelector)` for point/bar/line/area/rule item grain and every
  comparison, set, range and grouped/ungrouped extrema mode above.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `selectMarks`

- Target and ID
  - ✅ Covered: omitted/explicit target, deterministic/explicit ID, duplicate ID, missing target and immutable failure.
- Predicate/set/range
  - ✅ Covered: strict comparison operators, `oneOf`, inclusive/exclusive range, numeric/string compatibility,
    missing values and empty result in selector grammar tests.
- Extrema
  - ✅ Covered: min/max, count, grouped extrema, stable ties and both tie policies in selector grammar tests.
- Effects and reevaluation
  - ✅ Covered: selection-only graphic identity, exact point keys, trace, Canvas resize and filtered-cardinality reevaluation.
  - ⚠️ Partial: multiple simultaneous selections through every rematerialization producer.
- Cross-mark highlight appearance remains Planned, but cross-mark selection identity is current.
- Evidence: `test/unit/grammar/transforms/mark-selection.test.js`,
  `test/unit/selectors/mark-items.test.js`,
  `test/unit/actions/selection/mark-selection.test.js`,
  `test/charts/mark-selection-points/public.test.js`.

## `highlightMarks`

- Signature: `highlightMarks({ id?, target?, select?, selection?, color?, opacity?, fill?, stroke?, strokeWidth?, shape?, size?, offset?, dimOthers?, bringToFront? })`
- Selection source: inline `select`, explicit `selection`, current unique compatible selection 순으로 resolve한다.
  Inline selection은 real wrapped `selectMarks` child를 호출하며 `select`와 `selection`은 함께 쓸 수 없다.
- Current mark capability: point only. Omitted appearance uses accent `#dc2626` and area multiplier `2`.
  `color` maps to point fill; `color` and `fill` conflict. `shape` accepts the shared 12 point shapes. `size` is a
  positive finite area multiplier, not a semantic size encoding.
- `opacity` is selected-item opacity. Optional `strokeWidth` requires `stroke`. Logical `offset.x/y` defaults to zero.
  Point highlight rejects `strokeDash`; bar/line/area/rule-specific styles remain Planned.
- `dimOthers` defaults to `false`; `true` uses opacity `0.25`, or `{ opacity }` supplies an explicit unit interval.
  `bringToFront` defaults to `true` and stores selected collection children last. Empty selection changes no selected
  child and may still dim the full complement when requested.
- Effect: selected concrete children receive overrides after ordinary encoding appearance. Assignment intent is stored
  in `materializationConfigs.highlights`; reapplying the same selection immutably replaces its assignment. Point
  rematerialization first rebuilds base children, reevaluates selection, then reapplies highlight/dimming/order.

### Formal values — `highlightMarks`

- Implemented: `highlightMarks({ id?: UserId; target?: UserId; select?: MarkSelector; selection?: UserId; color?: NonEmptyString; opacity?: UnitInterval; fill?: NonEmptyString; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite; shape?: PointShape; size?: PositiveFinite; offset?: { x?: Finite; y?: Finite }; dimOthers?: boolean | { opacity?: UnitInterval }; bringToFront?: boolean })` for point marks.
- Proposed (NOT IMPLEMENTED): —; bar/line/area/rule recipes plus `strokeDash` applicability are Planned.

### Value coverage — `highlightMarks`

- Selection flow
  - ✅ Covered: inline and reusable selection, source conflict, inferred current selection and target agreement.
- Point appearance
  - ✅ Covered: shortest default, color/fill conflict, opacity, stroke/width dependency, shape, size, offset and errors.
  - ⚠️ Partial: every supported point shape as a highlighted replacement rather than through shared shape grammar alone.
- Complement and ordering
  - ✅ Covered: disabled/default/explicit dimming, selected-last order, disabled front placement and empty-selection no-op.
- Persistence and visual equality
  - ✅ Covered: Canvas resize and filtered cardinality rematerialization; approved primitive/public semantic,
    graphic, renderer-call and same-run pixel equality.
- Planned: bar fill, line/rule stroke/dash and area fill recipes remain in
  [`../planned/MARK_SELECTION.md`](../planned/MARK_SELECTION.md).
- Evidence: `test/unit/actions/selection/mark-selection.test.js`,
  `test/charts/mark-selection-points/public.test.js`,
  `test/charts/mark-selection-points/png.render.js`.
