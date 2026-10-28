import { paintColorCSS } from "../../grammar/color.js";
import { patternFillGeometry } from "../../grammar/patterns.js";
import { tracePath } from "./pathTrace.js";
import {
  isLinearGradientPaint,
  validateConcreteFillPaint, isPatternPaint, isRadialGradientPaint
} from "../../grammar/paint.js";
import { resolveCanvasGradientCoordinates } from "./native.js";

// SVG's no-paint keyword is not a valid Canvas color assignment. Assign a real
// transparent color so the backend cannot retain a previous opaque paint.
export function resolveCanvasSolidPaint(paint) {
  return paint === "none" ? "rgba(0,0,0,0)" : paint;
}

export function applyCanvasFill(context, fill, bounds, graphicId) {
  validateConcreteFillPaint(fill, `${graphicId}.fill`);
  if (!isLinearGradientPaint(fill)) {
    context.fillStyle = resolveCanvasSolidPaint(fill);
    return fill;
  }
  if (typeof context.createLinearGradient !== "function") {
    throw new TypeError(
      `Graphic "${graphicId}" requires Canvas context createLinearGradient().`
    );
  }
  const coordinates = resolveCanvasGradientCoordinates(fill, bounds, graphicId);
  const gradient = context.createLinearGradient(
    coordinates.from.x,
    coordinates.from.y,
    coordinates.to.x,
    coordinates.to.y
  );
  if (gradient === null || typeof gradient !== "object" || typeof gradient.addColorStop !== "function") {
    throw new TypeError(
      `Graphic "${graphicId}" requires a Canvas linear gradient with addColorStop().`
    );
  }
  for (const stop of fill.stops) gradient.addColorStop(stop.offset, stop.color);
  context.fillStyle = gradient;
  return gradient;
}

// Structured fills use the glyph's already-authored contour as a clip. Trace is
// supplied by the primitive drawer and is replayed before any following stroke.
export function fillCanvasPath(context, fill, bounds, graphicId, trace, fillRule, paintArea = bounds) {
  if (!isPatternPaint(fill) && !isRadialGradientPaint(fill)) {
    applyCanvasFill(context, fill, bounds, graphicId);
    if (fillRule === undefined) context.fill();
    else context.fill(fillRule);
    return;
  }
  validateConcreteFillPaint(fill, `${graphicId}.fill`);
  context.save();
  try {
    if (fillRule === undefined) context.clip();
    else context.clip(fillRule);
    if (isPatternPaint(fill)) {
      const { type, origin, ...options } = fill;
      const geometry = patternFillGeometry(options, bounds, [origin.x, origin.y]);
      context.fillStyle = paintColorCSS(fill.background);
      context.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
      if (geometry.commands.length > 0) {
        context.fillStyle = paintColorCSS(fill.foreground);
        context.beginPath();
        tracePath(context, geometry.commands);
        context.fill("nonzero");
      }
    } else {
      fillCanvasRadialRectangle(context, fill, bounds, graphicId, paintArea);
    }
  } finally {
    context.restore();
    context.beginPath();
    trace();
  }
}

export function preflightCanvasFillCapabilities(objects, context) {
  const fills = objects.flatMap(object =>
    [object, ...(object.items ?? [])].map(item => item.properties?.fill));
  if (fills.some(fill => isPatternPaint(fill) || isRadialGradientPaint(fill))) {
    for (const method of ["save", "restore", "clip", "beginPath", "closePath", "moveTo", "lineTo", "fillRect"]) {
      if (typeof context[method] !== "function") throw new TypeError(`Structured paint requires Canvas ${method}().`);
    }
  }
  if (fills.some(isRadialGradientPaint)) {
    for (const method of ["createRadialGradient", "translate", "scale"]) {
      if (typeof context[method] !== "function") throw new TypeError(`Radial paint requires Canvas ${method}().`);
    }
    if (typeof context.createRadialGradient(0, 0, 0, .5, .5, 1)?.addColorStop !== "function") {
      throw new TypeError("Radial paint requires Canvas gradient addColorStop().");
    }
  }
}

// Keep the affine frame active through fill: native PDF and Canvas gradient
// implementations differ in whether creation captures the current transform.
function fillCanvasRadialRectangle(context, fill, bounds, graphicId, paintArea) {
  const width = bounds.right - bounds.left, height = bounds.bottom - bounds.top;
  if (width === 0 || height === 0) return;
  const area = { left: (paintArea.left - bounds.left) / width, right: (paintArea.right - bounds.left) / width,
    top: (paintArea.top - bounds.top) / height, bottom: (paintArea.bottom - bounds.top) / height };
  context.save();
  try {
    context.translate(bounds.left, bounds.top); context.scale(width, height);
    const dx = fill.focal.x - fill.center.x, dy = fill.focal.y - fill.center.y;
    if (Math.hypot(dx, dy) === fill.radius) {
      const direction = { x: -dx / fill.radius, y: -dy / fill.radius };
      const reach = 4 + Math.max(...Object.values(area).map(Math.abs)) * 4;
      const tangent = { x: -direction.y, y: direction.x };
      const a = { x: fill.focal.x + tangent.x * reach, y: fill.focal.y + tangent.y * reach };
      const b = { x: fill.focal.x - tangent.x * reach, y: fill.focal.y - tangent.y * reach };
      context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y);
      context.lineTo(b.x + direction.x * reach, b.y + direction.y * reach);
      context.lineTo(a.x + direction.x * reach, a.y + direction.y * reach);
      context.closePath(); context.clip();
    }
    const gradient = context.createRadialGradient(fill.focal.x, fill.focal.y, 0, fill.center.x, fill.center.y, fill.radius);
    if (!gradient || typeof gradient.addColorStop !== "function") throw new TypeError(`Graphic "${graphicId}" requires Canvas radial gradients.`);
    for (const stop of fill.stops) gradient.addColorStop(stop.offset, paintColorCSS(stop.color, context.globalAlpha));
    context.globalAlpha = 1; context.fillStyle = gradient;
    context.fillRect(area.left, area.top, area.right - area.left, area.bottom - area.top);
  } finally { context.restore(); }
}
