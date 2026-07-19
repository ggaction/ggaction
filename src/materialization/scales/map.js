import {
  isContinuousColorScaleType,
  isDiscretizedColorScaleType,
  isOrdinalScaleType,
  mapContinuousScaleValues,
  mapDiscretizedColors,
  mapOrdinalValues,
  mapSequentialColors
} from "../../grammar/scales/index.js";

export function mapScaleConsumerValues(values, resolvedScale, channel) {
  if (channel === "color" && isDiscretizedColorScaleType(resolvedScale.type)) {
    return mapDiscretizedColors(values, resolvedScale);
  }
  if (channel === "color" && isContinuousColorScaleType(resolvedScale.type)) {
    return mapSequentialColors(
      values,
      resolvedScale.domain,
      resolvedScale.range,
      {
        interpolation: resolvedScale.interpolate,
        clamp: resolvedScale.clamp ?? false,
        ...(Object.hasOwn(resolvedScale, "unknown")
          ? { unknown: resolvedScale.unknown }
          : {})
      }
    );
  }
  if (
    ["color", "strokeDash", "shape"].includes(channel) &&
    isOrdinalScaleType(resolvedScale.type)
  ) {
    return mapOrdinalValues(values, resolvedScale.domain, resolvedScale.range, {
      ...(Object.hasOwn(resolvedScale, "unknown")
        ? { unknown: resolvedScale.unknown }
        : {})
    });
  }
  return mapContinuousScaleValues(values, resolvedScale);
}
