import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { interpolateNumber, requireFiniteResult, stableFiniteSum, stableFinitePrefixSums } from "../numeric.js";
import { indexHierarchyModel } from "./model.js";

const precise = Object.freeze({ compensated: true });

function parameters(options) {
  ownRecord(options, "Hierarchy treemap options");
  rejectUnknownProperties(options, ["size", "padding", "method", "maxNodes"], "hierarchy treemap");
  ownArray(options.size, "Hierarchy treemap size");
  if (options.size.length !== 2 || !options.size.every(value => Number.isFinite(value) && value >= 0)) throw new RangeError("Hierarchy treemap size requires two finite nonnegative dimensions.");
  if (!Number.isFinite(options.padding) || options.padding < 0) throw new RangeError("Hierarchy treemap padding must be finite and nonnegative.");
  if (!["slice-dice", "squarify"].includes(options.method)) throw new Error("Hierarchy treemap method must be explicit.");
  requireFiniteResult(options.size[0] * options.size[1], "Hierarchy treemap area");
  return cloneAndFreeze(options);
}

function point(rect) { return { x0: rect.x0, y0: rect.y0, x1: rect.x0, y1: rect.y0 }; }
function inset(rect, padding) {
  const x = Math.min(padding, (rect.x1 - rect.x0) / 2), y = Math.min(padding, (rect.y1 - rect.y0) / 2);
  return { x0: rect.x0 + x, y0: rect.y0 + y, x1: rect.x1 - x, y1: rect.y1 - y };
}

function strips(rect, weights, total, axis, charge) {
  charge(weights.length * 16);
  const prefixes = stableFinitePrefixSums(weights, "Treemap strip prefix", precise);
  let previous = rect[`${axis}0`];
  return prefixes.map((prefix, index) => {
    if (total === 0) return point(rect);
    const end = index === weights.length - 1 ? rect[`${axis}1`]
      : interpolateNumber(rect[`${axis}0`], rect[`${axis}1`], prefix / total);
    if (end < previous || end > rect[`${axis}1`]) throw new RangeError("Treemap strip is outside its parent rectangle.");
    const result = { ...rect, [`${axis}0`]: previous, [`${axis}1`]: end };
    previous = end;
    return result;
  });
}

// Compare aspect in log space only when a finite dimension ratio cannot be
// represented. Ordinary ratios preserve exact ties in simple square fixtures.
function worstAspect(weights, remaining, long, short, charge) {
  charge(weights.length * 16);
  const sum = stableFiniteSum(weights, "Treemap row weight", precise);
  let minimum = Infinity, maximum = 0;
  for (const weight of weights) { minimum = Math.min(minimum, weight); maximum = Math.max(maximum, weight); }
  const thickness = long * (sum / remaining), narrow = short * (minimum / sum), wide = short * (maximum / sum);
  const ratio = Math.max(thickness / narrow, wide / thickness);
  if (Number.isFinite(ratio) && ratio > 0) return Math.log(ratio);
  const logThickness = Math.log(long) + Math.log(sum) - Math.log(remaining);
  return Math.max(logThickness - Math.log(short) - Math.log(minimum) + Math.log(sum),
    Math.log(short) + Math.log(maximum) - Math.log(sum) - logThickness);
}

function squarify(rect, children, nodes, rectangles, charge) {
  const positive = children.filter(index => nodes[index].totalValue > 0);
  for (const index of children) if (nodes[index].totalValue === 0) rectangles[index] = point(rect);
  const weights = positive.map(index => nodes[index].totalValue);
  charge(weights.length * 16);
  const suffix = stableFinitePrefixSums([...weights].reverse(), "Treemap remaining weight", precise).reverse();
  let start = 0, remainingRect = rect;
  while (start < positive.length) {
    const width = remainingRect.x1 - remainingRect.x0, height = remainingRect.y1 - remainingRect.y0;
    if (width === 0 || height === 0) {
      for (let index = start; index < positive.length; index++) rectangles[positive[index]] = point(remainingRect);
      break;
    }
    const axis = width >= height ? "x" : "y", long = Math.max(width, height), short = Math.min(width, height);
    let end = start + 1, row = weights.slice(start, end);
    let worst = worstAspect(row, suffix[start], long, short, charge);
    while (end < positive.length) {
      const candidate = weights.slice(start, end + 1);
      const score = worstAspect(candidate, suffix[start], long, short, charge);
      if (score >= worst) break;
      row = candidate; worst = score; end++;
    }
    const rowWeight = stableFiniteSum(row, "Treemap row total", precise);
    const edge = end === positive.length ? remainingRect[`${axis}1`]
      : interpolateNumber(remainingRect[`${axis}0`], remainingRect[`${axis}1`], rowWeight / suffix[start]);
    if (edge < remainingRect[`${axis}0`] || edge > remainingRect[`${axis}1`]) throw new RangeError("Treemap row is outside its available rectangle.");
    const rowRect = { ...remainingRect, [`${axis}1`]: edge };
    const pieces = strips(rowRect, row, rowWeight, axis === "x" ? "y" : "x", charge);
    pieces.forEach((piece, index) => { rectangles[positive[start + index]] = piece; });
    remainingRect = { ...remainingRect, [`${axis}0`]: edge };
    start = end;
  }
}

export function layoutHierarchyTreemap(model, options) {
  const resolved = parameters(options), indexed = indexHierarchyModel(model, resolved.maxNodes);
  const { nodes, indexes } = indexed;
  let work = indexed.work;
  const charge = amount => validateWorkLimit(work += amount, "Hierarchy treemap work");
  charge(nodes.length * 128);
  const rectangles = Array(nodes.length);
  if (nodes.length) rectangles[0] = model.totalValue === 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 }
    : { x0: 0, y0: 0, x1: resolved.size[0], y1: resolved.size[1] };
  const result = nodes.map((node, index) => {
    const rect = rectangles[index], content = inset(rect, resolved.padding);
    const children = node.childrenKeys.map(key => indexes.get(key));
    let residualRect;
    if (resolved.method === "slice-dice") {
      const pieces = strips(content, [...children.map(child => nodes[child].totalValue), node.ownValue], node.totalValue, node.depth % 2 === 0 ? "x" : "y", charge);
      children.forEach((child, i) => { rectangles[child] = pieces[i]; });
      residualRect = pieces.at(-1);
    } else {
      children.sort((a, b) => { charge(4); return nodes[b].totalValue - nodes[a].totalValue || a - b; });
      const childTotal = stableFiniteSum(children.map(child => nodes[child].totalValue), "Treemap child total", precise);
      const pieces = strips(content, [childTotal, node.ownValue], node.totalValue, "x", charge);
      residualRect = pieces[1];
      squarify(pieces[0], children, nodes, rectangles, charge);
    }
    return { ...node, rect, content, residualRect, childOrder: children.map(child => nodes[child].key),
      area: requireFiniteResult((rect.x1 - rect.x0) * (rect.y1 - rect.y0), "Treemap node area") };
  });
  return cloneAndFreeze({ ...model, nodes: result, options: resolved });
}
