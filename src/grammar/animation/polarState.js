import { cloneAndFreeze } from "../../core/immutable.js";
import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateUnitInterval } from "../../core/validation.js";
import { polarToCartesian } from "../polar.js";
import { buildMappedPolarLinePathCommands } from "../polarLineCommands.js";
import { buildAnnularSectorCommands } from "../polarPaths.js";
import { interpolateNumber } from "./values.js";

export const ANIMATION_POLAR_VERSION = "native-polar-coordinates@1";
const reasons = new Set(["anonymous", "unsupported-family", "semantic-unavailable", "primitive-role", "coordinate-family", "conditional-position", "incomplete-position", "edited-position", "sampled-concrete", "geometry-policy", "series-grid", "polar-mapping", "polar-direction", "nonfinite-geometry"]);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const fade = reason => Object.freeze({kind:"crossfade",reason});
export const isPolarAnimationFallbackReason = reason => reasons.has(reason);
export function unavailablePolarAnimation(reason) {
  if(!reasons.has(reason))throw new TypeError("Unknown polar animation fallback reason.");
  return Object.freeze({reason});
}
function finite(value,label) {if(!Number.isFinite(value))throw new TypeError(`${label} must be finite.`);return value;}
function record(value,keys,label) {
  ownRecord(value,label);rejectUnknownProperties(value,keys,label);
  if(keys.some(key=>!Object.hasOwn(value,key)))throw new TypeError(`${label} requires every field.`);
}

