import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateUnitInterval, validateWorkLimit } from "../../core/validation.js";
import { buildCurvePathCommands, buildAreaCurvePathCommands, validateCurveInterpolation, validateCardinalTension } from "../curveCommands.js";
import { materializeRectItem, RECT_RADIUS_PROPERTIES, requestedRectStyleDetails } from "../roundedRect.js";
import { normalizeBarWidth, resolveBarWidth, resolveBarInterval, resolveAggregateBarGeometry } from "../bars/geometry.js";
import { normalizeCartesianPosition, resolveCartesianPosition, prepareCartesianPosition, sampleCartesianPosition } from "./cartesianPosition.js";

export const ANIMATION_CARTESIAN_VERSION = "semantic-cartesian-geometry@1";
const kinds = new Set(["rule", "rect-range", "rect-band", "bar", "histogram", "line", "area"]);
const reasons = new Set(["unsupported-family", "anonymous", "semantic-unavailable", "primitive-role", "coordinate-family", "overlay-position", "offset-position", "conditional-position", "incomplete-position", "edited-position", "sampled-concrete", "unsupported-series", "ordinal-domain", "series-grid", "geometry-policy", "nonfinite-geometry", "scale-type", "nonfinite-semantic-value"]);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
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
    : kind === "line" ? ["curve", "tension"] : kind === "area" ? ["orientation", "curve", "layout"] : [];
  rejectUnknownProperties(input, keys, "Cartesian animation geometry policy");
  if (["bar", "area"].includes(kind)) orientation(input.orientation);
  if (["bar", "histogram", "area"].includes(kind) && !["overlay", "stack", "fill", "diverging", "wiggle", "center", "group"].includes(input.layout)) throw new TypeError("Unknown Cartesian animation layout policy.");
  if (kind === "bar") {
    ownRecord(input.width, "Cartesian animation bar width"); rejectUnknownProperties(input.width,["band","pixels","interval"],"Cartesian animation bar width");
    if(input.width.interval!==undefined) ownRecord(input.width.interval,"Cartesian animation bar interval");
    normalizeBarWidth(input.width);
    if(typeof input.aggregate!=="boolean"||typeof input.explicitGroup!=="boolean")throw new TypeError("Cartesian bar requires its native grain policy.");
    if(input.layout==="group" && (!input.aggregate||!Number.isSafeInteger(input.seriesIndex)||input.seriesIndex<0))throw new TypeError("Cartesian grouped bar requires its native series index.");
    if(input.layout!=="group"&&Object.hasOwn(input,"seriesIndex"))throw new TypeError("Cartesian ungrouped bar cannot have a series index.");
  }
  if (kind === "histogram" && (!Number.isSafeInteger(input.count) || input.count < 1 || !Number.isSafeInteger(input.index) || input.index < 0 || input.index >= input.count)) throw new RangeError("Cartesian histogram group must identify an existing native slot.");
  if (["line", "area"].includes(kind)) validateCurveInterpolation(input.curve);
  if (Object.hasOwn(input, "tension")) validateCardinalTension(input.tension, input.curve);
  return input;
}

export function normalizeCartesianAnimationState(input) {
  ownRecord(input, "Cartesian animation state");
  if (Object.hasOwn(input, "reason")) {
    rejectUnknownProperties(input, ["reason"], "Cartesian animation fallback");
    return unavailableCartesianAnimation(input.reason);
  }
  rejectUnknownProperties(input, ["kind", "policy", "points", "grid", "radius", "offset"], "Cartesian animation state");
  if (!kinds.has(input.kind)) throw new TypeError("Unknown Cartesian animation geometry kind.");
  policy(input.policy, input.kind);
  ownArray(input.points, "Cartesian animation samples");
  validateGeneratedItemLimit(input.points.length, "Cartesian animation samples");
  const count = input.points.length;
  if (["line", "area"].includes(input.kind) ? count < (input.kind === "area" ? 4 : 1) || input.kind === "area" && count % 2 !== 0
    : count !== (input.kind === "rect-band" ? 1 : 2)) throw new RangeError("Cartesian animation geometry has an invalid sample count.");
  const points = input.points.map(point => {
    ownRecord(point, "Cartesian animation sample"); rejectUnknownProperties(point, ["x", "y"], "Cartesian animation sample");
    return { x: normalizeCartesianPosition(point.x), y: normalizeCartesianPosition(point.y) };
  });
  ownArray(input.grid, "Cartesian animation sample grid");
  if (input.grid.length !== (["line", "area"].includes(input.kind) ? count : 0)) throw new TypeError("Cartesian series requires exact sample membership.");
  let work=count;
  for (const keys of input.grid) {
    ownArray(keys, "Cartesian animation sample members");
    validateGeneratedItemLimit(keys.length, "Cartesian animation sample members");
    validateWorkLimit(work+=keys.length,"Cartesian animation sample membership work");
    if (keys.length === 0 || keys.some(key => typeof key !== "string" || !key.length)) throw new TypeError("Cartesian sample members require retained row keys.");
  }
  if (input.radius !== undefined) {
    if (!["rect-range", "rect-band", "bar", "histogram"].includes(input.kind)) throw new TypeError("Only rectangle animation has corner radii.");
    ownRecord(input.radius, "Cartesian animation corner radii");
    rejectUnknownProperties(input.radius, RECT_RADIUS_PROPERTIES, "Cartesian animation corner radii");
    requestedRectStyleDetails(input.radius);
  }
  const offset=input.offset===undefined?undefined:normalizeCartesianPosition(input.offset);
  if((input.kind==="bar"&&input.policy.layout==="group")!==(offset!==undefined))throw new TypeError("Cartesian grouped bar requires one offset scale.");
  if(offset && (offset.scale.type!=="ordinal-offset"||input.policy.seriesIndex>=offset.scale.domain.length))throw new TypeError("Invalid Cartesian bar offset policy.");
  return cloneAndFreeze({ ...input, points, ...(offset===undefined?{}:{offset}) });
}

