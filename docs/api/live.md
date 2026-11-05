---
layout: default
title: Live Charts
---

# Live Charts

{% include chart-example.html id="scatterplot" lead=true %}

`ggaction/live` is the shortest path to an interactive chart in a browser. Attach a
canvas once with `addCanvas`; after that every call redraws immediately, and
interactions such as tooltips, brushing and zoom start working as soon as you add them.

The live chart wraps the same immutable programs as `ggaction`. Every authoring action
keeps its name and options and returns the same live chart, so a chain reads like any
other ggaction chart. `chart.program` returns the current immutable program whenever you
need the lower-level APIs.

## Build an interactive chart

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction/live";

const rows = [
  { name: "A", x: 1, y: 2, group: "north" },
  { name: "B", x: 3, y: 4, group: "south" },
  { name: "C", x: 5, y: 1, group: "north" }
];

const scatter = chart()
  .addCanvas(document.querySelector("#chart"))
  .createCanvas({ width: 420, height: 300, margin: 40 })
  .createData({ id: "rows", keyField: "name", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "x" })
  .encodeY({ field: "y" })
  .addTooltip({ fields: ["name", "x", "y"] })
  .addHover()
  .addBrush();

scatter.on("select", event => console.log(event.selected.points));
```

While a chart is still being built (a mark before its encodings), drawing waits until the
chart is complete; `pendingError` explains why. A call that fails throws and leaves the
chart, its screen and its interactions unchanged.

## Screen

| Method | What it does |
| --- | --- |
| `addCanvas(element, { pixelRatio? })` | Attaches a `<canvas>`, an `<svg>`, or a container (a canvas is created inside it) and draws at once. |
| `autoResize({ height? })` | Follows the container width (and height) with `editCanvas`. |
| `setTheme(theme)` | Applies a theme and redraws. |
| `download(format?, filename?)` | Saves `"png"` or `"svg"` and resolves with the file `Blob`. For PDF, call `renderToPDFBuffer(chart.program)` from `ggaction/pdf` in Node.js. |
| `dispose()` | Removes every listener, observer, tooltip and control. |

## Interactions

| Method | What it does |
| --- | --- |
| `addTooltip({ fields?, format?, target? })` | Shows item fields on hover as text. `format(fields)` returns a string. |
| `addHover({ target?, color? })` | Rings the item under the pointer. |
| `addClickSelect({ target?, mode? })` | Click to select (`"replace"` or `"toggle"`). |
| `addBrush({ target?, axis?, mode? })` | Drag a rectangle to select (`axis`: `"x"`, `"y"`, `"xy"`). |
| `addLasso({ target?, mode? })` | Draw a free-form region to select. |
| `addZoom(options?)` / `addPan(options?)` | Wheel zoom and drag pan. Axis charts edit their continuous scales; maps use native navigation. |
| `addLegendToggle({ effect?, channel?, target? })` | Click a legend entry to hide (`"visibility"`) or select (`"selection"`) its items. |
| `addDragNodes({ target? })` | Drag graph nodes (the graph plot needs an explicit `origin`). |
| `on(event, handler)` | `"select"`, `"hover"`, `"change"` or `"error"`; returns an unsubscribe function. |

When the chart has one mark, `target` may be omitted. Selections are created and
highlighted for you. Drag tools share the pointer: the first one uses a plain drag and later
ones use Shift, Alt, then Ctrl. With click selection present, every drag tool uses a modifier.

## Data and change

| Method | What it does |
| --- | --- |
| `setData(rows, { source?, animate? })` | Replaces the drawn data, animating by default. |
| `animateTo(next, { duration?, easing? })` | Animates to another chart, program, or `program => program.editScale(...)`. |
| `playOver(field, { duration?, loop? })` | Plays the data one value of `field` at a time; returns `{ pause, play, stop, finished }`. |
| `addSlider(parameter, options)` / `addDropdown(parameter, options)` | Binds a control to a parameter. |
| `linkTo(other, { by })` | Selecting items selects the items with the same `by` value in the other chart. |
| `undo()` / `redo()` / `reset()` | Steps through changes; `reset` returns to the last authored state. |
| `edit(program => …)` | Applies any immutable-program update. |
| `save()` / `LiveChart.load(text, element?)` | Saves and restores the chart with its interactions. |

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `scatter`, `rows`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
await scatter.setData(rows.map(row => ({ ...row, y: row.y + 1 })));
await scatter.animateTo(program => program.editScale({ id: "x", domain: [0, 10], nice: false }));
scatter.linkTo(other, { by: "name" });
const saved = scatter.save();
```

`playAnimation(from, to, canvas, { duration? })` plays one transition between two charts or
programs without keeping a live chart.
