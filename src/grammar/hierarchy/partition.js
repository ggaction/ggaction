import { cloneAndFreeze } from "../../core/immutable.js";
import { ownRecord } from "../../core/ownData.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { interpolateNumber, stableFinitePrefixSums } from "../numeric.js";
import { indexHierarchyModel } from "./model.js";

export function layoutHierarchyPartition(model, options = {}) {
  ownRecord(options, "Hierarchy partition options");
  rejectUnknownProperties(options, ["maxNodes"], "hierarchy partition");
  const { nodes, indexes, work } = indexHierarchyModel(model, Object.hasOwn(options, "maxNodes") ? options.maxNodes : undefined);
  validateWorkLimit(work + nodes.length * 48, "Hierarchy partition work");
  const intervals = Array(nodes.length);
  if (nodes.length) intervals[0] = [0, model.totalValue === 0 ? 0 : 1];
  const result = nodes.map((node, index) => {
    const [u0, u1] = intervals[index];
    const children = node.childrenKeys.map(key => indexes.get(key));
    const prefixes = stableFinitePrefixSums(children.map(child => nodes[child].totalValue), "Hierarchy partition prefix", { compensated: true });
    let previous = u0;
    children.forEach((child, childIndex) => {
      const end = node.totalValue === 0 ? u0
        : node.residual === 0 && childIndex === children.length - 1 ? u1
          : interpolateNumber(u0, u1, prefixes[childIndex] / node.totalValue);
      if (end < previous || end > u1) throw new RangeError("Hierarchy partition prefix is outside its parent interval.");
      intervals[child] = [previous, end];
      previous = end;
    });
    return { ...node, u0, u1, residualStart: previous };
  });
  return cloneAndFreeze({ ...model, nodes: result });
}
