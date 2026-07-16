---
layout: default
title: Axes
---

# Axes

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createAxes` | `createAxes()` | Encoded Cartesian channels, scales, coordinate, titles | Complete selected x/y axes |

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
| `position` | x: `"bottom"` or `"top"`; y: `"left"` or `"right"` |
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

A band or point x scale uses its complete domain as the default tick and label
values. Each value is placed at the shared band or point center and formatted
with `String(value)`. Explicit `ticksAndLabels.values` may select a domain
subset in the requested order. Discrete axes reject `count` so categories are
not silently omitted. Reversed ranges and Canvas rematerialization preserve
the stored category values.

For a binned histogram x encoding, omitted tick options use the inferred bin
boundaries. This keeps the axis aligned with every rect edge. Explicit
`ticksAndLabels.count` or `ticksAndLabels.values` takes precedence. Count y
axes use numeric nice ticks and infer titles such as `count(Displacement)`.

Titles are inferred from the unique encoding consuming each scale. Aggregate
encodings include their operation, so `mean` on `Acceleration` becomes
`mean(Acceleration)`. Pass `title.text` when inference is ambiguous or a custom
label is desired.

The default edges remain bottom for x and left for y. A complete axis forwards
an explicit edge to its line, ticks, labels, and title:

```javascript
program.createAxes({
  x: {
    position: "top",
    ticksAndLabels: { labels: { format: ".1f" } }
  },
  y: { position: "right" }
});
```

Top ticks point upward and right ticks point right. Labels and titles are
placed outward from the selected edge. The Canvas margin must already be large
enough; guide creation does not resize it.

Numeric label formats are `.0f`, `.1f`, `.2f`, `.0%`, `.1%`, and `.2e`.
UTC time formats are `%Y`, `%Y-%m`, and `%Y-%m-%d`. Numeric formats require a
linear scale, time formats require a time scale, and ordinal labels use
`"auto"`. The existing `{ decimals: nonNegativeInteger }` form remains
available for linear labels.

The selected coordinate ID is stored on each semantic axis. Canvas size and
margin edits explicitly rematerialize positional scales and every connected
axis component.

The trace preserves its decomposition:

```text
createAxes
├─ createXAxis (when selected)
└─ createYAxis (when selected)
```

For individual lines, ticks, labels, and titles, see
[Advanced axis components](../advanced/axis-components.md).

## Errors and limitations

Ambiguous scale or coordinate candidates require explicit IDs. Each channel
still has one semantic axis, so top and bottom x axes (or left and right y
axes) cannot be created simultaneously. Polar axes are unsupported.

## Related

[Guides](./guides.md) · [Grids](./grids.md) ·
[Advanced axis components](../advanced/axis-components.md)
