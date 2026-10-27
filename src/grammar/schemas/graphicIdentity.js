import { isPlainObject } from "../../core/immutable.js";
import { contentDigest } from "../../core/contentDigest.js";

// Concrete metadata is self-contained: renderers never resolve these references.
export function validateGraphicIdentity(value) {
  if (!isPlainObject(value) || Object.keys(value).length !== 4 ||
      !["key", "topology", "role", "lineage"].every(key => Object.hasOwn(value, key)) ||
      typeof value.key !== "string" || !value.key || typeof value.topology !== "string" ||
      typeof value.role !== "string" || !value.role || !isPlainObject(value.lineage)) {
    throw new TypeError("Graphic identity requires key, topology, role and lineage.");
  }
  const lineage = value.lineage;
  if (Object.keys(lineage).length !== 4 || !["data", "logicalDataId"].every(key => typeof lineage[key] === "string" && lineage[key]) ||
      !Number.isSafeInteger(lineage.revision) || lineage.revision < 0 || !Array.isArray(lineage.rowKeys) ||
      lineage.rowKeys.some(key => typeof key !== "string" || !key) || new Set(lineage.rowKeys).size !== lineage.rowKeys.length) {
    throw new TypeError("Graphic lineage requires an exact dataset revision and unique row keys.");
  }
  const key = JSON.parse(value.key);
  if (!Array.isArray(key) || key.length !== 4 || !Array.isArray(key[0]) || key[0].some(part => typeof part !== "string") ||
      ![key[1], key[2]].every(part => typeof part === "string" && part) ||
      !Array.isArray(key[3]) || key[3].length !== 2 || !key[3].every(part => typeof part === "string" && part)) {
    throw new TypeError("Graphic item key requires child path, owner, role and final grain.");
  }
  return value;
}

export function graphicIdentityId(owner, identity) {
  return `${owner}:${contentDigest(JSON.stringify([identity.key, identity.role]))}`;
}

export function namespaceItemKey(key, namespace) {
  const [path, ...rest] = JSON.parse(key);
  if (!Array.isArray(path)) throw new TypeError("Item identity requires a child path.");
  return JSON.stringify([[namespace, ...path], ...rest]);
}
