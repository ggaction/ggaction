import { ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { formatTextValue } from "./text.js";

export function isScreenAnnotation(layer) {
  return layer?.mark?.type === "text" && layer.annotationAnchor !== undefined;
}

export function normalizeScreenAnnotationAnchor(value) {
  ownRecord(value, "Screen annotation anchor");
  if (Object.keys(value).length !== 3 || !["space", "x", "y"].every(key => Object.hasOwn(value, key)) ||
      value.space !== "screen" || !Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new TypeError("Screen annotation requires space screen and finite x/y logical pixels.");
  }
  return cloneAndFreeze({ space: "screen", x: value.x, y: value.y });
}

export function validateScreenAnnotationLayer(layer) {
  normalizeScreenAnnotationAnchor(layer.annotationAnchor);
  if (layer.mark?.type !== "text" || ["data", "source", "coordinate", "transform", "conditionals"].some(key => Object.hasOwn(layer, key)) ||
      layer.mark.missing !== undefined || Object.keys(layer.encoding ?? {}).some(key => key !== "text")) {
    throw new TypeError("Screen annotation requires rowless Text with no data, coordinate or field encoding.");
  }
  const text = layer.encoding?.text;
  if (text !== undefined && (Object.keys(text).some(key => !["datum", "format"].includes(key)) ||
      !Object.hasOwn(text, "datum") || formatTextValue(text.datum, text.format) === undefined)) {
    throw new TypeError("Screen annotation requires constant nonempty text.");
  }
  return layer;
}

export function screenAnnotationKey(id) {
  return JSON.stringify([[], id, "item", ["annotation", "screen"]]);
}
