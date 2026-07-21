---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only. A dash means that the current
chart-authoring API does not support that combination.

## Complete chart support

Every chart family below supports Browser Canvas, Node PNG, and an optional
chart title. The smaller family tables keep the comparison readable on narrow
screens.

### Cartesian charts

The complete `createScatterPlot`, `createLinePlot`, `createBarPlot`,
`createHistogram`, and pre-gridded or raw-row binned `createHeatmap` facades compose the same
mark, encoding, scale, and guide actions described below. Individual actions
remain available for custom layering and editing.

| Capability | Scatterplot | Line | Histogram | Bar | Heatmap / ranged rect |
| --- | --- | --- | --- | --- | --- |
| Semantic mark | point | line | bar | bar | rect |
| Position | quantitative x/y | temporal x, aggregate y | binned x, count y | vertical or horizontal category/aggregate pair | two discrete bands or x/x2 + y/y2 ranges |
| Nominal color | point fill | series stroke | five bar layouts | five bar layouts | cell fill |
| Stroke dash | — | nominal or constant; 4 named styles | — | — | — |
| Appearance | radius, deterministic bounded x/y jitter | stroke width, 8 curves | default bar geometry | band or logical-pixel width | encoded fill, opacity, outline |
| Automatic guides | linear axes; horizontal grid | UTC time/linear axes; horizontal grid | bin-aligned/linear axes; horizontal grid | ordinal/linear axes; horizontal grid | discrete/continuous axes and color legend |
| Legend | point color + shape | categorical | categorical | categorical | categorical or continuous color |
| Selection/highlight | point | series | final bar | final bar | observed cell |

### Statistical layers

| Capability | Regression scatterplot | Density area | Horizon area |
| --- | --- | --- | --- |
| Semantic marks | point + area + line | area | area |
| Position | shared quantitative x/y | value + density x/y | quantitative/temporal x; folded `[0, 1]` y/y2 |
| Nominal color | point fill + fit stroke | overlay/stack/fill/diverging area | positive/negative band palettes |
| Appearance | point opacity, band fill/outline, line width, 8 curves | opacity, 8 curves | band count, baseline, 8 curves |
| Automatic guides | shared linear axes and horizontal grid | source-value/density axes; horizontal grid, vertical optional | source x axis/grid only; no folded y axis or legend |
| Legend | composite color/shape/line + size | categorical top/right/bottom | intentionally omitted |
| Selection/highlight | layer selection + point highlight | series | folded band items |

### Intervals and distributions

| Capability | Error bar | Error band | Box plot | Gradient plot | Violin plot |
| --- | --- | --- | --- | --- | --- |
| Semantic marks | rule | area | bar + rule + point | rect + rule | area |
| Position | categorical/temporal independent axis; interval on the other | quantitative/temporal independent axis; x/x2 or y/y2 interval | categorical axis; quantitative interval axis | categorical axis; sampled quantitative profile | categorical center; quantitative density profile |
| Nominal color | — | grouped area fill | body fill through ranged-bar color | category hue with density modulation | category or two-value split fill |
| Appearance | stroke, width, dash, opacity, optional caps | fill, opacity, 8 curves, styled boundaries | fixed defaults; 1.5px median/whiskers | structured gradient fill, width, optional center rule | fill, opacity, outline, 8 curves, shared/independent width |
| Automatic guides | interval and independent axes; perpendicular grid | interval and independent axes; perpendicular grid | categorical/linear axes; horizontal grid | categorical/linear axes, grid, density legend | categorical/linear axes; horizontal grid |
| Legend | — | categorical | optional ranged-bar color legend | neutral density; categorical color when requested | optional category or split legend |
| Selection/highlight | rule | series | component | category strip | full or split profile |

### Polar charts

| Capability | Polar points | Polar line / radar | Arc / donut / rose / radial bar |
| --- | --- | --- | --- |
| Semantic mark | point | line | arc |
| Position | theta/radius | theta/radius | count theta, or theta/radius |
| Nominal color | point fill | series stroke | sector fill, including overlay grain |
| Stroke dash | — | nominal or constant; 4 named styles | — |
| Appearance | radius, opacity, shape | stroke width, opacity, open/closed | inner radius, angular padding, fill, outline, opacity |
| Automatic guides | theta outer axis, radial axis, spokes, circles | theta outer axis, radial axis, spokes, circles | applicable theta/radius axes, spokes, circles |
| Legend | point color + shape | categorical | categorical |
| Selection/highlight | point | series | sector |

