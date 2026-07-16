---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only. A dash means that the current
chart-authoring API does not support that combination.

## Complete chart support

| Capability | Scatterplot | Line chart | Histogram | Bar chart | Regression scatterplot | Density area | Error bar | Error band | Box plot |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Semantic mark | point | line | bar | bar | point + area + line | area | rule | area | bar + rule + point |
| Position | quantitative x/y | temporal x, aggregate y | binned x, count y | ordinal x, aggregate y | shared quantitative x/y | value + density x/y | categorical/temporal position on x or y; interval on the other axis | quantitative/temporal independent position; quantitative x/x2 or y/y2 interval | categorical x; quantitative y/y2 |
| Nominal color | point fill | series stroke | five bar layouts | five bar layouts | point fill + fit stroke | overlay/stack/fill/diverging area | — | grouped area fill | body fill through ranged-bar color |
| Stroke dash | — | nominal or constant; 4 named styles | — | — | — | — | 4 named styles or custom pattern | — | — |
| Constant appearance | radius | stroke width, 8 curves | — | band or logical-pixel width | opacity, band fill/outline, line width, 8 curves | opacity, 8 curves | stroke, width, dash, opacity, optional fixed-size caps | fill, opacity, 8 curves, styled boundaries | fixed defaults; 1.5px median/whiskers |
| Automatic axes | linear | UTC time and linear | bin-aligned and linear | ordinal and linear | shared linear | source value + density | categorical/temporal position and linear interval axis | temporal or linear independent axis; linear interval axis | categorical x and linear y |
| Automatic grid | horizontal | horizontal | horizontal | horizontal | shared horizontal | horizontal; vertical optional | perpendicular to the interval axis | perpendicular to the interval axis | horizontal |
| Legend | point color + shape | categorical | categorical | categorical | composite color/shape/line + size | categorical top/right/bottom | — | categorical | optional ranged-bar color legend |
| Chart title | optional | optional | optional | optional | optional | optional | optional | optional | optional |
| Browser Canvas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Node PNG | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Shared foundations

| Area | Supported now |
| --- | --- |
| Program model | Immutable `ChartProgram`, hierarchical action trace |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects, named filters, grouped interval summaries, grouped linear/polynomial/LOESS regression, and grouped kernel-density derivations |
| Coordinates | Named Cartesian and Polar semantic resources; x/y use Cartesian |
| Scales | Linear, UTC time, ordinal position, color, named/direct stroke dash, and padded band-local xOffset |
| Aggregates | count, sum, mean, median, min/max, distinct/valid/missing, sample/population dispersion, quartiles, standard error, normal 95% mean endpoints, parameterized quantile, and ordered first/last |
| Guides | Automatic bottom/top x axes, left/right y axes, closed numeric/UTC label formats, independently editable horizontal/vertical Cartesian grids, and editable four-edge continuous/left-right categorical legends |
| Titles | One four-edge title with an optional subtitle, deterministic word/character wrapping, and partial editing |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, rect, text, `M/L/C/Z` command paths, shared 8-value line/area curves, and heterogeneous drawable collections |

## Current limitations

Polar guide graphics, transforms beyond the documented filters, regressions,
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
Box plots currently support vertical categorical-x Tukey summaries with fixed
documented appearance defaults. Horizontal/minmax variants and public
factor/style/outlier options are not implemented yet.
