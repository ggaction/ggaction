import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit,
  validateSemanticFieldType
} from "../../grammar/scales/index.js";
import { normalizeRuleDatum } from "../../grammar/rules.js";
import { normalizeGroupFields } from "../../grammar/pathSeries.js";
import { assertPathGroupCompatible, validatePathGroupAppearance } from "../../materialization/marks/grouping.js";
import {
  canMaterializeArea,
  canMaterializeLine,
  getPositionEncodingMaterializationSteps
} from "../../materialization/marks/index.js";
import { findLayer } from "../../selectors/layers.js";
import {
  resolveTarget,
  setEncodingProperties,
  validateOptions
} from "./shared.js";

import { applyTemporalUnit } from "./temporal.js";

const SECONDARY_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate", "temporalUnit"
]);
const RANGE_OPTIONS = Object.freeze([
  "lower", "upper", "target", "fieldType", "coordinate", "scale", "temporalUnit"
]);
const GROUP_OPTIONS = Object.freeze(["field", "fields", "target", "fieldType"]);

function validateSecondaryScale(args, primaryScale, axisLabel) {
  if (args.scale === undefined) return;
  if (!isPlainObject(args.scale)) {
    throw new TypeError("Encoding scale must be a plain object.");
  }
  validateOptions(args.scale, ["id"], "scale");
  if (args.scale.id !== undefined && args.scale.id !== primaryScale) {
    throw new Error(`${axisLabel} primary and secondary endpoints must share one scale.`);
  }
}

