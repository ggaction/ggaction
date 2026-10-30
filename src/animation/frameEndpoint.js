import { guideAnimationKey } from "../grammar/animation/guideState.js";
import { validateGeoAnimationDecision } from "../grammar/animation/geoDecision.js";
import { unavailablePolarAnimation } from "../grammar/animation/polarState.js";
import { unavailableCartesianAnimation } from "../grammar/animation/cartesianState.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord, ownArray } from "../core/ownData.js";
import { rejectUnknownProperties, validateUnitInterval } from "../core/validation.js";
import { easeProgress, transitionProgress } from "../grammar/animation/values.js";
import { unavailablePointAnimationPosition } from "../grammar/animation/pointState.js";
import { projectSampledAnimationEndpoint } from "./endpoints.js";
import { animationPlanProvenance } from "./frameProvenance.js";
import { validateAnimationFallbackReason } from "./concrete.js";

// Capture correspondence once while the authentic plan is available. No earlier
// plan or sampled endpoint is retained by the resulting frame meaning.
export function captureFrameMeaning(frame, plan, timeMs, geographic = []) {
  const progress = easeProgress(transitionProgress(timeMs, plan.durationMs), plan.easing);
  const side = progress === 0 ? "from" : progress === 1 ? "to" : undefined;
  const exact = side === undefined ? undefined : plan[side];
  let identities, backgrounds;
  if (exact) { identities = exact.identities; backgrounds = exact.backgrounds; }
  else {
    if (frame.decisions.length !== frame.scene.nodes.length) throw new TypeError("Animation decisions must follow the exact sampled nodes.");
    identities = frame.decisions.map((decision, index) => {
      if(decision.kind==="geographic"){const value=geographic[index];if(value===undefined)throw new TypeError("Geographic decision requires its actual generated identity.");validateGeoAnimationDecision(decision,value.identity);return value.identity;}
      const endpoint = decision.targetIndex === undefined ? plan.from : plan.to;
      const originalIndex = decision.targetIndex ?? decision.sourceIndex;
      if (endpoint.scene.nodes[originalIndex] === undefined) throw new TypeError("Animation decision requires an exact endpoint node.");
      return endpoint.identities[originalIndex];
    });
    backgrounds = frame.decisions.flatMap((decision, index) => {
      if(decision.kind==="geographic")return [];
      const endpoint = decision.targetIndex === undefined ? plan.from : plan.to;
      const original = decision.targetIndex ?? decision.sourceIndex;
      const background = endpoint.backgrounds.find(value => value.index === original);
      return background === undefined ? [] : [{ index, owner: background.owner }];
    });
  }
  const endpoint = exact ?? projectSampledAnimationEndpoint(frame, cloneAndFreeze(identities), cloneAndFreeze(backgrounds));
  const proof = animationPlanProvenance(plan);
  let native;
  if (proof?.from !== undefined && proof.to !== undefined) {
    const nodes = exact ? proof[side].nodes : frame.decisions.map((decision,index) => {
      if(decision.kind==="geographic"){const origin=geographic[index]?.origin;if(origin===undefined)throw new TypeError("Geographic hit requires its actual native source.");return Object.freeze({origin,metrics:Object.freeze([origin])});}
      const origin = decision.kind === "exit" ? proof.from.nodes[decision.sourceIndex] : proof.to.nodes[decision.targetIndex];
      if (origin === undefined) throw new TypeError("Animation hit requires an exact native source.");
      if (decision.kind !== "crossfade") return origin;
      const from = proof.from.nodes[decision.sourceIndex], to = proof.to.nodes[decision.targetIndex];
      if (from === undefined || to === undefined) throw new TypeError("Animation hit blend requires both native sources.");
      return Object.freeze({ origin: origin.origin, metrics: Object.freeze([...from.metrics, ...to.metrics]) });
    });
    const placement = (side === "from" ? proof.from : proof.to).placement;
    const owners = new Set([...proof.directOwners, placement]);
    for (const node of nodes) { owners.add(node.origin.program); for (const origin of node.metrics) owners.add(origin.program); }
    native = Object.freeze({ nodes: Object.freeze(nodes), owners: Object.freeze([...owners]), placement });
  }
  return Object.freeze({ endpoint, native });
}

