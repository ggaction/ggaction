---
layout: default
title: LLM Action Router
---

# LLM Action Router

Choose the result or resource being changed, then follow the linked canonical page. Use the
[complete action reference](../reference/actions.md) when an exact action name is already known. Exact signatures come
from the reference and public TypeScript declarations, not from this routing page.
For structured retrieval, use the [complete machine-readable action metadata](../llms-actions.json), which joins every
current action to its exact signature, prerequisites, effects, errors, example, related actions, and canonical docs.

## Complete chart facades

- Common Cartesian scatter, line, bar, histogram, and heatmap charts: [Basic Charts](../api/basic-charts.md)
- Parallel coordinate profiles: [Parallel Coordinates](../api/parallel-coordinates.md)
- Distribution and statistical chart families: [Statistics Actions](../reference/actions/statistics.md)

## Program, data, and composition

- Canvas and source data creation: [Canvas](../api/canvas.md) and [Data](../api/data.md)
- Filtering and derived data: [Data Filtering](../api/data/filtering.md) and
  [Statistical Transforms](../api/data/statistical-transforms.md)
- Time-unit and moving/window calculations: [Time Units](../api/data/time-units.md) and
  [Window Transforms](../api/data/window.md)
- Layer, concatenate, facet, and child replacement: [Program Composition](../api/composition.md)

## Marks and positions

- Point, line, area, bar, rule, text, and rect owners: [Marks](../api/marks.md)
- Cartesian x/y positions, secondary endpoints, offsets, and ordering: [Position Encodings](../api/position-encodings.md)
- Polar theta/r positions and directional ticks: [Polar Positions](../api/position-encodings.md#polar-positions)
- Constant mark styling and field-driven appearance: [Appearance Encodings](../api/appearance.md)

## Scales and guides

- Scale creation, editing, transforms, and palettes: [Scales](../api/scales.md)
- Axes, grids, legends, and combined guide creation: [Guides](../api/guides.md)
- Titles, subtitles, and title layout: [Titles](../api/titles.md)

## Statistical overlays and specialized layouts

- Regression models and fitted layers: [Regression](../api/regression.md)
- Error bars and interval modes: [Error Bars](../api/error-bars.md)
- Error bands: [Error Bands](../api/error-bands.md)
- Box, violin, gradient, and horizon plots: [Advanced Action Reference](../reference/actions/advanced.md)

## Selection, inspection, and output

- Select, highlight, edit, and remove final visual items: [Selection and Highlighting](../api/appearance/selection-and-highlighting.md)
- Read public semantic, graphical, trace, and resolved-scale state: [ChartProgram](../concepts/chart-program.md)
- Render Canvas/SVG or export PNG/PDF: [Rendering](../api/rendering.md)
- Exact runtime and renderer signatures: [Runtime Reference](../reference/runtime.md)

## Extension-only actions

- Author a domain action before using primitives directly: [Action Authoring](../extension/action-authoring.md)
- Primitive semantic/graphic editing contract: [Extension Primitives](../extension/primitives.md)
- Extension action signatures: [Extension Action Reference](../reference/actions/extension.md)
