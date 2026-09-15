---
layout: default
title: Statistical Data Transforms
---

# Statistical Data Transforms

{% include chart-example.html id="regression" lead=true %}

## `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidenceMethod?, level?, confidence?, interval?, predict?, missing? })`

Create deterministic regression predictions from an existing dataset. This is
an advanced data action used by higher-level regression chart actions.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
| `degree` | integer from `1` through `32` for polynomial | `2` |
| `span` | number greater than `0` and at most `1` for LOESS | `0.75` |
| `confidenceMethod` | `"normal"` or `"student-t"`; not accepted by LOESS | `"student-t"` |
| `level` | number strictly between `0` and `1`; not accepted by LOESS | `0.95` |
| `confidence` | compatibility alias for `level`; must match it when both appear | omitted |
| `interval` | `"mean"` or `"prediction"`; not accepted by LOESS | `"mean"` |
| `predict` | `{ values }` or `{ domain, steps }` | observed unique x values |
| `missing` | `"error"` or `"drop"` | compatibility behavior when omitted |

Linear and polynomial fits use stable least squares. Fit-only linear models
require two rows; fit-only polynomial models require `degree + 1` rows and
distinct x values. Confidence intervals require the additional residual
degrees of freedom. Set `interval: false` for fitted values without lower and
upper confidence fields. LOESS uses
tricube-weighted local-linear fits over `ceil(span * groupSize)` nearest rows,
with source order breaking distance ties. Output follows group first appearance
and the chosen prediction grid. Explicit prediction values must be finite,
unique, and strictly ascending; a domain requires at least two steps. Linear
and polynomial interval output includes fixed `__regression_ci_lower` /
`__regression_ci_upper` fields; fit-only and LOESS output does not.
Source values remain unchanged.

Regression output is limited to 10,000 unique group/x rows. Polynomial and
LOESS fitting reject inputs whose estimated work exceeds 10,000,000 units,
before allocating or entering the expensive fit.

## `createIntervalData({ id, source?, field, groupBy?, center?, extent?, method?, level?, missing?, as? })` {#create-interval-data}

Create immutable grouped interval-summary rows independently from an error-bar
mark.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.createIntervalData({
  id: "accelerationIntervals",
  field: "Acceleration",
  groupBy: "Origin"
});
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | new dataset ID | required |
| `source` | existing dataset ID | current dataset |
| `field` | quantitative field name | required |
| `groupBy` | field name or array of field names | one ungrouped interval |
| `center` | `"mean"` or `"median"` | `"mean"` |
| `extent` | `"stderr"`, `"stdev"`, `"ci"`, or `"iqr"` | `"ci"` |
| `method` | `"normal"` or `"student-t"` | `"student-t"` for CI |
| `level` | number strictly between `0` and `1` | `0.95` for CI |
| `missing` | `"error"` or `"drop"` | compatibility behavior when omitted |
| `as` | `{ center, lower, upper }` distinct field names | ID-namespaced fields |

Mean supports standard error, sample standard deviation, and two-sided normal
or Student-t confidence intervals. Median requires interquartile range, and IQR
requires median. Group order follows first appearance. Missing group values,
non-finite measures follow the explicit `missing` policy when provided;
undersized mean groups fail with a diagnostic. Valid source rows
and the source dataset remain unchanged. A summary whose derived finite center
or endpoint is not representable throws a `RangeError` atomically.

## `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, weight?, missing?, as? })`

Create an immutable kernel-density dataset. This is an advanced data
action used by higher-level density-chart encodings.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
| `bandwidth` | positive number or `"auto"` | automatic rule-of-thumb estimate |
| `extent` | ascending finite pair or `"auto"` | observed valid extent |
| `steps` | integer from `2` through `10,000` | `100` |
| `kernel` | `"gaussian"`, `"epanechnikov"`, `"uniform"`, or `"triangular"` | `"gaussian"` |
| `normalization` | `"unit"` or `"count"` | `"unit"` |
| `weight` | `{ field, kind: "frequency" | "reliability" }` | unweighted |
| `missing` | `"error"` or `"drop"` | compatibility behavior when omitted |
| `as` | two distinct output field names | `<field>_value`, `<field>_density` |

Grouped densities use one shared extent and inclusive sample grid. Group order
follows first appearance. Transform provenance keeps the requested `bandwidth`
and `extent` values—including `"auto"`—and stores the materialized revision's
concrete values separately as `resolved: { bandwidth, extent }`. Kernel and
normalization defaults are stored directly. Unit normalization integrates
each complete group density to one; count normalization scales it by that
group's valid sample count. Density output is limited to 10,000 rows, and
valid source rows multiplied by `steps` must not exceed the 10,000,000-unit
work budget. Source values remain unchanged.

Weighted density validates every requested value and weight, including rows
whose weight is zero. Only positive-weight rows contribute to the observed
extent, profiles, and membership. `unit` divides weighted kernel mass by total
weight; `count` preserves that mass. Automatic bandwidth uses weighted sample
spread and effective sample size, and is recomputed for every group, split
profile, and facet child. Multiple profiles store their individual resolved
bandwidths in first-appearance order. Frequency weights are non-negative safe
integers; reliability weights are non-negative finite numbers. Use an explicit
positive bandwidth when a weighted profile has effective sample size one.

Summary, bin, density, interval, and regression materializers store calculation
reports in `materializationConfigs.calculations.datasets[id]`. Reports expose
input, accepted, and dropped row counts plus transform-specific group or output
counts. Editing or revising a derived dataset replaces its report; releasing
the dataset removes it.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)
