---
layout: default
title: Time-Unit Data Transforms
---

# Time-Unit Data Transforms

<div class="docs-concept-flow" role="img" aria-label="Each source timestamp is normalized to the start of its selected UTC calendar unit and stored in a new field">
  <span>source timestamp<strong>2024-05-17 13:45 UTC</strong></span>
  <span>UTC month boundary<strong>2024-05-01 00:00 UTC</strong></span>
  <span>derived field<strong>immutable output row</strong></span>
</div>

`createTimeUnitData` adds one reproducible UTC calendar field to every source
row. Use it when timestamps within the same calendar unit need a shared value
before a later encoding, filter, aggregation, or window operation.

## `createTimeUnitData({ id, source?, field, unit, as })`

```javascript
import { chart } from "ggaction";

const program = chart()
  .createData({
    id: "events",
    values: [
      { date: "2024-05-17T13:45:00Z", value: 2 },
      { date: "2024-06-03T09:30:00Z", value: 4 }
    ]
  })
  .createTimeUnitData({
    id: "monthlyEvents",
    field: "date",
    unit: "month",
    as: "month"
  });

console.log(program.semanticSpec.datasets[1].values[0].month);
// 1714521600000 — 2024-05-01T00:00:00.000Z
```

| Option | Type | Default |
| --- | --- | --- |
| `id` | new dataset ID | required |
| `source` | existing dataset ID | current dataset |
| `field` | temporal field name | required |
| `unit` | `"year"`, `"quarter"`, `"month"`, `"day"`, `"hour"`, `"minute"`, or `"second"` | required |
| `as` | new output field name | required |

The output is a finite timestamp at the start of the requested UTC unit.
Quarter starts are January 1, April 1, July 1, and October 1. The action accepts
the same temporal input forms as a temporal position scale: finite timestamps,
parseable temporal strings, date-only strings, and four-digit years.

The source dataset remains unchanged. The derived dataset preserves row order
and every existing field, then adds `as`. The output name must differ from the
input and must not already exist in any source row. Invalid timestamps and
collisions fail atomically.

## Boundaries

Time-unit derivation is UTC-only. It does not apply a local timezone, daylight
saving transition, locale calendar, configurable week, aggregation, resampling,
or missing-period completion. Create another immutable dataset when a different
unit or output field is needed.

## Related

[Data overview](../data.md) · [Source and derived data](./source-and-derived.md) ·
[Window transforms](./window.md) · [Temporal encodings](../position/temporal.md)
