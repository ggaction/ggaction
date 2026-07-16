# Planned scale contracts

No accepted scale capability remains in the Planned inventory. Roadmap 2 Phase 10 promoted the complete current
type vocabulary, atomic type-edit contract, transformed mark consumers, and point-item `unknown` mapping policy to
[`../current/CORE.md`](../current/CORE.md#createscale) and
[`../current/ENCODINGS.md`](../current/ENCODINGS.md#shared-scale-option-contract).

## Maybe Future scale types

```typescript
type MaybeFutureScaleType = "identity" | "bin-ordinal";
```

- `identity` would bypass normal mapping and therefore needs a concrete channel-validation and guide contract before
  it can become Proposed.
- `bin-ordinal` overlaps the current histogram bin owner and has no independent accepted use case.
- Status: Maybe Future, NOT IMPLEMENTED. These values are not accepted Planned work and must not appear in public
  types, runtime validation, or public documentation.
