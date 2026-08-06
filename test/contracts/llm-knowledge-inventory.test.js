import assert from "node:assert/strict";
import test from "node:test";

import { buildCurrentKnowledgeInventory } from "../../scripts/llm-eval/inventory.js";

test("measures the exact current LLM knowledge surface deterministically", async () => {
  const first = await buildCurrentKnowledgeInventory();
  const second = await buildCurrentKnowledgeInventory();

  assert.deepEqual(second, first);
  assert.equal(first.baseline.actionCount, 173);
  assert.equal(first.actions.length, 173);
  assert.deepEqual(
    first.actions.map(action => action.name),
    first.actions.map(action => action.name).toSorted()
  );
  assert.deepEqual(first.summary.layers, {
    advanced: 3,
    primitive: 3,
    "user-facing": 167
  });
});

test("separates complete routes from missing structured task knowledge", async () => {
  const inventory = await buildCurrentKnowledgeInventory();

  assert.deepEqual(inventory.summary.routes, {
    currentContract: 173,
    publicReference: 173,
    exactTypeSignature: 173
  });
  for (const field of [
    "summary",
    "useWhen",
    "avoidWhen",
    "signature",
    "requires",
    "parameters",
    "effects",
    "errors",
    "example",
    "relatedActions",
    "relatedDocs",
    "recipeClassification"
  ]) {
    assert.deepEqual(inventory.summary.structuredFields[field], {
      present: 0,
      missing: 173
    });
  }

  assert.equal(inventory.summary.executableProgramCoverage.present > 0, true);
  assert.equal(inventory.summary.executableProgramCoverage.missing > 0, true);
  assert.equal(inventory.summary.taskRecipeCoverage.present > 0, true);
  assert.equal(inventory.summary.taskRecipeCoverage.missing > 0, true);
  assert.deepEqual(inventory.summary.documentationMentionCoverage, {
    present: 173,
    missing: 0
  });
});
