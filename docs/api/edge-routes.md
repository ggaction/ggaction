---
layout: default
title: Edge Routes
description: Bundle existing graph edges, retain their identities, and prepare bounded vector routes in a worker.
---

# Edge routes

Bundle connections from an existing [graph layout](graphs.md). The graph keeps
its original nodes and edges. Stored routes are sampled vectors used by the same
GraphPlot, selection, inspection, Canvas, SVG, PNG and PDF consumers.

{% include chart-example.html id="edge-routes" %}

The [edge route tutorial](../tutorials/edge-routes.md) uses this executable example.

## `bundleGraphEdges`

**Chart authoring, Full only.**

```typescript
bundleGraphEdges(options: TargetedOptions<BundleGraphEdgesOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
```

Pass `{id, graph?, layout?, method, options?, coordinateSpace?}`. ID and method
are required. An omitted layout uses the current eligible fixed/circular/force
layout, then the unique eligible layout. Graph defaults to that layout's exact
input. Missing, ambiguous or incompatible resources fail.

| Method | Options | Behavior |
| --- | --- | --- |
| `hierarchical` | Required `mapping`; optional `hierarchy`, `hierarchyLayout`, `strength` (0.85), `tolerance` (0.001), `maxSubdivisions` (4096) | Follow a common ancestor path with a clamped spline |
| `force-directed` | `compatibilityThreshold` (0.6) | Deterministic attraction between compatible edges |
| `density` | No method-specific tuning | Fixed 256×256 field and 20 density-advection iterations |
| `edge-path` | `exponent` (2), `maxStretch` (2) | Follow real graph edges with bounded detours |

Hierarchical mapping entries contain an original typed `nodeKey` and scalar
`hierarchyKey`. Cover every graph node once. A tree layout supplies x/y anchors;
a treemap supplies rectangle centers. Mapped anchors must match graph node
positions. Strength is in [0,1], tolerance is positive, and subdivisions are an
integer from 1 to 4096. Force compatibility is in [0,1]; edge-path exponent is positive
and maxStretch is at least one.

All methods accept `zeroLength:"point"` and `limits`. Without `execution`, the
original synchronous policy applies. Coincident endpoints retain
a point route and a diagnostic, with no invented junctions. Empty graphs produce
empty complete routes. Limits can lower the default maxima: 100,000 nodes,
1,000,000 edges, 10,000,000 candidate pairs, and 10,000,000 active samples. A shared
work budget and 30,000 commands per route also apply. Invalid values, overflow or
exhausted budgets fail without storing partial results. Force bundling reuses each
symmetric pair calculation while preserving ordered forces and coordinates. Work
diagnostics and their result hash can change after this optimization; the fixed
schedule and limits remain the same.

`coordinateSpace` defaults to `"world"`. `"screen"` also binds the current plot
bounds: Canvas resizing, responsive guide layout and exact-plot margin growth
recompute each affected screen route once. Source and viewport changes share one
revision, including other screen routes on the same Canvas. World routes retain
their result. GraphPlot currently translates stored layout coordinates in either
case.

## `editEdgeRoute`

**Chart authoring, Full only.**

```typescript
editEdgeRoute(options: TargetedOptions<EditEdgeRouteOptions> | ApplyGraphEdgeRoutesOptions): ChartProgram;
```

Pass a nonempty patch with `target?`, `graph?`, `layout?`, `method?`, `options?`,
or `coordinateSpace?`. Target uses the current/unique resource rule and supports
explicit composition child paths. Same-method options patch stored values;
changing method starts from that method's defaults. Mapping and other required
inputs must be supplied for the new method. Even an explicit same-value edit
produces the next revision.

## Bind, revise and inspect

Use `createGraphPlot({routes:'routesId'})` to bind routes from the same exact graph
and layout. `editGraphPlot({routes:false})` restores native curves. Omitting routes
preserves an existing plot's binding. Native `parallelGap` and `loopRadius` apply
when the binding is removed. Node radius trims the visible path and arrows follow
its final tangent; stored center anchors stay unchanged.

For the original synchronous policy, graph, source, layout and hierarchy edits preflight every dependent route and
plot, then update their revisions and graphics once. Failures preserve the old
program and trace. Remove consuming marks or detach routes before removing a
route resource. Remove authored routes before their input resources. Serialization
retains complete vectors and validates their input references and hashes without
rerunning a solver. These hashes check consistency, not cryptographic trust.

