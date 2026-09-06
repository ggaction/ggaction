import { defineVisualVariant } from "../../support/visual-variants.js";
import { createBeeswarmExample } from "../../../examples/beeswarm-plot/program.js";
import { createBeeswarmPrimitive } from "./primitive.program.js";

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "beeswarm-plot",
    variant: "vertical-packed",
    title: "Deterministic grouped Beeswarm",
    callChain: "program.createBeeswarmPlot({ id: \"swarm\", x: { field: \"group\", fieldType: \"nominal\" }, y: { field: \"value\", fieldType: \"quantitative\" }, packing: { key: \"id\" } });",
    primitive: createBeeswarmPrimitive,
    userFacing: createBeeswarmExample,
    width: 520,
    height: 340,
    colors: ["#4c78a8", "#334155"],
    regions: [
      { name: "packed points", x: 50, y: 45, width: 420, height: 245, minimumInkPixels: 180 }
    ],
    artifact: false
  })
]);
