export function retainedHistogramBoundaries(layer, items) {
  if (layer.mark?.type !== "bar" || layer.encoding?.x?.bin === undefined) {
    return undefined;
  }
  const boundaries = [...new Set(items.flatMap(item => [
    item.channels.x,
    item.channels.x2
  ]).filter(Number.isFinite))].sort((left, right) => left - right);
  return boundaries.length < 2 ? undefined : boundaries;
}

export function restoreHistogramBin(program, layer, originalBin) {
  let next = program;
  const current = layer.encoding?.x?.bin ?? {};
  for (const property of ["maxBins", "step", "boundaries"]) {
    if (Object.hasOwn(originalBin, property)) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.bin.${property}`,
        value: originalBin[property]
      });
    } else if (Object.hasOwn(current, property)) {
      next = next.editSemantic({
        property: `layer[${layer.id}].encoding.x.bin.${property}`,
        remove: true
      });
    }
  }
  return next;
}

export function preserveHistogramBin(program, layer, boundaries) {
  if (boundaries === undefined) return program;
  let next = program;
  for (const property of ["maxBins", "step"]) {
    if (Object.hasOwn(layer.encoding.x.bin, property)) next = next.editSemantic({
      property: `layer[${layer.id}].encoding.x.bin.${property}`, remove: true
    });
  }
  return next.editSemantic({ property: `layer[${layer.id}].encoding.x.bin.boundaries`, value: boundaries });
}
