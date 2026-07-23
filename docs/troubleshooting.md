---
layout: default
title: Troubleshooting
---

# Troubleshooting

ggaction reports an error when stored state does not determine one safe action.
It does not silently select the first mark, scale, dataset, or coordinate. Use
the cases below to make the missing decision explicit.

## A legend needs more margin

Right-side legends use the default position and require available right margin:

```javascript
program.createCanvas({
  width: 720,
  height: 460,
  margin: { top: 40, right: 140, bottom: 70, left: 80 }
});
```

For a horizontal legend, request bottom placement and reserve bottom margin:

```javascript
program.createGuides({
  legend: { position: "bottom" }
});
```

The library fails instead of overlapping the plot or clipping labels.

## A target cannot be inferred

When more than one compatible mark exists, pass its ID:

```javascript
program.encodeColor({
  target: "points",
  field: "group"
});
```

The same rule applies to explicit `data`, `scale.id`, and `coordinate` options.
Omit an ID only when the current state has one unambiguous candidate.

## A mark is not ready to materialize

Some actions intentionally leave empty graphics until the semantic relationship
is complete:

- A line needs temporal x and a compatible aggregate y.
- A histogram needs binned x and count/zero-stack y; prefer `encodeHistogram`.
- The current grouped bar flow needs ordinal x, a compatible aggregate y, grouped color/xOffset,
  then `encodeBarWidth`.
- Points need concrete x/y and a radius to be visible.

Keep the documented action order or use the atomic action when one is provided.

## A scale cannot be shared

The default scale ID is the channel name. Sharing is valid only between
compatible consumers of that same channel and policy. Give an independent
consumer a different ID:

```javascript
program.encodeY({
  field: "value",
  scale: { id: "detailY" }
});
```

Do not share one ID across x and y, binned and unbinned consumers, or different
aggregate/stack policies.

## An explicit domain omits data

Explicit ordinal domains define both membership and order. Include every
observed category needed by the connected mark:

```javascript
program.encodeColor({
  field: "Origin",
  scale: { domain: ["USA", "Europe", "Japan"] }
});
```

Unknown categories are rejected rather than appended silently. Missing
category combinations are different: grouped bars omit unobserved cells by
default instead of synthesizing zero values.

## `createGuides()` selects nothing

`createGuides()` needs at least one supported encoded axis, grid, or legend.
Create the relevant encodings first. A nominal point color encoding can create
a categorical legend; field-driven shape and quantitative size may be combined
with that legend when their resolved scales are compatible.

## `createData()` rejects the dataset

`values` must be an array of plain row objects:

```javascript
program.createData({
  values: [
    { category: "A", value: 12 },
    { category: "B", value: 18 }
  ]
});
```

Dataset IDs are optional when the generated role is unused. The dataset is
immutable after creation: use `filterData`, a derived-data action, or create a
new program revision rather than mutating the caller-owned array.

## Temporal values cannot be parsed

Temporal fields accept finite timestamps, four-digit numeric or string years,
and valid date strings. Four-digit values are interpreted as UTC years.

```javascript
program.encodeX({ field: "year", fieldType: "temporal" });
```

Use one consistent representation per field. Invalid or mixed ambiguous values
fail before a time scale or partial graphic is created.

## A filter produces an empty mark

`filterData` creates a derived dataset and leaves the source unchanged. An empty
result is valid, so confirm the exact field spelling, value type, and predicate:

```javascript
const filtered = program.filterData({
  field: "Origin",
  oneOf: ["Japan", "USA"]
});
```

Then inspect the derived dataset row count and the final graphic item count.
Filtering a numeric field with string values—or a date string with a `Date`
object—does not coerce the comparison silently.

## An encoding is incompatible with the mark

Position and appearance channels are not universally interchangeable. For
example, point marks support field-driven shape and size, while line paths use
stroke width and stroke dash. Ranged intervals require a compatible primary and
secondary position pair.

Start with the generated [mark/channel matrix](./api/encodings.md#supported-markchannel-matrix),
then open the focused family page for accepted field types and ordering rules.
The action fails before storing partial state when the combination is unsupported.

## A facet or composition cannot share a resource

Composition snapshots complete child programs and never merges their resource
namespaces. Facet sharing is narrower: every represented child scale and guide
recipe must be concretely compatible.

Use independent facet scales when panels need different policies:

```javascript
program.facet({
  field: "group",
  scales: { y: "independent" },
  guides: { legend: false }
});
```

Polar sources cannot currently be faceted. They can still be children of
`hconcat` or `vconcat`.

## Browser Canvas renders nothing

Call the browser entry point with a real Canvas element and wait until the
program is complete:

```javascript
import { render } from "ggaction";

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

If rendering succeeds but the result is blank, inspect `graphicSpec.objects`
before changing the renderer. The renderer does not infer missing mark
positions, sizes, or paths from `semanticSpec`.

## Node PNG or PDF export is unavailable in the browser

The PNG and PDF adapters are Node-only package entries:

```javascript
import { renderToPNG } from "ggaction/png";
import { renderToPDF } from "ggaction/pdf";

await renderToPNG(program, { output: "chart.png", pixelRatio: 2 });
await renderToPDF(program, { output: "chart.pdf" });
```

Use `render` from `ggaction` or `renderToSVG` from `ggaction/svg` in the browser.
Importing `ggaction/png` or `ggaction/pdf` into a browser bundle is unsupported
because they depend on Node output adapters.

## Inspect the program

Use these public states to locate the last successful authoring step:

```javascript
program.semanticSpec; // stored chart meaning
program.graphicSpec;  // fully materialized concrete graphics
program.trace;        // hierarchical action history
```

The renderer reads only `graphicSpec`; it never repairs incomplete semantic
state. See [Actions and trace trees](./concepts/actions-and-trace.md) and
[Semantic and graphical state](./concepts/semantic-and-graphics.md).

When rendering succeeds but a mark looks empty, verify the final concrete item
cardinality instead of treating a PNG or Canvas call as proof that marks were
materialized:

```javascript
const markId = "points";
const graphic = program.graphicSpec.objects[markId];

if (graphic === undefined) {
  throw new Error(`No concrete graphic exists for mark "${markId}".`);
}
const items = program.graphicSpec.objects[markId].items;
if (items.length === 0) {
  throw new Error(`Mark "${markId}" materialized no final items.`);
}
```

Point and rule items usually correspond to final rows, bars correspond to
final bin/category cells, and line or area items correspond to complete series.
Use `program.semanticSpec.layers.find(layer => layer.id === markId)` to inspect
the owning semantic layer. The map is named `graphicSpec.objects`, not
`graphicSpec.graphics`.
