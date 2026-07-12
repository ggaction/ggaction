---
layout: default
title: Cars Histogram Tutorial
---

# Cars Histogram Tutorial

![Displacement distribution grouped by origin](../assets/images/cars-histogram.png)

This chart bins car displacement, counts the rows in each bin, and stacks those
counts by origin. The complete program uses only the chart-authoring API.

```javascript
import { chart, render } from "ggaction";

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
  .createGuides()
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
| `createGuides` | Axis, horizontal-grid, and legend definitions | Bin-aligned axes, grid lines, and a bottom-centered legend |
| `createTitle` | Chart title and subtitle text | Plot-centered title graphics |

`encodeHistogram` is atomic because its x binning and y count/stack meaning are
interdependent. Its trace still exposes the wrapped `encodeX` and `encodeY`
actions. The source dataset remains unchanged; bin counts and stacked geometry
are derived and materialized separately.

Run the repository example at `examples/cars-histogram/` after serving the
repository root, or continue with [Encodings](../api/encodings.md),
[Guides](../api/guides.md), and [Titles](../api/titles.md).
