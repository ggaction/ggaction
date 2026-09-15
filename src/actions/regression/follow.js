export function reconcileFollowingRegressions(program) {
  let next = program;
  for (const layer of program.semanticSpec.layers) {
    if (layer.derivedBindings?.regression?.mode !== "follow") continue;
    const config = next.markConfigs[layer.id]?.regression;
    if (config === undefined) continue;
    const x = layer.encoding?.x;
    const y = layer.encoding?.y;
    if (typeof layer.data !== "string" || x?.fieldType !== "quantitative" || y?.fieldType !== "quantitative" ||
        typeof x.field !== "string" || typeof y.field !== "string") {
      throw new Error(`Following regression source "${layer.id}" requires quantitative x/y fields and data.`);
    }
    if (config.source === layer.data && config.x === x.field && config.y === y.field) continue;
    next = next.editRegression({
      target: layer.id,
      data: layer.data,
      x: x.field,
      y: y.field
    });
  }
  return next;
}
