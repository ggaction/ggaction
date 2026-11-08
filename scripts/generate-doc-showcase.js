import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SHOWCASE_CHARTS } from "../examples/registry.js";

const root = fileURLToPath(new URL("../", import.meta.url));

// The pages that show each real-data showcase chart: its API page and, for a
// chart family with a tutorial, the tutorial that opens with it.
export const SHOWCASE_PAGES = Object.freeze({
  "gapminder-bubbles": "docs/tutorials/interactive-chart.md",
  "world-gdp-map": ["docs/api/geometry.md", "docs/tutorials/geographic-marks.md"],
  "world-earthquakes-map": "docs/api/geometry.md",
  "global-temperature-heatmap": "docs/api/basic-charts.md",
  "us-births-calendar": ["docs/api/calendar.md", "docs/tutorials/calendar.md"],
  "penguin-density-contours": ["docs/api/contours.md", "docs/tutorials/contours.md"],
  "penguin-sankey": ["docs/api/flows.md", "docs/tutorials/flows.md"],
  "country-similarity-network": ["docs/api/graphs.md", "docs/tutorials/graphs.md"],
  "world-population-treemap": ["docs/api/hierarchy.md", "docs/tutorials/hierarchy.md"],
  "world-population-sunburst": ["docs/api/partition.md", "docs/tutorials/partition.md"],
  "flare-radial-tree": "docs/api/hierarchy.md",
  "ibm-candlesticks": ["docs/api/ohlc.md", "docs/tutorials/ohlc.md"],
  "temperature-waterfall": ["docs/api/waterfall.md", "docs/tutorials/waterfall.md"],
  "gapminder-life-trails": ["docs/api/trail.md", "docs/tutorials/trail.md"],
  "gapminder-country-table": ["docs/api/table.md", "docs/tutorials/table.md"],
  "penguin-mass-raincloud": "docs/api/distribution-plots.md",
  "penguin-flipper-beeswarm": "docs/api/distribution-plots.md",
  "cars-mpg-ecdf": "docs/tutorials/ecdf.md",
  "life-expectancy-dumbbell": "docs/tutorials/endpoint-plots.md",
  "fertility-lollipop": "docs/tutorials/endpoint-plots.md"
});

const DATASETS = Object.freeze({
  worldCountries: "the parsed GeoJSON of `data/showcase/countries-110m.geojson` (Natural Earth, public domain)",
  earthquakes: "the parsed GeoJSON of `data/showcase/earthquakes-2024-01.geojson` (USGS, public domain)",
  globalTemperatures: "the rows of `data/showcase/global-temperatures.csv` (NASA GISTEMP, public domain) with numeric fields parsed",
  usBirths: "the rows of `data/showcase/us-births-2000-2014.csv` (FiveThirtyEight, CC BY 4.0) with numeric fields parsed",
  penguins: "the rows of `data/showcase/penguins.csv` (palmerpenguins, CC0) with numbers parsed and `NA` read as `null`",
  flare: "the array in `data/showcase/flare.json` (Flare toolkit class hierarchy, BSD-3-Clause)",
  ibmDaily: "the parsed JSON response in `data/showcase/ibm-daily.json` (Alpha Vantage demo endpoint)",
  gapminder: "the rows of `data/gapminder.json` (Gapminder)",
  cars: "the rows of `data/cars.json` (1970–1982 car models)"
});

function dataSentence(chart) {
  if (typeof chart.data === "string") return `It receives ${DATASETS[chart.data]}.`;
  const parts = Object.entries(chart.data).map(([key, id]) => `\`${key}\` is ${DATASETS[id]}`);
  return `It receives one object: ${parts.join("; ")}.`;
}

export async function showcaseDisplay(chart) {
  const code = await readFile(chart.programFile, "utf8");
  return code.replaceAll('from "../../src/index.js"', 'from "ggaction"').trim();
}

/** Every generated showcase code block, keyed by its exact displayed source. */
export async function showcaseDisplays() {
  return new Set(await Promise.all(SHOWCASE_CHARTS.map(showcaseDisplay)));
}

async function section(chart) {
  const name = chart.createProgram.name;
  return [
    `<!-- showcase-program:${chart.id}:start -->`,
    "",
    `{% include chart-example.html id="${chart.id}" %}`,
    "",
    `\`${name}\` builds this chart from real data. ${dataSentence(chart)}`,
    "Draw the returned program with `render` in a browser or `renderToPNG` in Node.",
    "",
    "```javascript",
    await showcaseDisplay(chart),
    "```",
    "",
    `<!-- showcase-program:${chart.id}:end -->`
  ].join("\n");
}

export async function generateDocShowcase({ check = false } = {}) {
  const pages = new Map();
  for (const chart of SHOWCASE_CHARTS) {
    const owners = SHOWCASE_PAGES[chart.id];
    if (owners === undefined) throw new Error(`Showcase chart "${chart.id}" needs an owning page.`);
    for (const relative of [owners].flat()) {
    const file = path.join(root, relative);
    const source = pages.get(file) ?? await readFile(file, "utf8");
    const pattern = new RegExp(
      `<!-- showcase-program:${chart.id}:start -->[\\s\\S]*?<!-- showcase-program:${chart.id}:end -->`
    );
    if (!pattern.test(source)) throw new Error(`${relative} needs the ${chart.id} showcase marker.`);
    const replacement = await section(chart);
    pages.set(file, source.replace(pattern, () => replacement));
    }
  }
  for (const [file, expected] of pages) {
    const current = await readFile(file, "utf8");
    if (check && current !== expected) {
      throw new Error(`${path.relative(root, file)} has a stale showcase program. Run npm run docs:workflows.`);
    }
    if (!check && current !== expected) await writeFile(file, expected);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocShowcase({ check: process.argv.includes("--check") });
}
