// Independent weighted raw moments for ordinary finite-sized reference inputs.
export function referenceExponentialFit(rows, x = "x", y = "y") {
  const weight = rows.reduce((sum, row) => sum + row[y], 0);
  const wx = rows.reduce((sum, row) => sum + row[y] * row[x], 0);
  const wz = rows.reduce((sum, row) => sum + row[y] * Math.log(row[y]), 0);
  const wxx = rows.reduce((sum, row) => sum + row[y] * row[x] ** 2, 0);
  const wxz = rows.reduce((sum, row) => sum + row[y] * row[x] * Math.log(row[y]), 0);
  const rate = (weight * wxz - wx * wz) / (weight * wxx - wx ** 2);
  const logAmplitude = (wz - rate * wx) / weight;
  return { rate, amplitude: Math.exp(logAmplitude), predict: value => Math.exp(logAmplitude + rate * value) };
}
