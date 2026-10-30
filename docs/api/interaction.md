---
layout: default
title: Inspect chart items
description: Inspect overlapping marks and guides in Canvas or SVG while preserving an immutable chart program.
---

# Inspect chart items

{% include chart-example.html id="inspect-chart" lead=true %}

Use `createInteractionSession` from `ggaction/interaction` to inspect the logical
items under a pointer. It supports Full and Basic programs, browser Canvas and
SVG surfaces, and headless CSS-point queries. The program remains immutable.
See the [complete browser recipe](../recipes/inspect-chart.md) for setup.
This is an advanced controller function, not a chainable authoring action.

## Create and mount

Continue from a rendered `program` and its Canvas or SVG root element:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { createInteractionSession } from "ggaction/interaction";
const session = createInteractionSession({ program });
const unsubscribe = session.subscribe(({ state }) => {
  console.log(state.hit?.target, state.hit?.candidates);
});
const unmount = session.mount(element);
```

The default binding inspects `pointermove` and `click`, and clears the transient
hit on `pointerleave`. Supply `bindings: []` for headless dispatch, or one
`{ type: "inspect", events: ["click"], slop: 0, hitInvisible: false }` binding.
Events must be distinct `pointermove` or `click` values. Unknown options and
binding types are rejected.

`mount(element, { rootTransform })` accepts an optional six-number
`[a,b,c,d,e,f]` affine matrix mapping chart coordinates to CSS-local coordinates.
Identity is the default. The host owns CSS layout and any additional transform;
the session does not infer them. Client coordinates subtract the current element
rectangle once. Device pixel ratio is never multiplied into hit coordinates.
Slop remains in CSS pixels under scale or rotation. Use matching logical dimensions
for the rendered chart and surface when no root matrix is supplied.

## Observe the mounted surface size

Opt into `mount(element, { observeResize: true })` to receive `resize` events from the
mounted element's browser `ResizeObserver`. `event.size` contains finite, non-negative
`width` and `height` in content-box CSS pixels. Identical measurements are deduplicated;
a collapsed surface may report zero. DPR and `rootTransform` do not alter these numbers.
Observation alone never edits the chart, creates history or changes its revision.

Continue from a Full `program` with a Canvas and a rendered DOM `element`. This host
policy explicitly resizes the native Canvas; choose your own native projection policy
when a map needs fitting or a preserved viewport.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { createInteractionSession } from "ggaction/interaction";
const resizeSession = createInteractionSession({ program, bindings: [] });
const stopResize = resizeSession.subscribe(event => {
  if (event.type !== "resize" || event.size.width === 0 || event.size.height === 0) return;
  const { width, height } = event.size;
  resizeSession.updateProgram(({ program }) => program.editCanvas({ width, height }),
    { history: "record", origin: "programmatic" });
});
const stopObservation = resizeSession.mount(element, { observeResize: true });
function disposeResize() {
  stopResize(); stopObservation(); resizeSession.destroy();
}
```

Render accepted `program` events using your existing Canvas or SVG renderer. Keep the
surface's CSS dimensions controlled by its container to avoid a render/resize loop.
Async native work and assets use the same prepared-update cancellation contract below.
Remount, unmount and destroy disconnect the observer; previous observers cannot publish
late events. Observation defaults to `false`. An unsupported host or failed observer setup
rejects the attempted mount while preserving the previous mounted surface.

## Prepare assets before committing

Supply `assetResolver` when a candidate needs asynchronous image, font or shadow preparation.
The session keeps the previous committed program and history until the new lease is ready.
Superseding edits and destroy abort the request; a late result is released without committing.
`whenSettled()` observes the request current at the call and returns a settled, cancelled or error
result. Native transaction events keep their existing commit/settled/error/cancel phases.
Initial and external preparation use an `assets` event with a separate `status` field.

Continue from an immutable `program` containing retained images, a Canvas `context`, and an
explicit `interactionBindings` array (use `[]` for commands without pointer editing):

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `signal`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { prepareImageRendering, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const assetSession = createInteractionSession({
  program,
  bindings: interactionBindings,
  async assetResolver({ program, frame, signal }) {
    const bitmaps = [];
    const dispose = () => { for (const bitmap of bitmaps.splice(0)) bitmap.close(); };
    let ready = false;
    try {
      const images = await prepareImageRendering(frame ?? program, {
        signal,
        async decode({ bytes, mimeType }) {
          const image = await createImageBitmap(new Blob([bytes], { type: mimeType }));
          if (signal.aborted) { image.close(); signal.throwIfAborted(); }
          bitmaps.push(image);
          return { image, width: image.width, height: image.height, originClean: true };
        }
      });
      ready = true;
      return { images, dispose };
    } finally { if (!ready) dispose(); }
  }
});
const stopDrawing = assetSession.subscribe(event => {
  const state = event.state;
  if (state.destroyed) return;
  const current = state.previewFrame ?? state.animationFrame ?? state.previewProgram ?? state.program;
  const assets = state.previewFrame ? state.previewAssets : state.animationFrame ? state.frameAssets
    : state.previewProgram ? state.previewAssets : state.assets;
  if (assets) render(current, context, assets);
});
await assetSession.whenSettled();
const disposeAssets = () => { stopDrawing(); assetSession.destroy(); };
```

Use the existing font and shadow preparation functions in the same callback when required,
and release their handles in the lease's `dispose`. Release partially acquired resources if
preparation throws. Prepared handles belong to the exact committed program; undo/redo/reset
prepare the restored snapshot again. `state.assets` exposes only the accepted rendering handles;
`state.preparation` exposes the pending transaction, generation, base revision and scoped resource
revisions. With editing bindings, the same resolver prepares each exact preview.
`previewProgram`, `previewAssets` and its hit frame appear together only when ready. While a new
preview is pending, the previous accepted frame remains visible. New samples abort older pending
work; cancellation restores the committed program and releases transient handles. Initial asset
preparation must finish before editing capture begins. Final release prepares the latest candidate
through the ordinary commit path and adds one history entry. The host still owns drawing and
public animation-frame preparation.

## Undo, redo and reset

The session retains up to `historyLimit` committed snapshots (default 100; integer 0–10000).
A drag with many preview frames adds one entry on release. Cancellation, failed commands,
inspection and unchanged native commands add none. Set `historyLimit: 0` to disable undo/redo.

Use the same dispatch path from host buttons, keyboard controls or headless code:

<!-- snippet-context:start -->

> **Executable complete.** Run this ES module headlessly. The final program restores the Original note; history commands take no target or payload.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const initial = chart().createCanvas()
  .createAnnotation({ id: "note", space: "screen", x: 40, y: 60, text: "Original" });
const historySession = createInteractionSession({ program: initial, bindings: [], historyLimit: 20 });
historySession.dispatch({ type: "annotate", target: "note", payload: { text: "Revised" } });
historySession.dispatch({ type: "undo", origin: "user" });
historySession.dispatch({ type: "redo", origin: "user" });
historySession.dispatch({ type: "reset", origin: "user" });
const program = historySession.getState().program; // The original immutable program.
const { undoCount, redoCount, limit } = historySession.getState().history; // 2, 0, 20.
historySession.destroy();
```

Undo and redo restore the exact committed program and its selection state, including hidden
membership and linked selections. Bindings stay mounted. Reset restores the program supplied when
the session was created, even after external replacements; it is distinct from `clearSelection`.
A changed reset is itself undoable. An empty undo/redo or an already-initial reset cancels an active
preview without creating a commit. New commits discard the redo branch.

`updateProgram(nextProgram, { history: "record", origin: "programmatic" })` records the previous
snapshot when the program reference changes. Omit the options, or use `history: "reset"`, to clear
undo and redo on external replacement. Neither changes the initial reset baseline. The `program`
event reports the chosen `history` policy and origin. Every successful replacement cancels an active
preview. Runtime history is not serialized; recreate a session after loading a saved program.

History commands use the same transaction IDs, origins, FIFO reentry and commit/settled events as
native edits. Each restore advances revision and generation, rejecting earlier frame results.
The event's `previous` and `current` are immutable snapshot references. Reset and recorded external
replacements affect the whole program and report `affectedOwners: []`; undo/redo of native edits
retain that transition's owners. A restore has `selectionChanges: []` because it restores saved
selection state; read `state.linkedSelections` or inspect `current` for its exact membership.

## Inspect without a DOM

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `session`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
session.dispatch({ type: "inspect", point: { x: 126, y: 182 }, pointerType: "mouse" });
const { target, candidates } = session.getState().hit;
session.dispatch({ type: "leave" });
```

`point` is CSS-local. Pointer type is `mouse` by default, or `pen` or `touch`.
Stroke slop defaults to 3 CSS pixels for mouse/pen and 6 for touch; a finite
non-negative `slop` overrides it. `hitInvisible: true` includes opacity-zero
items. Clips still apply.

A candidate contains opaque `itemKey`, `ownerId`, `role`, `childPath`, `rowKeys`,
`resourceRefs`, `screenPoint`, `localPoint`, `distance`, and `zIndex`. The first
candidate is the target. All overlapping logical items remain in `candidates`,
ordered front to back, then by distance and stable identity. A body and its label
produce one logical candidate. `localPoint` uses the owning child Canvas.

Marks retain final-item grain and exact data/resource revisions. Guides have
roles `axis-tick`, `axis-title`, `legend-item`, `facet-header`, and `chart-title`.
Renaming a label does not change its raw value identity. Facet headers belong to
their parent composition; nested marks and guides retain their child paths.

Paths honor fill holes and painted dash runs. Transparent fill differs from
`none`. Text targets its concrete per-line metric rectangles, including rotation
and outline extent; images target their clipped viewport. Shadows do not enlarge
hit geometry. Path approximation is bounded by 0.25 CSS pixels.

## Replace a program or sampled frame

Call `session.updateProgram(nextProgram)` after an authoring edit. Replacement is
atomic and clears transient hits. It increments both `frameVersion` and
`generation`; mounted listeners stay active.

For frames returned by `sampleTransition` or `createAnimationPlayer` from
[`ggaction/animation`](animation.md), dispatch
`{ type: "frame", frame, version, generation }`. Supply the exact returned frame,
not a clone, and keep the session's current native program as a displayed contributor
or a direct endpoint of the plan. A restored offline plan can render, but it has no
native program authority for session targeting. `frame` and `scene` are mutually exclusive.

Maintain an increasing host counter greater than the current `frameVersion` and every
previous request, including requests still preparing. Use the current session generation.
Stale requests return `stale` without examining their frame. Entering, exiting and weighted
shapes use their actual displayed geometry for inspection; keyboard activation additionally
requires that the logical item exists in the session's current program. A geographic feature or its attached Text label may be hidden by the committed projection yet appear in the sampled frame. It can be selected when its exact owner, child scope, logical feature key and geometry or projection resource still exist in the current native program. Each endpoint revision is validated independently. Fully clipped or transparent parts cannot gain activation through source membership. The command stores the existing logical key and returns to the native picture; highlights apply when that picture contains the item. Attached labels retain their source selection; projection clipping does not remove their logical membership.

With `assetResolver`, prepare against `request.frame ?? request.program`. While the frame's
assets prepare, the previous accepted picture and focus remain active. A successful `frame`
event publishes the exact `state.animationFrame`, scene, focus and `state.frameAssets` together.
Render the accepted animation frame with those handles; `state.assets` remains bound to the
committed native program. A failed or cancelled request preserves the previous display.
Native edits and program replacements clear the transient animation frame and release its
lease. Frames themselves add no history entry. The same flow accepts a reduced-motion player's
final frame; the host owns playback policy.

An animation host may supply a sampled version-2 Canvas scene whose node keys,
types and topology belong to the current program. Render the accepted snapshot:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `session`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { renderTransitionScene } from "ggaction/scene";
const state = session.getState();
const result = session.dispatch({
  type: "frame", scene: sampledScene,
  version: state.frameVersion + 1, generation: state.generation
});
if (result.status === "applied") {
  renderTransitionScene(session.getState().scene, context);
}
```

The host creates `sampledScene`; the controller does not sample animations or
schedule frames. A stale generation or non-increasing version returns
`{ status: "stale" }` without reading scene contents. Unknown nodes, changed
topology, invalid concrete values, and excessive work fail without replacing the
current frame. A caller-owned scene is copied before use. Omitted nodes are not
hit targets in that frame.

## State and cleanup

`getState()` returns an immutable snapshot with `program`, `scene`, `frameVersion`,
`generation`, `revision`, `hit`, `mounted`, and `destroyed`. A hit contains `target`,
`candidates`, `diagnostics`, `statistics`, and `frameVersion`. Singular transforms
and empty viewports produce no hit plus diagnostics.

Subscribers receive `{ type, state }`; event types are `inspect`, `contextMenu`, `leave`, `frame`,
`program`, `mount`, `unmount`, and `destroy`. Dispatch and program updates return
`{ status: "applied" | "queued" | "stale" | "unchanged" }`. Reentrant operations run FIFO after
the current event, with a 256-command bound. Subscriber errors propagate and
clear queued work; the already published state remains available.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `session`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
unsubscribe();
unmount();
session.destroy();
```

Mounting another element removes the old listeners. Unmount is idempotent.
`destroy()` removes listeners, disposes the current index, and discards pending
work; it returns true once and false thereafter. Terminal state remains readable;
mutating session methods reject further work.

Preparation is limited to 100,000 scene nodes and 10,000,000 work units; queries
are limited to 2,000,000 units. Work includes geometry, metadata and guide sample
comparisons. The session does not persist host objects or hover state. Keyboard navigation and asset loading are not editing commands; the optional resolver prepares assets before accepting a candidate. PNG/PDF exports remain static.


## Commit selections and parameters

Full programs also accept `select`, `clearSelection`, and `setParameter` commands.
They call the same authoring actions used outside a session, prepare the new hit
frame, and publish the immutable result together. Basic programs support inspection
and reject these editors.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete ES module with its inline observations and public imports. The session commits one named selection, then clears it without changing the earlier program.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const program = chart().createCanvas({ width: 360, height: 240 })
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
  .selectMarks({ id: "picked", target: "points", items: [] })
  .highlightMarks({ selection: "picked", color: "red", dimOthers: false });
const selectionSession = createInteractionSession({ program, bindings: [] });
selectionSession.dispatch({
  type: "select", target: "points",
  payload: { id: "picked", select: { field: "x", op: "gte", value: 2 } }
});
const selectedProgram = selectionSession.getState().program;
selectionSession.dispatch({
  type: "clearSelection", target: "points", payload: { id: "picked" }
});
selectionSession.destroy();
```

Render `selectedProgram` with any supported renderer. Selection authoring remains
immutable; `program` still has an empty selection. In a mounted application,
subscribe to transaction events and render `event.current` when
`event.phase === "commit"`. A host click handler can pass an inspected item's
`itemKey` as `payload.select.items` and use `mode: "toggle"` to update a previously
created selection. Inspecting or hovering alone never changes a selection.

Every command identifies one owner. Use a mark ID for selection or a parameter ID
for `setParameter` with `payload: {value}`. For a child chart, use
`target: {childPath: ["left"], id: "points"}`. A facet source uses the same shape
with `facetSource: true`; generated facet cells cannot be edited individually.

`select` accepts the existing item, range, row or expression selector and defaults
to `replace`. Creating a missing selection requires `replace`; existing selections
also support `add`, `toggle`, `subtract`, and `intersect`. Its owner cannot change.
`clearSelection` keeps the named resource and dependent labels/highlights, replacing
its membership with an explicit empty set. It does not reset the chart.

Transaction events include `type`, `phase`, `transactionId`, `origin`, `revision`,
`previous`, `current`, `affectedOwners`, `diagnostics`, and `state`. The successful
order is `commit` then `settled`. `settled` confirms program/frame preparation and, when configured, successful assetResolver preparation; the host still owns drawing. The
addressed owner is reported with its child path. A failed valid command emits one
`error` and throws while retaining the prior program. Unsafe input is rejected
before a transaction starts.

`transactionId` is optional; supplied IDs contain 1–1,024 characters. Origin is
`programmatic` by default, or `user`, `replay`, or `linked`. Optional
`causeTransactionId` records a relationship without automatically forwarding edits.
Repeated IDs within one reentrant FIFO drain are ignored as stale. An unchanged
parameter value returns `unchanged` with no event or revision. Subscriber errors
stop delivery and preserve a commit already made. Runtime bindings and transaction
metadata are not serialized with the chart.

## Filter and reorder a view

Use `filter` to call the existing mark filter through the same atomic session.
The payload is `{select,mode?,recompute?}` or `{clear:true}`. `select` uses the
inline [mark selector](appearance/selection-and-highlighting.md); named selection
expressions, region and screen metadata are not inline filters. Native replace/
compose and inferred-graph recompute rules remain unchanged. Clear restores that
filter's source while preserving other authored state.

Use `reorder` with `{channel,values}` or `{channel,by,direction?}` to apply the
existing [category order](position/category-ordering.md). Channel is `x`, `y`, or
`theta`. `{channel,clear:true}` removes an active order. These commands update the
native data, geometry and guide consumers before committing the new hit frame.
They preserve source row order and use the existing selection lifecycle policy.
Basic programs reject these editors.

<!-- snippet-context:start -->

> **Executable complete.** Install ggaction and import the authoring and interaction entries.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const controls = createInteractionSession({
  program: chart().createCanvas({ width: 360, height: 240 })
    .createData({ values: [{ category: "A", value: 2 }, { category: "B", value: 5 }] })
    .createBarPlot({ id: "bars", x: "category", y: "value", guides: false }),
  bindings: []
});
controls.dispatch({ type: "filter", target: "bars",
  payload: { select: { field: "category", op: "eq", value: "B" } } });
controls.dispatch({ type: "filter", target: "bars", payload: { clear: true } });
controls.dispatch({ type: "reorder", target: "bars",
  payload: { channel: "x", values: ["B", "A"] } });
const orderedProgram = controls.getState().program;
controls.destroy();
```

Each successful command publishes one `commit` followed by `settled`, including
dependent linked selections. Invalid options leave the previous program and frame
intact. Clearing a filter or order is an explicit operation; combining `clear`
with replacement options is an error.


## Link named selections

Use an explicit `linkSelection` binding to project existing selections into another
owner. Each source contributes its own set of target items. `union` includes any
source, `intersection` requires every source, and `global` uses exactly one source.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete ES module with its inline keyed observations and public imports. One selection command updates both explicitly linked child owners.

<!-- snippet-context:end -->

```javascript
import { chart, hconcat } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const child = chart().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: [
    { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }
  ] })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
  .selectMarks({ id: "picked", target: "points", items: [] })
  .highlightMarks({ selection: "picked", color: "red", bringToFront: false });
