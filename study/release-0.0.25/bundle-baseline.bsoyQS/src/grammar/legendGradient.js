import { validateOptionObject, validatePositiveFinite, validateUnitInterval } from "../core/validation.js";

export const DEFAULT_LEGEND_GRADIENT = Object.freeze({ length: 120, thickness: 12 });
const OPTIONS = Object.freeze(["length", "thickness", "opacity"]);

export function validateLegendGradient(value, label = "Legend gradient") {
  validateOptionObject(value, OPTIONS, label);
  validatePositiveFinite(value.length, `${label} length`);
  validatePositiveFinite(value.thickness, `${label} thickness`);
  if (Object.hasOwn(value, "opacity")) validateUnitInterval(value.opacity, `${label} opacity`);
}

export function normalizeLegendGradient(patch, previous = DEFAULT_LEGEND_GRADIENT) {
  if (patch !== undefined) validateOptionObject(patch, OPTIONS, "Legend gradient");
  const value = { ...previous, ...patch };
  validateLegendGradient(value);
  return value;
}


export function normalizeGradientDirection(value, label = "Gradient legend direction") {
  if (value === undefined) return undefined;
  if (value !== "horizontal" && value !== "vertical") {
    throw new Error(`${label} must be horizontal or vertical.`);
  }
  return value;
}
