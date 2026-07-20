import { isAggregate } from "../../grammar/aggregate.js";
import { findTransformPolicy } from "../../grammar/transforms.js";
import { findDataset } from "../../selectors/datasets.js";

function hasRowPreservingProvenance(program, dataset) {
  const visited = new Set();
  let current = dataset;
  while (current?.source !== undefined) {
    if (visited.has(current.id) || current.transform?.length !== 1) return false;
    visited.add(current.id);
    const policy = findTransformPolicy(current.transform[0].type);
    if (
      policy?.facetTopology !== "rowPreserving" &&
      policy?.provenanceTransparent !== true
    ) {
      return false;
    }
    current = findDataset(program, current.source);
    if (current === undefined) return false;
  }
  return current !== undefined;
}

function isPolar(layer) {
  return layer.encoding?.theta !== undefined ||
    layer.encoding?.radius !== undefined;
}

function isCompositePath(program, layer) {
  const config = program.markConfigs[layer.id];
  return config?.errorBand !== undefined ||
    config?.errorBandBoundary !== undefined ||
    config?.regression !== undefined;
}

export function pathOrderCompatibility(program, layer) {
  if (!["line", "area"].includes(layer?.mark?.type)) {
    return { compatible: false, reason: "requires a line or area mark" };
  }
  if (isPolar(layer)) {
    return { compatible: false, reason: "does not support Polar paths" };
  }
  const dataset = findDataset(program, layer.data);
  if (dataset === undefined) {
    return { compatible: false, reason: "requires an existing dataset" };
  }
  if (!hasRowPreservingProvenance(program, dataset)) {
    return {
      compatible: false,
      reason: "requires raw or row-preserving source data"
    };
  }
  if (isCompositePath(program, layer)) {
    return {
      compatible: false,
      reason: "does not support generated error or regression paths"
    };
  }
  if (layer.mark.type === "line" && isAggregate(layer.encoding?.y?.aggregate)) {
    return { compatible: false, reason: "does not support aggregate lines" };
  }
  return { compatible: true, dataset };
}

export function assertPathOrderCompatible(program, layer, operation) {
  const result = pathOrderCompatibility(program, layer);
  if (!result.compatible) {
    throw new Error(`${operation} ${result.reason} on mark "${layer?.id}".`);
  }
  return result.dataset;
}
