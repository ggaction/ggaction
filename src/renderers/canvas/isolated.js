import { canvasFactory } from "./surfaceFactory.js";
import { preflightCanvasFillCapabilities } from "./fill.js";
import { resolvePrimitiveGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { graphicClipBounds, intersectClipBounds, validateGraphicClip } from "../../grammar/schemas/graphicClip.js";
import { walkGraphicTreeEvents } from "../../grammar/schemas/graphicTree.js";
import { MAX_RASTER_DIMENSION, MAX_RASTER_PIXELS } from "./limits.js";
import { isBlendMode } from "../../grammar/compositing.js";

export function requiresIsolatedGlyph(properties) {
  return isBlendMode(properties?.blend) ||
    properties?.fill?.type === "pattern" && (properties.opacity ?? 1) !== 1;
}


function requireSurface(surface) {
  const context = surface?.getContext?.("2d");
  if (!context || ["save", "restore", "scale", "translate", "beginPath", "fillRect",
    "fill", "stroke", "moveTo", "lineTo", "bezierCurveTo", "closePath", "setLineDash"]
    .some(method => typeof context[method] !== "function")) {
    throw new TypeError("Isolated glyph painting requires a compatible Canvas 2D surface.");
  }
  return context;
}

// This is renderer-private state: no surface or backend object enters graphicSpec.
export function prepareIsolatedGlyphs(target, context, { pixelRatio = 1, createCanvas, objects = Object.values(target.graphicSpec.objects) } = {}) {
  const requested = objects.some(object =>
    requiresIsolatedGlyph(object.properties) ||
    object.items?.some(item => requiresIsolatedGlyph(item.properties)));
  if (!requested) return undefined;
  if (typeof context.drawImage !== "function" || typeof context.globalCompositeOperation !== "string") {
    throw new TypeError("Isolated glyph painting requires Canvas drawImage and compositing support.");
  }
  const factory = canvasFactory(context, createCanvas);
  let surface;
  try {
    surface = factory(1, 1);
    const source = requireSurface(surface);
    preflightCanvasFillCapabilities(objects, source);
    const hasGradient = objects.some(object =>
      [object, ...(object.items ?? [])].some(item =>
        requiresIsolatedGlyph(item.properties) && item.properties.fill?.type === "linear-gradient"));
    const normal=objects.some(object=>
      [object,...(object.items??[])].some(item=>(item.properties?.blend==="normal" || item.properties?.blend===undefined && requiresIsolatedGlyph(item.properties))));
    if(normal){
      if(typeof source.setTransform!=="function")throw new TypeError("Normal glyph opacity requires Canvas transform support.");
      source.save();try{
        source.globalCompositeOperation="destination-in";
        if(source.globalCompositeOperation!=="destination-in")throw new TypeError("Normal glyph opacity requires source attenuation.");
      }finally{source.restore();}
      const circle=objects.some(object=>
        [object,...(object.items??[])].some(item=>(item.properties?.blend==="normal" || item.properties?.blend===undefined && requiresIsolatedGlyph(item.properties))&&(item.type??object.type)==="circle"));
      if(circle&&typeof source.arc!=="function")throw new TypeError("Normal circle painting requires Canvas arcs.");
    }
    if (hasGradient && (typeof source.createLinearGradient !== "function" ||
        typeof source.createLinearGradient(0, 0, 1, 0)?.addColorStop !== "function")) {
      throw new TypeError("Isolated gradient painting requires Canvas linear gradients.");
    }
  } catch (error) {
    throw new TypeError("Isolated glyph painting requires a compatible Canvas surface.", {cause:error});
  }
  context.save();
  try {
    const modes=new Set();
    for(const object of objects)for(const item of [object,...(object.items??[])]){
      if(item.properties?.blend!==undefined)modes.add(item.properties.blend==="normal"?"source-over":item.properties.blend);
    }
    for(const mode of modes){
      context.globalCompositeOperation=mode;
      if(context.globalCompositeOperation!==mode)throw new TypeError(`Canvas context does not support ${mode} compositing.`);
    }
  } finally { context.restore(); }

  const plans = new Map();
  // Ordered root graphics may be siblings of the Canvas, not its descendants.
  const frames = [{offset:[0,0],clip:{left:0,top:0,right:target.width,bottom:target.height}}];
  function plan(id, object, type) {
    const properties = object.properties;
    if (!requiresIsolatedGlyph(properties)) return;
    const bounds = resolvePrimitiveGraphicBounds(type, properties);
    if (!bounds) throw new Error(`Graphic "${id}" requires finite isolated paint bounds.`);
    const {offset: [x, y], clip} = frames.at(-1);
    const clipped = {
      left: Math.max(bounds.left + x, clip.left),
      right: Math.min(bounds.right + x, clip.right),
      top: Math.max(bounds.top + y, clip.top),
      bottom: Math.min(bounds.bottom + y, clip.bottom)
    };
    if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) {
      plans.set(id, {empty: true});
      return;
    }
    // Align to destination pixels, including fractional nested translations.
    const left = Math.max(Math.floor(clip.left * pixelRatio), Math.floor(clipped.left * pixelRatio) - 1);
    const top = Math.max(Math.floor(clip.top * pixelRatio), Math.floor(clipped.top * pixelRatio) - 1);
    const right = Math.min(Math.ceil(clip.right * pixelRatio), Math.ceil(clipped.right * pixelRatio) + 1);
    const bottom = Math.min(Math.ceil(clip.bottom * pixelRatio), Math.ceil(clipped.bottom * pixelRatio) + 1);
    const width = right - left, height = bottom - top;
    if (![width, height].every(Number.isSafeInteger) || width < 1 || height < 1 ||
        width > MAX_RASTER_DIMENSION || height > MAX_RASTER_DIMENSION ||
        width * height > MAX_RASTER_PIXELS) {
      throw new RangeError(`Graphic "${id}" isolated paint surface exceeds the raster allocation limit.`);
    }
    plans.set(id, {width, height, left: left / pixelRatio - x, top: top / pixelRatio - y});
  }
  walkGraphicTreeEvents(target.graphicSpec, {
    enter({id, object}) {
      if (object.type === "canvas") {
        const parent = frames.at(-1);
        const offset = id === target.canvasId ? [0, 0] :
          [parent.offset[0] + object.properties.x, parent.offset[1] + object.properties.y];
        const properties = object.properties;
        const local = {left: offset[0], top: offset[1],
          right: offset[0] + properties.width, bottom: offset[1] + properties.height};
        const clip = {
          left: Math.max(parent.clip.left, local.left), top: Math.max(parent.clip.top, local.top),
          right: Math.min(parent.clip.right, local.right), bottom: Math.min(parent.clip.bottom, local.bottom)
        };
        frames.push({offset, clip});
      }
      if (object.clip !== undefined) {
        const parent = frames.at(-1);
        validateGraphicClip(object.clip, object.type);
        frames.push({offset: parent.offset, clip: intersectClipBounds(parent.clip,
          graphicClipBounds(object.clip, ...parent.offset))});
      }
      if (!object.items) plan(id, object, object.type);
    },
    item({id, object, owner}) { plan(id, object, object.type ?? owner.type); },
    exit({object}) {
      if (object.clip !== undefined) frames.pop();
      if (object.type === "canvas") frames.pop();
    }
  });
  return {plans, surface, pixelRatio};
}

