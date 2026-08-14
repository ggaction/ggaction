import {
  requireFiniteBounds,
  resolveTextBounds
} from "../../core/textMetrics.js";
import { interpolateNumber } from "../numeric.js";
import {
  findGraphic,
  findGraphicParent,
  requireGraphic
} from "./graphicTree.js";

const EPSILON = Number.EPSILON * 64;

function box(left, right, top, bottom, extent = 0) {
  return {
    left: left - extent,
    right: right + extent,
    top: top - extent,
    bottom: bottom + extent
  };
}

function includeExtent(result, left, right, top, bottom) {
  if (result === undefined) return { left, right, top, bottom };
  result.left = Math.min(result.left, left);
  result.right = Math.max(result.right, right);
  result.top = Math.min(result.top, top);
  result.bottom = Math.max(result.bottom, bottom);
  return result;
}

function unionBounds(bounds) {
  let result;
  for (const item of bounds) {
    if (item !== undefined) {
      result = includeExtent(
        result, item.left, item.right, item.top, item.bottom
      );
    }
  }
  return result;
}

function cubicValue(start, control1, control2, end, t) {
  const remaining = 1 - t;
  if (Math.max(
    Math.abs(start),
    Math.abs(control1),
    Math.abs(control2),
    Math.abs(end)
  ) <= Number.MAX_VALUE / 4) {
    return remaining ** 3 * start +
      3 * remaining ** 2 * t * control1 +
      3 * remaining * t ** 2 * control2 +
      t ** 3 * end;
  }
  const left = interpolateNumber(start, control1, t);
  const middle = interpolateNumber(control1, control2, t);
  const right = interpolateNumber(control2, end, t);
  return interpolateNumber(
    interpolateNumber(left, middle, t),
    interpolateNumber(middle, right, t),
    t
  );
}

function cubicExtrema(start, control1, control2, end) {
  let scale = Math.max(
    Math.abs(start),
    Math.abs(control1),
    Math.abs(control2),
    Math.abs(end)
  );
  const normalizeCoordinates = scale > Number.MAX_VALUE / 24 ||
    (scale > 0 && scale < EPSILON);
  if (normalizeCoordinates) {
    start /= scale;
    control1 /= scale;
    control2 /= scale;
    end /= scale;
  }
  let quadratic = 3 * (-start + 3 * control1 - 3 * control2 + end);
  let linear = 2 * (3 * start - 6 * control1 + 3 * control2);
  let constant = 3 * (control1 - start);
  scale = Math.max(
    Math.abs(quadratic),
    Math.abs(linear),
    Math.abs(constant)
  );
  let epsilon = EPSILON * Math.max(normalizeCoordinates ? 0 : 1, scale);
  if (scale > Math.sqrt(Number.MAX_VALUE) / 2) {
    quadratic /= scale;
    linear /= scale;
    constant /= scale;
    epsilon = EPSILON;
  }
  if (Math.abs(quadratic) <= epsilon) {
    if (Math.abs(linear) <= epsilon) return [];
    const root = -constant / linear;
    return root > 0 && root < 1 ? [root] : [];
  }
  const discriminant = linear ** 2 - 4 * quadratic * constant;
  if (discriminant < -epsilon) return [];
  const root = Math.sqrt(Math.max(0, discriminant));
  return [
    (-linear - root) / (2 * quadratic),
    (-linear + root) / (2 * quadratic)
  ].filter(value => value > 0 && value < 1);
}

export function resolvePathCommandBounds(commands) {
  let bounds;
  let current;
  for (const command of commands) {
    if (command.op === "M" || command.op === "L") {
      if ([command.x, command.y].every(Number.isFinite)) {
        current = { x: command.x, y: command.y };
        bounds = includeExtent(
          bounds, current.x, current.x, current.y, current.y
        );
      }
      continue;
    }
    if (command.op !== "C" || current === undefined) continue;
    if (![command.x1, command.y1, command.x2, command.y2, command.x, command.y]
      .every(Number.isFinite)) continue;
    const roots = new Set([
      0,
      1,
      ...cubicExtrema(current.x, command.x1, command.x2, command.x),
      ...cubicExtrema(current.y, command.y1, command.y2, command.y)
    ]);
    for (const t of roots) {
      const x = cubicValue(current.x, command.x1, command.x2, command.x, t);
      const y = cubicValue(current.y, command.y1, command.y2, command.y, t);
      bounds = includeExtent(
        bounds,
        x,
        x,
        y,
        y
      );
    }
    current = { x: command.x, y: command.y };
  }
  return bounds;
}

