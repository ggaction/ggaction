import { findLayer } from "../../../selectors/layers.js";
import { validatePositionSource } from "../../../grammar/positionPolicies/source.js";
import { assertProgramSingleY } from "../../../materialization/frameState.js";
import { positionBindings } from "../../../core/encodingBindings.js";
import { conditionalPositionTemplate } from "../../../core/encodingBindings.js";
import { isSourceOwnedText } from "../../../grammar/text.js";
import { findSemanticScale } from "../../../selectors/scales.js";
import { readAreaEndpoint, normalizeAreaBound } from "../../../grammar/areaEndpoints.js";
import { readLinePosition } from "../../../grammar/lineMissing.js";
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
import { applyRequestedItemMissingPolicy } from
  "../../../grammar/itemMissing.js";
import { resolvePositionScaleDefinition, resolvePositionScaleId } from "../../scales/definitions.js";
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
import { resolveMarkPositionPolicy } from "../../../materialization/positionPolicy.js";
import {
  getPositionChannelDefinition,
  positionChannelsForFamily
} from "../../../core/vocabulary.js";

const POSITION_ENCODING_OPTIONS = Object.freeze([
  "field", "datum", "target", "fieldType", "scale", "coordinate",
  "aggregate", "bin", "stack", "weight", "temporalUnit", "mapping"
]);

// Admission reads the final semantic assignment, including the guide move and
// removal of detached plot intent, before any wrapped child can expose it.
export function isPositionEncodingEntry(program) {
  return program.actionStack.length === 1 && ["encodeX", "encodeY"].includes(program.trace.children.at(-1)?.op);
}

export function assertPositionEncodingFrame(program, channel, plans) {
  if (!["x", "y"].includes(channel)) return;
  // Aggregate authors may deliberately assign a temporary scale before storing
  // normalized plot intent. Their final candidate has its own admission guard.
  if (!isPositionEncodingEntry(program)) return;
  assertProgramSingleY(previewPositionEncodingFrame(program, channel, plans), { allowIncomplete: true });
}

// Pure proposal shared by direct encoders and the facade which owns a complete
// pair. A facade validates the pair once, before creating its first mark.
export function previewPositionEncodingFrame(program, channel, plans) {
  const { layer, coordinate } = plans[0];
  if (plans.some(plan => plan.coordinate.id !== coordinate.id || plan.coordinate.type !== coordinate.type)) {
    throw new Error("Conditional positions must share one coordinate.");
  }
  const encoding = { ...layer.encoding };
  const conditionals = { ...layer.conditionals };
  const derivedBindings = { ...layer.derivedBindings };
  for (const kind of ["plotSnapshot", "plotAnchor"]) {
    if (derivedBindings[kind]?.[channel] === undefined) continue;
    const { [channel]: removed, ...rest } = derivedBindings[kind];
    void removed;
    if (Object.keys(rest).length) derivedBindings[kind] = rest;
    else delete derivedBindings[kind];
  }
  const values = plans.map(plan => ({ ...(plan.hasField ? { field: plan.field } : { datum: plan.datum }),
    fieldType: plan.fieldType, scale: plan.scale.id,
    ...Object.fromEntries(["aggregate", "bin", "stack", "weight", "temporalUnit"].filter(key =>
      plan[key] !== undefined).map(key => [key, plan[key]])) }));
  if (plans.length === 1) {
    encoding[channel] = values[0];
    delete conditionals[channel];
  } else {
    delete encoding[channel];
    // The frame policy examines every binding, independently of predicate values.
    conditionals[channel] = { conditions: values.slice(0, -1).map(value => ({ value })), otherwise: values.at(-1) };
  }
  const updated = { ...layer, encoding, conditionals, derivedBindings, coordinate: coordinate.id };
  const oldScales = new Set(positionBindings(layer, channel).map(value => value.scale));
  const nextScales = new Set(values.map(value => value.scale));
  const axis = Object.fromEntries(Object.entries(program.semanticSpec.guides.axis ?? {}).map(([id, guide]) =>
    [id, (guide.channel ?? id) === channel && oldScales.has(guide.scale) && nextScales.size === 1
      ? { ...guide, scale: values[0].scale } : guide]));
  const scales = new Map(program.semanticSpec.scales.map(scale => [scale.id, scale]));
  for (const plan of plans) scales.set(plan.scale.id, plan.scale);
  return { ...program, markConfigs: program.markConfigs, guideConfigs: program.guideConfigs, semanticSpec: { ...program.semanticSpec,
    layers: program.semanticSpec.layers.map(value => value.id === layer.id ? updated : value),
    coordinates: findCoordinate(program, coordinate.id) === undefined
      ? [...program.semanticSpec.coordinates, coordinate] : program.semanticSpec.coordinates,
    scales: [...scales.values()], guides: { ...program.semanticSpec.guides, axis }
  } };
}

