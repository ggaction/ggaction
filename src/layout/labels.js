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
const PLACEMENT_OPTIONS = Object.freeze([
  "anchor", "gap", "overflow", "leader"
]);
const PLACEMENT_LEADER_OPTIONS = Object.freeze(["stroke", "strokeWidth"]);
const SEMANTIC_ANCHORS = new Set([
  "center", "insideStart", "insideEnd", "outsideStart", "outsideEnd"
]);
const OVERFLOW_POLICIES = new Set(["hide", "outside", "allow"]);

export const DEFAULT_MARK_LABEL_PLACEMENT = cloneAndFreeze({
  gap: 4,
  overflow: "hide",
  leader: false
});

export function markLabelPlacementLeaderId(target) {
  return `${target}-placement-leaders`;
}

function normalizePlacementLeader(value) {
  if (value === undefined || value === false) return false;
  validateOptionObject(value, PLACEMENT_LEADER_OPTIONS, "mark label placement leader");
  const leader = { stroke: "#94a3b8", strokeWidth: 1, ...value };
  if (typeof leader.stroke !== "string" || leader.stroke.length === 0) {
    throw new TypeError("Mark label placement leader stroke must be a non-empty string.");
  }
  validateNonNegativeFinite(
    leader.strokeWidth,
    "Mark label placement leader strokeWidth"
  );
  return leader;
}

export function normalizeMarkLabelPlacement(value) {
  validateOptionObject(value, PLACEMENT_OPTIONS, "mark label placement", {
    allowEmpty: false,
    emptyError: TypeError
  });
  if (!SEMANTIC_ANCHORS.has(value.anchor)) {
    throw new Error(`Unsupported mark label anchor "${value.anchor}".`);
  }
  const gap = value.gap ?? DEFAULT_MARK_LABEL_PLACEMENT.gap;
  const overflowPolicy = value.overflow ?? DEFAULT_MARK_LABEL_PLACEMENT.overflow;
  validateNonNegativeFinite(gap, "Mark label placement gap");
  if (!OVERFLOW_POLICIES.has(overflowPolicy)) {
    throw new Error(`Unsupported mark label overflow "${overflowPolicy}".`);
  }
  return cloneAndFreeze({
    anchor: value.anchor,
    gap,
    overflow: overflowPolicy,
    leader: normalizePlacementLeader(value.leader)
  });
}

function finitePoint(value, label) {
  if (
    !isPlainObject(value) ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y)
  ) {
    throw new TypeError(`${label} requires finite x and y.`);
  }
  return value;
}

function unitVector(value, label) {
  finitePoint(value, label);
  const length = Math.hypot(value.x, value.y);
  if (!Number.isFinite(length) || length <= 0) {
    throw new RangeError(`${label} requires a non-zero direction.`);
  }
  return { x: value.x / length, y: value.y / length };
}

function validateIntervalBounds(bounds) {
  if (
    !isPlainObject(bounds) ||
    ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
    bounds.right < bounds.left ||
    bounds.bottom < bounds.top
  ) {
    throw new RangeError("Interval label placement requires ordered finite bounds.");
  }
}

function validatePlacementGeometry(geometry, anchor) {
  if (!isPlainObject(geometry)) {
    throw new TypeError("Mark label placement requires source geometry.");
  }
  if (geometry.kind === "interval") {
    finitePoint(geometry.center, "Interval label center");
    for (const role of ["start", "end"]) {
      finitePoint(geometry[role]?.point, `Interval label ${role}`);
      unitVector(geometry[role]?.outward, `Interval label ${role}`);
    }
    validateIntervalBounds(geometry.bounds);
    return;
  }
  if (geometry.kind === "arc") {
    if (![geometry.centerX, geometry.centerY, geometry.startTheta,
      geometry.endTheta, geometry.innerRadius, geometry.outerRadius]
      .every(Number.isFinite)) {
      throw new TypeError("Arc label placement requires finite sector geometry.");
    }
    if (
      geometry.innerRadius < 0 ||
      geometry.outerRadius <= geometry.innerRadius ||
      geometry.startTheta === geometry.endTheta ||
      Math.abs(geometry.endTheta - geometry.startTheta) > 360
    ) {
      throw new RangeError("Arc label placement requires an ordered annular sector.");
    }
    return;
  }
  if (geometry.kind === "point") {
    finitePoint(geometry.center, "Point label center");
    if (anchor === "outsideEnd") {
      finitePoint(geometry.end?.point, "Polar Point label boundary");
      unitVector(geometry.end?.outward, "Polar Point label direction");
    }
    return;
  }
  throw new Error(`Unsupported mark label placement geometry "${geometry.kind}".`);
}

