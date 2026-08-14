import { resolveLinearGradientCoordinates } from "../../grammar/paint.js";
import { resolvePathCommandBounds } from
  "../../grammar/schemas/graphicBounds.js";
import { walkGraphicTreeEvents } from
  "../../grammar/schemas/graphicTree.js";
import { validateConcreteGraphicProperties } from
  "../../grammar/schemas/concreteGraphic.js";

const MAX_NATIVE_VALUE = 16_777_216;
const NATIVE_PROPERTIES = {
  canvas: ["x", "y", "width", "height"],
  circle: ["x", "y", "radius", "strokeWidth"],
  rect: ["x", "y", "width", "height", "strokeWidth"],
  line: ["x1", "y1", "x2", "y2", "strokeWidth"],
  path: ["strokeWidth"],
  text: ["x", "y", "fontSize"]
};
const COMMAND_PROPERTIES = ["x", "y", "x1", "y1", "x2", "y2"];

export function requireCanvasNativeValue(value, label, scale = 1, offset = 0) {
  const magnitude = Math.abs(value) + Math.abs(offset);
  const scaled = magnitude * scale;
  if (
    !Number.isFinite(value) || magnitude > MAX_NATIVE_VALUE ||
    !Number.isFinite(scaled) || scaled > MAX_NATIVE_VALUE
  ) {
    throw new RangeError(
      `${label} must be finite with magnitude <= ${MAX_NATIVE_VALUE}.`
    );
  }
}

function requireValues(values, label, scale) {
  for (const value of values) {
    requireCanvasNativeValue(value, label, scale);
  }
}

function requireProperties(properties, keys, label, scale, offset) {
  for (const key of keys) {
    const value = properties?.[key];
    if (value !== undefined) {
      requireCanvasNativeValue(
        value,
        label,
        scale,
        offset?.["xy".indexOf(key[0])]
      );
    }
  }
}

export function resolveCanvasGradientCoordinates(fill, bounds, graphicId, scale = 1) {
  const coordinates = resolveLinearGradientCoordinates(fill, bounds);
  requireValues([
    coordinates.from.x,
    coordinates.from.y,
    coordinates.to.x,
    coordinates.to.y,
    Math.hypot(
      coordinates.to.x - coordinates.from.x,
      coordinates.to.y - coordinates.from.y
    )
  ],
    `Graphic "${graphicId}" Canvas linear gradient geometry`,
    scale
  );
  return coordinates;
}

function preflightGraphic(id, graphic, scale, type, offset) {
  const properties = graphic.properties ?? {};
  const label = `Graphic "${id}" Canvas native geometry`;
  requireProperties(
    properties,
    NATIVE_PROPERTIES[type] ?? [],
    label,
    scale,
    offset
  );
  if (properties.rotation !== undefined) {
    requireCanvasNativeValue(properties.rotation, label);
  }
  if (Array.isArray(properties.strokeDash)) {
    requireValues(properties.strokeDash, label, scale);
  }
  const gradient = properties.fill?.type === "linear-gradient";

  let bounds;
  if (type === "canvas" || type === "rect" || type === "circle") {
    const circle = type === "circle";
    const width = circle ? properties.radius : properties.width;
    const height = circle ? properties.radius : properties.height;
    if ([properties.x, properties.y, width, height].every(Number.isFinite) &&
      width >= 0 && height >= 0) {
      bounds = {
        left: properties.x - (circle ? width : 0),
        right: properties.x + width,
        top: properties.y - (circle ? height : 0),
        bottom: properties.y + height
      };
      requireCanvasNativeValue(bounds.left, label, scale, offset?.[0]);
      requireCanvasNativeValue(bounds.right, label, scale, offset?.[0]);
      requireCanvasNativeValue(bounds.top, label, scale, offset?.[1]);
      requireCanvasNativeValue(bounds.bottom, label, scale, offset?.[1]);
    }
  }
  if (type === "path" && Array.isArray(properties.commands)) {
    for (const command of properties.commands) {
      requireProperties(command, COMMAND_PROPERTIES, label, scale, offset);
    }
    if (gradient) {
      bounds = resolvePathCommandBounds(properties.commands);
    }
  }
  if (gradient && bounds) {
    resolveCanvasGradientCoordinates(properties.fill, bounds, id, scale);
  }
  if (NATIVE_PROPERTIES[type] !== undefined) {
    validateConcreteGraphicProperties(type, properties);
  }
}

export function preflightCanvasGraphicSpec(target, scale = 1) {
  const offsets = [];
  walkGraphicTreeEvents(target.graphicSpec, {
    enter({ id, object }) {
      let offset = offsets.at(-1);
      if (object.type === "canvas") {
        const parent = offset ?? [0, 0];
        const properties = object.properties ?? {};
        const x = id === target.canvasId ? 0 : properties.x;
        const y = id === target.canvasId ? 0 : properties.y;
        const effective = [parent[0] + x, parent[1] + y];
        if (Number.isFinite(x) && Number.isFinite(y)) {
          requireValues(
            effective,
            `Graphic "${id}" Canvas nested translation`,
            scale
          );
        }
        offsets.push(effective);
        offset = id === target.canvasId ? undefined : parent;
      }
      preflightGraphic(id, object, scale, object.type, offset);
    },
    item({ id, object, owner }) {
      preflightGraphic(
        id,
        object,
        scale,
        object.type ?? owner.type,
        offsets.at(-1)
      );
    },
    exit({ object }) {
      if (object.type === "canvas") offsets.pop();
    }
  });
}
