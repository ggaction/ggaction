---
layout: default
title: Canvas
---

# Canvas

{% include chart-example.html id="scatterplot" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createCanvas` | `createCanvas()` | Default size, background, and margin | Concrete Canvas and plot bounds |
| `editCanvas` | `editCanvas({ width: 800 })` | Unspecified properties remain unchanged | Updated Canvas and affected consumers |
| `fitCanvas` | `fitCanvas()` | Current Full-unit layout, fixed Canvas | Smallest valid quarter-pixel margins |

## `createCanvas(options?)`

Creates the program's single canvas and establishes bounds for later position
encodings.

| Option | Type | Default |
| --- | --- | --- |
| `width` | positive finite number | `640` |
| `height` | positive finite number | `400` |
| `background` | non-empty string | `"white"` |
| `margin` | non-negative number or side object | `{ top: 30, right: 30, bottom: 60, left: 70 }` |

```javascript
const program = chart().createCanvas({
  width: 640,
  height: 400,
  background: "white",
  margin: { top: 30, right: 30, bottom: 60, left: 70 }
});
```

## `editCanvas(options)`

Updates one or more existing canvas options. Omitted values are preserved. A
numeric margin applies to every side; a partial object updates only named sides.

```javascript
const resized = program.editCanvas({
  width: 800,
  margin: { left: 80 }
});
```

Width, height, or margin changes explicitly rematerialize connected automatic
position scales, line marks, axes, legends, and chart titles. Background-only
edits do not.

Margin is immutable materialization configuration used with the concrete Canvas
dimensions to derive plot bounds. It is neither a drawable node in
`graphicSpec` nor transient authoring context.

## `fitCanvas(options?)`

After marks, guides, and titles exist, a Full chart can shrink its margins while
keeping the Canvas size fixed:

```javascript
const fitted = program.fitCanvas({
  padding: 4,
  minPlotWidth: 160,
  minPlotHeight: 120
});
```

The action searches top, right, bottom, then left on a deterministic 0.25-pixel
grid. Every probe uses the same rematerialization and collision checks as
`editCanvas`. It preserves semantic state, scale domains, explicit scale ranges,
Canvas width, and Canvas height. Automatic ranges follow the fitted plot bounds.

| Option | Type | Default |
| --- | --- | --- |
| `padding` | non-negative finite number | `0` |
| `minPlotWidth` | positive finite number | `160` |
| `minPlotHeight` | positive finite number | `120` |
| `iterationLimit` | integer from 1 through 64 | `32` |
| `overflow` | `"error"` or `"report"` | `"error"` |

The default policy rejects an unsatisfied fit without changing the source
program. `overflow: "report"` applies the last valid margins and stores the
normalized policy, status, issues, fitted plot size, probe count, and layout
signature under `materializationConfigs.fitting`. Calling `fitCanvas` again with
the same layout and policy converges exactly. It runs only when explicitly
called; later edits are fitted by another explicit call.

## Errors and limitations

Only one Canvas can exist in a program. Dimensions must remain positive and
margins must leave positive plot bounds. `fitCanvas` is a Full unit action;
Basic does not expose it and compositions reject it.

## Related

[Rendering](./rendering.md) · [Coordinates](./coordinates.md) ·
[Scale options](./scales.md)
