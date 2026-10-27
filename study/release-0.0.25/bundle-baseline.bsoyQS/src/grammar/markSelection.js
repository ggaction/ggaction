import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { ENCODING_CHANNELS } from "../core/vocabulary.js";

export const MARK_SELECTOR_OPERATORS = Object.freeze([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "oneOf",
  "range",
  "min",
  "max"
]);

export const MARK_SELECTOR_GRAINS = Object.freeze(["item", "stack"]);

export const MARK_GRAPHIC_PROPERTIES = Object.freeze([
  "x",
  "y",
  "width",
  "height",
  "radius",
  "x1",
  "y1",
  "x2",
  "y2",
  "fill",
  "stroke",
  "strokeWidth",
  "opacity"
]);

const COMPARISON_OPERATORS = new Set([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte"
]);
const ORDERED_COMPARISON_OPERATORS = new Set(["gt", "gte", "lt", "lte"]);
const RANK_OPERATORS = new Set(["min", "max"]);
const SELECTOR_KEYS = Object.freeze([
  "grain",
  "field",
  "channel",
  "property",
  "op",
  "value",
  "values",
  "min",
  "max",
  "inclusive",
  "count",
  "groupBy",
  "ties"
]);

function validateField(value, label = "Selector field") {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function isOrderedValue(value) {
  return Number.isFinite(value) || typeof value === "string";
}

function validateOrderedValue(value, label) {
  if (!isOrderedValue(value)) {
    throw new TypeError(`${label} must be a finite number or string.`);
  }
  return value;
}

function normalizeGroupBy(value) {
  if (value === undefined) return undefined;
  const fields = Array.isArray(value) ? value : [value];
  if (fields.length === 0) {
    throw new TypeError("Selector groupBy must contain at least one field.");
  }
  const normalized = fields.map(field => validateField(field, "Selector groupBy field"));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("Selector groupBy fields must be unique.");
  }
  return normalized;
}

export function normalizeMarkSelector(selector) {
  if (!isPlainObject(selector)) {
    throw new TypeError("Mark selector must be a plain object.");
  }
  const unknown = Object.keys(selector).find(key => !SELECTOR_KEYS.includes(key));
  if (unknown !== undefined) {
    throw new Error(`Unknown mark selector option "${unknown}".`);
  }

  const sources = ["field", "channel", "property"].filter(key =>
    Object.hasOwn(selector, key)
  );
  if (sources.length !== 1) {
    throw new Error(
      "Mark selector requires exactly one of field, channel, or property."
    );
  }
  const source = sources[0];
  const sourceValue = source === "field"
    ? validateField(selector.field)
    : selector[source];
  if (source === "channel" && !ENCODING_CHANNELS.includes(sourceValue)) {
    throw new Error(`Unknown selector channel "${sourceValue}".`);
  }
  if (source === "property" && !MARK_GRAPHIC_PROPERTIES.includes(sourceValue)) {
    throw new Error(`Unknown selector graphic property "${sourceValue}".`);
  }
  const grain = selector.grain ?? "item";
  if (!MARK_SELECTOR_GRAINS.includes(grain)) {
    throw new Error(`Unknown mark selector grain "${grain}".`);
  }

  if (!MARK_SELECTOR_OPERATORS.includes(selector.op)) {
    throw new Error(`Unknown mark selector operator "${selector.op}".`);
  }
  const op = selector.op;
  const allowedByOperation = RANK_OPERATORS.has(op)
    ? new Set(["grain", source, "op", "count", "groupBy", "ties"])
    : op === "range"
      ? new Set(["grain", source, "op", "min", "max", "inclusive"])
      : op === "oneOf"
        ? new Set(["grain", source, "op", "values"])
        : new Set(["grain", source, "op", "value"]);
  const incompatible = Object.keys(selector).find(key => !allowedByOperation.has(key));
  if (incompatible !== undefined) {
    throw new Error(
      `Mark selector operator "${op}" does not accept "${incompatible}".`
    );
  }

  if (COMPARISON_OPERATORS.has(op)) {
    if (!Object.hasOwn(selector, "value")) {
      throw new TypeError(`Mark selector operator "${op}" requires value.`);
    }
    if (ORDERED_COMPARISON_OPERATORS.has(op)) {
      validateOrderedValue(selector.value, "Ordered selector value");
    }
    return cloneAndFreeze({ grain, [source]: sourceValue, op, value: selector.value });
  }

  if (op === "oneOf") {
    if (!Array.isArray(selector.values)) {
      throw new TypeError("Mark selector oneOf values must be an array.");
    }
    return cloneAndFreeze({ grain, [source]: sourceValue, op, values: selector.values });
  }

  if (op === "range") {
    const min = validateOrderedValue(selector.min, "Selector range min");
    const max = validateOrderedValue(selector.max, "Selector range max");
    if (typeof min !== typeof max) {
      throw new TypeError("Selector range endpoints must have one type.");
    }
    if (min > max) {
      throw new RangeError("Selector range min must not exceed max.");
    }
    if (selector.inclusive !== undefined && typeof selector.inclusive !== "boolean") {
      throw new TypeError("Selector range inclusive must be a boolean.");
    }
    return cloneAndFreeze({
      grain,
      [source]: sourceValue,
      op,
      min,
      max,
      inclusive: selector.inclusive ?? true
    });
  }

  const count = selector.count ?? 1;
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Selector count must be a positive integer.");
  }
  const ties = selector.ties ?? "first";
  if (!["first", "all"].includes(ties)) {
    throw new Error(`Unknown selector ties policy "${ties}".`);
  }
  const groupBy = normalizeGroupBy(selector.groupBy);
  return cloneAndFreeze({
    grain,
    [source]: sourceValue,
    op,
    count,
    ...(groupBy === undefined ? {} : { groupBy }),
    ties
  });
}

