---
layout: default
title: Heatmap Recipe
---

# Heatmap Recipe

{% include chart-example.html id="heatmap" lead=true %}

## Pre-gridded flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Runnable complete example.** Use the Getting Started browser project with a canvas whose id is chart, and serve gapminder.json from the site root.

<!-- snippet-context:end -->

```javascript
import { chart, render } from "ggaction";

const gapminder = await fetch("/gapminder.json").then(response => response.json());
const countries = ["Afghanistan", "Brazil", "China", "India", "Japan", "United States"];
const values = gapminder.filter(row => countries.includes(row.country));

const program = chart()
  .createCanvas({ margin: { right: 120, left: 110 } })
  .createData({ values })
  .createHeatmap({
    x: { field: "year", fieldType: "ordinal" },
    y: { field: "country", fieldType: "nominal" },
    color: {
      field: "life_expect",
      fieldType: "quantitative",
      scale: { type: "sequential", palette: "viridis" }
    }
  });

render(program, document.querySelector("#chart").getContext("2d"));
```

## Raw-row binned flow

{% include runnable-recipe-note.html %}

<!-- snippet-context:start -->

> **Fragment.** Not a complete program: it continues the setup described in this section.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ margin: { right: 120 } })
  .createData({ values: observations })
  .createHeatmap({
    x: "weight",
    y: "economy",
    bin: { bins: { x: 10, y: 8 } },
    color: { scale: { palette: "blues" } }
  });
```

This mode derives rectangular x/y bounds and a count for each cell. It emits
the complete grid by default, including zero-count cells.

## You must decide

- Whether rows are already at one-row-per-cell grain or require `bin`
- The two position fields
- The color field for pre-gridded rows; binned mode owns its generated count
- Optional bin counts or explicit extents when the defaults are not appropriate

## The library infers

- Band scales for the two discrete positions
- One concrete rectangle per valid observed row
- A categorical or continuous color scale and matching legend
- Cartesian axes and horizontal grid

In binned mode, the library instead infers quantitative position scales from
the resolved bin extents, a continuous count scale, source-facing axis titles,
and a `Count` legend. It disables separate chart grid lines unless requested.

Use `rect: { opacity, stroke, strokeWidth }` for cell appearance. Cell fill is
owned by the required color encoding. The following continuation applies only to the **pre-gridded flow** above, whose source rows contain `value`. Set `program` to that branch; the raw-row binned branch owns generated count data and cannot use this source-field label:

<!-- snippet-context:start -->

> **Fragment.** Not a complete program: it continues the setup described in this section.

<!-- snippet-context:end -->

```javascript
const labeled = program
  .createTextMark({ align: "center", baseline: "middle" })
  .encodeText({ field: "value", format: ".0f" });
```

## Continue

[Basic Charts](../api/basic-charts.md#createheatmap) ·
[Rectangular 2D bins](../api/data/bin2d.md) ·
[Rect marks](../api/marks/rect.md) ·
[Continuous color scales](../api/scales/continuous-color.md)
