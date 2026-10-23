## Problem

Automatic linear axis ticks currently select the next larger step from the existing factor set. For domain `[0, 140]` and `count: 5`, this yields `[0, 30, 60, 90, 120]`. A nearest-step density policy instead needs `[0, 20, 40, 60, 80, 100, 120, 140]`.

This matters for independently scaled facets. A six-panel example has domains `[0,140]`, `[0,110]`, `[0,180]`, `[0,110]`, `[0,140]`, `[0,120]`; its target tick steps are `20,20,50,20,20,20`. There is no uniform existing count from 1 through the 10,000-item limit that reproduces all six panels. Explicit tick arrays work for one unit chart but cannot express this automatic policy in a single canonical facet source. Facet children intentionally cannot be replaced independently.

## Proposed opt-in contract

Extend Cartesian axis tick selection with `rounding: "nearest" | "ceiling"` through complete axes, grouped ticks-and-labels, and focused tick/label actions. Omission preserves existing behavior and output. `"nearest"` chooses 1/2/5/10 decade steps at geometric midpoints; `"ceiling"` restores the current policy. `count` remains an approximate density, not an exact number of ticks.

```js
program.createYAxis({
  title: false,
  ticksAndLabels: { count: 5, rounding: "nearest" }
});
```

The policy applies only to automatic count-mode linear Cartesian axes. Explicit `values`, temporal/transformed/discrete axes and Polar/Parallel axes must not silently accept it. Inferred grids must reuse their axis owner's policy. Tick/label edits, named axes, facet replay, scale/data/Canvas updates, Basic/Full, persistence and package types need matching coverage.

## Verification and release

Prepare an explicit primitive/public target before implementing the option. Preserve existing defaults and numerical tolerances; verify literal tick values, geometry, malformed input atomicity, immutable replay, decoded PNG, browser/package consumers and documentation. The in-scope design is covered by the user's standing approval. This issue is independent of count-based domain rounding in #255. Development candidates remain unreleased until the next coordinated 200-family checkpoint.
