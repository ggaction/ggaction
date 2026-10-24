import { createSharedAdjacent, publicCalls as adjacentCalls } from "../../../examples/shared-adjacent/program.js";
import { createLinkedOverlay, publicCalls } from "../../../examples/linked-overlay/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { overlayPrimitive, adjacentPrimitive } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({
  chart: "linked-overlay", variant: "bar-line", title: "Line follows the bar endpoints",
  userFacing: createLinkedOverlay, primitive: overlayPrimitive, width: 410, height: 350,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  programEquivalence: "render", compareSemanticSpec: false,
  colors: [{ value: "#9dbbd6", tolerance: 2, minimumPixels: 1000 }],
  regions: [{ name: "plot", x: 65, y: 55, width: 320, height: 240, minimumInkPixels: 1000 }],
  artifact: { scope: "charts", capability: "linked-composition" }
}), defineVisualVariant({
  chart: "shared-adjacent", variant: "shared-y", title: "Adjacent charts share Y and plot alignment",
  userFacing: createSharedAdjacent, primitive: adjacentPrimitive, width: 840, height: 350,
  callChain: "chart()\n" + adjacentCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  programEquivalence: "render", compareSemanticSpec: false,
  colors: [{ value: "#9dbbd6", tolerance: 2, minimumPixels: 1000 }],
  regions: [{ name: "left plot", x: 65, y: 55, width: 320, height: 240, minimumInkPixels: 1000 },
    { name: "right plot", x: 495, y: 55, width: 320, height: 240, minimumInkPixels: 400 }],
  artifact: { scope: "charts", capability: "linked-composition" }
})];
