import { createAxisOwners, publicCalls } from "../../../examples/axis-owners/program.js";
import { createAxisOwnersPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({
  chart: "axis-owners", variant: "single-y", title: "Named quantity axis with an inside title",
  width: 470, height: 270, userFacing: createAxisOwners, primitive: createAxisOwnersPrimitive,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  compareSemanticSpec: false, artifact: { scope: "charts", capability: "cartesian-guides" },
  colors: [{ value: "#4c78a8", minimumPixels: 40 }],
  regions: [{ name: "plot", x: 65, y: 55, width: 310, height: 140, minimumInkPixels: 180,
    colors: [{ value: "#4c78a8", minimumPixels: 40 }] }]
})];
