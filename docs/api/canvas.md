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

## Errors and limitations

Only one Canvas can exist in a program. Dimensions must remain positive and
margins must leave positive plot bounds.

## Related

[Rendering](./rendering.md) · [Coordinates](./coordinates.md) ·
[Scale options](./scales.md)
