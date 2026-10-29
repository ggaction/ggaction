import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord, ownArray } from "../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../core/validation.js";
import { easeProgress, transitionProgress } from "../grammar/animation/values.js";
import { unavailablePointAnimationPosition } from "../grammar/animation/pointState.js";
import { projectSampledAnimationEndpoint } from "./endpoints.js";
import { validateAnimationFallbackReason } from "./concrete.js";

// Resolve through recorded correspondence, never through a synthetic scene key.
export function prepareFrameEndpoint(frame, proof) {
  const plan=proof.plan, progress=easeProgress(transitionProgress(proof.timeMs,plan.durationMs),plan.easing);
  const exact=progress===0?plan.from:progress===1?plan.to:undefined;
  let identities,backgrounds;
  if(exact){identities=exact.identities;backgrounds=exact.backgrounds;}
  else{
    identities=frame.decisions.map(decision=>decision.targetIndex===undefined
      ? plan.from.identities[decision.sourceIndex] : plan.to.identities[decision.targetIndex]);
    backgrounds=frame.decisions.flatMap((decision,index)=>{
      const endpoint=decision.targetIndex===undefined?plan.from:plan.to;
      const original=decision.targetIndex??decision.sourceIndex;
      const background=endpoint.backgrounds.find(value=>value.index===original);
      return background===undefined?[]:[{index,owner:background.owner}];
    });
  }
  const positions=proof.positions.map((position,index)=>position??unavailablePointAnimationPosition(identities[index]===undefined?"anonymous":"sampled-concrete"));
  return {endpoint:exact??projectSampledAnimationEndpoint(frame,cloneAndFreeze(identities),cloneAndFreeze(backgrounds)),positions:cloneAndFreeze(positions),graphs:proof.graphs,frame};
}

export function validateSampledEndpointMetadata(scene,identities,backgrounds,view) {
  ownRecord(scene,"Sampled scene");rejectUnknownProperties(scene,["version","width","height","nodes"],"sampled scene");
  for(const node of scene.nodes){
    ownRecord(node,"Sampled scene node");rejectUnknownProperties(node,["key","type","topology","properties","offset","clip","clips"],"sampled scene node");
    if(typeof node.topology!=="string")throw new TypeError("Sampled node requires its topology.");
  }
  ownArray(identities,"Sampled identities");ownArray(backgrounds,"Sampled backgrounds");
  if(identities.length!==scene.nodes.length)throw new TypeError("Sampled identities must follow every scene node.");
  const indices=new Set(),owners=new Set();
  for(const entry of backgrounds){
    ownRecord(entry,"Sampled background");rejectUnknownProperties(entry,["index","owner"],"sampled background");
    if(!Number.isSafeInteger(entry.index)||entry.index<0||entry.index>=scene.nodes.length||indices.has(entry.index)||
        identities[entry.index]!==undefined||typeof entry.owner!=="string"||!entry.owner||owners.has(entry.owner))throw new TypeError("Invalid sampled background identity.");
    indices.add(entry.index);owners.add(entry.owner);
  }
  ownRecord(view,"Sampled frame view");rejectUnknownProperties(view,["progress","decisions","timeMs"],"sampled frame view");
  validateUnitInterval(view.progress,"Sampled frame progress");
  if(Object.hasOwn(view,"timeMs")&&!Number.isFinite(view.timeMs))throw new TypeError("Sampled frame time must be finite.");
  ownArray(view.decisions,"Sampled frame decisions");
  if(view.decisions.length!==0&&view.decisions.length!==scene.nodes.length)throw new TypeError("Sampled decisions must follow the scene order.");
  if(scene.nodes.length>0&&((view.progress===0||view.progress===1)!==(view.decisions.length===0)))throw new TypeError("Sampled decisions disagree with endpoint progress.");
  for(const [index,decision]of view.decisions.entries()){
    ownRecord(decision,"Sampled decision");
    const singular=decision.kind==="enter"?"targetIndex":decision.kind==="exit"?"sourceIndex":undefined;
    const identityFields=Object.hasOwn(decision,"itemKey")?["itemKey","role"]:["owner","role"];
    const fields=singular?["kind",singular]:["kind","sourceIndex","targetIndex",...identityFields,
      ...(decision.kind==="crossfade"?["reason"]:decision.kind==="semantic-kernel"?["kernel"]:[])];
    rejectUnknownProperties(decision,fields,"sampled decision");
    if(fields.some(key=>!Object.hasOwn(decision,key))||!["enter","exit","exact","crossfade","semantic-kernel"].includes(decision.kind))throw new TypeError("Unknown or incomplete sampled decision.");
    for(const key of ["sourceIndex","targetIndex"])if(Object.hasOwn(decision,key)&&(!Number.isSafeInteger(decision[key])||decision[key]<0||decision[key]>=10000))throw new TypeError("Invalid sampled decision index.");
    if(!singular){
      const identity=identities[index],background=backgrounds.find(value=>value.index===index);
      if(identity?(decision.itemKey!==identity.key||decision.role!==identity.role):(decision.owner!==background?.owner||decision.role!=="canvas-background"))throw new TypeError("Sampled decision differs from its retained identity.");
      if(decision.kind==="semantic-kernel"&&!["cartesian-point","completed-graph"].includes(decision.kernel))throw new TypeError("Unsupported sampled semantic kernel.");
      if((decision.kind==="semantic-kernel"&&(decision.kernel==="cartesian-point"?scene.nodes[index].type!=="circle":!["circle","path","text"].includes(scene.nodes[index].type)))||(decision.kind==="crossfade"&&scene.nodes[index].type!=="weighted-blend"))throw new TypeError("Sampled decision differs from its concrete primitive.");
      if(decision.kind==="crossfade")validateAnimationFallbackReason(decision.reason);
    }
  }
}
