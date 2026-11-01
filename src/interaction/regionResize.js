import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { requireLayer } from "../selectors/layers.js";
import { resolveCoordinateBounds, resolveCoordinatePolarFrame } from "../materialization/coordinateBounds.js";
import { projectSelectionHandles } from "../grammar/selectionHandles.js";
import { normalizeSelectionRegion } from "../grammar/selectionRegion.js";
import { normalizeSelectionSelector } from "../grammar/selectionExpression.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { pathFillContains } from "../grammar/pathGeometry.js";
import { polarThetaAtPoint } from "../grammar/polar.js";
import { interactionOptions as options } from "./input.js";
import { programHitOwnerPlacement, programHitOwnerCollection } from "./hitProgram.js";
import { regionCoordinates } from "./regionCoordinates.js";
import { normalizeRegionBinding, resolveRegionBinding, regionScales, prepareRegionEntries, regionGestureCommand } from "./regionSelection.js";

const brush = binding => ({ ...binding, type: "brush" });
const within = (point, bounds) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;

export function normalizeResizeBinding(program, value, links) {
  const request = options(value, ["type", "target", "selection", "axis"], ["channels", "slop"], "Selection resize binding");
  if (!["x", "y", "xy", "theta"].includes(request.axis)) throw new TypeError("Selection resize requires an explicit x, y, xy or theta axis.");
  if (request.type !== "resize") throw new TypeError("Selection resize binding requires resize type.");
  const { slop, ...region } = request;
  const normalized = normalizeRegionBinding(program, { ...region, type: "brush", mode: "replace" }, links);
  const query = normalizeHitQuery(slop === undefined ? {} : { slop });
  return cloneAndFreeze({ ...normalized, type: "resize", axis: request.axis, ...(slop === undefined ? {} : { slop: query.slop }) });
}

export function resolveResizeBinding(program, binding, allowMissing = false) {
  return resolveRegionBinding(program, brush(binding), allowMissing);
}

function containsClip(clip, point, spend) {
  if (Array.isArray(clip)) return within(point, { x: clip[0], y: clip[1], width: clip[2], height: clip[3] });
  spend(clip.commands.length);
  return pathFillContains(clip.commands, point, { fillRule: clip.fillRule ?? "nonzero" });
}

function handleWork(account = () => {}) {
  let work = 0;
  return count => { validateWorkLimit(work += count, "Selection handle work"); account(count); };
}

function publicHandles(context, projected, spend) {
  if (projected === null) return Object.freeze([]);
  const { binding, coordinates, placement, collection, bounds } = context;
  const result = projected.handles.filter(entry => {
    spend(1);
    const root = coordinates.toRoot(entry.point);
    return within(entry.point, bounds) && containsClip(placement.clip, root, spend) &&
      containsClip(collection.clip, root, spend) && collection.clips.every(clip => containsClip(clip, root, spend));
  }).map(entry => ({ target: binding.target, selection: binding.selection, axis: binding.axis,
    handle: entry.handle, point: coordinates.toScreen(entry.point) }));
  for (let i = 0; i < result.length; i++) for (let j = 0; j < i; j++) {
    if (result[i].point.x === result[j].point.x && result[i].point.y === result[j].point.y) {
      throw new Error("Selection resize handles have ambiguous coincident coordinates.");
    }
  }
  return cloneAndFreeze(result);
}

export function prepareResizeHandles(program, binding, base, scene, rootTransform, displayed = base, account) {
  const spend = handleWork(account);
  const owner = resolveResizeBinding(program, binding, true);
  if (!owner || owner.resolved.selector.region === undefined) return null;
  const layer = requireLayer(owner.view, owner.target.id), bounds = resolveCoordinateBounds(owner.view, layer.coordinate);
  const scales = regionScales(owner, brush(binding)), placement = programHitOwnerPlacement(base, owner.target.childPath);
  const coordinates = regionCoordinates(scene, rootTransform, placement.offset);
  // Validate singular transforms even when all authored boundaries are hidden.
  coordinates.map({ x: 0, y: 0 });
  const polarFrame = binding.axis === "theta" ? resolveCoordinatePolarFrame(owner.view, layer.coordinate) : undefined;
  const input = { region: owner.resolved.selector.region, screenAngles: owner.resolved.selector.screenAngles,
    channels: binding.channels, scales, bounds, polarFrame };
  const projected = projectSelectionHandles(input, spend);
  if (projected === null) return null;
  const collection = programHitOwnerCollection(base, owner.target);
  prepareRegionEntries(program, owner, base, scene, rootTransform, displayed, true, spend);
  const context = { binding, owner, bounds, scales, polarFrame, coordinates, placement, collection, input, projected };
  const handles = publicHandles(context, projected, spend);
  return freezeOwned({ ...context, handles });
}

