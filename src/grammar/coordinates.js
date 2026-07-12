const COORDINATE_TYPES = new Set(["cartesian", "polar"]);
const POSITION_COORDINATES = Object.freeze({
  x: Object.freeze({ id: "main", type: "cartesian" }),
  y: Object.freeze({ id: "main", type: "cartesian" }),
  theta: Object.freeze({ id: "polar", type: "polar" }),
  radius: Object.freeze({ id: "polar", type: "polar" })
});

export function validateCoordinateType(value) {
  if (!COORDINATE_TYPES.has(value)) {
    throw new Error(`Unknown coordinate type "${value}".`);
  }

  return value;
}

export function getPositionCoordinateDefaults(channel) {
  const coordinate = POSITION_COORDINATES[channel];

  if (coordinate === undefined) {
    throw new Error(`Unknown positional channel "${channel}".`);
  }

  return coordinate;
}
