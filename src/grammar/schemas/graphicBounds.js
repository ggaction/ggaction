import {
  requireFiniteBounds,
  resolveTextBounds
} from "../../core/textMetrics.js";
import { resolvePathSubpaths } from "../pathTopology.js";
import { resolvePathCommandBounds } from "../pathGeometry.js";
export { resolvePathCommandBounds } from "../pathGeometry.js";
import { graphicClipBounds, intersectClipBounds } from "./graphicClip.js";
import { resolveStrokeDetails } from "../strokeStyle.js";
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

function includeCircle(bounds, point, radius) {
  return includeExtent(
    bounds,
    point.x - radius,
    point.x + radius,
    point.y - radius,
    point.y + radius
  );
}

function includeEndpointCap(
  bounds,
  point,
  direction,
  strokeExtent,
  lineCap,
  atStart
) {
  if (lineCap === "butt" || direction === undefined) return bounds;
  if (lineCap === "round") {
    return includeCircle(bounds, point, strokeExtent);
  }
  const sign = atStart ? -1 : 1;
  const center = {
    x: point.x + direction.x * strokeExtent * sign,
    y: point.y + direction.y * strokeExtent * sign
  };
  const normal = { x: -direction.y, y: direction.x };
  return includeExtent(
    bounds,
    center.x - Math.abs(normal.x) * strokeExtent,
    center.x + Math.abs(normal.x) * strokeExtent,
    center.y - Math.abs(normal.y) * strokeExtent,
    center.y + Math.abs(normal.y) * strokeExtent
  );
}

function segmentStrokeBounds(start, end, strokeExtent, lineCap = "butt") {
  const command = { op: "L", x: end.x, y: end.y };
  const direction = endpointDirection(start, command, end);
  let bounds = includeExtent(
    undefined,
    start.x,
    start.x,
    start.y,
    start.y
  );
  bounds = includeExtent(bounds, end.x, end.x, end.y, end.y);
  if (direction === undefined) {
    return lineCap === "butt"
      ? bounds
      : includeCircle(bounds, start, strokeExtent);
  }
  const normal = { x: -direction.y, y: direction.x };
  for (const point of [start, end]) {
    bounds = includeExtent(
      bounds,
      point.x - Math.abs(normal.x) * strokeExtent,
      point.x + Math.abs(normal.x) * strokeExtent,
      point.y - Math.abs(normal.y) * strokeExtent,
      point.y + Math.abs(normal.y) * strokeExtent
    );
  }
  bounds = includeEndpointCap(
    bounds, start, direction, strokeExtent, lineCap, true
  );
  bounds = includeEndpointCap(
    bounds, end, direction, strokeExtent, lineCap, false
  );
  return bounds;
}

function includeJoin(
  bounds,
  point,
  incoming,
  outgoing,
  strokeExtent,
  lineJoin,
  miterLimit
) {
  if (incoming === undefined || outgoing === undefined) return;
  const cross = incoming.x * outgoing.y - incoming.y * outgoing.x;
  if (Math.abs(cross) <= EPSILON) return;
  if (lineJoin === "round") {
    includeCircle(bounds, point, strokeExtent);
    return;
  }
  if (lineJoin === "bevel") return;
  const normalX = -incoming.y - outgoing.y;
  const normalY = incoming.x + outgoing.x;
  const normalLength = Math.hypot(normalX, normalY);
  if (!(normalLength > EPSILON)) return;
  const ratio = 2 / normalLength;
  if (ratio > miterLimit * (1 + EPSILON)) return;
  const distance = strokeExtent * ratio * (cross > 0 ? -1 : 1) / normalLength;
  includeExtent(
    bounds,
    point.x + normalX * distance,
    point.x + normalX * distance,
    point.y + normalY * distance,
    point.y + normalY * distance
  );
}

