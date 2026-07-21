import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { resolveTextBounds } from "../core/textMetrics.js";
import {
  validateNonNegativeFinite,
  validateOptionObject
} from "../core/validation.js";
import { validateConcreteGraphicValue } from "../grammar/schemas/concreteGraphic.js";

const AXES = new Set(["x", "y", "both"]);
const BOUNDS = new Set(["plot", "canvas"]);
const POLICY_OPTIONS = Object.freeze([
  "axis", "padding", "maxDisplacement", "bounds", "leader"
]);
const LEADER_OPTIONS = Object.freeze([
  "stroke", "strokeWidth", "strokeDash", "opacity"
]);

export const DEFAULT_LABEL_LAYOUT = cloneAndFreeze({
  axis: "both",
  padding: 3,
  maxDisplacement: 48,
  bounds: "plot",
  leader: false
});

function normalizeLeader(value) {
  if (value === false) return false;
  validateOptionObject(value, LEADER_OPTIONS, "label leader", {
    allowEmpty: true
  });
  const normalized = {
    stroke: "#94a3b8",
    strokeWidth: 1,
    strokeDash: [],
    opacity: 1,
    ...value
  };
  for (const [property, propertyValue] of Object.entries(normalized)) {
    validateConcreteGraphicValue("line", property, propertyValue);
  }
  return cloneAndFreeze(normalized);
}

export function normalizeLabelLayoutPolicy(options = {}) {
  validateOptionObject(options, POLICY_OPTIONS, "label layout");
  const normalized = {
    ...DEFAULT_LABEL_LAYOUT,
    ...options,
    leader: Object.hasOwn(options, "leader")
      ? normalizeLeader(options.leader)
      : DEFAULT_LABEL_LAYOUT.leader
  };
  if (!AXES.has(normalized.axis)) {
    throw new Error(`Unsupported label layout axis "${normalized.axis}".`);
  }
  if (!BOUNDS.has(normalized.bounds)) {
    throw new Error(`Unsupported label layout bounds "${normalized.bounds}".`);
  }
  validateNonNegativeFinite(normalized.padding, "Label layout padding");
  validateNonNegativeFinite(
    normalized.maxDisplacement,
    "Label layout maxDisplacement"
  );
  return cloneAndFreeze(normalized);
}

function validateBounds(bounds) {
  if (
    !isPlainObject(bounds) ||
    ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
    bounds.right <= bounds.left ||
    bounds.bottom <= bounds.top
  ) {
    throw new RangeError("Label layout requires ordered finite bounds.");
  }
}

function validateItem(item, ids) {
  if (!isPlainObject(item)) {
    throw new TypeError("Label layout items must be plain objects.");
  }
  if (typeof item.id !== "string" || item.id.length === 0 || ids.has(item.id)) {
    throw new TypeError("Label layout items require unique non-empty ids.");
  }
  if (
    ![item.x, item.y, item.sourceX, item.sourceY, item.fontSize]
      .every(Number.isFinite) ||
    item.fontSize <= 0 ||
    typeof item.text !== "string" ||
    item.text.length === 0
  ) {
    throw new TypeError(
      "Label layout items require text, positive fontSize, and finite geometry."
    );
  }
  ids.add(item.id);
}

function expanded(bounds, padding) {
  const half = padding / 2;
  return {
    left: bounds.left - half,
    right: bounds.right + half,
    top: bounds.top - half,
    bottom: bounds.bottom + half
  };
}

function intersectionArea(first, second) {
  const width = Math.min(first.right, second.right) -
    Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) -
    Math.max(first.top, second.top);
  return width > 0 && height > 0 ? width * height : 0;
}

function overflow(bounds, boundary) {
  return Math.max(0, boundary.left - bounds.left) +
    Math.max(0, bounds.right - boundary.right) +
    Math.max(0, boundary.top - bounds.top) +
    Math.max(0, bounds.bottom - boundary.bottom);
}

export function enumerateLabelOffsets({ axis, padding, maxDisplacement }) {
  const policy = normalizeLabelLayoutPolicy({ axis, padding, maxDisplacement });
  const step = Math.max(2, policy.padding);
  const limit = Math.ceil(policy.maxDisplacement / step);
  const candidates = [];
  for (let x = -limit; x <= limit; x += 1) {
    for (let y = -limit; y <= limit; y += 1) {
      if (policy.axis === "x" && y !== 0) continue;
      if (policy.axis === "y" && x !== 0) continue;
      const offset = { x: x * step, y: y * step };
      const distanceSquared = offset.x ** 2 + offset.y ** 2;
      if (Math.sqrt(distanceSquared) > policy.maxDisplacement + 1e-9) continue;
      candidates.push({ ...offset, distanceSquared });
    }
  }
  candidates.sort((first, second) =>
    first.distanceSquared - second.distanceSquared ||
    Math.abs(first.x) - Math.abs(second.x) ||
    first.y - second.y ||
    second.x - first.x
  );
  return cloneAndFreeze(candidates);
}

