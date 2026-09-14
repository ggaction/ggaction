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
