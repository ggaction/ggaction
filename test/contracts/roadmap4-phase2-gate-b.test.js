import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { createCarsLineChart } from "../../examples/cars-line-chart/program.js";
import { createCarsScatterplot } from "../../examples/cars-scatterplot/program.js";
import { loadCars } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const CURRENT = Object.freeze(["createScatterPlot", "createLinePlot"]);

test("keeps the approved P2-B scatter and line facades Current", () => {
  const current = new Set(index.actions.map(action => action.name));
  for (const name of CURRENT) {
    assert.equal(current.has(name), true, name);
    assert.equal(typeof ChartProgram.prototype[name], "function", name);
    assert.match(declarations, new RegExp(`^  ${name}\\(`, "m"), name);
  }
});

test("records the exact P2-B wrapped action hierarchies", () => {
  const cars = loadCars();
  const scatter = createCarsScatterplot(cars).trace.children[2];
  const line = createCarsLineChart(cars).trace.children[2];
  assert.deepEqual(scatter.children.map(child => child.op), [
    "createPointMark", "encodeX", "encodeY", "encodeColor", "createGuides"
  ]);
  assert.deepEqual(line.children.map(child => child.op), [
    "createLineMark", "encodeX", "encodeY", "encodeColor",
    "encodeStrokeDash", "createGuides"
  ]);
});
