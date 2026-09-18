# Current program composition actions

Returned facet/repeat children have closed action stacks, including when derivation is nested inside an edit. Subsequent child edits create top-level trace nodes.

Nested snapshots preserve complete child ancestry with collision-free graphic IDs. Each composition adds only its
own namespace prefix; existing identifiers are not encoded again. Identifier length grows linearly with ancestry.
Exact internal graphic ID spelling is not a public authoring option.

## `facet`

- Signature: `facet({ id?, field, data?, values?, columns?, gap?, align?, padding?, scales?, guides? })`.
- `field` is required. Omitted `data` resolves only when every eligible repeated layer has one unique common row-preserving ancestor.
- Supported sources are complete Cartesian point, line, area, histogram bar, aggregate bar, ranged bar, rule,
  regression, density, interval/error-band, and box-plot programs; Polar Point, Line, direct Arc, Pie, Rose and Radar;
  and Parallel-coordinate programs whose visible layers share one valid partition anchor and one coordinate family.
- Facet values use source first-appearance order. Explicit `values` is a unique observed-value list whose exact order controls
  child, header and layout order. Omitted `columns` creates one row; a positive integer wraps cells row-major.
- Omitted scale policies are shared. `x`, `y`, `xOffset`, `yOffset`, `theta`, `r`, `color`, `stroke`, `size`, `shape`,
  `opacity`, `strokeDash`, and `parallelDimensions` accept `"shared" | "independent"` when the role is used. Public
  `r` resolves the semantic `radius` binding; `radius` is not an accepted facet-policy alias. The single
  `parallelDimensions` policy applies separately to every dimension scale and never unions different dimensions.
  Explicit semantic domains override either policy. Histogram children share one bin-boundary set only when x is shared.
- Filter, regression, density, interval, box-summary, and box-outlier dependencies replay topologically from each
  filtered cell source through `replayDerivedData`. Every affected layer is explicitly rebound through
  `rebindLayerData` before one deduplicated rematerialization plan runs.
- `guides.axes` is `"each"` by default. `"outer"` keeps x axes on the bottommost occupied cell in each column and y
  axes on the leftmost occupied cell in each row, including an incomplete final row. Polar theta/radius and Parallel
  dimension axes remain child-local; requesting `"outer"` for either family is an atomic error.
- `guides.legend` is `false` by default. `"shared"` promotes compatible categorical, gradient, discretized-color,
  size, or opacity recipe to a parent-owned concrete guide. Independent or otherwise incompatible child guide
  definitions are rejected before a facet result is returned. Promotion preserves the concrete child legend's
  configured `"left" | "right" | "top" | "bottom"` edge and the horizontal alignment of top/bottom legends. The
  parent reserves width only for a side legend and height only for a horizontal legend. An inferred legacy
  categorical legend defaults to `"right"`; facet itself has no separate legend-position option.
- The result is a composition parent whose `children` retain immutable filtered programs and whose `graphicSpec` contains the complete namespaced nested-Canvas snapshot.
- Canonical title order is `.facet(...).createTitle(...)`. A valid title authored before `facet` is promoted once to the parent.
- Parent title alignment uses the translated child-plot union. Legacy facet headers remain one item per cell and
  align to each translated child plot. Explicit row/column role headers align to the occupied translated plot union
  for their row or column; neither long-axis anchor uses the child Canvas, axis-reserved margin, facet padding, or
  shared legend extent.
- Empty-string facet values remain semantic values and render with the deterministic visible header `(empty)`.
- Facet child cardinality는 최대 `100`이며 child derivation 전 `partitionRows * childCount <= 10,000,000`
  work budget을 검증한다.
- Facet materialization fails atomically when a header leaves the composed Canvas, intersects another header or its
  child plot, or when the shared legend leaves the composed Canvas or intersects the translated child-plot union.

### Formal values — `facet`

