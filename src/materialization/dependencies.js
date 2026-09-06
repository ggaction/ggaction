import { withGuideLayoutTransaction } from "./guides/layout.js";
import {
  canDeferScaleConsumerApplication,
  getLayerScaleIds,
  getExistingMarkRematerializationStep,
  getMarkMaterializationStep,
  getScaleConsumerMarkSteps,
  getSourceDependentMarkSteps,
  reusePlannedMarkScales
} from "./marks/index.js";
import { findLayer, requireLayer } from "../selectors/layers.js";
import {
  applyMaterializationPlan as executeMaterializationPlan,
  buildMaterializationPlan
} from "./planner.js";
import { hasMaterializedLegend } from "./legends.js";
import {
  needsCanvasScaleRematerialization,
  planScaleGuideRematerialization
} from "./scaleGuideDependencies.js";
import { planLayoutRematerialization } from "./layout.js";

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

export function planLayerDataRematerialization(program, id) {
  const layer = requireLayer(program, id);
  const scaleIds = [...new Set(getLayerScaleIds(layer))];
  const markStep = getMarkMaterializationStep(program, layer);
  const scales = scaleIds.map(scale => ({
      op: "rematerializeScale",
      args: {
        id: scale,
        guides: false,
        ...(markStep === undefined ? {} : { marks: false })
      }
    }));
  const directMarks = [
    ...(markStep === undefined ? [] : [markStep]),
    ...getScaleConsumerMarkSteps(program, scaleIds)
  ];
  const marks = [
    ...directMarks,
    ...directMarks.flatMap(step => getSourceDependentMarkSteps(program, step.args.id))
  ];
  if (scales.length > 0 || marks.length > 0) {
    const guides = scaleIds.flatMap(scale =>
      planScaleGuideRematerialization(program, scale)
    );
    return buildMaterializationPlan({ scales, marks: reusePlannedMarkScales(program, marks, scaleIds), guides });
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

export function applyLayerEmptyDataView(program, id) {
  requireLayer(program, id);
  const targets = [
    id,
    ...getSourceDependentMarkSteps(program, id).map(step => step.args.id)
  ];
  let next = program;
  for (const target of new Set(targets)) {
    const graphic = next.graphicSpec.objects[target];
    if (graphic === undefined) continue;
    next = graphic.type === "collection"
      ? next.editGraphics({ target, property: "items", value: [] })
      : next.editGraphics({ target, property: "length", value: 0 });
  }
  return next;
}

export function applyDetachedScaleRematerialization(program, previousLayers) {
  const retained = new Set(program.semanticSpec.layers.flatMap(getLayerScaleIds));
  const scaleIds = [...new Set(previousLayers.flatMap(layer => {
    const current = findLayer(program, layer.id);
    const currentIds = current === undefined ? [] : getLayerScaleIds(current);
    return getLayerScaleIds(layer).filter(id => !currentIds.includes(id) && retained.has(id));
  }))];
  if (scaleIds.length === 0) return program;
  const directMarks = getScaleConsumerMarkSteps(program, scaleIds);
  return applyMaterializationPlan(program, buildMaterializationPlan({
    scales: scaleIds.map(id => ({
      op: "rematerializeScale", args: { id, guides: false, marks: false }
    })),
    marks: [
      ...directMarks,
      ...directMarks.flatMap(step => getSourceDependentMarkSteps(program, step.args.id))
    ],
    guides: scaleIds.flatMap(id => planScaleGuideRematerialization(program, id))
  }));
}

export function applyMaterializationPlan(program, plan) {
  return withGuideLayoutTransaction(program, next => executeMaterializationPlan(next, plan));
}
export { planScaleGuideRematerialization };
