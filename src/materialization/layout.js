import { canDeferScaleConsumerApplication, getLayerScaleIds, getMarkMaterializationStep } from "./marks/index.js";
import { buildMaterializationPlan } from "./planner.js";
import { hasMaterializedLegend } from "./legends.js";
import { needsCanvasScaleRematerialization, planScaleGuideRematerialization } from "./scaleGuideDependencies.js";

export function planCanvasRematerialization(program) {
  const marks = [];
  for (const layer of program.semanticSpec.layers) {
    const step = getMarkMaterializationStep(program, layer);
    if (step !== undefined) marks.push(step);
  }
  const deferredMarkIds = new Set(
    marks
      .map(step => step.args.id)
  );
  const scales = [];
  for (const scale of program.semanticSpec.scales) {
    if (needsCanvasScaleRematerialization(program, scale)) {
      const deferredConsumers = program.semanticSpec.layers.filter(layer =>
        canDeferScaleConsumerApplication(layer) &&
        getLayerScaleIds(layer).includes(scale.id)
      );
      const canDeferMarks = deferredConsumers.length === 0 ||
        deferredConsumers.every(layer => deferredMarkIds.has(layer.id));
      scales.push({
        op: "rematerializeScale",
        args: {
          id: scale.id,
          guides: false,
          ...(canDeferMarks ? { marks: false } : {})
        }
      });
    }
  }
  const guides = program.semanticSpec.scales.flatMap(scale =>
    needsCanvasScaleRematerialization(program, scale)
      ? planScaleGuideRematerialization(program, scale.id)
      : []
  );
  if (hasMaterializedLegend(program)) {
    guides.push({ op: "rematerializeLegend" });
  }
  const layout = planLayoutRematerialization(program);
  return buildMaterializationPlan({ scales, marks, guides, layout });
}


const LAYOUT_CONSUMER_POLICIES = Object.freeze([
  Object.freeze({
    applies(program) {
      return program.semanticSpec.title.text !== undefined &&
        program.titleConfig !== undefined;
    },
    step: Object.freeze({ op: "rematerializeTitle" })
  })
]);

export function planLayoutRematerialization(program) {
  return LAYOUT_CONSUMER_POLICIES.flatMap(policy =>
    policy.applies(program) ? [policy.step] : []
  );
}
