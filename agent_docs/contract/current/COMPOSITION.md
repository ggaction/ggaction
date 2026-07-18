# Current program composition actions

## `facet`

- Signature: `facet({ id?, field, data?, columns?, gap?, align?, padding?, scales?, guides? })`.
- `field` is required. Omitted `data` resolves only when every eligible repeated layer has one unique common row-preserving ancestor.
- Supported sources are complete Cartesian point, line, area, histogram bar, aggregate bar, ranged bar, rule,
  regression, density, interval/error-band, and box-plot programs whose visible layers share one valid partition anchor.
- Facet values use source first-appearance order. Omitted `columns` creates one row; a positive integer wraps cells row-major.
- Omitted scale policies are shared. `x`, `y`, `xOffset`, `color`, `size`, `shape`, `opacity`, and `strokeDash`
  accept `"shared" | "independent"` when the channel is used. Explicit semantic domains override either policy.
  Histogram children share one bin-boundary set only when x is shared.
- Filter, regression, density, interval, box-summary, and box-outlier dependencies replay topologically from each
  filtered cell source through `replayDerivedData`. Every affected layer is explicitly rebound through
  `rebindLayerData` before one deduplicated rematerialization plan runs.
- `guides.axes` is `"each"` by default. `"outer"` keeps x axes on the bottommost occupied cell in each column and y
  axes on the leftmost occupied cell in each row, including an incomplete final row.
- `guides.legend` is `false` by default. `"shared"` promotes one compatible categorical, gradient, discretized-color,
  size, or opacity recipe to a parent-owned concrete guide. Independent or otherwise incompatible child guide
  definitions are rejected before a facet result is returned.
- The result is a composition parent whose `children` retain immutable filtered programs and whose `graphicSpec` contains the complete namespaced nested-Canvas snapshot.
- Canonical title order is `.facet(...).createTitle(...)`. A valid title authored before `facet` is promoted once to the parent.
- Parent title alignment uses the translated child-plot union. Each facet header is centered on its own translated
  child plot; neither anchor uses the child Canvas, axis-reserved margin, facet padding, or shared legend extent.

### Formal values — `facet`

