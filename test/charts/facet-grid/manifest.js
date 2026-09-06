import { defineVisualVariant } from "../../support/visual-variants.js";
import { createFacetGridExample } from "../../../examples/facet-grid/program.js";
import { createFacetGridPrimitive } from "./primitive.program.js";

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "facet-grid",
    variant: "two-by-three-full",
    title: "Two-dimensional Facet Grid",
    callChain: "program.facetGrid({ id: \"matrix\", rows: { field: \"region\", values: [\"North\", \"South\"] }, columns: { field: \"period\", values: [\"Q1\", \"Q2\", \"Q3\"] }, combinations: \"full\", gap: 12 });",
    primitive: createFacetGridPrimitive,
    userFacing: createFacetGridExample,
    width: 504,
    height: 272,
    colors: ["#2563eb", "#0f172a"],
    regions: [
      { name: "north row", x: 0, y: 0, width: 504, height: 130, minimumInkPixels: 20 },
      { name: "south row", x: 0, y: 142, width: 504, height: 130, minimumInkPixels: 20 }
    ],
    programEquivalence: "render",
    artifact: false
  })
]);
