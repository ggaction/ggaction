import { graphProgramOptions } from "../../../examples/graph-plots/options.js";
import { createGraph } from "../../../examples/graph-plots/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createGraphPrimitive } from "./primitive.program.js";

export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: variant.id === "directed" ? "graph-plots" : `graph-${variant.id}`, variant: variant.id, title: variant.title,
  width: canvas.width, height: canvas.height, primitive: () => createGraphPrimitive(variant.id),
  userFacing: () => createGraph(variant.id),
  programEquivalence: "render", compareSemanticSpec: false,
  callChain: "chart()" + graphProgramOptions(variant.id).map(([op, args]) => `\n  .${op}(${JSON.stringify(args)})`).join("") + ";",
  artifact: { scope: "charts", capability: "graph" }, colors: ["#2563eb", "#64748b"],
  regions: [{ name: "network", x: 20, y: 50, width: 260, height: 150, minimumInkPixels: 300 }]
}));
