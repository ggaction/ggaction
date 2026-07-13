import { isPlainObject } from "../../core/immutable.js";
import { validateGraphicProperty } from "./graphic.js";

const FINITE_PROPERTIES = new Set([
  "x", "y", "x1", "y1", "x2", "y2", "width", "height", "radius",
  "strokeWidth", "fontSize", "rotation", "opacity", "gap"
]);
const NON_NEGATIVE_PROPERTIES = new Set([
  "width", "height", "radius", "strokeWidth", "fontSize", "gap"
]);
const STRING_PROPERTIES = new Set([
  "background", "fill", "stroke", "fontFamily", "text", "textAlign",
  "textBaseline"
]);
const TEXT_ALIGNS = new Set(["left", "right", "center", "start", "end"]);
const TEXT_BASELINES = new Set([
  "top", "hanging", "middle", "alphabetic", "ideographic", "bottom"
]);

export function validateConcreteGraphicValue(type, property, value) {
  if (FINITE_PROPERTIES.has(property) && !Number.isFinite(value)) {
    throw new TypeError(`${type}.${property} must be a finite number.`);
  }
  if (NON_NEGATIVE_PROPERTIES.has(property) && value < 0) {
    throw new RangeError(`${type}.${property} must not be negative.`);
  }
  if (type === "text" && property === "fontSize" && value === 0) {
    throw new RangeError("text.fontSize must be positive.");
  }
  if (property === "opacity" && (value < 0 || value > 1)) {
    throw new RangeError(`${type}.opacity must be between 0 and 1.`);
  }
  if (STRING_PROPERTIES.has(property) && (
    typeof value !== "string" || value.length === 0
  )) {
    throw new TypeError(`${type}.${property} must be a non-empty string.`);
  }
  if (property === "fontWeight" && !(
    (typeof value === "string" && value.length > 0) || Number.isFinite(value)
  )) {
    throw new TypeError("text.fontWeight must be a non-empty string or finite number.");
  }
  if (property === "textAlign" && !TEXT_ALIGNS.has(value)) {
    throw new Error(`Unsupported text.textAlign "${value}".`);
  }
  if (property === "textBaseline" && !TEXT_BASELINES.has(value)) {
    throw new Error(`Unsupported text.textBaseline "${value}".`);
  }
  if (property === "closed" && typeof value !== "boolean") {
    throw new TypeError(`${type}.closed must be a boolean.`);
  }
  if (property === "strokeDash" && (
    !Array.isArray(value) ||
    !value.every(item => Number.isFinite(item) && item >= 0)
  )) {
    throw new TypeError(
      `${type}.strokeDash must be an array of non-negative finite numbers.`
    );
  }
  if (type === "path" && property === "points" && (
    !Array.isArray(value) ||
    value.length < 2 ||
    !value.every(point =>
      isPlainObject(point) &&
      Object.keys(point).length === 2 &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    )
  )) {
    throw new TypeError(
      "path.points must contain at least two finite { x, y } points."
    );
  }
  return value;
}

export function validateConcreteGraphicProperties(type, properties) {
  if (!isPlainObject(properties)) {
    throw new TypeError(`${type}.properties must be a plain object.`);
  }
  for (const [property, value] of Object.entries(properties)) {
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, value);
  }
  return properties;
}
