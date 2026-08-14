import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { POLAR_POSITION_CHANNELS } from "../../core/vocabulary.js";
import {
  alignNumericStep,
  cleanNumericValue,
  interpolateNumber,
  inverseLerp,
  niceNumericStep,
  normalizeNumericRange
} from "../numeric.js";
import { resolvePolarScaleRange } from "../polar.js";
import { niceTimeDomain } from "./temporal.js";
import {
  validatePair,
  validatePositionChannel,
  validateScaleDomain,
  validateScaleRange
} from "./validation.js";

export function resolveScaleDomain(domain, values) {
  const validated = validateScaleDomain(domain);
  if (validated !== "auto") return validated;
  if (values.length === 0) {
    throw new Error("Cannot infer an automatic scale domain from no values.");
  }
  let minimum = values[0];
  let maximum = values[0];
  for (const value of values.slice(1)) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return cloneAndFreeze([minimum, maximum]);
}

export function niceLinearDomain(domain) {
  const [minimum, maximum] = domain;
  if (minimum === maximum) return cloneAndFreeze([minimum, maximum]);

  const directSpan = maximum - minimum;
  const tolerance = Number.EPSILON * 16 * Math.max(
    1,
    Math.abs(minimum),
    Math.abs(maximum)
  );
  if (Number.isFinite(directSpan) && directSpan > tolerance) {
    const directStep = niceNumericStep(directSpan);
    const direct = [
      Number((Math.floor(minimum / directStep) * directStep).toPrecision(12)),
      Number((Math.ceil(maximum / directStep) * directStep).toPrecision(12))
    ];
    if (
      direct.every(Number.isFinite) &&
      direct[0] < direct[1] &&
      direct[0] <= minimum &&
      direct[1] >= maximum
    ) {
      return cloneAndFreeze(direct);
    }
  }

  const normalized = normalizeNumericRange(minimum, maximum);
  const normalizedStep = niceNumericStep(normalized.span);
  const resolution = normalizedStep * normalized.scale;
  let lower = cleanNumericValue(
    alignNumericStep(normalized.start, normalizedStep, "floor") * normalized.scale,
    resolution
  );
  let upper = cleanNumericValue(
    alignNumericStep(normalized.end, normalizedStep, "ceil") * normalized.scale,
    resolution
  );

  if (!Number.isFinite(lower) || lower > minimum) lower = minimum;
  if (!Number.isFinite(upper) || upper < maximum) upper = maximum;
  if (lower === upper) return cloneAndFreeze([minimum, maximum]);
  return cloneAndFreeze([lower, upper]);
}

export function resolveContinuousDomain({ domain, values, type, nice, zero }) {
  const explicit = domain !== "auto";
  let resolved = resolveScaleDomain(domain, values);
  if (explicit) return resolved;
  if (zero === true) {
    resolved = cloneAndFreeze([
      Math.min(0, resolved[0]),
      Math.max(0, resolved[1])
    ]);
  }
  if (nice === true) {
    resolved = type === "time"
      ? niceTimeDomain(resolved)
      : niceLinearDomain(resolved);
  }
  return resolved;
}

export function resolveScaleRange(range, channel, bounds) {
  validatePositionChannel(channel);
  if (POLAR_POSITION_CHANNELS.includes(channel)) {
    return resolvePolarScaleRange(range, channel, bounds);
  }
  const validated = validateScaleRange(range);
  if (validated !== "auto") return validated;
  if (
    !isPlainObject(bounds) ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  ) {
    throw new Error("Automatic position range requires graphical bounds.");
  }
  const resolved = channel === "x"
    ? [bounds.x, bounds.x + bounds.width]
    : [bounds.y + bounds.height, bounds.y];
  if (!resolved.every(Number.isFinite)) {
    throw new RangeError("Automatic position range exceeds the finite numeric range.");
  }
  return cloneAndFreeze(resolved);
}

export function mapLinearValues(values, domain, range, options = {}) {
  const { clamp = false } = options;
  const hasUnknown = Object.hasOwn(options, "unknown");
  const [domainStart, domainEnd] = validatePair(domain, "Resolved domain");
  const [rangeStart, rangeEnd] = validatePair(range, "Resolved range");
  if (typeof clamp !== "boolean") {
    throw new TypeError("Linear scale clamp must be a boolean.");
  }
  if (!hasUnknown && !values.every(Number.isFinite)) {
    throw new TypeError("Linear scale values must be finite numbers.");
  }
  if (domainStart === domainEnd) {
    const midpoint = interpolateNumber(rangeStart, rangeEnd, 0.5);
    return cloneAndFreeze(values.map(value =>
      Number.isFinite(value) ? midpoint : options.unknown
    ));
  }
  const domainSpan = domainEnd - domainStart;
  const rangeSpan = rangeEnd - rangeStart;
  return cloneAndFreeze(values.map(value => {
    if (!Number.isFinite(value)) {
      if (hasUnknown) return options.unknown;
      throw new TypeError("Linear scale values must be finite numbers.");
    }
    if (value === domainStart) return rangeStart;
    if (value === domainEnd) return rangeEnd;
    const directProportion = (value - domainStart) / domainSpan;
    const directResolved = clamp
      ? Math.max(0, Math.min(1, directProportion))
      : directProportion;
    if (Number.isFinite(domainSpan) && directResolved === 0) return rangeStart;
    if (Number.isFinite(domainSpan) && directResolved === 1) return rangeEnd;
    const directValue = rangeStart + directResolved * rangeSpan;
    if (
      Number.isFinite(domainSpan) &&
      Number.isFinite(rangeSpan) &&
      Number.isFinite(directValue)
    ) {
      return directValue;
    }
    const proportion = inverseLerp(value, domainStart, domainEnd);
    const resolved = clamp ? Math.max(0, Math.min(1, proportion)) : proportion;
    return interpolateNumber(rangeStart, rangeEnd, resolved);
  }));
}
