---
layout: default
title: Coordinates
---

# Coordinates

{% include chart-example.html id="scatterplot" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createCoordinate` | `createCoordinate()` | ID `main`, type `cartesian` | Named semantic coordinate, optionally attached to layers |

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

## Errors and limitations

A layer cannot be silently moved from one coordinate to another, and Cartesian
x/y cannot be mixed with Polar theta/radius. Polar point, open-line, closed
radar, donut, rose, and radial-bar charts support theta/radius axes and grids.
Parallel coordinates support dimension axes but do not create a Cartesian or
Polar grid.

## Related

[Position encodings](./position-encodings.md) · [Axes](./axes.md) ·
[Grids](./grids.md)
