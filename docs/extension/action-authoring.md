---
layout: default
title: Action Authoring
---

# Action Authoring

<div class="docs-concept-flow" role="img" aria-label="An extension action wraps an implementation, calls lower-level actions, and records one trace hierarchy">
  <span>action(metadata, fn)<strong>define</strong></span>
  <b aria-hidden="true">→</b>
  <span>wrapped calls<strong>compose</strong></span>
  <b aria-hidden="true">→</b>
  <span>trace subtree<strong>record</strong></span>
</div>

The extension entry point is for developers adding traceable domain actions.

```javascript
import { chart, render } from "ggaction";
import { action } from "ggaction/extension";

const addBadge = action(
  { op: "addBadge", description: "Add one extension-owned badge." },
  function () {
    return this
      .createGraphics({ id: "badge", type: "text" })
      .editGraphics({ target: "badge", property: "x", value: 16 })
      .editGraphics({ target: "badge", property: "y", value: 24 })
      .editGraphics({ target: "badge", property: "fill", value: "#334155" })
      .editGraphics({ target: "badge", property: "fontSize", value: 14 })
      .editGraphics({ target: "badge", property: "fontFamily", value: "sans-serif" })
      .editGraphics({ target: "badge", property: "textAlign", value: "left" })
      .editGraphics({ target: "badge", property: "textBaseline", value: "alphabetic" })
      .editGraphics({ target: "badge", property: "text", value: "Ready" });
  }
);

const program = addBadge.call(chart().createCanvas());

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

Subclass `ChartProgram` so independent extensions do not overwrite methods on
the shared base prototype. In JavaScript, a wrapped action can be assigned to
that subclass prototype directly.

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

## Strict TypeScript authoring

TypeScript cannot discover a method from runtime prototype assignment alone.
Use declaration merging to connect each runtime method to the exact wrapped
action type. The wrapped function preserves the concrete subclass passed as
`this`, so one custom method can chain into another without a cast or duplicated
option and return signatures.

```typescript
import { action, ChartProgram } from "ggaction/extension";
import type { FillPaint } from "ggaction/extension";

const extensionFill: FillPaint = {
  type: "linear-gradient",
  from: { x: 0, y: 0.5 },
  to: { x: 1, y: 0.5 },
  stops: [
    { offset: 0, color: "#eff6ff" },
    { offset: 1, color: "#1d4ed8" }
  ]
};

type SetPointOpacityOptions = Record<string, unknown> & {
  target: string;
  value: number;
};

class MyProgram extends ChartProgram {}

const setPointOpacityAction = action<SetPointOpacityOptions>(
  {
    op: "setPointOpacity",
    description: "Set the opacity of a point mark."
  },
  function ({ target, value }) {
    const withTarget = this.graphicSpec.objects[target] === undefined
      ? this.createGraphics({ id: target, type: "circle" })
      : this;
    return withTarget.editGraphics({
      target,
      property: "opacity",
      value
    });
  }
);

const markReadyAction = action(
  {
    op: "markReady",
    description: "Record that extension authoring is complete."
  },
  function () {
    return this;
  }
);

interface MyProgram {
  setPointOpacity: typeof setPointOpacityAction;
  markReady: typeof markReadyAction;
}

MyProgram.prototype.setPointOpacity = setPointOpacityAction;
MyProgram.prototype.markReady = markReadyAction;

export const extensionProgram = new MyProgram()
  .setPointOpacity({ target: "points", value: 0.5 })
  .markReady();

export const extensionPaint = extensionFill;
```

This exact module is compiled in the installed-package test with `strict: true`,
NodeNext module resolution, and `skipLibCheck: false`. At runtime both methods
return `MyProgram`; the trace contains `setPointOpacity` and `markReady` as root
actions, while the primitive calls remain children of `setPointOpacity`.

## Action contract

- Metadata requires a stable non-empty `op` and `description`.
- Every action accepts one plain option object.
- The implementation runs with the entered immutable program as `this`.
- It must return an instance of the same `ChartProgram` class.
- Wrapped actions called inside it become trace children.
- Successful completion leaves the returned program's action stack empty.
- The returned wrapped function preserves the concrete subclass used as `this`.

Arguments are summarized before storage in the trace. Arrays become counts, so
large values are not retained twice. Circular plain-object arguments are
rejected because a finite immutable trace summary cannot represent them.

Use the [primitive extension API](./primitives.md) to express semantic and
graphical changes. A semantic edit never materializes graphics automatically;
the enclosing action must invoke every required graphical operation.
