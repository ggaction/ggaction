---
layout: default
title: Data Revisions and Removal
---

# Data Revisions and Removal

{% include chart-example.html id="scatterplot" lead=true %}

[Family overview](./source-and-derived.md) · [Exact action lookup](./../../reference/actions.md)

## Editing derived data {#editing-derived-data}

Every standalone value-producing data action creates a logical dataset owner.
The owner ID remains stable while successful edits create immutable physical
revisions. Use the generic action when an editor must receive a complete
normalized transform definition:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "twice"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
| sort | `editSortedData` |
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
and must be changed through that chart's editor. At creation time, `source` accepts either an
ordinary physical dataset ID or a logical owner ID; a logical source always
resolves to its current revision at call time. Focused editors do not accept a
new `source` (except the separately documented `editBin2DData` compatibility API).
To replace source rows, create a new source and rebuild its derivation, then
use `bindMarkData` for eligible independent marks.

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

## `editSortedData({ target, sortBy, dependents? })` {#edit-sorted-data}

Replace the complete sort-key list for an existing sorted-data owner. Omitted
keys are not merged because their precedence is part of the ordering meaning.
The edit creates a new immutable physical revision, preserves the logical owner,
and follows the same stable comparison and null-placement rules as
`createSortedData`. Use `dependents: "recompute"` when downstream derived data
must advance with the new row order.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `ordered`. Resource selectors used here: `target: "orderedSales"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const descending = ordered.editSortedData({
  target: "orderedSales",
  sortBy: [{ field: "revenue", fieldType: "quantitative", order: "descending" }]
});
```

An edit must change the requested transform or source. A semantic no-op throws
before creating a revision. Successful revisions use deterministic IDs of the
form `<owner><Role>Revision<n>`. Earlier `ChartProgram` values remain unchanged.
The returned program keeps the previous current dataset unless it pointed at the
edited current revision, in which case it moves to the new revision.

The following chain demonstrates rejection by default, downstream replay, and
logical-source reuse:

<!-- snippet-context:start -->

> **expected-error.** Use an ES module with the imports, data, and prepared resource state described in this section. Resource selectors used here: `source: "raw"`; `source: "twice"`; `target: "twice"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resource selectors used here: `target: "temporaryPoints"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
