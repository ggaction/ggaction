import { sampleGuideInterpolation } from "./guideTracks.js";
import { sampleAnimationAppearance } from "./appearance.js";
import { sampleGeoTracks } from "./geoTracks.js";
import { geoFrameCollector } from "./geoFrames.js";
import { validateGeneratedItemLimit } from "../core/validation.js";
import { samplePolarInterpolation } from "../grammar/animation/polarState.js";
import { sampleCartesianInterpolation } from "../grammar/animation/cartesianState.js";
import { partitionTrackSamples, samplePartitionTrack, partitionFrameCollector, partitionAnimationPaint } from "./partitionTracks.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { samplePositionInterpolation } from "../grammar/animation/positions.js";
import { transitionProgress,easeProgress,interpolateNumber } from "../grammar/animation/values.js";
import { requireTransitionPlan, transitionEndpointPositions, transitionEndpointFrame, transitionGraphs, transitionCartesian, transitionPartitions, transitionPolars, transitionGeos, transitionGuides } from "./planner.js";
import { registerAnimationFrame, registerAnimationFrameView, animationFrameProvenance, animationPlanProvenance } from "./frameProvenance.js";
import { blendAnimationNodes,fadeAnimationNode,interpolateNodeFrame } from "./concrete.js";
import { captureFrameMeaning } from "./frameEndpoint.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

import { graphTrackSamples, sampleGraphTrack, graphFrameCollector } from "./graphTracks.js";

