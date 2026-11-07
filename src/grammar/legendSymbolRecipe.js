import { normalizeMarkShadow } from "./markShadow.js";
import { normalizeMarkOutline } from "./markOutline.js";
import { validateLegendLayerOpacity } from "./legendOpacity.js";
import { isPlainObject } from "../core/immutable.js";
import { validateNonEmptyString as nonEmptyString, validateNonNegativeFinite as nonNegative,
  validatePositiveFinite as positive, validateKeys } from "../core/validation.js";
import { requestedRectStyleDetails, RECT_STYLE_PROPERTIES } from "./roundedRect.js";
import { requestedStrokeDetails, STROKE_STYLE_PROPERTIES } from "./strokeStyle.js";

const LAYER_OPTIONS = Object.freeze({
  line: Object.freeze(["type", "length", "lineWidth", "opacity"]),
  point: Object.freeze([
    "type",
    "shape",
    "size",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity"
  ]),
  swatch: Object.freeze([
    "type",
    "width",
    "height",
    "stroke",
    "strokeWidth",
    "opacity"
  ])
});
const INTERNAL_LAYER_OPTIONS = Object.freeze({
  line: Object.freeze([...LAYER_OPTIONS.line, "stroke", "shadow", ...STROKE_STYLE_PROPERTIES]),
  point: Object.freeze([...LAYER_OPTIONS.point, "outline", "shadow", ...STROKE_STYLE_PROPERTIES]),
  swatch: Object.freeze([...LAYER_OPTIONS.swatch, "fill", "outline", "shadow", ...RECT_STYLE_PROPERTIES])
});

function defaultRecipe(kind) {
  return kind === "series"
    ? { layers: [{ type: "line", length: 32, lineWidth: 2 }] }
    : {
        layers: [{
          type: "swatch",
          width: 14,
          height: 12,
          stroke: "white",
          strokeWidth: 0.5
        }]
      };
}

function normalizeLayer(layer, internal) {
  if (internal && layer?.shadow !== undefined) normalizeMarkShadow(layer.shadow, "Legend shadow");
  if (internal && layer?.outline !== undefined) normalizeMarkOutline(layer.outline, "Legend outline");
  validateLegendLayerOpacity(layer?.opacity);
  if (!isPlainObject(layer) || !Object.hasOwn(LAYER_OPTIONS, layer.type)) {
    throw new Error("Legend symbol layer type must be line, point, or swatch.");
  }
  validateKeys(
    layer,
    internal ? INTERNAL_LAYER_OPTIONS[layer.type] : LAYER_OPTIONS[layer.type],
    `createLegend.symbol.${layer.type}`
  );
  if (layer.type === "line") {
    const normalized = { length: 32, lineWidth: 2, ...layer };
    positive(normalized.length, "Legend line symbol length");
    nonNegative(normalized.lineWidth, "Legend line symbol lineWidth");
    if (normalized.stroke !== undefined) nonEmptyString(normalized.stroke, "Legend line symbol stroke");
    return { ...normalized, ...requestedStrokeDetails(normalized, "Legend line symbol") };
  }
  if (layer.type === "point") {
    const normalized = {
      shape: "circle",
      size: 5,
      stroke: "white",
      strokeWidth: 0,
      ...layer
    };
    if (normalized.shape !== "circle") {
      throw new Error(`Unsupported legend point shape "${normalized.shape}".`);
    }
    positive(normalized.size, "Legend point symbol size");
    nonEmptyString(normalized.stroke, "Legend point symbol stroke");
    nonNegative(normalized.strokeWidth, "Legend point symbol strokeWidth");
    if (normalized.fill !== undefined) {
      nonEmptyString(normalized.fill, "Legend point symbol fill");
    }
    return { ...normalized, ...requestedStrokeDetails(normalized, "Legend point symbol") };
  }
  const normalized = {
    width: 14,
    height: 12,
    stroke: "white",
    strokeWidth: 0.5,
    ...layer
  };
  positive(normalized.width, "Legend swatch width");
  positive(normalized.height, "Legend swatch height");
  nonEmptyString(normalized.stroke, "Legend swatch stroke");
  nonNegative(normalized.strokeWidth, "Legend swatch strokeWidth");
  if (normalized.fill !== undefined) nonEmptyString(normalized.fill, "Legend swatch fill");
  return { ...normalized, ...requestedRectStyleDetails(normalized, "Legend swatch symbol") };
}

export function normalizeRecipe(symbol, kind, { internal = false } = {}) {
  if (symbol === undefined || symbol === "auto") return defaultRecipe(kind);
  if (!isPlainObject(symbol)) {
    throw new TypeError('createLegend.symbol must be "auto" or a plain object.');
  }

  let layers;
  if (Object.hasOwn(symbol, "layers")) {
    validateKeys(symbol, ["layers"], "createLegend.symbol");
    if (!Array.isArray(symbol.layers) || symbol.layers.length === 0) {
      throw new TypeError("Legend symbol layers must be a non-empty array.");
    }
    if (symbol.layers.length > 3) {
      throw new Error(
        "Legend symbol recipe supports at most one layer per type."
      );
    }
    layers = symbol.layers.map(layer => normalizeLayer(layer, internal));
  } else if (kind === "series") {
    validateKeys(symbol, ["length", "lineWidth"], "createLegend.symbol");
    layers = [normalizeLayer({ type: "line", ...symbol }, internal)];
  } else {
    validateKeys(
      symbol,
      ["width", "height", "stroke", "strokeWidth"],
      "createLegend.symbol"
    );
    layers = [normalizeLayer({ type: "swatch", ...symbol }, internal)];
  }

  const types = layers.map(layer => layer.type);
  if (new Set(types).size !== types.length) {
    throw new Error("Legend symbol recipe supports at most one layer per type.");
  }
  return { layers };
}
