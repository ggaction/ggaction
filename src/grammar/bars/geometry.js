import { validateOptionObject } from "../../core/validation.js";
import { floorUtcTimeUnit, offsetUtcTimeUnit, TIME_UNITS, validTimestamp } from "../timeUnit.js";
import { mapContinuousScaleValues } from "../scales/mapping.js";
import { cloneAndFreeze } from "../../core/immutable.js";

export const DEFAULT_BAR_WIDTH = Object.freeze({ band: 0.72 });
export const DEFAULT_OFFSET_PADDING = Object.freeze({
  paddingInner: 0,
  paddingOuter: 0
});

export function normalizeBarWidth(options = {}, existing) {
  const hasBand = options.band !== undefined;
  const hasPixels = options.pixels !== undefined;
  const hasInterval = options.interval !== undefined;
  if (Number(hasBand) + Number(hasPixels) + Number(hasInterval) > 1) {
    throw new Error("encodeBarWidth band, pixels, and interval are mutually exclusive.");
  }
  if (hasInterval) {
    validateOptionObject(options.interval, ["unit", "insetStart", "insetEnd"], "Bar width interval");
    const { unit, insetStart = 0, insetEnd = 0 } = options.interval;
    if (!TIME_UNITS.includes(unit) || ["week", "weekday"].includes(unit)) throw new Error("Bar width interval requires year, quarter, month, day, hour, minute, or second.");
    if (![insetStart, insetEnd].every(v => Number.isFinite(v) && v >= 0)) throw new RangeError("Bar interval insets must be non-negative finite pixels.");
    return cloneAndFreeze({ interval: { unit, insetStart, insetEnd } });
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

export function normalizeOffsetScalePolicy(
  options = {},
  existing,
  channel = "xOffset"
) {
  const hasPadding = Object.hasOwn(options, "padding");
  const hasInner = Object.hasOwn(options, "paddingInner");
  const hasOuter = Object.hasOwn(options, "paddingOuter");
  if (hasPadding && (hasInner || hasOuter)) {
    throw new Error(
      `${channel} padding cannot be combined with paddingInner or paddingOuter.`
    );
  }
  const padding = hasPadding ? options.padding : undefined;
  if (hasPadding && (!Number.isFinite(padding) || padding < 0 || padding >= 1)) {
    throw new RangeError(
      `${channel} padding must be from 0 (inclusive) to 1 (exclusive).`
    );
  }
  const paddingInner = hasPadding
    ? padding
    : hasInner ? options.paddingInner : existing?.paddingInner ?? 0;
  const paddingOuter = hasPadding
    ? padding
    : hasOuter ? options.paddingOuter : existing?.paddingOuter ?? 0;
  const align = Object.hasOwn(options, "align")
    ? options.align
    : existing?.align ?? 0.5;
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
  if (!Number.isFinite(align) || align < 0 || align > 1) {
    throw new RangeError(`${channel} align must be between 0 and 1.`);
  }
  return cloneAndFreeze({ paddingInner, paddingOuter, align });
}

export function resolveBarSlotBandwidth(scale) {
  return Math.abs(scale.type === "point" ? scale.step : (scale.bandwidth ?? scale.step));
}

export function resolveBarWidth(config, slotBandwidth) {
  const normalized = normalizeBarWidth(config);
  if (normalized.pixels !== undefined) return normalized.pixels;
  if (!Number.isFinite(slotBandwidth) || slotBandwidth <= 0) {
    throw new Error("Bar width requires a positive resolved slot bandwidth.");
  }
  return normalized.pixels ?? slotBandwidth * normalized.band;
}


// Width intent never buckets or aggregates data: category values are interval starts.
export function resolveBarInterval(config, value, scale) {
  if (scale.type !== "time") throw new Error("Bar interval width requires a temporal category scale.");
  const { unit, insetStart, insetEnd } = normalizeBarWidth(config).interval;
  const start = floorUtcTimeUnit(value, unit);
  if (start !== value) throw new Error("Bar interval category values must be UTC interval starts.");
  const end = offsetUtcTimeUnit(start, unit);
  if (!validTimestamp(end)) throw new RangeError("Bar interval end exceeds the supported Date range.");
  if (start < Math.min(...scale.domain) || end > Math.max(...scale.domain)) throw new RangeError("Bar interval endpoints must be inside the temporal scale domain; set an explicit covering domain.");
  const [a, b] = mapContinuousScaleValues([start, end], scale), width = Math.abs(b - a) - insetStart - insetEnd;
  if (width <= 0) throw new RangeError("Bar interval insets must leave a positive width.");
  return { position: Math.min(a, b) + (b >= a ? insetStart : insetEnd), width };
}
