---
layout: default
title: Violin Plots
---

# Violin Plots

{% include chart-example.html id="violin" %}

Use `createViolinPlot` to compare kernel-density profiles inside categorical
bands. It accepts the same categorical/quantitative x/y role family as box and
gradient plots, then infers orientation from the complete field pair.

## Minimal vertical violin

```javascript
const program = chart()
  .createCanvas()
  .createData({ values })
  .createViolinPlot({
    x: "category",
    y: "value"
  });
```

The action creates an area mark, immutable density data, category and value
scales, full closed paths, and applicable Cartesian guides. Field types are
inferred when the current dataset makes one categorical and one quantitative
role unambiguous.

## Density width and orientation

```javascript
.createViolinPlot({
  x: { field: "value", fieldType: "quantitative" },
  y: { field: "category", fieldType: "nominal" },
  density: {
    bandwidth: 0.8,
    extent: [0, 30],
    steps: 80,
    width: { band: 0.7, resolve: "independent" }
  }
})
```

`width.band` is the fraction of each categorical band available to the full
shape. `resolve: "shared"` uses one density maximum across categories;
`"independent"` gives each category its own maximum. The default is
`{ band: 0.8, resolve: "shared" }`.

## Split a category into two halves

```javascript
.createViolinPlot({
  x: "category",
  y: "value",
  split: {
    field: "period",
    domain: ["early", "late"]
  },
  color: {
    field: "period",
    scale: { range: ["#4c78a8", "#e45756"] }
  }
})
```

A split must contain exactly two observed values. The first domain value owns
the left or top half and the second owns the right or bottom half. When the
domain is omitted, ggaction uses first-appearance order only if exactly two
values are observed.

## Appearance and guides

```javascript
.createViolinPlot({
  x: "category",
  y: "value",
  color: "category",
  area: { opacity: 0.7, strokeWidth: 1.5 },
  guides: { legend: false }
})
```

When `strokeWidth` is supplied without a constant stroke, each outline follows
its materialized fill. A category-color legend is omitted by default because
the categorical axis already identifies the same field; request
`guides: { legend: {} }` to show it explicitly.

## Editing

`createViolinPlot` creates a stable owner. Revise its data and statistical
roles together:

```javascript
const revised = program.editViolinPlot({
  target: "violins",
  data: "revised",
  x: "value",
  y: "category",
  split: false,
  density: { bandwidth: 1.1 }
});
```

The owner ID stays stable while the action creates a new immutable density-data
revision and reconciles orientation, scales, axes, grid, selections, and
highlights. Use the lower actions for a single resource decision:

```javascript
const revised = program
  .editDensity({
    bandwidth: 1.1,
    placement: {
      type: "category",
      width: { band: 0.6, resolve: "shared" }
    }
  })
  .editAreaMark({ opacity: 0.55 });
```

`editAreaMark` continues to own path appearance. Canvas, scale, data,
filtering, selection, highlighting, and facet changes rematerialize the
complete density paths.

## Current boundary

- Exactly one categorical and one quantitative position role
- At most two split values
- Cartesian coordinates only
- No raincloud raw-point/box components, adaptive bandwidth, or Polar violin

## Related

[Violin recipe](../recipes/violin-plot.md) ·
[Density encoding](./encodings.md#atomic-density) ·
[Area marks](./marks/line-area.md) ·
[Box plots](./box-plots.md)
