function finite(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite.`);
  }
  return value;
}

function anchor(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Directional glyph anchor must be an object.");
  }
  return {
    x: finite(value.x, "Directional glyph anchor x"),
    y: finite(value.y, "Directional glyph anchor y")
  };
}

export function directionVector(degrees) {
  const radians = finite(degrees, "Directional glyph degrees") * Math.PI / 180;
  return Object.freeze({
    x: Math.sin(radians),
    y: -Math.cos(radians)
  });
}

export function centeredDirectionalSegment(value, degrees, length) {
  const center = anchor(value);
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError("Directional segment length must be positive and finite.");
  }
  const vector = directionVector(degrees);
  const half = length / 2;
  return Object.freeze({
    x1: center.x - vector.x * half,
    y1: center.y - vector.y * half,
    x2: center.x + vector.x * half,
    y2: center.y + vector.y * half
  });
}

export function directionalTriangleCommands(value, degrees, radius) {
  const center = anchor(value);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError("Directional triangle radius must be positive and finite.");
  }
  const points = [degrees, degrees + 120, degrees + 240].map(angle => {
    const vector = directionVector(angle);
    return Object.freeze({
      x: center.x + vector.x * radius,
      y: center.y + vector.y * radius
    });
  });
  return Object.freeze([
    Object.freeze({ op: "M", ...points[0] }),
    Object.freeze({ op: "L", ...points[1] }),
    Object.freeze({ op: "L", ...points[2] }),
    Object.freeze({ op: "Z" })
  ]);
}
