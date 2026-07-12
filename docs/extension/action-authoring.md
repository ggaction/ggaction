---
layout: default
title: Action Authoring
---

[Documentation home](../index.md) · [Primitive API](./primitives.md)

# Action Authoring

The extension entry point is for developers adding traceable domain actions.

```javascript
import { action, ChartProgram } from "ggaction/extension";
```

Subclass `ChartProgram` so independent extensions do not overwrite methods on
the shared base prototype.

```javascript
class MyProgram extends ChartProgram {}

MyProgram.prototype.setPointOpacity = action(
  {
    op: "setPointOpacity",
    description: "Set the opacity of a point mark."
  },
  function ({ target, value } = {}) {
    return this.editGraphics({
      target,
      property: "opacity",
      value
    });
  }
);
```

## Action contract

- Metadata requires a stable non-empty `op` and `description`.
- Every action accepts one plain option object.
- The implementation runs with the entered immutable program as `this`.
- It must return an instance of the same `ChartProgram` class.
- Wrapped actions called inside it become trace children.
- Successful completion leaves the returned program's action stack empty.

Arguments are summarized before storage in the trace. Arrays become counts, so
large values are not retained twice.

Use the [primitive extension API](./primitives.md) to express semantic and
graphical changes. A semantic edit never materializes graphics automatically;
the enclosing action must invoke every required graphical operation.
