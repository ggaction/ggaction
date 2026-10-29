# Interaction session contract

## Classification and entry

`ggaction/interaction` exports `createInteractionSession({ program, bindings?, selectionPolicy?, historyLimit?, assetResolver? })` as an advanced browser-safe controller function. It is not a wrapped action. Inspection supports Full and Basic programs without changing their state. Editing commands invoke the receiver’s existing Full domain actions, retain their trace decomposition and replace only the session’s current immutable program. Selection storage and dependent rendering follow the native selection contract. The default authoring and rendering entries do not import the controller.

`bindings` accepts at most one `{ type: "inspect", events?, slop?, hitInvisible? }` record, at most one context-menu binding, at most one keyboard binding, up to 256 editing pointer bindings, and up to 256 explicit linked-selection/filter bindings described below, with 259 total records maximum. Omission enables `pointermove` and `click`; `[]` keeps headless commands available without DOM listeners. Explicit events must contain one or two distinct values from those names. `slop` is a finite non-negative CSS-pixel distance; omission resolves to 3 for mouse/pen and 6 for touch. `hitInvisible` defaults to false. Unknown options, including clock, are rejected. Asset preparation is opt-in as specified below.

## Handle and commands

- `mount(element, { rootTransform?, observeResize? } = {})` accepts an event surface with `addEventListener`, `removeEventListener`, and `getBoundingClientRect`; public declarations use `Element`. It installs passive inspection listeners, a nonpassive listener for an explicit context-menu binding, and returns an idempotent unmount function. A later successful mount removes the previous listeners. Invalid frame/host setup preserves the previous state. `rootTransform` is an explicit six-number local-to-CSS affine matrix; omission is identity. CSS layout matrices and DPR are never guessed. The host renders the same program at the declared logical size and supplies any additional matrix.
- `dispatch({ type: "inspect", point, pointerType?, slop?, hitInvisible? })` accepts an explicit CSS-local `{x,y}`. The pointer type is mouse (default), pen, or touch. Mounted events subtract the current client rectangle once. Root matrices transform indexed shapes and clips, preserving slop in CSS pixels; localPoint remains the child Canvas coordinate. Empty viewports or singular matrices produce no hit with diagnostics.
- `dispatch({ type: "leave" })` clears the transient hit.
- `dispatch({ type: "frame", scene, version, generation })` snapshots a version-2 concrete Canvas scene. `generation` must equal current state and `version` must be a greater non-negative safe integer. Stale commands return `{status:"stale"}` without examining scene contents. Current frames retain known node keys, type and topology from the current program; subsets and concrete sampled coordinates are permitted. Unknown keys or changed topology fail atomically. Use the accepted `getState().scene` with `renderTransitionScene` so drawing and targeting share one exact snapshot. The session does not sample animations or infer geometry from endpoints. Region previews use host RAF as specified below. An accepted external frame cancels an active captured gesture before replacing its baseline.
- `updateProgram(program, {history?,origin?} = {})` prepares the full replacement before committing it, increments frameVersion, generation and session revision, and clears transient hits. Earlier immutable programs and their indices are unchanged. Existing mounted bindings remain active.
- `subscribe(listener)` registers a synchronous listener and returns an unsubscribe function. Events are `{type,state}` with type inspect, contextMenu, leave, frame, program, mount, unmount, or destroy; program events also include `selectionChanges`, `origin` and the history policy below. Each state is an immutable snapshot. Reentrant commands run FIFO after the current event, at most 256 commands per drain and queued operations. Subscriber errors propagate, preserve the already published state, and discard pending work.
- `getState()` returns `{program,previewProgram,scene,frameVersion,generation,revision,hit,linkedSelections,history,assets,preparation,mounted,destroyed}`. It remains readable after destruction and contains no DOM nodes; prepared handles are runtime-only.
- `destroy()` removes listeners and disposes the active index once; first call returns true and later calls false. Pending work is discarded. Later dispatch, mount, subscribe, or updateProgram calls throw a disposed error.

Dispatch and updateProgram return `{status:"applied"|"queued"|"stale"|"unchanged"}`. Reentrant calls return queued; invalid operations throw. No inspection creates a selection resource, persistent hover, authoring transaction, history entry or asset request.

## Hit results and semantic association

`hit` is null until inspection, or `{target,candidates,diagnostics,statistics,frameVersion}`. Target is the first candidate or null. Candidates contain `{itemKey,ownerId,role,childPath,rowKeys,resourceRefs,screenPoint,localPoint,distance,zIndex}`. Keys are opaque. Ordering is frontmost zIndex, nearest distance, then stable key/path/owner. All overlapping logical items remain in candidates; decorative parts of one item collapse once.

Mark metadata comes from the final materialized item identity and exact data/resource revision. Filtered-out graphics have no candidates. Guide roles are axis-tick, axis-title, legend-item, facet-header, and chart-title. Cartesian/Polar/Parallel tick marks and labels bind raw typed values, including wrapped/renamed labels; axis lines and grids remain decoration. Categorical legend layers and their clipped windows share a value item with the label; overflow summary is a distinct item. Continuous samples and tick labels bind the existing resolved sample values; an entire gradient strip is one range item. Legend titles are separate legend items; backgrounds remain decoration. Chart title/subtitle lines share their respective item. Facet headers belong to their composition, and child guides retain the actual childPath. Guide targets do not invent data lineage.

Filled paths honor nonzero/evenodd holes, strokes honor widths, dash gaps, caps and joins, and clips always exclude outside points. Transparent fill is targetable; fill none is not. Opacity zero is omitted unless hitInvisible is true. Text uses concrete per-line metric rectangles, including rotation and outline extent; it is not glyph-alpha picking. Images use their placed clipped viewport. Shadows do not expand hit geometry. Path approximation is bounded by 0.25 CSS px.

## Bounds and unsupported operations

Preparation supports at most 100,000 scene nodes and a 10,000,000-unit cumulative work budget; a query has a 2,000,000-unit budget. External frame snapshot work is bounded before canonical concrete validation. Guide layout reuse accounts for sample comparisons before computation. Frames containing accessors, cycles, unsupported objects, excessive work or mismatched semantic cardinality are rejected atomically.

Native navigation, keyboard focus and async asset preparation follow their sections below. PNG/PDF exports remain static; the controller targets the same concrete geometry in browser Canvas/SVG or a headless host.

Evidence: `test/unit/interaction-session.test.js`, `test/unit/interaction-selection.test.js`, `test/unit/hit-guides.test.js`, `test/unit/hit-program.test.js`, `test/unit/hit-frame.test.js`, `test/browser/interaction-session.browser.js`, `test/contracts/interaction-types.test.js`.


## Atomic authoring commands

The following advanced controller commands require an explicit `target` and `payload`:

