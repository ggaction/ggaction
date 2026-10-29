import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { canonicalJSON, contentDigest } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../core/validation.js";
import { createGeometryBudget, snapshotGeometryJSON } from "./input.js";
import { normalizeGeometry, validateGeometryBBox } from "./geometry.js";
import { decodeTopology } from "./topology.js";

export function normalizeGeometryData(values, options) {
  ownRecord(options, "Geometry normalization options");
  rejectUnknownProperties(options, ["format", "coordinateKind", "topoObject", "limits"], "geometry normalization");
  if (!["geojson", "topojson"].includes(options.format)) throw new TypeError("Geometry format must be geojson or topojson.");
  if (!["geographic", "planar"].includes(options.coordinateKind)) throw new TypeError("Geometry coordinateKind must be geographic or planar.");
  if (options.format !== "topojson" && Object.hasOwn(options, "topoObject")) throw new TypeError("topoObject requires topojson format.");
  const budget = createGeometryBudget(options.limits), source = snapshotGeometryJSON(values, budget);
  let entries, topology;
  if (options.format === "topojson") {
    ({ features: entries, topology } = decodeTopology(source, options.coordinateKind, budget, options.topoObject));
  } else {
    const feature = (value, sourcePath) => {
      ownRecord(value, "GeoJSON feature"); validateGeometryBBox(value);
      if (value.type !== "Feature" || !Object.hasOwn(value, "properties") || !Object.hasOwn(value, "geometry")) throw new TypeError("GeoJSON features require type, properties and geometry.");
      return { source: value, geometry: value.geometry, sourcePath };
    };
    if (source?.type === "FeatureCollection") {
      validateGeometryBBox(source); ownArray(source.features, "GeoJSON features");
      validateGeneratedItemLimit(source.features.length, "Geometry features", budget.limits.maxFeatures);
      entries = source.features.map((value, i) => feature(value, ["features", i]));
    } else if (source?.type === "Feature") entries = [feature(source, [])];
    else entries = [{ source: {}, geometry: source, sourcePath: [] }];
  }
  budget.count("features", entries.length);
  const ids = new Set();
  const features = entries.map(entry => {
    const input = entry.source, properties = Object.hasOwn(input, "properties") ? input.properties : null;
    if (properties !== null) ownRecord(properties, "Geometry feature properties");
    let id;
    if (Object.hasOwn(input, "id")) {
      id = input.id;
      if (typeof id !== "string" && !(typeof id === "number" && Number.isFinite(id))) throw new TypeError("Geometry feature IDs require strings or finite numbers.");
      const key = encodeRowKey(id);
      if (ids.has(key)) throw new Error("Duplicate geometry feature ID.");
      ids.add(key);
    }
    const normalized = normalizeGeometry(entry.geometry, options.coordinateKind, budget);
    return { ...(id === undefined ? {} : { id }), properties, sourcePath: entry.sourcePath, ...normalized };
  });
  const contentHash = contentDigest(canonicalJSON(encodeValue(source)));
  return cloneAndFreeze({ format: options.format, coordinateKind: options.coordinateKind, features,
    ...(topology === undefined ? {} : { topology }), source: { kind: "values", hashKind: "encoded-values", contentHash, values: source }, diagnostics: budget.diagnostics() });
}
