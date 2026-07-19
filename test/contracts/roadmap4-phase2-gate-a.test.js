import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const proposals = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/impl/roadmap4/phase2/PROPOSALS.json"
), "utf8"));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");

const ACTIONS = Object.freeze([
  "createScatterPlot",
  "createLinePlot",
  "createBarPlot",
  "createHistogram",
  "createHeatmap"
]);
const CURRENT = new Set([
  "createScatterPlot", "createLinePlot", "createBarPlot", "createHistogram",
  "createHeatmap"
]);

test("keeps the Phase 2 Gate A facade proposal exact and reviewable", () => {
  assert.equal(proposals.version, 1);
  assert.equal(proposals.phase, "roadmap4/phase2");
  assert.equal(proposals.gate, "P2-A");
  assert.equal(proposals.status, "approved");
  assert.deepEqual(proposals.actions.map(action => action.name), ACTIONS);
  assert.equal(new Set(proposals.actions.map(action => action.defaultId)).size, 5);
  for (const action of proposals.actions) {
    assert.equal(action.status, CURRENT.has(action.name) ? "implemented" : "planned");
    assert.equal(action.required.length > 0, true, action.name);
    assert.equal(action.children.length > 0, true, action.name);
    assert.equal(existsSync(path.join(root, action.contract)), true, action.contract);
  }
});

test("tracks approved Phase 2 facade candidates through current and planned states", () => {
  const current = new Set(index.actions.map(action => action.name));
  const planned = new Set(index.plannedActions.map(action => action.name));
  for (const name of ACTIONS) {
    assert.equal(current.has(name), CURRENT.has(name), name);
    assert.equal(planned.has(name), !CURRENT.has(name), name);
    assert.equal(typeof ChartProgram.prototype[name], CURRENT.has(name) ? "function" : "undefined", name);
    const pattern = new RegExp(`^  ${name}\\(`, "m");
    if (CURRENT.has(name)) assert.match(declarations, pattern, name);
    else assert.doesNotMatch(declarations, pattern, name);
  }
});
