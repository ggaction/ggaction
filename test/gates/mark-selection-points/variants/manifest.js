import { defineVisualVariant } from "../../../support/visual-variants.js";
import { loadCars } from "../../../support/data.js";
import { createPointHighlightGatePrimitive } from "../primitive.program.js";
import {
  POINT_HIGHLIGHT_LAYOUT,
  POINT_HIGHLIGHT_TARGET
} from "../reference-values.js";

export const pointHighlightCallChain = `chart()
  .createCanvas({
    width: 760,
    height: 440,
    margin: { top: 90, right: 170, bottom: 60, left: 70 }
  })
  .createData({ id: "cars", values: rows })
  .createPointMark({ id: "points" })
  .encodeX({ field: "Horsepower" })
  .encodeY({ field: "Miles_per_Gallon" })
  .encodeColor({ field: "Origin" })
  .encodeRadius({ value: 3 })
  .createGuides({
    axes: {
      x: { title: { text: "Horsepower" } },
      y: { title: { text: "Miles per Gallon" } }
    },
    legend: { channels: ["color"] }
  })
  .createTitle({
    text: "Highest-Horsepower Car in Each Origin",
    subtitle: "Selected points are enlarged, offset, and drawn in front"
  })
  .highlightMarks({
    target: "points",
    select: {
      field: "Horsepower",
      op: "max",
      groupBy: "Origin"
    },
    color: "#dc2626",
    opacity: 1,
    stroke: "#ffffff",
    strokeWidth: 1.5,
    shape: "diamond",
    size: 5.5,
    offset: { x: 7, y: -7 },
    dimOthers: { opacity: 0.18 },
    bringToFront: true
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "mark-selection",
    variant: "points-grouped-max",
    title: "Grouped Maximum Point Highlight",
    callChain: pointHighlightCallChain,
    primitive: createPointHighlightGatePrimitive(loadCars()),
    width: POINT_HIGHLIGHT_LAYOUT.width,
    height: POINT_HIGHLIGHT_LAYOUT.height,
    colors: [POINT_HIGHLIGHT_TARGET.accent],
    regions: [
      {
        name: "plot",
        x: 70,
        y: 90,
        width: 520,
        height: 290,
        colors: [POINT_HIGHLIGHT_TARGET.accent]
      }
    ]
  })
]);
