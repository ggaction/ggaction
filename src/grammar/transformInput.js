import { ownArray, ownRecord } from "../core/ownData.js";
import { isPlainObject } from "../core/immutable.js";

export function validateDatasetTransformInput(value) {
  const invalid = () => new TypeError("Dataset transform must contain exactly one plain object.");
  if (!Array.isArray(value) || value.length !== 1 || !Object.hasOwn(value, "0")) throw invalid();
  ownArray(value, "Dataset transform");
  if (!isPlainObject(value[0])) throw invalid();
  ownRecord(value[0], "Dataset transform");
  return value;
}
