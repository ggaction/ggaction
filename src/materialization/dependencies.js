import { getMarkMaterializationStep } from "./marks.js";
import { requireLayer } from "../selectors/layers.js";
import {
  applyMaterializationPlan,
  buildMaterializationPlan
} from "./planner.js";
import {
  hasMaterializedLegend,
  materializedLegendUsesScale
} from "./legends.js";

function usesPositionalScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    ["x", "y", "x2", "y2", "xOffset", "theta", "radius"].some(
      channel => layer.encoding?.[channel]?.scale === id
    )
  );
}

function usesRadialScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    layer.encoding?.radius?.scale === id
  );
}

function needsCanvasScaleRematerialization(program, scale) {
  return (
    (scale.range === "auto" ||
      usesRadialScale(program, scale.id) ||
      program.semanticSpec.guides.axis?.x?.scale === scale.id ||
      program.semanticSpec.guides.axis?.y?.scale === scale.id ||
      program.semanticSpec.guides.axis?.theta?.scale === scale.id ||
      program.semanticSpec.guides.axis?.radius?.scale === scale.id ||
      program.semanticSpec.guides.grid?.horizontal?.scale === scale.id ||
      program.semanticSpec.guides.grid?.vertical?.scale === scale.id ||
      program.semanticSpec.guides.grid?.theta?.scale === scale.id ||
      program.semanticSpec.guides.grid?.radial?.scale === scale.id) &&
    program.resolvedScales[scale.id] !== undefined &&
    usesPositionalScale(program, scale.id)
  );
}

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
  const deferredPointIds = new Set(
    marks
      .filter(step => step.op === "rematerializePointMark")
      .map(step => step.args.id)
  );
  const scales = [];
  for (const scale of program.semanticSpec.scales) {
    if (needsCanvasScaleRematerialization(program, scale)) {
      const pointConsumers = program.semanticSpec.layers.filter(layer =>
        layer.mark?.type === "point" &&
        Object.values(layer.encoding ?? {}).some(
          encoding => encoding?.scale === scale.id
        )
      );
      const canDeferMarks = pointConsumers.length === 0 ||
        pointConsumers.every(layer => deferredPointIds.has(layer.id));
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

export function planScaleGuideRematerialization(program, id) {
  const guides = [];
  const objects = program.graphicSpec?.objects ?? {};
  const guideConfigs = program.guideConfigs ?? {};
  if (
    objects.xAxisLine &&
    program.semanticSpec.guides.axis?.x?.scale === id
  ) {
    guides.push({ op: "editXAxisLine" });
  }
  if (
    objects.yAxisLine &&
    program.semanticSpec.guides.axis?.y?.scale === id
  ) {
    guides.push({ op: "editYAxisLine" });
  }
  for (const channel of ["x", "y"]) {
    for (const component of ["ticks", "labels", "title"]) {
      if (guideConfigs.axis?.[channel]?.[component]?.scale === id) {
        const suffix = component[0].toUpperCase() + component.slice(1);
        guides.push({ op: `edit${channel.toUpperCase()}Axis${suffix}` });
      }
    }
  }
  if (guideConfigs.grid?.horizontal?.scale === id) {
    guides.push({ op: "rematerializeHorizontalGrid" });
  }
  if (guideConfigs.grid?.vertical?.scale === id) {
    guides.push({ op: "rematerializeVerticalGrid" });
  }
  if (guideConfigs.grid?.theta?.scale === id) {
    guides.push({ op: "rematerializeThetaGrid" });
  }
  if (guideConfigs.grid?.radial?.scale === id) {
    guides.push({ op: "rematerializeRadialGrid" });
  }
  if (materializedLegendUsesScale(program, id)) {
    guides.push({ op: "rematerializeLegend" });
  }
  return buildMaterializationPlan({ guides });
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
  const marks = markStep === undefined ? [] : [markStep];
  if (scales.length > 0 || marks.length > 0) {
    const guides = scaleIds.flatMap(scale =>
      planScaleGuideRematerialization(program, scale)
    );
    return buildMaterializationPlan({ scales, marks, guides });
  }
  return buildMaterializationPlan({ marks: layer.mark?.type === "point" &&
    program.graphicSpec.objects[layer.id] !== undefined
    ? [{ op: "rematerializePointMark", args: { id: layer.id } }]
    : [] });
}

export function applyLayerDataRematerialization(program, id) {
  return applyMaterializationPlan(
    program,
    planLayerDataRematerialization(program, id)
  );
}

export { applyMaterializationPlan } from "./planner.js";