- `dispatch({type:"select", target, payload:{id,select,mode?}, transactionId?,origin?,causeTransactionId?})` creates a missing selection with mode `replace` (default) or updates the same ID and owner. `select` is the existing `MarkSelectionSelector`, including item keys, typed ranges and parameter-backed boolean ASTs. `add`, `toggle`, `subtract`, and `intersect` require an existing selection and reuse its native set semantics.
- `dispatch({type:"clearSelection", target, payload:{id}, transactionId?,origin?,causeTransactionId?})` replaces an existing selection with an empty item set, `empty:"none"`, and its existing grain. The resource, highlight, label and conditional consumers remain valid. It does not remove the resource or reset the chart.
- `dispatch({type:"focusHierarchy",target,payload:{focus},transactionId?,origin?,causeTransactionId?})` invokes the existing Full partition editor. `focus` is the native typed `HierarchyNodeTarget` or null for the current root. Only an explicit partition owner is accepted; other hierarchy marks and Basic reject. Coordinate, layout, paint and pruning policy remain unchanged. Native source recovery, selection pruning and subsequent session reconciliation/linked closure retain their existing meaning. No new hierarchy calculation or stored schema is introduced.
- `dispatch({type:"moveNode",target,payload:{key,x,y},transactionId?,origin?,causeTransactionId?})` addresses an explicit graph layout and delegates to `editLayout({node:payload})`. Typed key, finite layout-local coordinates, dormant intent, force pins, dependent routes/plots and failure atomicity follow the native layout owner. Basic and incompatible layout methods reject it.
- `dispatch({type:"annotate",target,payload,transactionId?,origin?,causeTransactionId?})` invokes Full `editAnnotation` for Text or `editGeoAnnotation` for a geographic annotation with a nonempty native patch. The target is one explicit existing annotation owner; payload cannot redirect target. Existing constant datum or local Canvas screen anchors, text, offsets, placement, item membership and layout keep their native ownership. Geographic position/feature anchors retain the native coordinate, typed feature key and original detail level. The selected target kind determines the closed payload; Text-only options reject for Geo and Geo-only options reject for Text. Complete preflight precedes one session reconciliation/link closure and commit/settled pair. Basic rejects; this command does not create annotations or infer an anchor.
- `dispatch({type:"setViewport",target,payload:{scalePx?,translatePx?,centerDeg?,rotateDeg?},transactionId?,origin?,causeTransactionId?})` invokes the existing Full projection editor with a nonempty patch. The target identifies the projection itself. Values and projection-type applicability use `editProjection`; absolute scale/translation detach a prior fit, while angular changes retain and recompute it. Pixel units are native projection output coordinates before child composition and host transforms. The command preserves type, clipping, precision and geometry. Alternatively, the entire payload is `{operation:GeoCameraOperation}` and invokes Full `navigateProjection`. Operation and absolute transform fields are mutually exclusive. Pan, anchored zoom, pinch, spherical rotation, fit, explicit reset and resize use the native camera contract without a second stored camera. Basic rejects both paths.
- `dispatch({type:"setParameter", target, payload:{value}, transactionId?,origin?,causeTransactionId?})` invokes the existing parameter editor and its entire dependency closure. An unchanged scalar value returns `{status:"unchanged"}` without a trace, revision or event. Basic lacks these editors and rejects them even for unchanged values.
- `dispatch({type:"filter",target,payload:{select,mode?,recompute?},transactionId?,origin?,causeTransactionId?})` invokes `filterMarks` with the existing inline `MarkSelector`. `mode` is native replace/compose; `recompute` retains the existing inferred-graph restriction. Named-selection AST, region and screen metadata are not inline filter selectors. `{clear:true}` replaces the entire payload to invoke `removeMarkFilter`. Clear removes only that filter; it does not reset other state. Missing active filters and invalid native options reject atomically.
- `dispatch({type:"reorder",target,payload:{channel,values}|{channel,by,direction?}|{channel,clear:true},transactionId?,origin?,causeTransactionId?})` invokes `orderCategories` or `removeCategoryOrder`. Channel is x/y/theta and all values, computed ordering, shared-scale compatibility and automatic-domain rules are the existing category-order contract. Source rows stay in their original order; mark geometry, axes, linked legends and selection items follow the native order. Clear requires an active order. A clear payload cannot contain replacement options and clear accepts only true. Basic rejects both direct-control editors.

A target is a root owner ID string or `{childPath,id,facetSource?}` using existing action scopes. Selection, filter, reorder and hierarchy-focus commands identify the mark owner; parameter commands identify the parameter and viewport commands identify the projection; node commands identify the layout. No list or inferred owner is accepted. Concat paths retain exact item namespaces; facet edits require `facetSource:true` and regenerate retained cells. Generated facet cells cannot be edited individually. An existing selection must belong to the stated owner. Child paths are limited to 1,024 components; ordinary action target validation also applies.

Each accepted edit first invokes the wrapped domain action on an immutable candidate and prepares its complete current hit frame. Only successful preparation replaces the session program/scene, increments revision and generation once, advances frameVersion, and clears the transient hit. The original program remains unchanged. The host renders `event.current` or the current accepted scene; the controller never draws. Without assetResolver, `settled` means the synchronous program/frame work is complete. With assetResolver, the atomic preparation contract below also applies before commit.

Transaction events contain `{type,transactionId,origin,causeTransactionId?,phase,revision,affectedOwners,previous,current,diagnostics,selectionChanges,state}`. The type is the command type. `previous` and `current` are immutable program references. `affectedOwners` contains the explicitly addressed owner and changed linked target owners, each with its child path; it is not an inventory of every rematerialized dependency. Origin defaults to `programmatic`, with `user`, `replay`, and `linked` also accepted. IDs are nonempty strings of at most 1,024 characters; an omitted ID is generated within the session. A cause ID records provenance without enabling automatic linked propagation.

Successful commands publish `commit` then `settled` at one revision. A valid envelope whose payload, target, action or frame preparation fails publishes one `error` with unchanged program/frame/revision, empty affectedOwners and a diagnostic, then throws. Malformed envelopes and unsafe snapshots are rejected before a transaction begins. Subscriber errors propagate and stop further delivery, preserve an already committed state, and discard pending work; a requested destroy still completes. They are not reported as action rejections.

Reentrant commands are snapshotted before callbacks resume and run FIFO after both transaction phases. Repeated transaction IDs in one drain return `stale`, preventing callback feedback for that transaction. The 256-operation drain bound remains. IDs are not retained as a durable replay ledger. Input snapshots have a 10,000,000-unit cumulative work limit and reject accessors, cycles, sparse arrays and executable values. Runtime queues, IDs and subscribers never enter the program codec.


## Linked selections

A Full session accepts `{type:"linkSelection",id,sources,target,selection,resolve}` in `bindings`.
Every source is `{target,selection,projection}`. Targets use the same explicit owner/child scope as
commands. All source and target selections must already exist, belong to the stated owner and be
authored selections; generated composite projection IDs are not endpoints. The target selection
retains its grain and consumers, and its binding owns membership while installed. Direct session
select/clear commands cannot overwrite that target selection. Other selections remain independent.

`resolve:"union"` selects target items projected by any source; `"intersection"` requires every source.
`"global"` names one source owner and requires exactly one source. Each source first produces its own
target-item key set, then resolution combines those sets. An empty source set contributes nothing to
a union and empties an intersection. Existing `empty:"all"` source selections contribute their current
full item membership. A target result is always explicit item keys with `empty:"none"`.

Each source specifies one projection:

- `{type:"rows",sourceData,targetData}` identifies materialized original datasets in the respective
  source/target scopes. Their stored logical data identities must match. Every nonempty final item
  must retain lineage to that original dataset. A selected original row selects every target item
  containing that row; row order and duplicate values cannot substitute for identity. Derived dataset
  IDs are rejected as projection roots, though marks can consume derived datasets with original lineage.
- `{type:"fields",sourceFields,targetFields}` maps two equal-length tuples of 1–64 distinct field names.
  Fields must be uniquely defined on every final item, including unselected items. The existing typed
  scalar key policy accepts strings, finite numbers, booleans, bigints and valid dates; null, undefined,
  nonfinite values and compound values reject the transaction. Number `1` and string `"1"` differ.
  Multiple target items with an equal tuple are all selected. No values are inferred from absent items
  when an endpoint is empty. Field names are nonempty strings of at most 1,024 characters.

Bindings are a bounded acyclic graph of explicit owners with one writer per target owner. IDs and source
selection references are unique within their owning lists; the total source count and binding count are
at most 256. Cycles, duplicate writers, missing selections, ambiguous data or unavailable lineage reject
initialization. Facet source links read the existing final semantic item grain without materializing a
new source chart. They accept fields/rows/keys/AST selectors but reject concrete-property selectors,
whose full-source geometry is unavailable. Generated facet cells remain read-only.

Construction validates all endpoints and computes runtime projection sets without editing the program.
Ordinary `updateProgram` replacements retain that behavior; endpoint availability changes and selection
pruning follow the explicit lifecycle policy below. After a successful authoring command, changed source owners or changed projected
sets trigger the dependency closure. Each changed target is edited once through its existing domain
action, in dependency order. Unchanged effective membership creates no target revision. The original
command, linked edits, projection cache and hit frame commit together at one session revision; a failure
in any endpoint, projection, dependent consumer or frame leaves all previous references intact. A final
projection check also rejects implicit materialization feedback, such as a source opacity predicate
whose conditional opacity changes when its linked target selection changes; there is no fixed-point loop.

`getState().linkedSelections` is a frozen topological-order array of
`{id,target,selection,resolve,targetAvailable,sources:[{target,selection,available,keys}],keys}`. Source keys are the respective
projected target sets, and final keys are their resolved result. Keys carry the target child namespace.
They are inspection snapshots, not setters. Configuration snapshots and cumulative projection/key
expansion have a 10,000,000-unit work limit. Full final-item resolvers retain their existing limits.

