# Alignment within a legend title block

## Gate and scope

Gate: **approved**. The user explicitly approved issue204 and exact proposal revision72637f47 on2026-10-16, including the edit-only auto reset. Implementation proceeds on an isolated branch from synchronized runtimed7cc93da; the active translation runtime/documentation pin remains unchanged until the parent integration checkpoint.

- [x] Inspect the existing shared title-style type and every legend family
- [x] Reproduce unsupported alignment and the distinct existing placement controls through public actions
- [x] Bind the motivating overlap to the original initial-render geometry
- [x] Specify defaults, validation, geometry and consumer requirements
- [x] Explicit user approval
- [x] Implementation and complete consumer verification

## Problem and existing behavior

A horizontal legend can have a title above its item row. Its current title is centered across the block. In a measured initial view, a left-aligned top title occupies x5–79.55 and y399–412, while the neighboring axis title occupies x148.60–400.40 and y400.5–413.5. Centering the legend title instead puts it around x145.72–215.28 and y399–410: the two titles overlap. This changes readability rather than just cosmetic alignment.

The existing controls do not express the required result:

- `at: {x, y}` moves the complete occupied group. It does not control its title alignment. It explicitly conflicts with `position`, `align` and `offset` in the same call.
- Moving an existing corner group to `at` still places its top-title anchor at the intrinsic horizontal center. A separate existing inconsistency then applies left text alignment from the stored corner to that centered anchor. Fixing that layout/materialization mismatch would restore the centered default, not provide the required left-edge top title. This proposal does not use that mismatch as an alignment API or silently include a compatibility-changing bugfix.
- Existing `align` aligns an entire edge legend against the plot. It does not align text inside the legend.
- `titlePosition: 'left'` places an inline title beside the item row. It does not left-align a title above the row.
- `titleStyle.align` is currently rejected as an unknown key. Primitive text manipulation, independent annotation impersonation and changing source fonts or anchor are not appropriate substitutes.

The executable source-neutral `reproduce.mjs` records these cases without rendering or inspecting chart pixels. `source-evidence.json` binds the motivating source and current native geometry. The affected translation remains held; its rejected draft and cost history are retained.

## Proposed public choice

Extend the existing shared style:

```ts
interface LegendTitleStyleOptions {
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  align?: 'left' | 'center' | 'right';
}
```

For example:

```js
program.createLegend({
  at: {x: -49, y: 359},
  direction: 'horizontal',
  titleStyle: {fontSize: 11, fontWeight: 700, align: 'left'}
});

program.editLegendTitle({align: 'right'});
```

The shared declaration already feeds whole legend creation/editing and focused title editing. Existing nested guide/facade options and compatible block typography must carry the same property through their normal normalization paths. This introduces no new action or top-level placement option.

### Applicability

Apply the choice consistently to **top-title blocks** of categorical/series/stroke, gradient color/stroke, discretized interval color/stroke, sampled size, sampled opacity and sampled stroke-width legends. This includes horizontal and vertical blocks, sides, corners, free groups and supported combined blocks. Different legend families must not accept the shared field but silently ignore it.

For the existing inline layout `titlePosition: 'left'`, an explicit `titleStyle.align` is rejected. The inline title is a distinct layout with its own prefix slot; changing it is outside this proposal. Omission continues to use its current behavior. A transition from an explicitly aligned top title to an inline title must explicitly clear the alignment first, as described below.

### Geometry and defaults

