import { flowProgramOptions } from "../../../examples/flow-layouts/options.js";
import { createFlow } from "../../../examples/flow-layouts/program.js";
import { defineVisualVariant } from "../../support/visual-variants.js";
import { canvas, variants } from "./reference-values.js";
import { createFlowPrimitive } from "./primitive.program.js";
export const visualVariants = variants.map(variant => {
  const o = flowProgramOptions(variant.id), calls = [["createCanvas", o.canvas], ["createData", o.nodes], ["createData", o.edges], ["createFlowData", o.flow],
    ["layoutFlow", o.layout], ["createFlowLinks", o.links], ["createFlowNodes", o.marks], ["createTitle", o.title]];
  return defineVisualVariant({ chart: variant.id === "dag" ? "flow-layouts" : `flow-${variant.id}`, variant: variant.id, title: variant.title,
    width: canvas.width, height: canvas.height, primitive: () => createFlowPrimitive(variant.id), userFacing: () => createFlow(variant.id),
    programEquivalence: "render", compareSemanticSpec: false,
    callChain: "chart()" + calls.map(([op, value]) => `\n  .${op}(${JSON.stringify(value)})`).join("") + ";",
    artifact: { scope: "charts", capability: "flows" }, colors: ["#2563eb", "#f59e0b"],
    regions: [{ name: "flow", x: 40, y: 80, width: 560, height: 380, minimumInkPixels: 1000 }]
  });
});
