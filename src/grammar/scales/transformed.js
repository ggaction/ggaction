import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { MAX_GENERATED_ITEMS } from "../../core/validation.js";
import { interpolateNumber, inverseLerp, numericExtent } from "../numeric.js";
import { niceTicks } from "../ticks.js";
import { niceLinearDomain } from "./continuous.js";
import {
  SCALE_ROLES,
  validateScaleTypeForRole
} from "./types.js";
import { validatePair } from "./validation.js";
const TRANSFORMED_TYPES = Object.freeze(["log", "pow", "sqrt", "symlog"]);

function positiveFinite(value, label) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number.`);
  }
  return value;
}

export function normalizeTransformParameters(type, options = {}) {
  if (!TRANSFORMED_TYPES.includes(type) && type !== "linear") {
    throw new Error(`Scale type "${type}" is not a quantitative transform.`);
  }
  if (!isPlainObject(options)) {
    throw new TypeError("Scale transform options must be a plain object.");
  }
  const allowed = type === "log"
    ? ["base"]
    : type === "pow"
      ? ["exponent"]
      : type === "symlog" ? ["constant"] : [];
  for (const key of Object.keys(options)) {
    if (!allowed.includes(key)) {
      throw new Error(`Scale type "${type}" does not support ${key}.`);
    }
  }
  if (type === "log") {
    const base = positiveFinite(options.base ?? 10, "Log scale base");
    if (base === 1) throw new RangeError("Log scale base must not equal 1.");
    return cloneAndFreeze({ base });
  }
  if (type === "pow") {
    return cloneAndFreeze({
      exponent: positiveFinite(options.exponent ?? 1, "Power scale exponent")
    });
  }
  if (type === "sqrt") return cloneAndFreeze({ exponent: 0.5 });
  if (type === "symlog") {
    return cloneAndFreeze({
      constant: positiveFinite(options.constant ?? 1, "Symlog scale constant")
    });
  }
  return cloneAndFreeze({});
}

function signedTransformProportion(value, start, end, transform) {
  const transformed = [start, end, value].map(item =>
    Math.sign(item) * transform(Math.abs(item))
  );
  return transformed[0] !== transformed[1] &&
    transformed.every(Number.isFinite)
    ? inverseLerp(transformed[2], transformed[0], transformed[1])
    : undefined;
}

function powerProportion(value, domain, exponent) {
  const [start, end] = domain;
  const direct = signedTransformProportion(
    value, start, end, magnitude => magnitude ** exponent
  );
  if (direct !== undefined) return direct;
  const scale = Math.max(Math.abs(start), Math.abs(end));
  const normalized = signedTransformProportion(
    value,
    start,
    end,
    magnitude => magnitude === 0 ? 0 : Math.exp(exponent * (
      Math.log(magnitude) - Math.log(scale)
    ))
  );
  if (normalized !== undefined) return normalized;

  if (
    start !== 0 &&
    end !== 0 &&
    value !== 0 &&
    Math.sign(start) === Math.sign(end)
  ) {
    const endLogRatio = Math.log(Math.abs(end)) - Math.log(Math.abs(start));
    const valueLogRatio = Math.log(Math.abs(value)) - Math.log(Math.abs(start));
    if (Math.abs(exponent * endLogRatio) < 1e-8) {
      return valueLogRatio / endLogRatio;
    }
    const proportion = Math.expm1(exponent * valueLogRatio) /
      Math.expm1(exponent * endLogRatio);
    if (Number.isFinite(proportion)) return proportion;
  }

  return inverseLerp(value, start, end);
}

function logOnePlusRatio(value, constant) {
  if (value === 0) return 0;
  const ratio = Math.abs(value) / constant;
  if (Number.isFinite(ratio)) return Math.sign(value) * Math.log1p(ratio);
  const logRatio = Math.log(Math.abs(value)) - Math.log(constant);
  return Math.sign(value) * (
    Math.max(0, logRatio) + Math.log1p(Math.exp(-Math.abs(logRatio)))
  );
}

function transformedProportion(value, domain, type, parameters) {
  const [start, end] = domain;
  if (type === "linear") return inverseLerp(value, start, end);
  if (type === "log") {
    const logarithm = Math.log10(parameters.base);
    const direct = signedTransformProportion(
      value, start, end, magnitude => Math.log10(magnitude) / logarithm
    );
    return direct ?? signedTransformProportion(
      value, start, end, Math.log
    ) ?? inverseLerp(value, start, end);
  }
  if (type === "pow" || type === "sqrt") {
    return powerProportion(value, domain, parameters.exponent);
  }

  const transformedStart = logOnePlusRatio(start, parameters.constant);
  const transformedEnd = logOnePlusRatio(end, parameters.constant);
  if (transformedStart === transformedEnd) {
    return inverseLerp(value, start, end);
  }
  const proportion = inverseLerp(
    logOnePlusRatio(value, parameters.constant),
    transformedStart,
    transformedEnd
  );
  return Number.isFinite(proportion) ? proportion : inverseLerp(value, start, end);
}

export function validateTransformedDomain(type, domain, options = {}) {
  validateScaleTypeForRole(type, SCALE_ROLES.quantitativePosition);
  const validated = validatePair(domain, "Transformed scale domain");
  if (validated[0] === validated[1]) {
    throw new RangeError("Transformed scale domain values must be distinct.");
  }
  if (
    type === "log" &&
    (validated.includes(0) || Math.sign(validated[0]) !== Math.sign(validated[1]))
  ) {
    throw new RangeError(
      "Log scale domain must be strictly positive or strictly negative."
    );
  }
  normalizeTransformParameters(type, options);
  return validated;
}

function radixPower(radix, exponent, logarithm) {
  const direct = Number.isFinite(radix) ? radix ** exponent : Number.NaN;
  if (Number.isFinite(direct) && direct > 0) return direct;
  const transformed = exponent * logarithm;
  if (transformed > Math.log(Number.MAX_VALUE)) return Number.POSITIVE_INFINITY;
  if (transformed < Math.log(Number.MIN_VALUE)) return 0;
  return Math.exp(transformed);
}

function logDomainInfo(domain, base) {
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  const negative = high < 0;
  return [
    base < 1 ? -Math.log(base) : Math.log(base),
    base < 1 ? 1 / base : base,
    domain[0] > domain[1],
    negative,
    negative ? Math.abs(high) : low,
    negative ? Math.abs(low) : high
  ];
}

function niceLogDomain(domain, base) {
  const [logarithm, radix, reversed, negative, minimum, maximum] =
    logDomainInfo(domain, base);
  let lower = radixPower(
    radix,
    Math.floor(Math.log(minimum) / logarithm),
    logarithm
  );
  let upper = radixPower(
    radix,
    Math.ceil(Math.log(maximum) / logarithm),
    logarithm
  );
  if (!Number.isFinite(lower) || lower <= 0 || lower > minimum) lower = minimum;
  if (!Number.isFinite(upper) || upper < maximum) upper = maximum;
  const result = negative ? [-upper, -lower] : [lower, upper];
  return cloneAndFreeze(reversed ? result.reverse() : result);
}

function padAutomaticTransformedDomain(type, value, options) {
  const parameters = normalizeTransformParameters(type, options);
  if (value === 0) {
    if (type === "log") {
      throw new RangeError(
        "Log scale domain must be strictly positive or strictly negative."
      );
    }
    return [-1, 1];
  }
  const magnitude = Math.abs(value);
  let lower = magnitude / 2;
  let upper = magnitude * 2;
  if (type === "pow" || type === "sqrt") {
    upper = magnitude * (2 - 2 ** -parameters.exponent) **
      (1 / parameters.exponent);
  } else if (type === "symlog") {
    const center = Math.abs(logOnePlusRatio(value, parameters.constant));
    if (center === 0) return [-1, 1];
    upper = parameters.constant * Math.expm1(
      2 * center - logOnePlusRatio(lower, parameters.constant)
    );
  }
  if (!(lower < magnitude && upper > magnitude && Number.isFinite(upper))) {
    lower = magnitude / 2;
    upper = Number.isFinite(magnitude * 2) ? magnitude * 2 : magnitude;
  }
  if (type === "log" && lower === 0) lower = magnitude;
  return value > 0
    ? [lower, upper]
    : [-upper, lower === 0 ? 0 : -lower];
}

export function resolveTransformedDomain({
  type,
  domain = "auto",
  values,
  nice = false,
  zero = false,
  ...options
}) {
  validateScaleTypeForRole(type, SCALE_ROLES.quantitativePosition);
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Transformed scale values must be finite numbers.");
  }
  if (typeof nice !== "boolean" || typeof zero !== "boolean") {
    throw new TypeError("Scale nice and zero must be booleans.");
  }
  if (type === "log" && zero) {
    throw new Error('Scale type "log" does not support zero.');
  }
  const explicit = domain !== "auto";
  if (explicit) return validateTransformedDomain(type, domain, options);
  if (values.length === 0) {
    throw new Error("Cannot infer an automatic scale domain from no values.");
  }
  let resolved = numericExtent(values);
  if (zero) resolved = [Math.min(0, resolved[0]), Math.max(0, resolved[1])];
  if (resolved[0] === resolved[1]) {
    resolved = padAutomaticTransformedDomain(type, resolved[0], options);
  }
  validateTransformedDomain(type, resolved, options);
  if (nice) {
    resolved = type === "log"
      ? niceLogDomain(resolved, normalizeTransformParameters(type, options).base)
      : niceLinearDomain(resolved);
  }
  return validateTransformedDomain(type, resolved, options);
}

export function resolveMappingRange(range, { reverse = false } = {}) {
  const validated = validatePair(range, "Scale range");
  if (typeof reverse !== "boolean") {
    throw new TypeError("Scale reverse must be a boolean.");
  }
  return reverse
    ? cloneAndFreeze([...validated].reverse())
    : validated;
}

export function mapTransformedValues(
  values,
  domain,
  range,
  { type = "linear", clamp = false, reverse = false, ...options } = {}
) {
  if (!Array.isArray(values)) {
    throw new TypeError("Scale values must be an array.");
  }
  if (typeof clamp !== "boolean") {
    throw new TypeError("Scale clamp must be a boolean.");
  }
  const hasUnknown = Object.hasOwn(options, "unknown");
  const { unknown, ...transformOptions } = options;
  const parameters = normalizeTransformParameters(type, transformOptions);
  const validatedDomain = validateTransformedDomain(type, domain, transformOptions);
  const resolvedRange = resolveMappingRange(range, { reverse });
  const span = resolvedRange[1] - resolvedRange[0];
  return cloneAndFreeze(values.map(value => {
    const valid = Number.isFinite(value) && !(type === "log" && (
      value === 0 || Math.sign(value) !== Math.sign(validatedDomain[0])
    ));
    if (!valid) {
      if (hasUnknown) return unknown;
      throw new TypeError(`Scale type "${type}" received an invalid value.`);
    }
    let proportion = transformedProportion(
      value,
      validatedDomain,
      type,
      parameters
    );
    if (clamp) proportion = Math.max(0, Math.min(1, proportion));
    const direct = resolvedRange[0] + proportion * span;
    return Number.isFinite(span) && Number.isFinite(direct) && (
      proportion !== 1 ||
      Math.abs(direct - resolvedRange[1]) <=
        Number.EPSILON * Math.abs(resolvedRange[1])
    )
      ? direct
      : interpolateNumber(resolvedRange[0], resolvedRange[1], proportion);
  }));
}

export function transformedTicks(type, domain, count, options = {}) {
  const validated = validateTransformedDomain(type, domain, options);
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Tick count must be a positive integer.");
  }
  if (type !== "log") return niceTicks(validated, count);
  const { base } = normalizeTransformParameters(type, options);
  const [
    logarithm,
    radix,
    reversed,
    negative,
    minimumMagnitude,
    maximumMagnitude
  ] = logDomainInfo(validated, base);
  const start = Math.ceil(
    Math.log(minimumMagnitude) / logarithm - 1e-12
  );
  const end = Math.floor(
    Math.log(maximumMagnitude) / logarithm + 1e-12
  );
  const available = end - start + 1;
  const tickCount = available <= MAX_GENERATED_ITEMS
    ? available
    : Math.min(count, MAX_GENERATED_ITEMS);
  const values = [];
  for (let index = 0; index < tickCount; index += 1) {
    const exponent = available <= MAX_GENERATED_ITEMS
      ? start + index
      : Math.round(start + (end - start) * index / Math.max(1, tickCount - 1));
    const magnitude = radixPower(radix, exponent, logarithm);
    const value = (negative ? -1 : 1) * magnitude;
    if (
      Number.isFinite(value) &&
      magnitude >= minimumMagnitude &&
      magnitude <= maximumMagnitude &&
      (values.length === 0 || value !== values.at(-1))
    ) {
      values.push(value);
    }
  }
  if (negative) values.reverse();
  if (reversed) values.reverse();
  return cloneAndFreeze(values.length === 0 ? [...validated] : values);
}

export function formatTransformedTick(type, value) {
  if (type !== "log") return String(value);
  const magnitude = Math.abs(value);
  const units = [
    [1_000_000_000, "B"],
    [1_000_000, "M"],
    [1_000, "K"]
  ];
  const unit = units.find(([threshold]) => magnitude >= threshold);
  if (unit === undefined) return String(value);
  const scaled = value / unit[0];
  return `${Number(scaled.toPrecision(3))}${unit[1]}`;
}
