---
layout: default
title: Rose Chart Recipe
---

# Rose Chart Recipe

{% include chart-example.html id="rose" %}

A rose chart compares several magnitudes inside equal categorical angle bands.
The overlay layout draws larger sectors first so smaller sectors remain visible.

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const monthOrder = [
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
];
const causeOrder = ["Zymotic Diseases", "Other Causes", "Wounds & Injuries"];

const program = chart()
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

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

`nightingaleRows` is an array with `month`, `cause`, and finite numeric `value`
properties. Each month/cause pair should appear at most once.

## You must decide

- The ordered categorical theta field and its complete domain
- The quantitative radial field
- The category that identifies overlaid sectors
- An explicit overlay layout when multiple rows occupy one theta band

## The library infers

- One Polar coordinate shared by all sectors
- Equal theta bands for the ordered categories
- Concrete radial sector paths sorted larger-first inside each band
- Applicable Polar axes, radial grid, and categorical legend

## Continue

[Polar arc tutorial](../tutorials/polar-arcs.md#rose-overlays) ·
[Arc marks](../api/marks/line-area.md#arc-marks) ·
[Polar positions](../api/position-encodings.md#polar-positions) ·
[Guides](../api/guides.md)
