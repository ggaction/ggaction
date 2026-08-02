import { cloneAndFreeze } from "../core/immutable.js";

function finite(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite.`);
  }
  return value;
}

export function directionVector(degrees) {
  const radians = finite(degrees, "Direction degrees") * Math.PI / 180;
  return cloneAndFreeze({
    x: Math.sin(radians),
    y: -Math.cos(radians)
  });
}

export function centeredDirectionalSegment({ x, y, degrees = 0, length }) {
  const centerX = finite(x, "Directional segment x");
  const centerY = finite(y, "Directional segment y");
  const resolvedLength = finite(length, "Directional segment length");
  if (resolvedLength <= 0) {
    throw new RangeError("Directional segment length must be positive.");
  }
  const vector = directionVector(degrees);
  const half = resolvedLength / 2;
  return cloneAndFreeze({
    x1: centerX - vector.x * half,
    y1: centerY - vector.y * half,
    x2: centerX + vector.x * half,
    y2: centerY + vector.y * half
  });
}
