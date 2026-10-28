import { cloneAndFreeze } from "../../core/immutable.js";
import { normalizeGraphLayout, graphLayoutKernelOptions } from "../../grammar/graph/layoutOptions.js";
import { layoutGraphFixed, layoutGraphCircular } from "../../grammar/graph/layout.js";
import { layoutGraphForce } from "../../grammar/graph/force.js";
import { createFlowLayoutResource } from "../flow/layoutResource.js";

export function createGraphLayoutResource({ id, revision = 0, graph, intent }) {
  if (["dag", "cyclic"].includes(intent.method)) return createFlowLayoutResource({ id, revision, graph, intent });
  const normalized = normalizeGraphLayout(intent.method, intent.options), options = graphLayoutKernelOptions(normalized);
  const computed = normalized.method === "fixed"
    ? layoutGraphFixed(graph.result.model, options.positions, { maxNodes: options.maxNodes, maxEdges: options.maxEdges })
    : normalized.method === "circular" ? layoutGraphCircular(graph.result.model, options) : layoutGraphForce(graph.result.model, options);
  return cloneAndFreeze({ kind: "layout", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "graph", id: graph.id, revision: graph.revision }], options: normalized,
    result: { nodes: computed.nodes, algorithm: computed.algorithmVersion ?? `${normalized.method}@1`, packing: computed.packing ?? null },
    provenance: { origin: "inferred", sourceRows: graph.provenance.sourceRows } });
}
