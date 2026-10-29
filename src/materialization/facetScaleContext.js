// Layout-only reflows preserve the domain already resolved by the facet owner.
// This authority is temporary; semantic auto-domain intent remains unchanged.
export function withFacetScaleDomains(program, domains, empty, apply) {
  if (program.materializationConfigs.canvas?.responsive === undefined) return apply(program);
  const scoped = program._withContext({ facetMaterialization: { domains, empty } });
  const result = apply(scoped);
  const { facetMaterialization: _facet, ...context } = result.context;
  if (Object.hasOwn(program.context, "facetMaterialization")) context.facetMaterialization = program.context.facetMaterialization;
  return result._clone({ context });
}

export function withRetainedFacetDomains(parent, id, apply) {
  const child = parent.children[id];
  if (parent.compositionSpec.type !== "facet") return apply(child);
  const domains = Object.fromEntries(Object.entries(child.resolvedScales).map(([id, scale]) => [id, scale.domain]));
  const empty = parent.compositionSpec.facet.grid?.cells.some(cell => cell.id === id && cell.empty) === true;
  return withFacetScaleDomains(child, domains, empty, apply);
}