function endpointDirection(start, command, end, reverse = false) {
  const endpoint = reverse ? end : start;
  const candidates = command.op === "C"
    ? reverse
      ? [{ x: command.x2, y: command.y2 },
          { x: command.x1, y: command.y1 }, start]
      : [{ x: command.x1, y: command.y1 },
          { x: command.x2, y: command.y2 }, end]
    : [reverse ? start : end];
  const sign = reverse ? -1 : 1;
  for (const point of candidates) {
    let x = (point.x - endpoint.x) * sign;
    let y = (point.y - endpoint.y) * sign;
    let length = Math.hypot(x, y);
    if (length === Infinity) {
      const scale = Math.max(
        Math.abs(point.x), Math.abs(point.y),
        Math.abs(endpoint.x), Math.abs(endpoint.y)
      );
      x = (point.x / scale - endpoint.x / scale) * sign;
      y = (point.y / scale - endpoint.y / scale) * sign;
      length = Math.hypot(x, y);
    }
    if (length !== 0) return { x: x / length, y: y / length };
  }
  return undefined;
}

function includeMiter(bounds, point, incoming, outgoing, strokeExtent) {
  if (incoming === undefined || outgoing === undefined) return;
  const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
  if (Math.abs(cross) <= EPSILON) return;
  const normalX = -incoming.y - outgoing.y;
  const normalY = incoming.x + outgoing.x;
  const normalLength = Math.hypot(normalX, normalY);
  const ratio = 2 / normalLength;
  if (ratio > 10 * (1 + EPSILON)) return;
  const distance = strokeExtent * ratio * (cross > 0 ? -1 : 1) / normalLength;
  includeExtent(
    bounds,
    point.x + normalX * distance,
    point.x + normalX * distance,
    point.y + normalY * distance,
    point.y + normalY * distance
  );
}

function pathStrokeBounds(commands, bounds, strokeExtent) {
  const expanded = box(
    bounds.left, bounds.right, bounds.top, bounds.bottom, strokeExtent
  );
  if (!(strokeExtent > 0)) return expanded;
  const start = { x: commands[0].x, y: commands[0].y };
  let current = start;
  let firstDirection;
  let previousDirection;
  let segmentCount = 0;
  for (const command of commands.slice(1)) {
    const end = command.op === "Z"
      ? start
      : { x: command.x, y: command.y };
    const outgoing = endpointDirection(current, command, end);
    const incoming = endpointDirection(current, command, end, true);
    if (outgoing !== undefined || incoming !== undefined) {
      if (segmentCount > 0) {
        includeMiter(expanded, current, previousDirection, outgoing, strokeExtent);
      } else {
        firstDirection = outgoing;
      }
      previousDirection = incoming;
      segmentCount += 1;
    }
    current = end;
    if (command.op === "Z") break;
  }
  if (commands.at(-1)?.op === "Z" && segmentCount > 1) {
    includeMiter(
      expanded,
      start,
      previousDirection,
      firstDirection,
      strokeExtent
    );
  }
  return expanded;
}

