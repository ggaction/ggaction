import { ChartProgram } from "../core/ChartProgram.js";
import { requireClosedProgramState } from "../core/programState.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateNonNegativeFinite } from "../core/validation.js";
import { projectAnimationEndpoint, matchAnimationEndpoints } from "./endpoints.js";
import { projectPointAnimationPositions } from "../materialization/animation/point.js";
import { preparePositionInterpolation, samplePositionInterpolation } from "../grammar/animation/positions.js";
import { easeProgress } from "../grammar/animation/values.js";
import { sameConcreteValue, pointAppearanceCompatible, clipInterpolationCompatible, blendAnimationNodes } from "./concrete.js";

export const TRANSITION_PLAN_VERSION = 1;
const plans = new WeakSet();
function native(program) {
  if (!(program instanceof ChartProgram)) throw new TypeError("Animation preparation requires an immutable ChartProgram.");
  requireClosedProgramState(program,"Animation preparation");
}
function budget(endpoints) {
  const pending=[...endpoints],seen=new WeakSet();let work=0;
  while(pending.length){const value=pending.pop();validateWorkLimit(++work,"Animation preparation work");
    if(typeof value==="string")validateWorkLimit(work+=value.length,"Animation preparation work");
    else if(value!==null&&typeof value==="object"&&!seen.has(value)){seen.add(value);for(const [key,child] of Object.entries(value)){
      validateWorkLimit(work+=key.length,"Animation preparation work");pending.push(child);
    }}
  }
}
function frameTracks(from, to) {
  const backgrounds = endpoint => {
    const canvases = new Set(endpoint.canvases.map(canvas => `${canvas.graphicId}/background`));
    return new Map(endpoint.sources.flatMap((source, index) => canvases.has(source.graphicId)
      ? [[source.graphicId, index]] : []));
  };
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
  const fade=reason=>({...metadata,kind:"crossfade",reason});
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
export function planTransition(input) {
  ownRecord(input,"Transition request");rejectUnknownProperties(input,["from","to","options"],"transition request");
  const options=ownRecord(input.options,"Transition options");rejectUnknownProperties(options,["durationMs","easing"],"transition options");
  validateNonNegativeFinite(options.durationMs,"Transition duration");
  const easing=Object.hasOwn(options,"easing")?options.easing:"cubic-in-out";easeProgress(.5,easing);
  if(easing===undefined)throw new TypeError("Transition easing cannot be undefined.");
  native(input.from);native(input.to);budget([input.from.graphicSpec,input.to.graphicSpec]);
  const from=projectAnimationEndpoint(input.from),to=projectAnimationEndpoint(input.to);
  validateGeneratedItemLimit(from.scene.nodes.length+to.scene.nodes.length,"Animation endpoint nodes");
  const matching=matchAnimationEndpoints(from,to),a=projectPointAnimationPositions(input.from,from),b=projectPointAnimationPositions(input.to,to);
  const tracks=matching.matches.map(match=>track(match,from,to,a[match.sourceIndex],b[match.targetIndex]));
  const frames=frameTracks(from,to),frameSources=new Set(frames.map(track=>track.sourceIndex)),frameTargets=new Set(frames.map(track=>track.targetIndex));
  for(const item of [...tracks,...frames])if(item.kind==="crossfade")blendAnimationNodes(from.scene.nodes[item.sourceIndex],to.scene.nodes[item.targetIndex],.5,Math.max(from.scene.width,to.scene.width),Math.max(from.scene.height,to.scene.height));
  const plan=cloneAndFreeze({kind:"transition-plan",version:TRANSITION_PLAN_VERSION,durationMs:options.durationMs,easing,
    from,to,tracks,frameTracks:frames,enters:matching.enters.filter(index=>!frameTargets.has(index)),exits:matching.exits.filter(index=>!frameSources.has(index))});plans.add(plan);return plan;
}
export function requireTransitionPlan(plan) {
  if(!plans.has(plan))throw new TypeError("Transition sampling requires an authentic prepared plan.");return plan;
}
