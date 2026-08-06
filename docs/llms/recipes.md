---
layout: default
title: LLM Recipe Router
---

# LLM Recipe Router

Use a recipe when the requested chart or workflow is recognizable. A recipe gives the shortest supported action flow,
required decisions, inferred state, and links to deeper tutorials or APIs. Use the [recipe catalog](../recipes/index.md) if
none of the groups below matches.

## Basic relationships and comparison

- Relationship between two quantitative fields: [Scatterplot](../recipes/scatterplot.md)
- Ordered or temporal trajectories: [Line Chart](../recipes/line-chart.md)
- Categorical comparison, including grouped bars: [Bar Chart](../recipes/bar-chart.md)
- One-dimensional binned distribution: [Histogram](../recipes/histogram.md)
- Two-dimensional binned counts: [Heatmap](../recipes/heatmap.md)

## Statistical summaries and distributions

- Points with grouped fitted lines: [Regression Scatterplot](../recipes/regression-scatterplot.md)
- Smoothed one-dimensional distribution: [Density Area](../recipes/density-area.md)
- Compact per-group distribution shape: [Violin Plot](../recipes/violin-plot.md)
- Quartiles, whiskers, and outliers: [Box Plot](../recipes/box-plot.md)
- Point or aggregate estimates with intervals: [Error Bar](../recipes/error-bar.md)
- Time or x-series uncertainty ribbon: [Error Band](../recipes/error-band.md)
- Within-category quantitative gradient: [Gradient Plot](../recipes/gradient-plot.md)

## Multivariate, compact, and polar charts

- Many dimensions per observation: [Parallel Coordinates](../recipes/parallel-coordinates.md)
- Folded compact time series: [Horizon](../recipes/horizon.md)
- Equal-angle polar magnitude comparison: [Rose Chart](../recipes/rose-chart.md)

## Structure and editing workflows

- Layer or concatenate complete child programs: [Composition](../recipes/composition.md)
- Repeat a chart by categories: [Facet](../recipes/facet.md)
- Add rules, labels, and collision-aware text: [Annotations](../recipes/annotations.md)
- Control line/path vertex order independently of source rows: [Path Ordering](../recipes/path-ordering.md)

## If no recipe matches

Use the [action router](./actions.md) to compose a chart from data, mark, position, appearance, guide, and rendering
actions. Check [Supported Features](../supported-features.md) before inventing an action name or assuming a capability.
