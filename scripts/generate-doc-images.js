import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { renderToPNG } from "ggaction/png";

import { createCarsDensityArea } from "../examples/cars-density-area/program.js";
import { createCarsHistogram } from "../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../examples/cars-line-chart/program.js";
import { createCarsRegressionScatterplot } from
  "../examples/cars-regression-scatterplot/program.js";
import { createCarsScatterplot } from "../examples/cars-scatterplot/program.js";
import { createJobsGroupedBar } from "../examples/jobs-grouped-bar/program.js";

const cars = JSON.parse(
  await readFile(new URL("../data/cars.json", import.meta.url), "utf8")
);
const jobs = JSON.parse(
  await readFile(new URL("../data/jobs.json", import.meta.url), "utf8")
);

export const chartImages = [
  {
    id: "cars-scatterplot",
    width: 640,
    height: 400,
    createProgram: () => createCarsScatterplot(cars)
  },
  {
    id: "cars-line-chart",
    width: 720,
    height: 460,
    createProgram: () => createCarsLineChart(cars)
  },
  {
    id: "cars-histogram",
    width: 432,
    height: 460,
    createProgram: () => createCarsHistogram(cars)
  },
  {
    id: "jobs-grouped-bar",
    width: 720,
    height: 460,
    createProgram: () => createJobsGroupedBar(jobs)
  },
  {
    id: "cars-regression-scatterplot",
    width: 760,
    height: 480,
    createProgram: () => createCarsRegressionScatterplot(cars)
  },
  {
    id: "cars-density-area",
    width: 720,
    height: 500,
    createProgram: () => createCarsDensityArea(cars)
  }
];

export async function generateDocImages() {
  for (const chart of chartImages) {
    const output = fileURLToPath(
      new URL(`../docs/assets/images/${chart.id}.png`, import.meta.url)
    );
    await renderToPNG(chart.createProgram(), { output, pixelRatio: 2 });
    process.stdout.write(`generated ${chart.id}.png\n`);
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateDocImages();
}
