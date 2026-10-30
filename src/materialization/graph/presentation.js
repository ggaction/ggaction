import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { requireFiniteResult } from "../../grammar/numeric.js";
import { reanchorRoute } from "../../grammar/graph/routes/polyline.js";
import { graphEdgeGeometry } from "./geometry.js";

// These private consumers receive an already validated native/current graph
// meaning group. They produce transient values, never a layout or route result.
export function unbundleGraphPresentationEdge(group, key) {
  if (!group.edges.some(edge => edge.key === key)) throw new Error("Graph presentation requires an existing edge key.");
  validateWorkLimit(group.nodes.length + group.edges.length, "Graph presentation work");
  const located = new Map(group.nodes.map(node => [node.key, {
    x: requireFiniteResult(node.x + group.origin[0], "Graph presentation x"),
    y: requireFiniteResult(node.y + group.origin[1], "Graph presentation y")
  }]));
  const radii = new Map(group.nodes.map(node => [node.key, node.radius]));
  // The complete edge order determines parallel-edge and loop geometry. Return
  // only the selected edge's body/arrow and leave every sibling unchanged.
  const edge = graphEdgeGeometry(group, located, radii, group.edgeStyle).find(item => item.edge.key === key);
  return cloneAndFreeze({ commands: edge.commands,
    ...(edge.arrowCommands === undefined ? {} : { arrowCommands: edge.arrowCommands }) });
}

export function moveGraphPresentationNode(group, key, position) {
  ownRecord(position, "Graph presentation position");
  rejectUnknownProperties(position, ["x", "y"], "graph presentation position");
  if (!["x", "y"].every(field => Object.hasOwn(position, field) && Number.isFinite(position[field]))) {
    throw new TypeError("Graph presentation requires own finite x and y.");
  }
  const previous = group.nodes.find(node => node.key === key);
  if (previous === undefined) throw new Error("Graph presentation requires an existing node key.");
  let work = group.nodes.length + group.edges.length;
  for (const edge of group.edges) work += edge.points?.length ?? 0;
  validateWorkLimit(work, "Graph presentation work");
  const nodes = group.nodes.map(node => node === previous ? { ...node, ...position } : node);
  const positions = new Map(nodes.map(node => [node.key, { x: node.x, y: node.y }]));
  const edges = group.edges.map(edge => edge.points === undefined || (edge.sourceKey !== key && edge.targetKey !== key) ? edge : {
    ...edge, points: reanchorRoute(edge.points, positions.get(edge.sourceKey), positions.get(edge.targetKey))
  });
  return cloneAndFreeze({ ...group, nodes, edges });
}