Edges retain original row membership and item identity, including when several
routes overlap. Inspection and accessible export count original edges. Highlights
and current sampled-frame hits use their concrete geometry. There is no synthetic
bundle-junction node.

## Prepare in a worker

**Advanced host API.** Import `prepareGraphEdgeRoutes`, `createGraphRouteExecutor`
and the worker-side `computeGraphEdgeRoutes` from `ggaction/graph`.

`prepareGraphEdgeRoutes(program, request, host)` accepts a create or edit request
(`kind:"create"` or `"edit"`) plus the action options. Host requires a nonempty
`requestToken` and optionally a native `signal` and executor. Apply its opaque
handle with only `{prepared, requestToken}` on the exact original program.
Changed receivers, wrong operations/tokens, copied handles and aborted requests
fail. Host options are captured before waiting.

`createGraphRouteExecutor({createWorker?})` returns `compute(job,{signal?})`,
`evict(inputHash?)` and `dispose()`. With no factory, it runs the same synchronous
numeric owner. A factory returns a browser Worker or matching message-event host.
The worker receives `{job}` and posts `computeGraphEdgeRoutes(job)`. Jobs and
completions use structured-clone data only; callbacks and workers never enter a
program or renderer.

The instance permits eight pending workers and caches at most eight completed
inputs with a total of one million control/command samples. Larger results are
returned without caching. Eviction without a hash clears the cache. Completion,
error, cancellation and disposal detach listeners and terminate each request's
worker. Disposal rejects pending work and prevents reuse. Late replies cannot
apply an older preparation. Keep the executor alive only for the host workflow
that owns it, then call `dispose()`.


## Explicit bounded execution

**Advanced host API, Full authoring.** Set `options.execution` to opt into stored
route version 2. Every policy field is required; there are no numeric defaults.

| Field | Maximum | Meaning |
| --- | ---: | --- |
| `policy` | `"bounded-route@1"` | Exact policy name |
| `maxWork` | 8,000,000,000 | Cumulative native route work units for preparation and application |
| `maxCandidatePairs` | 50,000,000 | Cumulative candidate pairs |
| `maxSamples` | 16,777,216 | Peak active route samples under the existing counting rules |
| `maxBufferBytes` | 134,217,728 | Live reserved typed buffers and hash scratch bytes |
| `maxBytes` | 134,217,728 | Each complete canonical tagged job or completion packet in UTF-8 bytes |

Numeric values must be positive safe integers no greater than these maxima.
`options.limits` then accepts only `maxNodes` and `maxEdges`, with the same defaults
and maxima as before. The execution policy is the sole owner of the other limits.
The buffer quota does not measure the entire JavaScript heap. Capacity admission
also does not guarantee completion time or responsiveness for every input.

For version 2, preparation requires an executor with `createWorker` and an explicit
`deadlineMs`, a positive safe integer at most 30,000. The deadline covers preparation
through native consumer preflight. Cancellation or expiry terminates the worker and
returns no handle. Synchronous sections can finish before expiry is observed; this
API does not promise a maximum main-thread pause. The final application checks the
original signal and adds its validation work to the preparation total.

The following host fragment assumes `program` already contains graph `g` and its
layout `l`, and `route-worker.js` is served as an ES module:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
import { createGraphRouteExecutor, prepareGraphEdgeRoutes } from "ggaction/graph";

const executor = createGraphRouteExecutor({
  createWorker: () => new Worker("./route-worker.js", { type: "module" })
});
try {
  const prepared = await prepareGraphEdgeRoutes(program, {
    kind: "create", id: "routes", graph: "g", layout: "l", method: "force-directed",
    options: { execution: {
      policy: "bounded-route@1", maxWork: 8_000_000_000,
      maxCandidatePairs: 50_000_000, maxSamples: 16_777_216,
      maxBufferBytes: 134_217_728, maxBytes: 134_217_728
    } }
  }, { requestToken: "routes-1", executor, deadlineMs: 30_000 });
  program = program.bundleGraphEdges({ prepared, requestToken: "routes-1" });
} finally {
  executor.dispose();
}
```

The corresponding complete worker module uses the explicit async entry:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `self`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
import { computeGraphEdgeRoutesAsync } from "ggaction/graph";

self.onmessage = async ({ data: { job } }) => {
  self.postMessage(await computeGraphEdgeRoutesAsync(job));
};
```

