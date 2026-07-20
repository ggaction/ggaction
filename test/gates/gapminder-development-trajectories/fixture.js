export const TRAJECTORY_COUNTRIES = Object.freeze([
  "China",
  "South Africa",
  "United States"
]);

export const TRAJECTORY_YEARS = Object.freeze([
  1955, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005
]);

const SOURCE_YEAR_ORDER = Object.freeze([
  1980, 1955, 2005, 1965, 1995, 1975, 1960, 2000, 1985, 1970, 1990
]);

export const TRAJECTORY_LAYOUT = Object.freeze({
  width: 760,
  height: 500,
  margin: Object.freeze({ top: 85, right: 170, bottom: 80, left: 85 }),
  plot: Object.freeze({ left: 85, top: 85, right: 590, bottom: 420 }),
  xDomain: Object.freeze([1, 7]),
  yDomain: Object.freeze([25, 85]),
  colors: Object.freeze(["#e45756", "#4c78a8", "#54a24b"])
});

export function createTrajectoryRows(gapminder) {
  const selected = gapminder.filter(row =>
    TRAJECTORY_COUNTRIES.includes(row?.country) &&
    TRAJECTORY_YEARS.includes(row?.year) &&
    Number.isFinite(row?.fertility) &&
    Number.isFinite(row?.life_expect)
  );
  const lookup = new Map(selected.map(row => [`${row.country}:${row.year}`, row]));
  const rows = SOURCE_YEAR_ORDER.flatMap(year =>
    TRAJECTORY_COUNTRIES.map(country => lookup.get(`${country}:${year}`))
  );
  if (rows.length !== 33 || rows.some(row => row === undefined)) {
    throw new Error(
      "Development trajectory fixture requires 11 complete rows for each country."
    );
  }
  return Object.freeze(rows);
}
