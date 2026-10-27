import { cloneAndFreeze } from "../../core/immutable.js";
import { interpolateNumber } from "../numeric.js";

export function validateRadialMapping(mapping) {
  if (!["area", "radius-length"].includes(mapping)) {
    throw new Error('Radial mapping must be "area" or "radius-length".');
  }
  return mapping;
}

export function validateMeasuredRadiusScale(scale, { allowAuto = false } = {}) {
  validateRadialMapping(scale.radialMapping);
  if (scale.type !== "linear" || (scale.nice !== undefined && scale.nice !== false) ||
    (scale.zero !== undefined && scale.zero !== true) ||
    (scale.reverse !== undefined && scale.reverse !== false) || Object.hasOwn(scale, "unknown")) {
    throw new Error("Measured radius requires a linear, zero-based, non-reversed scale without nice or unknown.");
  }
  if (!(allowAuto && scale.domain === "auto") && (!Array.isArray(scale.domain) || scale.domain.length !== 2 ||
    scale.domain[0] !== 0 || !Number.isFinite(scale.domain[1]) || scale.domain[1] <= 0)) {
    throw new RangeError("Measured radius domain must be [0, positive finite maximum].");
  }
  if (!(allowAuto && scale.range === "auto") && (!Array.isArray(scale.range) || scale.range.length !== 2 ||
    !scale.range.every(Number.isFinite) || scale.range[0] < 0 || scale.range[0] >= scale.range[1])) {
    throw new RangeError("Measured radius range must satisfy 0 <= inner < outer with finite radii.");
  }
  if (scale.clamp !== undefined && typeof scale.clamp !== "boolean") {
    throw new TypeError("Measured radius clamp must be a boolean.");
  }
  return scale;
}

export function mapMeasuredRadiusValues(values, scale) {
  validateMeasuredRadiusScale(scale);
  const [inner, outer] = scale.range;
  const ratio = inner / outer;
  // Normalize before squaring so finite large radii do not overflow.
  const annulus = (1 - ratio) * (1 + ratio);
  return cloneAndFreeze(values.map(value => {
    if (!Number.isFinite(value)) throw new TypeError("Measured radius values must be finite.");
    const proportion = value / scale.domain[1];
    const t = scale.clamp ? Math.max(0, Math.min(1, proportion)) : proportion;
    if (!Number.isFinite(t) || t < 0 || t > 1) {
      throw new RangeError("Measured radius value must lie inside its zero-based domain.");
    }
    if (t === 0 && value <= 0) return inner;
    if (t === 1) return outer;
    const radius = scale.radialMapping === "area"
      ? outer * Math.sqrt(Math.min(1, ratio * ratio + t * annulus))
      : interpolateNumber(inner, outer, t);
    if (radius <= inner) {
      throw new RangeError("Positive measured radius cannot be represented distinctly from the inner radius at this numeric precision.");
    }
    return Math.min(outer, radius);
  }));
}
