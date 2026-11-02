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
  if (Object.keys(input).some(key => key !== "maxSceneNodes" && key !== "maxWork")) {
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
  return freezeOwned({ maxSceneNodes, maxWork });
}
