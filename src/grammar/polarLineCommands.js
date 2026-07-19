import { buildLinearPathCommands } from "./pathCommands.js";
import { polarToCartesian } from "./polar.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "./scales/index.js";

function mappedTheta(values, fieldType, scale) {
  return ["nominal", "ordinal"].includes(fieldType)
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
}

export function buildPolarLinePathCommands({
  series,
  thetaFieldType,
  thetaScale,
  radiusScale,
  frame,
  closed = false
}) {
  if (!Array.isArray(series) || series.length < 2) {
    throw new TypeError("Polar line commands require at least two series values.");
  }
  if (typeof closed !== "boolean") {
    throw new TypeError("Polar line closed must be a boolean.");
  }
  const theta = mappedTheta(
    series.map(value => value.theta),
    thetaFieldType,
    thetaScale
  );
  const radius = mapContinuousScaleValues(
    series.map(value => value.radius),
    radiusScale
  );
  const points = series.map((_, index) => polarToCartesian({
    theta: theta[index],
    radius: radius[index],
    frame
  }));
  return buildLinearPathCommands(points, { close: closed });
}
