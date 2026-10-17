import { defineVisualVariant } from "../../support/visual-variants.js";
import { layout, publicCalls as colorCalls, createColorControls } from "../../../examples/color-controls/program.js";
import { publicCalls as whitePointCalls, createWhitePointComparison } from "../../../examples/color-white-point/program.js";
import { literalColors, rowGeometry } from "./fixtures.js";
import { createColorControlsPrimitive, createWhitePointPrimitive } from "./primitive.program.js";

export const visualVariants = [
  ["lab-white-point", "Lab interpolation with D65 and D50 white points", createWhitePointComparison, createWhitePointPrimitive, whitePointCalls, ["d65", "d50"]],
  ["color-math", "Cubehelix lightness gamma and signed-power color", createColorControls, createColorControlsPrimitive, colorCalls, ["gamma1", "gamma22", "power"]]
].map(([variant, title, userFacing, primitive, calls, rows]) => defineVisualVariant({
  chart: variant === "lab-white-point" ? "color-white-point" : "color-controls",
  variant, title, ...layout, userFacing, primitive,
  callChain: "chart()\n" + calls.map(({ op, args }) => `  .${op}(${JSON.stringify(args)})`).join("\n") + ";",
  compareSemanticSpec: false,
  artifact: { scope: "charts", capability: "color-scales" },
  colors: [...new Set(rows.flatMap(row => literalColors[row]))],
  regions: rows.map(name => ({ name, ...rowGeometry[name], width: 414, minimumInkPixels: 9000,
    colors: literalColors[name].map(value => ({ value, minimumPixels: 500 })) }))
}));
