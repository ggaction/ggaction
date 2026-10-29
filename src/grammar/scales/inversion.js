import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { interpolateNumber } from "../numeric.js";
import { validTimestamp } from "../timeUnit.js";
import { mapLinearValues } from "./continuous.js";
import { mapOrdinalPositionValues, validateOrdinalDomain } from "./ordinal.js";
import { normalizeTransformParameters, validateTransformedDomain } from "./transformed.js";
import { validatePair } from "./validation.js";

function pair(value, label) {
  if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${label} requires exactly two coordinates.`);
  ownArray(value, label);
  return validatePair(value, label);
}

function categories(scale, interval, range) {
  const domain = scale.domain;
  if (Array.isArray(domain)) validateGeneratedItemLimit(domain.length, "Brush category count");
  ownArray(domain, "Brush category domain");
  let work = domain.length;
  for (const value of domain) validateWorkLimit(work += typeof value === "string" ? value.length : 1, "Brush category work");
  validateOrdinalDomain(domain);
  if (!Number.isFinite(scale.step) || scale.step === 0 || !Number.isFinite(scale.bandwidth) || scale.bandwidth < 0 ||
    scale.bandwidth > Math.abs(scale.step) || (scale.type === "point" && scale.bandwidth !== 0) ||
    Math.sign(scale.step) !== Math.sign(range[1] - range[0])) throw new RangeError("Brush categories require resolved finite band geometry.");
  if (scale.type !== "ordinal" && !Number.isFinite(scale.start)) throw new RangeError("Brush categories require a resolved start.");
  const positions = mapOrdinalPositionValues(domain, scale);
  if (positions.some((position, index) => !Number.isFinite(position) || position < Math.min(...range) || position > Math.max(...range) ||
    (index > 0 && position === positions[index - 1]))) throw new RangeError("Brush category positions must be distinct and inside the resolved range.");
  const overlaps = positions.map((_, index) => {
    const lower = positions[index] - scale.bandwidth / 2, upper = positions[index] + scale.bandwidth / 2;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) throw new RangeError("Brush category extent exceeds finite coordinates.");
    return interval !== null && lower <= interval[1] && upper >= interval[0];
  });
  return cloneAndFreeze({ kind: "categories", values: domain.filter((_, index) => overlaps[index]) });
}

function logInverse(interval, domain, range, base) {
  const parameters = normalizeTransformParameters("log", base === undefined ? {} : { base });
  validateTransformedDomain("log", domain, parameters);
  const sign = Math.sign(domain[0]), logarithm = Math.log10(parameters.base);
  let transformed = domain.map(value => sign * Math.log10(Math.abs(value)) / logarithm);
  let restore = value => sign * parameters.base ** (sign * value);
  if (!transformed.every(Number.isFinite) || transformed[0] === transformed[1]) {
    transformed = domain.map(value => sign * Math.log(Math.abs(value)));
    restore = value => sign * Math.exp(sign * value);
  }
  // Match the forward owner's precision fallback when logarithms collapse.
  if (transformed[0] === transformed[1]) return mapLinearValues(interval, range, domain);
  const mapped = mapLinearValues(interval, range, transformed);
  return mapped.map((value, index) => interval[index] === range[0] ? domain[0] : interval[index] === range[1] ? domain[1]
    : Math.max(Math.min(...domain), Math.min(Math.max(...domain), restore(value))));
}

// Input ranges have already had reversal and coordinate resolution applied.
// The brush intersects this finite screen extent; it does not extrapolate or
// apply reverse twice. An empty/zero-width brush has no selected domain.
export function invertPositionInterval(value, requested) {
  ownRecord(value, "Brush position scale");
  const scale = Object.assign(Object.create(null), value);
  if (!["linear", "log", "time", "ordinal", "band", "point"].includes(scale.type) || scale.radialMapping !== undefined) {
    throw new TypeError("Brush inversion requires a linear, log, time, ordinal, band or point position scale.");
  }
  const range = pair(scale.range, "Brush scale range"), input = pair(requested, "Brush interval");
  if (range[0] === range[1]) throw new RangeError("Brush scale range must be invertible.");
  const low = Math.max(Math.min(...input), Math.min(...range)), high = Math.min(Math.max(...input), Math.max(...range));
  const interval = low > high || input[0] === input[1] ? null : [low, high];
  if (["ordinal", "band", "point"].includes(scale.type)) return categories(scale, interval, range);
  const domain = pair(scale.domain, "Brush scale domain");
  if (scale.type === "time" && !domain.every(validTimestamp)) throw new RangeError("Brush time domain requires valid epoch milliseconds.");
  let bounds;
  if (scale.type === "log") {
    // Validate even an empty gesture; an inactive branch cannot hide bad state.
    const mapped = logInverse(interval ?? range, domain, range, scale.base);
    bounds = interval === null ? null : [Math.min(...mapped), Math.max(...mapped)];
  } else if (domain[0] === domain[1]) {
    const position = interpolateNumber(...range, 0.5);
    bounds = interval !== null && interval[0] <= position && position <= interval[1] ? domain : null;
  } else {
    const mapped = interval === null ? null : mapLinearValues(interval, range, domain);
    bounds = mapped === null ? null : [Math.min(...mapped), Math.max(...mapped)];
  }
  return cloneAndFreeze({ kind: "range", bounds });
}
