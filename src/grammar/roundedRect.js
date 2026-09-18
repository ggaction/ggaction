import { freezeOwned, isPlainObject } from "../core/immutable.js";
import {
  requestedStrokeDetails,
  STROKE_STYLE_PROPERTIES
} from "./strokeStyle.js";

export const ROUNDED_RECT_K = 4 * (Math.sqrt(2) - 1) / 3;
export const RECT_RADIUS_PROPERTIES = Object.freeze([
  "cornerRadius", "cornerRadiusTopLeft", "cornerRadiusTopRight",
  "cornerRadiusBottomRight", "cornerRadiusBottomLeft"
]);
export const RECT_STYLE_PROPERTIES = Object.freeze([
  ...RECT_RADIUS_PROPERTIES,
  ...STROKE_STYLE_PROPERTIES
]);

function requireFinite(value, property) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`Rounded rect ${property} must be a finite number.`);
  }
  return value;
}

export function validateCornerRadius(value, label = "Rect style", property = "cornerRadius") {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} ${property} must be a finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${label} ${property} must not be negative.`);
  }
  return value;
}

export function requestedRectStyleDetails(request = {}, label = "Rect style") {
  if (!isPlainObject(request)) {
    throw new TypeError(`${label} details must be a plain object.`);
  }
  return freezeOwned({
    ...requestedStrokeDetails(request, label),
    ...Object.fromEntries(RECT_RADIUS_PROPERTIES
      .filter(property => Object.hasOwn(request, property))
      .map(property => [property, validateCornerRadius(request[property], label, property)]))
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

export function hasRectRadius(style = {}) {
  return RECT_RADIUS_PROPERTIES.some(property => Object.hasOwn(style, property));
}

function resolveCornerRadii(width, height, requested) {
  const style = typeof requested === "number" ? { cornerRadius: requested } : requested;
  const details = requestedRectStyleDetails(style, "Rounded rect");
  return RECT_RADIUS_PROPERTIES.slice(1).map(property => resolveRoundedRectRadius(
    width, height, details[property] ?? details.cornerRadius ?? 0
  ));
}

export function roundedRectCommands({ x, y, width, height, radius }) {
  const geometry = normalizeRectGeometry({ x, y, width, height });
  const [tl, tr, br, bl] = resolveCornerRadii(geometry.width, geometry.height, radius);
  if (![tl, tr, br, bl].some(value => value > 0)) {
    throw new RangeError("Rounded rect commands require a positive resolved radius.");
  }
  const right = geometry.x + geometry.width;
  const bottom = geometry.y + geometry.height;
  const k = ROUNDED_RECT_K;
  return freezeOwned([
    { op: "M", x: geometry.x + tl, y: geometry.y },
    { op: "L", x: right - tr, y: geometry.y },
    {
      op: "C", x1: right - tr + k * tr, y1: geometry.y,
      x2: right, y2: geometry.y + tr - k * tr, x: right, y: geometry.y + tr
    },
    { op: "L", x: right, y: bottom - br },
    {
      op: "C", x1: right, y1: bottom - br + k * br,
      x2: right - br + k * br, y2: bottom, x: right - br, y: bottom
    },
    { op: "L", x: geometry.x + bl, y: bottom },
    {
      op: "C", x1: geometry.x + bl - k * bl, y1: bottom,
      x2: geometry.x, y2: bottom - bl + k * bl, x: geometry.x, y: bottom - bl
    },
    { op: "L", x: geometry.x, y: geometry.y + tl },
    {
      op: "C", x1: geometry.x, y1: geometry.y + tl - k * tl,
      x2: geometry.x + tl - k * tl, y2: geometry.y, x: geometry.x + tl, y: geometry.y
    },
    { op: "Z" }
  ].map(command => freezeOwned(command)));
}

export function materializeRectItem(properties, requestedRadius = 0) {
  if (!isPlainObject(properties)) {
    throw new TypeError("Rounded rect item properties must be a plain object.");
  }
  const geometry = normalizeRectGeometry(properties);
  const radii = resolveCornerRadii(geometry.width, geometry.height, requestedRadius);
  const appearance = Object.fromEntries(Object.entries(properties).filter(
    ([key]) => !["x", "y", "width", "height"].includes(key)
  ));
  return radii.every(radius => radius === 0)
    ? freezeOwned({
        type: "rect",
        properties: freezeOwned({ ...geometry, ...appearance })
      })
    : freezeOwned({
        type: "path",
        properties: freezeOwned({
          commands: roundedRectCommands({ ...geometry, radius: requestedRadius }),
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
