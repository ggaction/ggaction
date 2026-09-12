import { validateContinuousColorConsumer } from "../../grammar/scales/colorConsumers.js";
import {
  hasOrdinalDomain,
  isDiscretizedColorScaleType,
  isDiscretePositionScaleType,
  isTransformedScaleType,
  normalizeSizeScaleDefinition,
  normalizeScaleDefinition,
  SCALE_ROLES,
  validateColorRange,
  validateDiscretizedColorDomain,
  validateDiscretizedColorRange,
  validateOrdinalDomain,
  validateScaleDomain,
  validateScaleRange,
  validateScaleType,
  validateScaleTypeForRole,
  validateScaleUnknown,
  validateSequentialMidpoint,
  validateSequentialColorRange,
  validateShapeRange,
  validateSizeRange,
  validateStrokeDashRange,
  validateStrokeWidthRange
} from "../../grammar/scales/index.js";
import {
  validateRadialRange,
  validateThetaRange
} from "../../grammar/polar.js";
import {
  normalizePositionScaleChannel,
  OFFSET_POSITION_CHANNELS
} from "../../core/vocabulary.js";
import { normalizeOffsetScalePolicy } from "../../grammar/bars/geometry.js";
import { resolveRequestedOffsetPolicy } from
  "../../materialization/scales/policies/offset.js";

export function resolveScaleConsumerChannel(consumers, id) {
  const channels = new Set(
    consumers.map(consumer => {
      const channel = normalizePositionScaleChannel(consumer.channel);
      return channel === "stroke" ? "color" : channel;
    })
  );
  if (channels.size > 1) {
    throw new Error(`Scale "${id}" cannot be shared across channels.`);
  }
  return channels.values().next().value;
}

function validateRangeForChannel(scale, channel, value) {
  if (value === "auto") return value;
  if (channel === "size") return validateSizeRange(value);
  if (channel === "theta") return validateThetaRange(value);
  if (channel === "radius") return validateRadialRange(value);
  if (scale.type === "sequential") {
    return validateSequentialColorRange(value);
  }
  if (isDiscretizedColorScaleType(scale.type)) {
    return validateDiscretizedColorRange(value);
  }
  if (scale.type !== "ordinal") return validateScaleRange(value);
  if (["color", "stroke"].includes(channel)) return validateColorRange(value);
  if (channel === "shape") return validateShapeRange(value);
  if (channel === "strokeDash") return validateStrokeDashRange(value);
  if (channel === "size") return validateSizeRange(value);
  if (channel === "strokeWidth") return validateStrokeWidthRange(value);
  return validateScaleRange(value);
}

function validateTypeTransition(scale, nextType, channel, consumers) {
  if (nextType === scale.type) return;
  validateScaleType(nextType);
  if (consumers.length === 0) return;
  if (nextType === "sequential" || isDiscretizedColorScaleType(nextType)) {
    if (channel !== "color") {
      throw new Error(`Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`);
    }
    for (const consumer of consumers) {
      validateContinuousColorConsumer(
        consumer.layer,
        consumer.encoding,
        { type: nextType },
        { channel: consumer.channel }
      );
    }
    return;
  }
  if (nextType === "ordinal" && channel === "color") {
    if (consumers.some(consumer =>
      !["color", "stroke"].includes(consumer.channel) ||
      !["nominal", "ordinal"].includes(consumer.encoding.fieldType)
    )) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "ordinal".`
      );
    }
    return;
  }
  if (nextType === "time") {
    if (
      !["x", "y", "theta"].includes(channel) ||
      consumers.some(consumer => consumer.encoding.fieldType !== "temporal")
    ) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with type "time".`
      );
    }
    return;
  }
  if (isDiscretePositionScaleType(nextType)) {
    if (
      !["x", "y", "theta"].includes(channel) || consumers.some(consumer =>
        !["nominal", "ordinal"].includes(consumer.encoding.fieldType)
      )
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
    !["x", "y", "theta", "radius", "strokeWidth"].includes(channel)
  ) {
    throw new Error(
      "editScale type transition currently requires a quantitative position scale."
    );
  }
  validateScaleTypeForRole(nextType, SCALE_ROLES.quantitativePosition);
  if (channel === "theta" && nextType !== "linear") {
    throw new Error("Theta quantitative position currently requires a linear scale.");
  }
  if (
    channel === "strokeWidth" &&
    consumers.some(consumer => !["line", "rule"].includes(consumer.layer.mark?.type))
  ) {
    throw new Error(
      `Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`
    );
  }
  if (consumers.some(consumer => consumer.encoding.fieldType !== "quantitative")) {
    throw new Error(
      `Scale "${scale.id}" has a consumer incompatible with type "${nextType}".`
    );
  }
}

