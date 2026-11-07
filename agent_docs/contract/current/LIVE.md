# Live chart contract

## Classification and entry

`ggaction/live` exports `chart()`, `LiveChart` and `playAnimation(from, to, canvas, options?)`. It is a stateful convenience layer over the immutable Full engine and is approved in [LIVE_API_PROPOSAL](../../impl/live/LIVE_API_PROPOSAL.md). `chart()` returns a `LiveChart` holding one current immutable `ChartProgram`. The default, Basic and other entries do not import this layer, and the engine's programs, traces, persisted snapshots and validation are unchanged.

## Authoring

- Every wrapped Full action on the program prototype is a `LiveChart` method of the same name and arguments. It replaces the current program with the action's result and returns the same `LiveChart`. `edit(update)` applies any program update. Both set the `reset` baseline.
- A failing action throws, and the current program, screen and interactions remain as they were.
- `program` returns the current immutable program. `pendingError` reports why the current program cannot yet be drawn or made interactive (for example a mark before its encodings). Such incomplete states are not failures. Drawing and interactions resume when a later call succeeds.

## Screen

- `addCanvas(element, { pixelRatio? })` accepts a canvas, an SVG element, or any container element (a canvas is created inside it). It draws immediately, and from then on every program change redraws. `pixelRatio` defaults to the element view's `devicePixelRatio`.
- `autoResize`, `setTheme`, `download("png" | "svg")` and `dispose()` delegate to `editCanvas`, `applyTheme` and the existing renderers. PNG requires an attached canvas. PDF is not a live download: it needs the Node.js native renderer, so `"pdf"` throws and names `renderToPDFBuffer(chart.program)` from `ggaction/pdf`. `dispose` removes every listener, observer and live DOM node, and later calls throw.

## Interactions

- Interaction methods create their native bindings on one interaction session over the current program. Adding an interaction rebuilds that session and resets its native history. On a complete chart, an interaction the engine cannot attach throws and is not added. On an incomplete chart it waits like drawing.
- Selection methods create and highlight one live persistent selection per mark named `live-<mark id>`.
- Drag tools share the pointer. The first drag tool is unmodified, and later ones require Shift, Alt, then Ctrl; more than four drag tools throw. When a click selection is present, every drag tool requires a modifier.
- Tooltips and hover markers are fixed-position DOM elements. Tooltip text comes from the accessible item fields of the current program and is assigned with `textContent` only.
- Axis-chart zoom and pan edit the target mark's continuous (linear, log, time) x/y scales with `nice:false`. Each wheel step is one history entry, and each pan drag is one history entry. Charts with a projection use the native `navigate` binding for both zoom and pan.
- `on(event, handler)` supports `select`, `hover`, `change` and `error`. A handler exception is reported to `error` handlers and does not stop other handlers.

## Data and change

- `setData(rows, { source?, animate? })` calls `reviseData` on the single drawn original dataset (or `source`) with a fresh revision id. When a screen is attached it animates by default.
- `animateTo` plans and plays an engine transition on the attached screen, then commits the target program. Without a screen it commits immediately.
- `playOver(field)` steps through the sorted distinct values of `field` with `setData`, then restores every row.
- `addSlider`/`addDropdown` bind a DOM control to an existing parameter through `editParameter`.
- `linkTo(other, { by })` links two live charts. A committed selection in one selects the items with equal `by` field values in each selection-bearing interaction of the other.
- `undo`, `redo` and `reset` step through the live history of program changes and interaction commits.
- `save()` returns JSON `{format:"ggaction-live", version:1, program, features}` where `program` is the engine's editable snapshot and `features` the interaction settings without functions. `LiveChart.load(text, element?)` restores both.