function validateItems(items) {
  if (!Array.isArray(items)) {
    throw new TypeError("Selectable mark items must be an array.");
  }
  const keys = new Set();
  for (const [index, item] of items.entries()) {
    if (!isPlainObject(item)) {
      throw new TypeError(`Selectable mark item ${index} must be a plain object.`);
    }
    if (typeof item.key !== "string" || item.key.length === 0) {
      throw new TypeError(`Selectable mark item ${index} requires a non-empty key.`);
    }
    if (keys.has(item.key)) {
      throw new Error(`Duplicate selectable mark item key "${item.key}".`);
    }
    keys.add(item.key);
    if (
      !isPlainObject(item.fields) ||
      !isPlainObject(item.channels) ||
      !isPlainObject(item.properties)
    ) {
      throw new TypeError(
        `Selectable mark item "${item.key}" requires field, channel, and property value maps.`
      );
    }
  }
}

function selectorValue(item, selector) {
  if (selector.field !== undefined) return item.fields[selector.field];
  if (selector.channel !== undefined) return item.channels[selector.channel];
  return item.properties[selector.property];
}

function hasSelectorValue(item, selector) {
  const values = selector.field !== undefined
    ? item.fields
    : selector.channel !== undefined
      ? item.channels
      : item.properties;
  const key = selector.field ?? selector.channel ?? selector.property;
  return Object.hasOwn(values, key) && values[key] !== undefined;
}

function comparable(value, operand) {
  return (
    Number.isFinite(value) && Number.isFinite(operand)
  ) || (
    typeof value === "string" && typeof operand === "string"
  );
}

function matches(value, selector) {
  if (selector.op === "eq") return value === selector.value;
  if (selector.op === "neq") return value !== selector.value;
  if (selector.op === "oneOf") return selector.values.includes(value);
  if (selector.op === "range") {
    if (!comparable(value, selector.min) || !comparable(value, selector.max)) {
      return false;
    }
    return selector.inclusive
      ? value >= selector.min && value <= selector.max
      : value > selector.min && value < selector.max;
  }
  if (!comparable(value, selector.value)) return false;
  if (selector.op === "gt") return value > selector.value;
  if (selector.op === "gte") return value >= selector.value;
  if (selector.op === "lt") return value < selector.value;
  return value <= selector.value;
}

function groupKey(item, fields) {
  return JSON.stringify(fields.map(field => item.fields[field]));
}

function rankGroup(items, selector) {
  const eligible = items
    .map((item, order) => ({ item, order, value: selectorValue(item, selector) }))
    .filter(({ value }) => isOrderedValue(value));
  if (eligible.length === 0) return [];

  const valueType = typeof eligible[0].value;
  const comparableItems = eligible.filter(({ value }) => typeof value === valueType);
  const direction = selector.op === "min" ? 1 : -1;
  comparableItems.sort((left, right) => {
    if (left.value < right.value) return -1 * direction;
    if (left.value > right.value) return 1 * direction;
    return left.order - right.order;
  });
  if (selector.ties === "first" || comparableItems.length <= selector.count) {
    return comparableItems.slice(0, selector.count);
  }
  const boundary = comparableItems[selector.count - 1].value;
  return comparableItems.filter(({ value }, index) =>
    index < selector.count || value === boundary
  );
}

export function selectMarkItemKeys(items, selector) {
  validateItems(items);
  const normalized = normalizeMarkSelector(selector);
  if (!RANK_OPERATORS.has(normalized.op)) {
    return cloneAndFreeze(
      items
        .filter(item =>
          hasSelectorValue(item, normalized) &&
          matches(selectorValue(item, normalized), normalized)
        )
        .map(item => item.key)
    );
  }

  const groups = new Map();
  for (const item of items) {
    const key = normalized.groupBy === undefined
      ? "all"
      : groupKey(item, normalized.groupBy);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return cloneAndFreeze(
    [...groups.values()].flatMap(group =>
      rankGroup(group, normalized).map(({ item }) => item.key)
    )
  );
}
