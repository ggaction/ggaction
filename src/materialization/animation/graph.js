import { cloneAndFreeze } from "../../core/immutable.js";
import { validateGeneratedItemLimit, validateWorkLimit } from "../../core/validation.js";
import { findLayer } from "../../selectors/layers.js";
import { resolveGraphicScope, resolveGraphicLineage } from "../../selectors/resources.js";
import { unnamespaceItemKey } from "../../grammar/schemas/graphicIdentity.js";
import { resolveGraphPlot } from "../graph/plot.js";

import { ownRecord, ownArray } from "../../core/ownData.js";
import { rejectUnknownProperties } from "../../core/validation.js";
import { requireFiniteResult } from "../../grammar/numeric.js";
import { validateAnimationGraphGroup, animationGraphGroupWork } from "../../grammar/animation/graphState.js";
import { graphEdgeGeometry } from "../graph/geometry.js";
import { storedGraphRouteGeometry } from "../graph/routeGeometry.js";
const sameConcreteValue=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

const reference = value => ({ kind: value.kind, id: value.id, revision: value.revision });
const token = (key, role) => JSON.stringify([key,role]);
const geometryToken = (kind,key,role) => JSON.stringify([kind,key,role]);

// One native resolution per scoped owner. Completed layout/route values are the
// input; no inference, route solve, or inverse pixel transform occurs here.
export function projectGraphAnimationState(program, endpoint) {
  const scopes=new Map(),groups=[],items=[];
  let work=0;
  for(const identity of endpoint.identities){
    if(identity===undefined){items.push(null);continue;}
    const scope=resolveGraphicScope(program,identity),[namespaces,owner]=JSON.parse(identity.key),layer=findLayer(scope,owner);
    if(layer?.mark.type!=="graph"){items.push(null);continue;}
    const scopeKey=JSON.stringify(namespaces);
    let owners=scopes.get(scopeKey);if(owners===undefined)scopes.set(scopeKey,owners=new Map());
    let prepared=owners.get(owner);
    if(prepared===undefined){
      const resolved=resolveGraphPlot(scope,layer,scope.markConfigs[layer.id]?.graphPlot,{animationGeometry:true});
      const {graph,layout,animation}=resolved,model=graph.result.model;
      validateGeneratedItemLimit(animation.nodes.length+model.edges.length,"Animation graph items");
      const route=animation.routeResource,group=groups.length;
      const data={key:JSON.stringify([namespaces,owner]),graph:reference(graph),layout:reference(layout),origin:animation.origin,labelOffset:animation.labelOffset,
        nodes:animation.nodes,edges:model.edges.map((edge,index)=>({key:edge.key,sourceKey:edge.sourceKey,targetKey:edge.targetKey,
          ...(route===undefined?{}:{points:route.result.routes[index].commands.map(({x,y})=>({x,y}))})})),
        edgeStyle:Object.fromEntries(["arrows","arrowSize","parallelGap","loopRadius"].map(key=>[key,animation.edgeStyle[key]])),
        ...(route===undefined?{}:{route:reference(route),coordinateSpace:route.options.coordinateSpace})};
      work+=animationGraphGroupWork(data);
      validateWorkLimit(work,"Animation graph preparation work");
      const meanings=new Map(resolved.items.flatMap(item=>item.graphicRoles.map(role=>[token(item.key,role),{
        group,key:JSON.parse(item.key)[3][1],kind:item.role,role
      }])));
      prepared={meanings,graph,layout,route};owners.set(owner,prepared);groups.push(data);
    }
    const meaning=prepared.meanings.get(token(unnamespaceItemKey(identity.key,namespaces),identity.role));
    if(meaning===undefined)throw new TypeError("Animation graph identity is absent from its exact native item grain.");
    const resource=resolveGraphicLineage(program,identity),expectedResource=meaning.kind==="edge"?(prepared.route??prepared.layout):prepared.layout;
    if(resource!==expectedResource)throw new TypeError("Animation graph identity has a stale layout or route reference.");
    const expected=animationGraphItemGeometry(groups[meaning.group],meaning,prepared.geometry??=resolveAnimationGraphGeometry(groups[meaning.group]));
    items.push(animationGraphGeometryMatches(endpoint.scene.nodes[items.length],expected)?meaning:{...meaning,reason:"edited-graph-geometry"});
  }
  const result=cloneAndFreeze({groups,items});validateAnimationGraphState(result,endpoint);return result;
}

