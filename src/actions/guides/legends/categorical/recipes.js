import { isPlainObject } from "../../../../core/immutable.js";
import {
  nonEmptyString,
  nonNegative,
  positive,
  validateKeys
} from "./validation.js";
import {
  requestedRectStyleDetails,
  RECT_STYLE_PROPERTIES
} from "../../../../grammar/roundedRect.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "../../../../grammar/strokeStyle.js";
import { findLayerMatching } from "../../../../selectors/layers.js";

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
const INTERNAL_LAYER_OPTIONS = Object.freeze({
  line: Object.freeze([...LAYER_OPTIONS.line, ...STROKE_STYLE_PROPERTIES]),
  point: Object.freeze([...LAYER_OPTIONS.point, ...STROKE_STYLE_PROPERTIES]),
  swatch: Object.freeze([...LAYER_OPTIONS.swatch, ...RECT_STYLE_PROPERTIES])
});

export function resolveLegendSymbol(program, layer, channels, requested, kind) {
  if (requested !== undefined && requested !== "auto") return requested;
  const config = program.markConfigs[layer.id] ?? {};
  const bar = config.barAppearance ?? {};
  const styleOwner = layer.mark.type === "bar" ? bar : config;
  const strokeDetails = requestedStrokeDetails(styleOwner, "Legend source");
  const rectDetails = ["bar", "rect"].includes(layer.mark.type)
    ? requestedRectStyleDetails(styleOwner, "Legend source")
    : strokeDetails;
  if (channels?.length === 1 && channels[0] === "stroke") {
    const strokeWidth = bar.strokeWidth ?? config.strokeWidth ?? ({
      point: 1,
      line: 2,
      area: 1,
      bar: 0.5,
      rect: 1,
      arc: 1,
      rule: 2,
      tick: 2
    }[layer.mark.type] ?? 1);
    if (["line", "rule", "tick"].includes(layer.mark.type)) {
      return { layers: [{
        type: "line",
        length: 32,
        lineWidth: strokeWidth,
        ...strokeDetails
      }] };
    }
    if (layer.mark.type === "point") {
      return { layers: [{
        type: "point",
        size: 5,
        fill: config.fill ?? "#4c78a8",
        stroke: "white",
        strokeWidth,
        ...strokeDetails
      }] };
    }
    return { layers: [{
      type: "swatch",
      width: 14,
      height: 12,
      stroke: "white",
      strokeWidth,
      ...rectDetails
    }] };
  }
  if (layer.mark?.type === "point" && channels?.includes("shape")) {
    const color = channels.includes("color") ? layer.encoding?.color : undefined;
    const matchingLine = color?.scale === undefined
      ? undefined
      : findLayerMatching(program, candidate =>
        candidate.mark?.type === "line" &&
        candidate.encoding?.color?.field === color.field &&
        candidate.encoding?.color?.scale === color.scale
      );
    const lineDetails = matchingLine === undefined
      ? {}
      : requestedStrokeDetails(
          program.markConfigs[matchingLine.id] ?? {},
          "Legend line source"
        );
    return { layers: [
      ...(matchingLine !== undefined ? [{
        type: "line",
        length: 32,
        lineWidth: 3,
        ...lineDetails
      }] : []),
      {
        type: "point",
        size: Math.sqrt(64 / Math.PI),
        stroke: "white",
        strokeWidth: 0,
        ...strokeDetails
      }
    ] };
  }
  if (Object.keys(rectDetails).length === 0) return undefined;
  return kind === "series"
    ? { layers: [{ type: "line", length: 32, lineWidth: 2, ...strokeDetails }] }
    : { layers: [{
        type: "swatch",
        width: 14,
        height: 12,
        stroke: "white",
        strokeWidth: 0.5,
        ...rectDetails
      }] };
}

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
