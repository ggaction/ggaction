import { defineVisualVariant } from "../../support/visual-variants.js";
import { createECDFExample } from "../../../examples/ecdf-plot/program.js";
import { createECDFPrimitive } from "./primitive.program.js";

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "ecdf-plot",
    variant: "grouped-weighted",
    title: "Grouped weighted ECDF",
    callChain: "program.createECDFPlot({ id: \"ecdf\", field: \"value\", groupBy: \"group\", weight: \"weight\", color: \"group\", labels: { dx: 10 }, guides: false });",
    primitive: createECDFPrimitive,
    userFacing: createECDFExample,
    width: 520,
    height: 340,
    colors: ["#4c78a8", "#f58518", "#334155"],
    regions: [
      { name: "step paths", x: 45, y: 45, width: 440, height: 250, minimumInkPixels: 20 }
    ],
    artifact: false
  })
]);
