---
layout: default
title: Source and Derived Data
---

# Source and Derived Data

{% include chart-example.html id="scatterplot" lead=true %}

## `createData({ id?, values, schema?, keyField?, keyFields?, keys? })` {#createdata-id-values}

| Option | Type | Required |
| --- | --- | --- |
| `id` | string containing letters, numbers, `_`, or `-` | no; first dataset defaults to `"data"` |
| `values` | array of plain row objects | yes |
| `schema` | `{ fields: SourceSchemaField[] }` | no |
| `keyField` | one field containing unique scalar keys | no |
| `keyFields` | ordered field names forming unique tuples | no |
| `keys` | a separate array of scalar or tuple keys | no |

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const program = chart().createData({
  values: [
    { horsepower: 130, mpg: 18 },
    { horsepower: 165, mpg: 15 }
  ]
});
```

Empty arrays are valid. Every row index must exist and contain a plain object;
sparse arrays are rejected with the invalid row index. Row properties may
contain nested arrays or plain objects. Functions, class instances, and cycles
cannot be stored. The action copies and freezes the supplied data without
freezing caller-owned values. TypeScript preserves structural row interfaces
and rejects non-object rows and function-valued cells. A dataset ID cannot
be created twice, and source values cannot be replaced after creation. The
first omitted ID is stored as `"data"`. Once any dataset exists, another
`createData` call must provide an explicit ID; the library does not invent
`data2`-style names.

Choose at most one key option. Keys distinguish strings, finite numbers, bigint,
boolean and valid Date values. Date keys belong in the separate `keys` array;
row cells still accept only plain immutable data. Empty strings are valid keys,
`-0` equals `0`, and null, undefined, nonfinite numbers and objects are invalid.
Tuples contain 1–64 scalar components; duplicates reject the whole operation.
Without a key option, the action allocates internal row identities. See
[data revisions](./revisions-and-removal.md) for retaining them across edits.

Every dataset carries a schema. Non-empty source rows infer field kinds and
nullable state from observed values. An empty source has an unknown schema;
`[{}]` has a known schema with no fields. Pass `schema` when an empty dataset
must retain field meaning or when every row should be checked against a closed
set of declared fields. Derived transforms validate their input fields and
publish their output schema. `getDatasetSchema(program, id)` from
`ggaction/inspection` returns the immutable normalized result, including
lineage and whether it was declared, inferred, or derived.

Source row keys are stored exactly, including `""` and whitespace. An unused
unnamed column is neither renamed nor dropped. A declared schema uses the same
exact `name`; omitted columns still fail closed-schema validation. Empty names
remain invalid as chart or transform field references and as generated field
names or resource IDs. Row-preserving transforms, source revisions, facets and
editable snapshots retain these cells; projections keep their existing column
policy. Dataset schema version 1 is unchanged. Reading snapshots with empty
field names requires a runtime that supports these source keys.

The most recently created dataset becomes the default for `createPointMark`,
`createLineMark`, or `createBarMark`. Creating data records semantic state only
and produces no graphics.

## Observed graph data {#observed-graph-data}

`createGraphData({ id, nodes, edges, nodeKey, source, target, edgeKey?, weight?,
attributes?, directed?, selfLoops?, maxNodes?, maxEdges? })` is a Full
chart-authoring action. It stores a graph from two explicitly selected,
materialized tables. It creates no graphics.

<!-- snippet-context:start -->

> **Executable complete.** Imports and both source tables are included. This data-only example creates a semantic graph and no Canvas.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const graph = chart()
  .createData({ id: "nodes", values: [{ name: "A" }, { name: "B" }] })
  .createData({ id: "edges", values: [{ from: "A", to: "B", cost: 0 }] })
  .createGraphData({
    id: "network", nodes: "nodes", edges: "edges",
    nodeKey: "name", source: "from", target: "to", weight: "cost"
  });

const directed = graph.editGraphData({
  target: "network", definition: { directed: true }
});
console.log(directed.semanticSpec.resources.find(resource =>
  resource.kind === "graph" && resource.id === "network"
).result.model.edges[0].weight); // 0
```

`nodeKey`, `source`, `target`, and optional `edgeKey` each select one field or
an ordered array of 1–64 distinct fields. Keys retain their types: the string
`"1"` and number `1` identify different nodes. Node keys must be unique, and
every edge endpoint must match an existing node. Explicit edge keys must also
be unique. Without `edgeKey`, parallel edges retain identities derived from
the edge table's persisted row keys, including across row reordering.

