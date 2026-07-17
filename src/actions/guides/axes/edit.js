import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateKeys, validateOptionObject } from "../../../core/validation.js";

const OPTIONS = Object.freeze([
  "position", "line", "ticks", "labels", "ticksAndLabels", "title"
]);
const LINE_OPTIONS = Object.freeze(["color", "lineWidth"]);
const TICK_OPTIONS = Object.freeze([
  "count", "values", "length", "color", "lineWidth"
]);
const LABEL_OPTIONS = Object.freeze([
  "count", "values", "offset", "format", "color", "fontSize",
  "fontFamily", "fontWeight"
]);
const GROUP_OPTIONS = Object.freeze(["count", "values", "ticks", "labels"]);
const TITLE_OPTIONS = Object.freeze([
  "text", "at", "offset", "rotation", "color", "fontSize",
  "fontFamily", "fontWeight"
]);

function validateNested(args, key, options, operation) {
  if (!Object.hasOwn(args, key)) return;
  if (!isPlainObject(args[key])) {
    throw new TypeError(`${operation}.${key} must be a plain object.`);
  }
  validateKeys(args[key], options, `${operation}.${key}`);
}

function validateArgs(args, operation) {
  validateOptionObject(args, OPTIONS, operation, {
    allowEmpty: false,
    emptyMessage: `${operation} requires at least one axis change.`,
    emptyError: Error
  });
  validateNested(args, "line", LINE_OPTIONS, operation);
  validateNested(args, "ticks", TICK_OPTIONS, operation);
  validateNested(args, "labels", LABEL_OPTIONS, operation);
  validateNested(args, "ticksAndLabels", GROUP_OPTIONS, operation);
  validateNested(args, "title", TITLE_OPTIONS, operation);
  if (args.ticksAndLabels !== undefined && (
    args.ticks !== undefined || args.labels !== undefined
  )) {
    throw new Error(
      `${operation} cannot combine ticksAndLabels with ticks or labels.`
    );
  }
  if (args.ticksAndLabels?.ticks !== undefined) {
    validateNested(args.ticksAndLabels, "ticks", ["length", "color", "lineWidth"], `${operation}.ticksAndLabels`);
  }
  if (args.ticksAndLabels?.labels !== undefined) {
    validateNested(args.ticksAndLabels, "labels", [
      "offset", "format", "color", "fontSize", "fontFamily", "fontWeight"
    ], `${operation}.ticksAndLabels`);
  }
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return {
    operation: `edit${prefix}Axis`,
    line: `edit${prefix}AxisLine`,
    ticks: `edit${prefix}AxisTicks`,
    labels: `edit${prefix}AxisLabels`,
    group: `edit${prefix}AxisTicksAndLabels`,
    title: `edit${prefix}AxisTitle`
  };
}

function makeEditAxis(channel) {
  const operation = names(channel);
  return action(
    {
      op: operation.operation,
      description: `Edit selected existing ${channel}-axis components.`
    },
    function (args = {}) {
      validateArgs(args, operation.operation);
      const shared = Object.hasOwn(args, "position")
        ? { position: args.position }
        : {};
      const has = id => this.graphicSpec.objects[id] !== undefined;
      let next = this;

      if (args.line !== undefined || (args.position !== undefined && has(`${channel}AxisLine`))) {
        next = next[operation.line]({ ...shared, ...(args.line ?? {}) });
      }

      if (args.ticksAndLabels !== undefined) {
        next = next[operation.group]({
          ...shared,
          ...args.ticksAndLabels
        });
      } else if (args.ticks !== undefined || args.labels !== undefined) {
        if (args.ticks !== undefined) {
          next = next[operation.ticks]({ ...shared, ...args.ticks });
        }
        if (args.labels !== undefined) {
          next = next[operation.labels]({ ...shared, ...args.labels });
        }
      } else if (args.position !== undefined) {
        const hasTicks = has(`${channel}AxisTicks`);
        const hasLabels = has(`${channel}AxisLabels`);
        if (hasTicks && hasLabels) {
          next = next[operation.group](shared);
        } else {
          if (hasTicks) next = next[operation.ticks](shared);
          if (hasLabels) next = next[operation.labels](shared);
        }
      }

      if (args.title !== undefined || (args.position !== undefined && has(`${channel}AxisTitle`))) {
        next = next[operation.title]({ ...shared, ...(args.title ?? {}) });
      }
      return next;
    }
  );
}

const editXAxis = makeEditAxis("x");
const editYAxis = makeEditAxis("y");

export function registerCompleteAxisEditActions(ProgramClass) {
  ProgramClass.prototype.editXAxis = editXAxis;
  ProgramClass.prototype.editYAxis = editYAxis;
}
