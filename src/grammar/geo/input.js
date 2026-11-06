import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze, isOwned } from "../../core/immutable.js";
import { MAX_WORK_ITEMS, rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";

export const GEO_LIMITS = Object.freeze({ maxFeatures: 100_000, maxPositions: 1_000_000, maxArcs: 100_000, maxValues: 2_000_000, maxDepth: 128 });

// Labels and limit keys per counted kind, built once instead of per value.
const counters = Object.freeze(Object.fromEntries(["features", "positions", "arcs", "values"].map(kind =>
  [kind, Object.freeze({ label: `Geometry ${kind}`, limit: `max${kind[0].toUpperCase()}${kind.slice(1)}` })])));

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
      const counter = counters[kind];
      validateGeneratedItemLimit(counts[kind] += amount, counter.label, limits[counter.limit]);
    },
    diagnostics() { return { ...counts, work }; }
  });
}

// A completed admission of an exact owned tree is a fixed sequence of checks
// and charges. Its totals are kept on the tree; a later admission of the same
// tree replays them at once when every total stays inside the current limits,
// which is exactly when the complete traversal could not fail.
class AdmissionTarget { constructor(value) { return value; } }
class AdmittedTree extends AdmissionTarget {
  #totals;
  static get(value) { return #totals in value ? value.#totals : undefined; }
  static set(value, totals) { try { new AdmittedTree(value).#totals = totals; } catch { /* Not markable: always traverse. */ } }
}
function replayAdmission(input, budget) {
  const totals = AdmittedTree.get(input);
  if (totals === undefined) return false;
  const { values, work } = budget.diagnostics(), limits = budget.limits;
  if (totals.depth > limits.maxDepth || totals.longestArray > limits.maxValues || values + totals.values > limits.maxValues ||
      work + totals.work > MAX_WORK_ITEMS) return false;
  budget.count("values", totals.values); budget.charge(totals.work);
  return true;
}

// Bounds are checked before descent and all descriptors before reads. A repeated
// alias is copied like JSON, while an ancestor cycle is rejected.
export function snapshotGeometryJSON(input, budget) {
  if (isOwned(input) && replayAdmission(input, budget)) return input;
  const before = budget.diagnostics();
  let depthReached = 0, longestArray = 0;
  // Call-local membership only; strong sets avoid weak-table churn.
  const ancestors = new Set(), stack = [];
  let reusable = isOwned(input);
  const seen = reusable ? new Set() : undefined;
  function enter(value, depth) {
    budget.count("values"); budget.charge();
    if (depth > budget.limits.maxDepth) throw new RangeError("Geometry JSON nesting exceeds maxDepth.");
    if (depth > depthReached) depthReached = depth;
    if (value === null || typeof value === "boolean" || typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value === "string") { budget.charge(value.length); return; }
    if (typeof value !== "object") throw new TypeError("Geometry source requires finite JSON values.");
    if (ancestors.has(value)) throw new TypeError("Geometry source cannot contain cycles.");
    const array = Array.isArray(value);
    if (array) {
      validateGeneratedItemLimit(value.length, "Geometry JSON array", budget.limits.maxValues);
      if (value.length > longestArray) longestArray = value.length;
      ownArray(value, "Geometry JSON array");
    } else ownRecord(value, "Geometry JSON object");
    const keys = Object.keys(value);
    budget.charge(keys.length); ancestors.add(value);
    // Keep the complete validation traversal even for owned input. Reuse only
    // exact trees: aliases and null prototypes require JSON-copy semantics.
    if (reusable) {
      if (!isOwned(value) || !array && Object.getPrototypeOf(value) !== Object.prototype || seen.has(value)) reusable = false;
      else seen.add(value);
    }
    stack.push({ input: value, keys, depth, index: 0 });
  }
  enter(input, 0);
  while (stack.length) {
    const frame = stack.at(-1);
    if (frame.index === frame.keys.length) { ancestors.delete(frame.input); stack.pop(); continue; }
    const key = frame.keys[frame.index++]; budget.charge(key.length);
    enter(frame.input[key], frame.depth + 1);
  }
  if (!reusable) return cloneAndFreeze(copyAdmittedJSON(input));
  const after = budget.diagnostics();
  AdmittedTree.set(input, Object.freeze({ values: after.values - before.values, work: after.work - before.work, depth: depthReached, longestArray }));
  return input;
}

// The input was fully admitted above, so this JSON copy repeats no checks or
// charges. Aliases become separate copies, as in the admission traversal.
function copyAdmittedJSON(input) {
  if (input === null || typeof input !== "object") return input;
  const root = Array.isArray(input) ? [] : {}, stack = [{ input, output: root, keys: Object.keys(input), index: 0 }];
  while (stack.length) {
    const frame = stack.at(-1);
    if (frame.index === frame.keys.length) { stack.pop(); continue; }
    const key = frame.keys[frame.index++], value = frame.input[key];
    let child = value;
    if (value !== null && typeof value === "object") {
      child = Array.isArray(value) ? [] : {};
      stack.push({ input: value, output: child, keys: Object.keys(value), index: 0 });
    }
    Object.defineProperty(frame.output, key, { value: child, writable: true, enumerable: true, configurable: true });
  }
  return root;
}
