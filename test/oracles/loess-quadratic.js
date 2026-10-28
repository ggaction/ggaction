// Independent small-data oracle: Cramer's rule on an unscaled three-column
// design, rather than the production solver's scaled partial pivoting.
const determinant = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
  - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
  + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

export function quadraticNeighborhood(rows, xValue, span, residualWeights) {
  const count = Math.min(rows.length, Math.max(3, Math.ceil(span * rows.length)));
  const selected = rows.map((row, i) => ({ ...row, i, distance: Math.abs(row.x - xValue) }))
    .sort((a, b) => a.distance - b.distance || a.i - b.i).slice(0, count);
  const radius = selected.at(-1).distance;
  let weights = selected.map(row => radius === 0 ? 1 : (1 - (row.distance / radius) ** 3) ** 3);
  if (weights.every(weight => weight === 0)) weights = weights.map(() => 1);
  if (residualWeights) {
    const robust = weights.map((weight, i) => weight * residualWeights[selected[i].i]);
    if (robust.some(weight => weight > 0)) weights = robust;
  }
  const moment = power => selected.reduce((sum, row, i) => sum + weights[i] * (row.x - xValue) ** power, 0);
  const response = power => selected.reduce((sum, row, i) => sum + weights[i] * (row.x - xValue) ** power * row.y, 0);
  const matrix = Array.from({ length: 3 }, (_, a) => Array.from({ length: 3 }, (_, b) => moment(a + b)));
  const denominator = determinant(matrix);
  if (Math.abs(denominator) < 1e-12) return response(0) / moment(0);
  return determinant(matrix.map((row, i) => [response(i), row[1], row[2]])) / denominator;
}

export function quadraticLoess(rows, { span = 0.75, robustIterations = 0, predict } = {}) {
  const observed = [...new Set(rows.map(row => row.x))].sort((a, b) => a - b);
  let weights;
  let fitted = observed.map(x => quadraticNeighborhood(rows, x, span));
  const yScale = Math.max(...rows.map(row => Math.abs(row.y))) || 1;
  for (let i = 0; i < robustIterations; i++) {
    const residuals = rows.map(row => Math.abs(row.y / yScale - fitted[observed.indexOf(row.x)] / yScale));
    const ordered = [...residuals].sort((a, b) => a - b), middle = Math.floor(ordered.length / 2);
    const median = ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
    const cutoff = 6 * median, tolerance = 64 * Number.EPSILON;
    const next = residuals.map(value => cutoff <= tolerance ? Number(value <= tolerance)
      : value >= cutoff ? 0 : (1 - (value / cutoff) ** 2) ** 2);
    if (next.every((value, j) => value === (weights?.[j] ?? 1))) break;
    weights = next;
    fitted = observed.map(x => quadraticNeighborhood(rows, x, span, weights));
  }
  return (predict ?? observed).map(x => ({ x, y: quadraticNeighborhood(rows, x, span, weights) }));
}
