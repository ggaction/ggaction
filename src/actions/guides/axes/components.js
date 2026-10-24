import { axisGraphicIds } from "../../../materialization/guides/resources.js";
import { isLabelRelativeTitleOffset } from "../../../grammar/axisTextPlacement.js";

export const AXIS_COMPONENTS = Object.freeze(["line", "ticks", "labels", "title"]);

export function axisComponentId(channel, component, axisId = channel) {
  return axisGraphicIds(channel, axisId)[AXIS_COMPONENTS.indexOf(component)];
}

export function axisComponentDisabled(args, component) {
  return args[component === "ticks" || component === "labels"
    ? "ticksAndLabels" : component] === false;
}

export function validateEnabledAxisComponents(args, operation) {
  if (AXIS_COMPONENTS.every(component => axisComponentDisabled(args, component))) {
    throw new Error(`${operation} requires at least one enabled axis component.`);
  }
}

export function hasAxisComponent(program, channel, component, axisId = channel) {
  return program.graphicSpec.objects[axisComponentId(channel, component, axisId)] !== undefined ||
    program.guideConfigs.axis?.[axisId]?.[component] !== undefined ||
    (component === "title" &&
      program.semanticSpec.guides.axis?.[axisId]?.title !== undefined);
}

export function assertRemovableAxisComponent(program, channel, component, operation, axisId = channel) {
  if (!hasAxisComponent(program, channel, component, axisId)) {
    throw new Error(`${operation}.${component} requires an existing ${channel}-axis ${component}.`);
  }
}

export function removeAxisComponent(program, channel, component, axisId = channel) {
  if (component === "labels" && isLabelRelativeTitleOffset(program.guideConfigs.axis?.[axisId]?.title?.offset) &&
      program.context.pendingRelativeTitleAxis !== axisId) {
    throw new Error("Remove the label-relative axis title together with its labels.");
  }
  const id = axisComponentId(channel, component, axisId);
  let next = program;
  if (component === "title" && next.semanticSpec.guides.axis?.[axisId]?.title !== undefined) {
    next = next.editSemantic({ property: `guide.axis.${axisId}.title`, remove: true });
  }
  if (next.graphicSpec.objects[id] !== undefined) {
    next = next.editGraphics({ target: id, remove: true });
  }
  return next._withoutMaterializationConfig(["guides", "axis", axisId, component]);
}
