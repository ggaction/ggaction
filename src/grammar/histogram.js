import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { MAX_GENERATED_ITEMS } from "../core/validation.js";
import {
  alignNumericStep,
  cleanNumericValue,
  interpolateNumber,
  NICE_FACTORS,
  niceNumericStep,
  numericExtent,
  normalizeNumericRange
} from "./numeric.js";

function validateValues(values) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError("Histogram values must be finite numbers.");
  }
}

function validateMaxBins(maxBins) {
  if (!Number.isInteger(maxBins) || maxBins <= 0) {
    throw new TypeError("Histogram maxBins must be a positive integer.");
  }
  return maxBins;
}

export function validateHistogramBinStep(step) {
  if (!Number.isFinite(step) || step <= 0) {
    throw new TypeError("Histogram bin step must be a positive finite number.");
  }
  return step;
}

export function validateHistogramBinBoundaries(boundaries) {
  if (Array.isArray(boundaries) && boundaries.length > MAX_GENERATED_ITEMS + 1) {
    throw new RangeError(
      `Histogram bin boundaries must generate at most ${MAX_GENERATED_ITEMS} bins.`
    );
  }
  if (!validBoundaries(boundaries)) {
    throw new TypeError(
      "Histogram bin boundaries must contain at least two strictly increasing finite numbers."
    );
  }
  return boundaries;
}

function validBoundaries(boundaries) {
  return Array.isArray(boundaries) && boundaries.length >= 2 &&
    boundaries.every(Number.isFinite) &&
    !boundaries.some(
      (value, index) => index > 0 && value <= boundaries[index - 1]
    );
}

