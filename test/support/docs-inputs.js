import { readFileSync } from "node:fs";

const dataset = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), "utf8"));
const observations = ["A", "B"].flatMap(group => Array.from({ length: 5 }, (_, index) => ({
  x: index + 1, y: index + 3, value: index + 2 + (group === "B" ? 1 : 0),
  group, category: group, series: group, time: `2024-0${index + 1}-01`,
  date: `2024-0${index + 1}-01`, fertility: index + 1, life_expect: 60 + index,
  country: group, year: 2000 + index, column: index, row: group,
  Released_Year: 2000 + index, IMDB_Rating: 6 + index / 10,
  Series_Title: `Film ${group}${index}`
})));

export const docInputs = {
  values: { values: observations },
  horizon: { values: observations.filter(row => row.group === "A") },
  intervals: { values: observations.flatMap(row => [row, { ...row, value: row.value + 1 }]) },
  cars: { cars: dataset("cars").filter(row =>
    ["Horsepower", "Miles_per_Gallon", "Weight_in_lbs", "Acceleration", "Displacement", "Cylinders"]
      .every(field => Number.isFinite(row[field]))) },
  observations: { observations },
  cells: { cells: observations },
  films: { films: observations },
  composition: { pointRows: observations, barRows: observations },
  rose: { nightingaleRows: dataset("nightingale_rose") }
};

export function datasetValues(name) { return dataset(name); }
