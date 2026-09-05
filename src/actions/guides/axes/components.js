import { axisGraphicIds } from "../../../materialization/guides/resources.js";

export const AXIS_COMPONENTS = Object.freeze(["line", "ticks", "labels", "title"]);

export function axisComponentId(channel, component) {
  return axisGraphicIds(channel)[AXIS_COMPONENTS.indexOf(component)];
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

export function hasAxisComponent(program, channel, component) {
  return program.graphicSpec.objects[axisComponentId(channel, component)] !== undefined ||
    program.guideConfigs.axis?.[channel]?.[component] !== undefined ||
    (component === "title" &&
      program.semanticSpec.guides.axis?.[channel]?.title !== undefined);
}

export function assertRemovableAxisComponent(program, channel, component, operation) {
  if (!hasAxisComponent(program, channel, component)) {
    throw new Error(`${operation}.${component} requires an existing ${channel}-axis ${component}.`);
  }
}

export function removeAxisComponent(program, channel, component) {
  const id = axisComponentId(channel, component);
  let next = program;
  if (component === "title" && next.semanticSpec.guides.axis?.[channel]?.title !== undefined) {
    next = next.editSemantic({ property: `guide.axis.${channel}.title`, remove: true });
  }
  if (next.graphicSpec.objects[id] !== undefined) {
    next = next.editGraphics({ target: id, remove: true });
  }
  return next._withoutMaterializationConfig(["guides", "axis", channel, component]);
}
