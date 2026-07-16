# Planned Mark Selection contracts

These contracts are accepted Phase 9 work. They are not current public behavior.

## Shared selector algebra

```typescript
type ComparisonOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

type MarkSelector =
  & (
    | { field: FieldName; channel?: never }
    | { channel: Channel; field?: never }
  )
  & (
    | { op: ComparisonOperator; value: unknown }
    | { op: "oneOf"; values: readonly unknown[] }
    | {
        op: "range";
        min: FiniteOrString;
        max: FiniteOrString;
        inclusive?: boolean;
      }
    | {
        op: "min" | "max";
        count?: PositiveInteger;
        groupBy?: FieldName | readonly FieldName[];
        ties?: "first" | "all";
      }
  );
```

- Exactly one of `field` or `channel` identifies the selection value. Comparison and range semantics are strict and
  never coerce values. Ordered values must be finite numbers or strings of one compatible type.
- `count` defaults to `1`; `ties` defaults to `"first"`. `"first"` returns exactly `count` items when available and
  breaks equal values by stable source/item order. `"all"` includes every item tied at the boundary and may return
  more than `count`.
- `groupBy` is valid only for `min | max`. Group output follows first appearance and selected items follow
  ascending order for `min`, descending order for `max`, then stable item order.
- Missing/non-comparable values are ineligible. An empty result is valid. Unknown operators, incompatible modes,
  ambiguous fields/channels and invalid counts fail during aggregate preflight.
- A selector evaluates semantic item values, never resolved pixels. Canvas size, scale range and renderer backend
  therefore cannot change which items are selected.

## Mark-item selection grammar

The shared resolver exposes one deterministic selectable item per final visual unit:

```text
point       one rendered symbol / source member row
bar         one final histogram, aggregate, grouped, ranged or stacked rectangle
line        one series path
area        one series path
rule        one concrete rule line
```

Each internal item owns a stable key, owning layer, semantic field/channel values, source/member rows and concrete
graphic child identity. A multi-row path field may be selected only when the item has one unique value for that
field, such as a series group. Phase 9 does not silently reduce a multi-valued line/area channel to min/max.

The resolver is pure and mark-capability-based. It does not read Canvas pixels or renderer calls. Point selection
may reuse internal immutable selected-row derivation; aggregate/path items use their final semantic grain instead
of pretending that every graphic maps one-to-one to a source row.

### Coverage plan — selector and item grammar

- Every comparison, set, range and rank operator; numeric/string values; inclusive/exclusive ranges.
- `count` one and many; grouped/ungrouped extrema; both tie policies; missing/mixed/empty input and stable order.
- Field/channel mutual exclusion, ambiguous multi-valued paths, invalid options and immutable failure.
- Point, every current bar grain, line/area series and rule item identity without pixel dependence.
- Canvas, scale, encoding and data rematerialization preserve or deterministically reevaluate item selection.

## `filterMarks`

```typescript
filterMarks(options: { target?: UserId } & MarkSelector): ChartProgram;
```

- This replaces and removes the current singular `filterMark`; no compatibility alias remains after migration.
- Target resolution is explicit target, current eligible mark, unique eligible mark, then error. The normalized
  selector is persisted as semantic mark-item filtering intent and unmatched items are omitted at the target's
  native visual grain.
- For row-grain points the result remains equivalent to the current immutable derived-data rebind. Aggregate bars
  and series paths filter final semantic items rather than raw pixels. Downstream consumers must use the target's
  active member rows when they explicitly derive from that filtered mark.
- The action rematerializes the target, every affected scale and existing guide through an ordered deduplicated
  plan. Source datasets, unrelated marks and earlier programs remain unchanged.
- Lifecycle: aggregate create-only for one target revision. Reapplying a conflicting filter to the same derived
  role requires an explicit new authoring branch rather than mutating stored source values.

### Coverage plan — `filterMarks`

- Migrate all current membership/comparison/range, target inference, rebind, rematerialization and regression tests.
- Add `min | max`, `count`, grouping/ties, channel selection and point/bar/line item-grain coverage.
- Assert `filterMark` is absent from runtime, declarations, contracts, docs, examples and displayed call chains.

## `selectMarks`

```typescript
selectMarks(options: {
  id?: UserId;
  target?: UserId;
} & MarkSelector): ChartProgram;
```

- The first omitted selection ID resolves to `${target}Selection`; another selection for the same role requires an
  explicit ID. The target and normalized selector are stored in immutable selection materialization state, while
  `currentSelection` is transient convenience only.