// Paint fill and outline together with opacity 1, then composite the source once.
export function drawIsolatedGlyph(context, id, graphic, draw, prepared, options) {
  const plan = prepared?.plans.get(id);
  if (!plan) throw new Error(`Graphic "${id}" has no prepared isolated paint source.`);
  if (plan.empty) return;
  const {surface, pixelRatio} = prepared;
  surface.width = plan.width;
  surface.height = plan.height;
  const source = requireSurface(surface);
  source.scale(pixelRatio, pixelRatio);
  source.translate(-plan.left, -plan.top);
  const {blend = "normal", opacity = 1, ...properties} = graphic.properties;
  draw(source, id, {...graphic, properties: {...properties, opacity: 1}}, options);
  if(blend==="normal"){
    // Attenuate the complete source once. drawImage(globalAlpha) introduces
    // additional native image-alpha quantization; source masking avoids it.
    source.save();
    try{
      source.setTransform(1,0,0,1,0,0);
      source.globalCompositeOperation="destination-in";
      source.globalAlpha=opacity;
      source.fillStyle="#fff";
      source.fillRect(0,0,plan.width,plan.height);
    }finally{source.restore();}
  }
  context.save();
  try {
    context.globalAlpha = blend==="normal"?1:opacity;
    context.globalCompositeOperation = blend==="normal"?"source-over":blend;
    context.drawImage(surface, plan.left, plan.top, plan.width / pixelRatio, plan.height / pixelRatio);
  } finally { context.restore(); }
}
