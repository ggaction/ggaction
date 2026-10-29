import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export const GEO_LIMITS = Object.freeze({ maxFeatures: 100_000, maxPositions: 1_000_000, maxArcs: 100_000, maxValues: 2_000_000, maxDepth: 128 });

export function createGeometryBudget(input = {}) {
  ownRecord(input, "Geometry limits");
  rejectUnknownProperties(input, Object.keys(GEO_LIMITS), "geometry limits");
  const limits = { ...GEO_LIMITS, ...input }, counts = { features: 0, positions: 0, arcs: 0, values: 0 };
  let work = 0;
  for (const [key, maximum] of Object.entries(GEO_LIMITS)) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1 || limits[key] > maximum) throw new RangeError(`Geometry ${key} exceeds its supported limit.`);
  }
  return Object.freeze({ limits: Object.freeze(limits),
    charge(amount = 1) { validateWorkLimit(work += amount, "Geometry normalization work"); },
    count(kind, amount = 1) {
      const key = `max${kind[0].toUpperCase()}${kind.slice(1)}`;
      validateGeneratedItemLimit(counts[kind] += amount, `Geometry ${kind}`, limits[key]);
    },
    diagnostics() { return { ...counts, work }; }
  });
}

// Bounds are checked before descent and all descriptors before reads. A repeated
// alias is copied like JSON, while an ancestor cycle is rejected.
export function snapshotGeometryJSON(input, budget) {
  const ancestors = new WeakSet(), stack = [];
  function enter(value, depth) {
    budget.count("values"); budget.charge();
    if (depth > budget.limits.maxDepth) throw new RangeError("Geometry JSON nesting exceeds maxDepth.");
    if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") { budget.charge(value.length); return value; }
    if (typeof value !== "object") throw new TypeError("Geometry source requires finite JSON values.");
    if (ancestors.has(value)) throw new TypeError("Geometry source cannot contain cycles.");
    const array = Array.isArray(value);
    if (array) {
      validateGeneratedItemLimit(value.length, "Geometry JSON array", budget.limits.maxValues);
      ownArray(value, "Geometry JSON array");
    } else ownRecord(value, "Geometry JSON object");
    const keys = Object.keys(value), output = array ? [] : {};
    budget.charge(keys.length); ancestors.add(value);
    stack.push({ input: value, output, keys, depth, index: 0 });
    return output;
  }
  const output = enter(input, 0);
  while (stack.length) {
    const frame = stack.at(-1);
    if (frame.index === frame.keys.length) { ancestors.delete(frame.input); stack.pop(); continue; }
    const key = frame.keys[frame.index++]; budget.charge(key.length);
    const value = enter(frame.input[key], frame.depth + 1);
    Object.defineProperty(frame.output, key, { value, writable: true, enumerable: true, configurable: true });
  }
  return cloneAndFreeze(output);
}
