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

## Continue with encodings

- [Position encodings](../position-encodings.md)
- [Appearance encodings](../appearance.md)
- [Series and grouping encodings](../series-encodings.md)

## Errors and limitations

Point IDs must be unique, the dataset must exist, opacity must be between `0`
and `1`, and stroke width must be non-negative. At least one property is
required by `editPointMark`.
