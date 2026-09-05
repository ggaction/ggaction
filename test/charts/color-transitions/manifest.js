import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, rows, color, transition, createPointTransition, createBarTransition } from "../../../examples/color-transitions/program.js";
import { createPointPrimitive, createBarPrimitive } from "./primitive.program.js";
export const visualVariants = [
  ["point", "Points and their legend change to color intervals", createPointTransition, createPointPrimitive],
  ["bar", "Aggregate bars and their legend change to color intervals", createBarTransition, createBarPrimitive]
].map(([variant, title, userFacing, primitive]) => {
  const operation = variant === "point" ? "createScatterPlot" : "createBarPlot";
  const args = variant === "point" ? { id: "m", x: "x", y: "value", color }
    : { id: "m", x: "category", y: { field: "value", aggregate: "sum" }, color };
  return defineVisualVariant({ chart: "color-transitions", variant, title, ...layout, userFacing, primitive,
    callChain: `chart()\n  .createCanvas(${JSON.stringify(layout)})\n  .createData(${JSON.stringify({ id: "data", values: rows })})\n  .${operation}(${JSON.stringify(args)})\n  .editScale(${JSON.stringify(transition)});`,
    artifact: { scope: "charts", capability: "color-scales" }, colors: ["#0000ff", "#ff0000"],
    regions: [{ name: "marks", x: 140, y: 140, width: 720, height: 420, minimumInkPixels: variant === "bar" ? 3000 : 40,
      colors: ["#0000ff", "#ff0000"].map(value => ({ value, minimumPixels: variant === "bar" ? 1000 : 20 })) }]
  });
});
