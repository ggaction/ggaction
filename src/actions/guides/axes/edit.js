import { resolveAxisTickEditConfig } from "./ticks.js";
import { resolveAxisLabelEditConfig } from "./labels.js";
import { validateAxisTickGroupEditConfig } from "./tickGroups.js";
import { selectCartesianAxis, axisTargetArgs, assertCartesianAxisSideAvailable } from "../../../selectors/axes.js";
import { validateAxisPosition, resolveAxisFrameConfig } from "./policy.js";
import { withGuideLayoutValidation, withPendingRelativeAxisTitle } from "../../../materialization/guides/layout.js";
import { action } from "../../../core/action.js";
import { applyMaterializationPlan } from "../../../materialization/planner.js";
import { isPlainObject } from "../../../core/immutable.js";
import { isLabelRelativeTitleOffset } from "../../../grammar/axisTextPlacement.js";
import { validateKeys, validateOptionObject, validateNonNegativeFinite } from "../../../core/validation.js";

import {
  AXIS_COMPONENTS,
  axisComponentId as graphicId,
  hasAxisComponent as hasComponent,
  assertRemovableAxisComponent as assertRemovable,
  removeAxisComponent as removeComponent
} from "./components.js";

const OPTIONS = Object.freeze([
  "target", "position", "line", "ticks", "labels", "ticksAndLabels", "title", "offset", "underlay"
]);
const LINE_OPTIONS = Object.freeze(["color", "lineWidth"]);
const TICK_OPTIONS = Object.freeze([
  "count", "values", "rounding", "length", "color", "lineWidth", "alongOffset", "strokeDash", "strokeDashMap"
]);
const LABEL_OPTIONS = Object.freeze([
  "count", "values", "rounding", "offset", "format", "color", "fontSize",
  "fontFamily", "fontWeight", "rotation", "maxWidth", "wrap",
  "lineHeight", "overlap", "alongOffset", "labelMap", "flush", "flushThreshold", "colorMap", "align"
]);
const GROUP_OPTIONS = Object.freeze(["count", "values", "rounding", "ticks", "labels"]);
const TITLE_OPTIONS = Object.freeze([
  "text", "at", "offset", "rotation", "color", "fontSize",
  "fontFamily", "fontWeight", "alongOffset", "align", "baseline", "overlap"
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
  if (Object.hasOwn(args, "offset")) validateNonNegativeFinite(args.offset, "Axis frame offset");
  resolveAxisFrameConfig(undefined, args);
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
    validateNested(args.ticksAndLabels, "ticks", ["length", "color", "lineWidth", "alongOffset", "strokeDash", "strokeDashMap"], `${operation}.ticksAndLabels`);
  }
  if (args.ticksAndLabels !== false && args.ticksAndLabels?.labels !== undefined) {
    validateNested(args.ticksAndLabels, "labels", [
      "offset", "format", "color", "fontSize", "fontFamily", "fontWeight",
      "rotation", "maxWidth", "wrap", "lineHeight", "overlap", "alongOffset", "labelMap", "flush", "flushThreshold", "colorMap", "align"
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

function validateNestedEditConfig(program, channel, args, axisId) {
  if (isPlainObject(args.ticks)) resolveAxisTickEditConfig(program, channel, args.ticks, axisId);
  if (isPlainObject(args.labels)) resolveAxisLabelEditConfig(program, channel, args.labels, axisId);
  if (isPlainObject(args.ticksAndLabels)) {
    validateAxisTickGroupEditConfig(program, channel, args.ticksAndLabels, axisId);
  }
}

function buildPlan(program, channel, args, operation, axisId = channel) {
  const shared = { ...axisTargetArgs(axisId, channel),
    ...(Object.hasOwn(args, "position") ? { position: args.position } : {}) };
  const plan = [];
  const addLeaf = (component, edit) => {
    const value = args[component];
    if (value === false) {
      assertRemovable(program, channel, component, operation.operation, axisId);
      plan.push({ kind: "remove", component });
    } else if (value !== undefined) {
      plan.push({ kind: "edit", operation: edit, args: { ...shared, ...value } });
    } else if ((args.position !== undefined || Object.hasOwn(args, "offset") || Object.hasOwn(args, "underlay")) && hasComponent(program, channel, component, axisId)) {
      plan.push({ kind: "edit", operation: edit, args: shared });
    }
  };

  addLeaf("line", operation.line);
  if (args.ticksAndLabels === false) {
    assertRemovable(program, channel, "ticks", operation.operation, axisId);
    assertRemovable(program, channel, "labels", operation.operation, axisId);
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

function applyPlan(program, channel, plan, operation, axisId = channel) {
  const pendingTitle = isLabelRelativeTitleOffset(program.guideConfigs.axis?.[axisId]?.title?.offset) &&
    plan.some(step => step.kind === "edit" && step.operation === operation.title);
  // The title leaf validates the final sibling state once, including side
  // transitions and a simultaneous switch back to a numeric offset.
  if (pendingTitle && program.context.pendingRelativeTitleAxis !== axisId) {
    return withPendingRelativeAxisTitle(program, axisId, next => applyPlan(next, channel, plan, operation, axisId));
  }
  let next = program;
  // A combined removal has no retained dependency; remove the title first.
  const ordered = isLabelRelativeTitleOffset(program.guideConfigs.axis?.[axisId]?.title?.offset) &&
    plan.some(step => step.kind === "remove" && step.component === "title")
    ? [...plan.filter(step => step.kind === "remove" && step.component === "title"),
      ...plan.filter(step => !(step.kind === "remove" && step.component === "title"))] : plan;
  // Consecutive sibling edits share the existing prospective plan so labels
  // are checked against a numeric title after it reaches the same new frame.
  // Keep removals in their established order and retain wrapped leaf actions.
  for (let index = 0; index < ordered.length;) {
    const step = ordered[index];
    if (step.kind === "remove") {
      next = removeComponent(next, channel, step.component, axisId);
      index += 1;
      continue;
    }
    const edits = [];
    while (index < ordered.length && ordered[index].kind === "edit") {
      const edit = ordered[index++];
      edits.push({ op: edit.operation, args: edit.args });
    }
    next = applyMaterializationPlan(next, edits);
  }

  const hasRetainedGraphic = AXIS_COMPONENTS.some(
    component => next.graphicSpec.objects[graphicId(channel, component, axisId)] !== undefined
  );
  if (!hasRetainedGraphic && (
    next.semanticSpec.guides.axis?.[axisId] !== undefined ||
    next.guideConfigs.axis?.[axisId] !== undefined
  )) {
    next = next[operation.remove](axisId === channel ? undefined : axisTargetArgs(axisId, channel));
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
      const selected = selectCartesianAxis(this, channel, args, { whole: true });
      const axisId = selected.id; args = selected.options;
      validateNestedEditConfig(this, channel, args, axisId);
      let source = this;
      if (selected.owner?.named && args.position !== undefined) {
        const position = validateAxisPosition(channel, args.position);
        assertCartesianAxisSideAvailable(this, { id: axisId, channel,
          coordinate: selected.owner.coordinate, position });
        source = source.editSemantic({ property: `guide.axis.${axisId}.position`, value: position });
      }
      const frame = resolveAxisFrameConfig(source.guideConfigs.axis?.[axisId]?.frame, args);
      source = frame === undefined ? source._withoutMaterializationConfig(["guides", "axis", axisId, "frame"])
        : source._withGuideConfig(axisId, "frame", frame);
      const plan = buildPlan(source, channel, args, operation, axisId);

      // Run the complete proposal against an immutable speculative branch so a
      // later leaf failure cannot begin the returned action trace or state.
      applyPlan(source, channel, plan, operation, axisId);
      return applyPlan(source, channel, plan, operation, axisId);
    })
  );
}

const editXAxis = /* @__PURE__ */ makeEditAxis("x");
const editYAxis = /* @__PURE__ */ makeEditAxis("y");

export function registerCompleteAxisEditActions(ProgramClass) {
  ProgramClass.prototype.editXAxis = editXAxis;
  ProgramClass.prototype.editYAxis = editYAxis;
}
