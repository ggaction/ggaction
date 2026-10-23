import { defineVisualVariant } from "../../support/visual-variants.js";
import { createLookupExample } from "../../../examples/lookup-data/program.js";
import { createLookupPrimitives } from "./primitive.program.js";

export const visualVariants = [defineVisualVariant({
  chart: "lookup-data", variant: "group-means", title: "Mean age by group",
  width: 400, height: 280,
  callChain: `chart()
  .createCanvas({ width: 400, height: 280, margin: 50 })
  .createData({ id: "people", values: people })
  .createData({ id: "groups", values: groups })
  .createLookupData({ id: "ages", field: "person", lookup: { data: "people", key: "name", fields: ["age"] } })
  .createBarPlot({ x: "group", y: { field: "age", aggregate: "mean" } });`,
  primitive: createLookupPrimitives, userFacing: createLookupExample,
  compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "data" },
  colors: ["#4c78a8"],
  regions: [{ name: "three mean bars", x: 50, y: 50, width: 300, height: 180, minimumInkPixels: 1000 }]
})];
