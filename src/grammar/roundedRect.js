import { freezeOwned, isPlainObject } from "../core/immutable.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "./strokeStyle.js";

export const ROUNDED_RECT_K = 4 * (Math.sqrt(2) - 1) / 3;
export const RECT_STYLE_PROPERTIES = Object.freeze([
  "cornerRadius",
  ...STROKE_STYLE_PROPERTIES
]);

function requireFinite(value, property) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Rounded rect ${property} must be a finite number.`);
  }
  return value;
}

export function validateCornerRadius(value, label = "Rect style") {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} cornerRadius must be a finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${label} cornerRadius must not be negative.`);
  }
  return value;
}

export function requestedRectStyleDetails(request = {}, label = "Rect style") {
  if (!isPlainObject(request)) {
    throw new TypeError(`${label} details must be a plain object.`);
  }
  return freezeOwned({
    ...requestedStrokeDetails(request, label),
    ...(Object.hasOwn(request, "cornerRadius")
      ? { cornerRadius: validateCornerRadius(request.cornerRadius, label) }
      : {})
  });
}

export function normalizeRectGeometry({ x, y, width, height }) {
  x = requireFinite(x, "x");
  y = requireFinite(y, "y");
  width = requireFinite(width, "width");
  height = requireFinite(height, "height");
  if (width < 0) {
    x += width;
    width = -width;
  }
  if (height < 0) {
    y += height;
    height = -height;
  }
  return freezeOwned({ x, y, width, height });
}

export function resolveRoundedRectRadius(width, height, requestedRadius) {
  requireFinite(width, "width");
  requireFinite(height, "height");
  validateCornerRadius(requestedRadius, "Rounded rect");
  if (width < 0 || height < 0) {
    throw new RangeError("Rounded rect width and height must not be negative.");
  }
  return Math.min(requestedRadius, width / 2, height / 2);
}

export function roundedRectCommands({ x, y, width, height, radius }) {
  const geometry = normalizeRectGeometry({ x, y, width, height });
  const r = resolveRoundedRectRadius(
    geometry.width,
    geometry.height,
    radius
  );
  if (!(r > 0)) {
    throw new RangeError("Rounded rect commands require a positive resolved radius.");
  }
  const right = geometry.x + geometry.width;
  const bottom = geometry.y + geometry.height;
  const c = ROUNDED_RECT_K * r;
  return freezeOwned([
    { op: "M", x: geometry.x + r, y: geometry.y },
    { op: "L", x: right - r, y: geometry.y },
    {
      op: "C",
      x1: right - r + c,
      y1: geometry.y,
      x2: right,
      y2: geometry.y + r - c,
      x: right,
      y: geometry.y + r
    },
    { op: "L", x: right, y: bottom - r },
    {
      op: "C",
      x1: right,
      y1: bottom - r + c,
      x2: right - r + c,
      y2: bottom,
      x: right - r,
      y: bottom
    },
    { op: "L", x: geometry.x + r, y: bottom },
    {
      op: "C",
      x1: geometry.x + r - c,
      y1: bottom,
      x2: geometry.x,
      y2: bottom - r + c,
      x: geometry.x,
      y: bottom - r
    },
    { op: "L", x: geometry.x, y: geometry.y + r },
    {
      op: "C",
      x1: geometry.x,
      y1: geometry.y + r - c,
      x2: geometry.x + r - c,
      y2: geometry.y,
      x: geometry.x + r,
      y: geometry.y
    },
    { op: "Z" }
  ].map(command => freezeOwned(command)));
}

export function materializeRectItem(properties, requestedRadius = 0) {
  if (!isPlainObject(properties)) {
    throw new TypeError("Rounded rect item properties must be a plain object.");
  }
  const geometry = normalizeRectGeometry(properties);
  const radius = resolveRoundedRectRadius(
    geometry.width,
    geometry.height,
    requestedRadius
  );
  const appearance = Object.fromEntries(Object.entries(properties).filter(
    ([key]) => !["x", "y", "width", "height"].includes(key)
  ));
  return radius === 0
    ? freezeOwned({
        type: "rect",
        properties: freezeOwned({ ...geometry, ...appearance })
      })
    : freezeOwned({
        type: "path",
        properties: freezeOwned({
          commands: roundedRectCommands({ ...geometry, radius }),
          ...appearance
        })
      });
}

export function readRectItemGeometry(item) {
  if (!isPlainObject(item) || !isPlainObject(item.properties)) return undefined;
  if (item.type === "rect") {
    try {
      return normalizeRectGeometry(item.properties);
    } catch {
      return undefined;
    }
  }
  const commands = item.type === "path" ? item.properties.commands : undefined;
  if (
    !Array.isArray(commands) ||
    commands.length !== 10 ||
    commands.map(command => command?.op).join("") !== "MLCLCLCLCZ"
  ) return undefined;
  const geometry = {
    x: commands[7].x,
    y: commands[0].y,
    width: commands[2].x - commands[7].x,
    height: commands[4].y - commands[0].y
  };
  try {
    return normalizeRectGeometry(geometry);
  } catch {
    return undefined;
  }
}
