import { POSITION_ENCODING_CHANNELS, OFFSET_POSITION_CHANNELS } from "../core/vocabulary.js";
import { isConditionalPositionChannel, validateConditionalPositionValue } from "./conditionalPosition.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { validateNonEmptyString, validateNonNegativeFinite } from "../core/validation.js";
import { normalizeConditionalEncoding } from "./conditionalEncoding.js";
import { validateExpressionParameterInputs } from "./expressionInputs.js";
import { array, record } from "./expressionValues.js";
import { validatePointShape } from "./pointShapes.js";
import { normalizeStrokeDashPattern, validateOpacityValue, validateSemanticFieldType, validateTemporalUnit,
  validateSizeScaleType, validateSizeScaleRange, validateOpacityRange, validateStrokeWidthRange,
  validateOrdinalScaleType, validateLinearScaleType, validateScaleTypeForRole, SCALE_ROLES,
  validateShapeRange, validateStrokeDashRange, validateColorRange, validateScaleUnknown,
  isContinuousColorScaleType, isDiscretizedColorScaleType } from "./scales/index.js";
import { validateAggregate } from "./aggregate.js";
import { validateTextOffsetEncoding, validateTextFormat, formatTextValue } from "./text.js";
import { validateMarkLabelContent, validateMarkLabelNormalization } from "./markLabels.js";

export const CONDITIONAL_APPEARANCE_CHANNELS = Object.freeze([
  "color", "stroke", "size", "shape", "opacity", "strokeWidth", "strokeDash", "angle"
]);
export const CONDITIONAL_CHANNELS = Object.freeze([...CONDITIONAL_APPEARANCE_CHANNELS, ...POSITION_ENCODING_CHANNELS, "text", "dx", "dy", "pointRadius"]);

export function conditionalValues(definition) {
  return [...definition.conditions.map(condition => condition.value), definition.otherwise];
}

// Stored branches reuse the ordinary resolved field encoding. Constant intent
// stays here instead of being duplicated in a mark configuration.
export function normalizeStoredConditionalValue(channel, value) {
  if (!CONDITIONAL_CHANNELS.includes(channel)) throw new Error(`Unsupported conditional channel "${channel}".`);
  if (isConditionalPositionChannel(channel)) return cloneAndFreeze(validateConditionalPositionValue(channel, value));
  if (["dx", "dy"].includes(channel)) {
    validateTextOffsetEncoding(value, channel);
    return cloneAndFreeze(value);
  }
  if (channel === "text") {
    const keys = ["field", "datum", "content"].filter(key => Object.hasOwn(value ?? {}, key));
    if (keys.length !== 1) throw new TypeError("Conditional text requires exactly one field, datum or content.");
    record(value, [keys[0], "format"], keys[0] === "content" && value.content === "share" ? ["normalizeBy"] : [], "Conditional text");
    validateTextFormat(value.format);
    if (keys[0] === "field") validateNonEmptyString(value.field, "Conditional text field");
    else if (keys[0] === "content") {
      validateMarkLabelContent(value.content);
      if (value.content === "share") validateMarkLabelNormalization(value.normalizeBy);
    } else if (formatTextValue(value.datum, value.format) === undefined) throw new Error("Conditional text datum must produce non-empty text.");
    return cloneAndFreeze(value);
  }
  if (channel === "pointRadius") {
    record(value, ["value"], [], "Conditional point radius");
    validateNonNegativeFinite(value.value, "Conditional point radius");
    return cloneAndFreeze(value);
  }
  if (Object.hasOwn(value ?? {}, "value")) {
    record(value, ["value"], [], "Conditional constant");
    if (["color", "stroke"].includes(channel)) validateNonEmptyString(value.value, `${channel} value`);
    else if (["size", "strokeWidth"].includes(channel)) validateNonNegativeFinite(value.value, `${channel} value`);
    else if (channel === "opacity") validateOpacityValue(value.value, "Conditional opacity");
    else if (channel === "shape") validatePointShape(value.value);
    else if (channel === "strokeDash") return cloneAndFreeze({ value: normalizeStrokeDashPattern(value.value) });
    else if (!Number.isFinite(value.value)) throw new TypeError("Conditional angle must be finite degrees.");
  } else {
    record(value, ["field", "fieldType", ...(channel === "angle" ? [] : ["scale"])], ["aggregate", "temporalUnit"], "Conditional field encoding");
    validateNonEmptyString(value.field, "Conditional field");
    validateSemanticFieldType(value.fieldType);
    if (channel !== "angle") validateUserId(value.scale, "Conditional scale id");
    if (value.aggregate !== undefined) {
      if (channel !== "color") throw new Error("Only conditional color supports an existing aggregate.");
      validateAggregate(value.aggregate);
    }
    if (["opacity", "strokeWidth", "angle"].includes(channel) && value.fieldType !== "quantitative") throw new TypeError(`Conditional ${channel} requires a quantitative field.`);
    if (channel === "shape" && value.fieldType !== "nominal") throw new TypeError("Conditional shape requires a nominal field.");
    if (channel === "size" && !["quantitative", "nominal", "ordinal"].includes(value.fieldType)) throw new TypeError("Conditional size requires a quantitative or categorical field.");
    if (channel === "strokeDash" && !["nominal", "ordinal"].includes(value.fieldType)) throw new TypeError("Conditional strokeDash requires a categorical field.");
    if (value.temporalUnit !== undefined) {
      if (!["color", "stroke"].includes(channel) || value.fieldType !== "temporal") throw new TypeError("Conditional temporalUnit requires a temporal color or stroke field.");
      validateTemporalUnit(value.temporalUnit);
    }
  }
  return cloneAndFreeze(value);
}

