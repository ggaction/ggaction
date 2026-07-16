import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";

export const BOX_FIELDS = Object.freeze({
  q1: "__boxPlot_q1", median: "__boxPlot_median", q3: "__boxPlot_q3",
  lowerWhisker: "__boxPlot_lowerWhisker", upperWhisker: "__boxPlot_upperWhisker",
  lowerFence: "__boxPlot_lowerFence", upperFence: "__boxPlot_upperFence",
  count: "__boxPlot_count"
});

const TRANSFORM_KEYS = Object.freeze([
  "type", "category", "field", "method", "factor", "as"
]);
const OUTPUT_KEYS = Object.freeze(Object.keys(BOX_FIELDS));

function field(value, label) {
  if (typeof value !== "string" || value.length === 0) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function validateOutputs(as, occupied) {
  if (!isPlainObject(as)) throw new TypeError("Box as must be a plain object.");
  const keys = Object.keys(as);
  if (keys.length !== OUTPUT_KEYS.length || !OUTPUT_KEYS.every(key => Object.hasOwn(as, key))) {
    throw new Error(`Box as requires exactly ${OUTPUT_KEYS.join(", ")}.`);
  }
  const values = OUTPUT_KEYS.map(key => field(as[key], `Box as.${key}`));
  if (new Set(values).size !== values.length) throw new Error("Box output fields must be distinct.");
  if (values.some(value => occupied.has(value))) {
    throw new Error("Box output fields must not collide with input fields.");
  }
}

export function validateBoxTransform(value) {
  if (!isPlainObject(value)) throw new TypeError("Box transform must be a plain object.");
  const unknown = Object.keys(value).find(key => !TRANSFORM_KEYS.includes(key));
  if (unknown) throw new Error(`Unknown box transform property "${unknown}".`);
  if (!["boxSummary", "boxOutlier"].includes(value.type)) {
    throw new Error(`Unsupported box transform "${value.type}".`);
  }
  field(value.category, "Box category field");
  field(value.field, "Box measure field");
  if (value.method !== "linear") throw new Error(`Unsupported box quantile method "${value.method}".`);
  if (!Number.isFinite(value.factor) || value.factor <= 0) {
    throw new RangeError("Box factor must be positive and finite.");
  }
  validateOutputs(value.as, new Set([value.category, value.field]));
  return value;
}

export function normalizeBoxTransform({
  type = "boxSummary",
  category,
  field: measure,
  factor = 1.5,
  as = BOX_FIELDS
} = {}) {
  const normalized = { type, category, field: measure, method: "linear", factor, as };
  validateBoxTransform(normalized);
  return cloneAndFreeze(normalized);
}

function quantile(sorted, p) {
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function stableNumber(value) {
  return Number(value.toFixed(12));
}

export function deriveBoxData(rows, transform) {
  if (!Array.isArray(rows)) throw new TypeError("Box rows must be an array.");
  validateBoxTransform(transform);
  const { category, field: measure, factor, as } = transform;
  const groups = [];
  const byCategory = new Map();
  for (const row of rows) {
    const key = row[category];
    const value = row[measure];
    if (key === undefined || key === null || key === "" || value === undefined || value === null) continue;
    if (!Number.isFinite(value)) throw new TypeError(`Box field "${measure}" must contain finite numbers.`);
    if (!byCategory.has(key)) {
      const group = { key, rows: [] };
      byCategory.set(key, group);
      groups.push(group);
    }
    byCategory.get(key).rows.push(row);
  }
  if (groups.length === 0) throw new Error("Box transform requires at least one valid row.");
  const summaries = [];
  const outlierSet = new Set();
  for (const group of groups) {
    const sorted = group.rows.map(row => row[measure]).sort((a, b) => a - b);
    const q1 = stableNumber(quantile(sorted, 0.25));
    const median = stableNumber(quantile(sorted, 0.5));
    const q3 = stableNumber(quantile(sorted, 0.75));
    const lowerFence = stableNumber(q1 - factor * (q3 - q1));
    const upperFence = stableNumber(q3 + factor * (q3 - q1));
    const inliers = sorted.filter(value => value >= lowerFence && value <= upperFence);
    const lowerWhisker = inliers[0];
    const upperWhisker = inliers.at(-1);
    summaries.push({
      [category]: group.key, [as.q1]: q1, [as.median]: median, [as.q3]: q3,
      [as.lowerWhisker]: lowerWhisker, [as.upperWhisker]: upperWhisker,
      [as.lowerFence]: lowerFence, [as.upperFence]: upperFence, [as.count]: sorted.length
    });
    for (const row of group.rows) if (row[measure] < lowerWhisker || row[measure] > upperWhisker) outlierSet.add(row);
  }
  return cloneAndFreeze({ summaries, outliers: rows.filter(row => outlierSet.has(row)).map(row => ({ ...row })) });
}
