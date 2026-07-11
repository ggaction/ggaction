---
layout: default
title: Action Authoring
---

[Documentation home](./index.md) · [Core concepts](./core-concepts.md)

# Action Authoring

The extension API is for developers who want to add traceable authoring actions
instead of only consuming the default chart-building API.

## Import the extension API

```javascript
import { action, ChartProgram } from "ggaction/extension";
```

The default `ggaction` entry point remains focused on chart authors. The
extension entry point deliberately exposes lower-level authoring contracts.

## Define an action

Subclass `ChartProgram` so an extension does not overwrite methods on the shared
base prototype.

```javascript
class MyProgram extends ChartProgram {}

MyProgram.prototype.recordNote = action(
  {
    op: "recordNote",
    description: "Record a custom trace note."
  },
  function ({ label } = {}) {
    return this;
  }
);

const program = new MyProgram().recordNote({ label: "example" });
```

An action definition has two parts:

- Metadata contains a stable `op` and a short human-readable `description`.
- The implementation receives one argument object and must return a
  `ChartProgram`.

Wrapped actions called by another wrapped action are recorded as children of
the calling action. Completed actions return with an empty action stack.

## Primitive actions

The extension layer also includes low-level primitive methods on chart
programs. They let action authors define explicit semantic and graphical
changes without an automatic semantic-to-graphic compiler.

### `editSemantic`

`editSemantic` creates or replaces one supported semantic property:

```javascript
const next = program.editSemantic({
  property: "layer[points].mark.type",
  value: "point"
});
```

The method validates the property path, returns a new program, and records an
`editSemantic` trace node. Inserted arrays and objects are copied and frozen.
Dataset values must be an array of row objects and cannot be replaced after the
dataset is created.

### `createGraphics`

`createGraphics` establishes a concrete graphic's identity and type without
assigning visual property values:

```javascript
const next = program.createGraphics({
  id: "points",
  type: "circle",
  length: 2
});
```

Omitting `length` creates one graphic. Supplying a non-negative `length` for a
drawable type creates a homogeneous collection with generated child IDs such
as `points:0` and `points:1`. Repeating an equivalent creation is idempotent;
reusing an ID with a conflicting definition throws an error.

### `editGraphics`

`editGraphics` creates or replaces one concrete property on an existing
graphic:

```javascript
const next = program.editGraphics({
  target: "points",
  property: "x",
  value: [32.5, 81.4]
});
```

For a collection, an outer array distributes values by child index and must
match the collection length. Any non-array value is broadcast to every child.
Nested arrays and objects remain intact as individual child values. A generated
child ID such as `points:1` may also be targeted directly.

All edits return a new program, copy caller-owned values, validate properties
against the graphic type, and record an `editGraphics` trace node.
