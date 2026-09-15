---
layout: default
title: Data Grain and Statistical Policies
---

# Data Grain and Statistical Policies

Choose a transform by its output meaning before selecting a chart. Aggregation,
completion, and imputation solve different problems and do not share one missing-value
or weight policy.

{% include chart-example.html id="repair-missing-observations" lead=true %}

## Compare input and output grain

| Family | Input and ordering | Output grain | Missing, empty, and weighting policy |
| --- | --- | --- | --- |
| [Summary](./summaries-and-shaping.md) | Raw rows; groups in first appearance | One row per observed group | Ungrouped empty input yields one aggregate row; grouped empty input yields none. Aggregate operation controls valid/missing/count semantics; weighted operations validate values and weights before grouping. |
| [Bin](./summaries-and-shaping.md) | Finite quantitative observations and one boundary policy | One row per retained interval | Empty bins retained by default; frequency/reliability mass is supported; explicit bounds must contain values. |
| [Rectangular 2D bin](./bin2d.md) | Two finite quantitative fields | One row per retained rectangular cell | Explicit include-empty policy; weighted/adaptive/hexagonal bins are unsupported. |
| [Fold](./summaries-and-shaping.md) | Ordered fields of one primitive type | Source row × selected field | Missing and mixed-type cells reject; original fields remain. |
| [Computed](./expressions-and-normalization.md) | Serializable expression over each row | Same rows with a new scalar field | A present undefined cell becomes null; an absent field name rejects. Branches are structurally checked even when short-circuited. |
| [Normalize](./expressions-and-normalization.md) | Per-group calculations; baseline methods need stable ordering or an explicit value | Same rows in source order | Finite numeric input; zero denominator rejects unless an explicit null/zero policy applies. Share rejects negative input. |
| [Complete](./missing-data.md) | At most one row per observed group/key; explicit or observed key domain | Observed group × key domain | Adds synthetic rows with null/fill cells; no Cartesian expansion of unrelated grouping values. Empty grouped input creates no groups. |
| [Impute](./missing-data.md) | Existing rows, groups, and method-specific stable order | Same rows in source order | Fills null/undefined only. Linear uses numeric/time distance. Edges and max-gap are explicit policies; NaN/infinity reject. |
| [Stack](./summaries-and-shaping.md) | Unique category/group pairs | Same rows plus endpoints and share | No missing-cell synthesis. Stack/fill/center require nonnegative values; diverging separates signs; zero has zero share. |
| [Window](./window.md) | Explicit sort/partition decisions for ordered operations | Same rows in source order | Stable ordering governs windows; frame and per-operation rules determine edges. No rows are synthesized. |
| [Sorted data](./source-and-derived.md#create-sorted-data) | Ordered keys with explicit direction, null placement, and optional temporal normalization | Same rows in stable sorted order | Equal keys retain source order. Mixed non-missing key types reject instead of coercing values. Sorting never mutates the source rows. |
| [Time unit](./time-units.md) | Explicit temporal parsing and calendar policy | Same rows with a bucket field | UTC by default or an explicit IANA zone; weekday is categorical, other buckets are timestamps. |
| [Density](./statistical-transforms.md) | Finite observations; optional group and bandwidth | Ordered sample grid per group | Positive mass contributes; zero weights are validated but omitted from statistical membership. Kernel, extent, and normalization are explicit. |
| [ECDF](../../tutorials/ecdf.md) | Ordered finite support within groups | One initial seed plus each positive-mass support | Missing defaults to drop; explicit error available. Zero weight adds no support; negative/nonfinite weight or zero total mass rejects. |
| [Regression / interval](./statistical-transforms.md) | Compatible finite numeric measurements and method-specific groups | Fit samples or one interval per group | Explicit `missing: "drop" | "error"` controls nullable rows. Fitting and uncertainty have separate sample requirements; `interval: false` computes no interval fields. |

Summary, bin, density, regression, and interval transforms record exclusion reports
under `materializationConfigs.calculations`. The report identifies the current logical
owner, input and retained counts, excluded reasons, and the units used by weighted
calculations. Editing or revising a transform replaces its report with one computed
from the current input; removing the owner removes the report.

## Missing keys are not missing values

The [complete repair workflow](../../recipes/repair-missing-observations.md) starts
with `(1,2)` and `(3,6)`. Its row counts are 2 → 3 → 3 → 3:

| Stage | Values at keys 1, 2, 3 | Meaning |
| --- | --- | --- |
| Source | 2, absent, 6 | There is no row for key 2 |
| Complete | 2, null, 6 | A row was added; absence was not silently changed to zero |
| Linear impute | 2, 4, 6 | A finite interpolated measure was assigned |
| Trailing mean, preceding 1 | 2, 3, 5 | Each value summarizes the current and previous row |

## Weights, units, and finite density extents

Frequency weights are non-negative safe integer multiplicities. Reliability weights
are non-negative finite values with effective-sample-size rules for sample statistics.
Supported weighted actions validate even zero-weight rows. A weight is not a visual
opacity or glyph-size channel. The [weighted comparison](../../recipes/compare-weighted-distributions.md)
shows mass, density, and cumulative probability in separate panels.

KDE `normalization:"unit"` scales the underlying density to unit mass. Drawing a
finite extent only shows part of that function, so its sampled trapezoidal area need
not equal one. `normalization:"count"` uses count or weighted mass. Neither mode
turns each displayed y value into a cumulative probability.

Calendar bucketing in an IANA zone and elapsed-time windows also differ: local dates
can cross daylight-saving changes, while timestamps measure elapsed milliseconds.
Choose the time-unit policy for calendar grouping and the window operation for the
ordered calculation; do not infer a fixed 24-hour duration from a local date label.

## Related

[Data overview](../data.md) · [Authoring conventions](../../concepts/authoring-conventions.md) ·
[Weighted distributions](../../recipes/compare-weighted-distributions.md)
