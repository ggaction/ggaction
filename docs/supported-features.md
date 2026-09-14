---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only. A dash means that the current
chart-authoring API does not support that combination.

## Complete chart support

Use the [chart picker](./api/chart-picker.md) for every current H0 facade, its required
input context, editable owners, package membership, and lower-level actions.

| Task | Complete chart families | Next decision |
| --- | --- | --- |
| Relationships and trends | Scatter, Line, Area, Regression, Polar Scatter/Line, Radar, Parallel Coordinates | Choose position roles, series identity, then appearance |
| Category comparisons | Bar, Dot, Lollipop, Dumbbell | Keep raw rows or select an explicit summary; retain endpoint roles |
| Distributions | Histogram, Density, ECDF, Rug, Strip, Beeswarm, Raincloud, Box, Violin, Gradient | Choose raw observations, weights, smoothing, or summary grain |
| Intervals | Interval plot, Error Bar and Error Band layers | Choose explicit endpoints or a statistical interval |
| Part-to-whole and radial values | Pie, Rose, Radial Bar | Pie angle, Rose area, and radial length express different measures |
| Dense samples | Pre-gridded or rectangular binned Heatmap; Horizon | Choose aggregation or folded-band meaning explicitly |
| Repeated and combined views | Facet, Facet Grid, field repetition, horizontal/vertical concatenation | Choose independent versus shared domains and guide policies |

All complete families render through Browser Canvas, browser-safe SVG, Node PNG,
and single-page vector PDF. Support is conditional on each facade's required roles
and data grain. The [canonical channel tables](./api/encodings.md) own mark, field-type,
scale-family, and item-grain compatibility. A facade's convenient default is not the
complete support limit of its underlying mark.

## Shared foundations

| Area | Supported now |
| --- | --- |
| Program model | Immutable unit or composition `ChartProgram`, hierarchical trace, nested Cartesian/Polar/Parallel composition, stable child replacement, and Cartesian/Polar/Parallel facet, grid, and eligible field-role repetition |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable source rows, filtering, computation, normalization, completion, imputation, folding, summaries, stacks, 1D/2D bins, windows, calendar buckets, regression, intervals, KDE, ECDF, and explicit derived revision replay |
| Coordinates | Named Cartesian, Polar, and Parallel resources; x/y use Cartesian, theta/radius use Polar, and ordered dimensions use Parallel |
| Scales | Linear/log/pow/sqrt/symlog position across compatible marks, UTC time, band/point position with semantic explicit/count/category/summary ordering, ordinal/sequential/quantize/quantile/threshold color, point-item unknown fallbacks, named/direct stroke dash, and padded band-local xOffset/yOffset |
| Aggregates | count, sum, mean, median, min/max, distinct/valid/missing, sample/population dispersion, quartiles, standard error, normal 95% mean endpoints, parameterized quantile, and ordered first/last |
| Guides | Automatic Cartesian x/y and Polar theta/radius axes, closed numeric/UTC label formats, independently editable Cartesian and Polar grids, editable four-edge categorical, interval, and continuous legends, and channel-identified block editing |
| Titles | One four-edge title with an optional subtitle, deterministic word/character wrapping, and partial editing |
| Rendering | Browser Canvas, browser-safe SVG string, Node PNG, and single-page vector PDF |
| Graphics | Concrete canvas, circle, line, rect, text, `M/L/C/Z` command paths, shared 8-value line/area curves, and heterogeneous drawable collections |
| Selection | Strict point/bar/rect/series/arc/rule/tick comparison, set, range and grouped rank; reusable selection state; mark-specific highlight/dimming/front order |

Basic chart facades infer only a current or unique dataset and stable unused
role IDs. Ambiguous data or an occupied default role requires an explicit ID.
Complete chart facades create applicable guides by default and accept
`guides: false`. `createBoxPlot` preserves its historical opt-in behavior:
pass `guides: {}` or nested options to create applicable guides.

