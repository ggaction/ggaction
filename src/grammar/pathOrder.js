import { cloneAndFreeze } from "../core/immutable.js";

export const PATH_ORDER_DIRECTIONS = Object.freeze([
  "ascending",
  "descending"
]);

export function validatePathOrderDirection(value) {
  if (!PATH_ORDER_DIRECTIONS.includes(value)) {
    throw new Error(`Unsupported path order "${value}".`);
  }
  return value;
}

export function stableOrderPathValues(values, orderValues, order = "ascending") {
  validatePathOrderDirection(order);
  if (!Array.isArray(values) || !Array.isArray(orderValues)) {
    throw new TypeError("Path ordering requires value and order arrays.");
  }
  if (values.length !== orderValues.length) {
    throw new Error("Path value and order arrays must have equal length.");
  }
  const direction = order === "ascending" ? 1 : -1;
  const ordered = values.map((value, sourceIndex) => {
    const orderValue = orderValues[sourceIndex];
    if (!Number.isFinite(orderValue)) {
      throw new TypeError("Path order values must be finite numbers.");
    }
    return { value, orderValue, sourceIndex };
  }).sort((left, right) =>
    direction * (left.orderValue - right.orderValue) ||
    left.sourceIndex - right.sourceIndex
  );
  return cloneAndFreeze(ordered.map(item => item.value));
}
