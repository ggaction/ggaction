import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCarsHistogram } from "../../examples/cars-histogram/program.js";
import { createCarsLineChart } from "../../examples/cars-line-chart/program.js";
import { createCarsScatterplot } from "../../examples/cars-scatterplot/program.js";
import { createGapminderLifeExpectancyHeatmap } from
  "../../examples/gapminder-life-expectancy-heatmap/program.js";
import { createJobsGroupedBar } from "../../examples/jobs-grouped-bar/program.js";
import { loadCars, loadGapminder, loadJobs } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const FACADE_ACTIONS = Object.freeze([
  "createScatterPlot",
  "createLinePlot",
  "createBarPlot",
  "createHistogram",
  "createHeatmap"
]);
const OPTION_TYPES = Object.freeze([
  "CreateScatterPlotOptions",
  "CreateLinePlotOptions",
  "CreateBarPlotOptions",
  "CreateHistogramOptions",
  "CreateHeatmapOptions"
]);

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function javascriptFiles(directory) {
  return readdirSync(directory).flatMap(name => {
    const entry = path.join(directory, name);
    if (statSync(entry).isDirectory()) {
      return javascriptFiles(entry);
    }
    return entry.endsWith(".js") ? [entry] : [];
  });
}

test("closes every Phase 2 facade into one Current contract and no Planned entry", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  for (const name of FACADE_ACTIONS) {
    const current = index.actions.filter(action => action.name === name);
    assert.equal(current.length, 1, name);
    assert.equal(current[0].status, "implemented", name);
    assert.equal(current[0].contract.file,
      "agent_docs/contract/current/BASIC_CHARTS.md", name);
    assert.equal(index.plannedActions.some(action => action.name === name), false, name);
    assert.equal(index.plannedCapabilities.some(capability =>
      capability.name === name || capability.actions?.includes(name)
    ), false, name);
  }
  assert.equal(existsSync(path.join(
    root,
    "agent_docs/contract/planned/BASIC_CHARTS.md"
  )), false);
});

test("keeps the five facade declarations and root type exports exact", () => {
  const programTypes = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");
  for (const [index, name] of FACADE_ACTIONS.entries()) {
    assert.match(programTypes, new RegExp(`^  ${name}\\(options: ${OPTION_TYPES[index]}\\)`, "m"));
    assert.match(rootTypes, new RegExp(`^  ${OPTION_TYPES[index]},?$`, "m"));
  }
});

test("promotes every approved facade program into its canonical chart slice", () => {
  const cars = loadCars();
  const programs = [
    createCarsScatterplot(cars),
    createCarsLineChart(cars),
    createJobsGroupedBar(loadJobs()),
    createCarsHistogram(cars),
    createGapminderLifeExpectancyHeatmap(loadGapminder())
  ];
  for (const [index, program] of programs.entries()) {
    assert.equal(program.trace.children[2].op, FACADE_ACTIONS[index]);
  }
  for (const directory of [
    "basic-chart-facades",
    "basic-bar-histogram-facades",
    "basic-heatmap-facade"
  ]) {
    assert.equal(existsSync(path.join(root, "test/gates", directory)), false, directory);
  }
});

test("keeps facade-specific branches out of materialization and renderers", () => {
  const forbidden = new RegExp(FACADE_ACTIONS.join("|"));
  for (const owner of ["src/materialization", "src/renderers"]) {
    for (const file of javascriptFiles(path.join(root, owner))) {
      assert.doesNotMatch(readFileSync(file, "utf8"), forbidden, file);
    }
  }
  for (const file of javascriptFiles(path.join(root, "src/actions/charts"))) {
    if (file.endsWith("shared.js") || file.endsWith("index.js")) {
      continue;
    }
    assert.doesNotMatch(readFileSync(file, "utf8"),
      /\.editSemantic\(|\.createGraphics\(|\.editGraphics\(|\._clone\(/,
      file);
  }
});
