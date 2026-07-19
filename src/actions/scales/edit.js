import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { validateOptionObject } from "../../core/validation.js";
import {
  isTransformedScaleType,
  SCALE_ROLES,
  validateColorRange,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateOrdinalDomain,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateScaleTypeForRole,
  validateShapeRange,
  validateSizeRange,
  validateStrokeDashRange,
  validateSequentialColorRange,
  validateScaleUnknown,
  isDiscretizedColorScaleType,
  isDiscretePositionScaleType,
  hasOrdinalDomain,
  normalizeScaleDefinition
} from "../../grammar/scales/index.js";
import {
  validateRadialRange,
  validateThetaRange
} from "../../grammar/polar.js";
import { getMarkMaterializationStep } from "../../materialization/marks.js";
import {
  applyMaterializationPlan
} from "../../materialization/dependencies.js";
import {
  findSemanticScale,
  requireSemanticScale
} from "../../selectors/scales.js";
import { findScaleConsumers } from "./consumers.js";
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";

const OPTIONS = Object.freeze([
  "id", "type", "domain", "range", "nice", "zero", "clamp", "reverse",
  "base", "exponent", "constant", "paddingInner", "paddingOuter", "padding",
  "align", "interpolate", "unknown", "palette"
]);
const EDITABLE = Object.freeze(
  OPTIONS.filter(option => !["id", "palette"].includes(option))
);
const REQUESTED_CHANGES = Object.freeze(OPTIONS.filter(option => option !== "id"));

function resolveScaleId(program, requested) {
  if (requested !== undefined) {
    const id = validateUserId(requested, "Scale id");
    requireSemanticScale(program, id);
    return id;
  }
  const current = program.context.currentScale;
  if (
    typeof current === "string" && findSemanticScale(program, current) !== undefined
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

function resolveChannel(consumers, id) {
  const channels = new Set(
    consumers.map(consumer => normalizePositionScaleChannel(consumer.channel))
  );
  if (channels.size > 1) {
    throw new Error(`Scale "${id}" cannot be shared across channels.`);
  }
  return channels.values().next().value;
}

function validateRangeForChannel(scale, channel, value) {
  if (value === "auto") return value;
  if (channel === "theta") return validateThetaRange(value);
  if (channel === "radius") return validateRadialRange(value);
  if (scale.type === "sequential") {
    return validateSequentialColorRange(value);
  }
  if (isDiscretizedColorScaleType(scale.type)) {
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
  if (nextType === "sequential" || isDiscretizedColorScaleType(nextType)) {
    const discretized = isDiscretizedColorScaleType(nextType);
    if (channel !== "color" || consumers.some(consumer =>
      ["nominal", "ordinal"].includes(consumer.encoding.fieldType) ||
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
      (!["x", "y", "theta"].includes(channel) ||
        consumers.some(consumer => consumer.encoding.fieldType !== "temporal"))
    ) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "time".`
      );
    }
    return;
  }
  const discrete = isDiscretePositionScaleType(nextType);
  if (discrete) {
    if (
      consumers.length > 0 &&
      (!["x", "y", "theta"].includes(channel) || consumers.some(consumer =>
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
    (consumers.length > 0 && !["x", "y", "theta", "radius"].includes(channel))
  ) {
    throw new Error(
      "editScale type transition currently requires a quantitative position scale."
    );
  }
  validateScaleTypeForRole(nextType, SCALE_ROLES.quantitativePosition);
  if (channel === "theta" && nextType !== "linear") {
    throw new Error("Theta quantitative position currently requires a linear scale.");
  }
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
    !isDiscretizedColorScaleType(nextType)
  ) {
    throw new Error(
      `Scale "${scale.id}" cannot change type while its interval legend is active.`
    );
  }
}

function normalizeDefinition(scale, channel, consumers, args) {
  const type = args.type ?? scale.type;
  validateTypeTransition(scale, type, channel, consumers);
  const definition = normalizeScaleDefinition({
    type,
    previous: scale,
    patch: args,
    retainCoreOnTypeChange: true,
    retainCompatibleOnTypeChange: true,
    validateDomain: (scaleType, value) =>
      isDiscretizedColorScaleType(scaleType)
        ? validateDiscretizedColorDomain(scaleType, value)
        : hasOrdinalDomain(scaleType)
          ? validateOrdinalDomain(value)
          : validateScaleDomain(value),
    validateRange: (scaleType, value) =>
      validateRangeForChannel({ type: scaleType }, channel, value)
  });
  const typeChanged = type !== scale.type;
  const unknown = Object.hasOwn(args, "unknown")
    ? args.unknown
    : typeChanged ? undefined : scale.unknown;
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
    validateOptionObject(args, OPTIONS, "editScale");
    if (!REQUESTED_CHANGES.some(property => Object.hasOwn(args, property))) {
      throw new Error("editScale requires at least one editable property.");
    }
    const hasPalette = Object.hasOwn(args, "palette");
    if (hasPalette && Object.hasOwn(args, "range")) {
      throw new Error("editScale cannot specify both palette and range.");
    }

    const id = resolveScaleId(this, args.id);
    const scale = requireSemanticScale(this, id);
    const consumers = findScaleConsumers(this, id);
    const channel = resolveChannel(consumers, id);
    if (
      hasPalette &&
      channel !== "color" &&
      scale.type !== "sequential" &&
      !isDiscretizedColorScaleType(scale.type)
    ) {
      throw new Error("editScale palette requires a color scale.");
    }
    const patch = !hasPalette
      ? args
      : Object.fromEntries([
          ...Object.entries(args).filter(([key]) => key !== "palette"),
          ["range", { palette: args.palette }]
        ]);
    validateLegendTypeTransition(this, scale, args.type ?? scale.type);
    const definition = normalizeDefinition(scale, channel, consumers, patch);

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
