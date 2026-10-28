// Moderate finite fixtures only: deliberately direct formulas independent of
// production scaling, compensation, token encoders, and preprocessing.
export function directMetricPair(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const length = values => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  return {
    euclidean: Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0)),
    manhattan: a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0),
    cosine: dot / (length(a) * length(b))
  };
}
export function directPopulationColumns(rows) {
  return rows[0].map((_, column) => {
    const values = rows.map(row => row[column]);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const deviation = Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
    return values.map(value => deviation === 0 ? 0 : (value - mean) / deviation);
  });
}
