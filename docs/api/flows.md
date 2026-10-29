---
layout: default
title: Flow Data and Sankey Layouts
---

# Flow data and Sankey layouts

Use explicit node and edge tables to show how quantities move between named
entities. Build a flow graph, store a layout, then draw links and nodes as
separate marks. These actions are available from the Full `ggaction` entry point.

{% include chart-example.html id="flow-layouts" %}

The [flow tutorial](../tutorials/flows.md) uses the same executable program as the
browser example and renderer tests. All renderers consume the same concrete
rectangles, text and closed ribbons.

## `createFlowData`

**Chart authoring.**

```typescript
createFlowData(options: CreateFlowDataOptions): ChartProgram;
```

Required options are `id`, `nodes`, `edges`, `nodeKey`, `source`, `target` and
`value`. The node and edge options name existing materialized datasets. Key and
endpoint columns accept a string or an array of column names for a compound key.
Numeric `1` and string `"1"` remain different keys. `target` names the edge's
endpoint column; create the resource inside its child chart before composing it.

Every endpoint must exist. `value` names one finite, nonnegative numeric column.
Zero-valued links and isolated nodes remain in the resource. Optional `edgeKey`
selects a unique typed edge key. Without it, parallel edges retain their source
row identities. Optional `attributes` selects node columns to retain in the
model. The graph is always directed.

Defaults are `balance: "allow"`, `selfLoops: false`, `maxNodes: 10000` and
`maxEdges: 10000`. `balance: "strict"` requires incoming and outgoing totals to
agree at internal nodes that have both incoming and outgoing edges. Sources and
sinks can have a net flow. The relative tolerance is `1e-12` of the larger total.
Overflow, missing endpoints, invalid values and exceeded work limits are errors.

Each node records incoming, outgoing, throughput and imbalance. Throughput is the
larger total; imbalance is incoming minus outgoing. Creating flow data produces
no graphics.

## `editFlowData`

**Chart authoring.**

```typescript
editFlowData(options: TargetedOptions<EditFlowDataOptions>): ChartProgram;
```

Use `{ target?, nodes?, edges?, definition? }`. Omitted values preserve the stored
source roles and definition; `definition` patches the creation options. A
nonempty edit increments the graph revision and updates dependent layouts,
node/link marks, labels and selections. A source `reviseData` follows the same
path. An invalid endpoint, balance, cycle or label field rejects the entire edit
and leaves the earlier program and trace unchanged.

Choose a flow explicitly with `target`, or rely on the current eligible flow and
then the only eligible flow. Ambiguous choices are errors. `editGraphData` is for
ordinary observed graphs; use `editFlowData` to retain flow semantics.

## `layoutFlow`

**Chart authoring.**

```typescript
layoutFlow(options: TargetedOptions<LayoutFlowOptions>): ChartProgram;
```

Use `{ id, graph?, method, options? }`. Choose `method: "dag"` for an acyclic
flow or `"cyclic"` to preserve feedback and self-loop links. DAG mode rejects
cycles even when their value is zero. Cyclic mode groups strongly connected
nodes and routes their internal links through separate outside lanes; it never
deletes an edge. It accepts any directed graph with finite nonnegative weights.
General graph layouts use the separate `layoutGraph` action.

| Option | Default | Meaning |
| --- | --- | --- |
| `width`, `height` | `600`, `400` | Positive finite layout dimensions |
| `nodeWidth` | `16` | Positive node extent along the flow direction |
| `nodePadding` | `8` | Nonnegative gap between nodes in a column |
| `align` | `"justify"` | `"left"`, `"right"`, `"center"`, or `"justify"` |
| `order` | `"input"` | Input order, `"barycentric"`, or an explicit complete typed-key array |
| `iterations` | `6` | Deterministic relaxation passes, integer from 0 through 1000 |
| `laneGap` | `8` | Nonnegative spacing reserved for feedback lanes |
| `orientation` | `"horizontal"` | `"horizontal"` or `"vertical"` |
| `maxNodes`, `maxEdges` | `10000`, `10000` | Positive integer resource limits |

Left alignment follows longest-path ranks. Right alignment works back from
sinks. Justify moves sinks to the last column. Center keeps internal ranks and
places sources immediately before their first consumer. Input and explicit
orders preserve the order within each column. Barycentric order allows stable
reordering as centers relax.

All columns use one common value-to-thickness ratio. Node thickness represents
throughput; link thickness represents its value. All-zero input uses zero
thickness. Padding that cannot fit is an error. Vertical orientation transposes
the same geometry. Stored layout dimensions stay independent of Canvas size.

Use `editLayout({ target, options: { ... } })` to patch these options while
retaining the method. Existing marks update together. Snapshot restoration
validates the stored geometry and its source bindings without running the
placement solver again.

