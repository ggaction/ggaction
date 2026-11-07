import { finiteMidpoint, requireFiniteResult } from "./numeric.js";

export function applyOffsetPositionValues({ base, offset, parentScale, offsetScale, channel }) {
  if (base.length !== offset.length) throw new Error(`${channel} offset values must match the base position grain.`);
  const midpoint = finiteMidpoint(offsetScale.range[0], offsetScale.range[1]);
  const direction = Math.sign(parentScale.step) || Math.sign(parentScale.range[1] - parentScale.range[0]) || 1;
  return Object.freeze(base.map((value, index) => {
    if (!Number.isFinite(value) || !Number.isFinite(offset[index])) return undefined;
    return requireFiniteResult(value + direction * (offset[index] - midpoint), `${channel} offset position`);
  }));
}

export function categorySlotPixels(scale, band) {
  if (scale?.type !== "band" || !Number.isFinite(scale.bandwidth) || scale.bandwidth <= 0) {
    throw new Error("Category slot offset requires a positive band scale.");
  }
  if (!Number.isFinite(band) || band < -0.5 || band > 0.5) throw new RangeError("Category slot offset must be within [-0.5, 0.5] band.");
  return scale.bandwidth * band;
}
