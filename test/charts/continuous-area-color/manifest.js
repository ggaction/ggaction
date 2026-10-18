import { createContinuousAreaColor, publicCalls } from "../../../examples/continuous-area-color/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createContinuousAreaPrimitive } from "./primitive.program.js";
export const visualVariants = [defineVisualVariant({
  chart: "continuous-area-color", variant: "nine-series-hcl", title: "Independent series and quantitative area color",
  width: 320, height: 220, userFacing: createContinuousAreaColor, primitive: createContinuousAreaPrimitive,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  compareSemanticSpec: false, artifact: { scope: "charts", capability: "continuous-area-color" },
  colors: [], regions: [{ name: "stacked areas", x: 20, y: 38, width: 280, height: 162, minimumInkPixels: 5000 }]
})];
