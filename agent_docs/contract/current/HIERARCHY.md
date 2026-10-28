# Hierarchy resources and plots

## Shared contract

Full supports these resource and chart actions; Basic has neither their methods nor primitive acceptance for hierarchy/layout kinds. Resource IDs are explicit and use the existing user-ID grammar. Omitted data, hierarchy and edit targets use the current eligible resource, then one unique candidate; an ambiguous set never chooses its first element. Options are closed own-data records and undefined values fail.

Hierarchy meaning and exact input refs live in semantic resources. Layout options occur once and results store backend-neutral numeric geometry. Editable restore validates the stored envelope, node topology, source lineage, options, references and finite geometry without rerunning a layout algorithm. Renderers consume only concrete graphics. Empty hierarchies remain empty; zero-total models retain an explicit empty-value diagnostic. Node and work limits reject before unbounded output.

Plot style is materialization configuration. Label content is semantic; labels default to false. Enabling `{}` means total-value labels, #0f172a, 12px sans-serif normal, center/middle, with offset [0,14] for trees and [0,0] for treemaps. Body and label overrides use `{key}` for flat/nested data or `{path}` for groups. Typed paths retain null only under missingCategory include. Duplicate or absent authoring targets fail. Overrides retained after a data revision become dormant and produce orphan-style diagnostics until the exact key returns. Label text overrides are strings. Body radius/strokeWidth are nonnegative, opacity is [0,1], fontSize is positive, and colors/fontFamily are nonempty strings.

Selection operates on final nodes and selects body plus label; links are excluded. Exact resource lineage and actual member rows are preserved. Concat scopes refs and keys to each child. Facets support complete subtree partitions and reject orphaned partitions. Repeat positional field substitutions do not apply to these resource-backed marks. Canvas edits place stored geometry again without rerunning the layout. Source and parameter revisions recompute affected hierarchy/layout/plot closures once and keep unrelated branches shared.

## `createHierarchyData`

- Signature: `createHierarchyData({ id, data?, key?, parent?, children?, groupFields?, value, valueMode?, forest?, missingCategory?, maxNodes? })`.
- Create a typed hierarchy from flat parent rows, nested children, or grouped paths.
- Exactly one source form is required: `key + parent`, `key + children`, or `groupFields`. Typed keys distinguish numbers, strings and booleans. Values are finite and nonnegative. `leaf-sum` is the default; `inclusive` validates parent totals, and `own-plus-children` adds each own value to its children. Groups support only leaf sums. `forest:false`, `missingCategory:"error"` for groups, and `maxNodes:10000` are the defaults. An enabled forest or grouped source uses a synthetic root with no source contribution. Missing parents, cycles, duplicate keys and invalid values fail. Nested lineage retains the actual source member path.

### Formal values — `createHierarchyData`

