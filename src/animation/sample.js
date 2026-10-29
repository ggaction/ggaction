import { cloneAndFreeze } from "../core/immutable.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { samplePositionInterpolation } from "../grammar/animation/positions.js";
import { transitionProgress,easeProgress,interpolateNumber } from "../grammar/animation/values.js";
import { requireTransitionPlan, transitionEndpointPositions, transitionEndpointFrame } from "./planner.js";
import { registerAnimationFrame, animationFrameProvenance } from "./frameProvenance.js";
import { blendAnimationNodes,fadeAnimationNode,interpolateNodeFrame } from "./concrete.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

export function sampleTransition(input,timeMs) {
  const plan=requireTransitionPlan(input),progress=easeProgress(transitionProgress(timeMs,plan.durationMs),plan.easing);
  const decisions=[];
  const fromPositions=transitionEndpointPositions(plan,"from"),toPositions=transitionEndpointPositions(plan,"to");
  const finish=(frame,positions)=>animationFrameProvenance(frame)===undefined?registerAnimationFrame(frame,{plan,timeMs,positions}):frame;
  const meaning=position=>position.reason?null:position;
  if(progress===0||progress===1){
    const side=progress===0?"from":"to",endpoint=plan[side],frame=transitionEndpointFrame(plan,side)??cloneAndFreeze({graphicSpec:endpoint.graphicSpec,scene:endpoint.scene,progress,decisions});
    return finish(frame,(progress===0?fromPositions:toPositions).map(meaning));
  }
  const width=interpolateNumber(plan.from.scene.width,plan.to.scene.width,progress),height=interpolateNumber(plan.from.scene.height,plan.to.scene.height,progress);
  const updates=new Map([...plan.tracks,...plan.frameTracks].map(track=>[track.targetIndex,track]));
  const positions=[];
  const nodes=plan.to.scene.nodes.map((to,targetIndex)=>{
    const track=updates.get(targetIndex);
    if(track===undefined){decisions.push({kind:"enter",targetIndex});positions.push(meaning(toPositions[targetIndex]));return fadeAnimationNode(to,progress);}
    const from=plan.from.scene.nodes[track.sourceIndex],metadata={sourceIndex:track.sourceIndex,targetIndex,
      ...(track.key===undefined?{owner:track.owner}:{itemKey:track.key}),role:track.role};
    if(track.kind==="exact"){decisions.push({...metadata,kind:"exact"});positions.push(meaning(toPositions[targetIndex]));return to;}
    let reason=track.reason;
    if(track.kind==="semantic-point"){
      const x=samplePositionInterpolation(track.x,progress),y=samplePositionInterpolation(track.y,progress);
      if(x.kind==="position"&&y.kind==="position"){
        const properties={...to.properties,x:x.position,y:y.position,radius:interpolateNumber(from.properties.radius,to.properties.radius,progress)};
        validateConcreteGraphicProperties("circle",properties);decisions.push({...metadata,kind:"semantic-kernel",kernel:"cartesian-point"});
        positions.push({x:{value:x.value,scale:x.scale},y:{value:y.value,scale:y.scale}});
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=x.reason??y.reason;
    }
    positions.push(null);decisions.push({...metadata,kind:"crossfade",reason});return blendAnimationNodes(from,to,progress,width,height);
  });
  const used=new Set(nodes.map(node=>node.key));
  for(const sourceIndex of plan.exits){const from=plan.from.scene.nodes[sourceIndex];let key=from.key;
    if(used.has(key))key=JSON.stringify(["animation-exit",sourceIndex,key]);
    if(used.has(key))throw new TypeError("Animation exit key collides with a target scene key.");used.add(key);
    decisions.push({kind:"exit",sourceIndex});nodes.push(fadeAnimationNode(from,1-progress,key));
    positions.push(meaning(fromPositions[sourceIndex]));
  }
  const scene=cloneAndFreeze({version:2,width,height,nodes});
  return finish(cloneAndFreeze({graphicSpec:canvasSceneProgram(scene).graphicSpec,scene,progress,decisions}),positions);
}

// Offline frame export adds only a time label while retaining authentic meaning.
export function withSampleTime(frame,timeMs,plan) {
  const proof=animationFrameProvenance(frame);
  if(proof===undefined)throw new TypeError("A sampled time view requires an authentic frame.");
  let source=proof;
  if(plan!==undefined){
    requireTransitionPlan(plan);
    const progress=easeProgress(transitionProgress(timeMs,plan.durationMs),plan.easing),side=progress===0?"from":progress===1?"to":undefined;
    if(side!==undefined&&transitionEndpointFrame(plan,side)===frame){source={plan,timeMs,positions:transitionEndpointPositions(plan,side).map(position=>position.reason?null:position)};}
    else if(plan!==proof.plan)throw new TypeError("Sampled time view does not belong to this plan.");
  }
  if(source.timeMs!==timeMs)throw new TypeError("A sampled time view requires its exact authentic sample time.");
  return registerAnimationFrame(cloneAndFreeze({...frame,timeMs}),source);
}
