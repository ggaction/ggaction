import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { graphKeyField, graphSourceKey } from "./fields.js";

export function validateGraphSubsetTransform(transform) {
  ownRecord(transform, "Graph subset transform");
  rejectUnknownProperties(transform, ["type", "nodeKey", "keys"], "graph subset transform");
  if (transform.type !== "graphSubset") throw new TypeError("Graph subset requires its own transform type.");
  graphKeyField(transform.nodeKey, "Graph subset nodeKey");
  if (Array.isArray(transform.keys)) validateWorkLimit(transform.keys.length * 64, "Graph subset keys");
  ownArray(transform.keys, "Graph subset keys");
  const seen = new Set();
  for (const key of transform.keys) {
    const encoded = encodeRowKey(key);
    if (seen.has(encoded)) throw new TypeError("Graph subset keys must be unique.");
    seen.add(encoded);
  }
}

export function normalizeGraphSubsetTransform(nodeKey, keys) {
  const transform = { type: "graphSubset", nodeKey, keys };
  validateGraphSubsetTransform(transform);
  return cloneAndFreeze(transform);
}

export function graphSubsetIndices(rows, transform) {
  validateGraphSubsetTransform(transform);
  validateWorkLimit(rows.length * (Array.isArray(transform.nodeKey) ? transform.nodeKey.length : 1) + transform.keys.length, "Graph subset source work");
  const keys = new Set(transform.keys.map(key => encodeRowKey(key))), result = [];
  rows.forEach((row, index) => {
    if (keys.has(encodeRowKey(graphSourceKey(row, transform.nodeKey)))) result.push(index);
  });
  return result;
}

export function deriveGraphSubsetRows(rows, transform) {
  return graphSubsetIndices(rows, transform).map(index => rows[index]);
}
