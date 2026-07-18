import { cloneAndFreeze, isPlainObject } from "../core/immutable.js";
import { validateUserId } from "../core/identifiers.js";
import { BAR_GRAINS, resolveBarGrain } from "./bars/policy.js";
import { readNominalField } from "./scales.js";

const SUPPORTED_MARKS = new Set(["point", "bar"]);
const SUPPORTED_BAR_GRAINS = new Set([
  BAR_GRAINS.histogram,
  BAR_GRAINS.aggregate
]);

function requireFacetField(field) {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("facet requires a non-empty field.");
  }
  return field;
}

function requireSupportedLayer(layer) {
  if (!SUPPORTED_MARKS.has(layer.mark?.type)) {
    throw new Error(
      `facet currently supports point and complete bar marks; mark "${layer.id}" is ${layer.mark?.type ?? "incomplete"}.`
    );
  }
  if (
    layer.mark.type === "bar" &&
    !SUPPORTED_BAR_GRAINS.has(resolveBarGrain(layer))
  ) {
    throw new Error(
      `facet requires bar mark "${layer.id}" to be a complete histogram or aggregate bar.`
    );
  }
  if (typeof layer.data !== "string" || layer.data.length === 0) {
    throw new Error(`Facet layer "${layer.id}" requires a dataset.`);
  }
}

function resolveSourceId(semanticSpec, requested) {
  if (!Array.isArray(semanticSpec.layers) || semanticSpec.layers.length === 0) {
    throw new Error("facet requires at least one materializable layer.");
  }
  for (const layer of semanticSpec.layers) requireSupportedLayer(layer);
  const layerData = [...new Set(semanticSpec.layers.map(layer => layer.data))];
  const data = requested === undefined
    ? layerData.length === 1 ? layerData[0] : undefined
    : validateUserId(requested, "Facet dataset id");
  if (data === undefined) {
    throw new Error(
      "facet cannot infer one source dataset from layers that use multiple datasets."
    );
  }
  if (layerData.some(id => id !== data)) {
    throw new Error(
      `facet dataset "${data}" must be used by every repeated layer.`
    );
  }
  return data;
}

function requireDirectDataset(semanticSpec, id) {
  const dataset = semanticSpec.datasets?.find(candidate => candidate.id === id);
  if (dataset === undefined) {
    throw new Error(`Facet dataset "${id}" does not exist.`);
  }
  if (
    dataset.source !== undefined ||
    (Array.isArray(dataset.transform) && dataset.transform.length > 0)
  ) {
    throw new Error(
      `facet first slice requires direct source dataset "${id}" without transforms.`
    );
  }
  if (!Array.isArray(dataset.values)) {
    throw new TypeError(`Facet dataset "${id}" requires array values.`);
  }
  return dataset;
}

function uniqueInOrder(values) {
  return [...new Set(values)];
}

function resolveValues(observed, requested) {
  if (requested === undefined) return observed;
  if (!Array.isArray(requested) || requested.length === 0) {
    throw new TypeError("facet values must be a non-empty array when provided.");
  }
  const normalized = readNominalField(
    requested.map(value => ({ value })),
    "value"
  );
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("facet values must be unique.");
  }
  const missing = normalized.find(value => !observed.includes(value));
  if (missing !== undefined) {
    throw new Error(`facet value ${JSON.stringify(missing)} is not present in the source field.`);
  }
  return normalized;
}

export function resolveFacetDefinition(semanticSpec, options = {}) {
  if (!isPlainObject(semanticSpec)) {
    throw new TypeError("resolveFacetDefinition requires a semantic spec.");
  }
  if (!isPlainObject(options)) {
    throw new TypeError("Facet options must be a plain object.");
  }
  const field = requireFacetField(options.field);
  const data = resolveSourceId(semanticSpec, options.data);
  const dataset = requireDirectDataset(semanticSpec, data);
  const observed = uniqueInOrder(readNominalField(dataset.values, field));
  if (observed.length === 0) {
    throw new Error(`facet field "${field}" has no values.`);
  }
  const values = resolveValues(observed, options.values);
  return cloneAndFreeze({
    data,
    field,
    values,
    cells: values.map((value, index) => ({
      id: `facet-cell-${index + 1}`,
      data: `facet-cell-${index + 1}-data`,
      value
    }))
  });
}
