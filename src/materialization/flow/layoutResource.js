import { cloneAndFreeze } from "../../core/immutable.js";
import { normalizeFlowLayout } from "../../grammar/flow/options.js";
import { layoutFlow } from "../../grammar/flow/layout.js";

export function createFlowLayoutResource({ id, revision = 0, graph, intent }) {
  const normalized = normalizeFlowLayout(intent.method, intent.options);
  const result = layoutFlow(graph.result.model, normalized.method, normalized.options);
  return cloneAndFreeze({ kind: "layout", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: [{ kind: "graph", id: graph.id, revision: graph.revision }], options: normalized, result,
    provenance: { origin: "inferred", sourceRows: graph.provenance.sourceRows } });
}
