---
layout: default
title: Grids
---

# Grids

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createGrid` | `createGrid()` | Horizontal direction from y; vertical off | Concrete lines behind related marks |

## `createGrid(options?)`

Creates Cartesian grid lines from encoded continuous scales. With no options,
it creates a horizontal grid and omits the vertical grid.

```javascript
program.createGrid();
```

```javascript
program.createGrid({
  horizontal: {
    color: "#e2e8f0",
    lineWidth: 1,
    strokeDash: []
  },
  vertical: true
});
```

| Option | Type | Default |
| --- | --- | --- |
| `horizontal` | boolean or direction options | `true` |
| `vertical` | boolean or direction options | `false` |

Direction options are:

| Option | Meaning |
| --- | --- |
| `scale` | Scale ID; inferred from y for horizontal or x for vertical |
| `coordinate` | Cartesian coordinate ID; inferred from encoded layers |
| `count` | Positive requested line density |
| `values` | Exact finite data-space values; mutually exclusive with `count` |
| `color` | Stroke color; default `#e2e8f0` |
| `lineWidth` | Non-negative stroke width; default `1` |
| `strokeDash` | Even-length non-negative dash array; default `[]` |

When values and count are omitted, a grid reuses compatible existing axis
ticks. Without an axis it uses histogram bin boundaries for a binned x scale,
or five nice ticks for another continuous scale. Explicit values and count
always take precedence.

Horizontal lines span the plot width at y-scale positions. Vertical lines span
the plot height at x-scale positions. Grid graphics are inserted before the
first related mark in rendering order, even when `createGrid` is called after
that mark was created.

Canvas and connected scale changes explicitly rematerialize concrete grid
positions. Grid style is graphical state; only the resolved scale and
coordinate IDs are stored in `semanticSpec`.

The trace preserves direction-level actions:

```text
createGrid
├─ createHorizontalGrid?
└─ createVerticalGrid?
```

Use `false` to disable a direction. If scale or coordinate inference is
ambiguous, provide its ID explicitly.

`createGuides()` selects this default horizontal grid automatically when a y
encoding is present. Pass `createGuides({ grid: false })` to opt out.

## Errors and limitations

Each selected direction requires one compatible resolved scale and Cartesian
coordinate. Ambiguous resources require explicit IDs.

## Related

[Guides](./guides.md) · [Axes](./axes.md) ·
[Advanced axis components](../advanced/axis-components.md)
