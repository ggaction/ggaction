import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAuthoringCase, evaluateAuthoringRequirements } from "../../scripts/evaluate-authoring-requirements.js";
import { searchGgaction } from "../../knowledge/task-resolver.js";

test("the requirement corpus evaluates execution and fulfillment separately", async () => {
  const result = await evaluateAuthoringRequirements();
  assert.equal(result.summary.total, 15);
  assert.equal(result.summary.passed, result.summary.total, JSON.stringify(result.cases.filter(entry => !entry.passed)));
  assert.equal(result.summary.falseComplete, 0);
  assert.match(result.contractId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(Object.keys(result.hashes).length, 4);
  assert.ok(result.summary.executable > result.summary.fulfilled);
});

test("an executable chart that omits requested color is a false completion", async () => {
  const result = await evaluateAuthoringCase({ id: "counterfactual", query: "scatter plot with red points",
    checks: [{ kind: "fill", value: "red" }] }, { resolve: () => searchGgaction("scatter plot") });
  assert.equal(result.executionSucceeded, true);
  assert.equal(result.requirementsFulfilled, false);
  assert.equal(result.falseComplete, true);
  assert.equal(result.passed, false);
});
