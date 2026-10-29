import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { GEO_LIMITS } from "./input.js";

// References live only in resource.inputs; levels retain their positional role.
export function normalizeGeoLODOptions(input) {
  ownRecord(input, "Geographic level options");
  rejectUnknownProperties(input, ["levels", "zoom", "activeLevel"], "geographic level options");
  if (Array.isArray(input.levels)) validateGeneratedItemLimit(input.levels.length, "Geographic level count", GEO_LIMITS.maxDepth);
  ownArray(input.levels, "Geographic levels");
  if (!input.levels.length) throw new TypeError("Geographic levels require at least one level.");
  let work = 0, parents = 0;
  const levels = input.levels.map((level, index) => {
    ownRecord(level, "Geographic level");
    rejectUnknownProperties(level, index ? ["id", "input", "tolerance", "parents", "enterZoom", "exitZoom"] : ["id", "input", "tolerance"], "geographic level");
    validateUserId(level.id, "Geographic level id");
    if (level.input !== index) throw new TypeError("Geographic levels require ordered input roles.");
    if (index) {
      if (Array.isArray(level.parents)) validateGeneratedItemLimit(parents += level.parents.length, "Geographic parent count", GEO_LIMITS.maxFeatures);
      ownArray(level.parents, "Geographic parents");
      for (const pair of level.parents) {
        ownRecord(pair, "Geographic parent"); rejectUnknownProperties(pair, ["key", "parent"], "geographic parent");
        validateWorkLimit(work += encodeRowKey(pair.key).length + encodeRowKey(pair.parent).length + 1, "Geographic parent work");
      }
    }
    const tolerance = level.tolerance ?? 0;
    if (Object.hasOwn(level, "tolerance") && level.tolerance === null || !Number.isFinite(tolerance) || tolerance < 0) throw new RangeError("Geographic tolerance must be finite and nonnegative.");
    return { ...level, tolerance };
  });
  const zoom = Object.hasOwn(input, "zoom") ? input.zoom : 0;
  if (!Number.isFinite(zoom) || zoom < 0) throw new RangeError("Geographic zoom must be finite and nonnegative.");
  if (Object.hasOwn(input, "activeLevel")) validateUserId(input.activeLevel, "Active geographic level");
  return cloneAndFreeze({ method: "geo-lod", levels, zoom,
    ...(Object.hasOwn(input, "activeLevel") ? { activeLevel: input.activeLevel } : {}) });
}
