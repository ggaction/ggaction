import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { finiteMidpoint, requireFiniteResult } from "../numeric.js";
import { polarToCartesian } from "../polar.js";
import { indexHierarchyModel } from "./model.js";

function nonnegative(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be nonnegative and finite.`);
  return value;
}

function parameters(options) {
  ownRecord(options, "Hierarchy tree options");
  rejectUnknownProperties(options, ["nodeSize", "siblingGap", "depthGap", "orientation", "radius", "startAngle", "sweep", "maxNodes"], "hierarchy tree");
  if (["nodeSize", "siblingGap", "depthGap", "orientation"].some(field => !Object.hasOwn(options, field))) throw new TypeError("Hierarchy tree requires all own layout options.");
  if (!Array.isArray(options.nodeSize) || options.nodeSize.length !== 2) throw new Error("Hierarchy tree nodeSize requires breadth and depth sizes.");
  ownArray(options.nodeSize, "Hierarchy tree nodeSize");
  options.nodeSize.forEach(value => nonnegative(value, "Hierarchy tree node size"));
  nonnegative(options.siblingGap, "Hierarchy tree sibling gap");
  nonnegative(options.depthGap, "Hierarchy tree depth gap");
  if (!["vertical", "horizontal", "radial"].includes(options.orientation)) throw new Error("Hierarchy tree orientation must be explicit.");
  if (options.orientation === "radial") {
    if (["radius", "startAngle", "sweep"].some(field => !Object.hasOwn(options, field))) throw new TypeError("Radial tree requires own radius, startAngle and sweep options.");
    nonnegative(options.radius, "Hierarchy tree radius");
    if (!Number.isFinite(options.startAngle) || !Number.isFinite(options.sweep) || options.sweep <= 0 || options.sweep > 360) {
      throw new RangeError("Radial tree requires finite startAngle and sweep in (0,360] degrees.");
    }
  } else if (["radius", "startAngle", "sweep"].some(key => Object.hasOwn(options, key))) {
    throw new Error("Radial tree options require radial orientation.");
  }
  return cloneAndFreeze(options);
}

// Persistent contours retain a shared tail. A deep single-child chain adds one
// head per level instead of copying a growing array at every ancestor.
function cons(value, tail = null) {
  return { node: { value, next: tail?.node ?? null, delta: tail?.shift ?? 0 }, shift: 0, height: (tail?.height ?? 0) + 1 };
}
function shifted(list, offset) {
  return { node: list.node, shift: requireFiniteResult(list.shift + offset, "Tree contour shift"), height: list.height };
}
function next(cursor) {
  return { node: cursor.node.next, shift: requireFiniteResult(cursor.shift + cursor.node.delta, "Tree contour offset"), height: cursor.height - 1 };
}
function value(cursor) { return requireFiniteResult(cursor.node.value + cursor.shift, "Tree contour value"); }

function separated(right, left, gap, charge) {
  let shift = 0;
  while (right.node && left.node) {
    charge(8);
    shift = Math.max(shift, requireFiniteResult(value(right) + gap - value(left), "Tree sibling separation"));
    right = next(right); left = next(left);
  }
  return shift;
}

// At overlapping depths the ordered subtree on this side owns the contour;
// deeper levels reuse the other subtree's unmodified tail.
function overlay(primary, secondary, charge) {
  if (primary.height >= secondary.height) return primary;
  const prefix = [];
  let cursor = primary, tail = secondary;
  while (cursor.node) {
    charge(8);
    prefix.push(value(cursor)); cursor = next(cursor); tail = next(tail);
  }
  for (let i = prefix.length - 1; i >= 0; i--) tail = cons(prefix[i], tail);
  return tail;
}

export function layoutHierarchyTree(model, options) {
  const resolved = parameters(options), indexed = indexHierarchyModel(model, Object.hasOwn(resolved, "maxNodes") ? resolved.maxNodes : undefined);
  const { nodes, indexes } = indexed;
  let work = indexed.work;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy tree work");
  charge(nodes.length * 64);
  const breadthStep = requireFiniteResult(resolved.nodeSize[0] + resolved.siblingGap, "Tree breadth step");
  const depthStep = requireFiniteResult(resolved.nodeSize[1] + resolved.depthGap, "Tree depth step");
  const layouts = Array(nodes.length);
  for (let index = nodes.length - 1; index >= 0; index--) {
    const children = nodes[index].childrenKeys.map(key => indexes.get(key));
    if (children.length === 0) { layouts[index] = { left: cons(0), right: cons(0), offset: 0 }; continue; }
    let left = layouts[children[0]].left, right = layouts[children[0]].right, last = 0;
    layouts[children[0]].offset = 0;
    for (let i = 1; i < children.length; i++) {
      const child = layouts[children[i]];
      last = separated(right, child.left, breadthStep, charge);
      child.offset = last;
      left = overlay(left, shifted(child.left, last), charge);
      right = overlay(shifted(child.right, last), right, charge);
    }
    const center = finiteMidpoint(0, last);
    for (const child of children) layouts[child].offset -= center;
    layouts[index] = { left: cons(0, shifted(left, -center)), right: cons(0, shifted(right, -center)), offset: 0 };
  }
  const positions = [], xValues = [];
  let minimum = Infinity, maximum = -Infinity, maxDepth = 0;
  nodes.forEach((node, index) => {
    const parent = node.parentKey === null ? 0 : xValues[indexes.get(node.parentKey)];
    const x = requireFiniteResult(parent + layouts[index].offset, "Tree breadth position");
    const y = requireFiniteResult(node.depth * depthStep, "Tree depth position");
    xValues.push(x); minimum = Math.min(minimum, x); maximum = Math.max(maximum, x); maxDepth = Math.max(maxDepth, node.depth);
    positions.push({ key: node.key, parentKey: node.parentKey, depth: node.depth, x, y,
      ...(Object.hasOwn(node, "synthetic") ? { synthetic: true } : {}) });
  });
  if (resolved.orientation === "horizontal") positions.forEach(point => { [point.x, point.y] = [point.y, point.x]; });
  if (resolved.orientation === "radial" && positions.length > 0) {
    const span = requireFiniteResult(maximum - minimum + breadthStep, "Radial tree breadth domain");
    const frame = { centerX: 0, centerY: 0, availableRadius: resolved.radius };
    positions.forEach(point => {
      const proportion = span === 0 ? 0.5 : (point.x - minimum + breadthStep / 2) / span;
      const theta = requireFiniteResult(resolved.startAngle + resolved.sweep * proportion, "Radial tree angle");
      const radius = maxDepth === 0 ? 0 : resolved.radius * (point.depth / maxDepth);
      const position = polarToCartesian({ theta, radius, frame });
      point.x = requireFiniteResult(position.x, "Radial tree x"); point.y = requireFiniteResult(position.y, "Radial tree y");
      point.theta = theta; point.radius = radius;
    });
  }
  return cloneAndFreeze({ nodes: positions, options: resolved });
}
