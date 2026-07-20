import { chart } from "../../src/index.js";

export const DEVELOPMENT_TRAJECTORY_COUNTRIES = Object.freeze([
  "China",
  "South Africa",
  "United States"
]);

export const DEVELOPMENT_TRAJECTORY_YEARS = Object.freeze([
  1955, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005
]);

const SOURCE_YEAR_ORDER = Object.freeze([
  1980, 1955, 2005, 1965, 1995, 1975, 1960, 2000, 1985, 1970, 1990
]);

export function createDevelopmentTrajectoryRows(gapminder) {
  const selected = gapminder.filter(row =>
    DEVELOPMENT_TRAJECTORY_COUNTRIES.includes(row?.country) &&
    DEVELOPMENT_TRAJECTORY_YEARS.includes(row?.year) &&
    Number.isFinite(row?.fertility) &&
    Number.isFinite(row?.life_expect)
  );
  const lookup = new Map(
    selected.map(row => [`${row.country}:${row.year}`, row])
  );
  const rows = SOURCE_YEAR_ORDER.flatMap(year =>
    DEVELOPMENT_TRAJECTORY_COUNTRIES.map(
      country => lookup.get(`${country}:${year}`)
    )
  );
  if (rows.length !== 33 || rows.some(row => row === undefined)) {
    throw new Error(
      "Development trajectories require 11 complete rows for each country."
    );
  }
  return Object.freeze(rows);
}

export function createGapminderDevelopmentTrajectories(gapminder) {
  const trajectoryRows = createDevelopmentTrajectoryRows(gapminder);
  return chart()
    .createCanvas({
      width: 760,
      height: 500,
      margin: { top: 85, right: 170, bottom: 80, left: 85 }
    })
    .createData({ values: trajectoryRows })
    .createLineMark({ id: "trajectories", strokeWidth: 3 })
    .encodeX({
      target: "trajectories",
      field: "fertility",
      scale: { domain: [1, 7], zero: false }
    })
    .encodeY({
      target: "trajectories",
      field: "life_expect",
      scale: { domain: [25, 85], zero: false }
    })
    .encodeColor({
      target: "trajectories",
      field: "country",
      fieldType: "nominal",
      scale: {
        domain: DEVELOPMENT_TRAJECTORY_COUNTRIES,
        range: ["#e45756", "#4c78a8", "#54a24b"]
      }
    })
    .encodePathOrder({
      target: "trajectories",
      field: "year",
      order: "ascending"
    })
    .createGuides({
      axes: {
        x: { title: { text: "Fertility" } },
        y: { title: { text: "Life expectancy" } }
      },
      grid: { horizontal: true, vertical: true },
      legend: { title: "Country", position: "right" }
    })
    .createTitle({
      text: "Development Trajectories",
      subtitle: "Fertility and life expectancy, 1955–2005"
    });
}
