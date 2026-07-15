---
layout: default
title: Data
---

# Data

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createData` | `createData({ id: "rows", values })` | No ID or value inference | Immutable semantic dataset and current-data context |
| `filterData` | `filterData({ id: "selected", field, oneOf })` | Source: current dataset | Immutable derived dataset with filter provenance and materialized rows |
| `createRegressionData` | `createRegressionData({ id: "fit", x, y })` | Source: current dataset; linear OLS; confidence `0.95` | Immutable derived predictions and mean-response interval |
| `createDensityData` | `createDensityData({ id: "density", field })` | Source: current dataset; Gaussian/unit density; 100 steps; automatic bandwidth | Immutable KDE rows and density provenance |

## `createData({ id, values })`

| Option | Type | Required |
| --- | --- | --- |
| `id` | string containing letters, numbers, `_`, or `-` | yes |
| `values` | array of plain row objects | yes |

```javascript
const program = chart().createData({
  id: "cars",
  values: [
    { horsepower: 130, mpg: 18 },
    { horsepower: 165, mpg: 15 }
  ]
});
```

Empty arrays are valid, and row properties may contain nested arrays or
objects. The action copies and freezes the supplied data. A dataset ID cannot
be created twice, and source values cannot be replaced after creation.

The most recently created dataset becomes the default for `createPointMark`,
`createLineMark`, or `createBarMark`. Creating data records semantic state only
and produces no graphics.

## `filterData({ id, source?, field, oneOf })`

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
| `oneOf` | non-empty scalar array | yes |

The derived dataset stores its source ID, filter transform, and immutable
materialized values. Rows retain source order. Missing fields and values not in
`oneOf` are omitted. The new dataset becomes current data for the next mark.

## `createRegressionData({ id, source?, x, y, groupBy?, confidence? })`

Create deterministic linear OLS predictions from an existing dataset. This is
an advanced data action used by higher-level regression chart actions.

```javascript
program.createRegressionData({
  id: "regressionData",
  x: "Displacement",
  y: "Acceleration",
  groupBy: "Origin"
});
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | new dataset ID | required |
| `source` | existing dataset ID | current dataset |
| `x`, `y` | finite quantitative field names | required |
| `groupBy` | nominal field name | one ungrouped model |
| `confidence` | number strictly between `0` and `1` | `0.95` |
| `method` | `"linear"` | `"linear"` |
| `interval` | `"mean"` | `"mean"` |

Each group uses at least three rows and must contain varying x values. Output
uses each observed unique x value in ascending order, the predicted y field,
and fixed `__regression_ci_lower` / `__regression_ci_upper` fields. Confidence
bounds use a Student-t mean-response interval. Source values remain unchanged.

## `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as? })`

Create an immutable kernel-density dataset. This is an advanced data
action used by higher-level density-chart encodings.

```javascript
program.createDensityData({
  id: "accelerationDensity",
  field: "Acceleration",
  groupBy: "Origin",
  bandwidth: 0.6
});
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | new dataset ID | required |
| `source` | existing dataset ID | current dataset |
| `field` | quantitative field name | required |
| `groupBy` | nominal field name | one ungrouped density |
| `bandwidth` | positive number or `"auto"` | automatic Scott-rule estimate |
| `extent` | ascending finite pair or `"auto"` | observed valid extent |
| `steps` | integer at least `2` | `100` |
| `kernel` | `"gaussian"`, `"epanechnikov"`, `"uniform"`, or `"triangular"` | `"gaussian"` |
| `normalization` | `"unit"` or `"count"` | `"unit"` |
| `as` | two distinct output field names | `<field>_value`, `<field>_density` |

Grouped densities use one shared extent and inclusive sample grid. Group order
follows first appearance. The resolved automatic bandwidth, kernel, and
normalization are stored in transform provenance. Unit normalization integrates
each complete group density to one; count normalization scales it by that
group's valid sample count. Source values remain unchanged.

## Errors and limitations

Values must be an array. Dataset IDs are unique, and an existing source dataset
cannot be replaced or mutated. Filtering requires a current or explicit source
and does not permit an empty `oneOf` list. Regression rejects missing or
non-finite fields, groups with fewer than three rows, and constant-x groups.
Density rejects empty valid input, non-positive bandwidth, degenerate automatic
extent or bandwidth, invalid output fields, and fewer than two sample steps.

## Related

[Marks](./marks.md) · [ChartProgram and immutability](../concepts/chart-program.md)
