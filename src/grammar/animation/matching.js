import { ownArray, ownRecord } from "../../core/ownData.js";

// Inputs are identity projections prepared once by the owning track planner.
// Undefined entries are anonymous primitives: their array position is never
// evidence that two independently authored primitives represent the same item.
function indexIdentities(items, label) {
  ownArray(items, label);
  const index = new Map();
  items.forEach((identity, position) => {
    if (identity === undefined) return;
    ownRecord(identity, `${label} identity`);
    if (Object.keys(identity).length !== 2 ||
        !["key", "role"].every(name => Object.hasOwn(identity, name) &&
          typeof identity[name] === "string" && identity[name].length > 0)) {
      throw new TypeError("Animation matching requires explicit item key and primitive role.");
    }
    const token = JSON.stringify([identity.key, identity.role]);
    if (index.has(token)) throw new TypeError("Animation endpoint contains an ambiguous item identity and role.");
    index.set(token, { position, key: identity.key, role: identity.role });
  });
  return index;
}

export function matchItemIdentities(from, to) {
  const source = indexIdentities(from, "Animation source identities");
  indexIdentities(to, "Animation target identities");
  const matches = [], enters = [], matchedSources = new Set();
  for (let targetIndex = 0; targetIndex < to.length; targetIndex++) {
    const identity = to[targetIndex];
    const previous = identity === undefined ? undefined
      : source.get(JSON.stringify([identity.key, identity.role]));
    if (previous === undefined) {
      enters.push(targetIndex);
    } else {
      matchedSources.add(previous.position);
      matches.push(Object.freeze({ sourceIndex: previous.position, targetIndex,
        key: previous.key, role: previous.role }));
    }
  }
  const exits = Array.from({ length: from.length }, (_, index) => index)
    .filter(index => !matchedSources.has(index));
  return Object.freeze({ matches: Object.freeze(matches),
    enters: Object.freeze(enters), exits: Object.freeze(exits) });
}
