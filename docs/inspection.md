---
layout: default
title: Program Inspection
---

# Program Inspection

Repeated comparisons reuse unchanged immutable resources while preserving exact value comparisons and change reports.

The browser-safe `ggaction/inspection` entry reads a closed Full or Basic
program without executing an action or changing its trace, context, or cached
materialization. Every returned object is immutable and carries `version: 1`
where its contract may evolve.

```javascript
import {
  getDatasetSchema,
  describeAction,
  comparePrograms,
  inspectProgram
} from "ggaction/inspection";
```

## Complete inspection workflow

Run as a Node.js ES module or in a browser bundler. No rendering context is needed.

```javascript
import { chart } from "ggaction";
import { comparePrograms, getDatasetSchema, inspectProgram } from "ggaction/inspection";
const before = chart().createCanvas()
  .createData({ id: "sales", values: [{ x: 1, y: 2 }, { x: 2, y: 3 }] })
  .createScatterPlot({ id: "points", x: "x", y: "y" });
const after = before.editPointMark({ target: "points", opacity: 0.35 });
const schema = getDatasetSchema(after, { data: "sales" });
const comparison = comparePrograms(before, after);
const report = inspectProgram(after, { target: { kind: "mark", id: "points" } });
console.log(schema, comparison, report);
console.log(before === after); // false: both revisions remain available
console.log(after.graphicSpec.objects.points.items.every(item => item.properties.opacity === 0.35)); // true
```

The dataset still has two rows and the same x/y fields; the comparison reports a
style change, and inspection reports the concrete point items. Inspect the returned
coverage flags before making claims about pixel visibility.

## Read a dataset contract

```javascript
const { data, schema } = getDatasetSchema(program, { data: "sales" });
```

The explicit dataset ID can be a logical derived-data owner or its current
physical revision. The result reports the resolved ID and normalized schema.
`completeness: "unknown"` means the library cannot prove field availability;
it is different from a known schema whose `fields` array is empty. Use
`childPath` to address a dataset inside a composition.

## Expression functions

`getExpressionFunctions({ registry? })` reads the immutable closed expression
registry without a program or evaluator. The default and only supported registry
is `standard@1`. Each descriptor provides `name`, minimum/maximum argument counts
(`min`/`max`), input and output types, and any option family. Unknown registry names,
unknown options, and an explicitly undefined registry reject.

Import `getExpressionFunctions` from `ggaction/inspection`, then call
`getExpressionFunctions().find(item => item.name === "sqrt")`. The descriptor
has `min: 1`, `max: 1`, `inputs: ["number"]`, and `output: "number"`.

[Version 2 expressions](./api/data/expressions-and-normalization.md#version-2-expressions)
use these names. Computed calculation reports include their registry, evaluated and
missing row counts, numeric failure counts, and exact parameter input revisions.

## Preflight an action

```javascript
const description = describeAction(program, {
  action: "encodeShape",
  target: { kind: "mark", id: "points" },
  options: { field: "category" }
});
```

`parameterDefinitions` comes from the same generated action-card and type
contract as the public reference. Required options, unknown options, an
explicit target mismatch, known missing fields, and supported mark-family
constraints use the same appearance-channel policy as the actual encoding actions
(including Rect opacity and stroke width) and appear in `requirements`, `checks`, and structured `findings`.
`applicability: "supported"` means the static checks passed; numerical fitting,
allocation, and rendering remain `not_run`. Registered extension actions with
no built-in descriptor return `unverified`.

Literal comparison values in `filterMarks`, `selectMarks`, and `editMarkSelection`
are not field references. Their `field` option selects the column; a string
`value` such as a category name is checked as a literal.

## Compare immutable revisions

```javascript
const comparison = comparePrograms(before, after);
const dataScoped = comparePrograms(before, after, {
  target: { kind: "data", id: "sales" }
});
```

The full comparison includes datasets and values, layer order and bindings,
scales, coordinates, guides, Canvas settings, composition intent, and
user-authored appearance. Title position, alignment, and typography are included
even when the title text is unchanged. It ignores trace-only IDs, current selection context,
and cache identity. Changes are classified as `data`, `binding`, `structure`,
`scale`, `guide`, or `style`. A targeted comparison also includes changed
downstream consumers and sets `completeProgramComparison: false`.

## Inspect concrete results

```javascript
const report = inspectProgram(program, {
  target: { kind: "mark", id: "points" }
});
```

Each owner view separates source rows, logical items, concrete primitives, and
statically visible candidates. Flags distinguish zero opacity, zero size,
outside-Canvas bounds, and rows removed by `missing: "skip"`. Line and Area
counts use series grain. Guides have separate views so axis or legend items do
not inflate data-mark counts. Stored statistical calculation reports appear in
`calculations`.

The inspection checks concrete structure and finite geometry where the graphic
contract supports it. It does not claim raster-pixel visibility, occlusion, or
exact font ink bounds; those checks remain `not_run` and make
`coverage.partial` true. A malformed graphic hierarchy is rejected rather than
reported as a valid partial result.

Targets use `{ kind, id, childPath? }`, where `kind` is `data`, `mark`, `scale`,
`coordinate`, or `guide`. IDs from different resource kinds never alias, and
`childPath` is resolved from the outer program inward.

## Related

[Data updates and snapshots](./data-updates.md) ·
[ChartProgram and immutability](./concepts/chart-program.md) ·
[Errors and recovery](./errors-and-recovery.md)

A facet parent retains source semantics, while its drawable marks belong to the
child panels. The parent's retained mark template reports concrete structure as
`not_applicable`; inspection still checks each actual child graphic.

Facet preflight also checks partition ancestry and supported transform replay
using the same pure dependency planner as facet creation. Aggregate output fields
that are not valid partition ancestors return a `facet-partition` finding before
any chart action executes.
