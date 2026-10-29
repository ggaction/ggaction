import { canvas, variants, pyramidOptions } from "../../../examples/pyramid/fixture.js";
import { createPyramid } from "../../../examples/pyramid/program.js";
import { createPyramidPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => {
  const options = pyramidOptions(variant.id);
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createPyramidPrimitive(variant.id), userFacing: () => createPyramid(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + [["createCanvas", options.canvas], ["createData", options.data], ["createPyramidPlot", options.plot]]
      .map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
    artifact: { scope: "charts", capability: "pyramid" }, colors: ["#c7d2fe"],
    regions: [{ name: "stages", x: 60, y: 60, width: 300, height: 270, minimumInkPixels: 10000 }]
  });
});
