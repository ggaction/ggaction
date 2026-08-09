---
layout: default
title: LLM Chart Authoring Contract
description: "A bounded public contract for complete ggaction programs: exact Canvas and data bootstrap, common histogram and regression tasks, renderers, canonical limitation IDs, and open decisions."
---

# LLM Chart Authoring Contract

Use this bounded page when a language model needs enough public information to
write one complete ggaction program. For narrower option details, continue to
the linked API family or the [complete action reference](./reference/actions.md).

## Complete program bootstrap

Import the root factory, initialize one immutable program, create its Canvas,
and store caller-owned rows before chart-specific actions:

```javascript
import { chart } from "ggaction";

export function buildChart(rows) {
  let program = chart()
  program = program.createCanvas({
    width: 800,
    height: 600,
    margin: { top: 140, right: 220, bottom: 120, left: 260 }
  })
  program = program.createData({ values: rows })
  return program
}
```

The exact setup signatures are:

```typescript
createCanvas(options?: CanvasOptions): ChartProgram;
createData(options: { id?: string; values: readonly unknown[] }): ChartProgram;
```

`values` is the caller-owned array; `createData({ rows })` is not a public call.
Every action returns a new `ChartProgram`, so retain each reassignment or use a
fluent chain. See [Canvas](./api/canvas.md), [Data](./api/data.md), and the
[ChartProgram type](./reference/types.md) for their normative contracts.

## Common task families

Add chart-specific actions after Canvas and data setup:

```javascript
// Binned one-dimensional distribution with axes.
program = program.createHistogram({ field: "value", guides: {} })

// Point layer with a fitted line and confidence band.
program = program.createPointMark({})
program = program.encodeX({ field: "x" })
program = program.encodeY({ field: "y" })
program = program.createRegression({})
program = program.createAxes({})
```

Use [Basic Charts](./api/basic-charts.md) for histogram, scatter, line, bar, and
heatmap facades. Use [Regression](./api/regression.md) for fitted lines and
uncertainty bands. These examples name ordinary fields; replace them with the
actual dataset fields rather than inventing new data.

## Renderer selection

Choose one supported output route:

```javascript
// Browser Canvas
import { render } from "ggaction";
render(program, context)

// Browser-safe SVG string
import { renderToSVG } from "ggaction/svg";
const svg = renderToSVG(program)

// Node file or bytes
import { renderToPNG } from "ggaction/png";
import { renderToPDF } from "ggaction/pdf";
```

The supported renderer capability IDs are `renderer.canvas`, `renderer.svg`,
`renderer.png`, and `renderer.pdf`. See [Rendering](./api/rendering.md) for the
exact PNG and PDF output options.

## Terminal limitations and open decisions

These canonical capability IDs are terminal limitations in the current static
chart contract:

- `unsupported.geo` — geographic projections and map marks
- `unsupported.animation` — animated transitions
- `unsupported.interaction` — interactive runtime behavior
- `unsupported.3d` — three-dimensional charts
- `unsupported.jpg` — JPEG output
- `unsupported.areaStrokeDash` — field-driven dash encoding on an area mark

Do not invent an action or silently substitute another capability. A request
can still preserve supported parts—for example, PDF plus JPEG retains
`renderer.pdf` and reports `unsupported.jpg`.

An open decision is different. `chart.type`, `renderer.format`,
`composition.children`, `encoding.position`, `guide.legend.channel`, and
conflicting `layout.legend.*` constraints require clarification or a bounded
documentation read before authoring can continue. A compact task packet lists
those decisions under `unresolved` and attaches the exact
`ggaction://docs/...` resource URI. Terminal limitations appear under
`unsupported` and require no mandatory read.

## Compact knowledge route

When the local MCP server is available, call `search_ggaction` once with only
the complete user request. Follow `authoring.prerequisites` and
`authoring.steps` in order. Explicit Canvas or data actions occur in the steps
and are omitted from prerequisites so they execute only once. The packet closes
deterministic target, field-type, scale, and derived-data dependencies; missing
semantic choices remain unresolved. Read documentation only for URIs explicitly
listed in `unresolved[].resources`. See [Local MCP](./mcp.md) for installation
and the packet contract.