// Resolve an aggregate's complete ordered position proposal before its first
// child. The source dataset is real; ranged endpoints retain their shared scale.
export function previewPositionSequence(program, layer, dataset, positions, { coordinate, plotAnchor } = {}) {
  let candidate = { ...program, markConfigs: program.markConfigs, guideConfigs: program.guideConfigs,
    semanticSpec: { ...program.semanticSpec, layers: findLayer(program, layer.id) !== undefined
      ? program.semanticSpec.layers.map(value => value.id === layer.id ? layer : value)
      : [...program.semanticSpec.layers, layer] } };
  for (const [channel, options] of positions) {
    const current = findLayer(candidate, layer.id);
    const ranged = Object.hasOwn(options, "lower");
    const { lower, upper, ...rest } = options;
    const primary = ranged ? { ...rest, ...normalizeAreaBound(lower) } : options;
    const plan = resolveLayerPositionEncoding(candidate, channel,
      { ...primary, target: layer.id, ...(coordinate === undefined ? {} : { coordinate }) },
      `encode${channel.toUpperCase()}`, current, dataset);
    candidate = previewPositionEncodingFrame(candidate, channel, [plan]);
    if (ranged) {
      const secondary = { ...normalizeAreaBound(upper), fieldType: plan.fieldType, scale: plan.scale.id };
      candidate = { ...candidate, semanticSpec: { ...candidate.semanticSpec,
        layers: candidate.semanticSpec.layers.map(value => value.id === layer.id
          ? { ...value, encoding: { ...value.encoding, [`${channel}2`]: secondary } } : value) } };
    }
  }
  if (plotAnchor !== undefined) candidate = { ...candidate, semanticSpec: { ...candidate.semanticSpec,
    layers: candidate.semanticSpec.layers.map(value => value.id === layer.id
      ? { ...value, derivedBindings: { ...value.derivedBindings, plotAnchor } } : value) } };
  return candidate;
}

// Native statistical owners provide final field/type/scale bindings before
// their derived data exists. This frame view does not evaluate data or graphics.
// Bulk assignment needs the final resource identities before its existing
// deferred materialization draft runs. The request owner is also used by the
// ordinary resolver; values/domains remain validated by that ordinary path.
export function previewPositionIdentityFrame(program, layer, channel, payloads) {
  const plans = payloads.map(args => {
    const requested = resolvePositionScaleRequest(layer, channel, args);
    const id = resolvePositionScaleId(channel, requested);
    return { layer, coordinate: resolvePositionCoordinate(program, channel, layer, args.coordinate),
      scale: { ...findSemanticScale(program, id), id }, hasField: Object.hasOwn(args, "field"),
      field: args.field, datum: args.datum, fieldType: args.fieldType ?? layer.encoding?.[channel]?.fieldType ?? "quantitative" };
  });
  return previewPositionEncodingFrame(program, channel, plans);
}

function resolvePositionScaleRequest(layer, channel, args) {
  return resolveReassignmentScaleOptions(layer.encoding?.[channel], Object.hasOwn(args, "scale") ? args.scale : {});
}

