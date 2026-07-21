export const COUNTRY_NAMES = Object.freeze([
  "Australia", "Austria", "Belgium", "Canada", "Finland", "France",
  "Germany", "Greece", "Ireland", "Italy", "Japan", "Netherlands",
  "Norway", "Portugal", "Spain", "Switzerland", "United Kingdom",
  "United States"
]);

export const LABEL_LAYOUT = Object.freeze({
  width: 760,
  height: 520,
  margin: Object.freeze({ top: 88, right: 38, bottom: 72, left: 76 }),
  plot: Object.freeze({ left: 76, right: 722, top: 88, bottom: 448 }),
  axis: "both",
  padding: 3,
  maxDisplacement: 64,
  fontSize: 11,
  textDx: 7,
  leader: Object.freeze({
    stroke: "#94a3b8",
    strokeWidth: 0.8,
    opacity: 0.9
  })
});

export function createCountryRows(rows) {
  const selected = rows.filter(row =>
    row.year === 2005 && COUNTRY_NAMES.includes(row.country)
  );
  if (
    selected.length !== COUNTRY_NAMES.length ||
    selected.some((row, index) => row.country !== COUNTRY_NAMES[index])
  ) {
    throw new Error("Gapminder country-label fixture does not match its locked order.");
  }
  return selected;
}
