# Outward offset for a complete Cartesian axis

## Status and scope

- Gate: `ready-for-review`. No new API or persisted schema is implemented.
- One valid dependent source is held; other chart families continue.
- This English review package requests a numeric, finite, **non-negative** outward distance, with effective default0. Negative inward placement is outside this proposal.

## Reproduced missing behavior

A source explicitly moves its entire bottom X and left Y axis20 logical pixels outside a600×500 plot. The compiled reference retains both offsets. Its actual SVG axis translations are `(0.5,520.5)` for X and `(-19.5,0.5)` for Y, including the normal half-pixel alignment.

Current `createAxes({x:{offset:20},y:{offset:20}})` rejects the unknown option. Whole-axis editors also cannot express it. Increasing `labels.offset` alone leaves domain lines and ticks on the plot edge. Changing the plot/scale domain, adding duplicate mark owners, or using extension primitives does not preserve the source design and supported chart-authoring vocabulary.

Run [REPRODUCE.mjs](./REPRODUCE.mjs) from the repository root. [REPRODUCTION.json](./REPRODUCTION.json) contains the actual current public rejection, label-only surrogate geometry, and immutable-parent checks. [source-evidence.json](./source-evidence.json) binds the source/raw/compiled/SVG bytes and actual reference translations.

## Proposed public contract

Add optional `offset` to existing complete Cartesian axis creation and whole-axis editing options:

```js
program.createAxes({
  x: { offset: 20, title: { text: "Alpha" } },
  y: { offset: 20, title: { text: "Beta" } }
});

program.createXAxis({ offset: 20 });
program.editXAxis({ offset: 20 });
program.editYAxis({ offset: 0 });
```

- `CompleteAxisOptions.offset` supports `createXAxis`, `createYAxis`, nested `createAxes`, and bundled `createGuides.axes`. `EditAxisOptions.offset` supports existing `editXAxis` and `editYAxis`. No new action is added.
- A value must be a finite number >=0. Creation omission means0. Editing omission preserves the stored value; explicit0 restores the plot-edge axis frame.
- Bottom moves downward, top upward, left leftward, and right rightward. The distance is perpendicular to the axis and uses logical pixels.
- The complete owned frame moves together: domain line, tick stems, tick labels, and axis title. Existing label/title offsets remain relative to that displaced axis frame. Existing `alongOffset`, rotation, `at`, values, formatting, and scale mappings retain their meanings.
- Axis position changes preserve the distance and apply its outward direction for the new side. Component removal/recreation inherits the owning axis frame.
- Mark positions, data, scale domains/ranges, plot dimensions, grid extents, and grid draw order remain unchanged. Grid lines still occupy the original plot and use existing tick-value alignment.
- Measured occupied bounds include the displaced frame. Existing Canvas fit, guide/legend/title clearance, creation-order symmetry, and atomic rejection remain active. No silent Canvas growth or collision bypass is added.
- This option applies only to Cartesian X/Y axes. Polar, radial, and parallel axes retain their existing contracts and reject unsupported use.

## Stored state and ownership

The Cartesian axis owner stores optional outward offset beside its existing scale/coordinate/position intent. Legacy absence means0. The owning complete/whole-edit actions invoke existing component materializers with a shared resolved guide frame. A pure coordinate/layout helper resolves the perpendicular displacement once; line, ticks, labels, and title must not separately invent it. Grid materialization keeps the original plot frame.

New persisted values use closed finite/non-negative validation. Invalid edits and malformed snapshots fail without mutating an earlier program. Renderer backends continue reading concrete `graphicSpec` geometry, with no axis inference or backend-specific displacement.

## Required implementation evidence after approval

1. All four sides at0/20 and large offsets: exact common displacement of line, ticks, labels, title; default no-offset concrete graphics remain byte-identical.
2. Creation, bundled creation, whole edits, position changes, hidden/removed components, and replay converge for identical final options.
3. Grid/marks/scales/raw rows stay fixed, including time/band/reversed ranges and explicit tick values. Label/title local offsets and rotations remain independent.
4. Canvas/scale/data/font changes, shared axes, facets/repeat/composition, save/restore, and native legend clearance follow the displaced occupied bounds. Shared-axis incompatibility is reported explicitly.
5. Invalid numbers, negative values, insufficient space, or malformed persisted state fail atomically. Full/Basic, SVG/Canvas/PNG, installed TypeScript consumer, contracts/docs/generated metadata, and measured package/bundle budgets are covered.
6. After integration, the held source is model-repaired using the new owned frame. Old label-only compensations must not be applied twice; source title/label local distances are rechecked against actual reference geometry.

## Existing issue deduplication

Issue search for `axis offset` and `perpendicular` found no complete-axis frame feature. [Issue174](https://github.com/ggaction/ggaction/issues/174) concerns independent **title** anchoring and inward/above-plot title placement; it does not move domain lines or ticks. [Issue183](https://github.com/ggaction/ggaction/issues/183) concerns omitted external legend clearance behind occupied axes. This proposal preserves that clearance contract while making the axis frame itself movable.

## Decision requested

Approve this non-negative complete-axis outward `offset` option, its local component-offset semantics, fixed grid/plot frame, and legacy default0. Runtime implementation and the dependent source translation remain held until explicit approval. Publication and deployment are separate operations.
