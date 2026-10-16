# Bounded paths with up to 20,000 commands

## Status

- [x] Reproduce the current boundary through ordinary public line actions
- [x] Preserve the actual 12,070-vertex source/data/compiled/output proof
- [x] Define the exact limit, compatibility and verification scope
- [x] Explicit user approval
- [x] Implementation and full consumer verification

Gate: **approved**. User approval recorded before implementation in `APPROVAL.json`. The root `AGENTS.md` requires explicit approval for this material change to public bounded-resource behavior. No runtime, declaration or persisted-schema implementation is included. Independent chart translation continues; only the affected source waits. Publication, deployment and PR creation are outside this Gate.

## Problem and proposed behavior

An ordinary continuous line with 12,070 finite ordered observations is valid input, but `createLinePlot` fails with `Curve path command count must not exceed 10000.` All observations contribute to the original continuous path. Decimation would remove source data; separate disconnected layers would remove connecting edges or require artificial duplicated endpoints.

Raise the **per-path command limit from 10,000 to 20,000**, inclusive. Retain a finite closed bound; 20,001 commands still reject atomically. Introduce one internal owner for this path-specific bound and use it consistently for:

1. Generic concrete `path.commands` validation, including persistence and extension-produced paths.
2. Linear path construction, including an optional closing `Z`.
3. All existing line interpolation builders.
4. Area paths, counting both boundaries, the connecting segment and the final closing command together.

Do **not** raise the unrelated `MAX_GENERATED_ITEMS` default or its consumers. Dataset, fold, tick, symbol and other generated-item bounds retain their current behavior. Existing row-by-operation work limits remain unchanged. There is no configurable bypass and no new user-facing action option.

## Public example

```js
const rows = Array.from({length: 12070}, (_, index) => ({
  x: index,
  y: Math.sin(index / 100)
}));

const program = chart()
  .createCanvas({width: 440, height: 340,
    margin: {left: 20, top: 20, right: 20, bottom: 20}})
  .createData({values: rows})
  .createLinePlot({x: 'x', y: 'y', guides: false});
```

The result is one semantic line and one fully materialized continuous path with exactly 12,070 commands. The input and previous immutable program remain unchanged. Renderers continue reading only the materialized graphical specification.

## Counting and compatibility

Count **generated commands**, not observations. Current formulas remain exact: linear and most smooth curves use one command per observation, basis can add two commands, step uses `3n - 2`, step-before/after use `2n - 1`, and areas count both boundaries plus closure. Check the final concrete command count as well as builder preflight. Extreme-coordinate finite fallback must obey the same final bound.

All programs previously accepted remain valid with identical semantics, concrete geometry and output. Programs between the former and new limits become accepted. Programs above 20,000 remain rejected before partial state is exposed. The persisted node shape does not change; loaders must apply the same new ceiling as construction. This is an unreleased revision; older runtimes may continue rejecting larger stored paths.

The larger bound permits at most twice the previous per-path storage and processing. It is deliberately bounded and does not promise arbitrary-size charts or relax independent total-work limits.

## Required implementation evidence

- Exact boundary tests for 10,000, 10,001, 12,070, 20,000 and 20,001 commands through ordinary public line creation, concrete path validation and persistence.
- Every existing interpolation; expansion-sensitive step and basis boundaries; area paths with combined boundaries and closure; oriented paths and finite-coordinate fallback.
- Invalid commands, nonfinite values and unknown properties remain rejected. Verify failure atomicity and caller/previous-program immutability.
- Verify encoding changes, dataset edits, faceting, materialization refresh, Full/Basic programs and SVG/Canvas consumers. Applicable independent resource/work limits must still reject at their unchanged boundaries.
- Verify the complete actual source path after integration: 12,070 original raw rows, 12,070 ordered painted vertices, 12,069 connecting segments, source scale domains and paint. No sampling, disconnected partition or host-authored chart-code repair.
- Synchronize owning current contracts, public documentation/generated cards and installed-package consumer checks. Run focused tests, full unit/contracts/docs and package-consumer verification.

There is no new visual primitive or renderer design. `reproduce.mjs` and `rejection-evidence.json` are generic source-neutral evidence. `source-evidence.json` binds the actual affected input and full-row proof without embedding or rewriting its raw rows.

## Implementation checkpoint

Implemented within the approved scope; see [shared verification](../computed-and-path-verification.md). Stable runtime integration and dependent chart retranslation remain coordinated separately.
