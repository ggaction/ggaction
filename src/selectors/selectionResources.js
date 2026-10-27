import { requireStoredResource } from "./resources.js";
import { requireDataset } from "./datasets.js";

export function storedSelectionSelector(program, definition) {
  const resource = requireStoredResource(program, definition.resource);
  if (resource.options.mode === "predicate") return { grain: definition.grain, ...resource.options.predicate };
  const dataset = requireDataset(program, definition.projection.data);
  const selected = new Set(resource.options.rowKeys);
  const indices = dataset.logicalId === resource.options.logicalDataId
    ? dataset.rowKeys.flatMap((key, index) => selected.has(key) ? [index] : []) : [];
  return { grain: definition.grain, rows: { data: dataset.id, indices } };
}
