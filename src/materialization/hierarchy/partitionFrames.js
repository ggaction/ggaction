import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { requireLayer } from "../../selectors/layers.js";
import { requireCoordinate } from "../../selectors/coordinates.js";
import { resolveCoordinatePolarFrame } from "../coordinateBounds.js";
import { createPartitionBendAdapter, samplePartitionBendPoint, partitionBendSegments } from "../../grammar/hierarchy/partitionAdapter.js";
import { interpolateNumber } from "../../grammar/numeric.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { pathFillContains, pathStrokeDistance } from "../../grammar/pathGeometry.js";
import { resolvePartitionPlot } from "./partitionPlot.js";

const plans = new WeakMap(), geometryKeys = new Set(["x", "y", "width", "height", "commands", "fillBounds"]);
const paint = graphic => Object.fromEntries(Object.entries(graphic.properties).filter(([key]) => !geometryKeys.has(key)));
const lerp = interpolateNumber;
function endpoint(program, target) {
  const layer = requireLayer(program, target);
  if (layer.mark.type !== "partition") throw new TypeError("Partition frame endpoints require partition marks.");
  const config = program.markConfigs[target].hierarchyPlot, resolved = resolvePartitionPlot(program, layer, config);
  const coordinate = requireCoordinate(program, layer.coordinate);
  const concrete = program.graphicSpec.objects[target];
  if (!concrete?.items) throw new TypeError("Partition frame endpoints require materialized graphics.");
  const geometry = graphics => graphics.map(graphic => ({ type: graphic.type, key: graphic.identity?.key, role: graphic.identity?.role,
    properties: Object.fromEntries([...geometryKeys].filter(key => Object.hasOwn(graphic.properties, key)).map(key => [key, graphic.properties[key]])) }))
    .sort((a, b) => JSON.stringify([a.key, a.role]) < JSON.stringify([b.key, b.role]) ? -1 : 1);
  return { ...resolved, graphics: concrete.items, editedGeometry: JSON.stringify(geometry(resolved.graphics)) !== JSON.stringify(geometry(concrete.items)),
    config, coordinate, ...(coordinate.type === "polar" ? { polar: resolveCoordinatePolarFrame(program, coordinate.id) } : {}),
    clip: concrete.clip || null };
}
function comparable(endpoint) {
  return endpoint.graphics.map(graphic => ({ key: graphic.identity.key, role: graphic.identity.role, paint: paint(graphic) }));
}
function group(endpoint, opacity) { return { graphics: endpoint.graphics, clip: endpoint.clip, opacity }; }
function nativeFrame(endpoint, progress, mode, reason) {
  return cloneAndFreeze({ progress, mode, ...(reason ? { reason } : {}), groups: [group(endpoint, 1)] });
}

// Private preparation for the later animation planner. No new authoring state,
// public animation method, resource revision or renderer-side computation.
export function createPartitionFramePlan(before, after, options) {
  ownRecord(options, "Partition frame options"); rejectUnknownProperties(options, ["target"], "partition frame");
  const from = endpoint(before, options.target), to = endpoint(after, options.target);
  let reason;
  const fromKeys = from.graphics.map(graphic => [graphic.identity.key, graphic.identity.role]);
  const toKeys = to.graphics.map(graphic => [graphic.identity.key, graphic.identity.role]);
  if (JSON.stringify(fromKeys) !== JSON.stringify(toKeys)) reason = "topology";
  else if (from.editedGeometry || to.editedGeometry) reason = "graphic-edit";
  else if (from.coordinate.type === to.coordinate.type) reason = "coordinate-family";
  else if (Boolean(from.clip) !== Boolean(to.clip)) reason = "clip";
  else if (from.config.mapping.radiusPolicy !== to.config.mapping.radiusPolicy) reason = "radius-policy";
  else if ([...from.graphics, ...to.graphics].some(graphic => typeof graphic.properties.fill === "object") ||
      JSON.stringify(comparable(from)) !== JSON.stringify(comparable(to))) reason = "appearance";
  const rectangle = from.coordinate.type === "cartesian" ? from : to, polar = from.coordinate.type === "polar" ? from : to;
  let adapter;
  if (!reason) {
    const r = rectangle.config.mapping, p = polar.config.mapping;
    adapter = createPartitionBendAdapter({ ...rectangle.frame, orientation: r.orientation, reverseU: r.reverseU, reverseV: r.reverseV }, {
      centerX: polar.polar.centerX, centerY: polar.polar.centerY, innerRadius: p.innerRadius,
      outerRadius: p.outerRadius === "auto" ? polar.polar.availableRadius : p.outerRadius,
      startAngle: p.startAngle, sweep: p.sweep, direction: p.direction, reverseU: p.reverseU, reverseV: p.reverseV, radiusPolicy: p.radiusPolicy
    });
    if (!adapter.compatible) reason = adapter.reason;
  }
  const plan = Object.freeze({ kind: "partition-frame-plan", mode: reason ? "crossfade" : "bend", ...(reason ? { reason } : {}) });
  plans.set(plan, { from, to, rectangle, polar, adapter, reverse: from.coordinate.type === "polar" });
  return plan;
}

