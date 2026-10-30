import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord, ownArray } from "../../core/ownData.js";
import { validateInputReference } from "../../core/resourceReference.js";
import { rejectUnknownProperties, validateGeneratedItemLimit, validateWorkLimit, validateNonNegativeFinite, validateUnitInterval } from "../../core/validation.js";
import { validateRoutePoints } from "../graph/routes/polyline.js";
import { prepareRouteInterpolation, sampleRouteInterpolation } from "./routes.js";
import { interpolateNumber } from "./values.js";

export const ANIMATION_GRAPH_VERSION = "completed-graph-layout@1";
const preparedPlans = new WeakSet();
const reasons = new Set(["graph-identity", "graph-edge-topology", "graph-parallel-order", "graph-route-kind", "graph-coordinate-space", "edited-graph-geometry", "edge-identity", "collapsed-route", "nonfinite-route", "route-stretch"]);
export const isGraphAnimationFallbackReason = reason => reasons.has(reason);
const fade = reason => Object.freeze({ kind: "crossfade", reason });
const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
function closed(value, keys, label) {
  ownRecord(value,label);rejectUnknownProperties(value,keys,label);
  if(keys.some(key=>!Object.hasOwn(value,key)||value[key]===undefined))throw new TypeError(`${label} requires every field.`);
}
function pair(value,label) {
  ownArray(value,label);
  if(value.length!==2||!value.every(Number.isFinite))throw new TypeError(`${label} requires two finite values.`);
}
function reference(value,kind) {
  validateInputReference(value);
  if(value.kind!==kind)throw new TypeError(`Animation graph requires a ${kind} reference.`);
}
export function animationGraphGroupWork(group, routeFactor=2) {
  return group.key.length+group.nodes.reduce((sum,node)=>sum+8+node.key.length,0)+
    group.edges.reduce((sum,edge)=>sum+8+edge.key.length+edge.sourceKey.length+edge.targetKey.length+(edge.points?.length??0)*routeFactor,0);
}
export function validateAnimationGraphGroup(group) {
  const routed=Object.hasOwn(group,"route");
  closed(group,["key","graph","layout","origin","labelOffset","nodes","edges","edgeStyle",...(routed?["route","coordinateSpace"]:[])],"Prepared animation graph");
  if(typeof group.key!=="string"||!group.key)throw new TypeError("Animation graph requires an explicit scoped owner.");
  reference(group.graph,"graph");reference(group.layout,"layout");pair(group.origin,"Animation graph origin");pair(group.labelOffset,"Animation graph label offset");
  if(routed){reference(group.route,"edge-route");if(!["world","screen"].includes(group.coordinateSpace))throw new TypeError("Unknown animation graph route coordinate space.");}
  ownArray(group.nodes,"Animation graph nodes");ownArray(group.edges,"Animation graph edges");
  validateGeneratedItemLimit(group.nodes.length+group.edges.length,"Animation graph items");
  let work=0;const charge=n=>validateWorkLimit(work+=n,"Animation graph work");
  const token=value=>{if(typeof value!=="string"||!value)throw new TypeError("Animation graph keys must be non-empty strings.");charge(value.length);};
  const nodes=new Map(),edges=new Set();
  for(const node of group.nodes){
    closed(node,["key","x","y","radius"],"Animation graph node");token(node.key);
    if(nodes.has(node.key)||!Number.isFinite(node.x)||!Number.isFinite(node.y))throw new TypeError("Animation graph nodes require unique keys and finite coordinates.");
    validateNonNegativeFinite(node.radius,"Animation graph radius");nodes.set(node.key,node);charge(8);
  }
  for(const edge of group.edges){
    closed(edge,["key","sourceKey","targetKey",...(routed?["points"]:[])],"Animation graph edge");
    token(edge.key);token(edge.sourceKey);token(edge.targetKey);
    if(edges.has(edge.key)||!nodes.has(edge.sourceKey)||!nodes.has(edge.targetKey))throw new TypeError("Animation graph edges require unique keys and existing endpoints.");
    edges.add(edge.key);charge(8);
    if(routed){
      validateRoutePoints(edge.points);charge(edge.points.length*2);
      const a=nodes.get(edge.sourceKey),b=nodes.get(edge.targetKey),first=edge.points[0],last=edge.points.at(-1);
      if(first.x!==a.x||first.y!==a.y||last.x!==b.x||last.y!==b.y)throw new TypeError("Animation graph routes must retain their exact node anchors.");
    }
  }
  closed(group.edgeStyle,["arrows","arrowSize","parallelGap","loopRadius"],"Animation graph edge style");
  if(typeof group.edgeStyle.arrows!=="boolean")throw new TypeError("Animation graph arrows must be resolved.");
  for(const key of ["arrowSize","parallelGap","loopRadius"])validateNonNegativeFinite(group.edgeStyle[key],`Animation graph ${key}`);
  return group;
}
function parallelGroups(group) {
  const result=new Map();
  for(const edge of group.edges){const key=JSON.stringify([edge.sourceKey,edge.targetKey].sort());if(!result.has(key))result.set(key,[]);result.get(key).push(edge.key);}
  return new Map(group.edges.map(edge=>[edge.key,result.get(JSON.stringify([edge.sourceKey,edge.targetKey].sort()))]));
}
export function prepareGraphInterpolation(fromInput,toInput) {
  const from=validateAnimationGraphGroup(fromInput),to=validateAnimationGraphGroup(toInput);
  if(from.key!==to.key||from.graph.id!==to.graph.id)return fade("graph-identity");
  const sourceEdges=new Map(from.edges.map(edge=>[edge.key,edge])),a=parallelGroups(from),b=parallelGroups(to),parallelMatches=new Map();
  const sameParallelOrder=key=>{
    const source=a.get(key),target=b.get(key);let targets=parallelMatches.get(source);
    if(targets===undefined)parallelMatches.set(source,targets=new Map());
    if(!targets.has(target))targets.set(target,equal(source,target));
    return targets.get(target);
  };
  const routes=to.edges.map(edge=>{
    const previous=sourceEdges.get(edge.key);
    if(previous===undefined||previous.sourceKey!==edge.sourceKey||previous.targetKey!==edge.targetKey)return fade("graph-edge-topology");
    if(Boolean(from.route)!==Boolean(to.route))return fade("graph-route-kind");
    if(from.coordinateSpace!==to.coordinateSpace)return fade("graph-coordinate-space");
    if(to.route)return prepareRouteInterpolation({edgeKey:previous.key,sourceKey:previous.sourceKey,targetKey:previous.targetKey,points:previous.points},
      {edgeKey:edge.key,sourceKey:edge.sourceKey,targetKey:edge.targetKey,points:edge.points});
    if(!sameParallelOrder(edge.key))return fade("graph-parallel-order");
    return {kind:"native-edge"};
  });
  const plan=cloneAndFreeze({kind:"graph",version:ANIMATION_GRAPH_VERSION,from,to,routes});preparedPlans.add(plan);return plan;
}
export function sampleGraphInterpolation(plan,progress) {
  validateUnitInterval(progress,"Animation graph progress");
  if(!preparedPlans.has(plan))throw new TypeError("A prepared graph interpolation is required.");
  if(progress===0||progress===1)return Object.freeze({group:progress===0?plan.from:plan.to,failures:Object.freeze([])});
  const {from,to}=plan,sourceNodes=new Map(from.nodes.map(node=>[node.key,node]));
  const at=(a,b)=>interpolateNumber(a,b,progress),vector=(a,b)=>a.map((value,index)=>at(value,b[index]));
  const nodes=to.nodes.map(node=>{const previous=sourceNodes.get(node.key);return previous===undefined?node:{key:node.key,x:at(previous.x,node.x),y:at(previous.y,node.y),radius:at(previous.radius,node.radius)};});
  const map=new Map(nodes.map(node=>[node.key,node])),failures=[];
  const edges=to.edges.flatMap((edge,index)=>{
    const route=plan.routes[index];
    if(route.kind==="crossfade"){
      failures.push({key:edge.key,reason:route.reason});
      // Ordinary geometry still needs the complete parallel ordering. Routed
      // failures have no current route state and remain concrete crossfades.
      return to.route?[]:[edge];
    }
    if(route.kind==="native-edge")return [edge];
    const point=node=>({x:node.x,y:node.y});
    const sampled=sampleRouteInterpolation(route,progress,{source:point(map.get(edge.sourceKey)),target:point(map.get(edge.targetKey))});
    if(sampled.kind==="crossfade"){failures.push({key:edge.key,reason:sampled.reason});return [];}
    return [{...edge,points:sampled.points}];
  });
  const edgeStyle={arrows:to.edgeStyle.arrows,...Object.fromEntries(["arrowSize","parallelGap","loopRadius"].map(key=>[key,at(from.edgeStyle[key],to.edgeStyle[key])]))};
  return cloneAndFreeze({group:{...to,origin:vector(from.origin,to.origin),labelOffset:vector(from.labelOffset,to.labelOffset),nodes,edges,edgeStyle},failures});
}