export function assertMarkLabelPlacementSupport({ markType, coordinateType, intervalAxis }, placement) {
  const anchor = placement.anchor;
  if (markType === "bar" || markType === "arc") return placement;
  if (markType === "rect") {
    if (anchor === "center" || intervalAxis !== undefined) return placement;
    throw new Error("Rect semantic label placement requires one explicit interval axis.");
  }
  if (markType === "point") {
    if (anchor === "center" || (coordinateType === "polar" && anchor === "outsideEnd")) {
      return placement;
    }
    throw new Error(
      coordinateType === "polar"
        ? `Polar Point does not support mark label anchor "${anchor}".`
        : `Point does not support mark label anchor "${anchor}".`
    );
  }
  if (markType === "line") {
    throw new Error("Line labels retain the endpoint API and do not accept semantic placement objects.");
  }
  if (markType === "rule") {
    throw new Error("Rule labels do not support semantic placement objects.");
  }
  throw new Error(`Mark type "${markType}" does not support semantic label placement.`);
}

function localTextBounds(text) {
  return resolveTextBounds({ ...text, x: 0, y: 0 }, text.profile);
}

function projectionRange(bounds, direction) {
  const values = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom }
  ].map(point => point.x * direction.x + point.y * direction.y);
  return { minimum: Math.min(...values), maximum: Math.max(...values) };
}

function boundaryCandidate(boundary, direction, gap, text) {
  const resolvedDirection = unitVector(direction, "Mark label placement direction");
  const support = projectionRange(localTextBounds(text), resolvedDirection);
  const distance = gap - support.minimum;
  return {
    x: boundary.x + resolvedDirection.x * distance + (text.dx ?? 0),
    y: boundary.y + resolvedDirection.y * distance + (text.dy ?? 0),
    sourceX: boundary.x,
    sourceY: boundary.y
  };
}

function centerCandidate(center, text) {
  return {
    x: center.x + (text.dx ?? 0),
    y: center.y + (text.dy ?? 0),
    sourceX: center.x,
    sourceY: center.y
  };
}

function candidateBounds(candidate, text) {
  return resolveTextBounds({ ...text, x: candidate.x, y: candidate.y }, text.profile);
}

function intervalContains(bounds, container) {
  const epsilon = 1e-9;
  return bounds.left >= container.left - epsilon &&
    bounds.right <= container.right + epsilon &&
    bounds.top >= container.top - epsilon &&
    bounds.bottom <= container.bottom + epsilon;
}

function distanceToRectangle(centerX, centerY, bounds) {
  const x = Math.max(bounds.left, Math.min(centerX, bounds.right));
  const y = Math.max(bounds.top, Math.min(centerY, bounds.bottom));
  return Math.hypot(x - centerX, y - centerY);
}

function thetaForPoint(point, geometry) {
  return Math.atan2(point.x - geometry.centerX, geometry.centerY - point.y) *
    180 / Math.PI;
}

function angleWithin(theta, start, end) {
  const sweep = end - start;
  if (Math.abs(sweep) >= 360 - 1e-9) return true;
  const direction = Math.sign(sweep);
  const progress = ((direction * (theta - start)) % 360 + 360) % 360;
  return progress <= Math.abs(sweep) + 1e-9;
}

function arcContains(bounds, geometry) {
  const points = [
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
    { x: (bounds.left + bounds.right) / 2, y: bounds.top },
    { x: bounds.right, y: (bounds.top + bounds.bottom) / 2 },
    { x: (bounds.left + bounds.right) / 2, y: bounds.bottom },
    { x: bounds.left, y: (bounds.top + bounds.bottom) / 2 }
  ];
  const minimumRadius = distanceToRectangle(
    geometry.centerX,
    geometry.centerY,
    bounds
  );
  const maximumRadius = Math.max(...points.slice(0, 4).map(point =>
    Math.hypot(point.x - geometry.centerX, point.y - geometry.centerY)
  ));
  const epsilon = 1e-9;
  return minimumRadius >= geometry.innerRadius - epsilon &&
    maximumRadius <= geometry.outerRadius + epsilon &&
    points.every(point => angleWithin(
      thetaForPoint(point, geometry),
      geometry.startTheta,
      geometry.endTheta
    ));
}

