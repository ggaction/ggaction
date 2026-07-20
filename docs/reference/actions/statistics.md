---
layout: default
title: Statistical Layer Actions
description: Create and edit regression, density, interval, error, and box-plot layers.
---

# Statistical Layer Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `createIntervalData`

```javascript
createIntervalData({
  id, source?, field, groupBy?, center?, extent?, level?, as?
})
```

Create immutable grouped center/lower/upper summary rows. Mean supports
standard error, sample standard deviation, and Student-t confidence intervals;
median supports interquartile range. [Data](../../api/data.md)

## `createRegression`

```javascript
createRegression({
  target?, x?, y?, groupBy?, method?, degree?, span?,
  confidence?, interval?, band?, line?
})
```

Infer an eligible point layer and create immutable fitted data, optional grouped
interval-band paths, and grouped line paths. Method defaults to `"linear"`;
polynomial degree to `2`; LOESS span to `0.75`.
[Regression](../../api/regression.md)

## `editRegression`

```javascript
editRegression({
  target?, method?, degree?, span?, confidence?, interval?, band?, line?
})
```

Revise the model through its stable point owner. Statistical changes create and
rebind one immutable derived-data revision; component-only changes retain the
current fitted rows. [Regression](../../api/regression.md#editing-a-regression)

## `createErrorBar`

```javascript
createErrorBar({
  id?, target?, data?, x?, y?, groupBy?, coordinate?,
  caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
} = {})
```

Create vertical or horizontal statistical or explicit intervals. With one
eligible encoded layer, the shortest call infers its fields, orientation, data,
coordinate, and scales.
[Error bars](../../api/error-bars.md)

## `editErrorBar`

```javascript
editErrorBar({
  target?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
})
```

Partially edit one error bar and its owned caps. `caps: false` removes both
caps; `caps: true` restores them without replacing interval data.
[Error bars](../../api/error-bars.md#editing-error-bars)

## `createErrorBand`

```javascript
createErrorBand({
  id?, target?, data?, x?, y?, groupBy?, coordinate?, fill?, opacity?,
  curve?, boundaries?
} = {})
```

Create a vertical or horizontal statistical or explicit interval ribbon. The
action can infer one encoded source layer and reuses `createIntervalData`, an
ordinary area, the matching atomic range action, and grouping actions.
`boundaries: { stroke?, strokeWidth?, strokeDash?, opacity?, curve? }` adds
lower and upper line layers. Boundary curve inherits the area curve unless it
is overridden.
[Error bands](../../api/error-bands.md)

## `editErrorBand` and `editErrorBandBoundary`

```javascript
editErrorBand({ target?, fill?, opacity?, curve? })
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Edit the band body or selected owned boundaries without addressing generated
line IDs. Boundary selection is `"both"`, `"lower"`, or `"upper"`; omitted
selection means both. Missing selected boundaries are created from the band.
[Error bands](../../api/error-bands.md#editing-the-band)

## `createBoxPlot`

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, whisker?, width?, outliers?,
  box?, median?, outlier?
} = {})
```

Create a vertical or horizontal Tukey/min–max box plot from one categorical
and one quantitative field. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../../api/box-plots.md)

## `editBoxPlot`

```javascript
editBoxPlot({ target?, whisker?, width?, outliers?, box?, median?, outlier? })
```

Revise box statistics, optional outlier topology, width, and component
appearance through the stable box owner without addressing generated child
IDs. [Box plots](../../api/box-plots.md#editing-a-box-plot)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
