import { requireFiniteResult } from "../../grammar/numeric.js";
import { graphEdgeGeometry } from "./geometry.js";
import { storedGraphRouteGeometry } from "./routeGeometry.js";
const sameConcreteValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const geometryToken = (kind, key, role) => JSON.stringify([kind, key, role]);

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

