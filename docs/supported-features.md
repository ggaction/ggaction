---
layout: default
title: Supported Features
---

# Supported Features

This page describes implemented behavior only.

| Area | Supported now |
| --- | --- |
| Program model | Immutable `ChartProgram`, hierarchical action trace |
| Canvas | Create/edit width, height, background, margin |
| Data | Immutable arrays of plain row objects |
| Marks | Semantic point/circle mark; semantic line with aggregate path materialization; semantic bar with histogram or grouped-mean rect materialization |
| Position | Quantitative point x/y; temporal line x and aggregate quantitative line y; explicit or atomic binned/count bar encodings; ordinal bar x and band-local xOffset scale resolution |
| Aggregation | Immutable line mean aggregation; ordinal bar mean scale resolution; derived histogram bin totals and concrete zero-stacked rects |
| Color | Nominal point fill, line stroke, stacked histogram fill, or grouped ordinal-bar color/xOffset semantics with ordinal scale and `tableau10` palette |
| Stroke dash | Nominal line series with explicit or automatic ten-pattern range |
| Constant appearance | Circle radius; grouped bar band width |
| Coordinates | Named Cartesian and Polar semantic resources; x/y use Cartesian |
| Guides | Automatic axes/grid/categorical-legend collection; bottom/left linear, UTC time, bin-aligned histogram, or ordinal-x axes; horizontal/vertical Cartesian grids; right-side line/grouped-bar or bottom histogram legend |
| Titles | One plot-aligned top title with an optional single-line subtitle |
| Rendering | Browser Canvas and Node PNG |
| Graphics | Concrete canvas, circle, line, rect, text, and point-array path nodes |

Polar guide graphics, additional mark types, public
transforms, facets, additional legend types or positions, and program
composition are also not implemented in the current release. Additional title
positions, automatic text wrapping, and text measurement are unsupported.
These features are not part of the current API reference.
