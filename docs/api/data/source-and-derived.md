---
layout: default
title: Source and Derived Data
---

# Source and Derived Data

{% include chart-example.html id="scatterplot" %}

## `createData({ id?, values })` {#createdata-id-values}

| Option | Type | Required |
| --- | --- | --- |
| `id` | string containing letters, numbers, `_`, or `-` | no; first dataset defaults to `"data"` |
| `values` | array of plain row objects | yes |

```javascript
const program = chart().createData({
  values: [
    { horsepower: 130, mpg: 18 },
    { horsepower: 165, mpg: 15 }
  ]
});
```

Empty arrays are valid, and row properties may contain nested arrays or
objects. The action copies and freezes the supplied data. A dataset ID cannot
be created twice, and source values cannot be replaced after creation. The
first omitted ID is stored as `"data"`. Once any dataset exists, another
`createData` call must provide an explicit ID; the library does not invent
`data2`-style names.

The most recently created dataset becomes the default for `createPointMark`,
`createLineMark`, or `createBarMark`. Creating data records semantic state only
and produces no graphics.

## `createDerivedData({ id, source, transform })` {#create-derived-data}

`createDerivedData` is the advanced provenance-assembly action behind the
higher-level data actions. `transform` must be a one-element array containing
one supported transform object; a bare object, an empty array, or a transform
pipeline is not accepted.

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
| `"density"` | `{ type, field, groupBy?, bandwidth, extent, steps, kernel?, normalization?, weight?, as, resolve: "shared", resolved? }` | `createDensityData` |
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

For regression, linear and polynomial transforms require `confidence` and
`interval`; polynomial also requires `degree`. LOESS requires `span` and does
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

`DatasetTransform` and `CreateDerivedDataOptions` export the same public union
for TypeScript. Internal transforms generated by composite actions, including
box-plot and final-mark filtering provenance, are intentionally not part of
this direct-authoring union. The public tuple contains exactly one transform;
multi-transform pipelines are rejected. Built-in value materializers each own
and normalize that single transform.

## `bindMarkData({ target, data })` {#bindmarkdata-target-data}

Use `bindMarkData` to move an existing independent mark to another materialized
dataset while preserving its encoding and visual configuration:

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

Create reusable aggregate rows without tying the calculation to a chart type:

```javascript
const totals = program.createSummaryData({
  id: "regionalTotals",
  source: "sales",
  groupBy: "region",
  aggregates: [
    { op: "sum", field: "sales", as: "total" },
    { op: "count", as: "records" }
  ],
  members: "sourceRows"
});
```

Groups follow first source appearance. `aggregates` accepts the shared
`AggregateOperation` vocabulary, including quantile and ordered first/last
objects. `count` counts rows and omits `field`; every other operation requires
one. Output aliases, group fields, and the optional `members` alias must be
distinct. The result contains concrete values and can be used immediately by
marks or `bindMarkData`.

An ungrouped empty input produces one aggregate row, so a row count is `0`.
A grouped empty input produces no observed groups. The action does not synthesize
unobserved categorical combinations.

Set `weight` to `{ field, kind: "frequency" | "reliability" }` for weighted
count, sum, mean, variance, standard deviation, standard error, median, q1/q3,
or quantile. Frequency weights act like virtual repeated rows without allocating
them; reliability weights use effective sample size for sample statistics. The
action validates every requested value and weight before grouping. Zero-weight
rows remain in the source but are omitted from statistical membership.

## `createBinData({ id, source?, field, ...binOptions })` {#createbindata-id-source-field-binoptions}

Materialize one-dimensional bin bounds and counts for reuse by ranged marks,
labels, or several charts:

```javascript
const bins = program.createBinData({
  id: "ageBins",
  source: "people",
  field: "age",
  boundaries: [0, 18, 35, 65, 100],
  members: true,
  as: { lower: "age0", upper: "age1", count: "people", members: "rows" }
});
```

