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
`generation`, `hit`, `mounted`, and `destroyed`. A hit contains `target`,
`candidates`, `diagnostics`, `statistics`, and `frameVersion`. Singular transforms
and empty viewports produce no hit plus diagnostics.

Subscribers receive `{ type, state }`; event types are `inspect`, `leave`, `frame`,
`program`, `mount`, `unmount`, and `destroy`. Dispatch and program updates return
`{ status: "applied" | "queued" | "stale" }`. Reentrant operations run FIFO after
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
other session methods reject further work.

Preparation is limited to 100,000 scene nodes and 10,000,000 work units; queries
are limited to 2,000,000 units. Work includes geometry, metadata and guide sample
comparisons. The session does not persist host objects or hover state. Editing
gestures, selection transactions, keyboard navigation, history, and asset loading
are not supported commands. PNG/PDF exports remain static.
