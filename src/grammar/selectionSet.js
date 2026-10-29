import { ownArray } from "../core/ownData.js";
import { validateWorkLimit } from "../core/validation.js";

export const SELECTION_SET_MODES = Object.freeze(["replace", "add", "toggle", "subtract", "intersect"]);

function normalizedKeys(keys, budget) {
  if (!Array.isArray(keys)) throw new TypeError("Selection items must be an array of logical keys.");
  validateWorkLimit(keys.length, "Selection key count");
  ownArray(keys, "Selection items");
  budget.work += keys.length;
  validateWorkLimit(budget.work, "Selection update work");
  for (const key of keys) {
    if (typeof key !== "string" || key.length === 0) throw new TypeError("Selection items require non-empty logical keys.");
    budget.work += key.length;
    validateWorkLimit(budget.work, "Selection update work");
  }
  return Object.freeze([...new Set(keys)]);
}

export function normalizeSelectionKeys(keys) {
  return normalizedKeys(keys, { work: 0 });
}

export function normalizeSelectionEmpty(empty = "none") {
  if (!["none", "all"].includes(empty)) throw new TypeError("Selection empty policy must be none or all.");
  return empty;
}

// Keep prior order, then append newly selected keys in the caller's order.
// Hidden keys remain meaningful; the item resolver owns current visibility.
export function combineSelectionKeys(previous, incoming, mode = "replace") {
  if (!SELECTION_SET_MODES.includes(mode)) throw new TypeError("Unknown selection update mode.");
  if (Array.isArray(previous) && Array.isArray(incoming)) {
    validateWorkLimit(previous.length + incoming.length, "Selection update work");
  }
  const budget = { work: 0 };
  const before = normalizedKeys(previous, budget), after = normalizedKeys(incoming, budget);
  if (mode === "replace") return after;
  const oldKeys = new Set(before), newKeys = new Set(after);
  if (mode === "add") return Object.freeze([...oldKeys, ...after.filter(key => !oldKeys.has(key))]);
  if (mode === "subtract") return Object.freeze(before.filter(key => !newKeys.has(key)));
  if (mode === "intersect") return Object.freeze(before.filter(key => newKeys.has(key)));
  return Object.freeze([...before.filter(key => !newKeys.has(key)), ...after.filter(key => !oldKeys.has(key))]);
}
