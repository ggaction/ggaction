import {
  canDeferScaleConsumerApplication,
  getExistingMarkRematerializationStep,
  getMarkMaterializationStep,
  getSourceDependentMarkSteps
} from "./marks/index.js";
import { requireLayer } from "../selectors/layers.js";
import {
  applyMaterializationPlan,
  buildMaterializationPlan
} from "./planner.js";
import { hasMaterializedLegend } from "./legends.js";
import {
  needsCanvasScaleRematerialization,
  planScaleGuideRematerialization
} from "./scaleGuideDependencies.js";

function hasTitle(program) {
  return (
    program.semanticSpec.title.text !== undefined &&
    program.titleConfig !== undefined
  );
}

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
        Object.values(layer.encoding ?? {}).some(
          encoding => encoding?.scale === scale.id
        )
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
  const layout = hasTitle(program) ? [{ op: "rematerializeTitle" }] : [];
  return buildMaterializationPlan({ scales, marks, guides, layout });
}

export function planLayerDataRematerialization(program, id) {
  const layer = requireLayer(program, id);
  const scaleIds = [...new Set(
    Object.values(layer.encoding ?? {})
      .map(encoding => encoding?.scale)
      .filter(scale => scale !== undefined)
  )];
  const markStep = getMarkMaterializationStep(program, layer);
  const scales = scaleIds.map(scale => ({
      op: "rematerializeScale",
      args: {
        id: scale,
        guides: false,
        ...(markStep === undefined ? {} : { marks: false })
      }
    }));
  const marks = [
    ...(markStep === undefined ? [] : [markStep]),
    ...getSourceDependentMarkSteps(program, id)
  ];
  if (scales.length > 0 || marks.length > 0) {
    const guides = scaleIds.flatMap(scale =>
      planScaleGuideRematerialization(program, scale)
    );
    return buildMaterializationPlan({ scales, marks, guides });
  }
  const existingStep = getExistingMarkRematerializationStep(program, layer);
  return buildMaterializationPlan({
    marks: existingStep === undefined ? [] : [existingStep]
  });
}

export function applyLayerDataRematerialization(program, id) {
  return applyMaterializationPlan(
    program,
    planLayerDataRematerialization(program, id)
  );
}

export { applyMaterializationPlan } from "./planner.js";
export { planScaleGuideRematerialization };
