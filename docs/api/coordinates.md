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

```text
encodeX / encodeY -> main / cartesian
encodeTheta / encodeR -> polar / polar
```

The resolved coordinate definition and layer reference are stored in
`semanticSpec` before guide creation.

## `createCoordinate({ id?, type?, layers? })`

Use this advanced chart action when a named semantic coordinate must be created
or attached explicitly.

| Option | Type | Default |
| --- | --- | --- |
| `id` | valid user-defined ID | `"main"` |
| `type` | `"cartesian"` or `"polar"` | `"cartesian"` |
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

Polar point position actions create or reuse a Polar coordinate automatically.
The layer stores semantic theta/radius encodings, while `graphicSpec` stores
only final Cartesian x/y values for the renderer.

## Errors and limitations

A layer cannot be silently moved from one coordinate to another, and Cartesian
x/y cannot be mixed with Polar theta/radius. Polar axes and grids are not yet
supported; guide requests fail explicitly instead of creating Cartesian guides.

## Related

[Position encodings](./position-encodings.md) · [Axes](./axes.md) ·
[Grids](./grids.md)
