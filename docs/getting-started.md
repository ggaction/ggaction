---
layout: default
title: Getting Started
image: /assets/images/getting-started.png
---

# Getting Started

{% include getting-started-chart.html %}

This walkthrough installs `ggaction`, creates a complete scatterplot from an
inline dataset, and renders it to Browser Canvas. Every action returns a new
immutable `ChartProgram`, so the calls can be chained.

## 1. Create a browser project

`ggaction` is an ESM package. This minimal setup uses Vite to resolve the npm
package for the browser:

```bash
mkdir ggaction-start
cd ggaction-start
npm init -y
npm install ggaction
npm install --save-dev vite
```

The command installs the public `ggaction` package from the npm registry.

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ggaction scatterplot</title>
  </head>
  <body>
    <canvas id="chart" aria-label="Scatterplot of horsepower versus mileage by origin">
      Scatterplot of horsepower versus mileage by origin.
    </canvas>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

## 2. Build the program

Create `main.js`:

```javascript
import { chart, render } from "ggaction/basic";

const cars = [
  { horsepower: 88, mpg: 27, origin: "USA" },
  { horsepower: 70, mpg: 36, origin: "Japan" },
  { horsepower: 110, mpg: 24, origin: "Europe" }
];

const program = chart()
  .createCanvas({
    width: 640,
    height: 400,
    margin: { top: 30, right: 130, bottom: 60, left: 70 }
  })
  .createData({ values: cars })
  .createScatterPlot({
    x: "horsepower",
    y: "mpg",
    color: "origin",
    shape: "origin",
    guides: {
      axes: {
        x: { title: { text: "Horsepower" } },
        y: { title: { text: "Miles per gallon" } }
      }
    }
  });

const canvas = document.querySelector("#chart");
render(program, canvas.getContext("2d"));
```

`createScatterPlot` uses the current dataset, creates a point mark, assigns the
x, y, and optional appearance encodings, and creates applicable guides. It
records those regular actions as trace children rather than compiling a second
chart specification. Pass `data` explicitly when a program contains more than
one dataset candidate; pass `id` when a later multi-resource flow needs that
mark identity.

The wrapped `createGuides` action infers the applicable axes and horizontal
grid from the position encodings. Matching nominal color and shape encodings
also create a composite categorical legend, giving each origin a redundant
visual cue; the right margin reserves space for that legend. The renderer reads
only concrete `graphicSpec` values already produced by actions; it does not
compile `semanticSpec` during rendering.

This walkthrough uses the creation-focused `ggaction/basic` entry. Import from
`ggaction` instead when the program needs editing, selection, composition,
Polar or Parallel coordinates, or statistical layers.

## 3. Run it

```bash
npx vite
```

Open the local URL printed by Vite. The browser draws the chart into the Canvas
created in `index.html`.

## Package entries and compatibility

| Import | Environment | Use |
| --- | --- | --- |
| `ggaction` | Modern ESM browsers and Node.js 20+ | Complete chart authoring and Browser Canvas rendering |
| `ggaction/basic` | Modern ESM browsers and Node.js 20+ | Smaller creation path for scatter, line, bar, histogram, and heatmap charts |
| `ggaction/extension` | Modern ESM browsers and Node.js 20+ | Wrapped actions and public primitive authoring |
| `ggaction/png` | Node.js 20+ only | PNG file output through the native Canvas adapter |
| `ggaction/pdf` | Node.js 20+ only | Single-page vector PDF file output |
| `ggaction/svg` | Modern ESM browsers and Node.js 20+ | Complete SVG document string output |

All entries include TypeScript declarations. The package does not publish
CommonJS entry points. Import `ggaction/png` and `ggaction/pdf` only from Node
code; the browser-safe entries, including `ggaction/svg`, do not load filesystem
or native output modules.

The release artifact is tested by installing its exact tarball into fresh
JavaScript and TypeScript consumer projects. It is also tested in a browser and
across the supported Node release matrix.

## Runnable repository examples

The source repository also contains complete modules for the
[minimal getting-started chart](https://github.com/ggaction/ggaction/tree/main/examples/getting-started/),
[scatterplot](https://github.com/ggaction/ggaction/tree/main/examples/cars-scatterplot/),
[line chart](https://github.com/ggaction/ggaction/tree/main/examples/cars-line-chart/),
[histogram](https://github.com/ggaction/ggaction/tree/main/examples/cars-histogram/),
[bar chart](https://github.com/ggaction/ggaction/tree/main/examples/jobs-grouped-bar/),
[heatmap](https://github.com/ggaction/ggaction/tree/main/examples/gapminder-life-expectancy-heatmap/),
[parallel coordinates](https://github.com/ggaction/ggaction/tree/main/examples/cars-parallel-coordinates/),
[regression scatterplot](https://github.com/ggaction/ggaction/tree/main/examples/cars-regression-scatterplot/),
[density area](https://github.com/ggaction/ggaction/tree/main/examples/cars-density-area/),
[violin plot](https://github.com/ggaction/ggaction/tree/main/examples/cars-acceleration-violins/),
[error bar](https://github.com/ggaction/ggaction/tree/main/examples/cars-error-bar/),
[error band](https://github.com/ggaction/ggaction/tree/main/examples/gapminder-error-band/),
[box plot](https://github.com/ggaction/ggaction/tree/main/examples/cars-box-plot/),
[mark selection](https://github.com/ggaction/ggaction/tree/main/examples/mark-selection/), and
[program composition](https://github.com/ggaction/ggaction/tree/main/examples/program-composition/).

## Next

<div class="docs-entry-grid">
  <a href="{{ '/recipes/' | relative_url }}"><strong>Copy a chart recipe</strong><span>Start from the shortest supported flow for a known chart type.</span></a>
  <a href="{{ '/tutorials/' | relative_url }}"><strong>Learn a complete workflow</strong><span>Build a chart step by step and understand what each action adds.</span></a>
  <a href="{{ '/reference/actions/' | relative_url }}"><strong>Find an exact action</strong><span>Look up canonical signatures, defaults, inference, and errors.</span></a>
</div>

Use <a href="{{ '/troubleshooting/' | relative_url }}">Troubleshooting</a> when
inference or layout cannot make one safe choice. Render the same program to a
file with <a href="{{ '/api/rendering/#png-output' | relative_url }}">PNG</a> or
<a href="{{ '/api/rendering/#pdf-output' | relative_url }}">vector PDF output</a>.
