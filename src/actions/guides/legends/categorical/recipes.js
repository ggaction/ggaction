import { isPlainObject } from "../../../../core/immutable.js";
import {
  nonEmptyString,
  nonNegative,
  positive,
  validateKeys
} from "./validation.js";

const LAYER_OPTIONS = Object.freeze({
  line: Object.freeze(["type", "length", "lineWidth"]),
  point: Object.freeze([
    "type",
    "shape",
    "size",
    "fill",
    "stroke",
    "strokeWidth"
  ]),
  swatch: Object.freeze([
    "type",
    "width",
    "height",
    "stroke",
    "strokeWidth"
  ])
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

function normalizeLayer(layer) {
  if (!isPlainObject(layer) || !Object.hasOwn(LAYER_OPTIONS, layer.type)) {
    throw new Error("Legend symbol layer type must be line, point, or swatch.");
  }
  validateKeys(
    layer,
    LAYER_OPTIONS[layer.type],
    `createLegend.symbol.${layer.type}`
  );
  if (layer.type === "line") {
    const normalized = { length: 32, lineWidth: 2, ...layer };
    positive(normalized.length, "Legend line symbol length");
    nonNegative(normalized.lineWidth, "Legend line symbol lineWidth");
    return normalized;
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
    return normalized;
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
  return normalized;
}

export function normalizeRecipe(symbol, kind) {
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
    layers = symbol.layers.map(normalizeLayer);
  } else if (kind === "series") {
    validateKeys(symbol, ["length", "lineWidth"], "createLegend.symbol");
    layers = [normalizeLayer({ type: "line", ...symbol })];
  } else {
    validateKeys(
      symbol,
      ["width", "height", "stroke", "strokeWidth"],
      "createLegend.symbol"
    );
    layers = [normalizeLayer({ type: "swatch", ...symbol })];
  }

  const types = layers.map(layer => layer.type);
  if (new Set(types).size !== types.length) {
    throw new Error("Legend symbol recipe supports at most one layer per type.");
  }
  return { layers };
}
