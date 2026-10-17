import { resolveTextLines } from "../core/textMetrics.js";

export function validateAxisTextPlacement(value, { title = false } = {}) {
  if (Object.hasOwn(value, "align") && !["left", "center", "right"].includes(value.align)) {
    throw new TypeError("Axis text align must be left, center, or right.");
  }
  if (title) {
    if (Object.hasOwn(value, "baseline") &&
        !["top", "hanging", "middle", "alphabetic", "ideographic", "bottom"].includes(value.baseline)) {
      throw new TypeError("Axis title baseline must be a supported text baseline.");
    }
    for (const key of ["offset", "alongOffset"]) {
      if (Object.hasOwn(value, key) && !Number.isFinite(value[key])) {
        throw new TypeError(`Axis title ${key} must be a finite number.`);
      }
    }
  }
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
