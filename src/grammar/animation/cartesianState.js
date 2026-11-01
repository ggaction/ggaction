import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { buildCurvePathCommands, buildAreaCurvePathCommands, validateCurveInterpolation, validateCardinalTension } from "../curveCommands.js";
import { materializeRectItem, RECT_RADIUS_PROPERTIES, requestedRectStyleDetails } from "../roundedRect.js";
import { normalizeBarWidth, resolveBarWidth, resolveBarInterval, resolveAggregateBarGeometry } from "../bars/geometry.js";
import { normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "./cartesianPosition.js";
import { normalizeCartesianSpan, normalizeCartesianSlot, compatibleCartesianPlacement, sampleCartesianPlacement, resolveCartesianSpan, cartesianSlotPixels } from "./cartesianPlacement.js";
import { validateCartesianDensity, sampleCartesianDensity, resolveCartesianDensity } from "./cartesianDensity.js";
import { normalizeCartesianAnchors, prepareCartesianAnchors, sampleCartesianAnchors, resolveCartesianOverlay } from "./cartesianOverlay.js";

export const ANIMATION_CARTESIAN_VERSION = "semantic-cartesian-geometry@2";
const kinds = new Set(["point", "rule", "rect-range", "rect-band", "bar", "histogram", "line", "area", "area-density", "area-category-density", "overlay-point", "overlay-line"]);
const seriesKinds=new Set(["line","area","area-density","area-category-density"]);
const isOverlay=kind=>["overlay-point","overlay-line"].includes(kind);
const reasons = new Set(["unsupported-family", "anonymous", "semantic-unavailable", "primitive-role", "coordinate-family", "overlay-position", "offset-position", "conditional-position", "incomplete-position", "edited-position", "sampled-concrete", "unsupported-series", "ordinal-domain", "series-grid", "geometry-policy", "nonfinite-geometry", "scale-type", "nonfinite-semantic-value"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const own = (value,key) => Object.hasOwn(value,key)?value[key]:undefined;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export const isCartesianAnimationFallbackReason = reason => reasons.has(reason);
export function unavailableCartesianAnimation(reason) {
  if (!reasons.has(reason)) throw new TypeError("Unknown Cartesian animation fallback reason.");
  return Object.freeze({ reason });
}
function orientation(value) {
  if (!["vertical", "horizontal"].includes(value)) throw new TypeError("Cartesian animation requires a native orientation.");
}
function policy(input, kind) {
  ownRecord(input, "Cartesian animation geometry policy");
  const keys = kind === "bar" ? ["orientation", "width", "layout", "aggregate", "explicitGroup", "seriesIndex"] : kind === "histogram" ? ["index", "count", "layout"]
    : kind === "overlay-line" ? ["curve","tension","closed"] : kind === "line" ? ["curve", "tension"] : ["area","area-density"].includes(kind) ? ["orientation", "curve", "layout"]
      :kind==="area-category-density"?["channel","curve","side","widthBand","widthResolve"]:[];
  rejectUnknownProperties(input, keys, "Cartesian animation geometry policy");
  const required=keys.filter(key=>!["seriesIndex","tension"].includes(key));
  if(required.some(key=>!Object.hasOwn(input,key))||Object.values(input).some(value=>value===undefined))throw new TypeError("Cartesian animation policy requires own resolved values.");
  if (["bar", "area", "area-density"].includes(kind)) orientation(input.orientation);
  if (["bar", "histogram", "area", "area-density"].includes(kind) && !["overlay", "stack", "fill", "diverging", "wiggle", "center", "group"].includes(input.layout)) throw new TypeError("Unknown Cartesian animation layout policy.");
  if(kind==="area-category-density"&&(!["x","y"].includes(input.channel)||!(input.channel==="x"?["both","left","right"]:["both","top","bottom"]).includes(input.side)||
    !["shared","independent"].includes(input.widthResolve)||!Number.isFinite(input.widthBand)||input.widthBand<=0||input.widthBand>1))throw new TypeError("Invalid Cartesian categorical density policy.");
  if (kind === "bar") {
    ownRecord(input.width, "Cartesian animation bar width"); rejectUnknownProperties(input.width,["band","pixels","interval"],"Cartesian animation bar width");
    if(Object.hasOwn(input.width,"interval")) ownRecord(input.width.interval,"Cartesian animation bar interval");
    if(Object.keys(input.width).length!==1||Object.values(input.width).some(value=>value===undefined))throw new TypeError("Cartesian bar width requires exactly one resolved unit.");
    normalizeBarWidth(Object.assign(Object.create(null),input.width));
    if(typeof input.aggregate!=="boolean"||typeof input.explicitGroup!=="boolean")throw new TypeError("Cartesian bar requires its native grain policy.");
    if(input.layout==="group" && (!input.aggregate||!Number.isSafeInteger(input.seriesIndex)||input.seriesIndex<0))throw new TypeError("Cartesian grouped bar requires its native series index.");
    if(input.layout!=="group"&&Object.hasOwn(input,"seriesIndex"))throw new TypeError("Cartesian ungrouped bar cannot have a series index.");
  }
  if (kind === "histogram" && (!Number.isSafeInteger(input.count) || input.count < 1 || !Number.isSafeInteger(input.index) || input.index < 0 || input.index >= input.count)) throw new RangeError("Cartesian histogram group must identify an existing native slot.");
  if (seriesKinds.has(kind)||kind==="overlay-line") validateCurveInterpolation(input.curve);
  if(kind==="overlay-line"&&(!Object.hasOwn(input,"closed")||typeof input.closed!=="boolean"))throw new TypeError("Overlay line requires its native closure policy.");
  if (Object.hasOwn(input, "tension")) validateCardinalTension(input.tension, input.curve);
  return input;
}

export function normalizeCartesianAnimationState(input) {
  ownRecord(input, "Cartesian animation state");
  if (Object.hasOwn(input, "reason")) {
    rejectUnknownProperties(input, ["reason"], "Cartesian animation fallback");
    return unavailableCartesianAnimation(input.reason);
  }
  rejectUnknownProperties(input, ["kind", "policy", "points", "grid", "radius", "offset", "span", "slot", "density", "anchors"], "Cartesian animation state");
  if(["kind","policy","points","grid"].some(key=>!Object.hasOwn(input,key))||Object.values(input).some(value=>value===undefined))throw new TypeError("Cartesian animation state requires own resolved values.");
  if (!kinds.has(input.kind)) throw new TypeError("Unknown Cartesian animation geometry kind.");
  policy(input.policy, input.kind);
  ownArray(input.points, "Cartesian animation samples");
  validateGeneratedItemLimit(input.points.length, "Cartesian animation samples");
  const count = input.points.length;
  const overlay=isOverlay(input.kind);
  if(overlay&&!Object.hasOwn(input,"anchors"))throw new TypeError("Cartesian overlay requires anchors.");
  if(!overlay&&Object.hasOwn(input,"anchors"))throw new TypeError("Only an overlay may retain anchors.");
  const anchors=overlay?normalizeCartesianAnchors(input.anchors,normalizeCartesianAnimationState):undefined;
  if(overlay&&(anchors.length<1||input.kind==="overlay-point"&&anchors.length!==1))throw new RangeError("Invalid Cartesian overlay anchor count.");
  const rangedArea=["area","area-density"].includes(input.kind);
  if (overlay?count!==0:seriesKinds.has(input.kind) ? count < (rangedArea ? 4 : input.kind==="area-category-density"?2:1) || rangedArea && count % 2 !== 0
    : count !== (["point","rect-band"].includes(input.kind)||Object.hasOwn(input,"span") ? 1 : 2)) throw new RangeError("Cartesian animation geometry has an invalid sample count.");
  const points = input.points.map(point => {
    ownRecord(point, "Cartesian animation sample"); rejectUnknownProperties(point, ["x", "y"], "Cartesian animation sample");
    if(!Object.hasOwn(point,"x")||!Object.hasOwn(point,"y"))throw new TypeError("Cartesian animation sample requires x and y.");
    return { x: normalizeCartesianPosition(point.x), y: normalizeCartesianPosition(point.y) };
  });
  ownArray(input.grid, "Cartesian animation sample grid");
  if (input.grid.length !== (overlay?anchors.length:seriesKinds.has(input.kind) ? count : 0)) throw new TypeError("Cartesian series requires exact sample membership.");
  validateCartesianDensity(input);
  let work=count;
  for (const keys of input.grid) {
    ownArray(keys, "Cartesian animation sample members");
    validateGeneratedItemLimit(keys.length, "Cartesian animation sample members");
    validateWorkLimit(work+=keys.length,"Cartesian animation sample membership work");
    if (keys.length === 0 || keys.some(key => typeof key !== "string" || !key.length)) throw new TypeError("Cartesian sample members require retained row keys.");
  }
  if (Object.hasOwn(input,"radius")) {
    if (!["rect-range", "rect-band", "bar", "histogram"].includes(input.kind)) throw new TypeError("Only rectangle animation has corner radii.");
    ownRecord(input.radius, "Cartesian animation corner radii");
    rejectUnknownProperties(input.radius, RECT_RADIUS_PROPERTIES, "Cartesian animation corner radii");
    requestedRectStyleDetails(input.radius);
  }
  const offset=!Object.hasOwn(input,"offset")?undefined:normalizeCartesianPosition(input.offset);
  if((input.kind==="bar"&&input.policy.layout==="group")!==(offset!==undefined))throw new TypeError("Cartesian grouped bar requires one offset scale.");
  if(offset && (offset.scale.type!=="ordinal-offset"||input.policy.seriesIndex>=offset.scale.domain.length))throw new TypeError("Invalid Cartesian bar offset policy.");
  const span=Object.hasOwn(input,"span")?normalizeCartesianSpan(input.span):undefined;
  const slot=Object.hasOwn(input,"slot")?normalizeCartesianSlot(input.slot):undefined;
  if(span!==undefined&&input.kind!=="rule")throw new TypeError("Only a rule can retain a span.");
  if(slot!==undefined&&!["point","rule","bar","histogram"].includes(input.kind))throw new TypeError("Only a native category slot consumer can retain a slot.");
  return cloneAndFreeze({ ...input, points, ...(offset===undefined?{}:{offset}),...(span===undefined?{}:{span}),...(slot===undefined?{}:{slot}),...(anchors===undefined?{}:{anchors}) });
}

function geometry(state, samples, offset) {
  if(isOverlay(state.kind))return resolveCartesianOverlay(state,resolveCartesianAnimationGeometry);
  if(["area-density","area-category-density"].includes(state.kind))return resolveCartesianDensity(state,samples);
  const shift=cartesianSlotPixels(own(state,"slot"),samples[0]);
  const shiftPoints=!["bar","histogram"].includes(state.kind);
  const points = samples.map(point => ({ x: point.x.position+(shiftPoints&&own(state,"slot")?.channel==="x"?shift:0), y: point.y.position+(shiftPoints&&own(state,"slot")?.channel==="y"?shift:0) }));
  const [a,b] = points;
  if (state.kind === "point") return {type:"circle",properties:{x:a.x,y:a.y}};
  if (state.kind === "rule") {
    const properties=own(state,"span")===undefined?{x1:a.x,y1:a.y,x2:b.x,y2:b.y}:resolveCartesianSpan(own(state,"span"),samples[0]);
    if(own(state,"span")!==undefined&&shift!==0)for(const key of own(state,"slot").channel==="x"?["x1","x2"]:["y1","y2"])properties[key]+=shift;
    return {type:"line",properties};
  }
  if (state.kind === "line") return { type:"path", properties:{ commands: points.length === 1 ? [{op:"M",...a}]
    : buildCurvePathCommands(points, state.policy.curve, own(state.policy,"tension")) } };
  if (state.kind === "area") return { type:"path", properties:{commands:buildAreaCurvePathCommands(points.slice(0,points.length/2),points.slice(points.length/2),state.policy.curve,{independentAxis:state.policy.orientation === "vertical" ? "x" : "y"})} };
  let rectangle;
  if (state.kind === "rect-band") {
    const width=samples[0].x.resolvedScale.bandwidth, height=samples[0].y.resolvedScale.bandwidth;
    rectangle={x:a.x-width/2,y:a.y-height/2,width,height};
  } else if (state.kind === "bar") {
    const vertical=state.policy.orientation === "vertical", channel=vertical?"x":"y";
    const category=samples[0][channel], scale=category.resolvedScale, widthIntent=state.policy.width;
    const interval=widthIntent.interval === undefined ? undefined : resolveBarInterval(widthIntent,category.value,scale);
    const width=interval?.width ?? resolveBarWidth(widthIntent,Math.abs(offset?.resolvedScale.bandwidth??scale.bandwidth??scale.step));
    const position=interval?.position ?? a[channel]-width/2;
    rectangle=state.policy.aggregate?resolveAggregateBarGeometry({ categoryScale:scale, measureScale:samples[0][vertical?"y":"x"].resolvedScale,
      offsetScale:offset?.resolvedScale, categoryValue:category.value, start:state.points[0][vertical?"y":"x"].value,
      end:state.points[1][vertical?"y":"x"].value, widthConfig:widthIntent, grouped:state.policy.layout==="group",vertical,
      explicitGroup:state.policy.explicitGroup,seriesIndex:state.policy.seriesIndex })
      :vertical?{x:position,y:Math.min(a.y,b.y),width,height:Math.abs(b.y-a.y)}
      :{x:Math.min(a.x,b.x),y:position,width:Math.abs(b.x-a.x),height:width};
  } else {
    rectangle={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y)};
    if (state.kind === "histogram" && state.policy.layout === "group") {
      rectangle.width/=state.policy.count; rectangle.x+=rectangle.width*state.policy.index;
    }
  }
  if(own(state,"slot")!==undefined)rectangle[own(state,"slot").channel]+=shift;
  if (!Object.values(rectangle).every(Number.isFinite) || rectangle.width<0 || rectangle.height<0) throw new RangeError("Cartesian geometry exceeds finite bounds.");
  return materializeRectItem(rectangle,own(state,"radius")??{});
}

export function resolveCartesianAnimationGeometry(input) {
  const state=normalizeCartesianAnimationState(input);
  if(own(state,"reason")) throw new TypeError("Unavailable Cartesian state has no geometry.");
  const samples=state.points.map(point=>({x:resolveCartesianPosition(point.x),y:resolveCartesianPosition(point.y)}));
  const failure=samples.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  if(failure) return failure;
  return cloneAndFreeze(geometry(state,samples,own(state,"offset")===undefined?undefined:resolveCartesianPosition(own(state,"offset"))));
}
export function cartesianAnimationMatchesNode(state,node) {
  const result=resolveCartesianAnimationGeometry(state);
  return result.kind!=="crossfade" && result.type===node.type && Object.entries(result.properties).every(([key,value])=>same(value,node.properties[key]));
}
export function validateCartesianAnimationState(input,identity,node) {
  const state=normalizeCartesianAnimationState(input);
  if (own(state,"reason")) {
    if ((identity===undefined)!==(own(state,"reason")==="anonymous")) throw new TypeError("Inconsistent Cartesian animation fallback identity.");
    return;
  }
  const members=new Set(identity?.lineage?.rowKeys);
  if(identity===undefined || identity.lineage.kind!==undefined || state.grid.some(keys=>keys.some(key=>!members.has(key))) || !cartesianAnimationMatchesNode(state,node)) throw new TypeError("Cartesian animation meaning differs from its concrete endpoint.");
}
export function prepareCartesianInterpolation(fromInput,toInput) {
  const from=normalizeCartesianAnimationState(fromInput),to=normalizeCartesianAnimationState(toInput);
  if(own(from,"reason")||own(to,"reason")) return fade(own(from,"reason")??own(to,"reason"));
  if(from.kind!==to.kind || !same(from.policy,to.policy) || !same(own(from,"radius"),own(to,"radius"))||!compatibleCartesianPlacement(from,to)) return fade("geometry-policy");
  if(!same(from.grid,to.grid) || from.points.length!==to.points.length) return fade("series-grid");
  const anchors=own(from,"anchors")===undefined?undefined:prepareCartesianAnchors(own(from,"anchors"),own(to,"anchors"),prepareCartesianInterpolation);
  if(anchors?.kind==="crossfade")return anchors;
  const offset=own(from,"offset")===undefined?undefined:prepareCartesianPosition(own(from,"offset"),own(to,"offset"));
  if(offset?.kind==="crossfade")return offset;
  const points=from.points.map((point,i)=>({x:prepareCartesianPosition(point.x,to.points[i].x),y:prepareCartesianPosition(point.y,to.points[i].y)}));
  const failure=points.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  return failure??cloneAndFreeze({kind:"cartesian",version:ANIMATION_CARTESIAN_VERSION,from,to,points,...(offset===undefined?{}:{offset}),...(anchors===undefined?{}:{anchors})});
}
export function sampleCartesianInterpolation(plan,progress) {
  validateUnitInterval(progress,"Cartesian animation progress");
  ownRecord(plan,"Prepared Cartesian animation");
  rejectUnknownProperties(plan,["kind","version","from","to","points","offset","anchors"],"prepared Cartesian animation");
  if(["kind","version","from","to","points"].some(key=>!Object.hasOwn(plan,key)))throw new TypeError("Prepared Cartesian animation requires own resolved values.");
  if(plan.kind!=="cartesian"||plan.version!==ANIMATION_CARTESIAN_VERSION)throw new TypeError("Unsupported Cartesian animation kernel.");
  const verified=prepareCartesianInterpolation(plan.from,plan.to);
  if(verified.kind!=="cartesian"||(!same(verified.points,plan.points)||!same(own(verified,"offset"),own(plan,"offset"))||!same(own(verified,"anchors"),own(plan,"anchors"))))throw new TypeError("Invalid prepared Cartesian animation.");
  const samples=verified.points.map(point=>({x:sampleCartesianPosition(point.x,progress),y:sampleCartesianPosition(point.y,progress)}));
  const failure=samples.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  if(failure)return failure;
  const offset=own(verified,"offset")===undefined?undefined:sampleCartesianPosition(own(verified,"offset"),progress);
  if(offset?.kind==="crossfade")return offset;
  const anchors=own(verified,"anchors")===undefined?undefined:sampleCartesianAnchors(own(verified.from,"anchors"),own(verified,"anchors"),progress,sampleCartesianInterpolation);
  if(anchors?.kind==="crossfade")return anchors;
  const state=cloneAndFreeze({...verified.from,...sampleCartesianPlacement(verified.from,verified.to,progress),...sampleCartesianDensity(verified.from,verified.to,progress),...(anchors===undefined?{}:{anchors}),...(offset===undefined?{}:{offset:{value:offset.value,scale:offset.scale}}),points:samples.map(point=>Object.fromEntries(["x","y"].map(channel=>[channel,{value:point[channel].value,scale:point[channel].scale,...(!Object.hasOwn(point[channel],"offset")?{}:{offset:point[channel].offset})}])))});
  try { return cloneAndFreeze({kind:"cartesian",state,...geometry(state,samples,offset)}); }
  catch(error) { if(!(error instanceof RangeError))throw error; return fade("nonfinite-geometry"); }
}
