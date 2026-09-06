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

## `fitCanvas`

```javascript
fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow? })
```

Fit an existing Full unit chart by shrinking its margins on a fixed Canvas.
The action uses deterministic 0.25px probes and preserves semantic state,
explicit scale ranges, guide policies, Canvas width, and Canvas height. The
default overflow policy rejects an unsatisfied minimum plot atomically;
`overflow: "report"` stores a structured result on
`materializationConfigs.fitting`.

## `applyTheme`

```javascript
applyTheme({ theme: "light" | "dark" })
```

Apply persistent visual defaults to existing resources and resources created by
later actions. Local styles take precedence, including an explicitly authored
value that equals a theme default. Theme changes preserve data, statistics,
scales, grouping, category order, and field-driven palettes.

## `removeTheme`

```javascript
removeTheme()
```

Remove the active program theme and restore inherited library defaults while
preserving local styles.

## `editCompositionLayout`

```javascript
editCompositionLayout({ columns?, gap?, align?, padding? })
```

Edit spacing, cross-axis alignment, or outer padding on an existing composition.
`columns` changes wrapping only on a facet composition and is rejected for concat.
Omitted values are preserved, child identity is unchanged, and the parent snapshot
is rebuilt from retained child programs.

## `replaceCompositionChild`

```javascript
replaceCompositionChild({ target, program })
```

Replace one named child while preserving its slot ID and order. The replacement
must already be a complete chart or composition program.

## `insertCompositionChild`

```javascript
insertCompositionChild({ id, program, before?, after? })
```

Insert a complete chart or nested composition under a new stable child name.
Use either `before` or `after`; omitting both appends the child.

## `removeCompositionChild`

```javascript
removeCompositionChild({ target })
```

Remove one named concat child and rebuild layout. A concat may retain one child,
but its final child cannot be removed.

## `reorderCompositionChildren`

```javascript
reorderCompositionChildren({ order })
```

Provide every current concat child ID exactly once in its new order. Child
program references stay unchanged while placements and snapshots are rebuilt.

## `facet`

```javascript
facet({ id?, field, data?, values?, columns?, gap?, align?, padding?, scales?, guides? })
```

