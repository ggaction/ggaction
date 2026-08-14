export const NICE_FACTORS = Object.freeze([1, 2, 3, 5]);

function finiteArray(values, label) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError(`${label} must contain finite numbers.`);
  }
}

function rangeError(label) {
  return new RangeError(`${label} is outside the finite numeric range.`);
}

function compensatedSum(values, scale = 1) {
  let total = 0;
  let correction = 0;
  for (const source of values) {
    const value = source / scale;
    const next = total + value;
    correction += Math.abs(total) >= Math.abs(value)
      ? total - next + value
      : value - next + total;
    total = next;
  }
  return total + correction;
}

export function maximumMagnitude(values) {
  let maximum = 0;
  for (const value of values) maximum = Math.max(maximum, Math.abs(value));
  return maximum;
}

export function normalizedFiniteSum(values, label = "Numeric values") {
  finiteArray(values, label);
  const scale = maximumMagnitude(values) || 1;
  return { scale, total: compensatedSum(values, scale) };
}

export function requireFiniteResult(value, label = "Numeric result") {
  if (!Number.isFinite(value)) throw rangeError(label);
  return value === 0 ? 0 : value;
}

export function restoreFiniteScale(value, scale, label = "Numeric result") {
  if (!Number.isFinite(value) || !Number.isFinite(scale) || scale < 0) {
    throw rangeError(label);
  }
  return requireFiniteResult(value * scale, label);
}

function stableReducedSum(values, label, divisor = 1) {
  finiteArray(values, label);
  const ordinary = values.reduce((sum, value) => sum + value, 0);
  if (Number.isFinite(ordinary)) {
    return ordinary === 0 ? 0 : ordinary / divisor;
  }
  const scale = maximumMagnitude(values) || 1;
  return restoreFiniteScale(
    compensatedSum(values, scale) / divisor, scale, label
  );
}

export function stableFiniteSum(values, label = "Numeric sum") {
  return stableReducedSum(values, label);
}

export function stableFinitePrefixSums(values, label = "Numeric sum") {
  const normalized = normalizedFiniteSum(values, label);
  let ordinary = 0;
  let sum = 0;
  let correction = 0;
  return values.map(value => {
    ordinary += value;
    const scaled = value / normalized.scale;
    const next = sum + scaled;
    correction += Math.abs(sum) >= Math.abs(scaled)
      ? sum - next + scaled
      : scaled - next + sum;
    sum = next;
    return Number.isFinite(ordinary)
      ? ordinary === 0 ? 0 : ordinary
      : restoreFiniteScale(sum + correction, normalized.scale, label);
  });
}

export function stableFiniteMean(values, label = "Numeric mean") {
  finiteArray(values, label);
  if (values.length === 0) {
    throw new RangeError(`${label} requires at least one value.`);
  }
  return stableReducedSum(values, label, values.length);
}

export function stableFiniteSquareSum(values, label = "Numeric square sum") {
  finiteArray(values, label);
  const ordinary = values.reduce((sum, value) => sum + value ** 2, 0);
  if (Number.isFinite(ordinary)) return ordinary;
  const scale = maximumMagnitude(values);
  if (scale === 0) return 0;
  const normalized = values.reduce(
    (sum, value) => sum + (value / scale) ** 2,
    0
  );
  const magnitude = restoreFiniteScale(Math.sqrt(normalized), scale, label);
  return requireFiniteResult(magnitude ** 2, label);
}

export function stableFiniteDeviation(values, {
  sample = false,
  divisor = 1,
  label = "Numeric deviation"
} = {}) {
  if (!Number.isFinite(divisor) || divisor <= 0) {
    throw new RangeError(`${label} divisor must be positive and finite.`);
  }
  const denominator = values.length - (sample ? 1 : 0);
  if (denominator <= 0) {
    throw new RangeError(`${label} requires more values.`);
  }
  const mean = stableFiniteMean(values, `${label} mean`);
  const differences = values.map(value => value - mean);
  const squared = differences.reduce(
    (sum, difference) => sum + difference ** 2,
    0
  );
  if (Number.isFinite(squared)) {
    return {
      mean,
      deviation: Math.sqrt(squared / denominator) / divisor,
      squared
    };
  }
  const finiteDifferences = differences.every(Number.isFinite);
  const scale = finiteDifferences
    ? maximumMagnitude(differences)
    : Math.max(Math.abs(mean), maximumMagnitude(values));
  if (scale === 0) return { mean, deviation: 0 };
  const normalizedSquares = values.reduce((sum, value, index) => {
    const difference = finiteDifferences
      ? differences[index] / scale
      : value / scale - mean / scale;
    return sum + difference ** 2;
  }, 0);
  const deviation = restoreFiniteScale(
    Math.sqrt(normalizedSquares / denominator) / divisor,
    scale,
    label
  );
  return { mean, deviation };
}

