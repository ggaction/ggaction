import { prepareAnimationAppearance } from "./appearance.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownArray } from "../core/ownData.js";
import { preparePolarInterpolation, validatePolarAnimationState, unavailablePolarAnimation } from "../grammar/animation/polarState.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

export const emptyAnimationPolars = endpoint => Object.freeze(endpoint.identities.map(identity=>unavailablePolarAnimation(identity===undefined?"anonymous":"unsupported-family")));
export const hasRetainedAnimationPolars = (states,endpoint) => !sameConcreteValue(states,emptyAnimationPolars(endpoint));
export const hasAnimationPolars = states => states.some(state=>state.kind!==undefined||!["anonymous","unsupported-family","semantic-unavailable","primitive-role","sampled-concrete"].includes(state.reason));
export function validateAnimationPolars(states,endpoint) {
  ownArray(states,"Animation polar states");
  if(states.length!==endpoint.scene.nodes.length)throw new TypeError("Polar states must follow exact endpoint node order.");
  states.forEach((state,i)=>validatePolarAnimationState(state,endpoint.identities[i],endpoint.scene.nodes[i]));
  return cloneAndFreeze(states);
}
export function preparePolarTrack(match,from,to,a,b) {
  if(a.reason==="unsupported-family"&&b.reason==="unsupported-family")return undefined;
  const source=from.scene.nodes[match.sourceIndex],target=to.scene.nodes[match.targetIndex],fade=reason=>({...match,kind:"crossfade",reason});
  if(a.reason||b.reason)return hasAnimationPolars([a,b])?fade(a.reason??b.reason):undefined;
  if(source.type!==target.type)return fade("primitive-kind");
  if(source.topology!==target.topology)return fade("topology");
  if(sameConcreteValue(source,target)&&sameConcreteValue(a,b))return {...match,kind:"exact"};
  if(!clipInterpolationCompatible(source,target))return fade("clip-topology");
  const style=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["x","y","radius","commands"].includes(key)));
  const appearance=prepareAnimationAppearance(style(source.properties),style(target.properties));
  if(appearance.kind==="crossfade")return fade(appearance.reason);
  const polar=preparePolarInterpolation(a,b);
  return polar.kind==="crossfade"?fade(polar.reason):{...match,kind:"semantic-polar",polar,appearance};
}
