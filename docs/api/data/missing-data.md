---
layout: default
title: Missing Keys and Values
---

# Missing Keys and Values

{% include chart-example.html id="repair-missing-observations" lead=true %}

[Family overview](./source-and-derived.md) · [Exact action lookup](./../../reference/actions.md)

## `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, fill?, members? })` {#createcompletedata-id-source-key-groupby-values-sequence-fill-members}

Materialize missing keys inside each observed group without silently turning
absence into zero:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `source: "sales"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `completed`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
