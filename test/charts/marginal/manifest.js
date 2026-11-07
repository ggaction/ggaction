import { createMarginal } from "../../../examples/marginal/program.js";
import { createMarginalPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({ chart: "marginal", variant: "linked-bins", title: "Observations with aligned marginal distributions",
  width: 472, height: 400, primitive: createMarginalPrimitive, userFacing: createMarginal,
  programEquivalence: "render", compareSemanticSpec: false,
  callChain: 'vconcat({ id: "marginal", programs: [{ id: "x", program: x }, { id: "lower", program: lower }], gap: 0, align: "start" });',
  artifact: { capability: "composition-recipes" }, colors: ["#93c5fd", "#2563eb"],
  regions: [{ name: "x histogram", x: 40, y: 20, width: 260, height: 80, minimumInkPixels: 5000 },
    { name: "observations", x: 40, y: 140, width: 260, height: 220, minimumInkPixels: 300 },
    { name: "y histogram", x: 342, y: 140, width: 100, height: 220, minimumInkPixels: 5000 }]
})];
