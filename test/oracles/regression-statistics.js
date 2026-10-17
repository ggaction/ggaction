export function referenceLinearStatistics(rows, x = "x", y = "y") {
  const count = rows.length;
  const meanX = rows.reduce((sum, row) => sum + row[x], 0) / count;
  const meanY = rows.reduce((sum, row) => sum + row[y], 0) / count;
  const sxx = rows.reduce((sum, row) => sum + (row[x] - meanX) ** 2, 0);
  const sxy = rows.reduce((sum, row) => sum + (row[x] - meanX) * (row[y] - meanY), 0);
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const sse = rows.reduce((sum, row) => sum + (row[y] - intercept - slope * row[x]) ** 2, 0);
  const sst = rows.reduce((sum, row) => sum + (row[y] - meanY) ** 2, 0);
  return { count, intercept, slope, rSquared: sst === 0 ? null : 1 - sse / sst };
}
