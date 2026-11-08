import { chart } from "../../src/index.js";

export const REGIONS = Object.freeze([
  "South Asia",
  "Europe & Central Asia",
  "Sub-Saharan Africa",
  "Americas",
  "East Asia & Pacific",
  "Middle East & North Africa"
]);
const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"];

// Gapminder 2005 populations grouped by the dataset's six regional clusters.
export function populationRows(gapminder) {
  return gapminder
    .filter(row => row.year === 2005)
    .map(row => ({ region: REGIONS[row.cluster], country: row.country, population: row.pop }));
}

// Region cells are pale, country cells strong; labels name places, not raw counts.
function paint(rows, regionOpacity, countryOpacity) {
  return REGIONS.flatMap((region, index) => [
    { path: [region], fill: COLORS[index], opacity: regionOpacity },
    ...rows.filter(row => row.region === region)
      .map(row => ({ path: [region, row.country], fill: COLORS[index], opacity: countryOpacity }))
  ]);
}

function names(rows, minimumPopulation) {
  return [
    ...REGIONS.map(region => ({ path: [region], text: region })),
    ...rows.map(row => ({
      path: [row.region, row.country],
      text: row.population >= minimumPopulation ? row.country : ""
    }))
  ];
}

export function createWorldPopulationTreemap(gapminder) {
  const rows = populationRows(gapminder);
  return chart()
    .createCanvas({ width: 960, height: 600, margin: { top: 80, right: 20, bottom: 20, left: 20 } })
    .createData({ id: "population", values: rows })
    .createHierarchyData({ id: "regions", data: "population", groupFields: ["region", "country"], value: "population" })
    .layoutHierarchy({ id: "treemap", method: "treemap", options: { size: [920, 500], padding: 18, method: "squarify" } })
    .createTreemapPlot({
      cells: { stroke: "#ffffff", strokeWidth: 1.5, overrides: paint(rows, 0.2, 0.85) },
      labels: { fontSize: 11, fill: "#0f172a", overrides: names(rows, 40e6) }
    })
    .createTitle({
      text: "Where the world's people lived in 2005",
      subtitle: "62 Gapminder countries · rectangle area is population · grouped by region"
    });
}

export function createWorldPopulationSunburst(gapminder) {
  const rows = populationRows(gapminder);
  return chart()
    .createCanvas({ width: 760, height: 640, margin: { top: 80, right: 20, bottom: 20, left: 20 } })
    .createData({ id: "population", values: rows })
    .createHierarchyData({ id: "regions", data: "population", groupFields: ["region", "country"], value: "population" })
    .layoutHierarchy({ id: "partition", method: "partition" })
    .createCoordinate({ id: "rings", type: "polar" })
    .createPartitionPlot({
      layout: "partition",
      coordinate: "rings",
      rootVisible: false,
      innerRadius: 60,
      outerRadius: 260,
      padding: [1, 1],
      cells: { stroke: "#ffffff", strokeWidth: 1, overrides: paint(rows, 0.95, 0.6) },
      labels: { fontSize: 10, minArcLength: 30, overrides: names(rows, 60e6) }
    })
    .createTitle({
      text: "World population by region and country, 2005",
      subtitle: "Inner ring: region · outer ring: country · angle is population"
    });
}
