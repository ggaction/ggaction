import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { createGapminderLifeExpectancyHeatmap } from
  "../../examples/gapminder-life-expectancy-heatmap/program.js";
import { loadGapminder } from "../support/data.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const CURRENT = Object.freeze([
  "createScatterPlot", "createLinePlot", "createBarPlot", "createHistogram",
  "createHeatmap"
]);

test("promotes all approved Phase 2 facades to Current", () => {
  const current = new Set(index.actions.map(action => action.name));
  const planned = new Set(index.plannedActions.map(action => action.name));
  for (const name of CURRENT) {
    assert.equal(current.has(name), true, name);
    assert.equal(planned.has(name), false, name);
    assert.equal(typeof ChartProgram.prototype[name], "function", name);
    assert.match(declarations, new RegExp(`^  ${name}\\(`, "m"), name);
  }
});

test("records the exact P2-D wrapped action hierarchy and text non-goal", () => {
  const program = createGapminderLifeExpectancyHeatmap(loadGapminder());
  const heatmap = program.trace.children[2];
  assert.deepEqual(heatmap.children.map(child => child.op), [
    "createRectMark", "encodeX", "encodeY", "encodeColor", "createGuides"
  ]);
  assert.equal(heatmap.children.some(child => child.op === "createTextMark"), false);
  assert.equal(program.trace.children[3].op, "createTextMark");
});
