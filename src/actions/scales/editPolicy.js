import {
  hasOrdinalDomain,
  isDiscretizedColorScaleType,
  isDiscretePositionScaleType,
  isTransformedScaleType,
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
import { normalizePositionScaleChannel } from "../../core/vocabulary.js";

export function resolveScaleConsumerChannel(consumers, id) {
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
  if (channel === "strokeWidth") return validateStrokeWidthRange(value);
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

function validateLegendTypeTransition(program, scale, nextType) {
  if (nextType === scale.type) return;
  const legends = program.guideConfigs.legend ?? {};
  if (legends.gradient?.scale === scale.id && nextType !== "sequential") {
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

function normalizeDefinition(scale, channel, consumers, patch) {
  if (scale.radialMapping !== undefined && Object.hasOwn(patch, "radialMapping") &&
    patch.radialMapping === undefined && consumers.some(consumer => consumer.encoding.aggregate !== undefined)) {
    throw new Error("Remove measured radius encodings before clearing their scale mapping.");
  }
  const type = patch.type ?? scale.type;
  validateTypeTransition(scale, type, channel, consumers);
  const definition = normalizeScaleDefinition({
    type,
    previous: scale,
    patch,
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
  if (
    channel === "strokeWidth" &&
    definition.domain !== "auto" &&
    definition.domain.some(value => value < 0)
  ) {
    throw new RangeError("StrokeWidth scale domain cannot contain negative values.");
  }
  validateSequentialMidpoint(definition.midpoint, type, definition.domain);
  if (definition.midpoint !== undefined && consumers.some(
    consumer => consumer.channel !== "color" || consumer.encoding.fieldType !== "quantitative"
  )) {
    throw new Error("Scale midpoint requires quantitative color consumers.");
  }
  const typeChanged = type !== scale.type;
  const unknown = Object.hasOwn(patch, "unknown")
    ? patch.unknown
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
  validateLegendTypeTransition(program, scale, args.type ?? scale.type);
  return normalizeDefinition(scale, channel, consumers, patch);
}
