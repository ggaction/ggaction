import { ChartProgram } from "../core/ChartProgram.js";
import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { requireClosedProgramState } from "../core/programState.js";
import { validateGeneratedItemLimit, validateGraphicItemLimit, validateWorkLimit } from "../core/validation.js";
import { resolveGraphicItemCapacity } from "../selectors/graphicCapacity.js";
import { animationFrameProvenance } from "./frameProvenance.js";

export const SCOPED_ANIMATION_LIMITS = Object.freeze({expandedValues:12_000_000,descriptors:16_000_000,cells:16_000_000,preparedTraversalWork:140_000_000});
const scopes = new WeakMap();
const ordinary = Object.freeze({expandedValues:10_000_000,descriptors:10_000_000,cells:10_000_000,preparedTraversalWork:10_000_000});
export function normalizeAnimationResourceLimits(value) {
  ownRecord(value,"Animation resource limits");
  if(Object.keys(value).some(key=>!["maxEndpointNodes","maxOutputNodes"].includes(key)))throw new TypeError("Unknown animation resource limit.");
  const result={maxEndpointNodes:10_000,maxOutputNodes:10_000};
  for(const[key,maximum]of[["maxEndpointNodes",200002],["maxOutputNodes",100001]])if(Object.hasOwn(value,key)){
    if(!Number.isSafeInteger(value[key])||value[key]<1||value[key]>maximum)throw new RangeError(`Invalid animation ${key}.`);
    result[key]=value[key];
  }
  return cloneAndFreeze(result);
}
function programOwners(program, seen) {
  if(!(program instanceof ChartProgram))throw new TypeError("Scoped animation requires exact native programs or authentic frames.");
  if(seen.has(program))return;seen.add(program);requireClosedProgramState(program,"Animation resource admission");
  for(const[id,graphic]of Object.entries(program.graphicSpec.objects))if(Object.hasOwn(graphic,"items")&&graphic.items!==undefined){
    const capacity=resolveGraphicItemCapacity(program,{id,type:graphic.type,label:"Animation native collection"});
    validateGraphicItemLimit(graphic.items.length,capacity);
    if(capacity.pointOwned)validateGraphicItemLimit(capacity.rawCount,capacity);
  }
  for(const child of Object.values(program.children))programOwners(child,seen);
}
function issue(value) {const token=Object.freeze({});scopes.set(token,{...value,work:new Map()});return token;}
export function createTransitionResourceScope(from,to,inputLimits) {
  ownRecord(inputLimits,"Animation resource limits");
  if(!Object.hasOwn(inputLimits,"maxEndpointNodes")&&!Object.hasOwn(inputLimits,"maxOutputNodes"))throw new TypeError("Scoped animation requires explicit node limits.");
  const programs=new Set();let native=true;
  for(const value of[from,to]){
    const frame=animationFrameProvenance(value);
    if(frame===undefined)programOwners(value,programs);
    else {
      // The canonical frame owner already flattens exact displayed sources.
      // Retaining the previous resource scope would accumulate historical owners.
      const origin=Object.hasOwn(frame,"native")?frame.native:undefined;
      const sources=origin===undefined?[]:origin.owners;
      if(origin===undefined)native=false;
      for(const program of sources)programOwners(program,programs);
    }
  }
  return issue({limits:normalizeAnimationResourceLimits(inputLimits),programs,native});
}
export function createOfflineResourceScope(inputLimits) {
  // Only data quotas are granted. The strict endpoint/meaning owner must still
  // validate every restored value; this token never reconstructs native origins.
  ownRecord(inputLimits,"Animation resource limits");
  if(!Object.hasOwn(inputLimits,"maxEndpointNodes")&&!Object.hasOwn(inputLimits,"maxOutputNodes"))throw new TypeError("Scoped animation requires explicit node limits.");
  return issue({limits:normalizeAnimationResourceLimits(inputLimits),programs:new Set(),native:false});
}
function requireScope(scope) {
  const value=scopes.get(scope);if(value===undefined)throw new TypeError("Animation resources require an authentic private scope.");return value;
}
export function animationResourceLimits(scope) {return scope===undefined?undefined:requireScope(scope).limits;}
export function animationColumnLimits(scope) {if(scope===undefined)return ordinary;requireScope(scope);return SCOPED_ANIMATION_LIMITS;}
export function validateAnimationResourceWork(value,label,scope) {
  if(scope===undefined)return validateWorkLimit(value,label);
  requireScope(scope);
  if(!["Animation preparation work","Partition animation track work"].includes(label))return validateWorkLimit(value,label);
  const work=requireScope(scope).work;work.set(label,Math.max(work.get(label)??0,value));
  return validateGeneratedItemLimit(value,label,SCOPED_ANIMATION_LIMITS.preparedTraversalWork);
}
export function validateAnimationColumnCount(value,kind,scope) {
  const policy=animationColumnLimits(scope);
  if(!["expandedValues","descriptors","cells"].includes(kind))throw new TypeError("Unknown animation column quota.");
  const maximum=policy[kind];
  if(!Number.isSafeInteger(value)||value<0)throw new RangeError("Animation column arithmetic exceeds safe integer bounds.");
  return validateGeneratedItemLimit(value,`Animation columns ${kind}`,maximum);
}
export function pointAnimationRowLimit(program,layer,scope) {
  if(scope===undefined)return 10_000;
  const value=requireScope(scope);
  if(!value.programs.has(program))throw new TypeError("Animation point scope differs from its exact native owner.");
  const capacity=resolveGraphicItemCapacity(program,{id:layer.id,type:"circle",label:"Animation point rows"});
  if(!capacity.pointOwned)throw new TypeError("Animation rows require their exact native point owner.");
  validateGraphicItemLimit(capacity.rawCount,capacity);
  return Object.hasOwn(capacity,"maxItems")?capacity.maxItems:50_000;
}

export function validatePreparedEndpointResources(endpoint, guides, scope) {
  if(scope===undefined)return;
  const resource=requireScope(scope),counts=new Map(),backgrounds=new Set(endpoint.backgrounds.map(entry=>entry.index));
  validateGeneratedItemLimit(endpoint.scene.nodes.length,"Animation scoped endpoint nodes",resource.limits.maxOutputNodes);
  for(let index=0;index<endpoint.scene.nodes.length;index++){
    if(backgrounds.has(index))continue;
    const identity=endpoint.identities[index],guide=guides[index];
    let key,maximum=10_000;
    if(identity!==undefined){
      const[namespaces,owner,grain]=JSON.parse(identity.key);
      key=JSON.stringify([namespaces,owner,identity.role,grain]);
      if(grain==="point")maximum=100_000;
    }else if(guide!==null&&guide!==undefined)key=JSON.stringify([guide.identity.namespaces,guide.identity.owner,guide.identity.component]);
    else key="anonymous";
    const count=(counts.get(key)??0)+1;counts.set(key,count);
    validateGeneratedItemLimit(count,"Animation scoped owner items",maximum);
  }
}

export function animationResourceAccounting(scope) {
  const resource=requireScope(scope);
  return cloneAndFreeze({native:resource.native,limits:resource.limits,maximumWork:Object.fromEntries(resource.work)});
}
