import { treeProgramOptions } from "../../../examples/tree-layouts/options.js";
import { createTree } from "../../../examples/tree-layouts/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createTreePrimitive } from "./primitive.program.js";

export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: variant.id === "vertical" ? "tree-layouts" : `tree-${variant.id}`, variant: variant.id, title: variant.title,
  width: canvas.width, height: canvas.height, primitive: () => createTreePrimitive(variant.id),
  userFacing: () => createTree(variant.id), programEquivalence: "render", compareSemanticSpec: false,
  callChain: "chart()" + Object.entries(treeProgramOptions(variant.id)).map(([op, options]) => `\n  .${op}(${JSON.stringify(options)})`).join("") + ";",
  artifact: { scope: "charts", capability: "hierarchy" }, colors: ["#2563eb", "#60a5fa", "#f59e0b"],
  regions: [{ name: "hierarchy", x: 60, y: 65, width: 500, height: 390, minimumInkPixels: 5000 }]
}));