function geometry(state, samples, offset) {
  const points = samples.map(point => ({ x: point.x.position, y: point.y.position }));
  const [a,b] = points;
  if (state.kind === "rule") return { type:"line", properties:{x1:a.x,y1:a.y,x2:b.x,y2:b.y} };
  if (state.kind === "line") return { type:"path", properties:{ commands: points.length === 1 ? [{op:"M",...a}]
    : buildCurvePathCommands(points, state.policy.curve, state.policy.tension) } };
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
  if (!Object.values(rectangle).every(Number.isFinite) || rectangle.width<0 || rectangle.height<0) throw new RangeError("Cartesian geometry exceeds finite bounds.");
  return materializeRectItem(rectangle,state.radius??{});
}

export function resolveCartesianAnimationGeometry(input) {
  const state=normalizeCartesianAnimationState(input);
  if(state.reason) throw new TypeError("Unavailable Cartesian state has no geometry.");
  const samples=state.points.map(point=>({x:resolveCartesianPosition(point.x),y:resolveCartesianPosition(point.y)}));
  const failure=samples.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  if(failure) return failure;
  return cloneAndFreeze(geometry(state,samples,state.offset===undefined?undefined:resolveCartesianPosition(state.offset)));
}
export function cartesianAnimationMatchesNode(state,node) {
  const result=resolveCartesianAnimationGeometry(state);
  return result.kind!=="crossfade" && result.type===node.type && Object.entries(result.properties).every(([key,value])=>same(value,node.properties[key]));
}
export function validateCartesianAnimationState(input,identity,node) {
  const state=normalizeCartesianAnimationState(input);
  if (state.reason) {
    if ((identity===undefined)!==(state.reason==="anonymous")) throw new TypeError("Inconsistent Cartesian animation fallback identity.");
    return;
  }
  const members=new Set(identity?.lineage?.rowKeys);
  if(identity===undefined || identity.lineage.kind!==undefined || state.grid.some(keys=>keys.some(key=>!members.has(key))) || !cartesianAnimationMatchesNode(state,node)) throw new TypeError("Cartesian animation meaning differs from its concrete endpoint.");
}
export function prepareCartesianInterpolation(fromInput,toInput) {
  const from=normalizeCartesianAnimationState(fromInput),to=normalizeCartesianAnimationState(toInput);
  if(from.reason||to.reason) return fade(from.reason??to.reason);
  if(from.kind!==to.kind || !same(from.policy,to.policy) || !same(from.radius,to.radius)) return fade("geometry-policy");
  if(!same(from.grid,to.grid) || from.points.length!==to.points.length) return fade("series-grid");
  const offset=from.offset===undefined?undefined:prepareCartesianPosition(from.offset,to.offset);
  if(offset?.kind==="crossfade")return offset;
  const points=from.points.map((point,i)=>({x:prepareCartesianPosition(point.x,to.points[i].x),y:prepareCartesianPosition(point.y,to.points[i].y)}));
  const failure=points.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  return failure??cloneAndFreeze({kind:"cartesian",version:ANIMATION_CARTESIAN_VERSION,from,to,points,...(offset===undefined?{}:{offset})});
}
export function sampleCartesianInterpolation(plan,progress) {
  validateUnitInterval(progress,"Cartesian animation progress");
  ownRecord(plan,"Prepared Cartesian animation");
  rejectUnknownProperties(plan,["kind","version","from","to","points","offset"],"prepared Cartesian animation");
  if(plan.kind!=="cartesian"||plan.version!==ANIMATION_CARTESIAN_VERSION)throw new TypeError("Unsupported Cartesian animation kernel.");
  const verified=prepareCartesianInterpolation(plan.from,plan.to);
  if(verified.kind!=="cartesian"||(!same(verified.points,plan.points)||!same(verified.offset,plan.offset)))throw new TypeError("Invalid prepared Cartesian animation.");
  const samples=verified.points.map(point=>({x:sampleCartesianPosition(point.x,progress),y:sampleCartesianPosition(point.y,progress)}));
  const failure=samples.flatMap(point=>[point.x,point.y]).find(value=>value.kind==="crossfade");
  if(failure)return failure;
  const offset=verified.offset===undefined?undefined:sampleCartesianPosition(verified.offset,progress);
  if(offset?.kind==="crossfade")return offset;
  const state=cloneAndFreeze({...verified.from,...(offset===undefined?{}:{offset:{value:offset.value,scale:offset.scale}}),points:samples.map(point=>Object.fromEntries(["x","y"].map(channel=>[channel,{value:point[channel].value,scale:point[channel].scale}])))});
  try { return cloneAndFreeze({kind:"cartesian",state,...geometry(state,samples,offset)}); }
  catch(error) { if(!(error instanceof RangeError))throw error; return fade("nonfinite-geometry"); }
}
