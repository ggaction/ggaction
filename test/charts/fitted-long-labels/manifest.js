import {
  createFittedLongLabels,
  fittedLabelRows
} from "../../../examples/fitted-long-labels/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createFittedLongLabelsPrimitive } from "./primitive.program.js";

export const fittedLongLabelsTarget = `chart()
  .createCanvas({ width: 680, height: 420, margin: 130 })
  .createData({ values: rows })
  .createScatterPlot({
    x: { field: "market", fieldType: "nominal" },
    y: "score",
    point: { radius: 5 },
    guides: false
  })
  .createXAxis({
    ticksAndLabels: { labels: {
      maxWidth: 72,
      wrap: "word",
      lineHeight: 14,
      rotation: { value: -24, unit: "degrees" }
    } },
    title: { text: "Sales market" }
  })
  .createYAxis({ title: { text: "Account score" } })
  .createTitle({
    text: "Market account scores",
    subtitle: "Margins fitted after wrapped axis labels"
  })
  .fitCanvas({ padding: 4 });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "fitted-long-labels",
    variant: "default",
    title: "Fitted Long Axis Labels",
    callChain: fittedLongLabelsTarget,
    artifact: { capability: "canvas-fitting" },
    primitive: () => createFittedLongLabelsPrimitive(fittedLabelRows),
    userFacing: () => createFittedLongLabels(fittedLabelRows),
    width: 680,
    height: 420,
    colors: ["#ffffff", "#4c78a8"],
    regions: [
      {
        name: "plot-and-wrapped-labels",
        x: 20,
        y: 40,
        width: 650,
        height: 360,
        minimumInkPixels: 500,
        colors: ["#4c78a8"]
      }
    ]
  })
]);
