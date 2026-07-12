---
layout: default
title: Axes
---

# Axes

## `createAxes(options?)`

Creates complete axes for encoded x/y channels. This is the recommended axis
action for ordinary chart authoring.

```javascript
program.createAxes({
  y: { ticksAndLabels: { count: 6 } }
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

Linear scales create numeric nice ticks. Time scales choose a UTC calendar
interval near the requested count and format labels automatically. For example,
a 1970–1982 domain produces labels such as `1970`, `1972`, ..., `1982`.
Explicit time values are finite timestamps.

For a binned histogram x encoding, omitted tick options use the inferred bin
boundaries. This keeps the axis aligned with every rect edge. Explicit
`ticksAndLabels.count` or `ticksAndLabels.values` takes precedence. Count y
axes use numeric nice ticks and infer titles such as `count(Displacement)`.

Titles are inferred from the unique encoding consuming each scale. Aggregate
encodings include their operation, so `mean` on `Acceleration` becomes
`mean(Acceleration)`. Pass `title.text` when inference is ambiguous or a custom
label is desired.

The selected coordinate ID is stored on each semantic axis. Canvas size and
margin edits explicitly rematerialize continuous scales and every connected
axis component.

The trace preserves its decomposition:

```text
createAxes
├─ createXAxis (when selected)
└─ createYAxis (when selected)
```

For individual lines, ticks, labels, and titles, see
[Advanced axis components](../advanced/axis-components.md).