`weight` selects one finite numeric field; omission assigns 1. Zero and negative
observed weights are retained. `attributes` explicitly selects node fields to
copy, defaulting to `[]`. `directed` and `selfLoops` default to false. A self
edge requires `selfLoops: true`. `maxNodes` and `maxEdges` default to 10,000;
both must be positive safe integers, and the shared work limit also applies.
Empty node and edge tables are valid. The same table may supply both roles.

`editGraphData({ target?, nodes?, edges?, definition? })` revises an observed
graph. Its `target` selects the graph; `definition.target` changes the edge's
destination field. Omitted inputs and definition fields preserve their current
values. A nonempty patch is required, and explicit `undefined`, unknown options,
missing endpoints, and invalid weights fail without changing the original
program. Every successful explicit edit increments the graph revision.
Omitting `target` uses the current eligible graph, then a unique eligible graph;
an ambiguous choice requires an explicit ID.

Creation is local to a unit because its `target` names an endpoint field. Create
graphs in their child units before composing charts. Editing supports the
standard [scoped targets](../composition/editing.md#target-one-view-one-mark-or-several-marks). Source data revisions
rebuild each affected graph once, updating exact input references and row
provenance. A referenced source cannot be removed. Editable snapshots retain
the graph model and validate its structure and source bindings on restoration.
These actions and graph snapshots require the Full entry.

## Prepared data updates {#prepared-data-updates}

`prepareDataUpdate(program, request, host)` is an asynchronous chart-authoring
helper exported by `ggaction` and `ggaction/basic`. It prepares data without
changing the program. `program.applyDataUpdate({ prepared, requestToken })`
applies its opaque result synchronously to that exact program instance.

| Request | Fields | Availability |
| --- | --- | --- |
| Create | `{ kind: "create", id, source, keyField?, keyFields? }` | Full and Basic |
| Refresh | `{ kind: "revise", target, id, rowMap? }` | Full |
| Parameter change | `{ kind: "parameter", target, value }` | Full |

Create requires a fresh explicit dataset ID and creates a source binding with
the same ID. Refresh targets that binding and needs a fresh snapshot ID.
Parameter changes load every affected URL source and update the combined
source/computed dependency graph once. The existing parameter type and
nullability remain fixed. Same-value parameter updates load nothing.

Choose one source shape:

| Source | Required fields | Optional fields |
| --- | --- | --- |
| Inline rows | `{ kind: "inline", values }` | `parse`, `schema` |
| Inline text | `{ kind: "inline", text, format }` | `delimiter`, `parse`, `schema` |
| Named text | `{ kind: "named", name, format }` | `delimiter`, `parse`, `schema` |
| URL text | `{ kind: "url", url, format }` | `delimiter`, `parse`, `schema` |

Formats are `"csv"` and `"json"`. CSV defaults to a comma and accepts a single
nonquote, nonnewline delimiter. It supports quoted cells, doubled quotes and
embedded newlines, with unique nonempty headers and consistent row widths.
JSON must contain an array of plain row objects. Source rows accept finite JSON
values, including nested arrays/objects; executable values, undefined, bigint,
Date objects, cycles, accessors and reserved prototype keys are rejected.

`parse` maps field names to `{ type, nullable? }`, with types `string`, `number`,
`boolean`, and `date`. Nullable defaults to false. Numeric parsing accepts finite
decimal and exponent forms; boolean text must be exactly `"true"` or `"false"`.
Dates require an explicit `timeZone` (`"UTC"` or an IANA name). Their optional
`format` is `%Y-%m-%d` (default), `%d/%m/%Y`, `%m/%d/%Y`, or `iso`. Dates become
epoch milliseconds. Invalid calendar dates and ambiguous or nonexistent local
times fail. Optional `schema` uses the closed source schema above; empty parsed
data keeps declared or typed field meaning.

A URL can be a string or a `ComputedExpressionV2` using scalar parameters from
the same unit. Field access is unavailable in URL expressions. Every branch is
validated; the selected result must be a nonempty string. Relative URLs require
an absolute `host.baseURL`. A binding retains its base URL for later refreshes.

The host object requires a nonempty string `requestToken`. It may also provide
`baseURL`, an `AbortSignal` as `signal`, and these callbacks:

| Host callback | Input | Result |
| --- | --- | --- |
| `load` | `{ url, signal? }` | CSV/JSON payload or a promise for it |
| `resolveNamed` | `{ name, signal? }` | CSV/JSON payload or a promise for it |

A payload contains exactly one of `text` or `bytes` (`Uint8Array`), plus
`mimeType` and `encoding: "utf-8"`. CSV accepts `text/csv` or `application/csv`;
JSON accepts `application/json` or `application/*+json`. A UTF-8 charset parameter
is accepted. Invalid Unicode, MIME/format mismatches, and other encodings fail.
The library never invokes fetch automatically and does not unwrap a Response.

Choose at most one key policy, `keyField` or ordered `keyFields`. Generated keys
are the default. Explicit key arrays are unavailable for prepared sources.
Refresh preserves a field/tuple key policy. For generated keys, optional
`rowMap` follows [the source revision rules](./revisions-and-removal.md).

All source requests are validated before loading starts. Results may arrive in
any order; application waits for all of them. A failed load, parse, key mapping
or consumer update preserves the original program and its trace. Aborted,
forged, copied or serialized handles cannot be applied. Applying to a different
program instance or with a different token reports `stale-result`.

Use the application's **current program and current request token** when applying.
An old immutable program is a valid intentional branch; the library cannot
observe which variable the application considers current. See the complete
[refresh workflow](../../data-updates.md#prepare-and-apply-source-data).

Full snapshots retain original received text/rows and parsing receipts for
offline restoration. Old snapshots preserve their historical receipts. Restore
validates stored data without loading or evaluating URL expressions. Canvas,
SVG, PNG, PDF and scenes continue to use concrete graphics only.

Facet/repeat updates rebuild their retained source and existing recipe. For
concat, prepare and apply in an explicit child, then replace that child. A live
source is a consumer of its URL parameters, so removing those parameters is
restricted until the binding is gone. Direct manual row revisions detach the
binding as described in [data revisions](./revisions-and-removal.md).

## `createDerivedData({ id, source, transform })` {#create-derived-data}

`createDerivedData` is the advanced provenance-assembly action behind the
higher-level data actions. `transform` must be a one-element array containing
one supported transform object; a bare object, an empty array, or a transform
pipeline is not accepted.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resource selectors used here: `source: "source"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart()
  .createData({
    id: "source",
    values: [{ group: "A" }, { group: "B" }]
  })
  .createDerivedData({
    id: "selected",
    source: "source",
    transform: [
      { type: "filter", field: "group", oneOf: ["A"] }
    ]
  });

console.log(program.semanticSpec.datasets[1].transform[0].type);
// "filter"
```

The action stores the source ID and immutable transform provenance. It does
not compute or store `values`, and it does not create graphics. Prefer the
corresponding higher-level action when the library should materialize values:

| `type` | Public transform shape | Value-producing action |
| --- | --- | --- |
| `"bin2d"` | `{ type, x, y, bins, extent, includeEmpty, members, as, resolved? }` | `createBin2DData` |
| `"bin"` | `{ type, field, bin, extent, nice, zero, includeEmpty, members, as, weight?, resolved? }` | `createBinData` |
| `"computed"` | `{ type, as, expression }` | `createComputedData` |
| `"normalize"` | `{ type, field, as, groupBy, method, ...methodPolicies }` | `createNormalizedData` |
| `"complete"` | `{ type, key, groupBy, values? or sequence? or calendar?, fill, members? }` | `createCompleteData` |
| `"impute"` | `{ type, fields, groupBy, sortBy, method, value?, edges, maxGap? }` | `createImputedData` |
| `"filter"` | `{ type, field, oneOf }`, `{ type, field, predicate }`, or `{ type, field, range }`, or `{ type, where }` | `filterData` |
| `"lookup"` | `{ type, field, lookup: { data, key, fields, as } }` | `createLookupData` |
| `"flatten"` | `{ type, fields, as }` | `createFlattenData` |
| `"fold"` | `{ type, fields, as }` | `createFoldData` |
| `"pivot"` | `{ type, field, value?, groupBy, columns, op, fill }` | `createPivotData` (Full only) |
| `"regression"` | `{ type, method, x, y, groupBy?, ...methodParameters }` | `createRegressionData` |
| `"regressionStatistics"` | `{ type }`, with an existing linear fit as source | `createRegressionStatisticsData` |
| `"sort"` | `{ type, sortBy }` | `createSortedData` |
| `"density"` | `{ type, field, groupBy?, bandwidth, extent, steps, kernel?, normalization?, weight?, as, resolve: "shared", resolved? }` | `createDensityData` |
| `"ecdf"` | `{ type, field, groupBy, weight?, missing, as, resolved? }` | `createECDFData` |
| `"statisticalReference"` | `{ type, target }` | Owned by `createReferenceLine` / `createReferenceBand`; use those actions |
| `"horizon"` | `{ type, x, y, groupBy?, bands, baseline, extent, resolve, missing, overflow, palette, ... }` | `encodeHorizon` |
| `"interval"` | `{ type, field, groupBy, center, extent, level?, as }` | `createIntervalData` |
| `"summary"` | `{ type, groupBy, aggregates, members?, weight? }` | `createSummaryData` |
| `"stack"` | `{ type, category, group, value, mode, as }` | `createStackData` |
| `"timeUnit"` | `{ type, field, unit, as, temporalUnit?, timeZone?, ...weekPolicy }` | `createTimeUnitData` |
| `"window"` | `{ type, partitionBy, sortBy, operations, temporalUnit? }` | `createWindowData` |

Chart facades and mark creation require materialized `values` on the selected
dataset. Passing a definition-only dataset produces an error naming the dataset
and explaining this requirement. Choosing it as the current dataset has the same
result. Use a value-producing action from the table above to create data for the
chart; consumers do not run transform definitions automatically.

For regression, linear and polynomial transforms with an interval require
either legacy `confidence` or the explicit `confidenceMethod` plus `level`
branch. `interval: false` stores fit-only output without confidence fields.
Polynomial also requires `degree`. LOESS requires `span` and does
not accept interval properties. Density `as` is a two-field tuple. Interval
`as` contains distinct `center`, `lower`, and `upper` field names; mean CI
requires `level`, while median pairs only with IQR. Window transforms require
normalized arrays for `partitionBy`, `sortBy`, and `operations`; use
`createWindowData` to apply defaults and materialize rows. A materialized density
revision adds `resolved: { bandwidth, extent }` without replacing requested
`"auto"` values. See the higher-level action
sections below for accepted values and defaults before constructing normalized
provenance directly. Time-unit transforms use the common temporal input parser,
then resolve UTC or an explicit IANA-zone calendar boundary. Weekday output is
nominal; other units store a finite bucket-start timestamp. Use
`createTimeUnitData` to validate source fields and materialize rows.

## `createSortedData({ id, source?, sortBy })` {#create-sorted-data}

Create a materialized derived dataset whose rows are stably ordered without
changing its source. `sortBy` is a non-empty array of `{ field, order?, nulls?,
temporalUnit? }` keys. `order` defaults to `"ascending"`; `nulls`
defaults to `"last"`. Quantitative, categorical, and temporal keys use their
declared comparison rules. Mixed incompatible values fail instead of being
coerced. Equal keys retain source order.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const ordered = chart()
  .createData({ id: "sales", values: sales })
  .createSortedData({
    id: "orderedSales",
    sortBy: [
      { field: "region", fieldType: "nominal" },
      { field: "revenue", fieldType: "quantitative", order: "descending" }
    ]
  });
```

The transform retains the source schema and participates in dependent replay,
source revision, persistence, and the ordinary derived-data lifecycle.

`DatasetTransform` and `CreateDerivedDataOptions` export the same public union
for TypeScript. Internal transforms generated by composite actions, including
box-plot and final-mark filtering provenance, are intentionally not part of
this direct-authoring union. The public tuple contains exactly one transform;
multi-transform pipelines are rejected. Built-in value materializers each own
and normalize that single transform.

## `bindMarkData({ target, data })` {#bindmarkdata-target-data}

Use `bindMarkData` to move an existing independent mark to another materialized
dataset while preserving its encoding and visual configuration:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "points"`; `data: "selectedCars"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const revised = program.bindMarkData({
  target: "points",
  data: "selectedCars"
});
```

The action first validates the complete result, including encoding fields and
types, coordinate placement, shared scales, guides, labels, selections, and
highlights. It then records the semantic rebind and rematerializes every
registered consumer. A failure returns no partial program; the earlier program
remains usable.

`data` must contain concrete `values`. A definition-only `createDerivedData`
result is rejected. Composite marks and marks backed by an owned density,
horizon, or final-item filter recipe must use their documented edit or filter
lifecycle because changing only one layer would break the resource.

## `createSummaryData({ id, source?, groupBy?, aggregates, members?, weight? })` {#createsummarydata-id-source-groupby-aggregates-members}

This heading shows common options. For the full callable contract and all branches, see [`createSummaryData`](../../reference/actions/statistics.md#createsummarydata) and the [exact declarations](../../reference/types.md).

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createsummarydata-id-source-groupby-aggregates-members) for this contract and its examples.

## `createBinData({ id, source?, field, ...binOptions })` {#createbindata-id-source-field-binoptions}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createbindata-id-source-field-binoptions) for this contract and its examples.

## `createFlattenData({ id, source?, fields, as? })` {#createflattendata-id-source-fields-as}

See [aligned array data](./summaries-and-shaping.md#createflattendata-id-source-fields-as).

## `createFoldData({ id, source?, fields, as? })` {#createfolddata-id-source-fields-as}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createfolddata-id-source-fields-as) for this contract and its examples.

## `createComputedData({ id, source?, as, expression })` {#createcomputeddata-id-source-as-expression}

See [Expressions and Normalization](./expressions-and-normalization.md#createcomputeddata-id-source-as-expression) for this contract and its examples.

## `createNormalizedData({ id, source?, field, as, groupBy?, method, ... })` {#createnormalizeddata-id-source-field-as-groupby-method}

See [Expressions and Normalization](./expressions-and-normalization.md#createnormalizeddata-id-source-field-as-groupby-method) for this contract and its examples.

## `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, calendar?, fill?, members? })` {#createcompletedata-id-source-key-groupby-values-sequence-fill-members}

See [Missing Keys and Values](./missing-data.md#createcompletedata-id-source-key-groupby-values-sequence-fill-members) for this contract and its examples.

## `createImputedData({ id, source?, fields, groupBy?, sortBy?, method?, value?, edges?, maxGap? })` {#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap}

See [Missing Keys and Values](./missing-data.md#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap) for this contract and its examples.

## `createStackData({ id?, source?, category, group, value, mode?, as? })` {#createstackdata-id-source-category-group-value-mode-as}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createstackdata-id-source-category-group-value-mode-as) for this contract and its examples.

## Editing derived data {#editing-derived-data}

See [Data Revisions and Removal](./revisions-and-removal.md#editing-derived-data) for this contract and its examples.

## `removeData({ id })` {#removedata-id}

See [Data Revisions and Removal](./revisions-and-removal.md#removedata-id) for this contract and its examples.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)

## layoutGraph

```typescript
layoutGraph(options: LayoutGraphOptions): ChartProgram
```

Chart authoring, Full only. Compute numeric positions from an existing graph without changing its relationships. Choose `method:"fixed"`, `"circular"`, or `"force"`. The layout ID is required; omit `graph` only when the current or unique graph identifies it.

Fixed layouts require `options.positions`, an array of `{key,x,y}` covering every node exactly once. Keys are original typed source keys, including compound arrays. Coordinates must be finite.

Circular layouts default to `center:[0,0]`, `radius:100`, and `startAngle:0`. Angles use degrees clockwise from the top. A single node is placed at the center; empty graphs remain empty.

Force layouts default to `seed:1`, `iterations:300`, `linkDistance:30`, `repulsion:100`, `collisionRadius:4`, `damping:0.9`, `center:[0,0]`, `componentGap:16`, and `pinned:[]`. Optional `initialPositions` must cover every node. Each pin is `{key,fx,fy}` and remains fixed when disconnected components are packed. Results are deterministic for the same graph and options.

Every method accepts positive integer `maxNodes` and `maxEdges`, each defaulting to 10000. Work limits reject oversized computations. Undefined and unknown options fail.

Use [editLayout](../hierarchy.md#editlayout) to patch options. Graph or source edits update dependent layouts once and reject incompatible fixed positions or pins atomically. Serialization retains the computed results; restoration validates them without running the force solver. These resource actions do not draw marks.
