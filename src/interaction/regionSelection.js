import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { uniquePositionBinding } from "../core/encodingBindings.js";
import { validateWorkLimit } from "../core/validation.js";
import { requireLayer } from "../selectors/layers.js";
import { requireCoordinate } from "../selectors/coordinates.js";
import { requireResolvedScale } from "../selectors/scales.js";
import { resolveCoordinateBounds, resolveCoordinatePolarFrame } from "../materialization/coordinateBounds.js";
import { invertAngularInterval } from "../grammar/scales/angularInversion.js";
import { polarThetaAtPoint } from "../grammar/polar.js";
import { usesProportionalArcTheta } from "../grammar/arcs.js";
import { invertPositionInterval } from "../grammar/scales/inversion.js";
import { selectScreenPolygonKeys } from "../grammar/lassoSelection.js";
import { nearestHitShape } from "../grammar/hitShapes.js";
import { resolveHitCoordinates, transformHitPoint } from "../grammar/hitCoordinates.js";
import { SELECTION_SET_MODES } from "../grammar/selectionSet.js";
import { resolveClickSelection } from "./clickSelection.js";
import { programHitOwnerPlacement, rebindProgramHitFrame } from "./hitProgram.js";
import { scopeSelectionKeys } from "./selection.js";
import { interactionOptions as options } from "./input.js";

const samePath = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
const inside = (point, b) => point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height;

function scalesFor(owner, binding) {
  if (binding.type !== "brush") return {};
  const layer = requireLayer(owner.view, owner.target.id);
  const angular = Object.hasOwn(binding.channels, "theta");
  if (requireCoordinate(owner.view, layer.coordinate).type !== (angular ? "polar" : "cartesian")) throw new Error(angular ? "Angular brush requires a Polar owner coordinate." : "Cartesian brush requires a Cartesian owner coordinate.");
  return Object.fromEntries(Object.entries(binding.channels).map(([axis, channel]) => {
    // Generated end channels use the stored primary binding for their scale.
    const encoding = uniquePositionBinding(layer, channel) ?? (layer.mark.type === "bar" && channel.endsWith("2") ? uniquePositionBinding(layer, axis) : undefined);
    if (encoding?.scale === undefined) throw new Error(`Brush ${channel} requires one explicit resolved position scale.`);
    const scale = requireResolvedScale(owner.view, encoding.scale);
    if (angular) {
      const radius = layer.mark.type === "arc" ? uniquePositionBinding(layer, "radius") : undefined;
      if (layer.mark.type === "arc" && usesProportionalArcTheta(encoding, radius?.scale === undefined ? undefined : requireResolvedScale(owner.view, radius.scale))) {
        throw new Error("Angular brush requires a position-mapped theta scale; proportional sectors do not have that inverse.");
      }
      invertAngularInterval(scale, 0, 0);
    } else invertPositionInterval(scale, scale.range);
    return [axis, scale];
  }));
}

export function normalizeRegionBinding(program, value, links) {
  const request = options(value, ["type", "target", "selection"], ["mode", "axis", "channels"], "Region selection binding");
  if (!["brush", "lasso"].includes(request.type)) throw new TypeError("Region selection requires brush or lasso.");
  if (request.type === "lasso" && (Object.hasOwn(request, "axis") || Object.hasOwn(request, "channels"))) throw new TypeError("Lasso uses screen points and does not accept axes or channels.");
  const owner = resolveClickSelection(program, request.target, request.selection), target = owner.target;
  if (links.some(link => !link.filter && link.selection === request.selection && link.target.id === target.id && samePath(link.target.childPath, target.childPath))) throw new Error("A linked target selection is owned by its binding.");
  const mode = request.mode === undefined ? "replace" : request.mode;
  if (!SELECTION_SET_MODES.includes(mode)) throw new TypeError("Region selection requires a supported set update mode.");
  let channels;
  if (request.type === "brush") {
    const axis = request.axis === undefined ? "xy" : request.axis;
    if (!["x", "y", "xy", "theta"].includes(axis)) throw new TypeError("Brush axis requires x, y, xy or theta.");
    const axes = axis === "theta" ? ["theta"] : [...axis], requested = options(request.channels === undefined ? {} : request.channels, [], axes, "Brush channels");
    channels = Object.fromEntries(axes.map(key => [key, requested[key] ?? key]));
    for (const [key, channel] of Object.entries(channels)) if (!(key === "theta" ? ["theta"] : [key, `${key}2`]).includes(channel)) throw new TypeError("Brush channels must use their matching position axis.");
  }
  const result = cloneAndFreeze({ type: request.type, target, selection: request.selection, mode, ...(channels === undefined ? {} : { channels }) });
  scalesFor(owner, result);
  return result;
}

export function resolveRegionBinding(program, binding, allowMissing = false) {
  const owner = resolveClickSelection(program, binding.target, binding.selection, allowMissing);
  if (owner) scalesFor(owner, binding);
  return owner;
}

