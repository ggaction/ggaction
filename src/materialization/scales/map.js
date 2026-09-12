import {
  isContinuousColorScaleType,
  isDiscretizedColorScaleType,
  isOrdinalScaleType,
  mapContinuousScaleValues,
  mapDiscretizedColors,
  mapSizeValues,
  mapOrdinalValues,
  mapSequentialColors
} from "../../grammar/scales/index.js";

export function mapScaleConsumerValues(values, resolvedScale, channel) {
  if (channel === "size") return mapSizeValues(values, resolvedScale);
  if (["color", "stroke"].includes(channel) && isDiscretizedColorScaleType(resolvedScale.type)) {
    return mapDiscretizedColors(values, resolvedScale);
  }
  if (["color", "stroke"].includes(channel) && isContinuousColorScaleType(resolvedScale.type)) {
    return mapSequentialColors(
      values,
      resolvedScale.domain,
      resolvedScale.range,
      {
        interpolation: resolvedScale.interpolate,
        midpoint: resolvedScale.midpoint,
        clamp: resolvedScale.clamp ?? false,
        ...(Object.hasOwn(resolvedScale, "unknown")
          ? { unknown: resolvedScale.unknown }
          : {})
      }
    );
  }
  if (
    ["color", "stroke", "strokeDash", "shape"].includes(channel) &&
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
