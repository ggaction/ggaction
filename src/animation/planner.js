import { ChartProgram } from "../core/ChartProgram.js";
import { requireClosedProgramState } from "../core/programState.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord, ownArray } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateNonNegativeFinite } from "../core/validation.js";
import { projectAnimationEndpoint, projectSampledAnimationEndpoint, matchAnimationEndpoints } from "./endpoints.js";
import { animationFrameProvenance, registerAnimationPlan } from "./frameProvenance.js";
import { prepareFrameEndpoint, validateSampledEndpointMetadata } from "./frameEndpoint.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";
import { projectPointAnimationPositions } from "../materialization/animation/point.js";
import { ANIMATION_POSITION_VERSION, preparePositionInterpolation, samplePositionInterpolation } from "../grammar/animation/positions.js";
import { validateGraphic } from "../persistence/validation.js";
import { validatePointAnimationPosition } from "../grammar/animation/pointState.js";
import { easeProgress } from "../grammar/animation/values.js";
import { sameConcreteValue, pointAppearanceCompatible, clipInterpolationCompatible, blendAnimationNodes, validateAnimationFallbackReason } from "./concrete.js";

export const TRANSITION_PLAN_VERSION = 1;
const plans = new WeakSet();
const preparedPositions = new WeakMap();
const exactFrames = new WeakMap();
// Transition version also fixes timing/easing, correspondence and weighted blending.
const kernels = Object.freeze({ transition: TRANSITION_PLAN_VERSION, position: ANIMATION_POSITION_VERSION });
function native(program) {
  if (!(program instanceof ChartProgram)) throw new TypeError("Animation preparation requires an immutable ChartProgram.");
  requireClosedProgramState(program,"Animation preparation");
}
export function requireTransitionEndpoint(value) {
  const proof=animationFrameProvenance(value);
  if(proof!==undefined){if(proof.positions===undefined)throw new TypeError("Sampled endpoint requires prepared semantic positions.");}
  else native(value);
  return value;
}
function budget(endpoints, restored = false) {
  const pending=endpoints.map(value=>({value,depth:0}));let work=0;
  while(pending.length){const {value,depth}=pending.pop();validateWorkLimit(++work,"Animation preparation work");
    if(depth>128)throw new RangeError("Animation preparation nesting exceeds 128 levels.");
    if(typeof value==="string")validateWorkLimit(work+=value.length,"Animation preparation work");
    else if(value!==null&&typeof value==="object"){
      if(restored){
        if(Array.isArray(value)){validateWorkLimit(value.length,"Animation preparation work");ownArray(value,"Restored animation array");}
        else ownRecord(value,"Restored animation object");
      }
      for(const [key,child] of Object.entries(value)){
      validateWorkLimit(work+=key.length,"Animation preparation work");pending.push({value:child,depth:depth+1});
    }}
    else if(restored&&!["number","boolean","undefined"].includes(typeof value)&&value!==null)throw new TypeError("Restored animation requires plain data.");
  }
}
function frameTracks(from, to) {
  const backgrounds = endpoint => new Map(endpoint.backgrounds.map(value=>[value.owner,value.index]));
  const a = backgrounds(from), b = backgrounds(to);
  return [...b].flatMap(([owner, targetIndex]) => {
    const sourceIndex = a.get(owner);
    if (sourceIndex === undefined) return [];
    return [{ sourceIndex, targetIndex, owner, role: "canvas-background",
      ...(sameConcreteValue(from.scene.nodes[sourceIndex], to.scene.nodes[targetIndex])
        ? { kind: "exact" } : { kind: "crossfade", reason: "canvas-background" }) }];
  });
}
function track(match,from,to,a,b) {
  const metadata={...match},source=from.scene.nodes[match.sourceIndex],target=to.scene.nodes[match.targetIndex];
  const fade=reason=>{validateAnimationFallbackReason(reason);return {...metadata,kind:"crossfade",reason};};
  if(source.type!==target.type)return fade("primitive-kind");
  if(source.topology!==target.topology)return fade("topology");
  const unchanged=sameConcreteValue(source,target);
  if(a.reason||b.reason)return fade(a.reason??b.reason);
  if(source.type!=="circle")return fade("unsupported-point-primitive");
  if(unchanged&&sameConcreteValue(a,b))return {...metadata,kind:"exact"};
  if(!clipInterpolationCompatible(source,target))return fade("clip-topology");
  if(!pointAppearanceCompatible(source.properties,target.properties))return fade("appearance");
  const x=preparePositionInterpolation(a.x,b.x),y=preparePositionInterpolation(a.y,b.y);
  if(x.kind==="crossfade"||y.kind==="crossfade")return fade(x.reason??y.reason);
  for(const [value,channel]of [[x,"x"],[y,"y"]]) {
    if(samplePositionInterpolation(value,0).position!==source.properties[channel]||samplePositionInterpolation(value,1).position!==target.properties[channel])return fade("edited-position");
  }
  return {...metadata,kind:"semantic-point",x,y};
}

