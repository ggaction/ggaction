import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateNonEmptyString } from "../core/validation.js";
import { resolveJitterSlotWidth } from "./jitter.js";

export const POINT_PACKING_ALGORITHM = "point-pack-greedy-v1";

export function normalizePointPackingPolicy(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("Point packing options must be a plain object.");
  }
  if (!["x", "y"].includes(options.channel)) {
    throw new Error('Point packing channel must be "x" or "y".');
  }
  let maxOffset;
  if (options.maxOffset !== undefined) {
    if (!isPlainObject(options.maxOffset)) {
      throw new TypeError("Point packing maxOffset must be a plain object.");
    }
    const keys = Object.keys(options.maxOffset);
    if (keys.length !== 1 || !["pixels", "band"].includes(keys[0])) {
      throw new Error("Point packing maxOffset requires exactly one of pixels or band.");
    }
    const value = options.maxOffset[keys[0]];
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`Point packing ${keys[0]} must be positive and finite.`);
    }
    if (keys[0] === "band" && value > 0.5) {
      throw new RangeError("Point packing band must be at most 0.5.");
    }
    maxOffset = { [keys[0]]: value };
  }
  const padding = options.padding ?? 1;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError("Point packing padding must be non-negative and finite.");
  }
  const key = options.key === undefined
    ? undefined
    : validateNonEmptyString(options.key, "Point packing key");
  const overflow = options.overflow ?? "error";
  if (!["error", "overlap"].includes(overflow)) {
    throw new Error('Point packing overflow must be "error" or "overlap".');
  }
  return cloneAndFreeze({
    algorithm: POINT_PACKING_ALGORITHM,
    channel: options.channel,
    ...(maxOffset === undefined ? {} : { maxOffset }),
    padding,
    ...(key === undefined ? {} : { key }),
    overflow
  });
}

function offsetLimit(policy, slotWidth) {
  if (policy.maxOffset?.pixels !== undefined) return policy.maxOffset.pixels;
  if (policy.maxOffset?.band !== undefined) return slotWidth * policy.maxOffset.band;
  return slotWidth / 2;
}

function candidateOffsets(entry, placed, minimum, maximum, padding) {
  const candidates = [0, minimum - entry.base, maximum - entry.base];
  for (const other of placed) {
    if (Math.abs(entry.fixed - other.fixed) >=
        entry.fixedHalfExtent + other.fixedHalfExtent + padding) continue;
    const distance = entry.halfExtent + other.halfExtent + padding;
    candidates.push(other.final - entry.base - distance, other.final - entry.base + distance);
  }
  return [...new Set(candidates
    .map(value => Math.max(minimum - entry.base, Math.min(maximum - entry.base, value)))
    .map(value => Object.is(value, -0) ? 0 : value))]
    .sort((left, right) => Math.abs(left) - Math.abs(right) || left - right);
}

function collisions(entry, final, placed, padding) {
  return placed.filter(other =>
    Math.abs(entry.fixed - other.fixed) <
      entry.fixedHalfExtent + other.fixedHalfExtent + padding &&
    Math.abs(final - other.final) < entry.halfExtent + other.halfExtent + padding
  );
}

export function resolvePointPacking({
  target,
  policy,
  scale,
  entries,
  plotMinimum,
  plotMaximum
}) {
  validateNonEmptyString(target, "Point packing target");
  if (!Array.isArray(entries)) throw new TypeError("Point packing entries must be an array.");
  if (!Number.isFinite(plotMinimum) || !Number.isFinite(plotMaximum) || plotMaximum < plotMinimum) {
    throw new RangeError("Point packing plot bounds are invalid.");
  }
  const slotWidth = resolveJitterSlotWidth(scale);
  if (slotWidth === undefined) {
    throw new Error("Point packing requires a categorical position scale with a positive slot.");
  }
  const maximumOffset = offsetLimit(policy, slotWidth);
  const seenIndices = new Set();
  const seenIdentities = new Set();
  const ordered = entries.map((entry, offset) => {
    for (const field of ["index", "base", "fixed", "halfExtent", "fixedHalfExtent"]) {
      if (!Number.isFinite(entry[field])) {
        throw new TypeError(`Point packing entry ${offset} ${field} must be finite.`);
      }
    }
    if (!Number.isInteger(entry.index) || entry.index < 0 ||
        entry.halfExtent < 0 || entry.fixedHalfExtent < 0) {
      throw new RangeError(`Point packing entry ${offset} geometry is invalid.`);
    }
    validateNonEmptyString(entry.identity, `Point packing entry ${offset} identity`);
    if (seenIndices.has(entry.index)) {
      throw new Error(`Point packing entry index ${entry.index} must be unique.`);
    }
    if (seenIdentities.has(entry.identity)) {
      throw new Error(`Point packing entry identity "${entry.identity}" must be unique.`);
    }
    seenIndices.add(entry.index);
    seenIdentities.add(entry.identity);
    return { ...entry };
  }).sort((left, right) =>
    left.fixed - right.fixed ||
    (left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0)
  );
  const placed = [];
  for (const entry of ordered) {
    const minimum = Math.max(
      plotMinimum + entry.halfExtent,
      entry.base - slotWidth / 2 + entry.halfExtent,
      entry.base - maximumOffset
    );
    const maximum = Math.min(
      plotMaximum - entry.halfExtent,
      entry.base + slotWidth / 2 - entry.halfExtent,
      entry.base + maximumOffset
    );
    if (minimum > maximum) {
      if (policy.overflow === "error") {
        throw new RangeError(`Point packing for "${target}" has no available category-slot position.`);
      }
      placed.push({ ...entry, final: entry.base, offset: 0, unresolved: true, collisionCount: 0 });
      continue;
    }
    const candidates = candidateOffsets(entry, placed, minimum, maximum, policy.padding)
      .map(offset => ({
        offset,
        final: entry.base + offset,
        collisions: collisions(entry, entry.base + offset, placed, policy.padding)
      }));
    const resolved = candidates.find(candidate => candidate.collisions.length === 0);
    if (resolved !== undefined) {
      placed.push({ ...entry, final: resolved.final, offset: resolved.offset,
        unresolved: false, collisionCount: 0 });
      continue;
    }
    if (policy.overflow === "error") {
      throw new RangeError(`Point packing for "${target}" cannot avoid glyph overlap.`);
    }
    const best = candidates.sort((left, right) =>
      left.collisions.length - right.collisions.length ||
      Math.abs(left.offset) - Math.abs(right.offset) || left.offset - right.offset
    )[0];
    placed.push({ ...entry, final: best.final, offset: best.offset,
      unresolved: true, collisionCount: best.collisions.length });
  }
  const items = placed.sort((left, right) => left.index - right.index).map(item => ({
    index: item.index,
    identity: item.identity,
    base: item.base,
    final: item.final,
    finalOffset: item.offset,
    unresolved: item.unresolved,
    collisionCount: item.collisionCount
  }));
  return cloneAndFreeze({
    algorithm: POINT_PACKING_ALGORITHM,
    slotWidth,
    maximumOffset,
    itemCount: items.length,
    unresolvedItemCount: items.filter(item => item.unresolved).length,
    items
  });
}
