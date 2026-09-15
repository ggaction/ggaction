---
layout: default
title: Source and Derived Data
---

# Source and Derived Data

{% include chart-example.html id="scatterplot" lead=true %}

## `createData({ id?, values, schema? })` {#createdata-id-values}

| Option | Type | Required |
| --- | --- | --- |
| `id` | string containing letters, numbers, `_`, or `-` | no; first dataset defaults to `"data"` |
| `values` | array of plain row objects | yes |
| `schema` | `{ fields: Record<string, DatasetFieldSchema> }` | no |

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

Every dataset carries a schema. Non-empty source rows infer field kinds and
nullable state from observed values. An empty source has an unknown schema;
`[{}]` has a known schema with no fields. Pass `schema` when an empty dataset
must retain field meaning or when every row should be checked against a closed
set of declared fields. Derived transforms validate their input fields and
publish their output schema. `getDatasetSchema(program, id)` from
`ggaction/inspection` returns the immutable normalized result, including
lineage and whether it was declared, inferred, or derived.

The most recently created dataset becomes the default for `createPointMark`,
`createLineMark`, or `createBarMark`. Creating data records semantic state only
and produces no graphics.

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
| `"complete"` | `{ type, key, groupBy, values? or sequence?, fill, members? }` | `createCompleteData` |
| `"impute"` | `{ type, fields, groupBy, sortBy, method, value?, edges, maxGap? }` | `createImputedData` |
| `"filter"` | `{ type, field, oneOf }`, `{ type, field, predicate }`, or `{ type, field, range }` | `filterData` |
| `"fold"` | `{ type, fields, as }` | `createFoldData` |
| `"regression"` | `{ type, method, x, y, groupBy?, ...methodParameters }` | `createRegressionData` |
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

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createsummarydata-id-source-groupby-aggregates-members) for this contract and its examples.

## `createBinData({ id, source?, field, ...binOptions })` {#createbindata-id-source-field-binoptions}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createbindata-id-source-field-binoptions) for this contract and its examples.

## `createFoldData({ id, source?, fields, as? })` {#createfolddata-id-source-fields-as}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createfolddata-id-source-fields-as) for this contract and its examples.

## `createComputedData({ id, source?, as, expression })` {#createcomputeddata-id-source-as-expression}

See [Expressions and Normalization](./expressions-and-normalization.md#createcomputeddata-id-source-as-expression) for this contract and its examples.

## `createNormalizedData({ id, source?, field, as, groupBy?, method, ... })` {#createnormalizeddata-id-source-field-as-groupby-method}

See [Expressions and Normalization](./expressions-and-normalization.md#createnormalizeddata-id-source-field-as-groupby-method) for this contract and its examples.

## `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })` {#createcompletedata-id-source-key-groupby-values-sequence-fill-members}

See [Missing Keys and Values](./missing-data.md#createcompletedata-id-source-key-groupby-values-sequence-fill-members) for this contract and its examples.

## `createImputedData({ id, source?, fields, groupBy?, sortBy?, method, value?, edges?, maxGap? })` {#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap}

See [Missing Keys and Values](./missing-data.md#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap) for this contract and its examples.

## `createStackData({ id, source?, category, group, value, mode?, as? })` {#createstackdata-id-source-category-group-value-mode-as}

See [Summaries, Bins, and Data Shaping](./summaries-and-shaping.md#createstackdata-id-source-category-group-value-mode-as) for this contract and its examples.

## Editing derived data {#editing-derived-data}

See [Data Revisions and Removal](./revisions-and-removal.md#editing-derived-data) for this contract and its examples.

## `removeData({ id })` {#removedata-id}

See [Data Revisions and Removal](./revisions-and-removal.md#removedata-id) for this contract and its examples.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)
