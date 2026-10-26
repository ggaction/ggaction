import { validateOptionObject } from "../core/validation.js";
import { validateUserId } from "../core/identifiers.js";

function normalizeTarget(target) {
  if (typeof target === "string") return { childPath: [], id: validateUserId(target, "Action target") };
  validateOptionObject(target, ["childPath", "id", "facetSource"], "Scoped action target");
  if (!Array.isArray(target.childPath) || target.childPath.some(id => typeof id !== "string")) {
    throw new TypeError("Scoped action target requires a childPath array.");
  }
  if (target.facetSource !== undefined && target.facetSource !== true) throw new TypeError("facetSource must be true when supplied.");
  target.childPath.forEach(id => validateUserId(id, "Target child id"));
  return { childPath: [...target.childPath], ...(target.facetSource ? { facetSource: true } : {}), ...(target.id === undefined ? {} : { id: validateUserId(target.id, "Action target id") }) };
}


export function normalizeActionTargets(value) {
  const requested = Array.isArray(value) ? value : [value];
  if (!requested.length) throw new Error("Action target list must not be empty.");
  const targets = requested.map(normalizeTarget);
  if (new Set(targets.map(target => JSON.stringify(target))).size !== targets.length) {
    throw new Error("Action targets must be unique.");
  }
  return targets;
}
