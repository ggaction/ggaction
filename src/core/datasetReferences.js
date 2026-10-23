// Stored dataset reference paths have one owner across resource and replay policies.
export function datasetInputReferences(dataset) {
  const refs = dataset.source === undefined ? [] : [{ id: dataset.source, path: ["source"] }];
  if (dataset.transform?.[0]?.type === "lookup") {
    refs.push({ id: dataset.transform[0].lookup.data, path: ["transform", 0, "lookup", "data"] });
  }
  return refs;
}

export function datasetInputIds(dataset) {
  return [...new Set(datasetInputReferences(dataset).map(ref => ref.id))];
}

export function rebindTransformDatasetInputs(transform, replacements) {
  if (transform.type !== "lookup" || !replacements.has(transform.lookup.data)) return transform;
  return { ...transform, lookup: { ...transform.lookup, data: replacements.get(transform.lookup.data) } };
}
