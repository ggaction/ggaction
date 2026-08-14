import { cloneAndFreeze } from "../../core/immutable.js";
import { isNominalValue } from "./fields.js";
import { validateColorRange, validateStrokeDashRange } from "./appearance.js";
import { validatePair, validateScaleRange } from "./validation.js";
import { resolveScaleRange } from "./continuous.js";
import { interpolateNumber } from "../numeric.js";

function divideRange(range, denominator, label) {
  const direct = (range[1] - range[0]) / denominator;
  if (Number.isFinite(direct) && (direct !== 0 || range[0] === range[1])) {
    return direct;
  }
  const step = interpolateNumber(range[0], range[1], 1 / denominator) - range[0];
  if (!Number.isFinite(step) || (step === 0 && range[0] !== range[1])) {
    throw new RangeError(`${label} exceeds the finite numeric range.`);
  }
  return step;
}

function requireDistinctPositions(scale, label) {
  const positions = mapOrdinalPositionValues(scale.domain, scale);
  if (positions.some((position, index) =>
    !Number.isFinite(position) ||
    index > 0 && position === positions[index - 1]
  )) {
    throw new RangeError(`${label} cannot represent every domain position.`);
  }
}

function finitePosition(value, scale, proportion) {
  return Number.isFinite(value)
    ? value
    : interpolateNumber(scale.range[0], scale.range[1], proportion);
}

function resolvePositionRange(range, channel, bounds, label) {
  const resolved = range === "auto" && channel === "y"
    ? cloneAndFreeze([bounds.y, bounds.y + bounds.height])
    : resolveScaleRange(range, channel, bounds);
  if (!resolved.every(Number.isFinite)) {
    throw new RangeError(`Automatic ${label} range exceeds the finite numeric range.`);
  }
  return resolved;
}

function validateDomainValues(domain, values, unknown, label) {
  const domainValues = new Set(domain);
  for (const value of values) {
    if (!domainValues.has(value) && unknown === undefined) {
      throw new Error(`Value "${value}" is outside the ${label} domain.`);
    }
  }
}

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
  if (Array.isArray(range)) {
    if (range.length === 2 && range.every(Number.isFinite)) {
      return cloneAndFreeze(range);
    }
    if (range.every(item => typeof item === "string")) {
      return validateColorRange(range);
    }
    if (range.every(Array.isArray)) return validateStrokeDashRange(range);
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
  bounds,
  unknown
}) {
  const resolvedDomain = resolveOrdinalDomain(domain, values);
  const resolvedRange = resolvePositionRange(range, channel, bounds, "ordinal");
  validateDomainValues(resolvedDomain, values, unknown, "ordinal");
  const step = divideRange(
    resolvedRange,
    resolvedDomain.length,
    "Ordinal position step"
  );
  const resolved = {
    type: "ordinal",
    domain: resolvedDomain,
    range: resolvedRange,
    step,
    bandwidth: Math.abs(step)
  };
  requireDistinctPositions(resolved, "Ordinal position range");
  return cloneAndFreeze(resolved);
}

export function resolveDiscretePositionScale({
  type,
  domain,
  values,
  range,
  channel,
  bounds,
  paddingInner = 0,
  paddingOuter = 0,
  padding = 0.5,
  align = 0.5,
  unknown
}) {
  const band = type === "band";
  if (!band && type !== "point") {
    throw new Error(`Unsupported discrete position scale type "${type}".`);
  }
  const resolvedDomain = resolveOrdinalDomain(domain, values);
  const resolvedRange = resolvePositionRange(range, channel, bounds, "discrete");
  validateDomainValues(resolvedDomain, values, unknown, "discrete");
  if (!Number.isFinite(align) || align < 0 || align > 1) {
    throw new RangeError("Discrete scale align must be between 0 and 1.");
  }
  if (band) {
    if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
      throw new RangeError(
        "Band scale paddingInner must be from 0 (inclusive) to 1 (exclusive)."
      );
    }
    if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
      throw new RangeError(
        "Band scale paddingOuter must be a non-negative finite number."
      );
    }
  } else if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError(
      "Point scale padding must be a non-negative finite number."
    );
  }
  const direction = Math.sign(resolvedRange[1] - resolvedRange[0]) || 1;
  const count = resolvedDomain.length;
  const denominator = band
    ? Math.max(1, count - paddingInner + paddingOuter * 2)
    : Math.max(1, count - 1 + padding * 2);
  const step = divideRange(resolvedRange, denominator, "Discrete position step");
  const bandwidth = band
    ? Math.abs(step) * (1 - paddingInner)
    : 0;
  const outerPadding = band ? paddingOuter : padding;
  const directStart = resolvedRange[0] +
    direction * Math.abs(step) * outerPadding * 2 * align;
  const start = Number.isFinite(directStart)
    ? directStart
    : interpolateNumber(
      resolvedRange[0],
      resolvedRange[1],
      outerPadding * 2 * align / denominator
    );
  const resolved = {
    type,
    domain: resolvedDomain,
    range: resolvedRange,
    step,
    start,
    bandwidth,
    align,
    ...(band ? { paddingInner, paddingOuter } : { padding })
  };
  requireDistinctPositions(resolved, "Discrete position range");
  return cloneAndFreeze(resolved);
}

export function resolveOrdinalOffsetScale({
  domain,
  values,
  range,
  parentBandwidth,
  paddingInner = 0,
  paddingOuter = 0,
  channel = "xOffset"
}) {
  const resolvedDomain = resolveOrdinalDomain(domain, values);
  if (!Number.isFinite(parentBandwidth) || parentBandwidth <= 0) {
    throw new Error(
      `Automatic ${channel} range requires a positive ${channel[0]} bandwidth.`
    );
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
  validateDomainValues(resolvedDomain, values, undefined, "ordinal");
  const denominator = Math.max(
    1,
    resolvedDomain.length - paddingInner + paddingOuter * 2
  );
  const step = divideRange(
    resolvedRange,
    denominator,
    "Offset scale padding must leave a positive bandwidth"
  );
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
  const hasUnknown = Object.hasOwn(scale, "unknown");
  const indices = new Map(scale.domain.map((value, index) => [value, index]));
  return cloneAndFreeze(values.map(value => {
    const index = indices.get(value);
    if (index === undefined) {
      if (hasUnknown) return scale.unknown;
      throw new Error(`Value "${value}" is outside the ordinal domain.`);
    }
    const positional = scale.type === "band" || scale.type === "point";
    if (
      !positional ||
      (scale.type === "band" &&
        scale.paddingInner === 0 &&
        scale.paddingOuter === 0 &&
        scale.align === 0.5) ||
      (scale.type === "point" && scale.padding === 0.5 && scale.align === 0.5)
    ) {
      const direct = scale.range[0] + (index + 0.5) * scale.step;
      return finitePosition(direct, scale, (index + 0.5) / scale.domain.length);
    }
    const direction = Math.sign(scale.step) || 1;
    const direct = scale.start + index * scale.step +
      direction * scale.bandwidth / 2;
    const band = scale.type === "band";
    const outer = band ? scale.paddingOuter : scale.padding;
    const inner = band ? scale.paddingInner : 1;
    return finitePosition(
      direct,
      scale,
      (outer * 2 * scale.align + index + (1 - inner) / 2) /
        Math.max(1, scale.domain.length - inner + outer * 2)
    );
  }));
}
