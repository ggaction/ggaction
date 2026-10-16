# Finite numeric floor in computed data

## Gate and scope

Gate: **ready-for-review**. Proposal only; implementation requires explicit user approval under root `AGENTS.md`. No runtime, public type, persisted schema or generated documentation is changed. Independent translation continues.

- [x] Reproduce rejection through the existing public computed action
- [x] Prove all 20,000 original interval endpoints from 5,000 records
- [x] Specify exact public expression, validation and lifecycle behavior
- [ ] Explicit user approval
- [ ] Implementation and complete consumer verification

## Required behavior

A source assigns each original observation to a fixed-width interval while retaining all original observations and their individual paint. The existing bin-data action aggregates observations, so it cannot preserve this source's 5,000 independently painted rectangles. The closed computed grammar supports division and multiplication but cannot round down to the required interval boundary.

For a positive width `w` and zero origin, the lower endpoint is `floor(value / w) * w` and the upper endpoint is `lower + w`. The bound source uses widths 5 and 1,000 on its two axes. Independent comparison against every original compiled interval proves all 20,000 endpoints exactly, with no rounding error or rewritten raw records. This proves the necessary data calculation; final chart geometry and paint still require the ordinary verification.

## Proposed public expression

Add one numeric unary node to the existing `createComputedData` expression union:

```js
program.createComputedData({
  id: 'lower',
  as: 'lower',
  expression: {
    op: 'multiply',
    left: {
      op: 'floor',
      operand: {
        op: 'divide',
        left: {field: 'measurement'},
        right: {constant: 5}
      }
    },
    right: {constant: 5}
  }
});
```

The action retains three top-level options. The new node has exactly `op` and `operand`; the operand is an existing computed expression. No new action, callback, arbitrary JavaScript, automatic bin-data aggregation, or chart-specific classification table is introduced.

### Exact result and validation

- Evaluate the operand using the existing numeric-unary policy: its value must be a finite number. Strings require explicit `toNumber`; null, missing fields, booleans, arrays and objects remain errors. Existing lazy `if` can specify missing-value behavior explicitly.
- Return the greatest integer less than or equal to the input, using native `Math.floor` semantics. Thus `1.8 → 1`, `-1.8 → -2`, `-0.2 → -1`, and integral finite values remain unchanged. This is floor, not truncation toward zero.
- Preserve in-memory signed zero exactly as `Math.floor(-0)` does. JSON serialization retains the repository's existing numeric behavior; this proposal does not create a new signed-zero wire representation or modify persistence for other operations.
- Reject missing operands, unknown node keys and invalid node shapes during structural preflight. Reject nonnumeric or nonfinite evaluated values with the existing row-indexed numeric diagnostic policy. Every successful result must be finite.
- Keep the current depth 16, node 128 and row-by-node work limits. No `ceil`, `round`, remainder operation, general math library or implicit numeric conversion is included.

## Ownership and compatibility

The computed grammar owns node validation, dependency collection, normalization and evaluation. Existing data actions append immutable derived rows and explicitly rematerialize affected consumers. Previous programs, caller inputs and raw datasets remain immutable; renderers remain unchanged. The serialized node is an ordinary closed computed expression and must survive supported save/load and derived-data edits. Existing numeric operations retain their behavior.

## Required implementation evidence

1. Positive and negative fractions, exact integers, both signed zeros, subnormal values and large finite magnitudes; verify against `Math.floor`.
2. Nested division/multiplication, explicit `toNumber`, null/missing/invalid operand rejection, lazy `if`, dependency checks, unknown keys and expression limits.
3. Caller/program/raw immutability, atomic rejection, editing and rematerialization, Full/Basic consumers where computed data is supported, and persistence round-trips under existing numeric serialization semantics.
4. A source-neutral public example that preserves independent rows and derives two interval endpoints. Re-run the bound source's 5,000-row/20,000-endpoint proof without aggregation, row invention or raw rewriting; GLM authors the eventual translation.
5. Synchronize the public expression union, current data contract, official documentation, action cards/API schemas, machine references and MCP validation. Run focused tests, full unit/contracts/docs, and installed-package consumer checks.

Only the dependent chart waits for this Gate. Package publishing, documentation deployment and PR creation remain separately protected operations.
