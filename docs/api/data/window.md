---
layout: default
title: Window Data Transforms
---

# Window Data Transforms

<div class="docs-concept-flow" role="img" aria-label="Source rows are partitioned, stably sorted, processed by ordered window operations, and returned in source row order">
  <span>source rows<strong>immutable input</strong></span>
  <span>partition + sort<strong>calculation order</strong></span>
  <span>operations<strong>derived fields</strong></span>
  <span>source order<strong>immutable output</strong></span>
</div>

`createWindowData` computes ordered values within optional partitions and stores
the result as a new immutable dataset. It is useful when a later mark needs rank,
running totals, or neighboring values without changing the source rows.

## `createWindowData({ id, source?, partitionBy?, sortBy?, operations, temporalUnit? })`

```javascript
const program = chart()
  .createData({
    id: "sales",
    values: [
      { region: "East", month: 2, amount: 30 },
      { region: "East", month: 1, amount: 20 },
      { region: "West", month: 1, amount: 15 }
    ]
  })
  .createWindowData({
    id: "rankedSales",
    partitionBy: "region",
    sortBy: [{ field: "month" }],
    operations: [
      { op: "rowNumber", as: "monthOrder" },
      { op: "cumulativeSum", field: "amount", as: "runningAmount" },
      { op: "lag", field: "amount", as: "previousAmount" }
    ]
  });
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | new dataset ID | required |
| `source` | existing dataset ID | current dataset |
| `partitionBy` | field name or array of field names | one partition |
| `sortBy` | array of `{ field, order? }` | source order |
| `operations` | non-empty array of window operations | required |
| `temporalUnit` | `"auto"`, `"year"`, or `"timestamp"`; duration frames only | existing automatic parser |

`order` accepts `"ascending"` or `"descending"` and defaults to ascending.
Sorting is stable. Missing sort values are placed after present values for an
ascending sort and before them for a descending sort. Operations run in the
declared order, so a later operation may read a field created by an earlier one.

Supported operations are:

| Operation | Shape | Notes |
| --- | --- | --- |
| row number | `{ op: "rowNumber", as }` | one-based position |
| rank | `{ op: "rank", as }` | tied rows share a rank and leave gaps |
| dense rank | `{ op: "denseRank", as }` | tied rows share a rank without gaps |
| cumulative sum | `{ op: "cumulativeSum", field, as }` | requires finite numeric values |
| lag | `{ op: "lag", field, as, offset?, default? }` | defaults to offset `1` and value `null` |
| lead | `{ op: "lead", field, as, offset?, default? }` | defaults to offset `1` and value `null` |
| moving mean | `{ op: "movingMean", field, as, frame, minPeriods?, missing? }` | finite mean inside a row or elapsed-duration frame |
| moving sum | `{ op: "movingSum", field, as, frame, minPeriods?, missing? }` | finite sum inside a row or elapsed-duration frame |

Moving frames always include the current sorted row. `frame.preceding` is a
required non-negative integer; `frame.following` is optional and defaults to
`0`. A trailing three-row mean therefore uses `{ preceding: 2 }`, while a
centered five-row mean uses `{ preceding: 2, following: 2 }`:

```javascript
const trailing = monthly.createWindowData({
  id: "trailingMean",
  sortBy: [{ field: "month" }],
  operations: [{
    op: "movingMean",
    field: "passengers",
    as: "movingMean",
    frame: { preceding: 2 }
  }]
});
```

At a partition boundary, the frame uses only available rows. The first value in
the example uses one row, the second uses two, and later values use three.
`minPeriods` defaults to `1`. `missing` defaults to `"error"`, which rejects
nullish and non-finite source values. `missing: "skip"` excludes only `null` and
`undefined` from the valid count and arithmetic; `NaN` and infinities remain
errors. A frame with fewer valid values than `minPeriods` produces `null`.

Use a duration frame for an elapsed-time window:

```javascript
const weekly = events.createWindowData({
  id: "weeklyMean",
  temporalUnit: "timestamp",
  sortBy: [{ field: "time", order: "ascending" }],
  operations: [{
    op: "movingMean",
    field: "value",
    as: "weeklyMean",
    frame: {
      duration: { preceding: 7, following: 0, unit: "day" }
    },
    minPeriods: 2,
    missing: "skip"
  }]
});
```

Duration units are `"millisecond"`, `"second"`, `"minute"`, `"hour"`, and
`"day"`; a day is exactly 24 hours. Duration calls require exactly one ascending
sort field. Both endpoints are closed, and rows with the same timestamp receive
the same window result. Irregular spacing therefore uses actual elapsed distance
instead of a row count. Weighted and calendar-duration windows are not supported.

The action computes each partition in sorted order, then returns the materialized
rows in their original source order. The source dataset remains unchanged. Output
fields must be unique and cannot replace fields already present in the source.
Dataset IDs are create-only: calling the action again with the same `id` throws
instead of replacing or rebinding consumers.

## Related

[Data overview](../data.md) · [Source and derived data](./source-and-derived.md) ·
[Runnable airline-passenger example](https://github.com/ggaction/ggaction/blob/main/examples/airline-passenger-moving-windows/program.js) ·
[Action reference](../../reference/actions.md)
