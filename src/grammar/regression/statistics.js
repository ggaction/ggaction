import { isPlainObject } from "../../core/immutable.js";
import { rejectUnknownProperties } from "../../core/validation.js";

export const REGRESSION_STATISTIC_FIELDS = Object.freeze(["count", "intercept", "slope", "rSquared"]);

export function validateRegressionStatisticsTransform(transform) {
  if (!isPlainObject(transform)) throw new TypeError("Regression statistics transform must be a plain object.");
  rejectUnknownProperties(transform, ["type"], "regression statistics transform");
  if (transform.type !== "regressionStatistics") throw new Error("Unsupported regression statistics transform.");
  return transform;
}

export function requireRegressionStatisticsSource(source) {
  const transform = source?.transform?.[0];
  if (source?.transform?.length !== 1 || transform.type !== "regression") {
    throw new Error("Regression statistics source must be a regression dataset.");
  }
  if (transform.method !== "linear") throw new Error("Regression statistics only supports linear regression.");
  if (REGRESSION_STATISTIC_FIELDS.includes(transform.groupBy)) {
    throw new Error(`Regression statistics group field "${transform.groupBy}" collides with a statistic output.`);
  }
  return transform;
}

export function validateRegressionFitStatistics(cache, dataset, source) {
  if (!isPlainObject(cache)) throw new TypeError("Regression fit statistics must be a plain object.");
  rejectUnknownProperties(cache, ["version", "method", "groups"], "regression fit statistics");
  const transform = dataset?.transform?.[0];
  if (dataset?.transform?.length !== 1 || transform.type !== "regression" || transform.method !== "linear" ||
      !Array.isArray(dataset.values) || cache.version !== 1 || cache.method !== "linear" || !Array.isArray(cache.groups)) {
    throw new Error("Regression fit statistics requires a materialized linear owner and version 1 groups.");
  }
  const expected = new Map();
  for (const row of source?.values ?? []) {
    if (transform.missing === "drop" && (row[transform.x] == null || row[transform.y] == null)) continue;
    if (!Number.isFinite(row[transform.x]) || !Number.isFinite(row[transform.y])) {
      throw new Error("Regression fit statistics source must contain eligible finite pairs.");
    }
    const key = transform.groupBy === undefined ? undefined : row[transform.groupBy];
    expected.set(key, (expected.get(key) ?? 0) + 1);
  }
  const groups = [...expected.entries()];
  if (groups.length !== cache.groups.length) throw new Error("Regression fit statistics group count does not match its source.");
  cache.groups.forEach((row, index) => {
    if (!isPlainObject(row)) throw new TypeError("Regression fit statistic row must be a plain object.");
    const grouped = transform.groupBy !== undefined;
    rejectUnknownProperties(row, [...REGRESSION_STATISTIC_FIELDS, ...(grouped ? ["group"] : [])], "regression fit statistic row");
    if (grouped && !Object.is(row.group, groups[index][0]) ||
        !Number.isSafeInteger(row.count) || row.count < 2 || row.count !== groups[index][1] ||
        !Number.isFinite(row.intercept) || !Number.isFinite(row.slope) ||
        row.rSquared !== null && !Number.isFinite(row.rSquared)) {
      throw new Error("Regression fit statistics contains invalid coefficients, group identity or observation count.");
    }
  });
  return cache;
}

export function regressionStatisticsRows(cache, dataset) {
  const transform = requireRegressionStatisticsSource(dataset);
  return cache.groups.map(({ group, count, intercept, slope, rSquared }) => ({
    ...(transform.groupBy === undefined ? {} : { [transform.groupBy]: group }),
    count, intercept, slope, rSquared
  }));
}