export function prepareRegionGesture(program, binding, base, scene, rootTransform, start) {
  const owner = resolveRegionBinding(program, binding, true);
  if (!owner) return null;
  const placement = programHitOwnerPlacement(base, owner.target.childPath), offset = placement.offset;
  const map = point => {
    const mapped = resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: scene.width, height: scene.height }, rootTransform,
      childTransforms: [[1, 0, 0, 1, ...offset]] });
    if (mapped.localPoint === null) throw new Error("Region gesture requires invertible current coordinates.");
    return mapped.localPoint;
  };
  const layer = requireLayer(owner.view, owner.target.id), bounds = resolveCoordinateBounds(owner.view, layer.coordinate);
  const localStart = map(start);
  if (!inside(localStart, bounds)) return null;
  const polarFrame = binding.channels?.theta === undefined ? undefined : resolveCoordinatePolarFrame(owner.view, layer.coordinate);
  if (polarFrame !== undefined && (polarThetaAtPoint(localStart, polarFrame) === null || polarFrame.availableRadius === 0 ||
    Math.hypot(localStart.x - polarFrame.centerX, localStart.y - polarFrame.centerY) > polarFrame.availableRadius)) return null;
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Region gesture work");
  const allowed = new Set(scopeSelectionKeys(program, owner.target, owner.resolved.items.filter(item => item.visible !== false).map(item => item.key), spend));
  const frame = rebindProgramHitFrame(base, scene, base.version, rootTransform), items = new Map();
  const selectedEntries = frame.entries.filter(entry => entry.metadata.ownerId === owner.target.id && samePath(entry.metadata.childPath, owner.target.childPath) && allowed.has(entry.metadata.itemKey));
  if (binding.type === "brush") {
    // Stored scale inversion cannot infer an arbitrary sampled animation's scale.
    const original = new Map(base.scene.nodes.map(node => [node.key, node]));
    const current = new Map(scene.nodes.map(node => [node.key, node]));
    for (const entry of selectedEntries) {
      spend(1);
      const currentNode = JSON.stringify(current.get(entry.nodeKey)), originalNode = JSON.stringify(original.get(entry.nodeKey));
      spend(currentNode.length + originalNode.length);
      if (currentNode !== originalNode) throw new Error("Brush scale inversion requires the owner's committed concrete frame.");
    }
  } else {
    for (const entry of selectedEntries) {
      spend(1); const b = entry.shape.bounds;
      if (!b) continue;
      const group = items.get(entry.metadata.itemKey);
      if (group) { group.bounds.left = Math.min(group.bounds.left, b.left); group.bounds.right = Math.max(group.bounds.right, b.right);
        group.bounds.top = Math.min(group.bounds.top, b.top); group.bounds.bottom = Math.max(group.bounds.bottom, b.bottom); group.shapes.push(entry.shape); }
      else items.set(entry.metadata.itemKey, { bounds: { ...b }, shapes: [entry.shape] });
    }
  }
  const anchors = [];
  for (const [key, item] of items) {
    const b = item.bounds, point = { x: b.left / 2 + b.right / 2, y: b.top / 2 + b.bottom / 2 };
    if (item.shapes.some(shape => Number.isFinite(nearestHitShape(shape, point, { slop: 0 }, spend).distance))) anchors.push({ key, point });
  }
  return freezeOwned({ binding, owner, start: localStart, map, bounds, polarFrame, scales: scalesFor(owner, binding), anchors: cloneAndFreeze(anchors),
    toRoot: point => transformHitPoint([1, 0, 0, 1, ...offset], point),
    screenToRoot: point => resolveHitCoordinates({ point, rect: { left: 0, top: 0, width: scene.width, height: scene.height }, rootTransform, childTransforms: [] }).localPoint });
}

export function regionGestureCommand(context, points) {
  const { binding, owner } = context;
  let select, overlay;
  if (binding.type === "lasso") {
    const result = selectScreenPolygonKeys(context.anchors, points);
    select = { items: result.keys, screenPolygon: result.polygon, empty: "none", grain: owner.resolved.definition.grain };
    overlay = result.polygon.map(context.screenToRoot);
  } else if (context.polarFrame !== undefined) {
    const frame = context.polarFrame, end = polarThetaAtPoint(context.map(points.at(-1)), frame);
    if (end === null) throw new Error("Angular brush endpoint cannot be the Polar center.");
    const start = polarThetaAtPoint(context.start, frame), screenAngles = [start * Math.PI / 180, end * Math.PI / 180];
    select = { region: { theta: invertAngularInterval(context.scales.theta, ...screenAngles) }, screenAngles, grain: owner.resolved.definition.grain };
    const center = context.toRoot({ x: frame.centerX, y: frame.centerY }), origin = context.toRoot({ x: context.bounds.x, y: context.bounds.y });
    overlay = start === end ? [] : { sector: { frame: { ...frame, centerX: center.x, centerY: center.y },
      startTheta: start, endTheta: end > start ? end : end + 360, outerRadius: frame.availableRadius,
      clip: { x: origin.x, y: origin.y, width: context.bounds.width, height: context.bounds.height } } };
  } else {
    const end = context.map(points.at(-1)), region = {}, b = context.bounds;
    const extent = { x: [b.x, b.x + b.width], y: [b.y, b.y + b.height] };
    for (const [axis, channel] of Object.entries(binding.channels)) {
      const scale = context.scales[axis], result = invertPositionInterval(scale, [context.start[axis], end[axis]]);
      region[channel] = result.kind === "categories" ? { values: result.values } : { ranges: result.bounds === null ? [] : [{ min: result.bounds[0], max: result.bounds[1] }] };
      const low = Math.min(...scale.range), high = Math.max(...scale.range);
      extent[axis] = [context.start[axis], end[axis]].map(value => Math.max(low, Math.min(high, value))).sort((a, b) => a - b);
    }
    select = { region, grain: owner.resolved.definition.grain };
    overlay = [[extent.x[0], extent.y[0]], [extent.x[1], extent.y[0]], [extent.x[1], extent.y[1]], [extent.x[0], extent.y[1]]]
      .map(([x, y]) => context.toRoot({ x, y }));
    if (Object.keys(binding.channels).some(axis => extent[axis][0] === extent[axis][1])) overlay = [];
  }
  return { command: { type: "select", target: binding.target, payload: { id: binding.selection, select, mode: binding.mode }, origin: "user" }, overlay };
}
