# ggaction

[![npm version](https://img.shields.io/npm/v/ggaction.svg)](https://www.npmjs.com/package/ggaction) [![license](https://img.shields.io/npm/l/ggaction.svg)](./LICENSE) [![documentation](https://img.shields.io/badge/docs-ggaction.github.io-2563eb)](https://ggaction.github.io/ggaction/)

### A grammar for how charts are made.

Most visualization grammars describe a finished chart. **ggaction** represents chart authoring itself as an immutable, traceable sequence of graphical actions.

Build, inspect, select, and revise charts one meaningful action at a time.

<p align="left">
  <img src="./docs/assets/images/readme-authoring-sequence.gif" width="960" height="540" loading="eager" alt="A ggaction program progressively creates a scatterplot, adds grouped regression fits and confidence bands, highlights the Japan group across chart layers, and finishes with an R-squared annotation.">
</p>

Every frame is rendered from an immutable `ChartProgram`. The final R² label is a custom traceable action composed from ggaction's public extension primitives.

```bash
npm install ggaction
```

## A grammar of graphical action

Actions are verbs:

`create · transform · encode · edit · select · compose`

Chart resources are nouns:

`data · marks · scales · coordinates · guides`

A `ChartProgram` is the immutable sentence they produce.

The following fragment assumes `cars` is an array of row objects:

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values: cars })
  .createScatterPlot({
    id: "points",
    x: "Displacement",
    y: "Acceleration",
    color: "Origin",
    guides: false
  })
  .createRegression()
  .createGuides();
```

## Why actions?

- **Progressive** — build and revise a chart one meaningful operation at a time.
- **Traceable** — retain high-level actions and the wrapped actions they invoke.
- **Materialized** — actions create concrete backend-neutral graphics; rendering does not perform hidden semantic compilation.

## Quick start

```bash
npm install ggaction
```

```javascript
import { chart, render } from "ggaction";

const observations = [
  { displacement: 97, acceleration: 14.5, origin: "Japan" },
  { displacement: 140, acceleration: 15.5, origin: "USA" },
  { displacement: 86, acceleration: 16.4, origin: "Japan" }
];

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 130, bottom: 60, left: 70 }
  })
  .createData({ values: observations })
  .createScatterPlot({
    x: "displacement",
    y: "acceleration",
    color: "origin"
  });

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

Use `createLinePlot`, `createBarPlot`, `createHistogram`, and `createHeatmap` for
the other basic Cartesian charts. Each facade records the regular mark,
encoding, and guide actions as trace children, and the same resource-specific
actions remain available for later edits. See the
[Basic Charts API](https://ggaction.github.io/ggaction/api/basic-charts/).

For an advanced layered example, follow the [regression recipe](https://ggaction.github.io/ggaction/recipes/regression-scatterplot/)
or open the [runnable regression example](./examples/cars-regression-scatterplot/).
To compare category distributions with density-filled strips, read the
[gradient-plot guide](https://ggaction.github.io/ggaction/api/gradient-plots/)
or open the [runnable example](./examples/cars-gradient-plot/).
For symmetric or split density shapes centered on categories, use the
[violin-plot API](https://ggaction.github.io/ggaction/api/violin-plots/) or the
[runnable Cars example](./examples/cars-acceleration-violins/).
For compact signed time-series bands, use `encodeHorizon` on an area mark and
open the [runnable Gapminder example](./examples/gapminder-horizon/).

## What it supports

- Cartesian and polar charts
- Statistical layers and intervals
- Faceting and program composition
- Mark selection and coordinated highlighting
- Browser Canvas and Node PNG output
- TypeScript declarations and traceable extension actions

See the current [supported features](https://ggaction.github.io/ggaction/supported-features/), [tutorials and examples](https://ggaction.github.io/ggaction/tutorials/), and [action reference](https://ggaction.github.io/ggaction/reference/actions/) for exact coverage. Runnable programs are collected in [`examples/`](./examples/README.md).

## Package entries

The package is ESM-only and requires Node.js 20 or later.

| Entry | Purpose |
| --- | --- |
| `ggaction` | Create chart programs and render them to Browser Canvas |
| `ggaction/extension` | Author wrapped actions with public low-level primitives |
| `ggaction/png` | Render a completed program to a PNG file in Node.js |

All entries include TypeScript declarations. The default entry is browser-safe; the PNG adapter is Node-only.

## Documentation

- [Getting Started](https://ggaction.github.io/ggaction/getting-started/)
- [Tutorials and Examples](https://ggaction.github.io/ggaction/tutorials/)
- [Action Reference](https://ggaction.github.io/ggaction/reference/actions/)
- [Concepts](https://ggaction.github.io/ggaction/concepts/chart-program/)
- [Supported Features](https://ggaction.github.io/ggaction/supported-features/)

## Status and development

> **Status:** `0.0.4` is the current experimental public release. APIs may change before `1.0.0`; changes are recorded in the [changelog](./CHANGELOG.md).

```bash
npm install
npm run assets:readme
npm test
npm run test:render
npm run test:docs
```