function arcRole(geometry, role) {
  const theta = geometry.startTheta +
    (geometry.endTheta - geometry.startTheta) / 2;
  const radians = theta * Math.PI / 180;
  const radial = { x: Math.sin(radians), y: -Math.cos(radians) };
  const radius = role === "start" ? geometry.innerRadius : geometry.outerRadius;
  return {
    point: {
      x: geometry.centerX + radial.x * radius,
      y: geometry.centerY + radial.y * radius
    },
    outward: role === "start"
      ? { x: -radial.x, y: -radial.y }
      : radial
  };
}

function geometryRole(geometry, role) {
  return geometry.kind === "arc" ? arcRole(geometry, role) : geometry[role];
}

function geometryCenter(geometry) {
  if (geometry.kind !== "arc") return geometry.center;
  const role = arcRole(geometry, "end");
  const radius = (geometry.innerRadius + geometry.outerRadius) / 2;
  return {
    x: geometry.centerX + role.outward.x * radius,
    y: geometry.centerY + role.outward.y * radius
  };
}

function candidateForAnchor(anchor, geometry, placement, text) {
  if (anchor === "center") return centerCandidate(geometryCenter(geometry), text);
  const roleName = anchor.endsWith("Start") ? "start" : "end";
  const role = geometryRole(geometry, roleName);
  const outside = anchor.startsWith("outside");
  const direction = outside
    ? role.outward
    : { x: -role.outward.x, y: -role.outward.y };
  return boundaryCandidate(role.point, direction, placement.gap, text);
}

function arcOutsideStartCrossesCenter(candidate, geometry, text) {
  if (geometry.kind !== "arc") return false;
  const radial = arcRole(geometry, "end").outward;
  const projections = projectionRange(candidateBounds(candidate, text), radial);
  const centerProjection = geometry.centerX * radial.x + geometry.centerY * radial.y;
  return projections.minimum < centerProjection - 1e-9;
}

function fitsSource(candidate, geometry, text) {
  if (geometry.kind === "point") return true;
  const bounds = candidateBounds(candidate, text);
  return geometry.kind === "arc"
    ? arcContains(bounds, geometry)
    : intervalContains(bounds, geometry.bounds);
}

function outsideFallback(anchor) {
  return anchor === "insideStart" ? "outsideStart" : "outsideEnd";
}

export function resolveMarkLabelPlacement({ placement, geometry, text } = {}, profile) {
  text = { ...text, profile };
  const normalized = normalizeMarkLabelPlacement(placement);
  validatePlacementGeometry(geometry, normalized.anchor);
  let anchor = normalized.anchor;
  let candidate = candidateForAnchor(anchor, geometry, normalized, text);
  const requiresFit = anchor === "center" || anchor.startsWith("inside");
  if (requiresFit && !fitsSource(candidate, geometry, text)) {
    if (normalized.overflow === "hide") {
      return cloneAndFreeze({ visible: false, anchor, fallback: false });
    }
    if (normalized.overflow === "outside") {
      anchor = outsideFallback(anchor);
      candidate = candidateForAnchor(anchor, geometry, normalized, text);
    }
  }
  if (
    anchor === "outsideStart" &&
    normalized.overflow !== "allow" &&
    arcOutsideStartCrossesCenter(candidate, geometry, text)
  ) {
    return cloneAndFreeze({
      visible: false,
      anchor,
      fallback: anchor !== normalized.anchor
    });
  }
  return cloneAndFreeze({
    visible: true,
    anchor,
    fallback: anchor !== normalized.anchor,
    ...candidate,
    bounds: candidateBounds(candidate, text)
  });
}

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

function textBounds(item, offset = { x: 0, y: 0 }, profile) {
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
  }, profile);
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

export function resolveLabelLayout({ items, bounds, ...options } = {}, profile) {
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
    collisionBounds: expanded(textBounds(item, undefined, profile), policy.padding)
  }));
  const placed = [];
  const resolved = [];
  for (const item of items) {
    let best;
    for (const [order, candidate] of candidates.entries()) {
      const boundsAtCandidate = textBounds(item, candidate, profile);
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

export function assertPolarTextLayout({ canvas, items, label }, profile) {
  const dimensions = canvas?.properties;
  if (
    ![dimensions?.width, dimensions?.height].every(Number.isFinite) ||
    dimensions.width <= 0 || dimensions.height <= 0
  ) {
    throw new Error("Polar text layout requires finite Canvas dimensions.");
  }
  const bounds = items.map(item => resolveTextBounds(item, profile));
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