function rectangleInterval(item, adapter) {
  const { x, y, width, height } = item.geometry, c = Math.cos(adapter.angle0), s = Math.sin(adapter.angle0);
  const points = [[x, y], [x + width, y + height]].map(([px, py]) => {
    const dx = px - adapter.origin[0], dy = py - adapter.origin[1];
    return { u: (c * dx + s * dy) / adapter.kernel.width + .5,
      v: adapter.handedness * (-s * dx + c * dy) / adapter.kernel.height };
  });
  return { u0: Math.min(...points.map(p => p.u)), u1: Math.max(...points.map(p => p.u)),
    v0: Math.min(...points.map(p => p.v)), v1: Math.max(...points.map(p => p.v)) };
}
function polarInterval(item, endpoint, adapter) {
  const { mapping } = endpoint.config, geometry = item.geometry;
  const sign = mapping.direction === "clockwise" ? 1 : -1, turn = sign * (mapping.reverseU ? -1 : 1);
  const center = (mapping.startAngle + sign * mapping.sweep / 2) * Math.PI / 180;
  const u = angle => (angle - center) / (turn * adapter.kernel.sweep) + .5;
  const { innerRadius, outerRadius, radiusPolicy } = adapter.kernel;
  const v = radius => radiusPolicy === "equal-depth-area" ? (radius ** 2 - innerRadius ** 2) / (outerRadius ** 2 - innerRadius ** 2)
    : (radius - innerRadius) / (outerRadius - innerRadius);
  return { u0: Math.min(u(geometry.startAngle), u(geometry.endAngle)), u1: Math.max(u(geometry.startAngle), u(geometry.endAngle)),
    v0: v(geometry.innerRadius), v1: v(geometry.outerRadius), anchorV: v((geometry.innerRadius + geometry.outerRadius) / 2) };
}
const unit = value => Math.max(0, Math.min(1, value));
function bentCell(rectangle, polar, adapter, bend, segments) {
  const interval = Object.fromEntries(["u0", "u1", "v0", "v1"].map(key => [key, unit(lerp(rectangle[key], polar[key], bend))]));
  const count = Math.max(1, Math.ceil((interval.u1 - interval.u0) * segments)), points = [];
  for (let i = 0; i <= count; i++) points.push(samplePartitionBendPoint(adapter, { u: lerp(interval.u0, interval.u1, i / count), v: interval.v0, bend }));
  for (let i = count; i >= 0; i--) points.push(samplePartitionBendPoint(adapter, { u: lerp(interval.u0, interval.u1, i / count), v: interval.v1, bend }));
  const anchor = samplePartitionBendPoint(adapter, { u: (interval.u0 + interval.u1) / 2,
    v: unit(lerp((rectangle.v0 + rectangle.v1) / 2, polar.anchorV, bend)), bend });
  return { commands: points.map((point, index) => ({ op: index ? "L" : "M", ...point })).concat({ op: "Z" }), anchor };
}

