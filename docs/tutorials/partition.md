---
layout: default
title: Partition Tutorial
description: Reuse one partition layout as an icicle or sunburst and focus its subtrees.
---

# Partition tutorial

A partition assigns each node one normalized interval. Rectangular and radial views share its values, order and typed identity. The maintained program is [examples/partition-layouts/program.js](https://github.com/ggaction/ggaction/tree/{{ site.data.provenance.exampleSourceRef }}/examples/partition-layouts/program.js); it draws the small figures on this page.

{% include chart-example.html id="partition-layouts" %}

## Example with real data

<!-- showcase-program:world-population-sunburst:start -->

{% include chart-example.html id="world-population-sunburst" %}

`createWorldPopulationSunburst` builds this chart from real data. It receives the rows of `data/gapminder.json` (Gapminder).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

export const REGIONS = Object.freeze([
  "South Asia",
  "Europe & Central Asia",
  "Sub-Saharan Africa",
  "Americas",
  "East Asia & Pacific",
  "Middle East & North Africa"
]);
const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

// Gapminder 2005 populations grouped by the dataset's six regional clusters.
export function populationRows(gapminder) {
  return gapminder
    .filter(row => row.year === 2005)
    .map(row => ({ region: REGIONS[row.cluster], country: row.country, population: row.pop }));
}

// Region cells are pale, country cells strong; labels name places, not raw counts.
function paint(rows, regionOpacity, countryOpacity) {
  return REGIONS.flatMap((region, index) => [
    { path: [region], fill: COLORS[index], opacity: regionOpacity },
    ...rows.filter(row => row.region === region)
      .map(row => ({ path: [region, row.country], fill: COLORS[index], opacity: countryOpacity }))
  ]);
}

function names(rows, minimumPopulation) {
  return [
    ...REGIONS.map(region => ({ path: [region], text: region })),
    ...rows.map(row => ({
      path: [row.region, row.country],
      text: row.population >= minimumPopulation ? row.country : ""
    }))
  ];
}

export function createWorldPopulationTreemap(gapminder) {
  const rows = populationRows(gapminder);
  return chart()
    .createCanvas({ width: 960, height: 600, margin: { top: 80, right: 20, bottom: 20, left: 20 } })
    .createData({ id: "population", values: rows })
    .createHierarchyData({ id: "regions", data: "population", groupFields: ["region", "country"], value: "population" })
    .layoutHierarchy({ id: "treemap", method: "treemap", options: { size: [920, 500], padding: 18, method: "squarify" } })
    .createTreemapPlot({
      cells: { stroke: "#ffffff", strokeWidth: 1.5, overrides: paint(rows, 0.2, 0.85) },
      labels: { fontSize: 11, fill: "#0f172a", overrides: names(rows, 40e6) }
    })
    .createTitle({
      text: "Where the world's people lived in 2005",
      subtitle: "62 Gapminder countries · rectangle area is population · grouped by region"
    });
}

export function createWorldPopulationSunburst(gapminder) {
  const rows = populationRows(gapminder);
  return chart()
    .createCanvas({ width: 760, height: 640, margin: { top: 80, right: 20, bottom: 20, left: 20 } })
    .createData({ id: "population", values: rows })
    .createHierarchyData({ id: "regions", data: "population", groupFields: ["region", "country"], value: "population" })
    .layoutHierarchy({ id: "partition", method: "partition" })
    .createCoordinate({ id: "rings", type: "polar" })
    .createPartitionPlot({
      layout: "partition",
      coordinate: "rings",
      rootVisible: false,
      innerRadius: 60,
      outerRadius: 260,
      padding: [1, 1],
      cells: { stroke: "#ffffff", strokeWidth: 1, overrides: paint(rows, 0.95, 0.6) },
      labels: { fontSize: 10, minArcLength: 30, overrides: names(rows, 60e6) }
    })
    .createTitle({
      text: "World population by region and country, 2005",
      subtitle: "Inner ring: region · outer ring: country · angle is population"
    });
}
```

<!-- showcase-program:world-population-sunburst:end -->

## Run the icicle

Use the Getting Started browser module setup with a canvas whose id is `chart`.

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser module setup with a canvas whose id is chart.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const icicle = chart()
  .createCanvas({
  "plot": {
    "width": 420,
    "height": 225
  },
  "margin": {
    "left": 30,
    "top": 75,
    "right": 30,
    "bottom": 60
  },
  "background": "#ffffff",
  "plotBorder": false
})
  .createData({
  "id": "hierarchy-source",
  "values": [
    {
      "key": "R",
      "parentKey": null,
      "value": 10
    },
    {
      "key": "A",
      "parentKey": "R",
      "value": 6
    },
    {
      "key": "A1",
      "parentKey": "A",
      "value": 2
    },
    {
      "key": "A2",
      "parentKey": "A",
      "value": 4
    },
    {
      "key": "B",
      "parentKey": "R",
      "value": 4
    },
    {
      "key": "Z",
      "parentKey": "R",
      "value": 0
    }
  ],
  "keyField": "key"
})
  .createHierarchyData({
  "id": "hierarchy",
  "key": "key",
  "parent": "parentKey",
  "value": "value",
  "valueMode": "leaf-sum",
  "forest": false
})
  .layoutHierarchy({
  "id": "partition-layout",
  "method": "partition"
})
  .createCoordinate({
  "id": "partition-coordinate",
  "type": "cartesian"
})
  .createPartitionPlot({
  "layout": "partition-layout",
  "coordinate": "partition-coordinate",
  "rootVisible": true,
  "orientation": "horizontal",
  "padding": [
    2,
    2
  ],
  "cells": {
    "strokeWidth": 0,
    "overrides": [
      {
        "key": "R",
        "fill": "#94a3b8"
      },
      {
        "key": "A",
        "fill": "#2563eb"
      },
      {
        "key": "A1",
        "fill": "#60a5fa"
      },
      {
        "key": "A2",
        "fill": "#93c5fd"
      },
      {
        "key": "B",
        "fill": "#f59e0b"
      },
      {
        "key": "Z",
        "fill": "#475569"
      }
    ]
  },
  "labels": {
    "overrides": [
      {
        "key": "R",
        "text": "R 10"
      },
      {
        "key": "A",
        "text": "A 6"
      },
      {
        "key": "A1",
        "text": "A1 2"
      },
      {
        "key": "A2",
        "text": "A2 4"
      },
      {
        "key": "B",
        "text": "B 4"
      },
      {
        "key": "Z",
        "text": "Z 0"
      }
    ]
  }
})
  .createTitle({
  "text": "Icicle · full hierarchy",
  "subtitle": "R=10; A=6; B=4; zero node Z retained",
  "align": "left",
  "alongOffset": 24,
  "offset": 2,
  "gap": 8,
  "titleStyle": {
    "color": "#0f172a",
    "fontSize": 18,
    "fontFamily": "sans-serif",
    "fontWeight": "normal"
  },
  "subtitleStyle": {
    "color": "#0f172a",
    "fontSize": 11,
    "fontFamily": "sans-serif",
    "fontWeight": "normal"
  }
});
render(icicle, document.querySelector("#chart").getContext("2d"));
```

## Focus and return

Continue from `icicle` above. `icicle.editPartitionPlot({focus:{key:"A"}})` expands A and its descendants into the same frame. `focus:null` returns to the current root. `rootVisible:false` removes the focus node's band while retaining its descendants. Selection by node key or source field retains hidden members; choose `prunedSelection:"drop"` to discard hidden membership explicitly. A source revision that deletes the focused node recovers its nearest surviving ancestor and reports that recovery in inspection.

## Share intervals with a sunburst

The sunburst variant in the same maintained program binds a polar coordinate and uses `innerRadius:20`, `outerRadius:120` and two-pixel gaps. `radiusPolicy:"equal-depth-area"` makes equal squared-radius bands; `direction:"counterclockwise"` changes angular direction. These mappings preserve the partition values and layout resource.

{% include chart-example.html id="partition-sunburst" %}

Zero values retain metadata without artificial area. Inclusive parent residuals remain blank space. Tiny labels may be suppressed with `minWidth` or `minArcLength` while their names remain accessible. See [Partition plots](../api/partition.md) for all defaults, coordinate rules, selection semantics and atomic errors.
