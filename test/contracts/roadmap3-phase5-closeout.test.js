import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants } from "../charts/polar-arcs/manifest.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const inventory = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");
const markContract = readFileSync(path.join(
  root,
  "agent_docs/contract/current/MARKS.md"
), "utf8");
const selectionContract = readFileSync(path.join(
  root,
  "agent_docs/contract/current/MARK_SELECTION.md"
), "utf8");
const polarPlan = readFileSync(path.join(
  root,
  "agent_docs/contract/planned/ROADMAP3_POLAR.md"
), "utf8");

test("leaves no Phase 5 action or capability in Planned inventory", () => {
  const assignedActions = inventory.proposedActions
    .filter(action => action.phase === "phase5")
    .map(action => action.name);
  const assignedCapabilities = inventory.proposedCapabilities
    .filter(capability => capability.phase === "phase5")
    .map(capability => capability.id);
  const plannedActions = new Set(index.plannedActions.map(action => action.name));
  const plannedCapabilities = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );

  for (const name of assignedActions) assert.equal(plannedActions.has(name), false, name);
  for (const id of assignedCapabilities) {
    assert.equal(plannedCapabilities.has(id), false, id);
  }
});

test("promotes the implemented arc actions and defers unneeded endpoints explicitly", () => {
  const current = new Set(index.actions.map(action => action.name));
  assert.equal(current.has("createArcMark"), true);
  assert.equal(current.has("editArcMark"), true);
  assert.match(
    declarations,
    /createArcMark\(options\?: \{[\s\S]*?innerRadius\?: number;[\s\S]*?\}\): ChartProgram;/
  );
  assert.match(
    declarations,
    /editArcMark\(options: \{[\s\S]*?target\?: string;[\s\S]*?\}\): ChartProgram;/
  );
  assert.match(markContract, /## `createArcMark`/);
  assert.match(markContract, /## `editArcMark`/);
  assert.match(polarPlan, /## Maybe Future arc endpoints/);
  assert.match(polarPlan, /encodeTheta2/);
  assert.match(polarPlan, /encodeR2/);
  assert.match(polarPlan, /Status: Maybe Future, NOT IMPLEMENTED/);
});

test("locks the approved arc chart and selection capabilities into Current evidence", () => {
  assert.deepEqual(
    visualVariants.map(variant => `${variant.chart}/${variant.variant}`),
    [
      "cars-origin-donut/count",
      "nightingale-rose-chart/overlay",
      "gapminder-radial-bars/life-expectancy"
    ]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase5");
    assert.equal(variant.artifact.capability, "polar-arcs");
    assert.equal(typeof variant.userFacing, "function");
  }
  assert.match(selectionContract, /arc sector/);
  assert.match(selectionContract, /arc-selection\.test\.js/);
});
