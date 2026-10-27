import { validateKeys, validateNonNegativeFinite } from "../core/validation.js";
import { isPlainObject } from "../core/immutable.js";
import { resolveTextLines } from "../core/textMetrics.js";

export function validateAxisTextPlacement(value, { title = false } = {}) {
  if (Object.hasOwn(value, "align") && !["left", "center", "right"].includes(value.align)) {
    throw new TypeError("Axis text align must be left, center, or right.");
  }
  if (title) {
    if (Object.hasOwn(value, "overlap") && !["error", "allow"].includes(value.overlap)) {
      throw new TypeError("Axis title overlap must be error or allow.");
    }
    if (Object.hasOwn(value, "baseline") &&
        !["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"].includes(value.baseline)) {
      throw new TypeError("Axis title baseline must be a supported text baseline.");
    }
    if (Object.hasOwn(value, "offset") && isPlainObject(value.offset)) {
      validateKeys(value.offset, ["from", "gap"], "Axis title offset");
      if (value.offset.from !== "labels" || !Object.hasOwn(value.offset, "gap")) {
        throw new TypeError("Axis title offset requires from: labels and gap.");
      }
      validateNonNegativeFinite(value.offset.gap, "Axis title label gap");
    }
    for (const key of ["offset", "alongOffset"]) {
      if (key === "offset" && isLabelRelativeTitleOffset(value.offset)) continue;
      if (Object.hasOwn(value, key) && !Number.isFinite(value[key])) {
        throw new TypeError(`Axis title ${key} must be a finite number.`);
      }
    }
  }
}

export function isLabelRelativeTitleOffset(offset) {
  return isPlainObject(offset) && offset.from === "labels";
}

// Both label preflight and rematerialization use this one dependency policy.
export function axisTitleFollowsLabels(config) {
  return config?.inferredOffset === true || isLabelRelativeTitleOffset(config?.offset);
}

export function axisLabelHasText(properties) {
  return (properties?.lines ?? [{ text: properties?.text }]).some(line =>
    typeof line.text === "string" && line.text.length > 0);
}

export function axisTitleTextLines(text, config) {
  if (!/[\r\n]/u.test(text)) return undefined;
  const baseline = config.baseline ?? "middle";
  const lines = resolveTextLines(text, {
    fontSize: config.fontSize, align: config.align ?? "center", baseline,
    ...(baseline === "middle" ? { blockAlign: "middle" } : {})
  });
  if (["bottom", "ideographic"].includes(baseline)) {
    const offset = (lines.length - 1) * config.fontSize * 1.2;
    return lines.map(line => ({ ...line, y: line.y - offset }));
  }
  return lines.length > 1 ? lines : undefined;
}

export function axisTitleAllowsLabelOverlap(config) {
  return config?.overlap === "allow";
}

export function validateAxisLabelFlushThreshold(value, { allowReset = false } = {}) {
  if (value === undefined || (allowReset && value === "auto")) return;
  validateNonNegativeFinite(value, "Label flushThreshold");
}
