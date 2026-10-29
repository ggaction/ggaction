import { cloneAndFreeze } from "../core/immutable.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { samplePositionInterpolation } from "../grammar/animation/positions.js";
import { transitionProgress,easeProgress,interpolateNumber } from "../grammar/animation/values.js";
import { requireTransitionPlan } from "./planner.js";
import { blendAnimationNodes,fadeAnimationNode,interpolateNodeFrame } from "./concrete.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";

export function sampleTransition(input,timeMs) {
  const plan=requireTransitionPlan(input),progress=easeProgress(transitionProgress(timeMs,plan.durationMs),plan.easing);
  const decisions=[];
  if(progress===0||progress===1){const endpoint=progress===0?plan.from:plan.to;return cloneAndFreeze({graphicSpec:endpoint.graphicSpec,scene:endpoint.scene,progress,decisions});}
  const width=interpolateNumber(plan.from.scene.width,plan.to.scene.width,progress),height=interpolateNumber(plan.from.scene.height,plan.to.scene.height,progress);
  const updates=new Map([...plan.tracks,...plan.frameTracks].map(track=>[track.targetIndex,track]));
  const nodes=plan.to.scene.nodes.map((to,targetIndex)=>{
    const track=updates.get(targetIndex);
    if(track===undefined){decisions.push({kind:"enter",targetIndex});return fadeAnimationNode(to,progress);}
    const from=plan.from.scene.nodes[track.sourceIndex],metadata={sourceIndex:track.sourceIndex,targetIndex,
      ...(track.key===undefined?{owner:track.owner}:{itemKey:track.key}),role:track.role};
    if(track.kind==="exact"){decisions.push({...metadata,kind:"exact"});return to;}
    let reason=track.reason;
    if(track.kind==="semantic-point"){
      const x=samplePositionInterpolation(track.x,progress),y=samplePositionInterpolation(track.y,progress);
      if(x.kind==="position"&&y.kind==="position"){
        const properties={...to.properties,x:x.position,y:y.position,radius:interpolateNumber(from.properties.radius,to.properties.radius,progress)};
        validateConcreteGraphicProperties("circle",properties);decisions.push({...metadata,kind:"semantic-kernel",kernel:"cartesian-point"});
        return cloneAndFreeze({...to,properties,...interpolateNodeFrame(from,to,progress)});
      }
      reason=x.reason??y.reason;
    }
    decisions.push({...metadata,kind:"crossfade",reason});return blendAnimationNodes(from,to,progress,width,height);
  });
  const used=new Set(nodes.map(node=>node.key));
  for(const sourceIndex of plan.exits){const from=plan.from.scene.nodes[sourceIndex];let key=from.key;
    if(used.has(key))key=JSON.stringify(["animation-exit",sourceIndex,key]);
    if(used.has(key))throw new TypeError("Animation exit key collides with a target scene key.");used.add(key);
    decisions.push({kind:"exit",sourceIndex});nodes.push(fadeAnimationNode(from,1-progress,key));
  }
  const scene=cloneAndFreeze({version:2,width,height,nodes});
  return cloneAndFreeze({graphicSpec:canvasSceneProgram(scene).graphicSpec,scene,progress,decisions});
}
