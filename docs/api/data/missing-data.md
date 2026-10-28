---
layout: default
title: Missing Keys and Values
---

# Missing Keys and Values

{% include chart-example.html id="repair-missing-observations" lead=true %}

[Family overview](./source-and-derived.md) · [Exact action lookup](./../../reference/actions.md)

## `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, calendar?, fill?, members? })` {#createcompletedata-id-source-key-groupby-values-sequence-fill-members}

Materialize missing keys inside each observed group without silently turning
absence into zero:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resource selectors used here: `source: "sales"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const completed = program.createCompleteData({
  id: "completeSales",
  source: "sales",
  groupBy: "region",
  key: "month",
  values: [1, 2, 3],
  fill: { amount: null },
  members: "sourceRows"
});
```

`values`, `sequence`, and `calendar` are mutually exclusive. If all are omitted, the action
uses the key values observed anywhere in the source, preserving typed identity
and first appearance. A numeric sequence uses finite `start`, `end`, and
positive `step`. Only observed group tuples are completed; the action does not
form a Cartesian product of separate grouping fields.

Repeated observations for a group/key pair are preserved in source order, without
aggregation. Only absent pairs receive one synthesized row. Existing keys outside an
explicit domain are errors. Original rows keep all cells. A synthesized row gets
the group and key values, then `fill` values or `null` for the other source fields.
When `members` is present, original rows contain their source index and synthetic
rows contain `[]`. Output follows group first appearance and key-domain order and
is capped at 10,000 rows, including repeated observations, before allocation.

### Complete a calendar day range

Use `calendar: { unit: "day", start, end, timeZone }` for a contiguous range of
civil dates. Both endpoints are included. `start` and `end` are strict Gregorian
`YYYY-MM-DD` strings, and `timeZone` is required: use `"UTC"` or an IANA name.
For example, `2024-01-01` through `2024-12-31` contains 366 days.

First bucket timestamps in the same zone and explicitly aggregate repeated
observations. This complete ES module preserves a missing day as `null` and an
observed zero as `0`:

<!-- snippet-context:start -->

> **Executable complete.** Standalone ES module with ggaction installed; the sample declares all input events.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const dayRange = {
  unit: "day", start: "2024-11-02", end: "2024-11-04",
  timeZone: "America/New_York"
};
const daily = chart()
  .createData({ id: "events", values: [
    { at: "2024-11-03T05:30:00Z", amount: 2 },
    { at: "2024-11-03T06:30:00Z", amount: 3 },
    { at: "2024-11-04T12:00:00Z", amount: 0 }
  ] })
  .createTimeUnitData({
    id: "buckets", field: "at", unit: "day", as: "day",
    timeZone: dayRange.timeZone
  })
  .createSummaryData({
    id: "totals", groupBy: "day",
    aggregates: [{ op: "sum", field: "amount", as: "total" }]
  })
  .createCompleteData({
    id: "days", key: "day", calendar: dayRange,
    fill: { total: null }, members: "sourceRows"
  });

const dailyPlot = daily.createCanvas()
  .createPointMark({ data: "days", missing: "skip" })
  .encodeX({ field: "day", fieldType: "temporal" })
  .encodeY({ field: "total" });
```

The two repeated clock-hour events sum to `5` on November 3. Day starts are
stored as epoch milliseconds; neighboring starts can be 23 or 25 hours apart.
A midnight gap uses the first valid instant of that day. A civil date removed
by a zone transition is an error. Results do not depend on the process time zone.

Source keys must exactly match the generated numeric day starts. Completion
does not parse strings, floor midday timestamps, or convert keys from another
zone. It keeps repeated rows unless you aggregate them first. Synthetic rows
have no contributing input rows. An empty ungrouped source creates the requested
days; an empty grouped source creates no groups. Declare the key and group
fields in the source schema when creating an empty source.

The domain and total output each have a 10,000-item limit. Calendar completion
also preflights a 10,000,000-unit work budget covering source cells, zone boundary
resolution, group expansion, output cells, and row provenance. A wide source or
many groups can reach this limit before the row limit.

`editCompleteData({ target: "days", calendar: { ...dayRange, end: "2024-11-05" } })`
replaces the whole calendar policy. Supplying `values` or `sequence` switches
domain mode; omitting all three preserves the current policy. Source revisions
recompute the pipeline and reject newly observed dates outside the range.

## `createImputedData({ id, source?, fields, groupBy?, sortBy?, method?, value?, edges?, maxGap? })` {#createimputeddata-id-source-fields-groupby-sortby-method-value-edges-maxgap}

Replace explicit `null` or `undefined` cells without changing row grain or final
source order:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `completed`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const imputed = completed.createImputedData({
  id: "imputedSales",
  fields: "amount",
  groupBy: "region",
  sortBy: [{ field: "month" }],
  method: "linear",
  edges: "keep"
});
```

Omitted `method` means `"mean"`: each numeric field uses the observed finite-value mean within its group. For example, `completed.createImputedData({ id: "means", fields: "amount", groupBy: "region" })` preserves all other cells and row order. A group with no observed value follows `edges`; sort order is optional.

`constant` requires `value`. `forward` and `backward` copy the nearest available
anchor in the requested stable group order. `linear` requires one ascending
numeric or temporal-string sort field and finite numeric target values; it uses
actual position distance rather than row indexes. No method crosses a group
boundary.

`edges` defaults to `"keep"`; `"error"` rejects an eligible run with no required
anchor. `maxGap` is a positive row-count limit. A longer run stays missing and is
not converted into an edge error. `NaN` and infinities are invalid values rather
than missing cells.
