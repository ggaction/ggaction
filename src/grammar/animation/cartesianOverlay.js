import { ownArray, ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateGeneratedItemLimit } from "../../core/validation.js";
import { resolveCartesianPosition } from "./cartesianPosition.js";
import { buildCurvePathCommands } from "../curveCommands.js";
import { readRectItemGeometry } from "../roundedRect.js";

export function normalizeCartesianAnchors(input,normalizeState) {
  ownArray(input,"Cartesian overlay anchors");validateGeneratedItemLimit(input.length,"Cartesian overlay anchors");
  return input.map(anchor=>{
    ownRecord(anchor,"Cartesian overlay anchor");rejectUnknownProperties(anchor,["role","state"],"Cartesian overlay anchor");
    if(!Object.hasOwn(anchor,"role")||!Object.hasOwn(anchor,"state"))throw new TypeError("Cartesian overlay anchor requires role and state.");
    ownRecord(anchor.state,"Cartesian overlay source state");
    // Native overlays cannot source other overlays. Keep this transport one
    // level deep as well, before delegating to the existing state validator.
    if(!Object.hasOwn(anchor.state,"kind")||!["point","bar","histogram"].includes(anchor.state.kind))throw new TypeError("Cartesian overlay requires an independent source anchor.");
    const state=normalizeState(anchor.state);
    if(anchor.role==="point"?state.kind!=="point":!["x-end","y-end"].includes(anchor.role)||!["bar","histogram"].includes(state.kind))throw new TypeError("Cartesian overlay role differs from its source kind.");
    return {role:anchor.role,state};
  });
}
export function prepareCartesianAnchors(from,to,prepareState) {
  if(from.length!==to.length)return {kind:"crossfade",reason:"series-grid"};
  const plans=from.map((anchor,index)=>anchor.role!==to[index].role?{kind:"crossfade",reason:"geometry-policy"}:prepareState(anchor.state,to[index].state));
  return plans.find(plan=>plan.kind==="crossfade")??plans;
}
export function sampleCartesianAnchors(from,plans,progress,sampleState) {
  const samples=plans.map(plan=>sampleState(plan,progress));
  return samples.find(sample=>sample.kind==="crossfade")??samples.map((sample,index)=>({role:from[index].role,state:sample.state}));
}
export function resolveCartesianOverlay(state,resolveState) {
  const points=state.anchors.map(anchor=>{
    const geometry=resolveState(anchor.state);
    if(geometry.kind==="crossfade")throw new RangeError("Cartesian overlay source geometry is not finite.");
    if(anchor.role==="point")return {x:geometry.properties.x,y:geometry.properties.y};
    const box=readRectItemGeometry(geometry),measure=anchor.role==="x-end"?"x":"y",category=measure==="x"?"y":"x";
    const endpoint=resolveCartesianPosition(anchor.state.points[1][measure]);
    const center=box[category]+box[category==="x"?"width":"height"]/2;
    return {x:measure==="x"?endpoint.position:center,y:measure==="y"?endpoint.position:center};
  });
  return state.kind==="overlay-point"?{type:"circle",properties:points[0]}:{type:"path",properties:{commands:[
    ...(points.length===1?[{op:"M",...points[0]}]:buildCurvePathCommands(points,state.policy.curve,Object.hasOwn(state.policy,"tension")?state.policy.tension:undefined)),
    ...(state.policy.closed?[{op:"Z"}]:[])]}};
}