## `createFlowNodes`

**Chart authoring.**

```typescript
createFlowNodes(options?: TargetedOptions<FlowNodesOptions>): ChartProgram;
```

Use `{ id?, layout?, coordinate?, clip?, nodes?, labels? }`. The default mark ID
is `flowNodes` when available. The layout must be a DAG or cyclic flow layout.
Select a Cartesian coordinate explicitly, reuse the current/only eligible one,
or let the first mark create `main`. The entire layout, including feedback lanes,
is fitted uniformly into its frame. `clip` defaults to `true`.

`nodes` accepts `fill`, `stroke`, `strokeWidth`, `opacity` and `overrides`.
Defaults are blue `#2563eb`, white stroke, width `1`, opacity `1`. Fill accepts
[structured paints](appearance.md). An override is `{ key, ...paint }` and uses an
existing original typed node key. Opacity zero remains a valid visible-item
identity.

Labels default to disabled. `labels: {}` enables keys; `content: "value"` shows
throughput and `content: { field: "name" }` reads a node source column. Missing
fields are errors. Label styles are `fill`, `fontFamily`, `fontSize`, `fontWeight`
and `offset: [x, y]`. Defaults are `#0f172a`, `sans-serif`, `12`, `normal` and
`[0, 0]`. Label overrides accept `{ key, text?, ...paint }`.

Source edits retain an override whose key disappears and report it as an orphan
style. New override assignments must reference existing keys.

## `editFlowNodes`

**Chart authoring.**

```typescript
editFlowNodes(options: TargetedOptions<EditFlowNodesOptions>): ChartProgram;
```

Use `{ target?, layout?, coordinate?, clip?, nodes?, labels? }`. Omitted options
preserve existing values. Styles patch existing styles; an `overrides` array
replaces the whole array. `labels: false` removes labels and their placement
configuration. Empty edits are rejected.

## `createFlowLinks`

**Chart authoring.**

```typescript
createFlowLinks(options?: TargetedOptions<FlowLinksOptions>): ChartProgram;
```

Use `{ id?, layout?, coordinate?, clip?, links? }`. The default ID is `flowLinks`.
Layout and coordinate inference match node marks. Link styles accept the same
body paint fields as nodes, with defaults `#64748b`, stroke `"none"`, width `0`,
opacity `0.45`. Link overrides require an explicit `edgeKey` in the graph;
automatic occurrence IDs are not authored typed keys. Links do not own labels.

Create links before nodes to draw node bodies above their attachments. Forward
links use closed cubic ribbons. Feedback and loop links use closed lane ribbons.
Canvas, SVG, PNG and PDF read these same primitives.

## `editFlowLinks`

**Chart authoring.**

```typescript
editFlowLinks(options: TargetedOptions<EditFlowLinksOptions>): ChartProgram;
```

Use `{ target?, layout?, coordinate?, clip?, links? }`. A nonempty edit patches
styles or changes the exact layout/coordinate binding after validating the full
result. Invalid edits preserve the earlier program.

## Consumers and lifecycle

Flow marks support item inspection, source-row lineage, selection/highlighting,
Canvas and coordinate rematerialization, snapshots, and composition with other
charts through `hconcat` and `vconcat`, including exact child-target edits.
Automatic `facet` and `repeatCharts` partitioning is incompatible with flow marks:
the node and edge tables require coordinated partition rules, so these actions
reject the input without changing it. Node items expose `key`, `value`, `incoming`, `outgoing` and `imbalance`;
link items expose `source`, `target` and `value` alongside unique source fields.

Position, node thickness and link thickness belong to the flow layout. Ordinary
position/size encodings and automatic axes/legends do not apply to these marks.
Use typed style overrides for body appearance and selection/highlighting for
emphasis. Remove marks with `removeMark` before removing their layout or graph
with `removeResource`; live consumers are protected by dependency checks.
Highlight strokes apply to node and link bodies. Node labels share highlight
fill, opacity and offset while retaining their text appearance.

Every action returns an immutable program. Unknown options, explicit
`undefined`, invalid keys and ambiguous omitted references are rejected.

## Outlines and shadows

Body and label styles accept `outline:{color,width}|false` and `shadow:{color,offsetX?,offsetY?,blurRadius?}|false`, including per-item overrides. Omission preserves an effect during edits; false removes it, including an inherited role effect. Effects reuse the [mark appearance contract](appearance/mark-style.md). An authored outline and stroke in the same style patch conflict; an existing stroke is retained underneath the outline and returns when it is removed. Each effect preserves its original item identity and source geometry. Style edits, resize, highlight replay and offline restore do not rerun the stored layout.
