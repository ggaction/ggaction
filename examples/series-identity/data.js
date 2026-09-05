export const layout = Object.freeze({
  width: 760, height: 460,
  margin: { top: 88, right: 172, bottom: 76, left: 72 },
  xDomain: [1, 4], yDomain: [0, 28],
  colors: ["#2563eb", "#c2410c"], continents: ["Europe", "Asia"]
});
const countries = [
  ["France", "Europe", [12, 15, 14, 18]],
  ["Germany", "Europe", [18, 17, 20, 22]],
  ["Japan", "Asia", [10, 13, 16, 19]],
  ["Korea", "Asia", [6, 10, 9, 14]]
];
export const rows = Object.freeze(countries.flatMap(([country, continent, values], countryIndex) =>
  values.map((value, index) => Object.freeze({
    country, continent, period: index + 1, value, weight: countryIndex + 1,
    quality: countryIndex + 1, scenario: "observed"
  }))
));
export const scenarioRows = Object.freeze(rows.flatMap(row => [
  row, Object.freeze({ ...row, scenario: "projection", value: row.value + 3 })
]));
export const cases = Object.freeze([
  { id: "country-color", title: "Country paths, continent colors", subtitle: "4 countries form 4 paths; 2 continents supply the colors", fields: ["country"], rows },
  { id: "tuple-color-dash", title: "Country and scenario define each path", subtitle: "8 paths · solid: observed · dashed: projection", fields: ["country", "scenario"], rows: scenarioRows },
  { id: "series-appearance", title: "Identity stays separate from appearance", subtitle: "4 paths · width: 2, 4, 6, 8 px · opacity: 0.25, 0.50, 0.75, 1.00", fields: ["country"], rows }
]);
