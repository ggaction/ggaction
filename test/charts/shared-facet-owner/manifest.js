import { createSharedFacetOwner, publicCalls } from "../../../examples/shared-facet-owner/program.js";
import { createSharedFacetOwnerPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({
  chart: "shared-facet-owner", variant: "parent-horizontal", title: "A 270-pixel legend belongs to four 60-pixel panels",
  width: 445, height: 220, userFacing: createSharedFacetOwner, primitive: createSharedFacetOwnerPrimitive,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  compareSemanticSpec: false, artifact: { scope: "charts", capability: "facet-guides" },
  colors: ["#4c78a8", "#f58518", "#54a24b"],
  regions: [{ name: "plots", x: 35, y: 55, width: 375, height: 120, minimumInkPixels: 500 },
    { name: "parent-legend", x: 87, y: 182, width: 271, height: 38, minimumInkPixels: 100,
      colors: ["#4c78a8", "#f58518", "#54a24b"] }]
})];
