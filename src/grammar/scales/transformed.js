import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
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

function transformValue(value, type, parameters) {
  if (type === "linear") return value;
  if (type === "log") {
    return Math.sign(value) * Math.log(Math.abs(value)) /
      Math.log(parameters.base);
  }
  const exponent = type === "sqrt" ? 0.5 : parameters.exponent;
  if (type === "pow" || type === "sqrt") {
    return Math.sign(value) * Math.abs(value) ** exponent;
  }
  return Math.sign(value) * Math.log1p(
    Math.abs(value) / parameters.constant
  );
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

function niceLogDomain(domain, base) {
  const reversed = domain[0] > domain[1];
  const low = Math.min(...domain);
  const high = Math.max(...domain);
  let result;
  if (low > 0) {
    result = [
      base ** Math.floor(Math.log(low) / Math.log(base)),
      base ** Math.ceil(Math.log(high) / Math.log(base))
    ];
  } else {
    result = [
      -(base ** Math.ceil(Math.log(Math.abs(low)) / Math.log(base))),
      -(base ** Math.floor(Math.log(Math.abs(high)) / Math.log(base)))
    ];
  }
  return cloneAndFreeze(reversed ? result.reverse() : result);
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
  let resolved = [Math.min(...values), Math.max(...values)];
  if (resolved[0] === resolved[1]) {
    throw new RangeError("Automatic transformed domain requires distinct values.");
  }
  if (zero) resolved = [Math.min(0, resolved[0]), Math.max(0, resolved[1])];
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
  const transformOptions = Object.fromEntries(
    Object.entries(options).filter(([key]) => key !== "unknown")
  );
  const parameters = normalizeTransformParameters(type, transformOptions);
  const domainOptions = type === "sqrt" ? {} : transformOptions;
  const validatedDomain = validateTransformedDomain(type, domain, domainOptions);
  const resolvedRange = resolveMappingRange(range, { reverse });
  const transformedDomain = validatedDomain.map(value =>
    transformValue(value, type, parameters)
  );
  const span = transformedDomain[1] - transformedDomain[0];

  return cloneAndFreeze(values.map(value => {
    const valid = Number.isFinite(value) && !(type === "log" && (
      value === 0 || Math.sign(value) !== Math.sign(validatedDomain[0])
    ));
    if (!valid) {
      if (hasUnknown) return options.unknown;
      throw new TypeError(`Scale type "${type}" received an invalid value.`);
    }
    const transformed = transformValue(value, type, parameters);
    let proportion = (transformed - transformedDomain[0]) / span;
    if (clamp) proportion = Math.max(0, Math.min(1, proportion));
    return resolvedRange[0] + proportion * (resolvedRange[1] - resolvedRange[0]);
  }));
}

export function transformedTicks(type, domain, count, options = {}) {
  const validated = validateTransformedDomain(type, domain, options);
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Tick count must be a positive integer.");
  }
  if (type !== "log") return niceTicks(validated, count);
  const { base } = normalizeTransformParameters(type, options);
  const reversed = validated[0] > validated[1];
  const low = Math.min(...validated);
  const high = Math.max(...validated);
  const negative = high < 0;
  const minimumMagnitude = negative ? Math.abs(high) : low;
  const maximumMagnitude = negative ? Math.abs(low) : high;
  const start = Math.ceil(
    Math.log(minimumMagnitude) / Math.log(base) - 1e-12
  );
  const end = Math.floor(
    Math.log(maximumMagnitude) / Math.log(base) + 1e-12
  );
  const values = [];
  for (let exponent = start; exponent <= end; exponent += 1) {
    values.push((negative ? -1 : 1) * base ** exponent);
  }
  if (negative) values.reverse();
  if (reversed) values.reverse();
  return cloneAndFreeze(values.length === 0 ? [...validated] : values);
}
