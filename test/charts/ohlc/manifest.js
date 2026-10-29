import { canvas, variants, ohlcOptions } from "../../../examples/ohlc/fixture.js";
import { createOHLC } from "../../../examples/ohlc/program.js";
import { createOHLCPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => {
  const options = ohlcOptions(variant.id);
  return defineVisualVariant({ chart: variant.chart, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createOHLCPrimitive(variant.id), userFacing: () => createOHLC(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + [["createCanvas", options.canvas], ["createData", options.data], ["createOHLCPlot", options.plot]].map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
    artifact: { scope: "charts", capability: "ohlc" }, colors: ["#16a34a", "#dc2626"],
    regions: [{ name: "prices", x: 60, y: 60, width: 300, height: 200, minimumInkPixels: 1000 }]
  });
});
