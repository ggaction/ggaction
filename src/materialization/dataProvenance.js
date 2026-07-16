import { findDataset } from "../selectors/datasets.js";

export function findUpstreamTransform(program, dataset, type) {
  const visited = new Set();
  let current = dataset;
  while (current !== undefined && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.transform?.length !== 1) return undefined;
    const transform = current.transform[0];
    if (transform.type === type) return transform;
    if (transform.type !== "markFilter") return undefined;
    current = findDataset(program, current.source);
  }
  return undefined;
}
