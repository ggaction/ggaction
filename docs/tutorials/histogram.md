---
layout: default
title: Cars Histogram Tutorial
---

# Cars Histogram Tutorial

![Displacement distribution grouped by origin](../assets/images/cars-histogram.png)

This chart bins car displacement, counts the rows in each bin, and stacks those
counts by origin. The complete module uses the public npm package. The
repository also contains a
[runnable browser example](https://github.com/ggaction/ggaction/tree/main/examples/cars-histogram)
and its [complete program](https://github.com/ggaction/ggaction/blob/main/examples/cars-histogram/program.js).

Start with the Vite project from [Getting Started](../getting-started.md), then
place the tutorial dataset in Vite's public directory:

```bash
mkdir -p public
curl --fail --location https://raw.githubusercontent.com/ggaction/ggaction/main/data/cars.json --output public/cars.json
```

## Complete program

```javascript
import { chart, render } from "ggaction";

const response = await fetch("/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();

const rows = cars.filter(
  car =>
    Number.isFinite(car.Displacement) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
);

const program = chart()
  .createCanvas({
    width: 432,
    height: 460,
    margin: { top: 80, right: 60, bottom: 130, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createHistogram({
    id: "bars",
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false },
    color: { field: "Origin", scale: { palette: "tableau10" } },
    guides: { legend: { position: "bottom" } }
  })
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

## What the actions establish

| Stage | Semantic result | Graphical result |
| --- | --- | --- |
| `createHistogram` | Bar layer, atomic bin/count positions, nominal stack identity, scales, and guides | Category-colored bin rects plus bin-aligned axes, grid, and bottom legend |
| `createTitle` | Chart title and subtitle text | Plot-centered title graphics |

The facade calls atomic `encodeHistogram` because its x binning and y
count/stack meaning are interdependent. That action still exposes wrapped
`encodeX` and `encodeY` children. The source dataset remains unchanged; bin
counts and stacked geometry are derived and materialized separately.

Use `maxBins` for an inferred nice partition, `binStep` for an exact
zero-anchored width, or `binBoundaries` for explicitly authored irregular
intervals. These options are mutually exclusive. Calling `encodeHistogram`
again replaces the complete bin/count assignment and refreshes inferred axes
and grids while preserving compatible color grouping and legends.

To compare proportions instead of absolute counts, set the color layout to
`"fill"`. It invokes normalized y stacking and produces a `[0, 1]` axis:

```javascript
program.encodeColor({ field: "Origin", layout: "fill" });
```

Legends default to the right for every supported chart. This example passes
`position: "bottom"` because its horizontal layout is intentional.

## Key action trace

The atomic histogram action exposes its interdependent position actions as
children, while guide selection remains a separate aggregate.

```text
program
├─ createHistogram
│  ├─ createBarMark
│  ├─ encodeHistogram
│  │  ├─ encodeX
│  │  └─ encodeY
│  │     └─ rematerializeBarMark
│  ├─ encodeColor
│  │  └─ rematerializeBarMark
│  └─ createGuides
│     ├─ createAxes
│     ├─ createGrid
│     └─ createLegend
└─ createTitle
```

## Run and continue

- Serve the repository root and open `examples/cars-histogram/`.
- View the [complete chart program](https://github.com/ggaction/ggaction/blob/main/examples/cars-histogram/program.js).
- Continue with [Encodings](../api/encodings.md),
  [Guides](../api/guides.md), [Titles](../api/titles.md), and the
  [Basic Chart contract](../api/basic-charts.md#createhistogram).
