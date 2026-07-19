import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { visualVariants } from
  "../charts/cross-feature-integration/manifest.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const read = file => readFileSync(path.join(root, file), "utf8");
const index = JSON.parse(read("agent_docs/contract/ACTION_INDEX.json"));
const inventory = JSON.parse(read(
  "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"
));
const matrix = JSON.parse(read(
  "agent_docs/impl/roadmap3/phase10/INTEGRATION_MATRIX.json"
));
const declarations = read("types/program.d.ts");
const declarationIndex = read("types/index.d.ts");
const packageManifest = JSON.parse(read("package.json"));
const currentComposition = read("agent_docs/contract/current/COMPOSITION.md");
const publicComposition = read("docs/api/composition.md");
const architecture = read("agent_docs/SECOND_ARCHITECTURE.md");

test("leaves no Roadmap 3 Phase 10 capability in Planned inventory", () => {
  const assigned = inventory.proposedCapabilities
    .filter(capability => capability.phase === "phase10")
    .map(capability => capability.id);
  const planned = new Set(
    index.plannedCapabilities.map(capability => capability.id)
  );

  assert.deepEqual(assigned, [
    "shared-position-scale-resolution",
    "cross-feature-integration"
  ]);
  for (const id of assigned) assert.equal(planned.has(id), false, id);
  const roadmap3Actions = new Set(
    inventory.proposedActions.map(action => action.name)
  );
  const roadmap3Capabilities = new Set([
    ...inventory.proposedOperations.map(operation => operation.name),
    ...inventory.parameterExtensions.map(extension => extension.id),
    ...inventory.proposedCapabilities.map(capability => capability.id)
  ]);
  for (const action of index.plannedActions) {
    assert.equal(roadmap3Actions.has(action.name), false, action.name);
  }
  for (const capability of index.plannedCapabilities) {
    assert.equal(roadmap3Capabilities.has(capability.id), false, capability.id);
  }
});

test("locks composition into exact declarations and public package exports", () => {
  assert.match(declarationIndex, /export function hconcat\(options: CompositionOptions\)/);
  assert.match(declarationIndex, /export function vconcat\(options: CompositionOptions\)/);
  assert.match(declarations, /facet\(options: FacetOptions\): ChartProgram/);
  assert.match(
    declarations,
    /replaceCompositionChild\(options: ReplaceCompositionChildOptions\): ChartProgram/
  );
  assert.match(
    declarations,
    /editCompositionLayout\(options: EditCompositionLayoutOptions\): ChartProgram/
  );
  assert.deepEqual(Object.keys(packageManifest.exports), [
    ".", "./extension", "./png"
  ]);
});

test("records the complete integration boundary in Current and public docs", () => {
  assert.match(currentComposition, /complete Cartesian or Polar unit program/);
  assert.match(currentComposition, /explicit at every ancestor/);
  assert.match(publicComposition, /complete Cartesian or Polar chart/);
  assert.match(publicComposition, /Polar sources cannot currently be faceted/);
  assert.match(architecture, /nested Cartesian and Polar compositions/);
  assert.doesNotMatch(architecture, /program composition[\s\S]*not implemented/i);
});

test("closes every Phase 10 integration matrix row with executable evidence", () => {
  assert.equal(matrix.phase, "phase10");
  for (const entry of matrix.cases) {
    assert.equal(
      ["current-pass", "current-explicit-error"].includes(entry.status),
      true,
      entry.id
    );
    assert.equal(typeof entry.evidence, "string", entry.id);
    assert.equal(existsSync(path.join(root, entry.evidence)), true, entry.id);
  }
});

test("keeps the approved cross-feature visuals paired", () => {
  assert.deepEqual(visualVariants.map(variant => variant.variant), [
    "nested-polar-replacement",
    "phase10-outer-guides"
  ]);
  for (const variant of visualVariants) {
    assert.equal(variant.artifact.phase, "phase10");
    assert.equal(variant.artifact.capability, "cross-feature-integration");
    assert.equal(typeof variant.primitive, "function");
    assert.equal(typeof variant.userFacing, "function");
  }
});
