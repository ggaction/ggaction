import { validateUserId } from "../../core/identifiers.js";

export const MATERIALIZE_OPTIONS = Object.freeze(["id"]);

export function requireDerivedDataset(program, id, type) {
  const validatedId = validateUserId(id, "Derived dataset id");
  const dataset = program.semanticSpec.datasets.find(
    item => item.id === validatedId
  );
  if (dataset === undefined || dataset.source === undefined) {
    throw new Error(`Unknown derived dataset "${validatedId}".`);
  }
  if (dataset.values !== undefined) {
    throw new Error(`Derived dataset "${validatedId}" is already materialized.`);
  }
  const source = program.semanticSpec.datasets.find(
    item => item.id === dataset.source
  );
  if (source?.values === undefined) {
    throw new Error(`Source dataset "${dataset.source}" has no values.`);
  }
  if (dataset.transform?.length !== 1 || dataset.transform[0].type !== type) {
    throw new Error(
      `Derived dataset "${validatedId}" requires one ${type} transform.`
    );
  }
  return { id: validatedId, dataset, source, transform: dataset.transform[0] };
}
