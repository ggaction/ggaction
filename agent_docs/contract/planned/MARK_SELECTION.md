# Planned Mark Selection contracts

These contracts are accepted Phase 9 work. They are not current public behavior.
The implemented cross-mark selection grammar and point highlight facade are owned by
[`../current/MARK_SELECTION.md`](../current/MARK_SELECTION.md).

## `filterMarks`

```typescript
filterMarks(options: { target?: UserId } & MarkSelector): ChartProgram;
```

- This replaces and removes the current singular `filterMark`; no compatibility alias remains after migration.
- Target resolution is explicit target, current eligible mark, unique eligible mark, then error. The normalized
  selector is persisted as semantic mark-item filtering intent and unmatched items are omitted at the target's
  native visual grain.
- For row-grain points the result remains equivalent to the current immutable derived-data rebind. Aggregate bars
  and series paths filter final semantic items rather than raw pixels. Downstream consumers use the target's active
  member rows only when they explicitly derive from that filtered mark.
- The action rematerializes the target, affected scales and existing guides through an ordered deduplicated plan.
  Source datasets, unrelated marks and earlier programs remain unchanged.

### Coverage plan — `filterMarks`

- Migrate all current membership/comparison/range, target inference, rebind, rematerialization and regression tests.
- Add `min | max`, `count`, grouping/ties, channel selection and point/bar/line item-grain coverage.
- Assert `filterMark` is absent from runtime, declarations, contracts, docs, examples and displayed call chains.

## Cross-mark highlight recipes

Point and bar highlighting are implemented. Line, area and rule recipes remain Planned extensions of the same current
`highlightMarks` action. They will reuse the current selector identity and assignment lifecycle, while validating
appearance by mark capability:

- area: accent fill and optional complement dimming;
- line/rule: accent stroke, width/dash and series/line front order;
- logical offset support for rect, line and path geometry;
- stable reapplication after each owning mark rematerializer runs.

Representative primitive/public pixel pairs remain Gate B for the tallest complete histogram stack and Gate C for one line
series. Area and rule receive focused concrete-property and rematerialization evidence.
