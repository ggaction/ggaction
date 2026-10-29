import { createEdgeRoutes } from "../../../examples/edge-routes/program.js";
import { edgeRouteProgramOptions } from "../../../examples/edge-routes/options.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { createEdgeRoutePrimitive } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({ chart: "edge-routes", variant: "edge-path", title: "Edge routes with original topology",
  width: 320, height: 240, primitive: createEdgeRoutePrimitive, userFacing: createEdgeRoutes,
  programEquivalence: "render", compareSemanticSpec: false,
  callChain: "chart()" + edgeRouteProgramOptions().map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
  artifact: { scope: "charts", capability: "edge-routes" }, colors: ["#2563eb"],
  regions: [{ name: "routes", x: 45, y: 45, width: 230, height: 170, minimumInkPixels: 500 }]
})];
