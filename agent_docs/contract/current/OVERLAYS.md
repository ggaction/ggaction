# Linked result overlays

## `createOverlay`

- Signature: `createOverlay({ id?, source?, type?, basis?, series?, missing?, orderBy?, line?, point? })`.
- Full API, stable mark resource; `editOverlay` changes the dependency and ordinary mark/encoding editors change appearance. `removeMark` removes the overlay independently. A source with a following overlay cannot be removed first.
- `source` selects an existing independent Cartesian bar, line, area or point. Omission uses the current eligible mark or one unambiguous eligible mark. `id` defaults to `overlay`; a collision requires an explicit ID.
- `type` defaults to `line`, alternatively `point`. `basis` is `visibleItems`. The overlay consumes the source's final result grain rather than rerunning the plot recipe over raw rows: bar category slot centers and signed cumulative endpoints, bin centers, line vertices, and area value boundaries. For a ranged area, the secondary endpoint is selected; a constant baseline is never selected in place of the value field.
- `series: source` (default) retains the source partitions. `total` follows the outer positive and negative endpoints of stacked bars separately. Non-stacked multiseries bars and multiseries area/line totals are rejected rather than silently adding or averaging unrelated series.
- `missing: break` (default) splits missing category/bin intervals; `connect` bridges them. Source line/area missing segments remain separate. Connecting an unordered point source requires `orderBy: x | y`; point-on-point defaults to x order.
- `line` accepts clip, stroke, strokeWidth, opacity, curve, tension, closed, lineCap, lineJoin and miterLimit. `point` accepts clip, shape, fill, stroke, strokeWidth, opacity, lineCap, lineJoin and miterLimit. The matching native mark validates each value. IDs, data, position and missing policies are owned by the overlay and rejected inside appearance objects. Only the appearance matching the selected type is accepted.
- An eligible source color grouping is inherited, including its color scale. Explicit `encodeColor` on the overlay stops that inheritance. Position edits on a following overlay are rejected; edit the source or detach first. Point appearance mappings consume resolved endpoint fields. A line appearance field must have one value per series; no implicit statistical aggregation is performed.
- Semantic effects: a distinct layer with `derivedBindings.overlay` containing source, basis, follow mode, series, missing, optional orderBy and the inherited-color policy. Shared x/y bindings consume source scales without contributing duplicate raw-row domains. This is a dependency, not `layer.source` ownership.
- Graphical effects: existing path/circle/rect primitives in a separate mark owner. Source actions explicitly schedule the following overlay after completed geometry. Facet children rematerialize their own filtered results. Canvas, SVG, PNG, PDF and transition scenes consume the same concrete graphics.
- Errors: unknown/incomplete/incompatible source, dependency cycles, ambiguous inferred source, duplicate ID, invalid option or native appearance value, unsupported totals, point line without ordering. Categorically placed violin/ridgeline density areas do not expose a single value boundary and are rejected.

### Formal values — `createOverlay`

- Implemented: `CreateOverlayOptions`, `OverlayLineAppearance`, `OverlayPointAppearance` in `types/program.d.ts`; exported from `types/index.d.ts`.

### Value coverage — `createOverlay`

- Proposed (NOT IMPLEMENTED): None. No additional proposal is part of this contract.
- ✅ Covered. Evidence: `test/unit/actions/marks/linked-overlay.test.js` covers aggregate edits, orientations, grouping, normalized/negative stacks, glyphs, bins, line/area boundaries, source color inheritance, independent appearance, item grain, facet, persistence, immutable rejection and dependency removal. Representative primitive/public/pixel equivalence is in `test/charts/linked-composition/` and the public flow in `examples/linked-overlay/program.js`.

## `editOverlay`

- Signature: `editOverlay({ target?, source?, series?, missing?, orderBy?, follow? })`.
- Mutable-resource edit. Omitted target resolves the current or one unique following overlay. At least one edit is required; omitted options preserve current intent. Source, series, gap and order edits use the same preconditions and explicit materialization as creation.
- `follow: true` retains the dependency. `follow: false` is an exclusive detach operation: snapshot the current result rows and normalized plot coordinates, replace the dependency with ordinary independent x/y encodings and a separate dataset, and clone appearance scale identities. Grouped offsets and missing segments retain their geometry. The independent mark responds to Canvas resizing but no longer follows source edits. Its normalized coordinate fields are explicit in inspection; source-data values retained in the snapshot remain available for new encodings.
- Detaching does not choose new axes. When creating guides on a unit with multiple independent position-scale pairs, pass explicit axis scales, as for any independently layered chart. An already detached mark is edited with ordinary mark/encoding actions.
- Semantic/graphical effects and failure atomicity are the same as creation; no input program, array or caller object is mutated. Detach cannot be combined with source/series/gap/order edits.

### Formal values — `editOverlay`

- Implemented: `EditOverlayOptions` discriminates detach from dependency edits. Appearance remains with the native mark/encoding actions.

### Value coverage — `editOverlay`

- Proposed (NOT IMPLEMENTED): None. No additional proposal is part of this contract.
- ✅ Covered. Evidence: `test/unit/actions/marks/linked-overlay.test.js` covers source updates, total selection, exclusive detachment, exact frozen geometry, independent source edits/removal and editable serialization. `test/contracts/linked-overlay.test.js` verifies inspection metadata and one top-level action per recommendation.

Accessible-data export resolves linked overlay vertices at their final aggregate grain, preserving series fields and following source edits. It does not re-aggregate the source rows as an independent line.
