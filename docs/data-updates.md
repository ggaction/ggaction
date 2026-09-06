---
layout: default
title: Data Updates and Live Refresh
---

# Data Updates and Live Refresh

Source datasets are immutable and create-only. `createData` copies and freezes
caller-owned rows; it does not provide an action that replaces those values.
For refreshed, streaming, or user-edited source data, retain the rows in the
application and build a new program snapshot.

## Rebuild from source rows

In this integration example, `loadSales()` and the 2D `context` are supplied
by the host application; `chart`, `render`, and the immutable program are the
ggaction boundary.

```javascript
import { chart, render } from "ggaction";

function buildSalesChart(values, width = 720) {
  return chart()
    .createCanvas({
      width,
      height: 420,
      margin: { top: 35, right: 130, bottom: 60, left: 70 }
    })
    .createData({ values })
    .createLinePlot({
      x: { field: "date", fieldType: "temporal" },
      y: "sales",
      color: "region"
    });
}

let rows = await loadSales();
let program = buildSalesChart(rows);
render(program, context);

async function refresh() {
  const nextRows = await loadSales();
  const nextProgram = buildSalesChart(nextRows);
  rows = nextRows;
  program = nextProgram;
  render(program, context);
}
```

This makes update ownership explicit. If loading or construction fails, the
previous `rows` and `program` remain valid and can stay on screen.

## What can be revised in place

“In place” still means a new immutable `ChartProgram`. Actions such as
`editCanvas`, encoding edits, scale edits, guide edits, `editBin2DData`,
`editRegression`, `editHorizon`, and other documented lifecycle operations can
revise existing semantic resources and rematerialize their consumers. They do
not replace the rows of a source dataset.

`bindMarkData({ target, data })` can move one independent mark to another
existing materialized dataset. It preflights the mark's fields, scales, guides,
labels, selections, and highlights before returning the revised program.
Composite charts keep their source changes in the corresponding aggregate edit
action so all owned layers change together.

Use a revision action when the source snapshot is unchanged and the user is
changing chart intent. Rebuild from source when row identity, values, schema,
or source-dataset membership changes.

## Async update policy

- Give each refresh a monotonically increasing request ID or abort signal so a
  slow older response cannot overwrite a newer program.
- Validate rows before committing the new snapshot. A failed action leaves the
  previous program untouched.
- Debounce high-frequency feeds according to the product's acceptable
  staleness; ggaction is a static snapshot authoring library, not a streaming
  scene graph.
- Rebuild once for a batch. Do not call `createData` once per row or grow a
  trace as an event log.
- Keep the current logical size in host state so data refresh and responsive
  layout use the same build function.

## Derived data

Derived datasets record one normalized transform and source provenance.
Higher-level materializers create concrete derived values. When source rows
change, recreate both source and derived datasets in the new program. Editing
a derived transform revises the transform against the existing immutable
source snapshot only.

## Related

[Source and derived data](./api/data/source-and-derived.md) ·
[ChartProgram and immutability](./concepts/chart-program.md) ·
[Responsive charts](./responsive-charts.md) · [Errors and recovery](./errors-and-recovery.md)
