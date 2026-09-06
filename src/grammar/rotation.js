const UNITS = new Set(["radians", "degrees"]);

function toRadians(value, unit) {
  return unit === "degrees" ? value * Math.PI / 180 : value;
}

export function resolveRotation(value, label = "Rotation", {
  legacyUnit = "radians"
} = {}) {
  if (!UNITS.has(legacyUnit)) {
    throw new TypeError(`${label} legacy unit must be radians or degrees.`);
  }
  if (Number.isFinite(value)) return toRadians(value, legacyUnit);
  if (
    value !== null &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.keys(value).length === 2 &&
    Object.hasOwn(value, "value") &&
    Object.hasOwn(value, "unit") &&
    Number.isFinite(value.value) &&
    UNITS.has(value.unit)
  ) {
    return toRadians(value.value, value.unit);
  }
  throw new TypeError(
    `${label} must be a finite legacy number or { value, unit: "radians" | "degrees" }.`
  );
}
