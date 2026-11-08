---
layout: default
title: Draw Levels, Bands and Density
---

# Draw levels, bands and density

A scalar grid states where measurements were sampled. Contours interpolate the
boundaries between those samples. This example has a center value of two and
surrounding zeros, so level one crosses every adjoining edge halfway.

## Example with real data

<!-- showcase-program:penguin-density-contours:start -->

{% include chart-example.html id="penguin-density-contours" %}

`createPenguinDensityContours` builds this chart from real data. It receives the rows of `data/showcase/penguins.csv` (palmerpenguins, CC0) with numbers parsed and `NA` read as `null`.
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// Palmer penguins with both bill measurements recorded.
export function createPenguinDensityContours(penguins) {
  const measured = penguins.filter(row =>
    Number.isFinite(row.bill_length_mm) && Number.isFinite(row.bill_depth_mm));

  return chart()
    .createCanvas({
      width: 760,
      height: 520,
      margin: { top: 80, right: 170, bottom: 60, left: 70 }
    })
    .createData({ id: "penguins", values: measured })
    .createDensityContourData({
      id: "density",
      data: "penguins",
      x: "bill_length_mm",
      y: "bill_depth_mm",
      grid: { origin: [30, 12], dx: 0.5, dy: 0.25, width: 65, height: 49 },
      estimator: "kde",
      normalization: "count",
      bandwidth: [2, 1],
      kernel: "gaussian",
      thresholds: [0.1, 0.3, 0.6, 1, 2, 4, 8]
    })
    .createContourMark({
      id: "contours",
      geometry: "density",
      mode: "filled",
      color: { type: "sequential", palette: "blues" },
      x: { domain: [30, 62], nice: false, zero: false },
      y: { domain: [12, 24], nice: false, zero: false },
      stroke: "#ffffff",
      strokeWidth: 0.6
    })
    // Individual penguins share the contour scales and are colored by species.
    .createPointMark({ id: "penguins-points", data: "penguins", opacity: 0.8, stroke: "#ffffff", strokeWidth: 0.5 })
    .encodeX({ field: "bill_length_mm", scale: { id: "contours-x" } })
    .encodeY({ field: "bill_depth_mm", scale: { id: "contours-y" } })
    .encodeColor({
      field: "species",
      scale: { domain: ["Adelie", "Chinstrap", "Gentoo"], range: ["#f97316", "#a855f7", "#0d9488"] }
    })
    .encodeRadius({ value: 2.5 })
    .createXAxis({ scale: "contours-x", title: { text: "Bill length (mm)" } })
    .createYAxis({ scale: "contours-y", title: { text: "Bill depth (mm)" } })
    .createLegend({ target: "penguins-points", channels: ["color"], title: "Species" })
    .createTitle({
      text: "Penguin bill shapes cluster by species",
      subtitle: "Darker bands hold more penguins · Gaussian kernel density of 342 birds"
    });
}
```

<!-- showcase-program:penguin-density-contours:end -->

## A small worked example

{% include chart-example.html id="contours" %}

The complete Full program uses explicit geometry before creating its mark.

<!-- snippet-context:start -->

> **Runnable complete example.** Import the Full ggaction package; this example declares its scalar grid.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({
    "width": 640,
    "height": 480,
    "margin": {
      "left": 40,
      "right": 40,
      "top": 80,
      "bottom": 40
    },
    "background": "#ffffff"
  })
  .createContourData({
    "id": "surface",
    "grid": {
      "origin": [
        0,
        0
      ],
      "dx": 1,
      "dy": 1,
      "width": 3,
      "height": 3,
      "values": [
        0,
        0,
        0,
        0,
        2,
        0,
        0,
        0,
        0
      ]
    },
    "thresholds": [
      1
    ]
  })
  .createContourMark({
    "mode": "line",
    "geometry": "surface",
    "x": {
      "domain": [
        0,
        2
      ],
      "zero": false,
      "nice": false
    },
    "y": {
      "domain": [
        0,
        2
      ],
      "zero": false,
      "nice": false
    },
    "color": false,
    "stroke": "#1d4ed8",
    "strokeWidth": 2
  })
  .createTitle({
    "text": "A level boundary",
    "subtitle": "The line encloses grid values of at least one",
    "align": "left",
    "alongOffset": 0,
    "offset": 2,
    "gap": 8,
    "titleStyle": {
      "color": "#0f172a",
      "fontSize": 20,
      "fontFamily": "sans-serif",
      "fontWeight": 600
    },
    "subtitleStyle": {
      "color": "#64748b",
      "fontSize": 12,
      "fontFamily": "sans-serif",
      "fontWeight": 400
    }
  });
```

For filled bands, use thresholds such as [0, 1, 2] and mode: "filled". The lower
band excludes its upper boundary; the final band includes the highest value.
The maintained filled example uses a two-color quantitative scale to distinguish
the bands.

{% include chart-example.html id="contour-bands" %}

A null sample excludes every adjoining cell. The center below remains empty;
it is not interpolated from its neighbors or treated as zero.

{% include chart-example.html id="contour-holes" %}

For point data, create a materialized dataset and call createDensityContourData
with x/y columns, an explicit grid, estimator and normalization. The histogram
example uses one point of weight two. The kernel example uses the same point,
a triangular product kernel and bandwidth [1, 1]. On this grid their sampled
values agree, while their estimation policies remain explicit.

{% include chart-example.html id="contour-density" %}

The [shared example source](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/contours/program.js)
contains all five variants. Browser examples, primitive comparisons and images
use that one program. See [Contours and two-dimensional density](../api/contours.md)
for exact options, limits, guide mappings, edits and source revision behavior.