const program = hconcat({ programs: [
  { id: "left", program: child }, { id: "right", program: child }
] });
const linked = createInteractionSession({ program, bindings: [{
  type: "linkSelection", id: "sameRows", resolve: "global",
  sources: [{
    target: { childPath: ["left"], id: "points" }, selection: "picked",
    projection: { type: "rows", sourceData: "rows", targetData: "rows" }
  }],
  target: { childPath: ["right"], id: "points" }, selection: "picked"
}] });
linked.dispatch({ type: "select", target: { childPath: ["left"], id: "points" },
  payload: { id: "picked", select: { field: "id", op: "eq", value: "a" } }
});
const selected = linked.getState().program;
const projectedKeys = linked.getState().linkedSelections[0].keys;
linked.destroy();
```

Render `selected` with any supported renderer. The edit and its linked targets
produce one commit/settled pair. A failure preserves the complete prior program.
The original `program` and `child` remain unchanged. Add an explicit `inspect`
binding to the array if mounted pointer inspection is also needed.

Row projections require matching original data identities, including through
supported derived-data lineage. Independently created datasets with the same name
are different sources. To link independent tables, provide
`projection: {type: "fields", sourceFields: ["category"], targetFields: ["group"]}`.
Each tuple has 1–64 fields, equal source/target length, and a unique value per
final item. Matching is typed: number `1` differs from string `"1"`. Missing,
ambiguous, null or nonfinite values fail; duplicate tuples select all matching
target items. Empty endpoints provide no inferred values.

All endpoint selections must exist and match their owner. A target owner has one
binding writer; cycles are rejected. Its target selection cannot be overwritten
by a direct session selection command. Other named selections stay independent.
Facet links address `facetSource: true` and use semantic source items; concrete
property predicates are unavailable there. Generated cells remain read-only.

Initialization and ordinary external `updateProgram` replacements validate links without changing
selection membership. Missing endpoints and pruning use the lifecycle policy below. Authoring changes update affected links in
source-to-target order, once per target. `linkedSelections` exposes immutable
source-specific projection sets and their resolved keys. Bindings allow at most
256 links and 256 total source references, with bounded configuration and
projection work. They remain runtime state: serialize the committed chart as
usual and attach the bindings again after restoring it.


## Filter another view from a selection

Use `linkFilter` to make a source selection control a target's native filter.
The target's existing selection identifies its item grain. Its membership stays
independent, so target selections can still be edited or brushed. Projections and
`union`, `intersection`, and `global` resolution follow linked selections above.

<!-- snippet-context:start -->

> **Executable complete.** Run this ES module with its inline observations. Selecting a in the source leaves only a in the target view.

<!-- snippet-context:end -->

```javascript
import { chart, hconcat } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const child = chart().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: [
    { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 4 }
  ] })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
  .selectMarks({ id: "picked", target: "points", items: [], empty: "all" });
const program = hconcat({ programs: [
  { id: "source", program: child }, { id: "target", program: child }
] });
const filterSession = createInteractionSession({ program, bindings: [{
  type: "linkFilter", id: "filterRows", resolve: "global",
  sources: [{
    target: { childPath: ["source"], id: "points" }, selection: "picked",
    projection: { type: "rows", sourceData: "rows", targetData: "rows" }
  }],
  target: { childPath: ["target"], id: "points" }, selection: "picked"
}] });
filterSession.dispatch({ type: "select",
  target: { childPath: ["source"], id: "points" },
  payload: { id: "picked", select: { field: "id", op: "eq", value: "a" } }
});
const filteredProgram = filterSession.getState().program;
filterSession.destroy();
```

Render `filteredProgram` with any supported renderer. A wider source selection
restores target items because matching uses its unfiltered universe. Empty-none
produces an empty target; empty-all contributes every current source item.

The binding owns the target filter. A pre-existing filter stays during session
creation and is replaced on the next relevant source transaction. Direct session
filter commands to that target are rejected. Filter and selection bindings share
one writer per target and must form an acyclic graph. Filters refresh target
selection visibility before downstream links run, following `selectionPolicy`.

Each source command, all dependent filters and selections, and the hit frame
publish one commit. Errors preserve the prior state; brush cancellation discards
the preview. External source projection changes passed to `updateProgram` also
refresh the filters. Missing targets stay absent. `linkedSelections` identifies
these records with `effect: "filter"`.

Serialize the committed chart normally and reattach bindings after restoration.
Destroying the session keeps the committed filter. This authoring binding requires
Full and the target's existing native filter support.

## Select the nearest item

Use `nearest` instead of `select` in a selection command. The selection must already exist on the
explicit mark owner. This complete headless example chooses the observation nearest to `[2, 3]`
in raw data units:

<!-- snippet-context:start -->

> **Executable complete.** Run the complete ES module with its inline keyed observations and public imports. Explicit Euclidean data distance selects observation b.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { getMarkItems } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";
const original = chart().createCanvas({ width: 300, height: 200 })
  .createData({ id: "rows", keyField: "id", values: [
    { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }
  ] })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
  .selectMarks({ id: "picked", items: [] })
  .highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false });
const session = createInteractionSession({ program: original, bindings: [] });
session.dispatch({ type: "select", target: "points", payload: {
  id: "picked", nearest: { space: "data", fields: ["x", "y"], values: [2, 3],
    metric: "euclidean", maxDistance: 1 }
} });
const program = session.getState().program;
const selected = getMarkItems(program, { target: "points" })
  .filter(item => item.properties.fill === "red").map(item => item.fields.id);
session.destroy();
// selected is ["b"].
```

