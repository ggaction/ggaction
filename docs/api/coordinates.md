---
layout: default
title: Coordinate API
---

[Documentation home](../index.md) · [Encodings](./encodings.md) · [Axes](./axes.md)

# Coordinate API

Position encoding actions normally manage coordinates automatically:

```text
encodeX / encodeY -> main / cartesian
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

Polar semantic coordinates are valid resources, but Polar position actions and
guide graphics are not implemented in the current phase.
