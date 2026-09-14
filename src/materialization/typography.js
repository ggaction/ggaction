import { applyMaterializationPlan, buildMaterializationPlan } from "./planner.js";
import { withGuideLayoutTransaction } from "./guides/layout.js";

// Font tokens and measured-width profiles invalidate the same existing owners.
// Incomplete text remains incomplete until its own prerequisites are authored.
export function rematerializeTypography(program) {
  if (program.compositionSpec !== undefined) {
    return program.compositionSpec.type === "facet" ? program.materializeComposition() : program;
  }
  const exists = (id, op) => program.graphicSpec.objects[id] !== undefined && typeof program[op] === "function";
  const marks = program.semanticSpec.layers
    .filter(layer => layer.mark?.type === "text" && exists(layer.id, "rematerializeTextMark"))
    .map(layer => ({ op: "rematerializeTextMark", args: { id: layer.id } }));
  const guides = [];
  for (const [id, op] of [
    ["xAxisLabels", "editXAxisLabels"], ["yAxisLabels", "editYAxisLabels"],
    ["xAxisTitle", "editXAxisTitle"], ["yAxisTitle", "editYAxisTitle"],
    ["thetaAxisLabels", "editThetaAxisLabels"], ["radialAxisLabels", "editRadialAxisLabels"],
    ["thetaAxisTitle", "editThetaAxisTitle"], ["radialAxisTitle", "editRadialAxisTitle"]
  ]) if (exists(id, op)) guides.push({ op });
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
