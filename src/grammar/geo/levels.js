import { ownArray, ownRecord } from "../../core/ownData.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { encodeRowKey } from "../../core/itemIdentity.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { GEO_LIMITS } from "./input.js";

// Levels carry original typed region identities. Parent relations are authored;
// proximity, names and encounter position never manufacture a correspondence.
export function resolveGeoLevels(input, options) {
  ownRecord(options, "Geographic level options");
  rejectUnknownProperties(options, ["zoom", "previousLevel"], "geographic level");
  if (!Number.isFinite(options.zoom) || options.zoom < 0) throw new RangeError("Geographic zoom must be finite and nonnegative.");
  if (Array.isArray(input)) validateGeneratedItemLimit(input.length, "Geographic level count", GEO_LIMITS.maxDepth);
  ownArray(input, "Geographic levels");
  if (!input.length) throw new TypeError("Geographic levels require at least one level.");
  const ids = new Set(), indexes = []; let featureCount = 0, work = 0;
  const charge = amount => validateWorkLimit(work += amount, "Geographic level work");
  const levels = input.map((level, index) => {
    ownRecord(level, "Geographic level");
    rejectUnknownProperties(level, index ? ["id", "keys", "parents", "enterZoom", "exitZoom"] : ["id", "keys"], "geographic level");
    const id = validateUserId(level.id, "Geographic level id");
    if (ids.has(id)) throw new Error("Geographic level ids must be unique.");
    ids.add(id); charge(id.length);
    if (Array.isArray(level.keys)) validateGeneratedItemLimit(featureCount += level.keys.length, "Geographic level region count", GEO_LIMITS.maxFeatures);
    ownArray(level.keys, "Geographic level keys");
    const lookup = new Map(), keys = level.keys.map((value, i) => {
      const key = encodeRowKey(value, "Geographic region key"); charge(key.length + 1);
      if (lookup.has(key)) throw new Error("Geographic region keys must be unique within a level.");
      lookup.set(key, i); return key;
    });
    indexes.push(lookup);
    if (!index) return { id, keys, parents: null };
    if (![level.enterZoom, level.exitZoom].every(value => Number.isFinite(value) && value >= 0) || level.enterZoom <= level.exitZoom ||
        index > 1 && (level.enterZoom <= input[index - 1].enterZoom || level.exitZoom <= input[index - 1].exitZoom)) {
      throw new RangeError("Geographic level thresholds require increasing enter/exit zoom and enterZoom > exitZoom >= 0.");
    }
    if (Array.isArray(level.parents)) {
      validateGeneratedItemLimit(level.parents.length, "Geographic level parent count", GEO_LIMITS.maxFeatures);
      charge(level.parents.length);
    }
    ownArray(level.parents, "Geographic level parents");
    if (level.parents.length !== keys.length) throw new Error("Each geographic region requires exactly one parent.");
    const parents = Array(keys.length).fill(null);
    for (const pair of level.parents) {
      ownRecord(pair, "Geographic level parent");
      rejectUnknownProperties(pair, ["key", "parent"], "geographic level parent");
      const childKey = encodeRowKey(pair.key, "Geographic child key"), parentKey = encodeRowKey(pair.parent, "Geographic parent key");
      charge(childKey.length + parentKey.length + 1);
      const child = lookup.get(childKey), parent = indexes[index - 1].get(parentKey);
      if (child === undefined || parent === undefined || parents[child] !== null) throw new Error("Geographic parent mapping requires existing unique child and parent keys.");
      parents[child] = parent;
    }
    return { id, keys, parents, enterZoom: level.enterZoom, exitZoom: level.exitZoom };
  });
  let current = 0;
  if (Object.hasOwn(options, "previousLevel")) {
    validateUserId(options.previousLevel, "Previous geographic level");
    current = levels.findIndex(level => level.id === options.previousLevel);
    if (current < 0) throw new Error("Unknown previous geographic level.");
  }
  while (current + 1 < levels.length && options.zoom >= levels[current + 1].enterZoom) { charge(1); current++; }
  while (current > 0 && options.zoom < levels[current].exitZoom) { charge(1); current--; }
  const mapping = levels.map(level => level.keys.map(key => ({ key, representations: [] })));
  for (let i = 0; i < levels[current].keys.length; i++) {
    const key = levels[current].keys[i]; let ancestor = i;
    for (let level = current; level >= 0; level--) {
      charge(key.length + 1); mapping[level][ancestor].representations.push(key);
      ancestor = levels[level].parents?.[ancestor];
    }
  }
  for (let level = current + 1; level < levels.length; level++) {
    for (let i = 0; i < levels[level].keys.length; i++) {
      let ancestor = i;
      for (let parent = level; parent > current; parent--) { charge(1); ancestor = levels[parent].parents[ancestor]; }
      const key = levels[current].keys[ancestor]; charge(key.length + 1);
      mapping[level][i].representations.push(key);
    }
  }
  return cloneAndFreeze({ level: levels[current].id, levelIndex: current,
    mapping: levels.map((level, i) => ({ level: level.id, regions: mapping[i] })),
    diagnostics: { levelCount: levels.length, featureCount, work } });
}
