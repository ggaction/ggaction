import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { createCarsHistogram } from "../../examples/cars-histogram/program.js";
import { createJobsGroupedBar } from "../../examples/jobs-grouped-bar/program.js";
import { loadCars, loadJobs } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const CURRENT = Object.freeze([
  "createScatterPlot", "createLinePlot", "createBarPlot", "createHistogram"
]);

test("promotes the approved P2-C bar and histogram facades to Current", () => {
  const current = new Set(index.actions.map(action => action.name));
  for (const name of CURRENT) {
    assert.equal(current.has(name), true, name);
    assert.equal(typeof ChartProgram.prototype[name], "function", name);
    assert.match(declarations, new RegExp(`^  ${name}\\(`, "m"), name);
  }
});

test("records the exact P2-C wrapped action hierarchies", () => {
  const bar = createJobsGroupedBar(loadJobs()).trace.children[2];
  const histogram = createCarsHistogram(loadCars()).trace.children[2];
  assert.deepEqual(bar.children.map(child => child.op), [
    "createBarMark", "encodeX", "encodeY", "encodeColor",
    "encodeBarWidth", "createGuides"
  ]);
  assert.deepEqual(histogram.children.map(child => child.op), [
    "createBarMark", "encodeHistogram", "encodeColor", "createGuides"
  ]);
});
