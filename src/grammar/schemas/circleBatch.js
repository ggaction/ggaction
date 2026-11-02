import { ownArray, ownRecord } from "../../core/ownData.js";

export const MAX_CIRCLE_BATCH_ROWS = 10_000;
const keys = new WeakMap();

export function validateCircleBatchColumn(value, name) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CIRCLE_BATCH_ROWS) {
    throw new RangeError(`circle-batch.${name} requires 1..${MAX_CIRCLE_BATCH_ROWS} rows.`);
  }
  ownArray(value, `circle-batch.${name}`);
  for (const number of value) {
    if (!Number.isFinite(number)) throw new TypeError(`circle-batch.${name} requires finite numbers.`);
    if (name === "radius" && number < 0) throw new RangeError("circle-batch.radius must not be negative.");
  }
}

export function validateCircleBatchProperties(properties, validateAppearance) {
  ownRecord(properties, "circle-batch.properties");
  if (Object.keys(properties).length !== 4 || ["x", "y", "radius", "appearance"].some(key => !Object.hasOwn(properties, key))) {
    throw new TypeError("circle-batch.properties requires exactly x, y, radius and appearance.");
  }
  for (const key of ["x", "y", "radius"]) validateCircleBatchColumn(properties[key], key);
  if (properties.x.length !== properties.y.length || properties.x.length !== properties.radius.length) {
    throw new RangeError("circle-batch columns require equal row counts.");
  }
  validateAppearance(properties.appearance);
  return properties;
}

// Read fully materialized coordinates; never infer semantics or combine painting.
export function circleBatchRow(properties, index) {
  return { ...properties.appearance, x: properties.x[index], y: properties.y[index], radius: properties.radius[index] };
}

// Renderer-private preparation identity is disjoint from every authored string ID.
// Keep only tiny row tokens, never an expanded scene or a backend object.
export function circleBatchRowKey(object, index) {
  let rows = keys.get(object);
  if (rows === undefined) { rows = []; keys.set(object, rows); }
  return rows[index] ??= Object.freeze({ rowIndex: index });
}
