import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

const NICE_FACTORS = Object.freeze([1, 2, 3, 5]);

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
  if (
    !Array.isArray(boundaries) ||
    boundaries.length < 2 ||
    !boundaries.every(Number.isFinite) ||
    boundaries.some(
      (value, index) => index > 0 && value <= boundaries[index - 1]
    )
  ) {
    throw new TypeError(
      "Histogram bin boundaries must contain at least two strictly increasing finite numbers."
    );
  }
  return boundaries;
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

function firstNiceStep(rough) {
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = NICE_FACTORS.find(candidate => candidate >= fraction);
  return (factor ?? 10) * power;
}

function nextNiceStep(step) {
  const power = 10 ** Math.floor(Math.log10(step));
  const fraction = step / power;
  const factor = NICE_FACTORS.find(candidate => candidate > fraction + 1e-12);
  return (factor ?? 10) * power;
}

function normalizeBoundary(value) {
  return Number(value.toPrecision(15));
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
  return Array.from(
    { length: count + 1 },
    (_, index) => index === count
      ? domain[1]
      : normalizeBoundary(domain[0] + index * step)
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

  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  if (zero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  let start = normalizeBoundary(Math.floor(minimum / step) * step);
  let stop = normalizeBoundary(Math.ceil(maximum / step) * step);
  if (start === stop) {
    if (stop <= 0) start = normalizeBoundary(start - step);
    else stop = normalizeBoundary(stop + step);
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
  const step = (domain[1] - domain[0]) / maxBins;
  const boundaries = Array.from(
    { length: maxBins + 1 },
    (_, index) =>
      index === maxBins
        ? domain[1]
        : normalizeBoundary(domain[0] + index * step)
  );
  return { domain, step, boundaries };
}

function niceBins(extent, maxBins) {
  const span = extent[1] - extent[0];
  let step = firstNiceStep(span / maxBins);

  while (true) {
    const start = normalizeBoundary(Math.floor(extent[0] / step) * step);
    const stop = normalizeBoundary(Math.ceil(extent[1] / step) * step);
    const count = Math.round((stop - start) / step);

    if (count > 0 && count <= maxBins) {
      return {
        domain: [start, stop],
        step,
        boundaries: Array.from(
          { length: count + 1 },
          (_, index) =>
            index === count
              ? stop
              : normalizeBoundary(start + index * step)
        )
      };
    }
    step = nextNiceStep(step);
  }
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

  maxBins = normalizedBin.maxBins;

  if (domain !== "auto") {
    return cloneAndFreeze(equalBins(validateDomain(domain), maxBins));
  }
  if (values.length === 0) {
    throw new Error("Cannot infer histogram bins from no values.");
  }

  let minimum = values[0];
  let maximum = values[0];

  for (const value of values.slice(1)) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  if (zero) {
    minimum = Math.min(0, minimum);
    maximum = Math.max(0, maximum);
  }
  if (minimum === maximum) {
    return cloneAndFreeze({
      domain: [minimum - 0.5, maximum + 0.5],
      step: 1,
      boundaries: [minimum - 0.5, maximum + 0.5]
    });
  }

  const resolved = nice
    ? niceBins([minimum, maximum], maxBins)
    : equalBins([minimum, maximum], maxBins);
  return cloneAndFreeze(resolved);
}

export function countHistogramBins(values, boundaries) {
  validateValues(values);

  if (
    !Array.isArray(boundaries) ||
    boundaries.length < 2 ||
    !boundaries.every(Number.isFinite) ||
    boundaries.some(
      (value, index) => index > 0 && value <= boundaries[index - 1]
    )
  ) {
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
