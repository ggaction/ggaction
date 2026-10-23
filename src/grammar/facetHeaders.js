import { validateOptionObject, validateNonEmptyString, validatePositiveFinite,
  validateNonNegativeFinite } from "../core/validation.js";
import { resolveRotation } from "./rotation.js";

const TITLE_OPTIONS = Object.freeze([
  "text", "fontSize", "fontFamily", "fontWeight", "color", "offset", "align",
  "rotation", "alongOffset"
]);

export function validateFacetHeaderTitle(value) {
  validateOptionObject(value, TITLE_OPTIONS, "Facet header title", { allowEmpty: false });
  validateNonEmptyString(value.text, "Facet header title text");
  if (/[\r\n\u2028\u2029]/u.test(value.text)) {
    throw new TypeError("Facet header title text must be one line.");
  }
  if (value.fontSize !== undefined) validatePositiveFinite(value.fontSize, "Facet header title fontSize");
  for (const key of ["fontFamily", "color"]) {
    if (value[key] !== undefined) validateNonEmptyString(value[key], `Facet header title ${key}`);
  }
  if (value.fontWeight !== undefined && !(
    typeof value.fontWeight === "string" && value.fontWeight.length > 0 || Number.isFinite(value.fontWeight)
  )) throw new TypeError("Facet header title fontWeight must be a non-empty string or finite number.");
  if (value.offset !== undefined) validateNonNegativeFinite(value.offset, "Facet header title offset");
  if (value.align !== undefined && !["start", "center", "end"].includes(value.align)) {
    throw new TypeError("Facet header title align must be start, center, or end.");
  }
  for (const key of ["rotation", "alongOffset"]) {
    if (Object.hasOwn(value, key) && !Number.isFinite(value[key])) {
      throw new TypeError(`Facet header title ${key} must contain finite normalized radians or coordinates.`);
    }
  }
}

export function normalizeFacetHeaderTitle(current, patch) {
  if (patch === false) return undefined;
  validateOptionObject(patch, TITLE_OPTIONS, "Facet header title", { allowEmpty: false });
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) throw new TypeError(`Facet header title ${key} must not be undefined.`);
  }
  const value = { ...current, ...patch };
  if (Object.hasOwn(patch, "rotation")) {
    value.rotation = resolveRotation(patch.rotation, "Facet header title rotation");
  }
  validateFacetHeaderTitle(value);
  return value;
}

export function validateFacetHeaderRotations(value) {
  for (const config of value.common === undefined ? [value] : [value.common, value.row, value.column]) {
    if (config !== undefined && Object.hasOwn(config, "anchor") &&
        !["plot", "content"].includes(config.anchor)) {
      throw new TypeError("Facet header anchor must be plot or content.");
    }
    if (config?.rotation !== undefined && !Number.isFinite(config.rotation)) {
      throw new TypeError("Facet header rotation must contain finite normalized radians.");
    }
    if (config?.title !== undefined) validateFacetHeaderTitle(config.title);
  }
  if (value.title !== undefined || value.common?.title !== undefined) {
    throw new TypeError("Facet header title requires an explicit row or column role.");
  }
  if (value.mode !== "roles" && (value.row?.title !== undefined || value.column?.title !== undefined)) {
    throw new TypeError("Facet field titles require role header mode.");
  }
}