- Implemented: `facet({ id?: UserId; field: NonEmptyString; data?: ExistingRowPreservingDatasetId; values?: NonEmptyUniqueObservedScalarArray; columns?: PositiveInteger; gap?: NonNegativeFinite; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding>; scales?: Partial<Record<FacetScaleChannel, "shared" | "independent">>; guides?: { axes?: "each" | "outer"; legend?: false | "shared" } }): ChartProgram`.
- Implemented non-Cartesian families: Polar Point/Line/direct Arc/Pie/Rose/Radar and Parallel coordinates.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `facet`

- ✅ Covered: source and value inference, explicit common ancestor, one-row and wrapped layout,
  point/histogram/aggregate/ranged-bar eligibility, regression/density/interval/box dependency replay,
  shared/independent continuous domains,
  explicit-domain precedence, shared ordinal order, shared/independent histogram policy, parent categorical legend,
  parent gradient/discretized/size/opacity legends, occupied-edge outer axes, title promotion, child-plot-aligned
  parent title and headers, empty-string header display, renderer isolation, layout rematerialization, immutable
  base/children, four-edge shared-legend placement and layout-edit preservation, incompatible guide, invalid
  channel, dependency, and ambiguous-source rejection; Polar theta/radius and Parallel dimension domains, local Pie
  denominators, local frames/axes, attached-label replay, transform-produced empty cells, and non-Cartesian outer-axis
  rejection.
- Evidence: `test/unit/grammar/facets.test.js`, `test/unit/grammar/facet-dependencies.test.js`,
  `test/unit/grammar/facet-scales.test.js`, `test/unit/actions/composition/facet-derivation.test.js`,
  `test/unit/actions/composition/facet.test.js`, `test/unit/actions/composition/facet-derived-families.test.js`,
  `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-legend-families.test.js`,
  `test/unit/actions/composition/polar-facets.test.js`,
  `test/unit/actions/composition/parallel-facets.test.js`,
  `test/contracts/polar-parallel-facets.test.js`, `test/charts/cars-origin-scatterplot-facet/facet-variants.test.js`,
  `test/charts/cross-feature-integration/variants/facet-resolution/public.test.js`.

## `facetGrid`

- Signature: `facetGrid({ id?, data?, rows, columns, combinations?, gap?, align?, padding?, scales?, guides? })`.
- `rows` and `columns` each require a different source field and accept an optional unique observed `values` order.
  Omitted orders use first appearance independently on each field.
- `combinations: "observed"` is the default. It creates only observed pairs while retaining their true row and column
  coordinates, so missing pairs do not compact the grid. `"full"` creates the Cartesian product and represents an
  unobserved pair as a named Canvas child with the original semantic layers and coordinate plus canonical empty mark
  graphics. Shared or explicit domains materialize child-local guides in that slot. An independent automatic domain
  that has no final values is rejected instead of inventing a fallback domain.
- Stable child IDs are `${id}-row-${rowIndex + 1}-column-${columnIndex + 1}`. Canonical state stores both ordered
  domains, every child's scalar pair, coordinate and empty status. Headers display `rowValue · columnValue`.
- Scale, guide, derived-data, title/header, renderer, child/work-budget and immutable-failure policies are the same
  owners as one-field `facet`. Shared domains are resolved from populated cells; blank cells do not invent values.

### Formal values — `facetGrid`

- Implemented: `facetGrid({ id?: UserId; data?: ExistingRowPreservingDatasetId; rows: { field: NonEmptyString; values?: NonEmptyUniqueObservedScalarArray }; columns: { field: NonEmptyString; values?: NonEmptyUniqueObservedScalarArray }; combinations?: "observed" | "full"; gap?: NonNegativeFinite; align?: CompositionAlign; padding?: CompositionPaddingInput; scales?: FacetScaleResolutions; guides?: FacetGuideOptions }): ChartProgram`.
- Implemented for the same Cartesian, Polar and Parallel families and policies as `facet`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `facetGrid`

- ✅ Covered: exact row/column order, observed holes, full empty cells with retained semantics/coordinates/local guides,
  stable IDs, stored coordinates, shared and independent domains, all seven non-Cartesian family empty graphics,
  source replay, header/title policy, layout, immutable rejection, Canvas and renderer output.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`,
  `test/contracts/composition-family-matrix.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `repeatCharts`

