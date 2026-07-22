---
layout: default
title: Charts, Data, and Composition Actions
description: Create complete charts, manage data, select marks, and compose complete programs.
---

# Charts, Data, and Composition Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `createCanvas`

```javascript
createCanvas({ width?, height?, background?, margin? })
```

Create the program's Canvas and plot bounds. [Canvas options](../../api/canvas.md)

## `editCanvas`

```javascript
editCanvas({ width?, height?, background?, margin? })
```

Edit Canvas properties and rematerialize connected consumers.
[Canvas options](../../api/canvas.md)

## `editCompositionLayout`

```javascript
editCompositionLayout({ gap?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs.

## `replaceCompositionChild`

```javascript
replaceCompositionChild({ target, program })
```

Replace one named child while preserving its slot ID and order. The replacement
must already be a complete chart or composition program.

## `facet`

```javascript
facet({ id?, field, data?, columns?, gap?, align?, padding?, scales?, guides? })
```

Repeat one complete chart by a field on its common row-preserving dataset
ancestor. Values preserve source first appearance; scale policies can be
`"shared"` or `"independent"` by supported channel, and layered regression
data and other supported statistical descendants are recomputed per cell.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend.
See [Program composition](../../api/composition.md#repeat-the-current-chart-by-a-field).

## `editFacetHeaders`

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.

## `createData`

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../../api/data.md)

## `createScatterPlot`

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../../api/basic-charts.md#createscatterplot)

## `createLinePlot`

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart, including optional series grouping and
appearance. [Basic Charts](../../api/basic-charts.md#createlineplot)

## `createBarPlot`

```javascript
createBarPlot({ id?, data?, coordinate?, x, y, color?, width?, bar?, guides? })
```

Create a complete vertical, horizontal, aggregate, ranged, grouped, or stacked
bar chart through the existing bar policies.
[Basic Charts](../../api/basic-charts.md#createbarplot)

## `createHistogram`

```javascript
createHistogram({ id?, data?, coordinate?, field, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?, color?, bar?, guides? })
```

Create a bar layer with atomic bin and count encodings. Exactly one bin mode may
be specified. [Basic Charts](../../api/basic-charts.md#createhistogram)

## `createHeatmap`

```javascript
createHeatmap({ id?, data?, coordinate?, x, y, bin?, color?, rect?, guides? })
```

Create one rect cell per valid pre-gridded row, or bin raw quantitative x/y rows
into ranged cells colored by count. [Basic Charts](../../api/basic-charts.md#createheatmap)

## `createParallelCoordinates`

```javascript
createParallelCoordinates({ id?, data?, coordinate?, dimensions, key?, missing?, color?, strokeDash?, line?, guides? })
```

Create one open line path per source row across an ordered list of dimension-
local scales and axes. Only `dimensions` is required.
[Parallel Coordinates](../../api/parallel-coordinates.md)

## `filterData`

```javascript
filterData({ id, source?, field, oneOf | predicate | range })
```

Create an immutable named derived dataset using exactly one membership,
comparison, or range filter. The source defaults to current data.
[Data](../../api/data.md)

## `filterMarks`

```javascript
filterMarks({ target?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar, create one
namespaced immutable member-row dataset, rebind the mark, and rematerialize its
scales and connected guides without changing the source.
[Data](../../api/data.md)

## `highlightMarks`

```javascript
highlightMarks({
  id?, target?, select?, selection?, color?, opacity?, fill?, stroke?,
  strokeWidth?, strokeDash?, shape?, size?, offset?, dimOthers?, bringToFront?
})
```

Select point, bar, line, area, arc, or rule items inline or reuse a stored selection,
then apply mark-specific concrete emphasis, optional complement dimming, and
selected-last order.
[Mark selection and highlighting](../../api/appearance/selection-and-highlighting.md#mark-selection-and-highlighting)

## `removeMarkHighlight`

```javascript
removeMarkHighlight({ selection? } = {})
```

Remove one highlight assignment, restore the target mark and categorical
legend baseline, and retain the reusable selection.
[Selection lifecycle](../../api/appearance/selection-and-highlighting.md#editing-and-removing-stored-intent)

## `createRegressionData`

```javascript
createRegressionData({
  id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval?
})
```

Create immutable linear, polynomial, or LOESS fitted rows at observed unique x
values. Linear and polynomial fits support Student-t mean or prediction bounds;
LOESS is line-only.
[Data](../../api/data.md)

## `createDensityData`

```javascript
createDensityData({
  id, source?, field, groupBy?, bandwidth?, extent?, steps?,
  kernel?, normalization?, as?
})
```

Create immutable KDE rows on one shared inclusive sample grid. Source defaults
to current data, steps to `100`, bandwidth to an automatic Scott-rule estimate,
kernel to `"gaussian"`, and normalization to `"unit"`.
[Data](../../api/data.md)

## `createWindowData`

```javascript
createWindowData({ id, source?, partitionBy?, sortBy?, operations })
```

Create an immutable derived dataset by applying ordered row-number, rank,
dense-rank, cumulative-sum, lag, or lead operations within optional partitions.
The calculation follows a stable sort while the output preserves source row order.
[Window data transforms](../../api/data/window.md)

## `createBin2DData`

```javascript
createBin2DData({
  id, source?, x, y, bins?, extent?, includeEmpty?, members?, as?
})
```

Aggregate finite x/y pairs into deterministic rectangular cell bounds and
counts. Reusing the logical ID creates an immutable revision and rematerializes
direct visual consumers. [Rectangular 2D bins](../../api/data/bin2d.md)

## `editBin2DData`

```javascript
editBin2DData({
  target?, source?, x?, y?, bins?, extent?, includeEmpty?, members?, as?
})
```

Partially revise the current or unique logical 2D-bin owner. Omitted top-level
transform options are preserved; successful edits create an immutable revision,
rebind direct visual consumers, and safely release the prior revision.
[Rectangular 2D bins](../../api/data/bin2d.md#editbin2ddata)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