For screen distance, supply `nearest: { space: "screen", point: { x, y }, maxDistance: 12 }`.
The point and distance use CSS-local pixels in the current accepted frame. Filled interiors have
zero distance; outside points measure the nearest painted fill edge or stroke, including dash gaps.
Clipped-out intervals are excluded, and the query point must itself be inside every clip. Opacity-zero
items require `hitInvisible: true`. Text uses its metric rectangles, images their placed viewport,
and shadows do not enlarge the target. Path approximation remains 0.25 CSS pixels.

Data distance requires `euclidean` or `manhattan`, 1–64 explicit numeric fields and an equal-length
query tuple. It does not normalize units. Missing, null, nonnumeric, ambiguous aggregate values and
distance overflow reject the whole command, including linked changes. Facet sources support data
nearest; screen nearest requires a root or explicit concat child owner with one concrete frame.

The finite non-negative `maxDistance` is required and inclusive. Ties choose the smallest opaque
logical item key, independently of draw order. A miss supplies an empty set to the existing `mode`:
`replace` clears, and add/toggle/subtract/intersect retain their normal set behavior. The resulting
selection stores keys and survives serialization; nearest is not a continuously evaluated predicate.
It commits with the same transaction, linked-selection and failure behavior as ordinary selection.


## Keep or drop hidden selections

Pass `selectionPolicy: "keep-hidden"` (the default) to preserve selections when a filter,
partition focus or removed child hides their logical items. Matching selected keys can become visible
again. Geographic detail changes preserve the original selected region while a visible region explicitly
represents it. Hidden/restored events keep the original selection key; current hits use the visible region.
Use `selectionPolicy: "drop"` to replace affected membership with its surviving item keys.
A live range or predicate becomes a key snapshot only when items must be dropped. Explicitly authored
replacement selection options take precedence. Opacity zero and sampled animation frames do not count
as removed items.

Program replacement events and transaction events expose `event.selectionChanges`, with each change
containing `target`, `selection`, `policy`, `ownerMissing`, `hiddenKeys`, `restoredKeys` and `droppedKeys`.
The arrays use opaque logical keys in the owner's child scope. Unchanged hidden state does not repeat
an event. Render the session's accepted program after replacement: drop may add native selection edits.
Failures preserve the previously accepted program and frame.

A removed linked endpoint becomes dormant. Inspect `linkedSelections[].targetAvailable` and
`sources[].available`. Missing sources retain their last projected set under keep-hidden or contribute
an empty set under drop; present sources project their current effective membership. Missing targets
are never recreated. Returning endpoints are validated again before their linked changes commit.
A new session still requires all configured endpoints to exist.

The controller stores this history only for its current lifetime. Serialization saves the existing
selection resources; recreate the session and links after loading. A fresh replacement program retains
the selection intent authored in that program. Legacy concrete-property predicates on facet sources
have no source-only geometry: keep-hidden preserves them, while explicit drop rejects them. Prefer
item keys, data fields or AST predicates for source selections.


## Select categories from a legend

Use a categorical legend binding to select every visible item in a clicked category.
The channel identifies an existing legend block; combined blocks keep their shared categories.
Numeric and string values remain distinct even when their labels look the same.

Place `<canvas id="chart" aria-label="Selectable legend"></canvas>` in the page, then run:

<!-- snippet-context:start -->

> **Executable complete.** Use this browser module with the Canvas element whose id is chart. Click a legend symbol or label to toggle that category.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const program = chart().createCanvas({ width: 500, height: 350, margin: 100 })
  .createData({ keyField: "id", values: [
    { id: "a", x: 1, y: 2, category: "A" },
    { id: "b", x: 2, y: 3, category: "B" },
    { id: "c", x: 3, y: 4, category: "A" }
  ] })
  .createScatterPlot({ id: "points", x: "x", y: "y", color: "category", guides: false })
  .createLegend({ target: "points", channels: ["color"] })
  .selectMarks({ id: "picked", target: "points", items: [] })
  .highlightMarks({ selection: "picked", color: "red", dimOthers: false, bringToFront: false });
const canvas = document.querySelector("#chart"), context = canvas.getContext("2d");
render(program, context);
const legendSession = createInteractionSession({ program, bindings: [{
  type: "legend", effect: "selection", target: "points", channel: "color", selection: "picked"
}] });
legendSession.subscribe(event => {
  if (event.phase === "commit") render(event.current, context);
});
legendSession.mount(canvas);
```

`mode` defaults to `toggle`, which toggles each matching item. Use `replace` to keep
only that category. Titles, background, overflow summaries and categories without
visible items do nothing. Continuous, interval and sampled legend blocks are not
supported by this selection binding. It does not change category visibility or scale domains.

The binding uses the same captured click, cancellation, child scope and linked update
rules as ordinary click selection. It requires Full and an existing named selection.
Editing pointer bindings share the explicit priority and modifier rules in [Combine editing gestures](#combine-editing-gestures).
For SVG, remount the new SVG element after rendering a committed program. Call
`legendSession.destroy()` when the surface is removed; selection state remains in the chart.


## Hide and restore categories from a legend

Use `effect: "visibility"` when clicking a legend should hide actual category items. No named selection is required.
Choose `scaleDomain: "visible-data"` to fit other automatic domains to the visible items, or `"all-data"` to preserve
those domains from the input before visibility. An existing user filter remains in force: its result is the all-data
input. The controlling categorical legend always retains that complete domain and mapping so a second click can
restore hidden categories. Explicit scale domains keep their precedence.

Place `<canvas id="chart" aria-label="Category visibility"></canvas>` in the page, then run:

<!-- snippet-context:start -->

> **Executable complete.** Use this browser module with the Canvas element whose id is chart. Click a legend category twice to hide and restore its items.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const program = chart().createCanvas({ width: 500, height: 350, margin: 100 })
  .createData({ keyField: "id", values: [
    { id: "a", x: 1, y: 2, category: "A" },
    { id: "b", x: 2, y: 3, category: "B" },
    { id: "c", x: 3, y: 4, category: "A" }
  ] })
  .createScatterPlot({ id: "points", x: "x", y: "y", color: "category", guides: false })
  .createLegend({ target: "points", channels: ["color"] });
const canvas = document.querySelector("#chart"), context = canvas.getContext("2d");
render(program, context);
const visibilitySession = createInteractionSession({ program, bindings: [{
  type: "legend", effect: "visibility", target: "points", channel: "color", scaleDomain: "all-data"
}] });
visibilitySession.subscribe(event => {
  if (event.phase === "commit") render(event.current, context);
});
visibilitySession.mount(canvas);
```

The native `setMarkVisibility` action and `setVisibility` session command accept `channel`, unique typed `values`,
boolean `visible` and the same explicit `scaleDomain`. Use the command payload `{clear:true}` or the native
`removeMarkVisibility` action to remove visibility alone. User filters and hidden-selection policy remain separate.
Changing a linked filter preserves visibility. Numeric `1` and string `"1"` are distinct categories; unknown values
reject. Continuous or interval legends and Basic authoring are unsupported. Empty views retain valid domains.

Session commands commit one final state after selection and linked updates. Hidden items disappear from graphics,
inspection and hit candidates. `keep-hidden` lets their selection return when shown again; `drop` removes it.
Visibility survives editable serialization. Recreate runtime bindings after loading, remount a newly rendered SVG
surface, and destroy the session when its host is removed.


## Automatic click selection

Use a `select` binding when the session should turn clicks into selection commands. The named
selection must already exist on the explicit Full mark owner. Add an `inspect` binding separately
if you also want hover or click inspection events.

Place `<canvas id="chart" aria-label="Selectable observations"></canvas>` in the page, then run:

<!-- snippet-context:start -->

> **Executable complete.** Use this complete browser module with the Canvas element whose id is chart, shown immediately before it. Click an observation to toggle its named selection.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const program = chart()
  .createCanvas({ width: 480, height: 320 })
  .createData({ id: "rows", keyField: "id", values: [
    { id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 3 }
  ] })
  .createScatterPlot({ id: "points", x: "x", y: "y", guides: false })
  .selectMarks({ id: "picked", target: "points", items: [] })
  .highlightMarks({ selection: "picked", color: "red", dimOthers: false, bringToFront: false });