- Signature: `repeatCharts({ id?, target?, channel, fields, columns?, gap?, align?, padding?, scales?, guides? })`.
- Repeats one complete direct-source mark by replacing an eligible field role across an ordered unique field list.
  Cartesian marks accept `x` or `y`; Polar Point/Line/direct field-bound Arc/Rose accept `theta` or public `r`; Parallel
  coordinates accept `{ parallelDimension: field }` and replace exactly that dimension while preserving its position,
  field type, custom title, sibling dimensions, key and missing-value policy. Omitted `target` requires exactly one
  eligible primary mark. Attached Text labels and statistical-reference dependents owned by that target replay with it;
  unrelated layers are rejected.
- Pie and Radar reject raw theta/r replacement because those facades own different semantic roles. Composite
  statistical owners and derived target datasets are also rejected rather than partially or textually rewritten.
- Stable child IDs are `${id}-field-${index + 1}` and headers are field names. The repeated channel defaults to
  independent domains; explicit shared policy uses the deterministic union across all repeated fields. Other used
  channels follow the ordinary facet defaults and a compatible non-repeated legend may be parent-owned.
- Axes remain per cell because repeated fields can have different units and titles. `guides.axes: "outer"` is rejected
  both at creation and later guide-policy editing.

### Formal values — `repeatCharts`

- Implemented: `repeatCharts({ id?: UserId; target?: EligibleDirectMarkId; channel: "x" | "y" | "theta" | "r" | { parallelDimension: NonEmptyString }; fields: NonEmptyUniqueFieldTuple; columns?: PositiveInteger; gap?: NonNegativeFinite; align?: CompositionAlign; padding?: CompositionPaddingInput; scales?: FacetScaleResolutions; guides?: FacetGuideOptions }): ChartProgram`.
- Explicitly rejected: Pie/Radar raw positional-role replacement, composite statistical roles, derived target datasets,
  two-dimensional repeat matrices, and outer axes.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `repeatCharts`

- ✅ Covered: x/y/theta/r/parallelDimension role replacement, independent/shared domains, exact order and IDs,
  Parallel sibling/title/scale preservation, attached-label replay, explicit Pie/Radar rejection, shared categorical
  legend, source replay, scale-policy edit, outer-axis rejection and strict types.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`,
  `test/unit/actions/composition/non-cartesian-repeat.test.js`,
  `test/contracts/composition-phase10-types.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `editFacetSource`

- Signature: `editFacetSource({ program })`.
- Requires a facet, grid or repeat parent and one complete unit `ChartProgram`. It reapplies the current partition or
  repeat recipe to the revised unit while preserving explicit value/field order, IDs when the recipe cardinality is
  unchanged, layout, scale/guide policy, parent header styling and parent title.
- The stored partition dataset ID, ordered domains and repeat fields are part of that recipe. Every stored facet value
  must remain observed in the revised source. Changing a dataset ID, domain or repeated field list requires creating a
  new composition from the revised unit.
- Validation and all cell derivation occur on an immutable branch. A missing field/target, unsupported family,
  incompatible guide or incomplete program leaves both the previous parent and caller program unchanged.

### Formal values — `editFacetSource`

- Implemented: `editFacetSource({ program: CompleteUnitChartProgram }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetSource`

- ✅ Covered: one-field, grid and repeat recipe replay, revised rows under retained Cartesian/Polar/Parallel domains,
  stable policy and IDs, attached-label/selection/placement/theme/style preservation, revised-unit Canvas replay,
  title/header preservation, nested action trace and immutable failure.
- Evidence: `test/unit/actions/composition/facet-grid-repeat.test.js`.

## `editFacetHeaders`

- Signature: `editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset?, role?, labelMap?, side?, align? })`.
- Requires a facet composition and at least one appearance change.
- Unqualified edits use `role:"all"` and update common style/mapping while preserving the legacy one-header-per-cell
  topology. `role:"row" | "column"` activates role mode. A row-column grid then owns one header per occupied
  numeric column followed by one per occupied numeric row. One-field facets and repeats support only the column role
  and keep one header per cell, including wrapped physical rows.
