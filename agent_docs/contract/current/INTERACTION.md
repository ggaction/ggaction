# Interaction session contract

## Classification and entry

`ggaction/interaction` exports `createInteractionSession({ program, bindings?, selectionPolicy? })` as an advanced browser-safe controller function. It is not a wrapped action. Inspection supports Full and Basic programs without changing their state. Editing commands invoke the receiver’s existing Full domain actions, retain their trace decomposition and replace only the session’s current immutable program. No action, renderer or persisted schema is added. The default authoring and rendering entries do not import the controller.

`bindings` accepts at most one `{ type: "inspect", events?, slop?, hitInvisible? }` record plus up to 256 explicit linked-selection bindings described below. Omission enables `pointermove` and `click`; `[]` keeps headless commands available without DOM listeners. Explicit events must contain one or two distinct values from those names. `slop` is a finite non-negative CSS-pixel distance; omission resolves to 3 for mouse/pen and 6 for touch. `hitInvisible` defaults to false. Unknown options, including gesture bindings, clock and assetResolver, are rejected.

## Handle and commands

- `mount(element, { rootTransform? } = {})` accepts an event surface with `addEventListener`, `removeEventListener`, and `getBoundingClientRect`; public declarations use `Element`. It installs passive listeners and returns an idempotent unmount function. A later successful mount removes the previous listeners. Invalid frame/host setup preserves the previous state. `rootTransform` is an explicit six-number local-to-CSS affine matrix; omission is identity. CSS layout matrices and DPR are never guessed. The host renders the same program at the declared logical size and supplies any additional matrix.
- `dispatch({ type: "inspect", point, pointerType?, slop?, hitInvisible? })` accepts an explicit CSS-local `{x,y}`. The pointer type is mouse (default), pen, or touch. Mounted events subtract the current client rectangle once. Root matrices transform indexed shapes and clips, preserving slop in CSS pixels; localPoint remains the child Canvas coordinate. Empty viewports or singular matrices produce no hit with diagnostics.
- `dispatch({ type: "leave" })` clears the transient hit.
- `dispatch({ type: "frame", scene, version, generation })` snapshots a version-2 concrete Canvas scene. `generation` must equal current state and `version` must be a greater non-negative safe integer. Stale commands return `{status:"stale"}` without examining scene contents. Current frames retain known node keys, type and topology from the current program; subsets and concrete sampled coordinates are permitted. Unknown keys or changed topology fail atomically. Use the accepted `getState().scene` with `renderTransitionScene` so drawing and targeting share one exact snapshot. The session does not sample animations, schedule RAF, or infer geometry from endpoints.
- `updateProgram(program)` prepares the full replacement before committing it, increments frameVersion, generation and session revision, and clears transient hits. Earlier immutable programs and their indices are unchanged. Existing mounted bindings remain active.
- `subscribe(listener)` registers a synchronous listener and returns an unsubscribe function. Events are `{type,state}` with type inspect, leave, frame, program, mount, unmount, or destroy; program events also include `selectionChanges` below. Each state is an immutable snapshot. Reentrant commands run FIFO after the current event, at most 256 commands per drain and queued operations. Subscriber errors propagate, preserve the already published state, and discard pending work.
- `getState()` returns `{program,scene,frameVersion,generation,revision,hit,linkedSelections,mounted,destroyed}`. It remains readable after destruction and contains no host objects.
- `destroy()` removes listeners and disposes the active index once; first call returns true and later calls false. Pending work is discarded. Later dispatch, mount, subscribe, or updateProgram calls throw a disposed error.

Dispatch and updateProgram return `{status:"applied"|"queued"|"stale"|"unchanged"}`. Reentrant calls return queued; invalid operations throw. No inspection creates a selection resource, persistent hover, authoring transaction, history entry or asset request.

## Hit results and semantic association

`hit` is null until inspection, or `{target,candidates,diagnostics,statistics,frameVersion}`. Target is the first candidate or null. Candidates contain `{itemKey,ownerId,role,childPath,rowKeys,resourceRefs,screenPoint,localPoint,distance,zIndex}`. Keys are opaque. Ordering is frontmost zIndex, nearest distance, then stable key/path/owner. All overlapping logical items remain in candidates; decorative parts of one item collapse once.

Mark metadata comes from the final materialized item identity and exact data/resource revision. Filtered-out graphics have no candidates. Guide roles are axis-tick, axis-title, legend-item, facet-header, and chart-title. Cartesian/Polar/Parallel tick marks and labels bind raw typed values, including wrapped/renamed labels; axis lines and grids remain decoration. Categorical legend layers and their clipped windows share a value item with the label; overflow summary is a distinct item. Continuous samples and tick labels bind the existing resolved sample values; an entire gradient strip is one range item. Legend titles are separate legend items; backgrounds remain decoration. Chart title/subtitle lines share their respective item. Facet headers belong to their composition, and child guides retain the actual childPath. Guide targets do not invent data lineage.

