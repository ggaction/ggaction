# ggaction 0.0.25

- Reject fixed combined-legend fill overrides in Strip, Beeswarm and Regression declarations, matching their mapped-color runtime behavior; retain Scatter's mapped-stroke support.
- Add original-row selectors, compound and text highlighting, and immutable `getMarkItems` inspection with exact row provenance across derived data, filtering, and saved programs. Validate compound selection ownership and prevent removal of selections still used by labels.
- Reuse immutable graphic-item lookups without caching caller-owned arrays; preserve label anchors through geometry edits.

- Refresh generated API and option inventories, add real-data native-layer and legend lifecycle witnesses, and execute the new public legend example in source and installed-package consumers.
- Update fast-uri, body-parser, zod and their compatible transitive dependencies; the release lockfile audit reports no known vulnerabilities.

- Combine interval color or stroke, interval size, and ordinal shape in one point legend with explicit representatives, original shape fallback, inherited appearance and shared channel editing.

- Add opt-in first-hidden line samples for categorical overflow summaries, preserving source data, scale domains and the default text-only summary.

- Reduce immutable-copy allocations and repeated path validation/bounds work; batch Parallel dimension mapping and reuse immutable geometry across appearance edits. Transition row identities and SVG resource names remain exact while avoiding repeated hashing work.

- Add `editLegend({ itemsOffset: { x, y } })` for independent legend-body movement with anchored titles, partial/reset edits, clipping, shared composition, facet, and persistence support.

- Preserve missing-value policies and original-field lineage through chart edits, numeric position aggregation, independent layers and mixed facet/ordinary scoped targets.
- Add explicit wide Radar summary and normalization controls, and distinguish omitted color inheritance from an explicit uncolored adjacent chart or layer.
- Preserve authored exact-plot margins while reclaiming automatic guide reservations with `fitCanvas({ align: "center" })`; keep edited and newly added legends in separate lanes.
- Batch immutable graphic removal and completed composition snapshot transfer to reduce facet and recommendation preparation cost without reducing displayed data.

- Validate scoped shared-legend positioning against the visible composition instead of hidden child legend copies, preserving local guide checks and editable snapshots.

- Add signed `alongOffset` for precise edge-aligned legend positioning, including selected blocks, facets, shared concat legends, persistence, and focused layout edits.

- Keep shared concat legends next to the actual plot bounds when adding adjacent charts, including faceted and Parallel views; reuse spare child margins and preserve explicit offsets.

- Preserve input tables when adding adjacent summary charts, and resolve completed-key data back to original fields and aggregation before inferring a new chart.

- Reduce nested action-trace allocation and freezing overhead while preserving immutable, lazily materialized child arrays and trace serialization.

- Add `removeLegend({ suppress: true })` to preserve channel-specific deletion through automatic guides, facet/source replay and saved programs; explicit `createLegend` restores the selected channels.

- Add `createLayerPlot` and `getPlotComposition` inspection for independent native layers with original-field provenance, shared compatible scales, compound ownership, and front/back placement.
- Infer adjacent chart inputs through native positional roles across Cartesian, Polar, and Parallel families; keep different statistical measurements on independent axes by default.
- Collect compatible nested shared color/shape legends once, preserve unrelated size guides, and infer deferred binned-count legend titles from their statistical meaning.

- Add `createOverlay` and `editOverlay` for independent line/point layers that follow a source's materialized endpoints, including bins, stacks, groups and facets; support explicit detachment.
- Add `createAdjacentPlot` and `editCompositionScales`, shared concat domains and actual plot-frame alignment across unit, nested and facet views.
- Add explicit child-path selectors and atomic target lists to Full domain actions, preserving Basic and primitive target contracts.
