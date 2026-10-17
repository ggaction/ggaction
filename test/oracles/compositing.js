// Independent straight-alpha blend equation; all channels and alpha use 0..1.
export function differenceOver(source, backdrop) {
  const a = source[3] + backdrop[3] * (1 - source[3]);
  if (a === 0) return [0, 0, 0, 0];
  return [0, 1, 2].map(index => (
    (1 - source[3]) * backdrop[3] * backdrop[index] +
    (1 - backdrop[3]) * source[3] * source[index] +
    source[3] * backdrop[3] * Math.abs(backdrop[index] - source[index])
  ) / a).concat(a);
}