const canvas = document.querySelector("#chart");
const context = canvas.getContext("2d");
render(program, context);
const clickSession = createInteractionSession({ program, bindings: [
  { type: "select", target: "points", selection: "picked", mode: "toggle", onMiss: "clear" }
] });
clickSession.subscribe(event => {
  if (event.phase === "commit") render(event.current, context);
});
clickSession.mount(canvas);
```

`mode` defaults to `replace`; `toggle` adds or removes the clicked key. `onMiss` defaults to `clear`;
`ignore` keeps the selection on a miss. Picking uses the first current-frame candidate belonging to
the stated owner, child path and selection grain. Other marks and guide items cannot become that
selection. Overlapping eligible items retain inspection's frontmost ordering. `slop` and
`hitInvisible` have the same meaning as inspection.

Selection commits have `origin: "user"` and update linked selections atomically. A repeated replace
of the same explicit key snapshot, or clearing an already empty key snapshot, produces no commit.
Only primary-button click events are used; modifier keys do not change the configured mode. The
binding does not emit inspection events by itself. Missing endpoints become inactive until restored.

Click-selection bindings may be combined with explicit priorities and modifier conditions. A linked
target cannot also be its click-selection writer. Root and explicit concat owners are supported;
facet source geometry is not inferred. Basic supports inspection, but this binding requires Full.
Use the arbitration options below to choose bindings; automatic keyboard focus remains separate.

For SVG, render `event.current`, replace the SVG element, then call `clickSession.mount(newSvg)`;
remounting removes the old listeners. Call `clickSession.destroy()` when the host is removed.
Headless applications use the same explicit `select` and `clearSelection` commands.


The browser captures the primary pointer from down to up. Moving less than 3 CSS pixels remains a
click; reaching 3 pixels cancels the click selection. This threshold does not change with device pixel
ratio or the root transform. Escape, pointer cancellation, lost capture and window blur also cancel.
A cancelled gesture leaves the committed program unchanged and emits one `select` event with
`phase: "cancel"`; it has no commit or settled event. The final up position is always checked.

Successful external edits, program replacement, remount, unmount and destroy cancel an active click
before accepting their new state. Release happens before subscribers run. The browser's following
click is suppressed, so remounting an SVG during commit cannot toggle twice. An independent click
inspection runs after this up commit. Host controls may still send an activation click with `detail: 0`;
the controller does not assign Enter/Space behavior or a focused item.

Custom event surfaces without pointer-capture methods keep click-only handling. Native Canvas and SVG
Elements use capture automatically. Brush/lasso and navigation are separate binding types; this click binding does not start their gestures. History commands operate on the whole session.


## Brush or lasso an existing selection

Use a Full program with an existing authored selection. A session accepts one click, brush, or lasso
binding alongside inspection and linked selections. The following browser fragment assumes `program`
has a `points` mark and `picked` selection, and `canvas` is an HTML Canvas element:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `canvas`. Resource selectors used here: `target: "points"`; `selection: "picked"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const brush = createInteractionSession({ program, bindings: [
  { type: "brush", target: "points", selection: "picked", axis: "xy" }
] });
brush.subscribe(event => {
  if (["preview", "commit", "cancel", "error"].includes(event.phase)) {
    render(event.state.previewProgram ?? event.current, canvas.getContext("2d"));
  }
});
brush.mount(canvas);
```

`axis` is x, y, theta, or default xy. Brush uses the stored position scale and writes a typed domain region;
x/y conditions intersect. Linear, log, time, ordinal, band and point scales are supported. Bands that
touch the brush interval are included, while padding gaps select no nearest category. Time endpoints
are epoch milliseconds. Set `channels: {y: "y2"}` for an aggregated Bar's ending y value, or x2 for its
ending x value. Other secondary channels require an explicit stored binding. Arbitrary animation-scale
inversion is rejected; brush starts from committed owner geometry.

For a Polar owner use `axis: "theta"`. Drag clockwise from the top-zero direction; 350° to 10°
selects both sides of the zero seam. Equal endpoints select nothing. The stored theta scale determines
the data units and typed categories, including reversed, shifted and partial ranges. A category is
selected when its band touches the interval. Proportional pie sectors have no position-scale inverse
and reject angular brushing. Start inside the owner's Polar disc, away from its exact center; ending
at the center cancels with an error because no angle exists. The temporary overlay is a clipped sector.
The selection also records `screenAngles: [startRadians, endRadians]` in `[0, 2π)` as pointer metadata.
Its native domain ranges or item keys preserve the selection after resizing or loading.

Use `{type: "lasso", target: "points", selection: "picked"}` for a freehand screen polygon.
Lasso selects the centers of current logical-item hit bounds, respecting clipping and opacity. It
uses the current accepted frame, including sampled geometry. The selected keys and normalized
CSS-local polygon are recorded together; resizing preserves the keys. Fewer than three distinct
points select nothing. Lasso does not accept axis or channel options.

Both bindings accept `mode: "replace" | "add" | "toggle" | "subtract" | "intersect"`, default replace.
Each preview recomputes from the same pointerdown program; repeated toggle previews do not accumulate.
At most one preview is published per animation frame. Final pointerup uses its last coordinates
through the native reducer and creates one commit followed by settled. An assetResolver delays acceptance until its lease is ready. `state.program` and its revision stay
unchanged during preview; render `state.previewProgram` for the temporary selection and blue overlay.
The committed program never contains that overlay. Empty brushes select nothing.

Escape, lost capture, pointer cancellation, blur, a new accepted frame/program, unmount and destruction
clear the preview and retain the prior program. Redraw that program on cancel. Capture and host RAF
are required. Set the host's CSS `touch-action` policy for direct touch gestures. For SVG, mount a
stable wrapper with the same logical dimensions and replace only its SVG contents during preview;
replacing the captured element cancels the gesture. Canvas/SVG use the same program, and ordinary
PNG/PDF exports can render a preview snapshot without running a controller.

Explicit concat targets retain child scope. Facet-source geometry, Basic editing and navigation are not inferred. Lasso input is limited to 10,000 samples and
50,000 candidate anchors, with bounded cumulative geometry work. Dispose the session when its host
is removed.


## Connect parameter inputs and a context action

Use native HTML controls and send their typed values to `setParameter`. The host owns keyboard behavior
and focus; the session commits the parameter's dependent data, marks and selections together. For a
context menu, subscribe to `contextMenu` and use its current semantic hit to build your own actions.
The binding prevents the browser menu only on the mounted surface. A request itself changes no chart state.

This browser module expects `<canvas id="chart" aria-label="Adjustable points"></canvas>`.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Arrow keys on Multiplier update computed data; right-click a point and activate the host selection button.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";
import { getMarkItems } from "ggaction/inspection";

const canvas = document.querySelector("#chart");
const panel = document.createElement("div");
panel.innerHTML = '<label>Multiplier <input id="multiplier" type="range" min="1" max="4" step="1" value="1"></label> <button id="open-context">Actions for point a</button> <button id="select-context" hidden>Select this point</button>';
canvas.before(panel);
const range = panel.querySelector("input");
const choose = panel.querySelector("#select-context");
const open = panel.querySelector("#open-context");
const program = chart().createCanvas({ width: 400, height: 280 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 1, y: 3 }, { id: "b", x: 2, y: 6 }] })
  .createParameter({ id: "factor", value: 1 })
  .createComputedData({ id: "scaled", source: "rows", as: "height", expression: {
    version: 2, registry: "standard@1", root: { type: "binary", op: "multiply",
      left: { type: "field", name: "y" }, right: { type: "parameter", id: "factor" } }
  } })
  .createScatterPlot({ id: "points", x: "x", y: { field: "height", scale: { domain: [0, 30] } }, guides: false })
  .selectMarks({ target: "points", id: "chosen", items: [], empty: "none" })
  .highlightMarks({ selection: "chosen", color: "red" });
const parameterSession = createInteractionSession({ program, bindings: [{ type: "contextMenu" }, { type: "keyboard", targets: [{ target: "points" }] }] });
const draw = value => render(value, canvas.getContext("2d"));
let contextTarget = null;
const closeMenu = () => { choose.hidden = true; contextTarget = null; };
const unsubscribe = parameterSession.subscribe(event => {
  if (event.type === "contextMenu") {
    contextTarget = event.state.hit?.target ?? null;
    choose.hidden = !contextTarget || contextTarget.ownerId !== "points";
    if (!choose.hidden) choose.focus();
  }
  if ("phase" in event && event.phase === "commit") { closeMenu(); draw(event.current); }
});
const change = () => parameterSession.dispatch({ type: "setParameter", target: "factor",
  payload: { value: range.valueAsNumber }, origin: "user" });
const openActions = () => {
  const item = getMarkItems(parameterSession.getState().program, { target: "points" }).find(item => item.fields.id === "a");
  if (!item) return;
  parameterSession.dispatch({ type: "focus", target: "points", itemKey: item.key });
  const point = parameterSession.getState().focus?.screenPoint;
  if (point) parameterSession.dispatch({ type: "contextMenu", point });
};
const select = () => {
  if (!contextTarget) return;
  parameterSession.dispatch({ type: "select", target: { id: contextTarget.ownerId, childPath: contextTarget.childPath },
    payload: { id: "chosen", select: { items: [contextTarget.itemKey] } }, origin: "user" });
  range.focus();
};
const escape = event => { if (event.key === "Escape") { closeMenu(); range.focus(); } };
range.addEventListener("input", change);
choose.addEventListener("click", select);
open.addEventListener("click", openActions);
panel.addEventListener("keydown", escape);
draw(program);
const unmount = parameterSession.mount(canvas);
// Call when removing this view.
const disposeControls = () => {
  range.removeEventListener("input", change);
  choose.removeEventListener("click", select);
  open.removeEventListener("click", openActions);
  panel.removeEventListener("keydown", escape);
  unsubscribe(); unmount(); parameterSession.destroy(); panel.remove();
};
```

The Actions for point a button uses that native item's exact current-frame focus point. It works with
Enter, Space or touch, and the same selection action is available without a right-click or hover.
A host keyboard menu can send `dispatch({type:"contextMenu",point:{x,y}})` using its focused item's
current CSS-local point. The session supplies all overlapping candidates, including guide roles, and the
host decides which commands are applicable. It does not infer a focused item or menu policy. Without a
context binding, the mounted surface keeps its normal browser menu.


## Navigate a partition view from host controls

Send `focusHierarchy` with a typed node key or grouped path. `focus:null` returns to the current root.
The native partition view keeps its hierarchy values, layout and logical selection identities. Hidden
selections follow the configured native and session pruning policies. The host owns navigation controls
and can display the breadcrumb keys returned by inspection.

This browser module expects `<canvas id="chart" aria-label="Hierarchy partition"></canvas>`.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Activate Group A or All groups with a pointer, Enter or Space; the breadcrumb text follows the native partition view.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { getMarkItems, inspectProgram } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";

const canvas = document.querySelector("#chart");
const nav = document.createElement("nav");
nav.setAttribute("aria-label", "Partition navigation");
nav.innerHTML = '<button id="focus-root">All groups</button> <button id="focus-a">Group A</button> <output id="focus-trail" aria-live="polite"></output>';
canvas.before(nav);
const program = chart().createCanvas({ width: 600, height: 400 })
  .createData({ id: "rows", keyField: "id", values: [
    { id: "root", parent: null }, { id: "A", parent: "root" },
    { id: "A1", parent: "A", amount: 2 }, { id: "A2", parent: "A", amount: 4 },
    { id: "B", parent: "root", amount: 4 }
  ] })
  .createHierarchyData({ id: "hierarchy", key: "id", parent: "parent", value: "amount" })
  .layoutHierarchy({ id: "partition-layout", method: "partition" })
  .createPartitionPlot({ id: "partition", labels: {} });
