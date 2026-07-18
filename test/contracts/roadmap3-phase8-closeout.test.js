import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants } from "../gates/facet-resolution/manifest.js";

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
const architecture = read("agent_docs/SECOND_ARCHITECTURE.md");

test("leaves no Phase 8 capability in Planned inventory", () => {
  const assigned = [
    ...inventory.parameterExtensions,
    ...inventory.proposedCapabilities
  ].filter(capability => capability.phase === "phase8")
    .map(capability => capability.id);
  const planned = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );

  assert.deepEqual(assigned, [
    "facet-scale-resolution",
    "derived-facet-replay",
    "parent-guide-composition"
  ]);
  for (const id of assigned) assert.equal(planned.has(id), false, id);
});

test("locks the advanced facet surface into exact types and Current docs", () => {
  assert.match(
    declarations,
    /export interface FacetGuideOptions \{[\s\S]*axes\?: "each" \| "outer";[\s\S]*legend\?: false \| "shared";/
  );
  assert.match(declarations, /guides\?: FacetGuideOptions/);
  assert.match(declarationIndex, /FacetGuideOptions/);
  assert.match(currentContract, /density\/interval\/box dependency replay/);
  assert.match(currentContract, /occupied-edge outer axes/);
  assert.match(publicDocs, /bottommost occupied cell in each column/);
  assert.match(publicDocs, /gradient, discretized-color, size, or opacity/);
  assert.match(architecture, /`composeFacetGuides` wrapped action/);
  assert.equal(index.internal.stateTransitions.includes("composeFacetGuides"), true);
});

test("locks all Phase 8 visual targets to primitive and public pairs", () => {
  assert.deepEqual(
    visualVariants.map(variant => variant.variant),
    ["shared-scales", "independent-x", "outer-guides"]
  );
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase8");
    assert.equal(variant.artifact.capability, "facet-resolution");
    assert.equal(typeof variant.userFacing, "function");
  }
});
