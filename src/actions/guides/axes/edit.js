import { withGuideLayoutValidation } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateKeys, validateOptionObject } from "../../../core/validation.js";

import {
  AXIS_COMPONENTS,
  axisComponentId as graphicId,
  hasAxisComponent as hasComponent,
  assertRemovableAxisComponent as assertRemovable,
  removeAxisComponent as removeComponent
} from "./components.js";

const OPTIONS = Object.freeze([
  "position", "line", "ticks", "labels", "ticksAndLabels", "title"
]);
const LINE_OPTIONS = Object.freeze(["color", "lineWidth"]);
const TICK_OPTIONS = Object.freeze([
  "count", "values", "length", "color", "lineWidth"
]);
const LABEL_OPTIONS = Object.freeze([
  "count", "values", "offset", "format", "color", "fontSize",
  "fontFamily", "fontWeight", "rotation", "maxWidth", "wrap",
  "lineHeight", "overlap"
]);
const GROUP_OPTIONS = Object.freeze(["count", "values", "ticks", "labels"]);
const TITLE_OPTIONS = Object.freeze([
  "text", "at", "offset", "rotation", "color", "fontSize",
  "fontFamily", "fontWeight"
]);

function validateNested(args, key, options, operation, { allowFalse = false } = {}) {
  if (!Object.hasOwn(args, key)) return;
  if (allowFalse && args[key] === false) return;
  if (!isPlainObject(args[key])) {
    const accepted = allowFalse ? "false or a plain object" : "a plain object";
    throw new TypeError(`${operation}.${key} must be ${accepted}.`);
  }
  validateKeys(args[key], options, `${operation}.${key}`);
}

function validateArgs(args, operation) {
  validateOptionObject(args, OPTIONS, operation, {
    allowEmpty: false,
    emptyMessage: `${operation} requires at least one axis change.`,
    emptyError: Error
  });
  const removable = { allowFalse: true };
  validateNested(args, "line", LINE_OPTIONS, operation, removable);
  validateNested(args, "ticks", TICK_OPTIONS, operation, removable);
  validateNested(args, "labels", LABEL_OPTIONS, operation, removable);
  validateNested(args, "ticksAndLabels", GROUP_OPTIONS, operation, removable);
  validateNested(args, "title", TITLE_OPTIONS, operation, removable);
  if (args.ticksAndLabels !== undefined && (
    args.ticks !== undefined || args.labels !== undefined
  )) {
    throw new Error(
      `${operation} cannot combine ticksAndLabels with ticks or labels.`
    );
  }
  if (args.ticksAndLabels !== false && args.ticksAndLabels?.ticks !== undefined) {
    validateNested(args.ticksAndLabels, "ticks", ["length", "color", "lineWidth"], `${operation}.ticksAndLabels`);
  }
  if (args.ticksAndLabels !== false && args.ticksAndLabels?.labels !== undefined) {
    validateNested(args.ticksAndLabels, "labels", [
      "offset", "format", "color", "fontSize", "fontFamily", "fontWeight",
      "rotation", "maxWidth", "wrap", "lineHeight", "overlap"
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
    title: `edit${prefix}AxisTitle`,
    remove: `remove${prefix}Axis`
  };
}

function buildPlan(program, channel, args, operation) {
  const shared = Object.hasOwn(args, "position")
    ? { position: args.position }
    : {};
  const plan = [];
  const addLeaf = (component, edit) => {
    const value = args[component];
    if (value === false) {
      assertRemovable(program, channel, component, operation.operation);
      plan.push({ kind: "remove", component });
    } else if (value !== undefined) {
      plan.push({ kind: "edit", operation: edit, args: { ...shared, ...value } });
    } else if (args.position !== undefined && hasComponent(program, channel, component)) {
      plan.push({ kind: "edit", operation: edit, args: shared });
    }
  };

  addLeaf("line", operation.line);
  if (args.ticksAndLabels === false) {
    assertRemovable(program, channel, "ticks", operation.operation);
    assertRemovable(program, channel, "labels", operation.operation);
    plan.push(
      { kind: "remove", component: "ticks" },
      { kind: "remove", component: "labels" }
    );
  } else if (args.ticksAndLabels !== undefined) {
    plan.push({
      kind: "edit",
      operation: operation.group,
      args: { ...shared, ...args.ticksAndLabels }
    });
  } else {
    addLeaf("ticks", operation.ticks);
    addLeaf("labels", operation.labels);
  }
  addLeaf("title", operation.title);

  if (plan.length === 0) {
    throw new Error(`${operation.operation} requires an existing ${channel}-axis component.`);
  }
  return plan;
}

function applyPlan(program, channel, plan, operation) {
  let next = program;
  for (const step of plan) {
    next = step.kind === "remove"
      ? removeComponent(next, channel, step.component)
      : next[step.operation](step.args);
  }

  const hasRetainedGraphic = AXIS_COMPONENTS.some(
    component => next.graphicSpec.objects[graphicId(channel, component)] !== undefined
  );
  if (!hasRetainedGraphic && (
    next.semanticSpec.guides.axis?.[channel] !== undefined ||
    next.guideConfigs.axis?.[channel] !== undefined
  )) {
    next = next[operation.remove]();
  }
  return next;
}

function makeEditAxis(channel) {
  const operation = names(channel);
  return action(
    {
      op: operation.operation,
      description: `Edit selected existing ${channel}-axis components.`
    },
    withGuideLayoutValidation(function (args = {}) {
      validateArgs(args, operation.operation);
      const plan = buildPlan(this, channel, args, operation);

      // Run the complete proposal against an immutable speculative branch so a
      // later leaf failure cannot begin the returned action trace or state.
      applyPlan(this, channel, plan, operation);
      return applyPlan(this, channel, plan, operation);
    })
  );
}

const editXAxis = makeEditAxis("x");
const editYAxis = makeEditAxis("y");

export function registerCompleteAxisEditActions(ProgramClass) {
  ProgramClass.prototype.editXAxis = editXAxis;
  ProgramClass.prototype.editYAxis = editYAxis;
}
