---
layout: default
title: Line and Area Marks
---

# Line and Area Marks

{% include chart-example.html id="line" %}

Line and area marks materialize ordered backend-neutral paths. Lines connect
values; areas close two edges or one density edge against a baseline.

## Line marks

### `createLineMark({ id?, data?, stroke?, strokeWidth?, opacity?, curve? } = {})`

```javascript
const program = chart()
  .createData({ values: cars })
  .createLineMark({ stroke: "#7c3aed", opacity: 0.55 })
  .encodeX({ field: "Year", fieldType: "temporal" })
  .encodeY({ field: "Acceleration", aggregate: "mean" });
```

The first ID is `"line"`, data defaults to current data, stroke width defaults
to `2`, opacity defaults to `1`, and curve defaults to `"linear"`. A line begins
as an empty path collection because later grouping determines series
cardinality. Complete encodings materialize sorted commands; color and stroke
dash may regroup them.

### `editLineMark({ target?, stroke?, strokeWidth?, opacity?, curve? })`

```javascript
program.editLineMark({
  curve: "monotone",
  stroke: "#7c3aed",
  strokeWidth: 4,
  opacity: 0.55
});
```

Supported curves are `linear`, `step`, `step-before`, `step-after`, `basis`,
`cardinal`, `monotone`, and `natural`. Smooth curves use cubic commands and
two-point series fall back to linear. Monotone paths require strictly increasing
materialized x values.

A constant `stroke` conflicts with field-driven `encodeColor`. Appearance is
stored and reapplied whenever scale, Canvas, or grouping changes rebuild paths.

## Area marks

### `createAreaMark({ id?, data?, fill?, opacity?, stroke?, strokeWidth?, curve? } = {})`

```javascript
const area = chart()
  .createData({ values: intervalRows })
  .createAreaMark()
  .encodeX({ field: "year", fieldType: "temporal" })
  .encodeYRange({ lower: "lower", upper: "upper" });
```

Area fill defaults to `"#4c78a8"`, opacity to `0.2`, and curve to `"linear"`.
An area becomes renderable with exactly one ranged orientation, or with a
complete density value/density pair. `encodeGroup` creates one closed path per
nominal group without creating a scale or legend.

### `editAreaMark({ target?, fill?, opacity?, stroke?, strokeWidth?, curve? })`

```javascript
program.editAreaMark({
  opacity: 0.35,
  stroke: "#334155",
  strokeWidth: 1.5,
  curve: "cardinal"
});
```

`stroke: false` removes both outline and stored width. A width-only edit
requires an active outline. Constant fill cannot replace a field-driven color
encoding. Complete paths rematerialize immediately; incomplete paths retain the
configuration until their encodings become renderable.

## Related

[Position ranges](../position-encodings.md) · [Series encodings](../series-encodings.md) ·
[Density](../encodings.md#atomic-density) · [Error bands](../error-bands.md)
