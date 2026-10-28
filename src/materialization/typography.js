import { cartesianAxisOwners, axisTargetArgs } from "../selectors/axes.js";
import { axisGraphicIds } from "./guides/resources.js";
import { applyMaterializationPlan, buildMaterializationPlan } from "./planner.js";
import { withGuideLayoutTransaction } from "./guides/layout.js";

// Font tokens and measured-width profiles invalidate the same existing owners.
// Incomplete text remains incomplete until its own prerequisites are authored.
export function rematerializeTypography(program) {
  if (program.compositionSpec !== undefined) {
    return program.compositionSpec.type === "facet" ? program.materializeComposition() : program;
  }
  const exists = (id, op) => program.graphicSpec.objects[id] !== undefined && typeof program[op] === "function";
  const textOwners = { text: "rematerializeTextMark", tree: "materializeTreePlot",
    treemap: "materializeTreemapPlot", partition: "materializePartitionPlot", graph: "materializeGraphPlot", "flow-node": "materializeFlowNodes" };
  const marks = program.semanticSpec.layers.flatMap(layer => {
    const op = textOwners[layer.mark?.type];
    return op !== undefined && exists(layer.id, op) && layer.hierarchyLabels !== false && layer.graphLabels !== false && layer.flowLabels !== false
      ? [{ op, args: { id: layer.id } }] : [];
  });
  const guides = [];
  for (const [id, op] of [
    ["thetaAxisLabels", "editThetaAxisLabels"], ["radialAxisLabels", "editRadialAxisLabels"],
    ["thetaAxisTitle", "editThetaAxisTitle"], ["radialAxisTitle", "editRadialAxisTitle"]
  ]) if (exists(id, op)) guides.push({ op });
  for (const owner of cartesianAxisOwners(program)) {
    for (const [index, component] of [[2, "Labels"], [3, "Title"]]) {
      const op = `edit${owner.channel.toUpperCase()}Axis${component}`;
      if (exists(axisGraphicIds(owner.channel, owner.id)[index], op)) {
        guides.push({ op, ...(owner.named ? { args: axisTargetArgs(owner.id, owner.channel) } : {}) });
      }
    }
  }
  const parallel = program.guideConfigs.axis?.parallel?.axes;
  if (parallel !== undefined && typeof program.rematerializeParallelAxes === "function") {
    guides.push({ op: "rematerializeParallelAxes", args: { target: parallel.target } });
  }
  if (Object.keys(program.guideConfigs.legend ?? {}).length > 0 && typeof program.rematerializeLegend === "function") {
    guides.push({ op: "rematerializeLegend" });
  }
  const layout = exists("chartTitle", "rematerializeTitle") ? [{ op: "rematerializeTitle" }] : [];
  return withGuideLayoutTransaction(program, next =>
    applyMaterializationPlan(next, buildMaterializationPlan({ marks, guides, layout })));
}