- Implemented: `createHierarchyData(options: CreateHierarchyDataOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `createHierarchyData`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `editHierarchyData`

- Signature: `editHierarchyData({ target?, data?, key?, parent?, children?, groupFields?, value?, valueMode?, forest?, missingCategory?, maxNodes? })`.
- Revise hierarchy input options and refresh every dependent layout and plot atomically.
- Omitted options retain stored intent; the source form cannot change. A nonempty patch is required. A new data binding must resolve to a materialized dataset. Every dependent layout receives one new revision; its plots, labels and selections refresh. Raw and computed source revisions follow the same closure. Input programs and traces remain unchanged when any consumer fails.

### Formal values — `editHierarchyData`

- Implemented: `editHierarchyData(options: EditHierarchyDataOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `editHierarchyData`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `layoutHierarchy`

- Signature: `layoutHierarchy({ id, hierarchy?, method, order?, options? })`.
- Compute an explicit tree, treemap, or normalized partition layout from a named hierarchy.
- `method` is `tree`, `treemap`, or `partition`. Tree requires finite nonnegative `nodeSize:[breadth,depth]`, `siblingGap`, `depthGap` and `orientation:"vertical"|"horizontal"|"radial"`. Radial additionally requires nonnegative `radius`, finite `startAngle` and `sweep` in `(0,360]` degrees. Treemap requires positive finite `size:[width,height]`, nonnegative `padding`, and `method:"slice-dice"|"squarify"`. Partition accepts only optional `maxNodes`. Input order is default; key/value ordering requires an explicit ascending/descending direction, and field ordering additionally requires a field, with optional nulls first/last and year/timestamp temporal unit. Ambiguous grouped sort fields fail. Layout results retain exact hierarchy revisions and numerical geometry.

### Formal values — `layoutHierarchy`

- Implemented: `layoutHierarchy(options: LayoutHierarchyOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `layoutHierarchy`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `editLayout`

- Signature: `editLayout({ target?, order?, options? })`.
- Change a layout order or method-specific options and refresh its plot consumers.
- The existing layout method remains fixed. `options` is a partial patch of that method. Changing a radial tree to vertical/horizontal removes its radial-only options. The proposed geometry and every plot are checked before state-changing child actions. Layout numeric intent has one owner and is independent of Canvas placement.

### Formal values — `editLayout`

- Implemented: `editLayout(options: EditLayoutOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `editLayout`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `removeResource`

- Signature: `removeResource({ kind, id, cascade? })`.
- Remove a named stored resource after checking exact dependencies.
- `kind` identifies a stored resource; data, scale and coordinate use their existing dedicated removers. Restrict is default. `cascade:true` may remove generated dependents; authored dependents and live hierarchy plots still require explicit removal first. `removeMark` releases a plot while retaining its hierarchy/layout for reuse. Basic does not expose this method.

### Formal values — `removeResource`

- Implemented: `removeResource(options: RemoveStoredResourceOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `removeResource`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `createTreePlot`

- Signature: `createTreePlot({ id?, layout?, origin?, clip?, nodes?, links?, labels? })`.
- Draw hierarchy nodes and parent links from a stored tree layout.
- The omitted first ID is `treePlot`; another tree plot needs an explicit ID. The layout must use method tree. Omitted layout uses current eligible context, then the unique eligible resource; ambiguity fails. Nodes default to radius 6, fill #2563eb, stroke #ffffff, width 1 and opacity 1. Links default to #94a3b8, width 1.5 and opacity 1; false disables them. `origin:"auto"` centers stored bounds in the plot frame; explicit `[x,y]` is plot-local. `clip:false` is default.

### Formal values — `createTreePlot`

- Implemented: `createTreePlot(options: TreePlotOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `createTreePlot`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `editTreePlot`

- Signature: `editTreePlot({ target?, layout?, origin?, clip?, nodes?, links?, labels? })`.
- Edit tree nodes, links, labels, placement, or the bound tree layout.
- A nonempty patch is required. Omitted values preserve style, meaning and placement; `links:{}` reenables links with stored/default style. New layout bindings require method tree. Unchanged node keys retain selection identity when geometry or order changes.

### Formal values — `editTreePlot`

- Implemented: `editTreePlot(options: EditTreePlotOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `editTreePlot`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `createTreemapPlot`

- Signature: `createTreemapPlot({ id?, layout?, origin?, clip?, cells?, labels? })`.
- Draw nested rectangles from a stored treemap layout.
- The omitted first ID is `treemapPlot`; another owner needs an explicit ID. The layout must use method treemap. Cells default to fill #3b82f6, stroke #ffffff, width 1 and opacity 1. Origin and clipping match tree plots. Internal labels are hidden when padding leaves no label band; zero-value rectangles retain finite zero-area geometry.

### Formal values — `createTreemapPlot`

- Implemented: `createTreemapPlot(options: TreemapPlotOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `createTreemapPlot`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

## `editTreemapPlot`

- Signature: `editTreemapPlot({ target?, layout?, origin?, clip?, cells?, labels? })`.
- Edit treemap cells, labels, placement, or the bound treemap layout.
- A nonempty patch is required. Omission preserves prior values; a new layout must use method treemap. Cell overrides and label identity follow the exact typed node keys, independently from rectangle order.

### Formal values — `editTreemapPlot`

- Implemented: `editTreemapPlot(options: EditTreemapPlotOptions): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `editTreemapPlot`

- ✅ Covered: explicit and inferred identity, closed options, immutable lifecycle, exact references, stored validation and dependent concrete output.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-plots.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/resources/hierarchy-validation.test.js`, `test/contracts/hierarchy-types.test.js`, `test/charts/tree-layouts/public.test.js`, `test/charts/treemap-layouts/public.test.js`.

