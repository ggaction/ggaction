import { action } from "../../../../core/action.js";
import { resolvePolarGuideResources } from "../resolve.js";
import {
  AXIS_COMPONENTS,
  assertRemovableAxisComponent,
  hasAxisComponent,
  removeAxisComponent,
  validateEnabledAxisComponents
} from "../../axes/components.js";
import {
  LABEL_EDIT_OPTIONS,
  LINE_EDIT_OPTIONS,
  prefix,
  resolveAngle,
  TICK_EDIT_OPTIONS,
  TITLE_EDIT_OPTIONS,
  validateAngle,
  validateModeOptions,
  validateObject
} from "./shared.js";

const AXIS_OPTIONS = Object.freeze([
  "scale", "coordinate", "angle", "line", "ticksAndLabels", "title"
]);
const TICK_GROUP_OPTIONS = Object.freeze([
  "count", "values", "ticks", "labels"
]);
const AXIS_EDIT_OPTIONS = Object.freeze([
  "angle", "line", "ticks", "labels", "ticksAndLabels", "title"
]);

export function validatePolarAxisArgs(kind, args, operation) {
  validateObject(args, kind === "theta"
    ? AXIS_OPTIONS.filter(option => option !== "angle")
    : AXIS_OPTIONS, operation);
  validateEnabledAxisComponents(args, operation);
  if (Object.hasOwn(args, "line") && args.line !== false) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticksAndLabels") && args.ticksAndLabels !== false) {
    validateObject(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
    validateModeOptions(args.ticksAndLabels, `${operation}.ticksAndLabels`);
    if (Object.hasOwn(args.ticksAndLabels, "ticks")) {
      validateObject(
        args.ticksAndLabels.ticks,
        ["length", "color", "lineWidth"],
        `${operation}.ticksAndLabels.ticks`
      );
    }
    if (Object.hasOwn(args.ticksAndLabels, "labels")) {
      validateObject(
        args.ticksAndLabels.labels,
        LABEL_EDIT_OPTIONS.filter(key => !["count", "values"].includes(key)),
        `${operation}.ticksAndLabels.labels`
      );
    }
  }
  if (Object.hasOwn(args, "title")) {
    if (args.title !== false) {
      validateObject(
        args.title,
        kind === "theta"
          ? TITLE_EDIT_OPTIONS.filter(option => option !== "position")
          : TITLE_EDIT_OPTIONS,
        `${operation}.title`
      );
    }
  }
}

function makeCreateAxis(kind) {
  const operation = `create${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Create the complete Polar ${kind} axis.`
  }, function (args = {}) {
    validatePolarAxisArgs(kind, args, operation);
    const resources = resolvePolarGuideResources(this, kind, args, operation);
    const angle = resolveAngle(this, kind, args);
    const shared = {
      scale: resources.scale,
      coordinate: resources.coordinate,
      ...(kind === "radius" ? { angle } : {})
    };
    const group = args.ticksAndLabels ?? {};
    const mode = {
      ...(Object.hasOwn(group, "count") ? { count: group.count } : {}),
      ...(Object.hasOwn(group, "values") ? { values: group.values } : {})
    };
    let next = this;
    if (args.line !== false) {
      next = next[`create${prefix(kind)}AxisLine`]({ ...shared, ...(args.line ?? {}) });
    }
    if (args.ticksAndLabels !== false) {
      next = next[`create${prefix(kind)}AxisTicks`]({
        ...shared, ...mode, ...(group.ticks ?? {})
      })[`create${prefix(kind)}AxisLabels`]({
        ...shared, ...mode, ...(group.labels ?? {})
      });
    }
    return args.title === false
      ? next
      : next[`create${prefix(kind)}AxisTitle`]({
          ...shared,
          ...(args.title ?? {})
        });
  });
}

