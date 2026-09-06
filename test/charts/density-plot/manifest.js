import { createDensityExample } from "../../../examples/density-plot/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, targets } from "./reference-values.js";
import { createVerticalPrimitive, createGroupedPrimitive, createHorizontalPrimitive } from "./primitive.program.js";

export const capability = "chart-authoring";
export const visualVariants = Object.freeze([
  ["vertical", "Density: one quantitative variable", createVerticalPrimitive],
  ["grouped", "Density: explicit groups and color", createGroupedPrimitive],
  ["horizontal", "Density: horizontal orientation", createHorizontalPrimitive]
].map(([variant, title, primitive]) => {
  const colors = (variant === "vertical" ? ["#dbe4ee"] : ["#dbe4ee", "#fde7d2"])
    .map(value => ({ value, tolerance: 2, minimumPixels: 100 }));
  return defineVisualVariant({
    chart: "density-plot", variant, title, primitive, userFacing: () => createDensityExample(variant),
    width: layout.width, height: layout.height,
    callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "source", values: rows })})\n  .createDensityPlot(${JSON.stringify(targets[variant])});`,
    artifact: { scope: "charts", capability },
    colors,
    regions: [{ name: "density-profiles", x: 160, y: 160, width: 680, height: 380,
      minimumInkPixels: 15000, colors }]
  });
}));
