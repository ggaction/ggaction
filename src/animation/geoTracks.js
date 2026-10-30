import { prepareAnimationAppearance, sampleAnimationAppearance } from "./appearance.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { canonicalJSON } from "../core/contentDigest.js";
import { validateUnitInterval, validateGeneratedItemLimit, validateWorkLimit } from "../core/validation.js";
import { prepareGeoInterpolation, sampleGeoInterpolation } from "../grammar/animation/geoState.js";
import { interpolateNumber } from "../grammar/animation/values.js";
import { normalizeGeoAnimationPresentation, resolveGeoAnimationPresentation, geoAnimationItemKey } from "../materialization/animation/geoPresentation.js";
import { clipInterpolationCompatible, interpolateNodeFrame } from "./concrete.js";

const prepared = new WeakSet();
const same = (a,b) => canonicalJSON(a) === canonicalJSON(b);
export const emptyAnimationGeos = length => cloneAndFreeze({groups:[],items:Array(length).fill(null)});
function subset(presentation, keys) {
  const indices=presentation.geometry.features.flatMap((feature,index)=>keys.has(feature.key)?[index]:[]);
  return normalizeGeoAnimationPresentation({...presentation,geometry:{...presentation.geometry,features:indices.map(index=>presentation.geometry.features[index])},styles:indices.map(index=>presentation.styles[index])});
}

// Pair whole owners before looking at visible nodes. A hidden feature has an
// explicit collection slot and source identity, never a fabricated scene index.
export function prepareGeoTracks(from,to) {
  const groups=[],pairs=new Map(),skipFrom=new Set(),skipTo=new Set(),sourceGroups=new Map(from.groups.map((group,index)=>[group.presentation.geometry.key,index]));
  let work=from.items.length+to.items.length;validateWorkLimit(work,"Animation Geo track preparation");
  const indices=state=>{const result=state.groups.map(()=>[]);state.items.forEach((item,index)=>{if(item!==null)result[item.group].push(index);});return result;};
  const fromIndex=indices(from),toIndex=indices(to);
  for(const [targetGroup,target] of to.groups.entries()) {
    const sourceGroup=sourceGroups.get(target.presentation.geometry.key);
    if(sourceGroup===undefined)continue;
    const source=from.groups[sourceGroup],a=source.presentation,b=target.presentation;
    validateWorkLimit(work+=a.geometry.features.length+b.geometry.features.length,"Animation Geo track preparation");
    const interpolation=prepareGeoInterpolation(a.geometry,b.geometry);
    const reason=source.reason??target.reason??(!clipInterpolationCompatible(a.frame,b.frame)?"clip-topology":interpolation.kind==="crossfade"?interpolation.reason:undefined);
    const failures=new Map(interpolation.failures?.map(failure=>[failure.key,failure.reason])??[]),old=new Map(a.geometry.features.map((feature,index)=>[feature.key,index]));
    const eligible=new Set(),fallback=[],styles=new Map();
    for(const [index,feature] of b.geometry.features.entries()) {
      const previous=old.get(feature.key);
      const appearance=previous===undefined||same(a.styles[previous],b.styles[index])?null:prepareAnimationAppearance(a.styles[previous],b.styles[index]);
      const failure=reason??failures.get(feature.key)??(previous===undefined?"geo-feature-topology":appearance?.kind==="crossfade"?appearance.reason:undefined);
      if(!failure)styles.set(feature.key,appearance);
      if(failure)fallback.push({key:feature.key,reason:failure});else eligible.add(feature.key);
    }
    const targetIndices=new Map();
    for(const index of fromIndex[sourceGroup])if(eligible.has(from.items[index].key))skipFrom.add(index);
    for(const index of toIndex[targetGroup]){const item=to.items[index];if(!targetIndices.has(item.key))targetIndices.set(item.key,index);if(eligible.has(item.key))skipTo.add(index);}
    const allIndices=toIndex[targetGroup];
    let next=allIndices.length?allIndices.at(-1)+1:target.insertion;
    const slots=[];
    for(const feature of [...b.geometry.features].reverse()){
      next=targetIndices.get(feature.key)??next;
      if(eligible.has(feature.key))slots.push({key:feature.key,index:next});
    }
    slots.reverse();
    const first=subset(a,eligible),last=subset(b,eligible),index=groups.length;
    groups.push({sourceGroup,targetGroup,from:first,to:last,interpolation:eligible.size?prepareGeoInterpolation(first.geometry,last.geometry):null,appearances:last.geometry.features.map(feature=>styles.get(feature.key)),slots,fallback});
    pairs.set(JSON.stringify([sourceGroup,targetGroup]),index);
  }
  validateGeneratedItemLimit(groups.length,"Animation Geo paired groups");
  const value=cloneAndFreeze({groups});prepared.add(value);
  const reasons=value.groups.map(group=>new Map(group.fallback.map(failure=>[failure.key,failure.reason])));
  const fallbackTrack=match=>{
    const a=from.items[match.sourceIndex],b=to.items[match.targetIndex];
    if(a===null&&b===null)return undefined;
    const pair=a===null||b===null?undefined:pairs.get(JSON.stringify([a.group,b.group]));
    const reason=pair===undefined?"geo-identity":reasons[pair].get(b.key);
    return reason===undefined?undefined:{...match,kind:"crossfade",reason};
  };
  return {state:value,skipFrom,skipTo,fallbackTrack};
}

// Native geometry is resolved once per group and sample. Current paint bounds
// and projection clipping come from their existing materialization owners.
export function sampleGeoTracks(state,progress) {
  validateUnitInterval(progress,"Animation Geo progress");
  if(!prepared.has(state))throw new TypeError("Geo sampling requires authentic prepared tracks.");
  const groups=[];let work=0,points=0;
  for(const group of state.groups){
    if(group.interpolation===null)continue;
    const geometry=sampleGeoInterpolation(group.interpolation,progress).group;
    const presentation=normalizeGeoAnimationPresentation({...group.to,geometry,
      styles:group.to.styles.map((style,index)=>group.appearances[index]===null?style:{...style,...sampleAnimationAppearance(group.appearances[index],progress)}),
      plotOrigin:group.from.plotOrigin.map((value,index)=>interpolateNumber(value,group.to.plotOrigin[index],progress)),
      frame:interpolateNodeFrame(group.from.frame,group.to.frame,progress)});
    const resolved=resolveGeoAnimationPresentation(presentation);
    validateWorkLimit(work+=resolved.diagnostics.work,"Animation Geo sampled work");
    validateGeneratedItemLimit(points+=resolved.diagnostics.points,"Animation Geo sampled points");
    const byFeature=new Map(presentation.geometry.features.map(feature=>[geoAnimationItemKey(geometry,feature.key),[]]));
    for(const graphic of resolved.graphics)byFeature.get(graphic.identity.key).push(graphic);
    const emissions=group.slots.map(slot=>({slot:slot.index,key:slot.key,graphics:byFeature.get(geoAnimationItemKey(geometry,slot.key))}));
    groups.push({sourceGroup:group.sourceGroup,targetGroup:group.targetGroup,presentation,emissions});
  }
  return cloneAndFreeze(groups);
}
