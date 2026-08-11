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

The extension entry point is for developers adding traceable domain actions and
installing them on the complete `chart()` program.

```javascript
import { action, registerExtension } from "ggaction/extension";
```

Define each method with `action()`, then register the complete package in one
batch. Registration runs when the extension package is imported.

```javascript
const setPointOpacityAction = action(
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

registerExtension({
  name: "ggaction-example-extension",
  actions: {
    setPointOpacity: setPointOpacityAction
  }
});
```

An application imports the extension for its registration side effect before
creating or using a complete chart program.

```javascript
import { chart } from "ggaction";
import "ggaction-example-extension";

const program = chart().setPointOpacity({ target: "points", value: 0.5 });
```

Registration affects `chart()` from `ggaction`, including programs created
before the import because methods live on the shared full-program prototype. It
does not add methods to `ggaction/basic`. An extension package must preserve its
registration module as a package side effect so bundlers do not remove it.

The entire action map is validated before any method is installed. Extension
names must be unique, action keys must match their wrapped `op`, and built-in,
internal, program-state, inherited, or previously registered names cannot be
overwritten. Non-conflicting packages work in either import order.

## Strict TypeScript authoring

TypeScript cannot discover runtime registration alone. Augment
`RegisteredExtensionActions` in `ggaction/extension` with each exact wrapped
action type. This makes registered methods visible on `ChartProgram` without
duplicating their option signatures.

```typescript
import { chart } from "ggaction";
import { action, registerExtension } from "ggaction/extension";
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

declare module "ggaction/extension" {
  interface RegisteredExtensionActions {
    setPointOpacity: typeof setPointOpacityAction;
    markReady: typeof markReadyAction;
  }
}

registerExtension({
  name: "ggaction-example-extension",
  actions: {
    setPointOpacity: setPointOpacityAction,
    markReady: markReadyAction
  }
});

export const extensionProgram = chart()
  .setPointOpacity({ target: "points", value: 0.5 })
  .markReady();

export const extensionPaint = extensionFill;
```

This exact module is compiled in the installed-package test with `strict: true`,
NodeNext module resolution, and `skipLibCheck: false`. At runtime both methods
return `ChartProgram`; the trace contains `setPointOpacity` and `markReady` as
root actions, while the primitive calls remain children of `setPointOpacity`.

## Isolated program classes

`ChartProgram` remains public for local or deliberately isolated program
classes. A subclass may assign wrapped actions to its own prototype. Installable
extension packages should use `registerExtension()` so multiple packages can
compose on the standard `chart()` factory with collision checks.

## Action contract

- Metadata is snapshotted when `action()` is called and requires a stable
  non-empty `op` and `description`.
- Every action accepts one plain option object.
- The implementation runs with the entered immutable program as `this`.
- It must return an instance of the same `ChartProgram` class.
- Wrapped actions called inside it become trace children.
- Successful completion leaves the returned program's action stack empty.
- The returned wrapped function preserves the concrete program class used as
  `this`.

Arguments are summarized before storage in the trace. Arrays become counts, so
large values are not retained twice. Circular plain-object arguments are
rejected because a finite immutable trace summary cannot represent them.

Use the [primitive extension API](./primitives.md) to express semantic and
graphical changes. A semantic edit never materializes graphics automatically;
the enclosing action must invoke every required graphical operation.
