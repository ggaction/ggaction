import { cloneAndFreeze } from "../core/immutable.js";
import { ownRecord } from "../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../core/validation.js";
import { validateConcreteGraphicProperties } from "../grammar/schemas/concreteGraphic.js";
import { validateAnimationGraphGroup, animationGraphGroupWork } from "../grammar/animation/graphState.js";
import { moveGraphPresentationNode, unbundleGraphPresentationEdge } from "../materialization/graph/presentation.js";
import { resolveAnimationGraphGeometry, animationGraphItemGeometry, animationGraphGeometryMatches } from "../materialization/graph/frameGeometry.js";
import { canvasSceneProgram } from "../renderers/canvasScene.js";
import { projectSampledAnimationEndpoint } from "./endpoints.js";
import { animationFrameProvenance, registerGraphPresentationFrame } from "./frameProvenance.js";

// Only authentic current meanings admit this private presentation operation.
// No endpoint interpolation, native solver or host-created scene is consulted.
export function createGraphPresentationFrame(original, operation) {
  const proof = animationFrameProvenance(original);
  if (proof?.native === undefined || proof.graphs === undefined) throw new TypeError("Graph presentation requires an authentic native graph frame.");
  ownRecord(operation, "Graph presentation operation");
  operation = Object.assign(Object.create(null), operation);
  rejectUnknownProperties(operation, ["group", "node", "edge"], "graph presentation operation");
  const moving = Object.hasOwn(operation, "node"), unbundling = Object.hasOwn(operation, "edge");
  if (moving === unbundling || !Number.isSafeInteger(operation.group) || operation.group < 0 || operation.group >= proof.graphs.groups.length) {
    throw new TypeError("Graph presentation requires one current group and one node or edge operation.");
  }
  const previous = proof.graphs.groups[operation.group];
  validateAnimationGraphGroup(previous);
  let group = previous, selected;
  if (moving) {
    ownRecord(operation.node, "Graph presentation node");
    rejectUnknownProperties(operation.node, ["key", "x", "y"], "graph presentation node");
    const node = Object.assign(Object.create(null), operation.node);
    group = moveGraphPresentationNode(previous, node.key, { x: node.x, y: node.y });
    validateAnimationGraphGroup(group);
  } else selected = unbundleGraphPresentationEdge(previous, operation.edge);
  validateWorkLimit(animationGraphGroupWork(previous) + animationGraphGroupWork(group) + original.scene.nodes.length, "Graph presentation frame work");
  const beforeGeometry = resolveAnimationGraphGeometry(previous), geometry = moving ? resolveAnimationGraphGeometry(group) : null;
  let count = 0;
  const items = [...proof.graphs.items], nodes = original.scene.nodes.map((node, index) => {
    const item = items[index];
    if (item === null || item.group !== operation.group || (!moving && (item.kind !== "edge" || item.key !== operation.edge))) return node;
    if (item.reason !== undefined || !animationGraphGeometryMatches(node, animationGraphItemGeometry(previous, item, beforeGeometry))) {
      throw new TypeError("Graph presentation requires exact current forward geometry for every affected item.");
    }
    const expected = moving ? animationGraphItemGeometry(group, item, geometry) : { type: "path", properties: {
      commands: item.role === "arrow" ? selected.arrowCommands : selected.commands
    } };
    if (expected === undefined || expected.type !== node.type || expected.properties.commands === undefined && node.type === "path") {
      throw new TypeError("Graph presentation cannot change the current primitive role or topology.");
    }
    const properties = { ...node.properties, ...expected.properties };
    validateConcreteGraphicProperties(node.type, properties); count++;
    // An unbundled cubic is an explicit presentation of a stored routed edge.
    // Its untouched canonical route remains authoritative; re-planning uses the
    // exact concrete fallback instead of assigning false sampled-route meaning.
    if (!moving) items[index] = { ...item, reason: "edited-graph-geometry" };
    return { ...node, properties };
  });
  if (count === 0) throw new Error("Graph presentation requires a represented current item.");
  const scene = cloneAndFreeze({ ...original.scene, nodes });
  const frame = cloneAndFreeze({ graphicSpec: canvasSceneProgram(scene).graphicSpec, scene,
    progress: original.progress, decisions: original.decisions });
  const endpoint = projectSampledAnimationEndpoint(frame, proof.endpoint.identities, proof.endpoint.backgrounds);
  const graphs = cloneAndFreeze({ groups: proof.graphs.groups.map((value, index) => index === operation.group ? group : value), items });
  return registerGraphPresentationFrame(frame, original, endpoint, graphs);
}
