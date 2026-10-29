import { canvas, variants, trailOptions } from "../../../examples/trail/fixture.js";
import { createTrail } from "../../../examples/trail/program.js";
import { createTrailPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => {
  const options = trailOptions(variant.id);
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createTrailPrimitive({ constant: variant.id === "constant-width" }), userFacing: () => createTrail(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + [["createCanvas", options.canvas], ["createData", options.data], ["createTrailPlot", options.plot]].map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
    artifact: { scope: "charts", capability: "trail" }, colors: ["#2563eb", "#0d9488"],
    regions: [{ name: "ribbons", x: 40, y: 40, width: 340, height: 160, minimumInkPixels: 3000 }]
  });
});