// First executable vertical: native keyed circles with resolved continuous x/y.
// Other identities remain explicit concrete crossfades, never pixel-inferred tracks.
export function normalizeTransitionOptions(input) {
  const options=ownRecord(input,"Transition options");rejectUnknownProperties(options,["durationMs","easing"],"transition options");
  validateNonNegativeFinite(options.durationMs,"Transition duration");
  const easing=Object.hasOwn(options,"easing")?options.easing:"cubic-in-out";easeProgress(.5,easing);
  if(easing===undefined)throw new TypeError("Transition easing cannot be undefined.");
  return {durationMs:options.durationMs,easing};
}
function assemble(from,to,a,b,options) {
  validateGeneratedItemLimit(from.scene.nodes.length+to.scene.nodes.length,"Animation endpoint nodes");
  const matching=matchAnimationEndpoints(from,to);
  const tracks=matching.matches.map(match=>track(match,from,to,a[match.sourceIndex],b[match.targetIndex]));
  const frames=frameTracks(from,to),frameSources=new Set(frames.map(track=>track.sourceIndex)),frameTargets=new Set(frames.map(track=>track.targetIndex));
  for(const item of [...tracks,...frames])if(item.kind==="crossfade")blendAnimationNodes(from.scene.nodes[item.sourceIndex],to.scene.nodes[item.targetIndex],.5,Math.max(from.scene.width,to.scene.width),Math.max(from.scene.height,to.scene.height));
  const plan=cloneAndFreeze({kind:"transition-plan",version:TRANSITION_PLAN_VERSION,...options,
    from,to,tracks,frameTracks:frames,enters:matching.enters.filter(index=>!frameTargets.has(index)),exits:matching.exits.filter(index=>!frameSources.has(index))});
  plans.add(plan);preparedPositions.set(plan,cloneAndFreeze({from:a,to:b}));return plan;
}
export function planTransition(input) {
  ownRecord(input,"Transition request");rejectUnknownProperties(input,["from","to","options"],"transition request");
  const options=normalizeTransitionOptions(input.options);
  requireTransitionEndpoint(input.from);requireTransitionEndpoint(input.to);budget([input.from.graphicSpec,input.to.graphicSpec]);
  const prepare=value=>{
    const proof=animationFrameProvenance(value);
    if(proof!==undefined)return prepareFrameEndpoint(value,proof);
    const endpoint=projectAnimationEndpoint(value);return{endpoint,positions:projectPointAnimationPositions(value,endpoint)};
  };
  const from=prepare(input.from),to=prepare(input.to),plan=assemble(from.endpoint,to.endpoint,from.positions,to.positions,options);
  exactFrames.set(plan,Object.freeze({from:from.frame,to:to.frame}));registerAnimationPlan(plan,{from:input.from,to:input.to});
  return plan;
}
export function requireTransitionPlan(plan) {
  if(!plans.has(plan))throw new TypeError("Transition sampling requires an authentic prepared plan.");return plan;
}

