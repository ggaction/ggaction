import { createResponsiveGuides } from "../../../examples/responsive-guides/program.js";
import { createResponsiveGuidesPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const responsiveCallChain = `chart()
  .createCanvas({ width: 400, height: 320, margin: 20, responsive: {} })
  .createData({ values: responsiveRows })
  .createBarPlot({ x: "x", y: "y", guides: {
    axes: { x: { ticksAndLabels: { labels: { responsive: {} } } }, y: {} },
    legend: false
  } });`;
export const visualVariants = [defineVisualVariant({
  chart: "responsive-guides", variant: "wrapped", title: "Labels inside a fixed Canvas", callChain: responsiveCallChain,
  primitive: createResponsiveGuidesPrimitive, userFacing: createResponsiveGuides,
  width: 400, height: 320, compareSemanticSpec: false, artifact: { capability: "responsive-layout" },
  colors: ["#4c78a8"], regions: [{ name: "bars-and-guides", x: 0, y: 0, width: 400, height: 320,
    minimumInkPixels: 1000, colors: ["#4c78a8"] }]
})];