export function prepareResizeGesture(program, binding, base, scene, rootTransform, point, displayed, pointerType = "mouse") {
  const context = prepareResizeHandles(program, binding, base, scene, rootTransform, displayed);
  if (context === null) return null;
  const query = normalizeHitQuery({ pointerType, ...(binding.slop === undefined ? {} : { slop: binding.slop }) });
  let selected, distance = Infinity, ambiguous = false;
  for (const handle of context.handles) {
    const next = Math.hypot(point.x - handle.point.x, point.y - handle.point.y);
    if (next > query.slop) continue;
    if (next === distance) ambiguous = true;
    if (next < distance) { distance = next; selected = handle.handle; ambiguous = false; }
  }
  if (ambiguous) throw new Error("Selection resize hit has ambiguous equidistant handles.");
  return selected === undefined ? null : freezeOwned({ ...context, selected });
}

export function resizeGestureCommand(context, points) {
  const { binding, projected, coordinates, polarFrame } = context, spend = handleWork();
  const current = coordinates.map(points.at(-1));
  let start, end = current;
  if (polarFrame !== undefined) {
    const theta = polarThetaAtPoint(current, polarFrame);
    if (theta === null) throw new Error("Angular resize endpoint cannot be the Polar center.");
    const fixed = context.selected === "theta-start" ? projected.handles[1] : projected.handles[0];
    start = context.selected === "theta-start" ? current : fixed.point;
    end = context.selected === "theta-start" ? fixed.point : current;
  } else {
    start = { x: context.bounds.x, y: context.bounds.y };
    end = { x: context.bounds.x + context.bounds.width, y: context.bounds.y + context.bounds.height };
    for (const axis of Object.keys(binding.channels)) {
      const endpoints = projected.extents[axis];
      if (context.selected.includes(`${axis}-min`)) { start[axis] = projected.anchors[axis][1]; end[axis] = current[axis]; }
      else if (context.selected.includes(`${axis}-max`)) { start[axis] = projected.anchors[axis][0]; end[axis] = current[axis]; }
      else { start[axis] = endpoints[0]; end[axis] = endpoints[1]; }
    }
  }
  const result = regionGestureCommand({ ...context, ...coordinates, binding: brush(binding), start }, [coordinates.toScreen(end)]);
  const next = result.command.payload.select;
  if (polarFrame === undefined) {
    const region = { ...next.region };
    for (const [axis, channel] of Object.entries(binding.channels)) {
      if (!context.selected.includes(`${axis}-`)) { region[channel] = projected.region[channel]; continue; }
      // A fixed category is anchored at its native center, not a touching
      // band edge that the inclusive brush inverse would share with a neighbor.
      // Returning to the authored boundary restores the exact original intent.
      if (projected.region[channel].values !== undefined && current[axis] === projected.extents[axis][context.selected.includes(`${axis}-min`) ? 0 : 1]) {
        region[channel] = projected.region[channel]; continue;
      }
      const original = projected.region[channel].ranges?.[0], range = region[channel].ranges?.[0];
      if (!original || !range) continue;
      const movedMin = context.selected.includes(`${axis}-min`), fixedValue = movedMin ? original.max : original.min;
      const inclusive = movedMin ? original.maxInclusive : original.minInclusive;
      region[channel] = { ranges: [{ ...range, ...(range.min === fixedValue ? { minInclusive: inclusive } : {}),
        ...(range.max === fixedValue ? { maxInclusive: inclusive } : {}) }] };
    }
    next.region = normalizeSelectionRegion(region);
  }
  const nextProjection = projectSelectionHandles({ ...context.input, region: next.region, screenAngles: next.screenAngles }, spend);
  if (polarFrame === undefined && nextProjection !== null) {
    const x = nextProjection.extents.x ?? [context.bounds.x, context.bounds.x + context.bounds.width];
    const y = nextProjection.extents.y ?? [context.bounds.y, context.bounds.y + context.bounds.height];
    result.overlay = [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]].map(([x, y]) => coordinates.toRoot({ x, y }));
  }
  return { ...result, handles: publicHandles(context, nextProjection, spend),
    unchanged: JSON.stringify(normalizeSelectionSelector(next)) === JSON.stringify(normalizeSelectionSelector(context.owner.resolved.selector)) };
}