## Current limitations

### Data, transforms, and heatmaps

The public one-transform derived-data union includes reusable bins, computed
fields, folds, summaries, stacks, normalized data, completed keys, imputed values,
ECDFs, filters, regression, density, Horizon folding, intervals, time units,
windows, and rectangular 2D bins. The
[canonical transform table](./api/data/source-and-derived.md#create-derived-data)
owns the exact tag set and normalized forms. Arbitrary multi-transform
pipelines and interactive legends are not implemented.
Pre-gridded heatmaps do not synthesize missing cells. Binned heatmaps support
fixed rectangular bins only; weighted, adaptive, hexagonal, and overflow bins
are not implemented. Cell text must be added as a separate text layer.

### Guides and interval charts

Categorical, point composite, and size legends support all four edges;
edge-specific alignment and combined-block layout rules are documented in
[Legends](./api/legends.md).
Error bars support vertical and horizontal statistical intervals, existing
center/lower/upper fields, optional caps, and constant rule appearance.
Error bands support vertical and horizontal statistical or explicit ranges and
optional lower/upper boundary lines with shared stroke, width, dash, opacity,
and inherited or overridden curve. Independent lower/upper style objects are
not implemented.

### Distribution charts

Box plots support vertical or horizontal category/measure pairings, default
or configurable Tukey summaries, min–max whiskers, band width and component
appearance overrides, and explicit outlier opt-out without placeholder resources.
Gradient plots support the same category/measure orientation family, immutable
sampled profile revisions, configurable density/width/paint/center options,
source-first filtering, category-strip highlighting, and Cartesian facet
replay. Shared facet density legends and partial composite `filterMarks` are
not implemented.
Violin plots support the same category/measure orientation family, symmetric
full profiles, one-sided placement, two-value split halves, shared or
category-local density width, density revision, source filtering, profile
selection/highlighting, Cartesian facet replay, and compatible overlay scales.
For a density-plus-observations chart, use the separate
[`createRaincloudPlot`](./reference/actions/charts-data.md#createraincloudplot)
facade. Violin itself does not own raincloud components. More than two split
values, adaptive bandwidth, and Polar violin placement are not implemented.

### Selection, appearance, and text

Mark selection supports point, final-bar item, stacked-bar group, line/area
series, rect cell, arc sector, rule, and tick grain. Selector values explicitly distinguish data fields,
pre-scale semantic channels, and concrete graphic properties.
Highlight appearance supports point fill/shape/size/outline/offset, bar fill and
outline, area/arc fill/outline/offset, and line/rule stroke/width/dash/offset.
Cartesian point jitter supports deterministic pixel offsets and categorical
band-relative offsets. It preserves semantic channel values, remains bounded
by glyph extent and plot/category slots, and does not perform collision-free
packing. Polar point jitter is not implemented.
Text marks support deterministic collision-aware displacement along x, y, or
both axes within plot or Canvas bounds. The policy can create ordinary leader
lines, replays after text/source/data/scale/Canvas edits, and records structured
warnings when bounded placement cannot eliminate every overlap. It does not
expand margins, shrink text, arrange guide labels, or search unrelated marks
for anchors.

### Coordinates and composition

Polar Point/Line/direct Arc/Pie/Rose/Radar charts support facet and facet-grid
composition with shared or independent theta/radius meaning domains and
child-local frames and axes. Eligible direct Polar roles support one-dimensional
theta or radius repetition; Pie and Radar raw positional-role repetition is
explicitly rejected.
Parallel coordinates support quantitative/ordinal dimensions, open linear
paths, dimension-local axes, color/stroke-dash legends, selection, filtering,
faceting, and exact one-dimension field repetition. Temporal dimensions, curved
paths, axis drag reordering, brushing, bundling, outer shared Parallel axes,
and automatic cross-composition scale sharing are not implemented.
