---
layout: default
title: Data
---

# Data

{% include chart-example.html id="regression" %}

Data actions own immutable source rows, explicit derivation provenance, and
statistical result datasets. Choose the focused page that matches the data
operation; marks and renderers never mutate source values.

## At a glance

| Family | Actions | Use |
| --- | --- | --- |
| [Source and derived data](./data/source-and-derived.md) | `createData`, `createDerivedData` | Store source rows or explicit transform provenance |
| [Reusable summaries](./data/source-and-derived.md#createsummarydata-id-source-groupby-aggregates-members) | `createSummaryData` | Materialize grouped multi-aggregate rows with optional members |
| [Reusable bins](./data/source-and-derived.md#createbindata-id-source-field-binoptions) | `createBinData` | Materialize shared one-dimensional bounds, counts, and optional members |
| [Wide-to-long data](./data/source-and-derived.md#createfolddata-id-source-fields-as) | `createFoldData` | Materialize selected fields as stable key/value rows |
| [Computed data](./data/source-and-derived.md#createcomputeddata-id-source-as-expression) | `createComputedData` | Add a finite field from a closed arithmetic expression |
| [Stack data](./data/source-and-derived.md#createstackdata-id-source-category-group-value-mode-as) | `createStackData` | Materialize reusable stack endpoints, values, and shares |
| [Filtering](./data/filtering.md) | `filterData`, `filterMarks`, `removeMarkFilter` | Derive rows or revise and remove one visual-layer filter |
| [Statistical transforms](./data/statistical-transforms.md) | `createRegressionData`, `createIntervalData`, `createDensityData` | Materialize fitted, interval, or density rows |
| [Time-unit transforms](./data/time-units.md) | `createTimeUnitData` | Add reproducible UTC calendar bucket fields |
| [Window transforms](./data/window.md) | `createWindowData` | Compute ordered values within partitions while preserving source row order |
| [Rectangular 2D bins](./data/bin2d.md) | `createBin2DData` | Aggregate two quantitative fields into immutable ranged cells |

## Shared invariants

- Every dataset is immutable after creation.
- Omitted sources resolve only from the current or unique compatible dataset.
- Derived datasets retain their source and transform provenance.
- Ambiguous sources require an explicit ID; the library never selects the first
  of several candidates silently.

## Errors and limitations

Values must be arrays of plain row objects. Dataset IDs are unique. Filters and
statistical transforms validate their complete option combination before
creating state, and a failed action leaves the earlier program unchanged.

## Related

[Marks](./marks.md) · [ChartProgram and immutability](../concepts/chart-program.md) ·
[Complete action reference](../reference/actions.md)
