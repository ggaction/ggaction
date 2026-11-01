import { projectGeoTextAnimations, validateGeoTextAnimations, emptyAnimationGeoTexts } from "../materialization/animation/geoText.js";
import { ANIMATION_GEO_TEXT_VERSION } from "../materialization/animation/geoTextGeometry.js";
import { prepareGeoTextTracks } from "./geoTextTracks.js";
import { projectGuideAnimationState } from "../materialization/animation/guides.js";
import { ANIMATION_GUIDE_VERSION } from "../grammar/animation/guideState.js";
import { prepareGuideTracks, emptyAnimationGuides, hasAnimationGuides, validateAnimationGuides } from "./guideTracks.js";
import { ANIMATION_APPEARANCE_VERSION, prepareAnimationAppearance } from "./appearance.js";
import { projectGeoAnimationPresentations, validateGeoAnimationPresentations } from "../materialization/animation/geoPresentation.js";
import { ANIMATION_GEO_VERSION } from "../grammar/animation/geoState.js";
import { prepareGeoTracks, emptyAnimationGeos } from "./geoTracks.js";
import { projectPolarAnimationState } from "../materialization/animation/polar.js";
import { ANIMATION_POLAR_VERSION } from "../grammar/animation/polarState.js";
import { preparePolarTrack, emptyAnimationPolars, hasRetainedAnimationPolars, validateAnimationPolars } from "./polarTracks.js";
import { projectCartesianAnimationState } from "../materialization/animation/cartesian.js";
import { ANIMATION_CARTESIAN_VERSION } from "../grammar/animation/cartesianState.js";
import { prepareCartesianTrack, emptyAnimationCartesian, hasRetainedAnimationCartesian, validateAnimationCartesian } from "./cartesianTracks.js";
import { projectPartitionAnimations } from "../materialization/animation/partition.js";
import { validateAnimationPartitionState } from "../materialization/animation/partitionGeometry.js";
import { PARTITION_ANIMATION_VERSION } from "../grammar/animation/partitionState.js";
import { partitionTrackPreparation, emptyAnimationPartitions } from "./partitionTracks.js";
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
import { sameConcreteValue, clipInterpolationCompatible, blendAnimationNodes, validateAnimationFallbackReason } from "./concrete.js";

import { projectGraphAnimationState, validateAnimationGraphState } from "../materialization/animation/graph.js";
import { ANIMATION_GRAPH_VERSION } from "../grammar/animation/graphState.js";
import { ANIMATION_ROUTE_VERSION } from "../grammar/animation/routes.js";
import { graphTrackPreparation, emptyAnimationGraphs } from "./graphTracks.js";
import { prepareAnimationTimeline } from "./timelineTracks.js";
import { ANIMATION_TIMELINE_VERSION } from "../grammar/animation/timeline.js";
import { graphicAnimationOwnerKey, guideAnimationOwnerKey } from "../grammar/animation/ownerKey.js";

export const TRANSITION_PLAN_VERSION = 3;
const plans = new WeakSet();
const preparedTimelines = new WeakMap();
const preparedOwners = new WeakMap();
const preparedPositions = new WeakMap();
const preparedGuides = new WeakMap();
const preparedGeoTexts = new WeakMap();
const preparedGeos = new WeakMap();
const preparedCartesian = new WeakMap();
const preparedPolars = new WeakMap();
const preparedGraphs = new WeakMap();
const preparedPartitions = new WeakMap();
const exactFrames = new WeakMap();
// Transition version also fixes timing/easing, correspondence and weighted blending.
const kernels = Object.freeze({ transition: TRANSITION_PLAN_VERSION, position: ANIMATION_POSITION_VERSION, appearance: ANIMATION_APPEARANCE_VERSION });
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
  const style=value=>Object.fromEntries(Object.entries(value).filter(([key])=>!["x","y","radius"].includes(key)));
  const appearance=prepareAnimationAppearance(style(source.properties),style(target.properties));
  if(appearance.kind==="crossfade")return fade(appearance.reason);
  const x=preparePositionInterpolation(a.x,b.x),y=preparePositionInterpolation(a.y,b.y);
  if(x.kind==="crossfade"||y.kind==="crossfade")return fade(x.reason??y.reason);
  for(const [value,channel]of [[x,"x"],[y,"y"]]) {
    if(samplePositionInterpolation(value,0).position!==source.properties[channel]||samplePositionInterpolation(value,1).position!==target.properties[channel])return fade("edited-position");
  }
  return {...metadata,kind:"semantic-point",x,y,appearance};
}

