---
layout: default
title: Program Inspection
---

# Program Inspection

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

## Read a dataset contract

```javascript
const { data, schema } = getDatasetSchema(program, { data: "sales" });
```

The explicit dataset ID can be a logical derived-data owner or its current
physical revision. The result reports the resolved ID and normalized schema.
`completeness: "unknown"` means the library cannot prove field availability;
it is different from a known schema whose `fields` array is empty. Use
`childPath` to address a dataset inside a composition.

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
constraints appear in `requirements`, `checks`, and structured `findings`.
`applicability: "supported"` means the static checks passed; numerical fitting,
allocation, and rendering remain `not_run`. Registered extension actions with
no built-in descriptor return `unverified`.

## Compare immutable revisions

```javascript
const comparison = comparePrograms(before, after);
const dataScoped = comparePrograms(before, after, {
  target: { kind: "data", id: "sales" }
});
```

The full comparison includes datasets and values, layer order and bindings,
scales, coordinates, guides, Canvas settings, composition intent, and
user-authored appearance. It ignores trace-only IDs, current selection context,
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
