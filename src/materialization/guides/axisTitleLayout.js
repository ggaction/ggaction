import { resolveAxisTitleAlong, resolveAxisTitleGeometry } from "../../grammar/axisGeometry.js";
import { axisTitleTextLines } from "../../grammar/axisTextPlacement.js";
import { resolveTextBounds, textBoundsIntersect } from "../../core/textMetrics.js";

// Read-only native title placement. The action owns resource lookup, inferred
// defaults, intent and writes; prepared consumers provide the current label ink.
export function axisTitleBounds(geometry, config, text, profile) {
  return resolveTextBounds({
    ...geometry,
    text,
    lines: axisTitleTextLines(text, config),
    fontSize: config.fontSize,
    fontFamily: config.fontFamily,
    fontWeight: config.fontWeight,
    textAlign: config.align ?? "center",
    textBaseline: config.baseline ?? "middle",
    rotation: config.rotation
  }, profile);
}

export function resolveInferredAxisTitleOffset({ channel, config, text, profile, frame, canvas,
  labels, labelBounds, preferred, scale, unclamped }) {
  if (!frame || !canvas || !labels) return preferred;
  const horizontal = channel === "x";
  const positive = config.position === (horizontal ? "bottom" : "right");
  const near = horizontal ? "top" : "left";
  const far = horizontal ? "bottom" : "right";
  const bounds = axisTitleBounds(resolveAxisTitleGeometry({
    bounds: frame, channel, position: config.position, along: 0, offset: preferred
  }), config, text, profile);
  const needed = positive ? labels[far] + 4 - bounds[near] : bounds[far] - labels[near] + 4;
  const available = positive ? canvas[horizontal ? "height" : "width"] - bounds[far] : bounds[near];
  // Preserve the native optional ink reserve for rotated middle-baseline Y
  // titles, without introducing a collision with the current label rows.
  const inkClearance = channel === "y" && Math.abs(Math.cos(config.rotation)) < 1e-10 ? config.fontSize / 4 : 0;
  if (unclamped) return preferred + Math.max(0, needed);
  const legacyAdjustment = Math.min(available, Math.max(0, needed));
  if (inkClearance === 0) return preferred + legacyAdjustment;
  const adjustment = Math.min(available - inkClearance, Math.max(0, needed));
  const candidateBounds = axisTitleBounds(resolveAxisTitleGeometry({
    bounds: frame, channel, position: config.position,
    along: resolveAxisTitleAlong(scale, config), offset: preferred + adjustment
  }), config, text, profile);
  return preferred + (labelBounds.some(label => label && textBoundsIntersect(candidateBounds, label))
    ? legacyAdjustment : adjustment);
}

export function assertLabelRelativeTitleSide(position, labelPosition) {
  if (labelPosition !== position) throw new Error("Label-relative title offset requires labels on the same axis side.");
}

export function resolveLabelRelativeAxisTitleOffset({ channel, config, text, profile, frame, along,
  labelPosition, labelBounds }) {
  assertLabelRelativeTitleSide(config.position, labelPosition);
  if (labelBounds.length === 0) throw new Error("Label-relative title offset requires nonempty axis labels.");
  const near = channel === "x" ? "top" : "left", far = channel === "x" ? "bottom" : "right";
  const positive = config.position === (channel === "x" ? "bottom" : "right");
  const zero = axisTitleBounds(resolveAxisTitleGeometry({ bounds: frame, channel,
    position: config.position, along, offset: 0 }), config, text, profile);
  const offset = positive
    ? Math.max(...labelBounds.map(bound => bound[far])) + config.offset.gap - zero[near]
    : zero[far] - Math.min(...labelBounds.map(bound => bound[near])) + config.offset.gap;
  if (!Number.isFinite(offset)) throw new RangeError("Label-relative title offset must resolve to a finite distance.");
  return offset;
}
