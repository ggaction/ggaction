---
layout: default
title: Grids
---

# Grids

{% include chart-example.html id="histogram" %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createGrid` | `createGrid()` | Cartesian horizontal or applicable Polar families | Concrete guides behind related marks |
| `editGrid` | `editGrid({ horizontal: { count: 6 } })` | Existing selected directions | One or both directions rematerialized |
| `removeGrid` | `removeGrid({ vertical: true })` | Existing selected directions | Semantic, graphic, and stored grid state removed |

## `createGrid(options?)`

Creates Cartesian or Polar grid geometry from encoded scales. Cartesian
defaults to horizontal only. A Polar-only chart creates theta spokes when theta
is encoded and radial circles when radius is encoded; charts with both channels
create both families.

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
| `theta` | boolean or Polar direction options | Polar-only: encoded theta |
| `radial` | boolean or Polar direction options | Polar-only: encoded radius |

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

Polar dispatch uses `createRadialGrid` for concentric closed paths and
`createThetaGrid` for center-to-edge spokes. Theta defaults to six ticks;
radius defaults to five. A zero radial tick remains available to the axis but
does not create a degenerate zero-radius circle. Polar grid color defaults to
`#d7e0ea`.

Use `false` to disable a direction. If scale or coordinate inference is
ambiguous, provide its ID explicitly.

## Editing grids

Use the direction-specific edit actions after that grid exists:

```javascript
program
  .editHorizontalGrid({ count: 6, color: "#cbd5e1" })
  .editVerticalGrid({ values: [50, 100, 150], strokeDash: [4, 2] });
```

Edit options are `count`, `values`, `color`, `lineWidth`, and `strokeDash`.
Use either `count` or `values`. `values: "auto"` restores current axis/scale
inference. At least one option is required.

Use `editGrid()` to update both directions through one aggregate action:

```javascript
program.editGrid({
  horizontal: { count: 6, color: "#cbd5e1" },
  vertical: { values: [50, 100, 150], strokeDash: [4, 2] }
});
```

Both selected directions must already exist. The complete request is validated
before either directional edit runs, so an invalid vertical patch cannot leave
a partially edited horizontal grid.

Grid edits preserve the existing scale and coordinate binding. They invoke a
wrapped directional rematerialization action, replacing only that direction's
concrete line geometry and appearance. `editGrid` delegates to these same
directional actions, which remain available for focused edits.

Polar grids use the same pattern through `editThetaGrid`, `editRadialGrid`, or
`editGrid({ theta: {...}, radial: {...} })`. `removeGrid` accepts the same
direction names.

`createGuides()` selects this default horizontal grid automatically when a y
encoding is present. Pass `createGuides({ grid: false })` to opt out.

## Removing grids

`removeGrid()` removes every existing direction. Select a subset with explicit
booleans:

```javascript
const noGrid = program.removeGrid();
const horizontalOnly = program.removeGrid({ vertical: true });
```

At least one direction must be selected; explicit false/false is an error.
Scales, coordinates, marks, and axes remain.

## Errors and limitations

Each selected direction requires one compatible resolved scale and matching
Cartesian or Polar coordinate. Ambiguous resources require explicit IDs.

## Related

[Guides](./guides.md) · [Axes](./axes.md) ·
[Advanced axis components](../advanced/axis-components.md)
