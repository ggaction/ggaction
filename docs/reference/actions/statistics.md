---
layout: default
title: Statistical Layer Actions
description: Create and edit regression, density, interval, error, and box-plot layers.
---

# Statistical Layer Actions

These are direct immutable `ChartProgram` actions. Each accepts one option object and returns a new program.

## `createSummaryData`

```javascript
createSummaryData({ id, source?, groupBy?, aggregates, members? })
```

Materialize reusable, first-appearance-ordered summary rows from one or more
shared aggregate operations. [Source and Derived Data](../../api/data/source-and-derived.md#createsummarydata-id-source-groupby-aggregates-members)

## `createBinData`

```javascript
createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as? })
```

Materialize reusable one-dimensional bounds, counts, and optional source
members using the same edge rules as Histogram.
[Source and Derived Data](../../api/data/source-and-derived.md#createbindata-id-source-field-binoptions)

## `createFoldData`

```javascript
createFoldData({ id, source?, fields, as? })
```

Materialize selected wide fields as stable key/value rows while preserving
every source cell. [Source and Derived Data](../../api/data/source-and-derived.md#createfolddata-id-source-fields-as)

## `createComputedData`

```javascript
createComputedData({ id, source?, as, expression })
```

Materialize a finite row-level field from a serializable, closed arithmetic
expression. [Source and Derived Data](../../api/data/source-and-derived.md#createcomputeddata-id-source-as-expression)

## `createStackData`

```javascript
createStackData({ id, source?, category, group, value, mode?, as? })
```

Materialize reusable start/end/value/share rows with the same stack math used
by Bar and Area layouts. [Source and Derived Data](../../api/data/source-and-derived.md#createstackdata-id-source-category-group-value-mode-as)

## `createHorizonPlot`

```js
createHorizonPlot({ id?, data?, coordinate?, x, y, groupBy?, bands?, baseline?, extent?, resolve?, missing?, overflow?, palette?, area?, guides? })
```

Create a complete signed, folded area chart from explicit x and y source fields. Defaults use three bands,
a zero baseline, automatic shared extent, blue positive bands and red negative bands. Temporal x fields
support the existing temporal unit vocabulary. The full entry owns this facade; Basic does not expose it.

The original x axis and vertical grid are the only automatic guides. Folded y/horizontal grid/internal
band legend options accept only false. Palette owns fill; area appearance accepts opacity, stroke,
strokeWidth and curve. Explicit opacity is applied after encoding. Revise statistics with editHorizon
and style with editAreaMark. See the [Horizon tutorial](../../tutorials/horizon.md).

## `createDensityPlot`

```js
createDensityPlot({ id?, data?, coordinate?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, densityChannel?, valueScale?, densityScale?, color?, area?, guides? })
```

Creates a complete baseline density area from a required quantitative `field`. The default ID is `densityPlot`.
Existing KDE defaults apply: automatic bandwidth and extent, 100 steps, Gaussian kernel, unit normalization.
`groupBy` is an explicit field or `false`; omission is ungrouped. Color is optional and must use that same group field,
with a nominal/ordinal categorical scale and optional `layout: "overlay"`. Raw metadata is not copied into density profiles.
`densityChannel: "y"` places values on x; `"x"` exchanges those roles. The density scale must include zero.
`area` accepts `fill`, `opacity`, `stroke`, `strokeWidth`, and `curve`; opacity defaults to 0.2. Scalar fill conflicts
with field color, and stroke width requires a stroke. Guides default to both axes and the existing horizontal grid
in either orientation; an explicit group color enables a categorical legend. `guides: false` skips guide creation.
Use `editDensity`, `editAreaMark`, and scale/guide editors for revisions. Category placement and orientation edits
are outside this facade. This action is available from `ggaction` and is absent from `ggaction/basic`.

See the [complete density workflow](../../tutorials/density-area.md#complete-density-facade).

## `createIntervalData`

```javascript
createIntervalData({
  id, source?, field, groupBy?, center?, extent?, method?, level?, as?
})
```

Create immutable grouped center/lower/upper summary rows. Mean supports
standard error, sample standard deviation, and normal or Student-t confidence intervals;
median supports interquartile range. [Data](../../api/data.md)

## `createRegression`

```javascript
createRegression({
  target?, x?, y?, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Infer an eligible point layer and create immutable fitted data, optional grouped
interval-band paths, and grouped line paths. Method defaults to `"linear"`;
polynomial degree to `2`; LOESS span to `0.75`.
[Regression](../../api/regression.md)

## `editRegression`

```javascript
editRegression({
  target?, data?, x?, y?, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?, band?, line?
})
```

Revise the model through its stable point owner. Data-role or statistical
changes create and rebind one immutable derived-data revision; `groupBy: false`
removes grouping. Component-only changes retain the current fitted rows.
[Regression](../../api/regression.md#editing-a-regression)

## `createErrorBar`

```javascript
createErrorBar({
  id?, target?, data?, x?, y?, xOffset?, yOffset?, groupBy?, coordinate?,
  caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?
} = {})
```

Create vertical or horizontal statistical or explicit intervals. With one
eligible encoded layer, the shortest call infers its fields, orientation, data,
coordinate, and scales. Explicit interval fields also allow the independent
position to be quantitative. A categorical source can also infer a matching
xOffset/yOffset; its field joins statistical grouping and aligns source points,
the main rule, and both caps on one shared sub-slot scale.
[Error bars](../../api/error-bars.md)

## `editErrorBar`

```javascript
editErrorBar({
  target?, caps?, capSize?, stroke?, strokeWidth?, strokeDash?, opacity?,
  statistics?
})
```

Partially edit one error bar and its owned caps. `statistics` revises a
statistical interval through immutable data; explicit interval owners reject
that option. `caps: false` removes both caps and `caps: true` restores them.
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
editErrorBand({ target?, fill?, opacity?, curve?, statistics?, boundaries? })
editErrorBandBoundary({
  target?, boundary?, stroke?, strokeWidth?, strokeDash?, opacity?, curve?
})
```

Constant band fill conflicts with active color. Remove that encoding first, or
use edit-only `fill: false` to clear a constant fill and restore color eligibility.

Edit the band body, statistical interval, or both owned boundary components
without addressing generated line IDs. `boundaries: false` disables both;
an object creates or edits both. The focused boundary action still accepts
`"both"`, `"lower"`, or `"upper"` and creates missing selected boundaries.
[Error bands](../../api/error-bands.md#editing-the-band)

## `createBoxPlot`

```javascript
createBoxPlot({
  id?, target?, data?, x?, y?, coordinate?, whisker?, width?, outliers?,
  box?, median?, outlier?, guides?
} = {})
```

Create a Box plot owner that defers geometry and guides until compatible x/y
roles are available. The action infers an encoded source when possible
and composes immutable box summary data, error-bar whiskers, ranged-bar bodies,
median rules, and optional point outliers. Tukey factor, band width, component
appearance, and outlier creation are configurable. [Box plots](../../api/box-plots.md)
Guides remain opt-in for compatibility: pass `guides: {}` or nested options to
ensure compatible guides inside the facade; omission and `false` create none.

## `editBoxPlot`

```javascript
editBoxPlot({ target?, whisker?, width?, outliers?, box?, median?, outlier? })
```

Revise box statistics, optional outlier topology, width, and component
appearance through the stable box owner without addressing generated child
IDs. [Box plots](../../api/box-plots.md#editing-a-box-plot)

## `createGradientPlot`

```javascript
createGradientPlot({
  id?, target?, data?, x?, y?, coordinate?, density?, width?, gradient?,
  center?, guides?
} = {})
```

Create a Gradient plot owner that defers geometry and guides until compatible
x/y roles are available. Positions can be explicit, inferred from one eligible
encoded layer, or completed later. Defaults are Gaussian auto density, 64
samples, width band `0.7`, no outline, a median center rule, and applicable
guides. A categorical `encodeColor` owns strip hue while density continues to
control lightness and opacity.
[Statistical actions](../../reference/actions/statistics.md#creategradientplot)

## `editGradientPlot`

```javascript
editGradientPlot({ target?, density?, width?, gradient?, center? })
```

Revise one stable gradient-plot owner. Statistical changes create and rebind
one immutable raw-source profile revision; appearance-only edits retain it.
`center: false` removes the optional rule and `center: {}` restores it.
[Statistical actions](../../reference/actions/statistics.md#editgradientplot)

## `createViolinPlot`

```javascript
createViolinPlot({
  id?, data?, coordinate?, x, y, split?, color?, density?, area?, guides?
})
```

Create a vertical or horizontal categorical density plot from exactly one
categorical and one quantitative x/y role. The action infers field types,
orientation, data, scales, and applicable guides, then records an ordinary area
mark, categorical `encodeDensity`, optional color, and guides as wrapped
children. Density options own bandwidth, extent, kernel, normalization, and
shared or independent band-relative width. An optional two-value split assigns
one half to each side of the category center.
[Violin plots](../../api/violin-plots.md)

## Related

[Action Reference](../actions.md) · [Chart API](../../api/index.md) · [Supported Features](../../supported-features.md)