// Coordinates come from the native mapping owner during preparation, never an
// inverse projection of the rendered x/y. The mapping fingerprint is a closed
// canonical descriptor supplied by that owner; it is not a second scale engine.
export function normalizePolarAnimationState(input) {
  ownRecord(input,"Polar animation state");
  if(Object.hasOwn(input,"reason")){record(input,["reason"],"Polar animation fallback");return unavailablePolarAnimation(input.reason);}
  record(input,["kind","frame","mapping","points","grid","policy"],"Polar animation state");
  if(!["point","line","arc"].includes(input.kind))throw new TypeError("Unknown native polar animation kind.");
  record(input.frame,["centerX","centerY","availableRadius"],"Polar animation frame");
  Object.values(input.frame).forEach(value=>finite(value,"Polar frame value"));
  if(input.frame.availableRadius<0)throw new RangeError("Polar frame radius must be nonnegative.");
  // A bounded, canonical mapping digest is compatibility evidence, not data.
  if(typeof input.mapping!=="string"||!/^[0-9a-f]{64}$/.test(input.mapping))throw new TypeError("Polar animation requires its native mapping fingerprint.");
  ownArray(input.points,"Polar animation coordinates");validateGeneratedItemLimit(input.points.length,"Polar animation coordinates");
  if(input.kind==="line"?input.points.length<2:input.points.length!==1)throw new RangeError("Polar animation has an invalid coordinate count.");
  const pointKeys=input.kind==="arc"?["theta","endTheta","innerRadius","radius"]:["theta","radius"];
  for(const point of input.points){
    record(point,pointKeys,"Polar animation coordinate");Object.values(point).forEach(value=>finite(value,"Polar coordinate"));
    if(point.radius<0||point.radius>input.frame.availableRadius)throw new RangeError("Polar radius is outside its frame.");
    if(input.kind==="arc"&&(point.innerRadius<0||point.innerRadius>=point.radius||point.endTheta===point.theta||Math.abs(point.endTheta-point.theta)>360))throw new RangeError("Polar sector requires a nonzero signed sweep and ordered radii.");
  }
  ownArray(input.grid,"Polar animation member grid");
  if(input.grid.length!==input.points.length)throw new TypeError("Polar coordinates require exact member groups.");
  let work=input.points.length;
  for(const members of input.grid){
    ownArray(members,"Polar animation members");validateGeneratedItemLimit(members.length,"Polar animation members");
    validateWorkLimit(work+=members.length,"Polar animation member work");
    if(!members.length||members.some(key=>typeof key!=="string"||!key.length))throw new TypeError("Polar members require retained row keys.");
  }
  const policyKeys=input.kind==="point"?[]:input.kind==="line"?["closed"]:["padAngle"];
  record(input.policy,policyKeys,"Polar animation policy");
  if(input.kind==="line"&&typeof input.policy.closed!=="boolean")throw new TypeError("Polar line closure must be boolean.");
  if(input.kind==="arc"&&(finite(input.policy.padAngle,"Polar pad angle")<0||input.policy.padAngle>=Math.abs(input.points[0].endTheta-input.points[0].theta)))throw new RangeError("Polar padding must be smaller than its sweep.");
  return cloneAndFreeze(input);
}
function geometry(state) {
  const point=state.points[0];
  if(state.kind==="point"){
    const properties=polarToCartesian({...point,frame:state.frame});
    if(!Object.values(properties).every(Number.isFinite))throw new RangeError("Polar geometry exceeds finite coordinates.");
    return {type:"circle",properties};
  }
  if(state.kind==="line")return {type:"path",properties:{commands:buildMappedPolarLinePathCommands({theta:state.points.map(p=>p.theta),radius:state.points.map(p=>p.radius),frame:state.frame,closed:state.policy.closed})}};
  return {type:"path",properties:{commands:buildAnnularSectorCommands({frame:state.frame,startTheta:point.theta,endTheta:point.endTheta,innerRadius:point.innerRadius,outerRadius:point.radius,padAngle:state.policy.padAngle})}};
}
export function resolvePolarAnimationGeometry(input) {
  const state=normalizePolarAnimationState(input);
  if(state.reason)throw new TypeError("Unavailable polar state has no geometry.");
  return cloneAndFreeze(geometry(state));
}
export function polarAnimationMatchesNode(input,node) {
  const result=resolvePolarAnimationGeometry(input);
  return result.type===node.type&&Object.entries(result.properties).every(([key,value])=>same(value,node.properties[key]));
}
export function validatePolarAnimationState(input,identity,node) {
  const state=normalizePolarAnimationState(input);
  if(state.reason){if((identity===undefined)!==(state.reason==="anonymous"))throw new TypeError("Inconsistent polar fallback identity.");return;}
  const members=new Set(identity?.lineage?.rowKeys);
  if(identity===undefined||identity.lineage.kind!==undefined||state.grid.some(keys=>keys.some(key=>!members.has(key)))||!polarAnimationMatchesNode(state,node))throw new TypeError("Polar animation meaning differs from its concrete endpoint.");
}
export function preparePolarInterpolation(fromInput,toInput) {
  const from=normalizePolarAnimationState(fromInput),to=normalizePolarAnimationState(toInput);
  if(from.reason||to.reason)return fade(from.reason??to.reason);
  if(from.kind!==to.kind||!same(from.policy,to.policy))return fade("geometry-policy");
  if(from.mapping!==to.mapping)return fade("polar-mapping");
  if(!same(from.grid,to.grid))return fade("series-grid");
  if(from.kind==="arc"&&Math.sign(from.points[0].endTheta-from.points[0].theta)!==Math.sign(to.points[0].endTheta-to.points[0].theta))return fade("polar-direction");
  return cloneAndFreeze({kind:"polar",version:ANIMATION_POLAR_VERSION,from,to});
}
// Degrees stay unwrapped in sampled meaning. Modulo is used only for choosing
// the shortest displacement; exactly half a turn always chooses positive.
export function interpolatePolarAngle(from,to,progress) {
  finite(from,"Polar source angle");finite(to,"Polar target angle");validateUnitInterval(progress,"Polar angle progress");
  if(progress===0)return from;if(progress===1)return to;
  let delta=((to%360)-(from%360))%360;
  if(delta>180)delta-=360;else if(delta<=-180)delta+=360;
  return finite(from+delta*progress,"Polar interpolated angle");
}
export function samplePolarInterpolation(input,progress) {
  validateUnitInterval(progress,"Polar animation progress");record(input,["kind","version","from","to"],"Prepared polar animation");
  if(input.kind!=="polar"||input.version!==ANIMATION_POLAR_VERSION)throw new TypeError("Unsupported polar animation kernel.");
  const plan=preparePolarInterpolation(input.from,input.to);
  if(plan.kind!=="polar")throw new TypeError("Incompatible prepared polar coordinates.");
  const at=(a,b)=>interpolateNumber(a,b,progress),from=plan.from,to=plan.to;
  try {
    const state=normalizePolarAnimationState({...from,frame:Object.fromEntries(Object.keys(from.frame).map(key=>[key,at(from.frame[key],to.frame[key])])),
      points:from.points.map((point,i)=>{
        if(progress===0)return point;if(progress===1)return to.points[i];
        const theta=interpolatePolarAngle(point.theta,to.points[i].theta,progress);
        return Object.fromEntries(Object.entries(point).map(([key,value])=>[key,key==="theta"?theta:key==="endTheta"?theta+at(point.endTheta-point.theta,to.points[i].endTheta-to.points[i].theta):at(value,to.points[i][key])]));
      })});
    return cloneAndFreeze({kind:"polar",state,...geometry(state)});
  }catch(error){if(!(error instanceof RangeError))throw error;return fade("nonfinite-geometry");}
}