- Common config is the fallback for each role; a role-specific style, alignment or `labelMap` wins. Role
  `labelMap:"auto"` removes that override and falls back to the common map; common `"auto"` falls back to
  `formatVisibleText`. Typed raw values remain the identity, so `1` and `"1"` may display differently without
  changing partitions. Duplicate visible labels and `""` are valid; empty mapped text keeps the item identity but
  reserves no strip space.
- Row sides are `left | right`; grid column sides are `top | bottom`. One-field facet
  and repeat column headers also accept `left | right`, keeping one header per cell. Side cell
  headers reserve the maximum measured text width plus offset for each physical column,
  including wrapped rows, without resizing child canvases. `align:"start" | "center" | "end"` applies
  along the occupied plot span. `side` requires an explicit row/column role. Role strips reserve measured space in
  the parent layout before child placement, so font, map, side, layout, title and shared-legend changes converge.
- Editing preserves child identity, semantic facet values, shared scales and layout order, then rematerializes the
  parent snapshot. Clipping, snapshot intersection or header-header overlap fails atomically.

### Formal values — `editFacetHeaders`

- Implemented: `editFacetHeaders({ fontSize?: PositiveFinite; fontFamily?: NonEmptyString; fontWeight?: NonEmptyString | Finite; color?: NonEmptyString; offset?: NonNegativeFinite; role?: "all" | "row" | "column"; labelMap?: DisplayLabelMap | "auto"; side?: "top" | "bottom" | "left" | "right"; align?: "start" | "center" | "end" }): ChartProgram`, with the role-specific side restrictions above.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetHeaders`

- ✅ Covered: legacy child-plot alignment, typed common and role maps, precedence/reset, deterministic row/column
  item order, four sides, three alignments, empty labels, exact strip reservation, source/layout replay, immutable
  prior state, invalid role/side/map, empty edit and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet.test.js`,
  `test/unit/actions/composition/facet-display-headers.test.js`,
  `test/unit/actions/composition/facet-side-headers.test.js`,
  `test/unit/grammar/layout/facets.test.js`, and
  `test/charts/cars-origin-scatterplot-facet/facet-variants.test.js`.

## `editCompositionLayout`

- Signature: `editCompositionLayout({ columns?, gap?, align?, padding? })`.
- Requires an existing composition program and at least one layout option.
- `columns`: positive integer for one-field facet and repeat layouts, no larger than the retained child count.
  A row-column grid keeps the width of its declared column domain; concat compositions reject it.
- `gap`: non-negative finite distance between adjacent child slots.
- `align`: `"start" | "center" | "end"` on the cross axis.
- `padding`: a non-negative scalar for all sides or a partial `{ top?, right?, bottom?, left? }` patch.
- Effect: preserves the ordered child IDs and child program references, then rebuilds the complete parent snapshot
  from canonical child state. Omitted options preserve current values.
- Facet compositions use the same action for columns, gap, alignment, and padding. Their derived children, child
  references, field/data identity and value order are retained while the complete parent snapshot is rebuilt.

### Formal values — `editCompositionLayout`

- Implemented: `editCompositionLayout({ columns?: PositiveInteger; gap?: NonNegativeFinite; align?: "start" | "center" | "end"; padding?: NonNegativeFinite | Partial<FourSidePadding> }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editCompositionLayout`