export function previewNativePositionFrame(program, layer, requestedCoordinate, bindings) {
  const coordinate = resolvePositionCoordinate(program, "y", layer, requestedCoordinate);
  const encoding = { ...layer.encoding };
  for (const [channel, value] of Object.entries(bindings)) {
    const { scale, coordinate: ignored, ...binding } = value;
    void ignored;
    encoding[channel] = { ...binding, scale: resolvePositionScaleId(channel.endsWith("2") ? channel[0] : channel, scale) };
  }
  const updated = { ...layer, coordinate: coordinate.id, encoding };
  const exists = findLayer(program, layer.id) !== undefined;
  return { ...program, markConfigs: program.markConfigs, guideConfigs: program.guideConfigs,
    semanticSpec: { ...program.semanticSpec,
      layers: exists ? program.semanticSpec.layers.map(value => value.id === layer.id ? updated : value)
        : [...program.semanticSpec.layers, updated],
      coordinates: findCoordinate(program, coordinate.id) === undefined
        ? [...program.semanticSpec.coordinates, coordinate] : program.semanticSpec.coordinates
    } };
}

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
  const existing = incompatible.filter(name => layer.encoding?.[name] !== undefined || layer.conditionals?.[name] !== undefined);
  if (existing.length > 0) {
    throw new Error(
      `${operation} cannot mix ${channel} with ${existing.join("/")} position encodings on layer "${layer.id}".`
    );
  }
}

export function resolvePositionCoordinate(program, channel, layer, requestedId) {
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
  const { dataset: sourceDataset, layer } = resolveTarget(
    program,
    args.target,
    getPositionChannelDefinition(channel).markTypes
  );
  return resolveLayerPositionEncoding(program, channel, args, operation, layer, sourceDataset);
}

// A new facade layer has no graphics yet; it uses exactly the same semantic
// policy and scale resolution as a stored mark, with its real source dataset.
export function resolveLayerPositionEncoding(program, channel, args, operation, layer, sourceDataset) {
  validateOptions(args, POSITION_ENCODING_OPTIONS, operation);
  validatePositionChannel(channel);
  const target = layer.id;
  const previous = layer.encoding?.[channel];
  if (isSourceOwnedText(layer)) {
    throw new Error(`${operation} cannot replace source-owned Text positions; edit the source, use dx/dy, or create independent Text with data.`);
  }
  if (
    Object.hasOwn(args, "weight") &&
    !(layer.mark.type === "arc" && channel === "theta") &&
    !(layer.mark.type === "bar" && channel === "x" &&
      (args.bin !== undefined || previous?.bin !== undefined))
  ) {
      throw new Error(
        `${operation} weight is supported only for arc theta encoding or histogram x encoding.`
      );
  }
  if (Object.hasOwn(args, "mapping") && (layer.mark.type !== "arc" || channel !== "radius")) {
    throw new Error(`${operation} mapping requires Arc radius.`);
  }
  validateCoordinateFamily(layer, channel, operation);
  const clearRadialMapping =
    layer.mark.type === "arc" && channel === "radius" && args.mapping === false;
  const hasField = Object.hasOwn(args, "field");
  const hasDatum = Object.hasOwn(args, "datum");
  validatePositionSource(layer, args, operation);
  const mapping = channel === "radius" && layer.mark.type === "arc"
    ? clearRadialMapping
      ? undefined
      : args.mapping ?? findSemanticScale(program, previous?.scale)?.radialMapping
    : undefined;
  const countRadius = channel === "radius" && layer.mark.type === "arc" &&
    !clearRadialMapping && (args.aggregate ?? previous?.aggregate) === "count";
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
  const dataset = hasField
    ? applyRequestedItemMissingPolicy(layer, sourceDataset, field)
    : applyRequestedItemMissingPolicy(layer, sourceDataset);
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
  if (clearRadialMapping && args.aggregate === undefined) delete effectiveArgs.mapping;
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
    layer: ["line", "area", "bar", "arc"].includes(layer.mark.type) ? conditionalPositionTemplate(layer, ["x", "y", "x2", "y2", "theta", "radius"]) : layer,
    dataset,
    channel,
    args: effectiveArgs,
    fieldType,
    field
  });
  const aggregateOutput = isAggregate(policy.aggregate) && !(
    layer.mark.type === "arc" && channel === "theta"
  );
  const requestedScale = resolvePositionScaleRequest(layer, channel, args);
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
  if (layer.mark.type === "line" && layer.mark.missing === "break") {
    readLinePosition(dataset.values, { field, fieldType, temporalUnit });
  } else if (layer.mark.type === "area" && fieldType === "quantitative") {
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
    coordinate: resolvePositionCoordinate(program, channel, layer, args.coordinate),
    clearRadialMapping,
    ...policy
  };
}
