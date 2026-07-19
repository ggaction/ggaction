import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  validateSemanticFieldType
} from "../../grammar/scales/index.js";
import { normalizeRuleDatum } from "../../grammar/rules.js";
import {
  canMaterializeArea,
  canMaterializeLine
} from "../../materialization/marks/index.js";
import { findLayer } from "../../selectors/layers.js";
import {
  resolveTarget,
  validateLineSeriesCompatibility,
  validateOptions
} from "./shared.js";

const SECONDARY_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate"
]);
const RANGE_OPTIONS = Object.freeze([
  "lower", "upper", "target", "fieldType", "coordinate", "scale"
]);
const GROUP_OPTIONS = Object.freeze(["field", "target", "fieldType"]);

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

function validateSecondaryField(dataset, field, fieldType) {
  if (["nominal", "ordinal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else if (fieldType === "temporal") {
    readTemporalField(dataset.values, field);
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
  if (hasField && layer.mark.type === "rect") {
    readScaleField(dataset.values, args.field, fieldType, { allowUnknown: true });
  } else if (hasField) validateSecondaryField(dataset, args.field, fieldType);
  else normalizeRuleDatum(args.datum, fieldType, channel);

  const previous = layer.encoding?.[channel];
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
  next = next
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.${hasField ? "field" : "datum"}`,
      value: hasField ? args.field : args.datum
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.fieldType`,
      value: fieldType
    })
    .editSemantic({
      property: `layer[${target}].encoding.${channel}.scale`,
      value: primary.scale
    })
    .rematerializeScale({ id: primary.scale });
  if (rule) return next.rematerializeRuleMark({ id: target });
  return layer.mark.type === "bar"
    ? next.rematerializeBarMark({ id: target })
    : layer.mark.type === "rect"
      ? next.rematerializeRectMark({ id: target })
      : next.rematerializeAreaMark({ id: target });
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

const encodeYRange = action(
  {
    op: "encodeYRange",
    description: "Atomically encode lower and upper area bounds."
  },
  function (args = {}) {
    validateOptions(args, RANGE_OPTIONS, "encodeYRange");
    const target = args.target;
    const lower = this.encodeY({
      field: args.lower,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative",
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(args.scale === undefined ? {} : { scale: args.scale })
    });
    return lower.encodeY2({
      field: args.upper,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative"
    });
  }
);

const encodeXRange = action(
  {
    op: "encodeXRange",
    description: "Atomically encode lower and upper horizontal area bounds."
  },
  function (args = {}) {
    validateOptions(args, RANGE_OPTIONS, "encodeXRange");
    const target = args.target;
    const lower = this.encodeX({
      field: args.lower,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative",
      ...(args.coordinate === undefined ? {} : { coordinate: args.coordinate }),
      ...(args.scale === undefined ? {} : { scale: args.scale })
    });
    return lower.encodeX2({
      field: args.upper,
      ...(target === undefined ? {} : { target }),
      fieldType: args.fieldType ?? "quantitative"
    });
  }
);

const encodeGroup = action(
  {
    op: "encodeGroup",
    description: "Split path geometry by a nominal field without a scale."
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
    const densityTransform = dataset.transform?.length === 1 &&
      dataset.transform[0].type === "density"
      ? dataset.transform[0]
      : undefined;
    if (densityTransform !== undefined && densityTransform.groupBy !== args.field) {
      throw new Error(
        densityTransform.groupBy === undefined
          ? `Ungrouped density area mark "${target}" cannot encode group.`
          : `Density area mark "${target}" must group by "${densityTransform.groupBy}".`
      );
    }
    readNominalField(dataset.values, args.field);
    validateLineSeriesCompatibility(layer, "group", args.field);
    const next = this
      .editSemantic({
        property: `layer[${target}].encoding.group.field`,
        value: args.field
      })
      .editSemantic({
        property: `layer[${target}].encoding.group.fieldType`,
        value: "nominal"
      });
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

export function registerRangedEncodingActions(ProgramClass) {
  ProgramClass.prototype.encodeX2 = encodeX2;
  ProgramClass.prototype.encodeY2 = encodeY2;
  ProgramClass.prototype.encodeXRange = encodeXRange;
  ProgramClass.prototype.encodeYRange = encodeYRange;
  ProgramClass.prototype.encodeGroup = encodeGroup;
}
