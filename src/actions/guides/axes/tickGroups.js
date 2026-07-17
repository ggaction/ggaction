import { action } from "../../../core/action.js";
import { isPlainObject } from "../../../core/immutable.js";
import { validateKeys, validateOptionObject } from "../../../core/validation.js";

const CREATE_OPTIONS = Object.freeze([
  "scale",
  "position",
  "count",
  "values",
  "ticks",
  "labels"
]);
const EDIT_OPTIONS = Object.freeze([
  "position",
  "count",
  "values",
  "ticks",
  "labels"
]);
const TICK_OPTIONS = Object.freeze(["length", "color", "lineWidth"]);
const LABEL_OPTIONS = Object.freeze([
  "offset",
  "format",
  "color",
  "fontSize",
  "fontFamily",
  "fontWeight"
]);
const SHARED_CREATE = Object.freeze(["scale", "position", "count", "values"]);
const SHARED_EDIT = Object.freeze(["position", "count", "values"]);

function validateNested(value, supported, label) {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }

  validateKeys(value, supported, label);
}

function validateArgs(args, operation, create) {
  validateOptionObject(
    args,
    create ? CREATE_OPTIONS : EDIT_OPTIONS,
    operation,
    { allowEmpty: create }
  );

  if (Object.hasOwn(args, "count") && Object.hasOwn(args, "values")) {
    throw new Error(`${operation} cannot use count and values together.`);
  }

  if (Object.hasOwn(args, "ticks")) {
    validateNested(args.ticks, TICK_OPTIONS, `${operation}.ticks`);
  }

  if (Object.hasOwn(args, "labels")) {
    validateNested(args.labels, LABEL_OPTIONS, `${operation}.labels`);
  }

}

function select(source, keys) {
  const result = {};

  for (const key of keys) {
    if (Object.hasOwn(source, key)) result[key] = source[key];
  }

  return result;
}

function names(channel) {
  const prefix = channel === "x" ? "X" : "Y";
  return {
    create: `create${prefix}AxisTicksAndLabels`,
    edit: `edit${prefix}AxisTicksAndLabels`,
    createTicks: `create${prefix}AxisTicks`,
    createLabels: `create${prefix}AxisLabels`,
    editTicks: `edit${prefix}AxisTicks`,
    editLabels: `edit${prefix}AxisLabels`
  };
}

function makeCreate(channel) {
  const operation = names(channel);

  return action(
    {
      op: operation.create,
      description: `Create ${channel}-axis ticks and labels.`
    },
    function (args = {}) {
      validateArgs(args, operation.create, true);
      const shared = select(args, SHARED_CREATE);
      const tickArgs = { ...shared, ...(args.ticks ?? {}) };
      const labelArgs = {
        ...select(shared, ["scale", "position"]),
        ...(args.labels ?? {})
      };

      return this[operation.createTicks](tickArgs)[operation.createLabels](
        labelArgs
      );
    }
  );
}

function makeEdit(channel) {
  const operation = names(channel);

  return action(
    {
      op: operation.edit,
      description: `Edit ${channel}-axis ticks and labels.`
    },
    function (args = {}) {
      validateArgs(args, operation.edit, false);
      const shared = select(args, SHARED_EDIT);
      const hasShared = Object.keys(shared).length > 0;
      let next = this;

      if (hasShared || Object.hasOwn(args, "ticks")) {
        next = next[operation.editTicks]({
          ...shared,
          ...(args.ticks ?? {})
        });
      }

      if (hasShared || Object.hasOwn(args, "labels")) {
        next = next[operation.editLabels]({
          ...shared,
          ...(args.labels ?? {})
        });
      }

      return next;
    }
  );
}

const createXAxisTicksAndLabels = makeCreate("x");
const createYAxisTicksAndLabels = makeCreate("y");
const editXAxisTicksAndLabels = makeEdit("x");
const editYAxisTicksAndLabels = makeEdit("y");

export function registerAxisTickGroupActions(Class) {
  Class.prototype.createXAxisTicksAndLabels = createXAxisTicksAndLabels;
  Class.prototype.createYAxisTicksAndLabels = createYAxisTicksAndLabels;
  Class.prototype.editXAxisTicksAndLabels = editXAxisTicksAndLabels;
  Class.prototype.editYAxisTicksAndLabels = editYAxisTicksAndLabels;
}
