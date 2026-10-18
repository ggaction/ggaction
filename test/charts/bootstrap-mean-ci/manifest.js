import { createBootstrapMeanCI, publicCalls } from "../../../examples/bootstrap-mean-ci/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createBootstrapMeanPrimitive } from "./primitive.program.js";
export const visualVariants = [defineVisualVariant({
  chart: "bootstrap-mean-ci", variant: "skewed-five-groups", title: "Seeded percentile bootstrap mean intervals",
  width: 320, height: 220, userFacing: createBootstrapMeanCI, primitive: createBootstrapMeanPrimitive,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  compareSemanticSpec: false, artifact: { scope: "charts", capability: "bootstrap-mean-ci" },
  colors: [], regions: [{ name: "asymmetric confidence band", x: 20, y: 55, width: 280, height: 145, minimumInkPixels: 5000 }]
})];
