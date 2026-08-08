---
layout: default
title: Local MCP for LLM Chart Authoring
---

# Local MCP for LLM Chart Authoring

The `ggaction` package includes a local, read-only MCP server that helps a
language model choose current actions and exact call shapes without preloading
the complete documentation. It runs over standard input/output on the user's
machine. It does not require a hosted server, account, or authentication.

The server does not execute chart code, render output, read request-selected
files, make network requests, or collect telemetry.

## Install and launch

Install `ggaction` in the project where the MCP client will run:

```bash
npm install ggaction
```

Launch the installed executable from that project:

```bash
npx --no-install ggaction-mcp
```

For an MCP client configuration, prefer the absolute path to the project-local
executable so the selected `ggaction` version is reproducible:

```json
{
  "mcpServers": {
    "ggaction": {
      "command": "/absolute/path/to/project/node_modules/.bin/ggaction-mcp"
    }
  }
}
```

The exact configuration container varies by MCP client, but the command always
starts the same local stdio process. Node.js 20 or later is required.

## One-tool workflow

The server exposes exactly one model-visible tool:

```text
search_ggaction({ query })
```

Send only the exact user request in one query, including chart or mark type,
transforms, encodings, guides, layout, and output format when they matter. Do
not append dataset contents, code scaffolding, or evaluator instructions:

```text
scatter plot with a color legend at bottom as svg
```

The result is a bounded JSON task packet with:

- `matchedConstraints` — recognized parts of the request
- `actionPlan` — actions and runtime operations in execution order
- `exactCalls` — short calls with current option names
- `authoring` — exact package imports, `chart()` initialization, reusable
  Canvas/data prerequisites, immutable reassignment steps, and the selected
  renderer call
- `unsupported` — terminal requirements outside the current contract
- `unresolved` — conflicting or underspecified decisions, each with the exact
  bounded documentation resource needed to continue
- `candidates` — at most three exact resource identities

The MCP response and the deterministic direct adapter use the same serialized
task packet. A packet is never silently truncated; it fails if it exceeds its
6,144-byte hard ceiling.

`authoring.prerequisites` gives the exact signatures and calls for the common
Canvas and data setup. Supply every name listed in a prerequisite's `bindings`
array—currently the caller-owned `values` array—then run the prerequisite calls
that the existing program has not already satisfied. Keep every returned
`program = ...` assignment because each action returns a new immutable
`ChartProgram`. Run `authoring.steps` in order after those prerequisites:

```javascript
import { chart } from "ggaction";
import { renderToSVG } from "ggaction/svg";

let program = chart()
program = program.createCanvas({})
program = program.createData({ values })
program = program.createScatterPlot({ x: "x", y: "y" })
const output = renderToSVG(program)
```

Unsupported output and a missing supported renderer are separate decisions.
For example, `render JPEG` reports terminal `unsupported.jpg` and open
`renderer.format`, but recommends only the bounded renderer-choice section.
The unsupported entry itself requires no documentation read. If the same
request already names SVG, PNG, PDF, or Browser Canvas, it reports only the
terminal `unsupported.jpg` decision.

## Read-only resources

MCP resource discovery provides a small overview, bounded task recipes, and
templates for one exact action card. These resources are for selective reads,
not a replacement full-documentation preload.

Documentation fallback is stricter. A docs section is readable only when its
exact URI appears in an `unresolved[].resources` list from the latest
`search_ggaction` result. `unsupported` entries do not unlock documentation. A
later result without that URI removes access again. This keeps the default flow
compact:

```text
complete request
  → search_ggaction
  → use the task packet when resolved
  → read only the recommended bounded section when unresolved
  → clarify and search again
```

## What the server does not provide

- Hosted or HTTP transport
- Authentication, accounts, or telemetry
- Chart execution or renderer tools
- Arbitrary filesystem, network, shell, or code access
- A generic tool that returns the complete documentation bundle

Use the [complete action reference](./reference/actions.md) manually when a
human needs the full contract. For normal model-assisted authoring, start with
the one search call and add documentation only for explicit gaps.

## Related

[Getting Started](./getting-started.md) ·
[Chart Recipes](./recipes/index.md) ·
[Rendering](./api/rendering.md) ·
[Supported Features](./supported-features.md)
