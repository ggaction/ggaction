import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createCarsHistogram } from "../../examples/cars-histogram/program.js";
import { createCarsBoxPlot } from "../../examples/cars-box-plot/program.js";
import { createCarsGradientPlot } from "../../examples/cars-gradient-plot/program.js";
import { createCarsLineChart } from "../../examples/cars-line-chart/program.js";
import { createCarsParallelCoordinates } from
  "../../examples/cars-parallel-coordinates/program.js";
import { createCarsScatterplot } from "../../examples/cars-scatterplot/program.js";
import { createGapminderLifeExpectancyHeatmap } from
  "../../examples/gapminder-life-expectancy-heatmap/program.js";
import { createJobsGroupedBar } from "../../examples/jobs-grouped-bar/program.js";
import { loadCars, loadGapminder, loadJobs } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const FACADE_CONTRACTS = Object.freeze([
  ["createScatterPlot", "CreateScatterPlotOptions", "BASIC_CHARTS.md"],
  ["createLinePlot", "CreateLinePlotOptions", "BASIC_CHARTS.md"],
  ["createBarPlot", "CreateBarPlotOptions", "BASIC_CHARTS.md"],
  ["createHistogram", "CreateHistogramOptions", "BASIC_CHARTS.md"],
  ["createHeatmap", "CreateHeatmapOptions", "BASIC_CHARTS.md"],
  ["createGradientPlot", "GradientPlotOptions", "GRADIENT_PLOTS.md"],
  ["createBoxPlot", "BoxPlotOptions", "COMPOSITE_MARKS.md"],
  ["createParallelCoordinates", "CreateParallelCoordinatesOptions", "BASIC_CHARTS.md"]
]);
const FACADE_ACTIONS = Object.freeze(FACADE_CONTRACTS.map(([name]) => name));

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

function createFacadePrograms() {
  const cars = loadCars();
  return [
    createCarsScatterplot(cars),
    createCarsLineChart(cars),
    createJobsGroupedBar(loadJobs()),
    createCarsHistogram(cars),
    createGapminderLifeExpectancyHeatmap(loadGapminder()),
    createCarsGradientPlot(cars),
    createCarsBoxPlot(cars),
    createCarsParallelCoordinates(cars)
  ];
}

test("keeps every basic chart facade in one canonical Current owner", () => {
  const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
  for (const [name, , owner] of FACADE_CONTRACTS) {
    const current = index.actions.filter(action => action.name === name);
    assert.equal(current.length, 1, name);
    assert.equal(current[0].status, "implemented", name);
    assert.equal(current[0].contract.file,
      `agent_docs/contract/current/${owner}`, name);
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

test("keeps every facade declaration and current root type export exact", () => {
  const programTypes = read("types/program.d.ts");
  const rootTypes = read("types/index.d.ts");
  for (const [name, optionType, , contract = {}] of FACADE_CONTRACTS) {
    const optional = ["createGradientPlot", "createBoxPlot"].includes(name)
      ? "\\?"
      : "";
    assert.match(programTypes, new RegExp(
      `^  ${name}\\(options${optional}: ${optionType}\\)`,
      "m"
    ));
    if (contract.rootTypeExport !== false) {
      assert.match(rootTypes, new RegExp(`^  ${optionType},?$`, "m"));
    }
  }
});

test("keeps every facade program in its canonical chart slice", () => {
  const programs = createFacadePrograms();
  for (const [index, program] of programs.entries()) {
    assert.equal(
      program.trace.children.find(node => node.op === FACADE_ACTIONS[index])?.op,
      FACADE_ACTIONS[index]
    );
  }
});

test("hands every facade result to its documented resource edit path", () => {
  const edits = [
    ["editPointMark", program => program.editPointMark({
      target: "points", opacity: 0.4
    })],
    ["editLineMark", program => program.editLineMark({
      target: "trends", strokeWidth: 4
    })],
    ["editBarMark", program => program.editBarMark({
      target: "bars", opacity: 0.55
    })],
    ["editBarMark", program => program.editBarMark({
      target: "bars", opacity: 0.55
    })],
    ["editRectMark", program => program.editRectMark({
      target: "rect", opacity: 0.55
    })],
    ["editGradientPlot", program => program.editGradientPlot({
      target: "gradientPlot", width: { band: 0.55 }
    })],
    ["editBoxPlot", program => program.editBoxPlot({
      target: "boxPlot", width: { band: 0.55 }
    })],
    ["editLineMark", program => program.editLineMark({
      target: "parallelCoordinates", opacity: 0.3
    })]
  ];

  for (const [index, program] of createFacadePrograms().entries()) {
    const before = structuredClone(program.graphicSpec);
    const [operation, edit] = edits[index];
    const edited = edit(program);
    assert.deepEqual(program.graphicSpec, before, FACADE_ACTIONS[index]);
    assert.notDeepEqual(edited.graphicSpec, program.graphicSpec, FACADE_ACTIONS[index]);
    assert.equal(edited.trace.children.at(-1).op, operation, FACADE_ACTIONS[index]);
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
