---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only. A dash means that the current
chart-authoring API does not support that combination.

## Complete chart support

| Capability | Scatterplot | Polar points | Line chart | Histogram | Bar chart | Regression scatterplot | Density area | Error bar | Error band | Box plot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Semantic mark | point | point | line | bar | bar | point + area + line | area | rule | area | bar + rule + point |
| Position | quantitative x/y | theta/radius | temporal x, aggregate y | binned x, count y | ordinal x, aggregate y | shared quantitative x/y | value + density x/y | categorical/temporal position on x or y; interval on the other axis | quantitative/temporal independent position; quantitative x/x2 or y/y2 interval | categorical x; quantitative y/y2 |
| Nominal color | point fill | point fill | series stroke | five bar layouts | five bar layouts | point fill + fit stroke | overlay/stack/fill/diverging area | — | grouped area fill | body fill through ranged-bar color |
| Stroke dash | — | — | nominal or constant; 4 named styles | — | — | — | — | 4 named styles or custom pattern | — | — |
| Constant appearance | radius | radius, opacity, shape | stroke width, 8 curves | — | band or logical-pixel width | opacity, band fill/outline, line width, 8 curves | opacity, 8 curves | stroke, width, dash, opacity, optional fixed-size caps | fill, opacity, 8 curves, styled boundaries | fixed defaults; 1.5px median/whiskers |
| Automatic axes | linear | theta outer axis + radial axis | UTC time and linear | bin-aligned and linear | ordinal and linear | shared linear | source value + density | categorical/temporal position and linear interval axis | temporal or linear independent axis; linear interval axis | categorical x and linear y |
| Automatic grid | horizontal | theta spokes + radial circles | horizontal | horizontal | horizontal | shared horizontal | horizontal; vertical optional | perpendicular to the interval axis | perpendicular to the interval axis | horizontal |
| Legend | point color + shape | point color + shape | categorical | categorical | categorical | composite color/shape/line + size | categorical top/right/bottom | — | categorical | optional ranged-bar color legend |
| Chart title | optional | optional | optional | optional | optional | optional | optional | optional | optional | optional |
| Mark selection/highlight | selection + point highlight | selection + point highlight | series selection | final-bar selection | final-bar selection | layer selection + point highlight | series selection | rule selection | series selection | component selection |
| Browser Canvas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Node PNG | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Shared foundations

| Area | Supported now |
| --- | --- |
| Program model | Immutable `ChartProgram`, hierarchical action trace |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects, named filters, grouped interval summaries, grouped linear/polynomial/LOESS regression, and grouped kernel-density derivations |
| Coordinates | Named Cartesian and Polar resources; x/y use Cartesian and theta/radius use Polar for points |
| Scales | Linear/log/pow/sqrt/symlog position across compatible marks, UTC time, band/point position, ordinal/sequential/quantize/quantile/threshold color, point-item unknown fallbacks, named/direct stroke dash, and padded band-local xOffset |
| Aggregates | count, sum, mean, median, min/max, distinct/valid/missing, sample/population dispersion, quartiles, standard error, normal 95% mean endpoints, parameterized quantile, and ordered first/last |
| Guides | Automatic Cartesian x/y and Polar theta/radius axes, closed numeric/UTC label formats, independently editable Cartesian and Polar grids, editable four-edge continuous/left-right categorical legends, and right-side interval legends |
| Titles | One four-edge title with an optional subtitle, deterministic word/character wrapping, and partial editing |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, rect, text, `M/L/C/Z` command paths, shared 8-value line/area curves, and heterogeneous drawable collections |
| Selection | Strict point/bar/series/rule comparison, set, range and grouped rank; reusable selection state; mark-specific highlight/dimming/front order |

## Current limitations

Polar line/arc marks, transforms beyond the documented filters, regressions,
and density derivations, facets, interactive legends, and program composition
are not implemented.
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
Mark selection supports point, final-bar item, stacked-bar group, line/area
series, and rule grain. Selector values explicitly distinguish data fields,
pre-scale semantic channels, and concrete graphic properties.
Highlight appearance supports point fill/shape/size/outline/offset, bar fill and
outline, area fill/outline/offset, and line/rule stroke/width/dash/offset.
