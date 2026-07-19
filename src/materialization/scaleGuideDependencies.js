import { POSITION_ENCODING_CHANNELS } from "../core/vocabulary.js";
import { materializedLegendUsesScale } from "./legends.js";
import { buildMaterializationPlan } from "./planner.js";

const CARTESIAN_AXES = Object.freeze([
  Object.freeze({ channel: "x", prefix: "X", lineObject: "xAxisLine" }),
  Object.freeze({ channel: "y", prefix: "Y", lineObject: "yAxisLine" })
]);
const POLAR_AXES = Object.freeze([
  Object.freeze({ channel: "theta", prefix: "Theta" }),
  Object.freeze({ channel: "radius", prefix: "Radial" })
]);
const GRIDS = Object.freeze([
  Object.freeze({ role: "horizontal", op: "rematerializeHorizontalGrid" }),
  Object.freeze({ role: "vertical", op: "rematerializeVerticalGrid" }),
  Object.freeze({ role: "theta", op: "rematerializeThetaGrid" }),
  Object.freeze({ role: "radial", op: "rematerializeRadialGrid" })
]);

function usesPositionalScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    POSITION_ENCODING_CHANNELS.some(
      channel => layer.encoding?.[channel]?.scale === id
    )
  );
}

function usesRadialScale(program, id) {
  return program.semanticSpec.layers.some(layer =>
    layer.encoding?.radius?.scale === id
  );
}

function semanticGuideUsesScale(program, id) {
  return [
    ...CARTESIAN_AXES.map(({ channel }) =>
      program.semanticSpec.guides.axis?.[channel]
    ),
    ...POLAR_AXES.map(({ channel }) =>
      program.semanticSpec.guides.axis?.[channel]
    ),
    ...GRIDS.map(({ role }) => program.semanticSpec.guides.grid?.[role])
  ].some(guide => guide?.scale === id);
}

export function needsCanvasScaleRematerialization(program, scale) {
  return (
    (scale.range === "auto" ||
      usesRadialScale(program, scale.id) ||
      semanticGuideUsesScale(program, scale.id)) &&
    program.resolvedScales[scale.id] !== undefined &&
    usesPositionalScale(program, scale.id)
  );
}

function componentEditOperation(prefix, component) {
  const suffix = component[0].toUpperCase() + component.slice(1);
  return `edit${prefix}Axis${suffix}`;
}

export function planScaleGuideRematerialization(program, id) {
  const guides = [];
  const objects = program.graphicSpec?.objects ?? {};
  const guideConfigs = program.guideConfigs ?? {};
  for (const axis of CARTESIAN_AXES) {
    if (
      objects[axis.lineObject] &&
      program.semanticSpec.guides.axis?.[axis.channel]?.scale === id
    ) {
      guides.push({ op: componentEditOperation(axis.prefix, "line") });
    }
    for (const component of ["ticks", "labels", "title"]) {
      if (guideConfigs.axis?.[axis.channel]?.[component]?.scale === id) {
        guides.push({ op: componentEditOperation(axis.prefix, component) });
      }
    }
  }
  for (const axis of POLAR_AXES) {
    for (const component of ["line", "ticks", "labels", "title"]) {
      if (guideConfigs.axis?.[axis.channel]?.[component]?.scale === id) {
        guides.push({ op: componentEditOperation(axis.prefix, component) });
      }
    }
  }
  for (const grid of GRIDS) {
    if (guideConfigs.grid?.[grid.role]?.scale === id) {
      guides.push({ op: grid.op });
    }
  }
  if (materializedLegendUsesScale(program, id)) {
    guides.push({ op: "rematerializeLegend" });
  }
  return buildMaterializationPlan({ guides });
}
