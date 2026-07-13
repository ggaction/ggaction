---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

Build charts as immutable, traceable action programs. Start with a complete
example, then use the API pages when you need to customize one part.

<div class="docs-chart-gallery">
  <a href="{{ '/tutorials/scatterplot/' | relative_url }}">
    <img src="{{ '/assets/images/cars-scatterplot.png' | relative_url }}" alt="Cars scatterplot">
    <span>Scatterplot</span>
  </a>
  <a href="{{ '/tutorials/line-chart/' | relative_url }}">
    <img src="{{ '/assets/images/cars-line-chart.png' | relative_url }}" alt="Cars aggregate line chart">
    <span>Line chart</span>
  </a>
  <a href="{{ '/tutorials/histogram/' | relative_url }}">
    <img src="{{ '/assets/images/cars-histogram.png' | relative_url }}" alt="Cars stacked histogram">
    <span>Histogram</span>
  </a>
  <a href="{{ '/tutorials/grouped-bar/' | relative_url }}">
    <img src="{{ '/assets/images/jobs-grouped-bar.png' | relative_url }}" alt="Jobs grouped bar example">
    <span>Bar chart</span>
  </a>
</div>

> **Development status:** `ggaction` is currently used directly from this
> repository and is not published to npm yet. The documented API version is
> `0.0.0-dev`.

## Build a chart

1. [Getting started](./getting-started.md) — render a complete chart from a
   small inline dataset.
2. [Cars scatterplot tutorial](./tutorials/scatterplot.md) — map quantitative
   fields to points.
3. [Cars line chart tutorial](./tutorials/line-chart.md) — aggregate temporal
   series and add guides and a title.
4. [Cars histogram tutorial](./tutorials/histogram.md) — bin, count, and stack
   values by category.
5. [Bar chart tutorial](./tutorials/grouped-bar.md) — aggregate ordinal
   categories; the example places nominal groups side by side.
6. [Chart API reference](./reference/actions.md#chart-authoring-api) — find an
   action and its exact signature.

Already know the chart type? Start from the concise
[chart recipes](./recipes/index.md) instead of a full tutorial.
If an inferred resource or layout fails, use
[Troubleshooting](./troubleshooting.md) to make the missing decision explicit.

## Understand the model

- [ChartProgram and immutability](./concepts/chart-program.md)
- [Semantic and graphical state](./concepts/semantic-and-graphics.md)
- [Actions and trace trees](./concepts/actions-and-trace.md)

## Chart API

- [Canvas](./api/canvas.md)
- [Data](./api/data.md)
- [Marks](./api/marks.md)
- [Encodings](./api/encodings.md)
- [Coordinates](./api/coordinates.md)
- [Guides](./api/guides.md)
- [Axes](./api/axes.md)
- [Grids](./api/grids.md)
- [Legends](./api/legends.md)
- [Titles](./api/titles.md)
- [Browser and PNG rendering](./api/rendering.md)

## Go deeper

- [Advanced axis components](./advanced/axis-components.md)
- [Author custom actions](./extension/action-authoring.md)
- [Primitive extension API](./extension/primitives.md)
- [Supported features](./supported-features.md)
- [Complete action index](./reference/actions.md)
- [LLM documentation index](./llms.txt)

Source, issues, and development history are available on
[GitHub](https://github.com/hj-n/ggaction).
