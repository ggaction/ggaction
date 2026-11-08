---
layout: default
title: Live Charts
---

# Live Charts

{% include chart-example.html id="gapminder-bubbles" lead=true %}

`ggaction/live` is the shortest path to an interactive chart in a browser. Attach a
canvas once with `addCanvas`; after that every call redraws immediately, and
interactions such as tooltips, brushing and zoom start working as soon as you add them.
The [interactive chart tutorial](../tutorials/interactive-chart.md) builds the chart
above step by step, including the page, the data file and a fifty-year animation.

## Live charts or interaction sessions?

| | `ggaction/live` | [`ggaction/interaction`](interaction.md) |
| --- | --- | --- |
| Who draws | The live chart redraws after every call and interaction. | You draw the program the session hands you on each commit. |
| State | One mutable `LiveChart` that wraps the current immutable program. | Every interaction step is a new immutable program you keep or discard. |
| Setup | One chain: `addCanvas`, chart actions, `addTooltip`, `addBrush`, … | Create a session, mount it on an element, render on `commit`. |
| Browser bundle (gzip) | About 1.0 MB, which already includes chart authoring. | About 144 KB for the session entry; building programs also uses `ggaction` (about 805 KB). |
| Limits | Cannot draw images, embedded fonts or shadows, because it renders without prepared resources. | Draws whatever you render, including prepared images, fonts and shadows. |
| Use it for | Dashboards, notebooks and quick interactive pages. | Applications that store each state, run headless, or render through their own pipeline. |

The live chart wraps the same immutable programs as `ggaction`. Every authoring action
keeps its name and options and returns the same live chart, so a chain reads like any
other ggaction chart. `chart.program` returns the current immutable program whenever you
need the lower-level APIs.

## Build an interactive chart

<!-- snippet-context:start -->

> **Fragment.** Not a complete program: it continues the setup described in this section.

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
| `autoResize({ height? })` | Follows the container width (and height) with `editCanvas`. Call `addCanvas` first. |
| `setTheme(theme)` | Applies a theme and redraws. |
| `download(format?, filename?)` | Saves `"png"` or `"svg"` and resolves with the file `Blob`. For PDF, call `renderToPDFBuffer(chart.program)` from `ggaction/pdf` in Node.js. |
| `dispose()` | Removes every listener, observer, tooltip and control; later calls throw. |

## Interactions

| Method | What it does |
| --- | --- |
| `addTooltip({ fields?, format?, target? })` | Shows item fields on hover as text. `format(fields)` returns a string. |
| `addHover({ target?, color? })` | Rings the item under the pointer. |
| `addClickSelect({ target?, mode?, color? })` | Click to select (`"replace"` or `"toggle"`). Selected items use `color` (default `#dc2626`); the others are dimmed. |
| `addBrush({ target?, axis?, mode?, color? })` | Drag a rectangle to select (`axis`: `"x"`, `"y"`, `"xy"`, or `"theta"` on polar charts). |
| `addLasso({ target?, mode?, color? })` | Draw a free-form region to select. |
| `addZoom({ target?, factor?, scaleExtent? })` / `addPan({ target?, scaleExtent? })` | Wheel zoom (`factor` 1.1 per step) and drag pan within `scaleExtent` (default `[0.25, 16]`). Axis charts edit their continuous scales; maps use native navigation. |
| `addLegendToggle({ effect?, channel?, target? })` | Click a legend entry to hide (`"visibility"`, the default) or select (`"selection"`) its items. Scale domains keep all data. |
| `addDragNodes({ target? })` | Drag graph nodes (the graph plot needs an explicit `origin`). |
| `on(event, handler)` | `"select"`, `"hover"`, `"change"` or `"error"`; returns an unsubscribe function. |

When the chart has one mark, `target` may be omitted. Selections are created and
highlighted for you and are stored as `live-<mark id>`. A `"select"` handler receives
`{ program, selected }`, where `selected` maps each mark ID to an array of the selected
items' fields, for example `event.selected.points` above. A mark with nothing
selected has no key. Drag tools share the pointer: the first
one uses a plain drag and later ones use Shift, Alt, then Ctrl, so at most four drag tools can
share a chart. With click selection present, every drag tool uses a modifier.

## Data and change

| Method | What it does |
| --- | --- |
| `setData(rows, { source?, animate?, duration?, easing? })` | Replaces the drawn data through `reviseData`. With a screen attached it animates by default (500 ms, `"cubic-in-out"`); without one it commits at once. |
| `animateTo(next, { duration?, easing? })` | Animates (500 ms, `"cubic-in-out"`) to another chart, program, or `program => program.editScale(...)`. Without a screen it commits at once. |
| `playOver(field, { duration?, loop?, source? })` | Plays the data one value of `field` at a time (600 ms per step, no loop); returns `{ pause, play, stop, finished }`. |
| `addSlider(parameter, { min?, max?, step?, label?, container? })` / `addDropdown(parameter, { options, label?, container? })` | Binds a control to a [parameter](data/expressions-and-normalization.md#parameters). The slider defaults to `0`–`100` in steps of `1`; the dropdown requires its `options` array. Call `addCanvas` first; controls go in `container` or else the canvas's parent. |
| `linkTo(other, { by })` | Selecting items selects the items with the same `by` value in the other chart. |
| `undo()` / `redo()` / `reset()` | Steps through changes; `reset` returns to the state after the last authoring call, `edit` or `setData`. |
| `edit(program => …)` | Applies any immutable-program update. `chart().addCanvas(element).edit(() => existingProgram)` makes a program you built elsewhere live. |
| `save()` / `LiveChart.load(text, element?)` | Saves and restores the program and its tooltip, hover, selection, zoom, legend and drag features. Function options (`format`), controls, links and event handlers must be added again after `load`. |

<!-- snippet-context:start -->

> **Fragment.** Not a complete program: it continues the setup described in this section. It uses `scatter`, `rows` from that setup.

<!-- snippet-context:end -->

```javascript
await scatter.setData(rows.map(row => ({ ...row, y: row.y + 1 })));
await scatter.animateTo(program => program.editScale({ id: "x", domain: [0, 10], nice: false }));
scatter.linkTo(other, { by: "name" });
const saved = scatter.save();
```

Each `setData` keeps the previous rows in the program so that `undo` and `save` can
reach them. A page that replaces its data forever, such as a polling dashboard,
should rebuild the chart instead, for example `live.edit(() => buildChart(rows))`,
so memory and saved text stay bounded. Give the rows a `keyField` so that items move
between updates instead of fading out and in.

`playAnimation(from, to, canvas, { duration?, easing?, pixelRatio? })` plays one transition
(500 ms, `"cubic-in-out"`) between two charts or programs on a `<canvas>` without keeping a
live chart.

Related: [Interaction sessions](interaction.md) · [Animation](animation.md) ·
[Data updates](../data-updates.md)
