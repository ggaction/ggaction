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
Create the relevant encodings first. Point color legends are currently
unsupported, so a point color encoding alone does not select a legend.

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