function singlePathStrokeBounds(commands, bounds, strokeExtent, details) {
  if (!(strokeExtent > 0)) return bounds;
  const start = { x: commands[0].x, y: commands[0].y };
  let current = start;
  const segments = [];
  for (const command of commands.slice(1)) {
    const end = command.op === "Z"
      ? start
      : { x: command.x, y: command.y };
    const outgoing = endpointDirection(current, command, end);
    const incoming = endpointDirection(current, command, end, true);
    if (outgoing !== undefined || incoming !== undefined) {
      segments.push({
        start: current,
        end,
        command,
        outgoing,
        incoming
      });
    }
    current = end;
    if (command.op === "Z") break;
  }
  let expanded = bounds;
  // Zero-length drawable/close commands may paint endpoint caps in a backend.
  // A lone move has no stroked segment. Keep occupied bounds conservative.
  if (segments.length === 0 && commands.length > 1 && details.lineCap !== "butt") {
    return box(bounds.left, bounds.right, bounds.top, bounds.bottom, strokeExtent);
  }
  for (const segment of segments) {
    let segmentBounds;
    if (segment.command.op === "C") {
      const centerline = resolvePathCommandBounds([
        { op: "M", ...segment.start },
        segment.command
      ]);
      segmentBounds = box(
        centerline.left,
        centerline.right,
        centerline.top,
        centerline.bottom,
        strokeExtent
      );
    } else {
      segmentBounds = segmentStrokeBounds(
          segment.start,
          segment.end,
          strokeExtent,
          "butt"
      );
    }
    expanded = unionBounds([expanded, segmentBounds]);
  }
  for (let index = 1; index < segments.length; index += 1) {
    includeJoin(
      expanded,
      segments[index].start,
      segments[index - 1].incoming,
      segments[index].outgoing,
      strokeExtent,
      details.lineJoin,
      details.miterLimit
    );
  }
  const closed = commands.at(-1)?.op === "Z";
  if (closed && segments.length > 1) {
    includeJoin(
      expanded,
      start,
      segments.at(-1).incoming,
      segments[0].outgoing,
      strokeExtent,
      details.lineJoin,
      details.miterLimit
    );
  } else if (!closed && segments.length > 0) {
    expanded = includeEndpointCap(
      expanded,
      segments[0].start,
      segments[0].outgoing,
      strokeExtent,
      details.lineCap,
      true
    );
    expanded = includeEndpointCap(
      expanded,
      segments.at(-1).end,
      segments.at(-1).incoming,
      strokeExtent,
      details.lineCap,
      false
    );
  }
  return expanded;
}

function pathStrokeBounds(commands, bounds, strokeExtent, details) {
  if (!(strokeExtent > 0)) return bounds;
  return unionBounds(resolvePathSubpaths(commands).map(({ start, end }) => {
    const subpath = commands.slice(start, end + 1);
    return singlePathStrokeBounds(subpath, resolvePathCommandBounds(subpath), strokeExtent, details);
  }));
}

function hasActiveStroke(properties) {
  return typeof properties.stroke === "string" &&
    (properties.strokeWidth ?? 0) > 0;
}

