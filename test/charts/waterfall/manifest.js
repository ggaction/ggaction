import { canvas, variants, waterfallOptions } from "../../../examples/waterfall/fixture.js";
import { createWaterfall } from "../../../examples/waterfall/program.js";
import { createWaterfallPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => {
  const options = waterfallOptions(variant.id);
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createWaterfallPrimitive({ labels: options.plot.labels !== undefined, connectors: options.plot.connectors !== false }), userFacing: () => createWaterfall(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + [["createCanvas", options.canvas], ["createData", options.data], ["createWaterfallPlot", options.plot]].map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
    artifact: { scope: "charts", capability: "waterfall" }, colors: ["#16a34a", "#dc2626"],
    regions: [{ name: "contributions", x: 40, y: 40, width: 420, height: 240, minimumInkPixels: 1000 }]
  });
});