- Selection alone does not mutate the target, create an overlay, or change `graphicSpec`. It resolves existing
  final visual items and persists enough intent to reevaluate them after mark rematerialization.
- Selected item identity is stable and owned. Empty selection is valid. Ambiguous target/item value and a selector
  incompatible with the target grain fail before any selection state or trace child is created.
- Lifecycle: stable create-only selection resource. `highlightMarks` may consume it repeatedly; changing its
  selector creates a new selection ID.

### Coverage plan — `selectMarks`

- Shortest call, explicit/current/unique target, deterministic and explicit IDs, empty and multiple selections.
- All selector modes at point/bar/path grains, exact selected keys, trace hierarchy and earlier-program immutability.
- Reevaluate after Canvas, scale, encoding, grouping, filtering and cardinality changes without stale item IDs.

## `highlightMarks`

```typescript
highlightMarks({
  id?: UserId;
  target?: UserId;
  select?: MarkSelector;
  selection?: UserId;
  color?: NonEmptyString;
  opacity?: UnitInterval;
  fill?: NonEmptyString;
  stroke?: NonEmptyString;
  strokeWidth?: NonNegativeFinite;
  strokeDash?: DashStyle | DashPattern;
  shape?: PointShape;
  size?: PositiveFinite;
  offset?: { x?: Finite; y?: Finite };
  dimOthers?: boolean | { opacity?: UnitInterval };
  bringToFront?: boolean;
}): ChartProgram;
```

- Exactly one selection source is resolved in this order: explicit `select`, explicit `selection`, current unique
  compatible selection, then error. With `select`, the aggregate calls the real wrapped `selectMarks` child.
- Omitted style uses one chart-independent highlight accent and a mark-specific recipe. Point uses accent color and
  a modest size multiplier; bar/area use accent fill; line/rule use accent stroke and a modest width multiplier.
  `dimOthers` defaults to `false`; `bringToFront` defaults to `true`.
- `color` maps to fill for point/bar/area and stroke for line/rule. `shape` is point-only; `strokeDash` is
  line/rule-only. `size` is a graphical multiplier for point and line/rule recipes and is rejected for bar/area.
  Explicit `fill`, `stroke` and `strokeWidth` remain advanced appearance overrides and are validated by mark type.
- `offset` is a logical-pixel graphical translation applied after semantic position materialization. Direct x/y
  values or selection-specific semantic re-encoding are not part of highlighting.
- Highlight overrides have concrete precedence over encoded/default appearance only for selected items. Optional
  dimming applies to the complement. Concrete child order places selected items last when requested. All intent is
  stored outside `semanticSpec` and reapplied after rematerialization; renderer behavior does not change.
- Lifecycle: aggregate assignment owned by a selection. Reapplying it for the same selection replaces the stored
  appearance assignment immutably rather than requiring a separate `editHighlightMarks` action.

### Coverage plan — `highlightMarks`

- Shortest default recipe for every mark type and every explicit appearance option at its supported mark type.
- Invalid mark/property combinations, style precedence, empty selection, complement dimming and stable front order.
- Logical offsets for circle/rect/line/path, Canvas/scale/encoding rematerialization and no stale override children.
- Approved primitive/public pixel pairs for a selected point subset, longest histogram bar and one line series.

## `editBarMark`

```typescript
editBarMark({
  target?: UserId;
  fill?: NonEmptyString;
  opacity?: UnitInterval;
  stroke?: NonEmptyString | false;
  strokeWidth?: NonNegativeFinite;
}): ChartProgram;
```

- This fills the current stable bar-resource edit gap for whole-mark appearance. At least one property is required.
  Target resolution is explicit, current compatible bar, unique compatible bar, then error.
- Field-driven color takes precedence over a whole-mark fill and conflicts are rejected unless the caller uses
  `highlightMarks`, whose selection-specific override is intentionally higher priority.
- Stored bar appearance survives histogram, grouped/ranged bar, scale and Canvas rematerialization. Geometry,
  encodings, aggregation and stack policy are unchanged.

### Coverage plan — `editBarMark`

- Every property alone and combined, zero stroke width, stroke removal, empty/invalid edits and target ambiguity.
- Histogram, grouped, ranged and stacked bars; encoded-color conflict; Canvas and scale rematerialization.
- Exact use beneath bar highlight materialization remains visible in the wrapped trace without raw graphic paths.
