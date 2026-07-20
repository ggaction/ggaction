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
