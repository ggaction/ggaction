# Explicit Cartesian axis label alignment

## Status

Gate: `ready-for-review`. This package proposes one optional style property on existing Cartesian label actions. No runtime, declaration, public schema, or generated metadata has changed. Only the dependent source is held; other translations continue. Publication and deployment are separate operations.

## Confirmed missing behavior

A source places nine left-axis category labels at one shared **left** anchor, with label padding75. Actual reference SVG bounds have left20.5 for every label, while their right edges vary from39.953125 to84.421875. The600×180 plot begins at x100. Increasing the current label offset places a shared **right** anchor, so variable-length labels extend in the opposite direction. The mismatch preserves neither the explicit source alignment nor its occupied bounds.

[REPRODUCE.mjs](./REPRODUCE.mjs) uses synthetic short and long categories. It records current rejection by complete-axis creation, whole-axis editing and focused label editing, and measures the unequal left edges of an offset-only surrogate. [REPRODUCTION.json](./REPRODUCTION.json) contains concrete graphics, bounds, anchors and immutable-parent assertions. [source-evidence.json](./source-evidence.json) binds independently retained source, data and actual SVG bytes. No chart pixels or model calls are used.

## Proposed public contract

Add optional `align: "left" | "center" | "right"` to the existing Cartesian axis label style options:

```js
program.createAxes({ y: { ticksAndLabels: {
  labels: { align: "left", offset: 75 }
} } });

program.editYAxis({ ticksAndLabels: { labels: { align: "left" } } });
program.editYAxisLabels({ align: "left" });
```

- The same label style is accepted by complete `createXAxis`/`createYAxis`, nested `createAxes`/`createGuides.axes`, whole `editXAxis`/`editYAxis`, combined ticks-and-labels actions, and focused label creation/editing. No new action is added.
- Creation omission preserves today's per-side and endpoint-flush alignment exactly. Edit omission preserves an existing explicit value, or preserves default inference when no value was stored. Legacy snapshots remain inferred. No new reset literal is proposed; removing/recreating labels without explicit alignment restores inferred behavior.
- An explicit value sets the text anchor in each label's **unrotated local text frame**. Rotation then transforms that frame around the existing anchor. It does not mean screen-space left after rotation.
- Explicit alignment takes precedence over the inferred per-side anchor and endpoint `flush` alignment. It does not alter the stored flush intent, anchor coordinates, offsets, values, formatting, maps, font styles or label membership. With no explicit alignment, existing flush behavior remains byte-identical.
- Changing an axis side preserves an explicit alignment. Inferred alignment follows the new side exactly as today. All four sides and numeric, categorical, temporal and reversed scales are covered.
- Label distance remains controlled by `offset`; complete-axis outward displacement, if separately approved, remains owned by the complete axis frame. This property changes only text anchoring at those resolved positions.

## Ownership, state and validation

The existing Cartesian label materialization owner stores optional `align` beside its current style intent and emits concrete `textAlign`. Renderers continue reading only `graphicSpec`; they must not infer axis sides or source formats. No new mark owner or rendering primitive is introduced.

Stored alignment uses closed validation of the three literals. Invalid values and malformed imports fail atomically. Save/import, immutable edits, action replay, theme application and explicit-style precedence must retain the value. Theme-supplied alignment follows the existing label-style theme path; absent theme and option values retain legacy inference. Label removal/recreation, axis edits, Canvas resizing, scale/data refresh, font metrics changes, shared axes, facets and compositions must rematerialize the same resolved anchoring.

Actual rotated text bounds must be recomputed using the selected anchor. Axis titles, legends, adjacent labels, facet panels and Canvas fit continue to use the full occupied bounds. This proposal adds no collision waiver, silent Canvas growth, label hiding, padding text or changed tick/grid geometry.

## Required evidence after approval

1. Creation/whole/focused/combined action convergence for all three alignments on all four sides, with multiple label lengths and 0/45/90-degree rotation. Assert concrete anchors and independently measured SVG bounds, not only stored configuration.
2. No-option single/multiline, flush, band/time/linear/log and reversed cases preserve existing graphic/SVG/PNG bytes. Explicit alignment overrides only inferred anchors; all data, marks, ticks, lines, titles and grids remain unchanged.
3. Position changes, scale/data/Canvas/font refresh, remove/recreate, themes, shared axes, facets, persistence/import and replay retain the documented explicit-versus-inferred semantics.
4. Invalid values, insufficient margins and new label/title/legend collisions fail atomically with immutable parent and caller inputs unchanged. Existing measured overlap policy remains strict.
5. Full/Basic, Canvas/SVG/PNG, installed TypeScript consumer, closed persistence schema, current contracts, public docs, generated API metadata and measured package/bundle budgets are synchronized.
6. After a synchronized runtime pin, repair only the held source through the translation model. Preserve all nine original category texts, source font10/padding75 and600×180 plot; prove shared left20.5 in actual reference/target DOM bounds within existing geometry tolerances.

## Decision requested

Approve the optional Cartesian label `align` property, local-before-rotation anchor semantics, explicit precedence over inferred side/flush alignment, and legacy omission behavior. Runtime implementation remains held until explicit approval. Issue deduplication and the user-facing approval question are coordinated by the parent task.
