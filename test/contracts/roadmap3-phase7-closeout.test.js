import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chart } from "../../src/index.js";
import { visualVariants } from "../gates/direct-source-facet/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = file => readFileSync(path.join(root, file), "utf8");
const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
const inventory = JSON.parse(read(
  "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"
));
const declarations = read("types/program.d.ts");
const declarationIndex = read("types/index.d.ts");
const currentContract = read("agent_docs/contract/current/COMPOSITION.md");
const publicDocs = read("docs/api/composition.md");

test("leaves no Phase 7 action or capability in Planned inventory", () => {
  const assignedActions = inventory.proposedActions
    .filter(action => action.phase === "phase7")
    .map(action => action.name);
  const assignedCapabilities = inventory.proposedCapabilities
    .filter(capability => capability.phase === "phase7")
    .map(capability => capability.id);
  const plannedActions = new Set(index.plannedActions.map(action => action.name));
  const plannedCapabilities = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );

  for (const name of assignedActions) {
    assert.equal(plannedActions.has(name), false, name);
  }
  for (const id of assignedCapabilities) {
    assert.equal(plannedCapabilities.has(id), false, id);
  }
});

test("locks the direct-source facet public surface into Current", () => {
  const current = new Set(index.actions.map(action => action.name));
  const program = chart();

  assert.equal(typeof program.facet, "function");
  assert.equal(typeof program.editFacetHeaders, "function");
  assert.equal(current.has("facet"), true);
  assert.equal(current.has("editFacetHeaders"), true);
  assert.match(declarations, /facet\(options: FacetOptions\): ChartProgram/);
  assert.match(
    declarations,
    /editFacetHeaders\(options: EditFacetHeadersOptions\): ChartProgram/
  );
  assert.match(declarationIndex, /FacetOptions/);
  assert.match(declarationIndex, /EditFacetHeadersOptions/);
  assert.match(currentContract, /## `facet`/);
  assert.match(currentContract, /## `editFacetHeaders`/);
  assert.match(publicDocs, /## Repeat the current chart by a field/);
});

test("locks every approved facet target to an exact public rendering pair", () => {
  assert.deepEqual(
    visualVariants.map(variant => `${variant.chart}/${variant.variant}`),
    [
      "cars-origin-scatterplot-facet/default-one-row",
      "cars-origin-histogram-facet/two-column-wrap"
    ]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase7");
    assert.equal(variant.artifact.capability, "direct-source-facet");
    assert.equal(typeof variant.userFacing, "function");
  }
});