Bindings and their projection sets belong to the session and are not serialized. The committed target
selection resources use the existing program codec; reattach bindings explicitly after restoration.
Links do not install DOM listeners or synthesize additional transactions. A cause ID alone never
creates a link. Evidence includes `test/unit/interaction-links.test.js`, the logical-selection realistic
corpus, public interaction type checks and source-free interaction consumers.


## Linked filters

A Full session accepts `{type:"linkFilter",id,sources,target,selection,resolve}`. Source projections,
resolution, explicit endpoint scopes, final item grains and all limits follow linked selections above.
The existing target selection supplies its final-item universe and grain; its selected membership is
not overwritten. This binding exclusively owns the target's native mark filter while installed.
Direct session `filter` commands for that owner reject. Direct selection, click and brush edits on
that owner's selections remain available. A target owner still has one writer across both binding
kinds, and the combined dependency graph must be acyclic.

Construction validates and computes projections without authoring: an existing target filter is
retained. On the next relevant source transaction, the binding replaces that native filter with the
resolved target items. Projection uses the target's unfiltered item universe, so a later wider source
selection can restore previously filtered items. Native `removeMarkFilter` and `filterMarks` build
private immutable candidates; neither intermediate program is published. Unsupported native targets
reject through the same atomic error boundary. Empty-none sources produce an empty view; empty-all
sources contribute their complete current membership. A filter result with no rows has no final items,
including aggregate bar and path marks, while retaining native empty-filter domains and validating the requested grain. Graph filters retain their native
node selection and induced-edge behavior; effective native item membership determines no-op writes.

The target's persistent selections are reconciled under keep-hidden/drop immediately after filtering
and before downstream links run. The original source change, all filter/selection dependents and the
new hit frame commit at one revision. Failure preserves the previous committed program, scene, trace,
selection and projection references; only the error event is published. Brush preview uses the same
candidate closure, and cancellation discards it. External `updateProgram` changes to source projections
also refresh affected filters atomically; missing owners remain dormant and are not recreated.

Filter records in `getState().linkedSelections` add `effect:"filter"`; selection-link records retain
their existing shape. Bindings are runtime-only. Native committed filters and selections use the
existing codec; recreate the binding after restoring a program. Destroying a session does not remove
its committed filter. Full authoring is required; Basic rejects these bindings.

Evidence: `test/unit/interaction-linked-filter.test.js`, `test/unit/interaction-region-gesture.test.js`,
`test/browser/interaction-region.browser.js`, the five-source/three-recipe logical-selection realistic
suite and the source-free interaction consumer.


## Nearest selection commands

`dispatch({type:"select",target,payload:{id,nearest,mode?},transactionId?,origin?,causeTransactionId?})`
updates an existing authored selection. Exactly one of `select` and `nearest` is required. The selection
must match the explicit owner and retain its stored grain. Generated projection IDs are not editable
nearest owners. Basic rejects nearest commands. There is no inferred selection ID or new resource kind.

`nearest` is one of:

- `{space:"screen",point:{x,y},maxDistance,hitInvisible?}` measures CSS-pixel distance to the current
  accepted frame's painted footprint. A filled interior has distance zero; an outside point measures
  the nearest fill edge or painted stroke footprint, including dash gaps, caps and joins. Clipped-out
  boundary intervals do not contribute. As with inspection, the query point must be inside every clip;
  nearest does not search through a clip from an outside point. Opacity zero is excluded unless
  `hitInvisible:true` (default false). Text uses its concrete metric rectangles and images their placed
  viewport; shadows do not expand targeting. Curves retain the existing 0.25 CSS-pixel approximation.
  Only items in the selection's exact owner/path/grain are eligible, and guides remain inspection-only.
  A facet source has multiple cell geometries and rejects screen nearest; use data space for that source.
- `{space:"data",fields,values,metric,maxDistance}` uses 1–64 distinct bounded field names and an
  equal-length finite numeric query tuple. `metric` is explicitly `euclidean` or `manhattan`, in raw
  field units without inferred normalization or scale mapping. Every final item, including unselected
  items, must have a unique finite numeric value for every field. Missing, null, nonnumeric, ambiguous
  aggregate fields and overflowing distances reject the complete transaction. Empty owners have no
  candidate. Explicit facet-source semantic item grain is supported.

`maxDistance` is required, finite and non-negative; the boundary is inclusive. Nearest chooses minimum
distance then lexicographically smallest opaque logical item key, independently of drawing order.
Decorations collapse to their owner item. A miss supplies an empty key set with `empty:"none"` to the
existing set update mode; `replace` clears, while add/toggle/subtract/intersect retain native semantics.
The chosen key is a snapshot selection, not a stored distance predicate. Codec restoration therefore
requires no nearest-specific preparation or schema.

Resolution occurs when the queued command executes against the current program and accepted sampled
frame, including its root transform. Candidate program, linked-selection closure, frame and counters
commit together, with the same commit/settled/error lifecycle as ordinary select. The command does not
replace inspection candidate ordering or synthesize an inspect event. After a commit, native
materialization replaces any sampled frame as for every authoring command. Data tuple work and
namespace expansion share a 10,000,000-unit bound; screen queries retain the 2,000,000-unit bound,
including clip intersections and comparisons. Evidence: `test/unit/interaction-nearest.test.js`, the
logical-selection realistic corpus, browser interaction tests and installed interaction consumers.


## Hidden and removed selection membership

`selectionPolicy` is `"keep-hidden"` by default or explicitly `"drop"`. The session snapshots authored
selection membership at initialization, after committed commands, and after `updateProgram`.
Initialization records existing hidden keys without authoring or emitting changes. Changes compare
exact logical keys at the final item grain. An absent item, removed child/owner, or explicit
`visible:false` item (such as partition focus) is unavailable. Opacity zero, clipping, and a sampled
animation frame do not remove semantic membership. A visible geographic detail item also makes its
explicit `representationKeys` available. An explicit items selection retains its authored logical keys
for lifecycle snapshots and hidden/restored/dropped events; its current resolved selection and hit still
use the visible representation's key. A detail-level change alone neither prunes nor emits hidden keys.
If every representation is absent, the normal policy applies to the original authored key.

Keep-hidden preserves stored item keys and live range/predicate intent. A missing owner's selected keys
remain in a session-local record; the session never recreates a mark, child or selection. Matching keys
selected again after return produce a restoration event. An explicitly replaced selector supersedes
old membership. Drop prunes vanished membership by invoking the existing selection editor with the
previous selected keys intersected with the current available universe, `empty:"none"`, and the stored
grain. It snapshots a live range/predicate only when pruning is needed. If new options were explicitly
authored, they take precedence over the previous membership. Removed owners produce drop events and
release their record without being recreated. Freshly supplied immutable programs retain whatever
selection intent their caller authored; drop does not permanently blacklist a key.

`program` events and transaction `commit`/`settled` events include frozen `selectionChanges` arrays of
`{target,selection,policy,ownerMissing,hiddenKeys,restoredKeys,droppedKeys}`. Keys use the owner's exact
child namespace. Repeated unchanged hidden states produce no duplicate change. Error events contain
an empty array. Pruning, linked edits, final validation and hit-frame preparation commit atomically;
failed replacements leave program, frame, counters and runtime caches unchanged. Use the session's
accepted program after a drop replacement, which may include native pruning actions.

Existing links can become dormant after an endpoint disappears. `targetAvailable` and each source's
`available` report existence. Missing sources retain their last projected target-key set under
keep-hidden; drop contributes an empty set. Present sources continue to project their current effective
membership, so a present but filtered source does not invent values for hidden rows. A missing target
is never recreated. Returning endpoints revalidate their explicit owner, fields and original data
identity before commit. Initialization still rejects missing endpoints. Endpoint disappearance/return
or explicit pruning runs the existing dependency closure; each linked target is edited at most once,
including pruning. Cached keys must belong to the current exact target child namespace.