### Parallel coordinates

| Capability | Supported now |
| --- | --- |
| Semantic mark | one open line-path item per eligible source row |
| Position | two or more ordered quantitative or ordinal dimensions, each with a local scale and axis |
| Missing values | `break` fragments, whole-row `drop-row`, or strict `error` |
| Appearance | categorical color, categorical or constant stroke dash, line stroke/width/opacity |
| Automatic guides | one ordinary line/text axis per dimension and applicable categorical legend; no automatic grid |
| Selection/highlight | source-row item, including immutable `filterMarks` rematerialization |

## Shared foundations

| Area | Supported now |
| --- | --- |
| Program model | Immutable unit or composition `ChartProgram`, hierarchical trace, nested Cartesian/Polar horizontal or vertical composition, stable child replacement, and Cartesian facet repetition |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects, named filters, stable window operations, rectangular 2D bins, grouped interval summaries, grouped linear/polynomial/LOESS regression, grouped kernel-density derivations, and immutable Horizon band revisions |
| Coordinates | Named Cartesian, Polar, and Parallel resources; x/y use Cartesian, theta/radius use Polar, and ordered dimensions use Parallel |
| Scales | Linear/log/pow/sqrt/symlog position across compatible marks, UTC time, band/point position, ordinal/sequential/quantize/quantile/threshold color, point-item unknown fallbacks, named/direct stroke dash, and padded band-local xOffset/yOffset |
| Aggregates | count, sum, mean, median, min/max, distinct/valid/missing, sample/population dispersion, quartiles, standard error, normal 95% mean endpoints, parameterized quantile, and ordered first/last |
| Guides | Automatic Cartesian x/y and Polar theta/radius axes, closed numeric/UTC label formats, independently editable Cartesian and Polar grids, editable four-edge continuous/left-right categorical legends, and right-side interval legends |
| Titles | One four-edge title with an optional subtitle, deterministic word/character wrapping, and partial editing |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, rect, text, `M/L/C/Z` command paths, shared 8-value line/area curves, and heterogeneous drawable collections |
| Selection | Strict point/bar/rect/series/arc/rule comparison, set, range and grouped rank; reusable selection state; mark-specific highlight/dimming/front order |

Basic chart facades infer only a current or unique dataset and stable unused
role IDs. Ambiguous data or an occupied default role requires an explicit ID.
Applicable guides are created by default and can be disabled with
`guides: false`.

## Current limitations

Transforms beyond the documented filters, regressions, density and interval
derivations, as well as interactive legends, are not implemented.
Pre-gridded heatmaps do not synthesize missing cells. Binned heatmaps support
fixed rectangular bins only; weighted, adaptive, hexagonal, and overflow bins
are not implemented. Cell text must be added as a separate text layer.
Categorical legends support all four edges; point composite and size legends
support right and left side layouts.
Error bars support vertical and horizontal statistical intervals, existing
center/lower/upper fields, optional caps, and constant rule appearance.
Error bands support vertical and horizontal statistical or explicit ranges and
optional lower/upper boundary lines with shared stroke, width, dash, opacity,
and inherited or overridden curve. Independent lower/upper style objects are
not implemented.
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
Raincloud components, more than two split values, adaptive bandwidth, and
Polar violin placement are not implemented.
Mark selection supports point, final-bar item, stacked-bar group, line/area
series, arc sector, and rule grain. Selector values explicitly distinguish data fields,
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
Polar charts may be direct or nested concat children. Faceting a Polar source is
not implemented and fails before partial child state is created.
Parallel coordinates support quantitative/ordinal dimensions, open linear
paths, dimension-local axes, color/stroke-dash legends, selection and filtering.
Temporal dimensions, curved paths, axis drag reordering, brushing, bundling,
faceting, and shared Parallel coordinates across child programs are not implemented.