export function resolvePrimitiveGraphicBounds(type, properties = {}, profile) {
  const strokeExtent = hasActiveStroke(properties)
    ? properties.strokeWidth / 2
    : 0;
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
  if (type === "rect" || type === "image") {
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
    return segmentStrokeBounds(
      { x: properties.x1, y: properties.y1 },
      { x: properties.x2, y: properties.y2 },
      strokeExtent,
      resolveStrokeDetails(properties).lineCap
    );
  }
  if (type === "text") {
    if (
      !Number.isFinite(properties.x) ||
      !Number.isFinite(properties.y) ||
      !Number.isFinite(properties.fontSize) ||
      typeof properties.text !== "string"
    ) return undefined;
    return resolveTextBounds(properties, profile);
  }
  if (type === "path") {
    const commands = properties.commands;
    if (!Array.isArray(commands)) return undefined;
    const bounds = resolvePathCommandBounds(commands);
    if (bounds === undefined) return undefined;
    return pathStrokeBounds(
      commands,
      bounds,
      strokeExtent,
      resolveStrokeDetails(properties)
    );
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

export function resolveGraphicParentOffset(graphicSpec, target) {
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

function intersectVisibleBounds(bounds,clip) {
  if(bounds===undefined)return undefined;
  const result={left:Math.max(bounds.left,clip.left),right:Math.min(bounds.right,clip.right),
    top:Math.max(bounds.top,clip.top),bottom:Math.min(bounds.bottom,clip.bottom)};
  return result.right<=result.left||result.bottom<=result.top?undefined:result;
}

function clipAncestorBounds(graphicSpec,id,bounds,includeOwnerClips) {
  let parent=findGraphicParent(graphicSpec,id);
  while(parent!==undefined){
    if (includeOwnerClips && parent.object.clip !== undefined) {
      bounds = intersectVisibleBounds(bounds, graphicClipBounds(parent.object.clip,
        ...resolveGraphicParentOffset(graphicSpec, parent.id)));
    }
    if(parent.object.type==="canvas"&&findGraphicParent(graphicSpec,parent.id)!==undefined){
      const [x,y]=resolveGraphicParentOffset(graphicSpec,parent.id),p=parent.object.properties;
      bounds=intersectVisibleBounds(bounds,{left:x+(p.x??0),right:x+(p.x??0)+p.width,top:y+(p.y??0),bottom:y+(p.y??0)+p.height});
    }
    parent=findGraphicParent(graphicSpec,parent.id);
  }
  return bounds;
}

// Effective rectangular visibility, including the named owner itself. Inspection
// can opt into the root viewport without changing geometry/selection properties.
export function resolveGraphicClipBounds(graphicSpec, target, {rootViewport = false} = {}) {
  const found = requireGraphic(graphicSpec, target);
  let current = found.kind === "item" ? found.ownerId : found.id;
  let clip;
  while (current !== undefined) {
    const object = graphicSpec.objects[current];
    const offset = resolveGraphicParentOffset(graphicSpec, current);
    const parent = findGraphicParent(graphicSpec, current);
    const local = object.clip !== undefined ? graphicClipBounds(object.clip, ...offset)
      : object.type === "canvas" && (parent !== undefined || rootViewport)
        ? graphicClipBounds({...object.properties, x: parent === undefined ? 0 : object.properties.x,
            y: parent === undefined ? 0 : object.properties.y}, ...offset) : undefined;
    if (local !== undefined) clip = clip === undefined ? local : intersectClipBounds(clip, local);
    current = parent?.id;
  }
  return clip;
}

function objectBounds(graphicSpec, id, object, ancestors, x, y, profile, includeOwnerClips) {
  if (ancestors.has(id)) {
    throw new Error(`Graphic attachment cycle includes "${id}".`);
  }
  ancestors.add(id);
  let result = object.items === undefined
    ? translateBounds(resolvePrimitiveGraphicBounds(object.type, object.properties, profile), x, y)
    : unionBounds(object.items.map(item => translateBounds(
        resolvePrimitiveGraphicBounds(item.type ?? object.type, item.properties, profile),
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
      graphicSpec, childId, child.object, ancestors, childX, childY, profile, includeOwnerClips
    );
    if (bounds !== undefined) {
      result = includeExtent(
        result, bounds.left, bounds.right, bounds.top, bounds.bottom
      );
    }
  }
  if(object.type==="canvas"&&findGraphicParent(graphicSpec,id)!==undefined){
    result=intersectVisibleBounds(result,{left:childX,right:childX+object.properties.width,
      top:childY,bottom:childY+object.properties.height});
  }
  if (includeOwnerClips && object.clip !== undefined) result = intersectVisibleBounds(result, graphicClipBounds(object.clip, x, y));
  ancestors.delete(id);
  return result;
}

export function resolveConcreteGraphicBounds(graphicSpec, target, profile, {includeOwnerClips = true} = {}) {
  const found = requireGraphic(graphicSpec, target);
  const anchor=found.kind==="item"?found.ownerId:found.id;
  const [x, y] = resolveGraphicParentOffset(graphicSpec, anchor);
  return requireFiniteBounds(clipAncestorBounds(graphicSpec,anchor,found.kind === "item"
    ? (!includeOwnerClips || found.owner.clip === undefined ? translateBounds(
      resolvePrimitiveGraphicBounds(found.object.type ?? found.owner.type, found.object.properties, profile),
      x,
      y
    ) : intersectVisibleBounds(translateBounds(
      resolvePrimitiveGraphicBounds(found.object.type ?? found.owner.type, found.object.properties, profile), x, y
    ), graphicClipBounds(found.owner.clip, x, y)))
    : objectBounds(graphicSpec, found.id, found.object, new Set(), x, y, profile, includeOwnerClips), includeOwnerClips));
}

export function unionConcreteGraphicBounds(graphicSpec, targets, profile, options) {
  if (!Array.isArray(targets)) {
    throw new TypeError("Graphic bounds targets must be an array.");
  }
  return unionBounds(targets.map(target =>
    resolveConcreteGraphicBounds(graphicSpec, target, profile, options)
  ));
}
