import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  isTransformedScaleType,
  normalizeTransformParameters,
  SCALE_ROLES,
  validateColorRange,
  validateOrdinalDomain,
  validateScaleDomain,
  validateScalePropertyForType,
  validateScaleRange,
  validateScaleType,
  validateScaleTypeForRole,
  validateShapeRange,
  validateSizeRange,
  validateStrokeDashRange,
  validateTransformedDomain
} from "../../grammar/scales.js";
import { getMarkMaterializationStep } from "../../materialization/marks.js";
import {
  applyMaterializationPlan
} from "../../materialization/dependencies.js";
import { requireSemanticScale } from "../../selectors/scales.js";
import { findScaleConsumers } from "./consumers.js";

const OPTIONS = Object.freeze([
  "id", "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant"
]);
const EDITABLE = Object.freeze(OPTIONS.filter(option => option !== "id"));
const TYPE_PARAMETERS = Object.freeze(["base", "exponent", "constant"]);

function resolveScaleId(program, requested) {
  if (requested !== undefined) {
    const id = validateUserId(requested, "Scale id");
    requireSemanticScale(program, id);
    return id;
  }
  const current = program.context.currentScale;
  if (
    typeof current === "string" &&
    program.semanticSpec.scales.some(scale => scale.id === current)
  ) {
    return current;
  }
  if (program.semanticSpec.scales.length === 1) {
    return program.semanticSpec.scales[0].id;
  }
  throw new Error(
    "editScale requires id when no unique current scale can be inferred."
  );
}

function normalizeChannel(channel) {
  return channel === "x2" ? "x" : channel === "y2" ? "y" : channel;
}

function resolveChannel(consumers, id) {
  const channels = new Set(
    consumers.map(consumer => normalizeChannel(consumer.channel))
  );
  if (channels.size > 1) {
    throw new Error(`Scale "${id}" cannot be shared across channels.`);
  }
  return channels.values().next().value;
}

function validateRangeForChannel(scale, channel, value) {
  if (value === "auto") return value;
  if (scale.type !== "ordinal") return validateScaleRange(value);
  if (channel === "color") return validateColorRange(value);
  if (channel === "shape") return validateShapeRange(value);
  if (channel === "strokeDash") return validateStrokeDashRange(value);
  if (channel === "size") return validateSizeRange(value);
  return validateScaleRange(value);
}

function validateTypeTransition(scale, nextType, channel, consumers) {
  if (nextType === scale.type) return;
  validateScaleType(nextType);
  const quantitative = nextType === "linear" || isTransformedScaleType(nextType);
  if (
    !quantitative ||
    (consumers.length > 0 && !["x", "y"].includes(channel))
  ) {
    throw new Error(
      "editScale type transition currently requires a quantitative position scale."
    );
  }
  validateScaleTypeForRole(nextType, SCALE_ROLES.quantitativePosition);
  if (consumers.some(consumer => consumer.encoding.fieldType !== "quantitative")) {
    throw new Error(
      `Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`
    );
  }
  if (
    isTransformedScaleType(nextType) &&
    consumers.some(consumer => consumer.layer.mark?.type !== "point")
  ) {
    throw new Error(
      "Transformed position scale type edits currently require point consumers."
    );
  }
}

function propertyValue(scale, typeChanged, args, property) {
  if (Object.hasOwn(args, property)) return args[property];
  if (!typeChanged) return scale[property];
  if (!Object.hasOwn(scale, property)) return undefined;
  try {
    validateScalePropertyForType(args.type, property);
    return scale[property];
  } catch {
    return undefined;
  }
}

function normalizeDefinition(scale, channel, consumers, args) {
  const type = args.type ?? scale.type;
  const typeChanged = type !== scale.type;
  validateTypeTransition(scale, type, channel, consumers);
  const domain = type === "ordinal"
    ? validateOrdinalDomain(args.domain ?? scale.domain)
    : validateScaleDomain(args.domain ?? scale.domain);
  if (isTransformedScaleType(type) && domain !== "auto") {
    validateTransformedDomain(type, domain, Object.fromEntries(
      TYPE_PARAMETERS
        .filter(property => Object.hasOwn(args, property))
        .map(property => [property, args[property]])
    ));
  }
  const definition = {
    type,
    domain,
    range: Object.hasOwn(args, "range") || typeChanged
      ? validateRangeForChannel({ type }, channel, args.range ?? scale.range)
      : scale.range
  };
  for (const property of ["nice", "zero", "clamp", "reverse"]) {
    const value = propertyValue(scale, typeChanged, args, property);
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new TypeError(`Scale ${property} must be a boolean.`);
    }
    validateScalePropertyForType(type, property);
    definition[property] = value;
  }
  const requested = Object.fromEntries(TYPE_PARAMETERS.flatMap(property => {
    const value = propertyValue(scale, typeChanged, args, property);
    return value === undefined ? [] : [[property, value]];
  }));
  if (isTransformedScaleType(type)) {
    const parameters = normalizeTransformParameters(type, requested);
    if (type === "log") definition.base = parameters.base;
    if (type === "pow") definition.exponent = parameters.exponent;
    if (type === "symlog") definition.constant = parameters.constant;
  } else {
    for (const property of Object.keys(requested)) {
      validateScalePropertyForType(type, property);
    }
  }
  return definition;
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function planMarkRematerialization(program, consumers) {
  const plan = [];
  const seen = new Set();
  for (const consumer of consumers) {
    const step = getMarkMaterializationStep(program, consumer.layer);
    if (step === undefined || seen.has(consumer.layer.id)) continue;
    const pointHandledByScale =
      consumer.layer.mark?.type === "point" &&
      !["size", "shape"].includes(consumer.channel) &&
      program.graphicSpec.objects[consumer.layer.id]?.type !== "collection";
    if (pointHandledByScale) continue;
    seen.add(consumer.layer.id);
    plan.push(step);
  }
  return plan;
}

export const editScale = action(
  {
    op: "editScale",
    description: "Edit an existing scale and rematerialize its consumers."
  },
  function (args = {}) {
    if (!isPlainObject(args)) {
      throw new TypeError("editScale options must be a plain object.");
    }
    validateKeys(args, OPTIONS, "editScale");
    if (!EDITABLE.some(property => Object.hasOwn(args, property))) {
      throw new Error("editScale requires at least one editable property.");
    }

    const id = resolveScaleId(this, args.id);
    const scale = requireSemanticScale(this, id);
    const consumers = findScaleConsumers(this, id);
    const channel = resolveChannel(consumers, id);
    const definition = normalizeDefinition(scale, channel, consumers, args);

    let next = this;
    for (const property of EDITABLE) {
      if (
        Object.hasOwn(scale, property) &&
        !Object.hasOwn(definition, property)
      ) {
        next = next.editSemantic({
          property: `scale[${id}].${property}`,
          remove: true
        });
      }
    }
    for (const property of EDITABLE) {
      if (
        !Object.hasOwn(definition, property) ||
        sameValue(scale[property], definition[property])
      ) continue;
      next = next.editSemantic({
        property: `scale[${id}].${property}`,
        value: definition[property]
      });
    }
    if (consumers.length === 0) return next;

    next = next.rematerializeScale({ id });
    return applyMaterializationPlan(
      next,
      planMarkRematerialization(next, consumers)
    );
  }
);
