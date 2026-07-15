export function validateRuleStroke(value, label = "encodeStroke") {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} requires a non-empty string value.`);
  }
  return value;
}

export function validateRuleStrokeWidth(value, label = "encodeStrokeWidth") {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(
      `${label} requires a non-negative finite value.`
    );
  }
  return value;
}
