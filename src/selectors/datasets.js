import { annotateError } from "../core/diagnostics.js";

export function findDataset(program, id) {
  return program.semanticSpec.datasets.find(dataset => dataset.id === id);
}


function currentOwnerMatches(program, id) {
  const families = program.materializationConfigs.data ?? {};
  return Object.entries(families).flatMap(([family, owners]) =>
    Object.entries(owners ?? {}).flatMap(([owner, config]) =>
      owner === id && typeof config?.current === "string"
        ? [{ family, owner, current: config.current }]
        : []
    )
  );
}

export function hasDatasetOwner(program, id) {
  return currentOwnerMatches(program, id).length > 0;
}

export function resolveDatasetReference(program, id, label = "Dataset") {
  const matches = currentOwnerMatches(program, id);
  if (matches.length > 1) {
    throw annotateError(new Error(`${label} logical owner "${id}" is ambiguous.`), { code: "ambiguous-resource", resourceId: id, candidates: matches.map(match => match.current) });
  }
  const resolved = matches.length === 1 ? matches[0].current : id;
  const dataset = findDataset(program, resolved);
  if (dataset === undefined) {
    const kind = label.toLowerCase().includes("source")
      ? "source dataset"
      : "dataset";
    throw annotateError(new Error(`Unknown ${kind} "${id}" does not exist.`), { code: "missing-resource", resourceId: id });
  }
  return dataset;
}

export function hasDataset(program, id) {
  return findDataset(program, id) !== undefined;
}

// The active final-item filter is identified by its canonical derived dataset.
export function findMarkFilterDataset(program, layer) {
  const dataset = findDataset(program, layer.data), transform = dataset?.transform?.[0];
  return dataset?.source !== undefined && transform?.type === "markFilter" && transform.target === layer.id ? dataset : undefined;
}

export function findMarkVisibilityDataset(program, layer) {
  const dataset = findMarkFilterDataset(program, layer);
  return dataset?.transform[0].visibility === undefined ? undefined : dataset;
}

// User filtering and visibility are separate, ordered final-item views.
export function findNativeMarkFilterDataset(program, layer) {
  const outer = findMarkFilterDataset(program, layer);
  return outer?.transform[0].visibility === undefined ? outer
    : findMarkFilterDataset(program, { ...layer, data: outer.source });
}

// Authored category order validates against the original filter source while
// realized domains project onto the current view. Reject malformed cycles.
export function unfilteredMarkDataset(program, layer) {
  const seen = new Set();
  let current = layer, dataset = findDataset(program, layer.data);
  while (findMarkFilterDataset(program, current)) {
    if (seen.has(dataset.id)) throw new Error("Cyclic mark-filter source.");
    seen.add(dataset.id);
    dataset = requireDataset(program, dataset.source);
    current = { ...layer, data: dataset.id };
  }
  return dataset;
}

export function isEmptyMarkFilteredView(program, layer) {
  return findMarkFilterDataset(program, layer)?.values?.length === 0;
}

export function findDatasetConsumer(program, source) {
  return program.semanticSpec.datasets.find(dataset => dataset.source === source);
}

export function requireDataset(program, id, label = `Dataset "${id}"`) {
  const dataset = findDataset(program, id);
  if (dataset === undefined) throw annotateError(new Error(`${label} does not exist.`), { code: "missing-resource", resourceId: id });
  return dataset;
}

export function requireMaterializedDataset(program, id) {
  const dataset = resolveDatasetReference(program, id, "Dataset");
  if (dataset === undefined) throw annotateError(new Error(`Unknown dataset "${id}".`), { code: "missing-resource", resourceId: id });
  if (!Array.isArray(dataset.values)) {
    throw annotateError(new Error(
      `Dataset "${id}" requires materialized values. ` +
      "createDerivedData stores a definition only; use the corresponding " +
      "value-producing data action before creating a chart or mark."
    ), { code: "incompatible-resource", resourceId: id });
  }
  return dataset;
}

export function resolveMaterializedDataset(program, requested, label = "Data") {
  const id = requested ?? program.context.currentData;
  if (id !== undefined) return requireMaterializedDataset(program, id);
  const candidates = program.semanticSpec.datasets.filter(dataset => Array.isArray(dataset.values));
  if (candidates.length !== 1) throw annotateError(new Error(`${label} must be explicit unless one materialized dataset exists.`), {
    code: candidates.length ? "ambiguous-resource" : "missing-resource"
  });
  return candidates[0];
}
