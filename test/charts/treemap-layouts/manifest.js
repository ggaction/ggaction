import { treemapProgramOptions } from "../../../examples/treemap-layouts/options.js";
import { createTreemap } from "../../../examples/treemap-layouts/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createTreemapPrimitive } from "./primitive.program.js";

export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: variant.id === "slice-dice" ? "treemap-layouts" : "treemap-squarify", variant: variant.id, title: variant.title,
  width: canvas.width, height: canvas.height, primitive: () => createTreemapPrimitive(variant.id),
  userFacing: () => createTreemap(variant.id), programEquivalence: "render", compareSemanticSpec: false,
  callChain: "chart()" + Object.entries(treemapProgramOptions(variant.id)).map(([op, options]) => `\n  .${op}(${JSON.stringify(options)})`).join("") + ";",
  artifact: { scope: "charts", capability: "hierarchy" }, colors: ["#3b82f6", "#93c5fd", "#f59e0b"],
  regions: [{ name: "hierarchy", x: 48, y: 100, width: 544, height: 320, minimumInkPixels: 150000 }]
}));