const focusSession = createInteractionSession({ program, bindings: [] });
const draw = current => {
  render(current, canvas.getContext("2d"));
  const view = inspectProgram(current).views[0].partition;
  const names = new Map(getMarkItems(current, { target: "partition" }).map(item => [item.fields.nodeKey, item.fields.id]));
  nav.querySelector("output").textContent = [...view.breadcrumbKeys, view.focusKey].map(key => names.get(key)).join(" / ");
};
const focusA = () => focusSession.dispatch({ type: "focusHierarchy", target: "partition", payload: { focus: { key: "A" } }, origin: "user" });
const focusRoot = () => focusSession.dispatch({ type: "focusHierarchy", target: "partition", payload: { focus: null }, origin: "user" });
nav.querySelector("#focus-a").addEventListener("click", focusA);
nav.querySelector("#focus-root").addEventListener("click", focusRoot);
const unsubscribe = focusSession.subscribe(event => {
  if (event.type === "program" || ("phase" in event && event.phase === "commit")) draw(event.state.program);
});
draw(program);
const disposeFocus = () => {
  nav.querySelector("#focus-a").removeEventListener("click", focusA);
  nav.querySelector("#focus-root").removeEventListener("click", focusRoot);
  unsubscribe(); focusSession.destroy(); nav.remove();
};
```

Native buttons retain their usual Enter/Space activation and focus. For scoped charts, provide the
partition's explicit `{childPath,id}` target. This command does not change Tree or Treemap views, create
an animation, or infer a focused keyboard item.


## Adjust a geographic view from host controls

Send `setViewport` to the explicit projection resource. `scalePx` is an absolute projection scale;
`translatePx` is in logical output pixels before composition or host transforms. Geographic projections
also accept their native `centerDeg` and `rotateDeg` options. The command uses the existing projection
edit rules: a scale or translation patch detaches a fitted projection, while an angular patch retains
and recomputes its fit. It preserves the geometry resource and feature selection identities.

Alternatively, pass only `{operation}` to use [native camera operations](geometry.md#navigateprojection):
pan, anchored zoom, pinch, spherical rotation, fit, reset or resize. The operation and absolute transform
fields cannot be combined. One successful command adds one history entry, including Canvas resize.
Capture reset parameters explicitly with `getProjectionView`; the session does not infer a home view.

This browser module expects `<canvas id="chart" aria-label="Map points"></canvas>`.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Pan right, Zoom in and Original view work with pointer, Enter and Space; the output reports the current projection transform.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";
import { getProjectionView } from "ggaction/inspection";

const canvas = document.querySelector("#chart");
const nav = document.createElement("nav");
nav.setAttribute("aria-label", "Map navigation");
nav.innerHTML = '<button id="map-right">Pan right</button> <button id="map-zoom">Zoom in</button> <button id="map-home">Original view</button> <output aria-live="polite"></output>';
canvas.before(nav);
const program = chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [["a", 60, 70], ["b", 120, 110]].map(([id, x, y]) => ({
      type: "Feature", id, properties: { name: id }, geometry: { type: "Point", coordinates: [x, y] }
    }))
  } })
  .createProjection({ id: "map", type: "identity", scalePx: 1, translatePx: [0, 0] })
  .createCoordinate({ type: "geo" }).createGeoPointMark({ id: "places", geometry: "places", radiusPx: 8 });
const viewportSession = createInteractionSession({ program, bindings: [] });
const transform = current => getProjectionView(current, { target: "map" }).parameters;
const initial = transform(program);
const draw = current => {
  render(current, canvas.getContext("2d"));
  const { scalePx, translatePx } = transform(current);
  nav.querySelector("output").textContent = `Scale ${scalePx}; translation ${translatePx.join(", ")}`;
};
const move = operation => viewportSession.dispatch({ type: "setViewport", target: "map", payload: { operation }, origin: "user" });
const pan = () => move({ type: "pan", deltaPx: [20, 0] });
const zoom = () => move({ type: "zoom", anchorPx: [80, 70], factor: 2, scaleExtent: [0.5, 8] });
const home = () => move({ type: "reset", initial });
const controls = [["#map-right", pan], ["#map-zoom", zoom], ["#map-home", home]];
for (const [selector, handler] of controls) nav.querySelector(selector).addEventListener("click", handler);
const unsubscribe = viewportSession.subscribe(event => {
  if (event.type === "program" || ("phase" in event && event.phase === "commit")) draw(event.state.program);
});
draw(program);
const disposeViewport = () => {
  for (const [selector, handler] of controls) nav.querySelector(selector).removeEventListener("click", handler);
  unsubscribe(); viewportSession.destroy(); nav.remove();
};
```

For a projection in a composed child, use `{childPath,id}`. Zoom and pinch anchors use native local
projection pixels; convert a host pointer into that coordinate space before dispatching. The native
operation validates inverse visibility and the explicit scale extent. Reset uses the captured parameters.
Both payload forms preserve geometry and level of detail. Native buttons keep focus and keyboard behavior.
Preparation failure or cancellation keeps the committed program, frame and history unchanged. This direct
command requires Full authoring and does not install pointer gestures or animate the change.


## Navigate a map with drag, wheel, pinch and keyboard

Use a Full `navigate` binding with one explicit projection target, positive ordered `scaleExtent`, and
an explicit `initial` parameter snapshot for Home. Choose `mode:"pan"` for translation. A spherical
rotation binding uses `mode:"rotate"` and a positive `rotationStepDeg` per local projection pixel.
Pan rejects that rotation-only option. The initial projection type must match the target.

The focused surface accepts Arrow keys (10 local pixels), +/= and -/_ (double or halve scale), and Home.
Wheel deltas use pixels, 16 pixels per line, or the surface height per page, then `2^(-delta/300)` with a
bounded exponent and the explicit scale extent. Wheel and pinch use the native inverse anchor; a hidden
or noninvertible anchor rejects without changing the committed program. No projection or child is inferred.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Focus it with Tab for keyboard navigation. Drag or pinch the map, scroll to zoom, and press Escape to cancel a drag.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { getProjectionView } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";

const canvas = document.querySelector("#chart");
canvas.tabIndex = 0;
canvas.style.touchAction = "none";
canvas.setAttribute("aria-label", "Map: drag to pan, scroll or pinch to zoom, arrow keys to pan, Home to reset");
const program = chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [["a", 80, 90], ["b", 140, 110]].map(([id, x, y]) => ({
      type: "Feature", id, properties: { name: id }, geometry: { type: "Point", coordinates: [x, y] }
    }))
  } })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark({ id: "places", radiusPx: 8 });
const navigationSession = createInteractionSession({ program, bindings: [{
  type: "navigate", target: "map", mode: "pan", scaleExtent: [0.5, 8],
  initial: getProjectionView(program, { target: "map" }).parameters
}] });
const draw = state => render(state.previewProgram ?? state.program, canvas.getContext("2d"), { pixelRatio: 2 });
const unsubscribe = navigationSession.subscribe(event => draw(event.state));
const unmount = navigationSession.mount(canvas);
draw(navigationSession.getState());
const disposeNavigation = () => { unmount(); unsubscribe(); navigationSession.destroy(); };
```

A pointer transaction previews at most once per animation frame and commits its final position once.
Adding a second pointer preserves the current pan or rotation as a private pinch baseline. It adds no
intermediate history entry. While assets prepare, the committed program and its displayed frame remain
active. Escape, lost capture, pointer cancel, blur, external program/frame updates, unmount and destroy
release both pointers and discard the draft. A late pointer-up has no effect. Wheel and keyboard each use
one native command; Ctrl/Meta/Alt keyboard shortcuts remain with the host. The host owns focus and touch
CSS. Remove the binding by creating a new session; incompatible targets fail, and a removed target remains
inactive until an explicit matching owner returns. Editing bindings share one capture owner alongside inspection/context-menu bindings. Animated camera playback is a separate integration.


## Move graph nodes with pointer or keyboard

Bind `moveNode` to the explicit GraphPlot. Its fixed or force layout and plot origin determine the
coordinate system. Dragging keeps the initial pointer offset, previews from one baseline, and commits
once when released. Escape restores the baseline. A force drag pins the moved node and uses the existing
solver for the others. Native buttons can send the same command using an explicit layout and typed key.

This browser module expects `<canvas id="chart" aria-label="Movable graph nodes"></canvas>`.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Drag either node with a pointer or touch; activate Move first node right with Enter or Space. Escape cancels a drag.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { getMarkItems } from "ggaction/inspection";
import { createInteractionSession } from "ggaction/interaction";

const canvas = document.querySelector("#chart");
canvas.style.touchAction = "none";
const controls = document.createElement("div");
controls.innerHTML = '<button id="node-right">Move first node right</button> <button id="node-second-right">Move second node right</button> <output aria-live="polite"></output>';
canvas.before(controls);
const program = chart().createCanvas({ width: 400, height: 280, margin: 0 })
  .createData({ id: "nodes", keyField: "id", values: [{ id: "first", group: "pair" }, { id: "second", group: "pair" }] })
  .createInferredGraphData({ id: "graph", nodeKey: "id", ruleId: "pair", rule: "group", options: { fields: ["group"] } })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [{ key: "first", x: 70, y: 90 }, { key: "second", x: 210, y: 160 }] } })
  .createGraphPlot({ id: "network", origin: [0, 0], nodes: { radius: 12 }, labels: false });
const nodeSession = createInteractionSession({ program, bindings: [{ type: "moveNode", target: "network" }] });
const first = current => getMarkItems(current, { target: "network" }).find(item => item.fields.kind === "node" && item.fields.key === "first");
const draw = current => {
  render(current, canvas.getContext("2d"));
  const { x, y } = first(current).properties;
  controls.querySelector("output").textContent = `First node: ${x}, ${y}`;
  const second = getMarkItems(current, { target: "network" }).find(item => item.fields.kind === "node" && item.fields.key === "second");
  controls.querySelector("#node-second-right").textContent = `Move second node right (${second.properties.x}, ${second.properties.y})`;
};
const moveRight = () => {
  const { x, y } = first(nodeSession.getState().program).properties;
  nodeSession.dispatch({ type: "moveNode", target: "layout", payload: { key: "first", x: x + 20, y }, origin: "user" });
};
const moveSecondRight = () => {
  const second = getMarkItems(nodeSession.getState().program, { target: "network" }).find(item => item.fields.kind === "node" && item.fields.key === "second");
  nodeSession.dispatch({ type: "moveNode", target: "layout", payload: { key: "second", x: second.properties.x + 20, y: second.properties.y }, origin: "user" });
};
controls.querySelector("button").addEventListener("click", moveRight);
controls.querySelector("#node-second-right").addEventListener("click", moveSecondRight);
const unsubscribe = nodeSession.subscribe(event => {
  if (event.type === "program" || "phase" in event) draw(event.state.previewProgram ?? event.state.program);
});
draw(program);
const unmount = nodeSession.mount(canvas);
const disposeNodeControls = () => {
  controls.querySelector("button").removeEventListener("click", moveRight);
  controls.querySelector("#node-second-right").removeEventListener("click", moveSecondRight);
  unsubscribe(); unmount(); nodeSession.destroy(); controls.remove();
};
```

Both native nodes have an ordinary button alternative to dragging.
The example uses an explicit origin so moving a node does not recenter the whole graph. Circular and
flow layouts do not accept node movement. Gesture cancellation releases capture and redraws the prior
program. Preview hit frames track the same visible geometry; read the session's current `frameVersion`
when delivering external frames. General keyboard item navigation and unpin controls are not
installed by this binding.


### Drag a graph during animation

A `moveNode` binding can start from an accepted authentic animation frame when its current graph
meaning has the same native owner and complete node/edge topology. The initial pointer offset is
preserved. During dragging, `state.previewFrame` contains the actual current graph presentation;
`state.program`, history and the accepted `state.animationFrame` stay unchanged. Incident routed
edges stay attached using their current shape. Independently altered plain scenes and fallback graph
geometry cannot supply this semantic baseline.

