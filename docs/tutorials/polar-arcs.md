---
layout: default
title: Polar Arc Tutorial
---

# Polar Arc Tutorial

Arc marks turn Polar positions into closed sector paths. Use count aggregation
for proportional donut sectors, or combine categorical theta bands with a
quantitative radius for rose charts and radial bars.

## Count a category into a donut

{% include chart-example.html id="donut" %}

The shortest donut flow needs a dataset, an arc mark with a nonzero inner
radius, a count-based theta encoding, and color:

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

const program = chart()
  .createCanvas({
    width: 640,
    height: 500,
    margin: { top: 55, right: 190, bottom: 55, left: 55 }
  })
  .createData({ values: cars })
  .createArcMark({ innerRadius: 0.56, padAngle: 1.5 })
  .encodeTheta({ field: "Origin", aggregate: "count" })
  .encodeColor({ field: "Origin", palette: "tableau10" })
  .createGuides({
    axes: false,
    grid: false,
    legend: { position: "right", title: "Origin" }
  });

render(program, document.querySelector("canvas").getContext("2d"));
```

`aggregate: "count"` assigns one sector to each category and makes its angular
sweep proportional to the category count. The omitted radius encoding uses the
available Polar radius. `innerRadius` is a fraction of that available radius.

## Rose overlays

{% include chart-example.html id="rose" %}

A rose chart uses one equal theta band per month and overlays the three causes
inside that band. The following fragment continues from an imported `chart`
function and a loaded `nightingaleRows` array containing one row per month and
cause.

```javascript
const monthOrder = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];
const causeOrder = [
  "Zymotic Diseases", "Other Causes", "Wounds & Injuries"
];

const rose = chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 80, right: 210, bottom: 80, left: 80 }
  })
  .createData({ values: nightingaleRows })
  .createArcMark({ padAngle: 1, opacity: 0.9, strokeWidth: 0.5 })
  .encodeTheta({
    field: "month",
    fieldType: "ordinal",
    scale: { domain: monthOrder }
  })
  .encodeR({ field: "value", scale: { domain: [0, 6.5], zero: true } })
  .encodeColor({
    field: "cause",
    layout: "overlay",
    scale: {
      domain: causeOrder,
      range: ["#599ad3", "#727272", "#f1595f"]
    }
  })
  .createGuides({
    axes: {
      theta: { title: false },
      radius: {
        ticksAndLabels: { values: [2, 4, 6] },
        title: { text: "Mortality rate", position: "inside" }
      }
    },
    grid: { theta: false, radial: { values: [2, 4, 6] } },
    legend: { position: "right", title: "Cause" }
  });
```

`layout: "overlay"` is explicit because multiple rows occupy the same theta
band. Larger sectors render first so smaller values remain visible. Values that
do not extend beyond the radial baseline produce no placeholder path.

## Radial bars

{% include chart-example.html id="radial-bars" %}

Radial bars use the same position pair without an overlay group. This fragment
assumes `chart`, the selected `countryRows`, and their explicit `countryOrder`
are already available:

```javascript
const radialBars = chart()
  .createCanvas({
    width: 780,
    height: 640,
    margin: { top: 75, right: 190, bottom: 75, left: 75 }
  })
  .createData({ values: countryRows })
  .createArcMark({ innerRadius: 0.18, padAngle: 2, opacity: 0.94 })
  .encodeTheta({
    field: "country",
    fieldType: "nominal",
    scale: { domain: countryOrder }
  })
  .encodeR({
    field: "life_expect",
    scale: { domain: [45, 85], zero: false }
  })
  .encodeColor({ field: "cluster", fieldType: "nominal", palette: "tableau10" })
  .createGuides({
    axes: {
      theta: { title: { text: "Country" } },
      radius: {
        ticksAndLabels: { values: [50, 60, 70, 80] },
        title: { text: "Life expectancy", position: "inside" }
      }
    },
    grid: { theta: false, radial: { values: [50, 60, 70, 80] } },
    legend: { position: "right", title: "Cluster" }
  });
```

The resolved radius scale begins at the arc's inner radius. The radial axis
uses that same baseline instead of drawing through the empty center.

## Editing an arc

`editArcMark` updates geometry or appearance and rematerializes every sector:

```javascript
const tighter = radialBars.editArcMark({
  innerRadius: 0.24,
  padAngle: 1,
  opacity: 0.8
});
```

## Related

[Arc mark reference](../api/marks/line-area.md#arc-marks) ·
[Position encodings](../api/position-encodings.md) ·
[Polar guides](./polar-points.md#add-polar-guides)
