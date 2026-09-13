import { sampleNumericRange } from "../../../grammar/numeric.js";
import {
  validateGeneratedItemLimit
} from "../../../core/validation.js";

const DEFAULT_COUNT = 5;
const MAX_EXACT_VALUES = 100;

function validateCount(value, label) {
  if (!Number.isInteger(value) || value < 2) {
    throw new RangeError(`${label} count must be an integer of at least 2.`);
  }
  validateGeneratedItemLimit(value, `${label} count`);
  return value;
}

function normalizeExactValues(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(`${label} values must be an array or "auto".`);
  }
  if (value.length === 0 || value.length > MAX_EXACT_VALUES) {
    throw new RangeError(
      `${label} values must contain between 1 and ${MAX_EXACT_VALUES} values.`
    );
  }
  const values = [...value];
  for (let index = 0; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) {
      throw new TypeError(`${label} values must contain only finite numbers.`);
    }
    if (index > 0 && !(values[index] > values[index - 1])) {
      throw new RangeError(
        `${label} values must be unique and strictly increasing.`
      );
    }
  }
  return Object.freeze(values);
}

export function readLegendSampling(config, defaultCount = DEFAULT_COUNT) {
  if (config?.sampling?.mode === "values") {
    return {
      mode: "values",
      values: config.sampling.values,
      count: config.sampling.count ?? config.count ?? defaultCount
    };
  }
  return {
    mode: "auto",
    count: config?.sampling?.count ?? config?.count ?? defaultCount
  };
}

export function normalizeLegendSampling(
  patch,
  { previous, operation = "create", label = "Legend" } = {}
) {
  const prior = readLegendSampling(previous);
  const hasValues = Object.hasOwn(patch, "values");
  const hasCount = Object.hasOwn(patch, "count");
  const requestedValues = patch.values;

  if (hasValues && requestedValues !== "auto" && hasCount) {
    throw new Error(`${label} cannot specify both count and exact values.`);
  }
  if (requestedValues === "auto" && operation === "create") {
    throw new Error(`${label} creation uses omission for automatic values.`);
  }
  if (!hasValues && !hasCount) {
    return Object.freeze({
      ...prior,
      ...(prior.values === undefined
        ? {}
        : { values: Object.freeze([...prior.values]) })
    });
  }
  if (!hasValues) {
    if (prior.mode === "values") {
      throw new Error(
        `${label} count cannot replace exact values; set values to "auto" first.`
      );
    }
    return Object.freeze({ mode: "auto", count: validateCount(patch.count, label) });
  }
  if (requestedValues === "auto") {
    return Object.freeze({
      mode: "auto",
      count: hasCount ? validateCount(patch.count, label) : validateCount(prior.count, label)
    });
  }
  return Object.freeze({
    mode: "values",
    values: normalizeExactValues(requestedValues, label),
    count: validateCount(prior.count, label)
  });
}

export function validateSamplingAgainstScale(sampling, scale, label = "Legend") {
  if (sampling.mode !== "values") return sampling;
  const domain = scale?.domain;
  if (!Array.isArray(domain) || domain.length < 2 || !domain.every(Number.isFinite)) {
    throw new Error(`${label} exact values require a finite quantitative scale domain.`);
  }
  const lower = Math.min(...domain);
  const upper = Math.max(...domain);
  for (const value of sampling.values) {
    if (scale.type === "log" && value <= 0) {
      throw new RangeError(`${label} exact values must be positive for a log scale.`);
    }
    if (value < lower || value > upper) {
      throw new RangeError(
        `${label} exact value ${value} is outside the scale domain [${lower}, ${upper}].`
      );
    }
  }
  return sampling;
}

export function resolveLegendSampleValues(config, scale, label = "Legend") {
  const sampling = validateSamplingAgainstScale(
    readLegendSampling(config),
    scale,
    label
  );
  return sampling.mode === "values"
    ? [...sampling.values]
    : sampleNumericRange(
        scale.domain[0],
        scale.domain[1],
        sampling.count,
        `${label} domain`
      );
}

export function hasExactLegendSamplingForScale(program, scaleId) {
  return ["size", "opacity", "strokeWidth"].some(kind => {
    const config = program.guideConfigs.legend?.[kind];
    return config?.scale === scaleId && readLegendSampling(config).mode === "values";
  });
}
