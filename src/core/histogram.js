import { cloneAndFreeze } from "./immutable.js";

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
  maxBins,
  domain = "auto",
  nice = true,
  zero = false
}) {
  validateValues(values);
  validateMaxBins(maxBins);

  if (typeof nice !== "boolean") {
    throw new TypeError("Histogram nice must be a boolean.");
  }
  if (typeof zero !== "boolean") {
    throw new TypeError("Histogram zero must be a boolean.");
  }

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
