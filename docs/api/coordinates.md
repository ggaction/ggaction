---
layout: default
title: Coordinates
---

# Coordinates

{% include chart-example.html id="scatterplot" lead=true %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createCoordinate` | `createCoordinate()` | ID `main`, type `cartesian` | Named semantic coordinate, optionally attached to layers |
| `editCoordinate` | `editCoordinate({ target: "main", aspect: { mode: "frame", ratio: 1 } })` | Explicit target; at least one patch | Effective plot bounds or a Polar center/radius, then rematerialized consumers |

Position encoding actions normally manage coordinates automatically:

<div class="docs-concept-flow" role="img" aria-label="Cartesian encodings map x and y, Polar encodings map theta and radius, and Parallel encoding maps ordered dimensions">
  <span><code>encodeX + encodeY</code><strong>Cartesian channels</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>main / cartesian</code><strong>Horizontal and vertical position</strong></span>
  <span><code>encodeTheta + encodeR</code><strong>Polar channels</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>polar / polar</code><strong>Angle and radial position</strong></span>
  <span><code>encodeParallelCoordinates</code><strong>Ordered dimensions</strong></span>
  <b aria-hidden="true">→</b>
  <span><code>parallel / parallel</code><strong>One local scale per dimension</strong></span>
</div>

```text
encodeX / encodeY -> main / cartesian
encodeTheta / encodeR -> polar / polar
encodeParallelCoordinates -> parallel / parallel
```

The resolved coordinate definition and layer reference are stored in
`semanticSpec` before guide creation.

## `createCoordinate({ id?, type?, layers? })`

Use this advanced chart action when a named semantic coordinate must be created
or attached explicitly.

| Option | Type | Default |
| --- | --- | --- |
| `id` | valid user-defined ID | `"main"` |
| `type` | `"cartesian"`, `"polar"`, or `"parallel"` | `"cartesian"` |
| `layers` | array of existing layer IDs | `[]` |

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.createCoordinate({
  id: "detail",
  type: "cartesian",
  layers: ["points"]
});
```

Equivalent repeated creation is allowed. A conflicting type or an attempt to
reattach a layer that already uses another coordinate produces an error.

Polar point, line, and arc position actions create or reuse a Polar coordinate
automatically. The layer stores semantic theta/radius encodings, while
`graphicSpec` stores only final Cartesian x/y values and path commands for the
renderer.

`encodeParallelCoordinates` creates or reuses a Parallel coordinate and owns
the complete ordered dimension assignment on one line layer. Each dimension
uses its own namespaced scale and axis. Use the complete
[Parallel Coordinates API](./parallel-coordinates.md) for that contract.

## `editCoordinate({ target, aspect?, polarFrame? })`

Use this complete-entry action to constrain the shape of an existing coordinate
without changing the Canvas or its allocated plot rectangle.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "main"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const square = program.editCoordinate({
  target: "main",
  aspect: {
    mode: "frame",
    ratio: 1,
    alignX: "center",
    alignY: "center"
  }
});
```

`mode: "frame"` treats `ratio` as effective plot width divided by height.
ggaction places the largest matching rectangle inside the current plot allocation.
`alignX` and `alignY` accept `"start"`, `"center"`, or `"end"`; both default to
`"center"`.

`mode: "data"` treats `ratio` as x pixels per data unit divided by y pixels per
data unit. It requires a complete Cartesian coordinate whose active layers all
share one quantitative linear x/y scale pair:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `target: "main"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const equalUnits = program.editCoordinate({
  target: "main",
  aspect: { mode: "data", ratio: 1 }
});
```

Data aspect uses the final resolved domain spans, including `nice`, and preserves
reversed domain direction. A domain or Canvas edit recomputes the effective bounds,
scale ranges, marks, axes, and grids from the stored request. Explicit scale ranges
must already agree with the requested effective bounds.

Use `aspect: "auto"` to remove the constraint:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `equalUnits`. Resource selectors used here: `target: "main"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const automatic = equalUnits.editCoordinate({
  target: "main",
  aspect: "auto"
});
```

The action is available from `ggaction` and is absent from `ggaction/basic`.

For a Polar coordinate, `polarFrame` moves the center and constrains the radial
extent inside the aspect-adjusted effective bounds:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `polarProgram`. Resource selectors used here: `target: "polar"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const movedPolar = polarProgram.editCoordinate({
  target: "polar",
  polarFrame: {
    center: { x: 0.25, y: 0.5 },
    radius: { unit: "fraction", value: 0.8 }
  }
});
```

Center coordinates are finite fractions from 0 through 1. Fraction radius must
be greater than 0 and at most 1; pixel radius must be positive and fit between
the center and every frame edge. The object is a complete replacement:
omitting center restores `{ x: 0.5, y: 0.5 }`, and omitting radius restores
`{ unit: "fraction", value: 1 }`. Use `polarFrame: "auto"` to remove the
stored request.

When one call supplies both patches, ggaction resolves aspect, then the Polar
frame, then the radial scale range. Points, lines, arcs, Polar axes, grids, and
selection geometry all consume that same resolved frame. Fraction radii resize
with the Canvas; pixel radii remain fixed and reject a later Canvas size that
cannot contain them.

## `removeCoordinate({ id })` {#removecoordinate-id}

Full programs can remove an unattached named coordinate with an explicit ID:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const cleaned = program.removeCoordinate({ id: "temporaryFrame" });
```

The action checks layer, guide, annotation, and retained data-space bindings.
If any remain, it rejects with the owner and exact reference path. A
current-coordinate pointer alone is cleared and does not block removal.
Successful removal does not move a layer, infer another coordinate, rebuild a
guide, or change concrete graphics. Batch, cascade, and concat-wide deletion
are not supported. The action is available from `ggaction` and absent from
`ggaction/basic`.

## Errors and limitations

A layer cannot be silently moved from one coordinate to another, and Cartesian
x/y cannot be mixed with Polar theta/radius. Polar point, open-line, closed
radar, donut, rose, and radial-bar charts support theta/radius axes and grids.
Parallel coordinates support dimension axes but do not create a Cartesian or
Polar grid.

## Related

[Position encodings](./position-encodings.md) · [Axes](./axes.md) ·
[Grids](./grids.md)
