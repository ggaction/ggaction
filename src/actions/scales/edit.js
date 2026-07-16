import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { validateKeys } from "../../core/validation.js";
import {
  isTransformedScaleType,
  normalizeTransformParameters,
  SCALE_ROLES,
  validateColorRange,
  validateContinuousColorInterpolation,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateOrdinalDomain,
  validateScaleDomain,
  validateScalePropertyForType,
  validateScaleRange,
  validateScaleType,
  validateScaleTypeForRole,
  validateShapeRange,
  validateSizeRange,
  validateStrokeDashRange,
  validateSequentialColorRange,
  validateScaleUnknown,
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
  "base", "exponent", "constant", "paddingInner", "paddingOuter", "padding",
  "align", "interpolate", "unknown"
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
  if (scale.type === "sequential") {
    return validateSequentialColorRange(value);
  }
  if (["quantize", "quantile", "threshold"].includes(scale.type)) {
    return validateDiscretizedColorRange(value);
  }
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
  if (consumers.length === 0) return;
  if (["sequential", "quantize", "quantile", "threshold"].includes(nextType)) {
    const discretized = nextType !== "sequential";
    if (channel !== "color" || consumers.some(consumer =>
      consumer.encoding.fieldType === "nominal" ||
      (discretized && (
        consumer.encoding.fieldType !== "quantitative" ||
        consumer.layer.mark?.type !== "point"
      )) ||
      (!discretized && !["point", "bar"].includes(consumer.layer.mark?.type))
    )) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`
      );
    }
    return;
  }
  if (nextType === "time") {
    if (
      consumers.length > 0 &&
      (!["x", "y"].includes(channel) ||
        consumers.some(consumer => consumer.encoding.fieldType !== "temporal"))
    ) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "time".`
      );
    }
    return;
  }
  const discrete = ["band", "point"].includes(nextType);
  if (discrete) {
    if (
      consumers.length > 0 &&
      (!["x", "y"].includes(channel) || consumers.some(consumer =>
        !["nominal", "ordinal"].includes(consumer.encoding.fieldType)
      ))
    ) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`
      );
    }
    if (
      nextType === "point" &&
      consumers.some(consumer => consumer.layer.mark?.type === "bar")
    ) {
      throw new Error("Point scales cannot provide bar bandwidth.");
    }
    return;
  }
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
}

function validateLegendTypeTransition(program, scale, nextType) {
  if (nextType === scale.type) return;
  const legends = program.guideConfigs.legend ?? {};
  if (
    legends.gradient?.scale === scale.id &&
    nextType !== "sequential"
  ) {
    throw new Error(
      `Scale "${scale.id}" cannot change type while its gradient legend is active.`
    );
  }
  if (
    legends.interval?.scale === scale.id &&
    !["quantize", "quantile", "threshold"].includes(nextType)
  ) {
    throw new Error(
      `Scale "${scale.id}" cannot change type while its interval legend is active.`
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
  const domain = ["quantize", "quantile", "threshold"].includes(type)
    ? validateDiscretizedColorDomain(type, args.domain ?? scale.domain)
    : ["ordinal", "band", "point"].includes(type)
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
  const interpolate = Object.hasOwn(args, "interpolate")
    ? args.interpolate
    : typeChanged ? undefined : scale.interpolate;
  if (type === "sequential") {
    definition.interpolate = validateContinuousColorInterpolation(
      interpolate ?? "rgb"
    );
  } else if (interpolate !== undefined) {
    throw new Error(`Scale type "${type}" does not support interpolate.`);
  }
  const unknown = propertyValue(scale, typeChanged, args, "unknown");
  if (unknown !== undefined) {
    if (consumers.some(consumer => consumer.layer.mark?.type !== "point")) {
      throw new Error(
        "Scale unknown currently requires row-owned point consumers."
      );
    }
    definition.unknown = consumers.length === 0
      ? unknown
      : validateScaleUnknown(channel, unknown);
  }
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
  if (type === "band") {
    const paddingInner = propertyValue(scale, typeChanged, args, "paddingInner") ?? 0;
    const paddingOuter = propertyValue(scale, typeChanged, args, "paddingOuter") ?? 0;
    const align = propertyValue(scale, typeChanged, args, "align") ?? 0.5;
    if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
      throw new RangeError("Scale paddingInner must be from 0 (inclusive) to 1 (exclusive).");
    }
    if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
      throw new RangeError("Scale paddingOuter must be non-negative and finite.");
    }
    if (!Number.isFinite(align) || align < 0 || align > 1) {
      throw new RangeError("Scale align must be between 0 and 1.");
    }
    Object.assign(definition, { paddingInner, paddingOuter, align });
  } else if (type === "point") {
    const padding = propertyValue(scale, typeChanged, args, "padding") ?? 0.5;
    const align = propertyValue(scale, typeChanged, args, "align") ?? 0.5;
    if (!Number.isFinite(padding) || padding < 0) {
      throw new RangeError("Scale padding must be non-negative and finite.");
    }
    if (!Number.isFinite(align) || align < 0 || align > 1) {
      throw new RangeError("Scale align must be between 0 and 1.");
    }
    Object.assign(definition, { padding, align });
  } else {
    for (const property of ["paddingInner", "paddingOuter", "padding", "align"]) {
      if (args[property] !== undefined) validateScalePropertyForType(type, property);
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
    validateLegendTypeTransition(this, scale, args.type ?? scale.type);
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
