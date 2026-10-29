import { cloneAndFreeze } from "../../core/immutable.js";
import { contourGrid } from "../../grammar/contour/layout.js";
import { estimateContourDensity } from "../../grammar/contour/density.js";
import { normalizeContourDensityDefinition, contourDensityInput, contourDensityOptions } from "../../grammar/contour/input.js";
import { dataInputReference } from "../../selectors/resources.js";

export function contourRowReferences(dataset) {
  return dataset.rowKeys.map(rowKey => ({ data: dataset.id, logicalDataId: dataset.logicalId,
    revision: dataset.revision, rowKey, role: "density-point" }));
}

export function createContourResource({ id, revision = 0, grid, thresholds, dataset, definition }) {
  const normalized = dataset === undefined ? undefined : normalizeContourDensityDefinition(definition);
  const density = dataset === undefined ? undefined : estimateContourDensity(contourDensityInput(dataset.values, normalized), contourDensityOptions(normalized));
  const contours = contourGrid(density?.grid ?? grid, thresholds);
  return cloneAndFreeze({ kind: "geometry", id, revision, algorithmVersion: "1", ownership: { mode: "authored" },
    inputs: dataset === undefined ? [] : [dataInputReference(dataset)],
    options: { method: "contour", source: dataset === undefined ? "grid" : "density", thresholds: contours.thresholds.map(level => level.value),
      ...(normalized === undefined ? {} : { definition: normalized }) },
    result: { contours, density: density === undefined ? null : { totalWeight: density.totalWeight, sourceCount: density.sourceCount } },
    provenance: { origin: dataset === undefined ? "authored" : "inferred", sourceRows: dataset === undefined ? [] : contourRowReferences(dataset) } });
}
