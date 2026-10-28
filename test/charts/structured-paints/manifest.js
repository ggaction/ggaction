import { frame, rows, variants } from "../../../examples/structured-paints/data.js";
import { createStructuredPaintExample } from "../../../examples/structured-paints/program.js";
import { createStructuredPaintPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export { variants, frame };
export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: "structured-paints", variant: variant.id, title: variant.title, width: frame.width, height: frame.height,
  userFacing: () => createStructuredPaintExample(variant), primitive: () => createStructuredPaintPrimitive(variant), compareSemanticSpec: false, programEquivalence: "render",
  callChain: `chart()\n  .createCanvas(${JSON.stringify(frame)})\n  .createData(${JSON.stringify({ values: rows })})\n  .createRectMark(${JSON.stringify({ id: "paint", fill: variant.fill, opacity: variant.opacity, stroke: false })})\n  .encodeXRange({lower:"left",upper:"right",scale:{domain:[0,1]}})\n  .encodeYRange({lower:"lower",upper:"upper",scale:{domain:[0,1]}});`,
  artifact: { scope: "charts", capability: "structured-paints" },
  colors: [], // Exact alpha/color samples live in the independent browser and renderer contracts.
  regions: [{ name: "painted-interval", x: 20, y: 20, width: 220, height: 140, minimumInkPixels: 25000 }]
}));
