---
layout: default
title: ggaction Documentation
---

# ggaction Documentation

`ggaction` builds charts through immutable, traceable actions. Start with the
chart-authoring path; use the advanced and extension paths only when you need
lower-level control.

## Build a chart

1. [Getting started](./getting-started.md) — render a complete chart from a
   small inline dataset.
2. [Cars scatterplot tutorial](./tutorials/scatterplot.md) — build the Phase 1
   example from `cars.json`.
3. [Chart API reference](./reference/actions.md#chart-authoring-api) — find an
   action and its exact signature.

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
- [Axes](./api/axes.md)
- [Browser and PNG rendering](./api/rendering.md)

## Go deeper

- [Advanced axis components](./advanced/axis-components.md)
- [Author custom actions](./extension/action-authoring.md)
- [Primitive extension API](./extension/primitives.md)
- [Supported features](./supported-features.md)
- [Complete action index](./reference/actions.md)
- [LLM documentation index](./llms.txt)

The files under `agent_docs/` are implementation-planning records, not user
documentation.
