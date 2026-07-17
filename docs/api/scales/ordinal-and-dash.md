---
layout: default
title: Ordinal and Stroke-Dash Scales
---

# Ordinal and Stroke-Dash Scales

{% include chart-example.html id="line" %}

{% include chart-example.html id="line" %}

## Discrete and ordinal scales

Band/point position, color, and stroke-dash encodings use ordered discrete
domains. Automatic domains preserve first-appearance order. `ordinal` remains
the appearance and offset lookup type; position uses explicit `band` or `point`.

A band or point position scale uses `"auto"` or a numeric pair as its range.
Automatic ranges use the plot bounds. Resolved band scales record signed
`step`, aligned `start`, and positive `bandwidth`; point scales record the same
geometry with zero bandwidth. Marks, ticks, labels, and grids read the same
resolved centers. Reversed explicit ranges are valid.

Color ranges accept explicit colors or a named palette descriptor; stroke-dash
ranges accept named styles and direct dash patterns.

```javascript
program.encodeColor({
  field: "Origin",
  scale: {
    domain: ["USA", "Europe", "Japan"],
    range: ["#4c78a8", "#f58518", "#e45756"]
  }
});
```

User-specified domains and ranges are semantic state. Resolved coordinates,
colors, and dash patterns are stored as concrete graphical values.

### Stroke-dash ranges

The names `solid`, `dashed`, `dotted`, and `dashdot` resolve to `[]`, `[6, 4]`,
`[1, 3]`, and `[6, 3, 1, 3]`. A direct pattern is an empty array or an
even-length array of non-negative finite numbers that is not entirely zero.

```javascript
program.encodeStrokeDash({
  field: "Origin",
  scale: { range: ["solid", "dashed", [8, 3]] }
});
```

Semantic scale state preserves the names; the resolved scale, line paths, and
legend symbols contain numeric patterns only. Pattern lengths use logical
Canvas units and do not change with output pixel ratio.

## Related

[Scale overview](../scales.md) · [Encodings](../encodings.md) · [Troubleshooting](../../troubleshooting.md)
