import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
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

function niceLinearStep(span, count = 5) {
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 3 ? 3
    : fraction <= 5 ? 5 : 10;
  return factor * power;
}

function niceLinearDomain(domain) {
  const [minimum, maximum] = domain;
  const tolerance = Number.EPSILON * 16 * Math.max(
    1, Math.abs(minimum), Math.abs(maximum)
  );
  if (maximum - minimum <= tolerance) {
    const midpoint = (minimum + maximum) / 2;
    return cloneAndFreeze([midpoint, midpoint]);
  }
  const step = niceLinearStep(maximum - minimum);
  return cloneAndFreeze([
    Number((Math.floor(minimum / step) * step).toPrecision(12)),
    Number((Math.ceil(maximum / step) * step).toPrecision(12))
  ]);
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
  const validated = validateScaleRange(range);
  validatePositionChannel(channel);
  if (validated !== "auto") return validated;
  if (
    !isPlainObject(bounds) ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)
  ) {
    throw new Error("Automatic position range requires graphical bounds.");
  }
  return channel === "x"
    ? cloneAndFreeze([bounds.x, bounds.x + bounds.width])
    : cloneAndFreeze([bounds.y + bounds.height, bounds.y]);
}

export function mapLinearValues(values, domain, range, { clamp = false } = {}) {
  const [domainStart, domainEnd] = validatePair(domain, "Resolved domain");
  const [rangeStart, rangeEnd] = validatePair(range, "Resolved range");
  if (typeof clamp !== "boolean") {
    throw new TypeError("Linear scale clamp must be a boolean.");
  }
  if (!values.every(Number.isFinite)) {
    throw new TypeError("Linear scale values must be finite numbers.");
  }
  if (domainStart === domainEnd) {
    const midpoint = (rangeStart + rangeEnd) / 2;
    return cloneAndFreeze(values.map(() => midpoint));
  }
  const domainSpan = domainEnd - domainStart;
  const rangeSpan = rangeEnd - rangeStart;
  return cloneAndFreeze(values.map(value => {
    const proportion = (value - domainStart) / domainSpan;
    const resolved = clamp ? Math.max(0, Math.min(1, proportion)) : proportion;
    return rangeStart + resolved * rangeSpan;
  }));
}
