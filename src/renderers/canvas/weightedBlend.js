import { accumulateBlendPixels, encodeBlendPixels, MAX_BLEND_ITEM_PIXELS, MAX_BLEND_SCENE_PIXELS, MAX_BLEND_PIXEL_WORK } from "../../grammar/weightedBlend.js";
import { resolvePrimitiveOccupiedBounds } from "../../grammar/schemas/graphicBounds.js";
import { graphicClipBounds, intersectClipBounds } from "../../grammar/schemas/graphicClip.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { measureConcreteTextInkBounds } from "../textInkBounds.js";
import { walkGraphicPaintItems } from "../paintFrames.js";
import { canvasFactory } from "./surfaceFactory.js";
import { tracePath } from "./path.js";
import { MAX_RASTER_DIMENSION } from "./limits.js";
import { preflightCanvasBlendModes } from "./isolated.js";

function applyClip(context, clip) {
  context.beginPath();
  if (clip.type === "path") { tracePath(context, clip.commands); context.clip(clip.fillRule ?? "nonzero"); }
  else { context.rect(clip.x, clip.y, clip.width, clip.height); context.clip(); }
}
export function drawWeightedSource(context, source, draw) {
  context.save();
  try {
    applyClip(context, source.clip);
    for (const clip of source.clips) applyClip(context, clip);
    context.translate(...source.offset);
    draw(context, source, source);
  } finally { context.restore(); }
}
function bounds(source, context, options) {
  const shadow = options.shadows?.get(source);
  if (shadow?.empty) return undefined;
  let b = shadow ? { left: shadow.x, top: shadow.y, right: shadow.x + shadow.width, bottom: shadow.y + shadow.height }
    : source.type === "text" ? measureConcreteTextInkBounds(source.properties, context, options)
      : resolvePrimitiveOccupiedBounds(source.type, source.properties);
  if (!b) return undefined;
  b = { left: b.left + source.offset[0], right: b.right + source.offset[0], top: b.top + source.offset[1], bottom: b.bottom + source.offset[1] };
  for (const clip of [source.clip, ...source.clips]) b = intersectClipBounds(b, graphicClipBounds(clip));
  return b.right > b.left && b.bottom > b.top ? b : undefined;
}
function surface(factory, width, height) {
  const canvas = factory(width, height), context = canvas?.getContext?.("2d");
  if (canvas?.width !== width || canvas?.height !== height || !context ||
      ["getImageData", "putImageData", "createImageData", "clearRect", "save", "restore", "scale", "translate", "rect", "clip"].some(key => typeof context[key] !== "function")) {
    throw new TypeError("Weighted blend requires a readable, writable per-item Canvas surface.");
  }
  return { canvas, context };
}

// Resolve all plans before allocating any full item surface, then completely
// render/read each result before the destination can be resized or cleared.
export function prepareWeightedBlends(target, destination, options, draw) {
  const groups = [];
  walkGraphicPaintItems(target, (id, object, type, frame) => { if (type === "weighted-blend") groups.push({ id, object, frame }); });
  if (!groups.length) return undefined;
  if (typeof destination.drawImage !== "function") throw new TypeError("Weighted blend requires Canvas drawImage.");
  if (groups.some(({ object }) => object.properties.blend !== undefined)) {
    if (typeof destination.globalCompositeOperation !== "string") throw new TypeError("Weighted blend requires Canvas compositing support.");
    preflightCanvasBlendModes(groups.map(({ object }) => object), destination);
  }
  const factory = canvasFactory(destination, options.createCanvas), measuring = surface(factory, 1, 1), plans = new Map();
  const ratio = options.pixelRatio ?? 1;
  let total = 0, work = 0;
  for (const { id, object, frame } of groups) {
    validateConcreteGraphicProperties("weighted-blend", object.properties);
    const sources = object.properties.sources, active = sources.filter(source => source.weight > 0);
    const endpoint = active.length === 1 && active[0].weight === 1 ? active[0] : undefined;
    let union;
    for (const source of active) {
      const b = bounds(source, measuring.context, options);
      if (!b) continue;
      union = union ? { left: Math.min(union.left, b.left), right: Math.max(union.right, b.right), top: Math.min(union.top, b.top), bottom: Math.max(union.bottom, b.bottom) } : b;
    }
    if (!union || object.properties.opacity === 0) { plans.set(id, { empty: true }); continue; }
    const [x, y] = frame.offset;
    union = intersectClipBounds(union, { left: frame.clip.left - x, top: frame.clip.top - y, right: frame.clip.right - x, bottom: frame.clip.bottom - y });
    if (union.right <= union.left || union.bottom <= union.top) { plans.set(id, { empty: true }); continue; }
    const left = Math.floor((union.left + x) * ratio) - 1, top = Math.floor((union.top + y) * ratio) - 1;
    const width = Math.ceil((union.right + x) * ratio) + 1 - left, height = Math.ceil((union.bottom + y) * ratio) + 1 - top;
    const pixels = width * height;
    if (![width, height].every(Number.isSafeInteger) || width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION || pixels > MAX_BLEND_ITEM_PIXELS) throw new RangeError("Weighted blend item exceeds its raster allocation limit.");
    total += pixels; work += pixels * active.length;
    if (total > MAX_BLEND_SCENE_PIXELS || work > MAX_BLEND_PIXEL_WORK) throw new RangeError("Weighted blend scene exceeds its pixel or source-work budget.");
    plans.set(id, { x: left / ratio - x, y: top / ratio - y, width, height, active, endpoint, direct: endpoint && (object.properties.opacity ?? 1) === 1 && (object.properties.blend ?? "normal") === "normal" });
  }
  for (const plan of plans.values()) {
    if (plan.empty) continue;
    const input = surface(factory, plan.width, plan.height), accumulator = new Float64Array(plan.width * plan.height * 4);
    for (const source of plan.active) {
      input.context.clearRect(0, 0, plan.width, plan.height);
      input.context.save();
      try {
        input.context.scale(ratio, ratio); input.context.translate(-plan.x, -plan.y);
        drawWeightedSource(input.context, source, draw);
      } finally { input.context.restore(); }
      const rgba = input.context.getImageData(0, 0, plan.width, plan.height).data;
      if (!(rgba instanceof Uint8ClampedArray) || rgba.length !== accumulator.length) throw new TypeError("Weighted blend source returned invalid RGBA pixels.");
      if (!plan.endpoint) accumulateBlendPixels(accumulator, rgba, source.weight);
    }
    if (!plan.endpoint) {
      const image = input.context.createImageData(plan.width, plan.height);
      image.data.set(encodeBlendPixels(accumulator)); input.context.putImageData(image, 0, 0);
    }
    plan.canvas = input.canvas;
  }
  return { plans, ratio };
}
export function drawWeightedBlend(context, id, graphic, prepared, draw) {
  const plan = prepared?.plans.get(id);
  if (!plan) throw new TypeError("Weighted blend requires a prepared per-item result.");
  if (plan.empty) return;
  context.save();
  try {
    context.globalAlpha = graphic.properties.opacity ?? 1;
    context.globalCompositeOperation = graphic.properties.blend === undefined || graphic.properties.blend === "normal" ? "source-over" : graphic.properties.blend;
    if (plan.endpoint && (graphic.properties.opacity ?? 1) === 1 && (graphic.properties.blend ?? "normal") === "normal") {
      drawWeightedSource(context, plan.endpoint, draw);
    } else context.drawImage(plan.canvas, plan.x, plan.y, plan.width / prepared.ratio, plan.height / prepared.ratio);
  } finally { context.restore(); }
}
