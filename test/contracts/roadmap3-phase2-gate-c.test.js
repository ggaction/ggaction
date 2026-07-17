import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ChartProgram } from "../../src/ChartProgram.js";
import { visualVariants } from "../charts/polar-points/variants/manifest.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const inventory = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"
), "utf8"));
const index = JSON.parse(readFileSync(path.join(
  root,
  "agent_docs/contract/ACTION_INDEX.json"
), "utf8"));
const declarations = readFileSync(path.join(root, "types/program.d.ts"), "utf8");

const ACTIONS = Object.freeze(["encodeTheta", "encodeR", "encodePointRadius"]);
const CAPABILITIES = Object.freeze(["polar-point"]);

test("locks the exact Phase 2 Gate A assignment", () => {
  assert.deepEqual(
    inventory.proposedActions
      .filter(action => action.phase === "phase2")
      .map(action => action.name),
    ACTIONS
  );
  assert.deepEqual(
    inventory.proposedCapabilities
      .filter(capability => capability.phase === "phase2")
      .map(capability => capability.id),
    CAPABILITIES
  );
});

test("promotes every approved Phase 2 action to the current public surface", () => {
  const planned = new Set(index.plannedActions.map(action => action.name));
  const current = new Set(index.actions.map(action => action.name));
  for (const action of ACTIONS) {
    assert.equal(planned.has(action), false, action);
    assert.equal(current.has(action), true, action);
    assert.equal(typeof ChartProgram.prototype[action], "function", action);
    assert.match(declarations, new RegExp(`^  ${action}\\(`, "m"), action);
  }
  const plannedCapabilities = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );
  for (const capability of CAPABILITIES) {
    assert.equal(plannedCapabilities.has(capability), false, capability);
  }
});

test("registers exactly two approved primitive/public Phase 2 pairs", () => {
  assert.deepEqual(
    visualVariants.map(variant => `${variant.chart}/${variant.variant}`),
    [
      "cars-polar-scatterplot/baseline",
      "fashion-tsne-polar-points/dense-negative-domain"
    ]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase2");
    assert.equal(variant.artifact.capability, "polar-point");
    assert.equal(typeof variant.userFacing, "function");
  }
});
