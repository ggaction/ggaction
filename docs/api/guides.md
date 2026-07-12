---
layout: default
title: Guides
---

# Guides

## `createGuides(options?)`

Creates the applicable axes, Cartesian grid, and categorical legend supported
by the current semantic encodings.

```javascript
program.createGuides();
```

Pass child options to customize each guide:

```javascript
program.createGuides({
  axes: {
    y: { ticksAndLabels: { count: 6 } }
  },
  grid: {
    horizontal: { color: "#e2e8f0" }
  },
  legend: {
    title: "Origin"
  }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `axes` | `createAxes` options or `false` | automatic |
| `grid` | `createGrid` options or `false` | automatic horizontal grid |
| `legend` | `createLegend` options or `false` | automatic |

`false` explicitly skips that guide:

```javascript
program.createGuides({ legend: false });
```

Axes are selected when an x or y encoding exists. A horizontal grid is selected
when a y encoding exists; vertical grid remains off unless requested. A legend
is selected for line color/stroke-dash encodings or a bar color encoding.
Unsupported point legends are not selected.

`createGuides` only selects and calls existing wrapped actions. Coordinate,
scale, target, field, and domain validation remains the responsibility of
`createAxes`, `createGrid`, and `createLegend`, so ambiguous charts still
require their explicit child options. If nothing is selected, the action
reports an error.

The trace preserves the composition:

```text
createGuides
├─ createAxes?
├─ createGrid?
└─ createLegend?
```

Chart titles are not guides. Create them separately with
[`createTitle`](./titles.md).

Call [`createGrid`](./grids.md), [`createAxes`](./axes.md), or
[`createLegend`](./legends.md) directly when only one focused guide action is
desired.
