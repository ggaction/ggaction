import { isPlainObject } from "../../../core/immutable.js";
import { validateUserId } from "../../../core/identifiers.js";
import { getPositionCoordinateDefaults } from "../../../grammar/coordinates.js";
import {
  readNominalField,
  readQuantitativeField,
  readTemporalField,
  validateFieldType,
  validatePositionChannel
} from "../../../grammar/scales.js";
import { resolvePositionScaleDefinition } from "../../scales/definitions.js";
import { findCoordinate } from "../../../selectors/coordinates.js";
import {
  resolveReassignmentScaleOptions,
  resolveTarget,
  validateOptions
} from "../shared.js";
import {
  isAggregate,
  validateAggregate,
  validateAggregateFieldType,
  validateAggregateFieldValues,
} from "../../../grammar/aggregate.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "target", "fieldType", "scale", "coordinate", "aggregate", "bin", "stack"
]);
const BIN_OPTIONS = Object.freeze(["maxBins"]);

function resolveCoordinate(program, channel, layer, requestedId) {
  const defaults = getPositionCoordinateDefaults(channel);
  const existingId = layer.coordinate;
  if (requestedId !== undefined) validateUserId(requestedId, "Coordinate id");
  if (existingId !== undefined && requestedId !== undefined && existingId !== requestedId) {
    throw new Error(`Layer "${layer.id}" already uses coordinate "${existingId}".`);
  }
  const id = existingId ?? requestedId ?? defaults.id;
  const coordinate = findCoordinate(program, id);
  if (coordinate !== undefined && coordinate.type !== defaults.type) {
    throw new Error(
      `${channel} encoding requires a ${defaults.type} coordinate, but "${id}" is ${coordinate.type}.`
    );
  }
  return { id, type: defaults.type };
}

function resolveBin(bin) {
  if (!isPlainObject(bin)) throw new TypeError("Bar x bin must be a plain object.");
  validateOptions(bin, BIN_OPTIONS, "bin");
  const maxBins = bin.maxBins ?? 10;
  if (!Number.isInteger(maxBins) || maxBins <= 0) {
    throw new TypeError("Histogram maxBins must be a positive integer.");
  }
  return { maxBins };
}

