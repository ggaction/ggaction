import { createNamedShapes, publicCalls } from "../../../examples/named-shapes/program.js";
import { createNamedShapesPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = [defineVisualVariant({
  chart: "named-shapes", variant: "area-and-rotation", title: "Wedge and arrow preserve area and rotate around their own anchors",
  width: 480, height: 270, userFacing: createNamedShapes, primitive: createNamedShapesPrimitive,
  callChain: "chart()\n" + publicCalls.map(call => `  .${call.op}(${JSON.stringify(call.args)})`).join("\n") + ";",
  compareSemanticSpec: false, artifact: { scope: "charts", capability: "point-shapes" },
  colors: [{ value: "#4c78a8", minimumPixels: 400 }],
  regions: [{ name: "glyphs", x: 60, y: 70, width: 170, height: 130, minimumInkPixels: 500,
    colors: [{ value: "#4c78a8", minimumPixels: 400 }] }]
})];
