---
layout: default
title: Selection and Highlighting
---

# Selection and Highlighting

{% include chart-example.html id="selection" lead=true %}

## Mark selection and highlighting

`selectMarks` is the advanced reusable-selection action. Selection by itself
stores its meaning in `semanticSpec.resources` and leaves `graphicSpec` unchanged:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "points"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const selected = program.selectMarks({
  id: "highestByOrigin",
  target: "points",
  field: "Horsepower",
  op: "max",
  groupBy: "Origin"
});
```

Choose exactly one value source:

| Source | Reads | Typical use |
| --- | --- | --- |
| `field` | One data value that is unique for the final item | Origin of a complete line series |
| `channel` | Resolved semantic value before scale mapping | Upper bar endpoint `y2` |
| `property` | Concrete scalar from `graphicSpec` | Rendered rectangle `height` |

| Operator | Required operands | Defaults and result |
| --- | --- | --- |
| `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | `value` | Strict comparison without coercion |
| `oneOf` | `values` array | Strict set membership |
| `range` | `min`, `max`, optional `inclusive` | Both endpoints included by default |
| `min`, `max` | optional `count`, `groupBy`, `ties` | `count: 1`, `ties: "first"` |

Operators are strict
`eq | neq | gt | gte | lt | lte`, set membership with
`{ op: "oneOf", values }`, range selection with
`{ op: "range", min, max, inclusive? }`, or ranked selection with
`{ op: "min" | "max", count?, groupBy?, ties? }`. `count` defaults to `1`,
`ties` to `"first"`, and `inclusive` to `true`. Values are semantic data
values without coercion. The default `grain: "item"` selects one point symbol,
one final bar segment/rectangle, one gradient-plot category strip, one
line/area series path, one arc sector, or one rule line.
Stacked bars additionally accept `grain: "stack"` to treat all segments in one
bin or category as a single item. A multi-row path field or channel must have
one unique value at series grain.

Bar channel and graphical property names intentionally mean different things.
For a vertical bar, semantic `y` is the lower/start endpoint and semantic `y2`
is the upper/end endpoint. Concrete property `y` is the top pixel and concrete
property `height` is its pixel length. For example, select the tallest complete
histogram stack semantically with:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "bars"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.selectMarks({
  target: "bars",
  grain: "stack",
  channel: "y2",
  op: "max"
});
```

Use `{ property: "height", op: "max" }` only when the intended comparison is
the currently rendered pixel height.

`highlightMarks` is the concise chart-authoring facade. It can create the
selection inline or reuse one:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`, `selected`. Resource selectors used here: `selection: "highestByOrigin"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const highlighted = program.highlightMarks({
  select: {
    field: "Horsepower",
    op: "max",
    groupBy: "Origin"
  },
  color: "#dc2626",
  shape: "diamond",
  size: 5.5,
  offset: { x: 7, y: -7 },
  dimOthers: { opacity: 0.18 }
});

const reused = selected.highlightMarks({
  selection: "highestByOrigin",
  color: "#dc2626"
});
```

Current highlighting supports point, bar, rect, line, area, arc, rule, and Tick marks. Points
support fill, shape, size, outline, and logical offset. Bars support fill and
outline. Areas and arc sectors support fill, optional outline, opacity, and path
offset. Lines, rules, and Ticks support stroke, width, named or numeric `strokeDash`,
and logical offset. Each mark rejects options it cannot represent. `dimOthers`
defaults to `false`;
`true` uses opacity `0.25`. `bringToFront` defaults to `true` and keeps every
graphic attached to one selected semantic item together.

| Mark | Selected-item options | Rejected selected-item options |
| --- | --- | --- |
| Point | `color`/`fill`, `opacity`, `stroke`, `strokeWidth`, `shape`, `size`, `offset` | `strokeDash` |
| Bar | `color`/`fill`, `opacity`, `stroke`, `strokeWidth` | `shape`, `size`, `offset`, `strokeDash` |
| Rect | `color`/`fill`, `opacity`, `stroke`, `strokeWidth`, `offset` | `shape`, `size`, `strokeDash` |
| Line | `color`/`stroke`, `opacity`, `strokeWidth`, `strokeDash`, `offset` | `fill`, `shape`, `size` |
| Area | `color`/`fill`, `opacity`, `stroke`, `strokeWidth`, `offset` | `shape`, `size`, `strokeDash` |
| Arc | `color`/`fill`, `opacity`, `stroke`, `strokeWidth`, `offset` | `shape`, `size`, `strokeDash` |
| Rule | `color`/`stroke`, `opacity`, `strokeWidth`, `strokeDash`, `offset` | `fill`, `shape`, `size` |
| Tick | `color`/`stroke`, `opacity`, `strokeWidth`, `strokeDash`, `offset` | `fill`, `shape`, `size` |

All calls reject unknown options, ambiguous targets, incompatible grain, and
invalid values before creating selection or highlight state. `strokeWidth`
requires a matching `stroke` for point, bar, area, and arc highlight recipes.
`select` and `selection` are mutually exclusive. Empty `selectMarks`,
`highlightMarks`, and `filterMarks` results are valid. An empty mark filter
preserves the preceding domains and clears retained mark, label, and highlight
graphics until the filter is replaced, composed, or removed.

An explicit highlight `id` can be reused on the same target to replace both its
selection and appearance atomically. Omitted IDs retain the existing creation
rules. Reusing an ID owned by another target is an error.

