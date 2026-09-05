import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, createLinkedThetaLegend, createIndependentLegendOrder } from "../../../examples/theta-legend-order/program.js";
import { createLinkedPrimitive, createIndependentPrimitive } from "./primitive.program.js";
const calls = `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "source", values: rows })})
  .createPiePlot({ id: "pie", category: "category", value: "value", aggregate: "sum" })
  .orderCategories({ target: "pie", channel: "theta", values: ["C", "A"] })
  .editLegend({ target: "pie", order: { channel: "theta" } })`;
export const visualVariants = [
  ["linked", "Weighted sectors and legend ordered C, A, B", createLinkedThetaLegend, createLinkedPrimitive],
  ["independent", "Same sectors, legend ordered B, A, C", createIndependentLegendOrder, createIndependentPrimitive]
].map(([variant, title, userFacing, primitive]) => defineVisualVariant({
  chart: "theta-legend-order", variant, title, userFacing, primitive,
  width: layout.width, height: layout.height,
  callChain: calls + (variant === "independent"
    ? '\n  .editLegend({ target: "pie", order: { values: ["B"] } });' : ";"),
  artifact: { scope: "charts", capability: "category-order" },
  colors: ["#4c78a8", "#f58518", "#e45756"],
  regions: [{ name: "sectors", x: 300, y: 150, width: 400, height: 400,
    minimumInkPixels: 100000,
    colors: ["#4c78a8", "#f58518", "#e45756"].map(value => ({ value, minimumPixels: 20000 })) }]
}));