export function validateStoredConditional(channel, definition) {
  record(definition, ["conditions", "otherwise", "parameterInputs", "selectionInputs"], [], "Stored conditional encoding");
  const normalized = normalizeConditionalEncoding({ conditions: definition.conditions, otherwise: definition.otherwise }, {
    normalizeValue: value => {
      const normalized = normalizeStoredConditionalValue(channel, value);
      if (channel === "strokeDash" && Object.hasOwn(value, "value") && !Array.isArray(value.value)) {
        throw new TypeError("Stored conditional strokeDash requires a normalized dash array.");
      }
      return normalized;
    }
  });
  validateExpressionParameterInputs(definition.parameterInputs, normalized.parameters, "Conditional");
  array(definition.selectionInputs, 64, "Conditional selection inputs");
  if (definition.selectionInputs.length !== normalized.selections.length) throw new TypeError("Conditional selection inputs must exactly match its dependencies.");
  definition.selectionInputs.forEach((input, index) => {
    record(input, ["selection", "kind", "id", "revision"], [], "Conditional selection input");
    if (input.selection !== normalized.selections[index] || input.kind !== "persistent-selection") throw new TypeError("Conditional selection inputs must preserve dependency order and kind.");
    validateUserId(input.id, "Conditional selection resource id");
    if (!Number.isSafeInteger(input.revision) || input.revision < 0) throw new TypeError("Conditional selection revision must be a non-negative safe integer.");
  });
  return normalized;
}

// The same field/scale roles and range validators used by ordinary encoders.
// This validates persisted dependencies without evaluating branch predicates.
export function validateConditionalScale(channel, encoding, scale) {
  const categorical = ["nominal", "ordinal"].includes(encoding.fieldType);
  if (isConditionalPositionChannel(channel)) {
    if (OFFSET_POSITION_CHANNELS.includes(channel)) {
      if (!categorical) throw new Error("Conditional offset requires a categorical field.");
      validateOrdinalScaleType(scale.type);
    } else if (categorical) {
      if (!["band", "point"].includes(scale.type)) throw new Error("Conditional categorical position requires a band or point scale.");
    } else validateScaleTypeForRole(scale.type, encoding.fieldType === "temporal" ? SCALE_ROLES.temporalPosition : SCALE_ROLES.quantitativePosition);
  } else if (channel === "size") {
    validateSizeScaleType(scale.type);
    if ((scale.type === "ordinal") !== categorical) throw new Error("Conditional size scale type must match its field type.");
    validateSizeScaleRange(scale.type, scale.range);
  } else if (channel === "opacity") {
    validateLinearScaleType(scale.type); validateOpacityRange(scale.range);
  } else if (channel === "strokeWidth") {
    validateScaleTypeForRole(scale.type, SCALE_ROLES.quantitativePosition); validateStrokeWidthRange(scale.range);
  } else if (["shape", "strokeDash"].includes(channel)) {
    validateOrdinalScaleType(scale.type);
    (channel === "shape" ? validateShapeRange : validateStrokeDashRange)(scale.range);
  } else if (["color", "stroke"].includes(channel)) {
    if (categorical) { validateOrdinalScaleType(scale.type); validateColorRange(scale.range); }
    else if (!isContinuousColorScaleType(scale.type) && !isDiscretizedColorScaleType(scale.type)) throw new Error("Conditional color requires a continuous or discretized color scale.");
  }
  if (Object.hasOwn(scale, "unknown")) validateScaleUnknown(channel, scale.unknown);
}
