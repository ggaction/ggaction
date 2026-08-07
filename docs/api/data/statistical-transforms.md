---
layout: default
title: Statistical Data Transforms
---

# Statistical Data Transforms

{% include chart-example.html id="regression" %}

## `createDerivedData({ id, source?, transform })`

Use the general derived-data action when a named transform pipeline should be
stored for reuse by later marks or statistical actions.

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({
    id: "rows",
    values: [
      { category: "A", value: 2 },
      { category: "B", value: 5 }
    ]
  })
  .createDerivedData({
    id: "selectedRows",
    source: "rows",
    transform: [
      { type: "filter", field: "category", oneOf: ["A"] }
    ]
  })
  .createBarPlot({
    data: "selectedRows",
    x: { field: "category", fieldType: "nominal" },
    y: { field: "value" }
  });

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

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

## `createIntervalData({ id, source?, field, groupBy?, center?, extent?, level?, as? })` {#create-interval-data}

Create immutable grouped interval-summary rows independently from an error-bar
mark.

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
| `level` | number strictly between `0` and `1` | `0.95` for CI |
| `as` | `{ center, lower, upper }` distinct field names | ID-namespaced fields |

Mean supports standard error, sample standard deviation, and two-sided
Student-t confidence intervals. Median requires interquartile range, and IQR
requires median. Group order follows first appearance. Missing group values,
non-finite measures, and undersized mean groups are omitted; valid source rows
and the source dataset remain unchanged.

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
follows first appearance. Transform provenance keeps the requested `bandwidth`
and `extent` values—including `"auto"`—and stores the materialized revision's
concrete values separately as `resolved: { bandwidth, extent }`. Kernel and
normalization defaults are stored directly. Unit normalization integrates
each complete group density to one; count normalization scales it by that
group's valid sample count. Source values remain unchanged.

## Related

[Data overview](../data.md) · [Chart API](../index.md) · [Action reference](../../reference/actions.md)
