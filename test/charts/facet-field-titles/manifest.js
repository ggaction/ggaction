import { defineVisualVariant } from "../../support/visual-variants.js";
import { createFacetFieldTitles } from "../../../examples/facet-field-titles/program.js";
import { createFacetFieldTitlesPrimitives } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({
  chart: "facet-field-titles", variant: "left-vertical", title: "One field title across two panels",
  width: 215, height: 195,
  callChain: `unit
  .facet({ field: "region", columns: 1, headers: { fontSize: 12, fontWeight: 400, column: { side: "left", offset: 35, rotation: -Math.PI / 2 } } })
  .editFacetGuides({ axes: "outer", legend: false })
  .editCompositionLayout({ spacing: "plot", gap: 25 })
  .editFacetHeaders({ role: "column", title: { text: "Region", offset: 64 } });`,
  primitive: createFacetFieldTitlesPrimitives,
  userFacing: createFacetFieldTitles,
  compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "facet-headers" },
  colors: ["#4c78a8", "#0f172a", "#e2e8f0"],
  regions: [
    { name: "field-title", x: 0, y: 65, width: 18, height: 60, minimumInkPixels: 30 },
    { name: "north-plot", x: 80, y: 20, width: 120, height: 60, minimumInkPixels: 150 },
    { name: "south-plot", x: 80, y: 105, width: 120, height: 60, minimumInkPixels: 150 }
  ]
})];
