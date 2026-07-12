---
layout: default
title: Axes API
---

[Documentation home](../index.md) · [Coordinates](./coordinates.md) · [Advanced components](../advanced/axis-components.md)

# Axes API

## `createAxes(options?)`

Creates complete axes for encoded x/y channels. This is the recommended axis
action for ordinary chart authoring.

```javascript
program.createAxes({
  x: { title: { text: "Horsepower" } },
  y: { title: { text: "Miles per Gallon" } }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `coordinate` | `{ id?, type? }` | unique coordinate used by x/y layers |
| `x` | axis options or `false` | create when x is encoded |
| `y` | axis options or `false` | create when y is encoded |

`coordinate.type` accepts `"auto"`, `"cartesian"`, or `"polar"` as a stored
type assertion. Polar axis graphics are not implemented.

Each x/y axis option supports:

| Option | Value |
| --- | --- |
| `scale` | scale ID; inferred when one scale is used on the channel |
| `position` | `"bottom"` for x, `"left"` for y |
| `line` | `{ color?, lineWidth? }` |
| `ticksAndLabels` | `{ count?, values?, ticks?, labels? }` |
| `title` | title options including `text`, `at`, `offset`, and font styling |

Use either `count` or exact data-space `values` for ticks. Ambiguous coordinates
or scales must be selected explicitly. `createAxes` reads stored coordinates;
it never creates or repairs them.

The trace preserves its decomposition:

```text
createAxes
├─ createXAxis (when selected)
└─ createYAxis (when selected)
```

For individual lines, ticks, labels, and titles, see
[Advanced axis components](../advanced/axis-components.md).