function normalizeDefinition(program, scale, channel, consumers, patch) {
  if (scale.radialMapping !== undefined && Object.hasOwn(patch, "radialMapping") &&
    patch.radialMapping === undefined && consumers.some(consumer => consumer.encoding.aggregate !== undefined)) {
    throw new Error("Remove measured radius encodings before clearing their scale mapping.");
  }
  if (channel === "size") {
    if (consumers.some(consumer =>
      consumer.layer.mark?.type !== "point" ||
      consumer.encoding.fieldType !== "quantitative"
    )) {
      throw new Error(
        `Scale "${scale.id}" has a consumer incompatible with size mapping.`
      );
    }
    return normalizeSizeScaleDefinition({ previous: scale, patch });
  }
  const type = patch.type ?? scale.type;
  validateTypeTransition(scale, type, channel, consumers);
  const offset = OFFSET_POSITION_CHANNELS.includes(channel);
  if (offset && Object.hasOwn(patch, "range")) {
    throw new Error(
      `${channel} scale range is derived from its parent categorical slot.`
    );
  }
  if (offset && Object.hasOwn(patch, "unknown")) {
    throw new Error(`${channel} scale unknown is not supported for offset positions.`);
  }
  if (type !== scale.type && scale.domain !== "auto" && !Object.hasOwn(patch, "domain") &&
    (["quantile", "threshold"].includes(type) || ["quantile", "threshold"].includes(scale.type))) {
    throw new Error("Color scale type transition requires an explicit domain when its meaning changes.");
  }
  const offsetPolicy = offset
    ? normalizeOffsetScalePolicy(
        patch,
        resolveRequestedOffsetPolicy({
          scale,
          consumers,
          markConfigs: program.markConfigs,
          id: scale.id,
          channel
        }),
        channel
      )
    : undefined;
  const normalizedPatch = offset
    ? {
        ...Object.fromEntries(Object.entries(patch).filter(
          ([property]) => property !== "padding"
        )),
        ...offsetPolicy
      }
    : patch;
  const definition = normalizeScaleDefinition({
    type,
    previous: scale,
    patch: normalizedPatch,
    retainCoreOnTypeChange: true,
    retainCompatibleOnTypeChange: true,
    allowOrdinalBandParameters: offset,
    validateDomain: (scaleType, value) =>
      isDiscretizedColorScaleType(scaleType)
        ? validateDiscretizedColorDomain(scaleType, value)
        : hasOrdinalDomain(scaleType)
          ? validateOrdinalDomain(value)
          : validateScaleDomain(value),
    validateRange: (scaleType, value) =>
      validateRangeForChannel({ type: scaleType }, channel, value)
  });
  if (
    channel === "strokeWidth" &&
    definition.domain !== "auto" &&
    definition.domain.some(value => value < 0)
  ) {
    throw new RangeError("StrokeWidth scale domain cannot contain negative values.");
  }
  validateSequentialMidpoint(definition.midpoint, type, definition.domain);
  if (definition.midpoint !== undefined && consumers.some(
    consumer => !["color", "stroke"].includes(consumer.channel) ||
      consumer.encoding.fieldType !== "quantitative"
  )) {
    throw new Error("Scale midpoint requires quantitative color consumers.");
  }
  const typeChanged = type !== scale.type;
  const unknown = Object.hasOwn(normalizedPatch, "unknown")
    ? normalizedPatch.unknown
    : typeChanged ? undefined : scale.unknown;
  if (unknown !== undefined) {
    if (consumers.some(consumer => consumer.layer.mark?.type !== "point")) {
      throw new Error("Scale unknown currently requires row-owned point consumers.");
    }
    definition.unknown = consumers.length === 0
      ? unknown
      : validateScaleUnknown(channel, unknown);
  }
  return definition;
}

export function prepareScaleEdit(program, scale, channel, consumers, args) {
  const hasPalette = Object.hasOwn(args, "palette");
  if (hasPalette && Object.hasOwn(args, "range")) {
    throw new Error("editScale cannot specify both palette and range.");
  }
  if (
    hasPalette &&
    !["color", "stroke"].includes(channel) &&
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
  return normalizeDefinition(program, scale, channel, consumers, patch);
}
