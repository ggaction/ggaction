import { renderToSVG } from "../../src/renderers/svg.js";
import assert from "node:assert/strict";

const datasetIdentity = new Set(["logicalId", "revision", "allocationId", "rowKeys", "nextGeneratedKey", "lineage"]);

// Independently authored programs have distinct allocation namespaces. Compare
// their chart meaning and exact concrete draw state here; identity lifecycle has
// separate assertions that deliberately retain all of these fields.
export function withoutAllocatedIdentity(value, index) {
  if (Array.isArray(value)) return value.map(withoutAllocatedIdentity);
  if (value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  const dataset = typeof value.id === "string" && (Object.hasOwn(value, "values") || Object.hasOwn(value, "transform"));
  const item = typeof value.id === "string" && value.properties !== undefined;
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => {
    if (dataset && (datasetIdentity.has(key) || key === "keySpec" && child.mode === "generated") || item && key === "identity") return [];
    if (item && key === "id" && Number.isInteger(index)) return [[key, child.replace(/:[a-f0-9]{64}$/, `:${index}`)]];
    return [[key, withoutAllocatedIdentity(child)]];
  }));
}

export function assertEquivalentMeaning(actual, expected, message) {
  assert.deepEqual(withoutAllocatedIdentity(actual), withoutAllocatedIdentity(expected), message);
}

export function selectedItemPositions(resolved) {
  return resolved.keys.map(key => resolved.items.findIndex(item => item.key === key));
}

export function comparableSVG(program) {
  return renderToSVG({ graphicSpec: withoutAllocatedIdentity(program.graphicSpec) });
}
