import { prepareAnimationAppearance } from "./appearance.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { prepareCartesianInterpolation, validateCartesianAnimationState, unavailableCartesianAnimation } from "../grammar/animation/cartesianState.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

export const emptyAnimationCartesian = endpoint => Object.freeze(endpoint.identities.map(identity=>unavailableCartesianAnimation(identity===undefined?"anonymous":"unsupported-family")));
export const hasRetainedAnimationCartesian = (states,endpoint) => !sameConcreteValue(states,emptyAnimationCartesian(endpoint));
export const hasAnimationCartesian = states => states.some(state=>state.kind!==undefined || !["anonymous","unsupported-family","semantic-unavailable","primitive-role","sampled-concrete"].includes(state.reason));
export function validateAnimationCartesian(states,endpoint) {
  ownArray(states,"Animation Cartesian states");
  if(states.length!==endpoint.scene.nodes.length)throw new TypeError("Cartesian states must follow exact endpoint node order.");
  states.forEach((state,i)=>validateCartesianAnimationState(state,endpoint.identities[i],endpoint.scene.nodes[i]));
  return cloneAndFreeze(states);
}
export function prepareCartesianTrack(match,from,to,a,b) {
  if(a.reason==="unsupported-family"&&b.reason==="unsupported-family")return undefined;
  const source=from.scene.nodes[match.sourceIndex],target=to.scene.nodes[match.targetIndex];
  const fade=reason=>({...match,kind:"crossfade",reason});
  if(a.reason||b.reason)return hasAnimationCartesian([a,b])?fade(a.reason??b.reason):undefined;
  if(source.type!==target.type)return fade("primitive-kind");
  if(source.topology!==target.topology)return fade("topology");
  if(sameConcreteValue(source,target)&&sameConcreteValue(a,b))return {...match,kind:"exact"};
  if(!clipInterpolationCompatible(source,target))return fade("clip-topology");
  const staticPaint=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["x","y","width","height","x1","x2","y1","y2","commands"].includes(key)));
  const appearance=prepareAnimationAppearance(staticPaint(source.properties),staticPaint(target.properties));
  if(appearance.kind==="crossfade")return fade(appearance.reason);
  const cartesian=prepareCartesianInterpolation(a,b);
  return cartesian.kind==="crossfade"?fade(cartesian.reason):{...match,kind:"semantic-cartesian",cartesian,appearance};
}