// Native typed families share exact keyed correspondence and endpoint admission.
// Unsupported identities remain explicit crossfades, never pixel-inferred tracks.
export function normalizeTransitionOptions(input) {
  const options=ownRecord(input,"Transition options");rejectUnknownProperties(options,["durationMs","easing","tracks","markers","composite"],"transition options");
  if(!Object.hasOwn(options,"durationMs"))throw new TypeError("Transition options require their own duration.");
  validateNonNegativeFinite(options.durationMs,"Transition duration");
  const easing=Object.hasOwn(options,"easing")?options.easing:"cubic-in-out";easeProgress(.5,easing);
  if(easing===undefined)throw new TypeError("Transition easing cannot be undefined.");
  const timeline=Object.fromEntries(["tracks","markers","composite"].filter(key=>Object.hasOwn(options,key)).map(key=>[key,options[key]]));
  budget([timeline],true);
  return cloneAndFreeze({durationMs:options.durationMs,easing,...timeline});
}
function assemble(from,to,a,b,options,graphs,cartesian,partitions,polars,geos,guides,geotexts) {
  validateGeneratedItemLimit(from.scene.nodes.length+to.scene.nodes.length,"Animation endpoint nodes");
  const matching=matchAnimationEndpoints(from,to);
  const geoPreparation=prepareGeoTracks(geos.from,geos.to);
  const geoTextPreparation=prepareGeoTextTracks(geotexts.from,geotexts.to);
  budget([cartesian.from,cartesian.to,polars.from,polars.to,guides.from,guides.to]);
  const guidePreparation=prepareGuideTracks({...from,guides:guides.from},{...to,guides:guides.to});
  const graphPreparation=graphTrackPreparation(from,to,graphs.from,graphs.to);
  const partitionPreparation=partitionTrackPreparation(from,to,partitions.from,partitions.to);
  let tracks=matching.matches.filter(match=>!geoPreparation.skipFrom.has(match.sourceIndex)&&!geoPreparation.skipTo.has(match.targetIndex)&&!geoTextPreparation.skipFrom.has(match.sourceIndex)&&!geoTextPreparation.skipTo.has(match.targetIndex)).map(match=>geoTextPreparation.fallbackTrack(match)??geoPreparation.fallbackTrack(match)??partitionPreparation.track(match)??graphPreparation.track(match)??preparePolarTrack(match,from,to,polars.from[match.sourceIndex],polars.to[match.targetIndex])??prepareCartesianTrack(match,from,to,cartesian.from[match.sourceIndex],cartesian.to[match.targetIndex])??track(match,from,to,a[match.sourceIndex],b[match.targetIndex]));
  tracks.push(...guidePreparation.tracks);
  const owners=Object.fromEntries([['from',from],['to',to]].map(([side,endpoint])=>[side,endpoint.identities.map((identity,index)=>identity!==undefined?graphicAnimationOwnerKey(identity):guides[side][index]===null?undefined:guideAnimationOwnerKey(guides[side][index].identity))]));
  tracks=tracks.map(track=>owners.to[track.targetIndex]===undefined?track:{...track,ownerKey:owners.to[track.targetIndex]});
  const frames=frameTracks(from,to), matchedAnonymous=[...frames,...guidePreparation.tracks], frameSources=new Set(matchedAnonymous.map(track=>track.sourceIndex)),frameTargets=new Set(matchedAnonymous.map(track=>track.targetIndex));
  for(const item of [...tracks,...frames])if(item.kind==="crossfade")blendAnimationNodes(from.scene.nodes[item.sourceIndex],to.scene.nodes[item.targetIndex],.5,Math.max(from.scene.width,to.scene.width),Math.max(from.scene.height,to.scene.height));
  const timeline=['tracks','markers','composite'].some(key=>Object.hasOwn(options,key))?prepareAnimationTimeline(options,{from,to,tracks,guides,geos:{...geos,...geoPreparation},geotexts:{...geotexts,...geoTextPreparation}}):undefined;
  const plan=cloneAndFreeze({kind:"transition-plan",version:TRANSITION_PLAN_VERSION,durationMs:options.durationMs,easing:options.easing,
    from,to,tracks,frameTracks:frames,enters:matching.enters.filter(index=>!frameTargets.has(index)),exits:matching.exits.filter(index=>!frameSources.has(index))});
  plans.add(plan);preparedOwners.set(plan,cloneAndFreeze(owners));preparedTimelines.set(plan,timeline);preparedGeoTexts.set(plan,{...geotexts,...geoTextPreparation});preparedGuides.set(plan,{from:cloneAndFreeze(guides.from),to:cloneAndFreeze(guides.to),ambiguousFrom:new Set(guidePreparation.ambiguous.source),ambiguousTo:new Set(guidePreparation.ambiguous.target)});preparedGeos.set(plan,{...geos,...geoPreparation});preparedPolars.set(plan,cloneAndFreeze(polars));preparedCartesian.set(plan,cloneAndFreeze(cartesian));preparedPositions.set(plan,cloneAndFreeze({from:a,to:b}));preparedGraphs.set(plan,cloneAndFreeze({...graphs,pairs:graphPreparation.pairs}));preparedPartitions.set(plan,cloneAndFreeze({...partitions,pairs:partitionPreparation.pairs}));return plan;
}
export function planTransition(input) {
  ownRecord(input,"Transition request");rejectUnknownProperties(input,["from","to","options"],"transition request");
  if (["from","to","options"].some(key=>!Object.hasOwn(input,key))) throw new TypeError("Transition request requires its own endpoints and options.");
  const options=normalizeTransitionOptions(input.options);
  requireTransitionEndpoint(input.from);requireTransitionEndpoint(input.to);budget([input.from.graphicSpec,input.to.graphicSpec]);
  const prepare=value=>{
    const proof=animationFrameProvenance(value);
    if(proof!==undefined)return prepareFrameEndpoint(value,proof);
    const endpoint=projectAnimationEndpoint(value),geos=projectGeoAnimationPresentations(value,endpoint);return{endpoint,geotexts:projectGeoTextAnimations(value,endpoint,geos),guides:projectGuideAnimationState(value,endpoint),geos,positions:projectPointAnimationPositions(value,endpoint),graphs:projectGraphAnimationState(value,endpoint),cartesian:projectCartesianAnimationState(value,endpoint),polars:projectPolarAnimationState(value,endpoint),partitions:validateAnimationPartitionState(projectPartitionAnimations(value,endpoint),endpoint)};
  };
  const from=prepare(input.from),to=prepare(input.to),plan=assemble(from.endpoint,to.endpoint,from.positions,to.positions,options,{from:from.graphs??emptyAnimationGraphs(from.endpoint.scene.nodes.length),to:to.graphs??emptyAnimationGraphs(to.endpoint.scene.nodes.length)},{from:from.cartesian??emptyAnimationCartesian(from.endpoint),to:to.cartesian??emptyAnimationCartesian(to.endpoint)},{from:from.partitions??emptyAnimationPartitions(from.endpoint.scene.nodes.length),to:to.partitions??emptyAnimationPartitions(to.endpoint.scene.nodes.length)},{from:from.polars??emptyAnimationPolars(from.endpoint),to:to.polars??emptyAnimationPolars(to.endpoint)},{from:from.geos??emptyAnimationGeos(from.endpoint.scene.nodes.length),to:to.geos??emptyAnimationGeos(to.endpoint.scene.nodes.length)},{from:from.guides??emptyAnimationGuides(from.endpoint),to:to.guides??emptyAnimationGuides(to.endpoint)},{from:from.geotexts??emptyAnimationGeoTexts(from.endpoint.scene.nodes.length),to:to.geotexts??emptyAnimationGeoTexts(to.endpoint.scene.nodes.length)});
  exactFrames.set(plan,Object.freeze({from:from.frame,to:to.frame}));registerAnimationPlan(plan,{from:input.from,to:input.to});
  return plan;
}
export function requireTransitionPlan(plan) {
  if(!plans.has(plan))throw new TypeError("Transition sampling requires an authentic prepared plan.");return plan;
}

