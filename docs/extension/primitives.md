---
layout: default
title: Primitive Extension API
---

[Documentation home](../index.md) · [Action authoring](./action-authoring.md)

# Primitive Extension API

These methods are the low-level public extension layer, not the recommended
chart-authoring API.

## `editSemantic({ property, value })`

Creates or replaces one supported semantic property and structurally copies the
changed path.

```javascript
program.editSemantic({
  property: "layer[points].mark.type",
  value: "point"
});
```

Property paths use singular user-ID selectors such as `layer[points]` and
library-defined keys such as `encoding.x.field`. Unknown paths are rejected.
Dataset values cannot be replaced after creation.

## `createGraphics({ id, type, length? })`

Creates one concrete object or a homogeneous drawable collection.

```javascript
program.createGraphics({ id: "points", type: "circle", length: 2 });
```

Supported types are `canvas`, `container`, `circle`, `rect`, `line`, `text`,
and `path`. `length` is a non-negative integer accepted only for drawable types.
Equivalent repeated creation is idempotent.

## `editGraphics({ target, property, value })`

Sets one validated concrete property.

```javascript
program.editGraphics({
  target: "points",
  property: "x",
  value: [32.5, 81.4]
});
```

For a collection, an outer array distributes values by index and must match its
length. A non-array value is broadcast. Nested arrays and objects remain one
value per child. Generated child IDs such as `points:1` can be targeted.

## Scale materialization

`createScale({ id, type?, domain?, range? })` creates an idempotent semantic
scale. `rematerializeScale({ id })` resolves all consumers and invokes concrete
graphic edits, including connected axis updates.

```javascript
program
  .createScale({ id: "x", type: "linear" })
  .rematerializeScale({ id: "x" });
```

Rematerialization is explicit. It never runs merely because `semanticSpec`
changed.
