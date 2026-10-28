import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createTreemapPrimitive } from "./primitive.program.js";

export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: "treemap-layouts", variant: variant.id, title: variant.title,
  width: canvas.width, height: canvas.height, primitive: () => createTreemapPrimitive(variant.id),
  callChain: `import { createTreemapPrimitive } from "./test/gates/treemap-layouts/primitive.program.js";\ncreateTreemapPrimitive(${JSON.stringify(variant.id)});`,
  artifact: { scope: "review" }, colors: ["#3b82f6", "#93c5fd", "#f59e0b"],
  regions: [{ name: "hierarchy", x: 48, y: 100, width: 544, height: 320, minimumInkPixels: 150000 }]
}));
