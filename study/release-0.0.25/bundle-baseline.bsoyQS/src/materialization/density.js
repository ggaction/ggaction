import { getMarkMaterializationStep } from "./marks/index.js";
import { requireLayer } from "../selectors/layers.js";
import { buildMaterializationPlan } from "./planner.js";

export function planDensityRematerialization(program, target) {
  const layer = requireLayer(
    program,
    target,
    `Unknown density materialization target "${target}"`
  );
  const scaleIds = new Set([
    layer.encoding?.x?.scale,
    layer.encoding?.y?.scale
  ].filter(Boolean));
  const orderedLayers = [
    layer,
    ...program.semanticSpec.layers.filter(candidate => candidate.id !== target)
  ];
  const plan = [];
  for (const candidate of orderedLayers) {
    const usesAffectedScale = Object.values(candidate.encoding ?? {}).some(
      encoding => scaleIds.has(encoding?.scale)
    );
    if (!usesAffectedScale) continue;
    const step = getMarkMaterializationStep(program, candidate);
    if (step !== undefined) plan.push(step);
  }
  return buildMaterializationPlan({ marks: plan });
}