export function normalizeHistogramBin(bin = {}) {
  if (!isPlainObject(bin)) {
    throw new TypeError("Histogram bin must be a plain object.");
  }
  const supported = ["maxBins", "step", "boundaries"];
  const unknown = Object.keys(bin).find(key => !supported.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown bin option "${unknown}".`);
  }
  const selected = supported.filter(key => bin[key] !== undefined);
  if (selected.length > 1) {
    throw new Error(
      "Histogram bin accepts only one of maxBins, step, or boundaries."
    );
  }
  if (bin.step !== undefined) {
    return cloneAndFreeze({ step: validateHistogramBinStep(bin.step) });
  }
  if (bin.boundaries !== undefined) {
    return cloneAndFreeze({
      boundaries: validateHistogramBinBoundaries(bin.boundaries)
    });
  }
  return cloneAndFreeze({ maxBins: validateMaxBins(bin.maxBins ?? 10) });
}

function validateDomain(domain) {
  if (
    !Array.isArray(domain) ||
    domain.length !== 2 ||
    !domain.every(Number.isFinite) ||
    domain[0] >= domain[1]
  ) {
    throw new TypeError(
      "Histogram domain must be two ascending finite numbers."
    );
  }
  return domain;
}

function includesExtent(domain, values) {
  return values.every(value => value >= domain[0] && value <= domain[1]);
}

function requireContainedExtent(domain, values, label) {
  if (!includesExtent(domain, values)) {
    throw new RangeError(`${label} must contain the histogram data extent.`);
  }
}

function isStepMultiple(value, step) {
  const quotient = value / step;
  return Math.abs(quotient - Math.round(quotient)) <= 1e-10;
}

function exactStepBoundaries(domain, step) {
  if (
    !isStepMultiple(domain[0], step) ||
    !isStepMultiple(domain[1], step) ||
    !isStepMultiple(domain[1] - domain[0], step)
  ) {
    throw new RangeError(
      "Histogram domain endpoints must align with the zero-anchored bin step."
    );
  }
  const count = Math.round((domain[1] - domain[0]) / step);
  if (!Number.isSafeInteger(count) || count > MAX_GENERATED_ITEMS) {
    throw new RangeError(
      `Histogram bin step must generate at most ${MAX_GENERATED_ITEMS} bins.`
    );
  }
  return Array.from(
    { length: count + 1 },
    (_, index) => index === count
      ? domain[1]
      : cleanNumericValue(domain[0] + index * step, step)
  );
}

function stepBins(values, step, domain, zero) {
  if (domain !== "auto") {
    const explicit = validateDomain(domain);
    requireContainedExtent(explicit, values, "Histogram domain");
    return {
      domain: explicit,
      step,
      boundaries: exactStepBoundaries(explicit, step)
    };
  }
  if (values.length === 0) {
    throw new Error("Cannot infer histogram bins from no values.");
  }

  let [minimum, maximum] = numericExtent(values);
  if (zero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  let start = cleanNumericValue(Math.floor(minimum / step) * step, step);
  let stop = cleanNumericValue(Math.ceil(maximum / step) * step, step);
  if (start === stop) {
    if (stop <= 0) start = cleanNumericValue(start - step, step);
    else stop = cleanNumericValue(stop + step, step);
  }
  const resolvedDomain = [start, stop];
  return {
    domain: resolvedDomain,
    step,
    boundaries: exactStepBoundaries(resolvedDomain, step)
  };
}

function boundaryBins(values, boundaries, domain) {
  const resolvedBoundaries = [...boundaries];
  const boundaryDomain = [resolvedBoundaries[0], resolvedBoundaries.at(-1)];
  requireContainedExtent(boundaryDomain, values, "Histogram bin boundaries");
  if (domain !== "auto") {
    const explicit = validateDomain(domain);
    if (
      explicit[0] !== boundaryDomain[0] ||
      explicit[1] !== boundaryDomain[1]
    ) {
      throw new RangeError(
        "Histogram domain must match the explicit bin boundary endpoints."
      );
    }
  }
  return { domain: boundaryDomain, boundaries: resolvedBoundaries };
}

function equalBins(domain, maxBins) {
  const normalized = normalizeNumericRange(domain[0], domain[1]);
  const candidateStep = normalized.span / maxBins * normalized.scale;
  const boundaries = [];
  for (let index = 0; index <= maxBins; index += 1) {
    const value = index === maxBins
      ? domain[1]
      : cleanNumericValue(
        interpolateNumber(domain[0], domain[1], index / maxBins),
        candidateStep
      );
    if (boundaries.length === 0 || value > boundaries.at(-1)) {
      boundaries.push(value);
    }
  }
  const step = Number.isFinite(candidateStep) && candidateStep > 0
    ? candidateStep
    : firstFiniteBoundaryDifference(boundaries) ?? Number.MAX_VALUE;
  return {
    domain: [boundaries[0], boundaries.at(-1)],
    step,
    boundaries
  };
}

function firstFiniteBoundaryDifference(boundaries) {
  for (let index = 1; index < boundaries.length; index += 1) {
    const difference = boundaries[index] - boundaries[index - 1];
    if (Number.isFinite(difference) && difference > 0) return difference;
  }
  return undefined;
}

function constantBins(value) {
  const delta = Math.max(0.5, Math.abs(value) * Number.EPSILON);
  let lower = value - delta;
  let upper = value + delta;
  if (!Number.isFinite(lower)) lower = value;
  if (!Number.isFinite(upper)) upper = value;
  if (lower === value) upper = value + delta;
  if (upper === value) lower = value - delta;
  const step = upper - lower;
  return {
    domain: [lower, upper],
    step,
    boundaries: [lower, upper]
  };
}

function niceBins(extent, maxBins) {
  const normalized = normalizeNumericRange(extent[0], extent[1]);
  let normalizedStep = niceNumericStep(
    normalized.span,
    maxBins,
    NICE_FACTORS
  );

  for (let attempt = 0; attempt < 64; attempt += 1) {
    const start = alignNumericStep(
      normalized.start,
      normalizedStep,
      "floor"
    );
    const stop = alignNumericStep(
      normalized.end,
      normalizedStep,
      "ceil"
    );
    const count = Math.round((stop - start) / normalizedStep);

    if (count > 0 && count <= maxBins) {
      const resolution = normalizedStep * normalized.scale;
      const boundaries = [];
      for (let index = 0; index <= count; index += 1) {
        let value = (index === count
          ? stop
          : start + index * normalizedStep) * normalized.scale;
        if (!Number.isFinite(value)) {
          value = index === 0
            ? extent[0]
            : index === count ? extent[1] : value;
        }
        value = cleanNumericValue(value, resolution);
        if (index === 0 && value > extent[0]) value = extent[0];
        if (index === count && value < extent[1]) value = extent[1];
        if (
          Number.isFinite(value) &&
          (boundaries.length === 0 || value > boundaries.at(-1))
        ) {
          boundaries.push(value);
        }
      }
      if (
        boundaries.length >= 2 &&
        boundaries[0] <= extent[0] &&
        boundaries.at(-1) >= extent[1]
      ) {
        const step = Number.isFinite(resolution) && resolution > 0
          ? resolution
          : firstFiniteBoundaryDifference(boundaries) ?? Number.MAX_VALUE;
        return {
          domain: [boundaries[0], boundaries.at(-1)],
          step,
          boundaries
        };
      }
    }
    normalizedStep = niceNumericStep(
      normalizedStep * (1 + 1e-12),
      1,
      NICE_FACTORS
    );
  }

  return equalBins(extent, maxBins);
}

export function resolveHistogramBins({
  values,
  bin,
  maxBins,
  domain = "auto",
  nice = true,
  zero = false
}) {
  validateValues(values);
  if (bin !== undefined && maxBins !== undefined) {
    throw new Error("Histogram bins require either bin or maxBins, not both.");
  }
  const normalizedBin = normalizeHistogramBin(
    bin ?? (maxBins === undefined ? {} : { maxBins })
  );

  if (typeof nice !== "boolean") {
    throw new TypeError("Histogram nice must be a boolean.");
  }
  if (typeof zero !== "boolean") {
    throw new TypeError("Histogram zero must be a boolean.");
  }

  if (normalizedBin.step !== undefined) {
    return cloneAndFreeze(
      stepBins(values, normalizedBin.step, domain, zero)
    );
  }
  if (normalizedBin.boundaries !== undefined) {
    return cloneAndFreeze(
      boundaryBins(values, normalizedBin.boundaries, domain)
    );
  }

  maxBins = Math.min(normalizedBin.maxBins, MAX_GENERATED_ITEMS);

  if (domain !== "auto") {
    return cloneAndFreeze(equalBins(validateDomain(domain), maxBins));
  }
  if (values.length === 0) {
    throw new Error("Cannot infer histogram bins from no values.");
  }

  let [minimum, maximum] = numericExtent(values);

  if (zero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  if (minimum === maximum) {
    return cloneAndFreeze(constantBins(minimum));
  }

  const resolved = nice
    ? niceBins([minimum, maximum], maxBins)
    : equalBins([minimum, maximum], maxBins);
  return cloneAndFreeze(resolved);
}

export function countHistogramBins(values, boundaries) {
  validateValues(values);

  if (!validBoundaries(boundaries)) {
    throw new TypeError(
      "Histogram boundaries must be ascending finite numbers."
    );
  }

  const counts = Array(boundaries.length - 1).fill(0);

  for (const value of values) {
    const index = findHistogramBinIndex(value, boundaries);
    if (index !== -1) counts[index] += 1;
  }

  return cloneAndFreeze(counts);
}

export function findHistogramBinIndex(value, boundaries) {
  if (!Number.isFinite(value)) {
    throw new TypeError("Histogram value must be finite.");
  }
  if (value < boundaries[0] || value > boundaries.at(-1)) return -1;

  let low = 0;
  let high = boundaries.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (value < boundaries[middle]) high = middle;
    else low = middle;
  }
  return Math.min(low, boundaries.length - 2);
}