export function prepareFrameEndpoint(frame, proof) {
  if (proof.endpoint === undefined) throw new TypeError("Sampled endpoint requires prepared identity metadata.");
  const positions = proof.positions.map((position, index) => position ?? unavailablePointAnimationPosition(proof.endpoint.identities[index] === undefined ? "anonymous" : "sampled-concrete"));
  return { endpoint: proof.endpoint, guides: proof.guides, positions: cloneAndFreeze(positions), geos: proof.geos, graphs: proof.graphs, polars: proof.polars?.map((state,index)=>state??unavailablePolarAnimation(proof.endpoint.identities[index]===undefined?"anonymous":"sampled-concrete")), partitions: proof.partitions, cartesian: proof.cartesian?.map((state,index)=>state??unavailableCartesianAnimation(proof.endpoint.identities[index]===undefined?"anonymous":"sampled-concrete")), frame };
}

export function validateSampledEndpointMetadata(scene,identities,backgrounds,view,guides=[]) {
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
    if(decision.kind==="geographic"){validateGeoAnimationDecision(decision,identities[index]);if(!["circle","path"].includes(scene.nodes[index].type))throw new TypeError("Geographic decision requires a native geographic primitive.");continue;}
    const singular=decision.kind==="enter"?"targetIndex":decision.kind==="exit"?"sourceIndex":undefined;
    const identityFields=Object.hasOwn(decision,"guideKey")?["guideKey","role"]:Object.hasOwn(decision,"itemKey")?["itemKey","role"]:["owner","role"];
    const fields=singular?["kind",singular,...(Object.hasOwn(decision,"reason")?["reason"]:[])]:["kind","sourceIndex","targetIndex",...identityFields,
      ...(decision.kind==="crossfade"?["reason"]:decision.kind==="semantic-kernel"?["kernel"]:[])];
    rejectUnknownProperties(decision,fields,"sampled decision");
    if(fields.some(key=>!Object.hasOwn(decision,key))||!["enter","exit","exact","crossfade","semantic-kernel"].includes(decision.kind))throw new TypeError("Unknown or incomplete sampled decision.");
    for(const key of ["sourceIndex","targetIndex"])if(Object.hasOwn(decision,key)&&(!Number.isSafeInteger(decision[key])||decision[key]<0||decision[key]>=10000))throw new TypeError("Invalid sampled decision index.");
    if(singular&&Object.hasOwn(decision,"reason")&&(decision.reason!=="guide-ambiguity"||guides[index]==null))throw new TypeError("Only an ambiguous guide may add an unmatched decision reason.");
    if(!singular){
      const identity=identities[index],background=backgrounds.find(value=>value.index===index);
      if(Object.hasOwn(decision,"guideKey")){
        const guide=guides[index];
        if(identity!==undefined||background!==undefined||guide==null||decision.guideKey!==guideAnimationKey(guide.identity)||decision.role!==`guide-${guide.identity.component}`)throw new TypeError("Sampled guide decision differs from its retained identity.");
        if(decision.kind==="exact"&&guide.reason!==undefined)throw new TypeError("Exact guide decisions require retained native geometry.");
      }else if(guides[index]!=null || (identity?(decision.itemKey!==identity.key||decision.role!==identity.role):(background===undefined||decision.owner!==background.owner||decision.role!=="canvas-background")))throw new TypeError("Sampled decision differs from its retained identity.");
      if(decision.kind==="semantic-kernel"&&!["cartesian-point","completed-graph","cartesian-geometry","partition","polar-geometry","guide-geometry"].includes(decision.kernel))throw new TypeError("Unsupported sampled semantic kernel.");
      if((decision.kind==="semantic-kernel"&&(decision.kernel==="guide-geometry"?!["line","path","text"].includes(scene.nodes[index].type):decision.kernel==="polar-geometry"?!["circle","path"].includes(scene.nodes[index].type):decision.kernel==="cartesian-point"?scene.nodes[index].type!=="circle":decision.kernel==="cartesian-geometry"?!["line","rect","path"].includes(scene.nodes[index].type):!["circle","path","text"].includes(scene.nodes[index].type)))||(decision.kind==="crossfade"&&scene.nodes[index].type!=="weighted-blend"))throw new TypeError("Sampled decision differs from its concrete primitive.");
      if(decision.kind==="crossfade")validateAnimationFallbackReason(decision.reason);
    }
  }
}