export function sampleTransition(input,timeMs) {
  const plan=requireTransitionPlan(input),progress=easeProgress(transitionProgress(timeMs,plan.durationMs),plan.easing);
  const decisions=[],geographic=[];
  const geoState=transitionGeos(plan);
  const guideState=transitionGuides(plan);
  const polarState=transitionPolars(plan);
  const cartesianState=transitionCartesian(plan);
  const graphState=transitionGraphs(plan),graphSamples=graphTrackSamples(graphState.pairs,progress),graphFrame=graphFrameCollector();
  const partitionState=transitionPartitions(plan),partitionSamples=partitionTrackSamples(partitionState,progress),partitionFrame=partitionFrameCollector();
  const fromPositions=transitionEndpointPositions(plan,"from"),toPositions=transitionEndpointPositions(plan,"to");
  const finish=(frame,positions,graphs,cartesian,partitions,polars,geos,guides)=>animationFrameProvenance(frame)===undefined?registerAnimationFrame(frame,{plan,timeMs,positions,graphs,cartesian,partitions,polars,geos,guides,meaning:captureFrameMeaning(frame,plan,timeMs,geographic)}):frame;
  const appendGraph=(side,index)=>{const state=graphState[side],item=state.items[index];graphFrame.append(item===null?undefined:state.groups[item.group],item);};
  const appendPartition=(side,index)=>{const state=partitionState[side],item=state.items[index];partitionFrame.append(item===null?undefined:state.groups[item.group],item);};
  const meaning=position=>position.reason?null:position;
  if(progress===0||progress===1){
    const side=progress===0?"from":"to",endpoint=plan[side],frame=transitionEndpointFrame(plan,side)??cloneAndFreeze({graphicSpec:endpoint.graphicSpec,scene:endpoint.scene,progress,decisions});
    return finish(frame,(progress===0?fromPositions:toPositions).map(meaning),graphState[side],cartesianState[side].map(meaning),partitionState[side],polarState[side].map(meaning),geoState[side],guideState[side]);
  }
  const width=interpolateNumber(plan.from.scene.width,plan.to.scene.width,progress),height=interpolateNumber(plan.from.scene.height,plan.to.scene.height,progress);
  const updates=new Map([...plan.tracks,...plan.frameTracks].map(track=>[track.targetIndex,track]));
  const positions=[],cartesian=[],polars=[],guides=[];
  const geoFrame=geoFrameCollector(sampleGeoTracks(geoState.state,progress),geoState.to);
  const nodes=[];
  const appendGeo=slot=>{for(const value of geoFrame.at(slot,nodes.length)){guides.push(null);geographic[nodes.length]={identity:value.identity,origin:value.origin};nodes.push(value.node);decisions.push(value.decision);positions.push(null);cartesian.push(null);polars.push(null);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);geoFrame.append(value.item);}};
  const sampleNode=(to,targetIndex)=>{
    guides.push(guideState.to[targetIndex]);
    const track=updates.get(targetIndex);
    if(track===undefined){appendGraph("to",targetIndex);appendPartition("to",targetIndex);decisions.push({kind:"enter",targetIndex,...(guideState.ambiguousTo.has(targetIndex)?{reason:"guide-ambiguity"}:{})});positions.push(meaning(toPositions[targetIndex]));cartesian.push(meaning(cartesianState.to[targetIndex]));polars.push(meaning(polarState.to[targetIndex]));return fadeAnimationNode(to,progress);}
    const from=plan.from.scene.nodes[track.sourceIndex],metadata={sourceIndex:track.sourceIndex,targetIndex,
      ...(track.guideKey!==undefined?{guideKey:track.guideKey}:track.key===undefined?{owner:track.owner}:{itemKey:track.key}),role:track.role};
    if(track.kind==="exact"){appendGraph("to",targetIndex);appendPartition("to",targetIndex);decisions.push({...metadata,kind:"exact"});positions.push(meaning(toPositions[targetIndex]));cartesian.push(meaning(cartesianState.to[targetIndex]));polars.push(meaning(polarState.to[targetIndex]));return to;}
    let reason=track.reason;
    const appearance=()=>sampleAnimationAppearance(track.appearance,progress);
    if(track.kind==="semantic-guide"){
      const sampled=sampleGuideInterpolation(track.guide,progress);
      if(sampled.kind==="guide"&&sampled.type===to.type){
        const properties={...to.properties,...appearance(),...sampled.properties};validateConcreteGraphicProperties(to.type,properties);
        decisions.push({...metadata,kind:"semantic-kernel",kernel:"guide-geometry"});positions.push(null);cartesian.push(null);polars.push(null);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);guides[guides.length-1]=sampled.state;
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=sampled.reason??"primitive-kind";
    }
    if(track.kind==="semantic-polar"){
      const sampled=samplePolarInterpolation(track.polar,progress);
      if(sampled.kind==="polar"){
        const properties={...to.properties,...appearance(),...sampled.properties,...(to.type==="circle"?{radius:interpolateNumber(from.properties.radius,to.properties.radius,progress)}:{})};validateConcreteGraphicProperties(to.type,properties);
        decisions.push({...metadata,kind:"semantic-kernel",kernel:"polar-geometry"});positions.push(null);cartesian.push(null);polars.push(sampled.state);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=sampled.reason;
    }
    if(track.kind==="semantic-cartesian"){
      const sampled=sampleCartesianInterpolation(track.cartesian,progress);
      if(sampled.kind==="cartesian"&&sampled.type===to.type){
        const properties={...to.properties,...appearance(),...sampled.properties};validateConcreteGraphicProperties(to.type,properties);
        decisions.push({...metadata,kind:"semantic-kernel",kernel:"cartesian-geometry"});positions.push(null);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);cartesian.push(sampled.state);polars.push(null);
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=sampled.reason??"primitive-kind";
    }
    if(track.kind==="semantic-partition"){
      const sampled=partitionSamples(track.pair),item=partitionState.to.items[targetIndex],geometry=samplePartitionTrack(sampled,item);
      if(geometry.properties){
        const properties={...partitionAnimationPaint(to.properties),...appearance(),...geometry.properties};validateConcreteGraphicProperties(geometry.type,properties);
        decisions.push({...metadata,kind:"semantic-kernel",kernel:"partition"});positions.push(null);cartesian.push(null);polars.push(null);graphFrame.append(undefined,null);partitionFrame.append(sampled.group,item);
        return cloneAndFreeze({...to,type:geometry.type,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=geometry.reason;
    }
    if(track.kind==="semantic-graph"){
      const sampled=graphSamples(track.pair),item=graphState.to.items[targetIndex],geometry=sampleGraphTrack(sampled,item);
      if(geometry.properties){
        const properties={...to.properties,...appearance(),...geometry.properties};validateConcreteGraphicProperties(to.type,properties);
        decisions.push({...metadata,kind:"semantic-kernel",kernel:"completed-graph"});positions.push(null);cartesian.push(null);polars.push(null);graphFrame.append(sampled.group,item);partitionFrame.append(undefined,null);
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=geometry.reason;
    }
    if(track.kind==="semantic-point"){
      const x=samplePositionInterpolation(track.x,progress),y=samplePositionInterpolation(track.y,progress);
      if(x.kind==="position"&&y.kind==="position"){
        const properties={...to.properties,...appearance(),x:x.position,y:y.position,radius:interpolateNumber(from.properties.radius,to.properties.radius,progress)};
        validateConcreteGraphicProperties("circle",properties);decisions.push({...metadata,kind:"semantic-kernel",kernel:"cartesian-point"});
        positions.push({x:{value:x.value,scale:x.scale},y:{value:y.value,scale:y.scale}});cartesian.push(null);polars.push(null);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=x.reason??y.reason;
    }
    if(guides[guides.length-1]!==null)guides[guides.length-1]={identity:guides[guides.length-1].identity,reason:"guide-unavailable"};
    positions.push(null);cartesian.push(null);polars.push(null);graphFrame.append(undefined,null);partitionFrame.append(undefined,null);decisions.push({...metadata,kind:"crossfade",reason});return blendAnimationNodes(from,to,progress,width,height);
  };
  for(const [targetIndex,to]of plan.to.scene.nodes.entries()){appendGeo(targetIndex);if(geoState.skipTo.has(targetIndex))continue;nodes.push(sampleNode(to,targetIndex));geoFrame.append(null);}
  appendGeo(plan.to.scene.nodes.length);
  const used=new Set(nodes.map(node=>node.key));
  if(used.size!==nodes.length)throw new TypeError("Animation generated Geo key collides with another scene key.");
  for(const sourceIndex of plan.exits){if(geoState.skipFrom.has(sourceIndex))continue;const from=plan.from.scene.nodes[sourceIndex];let key=from.key;
    if(used.has(key))key=JSON.stringify(["animation-exit",sourceIndex,key]);
    if(used.has(key))throw new TypeError("Animation exit key collides with a target scene key.");used.add(key);
    guides.push(guideState.from[sourceIndex]);decisions.push({kind:"exit",sourceIndex,...(guideState.ambiguousFrom.has(sourceIndex)?{reason:"guide-ambiguity"}:{})});nodes.push(fadeAnimationNode(from,1-progress,key));
    positions.push(meaning(fromPositions[sourceIndex]));cartesian.push(meaning(cartesianState.from[sourceIndex]));polars.push(meaning(polarState.from[sourceIndex]));appendGraph("from",sourceIndex);appendPartition("from",sourceIndex);geoFrame.append(null);
  }
  validateGeneratedItemLimit(nodes.length,"Animation sampled nodes");
  const scene=cloneAndFreeze({version:2,width,height,nodes});
  return finish(cloneAndFreeze({graphicSpec:canvasSceneProgram(scene).graphicSpec,scene,progress,decisions}),positions,graphFrame.finish(),cartesian,partitionFrame.finish(),polars,geoFrame.finish(),guides);
}

// Offline frame export adds only a time label while retaining authentic meaning.
export function withSampleTime(frame,timeMs,plan) {
  const proof=animationFrameProvenance(frame);
  if(proof===undefined)throw new TypeError("A sampled time view requires an authentic frame.");
  if(plan!==undefined){
    requireTransitionPlan(plan);
    const progress=easeProgress(transitionProgress(timeMs,plan.durationMs),plan.easing),side=progress===0?"from":progress===1?"to":undefined;
    if(side!==undefined&&transitionEndpointFrame(plan,side)===frame){
      return registerAnimationFrame(cloneAndFreeze({...frame,timeMs}),{plan,timeMs,
        guides:transitionGuides(plan)[side],geos:transitionGeos(plan)[side],positions:transitionEndpointPositions(plan,side).map(position=>position.reason?null:position),graphs:transitionGraphs(plan)[side],partitions:transitionPartitions(plan)[side],polars:transitionPolars(plan)[side].map(position=>position.reason?null:position),cartesian:transitionCartesian(plan)[side].map(position=>position.reason?null:position),meaning:captureFrameMeaning(frame,plan,timeMs)});
    }
    if(animationPlanProvenance(plan).identity!==proof.planIdentity)throw new TypeError("Sampled time view does not belong to this plan.");
  }
  if(proof.timeMs!==timeMs)throw new TypeError("A sampled time view requires its exact authentic sample time.");
  return registerAnimationFrameView(cloneAndFreeze({...frame,timeMs}),frame,timeMs);
}
