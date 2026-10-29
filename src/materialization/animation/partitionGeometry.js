import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { validatePartitionAnimationMeaning } from "../../grammar/animation/partitionState.js";
import { partitionBendCellGeometry } from "../../grammar/hierarchy/partitionCell.js";
import { partitionBendSegments } from "../../grammar/hierarchy/partitionAdapter.js";
import { partitionRadius } from "../../grammar/hierarchy/partitionMapping.js";
import { buildAnnularSectorCommands } from "../../grammar/polarPaths.js";

const bounds = node => Object.fromEntries(["u0", "u1", "v0", "v1"].map(key => [key, node[key]]));
export function partitionAnimationGroupWork(group) {
  let work = group.meaning.state.nodes.length * 64;
  for (const node of group.meaning.state.nodes) work += node.key.length + (node.parentKey?.length ?? 0);
  return work;
}
export function resolvePartitionAnimationGeometry(group) {
  const state = group.meaning.state, segments = partitionBendSegments({ compatible: true, kernel: state.frame.kernel }, state.bend);
  validateWorkLimit(state.nodes.length * (3 * 64 + 2 * (segments + 1) + 1), "Partition animation geometry work");
  return new Map(state.nodes.map(node => [node.key, node.visible ? partitionBendCellGeometry(bounds(node), state.frame, state.bend, segments) : null]));
}
export function partitionAnimationItemGeometry(group, item, geometry) {
  const cell = geometry.get(item.key);
  if (cell === null || cell === undefined) return undefined;
  if (item.role === "body") return { type: "path", properties: { commands: cell.commands } };
  if (item.role !== "label") return undefined;
  return { type: "text", properties: { x: cell.anchor.x + group.labelOffset[0], y: cell.anchor.y + group.labelOffset[1] } };
}
function closed(value, keys, label) {
  ownRecord(value, label); rejectUnknownProperties(value, keys, label);
  if (keys.some(key => !Object.hasOwn(value, key) || value[key] === undefined)) throw new TypeError(`${label} requires every resolved field.`);
}
function address(key) {
  const value = JSON.parse(key);
  if (!Array.isArray(value) || value.length !== 4 || !Array.isArray(value[0]) || value[0].some(part => typeof part !== "string") ||
      typeof value[1] !== "string" || !value[1] || value[2] !== "node" || !Array.isArray(value[3]) || value[3].length !== 2 || value[3].some(part => typeof part !== "string" || !part)) throw new TypeError("Partition animation requires exact hierarchy node keys.");
  return value;
}
const close = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= 1e-10 * Math.max(1, Math.abs(a), Math.abs(b));
function sameCommands(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((command, index) => {
    const other = expected[index], keys = Object.keys(other);
    return Object.keys(command).length === keys.length && keys.every(key => key === "op" ? command.op === other.op : close(command[key], other[key]));
  });
}
// Native polar endpoints retain their cubic arc commands. Reconstruct the same
// angular geometry from the canonical frame, allowing only numeric roundoff.
function nativeSectorCommands(group, cell, reverse) {
  const { frame } = group.meaning.state, { kernel } = frame, r = cell.interval;
  const radius = v => partitionRadius(v, { innerRadius: kernel.innerRadius, outerRadius: kernel.outerRadius, radiusPolicy: kernel.radiusPolicy });
  const turn = -frame.handedness, theta = kernel.sweep * ((reverse ? r.u1 : r.u0) - .5), angle = frame.angle + (turn === 1 ? theta : Math.PI - theta);
  const commands = buildAnnularSectorCommands({ frame: { centerX: 0, centerY: 0, availableRadius: kernel.outerRadius },
    startTheta: 0, endTheta: (reverse ? -1 : 1) * turn * kernel.sweep * (r.u1 - r.u0) * 180 / Math.PI, innerRadius: radius(r.v0), outerRadius: radius(r.v1) });
  const c = Math.cos(angle), s = Math.sin(angle);
  return commands.map(command => {
    const result = { ...command };
    for (const [x, y] of [["x", "y"], ["x1", "y1"], ["x2", "y2"]]) if (Object.hasOwn(command, x)) {
      result[x] = frame.origin[0] + c * command[x] - s * command[y]; result[y] = frame.origin[1] + s * command[x] + c * command[y];
    }
    return result;
  });
}
function matchesGeometry(group, item, actual, geometry) {
  const cell = geometry.get(item.key);
  if (cell === null || cell === undefined) return false;
  if (item.role === "label") return actual.type === "text" && close(actual.properties.x, cell.anchor.x + group.labelOffset[0]) && close(actual.properties.y, cell.anchor.y + group.labelOffset[1]);
  if (actual.type === "path") return sameCommands(actual.properties.commands, cell.commands) || group.meaning.state.bend === 1 &&
    (sameCommands(actual.properties.commands, nativeSectorCommands(group, cell, false)) || sameCommands(actual.properties.commands, nativeSectorCommands(group, cell, true)));
  if (actual.type !== "rect" || group.meaning.state.bend !== 0) return false;
  const points = cell.commands.slice(0, -1), xs = points.map(point => point.x), ys = points.map(point => point.y);
  const x = Math.min(...xs), y = Math.min(...ys), width = Math.max(...xs) - x, height = Math.max(...ys) - y;
  // A rotated rectangle cannot claim an axis-aligned concrete primitive.
  if (!points.every(point => (close(point.x, x) || close(point.x, x + width)) && (close(point.y, y) || close(point.y, y + height)))) return false;
  return ["x", "y", "width", "height"].every(key => close(actual.properties[key], { x, y, width, height }[key]));
}
export function validateAnimationPartitionState(input, endpoint) {
  closed(input, ["groups", "items"], "Animation partition vector");
  if (Array.isArray(input.groups)) validateGeneratedItemLimit(input.groups.length, "Animation partition groups");
  ownArray(input.groups, "Animation partition groups"); ownArray(input.items, "Animation partition items");
  if (input.items.length !== endpoint.scene.nodes.length) throw new TypeError("Animation partition items must follow the exact scene order.");
  let work = 0; const nodeKeys = [];
  const groups = input.groups.map(group => {
    closed(group, ["id", "layout", "hierarchy", "meaning", "labelOffset"], "Animation partition group");
    for (const [key, kind] of [["layout", "layout"], ["hierarchy", "hierarchy"]]) {
      validateInputReference(group[key]); if (group[key].kind !== kind) throw new TypeError("Animation partition references require their exact resource kinds.");
    }
    ownArray(group.labelOffset, "Animation partition label offset");
    if (group.labelOffset.length !== 2 || !group.labelOffset.every(Number.isFinite)) throw new TypeError("Animation partition labels require two finite offsets.");
    const meaning = validatePartitionAnimationMeaning(group.meaning), model = { ...group, meaning };
    validateWorkLimit(work += partitionAnimationGroupWork(model), "Animation partition restore work");
    const keys = new Set();
    for (const node of meaning.state.nodes) {
      const key = address(node.key);
      if (JSON.stringify([key[0], key[1]]) !== group.id || key[3][0] !== group.hierarchy.id) throw new TypeError("Animation partition node differs from its exact group scope.");
      keys.add(node.key);
    }
    nodeKeys.push(keys);
    return model;
  });
  const used = new Set(), geometry = new Map();
  const items = input.items.map((item, index) => {
    if (item === null) return null;
    closed(item, ["group", "key", "role", ...(Object.hasOwn(item, "reason") ? ["reason"] : [])], "Animation partition item");
    if (!Number.isSafeInteger(item.group) || item.group < 0 || item.group >= groups.length) throw new TypeError("Animation partition item requires an existing group.");
    const group = groups[item.group], identity = endpoint.identities[index];
    if (identity === undefined || identity.key !== item.key || identity.role !== item.role || identity.lineage.kind !== "resource" ||
        !["kind", "id", "revision"].every(key => identity.lineage.resource[key] === group.layout[key]) || !nodeKeys[item.group].has(item.key)) throw new TypeError("Animation partition item differs from its exact native identity.");
    used.add(item.group);
    if (Object.hasOwn(item, "reason")) {
      if (item.reason !== "primitive-role" && item.reason !== "partition-edited-geometry") throw new TypeError("Unknown native partition fallback reason.");
      if ((item.reason === "primitive-role") !== (item.role !== "body" && item.role !== "label")) throw new TypeError("Partition fallback role is inconsistent.");
      return item;
    }
    if (item.role !== "body" && item.role !== "label") throw new TypeError("Partition semantic items require body or label roles.");
    if (!geometry.has(item.group)) geometry.set(item.group, resolvePartitionAnimationGeometry(group));
    if (!matchesGeometry(group, item, endpoint.scene.nodes[index], geometry.get(item.group))) throw new TypeError("Animation partition meaning differs from its concrete endpoint.");
    return item;
  });
  if (used.size !== groups.length) throw new TypeError("Animation partition groups must be referenced by actual scene items.");
  return cloneAndFreeze({ groups, items });
}
