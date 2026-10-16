# Explicit literal replacement in computed data

## Status and scope

- [x] Reproduce rejection by existing numeric conversion and the proposed operation
- [x] Preserve actual source/data/compiled/SVG hashes and string-value facts
- [x] Specify the public expression, errors, persistence and verification scope
- [x] Explicit user approval
- [ ] Implementation and full consumer verification

Gate: **approved**. User approval recorded before implementation in `APPROVAL.json`. Root `AGENTS.md` requires explicit approval for this new public expression and persisted node shape. Independent chart translation continues. Package publication, documentation deployment and PR creation are outside this Gate.

## Required behavior

The raw string `"1.15%"` must lose its first literal `%`, be explicitly converted to a number, and be divided by100 to produce `0.0115`. Existing `toNumber` accepts finite decimal strings and correctly rejects the percent suffix. The closed computed-expression grammar has no string replacement. Rewriting raw rows on the host or deriving an estimate from a different price field would lose the original calculation's meaning.

`source-evidence.json` binds all1,988 raw `Change` values, the actual1,979 painted points, original transforms and input-file hashes. The goal is to express the actual percent removal and range filter with public domain actions.

## Proposed public expression

Add exactly one operation, **`replaceLiteral`**, to the existing `createComputedData` expression union:

```js
program.createComputedData({
  id: 'changes',
  as: 'change',
  expression: {
    op: 'divide',
    left: {
      op: 'toNumber',
      operand: {
        op: 'replaceLiteral',
        operand: {field: 'Change'},
        search: '%',
        replacement: ''
      }
    },
    right: {constant: 100}
  }
});
```

The action has three top-level options: `id/as/expression`. `operand` is an existing expression whose evaluated value must be a string. `search` is a nonempty literal string; `replacement` is a literal string and may be empty. Regular expressions, flags, callbacks and dynamic search/replacement expressions are unsupported.

### Exact result and error policy

- Replace **only the first exact, case-sensitive substring occurrence**. If no match exists, return the original string.
- `$&`, `$1`, `$$` and similar characters are ordinary literal text, without replacement-template expansion.
- Empty search strings, nonstring search/replacement values and unknown node keys fail atomically during structural expression validation.
- An evaluated operand that is null/undefined/a number/boolean/array/object is an explicit error. Do not add implicit string conversion or missing-to-empty coercion. Existing lazy `if` can express a missing-value policy explicitly.
- Preserve the existing maximum depth16, node count128 and row×node work limit. Add no regular-expression engine, locale-dependent behavior or raw-data rewriting path.

## Ownership and compatibility

The computed grammar owns validation, field-dependency collection and evaluation. Existing data actions preserve immutable raw datasets and append ordinary derived rows with their original expression provenance. Renderers remain unchanged. Existing `toNumber` and every other expression retain their meanings. This does not add implicit percent-number parsing or a general string utility library.

## Required implementation evidence

1. Percent removal→`toNumber`→division, no match, first occurrence only, beginning/middle/end, empty replacement, Unicode, regular-expression metacharacters and dollar replacement characters remain literal.
2. Invalid keys/types/empty search/unknown fields and nonstring evaluated operands reject. Verify lazy `if`, structural preflight, existing expression limits and failure atomicity.
3. Caller expressions, raw rows and previous programs remain immutable. Verify exact dependencies, persistence round-trip and derived-data rematerialization after edits.
4. Verify an ordinary public computed→filter→scatter flow. All1,988 raw rows and1,987 rows after the source range filter remain accounted for. Eight retained `Volume: "#VALUE!"` rows do not paint under existing explicit missing-value handling, yielding the original1,979 painted points. After approval, chart code is model-authored; this proposal contains no host-authored translation.
5. Synchronize the closed types, current data contract, official expression documentation, action cards/generated references and installed-package consumer. Run focused tests, full unit/contracts/docs and installed-consumer checks.

There is no new visual primitive or renderer behavior. Only the dependent source family waits for approval; independent chart work continues.
