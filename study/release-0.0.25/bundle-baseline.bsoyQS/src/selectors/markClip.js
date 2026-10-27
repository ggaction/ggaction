import { requireCoordinate } from "./coordinates.js";
import { findLayer } from "./layers.js";

export function requestedMarkClip(options) {
  if (!Object.hasOwn(options, "clip")) return {};
  if (typeof options.clip !== "boolean") throw new TypeError("Mark clip must be a boolean.");
  return {clip: options.clip};
}

export function markClipPositionOwner(program, layer) {
  return layer?.mark?.type === "text" && layer.source !== undefined
    ? findLayer(program, layer.source) : layer;
}

export function validateMarkClipCoordinate(program, layer, clip, requestedType) {
  if (clip !== undefined && !["point", "line", "area", "bar", "rect", "rule", "text", "tick"].includes(layer?.mark?.type)) {
    throw new Error("Mark clip requires a supported Cartesian mark family.");
  }
  if (clip !== true) return;
  layer = markClipPositionOwner(program, layer);
  const type = requestedType ?? (layer?.coordinate === undefined ? undefined : requireCoordinate(program, layer.coordinate).type);
  if (type !== undefined && type !== "cartesian") {
    throw new Error("Mark clip requires a Cartesian coordinate.");
  }
  if (["theta", "radius", "parallel"].some(channel => layer?.encoding?.[channel] !== undefined)) {
    throw new Error("Mark clip requires Cartesian position encodings.");
  }
}
