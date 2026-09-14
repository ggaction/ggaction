---
layout: default
title: Time-Unit Data Transforms
---

# Time-Unit Data Transforms

<div class="docs-concept-flow" role="img" aria-label="Each source timestamp is normalized to the start of a UTC or named-zone calendar unit and stored in a new field">
  <span>source timestamp<strong>2024-05-17 13:45 UTC</strong></span>
  <span>calendar boundary<strong>UTC or IANA zone</strong></span>
  <span>derived field<strong>immutable output row</strong></span>
</div>

`createTimeUnitData` adds one reproducible UTC or named-zone calendar field to
every source row. Use it when timestamps within the same calendar unit need a
shared value before a later encoding, filter, aggregation, or window operation.

## `createTimeUnitData({ id, source?, field, temporalUnit?, unit, as, timeZone?, weekStartsOn?, weekRule? })`

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
| `temporalUnit` | `"auto"`, `"year"`, or `"timestamp"` input mode | existing automatic parser |
| `unit` | `"year"`, `"quarter"`, `"month"`, `"day"`, `"hour"`, `"minute"`, `"second"`, `"week"`, or `"weekday"` | required |
| `as` | new output field name | required |
| `timeZone` | non-empty IANA time-zone name | `"UTC"` |
| `weekStartsOn` | integer Sunday `0` through Saturday `6`; week only | `1` |
| `weekRule` | `"calendar"` or `"iso"`; week only | `"calendar"` |

Except for `weekday`, the output is a finite epoch-millisecond timestamp at the
start of the requested calendar unit in the selected zone. Quarter starts are
January 1, April 1, July 1, and October 1. `weekday` returns a nominal integer
from Sunday `0` through Saturday `6` in the selected zone. The action accepts the
same temporal input forms as a temporal position scale: finite timestamps,
parseable temporal strings, date-only strings, and four-digit years.

Input `temporalUnit` and calendar `unit` are independent. For numeric Unix
milliseconds use `temporalUnit: "timestamp"`. Bind the resulting field with
`fieldType: "temporal", temporalUnit: "timestamp"`, including small positive
bucket timestamps. The chosen input unit is stored in the transform.

Week output is the selected local week-start midnight expressed as epoch
milliseconds. Calendar weeks can start on any requested weekday. ISO weeks
require Monday and reject another `weekStartsOn` value. Week-only options on a
different unit are errors.

The source dataset remains unchanged. The derived dataset preserves row order
and every existing field, then adds `as`. The output name must differ from the
input and must not already exist in any source row. Invalid timestamps and
collisions fail atomically.

## Boundaries

Named zones use IANA Gregorian calendar parts. During a daylight-saving fold,
the action chooses the earliest matching instant. When a requested boundary
falls in a gap, it chooses the first valid instant in that calendar bucket.
Non-hour offsets and skipped civil dates follow the same rule; a boundary that
cannot be represented in the bucket or by JavaScript `Date` is an error. Results
never depend on the host process time zone or locale.

Locale calendar selection, aggregation, resampling, and missing-period
completion are separate concerns. Create another immutable dataset when a
different unit or output field is needed.

## Related

[Data overview](../data.md) · [Source and derived data](./source-and-derived.md) ·
[Window transforms](./window.md) · [Temporal encodings](../position/temporal.md)
