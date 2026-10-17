# Bounded summary output with up to 30,000 groups

## Status

- [x] Reproduce the existing public 10,000-group boundary
- [x] Bind three actual complete source datasets and settled group counts
- [x] Specify the exact proposed capacity, compatibility and independent limits
- [ ] Explicit user approval
- [ ] Implementation and full consumer verification

Gate: **ready-for-review**. This package is a proposal, not an implementation or approval. The repository root requires explicit approval for a material change to public bounded-resource behavior. No runtime, declaration, schema, installed package or active translation pin changes are included. Only the affected candidates wait; independent work continues. No issue publication, PR, release or deployment is authorized by this checkpoint.

## Problem and decision

An existing `createSummaryData` mean operation rejects more than 10,000 distinct groups, even when every input row and group is valid. Three complete calendar datasets each contain 26,265 observations and produce 19,194, 10,968 and 25,909 settled groups. The public operation rejects all three with `Summary output cannot exceed 10000 groups.` Import, temporal normalization and numeric typing succeed before this independent output guard.

Raise only the summary output-group ceiling from **10,000 to 30,000 inclusive**. A 30,001-group result must still fail atomically. Keep one closed internal owner for this bound and apply it consistently wherever the existing summary transform is materialized or replayed. Do not introduce a configurable bypass or a new public action/option.

The number of groups is the number of actual distinct typed scalar grouping keys, not input observations, requested ticks, path commands or mark items. Preserve existing scalar identity, grouping order, aggregate arithmetic, missing/empty policies, weighted statistics and optional member rows exactly. Do not replace means with rounded values, split one summary into artificial datasets or silently omit groups.

## Executable public reproduction

Run `node agent_docs/impl/bounded-summary-output/reproduce.mjs`. It exercises 10,000, 10,001, 30,000 and 30,001 groups using only existing `chart().createData(...).createSummaryData(...)`, verifies every accepted output, and checks unchanged caller input and immutable parent after each accepted or rejected call. On the current runtime, only 10,000 succeeds. The suggested new behavior is acceptance through 30,000 with 30,001 still rejected.

```js
import {chart} from 'ggaction';
const values = Array.from({length: 10001}, (_, index) =>
  ({group: index, value: index % 17}));
chart().createData({values}).createSummaryData({
  id: 'means', groupBy: ['group'],
  aggregates: [{op: 'mean', field: 'value', as: 'mean'}]
});
```

The synthetic array is a standalone capacity reproduction, not a chart-authoring recipe or substitute for original data.

## Separate limits and scope

Issue [#207](https://github.com/ggaction/ggaction/issues/207) concerns the 10,000 generated-point graphics ceiling; it does not cover summary rows. The existing per-path limit proposal explicitly leaves dataset/summary and generated-item limits unchanged. This decision therefore needs its own explicit approval.

All other input/output/work, generated graphic-item, fold, completion, tick, command and path limits remain unchanged. In particular, the third calendar source would still exceed the independent 20,000-command path ceiling with its 25,909 unsplit linear vertices. Summary support alone does not make that whole chart supported or completed. The first two have 19,194 and 10,968 linear vertices and remain within the current path ceiling. Source/native mean algorithm differences still require exact independent per-source estimator proof; raising capacity does not waive arithmetic or geometry checks.

## Compatibility and lifecycle

All previously accepted programs must retain identical `semanticSpec`, fully materialized `graphicSpec`, action trace and rendered output. This changes the accepted capacity range only. Existing immutable data and caller-owned input must never mutate. No persisted node shape changes: persistence validation and downstream replay must apply the same new summary bound; older runtimes may reject a larger saved result. The Basic/Full surface, data revisions, dependent transforms, facets and refresh paths must use the same owner and must still enforce all unrelated bounds.

The increase permits at most three times the previous summary output-group count. It does not promise arbitrary total work, arbitrary input rows or rendering 30,000 symbols. Large statistical/member outputs remain constrained by their existing independent checks.

## Required implementation evidence after approval

1. Exact group boundaries 9,999/10,000/10,001/29,999/30,000/30,001; one input row per group and multiple observations per group; all existing supported aggregates and typed/multi-field keys.
2. Native arithmetic and row order unchanged for means, weighted statistics, counts, missing/empty policies and optional members; nonfinite values, invalid fields and invalid options still reject.
3. Parent and input immutability on acceptance and rejection, including a failure during a dependent revision; no partially exposed materialized result.
4. Persistence/import, data revision, dependent summaries/windows/marks, facets, refresh, Full/Basic and installed-package consumers. Keep all unrelated resource/work-limit tests unchanged.
5. Complete actual 26,265-row source memberships and exact source/native means independently reconstructed for the first two sources; original typed rows, group order, coordinates and all guides checked normally. Preserve the third source's separate path hold.
6. Synchronize the owning current contract, public data documentation, generated cards/metadata and package consumer evidence. Run focused tests, full unit/contracts/docs and installed-consumer checks. No new schema option or automatic sampling.

`source-evidence.json` retains immutable source/data/settled-browser/probe hashes without embedding or rewriting observations. `rejection-evidence.json` is the actual source-neutral public reproduction output. No model requests or chart-pixel inspection were used.
