import { isPartitionAnimationFallbackReason } from "../grammar/animation/partitionState.js";
import { isCartesianAnimationFallbackReason } from "../grammar/animation/cartesianState.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { translateWeightedBlendSources } from "../grammar/schemas/weightedBlend.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { isPointAnimationFallbackReason } from "../grammar/animation/pointState.js";

import { isGraphAnimationFallbackReason } from "../grammar/animation/graphState.js";

const reasons=new Set(["primitive-kind","topology","clip-topology","appearance","scale-clamp","scale-parameters",
  "degenerate-domain","scale-direction","log-sign","canvas-background","collapsed-domain","nonfinite-position"]);
export function validateAnimationFallbackReason(reason) {
  if(!isPartitionAnimationFallbackReason(reason)&&!isCartesianAnimationFallbackReason(reason)&&!isPointAnimationFallbackReason(reason)&&!isGraphAnimationFallbackReason(reason)&&!reasons.has(reason))throw new TypeError("Unknown animation crossfade reason.");
}

export const sameConcreteValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const rectangle = value => Array.isArray(value) ? { x:value[0], y:value[1], width:value[2], height:value[3] } : value;
function sources(node, weight) {
  const { blend: _blend, ...properties } = node.properties;
  if (node.type !== "weighted-blend") return [{ weight, type:node.type, properties,
    offset:node.offset, clip:rectangle(node.clip), clips:node.clips.map(rectangle) }];
  return translateWeightedBlendSources(node.properties.sources, ...node.offset).map(source => ({ ...source,
    weight:source.weight*weight, properties:{...source.properties,opacity:(source.properties.opacity??1)*(node.properties.opacity??1)},
    clips:[...node.clips.map(rectangle), rectangle(node.clip), ...source.clips] }));
}

// Incompatible items retain their concrete sources. The shared primitive owns
// linear-light compositing, retained assets and bounded flattening.
export function blendAnimationNodes(from, to, progress, width, height) {
  const a = from.properties.blend ?? "normal", b = to.properties.blend ?? "normal";
  if (a !== b) throw new TypeError("Animation crossfade cannot combine different backdrop blend modes.");
  const properties = { sources:[...sources(from,1-progress), ...sources(to,progress)], ...(a === "normal" ? {} : {blend:a}) };
  validateConcreteGraphicProperties("weighted-blend",properties);
  return cloneAndFreeze({key:to.key,type:"weighted-blend",topology:to.topology,properties,offset:[0,0],clip:[0,0,width,height],clips:[]});
}
export function fadeAnimationNode(node, opacity, key = node.key) {
  const properties = {...node.properties,opacity:(node.properties.opacity??1)*opacity};
  validateConcreteGraphicProperties(node.type,properties);
  return cloneAndFreeze({...node,key,properties});
}
export function pointAppearanceCompatible(from, to) {
  if (typeof from.fill === "object" || typeof to.fill === "object") return false;
  const staticValues = value => Object.fromEntries(Object.entries(value).filter(([key]) => !["x","y","radius"].includes(key)));
  return sameConcreteValue(staticValues(from),staticValues(to));
}
export function clipInterpolationCompatible(from,to) {
  return from.clips.length === to.clips.length && from.clips.every((clip,i) =>
    Array.isArray(clip) && Array.isArray(to.clips[i]) || sameConcreteValue(clip,to.clips[i]));
}
export function interpolateNodeFrame(from,to,progress) {
  const vector = (a,b) => a.map((value,i)=>interpolateNumber(value,b[i],progress));
  return {offset:vector(from.offset,to.offset),clip:vector(from.clip,to.clip),
    clips:from.clips.map((clip,i)=>Array.isArray(clip)?vector(clip,to.clips[i]):clip)};
}