export function numericExtent(values) {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  return [minimum, maximum];
}

export function normalizeNumericRange(start, end) {
  const magnitude = Math.max(Math.abs(start), Math.abs(end));
  if (magnitude === 0) {
    return { scale: 1, start: 0, end: 0, span: 0 };
  }

  const decimalScale = 10 ** Math.floor(Math.log10(magnitude));
  const scale = Number.isFinite(decimalScale) && decimalScale > 0
    ? decimalScale
    : magnitude;
  start /= scale;
  end /= scale;
  return {
    scale,
    start,
    end,
    span: end - start
  };
}

export function niceNumericStep(
  span,
  count = 5,
  factors = NICE_FACTORS
) {
  if (!Number.isFinite(span) || span <= 0) {
    throw new RangeError("Nice numeric span must be positive and finite.");
  }
  const rough = span / Math.max(1, count);
  const power = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / power;
  const factor = factors.find(candidate => candidate >= fraction) ?? 10;
  return factor * power;
}

export function alignNumericStep(value, step, direction) {
  let quotient = value / step;
  const nearest = Math.round(quotient);
  if (Math.abs(quotient - nearest) <= 1e-10) quotient = nearest;
  return (direction === "floor" ? Math.floor(quotient) : Math.ceil(quotient)) * step;
}

export function cleanNumericValue(value, resolution) {
  if (!Number.isFinite(value) || value === 0) return value === 0 ? 0 : value;
  const rounded = Number(value.toPrecision(15));
  return Number.isFinite(resolution) && resolution > 0 &&
    Math.abs(rounded - value) <= resolution * 1e-10
    ? rounded
    : value;
}

export function inverseLerp(value, start, end) {
  if (value === start) return 0;
  if (value === end) return 1;

  const span = end - start;
  const offset = value - start;
  if (Number.isFinite(span) && span !== 0 && Number.isFinite(offset)) {
    return offset / span;
  }

  const scale = Math.max(Math.abs(value), Math.abs(start), Math.abs(end));
  return (value / scale - start / scale) / (end / scale - start / scale);
}

export function interpolateNumber(start, end, proportion) {
  let result = proportion === 0 ? start : proportion === 1 ? end : undefined;
  if (result === undefined) {
    const span = end - start;
    if (Number.isFinite(span)) {
      result = start + proportion * span;
    } else {
      const scale = Math.max(Math.abs(start), Math.abs(end));
      result = scale * (
        start / scale * (1 - proportion) + end / scale * proportion
      );
    }
  }
  return requireFiniteResult(result, "Numeric interpolation");
}

export function finiteMidpoint(start, end) {
  const sum = start + end;
  const result = Number.isFinite(sum) ? sum / 2 : start / 2 + end / 2;
  return requireFiniteResult(result, "Numeric midpoint");
}

export function sampleNumericRange(start, end, count, label = "Numeric range") {
  const resolution = Math.abs((end - start) / (count - 1));
  const values = [];
  const direction = Math.sign(end - start);
  for (let index = 0; index < count; index += 1) {
    const value = cleanNumericValue(
      interpolateNumber(start, end, index / (count - 1)),
      resolution
    );
    if (
      !Number.isFinite(value) ||
      (direction !== 0 && index > 0 &&
        direction * (value - values[index - 1]) <= 0)
    ) {
      throw new RangeError(`${label} cannot represent ${count} distinct samples.`);
    }
    values.push(value);
  }
  return values;
}

export function formatDistinctNumericSamples(values, initialFormat) {
  let labels = values.map(initialFormat ?? (value =>
    String(+value.toPrecision(3))
  ));
  const distinct = () => labels.every((label, index) =>
    index === 0 || values[index] === values[index - 1] ||
    label !== labels[index - 1]
  );
  for (let precision = 4; !distinct() && precision <= 17; precision += 1) {
    labels = values.map(value => String(+value.toPrecision(precision)));
  }
  return distinct() ? labels : values.map(String);
}

export function stableDecimal(value, places = 12) {
  if (value === 0) return 0;
  const threshold = 10 ** -places;
  return Math.abs(value) < threshold
    ? Number(value.toPrecision(places))
    : Number(value.toFixed(places));
}
