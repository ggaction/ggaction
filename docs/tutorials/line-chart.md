---
layout: default
title: Cars Line Chart Tutorial
---

# Cars Line Chart Tutorial

![Mean acceleration by year, grouped by origin](../assets/images/cars-line-chart.png)

This chart shows mean acceleration over time for each origin. The complete
program uses only the chart-authoring API.

```javascript
import { chart, render } from "ggaction";

const rows = cars.filter(
  car =>
    typeof car.Year === "string" &&
    Number.isFinite(Date.parse(car.Year)) &&
    Number.isFinite(car.Acceleration) &&
    typeof car.Origin === "string" &&
    car.Origin.length > 0
);

const program = chart()
  .createCanvas({
    width: 720,
    height: 460,
    margin: { top: 80, right: 170, bottom: 60, left: 80 }
  })
  .createData({ id: "cars", values: rows })
  .createLineMark({ id: "trends" })
  .encodeX({
    field: "Year",
    fieldType: "temporal",
    scale: { nice: true }
  })
  .encodeY({
    field: "Acceleration",
    aggregate: "mean",
    scale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .encodeStrokeDash({ field: "Origin" })
  .createGuides({
    axes: { y: { ticksAndLabels: { count: 6 } } }
  })
  .createTitle({
    text: "The trend of acceleration by year",
    subtitle: "from 1970 to 1982"
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

## What the actions establish

| Stage | Semantic result | Graphical result |
| --- | --- | --- |
| `createLineMark` | A line layer bound to `cars` | An initially empty path collection |
| `encodeX` | Temporal field, time scale, Cartesian coordinate | Resolved horizontal scale |
| `encodeY` | Quantitative mean aggregation | Sorted concrete series paths |
| `encodeColor` | Nominal series identity and color scale | One concrete stroke per origin |
| `encodeStrokeDash` | Nominal dash scale | One concrete dash pattern per origin |
| `createGuides` | Axis, horizontal-grid, and combined legend definitions | Grid/axis lines, ticks, labels, titles, legend symbols |
| `createTitle` | Chart title and subtitle text | Plot-aligned text graphics |

The source rows remain immutable. Aggregation creates derived series values;
it does not replace the dataset. Because color and stroke dash encode the same
field and ordered domain, `createGuides` combines them into one legend.

Run the repository example at `examples/cars-line-chart/` after serving the
repository root, or continue with [Encodings](../api/encodings.md),
[Guides](../api/guides.md), and [Titles](../api/titles.md).