1. Measure the title, including every explicit newline and blank line, with its existing font/text-metrics policy. Measure the body with existing symbol, label, spacing and border rules.
2. Use the legend's existing intrinsic content block, with horizontal span `L..R` covering the allocated title/body content width. Exclude border padding and border strokes from this text-alignment span. Its width is at least the title's measured width.
3. For explicit alignment, set the title text anchor to `L`, `(L+R)/2`, or `R`, with matching text alignment `left`, `center`, or `right`. Preserve its vertical placement, title-to-body gap, body layout and block order. For multiple title lines, all lines share the selected anchor/alignment.
4. Recompute actual occupied bounds, border, group translation and collision/Canvas-fit checks normally. Free `at` still anchors the **resulting** complete occupied top-left. The new field does not bypass overlap or fit checks, move the group automatically, shrink text, or modify fonts/items/data/scales.
5. Omission preserves every current per-family/per-layout default and graphic result: horizontal top titles remain centered where they are centered today; side titles remain left-aligned where they are left-aligned today. There is no global default change or migration of historical snapshots.

### Clearing and validation

The optional stored style contains only an explicit enum or no key. Creation accepts the three enum strings. Whole/focused title edits also accept `align: 'auto'` as an **edit-only reset**, removing the explicit key and restoring that layout's existing native default. This follows the repository's existing edit-reset pattern; `'auto'` is not stored as a fourth alignment. Public edit option types must express this reset without widening creation options.

Reject unknown strings, null, booleans, numbers, malformed style objects and an explicit alignment in an inline title layout. Do not coerce invalid input or silently drop it. A hidden title retains its explicit alignment for later restoration, but the same layout compatibility rules still apply. Older snapshots without alignment remain valid; unknown or invalid stored enum values fail closed. Every invalid create/edit/load operation is atomic and leaves prior program/input state unchanged.

**Review decision:** approve the enum and this edit-only reset together. If the reset is not desired, change this proposal before approval rather than inventing an implementation-time clearing rule.

## Ownership and compatibility

`LegendTitleStyleOptions` and closed legend normalization/persistence own the input. Existing family layout owners compute the aligned title anchor from measured block geometry and explicitly rematerialize it. Concrete text graphics carry the resulting anchor/alignment; SVG and Canvas renderers continue reading only concrete graphics. Title content, symbol/label styles, legend selection and group placement keep their current owners.

This scope is separate from shared legend promotion across repeated/faceted views (issue193). It does not change group selection, guide sharing, facet resolve rules, promotion, `blockLayout` or `at`. It is also separate from adding a new bottom title position. It adds one title-style choice to already supported layouts.

## Required implementation evidence

1. Left/center/right top-title geometry for every listed family in horizontal and vertical layouts, including a title wider than its body and a body wider than its title. Compare expected anchors with independent literal geometry, not the implementation helper.
2. Exact graphic parity for all omitted-alignment historical fixtures. Explicit defaults must equal the corresponding native result without changing omitted stored intent.
3. Multiline/blank-line titles, hidden/restored titles, borders, mapped symbols, combined categorical/size blocks and free/corner groups; preserve actual item positions, native spacing and source data.
4. Whole and focused edits, nested guide/facade creation, per-block typography where supported, Basic/Full entry points, scale/data/font/Canvas/content replay, group remove/recreate and supported facet promotion. Preserve existing promotion restrictions; do not add new sharing behavior.
5. Edit-only reset, top-to-inline transitions, all invalid values, save/load, immutability and atomic failure. Validate the closed persisted shape and generated/API/MCP schemas.
6. Actual SVG/Canvas text alignment and measured collision behavior using identical concrete graphics, including the motivating no-overlap geometry. Under the translation task's no-pixel policy, inspect DOM/graphic bounds and preserve renderer evidence without chart-pixel viewing.
7. Synchronize types, current legend contract, official docs, action cards, generated references and machine/MCP schema; run focused tests, full unit/contracts/docs and installed package consumers.

The original proposal checkpoint did not authorize implementation. The subsequent explicit approval is recorded in `approval.json`; the implemented, verified scope is recorded in `implementation-evidence.json`. Publication, deployment, active translation runtime integration and pull-request creation remain separate operations. The original `reproduce.mjs`/`evidence.json` files preserve the pre-implementation rejection baseline; they are historical evidence, not assertions about the implemented API.