export function samplePartitionFrame(plan, progress, options = {}) {
  ownRecord(options, "Partition frame sample options"); rejectUnknownProperties(options, ["reducedMotion"], "partition frame sample");
  const { reducedMotion = false } = options;
  const state = plans.get(plan);
  if (!state) throw new TypeError("Unknown partition frame plan.");
  if (!Number.isFinite(progress) || progress < 0 || progress > 1 || typeof reducedMotion !== "boolean") throw new RangeError("Partition progress must be in [0,1] and reducedMotion must be boolean.");
  if (reducedMotion || progress === 1) return nativeFrame(state.to, 1, plan.mode, plan.reason);
  if (progress === 0) return nativeFrame(state.from, 0, plan.mode, plan.reason);
  if (plan.mode === "crossfade") return cloneAndFreeze({ progress, mode: plan.mode, reason: plan.reason,
    groups: [group(state.from, 1 - progress), group(state.to, progress)] });
  const { rectangle, polar, adapter } = state, bend = state.reverse ? 1 - progress : progress;
  const segments = partitionBendSegments(adapter, bend), rectItems = rectangle.items.filter(item => item.visible);
  validateWorkLimit(rectItems.length * (2 * (segments + 1) + 1), "Partition frame path work");
  const polarItems = new Map(polar.items.map(item => [item.key, item])), cells = new Map();
  for (const item of rectItems) cells.set(item.key, bentCell(rectangleInterval(item, adapter), polarInterval(polarItems.get(item.key), polar, adapter), adapter, bend, segments));
  const graphics = rectangle.graphics.map(graphic => {
    const cell = cells.get(graphic.identity.key), properties = paint(graphic);
    if (graphic.identity.role === "body") return { ...graphic, type: "path", properties: { ...properties, commands: cell.commands } };
    const offset = rectangle.config.labels.offset.map((value, index) => lerp(value, polar.config.labels.offset[index], bend));
    return { ...graphic, properties: { ...properties, x: cell.anchor.x + offset[0], y: cell.anchor.y + offset[1] } };
  });
  validateGeneratedItemLimit(graphics.length, "Partition frame graphics");
  for (const graphic of graphics) validateConcreteGraphicProperties(graphic.type, graphic.properties);
  const clip = rectangle.clip && polar.clip ? Object.fromEntries(["x", "y", "width", "height"].map(key => [key, lerp(rectangle.clip[key], polar.clip[key], bend)]))
    : rectangle.clip ?? polar.clip;
  return cloneAndFreeze({ progress, mode: "bend", tolerance: .2, groups: [{ graphics, clip, opacity: 1 }] });
}

function rectangleCommands(p) {
  return [{ op: "M", x: p.x, y: p.y }, { op: "L", x: p.x + p.width, y: p.y }, { op: "L", x: p.x + p.width, y: p.y + p.height }, { op: "L", x: p.x, y: p.y + p.height }, { op: "Z" }];
}
export function hitPartitionFrame(frame, point) {
  ownRecord(point, "Partition hit point"); rejectUnknownProperties(point, ["x", "y"], "partition hit point");
  if (![point.x, point.y].every(Number.isFinite)) throw new TypeError("Partition hit point must be finite.");
  ownArray(frame.groups, "Partition frame groups"); validateGeneratedItemLimit(frame.groups.length, "Partition frame groups");
  for (const group of [...frame.groups].reverse()) {
    const c = group.clip;
    if (group.opacity <= 0 || c && (point.x < c.x || point.y < c.y || point.x > c.x + c.width || point.y > c.y + c.height)) continue;
    for (const graphic of [...group.graphics].reverse()) {
      if (graphic.identity.role !== "body" || graphic.properties.opacity === 0) continue;
      const p = graphic.properties, commands = graphic.type === "rect" ? rectangleCommands(p) : p.commands;
      if (p.fill !== "none" && pathFillContains(commands, point, { tolerance: .01 }) ||
          p.stroke !== "none" && p.strokeWidth > 0 && pathStrokeDistance(commands, point, { tolerance: .01 }) <= p.strokeWidth / 2) {
        return cloneAndFreeze({ key: graphic.identity.key, lineage: graphic.identity.lineage });
      }
    }
  }
  return null;
}