function validateSecondaryField(dataset, field, fieldType, temporalUnit) {
  if (["nominal", "ordinal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else if (fieldType === "temporal") {
    readTemporalField(dataset.values, field, temporalUnit);
  } else {
    readQuantitativeField(dataset.values, field);
  }
}

function encodeSecondaryPosition(program, channel, args, operation, types) {
  validateOptions(args, SECONDARY_OPTIONS, operation);
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    types,
    types.length === 1 ? `${types[0]} mark` : "ranged mark"
  );
  const primaryChannel = channel === "x2" ? "x" : "y";
  const primary = layer.encoding?.[primaryChannel];
  if (primary?.scale === undefined) {
    throw new Error(`${operation} requires an existing ${primaryChannel} encoding.`);
  }
  if (args.coordinate !== undefined) {
    const coordinate = validateUserId(args.coordinate, "Coordinate id");
    if (coordinate !== layer.coordinate) {
      throw new Error(
        `${operation} must use the primary ${primaryChannel} coordinate "${layer.coordinate}".`
      );
    }
  }
  validateSecondaryScale(args, primary.scale, primaryChannel);

  const rule = layer.mark.type === "rule";
  const hasField = Object.hasOwn(args, "field");
  const hasDatum = Object.hasOwn(args, "datum");
  if (rule && hasField === hasDatum) {
    throw new Error(`${operation} requires exactly one of field or datum for a rule mark.`);
  }
  if (!rule && (!hasField || hasDatum)) {
    throw new Error(`${operation} requires a field for a ranged mark.`);
  }
  if (rule && args.fieldType === undefined) {
    throw new Error(`${operation} requires fieldType for a rule mark.`);
  }
  const fieldType = rule
    ? validateSemanticFieldType(args.fieldType)
    : layer.mark.type === "rect"
      ? args.fieldType ?? primary.fieldType
      : args.fieldType ?? "quantitative";
  if (
    !rule &&
    layer.mark.type !== "rect" &&
    fieldType !== "quantitative"
  ) {
    throw new Error(`${operation} requires a quantitative field.`);
  }
  if (
    layer.mark.type === "rect" &&
    !["quantitative", "temporal"].includes(fieldType)
  ) {
    throw new Error(`${operation} requires a quantitative or temporal rect field.`);
  }
  if (layer.mark.type === "rect" && fieldType !== primary.fieldType) {
    throw new Error(
      `${operation} fieldType must match the primary ${primaryChannel} fieldType.`
    );
  }
  if (rule && fieldType !== primary.fieldType) {
    throw new Error(
      `${operation} fieldType must match the primary ${primaryChannel} fieldType.`
    );
  }
  const previous = layer.encoding?.[channel];
  const temporalUnit = resolveTemporalUnit(args, fieldType, previous);
  if (hasField && layer.mark.type === "rect") {
    readScaleField(dataset.values, args.field, fieldType, { allowUnknown: true, temporalUnit });
  } else if (hasField) validateSecondaryField(dataset, args.field, fieldType, temporalUnit);
  else normalizeRuleDatum(args.datum, fieldType, channel, temporalUnit);

  let next = program;
  if (layer.mark.type === "bar") {
    for (const property of ["aggregate", "stack", "bin"]) {
      if (layer.encoding?.[primaryChannel]?.[property] !== undefined) {
        next = next.editSemantic({
          property: `layer[${target}].encoding.${primaryChannel}.${property}`,
          remove: true
        });
      }
    }
  }
  if (previous !== undefined) {
    const alternate = hasField ? "datum" : "field";
    if (Object.hasOwn(previous, alternate)) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.${channel}.${alternate}`,
        remove: true
      });
    }
  }
  next = setEncodingProperties(next, target, channel, {
    [hasField ? "field" : "datum"]: hasField ? args.field : args.datum,
    fieldType,
    scale: primary.scale
  });

  next = applyTemporalUnit(next, target, channel, temporalUnit, previous);
  const updated = findLayer(next, target);
  for (const step of getPositionEncodingMaterializationSteps(
    next,
    updated,
    primary.scale
  )) {
    next = next[step.op](step.args);
  }
  return next;
}

const encodeX2 = action(
  {
    op: "encodeX2",
    description: "Encode a secondary horizontal endpoint."
  },
  function (args = {}) {
    return encodeSecondaryPosition(
      this,
      "x2",
      args,
      "encodeX2",
      ["area", "rule", "bar", "rect"]
    );
  }
);

const encodeY2 = action(
  {
    op: "encodeY2",
    description: "Encode a secondary vertical endpoint."
  },
  function (args = {}) {
    return encodeSecondaryPosition(
      this,
      "y2",
      args,
      "encodeY2",
      ["area", "rule", "bar", "rect"]
    );
  }
);

function rangeAction(channel) {
  const primary = channel === "x" ? "encodeX" : "encodeY";
  const secondary = channel === "x" ? "encodeX2" : "encodeY2";
  const op = channel === "x" ? "encodeXRange" : "encodeYRange";
  return action({ op, description: "Atomically encode lower and upper bounds." }, function (args = {}) {
    validateOptions(args, RANGE_OPTIONS, op);
    const common = {
      ...(args.target === undefined ? {} : { target: args.target }),
      ...(Object.hasOwn(args, "temporalUnit") ? { temporalUnit: args.temporalUnit } : {}),
      fieldType: args.fieldType ?? "quantitative"
    };
    return this[primary]({
      ...common, field: args.lower,
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(args.scale === undefined ? {} : { scale: args.scale })
    })[secondary]({ ...common, field: args.upper });
  });
}

const encodeYRange = rangeAction("y");
const encodeXRange = rangeAction("x");

const encodeGroup = action(
  {
    op: "encodeGroup",
    description: "Split path geometry by nominal identity fields without a scale."
  },
  function (args = {}) {
    validateOptions(args, GROUP_OPTIONS, "encodeGroup");
    const { id: target, dataset, layer } = resolveTarget(
      this,
      args.target,
      ["line", "area"],
      "path mark"
    );
    if ((args.fieldType ?? "nominal") !== "nominal") {
      throw new Error("encodeGroup requires a nominal field.");
    }
    const hasFields = Object.hasOwn(args, "fields");
    if (hasFields === Object.hasOwn(args, "field")) {
      throw new Error("encodeGroup requires exactly one of field or fields.");
    }
    if (hasFields ? !Array.isArray(args.fields) : typeof args.field !== "string") {
      throw new TypeError("encodeGroup field must be a string and fields must be an array.");
    }
    const fields = normalizeGroupFields(hasFields ? args.fields : args.field);
    const group = {
      ...(fields.length === 1 ? { field: fields[0] } : { fields }),
      fieldType: "nominal"
    };
    assertPathGroupCompatible(this, layer, dataset, group);
    validatePathGroupAppearance(this, {
      ...layer, encoding: { ...layer.encoding, group }
    }, dataset);
    let next = this;
    const alternate = fields.length === 1 ? "fields" : "field";
    if (layer.encoding?.group?.[alternate] !== undefined) {
      next = next.editSemantic({
        property: `layer[${target}].encoding.group.${alternate}`, remove: true
      });
    }
    next = setEncodingProperties(next, target, "group", group);
    if (layer.mark.type === "area") {
      const updated = findLayer(next, target);
      return canMaterializeArea(next, updated)
        ? next.rematerializeAreaMark({ id: target })
        : next;
    }
    const updated = findLayer(next, target);
    return canMaterializeLine(next, updated)
      ? next.rematerializeLineMark({ id: target })
      : next;
  }
);

export function registerBasicRangedEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX2 = encodeX2;
  ProgramClass.prototype.encodeY2 = encodeY2;
  ProgramClass.prototype.encodeGroup = encodeGroup;
}

export function registerRangedEncodingActions(ProgramClass) {
  registerBasicRangedEncodingActions(ProgramClass);
  ProgramClass.prototype.encodeXRange = encodeXRange;
  ProgramClass.prototype.encodeYRange = encodeYRange;
}