For exact observations, including duplicate rows, use
`select: { rows: { data: "dataset", indices: [2, 5] } }`. Indices are zero-based
positions in that named dataset. Final items containing any selected observation
are emphasized. A series or aggregated item is selected as a whole, not a single
vertex or fraction of a bar. Invalid indices and unavailable lineage are rejected.

Composite chart targets include their owned components: box, whiskers, caps and
median; endpoints and connectors; or cloud, summary and observations. Target a
concrete child mark to highlight only that component. Removing the owning
highlight restores all of its component appearances. Independent overlays and
statistical additions retain their own targets.

Text marks support `color`/`fill`, `opacity`, `fontSize`, and `offset`. Other mark
types reject `fontSize`. Highlighted text survives resizing and rematerialization.

`getMarkItems` from `ggaction/inspection` returns final selectable items with
their mark target, field/channel values, bounds, geometry and dataset-row
references. It accepts a mark ID or a `{childPath, id}` target. Geometry is
backend-neutral and has no raw graphic IDs. This supports direct picking and
row-selection interfaces without adding hidden columns to the data.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "trends"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.highlightMarks({
  target: "trends",
  select: { field: "Origin", op: "eq", value: "Japan" },
  stroke: "#dc2626",
  strokeWidth: 5,
  strokeDash: "dashed",
  dimOthers: { opacity: 0.16 }
});
```

When that selection exactly matches complete categories in the mark's legend,
legend symbols reflect the selected and dimmed appearance. Legend labels stay
fully readable. Partial or unrelated selections do not alter the legend.

Selection and highlight intent is immutable and is reapplied after owning mark
rematerialization, including Canvas changes and filtered data cardinality.
Reapplying `highlightMarks` for the same selection replaces that appearance
assignment.

## Selecting stable item keys

Use `items` when a picker or list already identifies complete visual items. Keys
come from `getMarkItems` or the interaction hit result; array positions and raw
graphic IDs are not keys.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete ES module with its inline observations and public imports. Inspect the immutable selection resource after toggling its sole key.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { getMarkItems } from "ggaction/inspection";

const program = chart().createCanvas({ width: 300, height: 240, margin: 40 })
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false });
const items = getMarkItems(program, { target: "points" });
const picked = program.selectMarks({
  id: "picked", target: "points", items: [items[0].key]
});
const toggled = picked.editMarkSelection({
  selection: "picked", mode: "toggle", items: [items[0].key]
});
```

`items: []` selects nothing by default. Set `empty: "all"` explicitly to make an
empty list select every current item. A nonempty list with no visible matches
still selects nothing. Hidden keys remain stored, so removing a filter can make
the same selection visible again. Duplicate keys are stored once.

`editMarkSelection` defaults to `mode: "replace"`. Use `add`, `toggle`,
`subtract`, or `intersect` to combine the current set with incoming items, rows,
or a value selector. These four modes store the resulting item keys at the
existing grain. Existing hidden keys survive unless the operation removes them.
The empty policy is preserved unless explicitly supplied with an items selector.
A replacement field/range selector keeps reevaluating against current values.

The same items selector works in `highlightMarks({ select: ... })`,
`createMarkLabels({ select: ... })`, and `filterMarks`. Use keys from the exact
mark and grain being selected. In a composition, inspect and author with the
same explicit `{ childPath, id }` target; a key from another child is rejected.
Composite inspection reports each item's component `target`.

## Editing and removing stored intent

Replace a stored selector while keeping its ID and mark target:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `highlighted`. Resource selectors used here: `selection: "highestByOrigin"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const revised = highlighted.editMarkSelection({
  selection: "highestByOrigin",
  field: "Horsepower",
  op: "min",
  groupBy: "Origin"
});
```

The supplied selector is complete, not a partial merge. If the selection has a
highlight, the mark and matching categorical legend are rebuilt from their
ordinary baseline before the existing style is applied to the new keys.

Remove only the graphical assignment while retaining reusable selection intent,
or release both through the selection action:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `revised`. Resource selectors used here: `selection: "highestByOrigin"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const selectedOnly = revised.removeMarkHighlight({
  selection: "highestByOrigin"
});
const released = revised.removeMarkSelection({
  selection: "highestByOrigin"
});
```

`removeMarkSelection` removes a dependent highlight first. Direct removal of a
missing highlight or selection is an error. Omitted `selection` uses the current
selection, then one unique stored selection; ambiguity requires an explicit ID.
Changing the target or ID is a remove-then-`selectMarks` operation.

For a gradient plot, opacity, stroke, or offset-only highlights preserve the
existing structured density paint. Supplying `color` or `fill` deliberately
replaces that paint on the selected strip. Use `filterData` before
`createGradientPlot`; `filterMarks` does not partially filter this composite
body and center-rule resource.

See the complete [mark-selection tutorial](../../tutorials/mark-selection.md) for
the approved point, stacked-bar, and line-series examples.

## Related

[Appearance overview](../appearance.md) · [Mark-selection tutorial](../../tutorials/mark-selection.md) · [Data filtering](../data/filtering.md)

Row indices are input coordinates only. A persistent selection immediately stores
the corresponding logical row keys. Reordering keyed data preserves the selection;
deleting a key hides its membership, and reintroducing it selects it again.
Field, channel and property predicates remain dynamic and reevaluate after edits.
Selection meaning belongs to `semanticSpec.resources`; target/projection and
highlight appearance stay in their respective materialization configurations.
