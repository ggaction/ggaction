import { createPartition } from "../../../examples/partition-layouts/program.js";
import { partitionProgramOptions } from "../../../examples/partition-layouts/options.js";
import { variants, frame } from "./reference-values.js";
import { createPartitionPrimitive } from "./primitive.program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
export const visualVariants = variants.map(variant => defineVisualVariant({
  chart: variant.kind === "sector" ? "partition-sunburst" : "partition-layouts", variant: variant.variant, title: variant.title, ...frame,
  primitive: () => createPartitionPrimitive(variant.variant), userFacing: () => createPartition(variant.variant),
  programEquivalence: "render", compareSemanticSpec: false, artifact: { scope: "charts", capability: "partition" },
  callChain: "chart()" + Object.entries(partitionProgramOptions(variant.variant)).map(([op, options]) => `\n  .${op}(${JSON.stringify(options)})`).join("") + ";",
  colors: variant.input === "zero" ? [] : ["#2563eb"],
  regions: [{ name: "plot", x: 20, y: 65, width: 440, height: 260, minimumInkPixels: variant.input === "zero" ? 0 : 1000 }]
}));
