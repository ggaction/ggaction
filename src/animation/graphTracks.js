import { validateWorkLimit } from "../core/validation.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { prepareGraphInterpolation, sampleGraphInterpolation, animationGraphGroupWork } from "../grammar/animation/graphState.js";
import { resolveAnimationGraphGeometry, animationGraphItemGeometry } from "../materialization/animation/graph.js";
import { sameConcreteValue, clipInterpolationCompatible } from "./concrete.js";

export const emptyAnimationGraphs = length => Object.freeze({groups:Object.freeze([]),items:Object.freeze(Array(length).fill(null))});
export function graphTrackPreparation(from,to,a,b) {
  const pairs=[],indices=new Map(),edgeIndices=[],stationary=[];let work=0;
  const track=match=>{
    const source=a.items[match.sourceIndex],target=b.items[match.targetIndex];
    if(source===null&&target===null)return undefined;
    const fade=reason=>({...match,kind:"crossfade",reason});
    if(source===null||target===null)return fade("unsupported-family");
    const first=from.scene.nodes[match.sourceIndex],last=to.scene.nodes[match.targetIndex];
    if(first.type!==last.type)return fade("primitive-kind");
    if(first.topology!==last.topology)return fade("topology");
    if(source.reason||target.reason)return fade(source.reason??target.reason);
    if(!clipInterpolationCompatible(first,last))return fade("clip-topology");
    const key=JSON.stringify([source.group,target.group]);let pair=indices.get(key);
    if(pair===undefined){
      for(const group of [a.groups[source.group],b.groups[target.group]])validateWorkLimit(work+=animationGraphGroupWork(group,4),"Animation graph track work");
      pair=pairs.length;indices.set(key,pair);pairs.push(prepareGraphInterpolation(a.groups[source.group],b.groups[target.group]));edgeIndices.push(new Map(b.groups[target.group].edges.map((edge,index)=>[edge.key,index])));stationary.push(sameConcreteValue(a.groups[source.group],b.groups[target.group]));}
    // Exact concrete equality is sufficient only when the retained graph meaning
    // also agrees. Compute shared group equality once, including collapsed routes.
    if(stationary[pair]&&sameConcreteValue(first,last))return {...match,kind:"exact"};
    const staticPaint=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["x","y","radius","commands"].includes(key)));
    if(typeof first.properties.fill==="object"||typeof last.properties.fill==="object"||!sameConcreteValue(staticPaint(first.properties),staticPaint(last.properties)))return fade("appearance");
    const prepared=pairs[pair];
    if(prepared.kind==="crossfade")return fade(prepared.reason);
    if(target.kind==="edge"){
      const index=edgeIndices[pair].get(target.key),edge=prepared.routes[index];
      if(edge?.kind==="crossfade")return fade(edge.reason);
    }
    return {...match,kind:"semantic-graph",pair};
  };
  return {pairs,track};
}

// Sample each shared node/edge state once even when bodies, arrows and labels
// consume it. The caller owns paint, clipping and exact endpoint references.
export function graphTrackSamples(pairs,progress) {
  const sampled=new Map();
  return index=>{
    if(!sampled.has(index)){
      const result=sampleGraphInterpolation(pairs[index],progress);
      sampled.set(index,{...result,failures:new Map(result.failures.map(failure=>[failure.key,failure.reason])),geometry:resolveAnimationGraphGeometry(result.group)});
    }
    return sampled.get(index);
  };
}
export function sampleGraphTrack(state,item) {
  const reason=item.kind==="edge"?state.failures.get(item.key):undefined;
  if(reason)return {reason};
  const geometry=animationGraphItemGeometry(state.group,item,state.geometry);
  return geometry===undefined?{reason:"graph-edge-topology"}:{properties:geometry.properties};
}
export function graphFrameCollector() {
  const groups=[],items=[],indices=new Map();let work=0;
  const append=(group,item)=>{
    if(item===null){items.push(null);return;}
    let index=indices.get(group);
    if(index===undefined){validateWorkLimit(work+=animationGraphGroupWork(group),"Animation frame graph work");index=groups.length;indices.set(group,index);groups.push(group);}
    items.push({...item,group:index});
  };
  return {append,finish:()=>cloneAndFreeze({groups,items})};
}
