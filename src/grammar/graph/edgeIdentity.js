import { ownRecord } from "../../core/ownData.js";
import { validateUserId } from "../../core/identifiers.js";
import { encodeRowKey, compareRowKeys } from "../../core/itemIdentity.js";
import { rejectUnknownProperties } from "../../core/validation.js";

export function inferredGraphEdgeIdentity(options) {
  ownRecord(options, "Inferred graph edge identity");
  rejectUnknownProperties(options, ["ruleId", "sourceKey", "targetKey", "directed"], "inferred edge identity");
  options = Object.assign(Object.create(null), options);
  const ruleId = validateUserId(options.ruleId, "Graph ruleId");
  if (typeof options.directed !== "boolean") throw new TypeError("Inferred edge directed must be boolean.");
  const order = compareRowKeys(options.sourceKey, options.targetKey);
  if (order === 0) throw new Error("Inferred graphs cannot contain self edges.");
  let sourceKey = encodeRowKey(options.sourceKey), targetKey = encodeRowKey(options.targetKey);
  if (!options.directed && order > 0) [sourceKey, targetKey] = [targetKey, sourceKey];
  const key = encodeRowKey([ruleId, options.directed ? "directed" : "undirected", sourceKey, targetKey]);
  return Object.freeze({ key, sourceKey, targetKey, directed: options.directed });
}
