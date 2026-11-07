import { resolveSceneNodeOccupiedBounds } from "../../grammar/schemas/graphicBounds.js";
import { cloneAndFreeze } from "../../core/immutable.js";
import { animationOwnerKey } from "../../grammar/animation/ownerKey.js";
import { resolveAxisLabelGroup } from "./axisLabelGroups.js";
import { resolveAxisLabelReflow } from "./axisLabelReflowState.js";

// References name a native axis owner, including an owner with no emitted
// lines. The group vector remains the only stored layout/metrics authority.
export const axisLabelDependencyKey = group => animationOwnerKey(group.scope.namespaces, group.scope.owner);
export function axisLabelDependencyGroup(axislabels, key) {
  return axislabels?.groups.find(group => axisLabelDependencyKey(group) === key);
}
export function axisLabelDependencyKeys(axislabels, namespaces, edge) {
  const groups = axislabels?.groups.filter(group => JSON.stringify(group.scope.namespaces) === JSON.stringify(namespaces) && group.layout.config.base.position === edge) ?? [];
  return groups.some(group => group.reason !== undefined) ? undefined : groups.map(axisLabelDependencyKey).sort();
}
export function axisLabelDependencySnapshot(group) {
  if (group === undefined || group.reason !== undefined) return undefined;
  const { labelBounds, requiredBounds } = resolveAxisLabelReflow(group.layout);
  return cloneAndFreeze({ graphics: resolveAxisLabelGroup(group), labelBounds, requiredBounds, metrics: group.layout.metrics });
}

// Native title actions read occupied label ink in the title's local frame.
// Consume the same current graphics (including clips), never an endpoint box.
export function axisLabelDependencyInk(current, node, accountWork) {
  if (current === undefined) return undefined;
  const [x, y] = node.offset, labelBounds = [];
  for (const graphic of current.graphics) {
    const bounds = resolveSceneNodeOccupiedBounds({ type: "text", properties: graphic.properties, ...graphic.frame }, current.metrics, accountWork);
    if (bounds !== undefined) labelBounds.push({ left: bounds.left - x, right: bounds.right - x, top: bounds.top - y, bottom: bounds.bottom - y });
  }
  const requiredBounds = labelBounds.length === 0 ? null : labelBounds.reduce((a, b) => ({ left: Math.min(a.left, b.left), right: Math.max(a.right, b.right), top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) }));
  return cloneAndFreeze({ labelBounds, requiredBounds });
}
