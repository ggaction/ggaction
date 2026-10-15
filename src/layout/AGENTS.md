# Layout Instructions

Apply these instructions to Canvas and plot bounds, guides, titles, facets, and composition.

- Infer graphical layout coordinates from Canvas or plot bounds when possible. Overlap is not a global error because explicit actions may intentionally overlap graphics.
- Align chart titles to actual plot bounds. Exclude margins, guide text, composition padding, and shared legends; facet headers align to their translated child plot.
- Resolve omitted concat dimensions from the explicit parent layout contract or compatible siblings. Preserve explicit child dimensions and never use incidental content bounds as an undocumented default.
- When a layout slot is larger than a nested composition, align the complete nested snapshot; never resize only its root Canvas.
- Compute facet edge guides from the actual occupied topology, including ragged final rows.
- Compute occupied bounds from final concrete geometry, including rotation, strokes, collection children, and translated descendants.
- Validate same-edge title, axis, legend, and reserved-block collisions symmetrically from final state. Equivalent final options must accept or reject identically regardless of authoring order.
- Report insufficient layout space clearly. Do not silently expand the Canvas, alter margins, or move user-requested content.
- Resolve text wrapping, Unicode boundaries, measurement policy, and line positions deterministically during layout and store concrete text children in `graphicSpec`.
- Layout-resource edits and Canvas edits must converge to the same `graphicSpec` for equivalent final options.
- Share scales and guides across layers or child programs only after validating semantic compatibility, not merely matching IDs or channel names.
- Align the complete outside side-legend stack to the actual plot top, including its occupied border, and exclude the chart title from that anchor.
- Give each guide family one chart-independent default; alternate placement requires an explicit public option.
- Keep exact composition, guide, title, and facet behavior in `COMPOSITION.md`, `AXES.md`, `GRID.md`, and `LEGEND_AND_TITLE.md` under `agent_docs/contract/current/`.
