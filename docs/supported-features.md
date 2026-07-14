---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only. A dash means that the current
chart-authoring API does not support that combination.

## Complete chart support

| Capability | Scatterplot | Line chart | Histogram | Bar chart | Regression scatterplot | Density area |
| --- | --- | --- | --- | --- | --- | --- |
| Semantic mark | point | line | bar | bar | point + area + line | area |
| Position | quantitative x/y | temporal x, aggregate y | binned x, count y | ordinal x, aggregate y | shared quantitative x/y | value + density x/y |
| Nominal color | point fill | series stroke | zero-stacked fill | grouped fill and xOffset | point fill + fit stroke | grouped area fill |
| Stroke dash | — | nominal or constant; 4 named styles | — | — | — | — |
| Constant appearance | radius | stroke width, 8 curves | — | band width | opacity, band fill, line width | opacity |
| Automatic axes | linear | UTC time and linear | bin-aligned and linear | ordinal and linear | shared linear | source value + density |
| Automatic grid | horizontal | horizontal | horizontal | horizontal | shared horizontal | horizontal; vertical optional |
| Legend | point color + shape | categorical | categorical | categorical | composite color/shape/line + size | categorical top/right/bottom |
| Chart title | optional | optional | optional | optional | optional | optional |
| Browser Canvas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Node PNG | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Shared foundations

| Area | Supported now |
| --- | --- |
| Program model | Immutable `ChartProgram`, hierarchical action trace |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects, named filters, grouped linear regression, and grouped Gaussian KDE derivations |
| Coordinates | Named Cartesian and Polar semantic resources; x/y use Cartesian |
| Scales | Linear, UTC time, ordinal position, color, named/direct stroke dash, and band-local xOffset |
| Aggregates | count, sum, mean, median, min/max, distinct/valid/missing, sample/population dispersion, quartiles, standard error, normal 95% mean endpoints, parameterized quantile, and ordered first/last |
| Guides | Automatic axes, horizontal/vertical Cartesian grids, and categorical legends |
| Titles | One plot-aligned top title with one optional single-line subtitle |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, rect, text, `M/L/C/Z` command paths, 8 line curves, and heterogeneous drawable collections |

## Current limitations

Polar guide graphics, transforms beyond named filters, linear regression, and density,
facets, interactive legends, and program composition are not implemented.
Additional title positions, automatic text wrapping, and text measurement are
also unsupported. Categorical legends support right, bottom, and top placement;
point composite and size legends currently use the right-side layout.
