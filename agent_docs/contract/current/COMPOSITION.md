# Current program composition actions

## `facet`

- Signature: `facet({ id?, field, data?, columns?, gap?, align?, padding?, guides? })`.
- `field` is required. Omitted `data` resolves only when every eligible repeated layer uses one unique direct source.
- Supported first-slice sources are complete point, histogram bar, and aggregate bar programs without derived transforms.
- Facet values use source first-appearance order. Omitted `columns` creates one row; a positive integer wraps cells row-major.
- Position and appearance scales share one resolved domain across cells. Histogram children also share one bin-boundary set.
- `guides.legend` is `false` by default. `"shared"` creates one parent-owned categorical color legend while axes remain in each cell.
- The result is a composition parent whose `children` retain immutable filtered programs and whose `graphicSpec` contains the complete namespaced nested-Canvas snapshot.
- Canonical title order is `.facet(...).createTitle(...)`. A valid title authored before `facet` is promoted once to the parent.

### Formal values — `facet`

- Implemented: `facet({ id?: UserId; field: NonEmptyString; data?: ExistingDirectDatasetId; columns?: PositiveInteger; gap?: NonNegativeFinite; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding>; guides?: { legend?: false | "shared" } }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): independent per-channel scales, derived-data replay, outer-only axes, and non-categorical shared legends.
- Current limitation: independent scales, derived-data replay, outer-only axes, and non-categorical shared legends are not implemented.

### Value coverage — `facet`

- ✅ Covered: source and value inference, explicit source, one-row and wrapped layout, point/histogram/aggregate-bar eligibility, shared continuous and ordinal domains, shared histogram boundaries, parent categorical legend, title promotion, renderer isolation, immutable base/children, invalid and ambiguous source rejection.
- Evidence: `test/unit/grammar/facets.test.js`, `test/unit/actions/composition/facet-derivation.test.js`, `test/unit/actions/composition/facet.test.js`, `test/gates/direct-source-facet/public.test.js`.

## `editFacetHeaders`

- Signature: `editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset? })`.
- Requires a facet composition and at least one appearance change.
- Headers are one parent-owned repeated concrete resource. Editing them preserves child identity, semantic facet values, shared scales, and layout order, then rematerializes the parent snapshot.

### Formal values — `editFacetHeaders`

- Implemented: `editFacetHeaders({ fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; color?: NonEmptyString; offset?: NonNegativeFinite }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetHeaders`

- ✅ Covered: partial edit, immutable prior state, layout-edit convergence, empty edit rejection, and non-facet rejection.
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
