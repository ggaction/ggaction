function codePointWidth(codePoint) {
  if (/\s/u.test(codePoint)) return 0.28;
  if (/[iIl1.,:;!'|]/u.test(codePoint)) return 0.27;
  if (/[mwMW@#%&]/u.test(codePoint)) return 0.82;
  if (/[A-Z]/u.test(codePoint)) return 0.61;
  if (/[0-9]/u.test(codePoint)) return 0.53;
  if (/[-_]/u.test(codePoint)) return 0.34;
  if (codePoint.codePointAt(0) > 0x7f) return 1;
  return 0.47;
}

export function oracleTextWidth(text, fontSize) {
  if (typeof text !== "string" || !Number.isFinite(fontSize) || fontSize <= 0) {
    throw new TypeError("Label oracle requires text and a positive font size.");
  }
  return [...text].reduce(
    (width, codePoint) => width + codePointWidth(codePoint) * fontSize,
    0
  );
}

function horizontalExtents(width, align) {
  if (align === "center") return [-width / 2, width / 2];
  if (["right", "end"].includes(align)) return [-width, 0];
  return [0, width];
}

function verticalExtents(fontSize, baseline) {
  if (baseline === "middle") return [-fontSize / 2, fontSize / 2];
  if (["top", "hanging"].includes(baseline)) return [0, fontSize];
  if (["bottom", "ideographic"].includes(baseline)) return [-fontSize, 0];
  return [-fontSize * 0.8, fontSize * 0.2];
}

export function oracleTextBounds(item, offset = { x: 0, y: 0 }) {
  const x = item.x + offset.x;
  const y = item.y + offset.y;
  const rotation = item.rotation ?? 0;
  const width = oracleTextWidth(item.text, item.fontSize);
  const [left, right] = horizontalExtents(width, item.textAlign ?? "left");
  const [top, bottom] = verticalExtents(
    item.fontSize,
    item.textBaseline ?? "alphabetic"
  );
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  const corners = [
    [left, top], [right, top], [right, bottom], [left, bottom]
  ].map(([localX, localY]) => ({
    x: x + localX * cosine - localY * sine,
    y: y + localX * sine + localY * cosine
  }));
  return Object.freeze({
    left: Math.min(...corners.map(point => point.x)),
    right: Math.max(...corners.map(point => point.x)),
    top: Math.min(...corners.map(point => point.y)),
    bottom: Math.max(...corners.map(point => point.y))
  });
}

function validateBounds(bounds) {
  if (
    bounds === null ||
    typeof bounds !== "object" ||
    ![bounds.left, bounds.right, bounds.top, bounds.bottom].every(Number.isFinite) ||
    bounds.right <= bounds.left ||
    bounds.bottom <= bounds.top
  ) {
    throw new RangeError("Label oracle requires ordered finite bounds.");
  }
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
  if (!new Set(["x", "y", "both"]).has(axis)) {
    throw new TypeError("Label oracle axis must be x, y, or both.");
  }
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError("Label oracle padding must be non-negative.");
  }
  if (!Number.isFinite(maxDisplacement) || maxDisplacement < 0) {
    throw new RangeError("Label oracle maxDisplacement must be non-negative.");
  }
  const step = Math.max(2, padding);
  const limit = Math.ceil(maxDisplacement / step);
  const candidates = [];
  for (let x = -limit; x <= limit; x += 1) {
    for (let y = -limit; y <= limit; y += 1) {
      if (axis === "x" && y !== 0) continue;
      if (axis === "y" && x !== 0) continue;
      const offset = { x: x * step, y: y * step };
      const distanceSquared = offset.x ** 2 + offset.y ** 2;
      if (Math.sqrt(distanceSquared) > maxDisplacement + 1e-9) continue;
      candidates.push({ ...offset, distanceSquared });
    }
  }
  candidates.sort((first, second) =>
    first.distanceSquared - second.distanceSquared ||
    Math.abs(first.x) - Math.abs(second.x) ||
    first.y - second.y ||
    second.x - first.x
  );
  return Object.freeze(candidates.map(candidate => Object.freeze(candidate)));
}

function scoreCandidate(bounds, boundary, placed, order) {
  const outside = overflow(bounds, boundary);
  const overlap = placed.reduce(
    (area, prior) => area + intersectionArea(bounds, prior),
    0
  );
  return { outside, overlap, order };
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
      if (intersectionArea(items[first].collisionBounds, items[second].collisionBounds) > 0) {
        pairs.push([items[first].id, items[second].id]);
      }
    }
  }
  return pairs;
}

export function resolveLabelLayoutOracle({
  items,
  axis = "both",
  padding = 3,
  maxDisplacement = 48,
  bounds
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("Label oracle requires a non-empty item array.");
  }
  validateBounds(bounds);
  const ids = new Set();
  for (const item of items) {
    if (
      typeof item.id !== "string" || item.id.length === 0 || ids.has(item.id) ||
      ![item.x, item.y, item.sourceX, item.sourceY, item.fontSize].every(Number.isFinite) ||
      typeof item.text !== "string" || item.text.length === 0
    ) {
      throw new TypeError("Label oracle items require unique ids, text, and finite geometry.");
    }
    ids.add(item.id);
  }
  const candidates = enumerateLabelOffsets({ axis, padding, maxDisplacement });
  const base = items.map(item => ({
    id: item.id,
    collisionBounds: expanded(oracleTextBounds(item), padding)
  }));
  const placed = [];
  const resolved = [];
  for (const item of items) {
    let best;
    for (const [order, candidate] of candidates.entries()) {
      const textBounds = oracleTextBounds(item, candidate);
      const collisionBounds = expanded(textBounds, padding);
      const score = {
        ...scoreCandidate(collisionBounds, bounds, placed, order),
        distanceSquared: candidate.distanceSquared
      };
      const result = { candidate, textBounds, collisionBounds, score };
      if (best === undefined || compareScore(score, best.score) < 0) best = result;
      if (score.outside === 0 && score.overlap === 0) break;
    }
    const entry = Object.freeze({
      ...item,
      baseX: item.x,
      baseY: item.y,
      x: item.x + best.candidate.x,
      y: item.y + best.candidate.y,
      dx: best.candidate.x,
      dy: best.candidate.y,
      distance: Math.sqrt(best.candidate.distanceSquared),
      bounds: Object.freeze(best.textBounds),
      collisionBounds: Object.freeze(best.collisionBounds)
    });
    placed.push(entry.collisionBounds);
    resolved.push(entry);
  }
  const beforePairs = overlapPairs(base);
  const afterPairs = overlapPairs(resolved);
  const outside = resolved
    .filter(item => overflow(item.collisionBounds, bounds) > 0)
    .map(item => item.id);
  const warnings = [];
  if (afterPairs.length > 0) {
    warnings.push(Object.freeze({ code: "overlap", pairs: Object.freeze(afterPairs) }));
  }
  if (outside.length > 0) {
    warnings.push(Object.freeze({ code: "bounds", items: Object.freeze(outside) }));
  }
  return Object.freeze({
    items: Object.freeze(resolved),
    overlapBefore: beforePairs.length,
    overlapAfter: afterPairs.length,
    warnings: Object.freeze(warnings)
  });
}

function contains(bounds, point) {
  return point.x >= bounds.left && point.x <= bounds.right &&
    point.y >= bounds.top && point.y <= bounds.bottom;
}

export function resolveLeaderSegment(item) {
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
  return Object.freeze({
    id: item.id,
    x1: source.x,
    y1: source.y,
    x2: source.x + dx * ratio,
    y2: source.y + dy * ratio
  });
}
