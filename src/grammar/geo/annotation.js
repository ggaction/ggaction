import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { validateUserId } from "../../core/identifiers.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { DEFAULT_TEXT_MARK, TEXT_MARK_STYLE_OPTIONS, normalizeTextMarkConfig } from "../text.js";
import { isBlendMode } from "../compositing.js";
import { projectionTuple } from "./projectionOptions.js";

export const GEO_ANNOTATION_STYLE_FIELDS = Object.freeze([
  ...TEXT_MARK_STYLE_OPTIONS.filter(key => key !== "inheritColor"), "clip", "blend"
]);

export function normalizeGeoAnnotationStyle(input = {}, previous) {
  ownRecord(input, "Geographic annotation style");
  rejectUnknownProperties(input, GEO_ANNOTATION_STYLE_FIELDS, "geographic annotation style");
  if (Object.values(input).some(value => value === undefined)) throw new TypeError("Geographic annotation style cannot be undefined.");
  const { clip = previous?.clip ?? false, blend = previous?.blend, ...text } = input;
  if (typeof clip !== "boolean") throw new TypeError("Geographic annotation clip must be boolean.");
  if (blend !== undefined && !isBlendMode(blend)) throw new TypeError("Unsupported geographic annotation blend.");
  return cloneAndFreeze({ ...normalizeTextMarkConfig(text, previous ?? DEFAULT_TEXT_MARK), clip,
    ...(blend === undefined ? {} : { blend }) });
}

export function normalizeGeoAnnotationAnchor(input) {
  ownRecord(input, "Geographic annotation anchor");
  const position = input.type === "position";
  if (!position && input.type !== "feature") throw new TypeError("Geographic annotation anchor type must be position or feature.");
  rejectUnknownProperties(input, position ? ["type", "position"] : ["type", "key", "level"], "geographic annotation anchor");
  if (position) return cloneAndFreeze({ type: "position", position: projectionTuple(input.position, [2], "Annotation position") });
  validateWorkLimit(encodeRowKey(input.key).length, "Annotation feature key work");
  if (Object.hasOwn(input, "level")) validateUserId(input.level, "Annotation level");
  return cloneAndFreeze({ type: "feature", key: input.key, ...(input.level === undefined ? {} : { level: input.level }) });
}

export function validateGeoAnnotationBinding(layer, config) {
  const binding = layer.geoBinding;
  ownRecord(binding, "Geographic annotation binding");
  rejectUnknownProperties(binding, ["mode", "anchor", "geometry", "text"], "geographic annotation binding");
  if (binding.mode !== "annotation" || typeof binding.text !== "string") throw new TypeError("Geographic annotation requires string text.");
  validateWorkLimit(binding.text.length, "Geographic annotation text work");
  const anchor = normalizeGeoAnnotationAnchor(binding.anchor);
  if (anchor.type === "feature") {
    validateInputReference(binding.geometry);
    if (binding.geometry.kind !== "geometry") throw new TypeError("Feature annotations require geometry references.");
  } else if (Object.hasOwn(binding, "geometry")) throw new TypeError("Position annotations cannot bind geometry.");
  ownRecord(config, "Stored geographic annotation style");
  for (const key of [...Object.keys(DEFAULT_TEXT_MARK), "clip"]) {
    if (!Object.hasOwn(config, key)) throw new TypeError("Geographic annotation requires resolved text style.");
  }
  normalizeGeoAnnotationStyle(config);
  if (layer.data !== undefined || layer.conditionals !== undefined || Object.keys(layer.encoding ?? {}).length) throw new TypeError("Geographic annotations require native anchors and style.");
}
