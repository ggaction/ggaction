import { canonicalJSON } from "../../core/contentDigest.js";
import { encodeValue } from "../../core/valueEncoding.js";
import { requireMaterializedDataset } from "../../selectors/datasets.js";
import { graphRecomputeOwners } from "../../selectors/graphFilters.js";
import { deriveGraphSubsetRows } from "../../grammar/graph/subset.js";

const same = (a, b) => canonicalJSON(encodeValue(a)) === canonicalJSON(encodeValue(b));
export function validateGraphRecomputeView(program, layer, graph, view) {
  const owner = view?.recompute;
  if (owner === undefined) return;
  if (graph.provenance.origin !== "inferred" || graph.inputs[0].id !== owner.dataset) {
    throw new TypeError("Graph recompute view must retain its inferred graph subset binding.");
  }
  const data = requireMaterializedDataset(program, owner.dataset), source = requireMaterializedDataset(program, owner.source);
  const transform = data.transform?.[0];
  if (data.source !== source.id || data.transform?.length !== 1 || transform.type !== "graphSubset" ||
      !same(transform.nodeKey, graph.options.definition.nodeKey) || !same(data.values, deriveGraphSubsetRows(source.values, transform))) {
    throw new TypeError("Graph recompute view requires its exact typed-key subset.");
  }
  if (graphRecomputeOwners(program, graph.id).some(other => other.id !== layer.id)) throw new TypeError("A graph can have only one recompute filter owner.");
}