Repeat one complete chart by a field on its common row-preserving dataset
ancestor. Values preserve source first appearance; scale policies can be
`"shared"` or `"independent"` by supported channel, and layered regression
data and other supported statistical descendants are recomputed per cell.
`guides: { axes: "outer" }` keeps axes only on occupied outer cells, while
`guides: { legend: "shared" }` promotes one compatible parent-owned legend at
the child legend's configured `left`, `right`, `top`, or `bottom` edge. Top and
bottom promotion also preserves the child legend's horizontal alignment;
author those options with `createLegend` before calling `facet`.
See [Program composition](../../api/composition.md#repeat-the-current-chart-by-a-field).

## `facetGrid`

```javascript
facetGrid({ id?, data?, rows, columns, combinations?, gap?, align?, padding?, scales?, guides? })
```

Repeat one supported Cartesian chart over two ordered categorical fields.
`combinations: "observed"` retains the coordinates of observed pairs;
`"full"` also creates explicit blank cells for missing pairs.

## `repeatCharts`

```javascript
repeatCharts({ id?, target?, channel, fields, columns?, gap?, align?, padding?, scales?, guides? })
```

Repeat one direct Cartesian mark by replacing its x or y field. The repeated
channel is independently scaled by default; request a shared policy explicitly
to use the union domain. Polar roles, Parallel dimensions, and composite roles
are rejected with explicit errors.

## `editFacetSource`

```javascript
editFacetSource({ program })
```

Reapply the current facet, grid, or repeat recipe to a revised complete unit
program while preserving the partition dataset ID, ordered domains, layout,
scale/guide policy, headers, and parent title. All stored facet values must
remain observed; create a new composition when the dataset ID, domain, or
repeat field list changes.

## `editFacetHeaders`

```javascript
editFacetHeaders({ fontSize?, fontFamily?, fontWeight?, color?, offset? })
```

Edit the parent-owned repeated facet headers and rebuild the parent snapshot
without changing child programs or facet value order.

## `editFacetScales`

```javascript
editFacetScales({ x?, y?, xOffset?, yOffset?, color?, size?, shape?, opacity?, strokeDash? })
```

Partially change used facet channels between `"shared"` and `"independent"`.
Every cell is rederived from the retained pre-facet program while field, data,
value order, child IDs, layout, guides, headers, and title are preserved.

## `editFacetGuides`

```javascript
editFacetGuides({ axes?, legend? })
```

Partially change axes between `"each"` and `"outer"`, or legend ownership
between `false` and `"shared"`. Shared legend promotion requires concretely
compatible child scales and guide recipes.

## `createData`

```javascript
createData({ id?, values })
```

Create one immutable named dataset. [Data](../../api/data.md)

## `bindMarkData`

```javascript
bindMarkData({ target, data })
```

Atomically connect one independent mark to an existing materialized dataset.
The action preflights its fields, scales, guides, labels, selections, and
highlights before it rematerializes every registered consumer.
[Source and Derived Data](../../api/data/source-and-derived.md#bindmarkdata-target-data)

## `createScatterPlot`

```javascript
createScatterPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, guides? })
```

Create a complete Cartesian point chart from required x/y fields and optional
appearance encodings. [Basic Charts](../../api/basic-charts.md#createscatterplot)

## `createDotPlot`

```javascript
createDotPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, point?, labels?, guides? })
```

Create categorical dots from raw rows by default. Set `summary` explicitly to
`mean`, `median`, `sum`, `min`, or `max` to aggregate one dot per category.

## `createLollipopPlot`

```javascript
createLollipopPlot({ id?, data?, coordinate?, category, value, orientation?, summary?, baseline?, point?, stem?, labels?, guides? })
```

Create a value point and a stem to a finite baseline, which defaults to zero.
The point and stem use the same source grain and quantitative scale.

## `createDumbbellPlot`

```javascript
createDumbbellPlot({ id?, data?, coordinate?, category, start, end, orientation?, summary?, startPoint?, endPoint?, connector?, labels?, guides? })
```

Create named start and end points with a connector. Endpoint identity stays
attached to its field and appearance when values reverse or coincide.

## `editEndpointPlot`

```javascript
editEndpointPlot({ target?, data?, coordinate?, category?, value?, start?, end?, orientation?, summary?, baseline? })
```

Atomically revise the semantic roles of a Dot, Lollipop, or Dumbbell facade.
Owned points, rules, labels, and summary data are replaced together while the
original appearance and guide policy are retained.

## `createECDFPlot`

```javascript
createECDFPlot({ id?, data?, coordinate?, field, groupBy?, weight?, missing?, as?, color?, line?, labels?, guides? })
```

Create a right-continuous empirical cumulative distribution as an ordinary
`step-after` line. Ties share one jump, probability is fixed to `[0,1]`, and
optional grouping controls both statistical denominators and path identity.

## `editECDFPlot`

```javascript
editECDFPlot({ target?, data?, coordinate?, field?, groupBy?, weight?, missing?, as?, color? })
```

Atomically revise an ECDF source or statistical role and rebuild its owned
derived rows, path, final-series labels, and guides under the stable owner ID.
Ungrouping also removes a coupled group color unless a replacement is supplied.

## `createIntervalPlot`

```javascript
createIntervalPlot({ id?, data?, coordinate?, x, y, xOffset?, yOffset?, groupBy?, color?, point?, errorBar?, guides? })
```

Create center points and matching statistical or explicit intervals from one
shared dataset, coordinate, and pair of scales. The x/y interval vocabulary is
the same as `createErrorBar`; child point and error-bar styles remain independently
editable through their existing owners. When scale IDs are omitted, the complete
owner uses `${id}X` and `${id}Y` so unrelated earlier channel scales cannot make
the call order dependent.

## `createRegressionPlot`

```javascript
createRegressionPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, groupBy?, method?, band?, line?, guides? })
```

Create a complete scatter plot with an existing regression data, line, and
optional interval-band hierarchy. `groupBy: false` is preserved as an explicit
ungrouped model request.

## `createLinePlot`

```javascript
createLinePlot({ id?, data?, coordinate?, x, y, color?, groupBy?, strokeDash?, line?, guides? })
```

Create a complete Cartesian line chart. `groupBy` accepts one field or a
non-empty tuple, assigned before independent series color and dash. [Basic Charts](../../api/basic-charts.md#createlineplot)

## `createPolarScatterPlot`

```javascript
createPolarScatterPlot({ id?, data?, coordinate?, theta, radius, color?, size?, shape?, point?, guides? })
```

Create a complete Polar point chart from required angular and radial fields.
Radial position remains independent from `size` and constant `point.radius`.
[Polar positions](../../api/position-encodings.md#polar-positions)

## `createPolarLinePlot`

```javascript
createPolarLinePlot({ id?, data?, coordinate?, theta, radius, groupBy?, color?, strokeDash?, line?, guides? })
```

Create grouped Polar paths from required angular and radial fields. Paths stay
open unless `line.closed: true` is explicit. [Polar positions](../../api/position-encodings.md#polar-positions)

## `createRadarPlot`

```javascript
createRadarPlot({ id?, data?, coordinate?, category, value, groupBy?, order?, color?, strokeDash?, line?, guides? })
createRadarPlot({ id?, data?, coordinate?, wide: { fields, as? }, groupBy?, order?, color?, strokeDash?, line?, guides? })
```

Create closed Radar paths from validated long rows or an explicit wide-to-long
Fold. Every series must contain the same ordered dimensions exactly once. Values
are used as supplied; the facade does not infer normalization. [Polar positions](../../api/position-encodings.md#polar-positions)

## `createRugPlot`

```javascript
createRugPlot({ id?, data?, x, edge: "top" | "bottom", tick?, guides? })
createRugPlot({ id?, data?, y, edge: "left" | "right", tick?, guides? })
```

Create a one-dimensional distribution from quantitative or temporal observations.
Ticks use an explicit plot edge as their constant position, so no dummy field is
needed. The default guide contains only the measure axis.

## `createStripPlot`

```javascript
createStripPlot({ id?, data?, x, y?, color?, size?, shape?, point?, jitter?, guides? })
```

Create a point strip from one measure or from one measure plus one categorical
slot. Optional deterministic jitter moves only the category or constant slot and
preserves the measured coordinate. Category jitter uses band units; a centered
one-measure strip uses pixel units.

## `createBeeswarmPlot`

```javascript
createBeeswarmPlot({ id?, data?, coordinate?, x, y, color?, size?, shape?, point?, packing?, guides? })
```

Create a role-safe category/measure Point chart and deterministically pack actual
glyph extents within each category slot. The facade reuses `createStripPlot` and
`packPoints`; set `packing: false` to retain semantic centers without packing.

## `createRaincloudPlot`

```javascript
createRaincloudPlot({ id?, data?, coordinate?, category, value, orientation?, side?, density?, summary?, points?, color?, guides? })
```

Create a shared-source distribution composite from an optional half Violin,
Box or Interval summary, and Strip or Beeswarm raw points. Defaults are vertical,
`side: "before"`, Box summary, and Beeswarm points. Stable Cloud/Summary/Points
children share role scales; summary and points use a replayable band-relative slot
offset on the side opposite the density.

## `editRaincloudPlot`

```javascript
editRaincloudPlot({ target?, data?, category?, value?, orientation?, side?, density?, summary?, points?, color? })
```

Atomically revise one Raincloud's shared source, roles, orientation, side, and
component modes while preserving its parent and child IDs. Use `false` to disable
an optional component or remove color; at least one component must remain enabled.

## `createBarPlot`

```javascript
createBarPlot({ id?, data?, coordinate?, x, y, color?, width?, bar?, guides? })
```

Create a complete vertical, horizontal, aggregate, ranged, grouped, or stacked
bar chart through the existing bar policies. Category-first child calls infer
the measure's mean in either orientation; temporal categories are supported on both axes.
[Basic Charts](../../api/basic-charts.md#createbarplot)

## `createHistogram`

```javascript
createHistogram({ id?, data?, coordinate?, field, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?, color?, bar?, guides? })
```

Create a bar layer with atomic bin and count encodings. Exactly one bin mode may
be specified. [Basic Charts](../../api/basic-charts.md#createhistogram)

## `createAreaPlot`

```javascript
createAreaPlot({ id?, data?, coordinate?, x, y, valueChannel?, baseline?, groupBy?, layout?, missing?, color?, area?, guides? })
```

Create a simple area, crossing ribbon, or accumulated series chart in the full entry. The default ID is
`areaPlot`; x and y are required. `valueChannel` defaults to y. Its measurement is a field string,
`{field,scale?}`, or `{lower,upper,scale?}`. Each bound is a field string or finite `{datum}` and at least
one bound must use a field. A simple field closes to baseline 0; `baseline` cannot accompany a range.
The independent position is quantitative or temporal and accepts field/fieldType/temporalUnit/scale.

`groupBy` explicitly identifies nominal series using a field or a unique nonempty tuple. Color is optional,
categorical, and constant within each series. `layout` defaults to overlay; stack/fill/diverging require
one value field, baseline 0 and aligned unique group×position rows. Center also requires vertical nonnegative
values. Missing defaults to error; `missing:"break"` closes separate segments with at least two valid points.
A missing measure at one position splits every accumulated series there. NaN, infinity and missing independent
positions remain errors. No source rows or baseline fields are synthesized.

`area` accepts fill/opacity/stroke/strokeWidth/curve; opacity defaults to .2. Field color conflicts with fill.
Guides default to compatible Cartesian axes/grid and an optional categorical color legend; false skips creation.
Edit the result with range/endpoint encodings, encodeGroup, layoutSeries, editAreaMark and scale/guide actions.
See the [Area and series layout tutorial](../../tutorials/area-layout.md).

## `createPiePlot`

```javascript
createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, arc?, guides? })
```

Create one sector per category in the full package. `category` is required and
defaults to nominal count, including numeric categories. For weights, provide
both `value` and `aggregate: "sum"`; values must be finite and nonnegative with
a positive total. Color defaults to the category. Use `color: false` for a
scalar `arc.fill`; otherwise each slice must resolve to one categorical color.

`arc.innerRadius` is a radius ratio in [0,1), and `arc.padAngle` is in degrees.
Use these options for a donut. `guides` defaults to a color legend with no axes
or grid; `guides: false` skips guide creation. Explicit axes/grid requests must
be false. A zero-weight category may remain in the color legend without a sector.
The default id is `piePlot`. Edit with `editArcMark`, theta/color encodings,
scales and legend actions. [Pie and donut tutorial](../../tutorials/polar-arcs.md#complete-pie-and-donut-plots)

## `createRosePlot`

```javascript
createRosePlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose sector area, excluding the hole is proportional to category count or sum. Category is required; omit value for count or provide value with aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `rosePlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit Canvas. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)

## `createRadialBarPlot`

```javascript
createRadialBarPlot({ id?, data?, coordinate?, category, value?, aggregate?, radiusScale?, color?, arc?, guides? })
```

Create equal-angle sectors whose radial length measured from the inner edge is proportional to category count or sum. Category is required; omit value for count or provide value with aggregate: "sum". Color defaults to category and guides provide theta/radius axes, Polar grids, and a categorical legend. Use guides:false to skip them, or color:false with arc.fill for one color.

The default id is `radialBarPlot`. Radius scales are linear and zero-based; explicit domain [0,U] must cover all aggregates and range [inner,outer] must fit Canvas. Arc padAngle is 0 and an explicitly specified innerRadius must agree with the range. Zero categories retain domain entries but draw no sector. Negative, nonfinite, empty/all-zero and unrepresentable positive-thickness inputs are errors. Edit the child mark, encodings, scales and guides with their own actions.

[Measured radial tutorial](../../tutorials/polar-arcs.md#measured-rose-and-radial-bar-plots)

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
filterMarks({ target?, mode?, grain?, field | channel | property, op, ...operands })
```

Retain matching final mark items through the shared selector grammar. Repeated
filters are idempotent when equal and use explicit `replace` or `compose` mode
when different. Empty results preserve the preceding scale domains.
[Data](../../api/data.md)

## `removeMarkFilter`

```javascript
removeMarkFilter({ target? })
```

Restore a filtered mark to its canonical source, recover its prior Histogram bin
policy, and retain any filtered dataset snapshot that still has downstream users.
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
  id, source?, x, y, groupBy?, method?, degree?, span?,
  confidenceMethod?, level?, confidence?, interval?
})
```

Create immutable linear, polynomial, or LOESS fitted rows at observed unique x
values. Linear and polynomial fits support normal or Student-t mean or prediction bounds;
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

## `createTimeUnitData`

```javascript
createTimeUnitData({ id, source?, field, temporalUnit?, unit, as })
```

Create an immutable row-preserving dataset with one UTC year, quarter, month,
day, hour, minute, or second bucket-start timestamp field.
[Time-unit data transforms](../../api/data/time-units.md)

## `createWindowData`

```javascript
createWindowData({ id, source?, partitionBy?, sortBy?, operations })
```

Create an immutable derived dataset by applying ordered row-number, rank,
dense-rank, cumulative-sum, lag, lead, moving-mean, or moving-sum operations
within optional partitions. Moving frames include the current sorted row, require
a non-negative `preceding`, default `following` to `0`, and truncate at partition
edges. The calculation follows a stable sort while the output preserves source
row order.
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
