import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validatePair } from "./scales/validation.js";

function validateBounds(bounds) {
  if (
    !isPlainObject(bounds) ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    bounds.width < 0 ||
    bounds.height < 0
  ) {
    throw new TypeError(
      "Polar geometry requires finite, non-negative graphical bounds."
    );
  }
  return bounds;
}

export function resolvePolarFrame(bounds) {
  validateBounds(bounds);
  return cloneAndFreeze({
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
    availableRadius: Math.min(bounds.width, bounds.height) / 2
  });
}

export function validateThetaRange(range) {
  if (range === "auto") return range;
  const validated = validatePair(range, "Theta scale range");
  if (Math.abs(validated[1] - validated[0]) > 360) {
    throw new RangeError("Theta scale range span must not exceed 360 degrees.");
  }
  return validated;
}

export function validateRadialRange(range, availableRadius) {
  if (range === "auto") return range;
  const validated = validatePair(range, "Radius scale range");
  if (validated.some(value => value < 0)) {
    throw new RangeError("Radius scale range values must be non-negative.");
  }
  if (
    availableRadius !== undefined &&
    validated.some(value => value > availableRadius)
  ) {
    throw new RangeError(
      `Radius scale range must fit within the available radius ${availableRadius}.`
    );
  }
  return validated;
}

export function resolvePolarScaleRange(range, channel, bounds) {
  if (channel === "theta") {
    return range === "auto"
      ? cloneAndFreeze([0, 360])
      : validateThetaRange(range);
  }
  if (channel !== "radius") {
    throw new Error(`Unknown Polar position channel "${channel}".`);
  }
  const frame = resolvePolarFrame(bounds);
  return range === "auto"
    ? cloneAndFreeze([0, frame.availableRadius])
    : validateRadialRange(range, frame.availableRadius);
}

export function polarToCartesian({ theta, radius, frame }) {
  if (!Number.isFinite(theta)) {
    throw new TypeError("Polar theta must be a finite number of degrees.");
  }
  if (!Number.isFinite(radius) || radius < 0) {
    throw new TypeError("Polar radius must be a non-negative finite number.");
  }
  const resolvedFrame = frame?.availableRadius === undefined
    ? resolvePolarFrame(frame)
    : frame;
  if (
    ![resolvedFrame.centerX, resolvedFrame.centerY,
      resolvedFrame.availableRadius].every(Number.isFinite)
  ) {
    throw new TypeError("Polar frame must contain finite geometry.");
  }
  if (radius > resolvedFrame.availableRadius) {
    throw new RangeError(
      `Polar radius ${radius} exceeds the available radius ${resolvedFrame.availableRadius}.`
    );
  }
  const angle = theta * Math.PI / 180;
  return cloneAndFreeze({
    x: resolvedFrame.centerX + radius * Math.sin(angle),
    y: resolvedFrame.centerY - radius * Math.cos(angle)
  });
}
