export function findDataset(program, id) {
  return program.semanticSpec.datasets.find(dataset => dataset.id === id);
}

export function hasDataset(program, id) {
  return findDataset(program, id) !== undefined;
}

export function findDatasetConsumer(program, source) {
  return program.semanticSpec.datasets.find(dataset => dataset.source === source);
}

export function requireDataset(program, id, label = `Dataset "${id}"`) {
  const dataset = findDataset(program, id);
  if (dataset === undefined) throw new Error(`${label} does not exist.`);
  return dataset;
}

export function requireMaterializedDataset(program, id) {
  const dataset = findDataset(program, id);
  if (dataset === undefined) throw new Error(`Unknown dataset "${id}".`);
  if (!Array.isArray(dataset.values)) {
    throw new Error(
      `Dataset "${id}" requires materialized values. ` +
      "createDerivedData stores a definition only; use the corresponding " +
      "value-producing data action before creating a chart or mark."
    );
  }
  return dataset;
}
