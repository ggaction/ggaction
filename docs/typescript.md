---
layout: default
title: TypeScript
---

# TypeScript

ggaction ships TypeScript declarations with every public export. Install no
separate `@types` package. The declarations are the exact syntax boundary;
behavior, inference, defaults, and errors remain documented on the linked API
and action-reference pages.

## Strict ESM setup

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "skipLibCheck": true
  }
}
```

Browser projects also need the DOM library supplied by their toolchain because
`render` accepts `CanvasRenderingContext2D`. Node-only SVG, PNG, and PDF
consumers do not need to construct a browser Canvas context.

## Type chart options before authoring

```typescript
import {
  chart,
  type CreateScatterPlotOptions,
  type ChartProgram
} from "ggaction";

const rows = [
  { horsepower: 130, mpg: 18, origin: "USA" },
  { horsepower: 95, mpg: 24, origin: "Europe" },
  { horsepower: 88, mpg: 27, origin: "Japan" }
];

const options = {
  x: { field: "horsepower", fieldType: "quantitative" },
  y: { field: "mpg", fieldType: "quantitative" },
  color: "origin"
} satisfies CreateScatterPlotOptions;

const program: ChartProgram = chart()
  .createCanvas({ width: 720, height: 440 })
  .createData({ values: rows })
  .createScatterPlot(options);
```

`satisfies` checks option names and literals without widening the object to the
entire interface. It does not prove that runtime rows contain the named fields;
validate external data at the application boundary.

## Renderer types

Renderer-specific options come from their own entry points:

```typescript
import { renderToSVG, type SVGRenderOptions } from "ggaction/svg";
import { renderToPDF, type PDFMetadata } from "ggaction/pdf";

const svgOptions = {
  title: "Quarterly revenue",
  description: "Bars compare four quarters.",
  resourceNamespace: "quarterlyRevenue"
} satisfies SVGRenderOptions;

const metadata = {
  title: "Quarterly revenue",
  keywords: ["revenue", "quarterly"]
} satisfies PDFMetadata;

const svg = renderToSVG(program, svgOptions);
await renderToPDF(program, { output: "chart.pdf", metadata });
```

Keep Node-only `ggaction/png` and `ggaction/pdf` imports out of browser source.
Type-only imports do not authorize a runtime entry in the wrong environment.

## Extensions

Registered extension actions use TypeScript module augmentation so the
standard `chart()` result learns the installed action signatures. Follow the
complete extension authoring pattern; do not cast `ChartProgram` to add an
unregistered method. Deliberate subclasses remain appropriate only for an
isolated program surface.

## Exact machine-readable sources

- `/types/program.d.ts` serves the full public `ChartProgram` declaration.
- `/actions.json` serves schema v3 compact cards with each option's exact type
  string, H0–H4 authoring roles, direct wrapped actions, lifecycle editors,
  package entry support, units, inference, and completion requirements.
- `/schemas/action-card.schema.json` and
  `/schemas/action-cards.schema.json` define the card shapes.
- `/schemas/task-packet.schema.json` defines the local MCP result.
- `/intent-taxonomy.json`, `/mcp-resources.json`, and their correspondingly
  named schemas under `/schemas/` expose the resolver's versioned vocabulary
  and bounded resource catalog.
- `/llms-manifest.json` and `/schemas/llms-manifest.schema.json` identify and
  validate every section in the complete LLM documentation bundle.

Use the artifacts from the same package version. A schema validates JSON
shape; TypeScript validates source syntax; neither replaces behavioral docs or
runtime tests.

## Related

[Exact TypeScript contract](./reference/types.md) ·
[Action reference](./reference/actions.md) · [Compatibility](./compatibility.md) ·
[Extension authoring](./extension/action-authoring.md)
