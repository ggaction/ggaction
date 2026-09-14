---
layout: default
title: Expressions and Normalization
---

# Expressions and Normalization

{% include chart-example.html id="regression" lead=true %}

[Family overview](./source-and-derived.md) · [Exact action lookup](./../../reference/actions.md)

## `createComputedData({ id, source?, as, expression })` {#createcomputeddata-id-source-as-expression}

Add a typed primitive or null field to every source row with a serializable formula:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `source: "sales"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `source: "sales"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
