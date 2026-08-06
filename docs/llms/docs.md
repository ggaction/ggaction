---
layout: default
title: LLM Documentation Router
---

# LLM Documentation Router

Use this page for concepts, complete tutorials, detailed API behavior, rendering, troubleshooting, and extension work.
For a known chart task use the [recipe router](./recipes.md); for a known capability use the
[action router](./actions.md).

## Start and learn complete workflows

- Installation and first runnable chart: [Getting Started](../getting-started.md)
- Complete chart walkthroughs: [Tutorials](../tutorials/index.md)
- Representative finished charts: [Chart Gallery](../gallery.md)

## Understand the program model

- Immutable authoring state: [ChartProgram](../concepts/chart-program.md)
- Semantic meaning and concrete graphics: [Semantic and Graphical State](../concepts/semantic-and-graphics.md)
- Hierarchical history and ownership: [Actions and Trace](../concepts/actions-and-trace.md)

## Find detailed authoring behavior

- Data, marks, encodings, scales, guides, composition, and rendering: [Chart API](../api/index.md)
- Exact signatures grouped by authoring audience: [Action Reference](../reference/actions.md)
- Public program, renderer, and state types: [Type Reference](../reference/types.md)
- Capability boundaries and known limitations: [Supported Features](../supported-features.md)

## Diagnose a program

- Ambiguous state, missing resources, layout, and renderer failures: [Troubleshooting](../troubleshooting.md)
- Inspect semantic, graphical, trace, and resolved-scale state:
  [ChartProgram](../concepts/chart-program.md#inspecting-authored-and-materialized-state)
- Decide whether a name is a public action or wrapped trace operation:
  [Action Reference](../reference/actions.md#exact-action-lookup)

## Render and distribute output

- Browser Canvas, browser-safe SVG, Node PNG, and vector PDF: [Rendering](../api/rendering.md)
- Exact renderer arguments and return values: [Runtime Reference](../reference/runtime.md)

## Extend ggaction

- Extension workflow, public boundaries, and immutable domain actions:
  [Action Authoring](../extension/action-authoring.md)
- Use low-level semantic and graphical primitives: [Extension Primitives](../extension/primitives.md)

## Full-text fallback

The generated [`llms-full.txt`](../llms-full.txt) follows the canonical page-manifest order. Load it only when selective
routes do not identify the required page; it is intentionally much larger than these routing chunks.
