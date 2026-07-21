---
layout: default
title: Annotation Recipe
---

# Annotation Recipe

{% include chart-example.html id="annotation" %}

## Minimal flow

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas()
  .createData({ values: films })
  .createScatterPlot({ x: "Released_Year", y: "IMDB_Rating" })
  .createTextMark({ dx: 7, dy: -6, align: "left", baseline: "bottom" })
  .encodeText({ field: "Series_Title" });
```

`films` is an array of plain row objects containing the two position fields and
the label field. The text layer reuses the preceding point layer's data and
resolved Cartesian anchors.

## You must decide

- The field or constant text to display
- Label offset, alignment, and typography
- A sparse enough set of rows to remain readable

## The library infers

- The current compatible source layer and dataset
- One text item per final point, bar, rect, or rule item
- Updated anchors after Canvas or scale revisions

ggaction does not perform collision avoidance. Filter rows or use explicit
`dx` and `dy` when labels overlap.

## Continue

[Text marks](../api/marks/text.md) ·
[Data filtering](../api/data/filtering.md)