export function exportTransitionPlan(input) {
  const plan=requireTransitionPlan(input),positions=preparedPositions.get(plan),graphs=preparedGraphs.get(plan),cartesian=preparedCartesian.get(plan),partitions=preparedPartitions.get(plan),polars=preparedPolars.get(plan),geos=preparedGeos.get(plan),guides=preparedGuides.get(plan),geotexts=preparedGeoTexts.get(plan);
  const endpoint=side=>{
    const frame=exactFrames.get(plan)?.[side],source=plan[side];
    const geoState={...(geos[side].groups.length?{geos:geos[side]}:{}),...(geotexts[side].groups.length?{geotexts:geotexts[side]}:{})};
    const guideState=hasAnimationGuides(guides[side])?{guides:guides[side]}:{};
    const graphState={...(hasRetainedAnimationPolars(polars[side],source)?{polars:polars[side]}:{}),...(graphs[side].groups.length?{graphs:graphs[side]}:{}),...(hasRetainedAnimationCartesian(cartesian[side],source)?{cartesian:cartesian[side]}:{})};
    const partitionState=partitions[side].groups.length?{partitions:partitions[side]}:{};
    const view=frame===undefined?{}:{view:{progress:frame.progress,decisions:frame.decisions,...(Object.hasOwn(frame,"timeMs")?{timeMs:frame.timeMs}:{})}};
    return source.format==="native"?{graphicSpec:source.graphicSpec,positions:positions[side],...graphState,...partitionState,...geoState,...guideState,...view}:{scene:source.scene,identities:source.identities,
      backgrounds:source.backgrounds,positions:positions[side],...graphState,...partitionState,...geoState,...guideState,...view};
  };
  const timeline=preparedTimelines.get(plan);
  return cloneAndFreeze({kind:plan.kind,version:plan.version,...(timeline===undefined?{}:{timeline}),kernels:{...kernels,...(timeline===undefined?{}:{timeline:ANIMATION_TIMELINE_VERSION}),...(geotexts.from.groups.length||geotexts.to.groups.length?{geoText:ANIMATION_GEO_TEXT_VERSION}:{}),...(hasAnimationGuides(guides.from)||hasAnimationGuides(guides.to)?{guide:ANIMATION_GUIDE_VERSION}:{}),...(geos.from.groups.length||geos.to.groups.length?{geo:ANIMATION_GEO_VERSION}:{}),...(hasRetainedAnimationPolars(polars.from,plan.from)||hasRetainedAnimationPolars(polars.to,plan.to)?{polar:ANIMATION_POLAR_VERSION}:{}),...(hasRetainedAnimationCartesian(cartesian.from,plan.from)||hasRetainedAnimationCartesian(cartesian.to,plan.to)?{cartesian:ANIMATION_CARTESIAN_VERSION}:{}),...(graphs.from.groups.length||graphs.to.groups.length?{graph:ANIMATION_GRAPH_VERSION,route:ANIMATION_ROUTE_VERSION}:{}),...(partitions.from.groups.length||partitions.to.groups.length?{partition:PARTITION_ANIMATION_VERSION}:{})},durationMs:plan.durationMs,easing:plan.easing,
    from:endpoint("from"),to:endpoint("to")});
}

