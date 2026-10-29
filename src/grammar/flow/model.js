import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { indexGraphModel } from "../graph/model.js";

export function normalizeFlowBalance(options = {}) {
  ownRecord(options, "Flow balance options");
  rejectUnknownProperties(options, ["balance"], "flow balance");
  const balance = Object.hasOwn(options, "balance") ? options.balance : "allow";
  if (!["allow", "strict"].includes(balance)) throw new TypeError("Flow balance must be allow or strict.");
  return { balance };
}

// Keys and source membership stay opaque: the graph owner validates identity.
export function indexFlowModel(model, balance = "allow", limits = {}) {
  normalizeFlowBalance({ balance });
  const indexed = indexGraphModel(model, limits);
  if (!model.directed) throw new TypeError("Flow graphs must be directed.");
  let work = indexed.work;
  const charge = amount => validateWorkLimit(work += amount, "Flow layout work");
  const nodes = model.nodes.map(node => ({ key: node.key, incoming: 0, outgoing: 0, throughput: 0, imbalance: 0 }));
  for (const edge of model.edges) {
    charge(8);
    if (edge.weight < 0) throw new RangeError("Flow values must be nonnegative.");
    const source = nodes[indexed.nodeIndexes.get(edge.sourceKey)], target = nodes[indexed.nodeIndexes.get(edge.targetKey)];
    source.outgoing += edge.weight; target.incoming += edge.weight;
    if (!Number.isFinite(source.outgoing) || !Number.isFinite(target.incoming)) throw new RangeError("Flow totals must remain finite.");
  }
  nodes.forEach((node, index) => {
    charge(8);
    node.throughput = Math.max(node.incoming, node.outgoing);
    node.imbalance = node.incoming - node.outgoing;
    const adjacency = model.adjacency[index];
    if (balance === "strict" && adjacency.incoming.length && adjacency.outgoing.length &&
        Math.abs(node.imbalance) > 1e-12 * Math.max(node.incoming, node.outgoing)) {
      throw new Error("Strict flow conservation requires equal incoming and outgoing totals at every internal node.");
    }
  });
  return { ...indexed, totals: nodes, charge };
}

export function summarizeFlow(model, options = {}) {
  const { balance } = normalizeFlowBalance(options);
  return cloneAndFreeze({ nodes: indexFlowModel(model, balance).totals });
}
