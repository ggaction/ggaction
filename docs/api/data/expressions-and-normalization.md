---
layout: default
title: Expressions and Normalization
---

# Expressions and Normalization

{% include chart-example.html id="regression" lead=true %}

[Family overview](./source-and-derived.md) · [Exact action lookup](./../../reference/actions.md)

## `createComputedData({ id, source?, as, expression })` {#createcomputeddata-id-source-as-expression}

Add a scalar field to every source row with a serializable formula. Full and Basic
support both existing v1 expressions and [explicit v2 expressions](#version-2-expressions).
The following legacy syntax and rules describe v1:

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
boolean logic, `if`, `coalesce`, `concat`, `log`, `sqrt`, `floor`, `datePart`, `toNumber`, `getPath`, and `replaceLiteral`. Conditional
and boolean nodes short-circuit value evaluation, while every branch and field
name is structurally checked first. The action stores this data AST as
provenance and never evaluates callbacks, source strings, or arbitrary code.
Expression nodes and arrays must contain only enumerable own data properties;
getters, setters, symbol keys, hidden properties and sparse operand arrays reject
before evaluation. Argument trace summaries do not invoke getters.

Use `{ op: "toNumber", operand: { field: "amountText" } }` to explicitly convert a decimal or scientific-notation string into a finite number in a new derived field. Surrounding whitespace is trimmed. Empty strings, null, booleans, hexadecimal text and non-finite results reject. Finite numeric inputs remain unchanged.

Use `{ op: "floor", operand: { field: "measurement" } }` to round a finite
number down: `1.8` becomes `1`, and `-1.8` becomes `-2`. Strings require an
explicit `toNumber`; null and nonnumeric operands reject. Compose floor with
division and multiplication to derive interval bounds while retaining each row.

Use `{ op: "datePart", part: "year", operand: { op: "parseTime", operand: { field: "dateText" } } }`
to extract an integer calendar year. The only supported part is `"year"`.
The default time zone is UTC; optional `timeZone` accepts a named IANA time zone,
such as `"America/New_York"`. The operation consumes epoch milliseconds;
parse strings explicitly rather than treating numeric years as timestamps.
Null propagates; other nonnumeric or nonfinite inputs reject. Timestamps must
lie within ±8,640,000,000,000,000 milliseconds, and fractional milliseconds follow
Date's integer truncation. Years zero and before the common era retain their
astronomical numbering. Subtract extracted years to obtain calendar-year
duration, independently of elapsed days or leap years. For example, 1986-12-30
to 2024-07-17 yields `38`. Replacing the expression without `timeZone` resets UTC.

Use `{ op: "parseTime", operand: { field: "dateText" }, format: "%d/%m/%Y" }`
for an explicit day/month/year date. The closed formats are `%Y-%m-%d`,
`%d/%m/%Y`, `%m/%d/%Y`, and `auto` (the default, reusing ordinary temporal
normalization). Explicit calendar formats produce UTC millisecond timestamps;
invalid calendar dates, unparseable input, and nullish values produce `null`.
Preserve the raw field and apply an existing filter or missing-data policy to
these nulls before assigning a position. This typed node accepts no arbitrary
format expression or callback.

Use `{ op: "getPath", operand: { field: "item" }, path: ["nested", "value"] }`
to extract a scalar from nested plain records. The operand is exactly one literal
root-field reference; the path has 1–8 nonempty string keys. Keys containing dots
remain literal. Traversal reads only own data properties, never getters, arrays,
prototypes, callbacks or dynamic expressions. Missing properties and nullish
intermediates produce `null`; present non-record intermediates, non-scalar leaves
and nonfinite numbers reject. A root absent from the entire dataset rejects;
a known root missing in some rows yields `null`. Reserved path keys
`__proto__`, `prototype`, and `constructor` reject. Ordinary `{ field: "item.value" }`
still names one literal top-level field.

Use `{ op: "replaceLiteral", operand: { field: "amountText" }, search: "%", replacement: "" }`
to remove the first exact, case-sensitive `%`. Both search and replacement are
literal strings; search must be nonempty. No match preserves the input. Dollar
characters such as `$&`, `$1`, and `$$` remain literal replacement text. The
operand must evaluate to a string; null, numbers, booleans and structured values
reject without coercion. Compose with `toNumber` and arithmetic for percent
values. Regular expressions, flags and dynamic search/replacement are unsupported.

Arithmetic remains finite and strictly numeric. Other operations do not coerce
types. Undefined scalar cells normalize to null; ordinary field references still reject missing row keys. The explicit `getPath` missing-root policy above applies only to that operation.
Non-null results must have one primitive type across all rows. Expressions are
bounded to depth 16 and 128 nodes, with at most 10,000,000 row-nodes.

## Version 2 expressions

Choose `expression: { version: 2, registry: "standard@1", root }` explicitly.
The existing v1 syntax retains its results, limits, and errors. Version 2 uses
eight node kinds:

| Node | Shape |
| --- | --- |
| Literal | `{ type: "literal", value }` |
| Literal field name | `{ type: "field", name }` |
| Nested field | `{ type: "fieldPath", root, path }` |
| Named scalar input | `{ type: "parameter", id }` |
| Unary operation | `{ type: "unary", op, operand }` |
| Binary operation | `{ type: "binary", op, left, right }` |
| Conditional | `{ type: "if", condition, then, else }` |
| Registry function | `{ type: "call", name, args, options? }` |

Unary operations are `negate` and `not`. Binary operations are `add`, `subtract`,
`multiply`, `divide`, `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `and`, and `or`.
The closed function registry covers numeric, string, array, and calendar
operations. Use [getExpressionFunctions](../../inspection.md#expression-functions)
to inspect names, argument limits, input/output types, and option families.
Trigonometric calls require `options.angleUnit` (`radians` or `degrees`).
`parseTime` requires an explicit `format` (`%Y-%m-%d`, `%d/%m/%Y`, `%m/%d/%Y`,
or `iso-offset`). `datePart` requires `part` and `timeZone`; `timeFloor` requires
`unit` and `timeZone`, plus `weekStartsOn` from 0 (Sunday) to 6 for a week.

Every branch is validated before evaluation, including inactive references and
known field types. `if`, `and`, `or`, and `coalesce` evaluate only their selected
values. Conditions require booleans. A field name containing dots remains one
literal column name; `fieldPath` traverses up to eight own record keys and
produces missing when an optional path is absent.

Missing (`undefined`) and `null` remain distinct. Nullish arithmetic and numeric
domain failures produce missing; nullish comparisons return false. Invalid operand
types still reject the complete action. Computed outputs must have one scalar
type among non-null, non-missing values. Materialization reports include evaluated
and missing row counts plus numeric/domain/bounds diagnostics; read them through
[program inspection](../../inspection.md). No invalid source row is silently removed.

Version 2 limits depth to 64, nodes to 4,096, arguments per call to 64, and
row-node work to 10,000,000. Strings have at most 1,048,576 UTF-16 units,
arrays at most 100,000 elements, and cumulative value work at most 10,000,000.
Callback functions, source strings, regular expressions, custom registries,
getters, and executable objects are unsupported.

## Parameters

`createParameter({ id, value, type?, nullable? })` creates a named scalar input.
The ID is required. Type is inferred from a non-null number, string, or boolean;
numbers must be finite. The default `nullable` is false. To start at null, supply
both the intended `type` and `nullable: true`. Zero, negative zero, false, and
an empty string remain valid values. Undefined, objects, arrays, and Date values
are invalid; convert dates to epoch milliseconds explicitly when needed.

This complete ES module creates a computed column, then updates its parameter:

<!-- snippet-context:start -->

> **Executable complete.** Run this standalone ES module; all data and imports are included. Both immutable programs own a Canvas and materialized point chart.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const original = chart().createCanvas()
  .createData({ id: "sales", values: [{ amount: 10 }, { amount: 20 }] })
  .createParameter({ id: "factor", value: 2 })
  .createComputedData({
    id: "adjusted", as: "adjustedAmount",
    expression: {
      version: 2, registry: "standard@1",
      root: {
        type: "binary", op: "multiply",
        left: { type: "field", name: "amount" },
        right: { type: "parameter", id: "factor" }
      }
    }
  })
  .createScatterPlot({ id: "points", data: "adjusted", x: "amount", y: "adjustedAmount" });
const updated = original.editParameter({ target: "factor", value: 3 });
console.log(original.semanticSpec.datasets.at(-1).values.map(row => row.adjustedAmount)); // [20, 40]
console.log(updated.semanticSpec.datasets.at(-1).values.map(row => row.adjustedAmount)); // [30, 60]
```

`editParameter({ target, value })` preserves the parameter's type and nullability.
An edit has a total work limit of 10,000,000 input row operations across its
dependent transforms; computed transforms count one operation per AST node per
input row. The count uses the new rows after filtering. Exceeding the limit rejects
the edit and preserves the earlier program.
It revises all dependent datasets and chart consumers atomically, including shared
lookup dependencies, scales, guides, and highlights. Unrelated branches stay shared.
An unchanged value preserves revisions; negative zero and zero are distinct edits.
A failed computation or consumer validation leaves the original program unchanged.

If a parameter is used by a live data source URL, a changed value requires
[`prepareDataUpdate` and `applyDataUpdate`](./source-and-derived.md#prepared-data-updates).
A direct changed-value `editParameter` reports `prepared-data-required`.
An unchanged value still needs no loading or revision. The prepared path updates
all affected source tables and computed consumers together.

`removeParameter({ id })` requires an existing, unreferenced parameter. Remove or
rewrite every consuming expression first; retained datasets also count as references.
Deletion has no cascade or force mode. Creation and v2 computed creation are available
in Full and Basic; parameter editing and removal require Full.

Parameters belong to one unit. Use an explicit `childPath` when editing a concat
child. Facet and repeated-chart parent edits update their retained source and
rebuild the dependent children. [Editable snapshots](../../data-updates.md#save-and-restore-snapshots)
preserve the parameter values and exact revisions without rerunning expressions
when restored. Earlier runtimes reject snapshots containing unsupported parameter
or expression versions.

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