Runtime records are limited to 100,000 and cumulative reconciliation/key work to 10,000,000 units.
They are discarded on destroy and are not serialized. Restore the existing immutable program and
explicitly recreate the session and bindings. Legacy concrete-property predicates on a retained facet
source have no source-only geometry: keep-hidden preserves them without inferring per-item membership,
and explicit drop rejects such a session. Data fields, item keys, ranges and AST facet selectors use
the existing source-only semantic owner. Basic inspection remains supported; Full-only authored
selection resolution and editors do not become Basic capabilities.

Evidence: `test/unit/interaction-reconciliation.test.js`, linked-selection tests, the logical-selection
realistic corpus, browser interaction tests and installed interaction consumers.


## Automatic click binding

Full accepts `{type:"select",target,selection,mode?,onMiss?,slop?,hitInvisible?}` bindings. The target
is one explicit root or concat mark owner and `selection` must be an existing authored selection on
that owner. Root/concat facade items follow their native final grain. Basic, generated selection IDs,
facet-source geometry, duplicate click bindings and conflicting linked target writers are rejected.
A replacement program revalidates the endpoint before commit; a removed endpoint remains inactive.

`mode` is `replace` (default) or `toggle`. `onMiss` is `clear` (default) or `ignore`. Both option sets
are closed and explicit null is invalid. `slop` and `hitInvisible` reuse inspect validation/defaults.
Mounted primary-button selection events map client coordinates through the existing CSS/root transform
and query the current accepted frame. Among all hit candidates, the first exact owner/path key in the
selection's final available item grain is selected. Inspect z-order is retained, and decorative
geometry still collapses to its item. A missing owner or singular/empty viewport causes no edit.

The binding dispatches native `select` or `clearSelection` commands with `origin:"user"` through the
same queued transaction, linked closure, reconciliation and frame commit boundary. It retains the
selection's grain, using `empty:"none"` for explicit keys. Replacing an identical singleton key
snapshot or clearing an existing empty-none key snapshot is a no-op without revision or event.
Live predicates/ranges are converted to key snapshots when clicked, even if effective membership
happens to match. Clearing also removes retained hidden intent. Toggle uses the native set operation.

The binding alone emits no inspect/leave events. Inspection is independent; subscriber work follows
the existing FIFO lifecycle. Captured up commits before the subsequent click inspection. Remount/destroy
release listeners, and a captured old listener is inactive. All successful selection event consumers
must render the accepted program; the controller never renders. SVG hosts remount after replacing
the root element. Headless authors use explicit select/clear commands instead of a new low-level
click command. No modifier-driven mode change or keyboard focus is inferred. Explicit competing editing bindings use the arbitration rules below. Existing count/work limits apply; candidate and key expansion additionally share a
10,000,000-unit click-selection budget.

Evidence: `test/unit/interaction-click-selection.test.js`, `test/browser/interaction-session.browser.js`,
the logical-selection realistic corpus, documentation module and source-free interaction consumers.


## Captured click lifecycle

On an Element with both `setPointerCapture` and `releasePointerCapture`, select bindings capture the
primary pointer on down and commit the eligible click on up. Movement is measured in CSS pixels,
independent of root scale and DPR: below 3 Euclidean pixels remains a click; reaching 3 cancels this
click-only binding. The final up position is checked even without a preceding move. Crossing the
threshold and returning to the start does not restore click eligibility. Secondary pointers cannot
claim or end the active selection. Modifier keys still do not change its configured selection mode.

Escape, pointercancel, lostpointercapture, window blur, successful external program/command replacement,
remount, unmount and destroy cancel an active click. Cancellation emits one `select` transaction event
with `phase:"cancel"`, `origin:"user"`, unchanged committed revision and immutable previous/current
references. Diagnostics contain `code:"gesture-cancelled"` and the reason in `message`. Cancel does not
produce commit/settled, and late up cannot commit. Down itself does not modify the program or emit a
transaction phase. A successful up uses one generated transaction ID for commit and settled.

Capture is released before terminal subscribers run. The subsequent browser click is suppressed,
including when an up subscriber replaces the SVG root and remounts it. An explicit activation click
with `detail:0` remains available to host keyboard controls. The pointer binding does not add Enter/Space behavior; the explicit keyboard binding below owns keyboard focus and activation. An independent click-inspection binding receives the later click;
on capture-capable hosts selection commits on up before that click inspection.

Custom event surfaces without either capture method retain click-only handling. Supplying exactly one
capture method is an error. Registration failure removes partially installed listeners and leaves the
old lease active. Capture acquisition failure retains the program, releases any acquired pointer and emits one
error transaction with diagnostic code `pointer-capture-failed`; no commit/cancel follows.
Cancel/release/subscriber failures still clear the terminal state; unmount/remount/destroy finish their
listener cleanup. Failed authoring preflight retains the active capture and original program. A singular
or empty viewport cannot acquire capture; one arising during a gesture cancels it.

DOM events, capture IDs and armed program references are runtime-only. Codec, static PNG/PDF and
renderer geometry remain unchanged. Browser tests cover actual mouse, Escape and touch on Canvas/SVG;
The click binding does not accept a pinch option; native navigation, region preview and session history are specified below.
Evidence: `test/unit/interaction-pointer-capture.test.js` and `test/browser/interaction-session.browser.js`.


## Brush and screen lasso bindings

Full sessions accept `{type:"brush",target,selection,axis?,channels?,mode?}` and
`{type:"lasso",target,selection,mode?}` through the common pointer arbitration rules. The existing authored
selection must match the explicit root or concat owner; facet-source geometry and linked target
writers are rejected. A missing endpoint after program replacement remains dormant. Brush axis
is `"x"`, `"y"`, `"theta"` or default `"xy"`. Optional `channels` maps each active axis to its same-axis semantic
channel (`x`/`x2`, `y`/`y2`); omitted entries use the primary channel. Bar end values use explicit
`channels:{y:"y2"}` or `{x:"x2"}` and the stored primary scale. Other secondary channels require their
own stored binding. Conditional positions require one identical binding across every branch.

Cartesian brush accepts resolved linear/log/time/ordinal/band/point scales.
It intersects finite scale ranges, preserves already resolved reversal, and stores the native named
`region` selector: numeric domain ranges or typed category values, intersected across active axes.
Time ranges use epoch milliseconds. Bands that touch the closed screen interval are included;
padding gaps do not select a nearest category. Zero-width intervals select nothing. Unsupported scale
families and arbitrary sampled changes to the owner's concrete frame reject before capture; no
animation scale is inferred. Lasso instead reads the accepted current frame. It tests the center of
each logical item's union of concrete hit bounds against an evenodd CSS-local polygon, including its
boundary. The center must pass current opacity and clip admission; missing/hidden items are absent.
Its native items selector stores exact keys and normalized `screenPolygon` metadata. Resizing retains
the keys rather than reevaluating the old screen polygon. A polygon with fewer than three distinct
points is empty. Lasso coordinates are relative to the mounted element, independent of DPR.

`mode` uses native replace/add/toggle/subtract/intersect semantics, default replace. Every preview
starts from the immutable pointerdown program, so repeated toggle previews do not accumulate.
Down must be within the owner's plot bounds. Native pointer capture/release and host
requestAnimationFrame/cancelAnimationFrame are required; custom click-only hosts are not drag hosts.
A displacement of at least 3 CSS pixels schedules preview. Lasso retains at most 10,000 distinct
consecutive samples, with 50,000 candidate anchors and a 10,000,000-unit cumulative geometric budget.
Capture errors or exceeded budgets release host state and retain the committed program.

At most one preview runs per animation frame. `select` events with `phase:"preview"` retain the
committed `previous`/`current` program and revision; `state.previewProgram` is a separate immutable
program with native selection consumers and a concrete translucent blue overlay. Hosts render that
program through the ordinary Canvas/SVG/PNG/PDF APIs. The accepted scene and hit frame remain those
of the committed program. Final up flushes its last point synchronously, then commits one native edit
and publishes commit/settled. The committed result has no overlay and previewProgram becomes null.
A click-sized brush still commits its empty region; a click-sized lasso commits empty keys.

