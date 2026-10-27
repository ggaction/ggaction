import { cloneAndFreeze } from "../core/immutable.js";

export const ITEM_MISSING_MARK_TYPES = Object.freeze([
  "point", "bar", "rect", "tick", "rule", "text"
]);

export function validateItemMissing(value, label = "Mark missing") {
  if (!["error", "skip"].includes(value)) {
    throw new Error(`${label} must be "error" or "skip".`);
  }
  return value;
}

function collectFields(value, fields, seen) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  if (typeof value.field === "string" && value.field.length > 0) {
    fields.add(value.field);
  }
  for (const child of Object.values(value)) collectFields(child, fields, seen);
}

export function itemMissingFields(layer) {
  const fields = new Set();
  collectFields(layer.encoding ?? {}, fields, new Set());
  return [...fields];
}

export function applyItemMissingPolicy(layer, dataset) {
  const policy = layer.mark?.missing;
  if (policy === undefined) return dataset;
  if (!ITEM_MISSING_MARK_TYPES.includes(layer.mark?.type)) return dataset;
  validateItemMissing(policy, `${layer.mark.type} missing`);
  const fields = itemMissingFields(layer);
  if (fields.length === 0) return dataset;
  const eligible = [];
  for (const [index, row] of dataset.values.entries()) {
    const missing = fields.find(field => row[field] === null || row[field] === undefined);
    if (missing === undefined) {
      eligible.push(row);
    } else if (policy === "error") {
      throw new Error(
        `${layer.mark.type} mark "${layer.id}" field "${missing}" is missing at row ${index}.`
      );
    }
  }
  if (eligible.length === dataset.values.length) return dataset;
  return cloneAndFreeze({ ...dataset, values: eligible });
}

export function applyRequestedItemMissingPolicy(layer, dataset, field) {
  if (typeof field !== "string" || field.length === 0) {
    return applyItemMissingPolicy(layer, dataset);
  }
  return applyItemMissingPolicy({
    ...layer,
    encoding: { ...layer.encoding, __requested: { field } }
  }, dataset);
}