function primitiveBounds(type, properties = {}) {
  const strokeExtent = (properties.strokeWidth ?? 0) / 2;
  if (type === "circle") {
    if (![properties.x, properties.y, properties.radius].every(Number.isFinite)) {
      return undefined;
    }
    const radius = properties.radius + strokeExtent;
    return box(
      properties.x - radius,
      properties.x + radius,
      properties.y - radius,
      properties.y + radius
    );
  }
  if (type === "rect") {
    if (![properties.x, properties.y, properties.width, properties.height]
      .every(Number.isFinite)) return undefined;
    return box(
      properties.x,
      properties.x + properties.width,
      properties.y,
      properties.y + properties.height,
      strokeExtent
    );
  }
  if (type === "line") {
    if (![properties.x1, properties.y1, properties.x2, properties.y2]
      .every(Number.isFinite)) return undefined;
    return box(
      Math.min(properties.x1, properties.x2),
      Math.max(properties.x1, properties.x2),
      Math.min(properties.y1, properties.y2),
      Math.max(properties.y1, properties.y2),
      strokeExtent
    );
  }
  if (type === "text") {
    if (
      !Number.isFinite(properties.x) ||
      !Number.isFinite(properties.y) ||
      !Number.isFinite(properties.fontSize) ||
      typeof properties.text !== "string"
    ) return undefined;
    return resolveTextBounds(properties);
  }
  if (type === "path") {
    const commands = properties.commands;
    if (!Array.isArray(commands)) return undefined;
    const bounds = resolvePathCommandBounds(commands);
    if (bounds === undefined) return undefined;
    return pathStrokeBounds(commands, bounds, strokeExtent);
  }
  return undefined;
}

function translateBounds(bounds, x, y) {
  if (bounds === undefined) return undefined;
  return box(
    bounds.left + x,
    bounds.right + x,
    bounds.top + y,
    bounds.bottom + y
  );
}

function canvasOffset(object, property) {
  const value = object.type === "canvas" ? object.properties?.[property] : 0;
  return Number.isFinite(value) ? value : 0;
}

function ancestorOffset(graphicSpec, target) {
  const offset = [0, 0];
  const visited = new Set();
  let current = target;
  while (true) {
    if (visited.has(current)) {
      throw new Error(`Graphic attachment cycle includes "${current}".`);
    }
    visited.add(current);
    const parent = findGraphicParent(graphicSpec, current);
    if (parent === undefined) return offset;
    offset[0] += canvasOffset(parent.object, "x");
    offset[1] += canvasOffset(parent.object, "y");
    current = parent.id;
  }
}

function objectBounds(graphicSpec, id, object, ancestors, x, y) {
  if (ancestors.has(id)) {
    throw new Error(`Graphic attachment cycle includes "${id}".`);
  }
  ancestors.add(id);
  let result = object.items === undefined
    ? translateBounds(primitiveBounds(object.type, object.properties), x, y)
    : unionBounds(object.items.map(item => translateBounds(
        primitiveBounds(item.type ?? object.type, item.properties),
        x,
        y
      )));
  const childX = x + canvasOffset(object, "x");
  const childY = y + canvasOffset(object, "y");
  for (const childId of object.children ?? []) {
    const child = findGraphic(graphicSpec, childId);
    if (child?.kind !== "object") {
      throw new Error(`Unknown attached graphic "${childId}".`);
    }
    const bounds = objectBounds(
      graphicSpec, childId, child.object, ancestors, childX, childY
    );
    if (bounds !== undefined) {
      result = includeExtent(
        result, bounds.left, bounds.right, bounds.top, bounds.bottom
      );
    }
  }
  ancestors.delete(id);
  return result;
}

export function resolveConcreteGraphicBounds(graphicSpec, target) {
  const found = requireGraphic(graphicSpec, target);
  const [x, y] = ancestorOffset(graphicSpec, target);
  return requireFiniteBounds(found.kind === "item"
    ? translateBounds(
      primitiveBounds(found.object.type ?? found.owner.type, found.object.properties),
      x,
      y
    )
    : objectBounds(graphicSpec, found.id, found.object, new Set(), x, y));
}

export function unionConcreteGraphicBounds(graphicSpec, targets) {
  if (!Array.isArray(targets)) {
    throw new TypeError("Graphic bounds targets must be an array.");
  }
  return unionBounds(targets.map(target =>
    resolveConcreteGraphicBounds(graphicSpec, target)
  ));
}
