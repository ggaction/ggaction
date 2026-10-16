# Along-axis translation for Cartesian axis titles

Status: **ready-for-review — implementation is not approved**.

## Concrete problem

An axis title can have an authored position that is independent of its scale's
categories. In the two frozen heatmap sources in `SOURCE_EVIDENCE.json`, the
375-pixel plot has three categorical columns and an attribution title at local
x=272.5 (actual global x=376.5). Its font, content and full occupied bounds are
recorded from the source SVG.

Existing `at` accepts start/center/end or a numeric **domain value**. It does not
accept a pixel coordinate. The unchanged public repro rejects `at:272.5` for
string categories `['1','2','3']`, while `at:'center'` anchors at global291.5.
Moving the title by85pixels is needed without changing cells, scales or guides.
The end anchor also causes concrete Canvas overflow for the long title.
`offset` moves perpendicular to the axis and cannot perform this translation.
An independent annotation would change the authored axis-title ownership; a
synthetic replacement scale or category changes chart semantics.

Run `node agent_docs/impl/axis-title-along-offset/REPRODUCE.mjs` to reproduce the
existing behavior. `EVIDENCE.json` contains actual graphics/rejections and an
unchanged-parent assertion. No API implementation or chart pixels are involved.

## Proposed public contract

Add optional signed finite `alongOffset?: number` to the existing Cartesian
`AxisTitleOptions` and the nested title options used by complete X/Y axes.
Omission means0, preserving existing program output.

```js
chart.createXAxis({
  line: false,
  ticksAndLabels: false,
  title: {
    text: 'Source attribution',
    at: 'center',
    alongOffset: 85,
    offset: 10,
    fontSize: 11,
    fontWeight: 300
  }
});
```

This is a proposed call fragment, not an executable API in the current runtime.

1. Resolve `at` using the existing scale/domain rules, then translate its concrete
   anchor along the Canvas axis. X positive moves right; Y positive moves down.
   These screen directions remain the same for reversed scales and either side.
2. Perpendicular `offset`, rotation, text content and styles retain their meaning.
   Rotation happens around the translated anchor. Ordered multiline text uses the
   translated anchor and existing spacing/centering rules.
3. Support direct creation, complete-axis creation, whole-axis editing and focused
   title editing. Existing partial editors retain an omitted previous value;
   explicit0 resets the translation. No new remove/reset shorthand is added.
4. Persist the optional finite value through the existing title config owner.
   Legacy snapshots without it load as0; invalid/nonfinite values reject atomically.
   Do not introduce a second placement resource or a render-only property.
5. Canvas bounds, label/title collisions and all occupied glyph checks use the
   translated geometry. The option cannot bypass clipping or collision rejection.
6. Canvas/scale/coordinate/data refresh, facets, save/import and theme replay retain
   the same signed translation. All marks, axes, ticks and grids stay unchanged.
   Polar/parallel titles are outside this proposal.

## Implementation and verification plan after approval

Update the existing axis-title validator/geometry owner, synchronized complete
axis validators/types/schema/metadata, current contract, public guide documentation
and generated references. Keep immutable program/state paths and wrapped action
trace ownership unchanged. No renderer or macro-architecture change is needed.

Test both channels and all four sides, positive/negative/zero offsets, reversed
continuous/discrete scales, at keywords/domain values, rotations and multiline
bounds, all four creation/edit entry paths, Canvas/collision errors, source input
and prior-program immutability, resize/scale refresh, facets, persistence and
legacy no-option parity. Verify the concrete three-column repro reaches global
x=376.5 with `at:'center', alongOffset:85`, without moving any heatmap cell.

## Review gate

Only these two sources are held for this gap. Existing issue for outward whole-axis
offset and the pending axis-label alignment proposal cover different decisions.
The parent task will deduplicate issues, publish this exact proposal checkpoint
and obtain explicit user approval before any implementation. Runtime7971 and all
historical translations remain unchanged while the proposal is reviewed.
