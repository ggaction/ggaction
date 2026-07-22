---
layout: default
title: Point Marks
---

# Point Marks

{% include chart-example.html id="scatterplot" %}

Point marks represent individual observations or derived items. Their semantic
type is `point`; circle, square, diamond, and other symbols are graphical
realizations of that meaning.

## `createPointMark({ id?, data?, shape?, fill?, opacity?, stroke?, strokeWidth? } = {})`

| Option | Type | Default or inference |
| --- | --- | --- |
| `id` | valid user-defined ID | first point mark uses `"point"` |
| `data` | existing dataset ID | current dataset |
| `shape` | supported constant shape | `"circle"` |
| `fill` | non-empty color string | theme color; conflicts with `encodeColor` |
| `opacity` | number from `0` to `1` | `1` |
| `stroke` | non-empty color string | no outline |
| `strokeWidth` | non-negative number | `0` |

```javascript
const program = chart()
  .createData({ values: cars })
  .createPointMark({ opacity: 0.48, stroke: "white", strokeWidth: 1.25 })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" });
```

The collection remains empty until compatible position encodings exist. When a
point is layered after one compatible source, omitted data, coordinate, x, and y
encodings are inherited and persisted. Ambiguous sources require an explicit
target or resource ID.

Radius is an encoding-owned graphical value rather than a `createPointMark`
option. Until a constant or field-driven size is authored, materialization uses
a radius of `3` logical pixels without storing a synthetic semantic encoding.
Use `encodePointRadius({ value })` for another constant radius or `encodeSize`
for a field-driven area mapping. `removePointRadius()` returns an explicitly
sized point mark to the theme radius without changing Polar position.

## `editPointMark({ target?, shape?, fill?, opacity?, stroke?, strokeWidth? })`

```javascript
const diamonds = program.editPointMark({
  shape: "diamond",
  fill: "#2563eb",
  opacity: 0.72,
  stroke: "#ffffff",
  strokeWidth: 0.6
});
```

`target` may be omitted for the current or only point mark. Supported shapes
are `circle`, `square`, `diamond`, four directional triangles, `plus`, `cross`,
`star`, `hexagon`, and `wye`. Every recipe preserves the same logical target
area. A constant shape conflicts with field-driven `encodeShape`, and constant
fill conflicts with a semantic color encoding.

Pass `stroke: false` to disable an existing outline. This removes its stored
width, rejects a simultaneous `strokeWidth`, and a later string stroke restores
the point default width `1`.

## `jitterPoints({ target?, channel, maxOffset, seed?, key? })`

Use bounded jitter to separate overlapping Cartesian points without changing
their semantic x/y values:

```javascript
const separated = program.jitterPoints({
  channel: "x",
  maxOffset: { band: 0.168 },
  seed: "origin-strip",
  key: "Name"
});
```

| Option | Type | Default or inference |
| --- | --- | --- |
| `target` | existing Cartesian point ID | current or only eligible point mark |
| `channel` | `"x"` or `"y"` | required |
| `maxOffset` | `{ pixels: positiveNumber }` or `{ band: number }` | required; exactly one form |
| `seed` | string or finite number | `0` |
| `key` | non-empty field name | source-row index identity |

`band` is greater than zero and at most `0.5`, and requires a categorical
position scale. The final glyph remains inside both its category slot and plot
bounds. Pixel offsets work with quantitative or categorical positions. The
seed and item identity produce stable offsets; use a unique `key` when offsets
must remain attached to rows after data reordering.

Calling `jitterPoints` again replaces the target policy and recomputes from the
semantic base position, so offsets never accumulate. Canvas, scale, data,
shape, radius, stroke, selection, highlight, and facet rematerialization retain
the assignment. Selectors that read `channel` still see semantic values, while
selectors that read concrete `property` values see final jittered geometry.

## `removeJitter({ target? } = {})`

```javascript
const restored = separated.removeJitter();
```

This removes the stored graphical assignment and restores positions directly
mapped from the mark's semantic encodings. Jitter is deterministic random
separation, not collision-free packing or a beeswarm layout. Polar point jitter
is not currently supported.

## Continue with encodings

- [Position encodings](../position-encodings.md)
- [Appearance encodings](../appearance.md)
- [Series and grouping encodings](../series-encodings.md)

## Errors and limitations

Point IDs must be unique, the dataset must exist, opacity must be between `0`
and `1`, and stroke width must be non-negative. At least one property is
required by `editPointMark`; `strokeWidth` requires an active string stroke.
Jitter requires a complete Cartesian x/y point
mark, a unique target, a valid offset form, and unique values for an explicit
identity key.
