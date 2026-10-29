import { encodeRowKey } from "../../core/itemIdentity.js";
import { graphSourceKey } from "./fields.js";
import { createGraphModel, indexGraphModel } from "./model.js";

// Validate the complete candidate against its original source before projecting
// endpoints. Filtering must never hide an invalid outside-source candidate.
export function subsetGraphCandidate(model, sourceRows, selectedRows, nodeKey) {
  indexGraphModel(model);
  const sourceKeys = new Set(sourceRows.map(row => encodeRowKey(graphSourceKey(row, nodeKey))));
  if (model.directed || model.nodes.some(node => !sourceKeys.has(node.key)) || model.edges.some(edge => edge.weight < 0)) {
    throw new TypeError("Invalid graph spanning candidate binding.");
  }
  const selected = new Set(selectedRows.map(row => encodeRowKey(graphSourceKey(row, nodeKey))));
  return createGraphModel(model.nodes.filter(node => selected.has(node.key)),
    model.edges.filter(edge => selected.has(edge.sourceKey) && selected.has(edge.targetKey)),
    { directed: model.directed, selfLoops: model.selfLoops });
}
