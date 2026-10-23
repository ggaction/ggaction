/** Observed input dimensions, separate from claims about chart or API coverage. */
export function datasetProfile(rows, { numericFields = [], categoryFields = [], sourceRows = rows.length } = {}) {
  if (!Array.isArray(rows) || !Number.isSafeInteger(sourceRows) || sourceRows < rows.length) {
    throw new TypeError("Dataset profile needs rows and a source count at least as large as the sample.");
  }
  const numeric = Object.fromEntries(numericFields.map(field => {
    const values = rows.map(row => row[field]);
    const finite = values.filter(Number.isFinite);
    return [field, {
      missing: values.filter(value => value == null).length,
      nonFinite: values.filter(value => typeof value === "number" && !Number.isFinite(value)).length,
      negative: finite.filter(value => value < 0).length,
      zero: finite.filter(value => value === 0).length,
      distinct: new Set(finite).size,
      min: finite.length ? finite.reduce((a, b) => Math.min(a, b), Infinity) : null,
      max: finite.length ? finite.reduce((a, b) => Math.max(a, b), -Infinity) : null
    }];
  }));
  return {
    rows: rows.length, sourceRows, selection: sourceRows === rows.length ? "full-source" : "sampled",
    sizeTier: rows.length <= 128 ? "small" : rows.length <= 1024 ? "medium" : "large",
    duplicateRows: rows.length - new Set(rows.map(row => JSON.stringify(row))).size,
    categories: Object.fromEntries(categoryFields.map(field => [field, new Set(rows.map(row => row[field])).size])),
    numeric
  };
}