- ✅ Covered: scalar and partial padding, every alignment, gap, facet columns, child preservation, immutable earlier
  program, complete rematerialization, facet compatibility, concat columns rejection, and invalid option rejection.
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/unit/actions/composition/facet.test.js`,
  `test/unit/actions/composition/facet-editing.test.js`,
  `test/charts/program-composition/variants/layouts/public.test.js`.

## `editFacetScales`

- Signature: `editFacetScales({ x?, y?, xOffset?, yOffset?, theta?, r?, color?, stroke?, size?, shape?, opacity?, strokeDash?, parallelDimensions? })`.
- Requires an existing facet composition and at least one used channel whose `"shared" | "independent"` policy
  changes. Omitted channels preserve the complete current policy. Unused channels and conflicting policies on one
  shared scale ID are rejected before child replacement.
- The action reconstructs the current facet definition from the parent-retained pre-facet semantic/materialization
  state, preserving facet ID, field, source data, first-appearance value order, child IDs, layout, guide policy,
  headers and title. Every child is immutably rederived through the same filter/derived-data/rebind/materialization
  registry as `facet`.
- Shared automatic domains use the complete deterministic union; independent automatic domains are child-local.
  Explicit semantic domains remain authoritative. Shared histogram x keeps one boundary set; independent x replays
  each child's requested bin policy. Polar ranges/frames and Parallel dimension positions remain child-local even when
  their semantic domains are shared. Selection/label/highlight intent is replayed from the canonical unit state.
- Complete child derivation, scale resolution, guide compatibility and parent snapshot materialization run on a
  speculative immutable branch first. A failure preserves the previous parent, children, source and caller options.

### Formal values — `editFacetScales`

- Implemented: `editFacetScales(options: FacetScaleResolutions): ChartProgram` with at least one effective used-channel
  policy change.
- Implemented for used Cartesian channels, Polar `theta`/`r`, and `parallelDimensions`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetScales`

- ✅ Covered: partial policy preservation, shared↔independent domains, histogram bin replay, stable child IDs,
  immutable child replacement, title/highlight preservation, child replay trace, equivalent/unused/invalid policy
  rejection, incompatible shared legend atomicity, Polar/Parallel domains and local frames, attached-label replay,
  empty-partition policy, and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-derived-families.test.js`, and
  `test/contracts/facet-policy-editing.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

## `editFacetGuides`

- Signature: `editFacetGuides({ axes?, legend? })`.
- Requires an existing facet composition and at least one supplied guide policy. Omitted policy preserves current
  intent. `axes` accepts `"each" | "outer"`; `legend` accepts `false | "shared"`.
- Every child is rederived from the retained canonical unit state under the current scale policy before parent guide
  ownership is reconciled. Child guide configs come from retained unit children; parent-inferred shared legends never become
  child-owned guides. Removing a shared inferred legend also removes its parent-only config before recomposition.
  `"outer"` keeps only occupied-edge Cartesian axes for the current columns topology and is rejected for Polar,
  Parallel, and every `repeatCharts` composition. `"shared"`
  promotes one concretely compatible legend; incompatible independent child scales reject the complete call.
- Facet field/data/value order, child IDs, scale and layout policy, headers, title, selections and highlights are
  preserved. Earlier parent and child programs remain immutable.

### Formal values — `editFacetGuides`

