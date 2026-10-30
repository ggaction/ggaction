import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { findLayer, requireLayer } from "../selectors/layers.js";
import { resolveGraphLayerResources } from "../selectors/graphs.js";
import { graphSourceKey } from "../grammar/graph/fields.js";
import { graphItemKey } from "../grammar/graph/itemIdentity.js";
import { encodeRowKey } from "../core/itemIdentity.js";
import { createGraphPresentationFrame } from "../animation/graphPresentation.js";
import { currentAnimationGraphFrame } from "./hitProgram.js";
import { prepareMovementFrame, prepareMovementCoordinates } from "./movementFrame.js";
import { interactionOwner, interactionNamespaces, scopeSelectionKeys } from "./selection.js";
import { interactionOptions as options } from "./input.js";

export function resolveNodeMovement(program, binding, allowMissing = false) {
  const owner = interactionOwner(program, binding.target, allowMissing);
  if (!owner || (allowMissing && !findLayer(owner.view, owner.target.id))) return null;
  if (typeof program.editLayout !== "function") throw new Error("Node movement requires Full layout editing.");
  if (owner.target.facetSource || owner.view.compositionSpec?.type === "facet") throw new Error("Node dragging requires a concrete graph owner, not a facet source.");
  const layer = requireLayer(owner.view, owner.target.id);
  if (layer.mark.type !== "graph") throw new TypeError("Node dragging requires a GraphPlot target.");
  const resolved = resolveGraphLayerResources(owner.view, layer);
  if (!["fixed", "force"].includes(resolved.layout.options.method)) throw new TypeError("Node dragging requires a fixed or force graph layout.");
  if (owner.view.materializationConfigs.marks[layer.id].graphPlot.origin === "auto") throw new Error("Node dragging requires an explicit graph plot origin.");
  return { ...owner, ...resolved, layer };
}

export function normalizeNodeMovement(program, value) {
  const request = options(value, ["type", "target"], [], "Node movement binding");
  const owner = resolveNodeMovement(program, request);
  return cloneAndFreeze({ type: "moveNode", target: owner.target });
}

export function prepareNodeMovement(program, binding, base, scene, rootTransform, start, hit, displayed) {
  const owner = resolveNodeMovement(program, binding, true);
  if (!owner) return null;
  let work = 0;
  const spend = count => validateWorkLimit(work += count, "Node movement work");
  const { target, graph, layout, layer, nodesData } = owner;
  const keys = scopeSelectionKeys(program, target, graph.result.model.nodes.map(node => graphItemKey(layer, graph, "node", node.key)), spend);
  const ranks = new Map(keys.map((key, index) => [key, index]));
  const candidate = hit.candidates.find(item => { spend(1 + item.itemKey.length); return item.ownerId === target.id &&
    item.childPath.length === target.childPath.length && item.childPath.every((id, index) => id === target.childPath[index]) && ranks.has(item.itemKey); });
  if (!candidate) return null;
  const rank = ranks.get(candidate.itemKey), node = graph.result.model.nodes[rank], position = layout.result.nodes[rank];
  const relevant = new Set(base.entries.filter(entry => entry.metadata.itemKey === candidate.itemKey).map(entry => entry.nodeKey));
  const animated = currentAnimationGraphFrame(displayed, program);
  if (animated !== undefined) {
    const ownerKey = JSON.stringify([interactionNamespaces(program, target), target.id]);
    const groups = animated.graphs.groups.flatMap((group, index) => group.key === ownerKey ? [index] : []);
    if (groups.length !== 1) throw new Error("Animated node movement requires one exact current graph meaning.");
    const index = groups[0], group = animated.graphs.groups[index], keys = new Set(graph.result.model.nodes.map(node => node.key));
    if (group.graph.id !== graph.id || group.layout.id !== layout.id || group.nodes.length !== keys.size || group.nodes.some(node => !keys.has(node.key))) {
      throw new Error("Animated node movement requires the current native graph and node membership.");
    }
    const edgeKeys = new Map(graph.result.model.edges.map(edge => [edge.key, edge]));
    if (group.edges.length !== edgeKeys.size || group.edges.some(edge => {
      const native = edgeKeys.get(edge.key); return native === undefined || native.sourceKey !== edge.sourceKey || native.targetKey !== edge.targetKey;
    })) throw new Error("Animated node movement requires the current native edge topology.");
    const bodyIndex = animated.graphs.items.findIndex(item => item?.group === index && item.kind === "node" && item.key === node.key && item.role === "body");
    if (bodyIndex < 0) throw new Error("Animated node movement requires the actual current node body.");
    const point = group.nodes.find(value => value.key === node.key), body = scene.nodes[bodyIndex];
    // Validate the entire represented group before pointer capture, including
    // fallback/independently edited geometry, without executing a native action.
    createGraphPresentationFrame(animated.sample, { group: index, node: { key: node.key, x: point.x, y: point.y } });
    const raw = new Map(graph.result.model.nodes.map(node => [node.key, graphSourceKey(nodesData.values[node.sourceRows[0]], graph.options.definition.nodeKey)]));
    return freezeOwned({ target: cloneAndFreeze({ ...target, id: layout.id }), position: point, key: raw.get(node.key),
      animated: { sample: animated.sample, group: index, meaning: group, program, layout, raw, nodeKey: node.key },
      ...prepareMovementCoordinates(scene, rootTransform, start, body.offset) });
  }
  return freezeOwned({ target: cloneAndFreeze({ ...target, id: layout.id }), position,
    key: graphSourceKey(nodesData.values[node.sourceRows[0]], graph.options.definition.nodeKey),
    ...prepareMovementFrame(base, scene, rootTransform, target, start, relevant) });
}

export function nodeMovementCommand(context, points, final = false) {
  const end = context.map(points.at(-1));
  const command = { type: "moveNode", target: context.target, origin: "user", payload: {
    key: context.key, x: context.position.x + (end.x - context.start.x), y: context.position.y + (end.y - context.start.y)
  } };
  if (context.animated === undefined) return { command };
  const { sample, group, nodeKey, meaning, program, layout, raw } = context.animated;
  const frame = createGraphPresentationFrame(sample, { group, node: { ...command.payload, key: nodeKey } });
  if (!final) return { command, frame };
  const active = meaning.nodes.map(node => ({ key: raw.get(node.key), x: node.key === nodeKey ? command.payload.x : node.x,
    y: node.key === nodeKey ? command.payload.y : node.y }));
  const replace = (previous, next) => {
    const values = new Map(next.map(value => [encodeRowKey(value.key), value]));
    const result = previous.map(value => { const key = encodeRowKey(value.key), replacement = values.get(key); values.delete(key); return replacement ?? value; });
    return [...result, ...values.values()];
  };
  const previous = layout.options.options;
  const options = layout.options.method === "fixed" ? { positions: replace(previous.positions, active) } : {
    initialPositions: replace(previous.initialPositions ?? [], active),
    pinned: replace(previous.pinned, [{ key: context.key, fx: command.payload.x, fy: command.payload.y }])
  };
  return { command, frame, prepared: { program: program.editLayout({ target: context.target, options }), affectedOwners: cloneAndFreeze([context.target]) } };
}
