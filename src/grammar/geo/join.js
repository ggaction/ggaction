import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { annotateError } from "../../core/diagnostics.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { GEO_LIMITS } from "./input.js";

function keyPath(value, label) {
  const path = typeof value === "string" ? [value] : ownArray(value, label);
  if (!path.length || path.length > GEO_LIMITS.maxDepth || path.some(part => typeof part !== "string" || !part.length)) {
    throw new TypeError(`${label} requires a nonempty own-property path of at most ${GEO_LIMITS.maxDepth} fields.`);
  }
  return [...path];
}

export function normalizeGeoJoinOptions(input) {
  ownRecord(input, "Geographic join options");
  rejectUnknownProperties(input, ["geometryKey", "dataKey"], "geographic join");
  return cloneAndFreeze({ method: "geo-join", geometryKey: keyPath(input.geometryKey, "geometryKey"), dataKey: keyPath(input.dataKey, "dataKey") });
}

function readKey(row, path) {
  let value = row;
  for (const field of path) {
    if (value === null || value === undefined) return undefined;
    ownRecord(value, "Geographic join key parent");
    const entry = Object.getOwnPropertyDescriptor(value, field);
    if (entry === undefined) return undefined;
    value = entry.value;
  }
  // Missing keys never match each other, as with ordinary dataset lookup.
  return value === null || value === undefined ? undefined : encodeRowKey(value, "Geographic join key");
}

// Geometry and table values remain in their source owners. Only the exact
// one-to-one row correspondence and deterministic diagnostics are computed here.
export function joinGeometryRows(features, rows, options) {
  const { geometryKey, dataKey } = normalizeGeoJoinOptions(options);
  if (!Array.isArray(features) || !Array.isArray(rows)) throw new TypeError("Geographic join inputs require arrays.");
  validateGeneratedItemLimit(features.length, "Geographic join feature count", GEO_LIMITS.maxFeatures);
  let work = features.length * (geometryKey.length + 1) + rows.length * (dataKey.length + 1);
  validateWorkLimit(work, "Geographic join work");
  ownArray(features, "Geographic join features"); ownArray(rows, "Geographic join rows");
  function keys(values, path) {
    const seen = new Set(); let duplicates = 0;
    const tokens = values.map(row => {
      ownRecord(row, "Geographic join row");
      const token = readKey(row, path);
      if (token !== undefined) {
        validateWorkLimit(work += token.length, "Geographic join work");
        if (seen.has(token)) duplicates++;
        seen.add(token);
      }
      return token;
    });
    return { tokens, duplicates };
  }
  const left = keys(features, geometryKey), right = keys(rows, dataKey);
  const counts = { geometryCount: features.length, dataCount: rows.length,
    duplicateGeometryCount: left.duplicates, duplicateDataCount: right.duplicates };
  if (left.duplicates || right.duplicates) throw annotateError(new Error("Geographic one-to-one join requires unique nonmissing keys on both inputs."), {
    code: "ambiguous-identity", diagnostics: Object.freeze(counts)
  });
  const index = new Map(right.tokens.flatMap((token, i) => token === undefined ? [] : [[token, i]])), matched = new Set();
  const unmatchedGeometry = [], rowMap = left.tokens.map((token, i) => {
    const match = token === undefined ? undefined : index.get(token);
    if (match === undefined) { unmatchedGeometry.push(i); return null; }
    matched.add(match); return match;
  });
  return cloneAndFreeze({ rowMap, diagnostics: { ...counts, matchedCount: matched.size, unmatchedGeometry,
    unmatchedData: rows.flatMap((_, i) => matched.has(i) ? [] : [i]), coverage: features.length ? matched.size / features.length : 0 } });
}
