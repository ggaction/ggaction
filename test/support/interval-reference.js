function normalizeGrouping(groupBy) {
  const fields = Array.isArray(groupBy) ? [...groupBy] : [groupBy];
  if (
    fields.length === 0 ||
    fields.some(field => typeof field !== "string" || field.length === 0) ||
    new Set(fields).size !== fields.length
  ) {
    throw new TypeError("groupBy must contain unique non-empty field names.");
  }
  return fields;
}

function isPresentGroupValue(value) {
  return value !== undefined && value !== null &&
    !(typeof value === "string" && value.length === 0);
}

export function createMeanConfidenceIntervalReference(rows, {
  field,
  groupBy,
  confidence = 0.95,
  criticalValue
} = {}) {
  if (!Array.isArray(rows)) {
    throw new TypeError("rows must be an array.");
  }
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("field must be a non-empty string.");
  }
  if (!Number.isFinite(confidence) || confidence <= 0 || confidence >= 1) {
    throw new RangeError("confidence must be between 0 and 1.");
  }
  if (typeof criticalValue !== "function") {
    throw new TypeError("criticalValue must be a function.");
  }

  const grouping = normalizeGrouping(groupBy);
  const groups = new Map();
  for (const row of rows) {
    if (row === null || typeof row !== "object" || Array.isArray(row)) continue;
    const value = row[field];
    const groupValues = grouping.map(group => row[group]);
    if (
      !Number.isFinite(value) ||
      !groupValues.every(isPresentGroupValue)
    ) {
      continue;
    }

    const key = JSON.stringify(groupValues);
    if (!groups.has(key)) {
      groups.set(key, {
        group: Object.fromEntries(
          grouping.map((group, index) => [group, groupValues[index]])
        ),
        values: []
      });
    }
    groups.get(key).values.push(value);
  }

  const intervals = [];
  for (const { group, values } of groups.values()) {
    if (values.length < 2) continue;
    const count = values.length;
    const mean = values.reduce((sum, value) => sum + value, 0) / count;
    const squaredError = values.reduce(
      (sum, value) => sum + (value - mean) ** 2,
      0
    );
    const sampleStdev = Math.sqrt(squaredError / (count - 1));
    const stderr = sampleStdev / Math.sqrt(count);
    const critical = criticalValue(count - 1, confidence);
    if (!Number.isFinite(critical) || critical <= 0) {
      throw new RangeError("criticalValue must return a positive finite number.");
    }
    const halfWidth = critical * stderr;
    intervals.push({
      ...group,
      count,
      degreesOfFreedom: count - 1,
      mean,
      sampleStdev,
      stderr,
      critical,
      lower: mean - halfWidth,
      upper: mean + halfWidth
    });
  }
  return intervals;
}
