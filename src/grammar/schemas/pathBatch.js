import { freezeOwned } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { pathBatchRowCommands } from "../../core/sceneRows.js";
import { MAX_PATH_COMMANDS } from "../pathTopology.js";

export const MAX_PATH_BATCH_ROWS = 10_000;
export const MAX_PATH_BATCH_POINTS = 1_000_000;
const constructedColumns = new WeakSet();

// Only this creator records a column as constructed. The values are already
// computed finite numbers; the creator checks them once and freezes the copy.
export function createPathBatchColumn(values, name) {
  if (!Array.isArray(values) || values.length < 1 || values.length > MAX_PATH_BATCH_POINTS) {
    throw new RangeError(`Path column construction requires 1..${MAX_PATH_BATCH_POINTS} values.`);
  }
  for (const value of values) if (typeof value !== "number") throw new TypeError(`Path column ${name} requires numeric results.`);
  freezeOwned(values);
  constructedColumns.add(values);
  return values;
}

function validateColumn(value, name, maximum) {
  if (!Array.isArray(value) || value.length < 1 || value.length > maximum) {
    throw new RangeError(`path-batch.${name} requires 1..${maximum} entries.`);
  }
  if (!constructedColumns.has(value)) ownArray(value, `path-batch.${name}`);
}

// One stored field on its own; row structure needs the complete properties.
export function validatePathBatchValue(property, value) {
  if (property === "closed") {
    if (typeof value !== "boolean") throw new TypeError("path-batch.closed must be a boolean.");
    return;
  }
  validateColumn(value, property, property === "starts" ? MAX_PATH_BATCH_ROWS : MAX_PATH_BATCH_POINTS);
  if (property !== "starts" && !value.every(Number.isFinite)) throw new TypeError(`path-batch.${property} requires finite numbers.`);
}

export function validatePathBatchProperties(properties, validateAppearance) {
  ownRecord(properties, "path-batch.properties");
  const keys = ["x", "y", "starts", "closed", "appearance"];
  if (Object.keys(properties).length !== keys.length || keys.some(key => !Object.hasOwn(properties, key))) {
    throw new TypeError("path-batch.properties requires exactly x, y, starts, closed and appearance.");
  }
  validateColumn(properties.x, "x", MAX_PATH_BATCH_POINTS);
  validateColumn(properties.y, "y", MAX_PATH_BATCH_POINTS);
  validateColumn(properties.starts, "starts", MAX_PATH_BATCH_ROWS);
  if (properties.x.length !== properties.y.length) throw new RangeError("path-batch x and y require equal point counts.");
  for (const name of ["x", "y"]) for (const number of properties[name]) {
    if (!Number.isFinite(number)) throw new TypeError(`path-batch.${name} requires finite numbers.`);
  }
  if (typeof properties.closed !== "boolean") throw new TypeError("path-batch.closed must be a boolean.");
  const { starts } = properties, points = properties.x.length;
  // Each row is one subpath of at least two points; its command count stays
  // inside the default concrete path capacity, including the closing command.
  for (let row = 0; row < starts.length; row++) {
    const start = starts[row], end = row + 1 < starts.length ? starts[row + 1] : points;
    if (!Number.isSafeInteger(start) || (row === 0 ? start !== 0 : start <= starts[row - 1])) throw new RangeError("path-batch.starts must begin at 0 and increase.");
    if (!Number.isSafeInteger(end) || end - start < 2 || end - start + (properties.closed ? 1 : 0) > MAX_PATH_COMMANDS) {
      throw new RangeError(`path-batch rows require 2..${MAX_PATH_COMMANDS} commands.`);
    }
  }
  validateAppearance(properties.appearance);
  return properties;
}

export const pathBatchRowCount = properties => properties.starts.length;

// Read fully materialized coordinates; never infer semantics or combine painting.
export function pathBatchRow(properties, index) {
  return { ...properties.appearance, commands: pathBatchRowCommands(properties, index) };
}
