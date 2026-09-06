import { isSourceOwnedText } from "../../../grammar/text.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { readAreaEndpoint } from "../../../grammar/areaEndpoints.js";
import { validateUserId } from "../../../core/identifiers.js";
import { getPositionCoordinateDefaults } from "../../../grammar/coordinates.js";
import {
  isNominalValue,
  readNominalField,
  readQuantitativeField,
  readScaleField,
  readTemporalField,
  resolveTemporalUnit,
  validateFieldType,
  validatePositionChannel
} from "../../../grammar/scales/index.js";
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
import { normalizePositionDatum } from "../../../grammar/positionDatum.js";
import {
  readArcThetaValues,
  readArcThetaWeights
} from "../../../grammar/arcs.js";
import { resolveMarkPositionPolicy } from "./policies/index.js";
import {
  getPositionChannelDefinition,
  positionChannelsForFamily
} from "../../../core/vocabulary.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate",
  "aggregate", "bin", "stack", "weight", "temporalUnit", "mapping"
]);

function inferDatumFieldType(datum, operation) {
  if (Number.isFinite(datum)) return "quantitative";
  if (isNominalValue(datum)) return "nominal";
  throw new Error(`${operation} datum requires an explicit fieldType.`);
}

function validateCoordinateFamily(layer, channel, operation) {
  const family = getPositionChannelDefinition(channel).family;
  const incompatible = positionChannelsForFamily(
    family === "polar" ? "cartesian" : "polar"
  );
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
    getPositionChannelDefinition(channel).markTypes
  );
  if (isSourceOwnedText(layer)) {
    throw new Error(`${operation} cannot replace source-owned Text positions; edit the source, use dx/dy, or create independent Text with data.`);
  }
  if (
    Object.hasOwn(args, "weight") &&
    !(layer.mark.type === "arc" && channel === "theta")
  ) {
    throw new Error(`${operation} weight is supported only for arc theta encoding.`);
  }
  if (Object.hasOwn(args, "mapping") && (layer.mark.type !== "arc" || channel !== "radius")) {
    throw new Error(`${operation} mapping requires Arc radius.`);
  }
  validateCoordinateFamily(layer, channel, operation);
  const clearRadialMapping =
    layer.mark.type === "arc" && channel === "radius" && args.mapping === false;
  const hasField = Object.hasOwn(args, "field");
  const hasDatum = Object.hasOwn(args, "datum");
  if (["rule", "rect", "text", "point", "tick"].includes(layer.mark.type)) {
    if (hasField === hasDatum) {
      throw new Error(`${operation} requires exactly one of field or datum for a ${layer.mark.type} mark.`);
    }
    if (layer.mark.type === "rule" && hasField && args.fieldType === undefined) {
      throw new Error(`${operation} requires fieldType for a rule mark.`);
    }
  } else if (layer.mark.type === "area") {
    if (hasField === hasDatum) throw new Error(`${operation} requires exactly one of field or datum for an area mark.`);
    if (hasDatum && (!Number.isFinite(args.datum) || (args.fieldType ?? "quantitative") !== "quantitative" ||
      ["aggregate", "bin", "stack", "temporalUnit"].some(key => Object.hasOwn(args, key)))) {
      throw new Error("Area datum requires a finite quantitative constant without aggregate, bin, stack, or temporalUnit.");
    }
  } else if (hasDatum) {
    throw new Error(`${operation} does not support datum for a ${layer.mark.type} mark.`);
  }
  const previous = layer.encoding?.[channel];
  const mapping = channel === "radius" && layer.mark.type === "arc"
    ? clearRadialMapping
      ? undefined
      : args.mapping ?? findSemanticScale(program, previous?.scale)?.radialMapping
    : undefined;
  const countRadius = mapping !== undefined && (args.aggregate ?? previous?.aggregate) === "count";
  const requestedFieldType = args.fieldType ?? previous?.fieldType ?? (
    ["rule", "rect", "text", "point", "tick"].includes(layer.mark.type) && hasDatum
      ? inferDatumFieldType(args.datum, operation)
      : layer.mark.type === "arc" && channel === "theta" &&
          ["count", "sum"].includes(args.aggregate)
        ? "nominal"
        : "quantitative"
  );
  const fieldType = requestedFieldType === "nominal"
    ? "nominal"
    : validateFieldType(requestedFieldType);
  const xEncoding = layer.encoding?.x;
  const field = layer.mark.type === "bar" && channel === "y" &&
    xEncoding?.bin !== undefined && args.field === undefined
    ? xEncoding.field
    : args.field;
  const datum = args.datum;
  const temporalUnit = resolveTemporalUnit({ ...args, ...(hasDatum ? {} : { field }) }, fieldType, previous);
  const usesField = !countRadius && (!["rule", "area", "rect", "text", "point", "tick"].includes(layer.mark.type) || hasField);
  if (usesField && (typeof field !== "string" || field.length === 0)) {
    throw new TypeError(`${operation} field must be a non-empty string.`);
  }
  // A missing field is invalid even before the Bar's measure/category role is known.
  if (layer.mark.type === "bar" && program.markConfigs[target]?.boxPlot === undefined) {
    if (fieldType === "quantitative" && dataset.values.length > 0 &&
      !dataset.values.some(row => Object.hasOwn(row, field))) {
      throw new Error(`${operation} field "${field}" does not exist in the dataset.`);
    }
    if (fieldType === "quantitative") {
      validateAggregateFieldValues(dataset.values, field, fieldType);
    } else readScaleField(dataset.values, field, fieldType, { temporalUnit });
  }
  const effectiveArgs = { ...args };
  if (clearRadialMapping) delete effectiveArgs.mapping;
  else if (mapping !== undefined) effectiveArgs.mapping = mapping;
  const directQuantitativeArcTheta =
    layer.mark.type === "arc" &&
    channel === "theta" &&
    fieldType === "quantitative";
  for (const property of ["aggregate", "bin", "stack"]) {
    if (!Object.hasOwn(effectiveArgs, property) && previous !== undefined &&
      Object.hasOwn(previous, property) &&
      !(directQuantitativeArcTheta && property === "aggregate") &&
      !(clearRadialMapping && property === "aggregate")) {
      effectiveArgs[property] = previous[property];
    }
  }
  if (
    !Object.hasOwn(effectiveArgs, "weight") &&
    effectiveArgs.aggregate === "sum" &&
    previous !== undefined &&
    Object.hasOwn(previous, "weight")
  ) {
    effectiveArgs.weight = previous.weight;
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
  const aggregateOutput = isAggregate(policy.aggregate) && !(
    layer.mark.type === "arc" && channel === "theta"
  );
  const requestedScale = resolveReassignmentScaleOptions(
    previous,
    Object.hasOwn(args, "scale") ? args.scale : {}
  );
  const resolvedScale = resolvePositionScaleDefinition(
    program,
    channel,
    aggregateOutput ? "quantitative" : fieldType,
    requestedScale,
    mapping !== undefined ? { radialMapping: mapping, zero: true, nice: false }
      : layer.mark.type === "bar"
      ? program.markConfigs[target]?.boxPlot !== undefined && fieldType === "quantitative"
        ? { nice: true, zero: false }
        : fieldType === "quantitative"
        ? policy.bin === undefined && policy.stack === undefined
          ? { nice: true }
          : policy.bin !== undefined || policy.stack === null
          ? { nice: true, zero: false }
          : { nice: true, zero: true }
        : fieldType === "temporal"
          ? { nice: true }
          : { discreteType: "band" }
      : layer.mark.type === "line" && channel === "x" && policy.bin !== undefined
        ? { nice: true, zero: false }
      : ["ordinal", "nominal"].includes(fieldType)
        ? {
            discreteType: ["arc", "rect"].includes(layer.mark.type)
              ? "band"
              : "point"
          }
        : {}
  );
  const scale = clearRadialMapping
    ? Object.fromEntries(
        Object.entries(resolvedScale).filter(([property]) => property !== "radialMapping")
      )
    : resolvedScale;
  if (
    layer.mark.type === "bar" &&
    program.markConfigs[target]?.boxPlot === undefined &&
    scale.type === "log" &&
    policy.bin === undefined
  ) {
    throw new Error('Bar scale type "log" does not support zero baselines.');
  }
  if (
    layer.mark.type === "arc" &&
    channel === "theta" &&
    ["ordinal", "nominal"].includes(fieldType) &&
    scale.type !== "band"
  ) {
    throw new Error("Categorical arc theta position requires a band scale.");
  }
  if (Object.hasOwn(scale, "unknown") && layer.mark.type !== "point") {
    throw new Error(
      "Position scale unknown currently requires a row-owned point mark."
    );
  }
  if (layer.mark.type === "area" && fieldType === "quantitative") {
    readAreaEndpoint(dataset.values, { ...(hasDatum ? { datum } : { field }), fieldType }, layer.mark.missing);
  } else if (["rule", "rect", "text", "point", "tick"].includes(layer.mark.type) && hasDatum) {
    const mark = layer.mark.type[0].toUpperCase() + layer.mark.type.slice(1);
    normalizePositionDatum(datum, fieldType, channel, temporalUnit, mark);
  } else if (countRadius) {
    // Count has no source measure field. Category-grain validation runs once theta exists.
  } else if (aggregateOutput) {
    validateAggregateFieldType(policy.aggregate, fieldType);
    validateAggregateFieldValues(dataset.values, field, fieldType);
  } else if (
    layer.mark.type === "arc" &&
    channel === "theta" &&
    policy.aggregate === "sum"
  ) {
    readArcThetaWeights(dataset.values, policy.weight, layer.id);
  } else if (directQuantitativeArcTheta) {
    readArcThetaValues(dataset.values, field, layer.id);
  } else if (program.markConfigs[target]?.boxPlot !== undefined) {
    for (const [index, row] of dataset.values.entries()) {
      const value = row[field];
      if (value === undefined || value === null || value === "") continue;
      if (fieldType === "quantitative" && !Number.isFinite(value)) {
        throw new TypeError(`Field "${field}" must contain a finite number at row ${index}.`);
      }
    }
  } else if (layer.mark.type === "rect") {
    readScaleField(dataset.values, field, fieldType, { allowUnknown: true, temporalUnit });
  } else if (Object.hasOwn(scale, "unknown")) {
    readScaleField(dataset.values, field, fieldType, { allowUnknown: true, temporalUnit });
  } else if (fieldType === "temporal") readTemporalField(dataset.values, field, temporalUnit);
  else if (["ordinal", "nominal"].includes(fieldType)) {
    readNominalField(dataset.values, field);
  } else readQuantitativeField(dataset.values, field);

  if (mapping !== undefined) {
    const values = countRadius ? dataset.values.map(() => 1) : readQuantitativeField(dataset.values, field);
    if (values.length === 0 || values.some(value => value < 0) || !values.some(value => value > 0)) {
      throw new Error("Measured radius requires non-negative values and a positive aggregate.");
    }
  }
  if (
    ["bar", "rect"].includes(layer.mark.type) &&
    ["ordinal", "nominal"].includes(fieldType) &&
    scale.type === "point"
  ) {
    throw new Error(`Categorical ${layer.mark.type} positions require a band scale.`);
  }
  return {
    target,
    layer,
    previous,
    requestedScale: mapping === undefined ? requestedScale : { ...requestedScale, radialMapping: mapping },
    field,
    datum,
    hasField: usesField,
    fieldType,
    temporalUnit,
    scale,
    coordinate: resolveCoordinate(program, channel, layer, args.coordinate),
    clearRadialMapping,
    ...policy
  };
}
