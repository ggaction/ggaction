import { contourOptions } from "../../../examples/contours/options.js";
import { createContours } from "../../../examples/contours/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createContourPrimitive } from "./primitive.program.js";
export const visualVariants = variants.map(variant => {
  const options = contourOptions(variant.id), calls = [["createCanvas", options.canvas],
    ...(options.density ? [["createData", options.data], ["createDensityContourData", options.geometry]] : [["createContourData", options.geometry]]),
    ["createContourMark", options.mark], ["createTitle", options.title]];
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createContourPrimitive(variant.id), userFacing: () => createContours(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + calls.map(([op, value]) => `\n  .${op}(${JSON.stringify(value)})`).join("") + ";",
    artifact: { scope: "charts", capability: "contours" }, colors: ["#1d4ed8"],
    regions: [{ name: "contours", x: 40, y: 80, width: 560, height: 360, minimumInkPixels: 1000 }]
  });
});
