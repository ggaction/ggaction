import { cloneAndFreeze } from "../../core/immutable.js";
import { isNominalValue } from "./fields.js";
import { validateColorRange, validateStrokeDashRange } from "./appearance.js";
import { validatePair, validateScaleRange } from "./validation.js";
import { resolveScaleRange } from "./continuous.js";

export function validateOrdinalDomain(domain) {
  if (domain === "auto") return domain;
  if (
    !Array.isArray(domain) ||
    domain.length === 0 ||
    !domain.every(isNominalValue) ||
    new Set(domain).size !== domain.length
  ) {
    throw new TypeError(
      "Ordinal domain must be \"auto\" or unique nominal values."
    );
  }
  return cloneAndFreeze(domain);
}

export function validateOrdinalRange(range) {
  if (range === "auto") return range;
  if (Array.isArray(range) && range.length === 2 && range.every(Number.isFinite)) {
    return cloneAndFreeze(range);
  }
  if (Array.isArray(range) && range.every(item => typeof item === "string")) {
    return validateColorRange(range);
  }
  if (Array.isArray(range) && range.every(Array.isArray)) {
    return validateStrokeDashRange(range);
  }
  return validateColorRange(range);
}

export function resolveOrdinalDomain(domain, values) {
  const validated = validateOrdinalDomain(domain);
  if (validated !== "auto") return validated;
  if (values.length === 0) {
    throw new Error("Cannot infer an automatic ordinal domain from no values.");
  }
  return cloneAndFreeze([...new Set(values)]);
}

export function resolveOrdinalPositionScale({
  domain,
  values,
  range,
  channel,
  bounds
}) {
  const resolvedDomain = resolveOrdinalDomain(domain, values);
  const resolvedRange = resolveScaleRange(range, channel, bounds);
  const domainValues = new Set(resolvedDomain);
  for (const value of values) {
    if (!domainValues.has(value)) {
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
  }
  const step = (resolvedRange[1] - resolvedRange[0]) / resolvedDomain.length;
  return cloneAndFreeze({
    type: "ordinal",
    domain: resolvedDomain,
    range: resolvedRange,
    step,
    bandwidth: Math.abs(step)
  });
}

export function resolveOrdinalOffsetScale({
  domain,
  values,
  range,
  parentBandwidth,
  paddingInner = 0,
  paddingOuter = 0
}) {
  const resolvedDomain = resolveOrdinalDomain(domain, values);
  if (!Number.isFinite(parentBandwidth) || parentBandwidth <= 0) {
    throw new Error("Automatic xOffset range requires a positive x bandwidth.");
  }
  const resolvedRange = range === "auto"
    ? validatePair([0, parentBandwidth], "Offset scale range")
    : validateScaleRange(range);
  if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
    throw new RangeError(
      "Offset scale paddingInner must be from 0 (inclusive) to 1 (exclusive)."
    );
  }
  if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
    throw new RangeError(
      "Offset scale paddingOuter must be a non-negative finite number."
    );
  }
  const domainValues = new Set(resolvedDomain);
  for (const value of values) {
    if (!domainValues.has(value)) {
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
  }
  const step = (resolvedRange[1] - resolvedRange[0]) /
    Math.max(1, resolvedDomain.length - paddingInner + paddingOuter * 2);
  const bandwidth = Math.abs(step) * (1 - paddingInner);
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    throw new Error("Offset scale padding must leave a positive bandwidth.");
  }
  return cloneAndFreeze({
    type: "ordinal",
    domain: resolvedDomain,
    range: resolvedRange,
    step,
    start: resolvedRange[0] + step * paddingOuter,
    bandwidth,
    paddingInner,
    paddingOuter
  });
}

export function mapOrdinalPositionValues(values, scale) {
  const indices = new Map(scale.domain.map((value, index) => [value, index]));
  return cloneAndFreeze(values.map(value => {
    const index = indices.get(value);
    if (index === undefined) {
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
    return scale.range[0] + (index + 0.5) * scale.step;
  }));
}
