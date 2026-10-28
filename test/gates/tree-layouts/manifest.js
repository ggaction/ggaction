import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createTreePrimitive } from "./primitive.program.js";

export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: "tree-layouts", variant: variant.id, title: variant.title,
  width: canvas.width, height: canvas.height, primitive: () => createTreePrimitive(variant.id),
  callChain: `import { createTreePrimitive } from "./test/gates/tree-layouts/primitive.program.js";\ncreateTreePrimitive(${JSON.stringify(variant.id)});`,
  artifact: { scope: "review" }, colors: ["#2563eb", "#60a5fa", "#f59e0b"],
  regions: [{ name: "hierarchy", x: 60, y: 65, width: 500, height: 390, minimumInkPixels: 5000 }]
}));
