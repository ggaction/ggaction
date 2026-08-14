import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import {
  resolveTextBounds,
  textBoundsFitCanvas,
  textBoundsIntersect
} from "../core/textMetrics.js";
import {
  validateNonNegativeFinite,
  validateOptionObject,
  validateWorkLimit
} from "../core/validation.js";

const AXES = new Set(["x", "y", "both"]);
const BOUNDS = new Set(["plot", "canvas"]);
const POLICY_OPTIONS = Object.freeze([
  "axis", "padding", "maxDisplacement", "bounds"
]);
const MAX_EXHAUSTIVE_OFFSET_STEPS = 28;
const MAX_SEARCH_DISPLACEMENT = 1_000_000;
const DISTANT_RING_COUNT = 16;
const DISTANT_ANGLE_COUNT = 32;

export const DEFAULT_LABEL_LAYOUT_GEOMETRY = cloneAndFreeze({
  axis: "both",
  padding: 3,
  maxDisplacement: 48,
  bounds: "plot"
});

export function normalizeLabelLayoutGeometry(options = {}) {
  validateOptionObject(options, POLICY_OPTIONS, "label layout");
  const normalized = {
    ...DEFAULT_LABEL_LAYOUT_GEOMETRY,
    ...options
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
  const policy = normalizeLabelLayoutGeometry({ axis, padding, maxDisplacement });
  const step = Math.max(2, policy.padding);
  const displacement = Math.min(
    policy.maxDisplacement,
    MAX_SEARCH_DISPLACEMENT
  );
  const limit = Math.ceil(displacement / step);
  const localLimit = Math.min(limit, MAX_EXHAUSTIVE_OFFSET_STEPS);
  const candidates = [];
  const addCandidate = (x, y) => {
    if (![x, y].every(Number.isFinite)) return;
    const distanceSquared = x ** 2 + y ** 2;
    if (Math.sqrt(distanceSquared) > displacement + 1e-9) return;
    candidates.push({ x, y, distanceSquared });
  };
  for (let x = -localLimit; x <= localLimit; x += 1) {
    for (let y = -localLimit; y <= localLimit; y += 1) {
      if (policy.axis === "x" && y !== 0) continue;
      if (policy.axis === "y" && x !== 0) continue;
      addCandidate(x * step, y * step);
    }
  }
  if (limit > localLimit) {
    const localRadius = localLimit * step;
    for (let ring = 1; ring <= DISTANT_RING_COUNT; ring += 1) {
      const radius = localRadius + (displacement - localRadius) *
        ring / DISTANT_RING_COUNT;
      if (policy.axis === "x" || policy.axis === "y") {
        addCandidate(
          policy.axis === "x" ? radius : 0,
          policy.axis === "y" ? radius : 0
        );
        addCandidate(
          policy.axis === "x" ? -radius : 0,
          policy.axis === "y" ? -radius : 0
        );
        continue;
      }
      for (let angle = 0; angle < DISTANT_ANGLE_COUNT; angle += 1) {
        const radians = angle / DISTANT_ANGLE_COUNT * Math.PI * 2;
        addCandidate(radius * Math.cos(radians), radius * Math.sin(radians));
      }
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
    fontFamily: item.fontFamily,
    fontWeight: item.fontWeight,
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
  const policy = normalizeLabelLayoutGeometry(options);
  const ids = new Set();
  for (const item of items) validateItem(item, ids);
  const candidates = enumerateLabelOffsets(policy);
  validateWorkLimit(
    items.length ** 2 * candidates.length,
    "Label layout work"
  );
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

export function assertPolarTextLayout({ canvas, items, label }) {
  const dimensions = canvas?.properties;
  if (
    ![dimensions?.width, dimensions?.height].every(Number.isFinite) ||
    dimensions.width <= 0 || dimensions.height <= 0
  ) {
    throw new Error("Polar text layout requires finite Canvas dimensions.");
  }
  const bounds = items.map(resolveTextBounds);
  const outside = bounds.some(item => !textBoundsFitCanvas(item, dimensions));
  let overlap = false;
  for (let first = 0; first < bounds.length && !overlap; first += 1) {
    for (let second = first + 1; second < bounds.length; second += 1) {
      if (
        (Math.abs(items[first].x - items[second].x) > 1e-9 ||
          Math.abs(items[first].y - items[second].y) > 1e-9) &&
        textBoundsIntersect(bounds[first], bounds[second])
      ) {
        overlap = true;
        break;
      }
    }
  }
  if (outside || overlap) {
    const verb = label.endsWith("labels") ? "require" : "requires";
    throw new Error(`${label} ${verb} sufficient non-overlapping Canvas space.`);
  }
}

export function resolveLabelLeader(item) {
  if (!isPlainObject(item) || ![item.dx, item.dy].every(Number.isFinite)) {
    throw new TypeError("Label leader requires a resolved label item.");
  }
  if (item.dx === 0 && item.dy === 0) return undefined;
  const source = { x: item.sourceX, y: item.sourceY };
  if (
    source.x >= item.bounds.left && source.x <= item.bounds.right &&
    source.y >= item.bounds.top && source.y <= item.bounds.bottom
  ) return undefined;
  const midpoint = (start, end) => {
    const sum = start + end;
    return Number.isFinite(sum) ? sum / 2 : start / 2 + end / 2;
  };
  const center = {
    x: midpoint(item.bounds.left, item.bounds.right),
    y: midpoint(item.bounds.top, item.bounds.bottom)
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
