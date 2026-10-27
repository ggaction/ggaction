export function resolveCategorySlotOffset(program, layer) {
  const policy = program.markConfigs[layer.id]?.categorySlotOffset;
  if (policy === undefined) return undefined;
  if (!["x", "y"].includes(policy.channel)) {
    throw new Error(`Category slot offset for "${layer.id}" requires channel x or y.`);
  }
  if (!Number.isFinite(policy.band) || policy.band < -0.5 || policy.band > 0.5) {
    throw new RangeError(`Category slot offset for "${layer.id}" must be within [-0.5, 0.5] band.`);
  }
  const encoding = layer.encoding?.[policy.channel];
  if (!["nominal", "ordinal"].includes(encoding?.fieldType)) {
    throw new Error(`Category slot offset for "${layer.id}" requires a categorical position.`);
  }
  const scale = program.resolvedScales[encoding.scale];
  if (scale?.type !== "band" || !Number.isFinite(scale.bandwidth) || scale.bandwidth <= 0) {
    throw new Error(`Category slot offset for "${layer.id}" requires a positive band scale.`);
  }
  return { channel: policy.channel, pixels: scale.bandwidth * policy.band };
}

export function offsetCategoryPositions(program, layer, positions) {
  const offset = resolveCategorySlotOffset(program, layer);
  if (offset === undefined || offset.pixels === 0) return positions;
  const shift = values => values === undefined
    ? undefined
    : values.map(value => Number.isFinite(value) ? value + offset.pixels : value);
  return {
    ...positions,
    [offset.channel]: shift(positions[offset.channel])
  };
}

export function offsetCategoryRectangles(program, layer, rectangles) {
  const offset = resolveCategorySlotOffset(program, layer);
  if (offset === undefined || offset.pixels === 0) return rectangles;
  return rectangles.map(rectangle => ({
    ...rectangle,
    [offset.channel]: rectangle[offset.channel] + offset.pixels
  }));
}
