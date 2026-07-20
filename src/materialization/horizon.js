import { getMarkMaterializationStep } from "./marks/index.js";
import { buildMaterializationPlan } from "./planner.js";
import { requireLayer } from "../selectors/layers.js";

export function planHorizonRematerialization(program, target) {
  const layer = requireLayer(
    program,
    target,
    `Unknown Horizon materialization target "${target}"`
  );
  const scaleIds = new Set([
    layer.encoding?.x?.scale,
    layer.encoding?.y?.scale,
    layer.encoding?.color?.scale
  ].filter(Boolean));
  const ordered = [
    layer,
    ...program.semanticSpec.layers.filter(candidate => candidate.id !== target)
  ];
  const marks = ordered.flatMap(candidate => {
    const consumesScale = Object.values(candidate.encoding ?? {}).some(
      encoding => scaleIds.has(encoding?.scale)
    );
    if (!consumesScale) return [];
    const step = getMarkMaterializationStep(program, candidate);
    return step === undefined ? [] : [step];
  });
  return buildMaterializationPlan({ marks });
}
