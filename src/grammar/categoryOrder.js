import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { isNominalValue, readNominalField } from "./scales/fields.js";
import { aggregateScalarValues } from "./aggregate.js";

const DIRECTIONS = ["ascending", "descending"];
const AGGREGATES = ["sum", "mean", "min", "max"];

function nonEmptyField(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

const sameValue = Object.is;

export function normalizeCategoryOrder({ values, by, direction } = {}) {
  const hasValues = values !== undefined;
  const hasBy = by !== undefined;
  if (hasValues === hasBy) {
    throw new Error("Category order requires exactly one of values or by.");
  }
  if (hasValues) {
    if (direction !== undefined) {
      throw new Error("Explicit category order does not support direction.");
    }
    if (!Array.isArray(values) || values.length === 0) {
      throw new TypeError("Category order values must be a non-empty array.");
    }
    if (!values.every(isNominalValue)) {
      throw new TypeError("Category order values must contain nominal values.");
    }
    if (values.some((value, index) =>
      values.slice(0, index).some(previous => sameValue(previous, value)))) {
      throw new Error("Category order values must be unique.");
    }
    return cloneAndFreeze({ values });
  }
  if (!DIRECTIONS.includes(direction ?? "ascending")) {
    throw new Error(`Unsupported category order direction "${direction}".`);
  }
  let normalizedBy;
  if (["category", "count"].includes(by)) {
    normalizedBy = by;
  } else {
    if (!isPlainObject(by)) {
      throw new TypeError("Category order by must be category, count, or a summary object.");
    }
    const unknown = Object.keys(by).find(key => !["field", "aggregate"].includes(key));
    if (unknown !== undefined) {
      throw new Error(`Unknown category summary property "${unknown}".`);
    }
    const field = nonEmptyField(by.field, "Category summary field");
    if (!AGGREGATES.includes(by.aggregate)) {
      throw new Error(`Unsupported category summary aggregate "${by.aggregate}".`);
    }
    normalizedBy = { field, aggregate: by.aggregate };
  }
  return cloneAndFreeze({ by: normalizedBy, direction: direction ?? "ascending" });
}

function observedCategories(rows, field) {
  return [...new Set(readNominalField(rows, field))];
}

function categoryComparison(left, right) {
  if (typeof left !== typeof right) {
    throw new TypeError("Category value ordering requires one uniform primitive type.");
  }
  if (typeof left === "number") return left - right;
  if (typeof left === "boolean") return Number(left) - Number(right);
  const leftPoints = Array.from(left, character => character.codePointAt(0));
  const rightPoints = Array.from(right, character => character.codePointAt(0));
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }
  return leftPoints.length - rightPoints.length;
}

function summaryValues(rows, categoryField, summary) {
  const groups = new Map();
  for (const [index, row] of rows.entries()) {
    const category = row[categoryField];
    const value = row[summary.field];
    if (!Number.isFinite(value)) {
      throw new TypeError(
        `Category summary field "${summary.field}" must contain a finite number at row ${index}.`
      );
    }
    const values = groups.get(category) ?? [];
    values.push(value);
    groups.set(category, values);
  }
  return new Map([...groups].map(([category, values]) => [
    category,
    aggregateScalarValues(values, summary.aggregate)
  ]));
}

export function resolveCategoryOrder(rows, categoryField, order) {
  const categories = observedCategories(rows, categoryField);
  if (Object.hasOwn(order, "values")) {
    for (const value of order.values) {
      if (!categories.some(category => sameValue(category, value))) {
        throw new Error(`Unknown category order value "${value}".`);
      }
    }
    return cloneAndFreeze([
      ...order.values,
      ...categories.filter(category =>
        !order.values.some(value => sameValue(value, category)))
    ]);
  }
  const first = new Map(categories.map((value, index) => [value, index]));
  const metrics = order.by === "count"
    ? new Map(categories.map(category => [
        category,
        rows.filter(row => sameValue(row[categoryField], category)).length
      ]))
    : isPlainObject(order.by)
      ? summaryValues(rows, categoryField, order.by)
      : undefined;
  const direction = order.direction === "descending" ? -1 : 1;
  return cloneAndFreeze([...categories].sort((left, right) => {
    const comparison = order.by === "category"
      ? categoryComparison(left, right)
      : metrics.get(left) - metrics.get(right);
    return direction * comparison || first.get(left) - first.get(right);
  }));
}
