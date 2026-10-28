import { normalizeConditionalEncoding } from "./conditionalEncoding.js";
import { normalizeCategoryOrder } from "./categoryOrder.js";
import { positionBindings } from "../core/encodingBindings.js";
import { validateUserId } from "../core/identifiers.js";
import { validateNonEmptyString } from "../core/validation.js";
import { POSITION_ENCODING_CHANNELS, STACK_MODES } from "../core/vocabulary.js";
import { record } from "./expressionValues.js";
import { normalizePositionDatum } from "./positionDatum.js";
import { validateAggregate } from "./aggregate.js";
import { normalizeHistogramBin } from "./histogram.js";
import { normalizeStatisticalWeight } from "./weightedStatistics.js";
import { validateSemanticFieldType, validateTemporalUnit } from "./scales/index.js";

export function isConditionalPositionChannel(channel) {
  return POSITION_ENCODING_CHANNELS.includes(channel);
}

export function validateConditionalPositionValue(channel, value) {
  record(value, ["fieldType", "scale"], ["field", "datum", "temporalUnit", "aggregate", "bin", "stack", "weight", "categoryOrder"], "Conditional position");
  const countRadius = channel === "radius" && value.aggregate === "count" && !Object.hasOwn(value, "field") && !Object.hasOwn(value, "datum");
  if (!countRadius && Object.hasOwn(value, "field") === Object.hasOwn(value, "datum")) throw new TypeError("Conditional position requires exactly one field or datum.");
  validateSemanticFieldType(value.fieldType);
  validateUserId(value.scale, "Conditional position scale");
  if (Object.hasOwn(value, "field")) validateNonEmptyString(value.field, "Conditional position field");
  else if (!countRadius) normalizePositionDatum(value.datum, value.fieldType, channel, value.temporalUnit);
  if (value.temporalUnit !== undefined) {
    if (value.fieldType !== "temporal") throw new TypeError("Conditional temporalUnit requires a temporal position.");
    validateTemporalUnit(value.temporalUnit);
  }
  if (value.categoryOrder !== undefined) normalizeCategoryOrder(value.categoryOrder);
  if (value.aggregate !== undefined) validateAggregate(value.aggregate);
  if (value.bin !== undefined) normalizeHistogramBin(value.bin);
  if (value.stack !== undefined && value.stack !== null && !STACK_MODES.includes(value.stack)) throw new TypeError("Unsupported conditional position stack.");
  if (value.weight !== undefined) channel === "theta" ? validateNonEmptyString(value.weight, "Arc theta weight") : normalizeStatisticalWeight(value.weight);
  return value;
}

export function conditionalPositionUsesRows(layer) {
  return POSITION_ENCODING_CHANNELS.some(channel => {
    const definition = layer.conditionals?.[channel];
    if (definition === undefined) return false;
    const normalized = normalizeConditionalEncoding({ conditions: definition.conditions, otherwise: definition.otherwise });
    return normalized.fields.length > 0 || normalized.selections.length > 0 || positionBindings(layer, channel).some(binding => binding.field !== undefined);
  });
}