Filled paths honor nonzero/evenodd holes, strokes honor widths, dash gaps, caps and joins, and clips always exclude outside points. Transparent fill is targetable; fill none is not. Opacity zero is omitted unless hitInvisible is true. Text uses concrete per-line metric rectangles, including rotation and outline extent; it is not glyph-alpha picking. Images use their placed clipped viewport. Shadows do not expand hit geometry. Path approximation is bounded by 0.25 CSS px.

## Bounds and unsupported operations

Preparation supports at most 100,000 scene nodes and a 10,000,000-unit cumulative work budget; a query has a 2,000,000-unit budget. External frame snapshot work is bounded before canonical concrete validation. Guide layout reuse accounts for sample comparisons before computation. Frames containing accessors, cycles, unsupported objects, excessive work or mismatched semantic cardinality are rejected atomically.

Editing gestures, navigation, keyboard focus, async assets and history have no commands in this entry yet. PNG/PDF exports remain static; the controller targets the same concrete geometry in browser Canvas/SVG or a headless host.

Evidence: `test/unit/interaction-session.test.js`, `test/unit/interaction-selection.test.js`, `test/unit/hit-guides.test.js`, `test/unit/hit-program.test.js`, `test/unit/hit-frame.test.js`, `test/browser/interaction-session.browser.js`, `test/contracts/interaction-types.test.js`.


## Atomic selection and parameter commands

The following advanced controller commands require an explicit `target` and `payload`:

- `dispatch({type:"select", target, payload:{id,select,mode?}, transactionId?,origin?,causeTransactionId?})` creates a missing selection with mode `replace` (default) or updates the same ID and owner. `select` is the existing `MarkSelectionSelector`, including item keys, typed ranges and parameter-backed boolean ASTs. `add`, `toggle`, `subtract`, and `intersect` require an existing selection and reuse its native set semantics.
- `dispatch({type:"clearSelection", target, payload:{id}, transactionId?,origin?,causeTransactionId?})` replaces an existing selection with an empty item set, `empty:"none"`, and its existing grain. The resource, highlight, label and conditional consumers remain valid. It does not remove the resource or reset the chart.
- `dispatch({type:"setParameter", target, payload:{value}, transactionId?,origin?,causeTransactionId?})` invokes the existing parameter editor and its entire dependency closure. An unchanged scalar value returns `{status:"unchanged"}` without a trace, revision or event. Basic lacks these editors and rejects them even for unchanged values.

A target is a root owner ID string or `{childPath,id,facetSource?}` using existing action scopes. Selection commands identify the mark owner; parameter commands identify the parameter. No list or inferred owner is accepted. Concat paths retain exact item namespaces; facet selection edits require `facetSource:true` and regenerate retained cells. Generated facet cells cannot be edited individually. An existing selection must belong to the stated owner. Child paths are limited to 1,024 components; ordinary action target validation also applies.

Each accepted edit first invokes the wrapped domain action on an immutable candidate and prepares its complete current hit frame. Only successful preparation replaces the session program/scene, increments revision, generation and frameVersion once, and clears the transient hit. The original program remains unchanged. The host renders `event.current` or the current accepted scene; the controller does not draw or prepare renderer assets. `settled` means this synchronous program/frame work has completed, not that a host renderer or asynchronous asset job has finished.

Transaction events contain `{type,transactionId,origin,causeTransactionId?,phase,revision,affectedOwners,previous,current,diagnostics,selectionChanges,state}`. The type is the command type. `previous` and `current` are immutable program references. `affectedOwners` contains the explicitly addressed owner and changed linked target owners, each with its child path; it is not an inventory of every rematerialized dependency. Origin defaults to `programmatic`, with `user`, `replay`, and `linked` also accepted. IDs are nonempty strings of at most 1,024 characters; an omitted ID is generated within the session. A cause ID records provenance without enabling automatic linked propagation.

Successful commands publish `commit` then `settled` at one revision. A valid envelope whose payload, target, action or frame preparation fails publishes one `error` with unchanged program/frame/revision, empty affectedOwners and a diagnostic, then throws. Malformed envelopes and unsafe snapshots are rejected before a transaction begins. Subscriber errors propagate and stop further delivery, preserve an already committed state, and discard pending work; they are not reported as action rejections.

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
animation frame do not remove semantic membership.

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