export function exportTransitionPlan(input) {
  const plan=requireTransitionPlan(input),positions=preparedPositions.get(plan);
  const endpoint=side=>{
    const frame=exactFrames.get(plan)?.[side],source=plan[side];
    const view=frame===undefined?{}:{view:{progress:frame.progress,decisions:frame.decisions,...(Object.hasOwn(frame,"timeMs")?{timeMs:frame.timeMs}:{})}};
    return source.format==="native"?{graphicSpec:source.graphicSpec,positions:positions[side],...view}:{scene:source.scene,identities:source.identities,
      backgrounds:source.backgrounds,positions:positions[side],...view};
  };
  return cloneAndFreeze({kind:plan.kind,version:plan.version,kernels,durationMs:plan.durationMs,easing:plan.easing,
    from:endpoint("from"),to:endpoint("to")});
}

export function transitionEndpointFrame(plan,side) {requireTransitionPlan(plan);return exactFrames.get(plan)?.[side];}
export function transitionEndpointPositions(plan,side) {requireTransitionPlan(plan);return preparedPositions.get(plan)[side];}

function closed(value, keys, label) {
  ownRecord(value,label);rejectUnknownProperties(value,keys,label);
  if(keys.some(key=>!Object.hasOwn(value,key)||value[key]===undefined))throw new TypeError(`${label} requires every declared field.`);
}
function restoreEndpoint(input) {
  let endpoint,frame;
  if(Object.hasOwn(input,"scene")){
    closed(input,["scene","identities","backgrounds","positions","view"],"Restored sampled endpoint");
    const scene=cloneAndFreeze(input.scene),graphicSpec=canvasSceneProgram(scene).graphicSpec;validateGraphic(graphicSpec);
    validateSampledEndpointMetadata(scene,input.identities,input.backgrounds,input.view);
    frame=cloneAndFreeze({graphicSpec,scene,...input.view});
    endpoint=projectSampledAnimationEndpoint(frame,cloneAndFreeze(input.identities),cloneAndFreeze(input.backgrounds));
  }else{
    closed(input,["graphicSpec","positions",...(Object.hasOwn(input,"view")?["view"]:[])],"Restored animation endpoint");
    validateGraphic(input.graphicSpec);endpoint=projectAnimationEndpoint({graphicSpec:cloneAndFreeze(input.graphicSpec)});
    if(Object.hasOwn(input,"view")){
      validateSampledEndpointMetadata(endpoint.scene,endpoint.identities,endpoint.backgrounds,input.view);
      frame=cloneAndFreeze({graphicSpec:endpoint.graphicSpec,scene:endpoint.scene,...input.view});
    }
  }
  ownArray(input.positions,"Restored animation positions");
  if(input.positions.length!==endpoint.scene.nodes.length)throw new TypeError("Restored positions must correspond to every endpoint node.");
  for(let index=0;index<input.positions.length;index++){
    validatePointAnimationPosition(input.positions[index],endpoint.identities[index],endpoint.scene.nodes[index]);
  }
  return {endpoint,positions:cloneAndFreeze(input.positions),frame};
}
export function restoreTransitionPlan(input) {
  budget([input],true);
  closed(input,["kind","version","kernels","durationMs","easing","from","to"],"Restored transition plan");
  if(input.kind!=="transition-plan"||input.version!==TRANSITION_PLAN_VERSION)throw new TypeError("Unsupported transition plan kind or version.");
  closed(input.kernels,["transition","position"],"Animation kernels");
  if(input.kernels.transition!==kernels.transition||input.kernels.position!==kernels.position)throw new TypeError("Unsupported animation kernel version.");
  const options=normalizeTransitionOptions({durationMs:input.durationMs,easing:input.easing});
  const from=restoreEndpoint(input.from),to=restoreEndpoint(input.to);
  const plan=assemble(from.endpoint,to.endpoint,from.positions,to.positions,options);
  exactFrames.set(plan,Object.freeze({from:from.frame,to:to.frame}));registerAnimationPlan(plan,{});
  return plan;
}
