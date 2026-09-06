import { defineVisualVariant } from "../../support/visual-variants.js";
import { createRaincloudExample } from "../../../examples/raincloud-plot/program.js";
import { createRaincloudPrimitive } from "./primitive.program.js";

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "raincloud-plot",
    variant: "vertical-box-beeswarm",
    title: "Shared-source Raincloud",
    callChain: "program.createRaincloudPlot({ id: \"distribution\", category: { field: \"group\", fieldType: \"nominal\", scale: { domain: [\"Control\", \"Treatment\", \"Follow-up\"] } }, value: { field: \"value\", fieldType: \"quantitative\", scale: { domain: [38, 74], zero: false } }, color: \"group\", summary: { type: \"box\" }, points: { type: \"beeswarm\", packing: { key: \"id\" } } });",
    primitive: createRaincloudPrimitive,
    userFacing: createRaincloudExample,
    width: 680,
    height: 420,
    colors: ["#4c78a8", "#f58518", "#e45756", "#0f172a"],
    regions: [
      { name: "raincloud layers", x: 55, y: 45, width: 570, height: 310, minimumInkPixels: 500 }
    ],
    artifact: false
  })
]);
