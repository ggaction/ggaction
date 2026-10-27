# Materialization Instructions

Apply these instructions to semantic-to-graphic realization and rematerialization.

- Materialization explicitly turns stored semantic decisions into backend-neutral `graphicSpec`; it is never an automatic compiler.
- The responsible domain action must invoke every required materializer or rematerializer as wrapped actions visible in trace.
- Express cross-cutting rematerialization as a deterministic ordered plan, deduplicate equivalent steps, and register consumers with the owning policy instead of scattering refresh calls.
- Treat composition rematerialization as a transitive dependency closure across child snapshots, placement, shared guides, title bounds, and ancestor compositions.
- Use one shared concrete-graphic schema for primitives, graphical edits, materializers, and renderers.
- Persist only resolved primitive values and immutable backend-neutral appearance data in `graphicSpec`; never persist backend objects.
- Resolve row eligibility once at the final item grain and reuse it for scale domains, mark graphics, legends, labels, and selections.
- When a semantic change affects concrete output, refresh every affected consumer in dependency order. Coordinate-aware marks use the same owner rematerializer across coordinate families.
- Canvas, scale, data revision, grouping, appearance, selection, and highlight changes must not leave stale concrete geometry.
- Treat drawing order as explicit graphical state. Preserve default grids behind marks, honor explicit Cartesian grid drawing order, and keep axes, labels, and legends in their owned placement.
- Derive dependent component geometry from the concrete owner geometry rather than duplicating scale, band, width, endpoint, or bounds calculations.
- Reconcile stable graphic IDs when representation or collection cardinality changes. Remove stale children and incompatible properties.
- Rematerialize highlights from the unhighlighted baseline, reevaluate stable final-item identities, and apply selection/complement appearance without accumulating edits.
- Selection operates on final materialized mark items. Each mark family owns its item-grain adapter and highlight policy; the normalized selector protocol is shared.
- Preserve legend label readability when synchronizing legend symbols with selection or highlight state unless an explicit text option requests otherwise.
- Keep exact primitive schemas, item grains, bar endpoint meaning, path closure, fill contracts, and selection behavior in their owning current contracts and executable tests rather than duplicating them here.