function textBounds(item, offset = { x: 0, y: 0 }) {
  return resolveTextBounds({
    x: item.x + offset.x,
    y: item.y + offset.y,
    text: item.text,
    fontSize: item.fontSize,
    textAlign: item.textAlign,
    textBaseline: item.textBaseline,
    rotation: item.rotation
  });
}

function candidateScore(bounds, boundary, placed, candidate, order) {
  return {
    outside: overflow(bounds, boundary),
    overlap: placed.reduce(
      (area, prior) => area + intersectionArea(bounds, prior),
      0
    ),
    distanceSquared: candidate.distanceSquared,
    order
  };
}

function compareScore(first, second) {
  return Number(first.outside > 0) - Number(second.outside > 0) ||
    first.outside - second.outside ||
    first.overlap - second.overlap ||
    first.distanceSquared - second.distanceSquared ||
    first.order - second.order;
}

function overlapPairs(items) {
  const pairs = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      if (
        intersectionArea(
          items[first].collisionBounds,
          items[second].collisionBounds
        ) > 0
      ) {
        pairs.push([items[first].id, items[second].id]);
      }
    }
  }
  return pairs;
}

export function resolveLabelLayout({ items, bounds, ...options } = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError("Label layout requires an item array.");
  }
  validateBounds(bounds);
  const policy = normalizeLabelLayoutPolicy(options);
  const ids = new Set();
  for (const item of items) validateItem(item, ids);
  const candidates = enumerateLabelOffsets(policy);
  const base = items.map(item => ({
    id: item.id,
    collisionBounds: expanded(textBounds(item), policy.padding)
  }));
  const placed = [];
  const resolved = [];
  for (const item of items) {
    let best;
    for (const [order, candidate] of candidates.entries()) {
      const boundsAtCandidate = textBounds(item, candidate);
      const collisionBounds = expanded(boundsAtCandidate, policy.padding);
      const score = candidateScore(
        collisionBounds,
        bounds,
        placed,
        candidate,
        order
      );
      if (best === undefined || compareScore(score, best.score) < 0) {
        best = { candidate, bounds: boundsAtCandidate, collisionBounds, score };
      }
      if (score.outside === 0 && score.overlap === 0) break;
    }
    const resolvedItem = {
      ...item,
      baseX: item.x,
      baseY: item.y,
      x: item.x + best.candidate.x,
      y: item.y + best.candidate.y,
      dx: best.candidate.x,
      dy: best.candidate.y,
      distance: Math.sqrt(best.candidate.distanceSquared),
      bounds: best.bounds,
      collisionBounds: best.collisionBounds
    };
    placed.push(resolvedItem.collisionBounds);
    resolved.push(resolvedItem);
  }
  const beforePairs = overlapPairs(base);
  const afterPairs = overlapPairs(resolved);
  const outside = resolved
    .filter(item => overflow(item.collisionBounds, bounds) > 0)
    .map(item => item.id);
  const warnings = [];
  if (afterPairs.length > 0) warnings.push({ code: "overlap", pairs: afterPairs });
  if (outside.length > 0) warnings.push({ code: "bounds", items: outside });
  return cloneAndFreeze({
    items: resolved,
    overlapBefore: beforePairs.length,
    overlapAfter: afterPairs.length,
    warnings
  });
}

function contains(bounds, point) {
  return point.x >= bounds.left && point.x <= bounds.right &&
    point.y >= bounds.top && point.y <= bounds.bottom;
}

export function resolveLabelLeader(item) {
  if (!isPlainObject(item) || ![item.dx, item.dy].every(Number.isFinite)) {
    throw new TypeError("Label leader requires a resolved label item.");
  }
  if (item.dx === 0 && item.dy === 0) return undefined;
  const source = { x: item.sourceX, y: item.sourceY };
  if (contains(item.bounds, source)) return undefined;
  const center = {
    x: (item.bounds.left + item.bounds.right) / 2,
    y: (item.bounds.top + item.bounds.bottom) / 2
  };
  const dx = center.x - source.x;
  const dy = center.y - source.y;
  const enterX = dx > 0
    ? (item.bounds.left - source.x) / dx
    : dx < 0
      ? (item.bounds.right - source.x) / dx
      : 0;
  const enterY = dy > 0
    ? (item.bounds.top - source.y) / dy
    : dy < 0
      ? (item.bounds.bottom - source.y) / dy
      : 0;
  const ratio = Math.max(0, Math.min(1, Math.max(enterX, enterY)));
  return cloneAndFreeze({
    id: item.id,
    x1: source.x,
    y1: source.y,
    x2: source.x + dx * ratio,
    y2: source.y + dy * ratio
  });
}
