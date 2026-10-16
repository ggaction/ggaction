# Independent placement of selected legend blocks

## Status

- Gate: `ready-for-review`; implementation remains held.
- This is a separate public and persisted-schema decision from grouped legend placement.
- Only two dependent translation families are held. Other families can continue.
- No internal legend action, duplicated mark owner, or altered source design is an acceptable substitute.

## Concrete gap

A single scatter owner may encode category color and quantitative point size while its color legend belongs at the top-left and its size legend belongs at the bottom-left. Another source puts the color block below the plot and the size block at the top-right. The source specification and compiled reference both explicitly request those independent anchors.

Current public group placement stores one anchor per target. Creating a corner size block can opt an already existing categorical block into that group and move both to the new anchor. An existing group rejects a conflicting anchor. `editLegendBlock` can select the correct target/channel for title, labels, samples, and values, but cannot select its placement. Its `gap` option changes sample-to-label spacing. Low-level `createSizeLegend` is an internal action, absent from the supported TypeScript authoring surface.

This minimal supported call chain exposes the missing representation:

```js
const program = chart()
  .createCanvas({ width: 700, height: 700, margin: 150 })
  .createData({ values: [
    { x: 1, y: 2, team: "A", amount: 1 },
    { x: 2, y: 3, team: "B", amount: 9 }
  ] })
  .createScatterPlot({ x: "x", y: "y", guides: false })
  .encodeColor({ field: "team" })
  .encodeSize({ field: "amount" })
  .createLegend({ channels: ["color"], position: "top-left" })
  .createLegend({ channels: ["size"], position: "bottom-left" });
```

The two requested block positions cannot both survive the one-anchor target group. The immutable source/raw/compiled/SVG hashes and requested anchors are recorded in [source-evidence.json](./source-evidence.json). Diagnosis uses source and concrete/reference metadata; no chart pixels were inspected and no additional model call was made.

## Proposed focused public option

Add optional `position` to the existing `editLegendBlock` action:

```js
program.editLegendBlock({
  target: "scatterPlot",
  channel: "size",
  position: "bottom-left"
});

// Rejoin the target group's inherited placement.
program.editLegendBlock({
  target: "scatterPlot",
  channel: "size",
  position: "inherit"
});
```

This keeps the action at three top-level parameters and follows the desired flow: create a complete legend, then refine one meaningful block.

- Supported explicit values are the four current edges and four plot corners. `"inherit"` removes the local placement override. Omission preserves the previous override.
- A selected categorical merged color/shape block moves as one block, whichever member channel selects it. Size, opacity, stroke width, gradient, interval, and sampled-color blocks use the same placement boundary.
- A locally positioned block is excluded from the inherited group's packing and packed at its requested anchor. Sibling titles, samples, values, ordering, scales, data, and marks remain unchanged.
- An explicit corner uses the existing native inset8. Explicit edges use the owning family's existing default clearance and same-edge axis-lane inference. This proposal adds no custom coordinates, per-block offset, or automatic plot growth.
- Whole-group layout edits continue to arrange inherited members. A block's explicit placement survives those edits until `position: "inherit"` rejoins it. This precedence must be stated explicitly in current contracts.
- Each independently placed block retains the existing full occupied-bounds, Canvas/plot fit, and same-edge guide collision validation. Invalid or insufficient placement fails atomically. Explicit guides may overlap the chart's data as existing inside-plot legends do.
- Existing programs without the option retain exact group/edge behavior and snapshots. No previously valid placement request silently changes semantics.

## Ownership and persistence

The selected block's closed override stores optional `position`. Absence means inherited group placement; reset removes it rather than storing a second default. The existing legend group materialization owner partitions inherited and independently placed blocks, measures their concrete content using current family layout owners, and materializes the final positions explicitly. Renderers gain no guide inference. Earlier immutable programs and caller-owned options remain unchanged.

Legacy snapshots without the field remain valid. New snapshots validate the closed anchor union and selected block identity. Serialization, scale/data/Canvas refresh, removal, family transitions, facets, and repeat must preserve or deliberately remove the local placement consistently.

## Required evidence after approval

1. The generic same-target two-block examples retain both requested anchors, with unchanged marks, scales, values, and raw rows.
2. All four edges/corners, reset, omission-preserving edits, and whole-group precedence agree across creation/edit order.
3. Full/Basic and each applicable legend family, categorical merged blocks, multiple groups, facets/repeat, scale/data/Canvas refresh, and persistence.
4. Existing no-override programs remain byte-equivalent; insufficient space and malformed persisted overrides fail immutably.
5. Source/reference positions, concrete bounds, SVG/Canvas parity, installed TypeScript consumer, contracts/docs/generated metadata, and measured package/bundle budgets.

## Decision requested

Approve this focused block `position` option and the explicit-over-inherited group precedence. Until approval, runtime, declarations, and current persisted schemas remain unchanged. The existing two dependent chart families remain held with their original model usage and source evidence preserved.