// Use the same concrete edge and route owners as the native graph materializer.
export function resolveAnimationGraphGeometry(group) {
  const located=new Map(group.nodes.map(node=>[node.key,{
    x:requireFiniteResult(node.x+group.origin[0],"Animated graph x"),
    y:requireFiniteResult(node.y+group.origin[1],"Animated graph y")
  }]));
  const radii=new Map(group.nodes.map(node=>[node.key,node.radius]));
  const routes=group.route===undefined?graphEdgeGeometry(group,located,radii,group.edgeStyle)
    :storedGraphRouteGeometry(group,{result:{routes:group.edges.map(edge=>({commands:edge.points}))}},group.origin,radii,group.edgeStyle);
  const result=new Map();
  for(const node of group.nodes){const point=located.get(node.key);
    result.set(geometryToken("node",node.key,"body"),{type:"circle",properties:{...point,radius:node.radius}});
    result.set(geometryToken("node",node.key,"label"),{type:"text",properties:{x:requireFiniteResult(point.x+group.labelOffset[0],"Animated graph label x"),y:requireFiniteResult(point.y+group.labelOffset[1],"Animated graph label y")}});
  }
  for(const route of routes){
    result.set(geometryToken("edge",route.edge.key,"body"),{type:"path",properties:{commands:route.commands}});
    if(route.arrowCommands!==undefined)result.set(geometryToken("edge",route.edge.key,"arrow"),{type:"path",properties:{commands:route.arrowCommands}});
  }
  return result;
}
export function animationGraphItemGeometry(group,item,geometry=resolveAnimationGraphGeometry(group)) {
  return geometry.get(geometryToken(item.kind,item.key,item.role));
}
export function animationGraphGeometryMatches(node,expected) {
  return expected!==undefined&&node.type===expected.type&&Object.entries(expected.properties).every(([key,value])=>sameConcreteValue(node.properties[key],value));
}

export function validateAnimationGraphState(state,endpoint) {
  ownRecord(state,"Prepared animation graph state");rejectUnknownProperties(state,["groups","items"],"animation graph state");
  ownArray(state.groups,"Animation graph groups");ownArray(state.items,"Animation graph items");
  validateGeneratedItemLimit(state.groups.length,"Animation graph groups");
  if(state.items.length!==endpoint.scene.nodes.length)throw new TypeError("Animation graph items must follow every endpoint node.");
  let work=0;
  const geometries=state.groups.map(group=>{
    validateAnimationGraphGroup(group);
    validateWorkLimit(work+=animationGraphGroupWork(group),"Animation graph state work");
    return resolveAnimationGraphGeometry(group);
  });
  const used=new Set();
  for(const [index,item]of state.items.entries()){
    if(item===null)continue;
    ownRecord(item,"Animation graph item");rejectUnknownProperties(item,["group","key","kind","role",...(Object.hasOwn(item,"reason")?["reason"]:[])],"animation graph item");
    if(!Number.isSafeInteger(item.group)||item.group<0||item.group>=state.groups.length||typeof item.key!=="string"||!item.key||
      !(item.kind==="node"?["body","label"]:item.kind==="edge"?["body","arrow"]:[]).includes(item.role))throw new TypeError("Animation graph item requires a bounded group, key and role.");
    const group=state.groups[item.group],identity=endpoint.identities[index],address=identity===undefined?undefined:JSON.parse(identity.key);
    const ref=item.kind==="edge"?(group.route??group.layout):group.layout;
    if(address===undefined||JSON.stringify([address[0],address[1]])!==group.key||address[2]!==item.kind||
      !sameConcreteValue(address[3],[group.graph.id,item.key])||identity.role!==item.role||identity.lineage.kind!=="resource"||!sameConcreteValue(identity.lineage.resource,ref)){
      throw new TypeError("Animation graph item differs from its exact resource identity.");
    }
    const expected=animationGraphItemGeometry(group,item,geometries[item.group]);
    if(Object.hasOwn(item,"reason")){
      if(item.reason!=="edited-graph-geometry")throw new TypeError("Unknown graph item fallback reason.");
    }else if(!animationGraphGeometryMatches(endpoint.scene.nodes[index],expected))throw new TypeError("Prepared animation graph meaning differs from its concrete endpoint.");
    used.add(item.group);
  }
  if(used.size!==state.groups.length)throw new TypeError("Animation graph groups require a represented item.");
  return state;
}
