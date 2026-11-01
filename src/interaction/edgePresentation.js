import { cloneAndFreeze } from "../core/immutable.js";
import { validateWorkLimit } from "../core/validation.js";
import { requireLayer } from "../selectors/layers.js";
import { resolveGraphLayerResources } from "../selectors/graphs.js";
import { graphItemKey } from "../grammar/graph/itemIdentity.js";
import { hitShapeAnchor } from "../grammar/hitShapes.js";
import { readNativeGraphPresentation } from "../materialization/graph/presentationReader.js";
import { createGraphPresentationFrame } from "../animation/graphPresentation.js";
import { currentAnimationGraphFrame, requireAnimationFrameProgram, prepareAnimationHitFrame } from "./hitProgram.js";
import { interactionOwner, interactionNamespaces, scopeSelectionKeys } from "./selection.js";
import { interactionOptions as options } from "./input.js";

export function normalizeEdgePresentation(program, input) {
  const request = options(input, ["type", "target", "itemKey"], [], "Edge presentation command");
  const owner = interactionOwner(program, request.target), layer = requireLayer(owner.view, owner.target.id);
  if (owner.target.facetSource || owner.view.compositionSpec || layer.mark.type !== "graph") throw new TypeError("Edge presentation requires an explicit native GraphPlot target.");
  if (request.itemKey !== null && (typeof request.itemKey !== "string" || !request.itemKey.length)) throw new TypeError("Edge presentation requires an opaque item key or null.");
  validateWorkLimit(request.itemKey?.length ?? 0, "Edge presentation key");
  return cloneAndFreeze({ type: "unbundleEdge", target: owner.target, itemKey: request.itemKey });
}

export function prepareEdgePresentation(program, command, displayed) {
  const owner = interactionOwner(program, command.target), layer = requireLayer(owner.view, command.target.id);
  const { graph, layout } = resolveGraphLayerResources(owner.view, layer);
  let work = 0; const spend = count => validateWorkLimit(work += count, "Edge presentation work");
  const keys = scopeSelectionKeys(program, command.target, graph.result.model.edges.map(edge => graphItemKey(layer, graph, "edge", edge.key)), spend);
  const rank = keys.indexOf(command.itemKey);
  if (rank < 0) throw new Error("Edge presentation requires an existing native edge key.");
  const painted = displayed.entries.some(entry => {
    spend(1 + entry.metadata.itemKey.length);
    return entry.metadata.itemKey === command.itemKey && entry.metadata.ownerId === command.target.id &&
      JSON.stringify(entry.metadata.childPath) === JSON.stringify(command.target.childPath) && hitShapeAnchor(entry.shape, spend) !== null;
  });
  if (!painted) throw new Error("Edge presentation requires a painted current edge.");
  let animated = currentAnimationGraphFrame(displayed, program);
  if (animated === undefined) {
    const sample = readNativeGraphPresentation(program);
    requireAnimationFrameProgram(sample, program);
    const native = prepareAnimationHitFrame(sample);
    const before = JSON.stringify(native.scene), current = JSON.stringify(displayed.scene);
    spend(before.length + current.length);
    if (before !== current) throw new Error("Edge presentation requires native or authentic current graph geometry.");
    animated = currentAnimationGraphFrame(native, program);
  }
  const key = JSON.stringify([interactionNamespaces(program, command.target), command.target.id]);
  const matches = animated.graphs.groups.flatMap((group, index) => group.key === key ? [index] : []);
  if (matches.length !== 1) throw new Error("Edge presentation requires one current graph meaning.");
  const index = matches[0], group = animated.graphs.groups[index], edge = graph.result.model.edges[rank];
  const current = group.edges.find(value => value.key === edge.key);
  if (group.graph.id !== graph.id || group.layout.id !== layout.id || current === undefined ||
      current.sourceKey !== edge.sourceKey || current.targetKey !== edge.targetKey) throw new Error("Edge presentation differs from current native topology.");
  return createGraphPresentationFrame(animated.sample, { group: index, edge: edge.key });
}
