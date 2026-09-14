---
layout: default
title: Data
---

# Data

{% include chart-example.html id="regression" lead=true %}

Data actions own immutable source rows, explicit derivation provenance, and
statistical result datasets. Choose the focused page that matches the data
operation; marks and renderers never mutate source values.

## At a glance

| Family | Actions | Use |
| --- | --- | --- |
| [Source and derived data](./data/source-and-derived.md) | `createData`, `createDerivedData` | Store source rows or explicit transform provenance |
| [Safe resource removal](./data/revisions-and-removal.md#removedata-id) | `removeData` | Delete one named dataset only after all live consumers are gone |
| [Reusable summaries](./data/summaries-and-shaping.md#createsummarydata-id-source-groupby-aggregates-members) | `createSummaryData` | Materialize grouped multi-aggregate rows with optional members |
| [Reusable bins](./data/summaries-and-shaping.md#createbindata-id-source-field-binoptions) | `createBinData` | Materialize shared one-dimensional bounds, counts, and optional members |
| [Wide-to-long data](./data/summaries-and-shaping.md#createfolddata-id-source-fields-as) | `createFoldData` | Materialize selected fields as stable key/value rows |
| [Computed data](./data/expressions-and-normalization.md#createcomputeddata-id-source-as-expression) | `createComputedData` | Add numeric, string, boolean, or nullable values using the closed expression grammar |
| [Normalization](./data/expressions-and-normalization.md#createnormalizeddata-id-source-field-as-groupby-method) | `createNormalizedData` | Preserve rows while expressing values relative to a group, baseline, or range |
| [Missing keys](./data/missing-data.md#createcompletedata-id-source-key-groupby-values-sequence-fill-members) | `createCompleteData` | Add missing key/group rows on an explicit domain |
| [Missing values](./data/missing-data.md#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap) | `createImputedData` | Fill selected values with an explicit method and ordering policy |
| [Empirical distributions](../tutorials/ecdf.md#reuse-the-derived-rows) | `createECDFData` | Reduce observations to ordered support, mass, and probability rows |
| [Stack data](./data/summaries-and-shaping.md#createstackdata-id-source-category-group-value-mode-as) | `createStackData` | Materialize reusable stack endpoints, values, and shares |
| [Filtering](./data/filtering.md) | `filterData`, `filterMarks`, `removeMarkFilter` | Derive rows or revise and remove one visual-layer filter |
| [Statistical transforms](./data/statistical-transforms.md) | `createRegressionData`, `createIntervalData`, `createDensityData` | Materialize fitted, interval, or density rows |
| [Time-unit transforms](./data/time-units.md) | `createTimeUnitData` | Add calendar buckets with UTC or an explicit IANA zone and calendar policies |
| [Window transforms](./data/window.md) | `createWindowData` | Compute ordered values within partitions while preserving source row order |
| [Rectangular 2D bins](./data/bin2d.md) | `createBin2DData` | Aggregate two quantitative fields into immutable ranged cells |
| [Derived revisions](./data/revisions-and-removal.md#editing-derived-data) | Focused `edit*Data` actions | Revise one transform and explicitly recompute dependent revisions |

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
