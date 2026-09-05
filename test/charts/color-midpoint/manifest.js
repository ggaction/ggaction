import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, plotOptions, createMidpoint, createClearedMidpoint } from "../../../examples/color-midpoint/program.js";
import { createMidpointPrimitive, createClearedPrimitive } from "./primitive.program.js";
export const visualVariants = [
  ["asymmetric", "Color centered on zero in an asymmetric domain", createMidpoint, createMidpointPrimitive],
  ["clear", "Color restored to endpoint interpolation", createClearedMidpoint, createClearedPrimitive]
].map(([variant, title, userFacing, primitive]) => defineVisualVariant({
  chart: "color-midpoint", variant, title, ...layout, userFacing, primitive,
  callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "data", values: rows })})\n  .createScatterPlot(${JSON.stringify(plotOptions)})` + (variant === "clear" ? '\n  .editScale({ id: "colors", midpoint: "auto" });' : ";"),
  artifact: { scope: "charts", capability: "color-scales" },
  colors: ["#0000ff", "#ff0000"],
  regions: [{ name: "scatter", x: 140, y: 140, width: 720, height: 420, minimumInkPixels: 300,
    colors: [{ value: "#0000ff", minimumPixels: 40 }, { value: "#ff0000", minimumPixels: 40 }] }]
}));
