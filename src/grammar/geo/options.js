import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { createGeometryBudget } from "./input.js";

export function normalizeGeometryOptions(input) {
  ownRecord(input, "Geometry options");
  rejectUnknownProperties(input, ["format", "coordinateKind", "featureKey", "topoObject", "limits"], "geometry");
  if (!["geojson", "topojson"].includes(input.format)) throw new TypeError("Geometry format must be geojson or topojson.");
  if (!["geographic", "planar"].includes(input.coordinateKind)) throw new TypeError("Geometry coordinateKind must be geographic or planar.");
  if (Object.hasOwn(input, "topoObject") && (input.format !== "topojson" || typeof input.topoObject !== "string" || !input.topoObject.length)) throw new TypeError("topoObject requires a nonempty TopoJSON object name.");
  let featureKey;
  if (Object.hasOwn(input, "featureKey")) {
    featureKey = typeof input.featureKey === "string" ? [input.featureKey] : ownArray(input.featureKey, "Geometry featureKey");
    if (!featureKey.length || featureKey.length > 128 || featureKey.some(key => typeof key !== "string" || !key.length)) throw new TypeError("Geometry featureKey requires a nonempty own-property path.");
  }
  return cloneAndFreeze({ method: "geo", format: input.format, coordinateKind: input.coordinateKind,
    ...(featureKey === undefined ? {} : { featureKey }), ...(input.topoObject === undefined ? {} : { topoObject: input.topoObject }),
    limits: createGeometryBudget(input.limits).limits });
}

export function geometryFeatureKeys(features, path) {
  if (path === undefined) return undefined;
  return features.map(feature => {
    let value = feature;
    for (const key of path) {
      if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) throw new TypeError("Geometry featureKey is missing on a feature.");
      value = value[key];
    }
    return value;
  });
}
