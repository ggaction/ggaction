import { cloneAndFreeze, isPlainObject } from "./immutable.js";

export function normalizeFacetAxes(value, previous = "each", { stored = false } = {}) {
  if (value === undefined && !stored) value = "each";
  if (["each", "outer"].includes(value)) return value;
  if (!isPlainObject(value) || Object.keys(value).length === 0 ||
      Object.keys(value).some(key => !["x", "y"].includes(key)) ||
      Object.values(value).some(mode => !["each", "outer"].includes(mode)) ||
      stored && (!Object.hasOwn(value, "x") || !Object.hasOwn(value, "y"))) {
    throw new Error('Facet axes must be each, outer, or a non-empty x/y policy object.');
  }
  return cloneAndFreeze({ x: value.x ?? facetAxisMode(previous, "x"), y: value.y ?? facetAxisMode(previous, "y") });
}

export function facetAxisMode(policy, channel) {
  return typeof policy === "string" ? policy : policy[channel];
}

export function hasOuterFacetAxes(policy) {
  return ["x", "y"].some(channel => facetAxisMode(policy, channel) === "outer");
}

export function validateFacetAxisPolicy(policy, family, repeat = false) {
  if (family !== "cartesian" && (hasOuterFacetAxes(policy) || isPlainObject(policy))) {
    throw new Error("Polar and Parallel facets do not support outer axes or per-channel axis policies.");
  }
  if (repeat && hasOuterFacetAxes(policy)) {
    throw new Error("repeatCharts does not promote axes across different repeated fields.");
  }
}

