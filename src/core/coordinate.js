const COORDINATE_TYPES = new Set(["cartesian", "polar"]);

export function validateCoordinateType(value) {
  if (!COORDINATE_TYPES.has(value)) {
    throw new Error(`Unknown coordinate type "${value}".`);
  }

  return value;
}
