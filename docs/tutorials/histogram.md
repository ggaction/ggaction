---
layout: default
title: Cars Histogram Tutorial
---

# Cars Histogram Tutorial

![Displacement distribution grouped by origin](../assets/images/cars-histogram.png)

This chart bins car displacement, counts the rows in each bin, and stacks those
counts by origin. The complete repository-mode module uses only the
chart-authoring API. After npm publication, replace the relative import with
`"ggaction"`. The repository contains a
[runnable browser example](https://github.com/hj-n/ggaction/tree/main/examples/cars-histogram)
and its [complete program](https://github.com/hj-n/ggaction/blob/main/examples/cars-histogram/program.js).

```javascript
import { chart, render } from "../../src/index.js";

const response = await fetch("../../data/cars.json");
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
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({ legend: { position: "bottom" } })
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
| `createBarMark` | A bar layer bound to `cars` | An initially empty rect collection |
| `encodeHistogram` | Binned x plus count/zero-stack y encodings | Resolved scales and concrete bin rects |
| `encodeColor` | Nominal stack identity and color scale | Category-colored rects in each bin |
| `createGuides` | Axis, horizontal-grid, and legend definitions | Bin-aligned axes, grid lines, and an explicitly bottom-centered legend |
| `createTitle` | Chart title and subtitle text | Plot-centered title graphics |

`encodeHistogram` is atomic because its x binning and y count/stack meaning are
interdependent. Its trace still exposes the wrapped `encodeX` and `encodeY`
actions. The source dataset remains unchanged; bin counts and stacked geometry
are derived and materialized separately.

Use `maxBins` for an inferred nice partition, `binStep` for an exact
zero-anchored width, or `binBoundaries` for explicitly authored irregular
intervals. These options are mutually exclusive. Calling `encodeHistogram`
again replaces the complete bin/count assignment and refreshes inferred axes
and grids while preserving compatible color grouping and legends.

Legends default to the right for every supported chart. This example passes
`position: "bottom"` because its horizontal layout is intentional.

## Key action trace

The atomic histogram action exposes its interdependent position actions as
children, while guide selection remains a separate aggregate.

```text
program
├─ createBarMark
├─ encodeHistogram
│  ├─ encodeX
│  └─ encodeY
│     └─ rematerializeBarMark
├─ encodeColor
│  └─ rematerializeBarMark
├─ createGuides
│  ├─ createAxes
│  ├─ createGrid
│  └─ createLegend
└─ createTitle
```

## Run and continue

- Serve the repository root and open `examples/cars-histogram/`.
- View the [complete chart program](https://github.com/hj-n/ggaction/blob/main/examples/cars-histogram/program.js).
- Continue with [Encodings](../api/encodings.md),
  [Guides](../api/guides.md), and [Titles](../api/titles.md).
