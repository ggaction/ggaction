import { createPieExample } from "../../../examples/pie-plot/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, targets, palette } from "./reference-values.js";
import { createCountPrimitive, createWeightedPrimitive, createDonutPrimitive } from "./primitive.program.js";

export const capability = "chart-authoring";
export const visualVariants = Object.freeze([
  ["count", "Pie: category count", createCountPrimitive],
  ["weighted", "Pie: explicit weighted sum", createWeightedPrimitive],
  ["donut", "Donut: ratio and padding", createDonutPrimitive]
].map(([variant, title, primitive]) => defineVisualVariant({
  chart: "pie-plot", variant, title, primitive, userFacing: () => createPieExample(variant),
  width: layout.width, height: layout.height,
  callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "source", values: rows })})\n  .createPiePlot(${JSON.stringify(targets[variant])});`,
  artifact: { scope: "charts", capability },
  colors: palette,
  regions: [{ name: "sectors", x: 300, y: 150, width: 400, height: 400,
    minimumInkPixels: 40000, colors: palette.map(value => ({ value, minimumPixels: 10000 })) }]
})));