Use the prepared drawing callback in [Prepare assets before committing](#prepare-assets-before-committing): select
`previewFrame` before `animationFrame`, then `previewProgram` and the committed `program`, and pair each
with its corresponding handles. A transient graph frame uses `previewAssets`; its accepted animation
baseline keeps `frameAssets`.

With an asset resolver, prepare `request.frame ?? request.program`; the preview and its assets become
visible together. Escape and cancellation restore the accepted frame and its original handles.
Release updates the native layout once and creates one history entry. Fixed layouts keep current
positions; force layouts use them as starting positions, retain existing pins and add the dragged
node's pin. The native force solver can move other nodes on release. To animate that final change,
retain the last preview frame and explicitly pass it as `from` to `planTransition`, with the committed
program as `to`. Undo/redo restores native programs. Transient frames are never stored in the program.


## Edit existing annotations

For a [geographic annotation](geometry.md), the same `annotate` command calls `editGeoAnnotation`.
Its payload accepts a native `anchor` (position or typed feature key), text and Text styles; geographic coordinates and the original detail level remain native.
The explicit target chooses the editor. Position fields `x`/`y`, label placement and collision layout belong to ordinary Text annotations and reject on geographic targets.

Send `annotate` to an existing Text owner to update text, datum anchors, offsets, style or source-owned item membership in one transaction.
The payload follows [`editAnnotation`](./marks/text.md#editannotationoptions) and cannot include another target.
The Full editor retains the source/data/plot/screen anchor and native replay behavior. Basic does not author Text annotations.

This browser module expects `<canvas id="chart" aria-label="Annotated points"></canvas>`.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Revise note and Offset note work with pointer, touch, Enter and Space; the text keeps its data anchor.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const canvas = document.querySelector("#chart");
const controls = document.createElement("div");
controls.innerHTML = '<button id="revise-note">Revise note</button> <button id="offset-note">Offset note</button> <button id="undo-note">Undo</button> <button id="redo-note">Redo</button> <button id="reset-note">Reset</button> <output aria-live="polite"></output>';
canvas.before(controls);
const program = chart().createCanvas({ width: 400, height: 280, margin: 20 })
  .createData({ values: [{ x: 2, y: 3 }, { x: 8, y: 7 }] })
  .createPointMark().encodeX({ field: "x", scale: { domain: [0, 10] } })
  .encodeY({ field: "y", scale: { domain: [0, 10] } })
  .createAnnotation({ id: "note", text: "Original", x: 2, y: 3, dx: 8, dy: -8 });
const annotationSession = createInteractionSession({ program, bindings: [{ type: "annotate", target: "note" }] });
const previousTouchAction = canvas.style.touchAction;
canvas.style.touchAction = "none";
const draw = current => {
  render(current, canvas.getContext("2d"));
  controls.querySelector("output").textContent = current.graphicSpec.objects.note.items[0].properties.text;
  controls.querySelector("#undo-note").disabled = annotationSession.getState().history.undoCount === 0;
  controls.querySelector("#redo-note").disabled = annotationSession.getState().history.redoCount === 0;
};
const revise = () => annotationSession.dispatch({ type: "annotate", target: "note", payload: { text: "Revised", x: 8, y: 7 }, origin: "user" });
const offset = () => annotationSession.dispatch({ type: "annotate", target: "note", payload: { dx: 12, dy: -16 }, origin: "user" });
controls.querySelector("#revise-note").addEventListener("click", revise);
controls.querySelector("#offset-note").addEventListener("click", offset);
const historyButtons = ["undo", "redo", "reset"].map(type => {
  const button = controls.querySelector(`#${type}-note`);
  const activate = () => annotationSession.dispatch({ type, origin: "user" });
  button.addEventListener("click", activate);
  return () => button.removeEventListener("click", activate);
});
const unsubscribe = annotationSession.subscribe(event => { if (event.phase) draw(event.state.previewProgram ?? event.state.program); });
draw(program);
const unmountAnnotation = annotationSession.mount(canvas);
const disposeAnnotationControls = () => {
  controls.querySelector("#revise-note").removeEventListener("click", revise);
  controls.querySelector("#offset-note").removeEventListener("click", offset);
  historyButtons.forEach(remove => remove());
  unmountAnnotation(); unsubscribe(); annotationSession.destroy(); controls.remove();
  canvas.style.touchAction = previousTouchAction;
};
```

Drag the note with mouse, pen or touch to change its native pixel offsets while preserving its anchor.
The target layer is the editing unit: attached labels all move by the same offset. Use a separate annotation
with item membership to move one label. Encoded offsets and facet sources reject this binding.
A drag previews at most once per animation frame, commits the final release position once, and restores the
committed program on Escape, capture loss or interruption. It requires the owner’s committed frame.
Nested charts convert root and child coordinates before updating offsets; no scale or projection is inverted.

Keyboard activation uses ordinary host buttons. Each command produces one commit and settled event;
an invalid patch preserves the current program and trace. Annotation creation and screen-anchor conversion are not
performed by this command.

## Prepare native work before replacing the program

Pass a callback to `updateProgram` when a native resource needs asynchronous computation. It receives the
current immutable program and an `AbortSignal`. A newer edit or destruction cancels the request; a late result
cannot replace the current chart. `whenSettled()` waits for computation and any configured asset preparation.
The previous program and history stay available until the replacement is ready.

For a Full `program` containing graph `graph`, layout `layout` and graph plot `network`, create a route executor
and apply its prepared result through the native actions:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "network"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
import { createGraphRouteExecutor, prepareGraphEdgeRoutes } from "ggaction/graph";
import { createInteractionSession } from "ggaction/interaction";

const routeExecutor = createGraphRouteExecutor();
const routeSession = createInteractionSession({ program, bindings: [] });
routeSession.updateProgram(async ({ program, signal, transactionId }) => {
  const prepared = await prepareGraphEdgeRoutes(program, {
    kind: "create", id: "routes", graph: "graph", layout: "layout", method: "edge-path"
  }, { executor: routeExecutor, signal, requestToken: transactionId });
  return program.bundleGraphEdges({ prepared, requestToken: transactionId })
    .editGraphPlot({ target: "network", routes: "routes" });
}, { history: "record" });
await routeSession.whenSettled();

function disposeRoutes() {
  routeSession.destroy();
  routeExecutor.dispose();
}
```

Subscribe to the `program` event to render the accepted replacement. The subsequent `update` event reports
`status: "settled"`; cancellation and failures report `"cancelled"` and `"error"`. Native editing commands keep
their existing transaction phases. Supply `createWorker` to `createGraphRouteExecutor` when work should run
in a worker; the executor owns its transport and honors the session signal. Keep the executor until its owning
view is disposed, then call `disposeRoutes()`.


## Combine editing gestures

Use `modifiers` to choose an explicit binding and `priority` to override its default rank. Each optional
`alt`, `ctrl`, `meta` and `shift` flag is a boolean requirement; omitted flags impose no condition.
Default ranks are annotation 50, brush/lasso 40, node movement 30, navigation 20 and click/legend 10. Priority
must be an integer between -1,000,000 and 1,000,000. Equal ranks with overlapping conditions are rejected
before mounting, including bindings with different targets. Reordering the binding array does not resolve a tie.

A higher rank only wins when its target applies at the pointer location. Hidden or removed annotations,
node misses and another child's viewport do not block lower-ranked candidates. The winner is fixed from
pointerdown through release or cancel; changing modifiers mid-drag does not switch tools. Only navigation
can take a second pointer, and only within its chosen viewport. Every gesture uses the same preview, prepared asset, history and cleanup rules.

<!-- snippet-context:start -->

> **Executable complete.** Use a Canvas with id chart. Drag the label, Shift-drag a selection rectangle, or click a point. Escape cancels the active gesture.

<!-- snippet-context:end -->

```js
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";

const canvas = document.querySelector("#chart");
canvas.style.touchAction = "none";
canvas.setAttribute("aria-label", "Points: drag the label, Shift-drag to brush, or click a point");
const program = chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createData({ id: "rows", keyField: "id", values: [{ id: "a", x: 50, y: 60 }, { id: "b", x: 200, y: 130 }] })
  .createPointMark({ id: "points" }).encodePointRadius({ value: 8 })
  .encodeX({ field: "x", scale: { domain: [0, 300], range: [0, 300] } })
  .encodeY({ field: "y", scale: { domain: [0, 200], range: [0, 200] } })
  .selectMarks({ id: "picked", target: "points", items: [] })
  .highlightMarks({ selection: "picked", color: "red", dimOthers: false })
  .createAnnotation({ id: "note", space: "screen", x: 150, y: 30, text: "Drag label", align: "center", baseline: "middle" });
const gestureBindings = [
  { type: "annotate", target: "note" },
  { type: "brush", target: "points", selection: "picked", modifiers: { shift: true } },
  { type: "select", target: "points", selection: "picked", mode: "toggle", modifiers: { shift: false } }
];
const gestureSession = createInteractionSession({ program, bindings: gestureBindings });
const draw = state => render(state.previewProgram ?? state.program, canvas.getContext("2d"), { pixelRatio: 2 });
const unsubscribe = gestureSession.subscribe(event => { if (!event.state.destroyed) draw(event.state); });
draw(gestureSession.getState());
gestureSession.mount(canvas);
const disposeGestures = () => { unsubscribe(); gestureSession.destroy(); };
```

The annotation wins when its label is hit, including while Shift is pressed. Elsewhere Shift selects the
brush and a plain click toggles a point. `priority` and `modifiers` are available on all editing bindings,
including legends and navigation; they do not apply to inspection, context menus or linked bindings.
There are at most256 editing bindings and259 total records. A click clear-on-miss remains an applicable
command; use `onMiss:"ignore"` when a miss should fall through. Wheel and keyboard arbitrate navigation
bindings, while native Ctrl/Meta/Alt shortcuts remain with the host. SVG hosts keep the root during a drag
and remount when replacing it. Call `disposeGestures()` when removing this view.

## Keyboard item focus

A keyboard binding navigates native logical items that are painted in the accepted current frame.
It respects clipping, opacity, nested scopes and geographic representations. Focus alone changes no
program or history. Enter or Space executes an explicitly configured native selection; partition
activation can instead use `activation: { type: "focusHierarchy" }`.

```html
<div id="item-focus" role="listbox" aria-label="Measurements" tabindex="0"
     style="position:relative;width:360px;height:240px">
  <canvas id="item-canvas" aria-label="Measurements" aria-hidden="true"></canvas>
  <span id="item-ring" aria-hidden="true" style="position:absolute;pointer-events:none;border:2px solid #111;border-radius:50%;width:16px;height:16px;display:none"></span>
  <div id="item-options" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></div>
</div>
```

<!-- snippet-context:start -->

> **Executable complete.** Use this section's HTML and JavaScript together. Press Tab, Arrow keys and Enter. The host owns roles and safe option text.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { exportAccessibleData } from "ggaction/accessibility";
import { createInteractionSession } from "ggaction/interaction";
import { renderTransitionScene } from "ggaction/scene";

const program = chart().createCanvas({ width: 360, height: 240 })
  .createData({ id: "rows", keyField: "name", values: [
    { name: "A", x: 1, y: 2 }, { name: "B", x: 2, y: 3 }
  ] })
  .createPointMark({ id: "points" }).encodeX({ field: "x" }).encodeY({ field: "y" })
  .selectMarks({ id: "chosen", items: [], empty: "none" })
  .highlightMarks({ selection: "chosen", color: "#dc2626", dimOthers: false });
const surface = document.querySelector("#item-focus");
const canvas = document.querySelector("#item-canvas");
const ring = document.querySelector("#item-ring");
const descriptions = document.querySelector("#item-options");
const keyboardSession = createInteractionSession({ program, bindings: [{
  type: "keyboard", targets: [{ target: "points", activation: {
    type: "select", selection: "chosen", mode: "toggle"
  } }]
}] });
const drawFocus = state => {
  renderTransitionScene(state.scene, canvas.getContext("2d"));
  const items = exportAccessibleData(state.program, { format: "items", target: "points" }).views[0].items;
  descriptions.replaceChildren();
  surface.removeAttribute("aria-activedescendant");
  items.forEach((item, index) => {
    const option = document.createElement("span");
    option.id = `measurement-${index}`;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(item.selectedBy.includes("chosen")));
    option.textContent = `${item.fields.name}: x ${item.fields.x}, y ${item.fields.y}`;
    descriptions.append(option);
    if (state.focus?.currentItemKey === item.key) surface.setAttribute("aria-activedescendant", option.id);
  });
  const point = state.focus?.screenPoint;
  ring.style.display = point ? "block" : "none";
  if (point) { ring.style.left = `${point.x - 10}px`; ring.style.top = `${point.y - 10}px`; }
};
const unsubscribeKeyboard = keyboardSession.subscribe(event => drawFocus(event.state));
const unmountKeyboard = keyboardSession.mount(surface);
drawFocus(keyboardSession.getState());
const disposeKeyboard = () => { unmountKeyboard(); unsubscribeKeyboard(); keyboardSession.destroy(); };
```

The controller keeps a stable authored key when exactly one current geographic item represents it.
If the item becomes hidden, fully clipped, transparent, deleted or ambiguous, focus returns to its
configured owner container; the host clears `aria-activedescendant`. The native program remains the
source for descriptions, selected state and restored data. Use explicit `{childPath,id}` targets for
nested charts and opaque scoped item keys from `exportAccessibleData` or inspection.

Headless hosts can dispatch `{type:"focus",move:"first"}`, `{type:"focus",target:"points",itemKey}`
or `{type:"activate"}`. Moves are next, previous, first, last, parent, firstChild, previousSibling,
nextSibling, root, nextCandidate and previousCandidate. The candidate moves cycle the latest current-frame
inspection with PageDown/PageUp. The hierarchy moves follow native navigation metadata. On a hierarchy item,
Left/Right visit parent/first child, Up/Down visit siblings, Home visits root, and Escape invokes the
configured partition parent's native focus. Unavailable neighbors are unchanged. Tab and modified
keys stay with the host; nested text controls are never intercepted. A keyboard binding takes the
surface's key navigation role when a camera navigation binding is also present; wheel and drag remain
with that camera binding. For independent keyboard camera controls, use a separate focusable surface.

Focus uses current paint and clip footprints. Text retains its metric-box hit policy. PNG and PDF
exports are static; the same accessible item snapshot can accompany them without installing listeners.

## Accessible tooltips and touch

Tooltips are host UI. Combine native item descriptions with the same pointer inspection and keyboard
focus state; never insert a field value as HTML. This complete example exposes three descriptions,
including the two overlapping points, through a focusable listbox. Hover or focus opens a tooltip;
Escape closes that description until the pointer or focused item changes. A click or touch tap focuses
and toggles the native selection, so touch does not depend on hover. The host owns tooltip dismissal;
it does not create a second selection or history store.

```html
<div id="accessible-chart" role="listbox" aria-label="Observations" tabindex="0"
     style="position:relative;width:420px;height:300px">
  <canvas id="accessible-canvas" aria-label="Observations" aria-hidden="true"></canvas>
  <div id="accessible-options" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></div>
  <span id="accessible-ring" aria-hidden="true" style="display:none;position:absolute;pointer-events:none;width:16px;height:16px;border:2px solid #111;border-radius:50%"></span>
</div>
<div style="height:4em;position:relative">
  <p id="accessible-tooltip" role="tooltip" hidden style="position:absolute;margin:0;max-height:4em;overflow:auto"></p>
</div>
<button id="accessible-hide" type="button">Hide A</button>
<button id="accessible-dispose" type="button">Remove interactions</button>
```

<!-- snippet-context:start -->

> **Executable complete.** Use this section's HTML and JavaScript together. Hover, focus or tap an item; Escape dismisses its description.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { exportAccessibleData } from "ggaction/accessibility";
import { createInteractionSession } from "ggaction/interaction";
import { renderTransitionScene } from "ggaction/scene";

const program = chart().createCanvas({ width: 420, height: 300, margin: 70 })
  .createData({ id: "rows", keyField: "name", values: [
    { name: "A", x: 2, y: 3 }, { name: "B", x: 8, y: 7 }, { name: "C", x: 2, y: 3 }
  ] })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x", scale: { domain: [0, 10], nice: false } })
  .encodeY({ field: "y", scale: { domain: [0, 10], nice: false } })
  .selectMarks({ id: "chosen", items: [], empty: "none" })
  .highlightMarks({ selection: "chosen", color: "#dc2626", dimOthers: false, bringToFront: false });
const surface = document.querySelector("#accessible-chart");
const canvas = document.querySelector("#accessible-canvas");
const options = document.querySelector("#accessible-options");
const tooltip = document.querySelector("#accessible-tooltip");
const ring = document.querySelector("#accessible-ring");
const hideButton = document.querySelector("#accessible-hide");
const disposeButton = document.querySelector("#accessible-dispose");
const accessibleSession = createInteractionSession({ program, bindings: [
  { type: "inspect", slop: 0 },
  { type: "keyboard", targets: [{ target: "points", activation: {
    type: "select", selection: "chosen", mode: "toggle"
  } }] }
] });
let live = true, pointerKey = null, shownKey = null, dismissedKey = null, overTooltip = false, previousProgram, previousScene;
const describe = item => `${item.fields.name}: x ${item.fields.x}, y ${item.fields.y}. ${item.selectedBy.includes("chosen") ? "Selected" : "Not selected"}.`;
const drawAccessible = event => {
  const state = event.state;
  if (event.type === "inspect" && !overTooltip) pointerKey = state.hit?.target?.ownerId === "points" ? state.hit.target.itemKey : null;
  else if ((event.type === "leave" && !overTooltip) || event.type === "focus" || state.program !== previousProgram || event.type === "frame") pointerKey = null;
  if (state.scene !== previousScene) renderTransitionScene(state.scene, canvas.getContext("2d"));
  previousScene = state.scene; previousProgram = state.program;
  const items = exportAccessibleData(state.program, { format: "items" }).views.find(view => view.ownerId === "points")?.items ?? [];
  options.replaceChildren(); surface.removeAttribute("aria-activedescendant");
  items.filter(item => item.visible).forEach((item, index) => {
    const option = document.createElement("span"); option.id = `observation-${index}`;
    option.setAttribute("role", "option"); option.setAttribute("aria-selected", String(item.selectedBy.includes("chosen")));
    option.textContent = describe(item); options.append(option);
    if (item.key === state.focus?.currentItemKey) surface.setAttribute("aria-activedescendant", option.id);
  });
  const focusKey = document.activeElement === surface ? state.focus?.currentItemKey : null;
  const selected = items.find(item => item.visible && item.key === (pointerKey ?? focusKey));
  const nextKey = selected?.key ?? null;
  if (nextKey !== shownKey) dismissedKey = null;
  shownKey = nextKey; tooltip.hidden = selected === undefined || dismissedKey === nextKey;
  tooltip.textContent = selected ? describe(selected) : "";
  if (tooltip.hidden) surface.removeAttribute("aria-describedby");
  else surface.setAttribute("aria-describedby", tooltip.id);
  const point = state.focus?.screenPoint; ring.style.display = point ? "block" : "none";
  if (point) { ring.style.left = `${point.x - 10}px`; ring.style.top = `${point.y - 10}px`; }
};
const dismissTooltip = event => {
  if (event.key !== "Escape" || tooltip.hidden) return;
  dismissedKey = shownKey; tooltip.hidden = true; surface.removeAttribute("aria-describedby");
  event.preventDefault(); // Capture phase dismisses the tooltip before native hierarchy Escape.
};
const activatePointer = () => {
  const hit = accessibleSession.getState().hit?.target;
  if (hit?.ownerId !== "points") return;
  surface.focus({ preventScroll: true });
  accessibleSession.dispatch({ type: "focus", target: "points", itemKey: hit.itemKey });
  accessibleSession.dispatch({ type: "activate" });
};
const hideA = () => {
  const result = accessibleSession.updateProgram(accessibleSession.getState().program
    .filterMarks({ target: "points", field: "name", op: "neq", value: "A" }));
  if (result.status === "applied") hideButton.disabled = true;
};
const leaveSurface = event => { overTooltip = !tooltip.hidden && tooltip.contains(event.relatedTarget); };
const enterTooltip = () => { overTooltip = true; };
const leaveTooltip = () => { overTooltip = false; pointerKey = null; drawAccessible({ state: accessibleSession.getState() }); };
const updateFocusDescription = () => drawAccessible({ state: accessibleSession.getState() });
const unsubscribeAccessible = accessibleSession.subscribe(drawAccessible);
// This listener runs before session pointerleave so the tooltip can remain hoverable.
surface.addEventListener("pointerleave", leaveSurface);
const unmountAccessible = accessibleSession.mount(surface);
// Mount inspection first: click/tap then reads the exact current hit, with no delayed callback.
surface.addEventListener("click", activatePointer);
window.addEventListener("keydown", dismissTooltip, true);
surface.addEventListener("focus", updateFocusDescription); surface.addEventListener("blur", updateFocusDescription);
tooltip.addEventListener("pointerenter", enterTooltip); tooltip.addEventListener("pointerleave", leaveTooltip);
hideButton.addEventListener("click", hideA);
const disposeAccessible = () => {
  if (!live) return; live = false;
  surface.removeEventListener("click", activatePointer);
  window.removeEventListener("keydown", dismissTooltip, true);
  surface.removeEventListener("pointerleave", leaveSurface);
  surface.removeEventListener("focus", updateFocusDescription); surface.removeEventListener("blur", updateFocusDescription);
  tooltip.removeEventListener("pointerenter", enterTooltip); tooltip.removeEventListener("pointerleave", leaveTooltip);
  hideButton.removeEventListener("click", hideA);
  disposeButton.removeEventListener("click", disposeAccessible);
  window.removeEventListener("pagehide", disposeAccessible);
  unmountAccessible(); unsubscribeAccessible(); accessibleSession.destroy();
  tooltip.hidden = true; tooltip.textContent = ""; ring.style.display = "none";
  surface.removeAttribute("aria-describedby"); surface.removeAttribute("aria-activedescendant");
};
disposeButton.addEventListener("click", disposeAccessible);
window.addEventListener("pagehide", disposeAccessible);
drawAccessible({ state: accessibleSession.getState() });
```

The tooltip is ordinary text beside the chart and remains available when the pointer moves into that
text. Escape and native focus changes dismiss or replace it without a timer. Tab is never trapped, and nested host controls keep their
own keyboard behavior. Filtering updates the native descriptions and selected state before the host
reads them. The item-focus example above explains owner fallback and geographic representations.
Use a similarly explicit list of native controls for camera, legend visibility and other commands;
those controls must dispatch through the same session reducer and cleanup their own listeners.
Public animation and reduced-motion playback integration remain separate from this static host recipe.

## Native control alternatives

Provide native HTML controls for each editing task instead of requiring a gesture on a painted mark.
These buttons use the same selection, visibility, filter, category-order and history commands as pointer
bindings. Category controls remain present when their items are hidden, so showing a category does not
require finding an invisible mark. The description is rebuilt from the committed native snapshot;
button focus stays on the same DOM element after every edit.

```html
<fieldset id="native-controls">
  <legend>Category controls</legend>
  <button type="button" id="choose-a">Select A</button>
  <button type="button" id="choose-b">Select B</button>
  <button type="button" id="clear-picked">Clear selection</button>
  <button type="button" id="hide-a">Hide A</button>
  <button type="button" id="show-a">Show A</button>
  <button type="button" id="hide-b">Hide B</button>
  <button type="button" id="show-b">Show B</button>
  <button type="button" id="only-b">Filter to B</button>
  <button type="button" id="clear-filter">Remove filter</button>
  <button type="button" id="reverse-categories">B before A</button>
  <button type="button" id="clear-order">Original order</button>
  <button type="button" id="undo-control">Undo</button>
  <button type="button" id="redo-control">Redo</button>
  <button type="button" id="reset-control">Reset</button>
</fieldset>
<canvas id="controlled-chart" aria-label="Category totals"></canvas>
<p id="control-summary" role="status" aria-live="polite"></p>
```

<!-- snippet-context:start -->

> **Executable complete.** Use this section's HTML and JavaScript together. Activate category and history controls with Enter, Space or touch.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";
import { exportAccessibleData } from "ggaction/accessibility";

const program = chart().createCanvas({ width: 420, height: 300, margin: 70 })
  .createData({ id: "rows", values: [{ category: "A", value: 2 }, { category: "B", value: 5 }] })
  .createBarPlot({ id: "bars", x: "category", y: "value", color: "category", guides: false })
  .createLegend({ target: "bars", channels: ["color"] })
  .selectMarks({ target: "bars", id: "picked", items: [], empty: "none" })
  .highlightMarks({ selection: "picked", color: "#c62828", dimOthers: false, bringToFront: false });
const controlSession = createInteractionSession({ program, bindings: [], selectionPolicy: "keep-hidden" });
const panel = document.querySelector("#native-controls");
const canvas = document.querySelector("#controlled-chart");
const summary = document.querySelector("#control-summary");
const commands = [
  ["choose-a", { type: "select", target: "bars", payload: { id: "picked", select: { field: "category", op: "eq", value: "A" } } }],
  ["choose-b", { type: "select", target: "bars", payload: { id: "picked", select: { field: "category", op: "eq", value: "B" } } }],
  ["clear-picked", { type: "clearSelection", target: "bars", payload: { id: "picked" } }],
  ["hide-a", { type: "setVisibility", target: "bars", payload: { channel: "color", values: ["A"], visible: false, scaleDomain: "all-data" } }],
  ["show-a", { type: "setVisibility", target: "bars", payload: { channel: "color", values: ["A"], visible: true, scaleDomain: "all-data" } }],
  ["hide-b", { type: "setVisibility", target: "bars", payload: { channel: "color", values: ["B"], visible: false, scaleDomain: "all-data" } }],
  ["show-b", { type: "setVisibility", target: "bars", payload: { channel: "color", values: ["B"], visible: true, scaleDomain: "all-data" } }],
  ["only-b", { type: "filter", target: "bars", payload: { select: { field: "category", op: "eq", value: "B" }, mode: "replace" } }],
  ["clear-filter", { type: "filter", target: "bars", payload: { clear: true } }],
  ["reverse-categories", { type: "reorder", target: "bars", payload: { channel: "x", values: ["B", "A"] } }],
  ["clear-order", { type: "reorder", target: "bars", payload: { channel: "x", clear: true } }],
  ...["undo", "redo", "reset"].map(type => [`${type}-control`, { type }])
];
const drawControls = () => {
  const state = controlSession.getState();
  render(state.program, canvas.getContext("2d"));
  const items = exportAccessibleData(state.program, { format: "items", target: "bars" }).views[0].items;
  summary.textContent = items.length ? items.map(item => `${item.fields.category}: ${item.fields.value}${item.selectedBy.includes("picked") ? ", selected" : ""}`).join("; ") : "No visible categories";
  panel.querySelector("#choose-a").disabled = !items.some(item => item.fields.category === "A");
  panel.querySelector("#choose-b").disabled = !items.some(item => item.fields.category === "B");
  panel.querySelector("#undo-control").disabled = state.history.undoCount === 0;
  panel.querySelector("#redo-control").disabled = state.history.redoCount === 0;
};
const listeners = commands.map(([id, command]) => {
  const button = panel.querySelector(`#${id}`);
  const activate = () => controlSession.dispatch({ ...command, origin: "user" });
  button.addEventListener("click", activate);
  return () => button.removeEventListener("click", activate);
});
const unsubscribeControls = controlSession.subscribe(event => {
  if (event.type === "program" || event.phase === "commit") drawControls();
});
const disposeNativeControls = () => {
  listeners.forEach(remove => remove()); unsubscribeControls(); controlSession.destroy(); panel.disabled = true;
  window.removeEventListener("pagehide", disposeNativeControls);
};
window.addEventListener("pagehide", disposeNativeControls);
drawControls();
```

Enter, Space and a touch tap activate the same button handler. Hiding a category preserves the user
filter; showing it does not clear that filter. Removing the filter preserves visibility. With
`keep-hidden`, a surviving selection reappears when its category returns. Undo and redo restore the
native snapshots; Reset restores the initial chart, while Clear selection changes membership alone.

Use the labeled [parameter input](#connect-parameter-inputs-and-a-context-action),
[partition buttons](#navigate-a-partition-view-from-host-controls),
[map buttons](#adjust-a-geographic-view-from-host-controls),
[node controls](#move-graph-nodes-with-pointer-or-keyboard) and
[annotation controls](#edit-existing-annotations) for those editing tasks. Provide context actions from
a keyboard-accessible or touch button as well as a pointer menu. These are host controls; the library
keeps one command, preparation, selection and history path and does not create DOM widgets.

## Inspect overlapping graph edges

Pointer inspection retains every original edge at a shared stroke. With a keyboard binding,
PageDown and PageUp cycle those candidates in their actual hit order; Enter uses the configured
native activation. Headless hosts use `focus` moves `nextCandidate` and `previousCandidate`.
These moves wrap within the eligible candidates from the latest current-frame inspection. They
never select an item by themselves. A source or accepted-frame change invalidates old candidates.

`dispatch({type:"unbundleEdge",target,itemKey})` temporarily draws one painted GraphPlot edge
using its native unbundled geometry. Use an opaque scoped edge key and an explicit root or child
target. `itemKey:null` restores the baseline. The command supports static native graphs and
authentic animated graph frames; independently edited plain scenes and active editing previews
reject. It changes `previewFrame` and emits `unbundleEdge`, without changing the program, routes,
selection, revision or history. Candidate cycling restores the original baseline and rechecks the
original inspection point before advancing. Escape, a new frame, source update, native edit,
editing gesture, unmount and destruction also clear this temporary view.

The host renders `previewFrame` with `previewAssets` before the ordinary animation/native state.
An asset resolver receives the exact preview in its `frame` field. Until preparation succeeds the
previous picture and assets remain active; failed or stale leases cannot publish a preview. The
baseline `animationFrame` and its assets stay available for restoration. For a graph with no routed
geometry, the temporary result may already match its native edge.

Use this complete example's HTML and module together. Hover over the shared line, focus the chart,
and press PageDown or PageUp. The buttons expand the focused edge and restore it. Enter selects the
focused item once. The host uses text nodes for descriptions and owns tooltip dismissal.

```html
<div id="edge-chart" role="listbox" aria-label="Graph connections" tabindex="0"
     style="width:300px;height:200px;position:relative">
  <canvas id="edge-canvas" aria-label="Graph connections" aria-hidden="true"></canvas>
  <div id="edge-options" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)"></div>
