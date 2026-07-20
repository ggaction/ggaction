import { cloneAndFreeze, isPlainObject } from "../../core/immutable.js";
import { validateUserId } from "../../core/identifiers.js";
import { findTransformPolicy } from "../transforms.js";

function requireCollection(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Facet dependency planning requires at least one ${label}.`);
  }
  return value;
}

function indexById(values, label) {
  const indexed = new Map();
  values.forEach((value, index) => {
    if (!isPlainObject(value)) {
      throw new TypeError(`Facet ${label} at index ${index} must be a plain object.`);
    }
    const id = validateUserId(value.id, `Facet ${label} id`);
    if (indexed.has(id)) {
      throw new Error(`Facet dependency graph contains duplicate ${label} id "${id}".`);
    }
    indexed.set(id, { value, index });
  });
  return indexed;
}

function classifyDataset(dataset) {
  const transforms = dataset.transform;
  if (transforms === undefined || transforms.length === 0) {
    if (dataset.source !== undefined) {
      throw new Error(
        `Derived dataset "${dataset.id}" requires one supported transform.`
      );
    }
    if (!Array.isArray(dataset.values)) {
      throw new TypeError(`Source dataset "${dataset.id}" requires array values.`);
    }
    return "source";
  }
  if (!Array.isArray(transforms) || transforms.length !== 1 || !isPlainObject(transforms[0])) {
    throw new Error(
      `Facet replay currently requires dataset "${dataset.id}" to contain exactly one transform.`
    );
  }
  if (typeof dataset.source !== "string" || dataset.source.length === 0) {
    throw new Error(`Transformed dataset "${dataset.id}" requires a source dataset.`);
  }
  const type = transforms[0].type;
  const topology = findTransformPolicy(type)?.facetTopology;
  if (topology !== undefined) return topology;
  throw new Error(
    `Facet replay does not support dataset transform "${type ?? "unknown"}" on "${dataset.id}".`
  );
}

function tracePath(id, datasets, classifications, visiting = new Set()) {
  const indexed = datasets.get(id);
  if (indexed === undefined) {
    throw new Error(`Facet dependency graph references missing dataset "${id}".`);
  }
  if (visiting.has(id)) {
    throw new Error(`Facet dependency graph contains a cycle at dataset "${id}".`);
  }
  const dataset = indexed.value;
  const kind = classifications.get(id);
  if (kind === "source") return [id];
  const nextVisiting = new Set(visiting).add(id);
  return [
    ...tracePath(dataset.source, datasets, classifications, nextVisiting),
    id
  ];
}

function eligiblePrefix(path, classifications) {
  const statisticalIndex = path.findIndex(id => classifications.get(id) === "statistical");
  return statisticalIndex === -1 ? path : path.slice(0, statisticalIndex);
}

function resolveAnchor(paths, datasets, classifications, requested) {
  const eligible = paths.map(path => eligiblePrefix(path, classifications));
  const common = eligible[0].filter(id =>
    eligible.every(path => path.includes(id))
  );
  if (common.length === 0) {
    const roots = [...new Set(paths.map(path => path[0]))];
    throw new Error(
      `Facet layers do not share one partition anchor; roots are ${roots.map(id => `"${id}"`).join(", ")}.`
    );
  }
  if (requested !== undefined) {
    const id = validateUserId(requested, "Facet partition dataset id");
    if (!datasets.has(id)) {
      throw new Error(`Facet partition dataset "${id}" does not exist.`);
    }
    if (!common.includes(id)) {
      throw new Error(
        `Facet partition dataset "${id}" is not a common row-preserving ancestor of every layer.`
      );
    }
    return id;
  }
  return common.at(-1);
}

function requireFacetField(dataset, field) {
  if (!Array.isArray(dataset.values)) {
    throw new TypeError(
      `Facet partition dataset "${dataset.id}" requires materialized array values.`
    );
  }
  for (const [index, row] of dataset.values.entries()) {
    if (!isPlainObject(row) || !Object.hasOwn(row, field)) {
      throw new Error(
        `Facet field "${field}" is missing from row ${index} of partition dataset "${dataset.id}".`
      );
    }
  }
}

export function planFacetDependencies(semanticSpec, options = {}) {
  if (!isPlainObject(semanticSpec)) {
    throw new TypeError("planFacetDependencies requires a semantic spec.");
  }
  if (!isPlainObject(options)) {
    throw new TypeError("Facet dependency options must be a plain object.");
  }
  if (typeof options.field !== "string" || options.field.length === 0) {
    throw new TypeError("Facet field must be a non-empty string.");
  }
  const field = options.field;
  const datasetValues = requireCollection(semanticSpec.datasets, "dataset");
  const layerValues = requireCollection(semanticSpec.layers, "visible layer");
  const datasets = indexById(datasetValues, "dataset");
  const layers = indexById(layerValues, "layer");
  const classifications = new Map(
    [...datasets].map(([id, { value }]) => [id, classifyDataset(value)])
  );
  const layerPaths = [...layers].map(([layerId, { value: layer }]) => {
    const data = validateUserId(layer.data, `Facet layer "${layerId}" dataset id`);
    return { layerId, data, path: tracePath(data, datasets, classifications) };
  });
  const anchor = resolveAnchor(
    layerPaths.map(entry => entry.path),
    datasets,
    classifications,
    options.data
  );
  requireFacetField(datasets.get(anchor).value, field);

  const replayIds = new Set();
  for (const { path } of layerPaths) {
    const anchorIndex = path.indexOf(anchor);
    for (const id of path.slice(anchorIndex + 1)) replayIds.add(id);
  }
  const replay = [...replayIds]
    .map(id => {
      const { value: dataset, index } = datasets.get(id);
      const depth = layerPaths.find(entry => entry.path.includes(id)).path.indexOf(id);
      return {
        id,
        source: dataset.source,
        kind: classifications.get(id),
        transform: dataset.transform[0],
        depth,
        index
      };
    })
    .sort((left, right) => left.depth - right.depth || left.index - right.index)
    .map(({ depth, index, ...entry }) => entry);

  return cloneAndFreeze({
    field,
    anchor,
    replay,
    layers: layerPaths.map(({ layerId, data }) => ({ id: layerId, data }))
  });
}
