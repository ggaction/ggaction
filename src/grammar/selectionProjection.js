import { ownArray, ownRecord } from "../core/ownData.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { validateWorkLimit } from "../core/validation.js";

export function selectionProjectionBudget() {
  let work = 0;
  return amount => validateWorkLimit(work += amount, "Linked selection projection work");
}

export function normalizeSelectionProjection(value) {
  ownRecord(value, "Selection projection");
  const request = Object.assign(Object.create(null), value);
  const fields = request.type === "fields";
  const required = fields ? ["type", "sourceFields", "targetFields"] : ["type", "sourceData", "targetData"];
  if (!["fields", "rows"].includes(request.type) || Object.keys(request).length !== 3 || required.some(key => !Object.hasOwn(request, key))) {
    throw new TypeError("Selection projection requires explicit rows or fields options.");
  }
  if (fields) {
    for (const names of [request.sourceFields, request.targetFields]) {
      ownArray(names, "Projection fields");
      if (!names.length || names.length > 64 || new Set(names).size !== names.length || names.some(name => typeof name !== "string" || !name.length || name.length > 1024)) {
        throw new TypeError("Projection requires 1 to 64 distinct bounded field names.");
      }
    }
    if (request.sourceFields.length !== request.targetFields.length) throw new TypeError("Projection field tuples must have equal lengths.");
  } else if ([request.sourceData, request.targetData].some(id => typeof id !== "string" || !id.length || id.length > 1024)) {
    throw new TypeError("Row projection requires explicit bounded source and target dataset IDs.");
  }
  return cloneAndFreeze(request);
}

function tuple(item, fields, spend) {
  if (!Object.hasOwn(item, "fields")) throw new TypeError("Projection items require explicit fields.");
  if (Object.hasOwn(item, "fields") && item.fields !== null && typeof item.fields === "object") spend(Object.keys(item.fields).length);
  ownRecord(item.fields, "Projection item fields");
  spend(fields.length);
  const values = fields.map(field => {
    if (!Object.hasOwn(item.fields, field)) throw new Error(`Projection field "${field}" is not uniquely defined at the final item grain.`);
    const value = item.fields[field];
    if (typeof value === "string") spend(value.length);
    return value;
  });
  const token = encodeRowKey(values, "Projection fields");
  spend(token.length);
  return [token];
}

function rows(item, dataset, spend) {
  if (!Object.hasOwn(item, "rows")) throw new TypeError("Projection items require explicit row lineage.");
  ownArray(item.rows, "Projection item lineage");
  spend(item.rows.length);
  const keys = [];
  for (const ref of item.rows) {
    ownRecord(ref, "Projection row reference");
    if (!Object.hasOwn(ref, "data") || ref.data !== dataset.id) continue;
    if (!Object.hasOwn(ref, "logicalDataId") || !Object.hasOwn(ref, "rowKey") || ref.logicalDataId !== dataset.logicalId || typeof ref.rowKey !== "string" || !ref.rowKey.length) {
      throw new Error("Projection row reference does not match its original dataset identity.");
    }
    spend(ref.rowKey.length); keys.push(ref.rowKey);
  }
  if (!keys.length) throw new Error("Projection requires original row lineage for every final item.");
  return keys;
}

// Only explicit final-item fields or original lineage can bridge owner identities.
// A source contributes a target-key set before union/intersection is evaluated.
export function projectSelectionKeys({ sourceItems, sourceKeys, targetItems, projection, sourceData, targetData }, spend = selectionProjectionBudget()) {
  const normalized = normalizeSelectionProjection(projection);
  for (const list of [sourceItems, sourceKeys, targetItems]) {
    if (Array.isArray(list)) spend(list.length);
    ownArray(list, "Projection input");
  }
  for (const key of sourceKeys) {
    if (typeof key !== "string" || !key.length) throw new TypeError("Projection selected keys must be nonempty strings.");
    spend(key.length);
  }
  if (normalized.type === "rows") {
    for (const dataset of [sourceData, targetData]) {
      ownRecord(dataset, "Projection dataset");
      if ((Object.hasOwn(dataset, "source") && dataset.source !== undefined) || (Object.hasOwn(dataset, "lineage") && dataset.lineage !== undefined) || !Object.hasOwn(dataset, "logicalId") || typeof dataset.logicalId !== "string") {
        throw new Error("Row projection requires explicit original datasets.");
      }
    }
    if (sourceData.logicalId !== targetData.logicalId) throw new Error("Row projection datasets do not share an original logical identity.");
  }
  const selected = new Set(sourceKeys), tokens = new Set();
  const read = (item, source) => {
    ownRecord(item, "Projection item");
    if (!Object.hasOwn(item, "key") || typeof item.key !== "string" || !item.key.length) throw new TypeError("Projection requires logical item keys.");
    spend(item.key.length);
    return normalized.type === "fields" ? tuple(item, source ? normalized.sourceFields : normalized.targetFields, spend)
      : rows(item, source ? sourceData : targetData, spend);
  };
  for (const item of sourceItems) {
    const values = read(item, true);
    if (selected.has(item.key)) for (const value of values) tokens.add(value);
  }
  return Object.freeze(targetItems.flatMap(item => read(item, false).some(value => tokens.has(value)) ? [item.key] : []));
}
