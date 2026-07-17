---
layout: default
title: Data and Mark Filtering
---

# Data and Mark Filtering

{% include chart-example.html id="selection" %}

{% include chart-example.html id="regression" %}

## `filterData({ id, source?, field, oneOf | predicate | range })`

Create a named derived dataset without replacing or mutating its source.

```javascript
const selected = chart()
  .createData({ id: "cars", values: cars })
  .filterData({
    id: "selectedCars",
    field: "Origin",
    oneOf: ["Japan", "USA"]
  });
```

| Option | Type | Required |
| --- | --- | --- |
| `id` | dataset ID | yes |
| `source` | existing dataset ID | no; defaults to current dataset |
| `field` | non-empty string | yes |
| `oneOf` | non-empty scalar array | one filter mode required |
| `predicate` | `{ op, value }` | one filter mode required |
| `range` | `{ min, max, inclusive? }` | one filter mode required |

The derived dataset stores its source ID, filter transform, and immutable
materialized values. Exactly one of `oneOf`, `predicate`, or `range` is required.
Rows retain source order, the source remains unchanged, and the new dataset
becomes current data for the next mark.

Comparison operators are `"eq"`, `"neq"`, `"lt"`, `"lte"`, `"gt"`, and
`"gte"`. Equality is strict and never coerces values. Ordered comparisons
require both values to be finite numbers or both to be strings; incompatible or
missing field values are omitted. String order is lexicographic.

```javascript
const powerfulCars = chart()
  .createData({ id: "cars", values: cars })
  .filterData({
    id: "powerfulCars",
    field: "Horsepower",
    predicate: { op: "gte", value: 150 }
  });
```

Range endpoints must be the same type and `min` cannot exceed `max`.
`inclusive` defaults to `true`; setting it to `false` excludes both endpoints.
An empty result is valid.

```javascript
program.filterData({
  id: "midDisplacementCars",
  source: "cars",
  field: "Displacement",
  range: { min: 100, max: 300, inclusive: true }
});
```

## `filterMarks({ target?, ...selector })`

Filter existing final mark items without changing the source dataset.
`filterMarks` uses the same selector grammar as `selectMarks`, infers the current
mark when possible, creates a namespaced immutable dataset such as
`pointsFilteredData`, rebinds only that mark, and rematerializes its scales,
graphics, and connected guides.

```javascript
const filtered = chart()
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Acceleration" })
  .filterMarks({
    field: "Origin",
    op: "oneOf",
    values: ["Japan", "USA"]
  });
```

Choose exactly one selector value source: `field` for a data value unique at
the item grain, `channel` for a pre-scale semantic value, or `property` for a
concrete graphical value. Operators are `eq | neq | gt | gte | lt | lte`,
`oneOf`, `range`, and ranked `min | max` with optional `count`, `groupBy`, and
`ties`. The default `grain: "item"` means a point, final bar rectangle,
line/area series path, or rule. Stacked bars additionally support
`grain: "stack"`.

```javascript
program.filterMarks({
  target: "bars",
  grain: "stack",
  channel: "y2",
  op: "max"
});
```

The original dataset and earlier program remain unchanged. Apply the filter
before creating a derived statistical layer when that statistic should use the
filtered rows; existing independent layers are not silently rebound. Histograms
retain their pre-filter bin boundaries, and line/area filters retain complete
series. Reapplying the same target is rejected because its deterministic derived
dataset ID already exists. A selector that matches no final item fails before
creating derived state.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)
