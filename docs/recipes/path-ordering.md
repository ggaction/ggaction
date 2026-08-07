---
layout: default
title: Path Ordering Recipe
---

# Path Ordering Recipe

{% include chart-example.html id="development-trajectories" %}

## Minimal flow

{% include runnable-recipe-note.html %}

```javascript
import { chart, render } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values: observations })
  .createLineMark()
  .encodeX({ field: "fertility" })
  .encodeY({ field: "life_expect" })
  .encodeColor({ field: "country" })
  .encodePathOrder({ field: "year", order: "ascending" })
  .createGuides();

const context = document.querySelector("#chart")?.getContext("2d");
if (!context) throw new Error("Missing #chart Canvas context.");
render(program, context);
```

`observations` is an array of plain row objects. Source rows may be shuffled;
the order field controls vertices independently inside each color/group series.

## You must decide

- The quantitative order field
- Ascending or descending order
- A color or group field when rows form multiple paths

## The library infers

- The current compatible Cartesian line
- Stable source order as the tie breaker
- No extra scale or guide for the topology-only field

Use `removePathOrder()` to return to the line's automatic topology.

## Continue

[Series Encodings](../api/series-encodings.md#explicit-path-topology) ·
[Line-chart recipe](./line-chart.md)
