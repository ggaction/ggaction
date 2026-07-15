---
layout: default
title: Data
---

# Data

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createData` | `createData({ id: "rows", values })` | No ID or value inference | Immutable semantic dataset and current-data context |
| `filterData` | `filterData({ id: "selected", field, oneOf })` | Source: current dataset | Immutable derived dataset using one membership, comparison, or range filter |
| `filterMark` | `filterMark({ field, oneOf })` | Target: current or unique mark; source and derived ID from target | Immutable derived dataset, mark rebind, and concrete rematerialization |
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

## `filterMark({ target?, field, oneOf | predicate | range })`

Filter an existing mark without changing its source dataset. `filterMark`
infers the current mark when possible, creates a namespaced immutable dataset
such as `pointsFilteredData`, rebinds only that mark, and rematerializes its
scales and connected guides.

```javascript
const filtered = chart()
  .createData({ id: "cars", values: cars })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Displacement" })
  .encodeY({ field: "Acceleration" })
  .filterMark({
    field: "Origin",
    oneOf: ["Japan", "USA"]
  });
```

| Option | Type | Required |
| --- | --- | --- |
| `target` | existing mark ID | no; current or unique mark |
| `field` | non-empty string | yes |
| `oneOf` | non-empty scalar array | one filter mode required |
| `predicate` | `{ op, value }` | one filter mode required |
| `range` | `{ min, max, inclusive? }` | one filter mode required |

The original dataset and earlier program remain unchanged. Apply the filter
before creating a derived statistical layer when that statistic should use the
filtered rows; existing independent layers are not silently rebound.

## `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval? })`

Create deterministic regression predictions from an existing dataset. This is
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
| `method` | `"linear"`, `"polynomial"`, or `"loess"` | `"linear"` |
| `degree` | positive integer for polynomial | `2` |
| `span` | number greater than `0` and at most `1` for LOESS | `0.75` |
| `confidence` | number strictly between `0` and `1`; not accepted by LOESS | `0.95` |
| `interval` | `"mean"` or `"prediction"`; not accepted by LOESS | `"mean"` |

Linear and polynomial fits use stable least squares. Polynomial groups require
at least `degree + 2` rows and `degree + 1` distinct x values. LOESS uses
tricube-weighted local-linear fits over `ceil(span * groupSize)` nearest rows,
with source order breaking distance ties. Output follows group first appearance
and observed unique x order. Linear and polynomial output includes fixed
`__regression_ci_lower` / `__regression_ci_upper` fields; LOESS is line-only.
Source values remain unchanged.

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
non-finite fields, method-specific undersized groups, and constant-x groups.
Density rejects empty valid input, non-positive bandwidth, degenerate automatic
extent or bandwidth, invalid output fields, and fewer than two sample steps.

## Related

[Marks](./marks.md) · [ChartProgram and immutability](../concepts/chart-program.md)
