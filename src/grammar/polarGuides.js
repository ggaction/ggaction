import { freezeOwned } from "../core/immutable.js";
import { polarDirection } from "./polar.js";
import { buildPolarCircleCommands } from "./polarPaths.js";

export { buildPolarCircleCommands } from "./polarPaths.js";

function validateFrame(frame) {
  if (
    frame === null ||
    typeof frame !== "object" ||
    ![frame.centerX, frame.centerY, frame.availableRadius].every(Number.isFinite) ||
    frame.availableRadius < 0
  ) {
    throw new TypeError(
      "Polar guide frame requires finite centerX, centerY, and non-negative availableRadius."
    );
  }
  return frame;
}

function validateFiniteValues(values, label) {
  if (!Array.isArray(values) || !values.every(Number.isFinite)) {
    throw new TypeError(`${label} must be an array of finite numbers.`);
  }
  return values;
}

function validateNonNegative(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

function own(value) {
  return freezeOwned(value);
}

function pointAt(frame, theta, radius) {
  validateNonNegative(radius, "Polar guide radius");
  const direction = polarDirection(theta);
  return {
    x: frame.centerX + direction.x * radius,
    y: frame.centerY + direction.y * radius
  };
}

export function resolveThetaSpokes({ frame, angles }) {
  validateFrame(frame);
  validateFiniteValues(angles, "Polar spoke angles");
  const end = angles.map(theta => pointAt(frame, theta, frame.availableRadius));
  return own({
    x1: angles.map(() => frame.centerX),
    y1: angles.map(() => frame.centerY),
    x2: end.map(point => point.x),
    y2: end.map(point => point.y)
  });
}

export function resolveRadialCircles({ frame, radii }) {
  validateFrame(frame);
  validateFiniteValues(radii, "Polar grid radii");
  if (radii.some(radius => radius < 0 || radius > frame.availableRadius)) {
    throw new RangeError("Polar grid radii must be inside the Polar frame.");
  }
  const visibleRadii = radii.filter(radius => radius > 0);
  return own({
    radii: visibleRadii,
    commands: visibleRadii.map(radius => buildPolarCircleCommands(frame, radius))
  });
}

export function resolveThetaAxisTicks({ frame, angles, length }) {
  validateFrame(frame);
  validateFiniteValues(angles, "Theta-axis angles");
  validateNonNegative(length, "Theta-axis tick length");
  const start = angles.map(theta => pointAt(frame, theta, frame.availableRadius));
  const end = angles.map(theta => pointAt(
    frame,
    theta,
    frame.availableRadius + length
  ));
  return own({
    x1: start.map(point => point.x),
    y1: start.map(point => point.y),
    x2: end.map(point => point.x),
    y2: end.map(point => point.y)
  });
}

function perimeterAlignment(theta) {
  const radians = theta * Math.PI / 180;
  const horizontal = Math.sin(radians);
  const vertical = Math.cos(radians);
  return {
    textAlign: horizontal > 0.25
      ? "left"
      : horizontal < -0.25
        ? "right"
        : "center",
    textBaseline: vertical > 0.25
      ? "bottom"
      : vertical < -0.25
        ? "top"
        : "middle"
  };
}

export function resolveThetaAxisLabels({ frame, angles, offset }) {
  validateFrame(frame);
  validateFiniteValues(angles, "Theta-axis label angles");
  validateNonNegative(offset, "Theta-axis label offset");
  const points = angles.map(theta => pointAt(
    frame,
    theta,
    frame.availableRadius + offset
  ));
  const alignment = angles.map(perimeterAlignment);
  return own({
    x: points.map(point => point.x),
    y: points.map(point => point.y),
    textAlign: alignment.map(value => value.textAlign),
    textBaseline: alignment.map(value => value.textBaseline)
  });
}

function radialVectors(angle) {
  let direction;
  try {
    direction = polarDirection(angle);
  } catch {
    throw new TypeError("Radial-axis angle must be finite degrees.");
  }
  return {
    direction,
    normal: { x: -direction.y, y: direction.x }
  };
}

export function resolveRadialAxisLine({ frame, angle }) {
  validateFrame(frame);
  const { direction } = radialVectors(angle);
  return own({
    x1: frame.centerX,
    y1: frame.centerY,
    x2: frame.centerX + direction.x * frame.availableRadius,
    y2: frame.centerY + direction.y * frame.availableRadius
  });
}

export function resolveRadialAxisTicks({ frame, angle, radii, length }) {
  validateFrame(frame);
  validateFiniteValues(radii, "Radial-axis tick radii");
  validateNonNegative(length, "Radial-axis tick length");
  if (radii.some(radius => radius < 0 || radius > frame.availableRadius)) {
    throw new RangeError("Radial-axis tick radii must be inside the Polar frame.");
  }
  const { direction, normal } = radialVectors(angle);
  const half = length / 2;
  const centers = radii.map(radius => ({
    x: frame.centerX + direction.x * radius,
    y: frame.centerY + direction.y * radius
  }));
  return own({
    x1: centers.map(point => point.x - normal.x * half),
    y1: centers.map(point => point.y - normal.y * half),
    x2: centers.map(point => point.x + normal.x * half),
    y2: centers.map(point => point.y + normal.y * half)
  });
}

export function resolveRadialAxisLabels({ frame, angle, radii, offset }) {
  validateFrame(frame);
  validateFiniteValues(radii, "Radial-axis label radii");
  validateNonNegative(offset, "Radial-axis label offset");
  if (radii.some(radius => radius < 0 || radius > frame.availableRadius)) {
    throw new RangeError("Radial-axis label radii must be inside the Polar frame.");
  }
  const { direction, normal } = radialVectors(angle);
  return own({
    x: radii.map(radius =>
      frame.centerX + direction.x * radius - normal.x * offset
    ),
    y: radii.map(radius =>
      frame.centerY + direction.y * radius - normal.y * offset
    ),
    textAlign: radii.map(() => "center"),
    textBaseline: radii.map(() => "bottom")
  });
}

export function resolveRadialAxisTitle({
  frame,
  angle,
  radius = frame.availableRadius / 2,
  offset,
  position = "inside"
}) {
  validateFrame(frame);
  validateNonNegative(offset, "Radial-axis title offset");
  if (!["inside", "outside"].includes(position)) {
    throw new Error(`Unknown radial-axis title position "${position}".`);
  }
  if (position === "outside") {
    const { direction } = radialVectors(angle);
    return own({
      x: frame.centerX + direction.x * (frame.availableRadius + offset),
      y: frame.centerY + direction.y * (frame.availableRadius + offset),
      textAlign: direction.x > 0.25
        ? "left"
        : direction.x < -0.25 ? "right" : "center",
      textBaseline: direction.y > 0.25
        ? "top"
        : direction.y < -0.25 ? "bottom" : "middle"
    });
  }
  validateNonNegative(radius, "Radial-axis title radius");
  if (radius > frame.availableRadius) {
    throw new RangeError("Radial-axis title radius must be inside the Polar frame.");
  }
  const { direction, normal } = radialVectors(angle);
  return own({
    x: frame.centerX + direction.x * radius + normal.x * offset,
    y: frame.centerY + direction.y * radius + normal.y * offset,
    textAlign: "center",
    textBaseline: "top"
  });
}

export function resolveThetaAxisTitle({ frame, offset }) {
  validateFrame(frame);
  validateNonNegative(offset, "Theta-axis title offset");
  return own({
    x: frame.centerX,
    y: frame.centerY + frame.availableRadius + offset,
    textAlign: "center",
    textBaseline: "middle"
  });
}
