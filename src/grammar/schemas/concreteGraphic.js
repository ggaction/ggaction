import { validateGeneratedItemLimit } from "../../core/validation.js";
import { validateFontStyle } from "../../core/font.js";
import { isPlainObject } from "../../core/immutable.js";
import { validatePathCommands } from "../pathCommands.js";
import { validateFillPaint } from "../paint.js";
import {
  validateLineCap,
  validateLineJoin,
  validateMiterLimit
} from "../strokeStyle.js";
import { validateGraphicProperty } from "./graphic.js";

const FINITE_PROPERTIES = new Set([
  "x", "y", "x1", "y1", "x2", "y2", "width", "height", "radius",
  "strokeWidth", "fontSize", "rotation", "opacity", "gap"
]);
const NON_NEGATIVE_PROPERTIES = new Set([
  "width", "height", "radius", "strokeWidth", "fontSize", "gap"
]);
const STRING_PROPERTIES = new Set([
  "background", "stroke", "fontFamily", "text", "textAlign",
  "textBaseline"
]);
const TEXT_ALIGNS = new Set(["left", "right", "center", "start", "end"]);
const TEXT_BASELINES = new Set([
  "top", "hanging", "middle", "alphabetic", "ideographic", "bottom"
]);

export function validateConcreteGraphicValue(type, property, value) {
  if (property === "lines") {
    if (!Array.isArray(value) || value.length === 0 || value.some(line =>
      !isPlainObject(line) || Object.keys(line).some(key => !["text", "x", "y"].includes(key)) ||
      typeof line.text !== "string" || !Number.isFinite(line.x) || !Number.isFinite(line.y))) {
      throw new TypeError("Text lines require non-empty resolved text/x/y records.");
    }
    validateGeneratedItemLimit(value.length, "Text line count");
  }
  if (property === "fill") {
    if (typeof value === "string") {
      validateFillPaint(value, `${type}.fill`);
    } else if (type === "rect" || type === "path") {
      validateFillPaint(value, `${type}.fill`);
    } else {
      throw new TypeError(`${type}.fill must be a non-empty string.`);
    }
  }
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
    typeof value !== "string" || property !== "text" && value.length === 0
  )) {
    throw new TypeError(
      property === "text"
        ? `${type}.${property} must be a string.`
        : `${type}.${property} must be a non-empty string.`
    );
  }
  if (property === "fontWeight" && !(
    (typeof value === "string" && value.length > 0) || Number.isFinite(value)
  )) {
    throw new TypeError("text.fontWeight must be a non-empty string or finite number.");
  }
  if (property === "fontStyle") validateFontStyle(value);
  if (property === "textAlign" && !TEXT_ALIGNS.has(value)) {
    throw new Error(`Unsupported text.textAlign "${value}".`);
  }
  if (property === "textBaseline" && !TEXT_BASELINES.has(value)) {
    throw new Error(`Unsupported text.textBaseline "${value}".`);
  }
  if (property === "strokeDash" && (
    !Array.isArray(value) ||
    !value.every(item => Number.isFinite(item) && item >= 0)
  )) {
    throw new TypeError(
      `${type}.strokeDash must be an array of non-negative finite numbers.`
    );
  }
  if (property === "lineCap") validateLineCap(value, `${type} graphic`);
  if (property === "lineJoin") validateLineJoin(value, `${type} graphic`);
  if (property === "miterLimit") validateMiterLimit(value, `${type} graphic`);
  if (type === "path" && property === "commands") {
    validatePathCommands(value);
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
