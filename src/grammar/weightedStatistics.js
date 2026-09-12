import { isPlainObject } from "../core/immutable.js";
import {
  interpolateNumber,
  maximumMagnitude,
  requireFiniteResult,
  restoreFiniteScale,
  stableFiniteSum
} from "./numeric.js";

const WEIGHT_KINDS = Object.freeze(["frequency", "reliability"]);
const WEIGHT_KEYS = Object.freeze(["field", "kind"]);

export const WEIGHTED_AGGREGATE_OPERATIONS = Object.freeze([
  "count", "sum", "mean", "variance", "varianceP", "stdev", "stdevP",
  "stderr", "median", "q1", "q3", "quantile"
]);

function requireField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

export function normalizeStatisticalWeight(value, label = "Statistical weight") {
  if (!isPlainObject(value)) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  const unknown = Object.keys(value).find(key => !WEIGHT_KEYS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown ${label.toLowerCase()} property "${unknown}".`);
  }
  const field = requireField(value.field, `${label} field`);
  if (!WEIGHT_KINDS.includes(value.kind)) {
    throw new Error(`Unsupported statistical weight kind "${value.kind}".`);
  }
  return { field, kind: value.kind };
}

export function validateWeightedAggregate(operation) {
  const name = typeof operation === "string" ? operation : operation?.op;
  if (!WEIGHTED_AGGREGATE_OPERATIONS.includes(name)) {
    throw new Error(`Aggregate "${name}" does not support statistical weight.`);
  }
  return operation;
}

export function readStatisticalWeights(
  rows,
  definition,
  label = "Statistical"
) {
  if (!Array.isArray(rows)) {
    throw new TypeError(`${label} rows must be an array.`);
  }
  const weight = normalizeStatisticalWeight(definition, `${label} weight`);
  const entries = rows.map((row, index) => {
    const value = row?.[weight.field];
    if (weight.kind === "frequency") {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RangeError(
          `${label} frequency weight "${weight.field}" must contain non-negative safe integers; row ${index} is invalid.`
        );
      }
    } else if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(
        `${label} reliability weight "${weight.field}" must contain non-negative finite numbers; row ${index} is invalid.`
      );
    }
    return { row, index, weight: value };
  });
  return { definition: weight, entries };
}

export function validateWeightedNumericFields(entries, fields, label = "Statistical") {
  for (const entry of entries) {
    for (const field of fields) {
      if (!Number.isFinite(entry.row?.[field])) {
        throw new TypeError(
          `${label} field "${field}" must contain a finite number at row ${entry.index}.`
        );
      }
    }
  }
}

export function summarizeStatisticalWeights(
  entries,
  kind,
  label = "Statistical group"
) {
  const positive = entries.filter(entry => entry.weight > 0);
  if (positive.length === 0) {
    throw new Error(`${label} must have positive total weight.`);
  }
  if (kind === "frequency") {
    let total = 0;
    for (const entry of positive) {
      total += entry.weight;
      if (!Number.isSafeInteger(total)) {
        throw new RangeError(`${label} frequency total weight must be a safe integer.`);
      }
    }
    const weightScale = maximumMagnitude(positive.map(entry => entry.weight));
    const normalizedWeights = positive.map(entry => entry.weight / weightScale);
    return {
      kind,
      positive,
      weightScale,
      normalizedWeights,
      normalizedTotal: stableFiniteSum(normalizedWeights, `${label} weight`),
      effectiveSize: total,
      totalWeight: total
    };
  }

  const weightScale = maximumMagnitude(positive.map(entry => entry.weight));
  const normalizedWeights = positive.map(entry => entry.weight / weightScale);
  const normalizedTotal = stableFiniteSum(normalizedWeights, `${label} weight`);
  const normalizedSquares = stableFiniteSum(
    normalizedWeights.map(value => value ** 2),
    `${label} squared weight`
  );
  const effectiveSize = requireFiniteResult(
    normalizedTotal ** 2 / normalizedSquares,
    `${label} effective sample size`
  );
  return {
    kind,
    positive,
    weightScale,
    normalizedWeights,
    normalizedTotal,
    normalizedSquares,
    effectiveSize
  };
}

function restoreWeight(summary, normalized, label) {
  return restoreFiniteScale(normalized, summary.weightScale, label);
}

export function statisticalWeightTotal(summary, label = "Statistical count") {
  return summary.kind === "frequency"
    ? summary.totalWeight
    : restoreWeight(summary, summary.normalizedTotal, label);
}

function weightedMoments(summary, field, label) {
  const values = summary.positive.map(entry => entry.row[field]);
  const valueScale = maximumMagnitude(values) || 1;
  const normalizedMean = stableFiniteSum(
    values.map((value, index) =>
      summary.normalizedWeights[index] * (value / valueScale)
    ),
    `${label} mean`
  ) / summary.normalizedTotal;
  const mean = restoreFiniteScale(normalizedMean, valueScale, `${label} mean`);
  const normalizedSquared = stableFiniteSum(
    values.map((value, index) => {
      const difference = value / valueScale - normalizedMean;
      return summary.normalizedWeights[index] * difference ** 2;
    }),
    `${label} squared deviation`
  );
  return { mean, normalizedMean, normalizedSquared, valueScale };
}

function restoreWeightedProduct(value, firstScale, secondScale, label) {
  const candidates = [
    () => value * firstScale * secondScale,
    () => value * secondScale * firstScale,
    () => firstScale * secondScale * value
  ];
  for (const candidate of candidates) {
    const result = candidate();
    if (Number.isFinite(result)) return result === 0 ? 0 : result;
  }
  throw new RangeError(`${label} is outside the finite numeric range.`);
}

function weightedSum(summary, field, label) {
  const values = summary.positive.map(entry => entry.row[field]);
  const valueScale = maximumMagnitude(values) || 1;
  const normalized = stableFiniteSum(
    values.map((value, index) =>
      summary.normalizedWeights[index] * (value / valueScale)
    ),
    label
  );
  return restoreWeightedProduct(
    normalized,
    summary.weightScale,
    valueScale,
    label
  );
}

function weightedDeviation(summary, moments, sample, label) {
  const denominator = sample
    ? summary.kind === "frequency"
      ? (summary.totalWeight - 1) / summary.weightScale
      : summary.normalizedTotal -
        summary.normalizedSquares / summary.normalizedTotal
    : summary.normalizedTotal;
  if (!Number.isFinite(denominator) || denominator <= 0) {
    throw new Error(`${label} requires an effective sample size greater than one.`);
  }
  return restoreFiniteScale(
    Math.sqrt(moments.normalizedSquared / denominator),
    moments.valueScale,
    label
  );
}

function frequencyRankValue(summary, field, rank) {
  let cumulative = 0;
  for (const item of summary.ordered) {
    cumulative += item.weight;
    if (cumulative > rank) return item.value;
  }
  return summary.ordered.at(-1).value;
}

export function weightedQuantile(summary, field, probability, label = "Weighted quantile") {
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new RangeError(`${label} probability must be between 0 and 1.`);
  }
  const ordered = summary.positive
    .map(entry => ({ value: entry.row[field], weight: entry.weight }))
    .sort((left, right) => left.value - right.value);
  if (summary.kind === "frequency") {
    const ranked = { ...summary, ordered };
    const position = (summary.totalWeight - 1) * probability;
    const lower = frequencyRankValue(ranked, field, Math.floor(position));
    const upper = frequencyRankValue(ranked, field, Math.ceil(position));
    return interpolateNumber(lower, upper, position - Math.floor(position));
  }

  if (probability === 0) return ordered[0].value;
  if (probability === 1) return ordered.at(-1).value;
  const combined = [];
  for (const item of ordered) {
    const previous = combined.at(-1);
    if (previous !== undefined && Object.is(previous.value, item.value)) {
      previous.weight += item.weight / summary.weightScale;
    } else {
      combined.push({ value: item.value, weight: item.weight / summary.weightScale });
    }
  }
  const target = probability * summary.normalizedTotal;
  let cumulative = 0;
  for (const item of combined) {
    cumulative += item.weight;
    if (cumulative >= target) return item.value;
  }
  return combined.at(-1).value;
}

export function calculateWeightedAggregate(
  summary,
  field,
  operation,
  label = "Weighted aggregate"
) {
  validateWeightedAggregate(operation);
  const name = typeof operation === "string" ? operation : operation.op;
  if (name === "count") return statisticalWeightTotal(summary, `${label} count`);
  if (["median", "q1", "q3", "quantile"].includes(name)) {
    const probability = name === "median" ? 0.5
      : name === "q1" ? 0.25
        : name === "q3" ? 0.75
          : operation.probability;
    return weightedQuantile(summary, field, probability, label);
  }

  if (name === "sum") return weightedSum(summary, field, `${label} sum`);
  const moments = weightedMoments(summary, field, label);
  if (name === "mean") return moments.mean;
  const sample = ["variance", "stdev", "stderr"].includes(name);
  const deviation = weightedDeviation(summary, moments, sample, label);
  if (name === "stdev" || name === "stdevP") return deviation;
  if (name === "stderr") {
    return requireFiniteResult(
      deviation / Math.sqrt(summary.effectiveSize),
      `${label} standard error`
    );
  }
  return requireFiniteResult(deviation ** 2, `${label} variance`);
}

export function weightedRows(summary) {
  return summary.positive.map(entry => entry.row);
}

export function weightedEntriesExtent(summary, field) {
  let minimum = Infinity;
  let maximum = -Infinity;
  for (const entry of summary.positive) {
    minimum = Math.min(minimum, entry.row[field]);
    maximum = Math.max(maximum, entry.row[field]);
  }
  return [minimum, maximum];
}

export function sumEntryWeights(entries, summary, label = "Statistical mass") {
  if (entries.length === 0) return 0;
  if (summary.kind === "frequency") {
    let total = 0;
    for (const entry of entries) {
      total += entry.weight;
      if (!Number.isSafeInteger(total)) {
        throw new RangeError(`${label} frequency total weight must be a safe integer.`);
      }
    }
    return total;
  }
  const normalized = stableFiniteSum(
    entries.map(entry => entry.weight / summary.weightScale),
    label
  );
  return restoreWeight(summary, normalized, label);
}

export function weightedBandwidth(summary, field, label = "Density auto bandwidth") {
  if (summary.effectiveSize <= 1) {
    throw new Error(`${label} requires an effective sample size greater than one.`);
  }
  const moments = weightedMoments(summary, field, label);
  const deviation = weightedDeviation(summary, moments, true, label);
  const interquartileRange = weightedQuantile(summary, field, 0.75, label) -
    weightedQuantile(summary, field, 0.25, label);
  const robustDeviation = interquartileRange / 1.34;
  const spread = robustDeviation > 0
    ? Math.min(deviation, robustDeviation)
    : deviation;
  const bandwidth = spread * (1.06 * summary.effectiveSize ** -0.2);
  if (!Number.isFinite(bandwidth) || bandwidth <= 0) {
    throw new Error(`${label} requires varying finite values.`);
  }
  return bandwidth;
}

export function weightedKernelSum(summary, field, sample, bandwidth, kernel, label) {
  const normalized = stableFiniteSum(
    summary.positive.map((entry, index) =>
      summary.normalizedWeights[index] * kernel((sample - entry.row[field]) / bandwidth)
    ),
    label
  );
  return { normalized, unit: normalized / summary.normalizedTotal / bandwidth };
}

export function weightedKernelEstimate(
  summary,
  field,
  sample,
  bandwidth,
  kernel,
  normalization,
  label = "Density estimate"
) {
  const { normalized, unit } = weightedKernelSum(
    summary,
    field,
    sample,
    bandwidth,
    kernel,
    label
  );
  return normalization === "unit"
    ? requireFiniteResult(unit, label)
    : restoreFiniteScale(normalized / bandwidth, summary.weightScale, label);
}