function validateMarkPolicy(layer, dataset, channel, args, fieldType, field) {
  let bin;
  let aggregate;
  let stack;
  const xEncoding = layer.encoding?.x;

  if (layer.mark.type === "point") {
    if (fieldType !== "quantitative") {
      throw new Error("Point position encoding currently requires quantitative fields.");
    }
    if (args.aggregate !== undefined) throw new Error("Point position encoding does not support aggregate.");
    if (args.bin !== undefined) throw new Error("Point position encoding does not support bin.");
    if (args.stack !== undefined) throw new Error("Point position encoding does not support stack.");
  } else if (layer.mark.type === "area") {
    if (fieldType !== "quantitative") throw new Error("Area position encoding requires quantitative fields.");
    if (args.aggregate !== undefined || args.bin !== undefined || args.stack !== undefined) {
      throw new Error("Area position encoding does not support aggregate, bin, or stack.");
    }
  } else if (layer.mark.type === "line" && channel === "x") {
    const regression = dataset.transform?.some(item => item.type === "regression");
    if (fieldType !== "temporal" && !(regression && fieldType === "quantitative")) {
      throw new Error("Line x encoding requires a temporal field or regression quantitative field.");
    }
    if (args.aggregate !== undefined) throw new Error("Line x encoding does not support aggregate.");
    if (args.bin !== undefined) throw new Error("Line x encoding does not support bin.");
    if (args.stack !== undefined) throw new Error("Line x encoding does not support stack.");
  } else if (layer.mark.type === "line") {
    if (args.bin !== undefined) throw new Error("Line y encoding does not support bin.");
    const regression = dataset.transform?.some(item => item.type === "regression");
    if (regression && fieldType !== "quantitative") {
      throw new Error(regression
        ? "Regression line y encoding requires a quantitative field."
        : "Line y encoding requires a supported aggregate field type.");
    }
    if (regression && args.aggregate !== undefined) {
      throw new Error(regression
        ? "Regression line y encoding does not support aggregate."
        : "Line y encoding requires a supported aggregate.");
    }
    if (!regression) {
      aggregate = validateAggregate(args.aggregate);
      validateAggregateFieldType(aggregate, fieldType);
    }
    if (args.stack !== undefined) throw new Error("Line y encoding does not support stack.");
  } else if (channel === "x") {
    if (args.aggregate !== undefined) throw new Error("Bar x encoding does not support aggregate.");
    if (args.stack !== undefined) throw new Error("Bar x encoding does not support stack.");
    if (fieldType === "ordinal") {
      if (args.bin !== undefined) throw new Error("Ordinal bar x encoding does not support bin.");
    } else if (fieldType === "quantitative") {
      if (args.bin === undefined) throw new Error("Quantitative bar x encoding requires bin.");
      bin = resolveBin(args.bin);
    } else {
      throw new Error("Bar x encoding requires a quantitative field with bin or an ordinal field.");
    }
  } else {
    if (xEncoding?.field === undefined || xEncoding.scale === undefined) {
      throw new Error("Bar y encoding requires a binned x encoding or ordinal x encoding.");
    }
    if (fieldType !== "quantitative") throw new Error("Bar y encoding currently requires a quantitative field.");
    if (args.bin !== undefined) throw new Error("Bar y encoding does not support bin.");
    if (xEncoding.bin !== undefined) {
      if (field !== xEncoding.field) throw new Error("Bar y field must match the binned x field.");
      aggregate = args.aggregate ?? "count";
      stack = args.stack ?? "zero";
      if (aggregate !== "count") throw new Error('Histogram bar y aggregate must be "count".');
      if (stack !== "zero") throw new Error('Histogram bar y stack must be "zero".');
    } else if (xEncoding.fieldType === "ordinal") {
      aggregate = args.aggregate ?? "mean";
      stack = Object.hasOwn(args, "stack") ? args.stack : null;
      aggregate = validateAggregate(aggregate);
      validateAggregateFieldType(aggregate, fieldType);
      if (stack !== null) throw new Error("Ordinal bar y stack must be null.");
    } else {
      throw new Error("Bar y encoding requires a binned quantitative or ordinal x encoding.");
    }
  }
  return { bin, aggregate, stack };
}

export function resolvePositionEncoding(program, channel, args, operation) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    ["point", "line", "bar", "area"]
  );
  const previous = layer.encoding?.[channel];
  const requestedFieldType =
    args.fieldType ?? previous?.fieldType ?? "quantitative";
  const fieldType = requestedFieldType === "nominal"
    ? "nominal"
    : validateFieldType(requestedFieldType);
  const xEncoding = layer.encoding?.x;
  const field = layer.mark.type === "bar" && channel === "y" &&
    xEncoding?.bin !== undefined && args.field === undefined
    ? xEncoding.field
    : args.field;
  const effectiveArgs = { ...args };
  for (const property of ["aggregate", "bin", "stack"]) {
    if (!Object.hasOwn(effectiveArgs, property) && previous !== undefined &&
      Object.hasOwn(previous, property)) {
      effectiveArgs[property] = previous[property];
    }
  }
  const policy = validateMarkPolicy(
    layer,
    dataset,
    channel,
    effectiveArgs,
    fieldType,
    field
  );
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError(`${operation} field must be a non-empty string.`);
  }

  const aggregateOutput = isAggregate(policy.aggregate);
  if (aggregateOutput) {
    validateAggregateFieldType(policy.aggregate, fieldType);
    validateAggregateFieldValues(dataset.values, field, fieldType);
  } else if (fieldType === "temporal") readTemporalField(dataset.values, field);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else readQuantitativeField(dataset.values, field);

  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    Object.hasOwn(args, "scale") ? args.scale : {}
  );
  const scale = resolvePositionScaleDefinition(
    program,
    channel,
    aggregateOutput ? "quantitative" : fieldType,
    requestedScale,
    layer.mark.type === "bar" && fieldType !== "ordinal"
      ? channel === "x" || policy.stack === null
        ? { nice: true, zero: false }
        : { nice: true, zero: true }
      : {}
  );
  return {
    target,
    layer,
    previous,
    requestedScale,
    field,
    fieldType,
    scale,
    coordinate: resolveCoordinate(program, channel, layer, args.coordinate),
    ...policy
  };
}
