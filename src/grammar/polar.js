import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateOptionObject } from "../core/validation.js";
import { validatePair } from "./scales/validation.js";

const POLAR_FRAME_OPTIONS = Object.freeze(["center", "radius"]);
const POLAR_CENTER_OPTIONS = Object.freeze(["x", "y"]);
const POLAR_RADIUS_OPTIONS = Object.freeze(["unit", "value"]);
const POLAR_RADIUS_UNITS = new Set(["fraction", "px"]);

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

function finiteUnitInterval(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${label} must be a finite number from 0 through 1.`);
  }
  return value;
}

export function normalizePolarFrameOptions(value) {
  if (value === "auto") return value;
  if (!isPlainObject(value)) {
    throw new TypeError('Polar frame must be "auto" or a plain object.');
  }
  validateOptionObject(value, POLAR_FRAME_OPTIONS, "polar frame");
  const center = value.center ?? {};
  if (!isPlainObject(center)) {
    throw new TypeError("Polar frame center must be a plain object.");
  }
  validateOptionObject(center, POLAR_CENTER_OPTIONS, "polar frame center");
  const radius = value.radius ?? { unit: "fraction", value: 1 };
  if (!isPlainObject(radius)) {
    throw new TypeError("Polar frame radius must be a plain object.");
  }
  validateOptionObject(radius, POLAR_RADIUS_OPTIONS, "polar frame radius", {
    allowEmpty: false,
    emptyError: TypeError
  });
  if (!POLAR_RADIUS_UNITS.has(radius.unit)) {
    throw new Error(`Unknown Polar frame radius unit "${radius.unit}".`);
  }
  if (!Number.isFinite(radius.value) || radius.value <= 0) {
    throw new RangeError("Polar frame radius must be a positive finite number.");
  }
  if (radius.unit === "fraction" && radius.value > 1) {
    throw new RangeError("Polar frame radius fraction must not exceed 1.");
  }
  return cloneAndFreeze({
    center: {
      x: finiteUnitInterval(center.x ?? 0.5, "Polar frame center x"),
      y: finiteUnitInterval(center.y ?? 0.5, "Polar frame center y")
    },
    radius: {
      unit: radius.unit,
      value: radius.value
    }
  });
}

export function resolvePolarFrame(bounds, requestedFrame = "auto") {
  validateBounds(bounds);
  if (requestedFrame === undefined || requestedFrame === "auto") {
    return cloneAndFreeze({
      centerX: bounds.x + bounds.width / 2,
      centerY: bounds.y + bounds.height / 2,
      availableRadius: Math.min(bounds.width, bounds.height) / 2
    });
  }
  const requested = normalizePolarFrameOptions(requestedFrame);
  const centerX = bounds.x + bounds.width * requested.center.x;
  const centerY = bounds.y + bounds.height * requested.center.y;
  const maximumRadius = Math.min(
    centerX - bounds.x,
    bounds.x + bounds.width - centerX,
    centerY - bounds.y,
    bounds.y + bounds.height - centerY
  );
  if (!Number.isFinite(maximumRadius) || maximumRadius <= 0) {
    throw new RangeError(
      "Polar frame center must leave a positive radius inside its bounds."
    );
  }
  const availableRadius = requested.radius.unit === "fraction"
    ? maximumRadius * requested.radius.value
    : requested.radius.value;
  if (availableRadius > maximumRadius) {
    throw new RangeError(
      `Polar frame radius ${availableRadius} exceeds the maximum radius ${maximumRadius}.`
    );
  }
  return cloneAndFreeze({
    centerX,
    centerY,
    availableRadius
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

export function resolvePolarScaleRange(range, channel, bounds, frame) {
  if (channel === "theta") {
    return range === "auto"
      ? cloneAndFreeze([0, 360])
      : validateThetaRange(range);
  }
  if (channel !== "radius") {
    throw new Error(`Unknown Polar position channel "${channel}".`);
  }
  const resolvedFrame = frame ?? resolvePolarFrame(bounds);
  return range === "auto"
    ? cloneAndFreeze([0, resolvedFrame.availableRadius])
    : validateRadialRange(range, resolvedFrame.availableRadius);
}

export function polarDirection(theta) {
  if (!Number.isFinite(theta)) {
    throw new TypeError("Polar theta must be a finite number of degrees.");
  }
  const angle = theta * Math.PI / 180;
  return cloneAndFreeze({
    x: Math.sin(angle),
    y: -Math.cos(angle)
  });
}

export function polarToCartesian({ theta, radius, frame }) {
  const direction = polarDirection(theta);
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
  return cloneAndFreeze({
    x: resolvedFrame.centerX + radius * direction.x,
    y: resolvedFrame.centerY + radius * direction.y
  });
}