Version 2 jobs and completions have `schemaVersion:2`; the stored resource has
`algorithmVersion:"2"`. Use `GraphRouteJobV2`, `GraphRouteCompletionV2` and
`EdgeRouteResourceV2` when declaring these values. The async entry rejects version
1 jobs, and the original synchronous entry rejects version 2 jobs. Version 2
`diagnostics.work` includes worker job validation and solver work;
`peakBufferBytes` reports the worker's observed peak. Host validation and application
costs are additionally checked against the request budget. Stored hashes cover the
same canonical tagged value format, including typed keys and signed zero.

One bounded request exclusively owns its executor until completion. It clears any
previous version 1 cache, does not cache its result, and rejects concurrent work.
Version 1 retains its original synchronous fallback, cache, limits and protocol.

Create or edit a version 2 route through `prepareGraphEdgeRoutes`, then use the
ordinary authentic prepared application. A same-method edit retains the stored
execution policy; a method change requires an explicit replacement policy. Raw
synchronous route creation or recomputation rejects version 2 intent. Native layout and graph/hierarchy resource revisions use the explicit prepared update below. Source dataset, viewport,
fit and other native update actions remain outside the current public update union.
Stored version 2 vectors still restore offline and render through every existing
backend. Consumer materialization remains an explicit wrapped action after prepare.


## `applyGraphEdgeRoutesUpdate`

```ts
applyGraphEdgeRoutesUpdate(options: ApplyGraphEdgeRoutesUpdateOptions): ChartProgram;
```

Prepare `editLayout`, `editGraphData`, `editFlowData`, `editHierarchyData` or
`editInferredGraphData` on the exact completed Full unit program that owns at least
one affected version 2 route. Each uses its original native arguments, validators,
primitives, dependent resources, route consumers and theme completion. Candidate
graph chains are included before their layouts and routes.

Data, parameter, Canvas and filter edits (`reviseData`, `editDerivedData` and its
focused editors, `editParameter`, `editCanvas`, `fitCanvas`, `navigateProjection`,
`applyDataUpdate`, `filterMarks`, `removeMarkFilter`) compute their routes deep
inside one synchronous native call. Preparation runs that call, computes each
route job it reaches on the worker, and records the ordered completions that the
final application must reach again in the same order. Any other public action is
prepared the same way; its affected routes are the version 2 routes it actually
reaches. An action that reaches none, such as most guide, encoding, mark and
theme edits, is rejected with a message to call it directly. Composition receivers
accept the deterministic data, parameter and filter edits with a scoped target and
other actions that reach routes through their own dispatch; `reviseData`,
`applyDataUpdate` and Canvas edits stay on unit receivers. Graph plots cannot be
faceted. Preparation never runs a synchronous fallback.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "l"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
const preparedUpdate = await prepareGraphEdgeRoutes(program, {
  kind: "update",
  edit: { action: "editLayout", args: { target: "l", node: { key: 1, x: 25, y: 10 } } }
}, { requestToken: "layout-2", executor, deadlineMs: 30_000 });
program = program.applyGraphEdgeRoutesUpdate({
  prepared: preparedUpdate, requestToken: "layout-2"
});
```

Preparation snapshots arguments before its first await. An authentic
`editInferredGraphData({prepared, requestToken})` retains its original frozen inference
handle identity; the inference owner checks the exact receiver, token, edit kind
and original signal again during application. A copied handle is rejected.
Preparation checks the complete
request against every affected version 2 policy. It includes native preparation,
worker results, consumer validation and wrapped preflight completion. Applying
starts from that accounting snapshot and checks the additional native apply costs.
Previously completed route samples held while later routes compute count toward
the same peak. Packet size limits remain specific to each job and completion.

The handle is bound to the exact original receiver, constructor, native action,
request token and signal. Copies, restored traces, replaced actions and stale bases
cannot authorize application. The receiver stays unchanged on failure. Canceling
the original signal also revokes an already prepared handle. Reuse on the same
immutable receiver starts a separate application from the same preparation costs.

Preparation opens no action invocation scope while awaiting work. Application
runs the original synchronous native action once, records it as the first child,
then completes normal materialization and theme reconciliation. Stored trace
inspection reads only that exact native child; later completion siblings grant
no authoring or execution authority. Full request latency, including synchronous
snapshot, cloning, posting and final materialization, has no verified 100ms bound.
The initial descriptor scan and deep clone also have no separate depth, total heap
or fully metered work bound in the current request ledger.
