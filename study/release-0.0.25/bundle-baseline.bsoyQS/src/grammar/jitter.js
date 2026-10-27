import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateNonEmptyString } from "../core/validation.js";

const UINT32_RANGE = 0x1_0000_0000;
const CATEGORICAL_SCALE_TYPES = new Set(["band", "point", "ordinal"]);

export const JITTER_ALGORITHM = "jitter-uniform-v1";

export function canonicalJitterScalar(value, label = "Jitter identity") {
  if (typeof value === "string") {
    return `string:${new TextEncoder().encode(value).length}:${value}`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return `number:${Object.is(value, -0) ? "0" : String(value)}`;
  }
  if (typeof value === "boolean") return `boolean:${value}`;
  throw new TypeError(`${label} must be a string, finite number, or boolean.`);
}

export function stableUint32HashV1(value) {
  const bytes = new TextEncoder().encode(value);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function jitterIdentity({ target, channel, seed, identity }) {
  return [
    canonicalJitterScalar(target, "Jitter target"),
    canonicalJitterScalar(channel, "Jitter channel"),
    canonicalJitterScalar(seed, "Jitter seed"),
    canonicalJitterScalar(identity, "Jitter key")
  ].join("\0");
}

function requestedOffset(options, maximum) {
  const hash = stableUint32HashV1(jitterIdentity(options));
  return (2 * (hash / UINT32_RANGE) - 1) * maximum;
}

export function normalizePointJitterPolicy(options = {}) {
  if (!isPlainObject(options)) {
    throw new TypeError("Point jitter options must be a plain object.");
  }
  if (!["x", "y", "both"].includes(options.channel)) {
    throw new Error('Point jitter channel must be "x", "y", or "both".');
  }
  const maxOffset = options.maxOffset;
  if (!isPlainObject(maxOffset)) {
    throw new TypeError("Point jitter maxOffset must be a plain object.");
  }
  const keys = Object.keys(maxOffset);
  if (
    keys.length !== 1 ||
    !["pixels", "band"].includes(keys[0])
  ) {
    throw new Error("Point jitter maxOffset requires exactly one of pixels or band.");
  }
  const kind = keys[0];
  const value = maxOffset[kind];
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`Point jitter ${kind} must be positive and finite.`);
  }
  if (kind === "band" && value > 0.5) {
    throw new RangeError("Point jitter band must be at most 0.5.");
  }
  const seed = options.seed ?? 0;
  if (!(
    typeof seed === "string" ||
    (typeof seed === "number" && Number.isFinite(seed))
  )) {
    throw new TypeError("Point jitter seed must be a string or finite number.");
  }
  const key = options.key === undefined
    ? undefined
    : validateNonEmptyString(options.key, "Point jitter key");
  return cloneAndFreeze({
    algorithm: JITTER_ALGORITHM,
    channel: options.channel,
    maxOffset: { [kind]: value },
    seed,
    ...(key === undefined ? {} : { key })
  });
}

export function resolveJitterSlotWidth(scale) {
  if (!CATEGORICAL_SCALE_TYPES.has(scale?.type)) return undefined;
  const width = scale.bandwidth > 0
    ? scale.bandwidth
    : Math.abs(scale.step);
  return Number.isFinite(width) && width > 0 ? width : undefined;
}

export function resolveJitterMaximum(policy, scale) {
  if (policy.maxOffset.pixels !== undefined) {
    return policy.maxOffset.pixels;
  }
  const slotWidth = resolveJitterSlotWidth(scale);
  if (slotWidth === undefined) {
    throw new Error(
      "Band point jitter requires a categorical position scale with a positive slot."
    );
  }
  return slotWidth * policy.maxOffset.band;
}

function containOffset({
  base,
  requested,
  plotMinimum,
  plotMaximum,
  halfExtent,
  slotWidth
}) {
  let minimum = plotMinimum + halfExtent;
  let maximum = plotMaximum - halfExtent;
  if (slotWidth !== undefined) {
    minimum = Math.max(minimum, base - slotWidth / 2 + halfExtent);
    maximum = Math.min(maximum, base + slotWidth / 2 - halfExtent);
  }
  if (minimum > maximum) {
    return { offset: 0, clamped: true, available: false };
  }
  const final = Math.max(minimum, Math.min(maximum, base + requested));
  return {
    offset: final - base,
    clamped: final !== base + requested,
    available: true
  };
}

export function resolvePointJitter({
  target,
  policy,
  scale,
  entries,
  plotMinimum,
  plotMaximum
}) {
  validateNonEmptyString(target, "Point jitter target");
  if (!Array.isArray(entries)) {
    throw new TypeError("Point jitter entries must be an array.");
  }
  if (
    !Number.isFinite(plotMinimum) ||
    !Number.isFinite(plotMaximum) ||
    plotMaximum < plotMinimum
  ) {
    throw new RangeError("Point jitter plot bounds are invalid.");
  }
  const maximum = resolveJitterMaximum(policy, scale);
  const slotWidth = resolveJitterSlotWidth(scale);
  const items = entries.map((entry, itemIndex) => {
    if (!Number.isInteger(entry.index) || entry.index < 0) {
      throw new TypeError(`Point jitter entry ${itemIndex} index must be non-negative.`);
    }
    if (!Number.isFinite(entry.base) || !Number.isFinite(entry.halfExtent)) {
      throw new TypeError(`Point jitter entry ${itemIndex} geometry must be finite.`);
    }
    if (entry.halfExtent < 0) {
      throw new RangeError(`Point jitter entry ${itemIndex} extent must not be negative.`);
    }
    const requested = requestedOffset({
      target,
      channel: policy.channel,
      seed: policy.seed,
      identity: entry.identity
    }, maximum);
    const contained = containOffset({
      base: entry.base,
      requested,
      plotMinimum,
      plotMaximum,
      halfExtent: entry.halfExtent,
      slotWidth
    });
    return {
      index: entry.index,
      identity: entry.identity,
      requestedOffset: requested,
      finalOffset: contained.offset,
      clamped: contained.clamped,
      available: contained.available
    };
  });
  return cloneAndFreeze({
    algorithm: JITTER_ALGORITHM,
    maximum,
    itemCount: items.length,
    clampedItemCount: items.filter(item => item.clamped).length,
    unavailableItemCount: items.filter(item => !item.available).length,
    items
  });
}
