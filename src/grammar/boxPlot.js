import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { interpolateNumber, stableDecimal } from "./numeric.js";

export const BOX_FIELDS = Object.freeze({
  q1: "__boxPlot_q1", median: "__boxPlot_median", q3: "__boxPlot_q3",
  lowerWhisker: "__boxPlot_lowerWhisker", upperWhisker: "__boxPlot_upperWhisker",
  lowerFence: "__boxPlot_lowerFence", upperFence: "__boxPlot_upperFence",
  count: "__boxPlot_count"
});

const TRANSFORM_KEYS = [
  "type", "category", "field", "method", "whisker", "factor", "as"
];
const OUTPUT_KEYS = Object.keys(BOX_FIELDS);

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
  const whisker = value.whisker ?? "tukey";
  if (!["tukey", "minmax"].includes(whisker)) {
    throw new Error(`Unsupported box whisker policy "${whisker}".`);
  }
  if (whisker === "tukey" && (!Number.isFinite(value.factor) || value.factor <= 0)) {
    throw new RangeError("Box factor must be positive and finite.");
  }
  if (whisker === "minmax" && value.factor !== undefined) {
    throw new Error("Box minmax whiskers do not accept factor.");
  }
  validateOutputs(value.as, new Set([value.category, value.field]));
  return value;
}

export function normalizeBoxTransform(options = {}) {
  const {
    type = "boxSummary",
    category,
    field: measure,
    whisker = "tukey",
    factor = 1.5,
    as = BOX_FIELDS
  } = options;
  if (whisker === "minmax" && Object.hasOwn(options, "factor")) {
    throw new Error("Box minmax whiskers do not accept factor.");
  }
  const normalized = {
    type,
    category,
    field: measure,
    method: "linear",
    ...(whisker === "tukey" ? { factor } : { whisker }),
    as
  };
  validateBoxTransform(normalized);
  return cloneAndFreeze(normalized);
}

function quantile(sorted, p) {
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return interpolateNumber(sorted[lower], sorted[upper], position - lower);
}

export function deriveBoxData(rows, transform) {
  if (!Array.isArray(rows)) throw new TypeError("Box rows must be an array.");
  validateBoxTransform(transform);
  const { category, field: measure, factor, as } = transform;
  const whisker = transform.whisker ?? "tukey";
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
    const [q1, median, q3] = [0.25, 0.5, 0.75].map(probability =>
      stableDecimal(quantile(sorted, probability))
    );
    const spread = q3 - q1;
    const lowerFence = whisker === "minmax"
      ? sorted[0]
      : stableDecimal(q1 - factor * spread);
    const upperFence = whisker === "minmax"
      ? sorted.at(-1)
      : stableDecimal(q3 + factor * spread);
    if (![lowerFence, upperFence].every(Number.isFinite)) {
      throw new RangeError("Box Tukey fences are outside the finite numeric range.");
    }
    const inliers = sorted.filter(value => value >= lowerFence && value <= upperFence);
    const lowerWhisker = inliers[0];
    const upperWhisker = inliers.at(-1);
    summaries.push({
      [category]: group.key, [as.q1]: q1, [as.median]: median, [as.q3]: q3,
      [as.lowerWhisker]: lowerWhisker, [as.upperWhisker]: upperWhisker,
      [as.lowerFence]: lowerFence, [as.upperFence]: upperFence, [as.count]: sorted.length
    });
    if (whisker === "tukey") {
      for (const row of group.rows) {
        if (row[measure] < lowerWhisker || row[measure] > upperWhisker) outlierSet.add(row);
      }
    }
  }
  return cloneAndFreeze({ summaries, outliers: rows.filter(row => outlierSet.has(row)).map(row => ({ ...row })) });
}
