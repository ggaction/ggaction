import { ownArray, ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { graphMetricPair } from "./graph/metrics.js";
import { transformHitPoint } from "./hitCoordinates.js";

export function nearestSelectionBudget() {
  let work = 0;
  return count => validateWorkLimit(work += count, "Nearest selection work");
}

export function normalizeNearestSelection(value) {
  ownRecord(value, "Nearest selection");
  const request = Object.assign(Object.create(null), value), screen = request.space === "screen";
  const required = screen ? ["space", "point", "maxDistance"] : ["space", "fields", "values", "metric", "maxDistance"];
  if (!["screen", "data"].includes(request.space) || required.some(key => !Object.hasOwn(request, key)) ||
      Object.keys(request).some(key => !required.includes(key) && !(screen && key === "hitInvisible"))) {
    throw new TypeError("Nearest selection requires explicit screen or data options.");
  }
  if (!Number.isFinite(request.maxDistance) || request.maxDistance < 0) throw new RangeError("Nearest maximum distance must be finite and non-negative.");
  if (screen) {
    request.point = transformHitPoint([1, 0, 0, 1, 0, 0], request.point);
    if (request.hitInvisible === undefined) request.hitInvisible = false;
    if (typeof request.hitInvisible !== "boolean") throw new TypeError("Nearest hitInvisible must be boolean.");
  } else {
    if (!Array.isArray(request.fields) || !Array.isArray(request.values) || request.fields.length > 64 || request.values.length > 64) throw new TypeError("Nearest tuples exceed their field limit.");
    ownArray(request.fields, "Nearest fields"); ownArray(request.values, "Nearest values");
    if (!request.fields.length || new Set(request.fields).size !== request.fields.length ||
        request.fields.some(name => typeof name !== "string" || !name.length || name.length > 1024) ||
        request.values.length !== request.fields.length || !request.values.every(Number.isFinite)) {
      throw new TypeError("Nearest data requires 1 to 64 distinct fields and an equal finite numeric tuple.");
    }
    if (!["euclidean", "manhattan"].includes(request.metric)) throw new TypeError("Nearest data metric must be euclidean or manhattan.");
  }
  return cloneAndFreeze(request);
}

// Data distance uses raw final-item numeric tuples, never an inferred scale/domain.
export function nearestDataKey(items, input, spend = nearestSelectionBudget()) {
  const query = normalizeNearestSelection(input);
  if (query.space !== "data") throw new TypeError("Data nearest requires data space.");
  if (Array.isArray(items)) spend(items.length);
  ownArray(items, "Nearest items");
  let result = null;
  const keys = new Set();
  for (const item of items) {
    ownRecord(item, "Nearest item");
    if (!Object.hasOwn(item, "key") || typeof item.key !== "string" || !item.key.length || keys.has(item.key)) throw new TypeError("Nearest items require unique logical keys.");
    spend(item.key.length); keys.add(item.key);
    if (!Object.hasOwn(item, "fields")) throw new TypeError("Nearest item requires fields.");
    ownRecord(item.fields, "Nearest item fields");
    spend(Object.keys(item.fields).length + query.fields.length * 16);
    const values = query.fields.map(field => {
      if (!Object.hasOwn(item.fields, field) || !Number.isFinite(item.fields[field])) throw new TypeError(`Nearest field "${field}" must be a unique finite numeric value at the final item grain.`);
      return item.fields[field];
    });
    const { distance } = graphMetricPair(values, query.values, { metric: query.metric });
    if (distance <= query.maxDistance && (result === null || distance < result.distance || (distance === result.distance && item.key < result.key))) {
      result = { key: item.key, distance };
    }
  }
  return result === null ? null : Object.freeze(result);
}
