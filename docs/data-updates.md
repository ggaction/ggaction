---
layout: default
title: Data Updates and Live Refresh
---

# Data Updates and Live Refresh

Source dataset values are immutable after creation. `createData` copies and freezes
caller-owned rows; it does not provide an action that replaces those values.
For refreshed, streaming, or user-edited source data, retain the rows in the
application and build a new program snapshot.

An unused source dataset can be removed with
[`removeData`](./api/data/revisions-and-removal.md#removedata-id); removing the resource does
not mutate its values in an earlier snapshot.

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

## Save and restore snapshots

The browser-safe `ggaction/persistence` entry stores either an editable program
or its concrete graphics. This standalone example needs no filesystem or DOM:

```javascript
import { chart } from "ggaction";
import {
  serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic
} from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";

const original = chart()
  .createCanvas()
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 5 }] })
  .createScatterPlot({ x: "x", y: "y" });
const saved = serializeProgram(original);
const restored = deserializeProgram(saved);
const edited = restored.editPointMark({ fill: "red" });
const renderOnly = deserializeGraphic(serializeGraphic(edited));
const svg = renderToSVG(renderOnly);
```

`serializeProgram(program): string` accepts a built-in Full or Basic program.
`deserializeProgram(text): ChartProgram` returns an immutable **Full** program,
including when the original used Basic. It preserves semantic state, concrete
graphics, resolved scales, materialization settings, context, trace, retained
children, and composition state. It does not replay actions or recalculate the
chart. Subsequent edits use the restored settings and leave the saved snapshot
unchanged. Partial authoring states can be saved; restoring one does not supply
missing Canvas dimensions or other prerequisites.

`serializeGraphic(program): string` accepts an object with `graphicSpec`.
`deserializeGraphic(text): Readonly<Pick<ChartProgram, "graphicSpec">>` returns
only the immutable graphics wrapper accepted by Canvas, SVG, PNG, and PDF
renderers. It has no authoring methods or source data. Concrete property and
tree validation applies to both formats; normal renderer requirements still
apply to unfinished graphics.

The host owns storage and transport of the returned strings. Both restore
functions validate the envelope, and editable restoration additionally checks
resource references, owner identities, trace structure, and registered
extensions. Import required extension packages before restoring their programs.
Unknown extensions, unregistered custom subclasses or trace operations, and
open action stacks are rejected. The format cannot load code, import packages,
or execute saved trace arguments. Custom subclass restoration adapters are not
available.

### Snapshot format, version 1

Each JSON envelope has exactly these keys:

```text
{ schemaVersion: 1, kind: "editable" | "graphic", packageVersion: string,
  extensions: string[], payload: EncodedValue }
```

`packageVersion` records the producer version; `schemaVersion` determines the
format. Unknown schema versions are rejected. `extensions` contains the exact
registered extension names required by the editable action traces, including
children; graphic snapshots use an empty array. The editable payload uses the
canonical keys `semanticSpec`, `graphicSpec`, `resolvedScales`,
`materializationConfigs`, `children`, `compositionSpec`, `context`, `trace`, and
`actionStack`. Children recursively use the same state shape. The stack must be
empty; aliases and private action counters are not persisted. The graphic
payload is `graphicSpec` itself.

The tagged value codec preserves values that plain JSON would lose:

| Value | Encoded representation |
| --- | --- |
| String, boolean, null, finite number except negative zero | Unchanged |
| Array | `["array", EncodedValue[]]` |
| Plain object | `["object", [string, EncodedValue][]]` |
| Undefined | `["undefined"]` |
| Bigint | `["bigint", decimalString]` |
| NaN, positive/negative infinity, negative zero | `["number", "NaN" \| "Infinity" \| "-Infinity" \| "-0"]` |
| A hole in a nested sparse array | `["hole"]`, only inside an array payload |

Dataset row arrays must still be dense arrays of plain rows. Nested cell arrays
can preserve holes. Tag-like user arrays remain ordinary encoded arrays, so
user data cannot collide with the codec. Object keys, including `__proto__`, are
restored as own properties. Duplicate keys, invalid tuples/tags, and malformed
bigint literals are rejected. Symbols, functions, class instances, cycles,
non-enumerable object properties, and named array properties cannot be saved;
codec errors identify their location. Shared subobjects are stored by value,
not as an object-identity graph.

## Related

[Source and derived data](./api/data/source-and-derived.md) ·
[ChartProgram and immutability](./concepts/chart-program.md) ·
[Responsive charts](./responsive-charts.md) · [Errors and recovery](./errors-and-recovery.md)
