import { action } from "../../../../core/action.js";
import { polarGuideNames, resolvePolarGuideResources } from "../resolve.js";
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

function validateAxisArgs(kind, args, operation) {
  validateObject(args, AXIS_OPTIONS, operation);
  if (Object.hasOwn(args, "line")) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticksAndLabels")) {
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
    validateObject(
      args.title,
      kind === "theta"
        ? TITLE_EDIT_OPTIONS.filter(option => option !== "position")
        : TITLE_EDIT_OPTIONS,
      `${operation}.title`
    );
  }
}

function makeCreateAxis(kind) {
  const operation = `create${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Create the complete Polar ${kind} axis.`
  }, function (args = {}) {
    validateAxisArgs(kind, args, operation);
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
    if (kind === "radius") {
      next = next._withGuideConfig("radius", "layout", { angle });
    }
    return next
      [`create${prefix(kind)}AxisLine`]({ ...shared, ...(args.line ?? {}) })
      [`create${prefix(kind)}AxisTicks`]({
        ...shared,
        ...mode,
        ...(group.ticks ?? {})
      })
      [`create${prefix(kind)}AxisLabels`]({
        ...shared,
        ...mode,
        ...(group.labels ?? {})
      })
      [`create${prefix(kind)}AxisTitle`]({
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
  if (Object.hasOwn(args, "line")) {
    validateObject(args.line, LINE_EDIT_OPTIONS, `${operation}.line`);
  }
  if (Object.hasOwn(args, "ticks")) {
    validateObject(args.ticks, TICK_EDIT_OPTIONS, `${operation}.ticks`);
    validateModeOptions(args.ticks, `${operation}.ticks`);
  }
  if (Object.hasOwn(args, "labels")) {
    validateObject(args.labels, LABEL_EDIT_OPTIONS, `${operation}.labels`);
    validateModeOptions(args.labels, `${operation}.labels`);
  }
  if (Object.hasOwn(args, "ticksAndLabels")) {
    validateObject(
      args.ticksAndLabels,
      TICK_GROUP_OPTIONS,
      `${operation}.ticksAndLabels`
    );
    validateModeOptions(args.ticksAndLabels, `${operation}.ticksAndLabels`);
    if (args.ticks !== undefined || args.labels !== undefined) {
      throw new Error(
        `${operation} cannot combine ticksAndLabels with ticks or labels.`
      );
    }
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
  if (Object.hasOwn(args, "title")) {
    validateObject(
      args.title,
      kind === "theta"
        ? TITLE_EDIT_OPTIONS.filter(option => option !== "position")
        : TITLE_EDIT_OPTIONS,
      `${operation}.title`
    );
  }
}

function makeEditAxis(kind) {
  const operation = `edit${prefix(kind)}Axis`;
  return action({
    op: operation,
    description: `Edit selected Polar ${kind}-axis components.`
  }, function (args = {}) {
    validateAxisEditArgs(kind, args, operation);
    const names = polarGuideNames(kind);
    const angleChanged = Object.hasOwn(args, "angle");
    let next = angleChanged
      ? this._withGuideConfig("radius", "layout", { angle: args.angle })
      : this;
    const has = component =>
      next.graphicSpec.objects[names[component]] !== undefined;
    if (args.line !== undefined || (angleChanged && has("line"))) {
      next = next[`edit${prefix(kind)}AxisLine`](args.line ?? {});
    }
    if (args.ticksAndLabels !== undefined) {
      const group = args.ticksAndLabels;
      const mode = {
        ...(Object.hasOwn(group, "count") ? { count: group.count } : {}),
        ...(Object.hasOwn(group, "values") ? { values: group.values } : {})
      };
      next = next[`edit${prefix(kind)}AxisTicks`]({
        ...mode,
        ...(group.ticks ?? {})
      });
      next = next[`edit${prefix(kind)}AxisLabels`]({
        ...mode,
        ...(group.labels ?? {})
      });
    } else {
      if (args.ticks !== undefined || (angleChanged && has("ticks"))) {
        next = next[`edit${prefix(kind)}AxisTicks`](args.ticks ?? {});
      }
      if (args.labels !== undefined || (angleChanged && has("labels"))) {
        next = next[`edit${prefix(kind)}AxisLabels`](args.labels ?? {});
      }
    }
    if (args.title !== undefined || (angleChanged && has("title"))) {
      next = next[`edit${prefix(kind)}AxisTitle`](args.title ?? {});
    }
    return next;
  });
}

export const createThetaAxis = makeCreateAxis("theta");
export const createRadialAxis = makeCreateAxis("radius");
export const editThetaAxis = makeEditAxis("theta");
export const editRadialAxis = makeEditAxis("radius");
