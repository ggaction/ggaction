---
layout: default
title: LLM Guide
---

# LLM Guide

Use this guide to reach the smallest authoritative ggaction documentation chunk for a chart-authoring task. These pages
route to public documentation; they do not replace exact action signatures, behavior contracts, or runnable examples.

## What ggaction builds

ggaction represents chart authoring as an immutable `ChartProgram`. Each public action receives one options object and
returns a new program. The semantic specification records chart meaning, the graphical specification records concrete
backend-neutral output, and Canvas, SVG, PNG, and PDF renderers consume the graphical specification.

## Retrieval workflow

1. If the desired result is a recognizable chart or workflow, start with [task recipes](./recipes.md).
2. If the action name or capability family is known, use the [action router](./actions.md), then read the canonical action
   reference for its exact signature.
3. For concepts, data flow, layout, rendering, troubleshooting, or extension authoring, use the
   [documentation router](./docs.md).
4. Use [`llms-full.txt`](../llms-full.txt) only when these selective routes cannot identify the relevant page.

## Minimal authoring shape

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values })
  .createScatterPlot({ x: "horsepower", y: "efficiency" });
```

Continue from the returned program with domain actions. Keep the earlier program when a before/after comparison or
reversible editing history matters.

## Decision rules

- Prefer a basic chart facade when it directly matches the requested chart; use lower-level mark and encoding actions
  when the chart needs custom composition.
- Supply explicit IDs or targets when more than one compatible resource exists. ggaction does not silently choose the
  first dataset, mark, scale, coordinate, or view.
- Treat action traces as history and ownership evidence. Do not call wrapped trace operations unless the public
  `ChartProgram` type declares them.
- Render the same completed program through the required backend rather than authoring renderer-specific chart state.

## Fast destinations

- First runnable chart: [Getting Started](../getting-started.md)
- Supported and unsupported capabilities: [Supported Features](../supported-features.md)
- Ambiguity and layout errors: [Troubleshooting](../troubleshooting.md)
- Exact public action list: [Action Reference](../reference/actions.md)
