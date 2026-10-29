import { createNestedResponsive } from "../../../examples/nested-responsive/program.js";
import { createNestedResponsivePrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({
  chart: "nested-responsive", variant: "three-rows", title: "Nested panels with shared guides",
  callChain: `hconcat({ id: "report", programs: [{ id: "panels", program: panels }, { id: "overview", program: overview }], gap: 32, align: "start" });`,
  primitive: createNestedResponsivePrimitive, userFacing: createNestedResponsive,
  width: 1047, height: 942, compareSemanticSpec: false, artifact: { capability: "nested-composition" },
  colors: ["#4c78a8", "#f58518"], regions: [
    { name: "panels", x: 0, y: 0, width: 675, height: 942, minimumInkPixels: 1000, colors: ["#4c78a8", "#f58518"] },
    { name: "overview", x: 707, y: 0, width: 340, height: 300, minimumInkPixels: 1000, colors: ["#4c78a8", "#f58518"] }
  ]
})];
