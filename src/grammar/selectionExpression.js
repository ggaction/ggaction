import { normalizeSelectionRegion, normalizeScreenPolygon, selectRegionItemKeys } from "./selectionRegion.js";
import { ownArray, ownRecord } from "../core/ownData.js";
import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { normalizeMarkSelector, MARK_SELECTOR_GRAINS, selectMarkItemKeys } from "./markSelection.js";
import { inspectPredicateExpression, normalizePredicateExpression } from "./expressionAst.js";
import { evaluatePredicateExpression } from "./conditionalEncoding.js";
import { inferDatasetSchema } from "./datasetSchema.js";
import { EXPRESSION_LIMITS, limit } from "./expressionValues.js";

// Named selections can retain an AST. Inline selectors keep their existing
// closed grammar until their own authoring owner binds expression inputs.
export function normalizeSelectionSelector(selector) {
  ownRecord(selector, "Selection selector");
  if (Object.hasOwn(selector, "region")) {
    if (Object.keys(selector).some(key => !["region", "grain"].includes(key))) throw new TypeError("Region selection accepts only region and grain.");
    const grain = Object.hasOwn(selector, "grain") && selector.grain !== undefined ? selector.grain : "item";
    if (!MARK_SELECTOR_GRAINS.includes(grain)) throw new Error(`Unknown mark selector grain "${grain}".`);
    return cloneAndFreeze({ grain, region: normalizeSelectionRegion(selector.region) });
  }
  if (Object.hasOwn(selector, "screenPolygon")) {
    if (!Object.hasOwn(selector, "items")) throw new TypeError("Screen polygon metadata requires logical item keys.");
    const { screenPolygon, ...keys } = selector;
    return cloneAndFreeze({ ...normalizeMarkSelector(keys), screenPolygon: normalizeScreenPolygon(screenPolygon) });
  }
  if (!Object.hasOwn(selector, "where")) return normalizeMarkSelector(selector);
  if (Object.keys(selector).some(key => !["where", "grain"].includes(key))) {
    throw new TypeError("Expression selection accepts only where and grain.");
  }
  const grain = Object.hasOwn(selector, "grain") && selector.grain !== undefined ? selector.grain : "item";
  if (!MARK_SELECTOR_GRAINS.includes(grain)) throw new Error(`Unknown mark selector grain "${grain}".`);
  return cloneAndFreeze({ grain, where: inspectPredicateExpression(selector.where).expression });
}

export function validateSelectionExpression(expression, parameters = {}) {
  const inspected = inspectPredicateExpression(expression);
  // Restoration validates every AST branch and exact parameter types without
  // manufacturing mark items or recomputing geometry.
  return normalizePredicateExpression(expression, {
    fields: Object.fromEntries(inspected.fields.map(field => [field, { type: "unknown", optional: true }])),
    parameters
  });
}

export function selectExpressionItemKeys(items, selector, parameters = {}) {
  const normalized = normalizeSelectionSelector(selector);
  if (Object.hasOwn(normalized, "region")) return selectRegionItemKeys(items, normalized.region);
  if (!Object.hasOwn(normalized, "where")) {
    const { screenPolygon: _polygon, ...selector } = normalized;
    return selectMarkItemKeys(items, selector);
  }
  const inspected = inspectPredicateExpression(normalized.where);
  if (Array.isArray(items)) limit(items.length * (inspected.nodes + inspected.fields.length), EXPRESSION_LIMITS.rowWork, "selectionWork");
  ownArray(items, "Selectable expression items");
  const keys = new Set();
  const rows = items.map(item => {
    ownRecord(item, "Selectable expression item");
    if (typeof item.key !== "string" || item.key.length === 0 || keys.has(item.key)) {
      throw new TypeError("Expression selection requires unique non-empty item keys.");
    }
    keys.add(item.key);
    if (!isPlainObject(item.fields)) throw new TypeError("Expression selection requires an item field map.");
    const row = Object.create(null);
    for (const field of inspected.fields) {
      const descriptor = Object.getOwnPropertyDescriptor(item.fields, field);
      if (descriptor === undefined) continue;
      if (!Object.hasOwn(descriptor, "value") || !descriptor.enumerable) {
        throw new TypeError("Selectable expression fields require enumerable own data.");
      }
      row[field] = descriptor.value;
    }
    return row;
  });
  const schema = inferDatasetSchema(rows);
  const fields = Object.fromEntries(schema.fields.map(field => [field.name, {
    type: field.storageType, optional: field.optional
  }]));
  for (const field of inspected.fields) {
    if (Object.hasOwn(fields, field)) continue;
    if (items.length !== 0) throw new Error(`Selection field "${field}" is not uniquely defined at the target ${normalized.grain} grain.`);
    Object.defineProperty(fields, field, { value: { type: "unknown", optional: true }, enumerable: true });
  }
  const evaluated = evaluatePredicateExpression(normalized.where, rows, { fields, parameters });
  return Object.freeze(items.flatMap((item, index) => evaluated.values[index] ? [item.key] : []));
}
