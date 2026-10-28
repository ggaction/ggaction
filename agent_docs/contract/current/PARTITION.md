# Partition plots

## Shared contract

Full draws stored `layoutHierarchy({method:"partition"})` intervals as Cartesian rectangles or polar sectors. The hierarchy and layout contracts, typed key/path targets, label content, exact resource refs, source revision closure, facets and removal rules are owned by [HIERARCHY.md](HIERARCHY.md). Basic has no partition authoring methods. Renderers consume the same concrete rect/path/text output; restore validates stored intervals, view and mapping without running a layout algorithm.

A view changes projection, never hierarchy values or layout order. Focus is `null` (the current root), `{key:scalar}` for flat/nested input or `{path:scalar[]}` for grouped input. Focus must exist. `rootVisible:true` and `prunedSelection:"keep-hidden"` are defaults. A hidden root consumes no depth band. A synthetic forest root remains non-drawable. Zero totals retain node metadata and empty-value diagnostics; no equal-share area is invented. Inclusive residuals remain blank tails, not synthetic leaves.

All real nodes retain stable logical keys, original source lineage, fields and navigation metadata. `getMarkItems` reports visible geometry and `navigation` (parent, firstChild, sibling keys and root). Inspection reports focus, breadcrumb keys and diagnostics. Nonvisible nodes have no graphic or hit candidate. Label thresholds hide ink but retain the accessible name. Existing selection predicates remain active with keep-hidden; node-key/field predicates therefore retain selected hidden nodes and reappear on zoom-out. Property and aggregate selection predicates retain their existing reevaluation semantics. Explicit `drop` intersects the previous membership with visible node keys and stores the result through `editMarkSelection`; a later zoom-out does not resurrect those members.

A source revision which deletes explicit focus recovers the nearest surviving ancestor using the prior parent chain. If none survives, focus becomes the new root, or empty for an empty model. Inspection records the previous key and `ancestor`, `root` or `empty` reason. Explicit focus editing clears that diagnostic. Every dependent plot is preflighted before revision; a failure preserves the input program and trace.

Cartesian orientation is horizontal (value along x, depth along y) or vertical (value along y, depth along x). `reverseU` and `reverseV` reverse value/depth directions. Polar mapping uses degrees clockwise from 12 o'clock by default, `startAngle:0`, `sweep:360`, `direction:"clockwise"`, `innerRadius:0`, `outerRadius:"auto"`, `radiusPolicy:"equal-depth"`. Counterclockwise and equal-depth-area bands are explicit alternatives. Mapping follows the bound coordinate's effective frame and polarFrame; radii must fit the resolved available radius. Mapping fields remain stored when switching coordinate family. Coordinate/Canvas edits rematerialize that intent.

`padding` defaults to `[0,0]`; a scalar applies to both sibling and depth gaps. Values are nonnegative screen pixels. Cartesian gaps inset each side by half a gap; polar angular gaps use the local band mid-radius and radial gaps use pixels. Oversized gaps yield no ink, never negative geometry. `clip:false` is default. Cells and labels use the hierarchy style owner, including shared structured FillPaint; pattern origins and text bounds are resolved before concrete graphics are written. Labels default to false; enabling `{}` uses total values. `minWidth:0` and `minArcLength:0` are nonnegative pixel thresholds. Cell overrides and label text use exact typed node targets.

## `createPartitionPlot`

- Signature: `createPartitionPlot({ id?, layout?, coordinate?, focus?, rootVisible?, prunedSelection?, orientation?, reverseU?, reverseV?, padding?, innerRadius?, outerRadius?, startAngle?, sweep?, direction?, radiusPolicy?, clip?, cells?, labels? })`.
- Draw an icicle or sunburst from stored partition intervals.
- The first omitted ID is `partitionPlot`; another plot needs an explicit ID. Layout uses the current eligible partition layout, then the unique candidate; ambiguity fails. Coordinate uses the current eligible Cartesian/polar coordinate, then the unique candidate, otherwise creates Cartesian `main`. Multiple candidates or an occupied incompatible default fail. All own-data options are closed, undefined values fail, and the complete concrete result is validated before state changes.

### Formal values — `createPartitionPlot`

- Implemented: `createPartitionPlot(options?: TargetedOptions<PartitionPlotOptions>): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `createPartitionPlot`

- ✅ Covered: rectangular/polar intervals, orientation, focus, residual/forest/zero, labels and gaps, exact lineage, codec and primitive equivalence.
- Evidence: `test/unit/resources/partition-plots.test.js`, `test/charts/partition-layouts/public.test.js`, `test/charts/partition-layouts/png.render.js`, `test/contracts/hierarchy-types.test.js`.

## `editPartitionPlot`

- Signature: `editPartitionPlot({ target?, layout?, coordinate?, focus?, rootVisible?, prunedSelection?, orientation?, reverseU?, reverseV?, padding?, innerRadius?, outerRadius?, startAngle?, sweep?, direction?, radiusPolicy?, clip?, cells?, labels? })`.
- Edit projection, focus, paint and labels while retaining logical node identity.
- Target uses the current eligible partition plot, then a unique candidate. A nonempty patch is required. Omission preserves stored intent; `focus:null` returns to the current root, `outerRadius:"auto"` follows its coordinate and `labels:false` disables labels. A replacement layout must be partition and contain any retained explicit focus. Override arrays replace prior arrays. An invalid focus, incompatible layout/coordinate, malformed mapping, excessive work or concrete geometry fails atomically.

### Formal values — `editPartitionPlot`

- Implemented: `editPartitionPlot(options: TargetedOptions<EditPartitionPlotOptions>): ChartProgram` (Full only).
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): No additional options.

### Value coverage — `editPartitionPlot`

- ✅ Covered: focus/reset, keep-hidden/drop, source focus recovery, layout order, coordinate/Canvas edits, malformed restore and immutable failure.
- Evidence: `test/unit/resources/partition-plots.test.js`, `test/charts/partition-layouts/public.test.js`, `test/contracts/hierarchy-types.test.js`.