Choose one of `maxBins`, `step`, or `boundaries`. The defaults are
`maxBins: 10`, `extent: "auto"`, `nice: true`, `zero: false`, and
`includeEmpty: true`. Bins include their lower endpoint and exclude the upper
endpoint, except that the final bin includes its upper endpoint. Explicit
extent or boundaries must contain every source value.

The normalized transform stores resolved boundaries, so consumers share the
same bin decisions. Set `includeEmpty: false` to omit zero-count bins and
`members: true` to retain each bin's original source rows.

`weight: { field, kind }` changes each count to weighted mass. Automatic extent
and members use positive-weight rows, while zero-weight rows are still validated.
Frequency weights require non-negative safe integers; reliability weights require
non-negative finite numbers.

## `createFoldData({ id, source?, fields, as? })` {#createfolddata-id-source-fields-as}

Turn selected fields in a wide dataset into reusable key/value rows:

```javascript
const long = program.createFoldData({
  id: "fruitLong",
  source: "fruitWide",
  fields: ["apples", "pears"],
  as: { key: "fruit", value: "amount" }
});
```

Output follows source row order and then the exact `fields` order. Every row
retains all source cells and adds the selected field name and value, so its
grain is `source row × selected field`. The default output names are `key` and
`value`.

Selected fields must contain one common primitive type: finite numbers,
strings, or booleans. Missing cells and mixed types are rejected. Output names
must be distinct and cannot overwrite a source field. The action accepts at
most 64 selected fields and materializes at most 10,000 rows.

## `createComputedData({ id, source?, as, expression })` {#createcomputeddata-id-source-as-expression}

Add a typed primitive or null field to every source row with a serializable formula:

```javascript
const shares = program.createComputedData({
  id: "shares",
  source: "sales",
  as: "share",
  expression: {
    op: "divide",
    left: { field: "part" },
    right: { field: "whole" }
  }
});
```

Leaves are `{ field }` and `{ constant }`; constants may be finite numbers,
strings, booleans, or null. The closed union includes arithmetic, comparison,
boolean logic, `if`, `coalesce`, `concat`, `log`, and `sqrt`. Conditional
and boolean nodes short-circuit value evaluation, while every branch and field
name is structurally checked first. The action stores this data AST as
provenance and never evaluates callbacks, source strings, or arbitrary code.

Arithmetic remains finite and strictly numeric. Other operations do not coerce
types. Undefined cells normalize to null, but a missing field name is an error.
Non-null results must have one primitive type across all rows. Expressions are
bounded to depth 16 and 128 nodes, with at most 10,000,000 row-nodes.

## `createNormalizedData({ id, source?, field, as, groupBy?, method, ... })` {#createnormalizeddata-id-source-field-as-groupby-method}

Materialize common row-preserving comparisons without manually joining group
statistics back to source rows:

```javascript
const indexed = program.createNormalizedData({
  id: "indexed",
  source: "sales",
  field: "revenue",
  as: "revenueIndex",
  groupBy: "region",
  method: "index",
  sortBy: [{ field: "year", order: "ascending" }]
});
```

`share`, `minmax`, and `zscore` summarize each group. Z-scores use population
variance by default and support `variance: "sample"`. `index`, `change`, and
`percentChange` use a finite explicit baseline or the first/last row from a
stable non-empty `sortBy`. Index values use 100 as the baseline; percent change
is a fraction, so a 50% increase produces `0.5`.

An exact zero denominator rejects by default. Use
`zeroDenominator: "null"` or `"zero"` to select an explicit replacement.
`change` accepts a zero baseline and therefore has no zero-denominator option.
Share rejects negative input. Every method preserves original row order and
keeps group calculations independent.

## `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })` {#createcompletedata-id-source-key-groupby-values-sequence-fill-members}

Materialize missing keys inside each observed group without silently turning
absence into zero:

```javascript
const completed = program.createCompleteData({
  id: "completeSales",
  source: "sales",
  groupBy: "region",
  key: "month",
  values: [1, 2, 3],
  fill: { amount: null },
  members: "sourceRows"
});
```

`values` and `sequence` are mutually exclusive. If both are omitted, the action
uses the key values observed anywhere in the source, preserving typed identity
and first appearance. A numeric sequence uses finite `start`, `end`, and
positive `step`. Only observed group tuples are completed; the action does not
form a Cartesian product of separate grouping fields.

Each group/key pair may have at most one source row. Existing keys outside an
explicit domain are errors. Original rows keep all cells. A synthesized row gets
the group and key values, then `fill` values or `null` for the other source fields.
When `members` is present, original rows contain their source index and synthetic
rows contain `[]`. Output follows group first appearance and key-domain order and
is capped at 10,000 rows before allocation.

## `createImputedData({ id, source?, fields, groupBy?, sortBy?, method, value?, edges?, maxGap? })` {#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap}

Replace explicit `null` or `undefined` cells without changing row grain or final
source order:

```javascript
const imputed = completed.createImputedData({
  id: "imputedSales",
  fields: "amount",
  groupBy: "region",
  sortBy: [{ field: "month" }],
  method: "linear",
  edges: "keep"
});
```

`constant` requires `value`. `forward` and `backward` copy the nearest available
anchor in the requested stable group order. `linear` requires one ascending
numeric or temporal-string sort field and finite numeric target values; it uses
actual position distance rather than row indexes. No method crosses a group
boundary.

`edges` defaults to `"keep"`; `"error"` rejects an eligible run with no required
anchor. `maxGap` is a positive row-count limit. A longer run stays missing and is
not converted into an edge error. `NaN` and infinities are invalid values rather
than missing cells.

## `createStackData({ id, source?, category, group, value, mode?, as? })` {#createstackdata-id-source-category-group-value-mode-as}

Materialize stack geometry once and reuse it across ranged marks and labels:

```javascript
const stacked = program.createStackData({
  id: "stackedSales",
  source: "sales",
  category: "quarter",
  group: "region",
  value: "sales",
  mode: "fill"
});
```

`stack`, `fill`, `center`, and `diverging` call the same shared stack math used
by Bar and Area series layout. Category and group order follow first source
appearance. Every category/group pair must have at most one row; missing cells
are not synthesized. Output preserves each source row and adds lower/upper
endpoints, the raw value, and its absolute-magnitude share in the category.

The default fields are `<value>_start`, `<value>_end`, `<value>_value`, and
`<value>_share`; use `as` to rename all four roles. Stack, fill, and center
require non-negative values. Diverging accumulates positive and negative values
separately from zero. Zero cells remain as zero-thickness rows with share 0.

## Editing derived data {#editing-derived-data}

Every standalone value-producing data action creates a logical dataset owner.
The owner ID remains stable while successful edits create immutable physical
revisions. Use the generic action when an editor must receive a complete
normalized transform definition:

```javascript
const revised = program.editDerivedData({
  target: "twice",
  definition: {
    type: "computed",
    as: "value2",
    expression: {
      op: "multiply",
      left: { field: "value" },
      right: { constant: 3 }
    }
  },
  dependents: "recompute"
});
```

`definition` contains only the requested public transform. It cannot contain a
dataset `id`, `source`, materialized `resolved` values, or a revision pointer.
The Complete transform may still use its own `values` domain because that field
is part of the transform rather than a dataset value envelope. Generic edits
replace the complete transform definition. Source replacement remains exclusive
to the compatibility-preserving `editBin2DData` API.

Focused editors accept partial transform changes and preserve every omitted
top-level decision:

| Transform family | Focused editor |
| --- | --- |
| computed | `editComputedData` |
| filter | `editFilteredData` |
| fold | `editFoldData` |
| summary | `editSummaryData` |
| one-dimensional bin | `editBinData` |
| time unit | `editTimeUnitData` |
| window | `editWindowData` |
| density | `editDensityData` |
| stack | `editStackData` |
| regression | `editRegressionData` |
| interval | `editIntervalData` |
| ECDF | `editECDFData` |
| normalize | `editNormalizedData` |
| complete | `editCompleteData` |
| impute | `editImputedData` |

