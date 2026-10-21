import { defineVisualVariant } from "../../support/visual-variants.js";
import { createFacetHeaderRotation } from "../../../examples/facet-header-rotation/program.js";
import { createFacetHeaderRotationPrimitives } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({
  chart: "facet-header-rotation", variant: "left-vertical", title: "Vertical region headers",
  width: 185, height: 195,
  callChain: `unit
  .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400, column: { side: "left", offset: 35, rotation: { value: -90, unit: "degrees" } } } })
  .editFacetGuides({ axes: "outer", legend: false })
  .editCompositionLayout({ spacing: "plot", gap: 25 });`,
  primitive: createFacetHeaderRotationPrimitives,
  userFacing: createFacetHeaderRotation,
  compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "facet-headers" },
  colors: ["#4c78a8", "#0f172a", "#e2e8f0"],
  regions: [
    { name: "north-header", x: 0, y: 20, width: 18, height: 60, minimumInkPixels: 30 },
    { name: "south-header", x: 0, y: 105, width: 18, height: 60, minimumInkPixels: 30 },
    { name: "north-plot", x: 50, y: 20, width: 120, height: 60, minimumInkPixels: 150 },
    { name: "south-plot", x: 50, y: 105, width: 120, height: 60, minimumInkPixels: 150 }
  ]
})];
