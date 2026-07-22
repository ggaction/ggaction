# ggaction

[![npm version](https://img.shields.io/npm/v/ggaction.svg)](https://www.npmjs.com/package/ggaction) [![CI](https://github.com/ggaction/ggaction/actions/workflows/ci.yml/badge.svg)](https://github.com/ggaction/ggaction/actions/workflows/ci.yml) [![license](https://img.shields.io/npm/l/ggaction.svg)](./LICENSE) [![documentation](https://img.shields.io/badge/docs-ggaction.github.io-2563eb)](https://ggaction.github.io/ggaction/)

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

Add the Canvas element that the rendering code targets. Its accessible name and
fallback text summarize the chart for contexts where Canvas pixels are not
available:

```html
<canvas id="chart" aria-label="Scatterplot of displacement versus acceleration by origin">
  Scatterplot of displacement versus acceleration by origin.
</canvas>
```

```javascript
import { chart, render } from "ggaction/basic";

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
    color: "origin",
    shape: "origin"
  });

const context = document.querySelector("#chart").getContext("2d");
render(program, context);
```

Matching color and shape encodings give each origin a redundant visual cue and
create a labeled categorical legend automatically.

### Branch revisions without mutation

The basic entry above is creation-focused. Import the full entry for editing,
start a separate program without a shape encoding, and derive alternatives
without changing the checkpoint:

```javascript
import { chart as editableChart } from "ggaction";

const checkpoint = editableChart()
  .createCanvas({ width: 640, height: 400 })
  .createData({ values: observations })
  .createScatterPlot({
    x: "displacement",
    y: "acceleration",
    color: "origin"
  });

const outlined = checkpoint.editPointMark({
  stroke: "#0f172a",
  strokeWidth: 2
});
const muted = checkpoint.editPointMark({ opacity: 0.35 });

console.log(checkpoint === outlined); // false
console.log(checkpoint.trace.children.at(-1).op); // "createScatterPlot"
console.log(outlined.trace.children.at(-1).op);   // "editPointMark"
```

The checkpoint and both revisions remain independently renderable and
inspectable. Each revision records only the action added to its own trace.

Use `createLinePlot`, `createBarPlot`, `createHistogram`, and `createHeatmap` for
the other basic Cartesian charts. The `ggaction/basic` entry keeps this common
creation path below a 120,000-byte gzip bundle budget while each facade still
records its mark, encoding, and guide actions as trace children. Import from
`ggaction` when you need editing, selection, composition, alternative
coordinates, or statistical layers. See the
[Basic Charts API](https://ggaction.github.io/ggaction/api/basic-charts/).

Use `createParallelCoordinates({ dimensions })` to connect each source row
across ordered, dimension-local scales and axes. See the
[Parallel Coordinates API](https://ggaction.github.io/ggaction/api/parallel-coordinates/)
or the [runnable Cars example](./examples/cars-parallel-coordinates/).

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

- Cartesian, Polar, and Parallel-coordinate charts
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
| `ggaction/basic` | Create and render scatter, line, bar, histogram, and heatmap charts with a smaller browser bundle |
| `ggaction/extension` | Author wrapped actions with public low-level primitives |
| `ggaction/png` | Render a completed program to a PNG file in Node.js |

All entries include TypeScript declarations. The default and basic entries are browser-safe; the PNG adapter is Node-only.

## Documentation

- [Getting Started](https://ggaction.github.io/ggaction/getting-started/)
- [Tutorials and Examples](https://ggaction.github.io/ggaction/tutorials/)
- [Action Reference](https://ggaction.github.io/ggaction/reference/actions/)
- [Concepts](https://ggaction.github.io/ggaction/concepts/chart-program/)
- [Supported Features](https://ggaction.github.io/ggaction/supported-features/)

## Contributing

Bug reports, documentation improvements, examples, and focused code changes are
welcome. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, scope, tests, and
the extra discussion required before public API or architecture changes.

## Status and development

> **Status:** `0.0.6` is the current experimental public release. APIs may change before `1.0.0`; changes are recorded in the [changelog](./CHANGELOG.md).

```bash
npm install
npm run assets:readme
npm test
npm run test:render
npm run test:docs
```
