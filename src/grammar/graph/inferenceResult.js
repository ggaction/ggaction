// The resource and worker completion retain diagnostics without duplicating the
// edge array or prepared vectors. Both are already represented by the model and
// exact source binding.
export function resolvedInferenceResult({ model, inference }) {
  const { edges: _edges, preparation, ...diagnostics } = inference;
  if (preparation !== undefined) {
    const { vectors: _vectors, ...retained } = preparation;
    diagnostics.preparation = retained;
  }
  return { model, diagnostics };
}