function validateAxisEditArgs(kind, args, operation) {
  validateObject(
    args,
    kind === "theta"
      ? AXIS_EDIT_OPTIONS.filter(option => option !== "angle")
      : AXIS_EDIT_OPTIONS,
    operation
  );
  if (Object.keys(args).length === 0) {
    throw new Error(`${operation} requires at least one axis change.`);
  }
  if (Object.hasOwn(args, "angle")) validateAngle(args.angle);
  if (Object.hasOwn(args, "line") && args.line !== false) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticks") && args.ticks !== false) {
    validateObject(args.ticks, TICK_EDIT_OPTIONS, `${operation}.ticks`);
    validateModeOptions(args.ticks, `${operation}.ticks`);
  }
  if (Object.hasOwn(args, "labels") && args.labels !== false) {
    validateObject(args.labels, LABEL_EDIT_OPTIONS, `${operation}.labels`);
    validateModeOptions(args.labels, `${operation}.labels`);
  }
  if (args.ticksAndLabels !== undefined &&
      (args.ticks !== undefined || args.labels !== undefined)) {
    throw new Error(`${operation} cannot combine ticksAndLabels with ticks or labels.`);
  }
  if (Object.hasOwn(args, "ticksAndLabels") && args.ticksAndLabels !== false) {
    validateObject(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
    validateModeOptions(args.ticksAndLabels, `${operation}.ticksAndLabels`);
    if (args.ticksAndLabels.ticks !== undefined) {
      validateObject(
        args.ticksAndLabels.ticks,
        ["length", "color", "lineWidth"],
        `${operation}.ticksAndLabels.ticks`
      );
    }
    if (args.ticksAndLabels.labels !== undefined) {
      validateObject(
        args.ticksAndLabels.labels,
        LABEL_EDIT_OPTIONS.filter(key => !["count", "values"].includes(key)),
        `${operation}.ticksAndLabels.labels`
      );
    }
  }
  if (Object.hasOwn(args, "title") && args.title !== false) {
    validateObject(
      args.title,
      kind === "theta"
        ? TITLE_EDIT_OPTIONS.filter(option => option !== "position")
        : TITLE_EDIT_OPTIONS,
      `${operation}.title`
    );
  }
}

function applyAxisEdit(program, kind, args) {
  const angleChanged = Object.hasOwn(args, "angle");
  let next = angleChanged
    ? program._withGuideConfig("radius", "layout", { angle: args.angle })
    : program;
  const edit = (component, options) => {
    if (options === false) {
      next = removeAxisComponent(next, kind, component);
    } else if (options !== undefined || angleChanged && hasAxisComponent(next, kind, component)) {
      next = next[`edit${prefix(kind)}Axis${component[0].toUpperCase() + component.slice(1)}`](options ?? {});
    }
  };
  edit("line", args.line);
  if (args.ticksAndLabels === false) {
    edit("ticks", false);
    edit("labels", false);
  } else if (args.ticksAndLabels !== undefined) {
    const group = args.ticksAndLabels;
    const mode = {
      ...(Object.hasOwn(group, "count") ? { count: group.count } : {}),
      ...(Object.hasOwn(group, "values") ? { values: group.values } : {})
    };
    edit("ticks", { ...mode, ...(group.ticks ?? {}) });
    edit("labels", { ...mode, ...(group.labels ?? {}) });
  } else {
    edit("ticks", args.ticks);
    edit("labels", args.labels);
  }
  edit("title", args.title);
  if (!AXIS_COMPONENTS.some(component => hasAxisComponent(next, kind, component))) {
    next = next[`remove${prefix(kind)}Axis`]();
  }
  return next;
}

function makeEditAxis(kind) {
  const operation = `edit${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Edit selected Polar ${kind}-axis components.`
  }, function (args = {}) {
    validateAxisEditArgs(kind, args, operation);
    if (!AXIS_COMPONENTS.some(component => hasAxisComponent(this, kind, component))) {
      throw new Error(`${operation} requires an existing ${kind}-axis component.`);
    }
    for (const component of AXIS_COMPONENTS) {
      if (args[component] === false ||
          args.ticksAndLabels === false && ["ticks", "labels"].includes(component)) {
        assertRemovableAxisComponent(this, kind, component, operation);
      }
    }
    // Validate the whole proposal on an immutable branch before returning changes.
    applyAxisEdit(this, kind, args);
    return applyAxisEdit(this, kind, args);
  });
}

export const createThetaAxis = makeCreateAxis("theta");
export const createRadialAxis = makeCreateAxis("radius");
export const editThetaAxis = makeEditAxis("theta");
export const editRadialAxis = makeEditAxis("radius");
