import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const inventory = JSON.parse(readFileSync(
  path.join(root, "agent_docs/impl/roadmap3/phase0/GATE_A_INVENTORY.json"),
  "utf8"
));
const actionIndex = JSON.parse(readFileSync(
  path.join(root, "agent_docs/contract/ACTION_INDEX.json"),
  "utf8"
));
const step = readFileSync(
  path.join(root, "agent_docs/impl/roadmap3/phase0/STEP6.md"),
  "utf8"
);
const polarContract = readFileSync(
  path.join(root, "agent_docs/contract/planned/ROADMAP3_POLAR.md"),
  "utf8"
);

const phases = new Set(Array.from({ length: 10 }, (_, index) => `phase${index + 1}`));

function assertUnique(items, key, label) {
  const values = items.map(item => item[key]);
  assert.equal(new Set(values).size, values.length, `${label} must be unique`);
}

function assertCandidate(candidate, key) {
  assert.equal(typeof candidate[key], "string");
  assert.equal(phases.has(candidate.phase), true, `${candidate[key]} has an invalid phase`);
  assert.equal(
    Object.hasOwn(inventory.evidence, candidate.evidence),
    true,
    `${candidate[key]} has unknown evidence`
  );
  assert.match(step, new RegExp(`\\b${candidate[key]}\\b`));
}

test("keeps the approved Gate A package machine-readable", () => {
  assert.equal(inventory.version, 1);
  assert.equal(inventory.gate, "A");
  assert.equal(inventory.status, "approved");
  assert.deepEqual(Object.keys(inventory).sort(), [
    "deferred",
    "evidence",
    "gate",
    "gateDecisions",
    "nonCandidates",
    "parameterExtensions",
    "proposedActions",
    "proposedCapabilities",
    "proposedOperations",
    "status",
    "version"
  ]);
});

test("links every Gate A candidate to one owning phase and executable observation", () => {
  assert.equal(inventory.proposedActions.length, 50);
  assert.equal(inventory.proposedOperations.length, 2);
  assert.equal(inventory.parameterExtensions.length, 6);
  assert.equal(inventory.proposedCapabilities.length, 20);
  assertUnique(inventory.proposedActions, "name", "proposed actions");
  assertUnique(inventory.proposedOperations, "name", "proposed operations");
  assertUnique(inventory.parameterExtensions, "id", "parameter extensions");
  assertUnique(inventory.proposedCapabilities, "id", "proposed capabilities");
  for (const candidate of inventory.proposedActions) assertCandidate(candidate, "name");
  for (const candidate of inventory.proposedOperations) assertCandidate(candidate, "name");
  for (const candidate of inventory.parameterExtensions) assertCandidate(candidate, "id");
  for (const candidate of inventory.proposedCapabilities) assertCandidate(candidate, "id");
  for (const evidence of Object.values(inventory.evidence)) {
    assert.equal(existsSync(path.join(root, evidence)), true, evidence);
  }
  const assignedPhases = new Set([
    ...inventory.proposedActions,
    ...inventory.proposedOperations,
    ...inventory.parameterExtensions,
    ...inventory.proposedCapabilities
  ].map(candidate => candidate.phase));
  assert.deepEqual(assignedPhases, phases);
});

test("keeps every approved direct name Current, Planned, or explicitly Maybe Future", () => {
  const current = new Set(actionIndex.actions.map(action => action.name));
  const planned = new Set(actionIndex.plannedActions.map(action => action.name));
  const maybeFuture = new Set(
    [...polarContract.matchAll(/^(encode(?:Theta|R)2)\(/gm)].map(match => match[1])
  );
  for (const candidate of inventory.proposedActions) {
    assert.equal(
      [current, planned, maybeFuture].filter(group => group.has(candidate.name)).length,
      1,
      `${candidate.name} must have exactly one lifecycle classification`
    );
  }
  assert.match(polarContract, /Status: Maybe Future, NOT IMPLEMENTED/);
  const approvedCapabilities = new Set([
    ...inventory.proposedOperations.map(operation => operation.name),
    ...inventory.parameterExtensions.map(extension => extension.id),
    ...inventory.proposedCapabilities.map(capability => capability.id)
  ]);
  for (const capability of actionIndex.plannedCapabilities) {
    assert.equal(approvedCapabilities.has(capability.id), true, capability.id);
  }
});

test("covers the exact structural and focused API names requested at Gate A", () => {
  const names = new Set([
    ...inventory.proposedActions.map(action => action.name),
    ...inventory.proposedOperations.map(operation => operation.name)
  ]);
  for (const name of [
    "editLegendLayout",
    "editLegendLabels",
    "editLegendTitle",
    "editLegendSymbols",
    "editLegendBorder",
    "editXAxis",
    "editYAxis",
    "editGrid",
    "editErrorBar",
    "editErrorBand",
    "editErrorBandBoundary",
    "editBoxPlot",
    "editRegression",
    "removeMark",
    "encodeTheta",
    "encodeR",
    "encodePointRadius",
    "createThetaAxis",
    "createRadialAxis",
    "createArcMark",
    "encodeTheta2",
    "encodeR2",
    "hconcat",
    "vconcat",
    "editCompositionLayout",
    "replaceCompositionChild",
    "facet",
    "editFacetHeaders",
    "encodeYOffset",
    "createTextMark",
    "encodeText",
    "editTextMark",
    "createRectMark",
    "editRectMark"
  ]) {
    assert.equal(names.has(name), true, name);
  }
});

test("keeps rejected and deferred work outside the active proposal sets", () => {
  assert.equal(inventory.nonCandidates.length, 15);
  assert.equal(inventory.deferred.length, 11);
  assertUnique(inventory.nonCandidates, "name", "non-candidates");
  assertUnique(inventory.deferred, "id", "deferred capabilities");
  const active = new Set([
    ...inventory.proposedActions.map(action => action.name),
    ...inventory.proposedOperations.map(operation => operation.name),
    ...inventory.proposedCapabilities.map(capability => capability.id)
  ]);
  for (const item of inventory.nonCandidates) assert.equal(active.has(item.name), false);
  for (const item of inventory.deferred) assert.equal(active.has(item.id), false);
});

test("records every approved Gate A lifecycle decision", () => {
  assertUnique(inventory.gateDecisions, "id", "gate decisions");
  assert.deepEqual(
    inventory.gateDecisions.map(decision => decision.id),
    [
      "mark-removal-cascade",
      "grid-removal-syntax",
      "composite-edit-atomicity",
      "error-band-boundary-selection",
      "focused-legend-subsets",
      "recreate-after-removal",
      "missing-removal-errors"
    ]
  );
  for (const decision of inventory.gateDecisions) {
    assert.equal(decision.status, "approved");
    assert.equal(typeof decision.recommended, "string");
    assert.equal(Object.hasOwn(inventory.evidence, decision.evidence), true);
  }
});
