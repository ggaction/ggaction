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
| [Filtering](./data/filtering.md) | `filterData`, `filterMarks` | Derive rows or rebind one visual layer from a selector |
| [Statistical transforms](./data/statistical-transforms.md) | `createRegressionData`, `createIntervalData`, `createDensityData` | Materialize fitted, interval, or density rows |

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

