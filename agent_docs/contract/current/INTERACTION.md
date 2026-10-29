# Interaction session contract

## Classification and entry

`ggaction/interaction` exports `createInteractionSession({ program, bindings? })` as an advanced browser-safe controller function. It is not a wrapped action and does not change a program, action count, trace, renderer, or persisted schema. Full and Basic programs are supported. The default authoring and rendering entries do not import the controller.

`bindings` is an array containing zero or one `{ type: "inspect", events?, slop?, hitInvisible? }` records. Omission enables `pointermove` and `click`; `[]` keeps headless commands available without DOM listeners. Explicit events must contain one or two distinct values from those names. `slop` is a finite non-negative CSS-pixel distance; omission resolves to 3 for mouse/pen and 6 for touch. `hitInvisible` defaults to false. Unknown options, including editing bindings, clock and assetResolver, are rejected.

## Handle and commands

- `mount(element, { rootTransform? } = {})` accepts an event surface with `addEventListener`, `removeEventListener`, and `getBoundingClientRect`; public declarations use `Element`. It installs passive listeners and returns an idempotent unmount function. A later successful mount removes the previous listeners. Invalid frame/host setup preserves the previous state. `rootTransform` is an explicit six-number local-to-CSS affine matrix; omission is identity. CSS layout matrices and DPR are never guessed. The host renders the same program at the declared logical size and supplies any additional matrix.
- `dispatch({ type: "inspect", point, pointerType?, slop?, hitInvisible? })` accepts an explicit CSS-local `{x,y}`. The pointer type is mouse (default), pen, or touch. Mounted events subtract the current client rectangle once. Root matrices transform indexed shapes and clips, preserving slop in CSS pixels; localPoint remains the child Canvas coordinate. Empty viewports or singular matrices produce no hit with diagnostics.
- `dispatch({ type: "leave" })` clears the transient hit.
- `dispatch({ type: "frame", scene, version, generation })` snapshots a version-2 concrete Canvas scene. `generation` must equal current state and `version` must be a greater non-negative safe integer. Stale commands return `{status:"stale"}` without examining scene contents. Current frames retain known node keys, type and topology from the current program; subsets and concrete sampled coordinates are permitted. Unknown keys or changed topology fail atomically. Use the accepted `getState().scene` with `renderTransitionScene` so drawing and targeting share one exact snapshot. The session does not sample animations, schedule RAF, or infer geometry from endpoints.
- `updateProgram(program)` prepares the full replacement before committing it, increments frameVersion and generation, and clears transient hits. Earlier immutable programs and their indices are unchanged. Existing mounted bindings remain active.
- `subscribe(listener)` registers a synchronous listener and returns an unsubscribe function. Events are `{type,state}` with type inspect, leave, frame, program, mount, unmount, or destroy. Each state is an immutable snapshot. Reentrant commands run FIFO after the current event, at most 256 commands per drain and queued operations. Subscriber errors propagate, preserve the already published state, and discard pending work.
- `getState()` returns `{program,scene,frameVersion,generation,hit,mounted,destroyed}`. It remains readable after destruction and contains no host objects.
- `destroy()` removes listeners and disposes the active index once; first call returns true and later calls false. Pending work is discarded. Later dispatch, mount, subscribe, or updateProgram calls throw a disposed error.

Dispatch and updateProgram return `{status:"applied"|"queued"|"stale"}`. Reentrant calls return queued; invalid operations throw. No inspection creates a selection resource, persistent hover, authoring transaction, history entry or asset request.

## Hit results and semantic association

`hit` is null until inspection, or `{target,candidates,diagnostics,statistics,frameVersion}`. Target is the first candidate or null. Candidates contain `{itemKey,ownerId,role,childPath,rowKeys,resourceRefs,screenPoint,localPoint,distance,zIndex}`. Keys are opaque. Ordering is frontmost zIndex, nearest distance, then stable key/path/owner. All overlapping logical items remain in candidates; decorative parts of one item collapse once.

Mark metadata comes from the final materialized item identity and exact data/resource revision. Filtered-out graphics have no candidates. Guide roles are axis-tick, axis-title, legend-item, facet-header, and chart-title. Cartesian/Polar/Parallel tick marks and labels bind raw typed values, including wrapped/renamed labels; axis lines and grids remain decoration. Categorical legend layers and their clipped windows share a value item with the label; overflow summary is a distinct item. Continuous samples and tick labels bind the existing resolved sample values; an entire gradient strip is one range item. Legend titles are separate legend items; backgrounds remain decoration. Chart title/subtitle lines share their respective item. Facet headers belong to their composition, and child guides retain the actual childPath. Guide targets do not invent data lineage.

Filled paths honor nonzero/evenodd holes, strokes honor widths, dash gaps, caps and joins, and clips always exclude outside points. Transparent fill is targetable; fill none is not. Opacity zero is omitted unless hitInvisible is true. Text uses concrete per-line metric rectangles, including rotation and outline extent; it is not glyph-alpha picking. Images use their placed clipped viewport. Shadows do not expand hit geometry. Path approximation is bounded by 0.25 CSS px.

## Bounds and unsupported operations

Preparation supports at most 100,000 scene nodes and a 10,000,000-unit cumulative work budget; a query has a 2,000,000-unit budget. External frame snapshot work is bounded before canonical concrete validation. Guide layout reuse accounts for sample comparisons before computation. Frames containing accessors, cycles, unsupported objects, excessive work or mismatched semantic cardinality are rejected atomically.

Editing gestures, selection transactions, navigation, keyboard focus, async assets and history have no commands in this entry yet. PNG/PDF exports remain static; the controller targets the same concrete geometry in browser Canvas/SVG or a headless host.

Evidence: `test/unit/interaction-session.test.js`, `test/unit/hit-guides.test.js`, `test/unit/hit-program.test.js`, `test/unit/hit-frame.test.js`, `test/browser/interaction-session.browser.js`, `test/contracts/interaction-types.test.js`.