</div>
<p id="edge-description" role="tooltip" hidden></p>
<button id="edge-expand" type="button">Expand focused edge</button>
<button id="edge-restore" type="button">Restore routes</button>
<button id="edge-dispose" type="button">Remove interactions</button>
```

<!-- snippet-context:start -->

> **Executable complete.** Use this section's HTML and JavaScript together. Hover the shared edge, focus the chart and use PageDown/PageUp, Enter and the expansion buttons.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";
import { createInteractionSession } from "ggaction/interaction";
import { exportAccessibleData } from "ggaction/accessibility";

const program = chart().createCanvas({ width: 300, height: 200, margin: 0 })
  .createData({ id: "nodes", keyField: "id", values: [{ id: "a" }, { id: "b" }] })
  .createData({ id: "edges", values: [
    { id: "first", from: "a", to: "b" }, { id: "second", from: "a", to: "b" }
  ] })
  .createGraphData({ id: "graph", nodes: "nodes", edges: "edges", nodeKey: "id",
    edgeKey: "id", source: "from", target: "to", directed: true })
  .layoutGraph({ id: "layout", method: "fixed", options: { positions: [
    { key: "a", x: 40, y: 80 }, { key: "b", x: 240, y: 80 }
  ] } })
  .createGraphPlot({ id: "network", origin: [0, 0], nodes: { radius: 10 },
    edges: { stroke: "black", strokeWidth: 4, arrows: false, parallelGap: 24 } })
  .bundleGraphEdges({ id: "routes", method: "edge-path" }).editGraphPlot({ routes: "routes" })
  .selectMarks({ id: "chosen", target: "network", items: [], empty: "none" });
const surface = document.querySelector("#edge-chart"), canvas = document.querySelector("#edge-canvas");
const options = document.querySelector("#edge-options"), description = document.querySelector("#edge-description");
const expand = document.querySelector("#edge-expand"), restore = document.querySelector("#edge-restore");
const dispose = document.querySelector("#edge-dispose");
const edgeSession = createInteractionSession({ program, bindings: [
  { type: "inspect", slop: 0 },
  { type: "keyboard", targets: [{ target: "network", activation: {
    type: "select", selection: "chosen", mode: "toggle"
  } }] }
] });
let dismissed = false, live = true;
const describe = (item, index) => `${item.fields.kind} ${index + 1}. ${item.selectedBy.includes("chosen") ? "Selected" : "Not selected"}.`;
const drawEdges = event => {
  const state = event.state, current = state.previewFrame ?? state.animationFrame ?? state.program;
  render(current, canvas.getContext("2d"), { pixelRatio: window.devicePixelRatio });
  const items = exportAccessibleData(state.program, { format: "items", target: "network" }).views[0]?.items ?? [];
  options.replaceChildren(); surface.removeAttribute("aria-activedescendant");
  items.filter(item => item.visible).forEach((item, index) => {
    const option = document.createElement("span"); option.id = `edge-option-${index}`;
    option.setAttribute("role", "option"); option.setAttribute("aria-selected", String(item.selectedBy.includes("chosen")));
    option.textContent = describe(item, index); options.append(option);
    if (item.key === state.focus?.currentItemKey) surface.setAttribute("aria-activedescendant", option.id);
  });
  if (event.type === "focus" || event.type === "inspect") dismissed = false;
  const item = items.find(item => item.key === (state.focus?.currentItemKey ?? state.hit?.target?.itemKey));
  description.hidden = !item || dismissed || state.destroyed;
  description.textContent = item ? describe(item, items.indexOf(item)) : "";
  if (description.hidden) surface.removeAttribute("aria-describedby");
  else surface.setAttribute("aria-describedby", description.id);
  expand.disabled = !item || item.fields.kind !== "edge" || state.destroyed;
};
const expandEdge = () => {
  const key = edgeSession.getState().focus?.currentItemKey;
  if (key) edgeSession.dispatch({ type: "unbundleEdge", target: "network", itemKey: key });
};
const restoreEdges = () => edgeSession.dispatch({ type: "unbundleEdge", target: "network", itemKey: null });
const dismiss = event => { if (event.key === "Escape") { dismissed = true; drawEdges({ state: edgeSession.getState() }); } };
const unsubscribeEdges = edgeSession.subscribe(drawEdges), unmountEdges = edgeSession.mount(surface);
surface.addEventListener("keydown", dismiss);
expand.addEventListener("click", expandEdge); restore.addEventListener("click", restoreEdges);
const disposeEdges = () => {
  if (!live) return; live = false;
  unmountEdges(); unsubscribeEdges(); edgeSession.destroy();
  surface.removeEventListener("keydown", dismiss);
  expand.removeEventListener("click", expandEdge); restore.removeEventListener("click", restoreEdges);
  dispose.removeEventListener("click", disposeEdges);
  options.replaceChildren(); surface.removeAttribute("aria-activedescendant"); surface.removeAttribute("aria-describedby");
  description.hidden = true; expand.disabled = true; restore.disabled = true;
};
dispose.addEventListener("click", disposeEdges);
drawEdges({ state: edgeSession.getState() });
```