- Implemented: `editFacetGuides({ axes?: "each" | "outer"; legend?: false | "shared" }): ChartProgram`.
- Polar and Parallel child-local guide replay is implemented; their outer-axis promotion is explicitly unsupported.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editFacetGuides`

- ✅ Covered: each↔outer ownership, false↔shared legend promotion, partial omission preservation, stable child IDs,
  immutable child replacement, incompatible shared legend atomicity, Polar/Parallel child-local guide preservation,
  outer-axis rejection, empty edit and non-facet rejection.
- Evidence: `test/unit/actions/composition/facet-editing.test.js`,
  `test/unit/actions/composition/facet-legend-families.test.js`, and
  `test/contracts/facet-policy-editing.test.js`,
  `test/contracts/polar-parallel-facets.test.js`.

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
- Evidence: `test/unit/actions/composition/concat.test.js`, `test/charts/program-composition/variants/layouts/public.test.js`,
  `test/charts/program-composition/variants/layouts/png.render.js`.

## `insertCompositionChild`

- Signature: `insertCompositionChild({ id, program, before?, after? })`.
- Adds one complete unit or nested composition under a new stable ID. `before` and `after` are mutually exclusive;
  omission appends. The referenced anchor must exist. Child validation precedes all state changes.
- Available only on concat compositions. The ordered child list is canonical and the complete namespaced snapshot is
  rematerialized without changing sibling references.

### Formal values — `insertCompositionChild`

- Implemented: `insertCompositionChild({ id: UserId; program: CompleteChartProgram; before?: UserId; after?: UserId }): ChartProgram`, with `before` and `after` mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `insertCompositionChild`

- ✅ Covered: before/after/tail insertion, duplicate ID, unknown anchor, incomplete child, concat-only scope,
  preserved sibling identity, complete rematerialization and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## `removeCompositionChild`

- Signature: `removeCompositionChild({ target })`.
- Removes exactly one named concat child and its snapshot. A concat may retain one child after editing; removing that
  final child is rejected. Tail and interior removal use the same layout reconstruction.

### Formal values — `removeCompositionChild`

- Implemented: `removeCompositionChild({ target: ExistingConcatChildId }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeCompositionChild`

- ✅ Covered: interior and tail removal, valid one-child concat, final-child and unknown-child rejection, stable
  remaining references, rematerialized geometry and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## `reorderCompositionChildren`

- Signature: `reorderCompositionChildren({ order })`.
- `order` must contain every current child ID exactly once, with no duplicate or unknown value, and must differ from
  the current order. Child references remain identical while placement and snapshots follow the new order.

### Formal values — `reorderCompositionChildren`

- Implemented: `reorderCompositionChildren({ order: NonEmptyExactConcatChildIdTuple }): ChartProgram`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `reorderCompositionChildren`

- ✅ Covered: exact permutation, missing, duplicate, unknown and unchanged order rejection, preserved child
  references, fresh-concat graphic equality and immutable failure.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

### Value coverage — named child structural editing

- ✅ Covered: before/after/tail insertion, duplicate/anchor/incomplete rejection, interior/tail removal, one-child
  concat, final-child rejection, exact reorder, fresh-concat graphic equality, immutable previous state and facet
  mutation rejection.
- Evidence: `test/unit/actions/composition/named-child-editing.test.js`,
  `test/contracts/composition-family-matrix.test.js`.

## Cross-feature integration contract

- A complete Cartesian, Polar or Parallel unit program may be a direct or nested `hconcat`/`vconcat` child. Each child keeps
  its semantic state, resolved scales, guides, selections, and immutable program identity; the parent stores only
  retained child programs plus a concrete namespaced Canvas snapshot.
- Replacing a nested child is explicit at every ancestor. Revise the leaf, call `replaceCompositionChild` on its
  immediate parent, and repeat for each outer parent. Earlier leaves and compositions remain unchanged.
- Automatic cross-axis sizing rematerializes unit children. Nested compositions keep their intrinsic layout and are
  placed inside the resolved slot using the outer composition's `align` policy instead of stretching their internal
  cells, gaps, or guide geometry.
- Every renderer applies each nested Canvas translation to both shape and text coordinates. PDF output preserves
  distinct child-local margins in `hconcat`/`vconcat`; a later child's text position includes its composition slot
  offset instead of falling back to the root or sibling origin.
- `facet` and `facetGrid` support the Cartesian families listed above plus Polar Point/Line/direct Arc/Pie/Rose/Radar
  and Parallel coordinates. Shared meaning domains are resolved across populated children while each child retains its
  own coordinate range/frame and local positional guides. `repeatCharts` additionally supports eligible Polar
  theta/r roles and one exact Parallel dimension; Pie/Radar and composite-role substitution remain explicit errors.
- Composition Canvas size remains derived from retained child Canvases. Resize a revised unit and pass it through
  `editFacetSource` to recompute every child range/frame; `editCanvas` itself remains a unit-program action.

### Value coverage — cross-feature integration

- ✅ Covered: direct and nested Polar concat, nested replacement and explicit ancestor propagation, immutable prior
  state, centered unequal snapshots, PDF text translation across unequal child margins, Cartesian/Polar/Parallel facet
  shared/independent scale and local-guide resolution, seven-family full-grid empties, non-Cartesian repeat roles,
  and explicit unsupported-role/outer-axis rejection.
- Evidence: `test/charts/cross-feature-integration/`,
  `test/contracts/composition-integration.test.js`,
  `test/contracts/polar-parallel-facets.test.js`, and
  `test/contracts/visual-capability-surface.test.js`, plus
  `test/unit/renderers/pdf-renderer.test.js` for backend translation parity.