Escape, pointercancel, lost capture, blur, accepted frame/program/edit replacement, remount, unmount,
and destroy clear pending RAF and preview state, release capture and publish one cancel event.
The prior program and trace remain exact; late up/RAF callbacks cannot commit. The same terminal and
FIFO guarantees as captured click apply. For SVG previews keep the captured host stable (for example,
a correctly sized wrapper containing the replaced SVG); replacing the capture element cancels it.
The host owns touch-action and rendering, and must redraw the committed program after cancel.
Region bindings participate in the common pointer arbitration below; they do not add keyboard or pinch handling.

Evidence: `test/unit/selection-region.test.js`, `test/unit/actions/selection/region-selection.test.js`,
`test/unit/interaction-region-gesture.test.js`, `test/contracts/interaction-types.test.js`.


### Angular brush

`{type:"brush",axis:"theta",target,selection,channels?:{theta:"theta"},mode?}` requires the explicit owner's
Polar coordinate and one identical stored theta binding across all conditional branches. Existing theta
scale authoring supports linear/time/discrete positions; this binding does not add scale families.
The owner's resolved Polar frame supplies center and radius. Down must lie in its disc and plot clip;
the exact center is inapplicable. A final center point has no angle and atomically fails with capture
cleanup. Positive angles run clockwise from the top. The directed start-to-end interval crosses zero
as `[start,2π) ∪ [0,end]`; equal angles mean empty, never an inferred full turn.

The adapter explicitly converts radians to the existing degree-based theta range and then inverts it
into native `region.theta` domain ranges or typed categories. Reversal is already resolved and is not
applied twice; shifted and partial degree ranges intersect the same periodic interval. Categories
retain domain order and include touched bands. If two domain endpoints project to the same seam
position, both are selected when that position is included. At most two sorted native ranges remain.
Proportional/weighted Arc sectors have no position-scale inverse and reject this binding; equal-band
radial sectors retain their existing category scale. A differing sampled animation frame also rejects
before capture. The ordinary Cartesian/lasso lifecycle and bounded cumulative category work apply.

`screenAngles:[startRadians,endRadians]` records normalized `[0,2π)` pointer metadata alongside native
theta regions or resulting item keys. Domain/keys alone define persistent membership through resize,
revision and restoration. The preview is an exact existing Polar sector path, clipped to the owner
plot, in the separate preview program; Canvas/SVG/PNG/PDF consume it identically.
Evidence: `test/unit/angular-brush-inversion.test.js`, `test/unit/interaction-angular-selection.test.js`,
`test/browser/interaction-region.browser.js`, and the interaction selection-preview renderer pair.


## Categorical legend selection

Full accepts `{type:"legend",effect:"selection",target,channel,selection,mode?,slop?}` as its one
editing pointer binding. `target` is an explicit root or concat owner, `channel` is an existing
public legend channel, and `selection` is an existing authored selection on that owner. The native
legend-block resolver must find exactly one categorical block. Combined color/stroke/shape/dash
blocks and categorical size-shape blocks retain their existing channel ownership. Continuous,
interval and sampled blocks reject; this binding does not implement visibility. Basic rejects.

`mode` defaults to `toggle` and accepts `replace` or `toggle`. Toggle applies the native symmetric
set difference to every currently visible final item whose own field equals the clicked category.
Numeric and string categories stay distinct, including when their formatted labels are identical.
The selector is a key snapshot at the existing grain. Replace of the same explicit snapshot is a
no-op; live predicates become snapshots even when their effective membership already matches.

Only actual current-frame symbol or label candidates for that target/channel qualify. Composite
symbol parts share one guide key. Title, background, overflow summary, other legend blocks and
empty categories do nothing. Native clip/opacity and CSS slop rules apply; `hitInvisible` and
`onMiss` are not accepted. The binding does not parse label text, expose a new guide key schema,
or infer a group from a continuous sample. Missing owner, selection or block after update becomes
dormant; an invalid or ambiguous replacement rejects without changing committed state.

The shared captured-click lifecycle, immutable native command transaction, selection policy and
linked-selection/filter closure apply with `origin:"user"`. Runtime bindings are recreated after
codec restoration; the native selection is persisted. Root and explicit child scopes are supported;
facet-source geometry and linked target-selection writers reject. Editing bindings use the common arbitration below.
Evidence: `test/unit/interaction-legend-selection.test.js`, `test/browser/interaction-session.browser.js`,
`test/contracts/realistic-logical-selection.test.js`, and the installed interaction consumer.


## Categorical legend visibility

Full accepts `{type:"legend",effect:"visibility",target,channel,scaleDomain,slop?}` as an editing
pointer binding. It selects an existing categorical legend block at the explicit root/concat owner;
no named selection is required. Each symbol/label click toggles that typed category using native
`setMarkVisibility`. Titles, background, overflow summaries and other blocks are inert. Missing
owners or removed legends become dormant. Continuous/interval blocks, facet geometry and Basic authoring reject. Captured-click cancellation, CSS slop, current-frame
identity and immutable input rules match categorical selection.

`dispatch({type:"setVisibility",target,payload:{channel,values,visible,scaleDomain},transactionId?,origin?,causeTransactionId?})`
invokes `setMarkVisibility`; `{clear:true}` replaces the payload to call `removeMarkVisibility`.
Both require the receiver's Full editor even for no-ops. A semantic/graphic no-op emits no transaction,
trace or revision. A successful transaction emits `setVisibility` commit/settled after selection
reconciliation and all linked changes. Errors retain the exact previous program, scene and trace.

