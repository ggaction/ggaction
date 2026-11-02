import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { findLayer } from "../selectors/layers.js";
import { requireResolvedScale } from "../selectors/scales.js";
import { requireCoordinate } from "../selectors/coordinates.js";
import { resolveCategoryOrderAssignment } from "../materialization/categoryOrder.js";
import { mapOrdinalPositionValues } from "../grammar/scales/ordinal.js";
import { invertPositionInterval } from "../grammar/scales/inversion.js";
import { polarThetaAtPoint } from "../grammar/polar.js";
import { resolveCoordinatePolarFrame } from "../materialization/coordinateBounds.js";
import { axisGuideItems } from "../materialization/guides/axisItems.js";
import { normalizeHitQuery } from "../grammar/hitShapes.js";
import { interactionOptions as options } from "./input.js";
import { interactionOwner, interactionNamespaces } from "./selection.js";
import { guideHitToken, guideHitItemKey } from "./hitGuides.js";
import { prepareMovementFrame } from "./movementFrame.js";

const samePath = (a, b) => a.length === b.length && a.every((id, i) => id === b[i]);

export function resolveReorderBinding(program, binding, allowMissing = false) {
  const owner = interactionOwner(program, binding.target, allowMissing);
  if (!owner) return null;
  if (owner.target.facetSource || owner.view.compositionSpec?.type === "facet") throw new Error("Reorder handles require one native owner scope.");
  if (allowMissing && !findLayer(owner.view, owner.target.id)) return null;
  const assignment = resolveCategoryOrderAssignment(owner.view, { target: owner.target.id, channel: binding.channel }, "Reorder handle");
  const scale = requireResolvedScale(owner.view, assignment.encoding.scale);
  if (!["band", "point", "ordinal"].includes(scale.type)) throw new Error("Reorder handles require a categorical position scale.");
  invertPositionInterval(scale, scale.range);
  const coordinate = requireCoordinate(owner.view, assignment.layer.coordinate);
  if (coordinate.type !== (binding.channel === "theta" ? "polar" : "cartesian")) throw new Error("Reorder handles require a matching native coordinate.");
  return { ...owner, ...assignment, scale };
}

export function normalizeReorderBinding(program, value) {
  const request = options(value, ["type", "target", "channel"], ["slop"], "Category reorder binding");
  if (request.type !== "reorder") throw new TypeError("Category reorder binding requires reorder type.");
  const owner = resolveReorderBinding(program, request), query = normalizeHitQuery(request.slop === undefined ? {} : { slop: request.slop });
  return cloneAndFreeze({ type: "reorder", target: owner.target, channel: request.channel,
    ...(request.slop === undefined ? {} : { slop: query.slop }) });
}

export function prepareReorderGesture(program, binding, base, scene, rootTransform, point, hit, displayed) {
  const owner = resolveReorderBinding(program, binding, true);
  if (!owner) return null;
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Reorder handle work");
  const namespace = interactionNamespaces(program, owner.target), values = new Map();
  for (const item of axisGuideItems(owner.view, spend)) {
    if (item.channel !== binding.channel || item.config.scale !== owner.encoding.scale || item.role !== "axis-tick") continue;
    const key = guideHitItemKey(namespace, guideHitToken(item.ownerId, item.role, item.value));
    spend(key.length); values.set(key, item.rawValue);
  }
  const candidate = hit.candidates.find(item => { spend(1 + item.itemKey.length); return samePath(item.childPath, owner.target.childPath) && values.has(item.itemKey); });
  if (!candidate) return null;
  const value = values.get(candidate.itemKey), index = owner.scale.domain.findIndex(entry => Object.is(value, entry));
  if (index < 0) throw new Error("Reorder handle value is outside its native category domain.");
  const nodeKeys = new Set(base.entries.filter(entry => samePath(entry.metadata.childPath, owner.target.childPath) &&
    (entry.metadata.ownerId === owner.target.id || values.has(entry.metadata.itemKey))).map(entry => entry.nodeKey));
  const coordinates = prepareMovementFrame(base, scene, rootTransform, owner.target, point, nodeKeys);
  const polarFrame = binding.channel === "theta" ? resolveCoordinatePolarFrame(owner.view, owner.layer.coordinate) : undefined;
  const centers = mapOrdinalPositionValues(owner.scale.domain, owner.scale);
  return freezeOwned({ binding, owner, ...coordinates, polarFrame, centers, index, value });
}

export function reorderGestureCommand(context, points) {
  const { binding, owner, centers, polarFrame } = context, point = context.map(points.at(-1));
  let position = point[binding.channel];
  if (polarFrame !== undefined) {
    position = polarThetaAtPoint(point, polarFrame);
    if (position === null) throw new Error("Reorder theta endpoint cannot be the Polar center.");
    const low = Math.min(...owner.scale.range), high = Math.max(...owner.scale.range);
    const turn = Math.floor((low - position) / 360);
    const candidates = [turn, turn + 1, turn + 2].map(offset => position + offset * 360);
    const distance = value => value < low ? low - value : value > high ? value - high : 0;
    candidates.sort((a, b) => distance(a) - distance(b));
    if (distance(candidates[0]) === distance(candidates[1]) && candidates[0] !== candidates[1]) {
      if (high - low !== 360 || !candidates.slice(0, 2).every(value => value === low || value === high)) throw new Error("Reorder theta location is ambiguous at the domain cut.");
      position = owner.scale.range[0]; // The native resolved domain has one explicit directed cut.
    } else position = candidates[0];
  }
  const direction = Math.sign(owner.scale.step), remaining = owner.scale.domain.filter((_, i) => i !== context.index);
  const otherCenters = centers.filter((_, i) => i !== context.index);
  const slot = otherCenters.filter(center => direction * position >= direction * center).length;
  const values = [...remaining.slice(0, slot), context.value, ...remaining.slice(slot)];
  const unchanged = values.every((value, i) => Object.is(value, owner.scale.domain[i]));
  return { command: { type: "reorder", target: binding.target, payload: { channel: binding.channel, values }, origin: "user" }, unchanged };
}
