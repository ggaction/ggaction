import { validateUserId } from "../../../core/identifiers.js";
import { getPositionCoordinateDefaults } from "../../../grammar/coordinates.js";
import {
  readNominalField,
  readQuantitativeField,
  readScaleField,
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
  validateAggregateFieldType,
  validateAggregateFieldValues,
} from "../../../grammar/aggregate.js";
import { normalizeRuleDatum } from "../../../grammar/rules.js";
import { resolveMarkPositionPolicy } from "./policies/index.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate",
  "aggregate", "bin", "stack"
]);

const CARTESIAN_CHANNELS = Object.freeze(["x", "y"]);
const POLAR_CHANNELS = Object.freeze(["theta", "radius"]);

function validateCoordinateFamily(layer, channel, operation) {
  const requestedFamily = POLAR_CHANNELS.includes(channel)
    ? POLAR_CHANNELS
    : CARTESIAN_CHANNELS;
  const incompatible = requestedFamily === POLAR_CHANNELS
    ? CARTESIAN_CHANNELS
    : POLAR_CHANNELS;
  const existing = incompatible.filter(name => layer.encoding?.[name] !== undefined);
  if (existing.length > 0) {
    throw new Error(
      `${operation} cannot mix ${channel} with ${existing.join("/")} position encodings on layer "${layer.id}".`
    );
  }
}

function resolveCoordinate(program, channel, layer, requestedId) {
  const defaults = getPositionCoordinateDefaults(channel);
  const existingId = layer.coordinate;
  if (requestedId !== undefined) validateUserId(requestedId, "Coordinate id");
  if (existingId !== undefined && requestedId !== undefined && existingId !== requestedId) {
    throw new Error(`Layer "${layer.id}" already uses coordinate "${existingId}".`);
  }
  const compatible = program.semanticSpec.coordinates.filter(
    coordinate => coordinate.type === defaults.type
  );
  if (
    existingId === undefined &&
    requestedId === undefined &&
    compatible.length > 1
  ) {
    throw new Error(
      `${channel} encoding requires coordinate when multiple ${defaults.type} coordinates are available.`
    );
  }
  const id = existingId ?? requestedId ?? compatible[0]?.id ?? defaults.id;
  const coordinate = findCoordinate(program, id);
  if (coordinate !== undefined && coordinate.type !== defaults.type) {
    throw new Error(
      `${channel} encoding requires a ${defaults.type} coordinate, but "${id}" is ${coordinate.type}.`
    );
  }
  return { id, type: defaults.type };
}

export function resolvePositionEncoding(program, channel, args, operation) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const { id: target, dataset, layer } = resolveTarget(
    program,
    args.target,
    POLAR_CHANNELS.includes(channel)
      ? ["point"]
      : ["point", "line", "bar", "area", "rule"]
  );
  validateCoordinateFamily(layer, channel, operation);
  const hasField = Object.hasOwn(args, "field");
  const hasDatum = Object.hasOwn(args, "datum");
  if (layer.mark.type === "rule") {
    if (hasField === hasDatum) {
      throw new Error(`${operation} requires exactly one of field or datum for a rule mark.`);
    }
    if (args.fieldType === undefined) {
      throw new Error(`${operation} requires fieldType for a rule mark.`);
    }
  } else if (hasDatum) {
    throw new Error(`${operation} does not support datum for a ${layer.mark.type} mark.`);
  }
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
  const datum = args.datum;
  const effectiveArgs = { ...args };
  for (const property of ["aggregate", "bin", "stack"]) {
    if (!Object.hasOwn(effectiveArgs, property) && previous !== undefined &&
      Object.hasOwn(previous, property)) {
      effectiveArgs[property] = previous[property];
    }
  }
  const policy = resolveMarkPositionPolicy({
    program,
    layer,
    dataset,
    channel,
    args: effectiveArgs,
    fieldType,
    field
  });
  const usesField = layer.mark.type !== "rule" || hasField;
  if (usesField && (typeof field !== "string" || field.length === 0)) {
    throw new TypeError(`${operation} field must be a non-empty string.`);
  }

  const aggregateOutput = isAggregate(policy.aggregate);
  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    Object.hasOwn(args, "scale") ? args.scale : {}
  );
  const scale = resolvePositionScaleDefinition(
    program,
    channel,
    aggregateOutput ? "quantitative" : fieldType,
    requestedScale,
    layer.mark.type === "bar"
      ? program.markConfigs[target]?.boxPlot !== undefined && fieldType === "quantitative"
        ? { nice: true, zero: false }
        : fieldType === "quantitative"
        ? policy.bin !== undefined || policy.stack === null
          ? { nice: true, zero: false }
          : { nice: true, zero: true }
        : fieldType === "temporal"
          ? { nice: true }
          : { discreteType: "band" }
      : ["ordinal", "nominal"].includes(fieldType)
        ? { discreteType: "point" }
        : {}
  );
  if (Object.hasOwn(scale, "unknown") && layer.mark.type !== "point") {
    throw new Error(
      "Position scale unknown currently requires a row-owned point mark."
    );
  }
  if (layer.mark.type === "rule" && hasDatum) {
    normalizeRuleDatum(datum, fieldType, channel);
  } else if (aggregateOutput) {
    validateAggregateFieldType(policy.aggregate, fieldType);
    validateAggregateFieldValues(dataset.values, field, fieldType);
  } else if (program.markConfigs[target]?.boxPlot !== undefined) {
    for (const [index, row] of dataset.values.entries()) {
      const value = row[field];
      if (value === undefined || value === null || value === "") continue;
      if (fieldType === "quantitative" && !Number.isFinite(value)) {
        throw new TypeError(`Field "${field}" must contain a finite number at row ${index}.`);
      }
    }
  } else if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, field, fieldType, { allowUnknown: true });
  } else if (fieldType === "temporal") readTemporalField(dataset.values, field);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else readQuantitativeField(dataset.values, field);

  if (
    layer.mark.type === "bar" &&
    ["ordinal", "nominal"].includes(fieldType) &&
    scale.type === "point"
  ) {
    throw new Error("Categorical bar positions require a band scale.");
  }
  return {
    target,
    layer,
    previous,
    requestedScale,
    field,
    datum,
    hasField: usesField,
    fieldType,
    scale,
    coordinate: resolveCoordinate(program, channel, layer, args.coordinate),
    ...policy
  };
}
