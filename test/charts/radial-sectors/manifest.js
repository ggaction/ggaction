import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, createRoseDisk, createRoseHole, createRadialDisk, createRadialHole, createOrderedRadial } from "../../../examples/radial-sectors/program.js";
import { createRadialPrimitive } from "./primitive.program.js";
const variants = [
  ["rose-disk", "Rose sectors with proportional area", "area", 0, createRoseDisk],
  ["rose-hole", "Rose sectors with proportional annular area", "area", 70, createRoseHole],
  ["radial-disk", "Radial bars with proportional radius", "radius-length", 0, createRadialDisk],
  ["radial-hole", "Radial bars measured from the inner edge", "radius-length", 70, createRadialHole],
  ["radial-theta-legend-order", "Radial bars and legend ordered C, A, B", "radius-length", 70, createOrderedRadial]
];
export const visualVariants = variants.map(([variant, title, mapping, inner, userFacing]) => {
  const ordered = variant === "radial-theta-legend-order";
  const operation = mapping === "area" ? "createRosePlot" : "createRadialBarPlot";
  return defineVisualVariant({
    chart: "radial-sectors", variant, title, width: layout.width, height: layout.height,
    userFacing, primitive: () => createRadialPrimitive({ mapping, inner, ordered }),
    callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "source", values: rows })})\n  .${operation}(${JSON.stringify({ id: "sectors", category: "category", value: "value", aggregate: "sum", radiusScale: { range: [inner, 140] } })})` +
      (ordered ? '\n  .orderCategories({ target: "sectors", channel: "theta", values: ["C", "A"] })\n  .editLegend({ target: "sectors", order: { channel: "theta" } });' : ";"),
    artifact: { scope: "charts", capability: "measured-radius" },
    colors: ["#4c78a8", "#f58518", "#e45756"],
    regions: [{ name: "sectors", x: 350, y: 200, width: 300, height: 300, minimumInkPixels: 20000,
      colors: ["#4c78a8", "#f58518", "#e45756"].map(value => ({ value, minimumPixels: 3000 })) }]
  });
});
