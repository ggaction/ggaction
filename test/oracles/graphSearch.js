// Exhaustive numeric-key fixture oracle, independent from production metric,
// preprocessing, identity and candidate search implementations.
export function numericNearestPairs(keys, vectors, k) {
  const pairs = [];
  vectors.forEach((row, source) => {
    const neighbors = vectors.map((other, target) => ({ target, distance: Math.hypot(...row.map((value, d) => value - other[d])) }))
      .filter(item => item.target !== source).sort((a, b) => a.distance - b.distance || keys[a.target] - keys[b.target]).slice(0, k);
    for (const item of neighbors) pairs.push([source, item.target]);
  });
  return pairs.sort((a, b) => keys[a[0]] - keys[b[0]] || keys[a[1]] - keys[b[1]]);
}
export function graphPairRecall(expected, actual) {
  const truth = new Set(expected.map(pair => JSON.stringify(pair)));
  return actual.filter(pair => truth.has(JSON.stringify(pair))).length / expected.length;
}
