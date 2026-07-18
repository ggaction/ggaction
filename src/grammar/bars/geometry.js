import { cloneAndFreeze } from "../../core/immutable.js";

export const DEFAULT_BAR_WIDTH = Object.freeze({ band: 0.72 });
export const DEFAULT_OFFSET_PADDING = Object.freeze({
  paddingInner: 0,
  paddingOuter: 0
});

export function normalizeBarWidth(options = {}, existing) {
  const hasBand = options.band !== undefined;
  const hasPixels = options.pixels !== undefined;
  if (hasBand && hasPixels) {
    throw new Error("encodeBarWidth band and pixels are mutually exclusive.");
  }
  if (!hasBand && !hasPixels) {
    return cloneAndFreeze(existing ?? DEFAULT_BAR_WIDTH);
  }
  if (hasBand) {
    if (!Number.isFinite(options.band) || options.band <= 0 || options.band > 1) {
      throw new RangeError("Bar width band must be greater than 0 and at most 1.");
    }
    return cloneAndFreeze({ band: options.band });
  }
  if (!Number.isFinite(options.pixels) || options.pixels <= 0) {
    throw new RangeError("Bar width pixels must be a positive finite number.");
  }
  return cloneAndFreeze({ pixels: options.pixels });
}

export function normalizeOffsetPadding(options = {}, existing, channel = "xOffset") {
  const paddingInner = options.paddingInner ??
    existing?.paddingInner ?? DEFAULT_OFFSET_PADDING.paddingInner;
  const paddingOuter = options.paddingOuter ??
    existing?.paddingOuter ?? DEFAULT_OFFSET_PADDING.paddingOuter;
  if (!Number.isFinite(paddingInner) || paddingInner < 0 || paddingInner >= 1) {
    throw new RangeError(
      `${channel} paddingInner must be from 0 (inclusive) to 1 (exclusive).`
    );
  }
  if (!Number.isFinite(paddingOuter) || paddingOuter < 0) {
    throw new RangeError(
      `${channel} paddingOuter must be a non-negative finite number.`
    );
  }
  return cloneAndFreeze({ paddingInner, paddingOuter });
}

export function resolveBarWidth(config, slotBandwidth) {
  if (!Number.isFinite(slotBandwidth) || slotBandwidth <= 0) {
    throw new Error("Bar width requires a positive resolved slot bandwidth.");
  }
  const normalized = normalizeBarWidth(config);
  return normalized.pixels ?? slotBandwidth * normalized.band;
}
