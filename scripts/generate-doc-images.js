import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { renderToPNG } from "ggaction/png";

import { createCarsDensityArea } from "../examples/cars-density-area/program.js";
import { createCarsErrorBar } from "../examples/cars-error-bar/program.js";
import { createCarsBoxPlot } from "../examples/cars-box-plot/program.js";
import { createCarsHistogram } from "../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../examples/cars-line-chart/program.js";
import { createCarsRegressionScatterplot } from
  "../examples/cars-regression-scatterplot/program.js";
import { createCarsScatterplot } from "../examples/cars-scatterplot/program.js";
import { createJobsGroupedBar } from "../examples/jobs-grouped-bar/program.js";
import { createGapminderErrorBand } from
  "../examples/gapminder-error-band/program.js";

const cars = JSON.parse(
  await readFile(new URL("../data/cars.json", import.meta.url), "utf8")
);
const jobs = JSON.parse(
  await readFile(new URL("../data/jobs.json", import.meta.url), "utf8")
);
const gapminder = JSON.parse(
  await readFile(new URL("../data/gapminder.json", import.meta.url), "utf8")
);

export const chartImages = [
  {
    id: "cars-scatterplot",
    width: 640,
    height: 400,
    programFile: new URL("../examples/cars-scatterplot/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsScatterplot(cars)
  },
  {
    id: "cars-line-chart",
    width: 720,
    height: 460,
    programFile: new URL("../examples/cars-line-chart/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsLineChart(cars)
  },
  {
    id: "cars-histogram",
    width: 432,
    height: 460,
    programFile: new URL("../examples/cars-histogram/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsHistogram(cars)
  },
  {
    id: "jobs-grouped-bar",
    width: 720,
    height: 460,
    programFile: new URL("../examples/jobs-grouped-bar/program.js", import.meta.url),
    dataFile: new URL("../data/jobs.json", import.meta.url),
    createProgram: () => createJobsGroupedBar(jobs)
  },
  {
    id: "cars-regression-scatterplot",
    width: 760,
    height: 480,
    programFile: new URL(
      "../examples/cars-regression-scatterplot/program.js",
      import.meta.url
    ),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsRegressionScatterplot(cars)
  },
  {
    id: "cars-density-area",
    width: 720,
    height: 500,
    programFile: new URL("../examples/cars-density-area/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsDensityArea(cars)
  },
  {
    id: "cars-error-bar",
    width: 720,
    height: 460,
    programFile: new URL("../examples/cars-error-bar/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsErrorBar(cars)
  },
  {
    id: "cars-box-plot",
    width: 360,
    height: 460,
    programFile: new URL("../examples/cars-box-plot/program.js", import.meta.url),
    dataFile: new URL("../data/cars.json", import.meta.url),
    createProgram: () => createCarsBoxPlot(cars)
  },
  {
    id: "gapminder-error-band",
    width: 760,
    height: 480,
    programFile: new URL(
      "../examples/gapminder-error-band/program.js",
      import.meta.url
    ),
    dataFile: new URL("../data/gapminder.json", import.meta.url),
    createProgram: () => createGapminderErrorBand(gapminder)
  }
];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = resolve(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  }));
  return nested.flat().filter(file => file.endsWith(".js")).sort();
}

export async function buildDocImageManifest() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const sharedFiles = [
    ...(await sourceFiles(resolve(root, "src"))),
    resolve(root, "package-lock.json")
  ];
  const shared = createHash("sha256");
  for (const file of sharedFiles) {
    shared.update(relative(root, file));
    shared.update(await readFile(file));
  }
  const sharedHash = shared.digest("hex");

  const charts = {};
  for (const chart of chartImages) {
    const hash = createHash("sha256");
    hash.update(sharedHash);
    hash.update(`${chart.width}x${chart.height}@2`);
    hash.update(await readFile(chart.programFile));
    hash.update(await readFile(chart.dataFile));
    charts[chart.id] = {
      width: chart.width * 2,
      height: chart.height * 2,
      sourceHash: hash.digest("hex")
    };
  }

  return { version: 1, pixelRatio: 2, charts };
}

export async function generateDocImages() {
  for (const chart of chartImages) {
    const output = fileURLToPath(
      new URL(`../docs/assets/images/${chart.id}.png`, import.meta.url)
    );
    await renderToPNG(chart.createProgram(), { output, pixelRatio: 2 });
    process.stdout.write(`generated ${chart.id}.png\n`);
  }
  const manifest = fileURLToPath(
    new URL("../docs/assets/images/manifest.json", import.meta.url)
  );
  await writeFile(manifest, `${JSON.stringify(await buildDocImageManifest(), null, 2)}\n`);
  process.stdout.write("generated docs image manifest\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateDocImages();
}
