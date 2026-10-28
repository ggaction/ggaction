import { normalizeMarkOutline } from "../markOutline.js";
import { ownRecord } from "../../core/ownData.js";
import { validateImagePayload } from "../imagePayload.js";
import { validateFontPayload } from "../fontPayload.js";
import { validateGeneratedItemLimit } from "../../core/validation.js";
import { validateFontStyle, textMetricFontWeight } from "../../core/font.js";
import { isOwned, isPlainObject } from "../../core/immutable.js";
import { validatePathCommands, validatePathFillRule } from "../pathCommands.js";
import { validateConcreteFillPaint } from "../paint.js";
import { isBlendMode } from "../compositing.js";
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
const validatedProperties = new WeakMap();

export function validateConcreteGraphicValue(type, property, value) {
  if (property === "outline") {
    if (value === false) throw new TypeError("Concrete outline must be an object.");
    normalizeMarkOutline(value, `${type}.outline`);
  }
  if (property === "fillBounds") {
    ownRecord(value, "Text fillBounds");
    if (!isPlainObject(value) || Object.keys(value).length !== 4 ||
        !["left", "right", "top", "bottom"].every(key => Object.hasOwn(value, key) && Number.isFinite(value[key])) ||
        value.left > value.right || value.top > value.bottom) {
      throw new TypeError("Text fillBounds require finite ordered left/right/top/bottom coordinates.");
    }
  }
  if (property === "font") validateFontPayload(value);
  if (property === "image") validateImagePayload(value);
  if (property === "lines") {
    if (!Array.isArray(value) || value.length === 0 || value.some(line =>
      !isPlainObject(line) || Object.keys(line).some(key => !["text", "x", "y"].includes(key)) ||
      typeof line.text !== "string" || !Number.isFinite(line.x) || !Number.isFinite(line.y))) {
      throw new TypeError("Text lines require non-empty resolved text/x/y records.");
    }
    validateGeneratedItemLimit(value.length, "Text line count");
  }
  if (property === "fillRule") validatePathFillRule(value);
  if (property === "fill") {
    if (typeof value === "string") {
      validateConcreteFillPaint(value, `${type}.fill`);
    } else if (type === "rect" || type === "path" || type === "circle" || type === "text") {
      validateConcreteFillPaint(value, `${type}.fill`);
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
  if (property === "blend" && !isBlendMode(value)) {
    throw new Error(`${type}.blend must be normal, multiply, screen, or difference.`);
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
  const validatedTypes = validatedProperties.get(properties);
  if (validatedTypes?.has(type)) return properties;
  if (!isPlainObject(properties)) {
    throw new TypeError(`${type}.properties must be a plain object.`);
  }
  if (type === "text" && typeof properties.fill === "object" && properties.fillBounds === undefined) {
    throw new TypeError("Structured Text fill requires concrete fillBounds.");
  }
  if (type === "image" && ["image", "x", "y", "width", "height"].some(key => !Object.hasOwn(properties, key))) {
    throw new TypeError("image.properties requires image, x, y, width, and height.");
  }
  for (const [property, value] of Object.entries(properties)) {
    validateGraphicProperty(type, property);
    validateConcreteGraphicValue(type, property, value);
  }
  if (type === "text" && properties.font !== undefined &&
      (properties.font.family !== properties.fontFamily || properties.font.style !== (properties.fontStyle ?? "normal") ||
        properties.font.weight !== textMetricFontWeight(properties.fontWeight))) {
    throw new TypeError("Concrete text font must match its exact family, style and weight.");
  }
  if (isOwned(properties)) {
    if (validatedTypes) validatedTypes.add(type);
    else validatedProperties.set(properties, new Set([type]));
  }
  return properties;
}
