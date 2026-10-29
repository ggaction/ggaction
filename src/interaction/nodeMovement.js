import { cloneAndFreeze, freezeOwned } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { findLayer, requireLayer } from "../selectors/layers.js";
import { resolveGraphLayerResources } from "../selectors/graphs.js";
import { graphSourceKey } from "../grammar/graph/fields.js";
import { graphItemKey } from "../grammar/graph/itemIdentity.js";
import { prepareMovementFrame } from "./movementFrame.js";
import { interactionOwner, scopeSelectionKeys } from "./selection.js";
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

export function prepareNodeMovement(program, binding, base, scene, rootTransform, start, hit) {
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
  return freezeOwned({ target: cloneAndFreeze({ ...target, id: layout.id }), position,
    key: graphSourceKey(nodesData.values[node.sourceRows[0]], graph.options.definition.nodeKey),
    ...prepareMovementFrame(base, scene, rootTransform, target, start, relevant) });
}

export function nodeMovementCommand(context, points) {
  const end = context.map(points.at(-1));
  return { command: { type: "moveNode", target: context.target, origin: "user", payload: {
    key: context.key, x: context.position.x + (end.x - context.start.x), y: context.position.y + (end.y - context.start.y)
  } } };
}
