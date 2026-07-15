---
layout: default
title: Density Area Chart Tutorial
---

# Density Area Chart Tutorial

![Acceleration density by origin](../assets/images/cars-density-area.png)

This chart estimates the distribution of car acceleration separately for each
Origin. The source rows remain immutable; `encodeDensity` creates a named
derived dataset and materializes one translucent, zero-baseline area per
group. The complete repository-mode module below runs directly from the
checkout; after npm publication, replace the relative import with `"ggaction"`.
The repository contains a
[runnable browser example](https://github.com/hj-n/ggaction/tree/main/examples/cars-density-area)
and its [complete program](https://github.com/hj-n/ggaction/blob/main/examples/cars-density-area/program.js).

```javascript
import { chart, render } from "../../src/index.js";

const response = await fetch("../../data/cars.json");
if (!response.ok) throw new Error(`Failed to load cars: ${response.status}`);
const cars = await response.json();

const program = chart()
  .createCanvas({
    width: 720,
    height: 500,
    margin: { top: 130, right: 40, bottom: 70, left: 80 }
  })
  .createData({ id: "cars", values: cars })
  .createAreaMark({ id: "densities", opacity: 0.5 })
  .encodeDensity({
    field: "Acceleration",
    groupBy: "Origin",
    bandwidth: 0.6
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides({
    grid: { horizontal: {}, vertical: {} },
    legend: {
      position: "top",
      direction: "vertical",
      columns: 3,
      titlePosition: "left",
      offset: 8
    }
  })
  .createTitle({
    text: "Distribution of Acceleration",
    subtitle: "By Origin (cars dataset)"
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

## What the actions establish

| Stage | Semantic result | Graphical result |
| --- | --- | --- |
| `createAreaMark` | Area layer initially bound to `cars` | Empty path collection with opacity `0.5` |
| `encodeDensity` | KDE transform, derived data, x/y and group encodings | Three sorted, baseline-closed command paths |
| `encodeColor` | Origin ordinal color scale | Tableau fills in first-appearance order |
| `createGuides` | Shared axes, two grids, color legend | Grid behind paths; axes and top swatches above them |
| `createTitle` | Chart title and subtitle | Plot-aligned text above the non-overlapping legend |

The density axis defaults to y and includes zero. The value axis preserves the
shared observed extent. Set `densityChannel: "x"` to reverse the orientation;
the axis titles and baseline orientation follow automatically.

The default estimate uses the Gaussian kernel with unit normalization. Use
`kernel` and `normalization` on `encodeDensity`, or call `editDensity` later to
create and bind an immutable revised estimate while preserving the source.

`direction` controls how legend items fill a multi-row grid, while `columns`
sets its maximum column count. `titlePosition: "left"` places `Origin` beside
the three items without changing the chart-wide right-side legend default.

## Key action trace

The atomic encoding exposes every reusable action it delegates to.

```text
program
├─ createAreaMark
├─ encodeDensity
│  ├─ createDensityData
│  ├─ editSemantic
│  ├─ encodeX
│  ├─ encodeY
│  ├─ encodeGroup
│  └─ rematerializeAreaMark
├─ encodeColor
│  └─ rematerializeAreaMark
├─ createGuides
│  ├─ createAxes
│  ├─ createGrid
│  └─ createLegend
└─ createTitle
```

## Run and continue

- Serve the repository root and open `examples/cars-density-area/`.
- View the [complete chart program](https://github.com/hj-n/ggaction/blob/main/examples/cars-density-area/program.js).
- Continue with [Encodings](../api/encodings.md),
  [Legends](../api/legends.md), and [Scale options](../api/scales.md).
