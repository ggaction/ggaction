import { freezeOwned } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";

export const MAX_HIT_INDEX_ITEMS = 100_000;
export const MAX_HIT_INDEX_WORK = 10_000_000;
export const MAX_HIT_QUERY_WORK = 2_000_000;
const maximumSceneNodes = 200_000, maximumWork = 128_000_000;
const defaults = freezeOwned({ maxSceneNodes: MAX_HIT_INDEX_ITEMS, maxWork: MAX_HIT_INDEX_WORK });

/** Session-local preparation limits; entry, query and snapshot limits are separate. */
export function normalizeHitPreparation(input) {
  if (input === undefined) return defaults;
  ownRecord(input, "Hit preparation options");
  if (Object.keys(input).some(key => key !== "maxSceneNodes" && key !== "maxWork" && key !== "pathGeometry")) {
    throw new TypeError("Hit preparation options contain an unsupported property.");
  }
  const value = key => Object.hasOwn(input, key) && input[key] !== undefined ? input[key] : defaults[key];
  const maxSceneNodes = value("maxSceneNodes"), maxWork = value("maxWork");
  if (!Number.isSafeInteger(maxSceneNodes) || maxSceneNodes < 1 || maxSceneNodes > maximumSceneNodes) {
    throw new RangeError("Hit preparation maxSceneNodes must be an integer from 1 to 200000.");
  }
  if (!Number.isSafeInteger(maxWork) || maxWork < 1 || maxWork > maximumWork) {
    throw new RangeError("Hit preparation maxWork must be an integer from 1 to 128000000.");
  }
  const pathGeometry = normalizeHitPathGeometry(Object.hasOwn(input, "pathGeometry") ? input.pathGeometry : undefined);
  return freezeOwned({ maxSceneNodes, maxWork, ...(pathGeometry === undefined ? {} : { pathGeometry }) });
}

/** Explicit concrete-path preparation; unrelated primitives and clips do not inherit it. */
export function normalizeHitPathGeometry(input) {
  if (input === undefined) return undefined;
  ownRecord(input, "Hit path geometry options");
  const defaults = { maxParts: 30000, maxWork: 1000000, maxIndexWork: 10000000 };
  const maxima = { maxParts: 400000, maxWork: 2000000, maxIndexWork: 16000000 };
  if (Object.keys(input).some(key => !Object.hasOwn(defaults, key))) throw new TypeError("Hit path geometry options contain an unsupported property.");
  const result = {};
  for (const key of Object.keys(defaults)) {
    const value = Object.hasOwn(input, key) && input[key] !== undefined ? input[key] : defaults[key];
    if (!Number.isSafeInteger(value) || value < 1 || value > maxima[key]) throw new RangeError(`Hit path geometry ${key} must be an integer from 1 to ${maxima[key]}.`);
    result[key] = value;
  }
  return freezeOwned(result);
}
