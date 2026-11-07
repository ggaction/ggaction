import { BUILTIN_RESOURCE_KINDS, validateInputReference } from "../../core/resourceReference.js";
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
  if (lineage.kind === "screen") {
    if (Object.keys(lineage).length !== 1) throw new TypeError("Screen lineage has no data or resource reference.");
  } else if (lineage.kind === "resource") {
    if (Object.keys(lineage).length !== 2 || !Object.hasOwn(lineage, "resource")) throw new TypeError("Resource lineage requires its exact resource reference.");
    validateInputReference(lineage.resource);
    if (!BUILTIN_RESOURCE_KINDS.includes(lineage.resource.kind)) throw new TypeError("Resource lineage requires a builtin resource.");
  } else if (Object.keys(lineage).length !== 4 || !["data", "logicalDataId"].every(key => typeof lineage[key] === "string" && lineage[key]) ||
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
  if ((lineage.kind === "screen") !== (key[2] === "item" && key[3][0] === "annotation" && key[3][1] === "screen")) {
    throw new TypeError("Screen lineage requires its exact rowless annotation item key.");
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

// Public inspected keys include ancestor namespaces. A scoped action stores
// only the key relative to its explicitly selected child program.
export function unnamespaceItemKey(key, namespaces) {
  const value = JSON.parse(key);
  if (!Array.isArray(value) || value.length !== 4 || !Array.isArray(value[0]) ||
      value[0].length !== namespaces.length || namespaces.some((part, index) => value[0][index] !== part)) {
    throw new TypeError("Selection logical key does not belong to the explicit child scope.");
  }
  return JSON.stringify([[], ...value.slice(1)]);
}
