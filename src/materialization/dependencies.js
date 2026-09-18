import { withGuideLayoutTransaction } from "./guides/layout.js";
import {
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
import {
  planScaleGuideRematerialization
} from "./scaleGuideDependencies.js";
import { planLayoutRematerialization } from "./layout.js";
import { requireCoordinate } from "../selectors/coordinates.js";

export { planCanvasRematerialization } from "./layout.js";

export function planCoordinateRematerialization(program, target) {
  requireCoordinate(program, target);
  const layers = program.semanticSpec.layers.filter(
    layer => layer.coordinate === target
  );
  const scaleIds = [...new Set(layers.flatMap(layer => [
    ...["x", "y", "x2", "y2", "theta", "radius"].map(
      channel => layer.encoding?.[channel]?.scale
    ),
    ...(layer.encoding?.parallel?.dimensions ?? []).map(
      dimension => dimension.scale
    )
  ]).filter(id => id !== undefined))];
  const directMarks = layers
    .map(layer => getMarkMaterializationStep(program, layer))
    .filter(step => step !== undefined);
  const marks = [
    ...directMarks,
    ...directMarks.flatMap(step =>
      getSourceDependentMarkSteps(program, step.args.id)
    )
  ];
  return buildMaterializationPlan({
    scales: scaleIds.map(id => ({
      op: "rematerializeScale",
      args: { id, guides: false, marks: false }
    })),
    marks: reusePlannedMarkScales(program, marks, scaleIds),
    guides: scaleIds.flatMap(id =>
      planScaleGuideRematerialization(program, id)
    ),
    layout: planLayoutRematerialization(program)
  });
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
