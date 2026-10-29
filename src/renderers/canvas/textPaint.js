import { canvasFactory } from "./surfaceFactory.js";
import { MAX_RASTER_DIMENSION, MAX_RASTER_PIXELS } from "./limits.js";
import { validatePatternWork } from "../../grammar/patterns.js";
import { walkGraphicPaintItems } from "../paintFrames.js";
import { fillCanvasPath, preflightCanvasFillCapabilities } from "./fill.js";

function dimensions(width, height, pixelRatio) {
  width = Math.max(1, Math.ceil(width * pixelRatio));
  height = Math.max(1, Math.ceil(height * pixelRatio));
  if (![width, height].every(Number.isSafeInteger) || width > MAX_RASTER_DIMENSION ||
      height > MAX_RASTER_DIMENSION || width * height > MAX_RASTER_PIXELS) {
    throw new RangeError("Text paint surface exceeds the raster allocation limit.");
  }
  return { width, height };
}

// Cover the visible canvas in the text's unrotated local frame. This deliberately
// does not clip to estimated text metrics: native glyph overhangs stay visible.
function radialCoverage(target, properties, offset) {
  const cosine = Math.cos(properties.rotation ?? 0), sine = Math.sin(properties.rotation ?? 0);
  const points = [[0, 0], [target.width, 0], [target.width, target.height], [0, target.height]].map(([x, y]) => {
    const dx = x - offset[0] - properties.x, dy = y - offset[1] - properties.y;
    return { x: properties.x + dx * cosine + dy * sine, y: properties.y - dx * sine + dy * cosine };
  });
  return { left: Math.min(...points.map(point => point.x)), right: Math.max(...points.map(point => point.x)),
    top: Math.min(...points.map(point => point.y)), bottom: Math.max(...points.map(point => point.y)) };
}

export function prepareTextPaints(target, context, { pixelRatio = 1, createCanvas, objects = Object.values(target.graphicSpec.objects) } = {}) {
  const plans = new Map();
  let work = 0;
  function plan(id, item, type, frame) {
    const properties = item.properties, fill = properties?.fill;
    if (type !== "text" || !["pattern", "radial-gradient"].includes(fill?.type)) return;
    if (!properties.fillBounds) throw new TypeError("Text paint requires concrete fillBounds.");
    const coverage = fill.type === "pattern" ? { left: 0, top: 0, right: fill.pitch, bottom: fill.pitch }
      : radialCoverage(target, properties, frame.offset);
    const size = dimensions(coverage.right - coverage.left, coverage.bottom - coverage.top, pixelRatio);
    work += size.width * size.height; validatePatternWork(work);
    plans.set(id, { ...size, coverage });
  }
  walkGraphicPaintItems(target, plan);
  if (plans.size === 0) return undefined;
  const surface = canvasFactory(context, createCanvas)(1, 1);
  const source = surface?.getContext?.("2d");
  if (!source || ["save", "restore", "scale", "translate", "clip", "fillRect", "beginPath", "moveTo", "lineTo", "closePath", "fill", "bezierCurveTo"]
    .some(method => typeof source[method] !== "function") || typeof context.createPattern !== "function" ||
      typeof context.createPattern(surface, "repeat")?.setTransform !== "function") {
    throw new TypeError("Text paint requires Canvas pattern transforms and a compatible surface.");
  }
  preflightCanvasFillCapabilities(objects, source);
  return { surface, plans };
}

// Rasterize paint only; native fillText supplies the actual glyph alpha. Text
// topology and origins remain authored, including whitespace and glyph overhangs.
export function applyCanvasTextPattern(context, fill, bounds, properties, graphicId, prepared) {
  const plan = prepared?.plans.get(graphicId);
  if (!plan) throw new TypeError("Text paint requires a prepared Canvas paint surface.");
  const { surface } = prepared, { width, height, coverage } = plan;
  surface.width = width; surface.height = height;
  const source = surface.getContext("2d");
  const logicalWidth = coverage.right - coverage.left, logicalHeight = coverage.bottom - coverage.top;
  if (logicalWidth === 0 || logicalHeight === 0) { context.fillStyle = "rgba(0,0,0,0)"; return; }
  source.scale(width / logicalWidth, height / logicalHeight);
  source.translate(-coverage.left, -coverage.top);
  source.globalAlpha = 1;
  const trace = () => {
    source.moveTo(coverage.left, coverage.top); source.lineTo(coverage.right, coverage.top);
    source.lineTo(coverage.right, coverage.bottom); source.lineTo(coverage.left, coverage.bottom); source.closePath();
  };
  source.beginPath(); trace();
  const repeated = fill.type === "pattern";
  fillCanvasPath(source, repeated ? { ...fill, origin: { x: 0, y: 0 } } : fill,
    repeated ? coverage : bounds, graphicId, trace, undefined, coverage);
  const pattern = context.createPattern(surface, repeated ? "repeat" : "no-repeat");
  pattern.setTransform({ a: logicalWidth / width, b: 0, c: 0, d: logicalHeight / height,
    e: (repeated ? fill.origin.x : coverage.left) - properties.x,
    f: (repeated ? fill.origin.y : coverage.top) - properties.y });
  context.fillStyle = pattern;
}