Each focused action requires `target`. It accepts the stable logical owner ID or
the owner's current physical revision ID. An older physical revision is stale
and rejects. A dataset produced privately inside a chart facade is chart-owned
and must be changed through that chart's editor. `source` accepts either an
ordinary physical dataset ID or a logical owner ID; a logical source always
resolves to its current revision at call time.

`dependents` defaults to `"reject"`. An edit therefore fails atomically when a
derived dataset reads the target. Pass `dependents: "recompute"` to revise the
entire downstream closure in deterministic topological order. The editor first
builds and validates a speculative program. Only then does it record the same
revisions in the returned program, rebind all direct marks and known stored data
references, and release obsolete physical revisions in reverse topological
order. A cycle or an unsupported internal transform aborts the operation without
altering the input program.

Output names are tracked by semantic role. Renaming a role updates downstream
field references and visual encodings when the old name has one unambiguous
meaning. A rename rejects if the old output name is shared by several roles or
if a downstream expression contains a field reference that cannot be rewritten
safely. Mode changes clear fields owned by the previous mode before the new
definition is normalized. In focused weighted editors, `weight: false` removes
an existing weight; omission preserves it.

An edit must change the requested transform or source. A semantic no-op throws
before creating a revision. Successful revisions use deterministic IDs of the
form `<owner><Role>Revision<n>`. Earlier `ChartProgram` values remain unchanged.
The returned program keeps the previous current dataset unless it pointed at the
edited current revision, in which case it moves to the new revision.

The following chain demonstrates rejection by default, downstream replay, and
logical-source reuse:

```javascript
const before = chart()
  .createData({ id: "raw", values: [{ x: 1 }, { x: 2 }, { x: 3 }] })
  .createComputedData({
    id: "twice",
    source: "raw",
    as: "scaled",
    expression: {
      op: "multiply",
      left: { field: "x" },
      right: { constant: 2 }
    }
  })
  .createSummaryData({
    id: "average",
    source: "twice",
    aggregates: [{ op: "mean", field: "scaled", as: "mean" }]
  });

// Expected failure: an existing descendant requires an explicit replay policy.
try {
  before.editComputedData({ target: "twice", expression: {
    op: "multiply", left: { field: "x" }, right: { constant: 3 }
  } });
} catch (error) {
  console.log(error.message);
}

const after = before.editComputedData({
  target: "twice",
  expression: {
    op: "multiply",
    left: { field: "x" },
    right: { constant: 3 }
  },
  dependents: "recompute"
});

// before still has mean 4; after has mean 6.
// A later source: "twice" resolves to the new current revision in after.
```

## `removeData({ id })` {#removedata-id}

Full programs can delete one named dataset after its final live consumer has
been removed:

```javascript
const cleaned = program
  .removeMark({ target: "temporaryPoints" })
  .removeData({ id: "temporaryRows" });
```

The ID is always explicit. `removeData` does not infer the current dataset and
does not support batches, cascading deletion, or `force`. It rejects a dataset
still used by a mark, another derived dataset, a retained facet recipe, or a
chart-owned statistical resource. The error lists each owner and its exact
reference path, so callers can remove or rebind those consumers first.

A current-data pointer alone does not keep a dataset alive. Successful removal
clears that pointer without selecting a replacement. Historical action traces
also do not keep resources alive. A standalone logical transform can be removed
by its logical ID after its final consumer is gone; its current revision and
owner record are deleted together while its upstream source remains.

Removal changes no graphics, domains, layout, or composition children. It is
available from `ggaction` and absent from `ggaction/basic`. Concat parents do not
offer cross-child removal; call the action in the program that owns the resource.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)