- Implemented: `facet({ id?: UserId; field: NonEmptyString; data?: ExistingRowPreservingDatasetId; columns?: PositiveInteger; gap?: NonNegativeFinite; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding>; scales?: Partial<Record<FacetScaleChannel, "shared" | "independent">>; guides?: { axes?: "each" | "outer"; legend?: false | "shared" } }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): Polar facet channel integration.
- Current limitation: `theta` and `radius` facet resolution/guide composition are not implemented.

### Value coverage — `facet`

- ✅ Covered: source and value inference, explicit common ancestor, one-row and wrapped layout,
  point/histogram/aggregate/ranged-bar eligibility, regression/density/interval/box dependency replay,
  shared/independent continuous domains,
  explicit-domain precedence, shared ordinal order, shared/independent histogram policy, parent categorical legend,
  parent gradient/discretized/size/opacity legends, occupied-edge outer axes, title promotion, child-plot-aligned
  parent title and headers, renderer isolation, layout rematerialization, immutable base/children, incompatible guide,
  invalid channel, dependency, and ambiguous-source rejection.
- Evidence: `test/unit/grammar/facets.test.js`, `test/unit/grammar/facet-dependencies.test.js`,
  `test/unit/grammar/facet-scales.test.js`, `test/unit/actions/composition/facet-derivation.test.js`,
  `test/unit/actions/composition/facet.test.js`, `test/unit/actions/composition/facet-derived-families.test.js`,
  `test/unit/actions/composition/facet-legend-families.test.js`, `test/gates/direct-source-facet/public.test.js`,
  `test/gates/facet-resolution/public.test.js`.

## `editFacetHeaders`

- Signature: `editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset? })`.
- Requires a facet composition and at least one appearance change.
- Headers are one parent-owned repeated concrete resource. Each header is centered on its child plot bounds. Editing
  them preserves child identity, semantic facet values, shared scales, and layout order, then rematerializes the
  parent snapshot.

### Formal values — `editFacetHeaders`

- Implemented: `editFacetHeaders({ fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; color?: NonEmptyString; offset?: NonNegativeFinite }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetHeaders`

- ✅ Covered: child-plot centering, partial edit, immutable prior state, layout-edit convergence, empty edit rejection,
  and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet.test.js`, `test/gates/direct-source-facet/public.test.js`.

## `editCompositionLayout`

- Signature: `editCompositionLayout({ gap?, align?, padding? })`.
- Requires an existing composition program and at least one layout option.
- `gap`: non-negative finite distance between adjacent child slots.
- `align`: `"start" | "center" | "end"` on the cross axis.
- `padding`: a non-negative scalar for all sides or a partial `{ top?, right?, bottom?, left? }` patch.
- Effect: preserves the ordered child IDs and child program references, then rebuilds the complete parent snapshot
  from canonical child state. Omitted options preserve current values.
- Facet compositions use the same action for gap, alignment, and padding. Their derived children and value order are
  retained; `columns` is structural facet intent and is not edited by this action.

### Formal values — `editCompositionLayout`

- Implemented: `editCompositionLayout({ gap?: NonNegativeFinite; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding> }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editCompositionLayout`

- ✅ Covered: scalar and partial padding, every alignment, gap, child preservation, immutable earlier program,
  complete rematerialization, facet compatibility, and invalid option rejection.
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/unit/actions/composition/facet.test.js`,
  `test/gates/program-composition/public.test.js`.

## `replaceCompositionChild`

- Signature: `replaceCompositionChild({ target, program })`.
- `target`: one existing child slot ID.
- `program`: one complete unit or nested composition `ChartProgram` with no unfinished action stack.
- Effect: preserves the target ID, slot order and all sibling references, replaces only the named child, then
  rebuilds the complete parent snapshot. The child program itself remains immutable and is retained by reference.
- Facet children are derived from one canonical source and cannot be replaced through this action.

### Formal values — `replaceCompositionChild`

- Implemented: `replaceCompositionChild({ target: UserId; program: CompleteChartProgram }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `replaceCompositionChild`

- ✅ Covered: unit replacement, nested-child eligibility, slot/order preservation, immutable source and sibling
  identity, namespaced snapshot rebuilding, unknown target and incomplete child rejection.
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/gates/program-composition/public.test.js`,
  `test/gates/program-composition/png.render.js`.

## Cross-feature integration contract

- A complete Cartesian or Polar unit program may be a direct or nested `hconcat`/`vconcat` child. Each child keeps
  its semantic state, resolved scales, guides, selections, and immutable program identity; the parent stores only
  retained child programs plus a concrete namespaced Canvas snapshot.
- Replacing a nested child is explicit at every ancestor. Revise the leaf, call `replaceCompositionChild` on its
  immediate parent, and repeat for each outer parent. Earlier leaves and compositions remain unchanged.
- Automatic cross-axis sizing rematerializes unit children. Nested compositions keep their intrinsic layout and are
  placed inside the resolved slot using the outer composition's `align` policy instead of stretching their internal
  cells, gaps, or guide geometry.
- Cartesian `facet` supports the mark and derived-data families listed above. A Polar source is rejected before any
  child or partial parent state is created because theta/radius facet scale and guide resolution are not implemented.

### Value coverage — cross-feature integration

- ✅ Covered: direct and nested Polar concat, nested replacement and explicit ancestor propagation, immutable prior
  state, centered unequal snapshots, Cartesian facet shared/independent scale and guide resolution, and explicit
  Polar-facet rejection.
- Evidence: `test/charts/cross-feature-integration/`,
  `test/contracts/roadmap3-phase10-baseline.test.js`, and
  `test/contracts/roadmap3-phase10-closeout.test.js`.
