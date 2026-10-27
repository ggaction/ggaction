// Legend borders use one closed rectangular path, so odd dash duplication is not implicit.
export function normalizeLegendBorderDash(value, label = "Legend border strokeDash") {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length % 2 !== 0 ||
      ![...value].every(item => Number.isFinite(item) && item >= 0)) {
    throw new TypeError(`${label} must be an even-length array of non-negative finite numbers.`);
  }
  return Object.freeze([...value]);
}
