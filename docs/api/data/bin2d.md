---
layout: default
title: Rectangular 2D Bins
---

# Rectangular 2D Bins

<div class="docs-concept-flow" role="img" aria-label="Finite x and y pairs are assigned to rectangular cells, counted, and stored as a new immutable dataset">
  <span>source rows<strong>finite x/y pairs</strong></span>
  <span>grid edges<strong>automatic or explicit</strong></span>
  <span>cell assignment<strong>one cell per eligible row</strong></span>
  <span>derived rows<strong>bounds + count</strong></span>
</div>

`createBin2DData` groups two quantitative fields into a rectangular grid. It
stores concrete cell bounds and counts as a new dataset, so ordinary ranged
rectangles or other marks can consume the result without asking the renderer to
perform data transforms.

## `createBin2DData({ id, source?, x, y, bins?, extent?, includeEmpty?, members?, as? })`

```javascript
const program = chart()
  .createData({
    id: "observations",
    values: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 2 }
    ]
  })
  .createBin2DData({
    id: "cells",
    x: "x",
    y: "y",
    bins: { x: 2, y: 2 },
    extent: { x: [0, 2], y: [0, 2] },
    includeEmpty: true,
    as: { count: "count" }
  });
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | logical derived-dataset ID | required |
| `source` | existing dataset ID | current dataset; previous source on revision |
| `x`, `y` | quantitative field names | required |
| `bins` | positive integer or `{ x, y }` | `{ x: 10, y: 10 }` |
| `extent` | `{ x?: [min, max], y?: [min, max] }` | eligible min/max per axis |
| `includeEmpty` | boolean | `false` |
| `members` | boolean | `false` |
| `as` | partial output-field object | namespaced from `id` |

Only rows with finite values for both fields are eligible. Cells are half-open:
`[lower, upper)`. The last cell on each axis includes its upper endpoint, so
every eligible row belongs to exactly one cell. Output rows are ordered from low
to high y and then low to high x.

The stored transform includes the resolved axis extents and edge arrays. An
explicit extent must contain every eligible value; the action throws rather
than silently dropping rows. An automatic axis with no positive span also
throws instead of guessing a display range.

The default output fields are `__<id>_x0`, `__<id>_x1`, `__<id>_y0`,
`__<id>_y1`, and `__<id>_count`. Pass `as` to give downstream encodings shorter
names. With `members: true`, each cell also stores source row indexes. It never
copies complete source row objects into every cell.

## Revisions

Calling `createBin2DData` again with the same logical `id` creates a new immutable
revision, rebinds direct visual consumers, rematerializes their scales, marks,
and guides, and releases the unreferenced previous revision. Earlier programs
remain unchanged. A dependent derived dataset currently blocks replacement
with an explicit error; create a new logical ID when that dependency must remain.

## Related

[Data overview](../data.md) · [Source and derived data](./source-and-derived.md) ·
[Heatmaps](../basic-charts.md#createheatmap) · [Action reference](../../reference/actions.md)