The native [visibility contract](MARK_SELECTION.md#setmarkvisibility) owns the two explicit domain
policies and user-filter coexistence. All-data means the user-filter result before visibility. The
control legend retains that whole category domain and mapping so hidden groups can be re-enabled;
other automatic domains follow the selected policy, with explicit scale domains retaining precedence.
Visibility removes actual membership, never just opacity. Existing keep-hidden/drop selection policy
applies. Linked-filter writers own only the user filter: they project using the unfiltered universe,
then rebuild the native filter while preserving the separate visibility recipe. Intermediate candidates
are not published. Hidden-only native membership changes still commit even when the visible set stays
unchanged. Dormant hidden categories survive source revisions. Runtime bindings must be recreated after
codec restoration; visibility intent and original-row lineage are persisted in the program.

Evidence: visibility grammar/action/session suites, the real-data selection corpus and Canvas/SVG
browser interaction suite.


## Host controls and context requests

Parameter controls call the existing `setParameter` command with an explicit typed scalar. The host owns
inputs, parsing, labels, keyboard behavior, focus and listener cleanup. Parameter changes use the native
resource revision/DAG closure, then the same session reconciliation and linked propagation as other edits.
Invalid values preserve program/trace/revision; unchanged values do not commit. The session creates no
DOM widget or implicit coercion and does not bypass Basic's missing parameter editor.

`{type:"contextMenu",slop?,hitInvisible?}` adds one optional context binding alongside inspection and
editing pointer bindings. Only that explicit mounted binding prevents the native `contextmenu` default.
It emits `{type:"contextMenu",state}` through existing subscribers; `state.hit` contains current-frame
semantic candidates with the same CSS coordinates, clips, roles, item/row/resource identities and ordering
as inspection. Missing geometry produces a null target and diagnostics, never an inferred owner. No raw
DOM event, menu widget, action list or callback is serialized. The host determines which actions apply,
renders the menu, manages focus/Escape and dispatches a subsequent existing semantic command.

Headless and host keyboard requests use `dispatch({type:"contextMenu",point,pointerType?,slop?,hitInvisible?})`.
The point is CSS-local; query defaults match inspection. Requests do not mutate program, trace or session
revision. Subscriber edits enter the existing bounded FIFO after the context callback. Full and Basic
support read-only requests; authoring commands retain their own capability limits. Unmount, remount,
destroy and failed mount release exactly the installed listener, and stale callbacks are ignored.

Evidence: `test/unit/interaction-session.test.js`, `test/unit/interaction-selection.test.js`,
`test/browser/interaction-session.browser.js` and the installed interaction consumer.


## Host partition navigation

`focusHierarchy` uses `editPartitionPlot` for complete preflight and realization. The session refreshes its
current hit frame and publishes one commit/settled pair with the same scoped owner. The existing native
focus path clears any previous source-recovery diagnostic. Unknown/ambiguous node targets, incompatible
owners, invalid payloads and later dependent failures leave the previous committed state and trace intact.

The host can present navigation controls and breadcrumb text from `getMarkItems(...).navigation` and
`inspectProgram(...).views[].partition`; keys remain opaque. To send a focus command, retain the typed key
or grouped path from the host's hierarchy definition. No DOM breadcrumb, automatic key decoding or generic
session keyboard-focus state is created. Native buttons can dispatch the same command for pointer or
keyboard activation while preserving host focus. Generic gestures, coordinate-morph animation and session
keyboard focus remain separate capabilities.

Evidence: `test/unit/interaction-hierarchy-focus.test.js`, the canonical partition-focus browser snippet
and existing partition resource/renderer tests.

## Host projection viewport

`setViewport` delegates validation and materialization to the existing Full native owners, retaining
geometry identity, feature selection keys and projection revision semantics. Use either a nonempty
absolute patch with `scalePx`, `translatePx`, `centerDeg` and `rotateDeg`, or the exclusive payload
`{operation:GeoCameraOperation}`. The former invokes `editProjection`; the latter invokes
`navigateProjection` with its existing pan, inverse-anchored zoom, pinch, spherical rotation, fit,
explicit reset and resize contract. All pixel coordinates precede composition and host transforms.
An operation cannot accompany an absolute transform field, and unknown fields reject.

The target is always one explicit projection ID or `{childPath,id}`; the session never chooses another
projection or child. The host obtains reset parameters through `getProjectionView` and supplies them
explicitly. No second camera baseline is stored. The complete native action and dependent closure form
one transaction and history entry, including a resize that edits both Canvas and projection.
Invalid values, unsupported parameters, unknown targets and later dependent failures preserve the
previous program, trace, scene and revision. Asset preparation precedes commit; cancellation or failure
preserves committed program, current frame and history together, while late leases are disposed once.

Host buttons or typed controls may send either payload and redraw the committed program. They retain
native keyboard activation and focus. No pointer navigation listeners, animation or level-of-detail
zoom inference are installed by this direct command.

Evidence: `test/unit/interaction-viewport.test.js`, the canonical viewport browser snippet,
`test/support/scenarios/region-interaction.js` and the installed interaction consumer.


## Graph node dragging

`{type:"moveNode",target}` binds one explicit GraphPlot with a fixed or force layout and an explicit
plot origin. It uses the current visible node hit, the exact stored layout reference and original typed
source key. Edges/background do not capture. Facet sources, automatic origins, incompatible methods,
unsupported options fail closed. Editing bindings use the common arbitration below. Scope and explicit CSS transforms
follow the common coordinate owner; no graph position or transform is inferred from screen bounds.

Capture starts armed; movement of at least 3 CSS pixels begins dragging. The initial pointer-to-node
offset is retained. Coalesced host RAF previews always derive from the same immutable committed program.
The preview program and current hit scene agree, including native dependent edge routes and labels;
program revision and generation stay unchanged. Render `state.previewProgram ?? state.program`.
Pointer release commits one candidate and one commit/settled pair. A subthreshold click does not edit.

Escape, pointer cancellation, lost capture, blur, program/frame replacement, unmount and destruction
cancel the draft, cancel RAF and release capture. Cancelling a geometry preview accepts a fresh baseline
hit frame. Frame versions advance for previews and restoration as well as commit; an external frame
that interrupts a preview may receive a later frameVersion to retain this ordering. Read the current
frameVersion when producing the next external frame. Session revision still changes only on commit.
A sampled moving node must return to its committed concrete geometry before a new drag can start.

The host supplies capture, RAF and its touch-action policy. Keyboard controls may send `moveNode`
with explicit typed key and layout coordinates. General keyboard focus, unpinning and
automatic-origin dragging are separate capabilities. Evidence: `test/unit/interaction-node-move.test.js`,
the canonical node-drag browser example and the installed interaction consumer.


### Native annotation offset dragging

`{type:"annotate",target}` is one explicit Full Text or geographic annotation editing pointer binding.
It edits native dx/dy from the committed baseline using local pointer displacement and preserves all
data/plot/feature/item/screen anchor intent, lineage and item keys. The target layer is the edit unit:
all source-owned labels move together; use a separate annotation with membership for a single label.
Encoded offsets and facet sources reject. Missing owners are inert; malformed/Basic/other mark targets reject.
The common pointer arbitration rules apply. No new persisted schema or renderer is introduced.

The host provides pointer capture, RAF and touch-action policy. Only an exact target hit begins capture,
and the owner's graphics must match the committed frame. Root/child matrices convert CSS displacement
without DPR inference. Preview uses the same native editor, reconciliation/link closure and actual current
hit frame; immutable committed state changes only once on final release. Escape/cancel/lost capture/blur/
update/frame/unmount/destroy restore the committed frame and discard preview. Under-threshold clicks are
no-ops. Coordinate overflow cancels; native preflight errors release capture and publish error without commit.
Keyboard hosts dispatch the same annotate command. General keyboard focus remains a separate session capability. Evidence: `test/unit/interaction-annotation-drag.test.js`,
`test/browser/interaction-session.browser.js`, and installed `interaction/annotation-drag`.


## Bounded session history

`historyLimit` is an integer from 0 through 10000, default 100. `getState().history` is a frozen
`{undoCount,redoCount,limit}` summary. Runtime history retains immutable program references and the
corresponding private reconciliation records and linked-selection projections, never DOM or host objects.
It is not part of program serialization. Zero disables undo/redo retention but keeps the initial reset baseline.

`dispatch({type:"undo"|"redo"|"reset",transactionId?,origin?,causeTransactionId?})` restores a whole snapshot.
Target, payload and other options reject. The existing transaction metadata vocabulary, bounded FIFO and
same-drain loop guard apply. Successful native commits record one previous snapshot and clear redo;
preview/cancel/error and native no-ops record none. At the limit the oldest undo snapshot is evicted.
Undo/redo move between exact saved snapshots without authoring, cloning or selection reconciliation.
Runtime bindings remain active. Subsequent native edits reconcile from the restored selection records.

Reset restores the session-creation snapshot, independently of later external replacements, and records
one undoable transition if the program differs. Empty undo/redo and already-initial reset return unchanged,
cancelling active capture/preview with reason updateProgram but emitting no history commit. Successful
restores preflight counters, current host transform and hit frame before changing program or history;
failure publishes error and preserves committed program/trace/history. Success advances revision and
generation, clears transient hit, cancels active preview, and publishes commit then settled once.

Undo/redo preserve their transition's affectedOwners. Reset and external replacement transitions use []
for whole-program scope. `previous`/`current` identify exact snapshots. History restoration reports
selectionChanges [] because it restores stored selection state; current/state.linkedSelections carry
that state rather than new reconciliation diagnostics.

`updateProgram(program,{history?:"reset"|"record",origin?}={})` defaults to reset/programmatic.
Reset clears both stacks after successful preflight. Record adds the previous snapshot only when the
committed program reference changes. Both retain the session's original reset baseline and existing
external replacement/capture behavior. The program event adds origin and the resolved history policy.
Invalid options and failed replacements preserve program and history. Destroy releases both stacks
and the initial baseline; the public terminal state retains only the existing final committed snapshot.

Evidence: test/unit/interaction-history.test.js, test/unit/interaction-annotation-drag.test.js,
test/browser/interaction-session.browser.js and installed interaction fixtures.

## Atomic asset preparation

`createInteractionSession({program,bindings?,selectionPolicy?,historyLimit?,assetResolver?})` accepts
an optional explicit host callback. It receives `{program,signal,sessionGeneration,transactionId,
baseRevision,resourceRevisionVector}`. The program is the immutable native candidate; no DOM event
or mutable source is passed. The vector contains every dataset and stored resource in each composition
scope, including retained facet sources and invisible resources, with `childPath` plus its exact input
reference. Dataset entries retain logical identity. Snapshot work is bounded by 10,000,000 units and
100,000 resource entries. The callback must return or resolve a lease
`{images?,fonts?,shadows?,dispose()}` using the existing authentic prepared renderer handles.
A lease container may contain only those own data properties; handles must be frozen objects.
The renderer retains authentication and exact graphic identity validation. The host releases partial
preparation when its callback throws; the session owns every complete returned lease.

`state.assets` is a frozen projection of the accepted lease's rendering handles, or null before
initial preparation and after destroy. It is suitable as the renderer options for `state.program`;
it is not an animation-scene preparation or a second asset cache. `state.preparation` is the pending
job's four tags, or null. No second authoritative program enters state. `whenSettled()` returns the
job Promise current at that call: `{status:'settled'|'cancelled'|'error',preparation?}`. Without a
resolver it resolves immediately. Resolver and validation failures return error and publish one error
event; subscriber or disposer exceptions reject that Promise. Unobserved Promise rejection does not
create a global unhandled rejection, but awaiting the same Promise still observes the exception.

Without a resolver, native commands retain the existing synchronous lifecycle. With a resolver,
native action and hit preparation run before the callback, and dispatch returns queued. The previous
committed program, trace, revision, history and assets remain usable while the candidate prepares.
Only the same pending transaction with matching session generation, base revision, scoped resource
revision vector and immutable base program may commit. Acceptance installs the new handles and
candidate in one FIFO reducer, then emits commit and settled once. Failure emits error once with
commit zero. A superseding valid candidate, an unchanged restore, a new editing gesture or destroy
cancels pending work once, aborts its signal, and prevents a late commit or settled. Invalid commands
preserve an already pending job. A late complete lease is disposed once without publishing another event.
History stores no prepared handles; undo/redo/reset prepare their exact restored program again.

Initial preparation leaves revision/history unchanged. External updateProgram also waits for the
lease before publishing its existing program event or applying its history policy. Initial and external
preparation publish `{type:'assets',status:'settled'|'cancelled'|'error',preparation,diagnostics,state}`.
Native edits use their existing transaction event instead. Initial transaction ID is interaction-initial;
external replacements receive a generated ID. Inspection and mounting remain available while preparing.
A successful candidate is rebound to the current host transform immediately before commit.

Replacement aborts and disposes the previous accepted lease after publishing the replacement. Destroy
aborts pending work, releases its accepted lease and host listeners/capture, and clears callback and
candidate references. Host disposers are called once even when they throw. A destroy requested from a
subscriber remains terminal even if that subscriber throws; the original subscriber exception is
preserved. Reentrant commands still use the bounded FIFO and transaction-ID guard when asynchronous
completion enters the reducer. The session does not schedule worker layouts, observe resize, prepare
animation frames or import a renderer; those owners must pass their accepted native program explicitly.

## Prepared native replacements

`updateProgram(prepare, {history?,origin?,transactionId?,causeTransactionId?} = {})` accepts a host callback
returning an immutable program or a Promise of one. The callback receives a frozen `InteractionUpdateRequest`:
`{program,signal,sessionGeneration,transactionId,baseRevision,resourceRevisionVector}`. Its program is the exact
committed base at request start; the scoped vector includes that base's datasets and resources as specified above.
Use the existing native resource preparers and actions inside this callback. Forward `signal` to workers and
release partially acquired host resources in the callback's own `finally` block. No executor, worker protocol,
resource result or authoring action is implemented by the session.

The callback form returns queued and uses the same single pending preparation slot as asset preparation.
`whenSettled()` observes native computation, replacement validation and optional asset preparation together.
After computation, existing replacement selection/link/binding/hit validation runs before `assetResolver`.
That resolver receives the validated candidate and its candidate resource vector, while the outer job continues
to guard its original base tags and exact program identity. State preparation describes the outer base request.
The committed program, revision, history and accepted assets remain unchanged until all preparation succeeds.

Success publishes the existing `program` event followed by exactly one `update` event with status settled.
Failure publishes one update error and no program event; supersession or destruction publishes one update
cancelled. Update events have `transactionId`, `origin`, optional `causeTransactionId`, preparation tags,
diagnostics and current state. Their status is separate from native transaction phase. The history and origin
options retain the ordinary replacement defaults. Explicit transaction IDs and causes are accepted only by
the callback overload and reuse the existing bounded validation and subscriber loop guard.

A valid newer prepared replacement, ordinary replacement, native edit, restore or editing gesture aborts the
pending job. Invalid native input leaves it pending. Late success or failure cannot publish or overwrite newer
state. Inspecting, remounting or sampling a frame does not change the committed base; final candidate geometry
is checked against the current host transform before commit. Destroy aborts the native signal and disposes the
accepted renderer lease; duplicate destruction remains safe. Ordinary synchronous replacement is unchanged.

## Mounted surface observation

`observeResize` is an optional boolean, default false. True requires the mounted element's
`ownerDocument.defaultView.ResizeObserver`. The session observes only that surface with
`box:"content-box"` and emits `{type:"resize",size:{width,height},state}` through its existing
FIFO. Size is frozen, finite, non-negative content-box CSS pixels; zero is valid and exact
repeated dimensions are deduplicated per mount. DPR/rootTransform do not change measurements.
Observation does not edit authoring state, history, revision, hit frame or viewport. The host
may explicitly call an existing native action through updateProgram to choose its resize policy.

Each mount owns one observer. Remount/unmount/destroy disconnect it once; late callbacks cannot
publish. A failed constructor/observe attempt removes its listeners, capture and candidate index
while preserving the previous mount. A throwing disconnect does not prevent other cleanup.
Malformed or duplicate matching entries and batches over the existing 256 dispatch bound reject
before publication. Unsupported hosts fail explicitly; no global observer or inferred camera policy
is substituted. User-driven authoring and asynchronous preparation retain their existing contracts.


## Native camera navigation binding

`{type:"navigate",target,mode:"pan"|"rotate",scaleExtent:[min,max],initial,rotationStepDeg?}` is Full-only
and participates in the common pointer arbitration rules. `target` is one explicit projection ID or scoped
`{childPath,id}`; facet sources and composition containers reject. `initial` is an explicit native
`ProjectionParameters` snapshot with the same type as the current projection. The extent is finite,
positive and ordered. Only rotate mode requires a positive finite `rotationStepDeg`, measured in degrees
per local projection pixel; rotation requires a non-composite spherical projection. All other options
reject. The host supplies surface focus/tabindex and touch-action CSS.

One captured pointer translates or rotates from a fixed baseline. A second pointer is accepted only for
navigation and converts the existing native phase candidate into a fixed pinch baseline. The second
phase consumes native pinch center/distance; no duplicate camera math or stored camera is created.
RAF previews update the explicit preview program and hit frame; final up handles the latest coordinates
and one prepared candidate enters the existing selection/link/preparation/history pipeline. Native phase
revisions and trace decomposition remain intact; the session history gains one entry. A click, unchanged
two-pointer gesture or a drag returning to the initial position adds no history entry.

Wheel deltaMode0/1/2 means CSS pixels/16-pixel lines/surface-height pages. Finite delta maps to
`2^clamp(-deltaPx/300,-20,20)` before native extent clamping and inverse anchor validation. Zero delta is
unchanged. The focused surface's Arrow keys pan ten local pixels or rotate by ten times rotationStepDeg;
+/= and -/_ zoom by two/one-half at the visible owner Canvas center, Home resets to initial. Unknown keys
and Ctrl/Meta/Alt shortcuts are ignored. Wheel and keyboard interrupt an active draft and use the same
native command lifecycle. Pointer starts outside the owner's transformed Canvas clip are ignored.

Cancellation, source/frame replacement, remount and unmount restore both committed program and displayed
frame. Pending final asset preparation also displays the committed frame; failure or cancellation cannot
leave a camera preview visible. All pointer captures, RAF callbacks and DOM listeners are released on
teardown, and late callbacks are ignored. Removed target owners remain inactive; replacement owners must
remain compatible with the explicit binding. An independently sampled camera frame cannot be used as a
semantic baseline before the public animation adapter is connected. The accepted state.assets handles
belong only to state.program; previewAssets belongs only to the exact previewProgram, as described below.

Evidence: `test/unit/interaction-navigation.test.js`, shared pointer/session regressions and the canonical
navigation browser snippet. Full camera animation remains separate.

## Prepared gesture previews

When assetResolver is configured, the existing editing gesture adapters prepare transient candidates
through the same asset preparation owner. Initial committed preparation must be accepted before capture
starts. Each RAF sample supersedes the preceding pending preview; a previously accepted preview remains
visible while its replacement prepares. Success publishes previewProgram, readonly previewAssets and
the matching current hit frame together in one preview event. No committed program, revision, trace or
history changes. Without a resolver, existing synchronous previews remain and previewAssets is null.

state.preparation describes the current pending preview or native candidate using the existing four tags.
whenSettled observes the most recently started preparation, including its settled/cancelled/error result.
The callback receives the exact preview program and the same closed request shape. A gesture owns only
one pending and one accepted transient lease; the committed lease stays separate and remains usable.

Final pointer release calculates the latest candidate without starting another preview request, restores
the committed frame, disposes transient leases and uses the ordinary final preparation/history path.
Preview rejection reports one gesture error and commit zero; capture and the accepted preview are released.
Superseded results cannot publish, and each complete late lease is disposed once. Cancel, native replacement,
frame replacement, remount, unmount and destroy discard all transient preparation. Host abort listeners
observe the restored committed state. Returned lease disposers remain exactly-once even when they throw.
A disposer/subscriber exception after accepting a valid preview rejects that preparation Promise without
rolling the accepted preview back; later cancellation/destroy still releases it.

Host rendering selects state.previewProgram with state.previewAssets, or state.program with state.assets;
it must not reuse committed handles for a preview. Existing image/font/shadow authentication is unchanged.
This integration covers native gesture previews, not independently sampled animation scenes. Evidence:
test/unit/interaction-preview-preparation.test.js and the actual browser bitmap lifecycle fixture.


## Editing gesture arbitration

Every select, legend-selection/visibility, brush, lasso, moveNode, annotate or navigate binding accepts
optional `priority` and `modifiers`. Priority is an integer from -1,000,000 to 1,000,000. Defaults are
annotation 50, brush/lasso 40, node 30, navigation 20 and click/legend 10. Modifiers are an own-data record
with optional boolean alt, ctrl, meta and shift conjunctions; omission leaves that key unconstrained.
Equal priorities whose modifier conditions can overlap are initialization errors, even for different
owners. Explicit priority or disjoint modifier conditions resolve the ambiguity; array order never does.
Inspect/context-menu/linked bindings do not accept these options. Limits are 256 editing and 259 total.

On primary pointerdown, the session probes matching candidates in descending priority. Annotation/node
candidates require an exact current visible target hit; region/navigation candidates require the native
owner's current viewport and compatible committed frame. Click/legend candidates require their existing
native command to apply, including an explicit click clear-on-miss. Hidden, missing or out-of-viewport
candidates do not claim capture. Only the winning adapter begins a transaction; probes have no program,
history, capture or preparation side effects. One shared DOM capture owner serves all editing bindings.

The winner, modifier choice and transaction remain fixed through pointerup/cancel despite later modifier
changes. A second pointer promotes only the same navigation winner to pinch when it falls in that winner’s viewport; another child’s pointer is ignored. Final coordinates, 3 CSS px
threshold, RAF coalescing, preview assets, one commit/settled pair, undo and cancel restoration retain their
existing contracts. Program/frame replacement, source removal, remount, unmount and destroy cancel the
winner once and release shared listeners/captures. Late input cannot reactivate it. Pure click-only custom
surfaces remain supported; any drag binding requires capture and host RAF methods.

Wheel/keyboard select among matching navigation bindings; synthetic/keyboard click selects among matching
click/legend bindings. Native Ctrl/Meta/Alt keyboard shortcuts remain host-owned. Modifiers choose bindings
and never silently change a binding's authored update mode. An active pointer gesture does not switch
owners mid-drag. Public animation remains a separate integration. Keyboard focus is defined below. Evidence:
`test/unit/interaction-gesture-arbitration.test.js`, common capture regressions and actual browser consumers.

## Keyboard focus and native activation

A single `{type:'keyboard',targets:[{target,activation?}]}` binding accepts 1–256 distinct explicit
leaf mark targets in caller order. Targets use the existing root/concat `InteractionTarget`; an owner
component is addressed explicitly. Composite roots with no materialized native layer, facet sources
and implicit composition targets reject. Omitted activation provides read-only focus for Full/Basic.
`activation:{type:'select',selection,mode?}` requires an existing authored selection on the target;
mode is replace (default) or toggle and linked target writers reject. `{type:'focusHierarchy'}` requires
a Full partition owner and uses its existing native focus action. Unsupported activation options reject.

- `dispatch({type:'focus',target,itemKey})` accepts a scoped native item key or null for its owner
  container. A key must identify an eligible current item or exactly one current representation.
  Unknown, hidden, ambiguous, fully clipped and opacity-zero keys reject without a state change.
- `dispatch({type:'focus',move})` accepts next/previous/first/last across eligible targets and native
  item order, or parent/firstChild/previousSibling/nextSibling/root using the existing hierarchy
  navigation metadata. Traversal clamps at the ends; unavailable hierarchy neighbors are no-ops.
- `dispatch({type:'activate'})` uses only the configured activation of the focused current item.
  Selection delegates to the same native command as pointer selection. Partition activation resolves
  the exact original typed key or grouped path using the existing hierarchy source adapter; it never
  decodes opaque item keys. No activation or owner-container focus is a no-op.

`state.focus` starts null. Its immutable non-null value is
`{target,itemKey,currentItemKey,screenPoint,role}`. `itemKey` is the stable authored scoped identity;
`currentItemKey` is the present representation. For container focus both keys, screenPoint and role
are null. Focus survives accepted program/frame/host changes only while exactly one eligible item
represents it; otherwise it falls back to that configured owner container, including owner removal.
A later reappearance does not silently move container focus. Destroy clears focus. Focus is runtime
state, excluded from program serialization and history; only a changed focus dispatch emits `focus`.
Native edits and accepted frame changes include reconciled focus in their existing events.

Eligibility intersects native logical visibility with actual current-frame painted geometry and every
transformed clip. The shared hit geometry owner supplies an admitted CSS point with zero slop, preserving
fill rules, stroke caps/joins and dash gaps. Opacity zero and singular transforms are ineligible. Text
uses the existing declared metric-box hit policy, not a glyph-alpha claim. Overlapping items remain
eligible; z order chooses a primitive within one item and does not hide other logical items. Model work
is bounded by 100,000 items and 10M cumulative units; preparation precedes program/history commitment.
The same preparation and frame-generation rules still govern asynchronous candidates.

Mounted keyboard handling owns only the explicit surface (`event.target === element`), leaves nested
controls and Alt/Ctrl/Meta/Shift combinations to the host, and never traps Tab. Arrow/Home/End move focus;
for a hierarchy item Left/Right are parent/firstChild, Up/Down previous/next sibling and Home root.
Enter/Space activate. Escape invokes a partition activation's parent focus; elsewhere it is a no-op.
When keyboard and navigate bindings share one surface, the keyboard binding owns those key events and
camera wheel/pointer operations remain available. Existing capture cancellation still owns Escape for
an active drag. Remount/unmount/destroy remove listeners, and queued stale lease callbacks cannot act.
The host supplies tabIndex, roles, safe text descriptions, active-descendant IDs and focus drawing.
No DOM, HTML string, inferred accessible name or new renderer state is authored by the library.

Tooltip/touch parity for additional controls and public animation/reduced-motion integration remain
separate capabilities; this entry does not invent a player or an implicit timer.

The documented accessible-tooltip recipe is host-owned UI using the existing `inspect`, `focus` and
`activate` commands. It demonstrates safe native descriptions, a hoverable tooltip, Escape dismissal,
keyboard/touch selection and teardown for Canvas/SVG. The host reserves tooltip space so hiding it
cannot move adjacent controls during a click. It stores no alternate semantic selection, imports no
new runtime service and makes no reduced-motion/player support claim. `format:'items'` supplies current
logical fields/selected state; the session supplies exact current-frame eligibility. A host must dispose
its own tooltip/control listeners together with its session.

The documented native-control alternatives preserve ordinary HTML button/input focus and dispatch the
existing native edit/history commands with `origin: "user"`. Category controls remain reachable when
their items are hidden. Their status text reads committed `exportAccessibleData(..., {format:"items"})`
values and `selectedBy`; they do not infer visibility from opacity or keep a second selection/history
store. The parameter context-action button obtains its explicit native item's current-frame focus
point before requesting `contextMenu`, so keyboard and touch users do not need hover or right-click.
Hosts own labeled controls, safe text, control disposal and applicability; the library does not install
a DOM widget system. Public playback and reduced-motion integration remain outside these static examples.