export function transitionGeoTexts(plan) {requireTransitionPlan(plan);return preparedGeoTexts.get(plan);}
export function transitionTimeline(plan) {requireTransitionPlan(plan);return preparedTimelines.get(plan);}
export function transitionOwners(plan) {requireTransitionPlan(plan);return preparedOwners.get(plan);}
export function transitionGuides(plan) {requireTransitionPlan(plan);return preparedGuides.get(plan);}
export function transitionGeos(plan) {requireTransitionPlan(plan);return preparedGeos.get(plan);}
export function transitionPolars(plan) {requireTransitionPlan(plan);return preparedPolars.get(plan);}
export function transitionPartitions(plan) {requireTransitionPlan(plan);return preparedPartitions.get(plan);}
export function transitionCartesian(plan) {requireTransitionPlan(plan);return preparedCartesian.get(plan);}
export function transitionGraphs(plan) {requireTransitionPlan(plan);return preparedGraphs.get(plan);}
export function transitionEndpointFrame(plan,side) {requireTransitionPlan(plan);return exactFrames.get(plan)?.[side];}
export function transitionEndpointPositions(plan,side) {requireTransitionPlan(plan);return preparedPositions.get(plan)[side];}

function closed(value, keys, label) {
  ownRecord(value,label);rejectUnknownProperties(value,keys,label);
  if(keys.some(key=>!Object.hasOwn(value,key)||value[key]===undefined))throw new TypeError(`${label} requires every declared field.`);
}
function restoreEndpoint(input) {
  let endpoint,frame;
  if(Object.hasOwn(input,"scene")){
    closed(input,["scene","identities","backgrounds","positions","view",...(Object.hasOwn(input,"guides")?["guides"]:[]),...(Object.hasOwn(input,"geotexts")?["geotexts"]:[]),...(Object.hasOwn(input,"geos")?["geos"]:[]),...(Object.hasOwn(input,"graphs")?["graphs"]:[]),...(Object.hasOwn(input,"cartesian")?["cartesian"]:[]),...(Object.hasOwn(input,"polars")?["polars"]:[]),...(Object.hasOwn(input,"partitions")?["partitions"]:[])],"Restored sampled endpoint");
    const scene=cloneAndFreeze(input.scene),graphicSpec=canvasSceneProgram(scene).graphicSpec;validateGraphic(graphicSpec);
    frame=cloneAndFreeze({graphicSpec,scene,...input.view});
    endpoint=projectSampledAnimationEndpoint(frame,cloneAndFreeze(input.identities),cloneAndFreeze(input.backgrounds));
  }else{
    closed(input,["graphicSpec","positions",...(Object.hasOwn(input,"guides")?["guides"]:[]),...(Object.hasOwn(input,"geotexts")?["geotexts"]:[]),...(Object.hasOwn(input,"geos")?["geos"]:[]),...(Object.hasOwn(input,"graphs")?["graphs"]:[]),...(Object.hasOwn(input,"cartesian")?["cartesian"]:[]),...(Object.hasOwn(input,"polars")?["polars"]:[]),...(Object.hasOwn(input,"partitions")?["partitions"]:[]),...(Object.hasOwn(input,"view")?["view"]:[])],"Restored animation endpoint");
    validateGraphic(input.graphicSpec);endpoint=projectAnimationEndpoint({graphicSpec:cloneAndFreeze(input.graphicSpec)});
    if(Object.hasOwn(input,"view")){
      frame=cloneAndFreeze({graphicSpec:endpoint.graphicSpec,scene:endpoint.scene,...input.view});
    }
  }
  const guides=Object.hasOwn(input,"guides")?validateAnimationGuides(input.guides,endpoint):emptyAnimationGuides(endpoint);
  if(Object.hasOwn(input,"guides")&&!hasAnimationGuides(guides))throw new TypeError("Empty animation guide states must be omitted.");
  if(input.view!==undefined)validateSampledEndpointMetadata(endpoint.scene,endpoint.identities,endpoint.backgrounds,input.view,guides);
  ownArray(input.positions,"Restored animation positions");
  if(input.positions.length!==endpoint.scene.nodes.length)throw new TypeError("Restored positions must correspond to every endpoint node.");
  for(let index=0;index<input.positions.length;index++){
    validatePointAnimationPosition(input.positions[index],endpoint.identities[index],endpoint.scene.nodes[index]);
  }
  const geos=Object.hasOwn(input,"geos")?validateGeoAnimationPresentations(input.geos,endpoint):emptyAnimationGeos(endpoint.scene.nodes.length);
  if(Object.hasOwn(input,"geos")&&geos.groups.length===0)throw new TypeError("An empty animation Geo state must be omitted.");
  const geotexts=Object.hasOwn(input,"geotexts")?validateGeoTextAnimations(input.geotexts,endpoint,geos):emptyAnimationGeoTexts(endpoint.scene.nodes.length);
  if(Object.hasOwn(input,"geotexts")&&geotexts.groups.length===0)throw new TypeError("An empty geographic Text state must be omitted.");
  for(const [index,decision]of (input.view?.decisions??[]).entries())if(decision.kind==="geographic"){
    const state=decision.kernel==="native-geo-text"?geotexts:geos;
    if(state.items[index]===null||state.items[index].reason)throw new TypeError("Geographic decision requires its exact prepared feature part.");
  }
  const graphs=Object.hasOwn(input,"graphs")?validateAnimationGraphState(input.graphs,endpoint):emptyAnimationGraphs(endpoint.scene.nodes.length);
  if(Object.hasOwn(input,"graphs")&&graphs.groups.length===0)throw new TypeError("An empty animation graph state must be omitted.");
  const partitions=Object.hasOwn(input,"partitions")?validateAnimationPartitionState(input.partitions,endpoint):emptyAnimationPartitions(endpoint.scene.nodes.length);
  if(Object.hasOwn(input,"partitions")&&partitions.groups.length===0)throw new TypeError("An empty animation partition state must be omitted.");
  const polars=Object.hasOwn(input,"polars")?validateAnimationPolars(input.polars,endpoint):emptyAnimationPolars(endpoint);
  if(Object.hasOwn(input,"polars")&&!hasRetainedAnimationPolars(polars,endpoint))throw new TypeError("Empty polar animation states must be omitted.");
  const cartesian=Object.hasOwn(input,"cartesian")?validateAnimationCartesian(input.cartesian,endpoint):emptyAnimationCartesian(endpoint);
  if(Object.hasOwn(input,"cartesian")&&!hasRetainedAnimationCartesian(cartesian,endpoint))throw new TypeError("Empty Cartesian animation states must be omitted.");
  for(const [index,decision]of (input.view?.decisions??[]).entries())if(decision.kind==="semantic-kernel"){
    if(decision.kernel==="guide-geometry"?guides[index]?.kind===undefined:decision.kernel==="polar-geometry"?polars[index].kind===undefined:decision.kernel==="cartesian-point"?Object.hasOwn(input.positions[index],"reason"):decision.kernel==="cartesian-geometry"?cartesian[index].kind===undefined:(decision.kernel==="partition"?partitions:graphs).items[index]===null||Object.hasOwn((decision.kernel==="partition"?partitions:graphs).items[index],"reason")) {
      throw new TypeError("Sampled semantic decision requires its retained prepared meaning.");
    }
  }
  return {endpoint,guides,geotexts,geos:cloneAndFreeze(geos),positions:cloneAndFreeze(input.positions),graphs:cloneAndFreeze(graphs),cartesian,polars,partitions:cloneAndFreeze(partitions),frame};
}
export function restoreTransitionPlan(input) {
  budget([input],true);
  const timelineKernel=Object.hasOwn(input,"timeline");
  closed(input,["kind","version","kernels","durationMs","easing","from","to",...(timelineKernel?["timeline"]:[])],"Restored transition plan");
  if(input.kind!=="transition-plan"||input.version!==TRANSITION_PLAN_VERSION)throw new TypeError("Unsupported transition plan kind or version.");
  const guideKernel=Object.hasOwn(input.from,"guides")||Object.hasOwn(input.to,"guides");
  const geoTextKernel=Object.hasOwn(input.from,"geotexts")||Object.hasOwn(input.to,"geotexts");
  const geoKernel=Object.hasOwn(input.from,"geos")||Object.hasOwn(input.to,"geos");
  const graphKernel=Object.hasOwn(input.from,"graphs")||Object.hasOwn(input.to,"graphs");
  const partitionKernel=Object.hasOwn(input.from,"partitions")||Object.hasOwn(input.to,"partitions");
  const polarKernel=Object.hasOwn(input.from,"polars")||Object.hasOwn(input.to,"polars");
  const cartesianKernel=Object.hasOwn(input.from,"cartesian")||Object.hasOwn(input.to,"cartesian");
  closed(input.kernels,["transition","position","appearance",...(timelineKernel?["timeline"]:[]),...(geoTextKernel?["geoText"]:[]),...(guideKernel?["guide"]:[]),...(geoKernel?["geo"]:[]),...(polarKernel?["polar"]:[]),...(cartesianKernel?["cartesian"]:[]),...(graphKernel?["graph","route"]:[]),...(partitionKernel?["partition"]:[])],"Animation kernels");
  if(timelineKernel&&input.kernels.timeline!==ANIMATION_TIMELINE_VERSION)throw new TypeError("Unsupported animation timeline kernel version.");
  if(geoTextKernel&&input.kernels.geoText!==ANIMATION_GEO_TEXT_VERSION)throw new TypeError("Unsupported geographic Text animation kernel version.");
  if(guideKernel&&input.kernels.guide!==ANIMATION_GUIDE_VERSION)throw new TypeError("Unsupported guide animation kernel version.");
  if(geoKernel&&input.kernels.geo!==ANIMATION_GEO_VERSION)throw new TypeError("Unsupported animation Geo kernel version.");
  if(partitionKernel&&input.kernels.partition!==PARTITION_ANIMATION_VERSION)throw new TypeError("Unsupported animation partition kernel version.");
  if(polarKernel&&input.kernels.polar!==ANIMATION_POLAR_VERSION)throw new TypeError("Unsupported polar animation kernel version.");
  if(cartesianKernel&&input.kernels.cartesian!==ANIMATION_CARTESIAN_VERSION)throw new TypeError("Unsupported Cartesian animation kernel version.");
  if(graphKernel&&(input.kernels.graph!==ANIMATION_GRAPH_VERSION||input.kernels.route!==ANIMATION_ROUTE_VERSION))throw new TypeError("Unsupported animation graph kernel version.");
  if(input.kernels.transition!==kernels.transition||input.kernels.position!==kernels.position||input.kernels.appearance!==kernels.appearance)throw new TypeError("Unsupported animation kernel version.");
  if(timelineKernel){closed(input.timeline,["version","tracks","markers","composite"],"Restored timeline");if(input.timeline.version!==ANIMATION_TIMELINE_VERSION)throw new TypeError("Unsupported animation timeline version.");}
  const options=normalizeTransitionOptions({durationMs:input.durationMs,easing:input.easing,...(timelineKernel?{tracks:input.timeline.tracks,markers:input.timeline.markers,composite:input.timeline.composite}:{})});
  const from=restoreEndpoint(input.from),to=restoreEndpoint(input.to);
  const plan=assemble(from.endpoint,to.endpoint,from.positions,to.positions,options,{from:from.graphs,to:to.graphs},{from:from.cartesian,to:to.cartesian},{from:from.partitions,to:to.partitions},{from:from.polars,to:to.polars},{from:from.geos,to:to.geos},{from:from.guides,to:to.guides},{from:from.geotexts,to:to.geotexts});
  exactFrames.set(plan,Object.freeze({from:from.frame,to:to.frame}));registerAnimationPlan(plan,{});
  return plan;
}
